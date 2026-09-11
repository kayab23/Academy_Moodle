import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAuth, canAccessCourse, canManageCourse } from '@/lib/scope';
import { db } from '@/lib/db';
import { z } from 'zod';
import { logActivity } from '@/lib/activity';

const updateQuizSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  passingScore: z.number().min(0).max(100).optional(),
  maxAttempts: z.number().int().min(1).max(10).optional(),
  timeLimit: z.number().int().min(1).max(300).optional().nullable(),
  shuffleQuestions: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { quizId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const user = requireAuth(session);

    const quiz = await db.quiz.findUnique({
      where: { id: params.quizId },
      include: {
        lesson: {
          include: {
            module: {
              include: {
                course: {
                  include: { assignedCompanies: true },
                },
              },
            },
          },
        },
        questions: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Evaluación no encontrada' }, { status: 404 });
    }

    const course = quiz.lesson.module.course;
    if (!canAccessCourse(user, course)) {
      return NextResponse.json({ error: 'Acceso no permitido' }, { status: 403 });
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
    const message = err instanceof Error ? err.message : 'Error interno del servidor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { quizId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const user = requireAuth(session);

    const quiz = await db.quiz.findUnique({
      where: { id: params.quizId },
      include: {
        lesson: {
          include: {
            module: {
              include: {
                course: {
                  include: { assignedCompanies: true },
                },
              },
            },
          },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Evaluación no encontrada' }, { status: 404 });
    }

    if (!canManageCourse(user, quiz.lesson.module.course)) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    const body = await req.json();
    const data = updateQuizSchema.parse(body);

    const updated = await db.quiz.update({
      where: { id: params.quizId },
      data,
    });

    await logActivity({
      userId: user.id,
      action: 'QUIZ_UPDATED',
      entityType: 'Quiz',
      entityId: params.quizId,
      metadata: data,
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: err.errors }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : 'Error interno del servidor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { quizId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const user = requireAuth(session);

    const quiz = await db.quiz.findUnique({
      where: { id: params.quizId },
      include: {
        lesson: {
          include: {
            module: {
              include: {
                course: {
                  include: { assignedCompanies: true },
                },
              },
            },
          },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Evaluación no encontrada' }, { status: 404 });
    }

    if (!canManageCourse(user, quiz.lesson.module.course)) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    await db.quiz.delete({
      where: { id: params.quizId },
    });

    await logActivity({
      userId: user.id,
      action: 'QUIZ_DELETED',
      entityType: 'Quiz',
      entityId: params.quizId,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno del servidor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
