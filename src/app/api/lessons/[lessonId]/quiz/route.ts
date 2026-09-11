import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAuth, canAccessCourse, canManageCourse } from '@/lib/scope';
import { db } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { lessonId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const user = requireAuth(session);

    const lesson = await db.lesson.findUnique({
      where: { id: params.lessonId },
      include: {
        module: {
          include: {
            course: {
              include: { assignedCompanies: true },
            },
          },
        },
        quizzes: {
          include: {
            questions: {
              orderBy: { position: 'asc' },
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
      return NextResponse.json({ error: 'Acceso no permitido' }, { status: 403 });
    }

    const quiz = lesson.quizzes[0];
    if (!quiz) {
      return NextResponse.json({ error: 'La lección no tiene evaluación configurada' }, { status: 404 });
    }

    const canManage = canManageCourse(user, course);

    // Ocultar respuestas correctas si es alumno
    const safeQuestions = quiz.questions.map((q) => {
      if (!canManage) {
        const rest = { ...q };
        delete (rest as { correctAnswer?: unknown }).correctAnswer;
        return rest;
      }
      return q;
    });

    return NextResponse.json({
      ...quiz,
      questions: safeQuestions,
      canManage,
    });
  } catch (err: unknown) {
    console.error('[LESSON_QUIZ_GET_ERROR]', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
