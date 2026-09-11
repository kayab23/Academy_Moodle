import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { requireAuth, canAccessCourse, canManageCourse, canAccessCompany } from '@/lib/scope';
import { isTrustedOrigin } from '@/lib/csrf';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity';
import { CourseStatus, EnrollmentStatus, Role } from '@prisma/client';
import { calculateCourseProgress } from '@/lib/progress';

const enrollSchema = z.object({
  courseId: z.string().cuid('ID de curso inválido'),
  userIds: z.array(z.string().cuid()).optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  let user;
  try {
    user = requireAuth(session);
  } catch {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get('courseId');

  if (courseId) {
    const course = await db.course.findUnique({
      where: { id: courseId },
      include: { assignedCompanies: true },
    });

    if (!course) {
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
    }

    if (!canAccessCourse(user, course)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    // Si puede administrar el curso, devuelve todos los inscritos según ámbito de empresa
    if (canManageCourse(user, course)) {
      const whereCondition: { courseId: string; user?: { companyId: string } } = {
        courseId,
      };

      if (user.role === Role.MANAGER) {
        whereCondition.user = { companyId: user.companyId };
      }

      const enrollments = await db.enrollment.findMany({
        where: whereCondition,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              companyId: true,
              position: true,
              department: { select: { name: true } },
            },
          },
        },
        orderBy: { enrolledAt: 'desc' },
      });

      return NextResponse.json(enrollments);
    }

    // Si es estudiante regular, devuelve solo su propia inscripción
    const myEnrollment = await db.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId } },
    });

    return NextResponse.json(myEnrollment ? [myEnrollment] : []);
  }

  // Lista todas las inscripciones del usuario autenticado con datos del curso
  const myEnrollments = await db.enrollment.findMany({
    where: { userId: user.id },
    include: {
      course: {
        include: {
          category: true,
          instructor: { select: { name: true } },
          _count: { select: { modules: true } },
        },
      },
    },
    orderBy: { enrolledAt: 'desc' },
  });

  const withProgress = await Promise.all(
    myEnrollments.map(async (enr) => {
      const progress = await calculateCourseProgress(user.id, enr.courseId);
      return {
        ...enr,
        progress,
      };
    })
  );

  return NextResponse.json(withProgress);
}

export async function POST(req: NextRequest) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  let user;
  try {
    user = requireAuth(session);
  } catch {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de petición inválido' }, { status: 400 });
  }

  const parsed = enrollSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 422 });
  }

  const { courseId, userIds } = parsed.data;

  const course = await db.course.findUnique({
    where: { id: courseId },
    include: { assignedCompanies: true },
  });

  if (!course) {
    return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
  }

  // 1. Caso Inscripción Manual Masiva (Admin / Manager)
  if (userIds && userIds.length > 0) {
    if (!canManageCourse(user, course)) {
      return NextResponse.json({ error: 'No tienes permisos para inscribir colaboradores en este curso' }, { status: 403 });
    }

    // Validar que los usuarios pertenezcan a la empresa permitida
    const targetUsers = await db.user.findMany({
      where: { id: { in: userIds }, isActive: true },
      select: { id: true, companyId: true },
    });

    if (user.role === Role.MANAGER) {
      const hasForeignUsers = targetUsers.some((u) => !canAccessCompany(user, u.companyId));
      if (hasForeignUsers) {
        return NextResponse.json({ error: 'Solo puedes inscribir colaboradores de tu propia empresa' }, { status: 403 });
      }
    }

    const operations = targetUsers.map((targetUser) =>
      db.enrollment.upsert({
        where: { userId_courseId: { userId: targetUser.id, courseId } },
        update: {
          status: EnrollmentStatus.ACTIVE,
          enrolledBy: user.id,
        },
        create: {
          userId: targetUser.id,
          courseId,
          status: EnrollmentStatus.ACTIVE,
          enrolledBy: user.id,
        },
      })
    );

    await db.$transaction(operations);

    await logActivity({
      userId: user.id,
      action: 'ENROLLMENT_BATCH_CREATED',
      entityType: 'Course',
      entityId: course.id,
      metadata: { count: targetUsers.length, courseTitle: course.title },
    });

    return NextResponse.json({ count: targetUsers.length }, { status: 201 });
  }

  // 2. Caso Auto-inscripción (Colaborador)
  if (!canAccessCourse(user, course)) {
    return NextResponse.json({ error: 'Este curso no está disponible para tu empresa' }, { status: 403 });
  }

  if (course.status !== CourseStatus.PUBLISHED && !canManageCourse(user, course)) {
    return NextResponse.json({ error: 'Solo puedes inscribirte en cursos publicados' }, { status: 400 });
  }

  const enrollment = await db.enrollment.upsert({
    where: { userId_courseId: { userId: user.id, courseId } },
    update: {
      status: EnrollmentStatus.ACTIVE,
    },
    create: {
      userId: user.id,
      courseId,
      status: EnrollmentStatus.ACTIVE,
      enrolledBy: user.id,
    },
  });

  await logActivity({
    userId: user.id,
    action: 'ENROLLMENT_CREATED',
    entityType: 'Enrollment',
    entityId: enrollment.id,
    metadata: { courseId: course.id, courseTitle: course.title },
  });

  return NextResponse.json(enrollment, { status: 201 });
}
