import React from 'react';
import { getServerSession } from 'next-auth';
import { getTranslations } from 'next-intl/server';
import { authOptions } from '@/lib/auth';
import { requireRole } from '@/lib/scope';
import { db } from '@/lib/db';
import { Role } from '@prisma/client';
import { calculateCourseProgress } from '@/lib/progress';
import { TeamProgressDashboard } from '@/components/team/TeamProgressDashboard';

export default async function TeamPage() {
  const session = await getServerSession(authOptions);
  const user = requireRole(session, [Role.ADMIN, Role.MANAGER]);
  const t = await getTranslations('team');

  // Multi-empresa: si es MANAGER, solo su empresa; si es ADMIN, todas
  const members = await db.user.findMany({
    where: {
      companyId: user.role === Role.ADMIN ? undefined : user.companyId,
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
        where: { status: { in: ['ACTIVE', 'COMPLETED'] } },
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div className="glass-panel" style={{ padding: 'var(--space-8)' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-1)' }}>{t('title')}</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
          {t('subtitle')} {user.role === Role.MANAGER ? `(${members[0]?.company.name || ''})` : ''}
        </p>
      </div>

      <TeamProgressDashboard members={memberReports} />
    </div>
  );
}
