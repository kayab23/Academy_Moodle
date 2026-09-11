import React from 'react';
import { getServerSession } from 'next-auth';
import { getTranslations } from 'next-intl/server';
import { authOptions } from '@/lib/auth';
import { requireAuth, canAccessCourse } from '@/lib/scope';
import { db } from '@/lib/db';
import { Role, EnrollmentStatus, QuestionType } from '@prisma/client';
import { calculateCourseGrade } from '@/lib/grading';
import { GradebookTable } from '@/components/gradebook/GradebookTable';
import { FileSpreadsheet, Award, BookOpen, Layers } from 'lucide-react';
import Link from 'next/link';

export default async function GradebookPage({
  searchParams,
}: {
  searchParams?: { courseId?: string };
}) {
  const session = await getServerSession(authOptions);
  const user = requireAuth(session);
  const t = await getTranslations('gradebook');

  // 1. Vista de Colaborador (Mis Calificaciones)
  if (user.role === Role.COLLABORATOR) {
    const enrollments = await db.enrollment.findMany({
      where: {
        userId: user.id,
        status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] },
      },
      include: {
        course: {
          include: {
            modules: {
              include: {
                lessons: {
                  where: { isRequired: true },
                  select: { id: true, title: true, isRequired: true },
                },
              },
            },
          },
        },
      },
    });

    const personalCourses = await Promise.all(
      enrollments.map(async (enr) => {
        const c = enr.course;
        const gradeResult = await calculateCourseGrade(user.id, c.id);
        const grades = await db.grade.findMany({
          where: {
            userId: user.id,
            courseId: c.id,
          },
          include: {
            lesson: { select: { title: true } },
          },
          orderBy: { gradedAt: 'desc' },
        });

        return {
          course: c,
          finalGrade: gradeResult.finalGrade,
          isPassing: gradeResult.isPassing,
          gradedCount: gradeResult.gradedCount,
          requiredCount: gradeResult.requiredCount,
          grades,
        };
      })
    );

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <FileSpreadsheet style={{ color: 'var(--brand-primary)' }} /> {t('myGrades')}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
            {t('subtitle')}
          </p>
        </div>

        {personalCourses.length === 0 ? (
          <div className="glass-panel" style={{ padding: 'var(--space-12)', textAlign: 'center', color: 'var(--text-muted)' }}>
            <FileSpreadsheet size={48} style={{ margin: '0 auto var(--space-3)', color: 'var(--brand-primary)' }} />
            <p>{t('noGrades')}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            {personalCourses.map((item) => (
              <div key={item.course.id} className="glass-panel" style={{ padding: 'var(--space-6)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
                  <div>
                    <h2 style={{ fontSize: 'var(--text-lg)', margin: 0 }}>
                      <Link href={`/courses/${item.course.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        {item.course.title}
                      </Link>
                    </h2>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      Mínimo aprobatorio: {item.course.passingScore}%
                    </span>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{t('courseAverage')}</span>
                    <div>
                      {item.finalGrade !== null ? (
                        <span
                          className={`badge ${item.isPassing ? 'badge-success' : 'badge-danger'}`}
                          style={{ fontSize: 'var(--text-sm)' }}
                        >
                          {item.finalGrade}% ({item.isPassing ? t('passed') : t('failed')})
                        </span>
                      ) : (
                        <span className="badge badge-warning">{t('inProgress')}</span>
                      )}
                    </div>
                  </div>
                </div>

                {item.grades.length === 0 ? (
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    No hay evaluaciones calificadas aún en este curso.
                  </p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                          <th style={{ padding: 'var(--space-2)' }}>{t('quizName')}</th>
                          <th style={{ padding: 'var(--space-2)' }}>{t('score')}</th>
                          <th style={{ padding: 'var(--space-2)' }}>Puntos</th>
                          <th style={{ padding: 'var(--space-2)' }}>{t('date')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.grades.map((g) => (
                          <tr key={g.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
                              {g.lesson?.title || 'Evaluación'}
                            </td>
                            <td style={{ padding: 'var(--space-2)' }}>
                              <span
                                className={`badge ${
                                  g.percentage >= item.course.passingScore ? 'badge-success' : 'badge-danger'
                                }`}
                              >
                                {g.percentage}%
                              </span>
                            </td>
                            <td style={{ padding: 'var(--space-2)', fontSize: 'var(--text-xs)' }}>
                              {g.score} / {g.maxScore}
                            </td>
                            <td style={{ padding: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                              {new Date(g.gradedAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 2. Vista de Instructor / Manager / Admin
  const whereCourse: { assignedCompanies?: { some: { companyId: string } } } = {};
  if (user.role === Role.MANAGER) {
    whereCourse.assignedCompanies = { some: { companyId: user.companyId } };
  }

  const courses = await db.course.findMany({
    where: whereCourse,
    select: { id: true, title: true, passingScore: true },
    orderBy: { title: 'asc' },
  });

  const selectedCourseId = searchParams?.courseId || courses[0]?.id;

  let currentCourse = null;
  let requiredLessons: { id: string; title: string; type: string; isRequired: boolean }[] = [];
  let studentsData: {
    id: string;
    name: string;
    email: string;
    companyName: string;
    position?: string;
    enrollmentStatus: string;
    grades: Record<string, { percentage: number; score: number; maxScore: number }>;
    courseAverage: number | null;
    isPassing: boolean;
  }[] = [];
  let pendingReviews: {
    answerId: string;
    attemptId: string;
    studentName: string;
    quizTitle: string;
    questionText: string;
    maxPoints: number;
    studentAnswer: unknown;
    submittedAt: Date | null;
  }[] = [];

  if (selectedCourseId) {
    currentCourse = await db.course.findUnique({
      where: { id: selectedCourseId },
      include: {
        assignedCompanies: true,
        modules: {
          orderBy: { position: 'asc' },
          include: {
            lessons: {
              orderBy: { position: 'asc' },
              select: {
                id: true,
                title: true,
                type: true,
                isRequired: true,
              },
            },
          },
        },
      },
    });

    if (currentCourse && canAccessCourse(user, currentCourse)) {
      requiredLessons = currentCourse.modules
        .flatMap((m) => m.lessons)
        .filter((l) => l.isRequired || l.type === 'QUIZ');

      const whereEnrollment: {
        courseId: string;
        user: {
          isActive: boolean;
          role: Role;
          companyId?: string;
        };
      } = {
        courseId: selectedCourseId,
        user: {
          isActive: true,
          role: Role.COLLABORATOR,
        },
      };

      if (user.role === Role.MANAGER) {
        whereEnrollment.user.companyId = user.companyId;
      }

      const enrollments = await db.enrollment.findMany({
        where: whereEnrollment,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              position: true,
              company: { select: { name: true } },
            },
          },
        },
        orderBy: { user: { name: 'asc' } },
      });

      const userIds = enrollments.map((e) => e.user.id);
      const allGrades = await db.grade.findMany({
        where: {
          courseId: selectedCourseId,
          userId: { in: userIds },
        },
      });

      studentsData = await Promise.all(
        enrollments.map(async (enr) => {
          const u = enr.user;
          const studentGrades = allGrades.filter((g) => g.userId === u.id);
          const gradesMap: Record<string, { percentage: number; score: number; maxScore: number }> = {};
          studentGrades.forEach((g) => {
            if (g.lessonId) {
              gradesMap[g.lessonId] = {
                percentage: g.percentage,
                score: g.score,
                maxScore: g.maxScore,
              };
            }
          });

          const courseGrade = await calculateCourseGrade(u.id, selectedCourseId);

          return {
            id: u.id,
            name: u.name,
            email: u.email,
            companyName: u.company?.name || 'N/A',
            position: u.position || '',
            enrollmentStatus: enr.status,
            grades: gradesMap,
            courseAverage: courseGrade.finalGrade,
            isPassing: courseGrade.isPassing,
          };
        })
      );

      // Entregas abiertas pendientes de calificar
      const pendingAnswers = await db.answer.findMany({
        where: {
          pointsAwarded: null,
          question: {
            type: QuestionType.OPEN,
            quiz: { lesson: { moduleId: { in: currentCourse.modules.map((m) => m.id) } } },
          },
          attempt: {
            finishedAt: { not: null },
            user: user.role === Role.MANAGER ? { companyId: user.companyId } : undefined,
          },
        },
        include: {
          question: true,
          attempt: {
            include: {
              quiz: true,
              user: { select: { name: true } },
            },
          },
        },
      });

      pendingReviews = pendingAnswers.map((a) => ({
        answerId: a.id,
        attemptId: a.attemptId,
        studentName: a.attempt.user.name,
        quizTitle: a.attempt.quiz.title,
        questionText: a.question.text,
        maxPoints: a.question.points,
        studentAnswer: a.selectedAnswer,
        submittedAt: a.attempt.finishedAt,
      }));
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header con selector de curso */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <FileSpreadsheet style={{ color: 'var(--brand-primary)' }} /> {t('title')}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
            {t('subtitle')}
          </p>
        </div>

        {courses.length > 0 && (
          <form method="GET" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <label htmlFor="courseSelect" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              {t('selectCourse')}:
            </label>
            <select
              id="courseSelect"
              name="courseId"
              defaultValue={selectedCourseId}
              className="form-input"
              style={{ width: '280px' }}
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <button type="submit" className="btn btn-secondary">
              Ver
            </button>
          </form>
        )}
      </div>

      {/* Tabla del Libro de Calificaciones */}
      {currentCourse ? (
        <GradebookTable
          course={{
            id: currentCourse.id,
            title: currentCourse.title,
            passingScore: currentCourse.passingScore,
          }}
          lessons={requiredLessons}
          students={studentsData}
          initialPendingReviews={pendingReviews}
        />
      ) : (
        <div className="glass-panel" style={{ padding: 'var(--space-12)', textAlign: 'center', color: 'var(--text-muted)' }}>
          <p>No se encontraron cursos disponibles.</p>
        </div>
      )}
    </div>
  );
}
