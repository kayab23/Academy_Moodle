import React from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { requireRole } from '@/lib/scope';
import { Role } from '@prisma/client';
import {
  getAdminKpis,
  getCoursesReport,
  getCollaboratorsReport,
  getDepartmentsReport,
} from '@/lib/reports';
import { ReportsManager } from '@/components/reports/ReportsManager';

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);

  let user;
  try {
    user = requireRole(session, [Role.ADMIN, Role.MANAGER]);
  } catch {
    redirect('/dashboard');
  }

  // Si es ADMIN, por defecto carga el consolidado global (undefined).
  // Si es MANAGER, se restringe a su empresa.
  const targetCompanyId = user.role === Role.ADMIN ? undefined : user.companyId;

  const [initialKpis, initialCourses, initialCollaborators, initialDepartments] =
    await Promise.all([
      getAdminKpis(targetCompanyId),
      getCoursesReport(targetCompanyId),
      getCollaboratorsReport(targetCompanyId),
      getDepartmentsReport(targetCompanyId),
    ]);

  return (
    <ReportsManager
      initialKpis={initialKpis}
      initialCourses={initialCourses}
      initialCollaborators={initialCollaborators}
      initialDepartments={initialDepartments}
      userRole={user.role}
      userCompanyId={user.companyId}
      companies={initialKpis.companies}
      locale={user.locale || 'es'}
    />
  );
}
