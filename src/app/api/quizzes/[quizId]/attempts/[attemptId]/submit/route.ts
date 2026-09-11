import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAuth } from '@/lib/scope';
import { db } from '@/lib/db';
import { z } from 'zod';
import { evaluateAttempt } from '@/lib/grading';
import { Prisma } from '@prisma/client';

const submitAttemptSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().min(1),
      selectedAnswer: z.any(),
    })
  ),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { quizId: string; attemptId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const user = requireAuth(session);

    const attempt = await db.quizAttempt.findUnique({
      where: { id: params.attemptId },
      include: {
        quiz: true,
      },
    });

    if (!attempt) {
      return NextResponse.json({ error: 'Intento no encontrado' }, { status: 404 });
    }

    if (attempt.userId !== user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    if (attempt.finishedAt) {
      return NextResponse.json({ error: 'Este intento ya fue enviado previamente' }, { status: 400 });
    }

    const body = await req.json();
    const { answers } = submitAttemptSchema.parse(body);

    // Guardar respuestas
    for (const ans of answers) {
      const existingAnswer = await db.answer.findFirst({
        where: {
          attemptId: attempt.id,
          questionId: ans.questionId,
        },
      });

      const selectedValue = ans.selectedAnswer === null || ans.selectedAnswer === undefined
        ? Prisma.JsonNull
        : ans.selectedAnswer;

      if (existingAnswer) {
        await db.answer.update({
          where: { id: existingAnswer.id },
          data: { selectedAnswer: selectedValue },
        });
      } else {
        await db.answer.create({
          data: {
            attemptId: attempt.id,
            questionId: ans.questionId,
            selectedAnswer: selectedValue,
          },
        });
      }
    }

    // Marcar como finalizado
    await db.quizAttempt.update({
      where: { id: attempt.id },
      data: { finishedAt: new Date() },
    });

    // Evaluar intento automáticamente
    const evaluation = await evaluateAttempt(attempt.id);

    return NextResponse.json({
      success: true,
      attemptId: attempt.id,
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
