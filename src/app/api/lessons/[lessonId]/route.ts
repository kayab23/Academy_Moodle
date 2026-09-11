import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { requireAuth, canManageCourse } from '@/lib/scope';
import { isTrustedOrigin } from '@/lib/csrf';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity';
import { deleteResourceFiles } from '@/lib/uploads';
import { LessonType } from '@prisma/client';

const updateLessonSchema = z.object({
  title: z.string().min(2, 'El título debe tener al menos 2 caracteres').max(200).optional(),
  type: z.nativeEnum(LessonType).optional(),
  content: z.string().max(10000).optional().nullable(),
  duration: z.number().int().min(0).max(1000).optional().nullable(),
  isRequired: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { lessonId: string } }) {
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

  const existingLesson = await db.lesson.findUnique({
    where: { id: params.lessonId },
    include: { module: { include: { course: { include: { assignedCompanies: true } } } } },
  });

  if (!existingLesson) {
    return NextResponse.json({ error: 'Lección no encontrada' }, { status: 404 });
  }

  if (!canManageCourse(user, existingLesson.module.course)) {
    return NextResponse.json({ error: 'No puedes administrar este curso.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de petición inválido' }, { status: 400 });
  }

  const parsed = updateLessonSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 422 });
  }

  const { title, type, content, duration, isRequired, position } = parsed.data;

  try {
    const updated = await db.lesson.update({
      where: { id: params.lessonId },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(type !== undefined && { type }),
        ...(content !== undefined && { content: content?.trim() || null }),
        ...(duration !== undefined && { duration }),
        ...(isRequired !== undefined && { isRequired }),
        ...(position !== undefined && { position }),
      },
    });

    await logActivity({
      userId: user.id,
      action: 'LESSON_UPDATED',
      entityType: 'Lesson',
      entityId: updated.id,
      metadata: { moduleId: existingLesson.moduleId, title: updated.title },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[LESSON_UPDATE_ERROR]', error);
    return NextResponse.json({ error: 'No se pudo actualizar la lección.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { lessonId: string } }) {
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

  const existingLesson = await db.lesson.findUnique({
    where: { id: params.lessonId },
    include: {
      module: { include: { course: { include: { assignedCompanies: true } } } },
      resources: { select: { id: true } },
    },
  });

  if (!existingLesson) {
    return NextResponse.json({ error: 'Lección no encontrada' }, { status: 404 });
  }

  if (!canManageCourse(user, existingLesson.module.course)) {
    return NextResponse.json({ error: 'No puedes administrar este curso.' }, { status: 403 });
  }

  try {
    await db.lesson.delete({
      where: { id: params.lessonId },
    });

    await Promise.all(existingLesson.resources.map((r) => deleteResourceFiles(r.id)));

    await logActivity({
      userId: user.id,
      action: 'LESSON_DELETED',
      entityType: 'Lesson',
      entityId: params.lessonId,
      metadata: { moduleId: existingLesson.moduleId, title: existingLesson.title },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[LESSON_DELETE_ERROR]', error);
    return NextResponse.json({ error: 'No se pudo eliminar la lección.' }, { status: 500 });
  }
}
