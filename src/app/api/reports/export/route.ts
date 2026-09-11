import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireRole } from '@/lib/scope';
import { Role } from '@prisma/client';
import {
  getCoursesReport,
  getCollaboratorsReport,
  getDepartmentsReport,
  exportReportToCsv,
} from '@/lib/reports';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  let user;
  try {
    user = requireRole(session, [Role.ADMIN, Role.MANAGER]);
  } catch {
    return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const requestedCompanyId = searchParams.get('companyId');
  const locale = searchParams.get('locale') || user.locale || 'es';

  if (!type || !['courses', 'collaborators', 'departments'].includes(type)) {
    return NextResponse.json(
      { error: 'Tipo de reporte inválido. Debe ser: courses, collaborators o departments.' },
      { status: 400 }
    );
  }

  let targetCompanyId: string | undefined = undefined;
  if (user.role === Role.ADMIN) {
    targetCompanyId = requestedCompanyId || undefined;
  } else {
    targetCompanyId = user.companyId;
  }

  try {
    let csvData = '';
    const nowStr = new Date().toISOString().split('T')[0];

    if (type === 'courses') {
      const data = await getCoursesReport(targetCompanyId);
      csvData = exportReportToCsv('courses', data, locale);
    } else if (type === 'collaborators') {
      const data = await getCollaboratorsReport(targetCompanyId);
      csvData = exportReportToCsv('collaborators', data, locale);
    } else if (type === 'departments') {
      const data = await getDepartmentsReport(targetCompanyId);
      csvData = exportReportToCsv('departments', data, locale);
    }

    const filename = `reporte_${type}_${nowStr}.csv`;

    return new NextResponse(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting report to CSV:', error);
    return NextResponse.json(
      { error: 'Error interno al generar exportación CSV' },
      { status: 500 }
    );
  }
}
