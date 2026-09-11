import { db } from '@/lib/db';
import { Role, Prisma } from '@prisma/client';

export interface AdminKpis {
  totalCourses: number;
  activeCourses: number;
  totalStudents: number;
  totalEnrollments: number;
  completedEnrollments: number;
  activeEnrollments: number;
  suspendedEnrollments: number;
  completionRate: number;
  avgPlatformGrade: number;
  totalCertificates: number;
  totalStudyHours: number;
  companies: { id: string; name: string; slug: string }[];
  statusDistribution: {
    completed: number;
    active: number;
    suspended: number;
  };
}

export interface CourseReportItem {
  id: string;
  title: string;
  category: string;
  companies: string;
  status: string;
  difficulty: string;
  enrolledCount: number;
  completedCount: number;
  completionRate: number;
  avgGrade: number;
  certificatesCount: number;
  studyHours: number;
}

export interface CollaboratorReportItem {
  id: string;
  name: string;
  email: string;
  companyName: string;
  companyId: string;
  departmentName: string;
  position: string;
  enrolledCount: number;
  completedCount: number;
  completionRate: number;
  avgGrade: number;
  certificatesCount: number;
  studyHours: number;
}

export interface DepartmentReportItem {
  id: string;
  name: string;
  companyName: string;
  companyId: string;
  managerName: string;
  membersCount: number;
  totalEnrollments: number;
  totalCompletions: number;
  completionRate: number;
  avgGrade: number;
  certificatesCount: number;
}

/**
 * Obtiene los KPIs ejecutivos globales o filtrados por empresa.
 */
