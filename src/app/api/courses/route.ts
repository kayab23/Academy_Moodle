import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { requireAuth, canCreateCourses, AuthorizationError } from '@/lib/scope';
import { isTrustedOrigin } from '@/lib/csrf';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity';
import { CourseDifficulty, Role } from '@prisma/client';

const createCourseSchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres').max(200),
  description: z.string().max(2000).optional(),
  categoryId: z.string().cuid().optional().nullable(),
  difficulty: z.nativeEnum(CourseDifficulty).optional(),
  passingScore: z.number().min(0).max(100).optional(),
  companyIds: z.array(z.string().cuid()).optional(),
});

export async function POST(req: NextRequest) {
  // Esta ruta no está en el matcher de middleware.ts (solo cubre páginas),
  // así que la verificación de origen (SPEC.md 1.9) se hace aquí a mano.
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

  if (!canCreateCourses(user)) {
    return NextResponse.json({ error: 'Tu rol no puede crear cursos.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de petición inválido' }, { status: 400 });
  }

  const parsed = createCourseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 422 });
  }

  const { title, description, categoryId, difficulty, passingScore, companyIds } = parsed.data;

  // MANAGER/INSTRUCTOR solo pueden asignar su propia empresa, sin importar
  // qué companyIds envíen desde el cliente; solo ADMIN puede asignar varias.
  let effectiveCompanyIds: string[] = [];
  if (user.role === Role.ADMIN) {
    effectiveCompanyIds = companyIds || [];
  } else if (companyIds && companyIds.length > 0) {
    effectiveCompanyIds = [user.companyId];
  }

  try {
    const course = await db.course.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        categoryId: categoryId || null,
        difficulty: difficulty || CourseDifficulty.BEGINNER,
        passingScore: passingScore ?? 80,
        instructorId: user.role === Role.INSTRUCTOR ? user.id : null,
        assignedCompanies: {
          create: effectiveCompanyIds.map((companyId) => ({ companyId })),
        },
      },
    });

    await logActivity({
      userId: user.id,
      action: 'COURSE_CREATED',
      entityType: 'Course',
      entityId: course.id,
      metadata: { title: course.title },
    });

    return NextResponse.json(course, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('[COURSES_CREATE_ERROR]', error);
    return NextResponse.json({ error: 'No se pudo crear el curso.' }, { status: 500 });
  }
}
