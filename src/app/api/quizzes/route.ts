import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAuth, canManageCourse } from '@/lib/scope';
import { db } from '@/lib/db';
import { z } from 'zod';
import { logActivity } from '@/lib/activity';

const createQuizSchema = z.object({
  lessonId: z.string().min(1),
  title: z.string().min(3).max(200),
  description: z.string().max(1000).optional().nullable(),
  passingScore: z.number().min(0).max(100).default(70),
  maxAttempts: z.number().int().min(1).max(10).default(3),
  timeLimit: z.number().int().min(1).max(300).optional().nullable(),
  shuffleQuestions: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = requireAuth(session);

    const body = await req.json();
    const data = createQuizSchema.parse(body);

    const lesson = await db.lesson.findUnique({
      where: { id: data.lessonId },
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

    if (!canManageCourse(user, lesson.module.course)) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    // Verificar si ya existe un quiz para esta lección
    const existingQuiz = await db.quiz.findFirst({
      where: { lessonId: data.lessonId },
    });

    if (existingQuiz) {
      return NextResponse.json(
        { error: 'Esta lección ya tiene una evaluación configurada' },
        { status: 400 }
      );
    }

    const quiz = await db.quiz.create({
      data: {
        lessonId: data.lessonId,
        title: data.title,
        description: data.description,
        passingScore: data.passingScore,
        maxAttempts: data.maxAttempts,
        timeLimit: data.timeLimit,
        shuffleQuestions: data.shuffleQuestions,
      },
    });

    await logActivity({
      userId: user.id,
      action: 'QUIZ_CREATED',
      entityType: 'Quiz',
      entityId: quiz.id,
      metadata: { lessonId: data.lessonId, title: data.title },
    });

    return NextResponse.json(quiz, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: err.errors }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : 'Error interno del servidor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
