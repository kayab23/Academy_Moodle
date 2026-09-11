import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { requireAuth, canManageCourse } from '@/lib/scope';
import { isTrustedOrigin } from '@/lib/csrf';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity';
import { LessonType } from '@prisma/client';

const createLessonSchema = z.object({
  title: z.string().min(2, 'El título debe tener al menos 2 caracteres').max(200),
  type: z.nativeEnum(LessonType).default(LessonType.TEXT),
  content: z.string().max(10000).optional(),
  isRequired: z.boolean().optional(),
});

export async function POST(req: NextRequest, { params }: { params: { moduleId: string } }) {
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

  const parentModule = await db.module.findUnique({
    where: { id: params.moduleId },
    include: { course: { include: { assignedCompanies: true } } },
  });

  if (!parentModule) {
    return NextResponse.json({ error: 'Módulo no encontrado' }, { status: 404 });
  }

  if (!canManageCourse(user, parentModule.course)) {
    return NextResponse.json({ error: 'No puedes administrar este curso.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de petición inválido' }, { status: 400 });
  }

  const parsed = createLessonSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 422 });
  }

  const lastPosition = await db.lesson.count({ where: { moduleId: parentModule.id } });

  const lesson = await db.lesson.create({
    data: {
      title: parsed.data.title.trim(),
      type: parsed.data.type,
      content: parsed.data.content?.trim() || null,
      isRequired: parsed.data.isRequired ?? true,
      position: lastPosition,
      moduleId: parentModule.id,
    },
  });

  await logActivity({
    userId: user.id,
    action: 'LESSON_CREATED',
    entityType: 'Lesson',
    entityId: lesson.id,
    metadata: { moduleId: parentModule.id, title: lesson.title },
  });

  return NextResponse.json(lesson, { status: 201 });
}
