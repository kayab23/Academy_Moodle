import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAuth, canAccessCourse, canManageCourse } from '@/lib/scope';
import { db } from '@/lib/db';
import { EnrollmentStatus } from '@prisma/client';
import { logActivity } from '@/lib/activity';

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
    const searchParams = req.nextUrl.searchParams;
    const targetUserId = searchParams.get('userId');

    // Alumnos solo pueden ver sus propios intentos
    const whereClause: { quizId: string; userId?: string } = {
      quizId: params.quizId,
    };

    if (!canManage || !targetUserId) {
      whereClause.userId = user.id;
    } else {
      whereClause.userId = targetUserId;
    }

    const attempts = await db.quizAttempt.findMany({
      where: whereClause,
      orderBy: { attemptNumber: 'desc' },
      include: {
        answers: {
          include: {
            question: {
              select: {
                id: true,
                type: true,
                text: true,
                points: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(attempts);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno del servidor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
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

    const course = quiz.lesson.module.course;
    if (!canAccessCourse(user, course)) {
      return NextResponse.json({ error: 'Acceso no permitido' }, { status: 403 });
    }

    // Verificar inscripción activa
    const enrollment = await db.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: course.id,
        },
      },
    });

    if (!enrollment || enrollment.status === EnrollmentStatus.SUSPENDED) {
      return NextResponse.json(
        { error: 'Debes estar inscrito activamente en el curso para realizar la evaluación' },
        { status: 403 }
      );
    }

    // Verificar número de intentos realizados
    const previousAttempts = await db.quizAttempt.count({
      where: {
        userId: user.id,
        quizId: params.quizId,
      },
    });

    if (previousAttempts >= quiz.maxAttempts) {
      return NextResponse.json(
        { error: 'Has alcanzado el número máximo de intentos permitidos' },
        { status: 400 }
      );
    }

    // Verificar si hay algún intento abierto (sin finishedAt)
    const activeAttempt = await db.quizAttempt.findFirst({
      where: {
        userId: user.id,
        quizId: params.quizId,
        finishedAt: null,
      },
    });

    if (activeAttempt) {
      // Reanudar intento activo
      return NextResponse.json(activeAttempt);
    }

    const newAttempt = await db.quizAttempt.create({
      data: {
        userId: user.id,
        quizId: params.quizId,
        attemptNumber: previousAttempts + 1,
        startedAt: new Date(),
      },
    });

    await logActivity({
      userId: user.id,
      action: 'QUIZ_ATTEMPT_STARTED',
      entityType: 'QuizAttempt',
      entityId: newAttempt.id,
      metadata: { attemptNumber: newAttempt.attemptNumber, quizId: params.quizId },
    });

    return NextResponse.json(newAttempt, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno del servidor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
