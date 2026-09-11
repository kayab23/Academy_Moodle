import { db } from './db';
import { EnrollmentStatus } from '@prisma/client';
import { logActivity } from './activity';

export interface CourseProgressResult {
  totalRequired: number;
  completedRequired: number;
  percentage: number;
  isFullyCompleted: boolean;
  completedLessonIds: string[];
}

/**
 * Calcula el progreso de un usuario en un curso según las lecciones requeridas (PLAN.md).
 */
export async function calculateCourseProgress(
  userId: string,
  courseId: string
): Promise<CourseProgressResult> {
  // Obtener todas las lecciones del curso
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: {
      modules: {
        select: {
          lessons: {
            select: {
              id: true,
              isRequired: true,
            },
          },
        },
      },
    },
  });

  if (!course) {
    return {
      totalRequired: 0,
      completedRequired: 0,
      percentage: 0,
      isFullyCompleted: false,
      completedLessonIds: [],
    };
  }

  const allLessons = course.modules.flatMap((m) => m.lessons);
  const requiredLessons = allLessons.filter((l) => l.isRequired);

  // Si no hay lecciones marcadas como requeridas, usamos todas las lecciones existentes
  const targetLessons = requiredLessons.length > 0 ? requiredLessons : allLessons;
  const targetLessonIds = targetLessons.map((l) => l.id);

  if (targetLessonIds.length === 0) {
    return {
      totalRequired: 0,
      completedRequired: 0,
      percentage: 0,
      isFullyCompleted: false,
      completedLessonIds: [],
    };
  }

  // Obtener las lecciones completadas por el usuario
  const completedProgress = await db.userProgress.findMany({
    where: {
      userId,
      lessonId: { in: allLessons.map((l) => l.id) },
      isCompleted: true,
    },
    select: { lessonId: true },
  });

  const completedLessonIds = completedProgress.map((p) => p.lessonId);
  const completedRequiredCount = targetLessons.filter((l) =>
    completedLessonIds.includes(l.id)
  ).length;

  const totalRequired = targetLessons.length;
  const percentage = Math.min(100, Math.round((completedRequiredCount / totalRequired) * 100));
  const isFullyCompleted = totalRequired > 0 && completedRequiredCount === totalRequired;

  return {
    totalRequired,
    completedRequired: completedRequiredCount,
    percentage,
    isFullyCompleted,
    completedLessonIds,
  };
}

/**
 * Sincroniza el estado del Enrollment del usuario (ACTIVE vs COMPLETED) según su avance.
 */
export async function syncEnrollmentCompletion(
  userId: string,
  courseId: string
): Promise<{ status: EnrollmentStatus; percentage: number; completedAt?: Date | null }> {
  const progress = await calculateCourseProgress(userId, courseId);

  const enrollment = await db.enrollment.findUnique({
    where: {
      userId_courseId: { userId, courseId },
    },
  });

  if (!enrollment) {
    return {
      status: EnrollmentStatus.ACTIVE,
      percentage: progress.percentage,
      completedAt: null,
    };
  }

  if (progress.isFullyCompleted && enrollment.status !== EnrollmentStatus.COMPLETED) {
    const now = new Date();
    await db.enrollment.update({
      where: { id: enrollment.id },
      data: {
        status: EnrollmentStatus.COMPLETED,
        completedAt: now,
      },
    });

    await logActivity({
      userId,
      action: 'COURSE_COMPLETED',
      entityType: 'Course',
      entityId: courseId,
      metadata: { percentage: 100, completedAt: now.toISOString() },
    });

    return {
      status: EnrollmentStatus.COMPLETED,
      percentage: 100,
      completedAt: now,
    };
  } else if (!progress.isFullyCompleted && enrollment.status === EnrollmentStatus.COMPLETED) {
    // Si se desmarcó una lección obligatoria
    await db.enrollment.update({
      where: { id: enrollment.id },
      data: {
        status: EnrollmentStatus.ACTIVE,
        completedAt: null,
      },
    });

    return {
      status: EnrollmentStatus.ACTIVE,
      percentage: progress.percentage,
      completedAt: null,
    };
  }

  return {
    status: enrollment.status,
    percentage: progress.percentage,
    completedAt: enrollment.completedAt,
  };
}
