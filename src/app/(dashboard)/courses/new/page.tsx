import React from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { requireAuth, canCreateCourses } from '@/lib/scope';
import { db } from '@/lib/db';
import { Role } from '@prisma/client';
import { NewCourseForm } from '@/components/courses/NewCourseForm';

export default async function NewCoursePage() {
  const session = await getServerSession(authOptions);
  const user = requireAuth(session);

  if (!canCreateCourses(user)) {
    redirect('/courses');
  }

  const categories = await db.courseCategory.findMany({ orderBy: { name: 'asc' } });
  const companies = user.role === Role.ADMIN ? await db.company.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }) : [];

  return (
    <div className="glass-panel" style={{ padding: 'var(--space-8)', maxWidth: '640px', margin: '0 auto' }}>
      <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-2)' }}>Nuevo curso</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-6)' }}>
        Crea el curso primero; después podrás agregar módulos, lecciones y subir videos o presentaciones.
      </p>
      <NewCourseForm categories={categories} companies={companies} isAdmin={user.role === Role.ADMIN} />
    </div>
  );
}