export async function getAdminKpis(companyId?: string): Promise<AdminKpis> {
  const userScope: Prisma.UserWhereInput = companyId ? { companyId } : {};
  const enrollmentScope: Prisma.EnrollmentWhereInput = companyId ? { user: { companyId } } : {};
  const gradeScope: Prisma.GradeWhereInput = companyId ? { user: { companyId } } : {};
  const certificateScope: Prisma.CertificateWhereInput = companyId ? { user: { companyId } } : {};
  const progressScope: Prisma.UserProgressWhereInput = companyId ? { user: { companyId } } : {};

  const courseScope: Prisma.CourseWhereInput = companyId
    ? {
        OR: [
          { assignedCompanies: { none: {} } },
          { assignedCompanies: { some: { companyId } } },
        ],
      }
    : {};

  const [
    totalCourses,
    activeCourses,
    totalStudents,
    totalEnrollments,
    completedEnrollments,
    activeEnrollments,
    suspendedEnrollments,
    grades,
    totalCertificates,
    progressItems,
    companies,
  ] = await Promise.all([
    db.course.count({ where: courseScope }),
    db.course.count({ where: { ...courseScope, status: 'PUBLISHED' } }),
    db.user.count({ where: { ...userScope, role: Role.COLLABORATOR, isActive: true } }),
    db.enrollment.count({ where: enrollmentScope }),
    db.enrollment.count({ where: { ...enrollmentScope, status: 'COMPLETED' } }),
    db.enrollment.count({ where: { ...enrollmentScope, status: 'ACTIVE' } }),
    db.enrollment.count({ where: { ...enrollmentScope, status: 'SUSPENDED' } }),
    db.grade.findMany({ where: gradeScope, select: { percentage: true } }),
    db.certificate.count({ where: certificateScope }),
    db.userProgress.findMany({ where: progressScope, select: { timeSpent: true } }),
    db.company.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const completionRate =
    totalEnrollments > 0
      ? Number(((completedEnrollments / totalEnrollments) * 100).toFixed(1))
      : 0;

  const avgPlatformGrade =
    grades.length > 0
      ? Number((grades.reduce((acc, g) => acc + g.percentage, 0) / grades.length).toFixed(1))
      : 0;

  const totalMinutes = progressItems.reduce((acc, p) => acc + (p.timeSpent || 0), 0);
  const totalStudyHours = Number((totalMinutes / 60).toFixed(1));

  return {
    totalCourses,
    activeCourses,
    totalStudents,
    totalEnrollments,
    completedEnrollments,
    activeEnrollments,
    suspendedEnrollments,
    completionRate,
    avgPlatformGrade,
    totalCertificates,
    totalStudyHours,
    companies,
    statusDistribution: {
      completed: completedEnrollments,
      active: activeEnrollments,
      suspended: suspendedEnrollments,
    },
  };
}

/**
 * Obtiene el reporte analítico por cada curso.
 */
export async function getCoursesReport(companyId?: string): Promise<CourseReportItem[]> {
  const courseScope: Prisma.CourseWhereInput = companyId
    ? {
        OR: [
          { assignedCompanies: { none: {} } },
          { assignedCompanies: { some: { companyId } } },
        ],
      }
    : {};

  const courses = await db.course.findMany({
    where: courseScope,
    include: {
      category: { select: { name: true } },
      assignedCompanies: { include: { company: { select: { name: true } } } },
      enrollments: {
        where: companyId ? { user: { companyId } } : {},
        select: { status: true },
      },
      grades: {
        where: companyId ? { user: { companyId } } : {},
        select: { percentage: true },
      },
      certificates: {
        where: companyId ? { user: { companyId } } : {},
        select: { id: true },
      },
      modules: {
        select: {
          lessons: {
            select: {
              progress: {
                where: companyId ? { user: { companyId } } : {},
                select: { timeSpent: true },
              },
            },
          },
        },
      },
    },
    orderBy: { title: 'asc' },
  });

  return courses.map((course) => {
    const enrolledCount = course.enrollments.length;
    const completedCount = course.enrollments.filter((e) => e.status === 'COMPLETED').length;
    const completionRate =
      enrolledCount > 0 ? Number(((completedCount / enrolledCount) * 100).toFixed(1)) : 0;

    const avgGrade =
      course.grades.length > 0
        ? Number(
            (
              course.grades.reduce((acc, g) => acc + g.percentage, 0) / course.grades.length
            ).toFixed(1)
          )
        : 0;

    const certificatesCount = course.certificates.length;

    let totalMinutes = 0;
    for (const mod of course.modules) {
      for (const lesson of mod.lessons) {
        for (const prog of lesson.progress) {
          totalMinutes += prog.timeSpent || 0;
        }
      }
    }
    const studyHours = Number((totalMinutes / 60).toFixed(1));

    const companies =
      course.assignedCompanies.length === 0
        ? 'Global'
        : course.assignedCompanies.map((ca) => ca.company.name).join(', ');

    return {
      id: course.id,
      title: course.title,
      category: course.category?.name || 'Sin categoría',
      companies,
      status: course.status,
      difficulty: course.difficulty,
      enrolledCount,
      completedCount,
      completionRate,
      avgGrade,
      certificatesCount,
      studyHours,
    };
  });
}

/**
 * Obtiene el reporte analítico por colaborador.
 */
export async function getCollaboratorsReport(
  companyId?: string
): Promise<CollaboratorReportItem[]> {
  const users = await db.user.findMany({
    where: {
      role: Role.COLLABORATOR,
      isActive: true,
      ...(companyId ? { companyId } : {}),
    },
    include: {
      company: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
      enrollments: { select: { status: true } },
      grades: { select: { percentage: true } },
      certificates: { select: { id: true } },
      progress: { select: { timeSpent: true } },
    },
    orderBy: { name: 'asc' },
  });

  return users.map((user) => {
    const enrolledCount = user.enrollments.length;
    const completedCount = user.enrollments.filter((e) => e.status === 'COMPLETED').length;
    const completionRate =
      enrolledCount > 0 ? Number(((completedCount / enrolledCount) * 100).toFixed(1)) : 0;

    const avgGrade =
      user.grades.length > 0
        ? Number(
            (user.grades.reduce((acc, g) => acc + g.percentage, 0) / user.grades.length).toFixed(1)
          )
        : 0;

    const certificatesCount = user.certificates.length;
    const totalMinutes = user.progress.reduce((acc, p) => acc + (p.timeSpent || 0), 0);
    const studyHours = Number((totalMinutes / 60).toFixed(1));

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      companyName: user.company.name,
      companyId: user.company.id,
      departmentName: user.department?.name || 'General',
      position: user.position || 'Colaborador',
      enrolledCount,
      completedCount,
      completionRate,
      avgGrade,
      certificatesCount,
      studyHours,
    };
  });
}

/**
 * Obtiene el reporte analítico por departamento.
 */
export async function getDepartmentsReport(companyId?: string): Promise<DepartmentReportItem[]> {
  const departments = await db.department.findMany({
    where: companyId ? { companyId } : {},
    include: {
      company: { select: { id: true, name: true } },
      manager: { select: { id: true, name: true } },
      users: {
        where: { role: Role.COLLABORATOR, isActive: true },
        include: {
          enrollments: { select: { status: true } },
          grades: { select: { percentage: true } },
          certificates: { select: { id: true } },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  return departments.map((dept) => {
    const membersCount = dept.users.length;
    let totalEnrollments = 0;
    let totalCompletions = 0;
    const allGrades: number[] = [];
    let certificatesCount = 0;

    for (const member of dept.users) {
      totalEnrollments += member.enrollments.length;
      totalCompletions += member.enrollments.filter((e) => e.status === 'COMPLETED').length;
      for (const g of member.grades) {
        allGrades.push(g.percentage);
      }
      certificatesCount += member.certificates.length;
    }

    const completionRate =
      totalEnrollments > 0
        ? Number(((totalCompletions / totalEnrollments) * 100).toFixed(1))
        : 0;

    const avgGrade =
      allGrades.length > 0
        ? Number((allGrades.reduce((acc, val) => acc + val, 0) / allGrades.length).toFixed(1))
        : 0;

    return {
      id: dept.id,
      name: dept.name,
      companyName: dept.company.name,
      companyId: dept.company.id,
      managerName: dept.manager?.name || 'No asignado',
      membersCount,
      totalEnrollments,
      totalCompletions,
      completionRate,
      avgGrade,
      certificatesCount,
    };
  });
}

/**
 * Escapa un valor individual para cumplir con RFC 4180.
 */
function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Exporta un conjunto de datos a formato CSV con UTF-8 BOM para compatibilidad con Excel.
 */
export function exportReportToCsv(
  type: 'courses' | 'collaborators' | 'departments',
  data: unknown[],
  locale = 'es'
): string {
  const BOM = '\uFEFF';
  const isEs = locale === 'es';

  let headers: string[] = [];
  let rows: string[][] = [];

  if (type === 'courses') {
    headers = isEs
      ? [
          'ID Curso',
          'Título del Curso',
          'Categoría',
          'Empresas',
          'Estado',
          'Dificultad',
          'Inscritos',
          'Completados',
          'Tasa de Finalización (%)',
          'Promedio (%)',
          'Certificados',
          'Horas de Estudio',
        ]
      : [
          'Course ID',
          'Course Title',
          'Category',
          'Companies',
          'Status',
          'Difficulty',
          'Enrolled',
          'Completed',
          'Completion Rate (%)',
          'Average Grade (%)',
          'Certificates',
          'Study Hours',
        ];

    const courseData = data as CourseReportItem[];
    rows = courseData.map((item) => [
      item.id,
      item.title,
      item.category,
      item.companies,
      item.status,
      item.difficulty,
      String(item.enrolledCount),
      String(item.completedCount),
      String(item.completionRate),
      String(item.avgGrade),
      String(item.certificatesCount),
      String(item.studyHours),
    ]);
  } else if (type === 'collaborators') {
    headers = isEs
      ? [
          'ID Colaborador',
          'Nombre',
          'Correo Electrónico',
          'Empresa',
          'Departamento',
          'Puesto',
          'Cursos Inscritos',
          'Cursos Completados',
          'Tasa de Avance (%)',
          'Promedio de Calificaciones (%)',
          'Certificados Obtenidos',
          'Horas de Estudio',
        ]
      : [
          'Collaborator ID',
          'Name',
          'Email',
          'Company',
          'Department',
          'Position',
          'Enrolled Courses',
          'Completed Courses',
          'Completion Rate (%)',
          'Average Grade (%)',
          'Certificates Earned',
          'Study Hours',
        ];

    const collabData = data as CollaboratorReportItem[];
    rows = collabData.map((item) => [
      item.id,
      item.name,
      item.email,
      item.companyName,
      item.departmentName,
      item.position,
      String(item.enrolledCount),
      String(item.completedCount),
      String(item.completionRate),
      String(item.avgGrade),
      String(item.certificatesCount),
      String(item.studyHours),
    ]);
  } else if (type === 'departments') {
    headers = isEs
      ? [
          'ID Departamento',
          'Departamento',
          'Empresa',
          'Gerente Responsable',
          'Total Integrantes',
          'Inscripciones Totales',
          'Finalizaciones Totales',
          'Tasa de Finalización (%)',
          'Promedio Departamental (%)',
          'Certificados Acumulados',
        ]
      : [
          'Department ID',
          'Department Name',
          'Company',
          'Manager',
          'Total Members',
          'Total Enrollments',
          'Total Completions',
          'Completion Rate (%)',
          'Department Average (%)',
          'Accumulated Certificates',
        ];

    const deptData = data as DepartmentReportItem[];
    rows = deptData.map((item) => [
      item.id,
      item.name,
      item.companyName,
      item.managerName,
      String(item.membersCount),
      String(item.totalEnrollments),
      String(item.totalCompletions),
      String(item.completionRate),
      String(item.avgGrade),
      String(item.certificatesCount),
    ]);
  }

  const csvLines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(',')),
  ];

  return BOM + csvLines.join('\r\n');
}
