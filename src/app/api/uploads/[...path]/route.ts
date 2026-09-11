import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import fs from 'fs';
import { stat } from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';
import { authOptions } from '@/lib/auth';
import { requireAuth, canAccessCourse } from '@/lib/scope';
import { db } from '@/lib/db';
import { UPLOADS_ROOT, contentTypeForExtension } from '@/lib/uploads';

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const session = await getServerSession(authOptions);

  let user;
  try {
    user = requireAuth(session);
  } catch {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  // Se esperan exactamente 2 segmentos: [resourceId, filename]. Cualquier otra
  // forma (o intento de path traversal vía "..") se rechaza de inmediato.
  const segments = params.path;
  if (!segments || segments.length !== 2 || segments.some((s) => s.includes('..') || s.includes('/'))) {
    return NextResponse.json({ error: 'Ruta inválida' }, { status: 400 });
  }
  const [resourceId, requestedFileName] = segments;

  const resource = await db.resource.findUnique({
    where: { id: resourceId },
    include: {
      lesson: { include: { module: { include: { course: { include: { assignedCompanies: true } } } } } },
    },
  });

  if (!resource) {
    return NextResponse.json({ error: 'Recurso no encontrado' }, { status: 404 });
  }

  if (!canAccessCourse(user, resource.lesson.module.course)) {
    return NextResponse.json({ error: 'No tienes acceso a este recurso.' }, { status: 403 });
  }

  // El nombre real en disco viene SIEMPRE de la base de datos, nunca del
  // valor recibido en la URL — el segmento de la URL solo debe coincidir con
  // el original o con "converted.pdf" para servir la versión convertida.
  let realFileName: string;
  if (requestedFileName === 'converted.pdf' && resource.convertedPdfUrl) {
    realFileName = 'converted.pdf';
  } else if (requestedFileName === resource.fileName) {
    realFileName = resource.fileName;
  } else {
    return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 });
  }

  const filePath = path.join(UPLOADS_ROOT, resource.id, realFileName);

  let fileStat;
  try {
    fileStat = await stat(filePath);
  } catch {
    return NextResponse.json({ error: 'Archivo no encontrado en el almacenamiento.' }, { status: 404 });
  }

  const ext = path.extname(realFileName);
  const contentType = contentTypeForExtension(ext);
  const range = req.headers.get('range');

  const baseHeaders: Record<string, string> = {
    'Content-Type': contentType,
    'Accept-Ranges': 'bytes',
    'Content-Disposition': `inline; filename="${encodeURIComponent(realFileName)}"`,
    'Cache-Control': 'private, max-age=0, no-cache',
  };

  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match) {
      return new NextResponse(null, { status: 416, headers: { 'Content-Range': `bytes */${fileStat.size}` } });
    }
    const start = match[1] ? parseInt(match[1], 10) : 0;
    const end = match[2] ? parseInt(match[2], 10) : fileStat.size - 1;

    if (start >= fileStat.size || end >= fileStat.size || start > end) {
      return new NextResponse(null, { status: 416, headers: { 'Content-Range': `bytes */${fileStat.size}` } });
    }

    const nodeStream = fs.createReadStream(filePath, { start, end });
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    return new NextResponse(webStream, {
      status: 206,
      headers: {
        ...baseHeaders,
        'Content-Range': `bytes ${start}-${end}/${fileStat.size}`,
        'Content-Length': String(end - start + 1),
      },
    });
  }

  const nodeStream = fs.createReadStream(filePath);
  const webStream = Readable.toWeb(nodeStream) as ReadableStream;

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      ...baseHeaders,
      'Content-Length': String(fileStat.size),
    },
  });
}
