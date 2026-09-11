import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAuth, canManageCourse } from '@/lib/scope';
import { db } from '@/lib/db';
import { z } from 'zod';
import { evaluateAttempt } from '@/lib/grading';
import { logActivity } from '@/lib/activity';

const gradeAnswerSchema = z.object({
  pointsAwarded: z.number().min(0),
  feedback: z.string().max(1000).optional().nullable(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { answerId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const user = requireAuth(session);

    const answer = await db.answer.findUnique({
      where: { id: params.answerId },
      include: {
        question: true,
        attempt: {
          include: {
            quiz: {
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
            },
          },
        },
      },
    });

    if (!answer) {
      return NextResponse.json({ error: 'Respuesta no encontrada' }, { status: 404 });
    }

    const course = answer.attempt.quiz.lesson.module.course;
    if (!canManageCourse(user, course)) {
      return NextResponse.json({ error: 'Permisos insuficientes para calificar' }, { status: 403 });
    }

    const body = await req.json();
    const { pointsAwarded, feedback } = gradeAnswerSchema.parse(body);

    if (pointsAwarded > answer.question.points) {
      return NextResponse.json(
        { error: `El puntaje no puede exceder el máximo de la pregunta (${answer.question.points} pts)` },
        { status: 400 }
      );
    }

    const isCorrect = pointsAwarded > 0;

    await db.answer.update({
      where: { id: params.answerId },
      data: {
        pointsAwarded,
        isCorrect,
        feedback: feedback ?? null,
      },
    });

    // Re-evaluar intento completo y actualizar Grade
    const evaluation = await evaluateAttempt(answer.attemptId);

    await logActivity({
      userId: user.id,
      action: 'ANSWER_GRADED_MANUALLY',
      entityType: 'Answer',
      entityId: params.answerId,
      metadata: {
        attemptId: answer.attemptId,
        pointsAwarded,
        maxPoints: answer.question.points,
      },
    });

    return NextResponse.json({
      success: true,
      answerId: params.answerId,
      ...evaluation,
    });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: err.errors }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : 'Error interno del servidor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
