import { db } from './db';
import { syncEnrollmentCompletion } from './progress';
import { logActivity } from './activity';
import { QuestionType } from '@prisma/client';

export interface AttemptEvaluationResult {
  isFullyGraded: boolean;
  totalPoints: number;
  maxPoints: number;
  percentage: number;
  isPassing: boolean;
}

/**
 * Normaliza respuestas para comparación en preguntas cerradas.
 */
function normalizeAnswer(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val).trim().toLowerCase();
}

/**
 * Evalúa las respuestas de un intento de Quiz y calcula o actualiza la calificación.
 */
export async function evaluateAttempt(attemptId: string): Promise<AttemptEvaluationResult> {
  const attempt = await db.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      quiz: {
        include: {
          questions: true,
          lesson: {
            select: {
              id: true,
              isRequired: true,
              module: {
                select: {
                  courseId: true,
                },
              },
            },
          },
        },
      },
      answers: true,
    },
  });

  if (!attempt) {
    throw new Error(`Attempt ${attemptId} not found`);
  }

  const { quiz, answers } = attempt;
  const questions = quiz.questions;

  let totalPoints = 0;
  let maxPoints = 0;
  let isFullyGraded = true;

  for (const question of questions) {
    maxPoints += question.points;
    const answer = answers.find((a) => a.questionId === question.id);

    if (!answer) {
      // Pregunta no respondida
      continue;
    }

    if (question.type === QuestionType.OPEN) {
      if (answer.pointsAwarded === null || answer.pointsAwarded === undefined) {
        isFullyGraded = false;
      } else {
        totalPoints += answer.pointsAwarded;
      }
    } else {
      // Tipos cerrados: MULTIPLE_CHOICE, TRUE_FALSE, MATCHING
      let isCorrect = false;

      if (question.type === QuestionType.MATCHING) {
        // En matching, comparamos pares clave/valor
        try {
          const selected = typeof answer.selectedAnswer === 'string'
            ? JSON.parse(answer.selectedAnswer)
            : answer.selectedAnswer;
          const correct = typeof question.correctAnswer === 'string'
            ? JSON.parse(question.correctAnswer)
            : question.correctAnswer;

          if (selected && correct && typeof selected === 'object' && typeof correct === 'object') {
            const selectedKeys = Object.keys(selected);
            const correctKeys = Object.keys(correct);
            if (
              selectedKeys.length === correctKeys.length &&
              correctKeys.every(
                (k) => normalizeAnswer((selected as Record<string, unknown>)[k]) ===
                       normalizeAnswer((correct as Record<string, unknown>)[k])
              )
            ) {
              isCorrect = true;
            }
          }
        } catch {
          isCorrect = false;
        }
      } else {
        // MULTIPLE_CHOICE o TRUE_FALSE
        const normSelected = normalizeAnswer(answer.selectedAnswer);
        const normCorrect = normalizeAnswer(question.correctAnswer);
        isCorrect = normSelected === normCorrect && normSelected.length > 0;
      }

      const pointsAwarded = isCorrect ? question.points : 0;
      totalPoints += pointsAwarded;

      // Actualizar registro de respuesta si cambió
      if (answer.isCorrect !== isCorrect || answer.pointsAwarded !== pointsAwarded) {
        await db.answer.update({
          where: { id: answer.id },
          data: {
            isCorrect,
            pointsAwarded,
          },
        });
      }
    }
  }

  const percentage = maxPoints > 0 ? Math.min(100, Math.round((totalPoints / maxPoints) * 100)) : 0;
  const isPassing = percentage >= quiz.passingScore;

  if (isFullyGraded) {
    // Finalizar el intento
    await db.quizAttempt.update({
      where: { id: attempt.id },
      data: {
        score: totalPoints,
        finishedAt: attempt.finishedAt || new Date(),
      },
    });

    // Crear o actualizar registro en Grade
    const courseId = quiz.lesson.module.courseId;
    const existingGrade = await db.grade.findFirst({
      where: {
        userId: attempt.userId,
        courseId,
        lessonId: quiz.lesson.id,
      },
    });

    if (existingGrade) {
      // Solo actualizamos si el nuevo intento obtiene mejor o igual porcentaje
      if (percentage >= existingGrade.percentage) {
        await db.grade.update({
          where: { id: existingGrade.id },
          data: {
            quizAttemptId: attempt.id,
            score: totalPoints,
            maxScore: maxPoints,
            percentage,
            gradedAt: new Date(),
          },
        });
      }
    } else {
      await db.grade.create({
        data: {
          userId: attempt.userId,
          courseId,
          lessonId: quiz.lesson.id,
          quizAttemptId: attempt.id,
          score: totalPoints,
          maxScore: maxPoints,
          percentage,
          gradedAt: new Date(),
        },
      });
    }

    // Si aprueba el quiz, marcar lección como completada
    if (isPassing) {
      await db.userProgress.upsert({
        where: {
          userId_lessonId: {
            userId: attempt.userId,
            lessonId: quiz.lesson.id,
          },
        },
        update: {
          isCompleted: true,
          completedAt: new Date(),
        },
        create: {
          userId: attempt.userId,
          lessonId: quiz.lesson.id,
          isCompleted: true,
          completedAt: new Date(),
        },
      });

      // Sincronizar finalización del curso
      await syncEnrollmentCompletion(attempt.userId, courseId);

      // Verificar y emitir certificado si el curso ya está completo y aprobado
      try {
        const { checkAndIssueCertificate } = await import('./certificates');
        await checkAndIssueCertificate(attempt.userId, courseId);
      } catch (certErr) {
        console.warn('Error al verificar certificado post-evaluación:', certErr);
      }
    }

    await logActivity({
      userId: attempt.userId,
      action: 'QUIZ_EVALUATED',
      entityType: 'QuizAttempt',
      entityId: attempt.id,
      metadata: { percentage, isPassing, totalPoints, maxPoints },
    });
  }

  return {
    isFullyGraded,
    totalPoints,
    maxPoints,
    percentage,
    isPassing,
  };
}

