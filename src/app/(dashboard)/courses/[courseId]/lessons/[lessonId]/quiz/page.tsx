import React from 'react';
import { getServerSession } from 'next-auth';
import { notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { requireAuth, canAccessCourse, canManageCourse } from '@/lib/scope';
import { db } from '@/lib/db';
import { QuizRunner } from '@/components/quizzes/QuizRunner';

export default async function LessonQuizPage({
  params,
}: {
  params: { courseId: string; lessonId: string };
}) {
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

  if (!lesson || lesson.module.course.id !== params.courseId) {
    notFound();
  }

  const course = lesson.module.course;
  if (!canAccessCourse(user, course)) {
    notFound();
  }

  const quiz = lesson.quizzes[0];
  if (!quiz) {
    notFound();
  }

  const canManage = canManageCourse(user, course);

  // Ocultar respuestas correctas al estudiante
  const safeQuestions = quiz.questions.map((q) => {
    if (!canManage) {
      const rest = { ...q };
      delete (rest as { correctAnswer?: unknown }).correctAnswer;
      return rest;
    }
    return q;
  });

  // Consultar intentos previos del alumno
  const attempts = await db.quizAttempt.findMany({
    where: {
      quizId: quiz.id,
      userId: user.id,
    },
    orderBy: { attemptNumber: 'desc' },
    select: {
      id: true,
      score: true,
      attemptNumber: true,
      startedAt: true,
      finishedAt: true,
    },
  });

  return (
    <div style={{ padding: 'var(--space-6) 0' }}>
      <QuizRunner
        quiz={{
          ...quiz,
          questions: safeQuestions,
        }}
        courseId={course.id}
        lessonId={lesson.id}
        initialAttempts={attempts}
      />
    </div>
  );
}
