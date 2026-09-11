import React from 'react';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { getTranslations } from 'next-intl/server';
import { authOptions } from '@/lib/auth';
import { requireAuth, canManageCourse } from '@/lib/scope';
import { db } from '@/lib/db';
import { Role } from '@prisma/client';
import { EditCourseForm } from '@/components/courses/EditCourseForm';

export default async function EditCoursePage({ params }: { params: { courseId: string } }) {
  const session = await getServerSession(authOptions);
  const user = requireAuth(session);
  const t = await getTranslations('courses');

  const course = await db.course.findUnique({
    where: { id: params.courseId },
    include: {
      assignedCompanies: { select: { companyId: true } },
    },
  });

  if (!course) {
    notFound();
  }

  if (!canManageCourse(user, course)) {
    notFound();
  }

  const [categories, companies] = await Promise.all([
    db.courseCategory.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    db.company.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ]);

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-1)' }}>{t('editCourse')}</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>{course.title}</p>
      </div>

      <EditCourseForm
        course={course}
        categories={categories}
        companies={companies}
        isAdmin={user.role === Role.ADMIN}
      />
    </div>
  );
}
