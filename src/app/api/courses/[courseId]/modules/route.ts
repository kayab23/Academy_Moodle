import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { requireAuth, canManageCourse } from '@/lib/scope';
import { isTrustedOrigin } from '@/lib/csrf';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity';

const createModuleSchema = z.object({
  title: z.string().min(2, 'El título debe tener al menos 2 caracteres').max(200),
  description: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest, { params }: { params: { courseId: string } }) {
  // Fuera del matcher de middleware.ts (solo cubre páginas) — ver SPEC.md 1.9.
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

  const parsed = createModuleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 422 });
  }

  const lastPosition = await db.module.count({ where: { courseId: course.id } });

  const createdModule = await db.module.create({
    data: {
      title: parsed.data.title.trim(),
      description: parsed.data.description?.trim() || null,
      position: lastPosition,
      courseId: course.id,
    },
  });

  await logActivity({
    userId: user.id,
    action: 'MODULE_CREATED',
    entityType: 'Module',
    entityId: createdModule.id,
    metadata: { courseId: course.id, title: createdModule.title },
  });

  return NextResponse.json(createdModule, { status: 201 });
}
