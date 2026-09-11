import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireRole } from '@/lib/scope';
import { db } from '@/lib/db';
import { Role } from '@prisma/client';
import { calculateCourseProgress } from '@/lib/progress';

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

  let targetCompanyId = user.companyId;
  if (user.role === Role.ADMIN && requestedCompanyId) {
    targetCompanyId = requestedCompanyId;
  }

  // Obtener colaboradores de la empresa
  const members = await db.user.findMany({
    where: {
      companyId: user.role === Role.ADMIN && !requestedCompanyId ? undefined : targetCompanyId,
      isActive: true,
      role: Role.COLLABORATOR,
    },
    select: {
      id: true,
      name: true,
      email: true,
      position: true,
      department: { select: { id: true, name: true } },
      company: { select: { id: true, name: true, slug: true } },
      enrollments: {
        include: {
          course: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
        },
        orderBy: { enrolledAt: 'desc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  const memberReports = await Promise.all(
    members.map(async (member) => {
      const coursesProgress = await Promise.all(
        member.enrollments.map(async (enr) => {
          const progress = await calculateCourseProgress(member.id, enr.courseId);
          return {
            courseId: enr.courseId,
            courseTitle: enr.course.title,
            enrollmentStatus: enr.status,
            enrolledAt: enr.enrolledAt,
            completedAt: enr.completedAt,
            percentage: progress.percentage,
            completedRequired: progress.completedRequired,
            totalRequired: progress.totalRequired,
          };
        })
      );

      const completedCount = coursesProgress.filter((c) => c.enrollmentStatus === 'COMPLETED').length;
      const inProgressCount = coursesProgress.filter((c) => c.enrollmentStatus === 'ACTIVE').length;

      return {
        id: member.id,
        name: member.name,
        email: member.email,
        position: member.position,
        department: member.department?.name || 'General',
        company: member.company.name,
        completedCount,
        inProgressCount,
        courses: coursesProgress,
      };
    })
  );

  return NextResponse.json(memberReports);
}
