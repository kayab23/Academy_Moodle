import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireRole } from '@/lib/scope';
import { Role } from '@prisma/client';
import { getAdminKpis } from '@/lib/reports';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  let user;
  try {
    user = requireRole(session, [Role.ADMIN, Role.MANAGER]);
  } catch {
    return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const requestedCompanyId = searchParams.get('companyId');

  // Si es ADMIN puede filtrar o ver todas; si es MANAGER se restringe a su empresa
  let targetCompanyId: string | undefined = undefined;
  if (user.role === Role.ADMIN) {
    targetCompanyId = requestedCompanyId || undefined;
  } else {
    targetCompanyId = user.companyId;
  }

  try {
    const kpis = await getAdminKpis(targetCompanyId);
    return NextResponse.json(kpis);
  } catch (error) {
    console.error('Error fetching admin KPIs:', error);
    return NextResponse.json(
      { error: 'Error interno al obtener métricas administrativas' },
      { status: 500 }
    );
  }
}
