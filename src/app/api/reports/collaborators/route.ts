import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireRole } from '@/lib/scope';
import { Role } from '@prisma/client';
import { getCollaboratorsReport } from '@/lib/reports';

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

  let targetCompanyId: string | undefined = undefined;
  if (user.role === Role.ADMIN) {
    targetCompanyId = requestedCompanyId || undefined;
  } else {
    targetCompanyId = user.companyId;
  }

  try {
    const report = await getCollaboratorsReport(targetCompanyId);
    return NextResponse.json(report);
  } catch (error) {
    console.error('Error fetching collaborators report:', error);
    return NextResponse.json(
      { error: 'Error interno al obtener reporte de colaboradores' },
      { status: 500 }
    );
  }
}