export interface CourseGradeResult {
  finalGrade: number | null;
  isPassing: boolean;
  gradedCount: number;
  requiredCount: number;
}

/**
 * Calcula la calificación general del curso para un usuario siguiendo la regla de PLAN.md (l. 228):
 * Promedio simple de las calificaciones (`percentage`) de todas las lecciones con `isRequired = true`
 * que tengan un `Grade` asociado.
 */
export async function calculateCourseGrade(
  userId: string,
  courseId: string
): Promise<CourseGradeResult> {
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: {
      passingScore: true,
      modules: {
        select: {
          lessons: {
            where: { isRequired: true },
            select: { id: true },
          },
        },
      },
    },
  });

  if (!course) {
    return { finalGrade: null, isPassing: false, gradedCount: 0, requiredCount: 0 };
  }

  const requiredLessonIds = course.modules.flatMap((m) => m.lessons).map((l) => l.id);

  if (requiredLessonIds.length === 0) {
    return { finalGrade: null, isPassing: false, gradedCount: 0, requiredCount: 0 };
  }

  const grades = await db.grade.findMany({
    where: {
      userId,
      courseId,
      lessonId: { in: requiredLessonIds },
    },
    select: { percentage: true },
  });

  if (grades.length === 0) {
    return {
      finalGrade: null,
      isPassing: false,
      gradedCount: 0,
      requiredCount: requiredLessonIds.length,
    };
  }

  const sumPercentage = grades.reduce((acc, g) => acc + g.percentage, 0);
  const finalGrade = Math.round((sumPercentage / grades.length) * 10) / 10;
  const isPassing = grades.length === requiredLessonIds.length && finalGrade >= course.passingScore;

  return {
    finalGrade,
    isPassing,
    gradedCount: grades.length,
    requiredCount: requiredLessonIds.length,
  };
}
