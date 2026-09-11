import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAuth } from '@/lib/scope';
import { db } from '@/lib/db';
import { Role } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = requireAuth(session);

    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get('q');

    // Filtros según rol
    const where: {
      userId?: string;
      user?: { companyId?: string };
      OR?: { title?: { contains: string; mode: 'insensitive' }; certificateNumber?: { contains: string; mode: 'insensitive' } }[];
    } = {};

    if (user.role === Role.COLLABORATOR) {
      where.userId = user.id;
    } else if (user.role === Role.MANAGER) {
      where.user = { companyId: user.companyId };
    }

    if (query) {
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { certificateNumber: { contains: query, mode: 'insensitive' } },
      ];
    }

    const certificates = await db.certificate.findMany({
      where,
      orderBy: { issuedAt: 'desc' },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            thumbnail: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            company: {
              select: {
                id: true,
                name: true,
                slug: true,
                primaryColor: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(certificates);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno del servidor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
