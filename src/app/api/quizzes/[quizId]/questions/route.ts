import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAuth, canManageCourse } from '@/lib/scope';
import { isTrustedOrigin } from '@/lib/csrf';
import { db } from '@/lib/db';
import { z } from 'zod';
import { QuestionType, Prisma } from '@prisma/client';
import { logActivity } from '@/lib/activity';

const createQuestionSchema = z.object({
  type: z.nativeEnum(QuestionType),
  text: z.string().min(3).max(2000),
  options: z.any().optional().nullable(),
  correctAnswer: z.any().optional().nullable(),
  points: z.number().min(0.1).max(100).default(1.0),
  position: z.number().int().min(0).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { quizId: string } }
) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
  }

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
    const data = createQuestionSchema.parse(body);

    // Obtener la posición siguiente si no viene dada
    let position = data.position;
    if (position === undefined) {
      const lastQ = await db.question.findFirst({
        where: { quizId: params.quizId },
        orderBy: { position: 'desc' },
      });
      position = (lastQ?.position ?? 0) + 1;
    }

    const question = await db.question.create({
      data: {
        quizId: params.quizId,
        type: data.type,
        text: data.text,
        options: data.options ?? Prisma.JsonNull,
        correctAnswer: data.correctAnswer ?? Prisma.JsonNull,
        points: data.points,
        position,
      },
    });

    await logActivity({
      userId: user.id,
      action: 'QUESTION_CREATED',
      entityType: 'Question',
      entityId: question.id,
      metadata: { quizId: params.quizId, type: data.type },
    });

    return NextResponse.json(question, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: err.errors }, { status: 400 });
    }
    console.error('[QUESTION_CREATE_ERROR]', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
