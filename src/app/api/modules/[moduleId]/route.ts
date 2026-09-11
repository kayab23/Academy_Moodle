import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { requireAuth, canManageCourse } from '@/lib/scope';
import { isTrustedOrigin } from '@/lib/csrf';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity';
import { deleteResourceFiles } from '@/lib/uploads';

const updateModuleSchema = z.object({
  title: z.string().min(2, 'El título debe tener al menos 2 caracteres').max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  position: z.number().int().min(0).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { moduleId: string } }) {
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

  const existingModule = await db.module.findUnique({
    where: { id: params.moduleId },
    include: { course: { include: { assignedCompanies: true } } },
  });

  if (!existingModule) {
    return NextResponse.json({ error: 'Módulo no encontrado' }, { status: 404 });
  }

  if (!canManageCourse(user, existingModule.course)) {
    return NextResponse.json({ error: 'No puedes administrar este curso.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de petición inválido' }, { status: 400 });
  }

  const parsed = updateModuleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 422 });
  }

  const { title, description, position } = parsed.data;

  try {
    const updated = await db.module.update({
      where: { id: params.moduleId },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(position !== undefined && { position }),
      },
    });

    await logActivity({
      userId: user.id,
      action: 'MODULE_UPDATED',
      entityType: 'Module',
      entityId: updated.id,
      metadata: { courseId: existingModule.courseId, title: updated.title },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[MODULE_UPDATE_ERROR]', error);
    return NextResponse.json({ error: 'No se pudo actualizar el módulo.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { moduleId: string } }) {
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

  const existingModule = await db.module.findUnique({
    where: { id: params.moduleId },
    include: {
      course: { include: { assignedCompanies: true } },
      lessons: { include: { resources: { select: { id: true } } } },
    },
  });

  if (!existingModule) {
    return NextResponse.json({ error: 'Módulo no encontrado' }, { status: 404 });
  }

  if (!canManageCourse(user, existingModule.course)) {
    return NextResponse.json({ error: 'No puedes administrar este curso.' }, { status: 403 });
  }

  try {
    // Cascade de Prisma borra las filas de Resource en la BD, pero no los
    // archivos en disco — se recogen aquí antes de borrar para limpiarlos después.
    const resourceIds = existingModule.lessons.flatMap((lesson) => lesson.resources.map((r) => r.id));

    await db.module.delete({
      where: { id: params.moduleId },
    });

    await Promise.all(resourceIds.map((id) => deleteResourceFiles(id)));

    await logActivity({
      userId: user.id,
      action: 'MODULE_DELETED',
      entityType: 'Module',
      entityId: params.moduleId,
      metadata: { courseId: existingModule.courseId, title: existingModule.title },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[MODULE_DELETE_ERROR]', error);
    return NextResponse.json({ error: 'No se pudo eliminar el módulo.' }, { status: 500 });
  }
}
