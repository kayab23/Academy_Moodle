import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { requireAuth, canAccessCourse, canManageCourse } from '@/lib/scope';
import { isTrustedOrigin } from '@/lib/csrf';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity';
import { CourseDifficulty, CourseStatus, Role } from '@prisma/client';

const updateCourseSchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres').max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  categoryId: z.string().min(1).optional().nullable(),
  difficulty: z.nativeEnum(CourseDifficulty).optional(),
  estimatedHours: z.number().min(0).max(1000).optional().nullable(),
  passingScore: z.number().min(0).max(100).optional(),
  status: z.nativeEnum(CourseStatus).optional(),
  instructorId: z.string().cuid().optional().nullable(),
  companyIds: z.array(z.string().cuid()).optional(),
});

export async function GET(req: NextRequest, { params }: { params: { courseId: string } }) {
  const session = await getServerSession(authOptions);
  let user;
  try {
    user = requireAuth(session);
  } catch {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const course = await db.course.findUnique({
    where: { id: params.courseId },
    include: {
      category: true,
      instructor: { select: { id: true, name: true, email: true } },
      assignedCompanies: { include: { company: true } },
      modules: {
        orderBy: { position: 'asc' },
        include: {
          lessons: {
            orderBy: { position: 'asc' },
            include: { resources: { orderBy: { createdAt: 'asc' } } },
          },
        },
      },
    },
  });

  if (!course) {
    return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
  }

  if (!canAccessCourse(user, course)) {
    return NextResponse.json({ error: 'No tienes acceso a este curso' }, { status: 403 });
  }

  // Colaboradores solo pueden ver cursos publicados
  if (user.role === Role.COLLABORATOR && course.status !== CourseStatus.PUBLISHED) {
    return NextResponse.json({ error: 'Curso no disponible' }, { status: 404 });
  }

  return NextResponse.json(course);
}

export async function PATCH(req: NextRequest, { params }: { params: { courseId: string } }) {
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

  const course = await db.course.findUnique({
    where: { id: params.courseId },
    include: { assignedCompanies: true },
  });

  if (!course) {
    return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
  }

  if (!canManageCourse(user, course)) {
    return NextResponse.json({ error: 'No puedes administrar este curso.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de petición inválido' }, { status: 400 });
  }

  const parsed = updateCourseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 422 });
  }

  const {
    title,
    description,
    categoryId,
    difficulty,
    estimatedHours,
    passingScore,
    status,
    instructorId,
    companyIds,
  } = parsed.data;

  // Lógica de archivado/publicación
  let archivedAt = course.archivedAt;
  if (status === CourseStatus.ARCHIVED && course.status !== CourseStatus.ARCHIVED) {
    archivedAt = new Date();
  } else if (status && status !== CourseStatus.ARCHIVED) {
    archivedAt = null;
  }

  // Lógica multi-empresa
  let shouldUpdateCompanies = false;
  let effectiveCompanyIds: string[] = [];

  if (companyIds !== undefined) {
    if (user.role === Role.ADMIN) {
      shouldUpdateCompanies = true;
      effectiveCompanyIds = companyIds;
    } else if (user.role === Role.MANAGER) {
      shouldUpdateCompanies = true;
      effectiveCompanyIds = [user.companyId];
    }
  }

  try {
    const updated = await db.$transaction(async (tx) => {
      if (shouldUpdateCompanies) {
        await tx.courseCompany.deleteMany({ where: { courseId: course.id } });
        if (effectiveCompanyIds.length > 0) {
          await tx.courseCompany.createMany({
            data: effectiveCompanyIds.map((cid) => ({
              courseId: course.id,
              companyId: cid,
            })),
          });
        }
      }

      return await tx.course.update({
        where: { id: course.id },
        data: {
          ...(title !== undefined && { title: title.trim() }),
          ...(description !== undefined && { description: description?.trim() || null }),
          ...(categoryId !== undefined && { categoryId: categoryId || null }),
          ...(difficulty !== undefined && { difficulty }),
          ...(estimatedHours !== undefined && { estimatedHours }),
          ...(passingScore !== undefined && { passingScore }),
          ...(status !== undefined && { status }),
          ...(archivedAt !== course.archivedAt && { archivedAt }),
          ...(instructorId !== undefined && user.role === Role.ADMIN && { instructorId: instructorId || null }),
        },
        include: {
          category: true,
          assignedCompanies: { include: { company: true } },
        },
      });
    });

    const action =
      status === CourseStatus.ARCHIVED
        ? 'COURSE_ARCHIVED'
        : status === CourseStatus.PUBLISHED && course.status !== CourseStatus.PUBLISHED
        ? 'COURSE_PUBLISHED'
        : 'COURSE_UPDATED';

    await logActivity({
      userId: user.id,
      action,
      entityType: 'Course',
      entityId: updated.id,
      metadata: { title: updated.title, status: updated.status },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[COURSE_UPDATE_ERROR]', error);
    return NextResponse.json({ error: 'No se pudo actualizar el curso.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { courseId: string } }) {
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

  const course = await db.course.findUnique({
    where: { id: params.courseId },
    include: { assignedCompanies: true },
  });

  if (!course) {
    return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
  }

  if (!canManageCourse(user, course)) {
    return NextResponse.json({ error: 'No puedes administrar este curso.' }, { status: 403 });
  }

  // SPEC.md 2.6: Soft delete obligatorio para preservar integridad
  try {
    const archived = await db.course.update({
      where: { id: course.id },
      data: {
        status: CourseStatus.ARCHIVED,
        archivedAt: new Date(),
      },
    });

    await logActivity({
      userId: user.id,
      action: 'COURSE_ARCHIVED',
      entityType: 'Course',
      entityId: archived.id,
      metadata: { title: archived.title, method: 'soft_delete' },
    });

    return NextResponse.json({ success: true, message: 'Curso archivado correctamente' });
  } catch (error) {
    console.error('[COURSE_DELETE_ERROR]', error);
    return NextResponse.json({ error: 'No se pudo archivar el curso.' }, { status: 500 });
  }
}
