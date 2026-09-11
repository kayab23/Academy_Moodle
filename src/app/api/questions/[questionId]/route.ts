import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAuth, canManageCourse } from '@/lib/scope';
import { isTrustedOrigin } from '@/lib/csrf';
import { db } from '@/lib/db';
import { z } from 'zod';
import { QuestionType, Prisma } from '@prisma/client';
import { logActivity } from '@/lib/activity';

const updateQuestionSchema = z.object({
  type: z.nativeEnum(QuestionType).optional(),
  text: z.string().min(3).max(2000).optional(),
  options: z.any().optional().nullable(),
  correctAnswer: z.any().optional().nullable(),
  points: z.number().min(0.1).max(100).optional(),
  position: z.number().int().min(0).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { questionId: string } }
) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
  }

  try {
    const session = await getServerSession(authOptions);
    const user = requireAuth(session);

    const question = await db.question.findUnique({
      where: { id: params.questionId },
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
    });

    if (!question) {
      return NextResponse.json({ error: 'Pregunta no encontrada' }, { status: 404 });
    }

    if (!canManageCourse(user, question.quiz.lesson.module.course)) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    const body = await req.json();
    const data = updateQuestionSchema.parse(body);

    const updateData: Prisma.QuestionUpdateInput = {
      ...(data.type && { type: data.type }),
      ...(data.text && { text: data.text }),
      ...(data.points !== undefined && { points: data.points }),
      ...(data.position !== undefined && { position: data.position }),
      ...(data.options !== undefined && {
        options: data.options === null ? Prisma.JsonNull : data.options,
      }),
      ...(data.correctAnswer !== undefined && {
        correctAnswer: data.correctAnswer === null ? Prisma.JsonNull : data.correctAnswer,
      }),
    };

    const updated = await db.question.update({
      where: { id: params.questionId },
      data: updateData,
    });

    await logActivity({
      userId: user.id,
      action: 'QUESTION_UPDATED',
      entityType: 'Question',
      entityId: params.questionId,
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: err.errors }, { status: 400 });
    }
    console.error('[QUESTION_UPDATE_ERROR]', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { questionId: string } }
) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
  }

  try {
    const session = await getServerSession(authOptions);
    const user = requireAuth(session);

    const question = await db.question.findUnique({
      where: { id: params.questionId },
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
    });

    if (!question) {
      return NextResponse.json({ error: 'Pregunta no encontrada' }, { status: 404 });
    }

    if (!canManageCourse(user, question.quiz.lesson.module.course)) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    await db.question.delete({
      where: { id: params.questionId },
    });

    await logActivity({
      userId: user.id,
      action: 'QUESTION_DELETED',
      entityType: 'Question',
      entityId: params.questionId,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('[QUESTION_DELETE_ERROR]', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
