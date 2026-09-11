import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { requireRole } from '@/lib/scope';
import { isTrustedOrigin } from '@/lib/csrf';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity';
import { Role } from '@prisma/client';

const updateCategorySchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  parentId: z.string().cuid().optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: { categoryId: string } }) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  let user;
  try {
    user = requireRole(session, [Role.ADMIN, Role.MANAGER]);
  } catch {
    return NextResponse.json({ error: 'Permisos insuficientes para editar categorías' }, { status: 403 });
  }

  const existing = await db.courseCategory.findUnique({
    where: { id: params.categoryId },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de petición inválido' }, { status: 400 });
  }

  const parsed = updateCategorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 422 });
  }

  const { name, description, parentId } = parsed.data;

  // Evitar que sea su propio padre
  if (parentId === params.categoryId) {
    return NextResponse.json({ error: 'Una categoría no puede ser su propia categoría principal' }, { status: 400 });
  }

  if (parentId) {
    const parentExists = await db.courseCategory.findUnique({ where: { id: parentId } });
    if (!parentExists) {
      return NextResponse.json({ error: 'La categoría principal especificada no existe' }, { status: 400 });
    }
  }

  try {
    const updated = await db.courseCategory.update({
      where: { id: params.categoryId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(parentId !== undefined && { parentId: parentId || null }),
      },
    });

    await logActivity({
      userId: user.id,
      action: 'CATEGORY_UPDATED',
      entityType: 'CourseCategory',
      entityId: updated.id,
      metadata: { name: updated.name },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[CATEGORY_UPDATE_ERROR]', error);
    return NextResponse.json({ error: 'No se pudo actualizar la categoría.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { categoryId: string } }) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  let user;
  try {
    user = requireRole(session, [Role.ADMIN]);
  } catch {
    return NextResponse.json({ error: 'Solo los administradores pueden eliminar categorías' }, { status: 403 });
  }

  const existing = await db.courseCategory.findUnique({
    where: { id: params.categoryId },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 });
  }

  try {
    await db.courseCategory.delete({
      where: { id: params.categoryId },
    });

    await logActivity({
      userId: user.id,
      action: 'CATEGORY_DELETED',
      entityType: 'CourseCategory',
      entityId: params.categoryId,
      metadata: { name: existing.name },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[CATEGORY_DELETE_ERROR]', error);
    return NextResponse.json({ error: 'No se pudo eliminar la categoría.' }, { status: 500 });
  }
}
