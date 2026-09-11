import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { requireAuth, canAccessCourse } from '@/lib/scope';
import { isTrustedOrigin } from '@/lib/csrf';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity';
import { EnrollmentStatus } from '@prisma/client';
import { calculateCourseProgress, syncEnrollmentCompletion } from '@/lib/progress';

const progressSchema = z.object({
  lessonId: z.string().cuid('ID de lección inválido'),
  isCompleted: z.boolean(),
  timeSpent: z.number().int().min(0).optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  let user;
  try {
    user = requireAuth(session);
  } catch {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get('courseId');

  if (!courseId) {
    return NextResponse.json({ error: 'Falta el parámetro courseId' }, { status: 400 });
  }

  const progress = await calculateCourseProgress(user.id, courseId);
  return NextResponse.json(progress);
}

export async function POST(req: NextRequest) {
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de petición inválido' }, { status: 400 });
  }

  const parsed = progressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 422 });
  }

  const { lessonId, isCompleted, timeSpent } = parsed.data;

  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: {
        include: {
          course: {
            include: { assignedCompanies: true },
          },
        },
      },
    },
  });

  if (!lesson) {
    return NextResponse.json({ error: 'Lección no encontrada' }, { status: 404 });
  }

  const course = lesson.module.course;

  if (!canAccessCourse(user, course)) {
    return NextResponse.json({ error: 'No tienes acceso al curso de esta lección' }, { status: 403 });
  }

  // Asegurar que el usuario esté inscrito (auto-inscripción si no lo estaba)
  await db.enrollment.upsert({
    where: { userId_courseId: { userId: user.id, courseId: course.id } },
    update: {
      status: EnrollmentStatus.ACTIVE,
    },
    create: {
      userId: user.id,
      courseId: course.id,
      status: EnrollmentStatus.ACTIVE,
      enrolledBy: user.id,
    },
  });

  // Guardar progreso de la lección
  const progressRecord = await db.userProgress.upsert({
    where: {
      userId_lessonId: { userId: user.id, lessonId },
    },
    update: {
      isCompleted,
      completedAt: isCompleted ? new Date() : null,
      lastAccessed: new Date(),
      ...(timeSpent !== undefined && { timeSpent: { increment: timeSpent } }),
    },
    create: {
      userId: user.id,
      lessonId,
      isCompleted,
      completedAt: isCompleted ? new Date() : null,
      lastAccessed: new Date(),
      timeSpent: timeSpent || 0,
    },
  });

  // Sincronizar estado global del curso
  const syncResult = await syncEnrollmentCompletion(user.id, course.id);
  const updatedProgress = await calculateCourseProgress(user.id, course.id);

  if (isCompleted) {
    await logActivity({
      userId: user.id,
      action: 'LESSON_COMPLETED',
      entityType: 'Lesson',
      entityId: lesson.id,
      metadata: { lessonTitle: lesson.title, courseId: course.id },
    });
  }

  return NextResponse.json({
    success: true,
    progressRecord,
    courseStatus: syncResult.status,
    courseProgress: updatedProgress,
  });
}
