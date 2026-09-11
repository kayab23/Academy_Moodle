import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAuth, canAccessCourse, canManageCourse } from '@/lib/scope';
import { db } from '@/lib/db';
import { Role, EnrollmentStatus, QuestionType } from '@prisma/client';
import { calculateCourseGrade } from '@/lib/grading';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = requireAuth(session);

    const searchParams = req.nextUrl.searchParams;
    const courseId = searchParams.get('courseId');

    // 1. Vista personal para Colaboradores
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

      const personalGrades = await Promise.all(
        enrollments.map(async (enr) => {
          const course = enr.course;
          const gradeResult = await calculateCourseGrade(user.id, course.id);
          const lessonGrades = await db.grade.findMany({
            where: {
              userId: user.id,
              courseId: course.id,
            },
            include: {
              lesson: { select: { title: true } },
            },
          });

          return {
            courseId: course.id,
            courseTitle: course.title,
            passingScore: course.passingScore,
            finalGrade: gradeResult.finalGrade,
            isPassing: gradeResult.isPassing,
            gradedCount: gradeResult.gradedCount,
            requiredCount: gradeResult.requiredCount,
            grades: lessonGrades.map((g) => ({
              id: g.id,
              lessonTitle: g.lesson?.title || 'Evaluación',
              score: g.score,
              maxScore: g.maxScore,
              percentage: g.percentage,
              gradedAt: g.gradedAt,
            })),
          };
        })
      );

      return NextResponse.json({ isPersonal: true, courses: personalGrades });
    }

    // 2. Vista de Instructor / Manager / Admin
    if (!courseId) {
      // Devolver lista de cursos gestionables para seleccionar
      const whereCourse: {
        assignedCompanies?: { some: { companyId: string } };
        instructorId?: string;
      } = {};
      if (user.role === Role.MANAGER) {
        whereCourse.assignedCompanies = { some: { companyId: user.companyId } };
      } else if (user.role === Role.INSTRUCTOR) {
        // Mismo criterio que en certificados: un instructor solo administra
        // el gradebook de los cursos que él mismo imparte.
        whereCourse.instructorId = user.id;
      }

      const courses = await db.course.findMany({
        where: whereCourse,
        select: { id: true, title: true, passingScore: true },
        orderBy: { title: 'asc' },
      });

      return NextResponse.json({ courses });
    }

    // Consultar curso específico
    const course = await db.course.findUnique({
      where: { id: courseId },
      include: {
        assignedCompanies: { include: { company: true } },
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

    if (!course) {
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
    }

    if (!canAccessCourse(user, course)) {
      return NextResponse.json({ error: 'Acceso no permitido' }, { status: 403 });
    }

    // Mismo criterio que en certificados: un instructor que no imparte este
    // curso no debe ver el gradebook completo de otros compañeros/empresas.
    if (user.role === Role.INSTRUCTOR && course.instructorId !== user.id) {
      return NextResponse.json({ error: 'Acceso no permitido' }, { status: 403 });
    }

    const canManage = canManageCourse(user, course);
    const requiredLessons = course.modules
      .flatMap((m) => m.lessons)
      .filter((l) => l.isRequired || l.type === 'QUIZ');

    // Filtro de alumnos por empresa
    const whereEnrollment: {
      courseId: string;
      user: {
        isActive: boolean;
        role: Role;
        companyId?: string;
      };
    } = {
      courseId,
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
        courseId,
        userId: { in: userIds },
      },
    });

    const students = await Promise.all(
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

        const courseGrade = await calculateCourseGrade(u.id, courseId);

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

    // Entregas con preguntas abiertas pendientes de revisión
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

    if (canManage) {
      const pendingAnswers = await db.answer.findMany({
        where: {
          pointsAwarded: null,
          question: {
            type: QuestionType.OPEN,
            quiz: { lesson: { moduleId: { in: course.modules.map((m) => m.id) } } },
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

    return NextResponse.json({
      course: {
        id: course.id,
        title: course.title,
        passingScore: course.passingScore,
      },
      lessons: requiredLessons,
      students,
      pendingReviews,
    });
  } catch (err: unknown) {
    console.error('[GRADEBOOK_GET_ERROR]', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
