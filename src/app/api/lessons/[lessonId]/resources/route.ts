import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import fs from 'fs';
import { mkdir } from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { authOptions } from '@/lib/auth';
import { requireAuth, canManageCourse } from '@/lib/scope';
import { isTrustedOrigin } from '@/lib/csrf';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity';
import { ResourceType } from '@prisma/client';
import { UPLOADS_ROOT, sanitizeFileName, validateResourceFile } from '@/lib/uploads';

const execFileAsync = promisify(execFile);

const linkSchema = z.object({
  title: z.string().min(1).max(200),
  url: z.string().url('Debe ser una URL válida'),
});

async function tryConvertPptxToPdf(sourcePath: string, destDir: string): Promise<string | null> {
  const soffice = process.env.LIBREOFFICE_PATH || 'soffice';
  try {
    await execFileAsync(soffice, ['--headless', '--convert-to', 'pdf', '--outdir', destDir, sourcePath], {
      timeout: 60_000,
    });
    const expected = path.join(destDir, 'converted.pdf');
    const generated = path.join(destDir, `${path.basename(sourcePath, path.extname(sourcePath))}.pdf`);
    if (fs.existsSync(generated)) {
      fs.renameSync(generated, expected);
      return expected;
    }
    return null;
  } catch (error) {
    console.warn('[PPTX_CONVERT] Conversión no disponible o falló:', (error as Error).message);
    return null;
  }
}

export async function POST(req: NextRequest, { params }: { params: { lessonId: string } }) {
  // Fuera del matcher de middleware.ts (solo cubre páginas) — ver SPEC.md 1.9.
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
  }

  const session = await getServerSession(authOptions);

  let user;
  try {
    user = requireAuth(session);
  } catch {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const lesson = await db.lesson.findUnique({
    where: { id: params.lessonId },
    include: { module: { include: { course: { include: { assignedCompanies: true } } } } },
  });

  if (!lesson) {
    return NextResponse.json({ error: 'Lección no encontrada' }, { status: 404 });
  }

  if (!canManageCourse(user, lesson.module.course)) {
    return NextResponse.json({ error: 'No puedes administrar este curso.' }, { status: 403 });
  }

  const contentType = req.headers.get('content-type') || '';

  // Flujo A: recurso tipo LINK (sin archivo, solo URL) — JSON normal.
  if (contentType.includes('application/json')) {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Cuerpo de petición inválido' }, { status: 400 });
    }
    const parsed = linkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 422 });
    }

    const resource = await db.resource.create({
      data: {
        title: parsed.data.title.trim(),
        type: ResourceType.LINK,
        fileUrl: parsed.data.url,
        fileName: parsed.data.title.trim(),
        fileSize: 0,
        lessonId: lesson.id,
      },
    });

    await logActivity({
      userId: user.id,
      action: 'RESOURCE_LINK_ADDED',
      entityType: 'Resource',
      entityId: resource.id,
      metadata: { lessonId: lesson.id, url: parsed.data.url },
    });

    return NextResponse.json(resource, { status: 201 });
  }

  // Flujo B: subida de archivo (VIDEO/PDF/PPTX/IMAGE) — multipart/form-data.
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'Content-Type debe ser multipart/form-data o application/json' }, { status: 415 });
  }

  const formData = await req.formData();
  const file = formData.get('file');
  const title = formData.get('title');
  const typeRaw = formData.get('type');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Falta el archivo a subir.' }, { status: 422 });
  }
  if (typeof title !== 'string' || title.trim().length === 0) {
    return NextResponse.json({ error: 'Falta el título del recurso.' }, { status: 422 });
  }
  if (typeof typeRaw !== 'string' || !(typeRaw in ResourceType) || typeRaw === ResourceType.LINK) {
    return NextResponse.json({ error: 'Tipo de recurso inválido.' }, { status: 422 });
  }

  const resourceType = typeRaw as ResourceType;
  const originalName = file.name || 'archivo';

  const validation = validateResourceFile(resourceType, originalName, file.type, file.size);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 422 });
  }

  const safeName = sanitizeFileName(originalName);

  // Se crea el registro primero para obtener un id con el que nombrar la
  // carpeta de destino (evita colisiones entre archivos de distintos recursos).
  const resource = await db.resource.create({
    data: {
      title: title.trim(),
      type: resourceType,
      fileUrl: '',
      fileName: safeName,
      fileSize: file.size,
      lessonId: lesson.id,
    },
  });

  const destDir = path.join(UPLOADS_ROOT, resource.id);
  const destPath = path.join(destDir, safeName);

  try {
    await mkdir(destDir, { recursive: true });
    await pipeline(Readable.fromWeb(file.stream() as import('stream/web').ReadableStream), fs.createWriteStream(destPath));
  } catch (error) {
    console.error('[RESOURCE_UPLOAD_WRITE_ERROR]', error);
    await db.resource.delete({ where: { id: resource.id } }).catch(() => undefined);
    return NextResponse.json({ error: 'No se pudo guardar el archivo en el servidor.' }, { status: 500 });
  }

  let convertedPdfUrl: string | null = null;
  if (resourceType === ResourceType.PPTX) {
    const convertedPath = await tryConvertPptxToPdf(destPath, destDir);
    if (convertedPath) {
      convertedPdfUrl = `/api/uploads/${resource.id}/converted.pdf`;
    }
  }

  const updated = await db.resource.update({
    where: { id: resource.id },
    data: {
      fileUrl: `/api/uploads/${resource.id}/${safeName}`,
      convertedPdfUrl,
    },
  });

  await logActivity({
    userId: user.id,
    action: 'RESOURCE_UPLOADED',
    entityType: 'Resource',
    entityId: resource.id,
    metadata: { lessonId: lesson.id, type: resourceType, fileName: safeName, fileSize: file.size },
  });

  return NextResponse.json(updated, { status: 201 });
}
