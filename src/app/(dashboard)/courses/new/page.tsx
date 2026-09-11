import React from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { authOptions } from '@/lib/auth';
import { requireAuth, canCreateCourses } from '@/lib/scope';
import { db } from '@/lib/db';
import { Role } from '@prisma/client';
import { NewCourseForm } from '@/components/courses/NewCourseForm';

export default async function NewCoursePage() {
  const session = await getServerSession(authOptions);
  const user = requireAuth(session);
  const t = await getTranslations('courses');

  if (!canCreateCourses(user)) {
    redirect('/courses');
  }

  const categories = await db.courseCategory.findMany({ orderBy: { name: 'asc' } });
  const companies = user.role === Role.ADMIN ? await db.company.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }) : [];

  return (
    <div className="glass-panel" style={{ padding: 'var(--space-8)', maxWidth: '640px', margin: '0 auto' }}>
      <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-2)' }}>{t('newCourse')}</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-6)' }}>
        {t('newCourseSubtitle')}
      </p>
      <NewCourseForm categories={categories} companies={companies} isAdmin={user.role === Role.ADMIN} />
    </div>
  );
}
