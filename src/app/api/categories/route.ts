import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { requireAuth, requireRole } from '@/lib/scope';
import { isTrustedOrigin } from '@/lib/csrf';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity';
import { Role } from '@prisma/client';

const categorySchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  description: z.string().max(500).optional().nullable(),
  parentId: z.string().cuid().optional().nullable(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  try {
    requireAuth(session);
  } catch {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const categories = await db.courseCategory.findMany({
    orderBy: { name: 'asc' },
    include: {
      parent: { select: { id: true, name: true } },
      _count: { select: { courses: true, children: true } },
    },
  });

  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  let user;
  try {
    user = requireRole(session, [Role.ADMIN, Role.MANAGER]);
  } catch {
    return NextResponse.json({ error: 'Permisos insuficientes para gestionar categorías' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de petición inválido' }, { status: 400 });
  }

  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 422 });
  }

  const { name, description, parentId } = parsed.data;

  // Verificar que el parentId exista si se proporcionó
  if (parentId) {
    const parentExists = await db.courseCategory.findUnique({ where: { id: parentId } });
    if (!parentExists) {
      return NextResponse.json({ error: 'La categoría principal especificada no existe' }, { status: 400 });
    }
  }

  try {
    const category = await db.courseCategory.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        parentId: parentId || null,
      },
    });

    await logActivity({
      userId: user.id,
      action: 'CATEGORY_CREATED',
      entityType: 'CourseCategory',
      entityId: category.id,
      metadata: { name: category.name },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('[CATEGORY_CREATE_ERROR]', error);
    return NextResponse.json({ error: 'No se pudo crear la categoría.' }, { status: 500 });
  }
}
