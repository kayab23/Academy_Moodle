import React from 'react';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { getTranslations } from 'next-intl/server';
import { BookOpen, Plus, Layers, User as UserIcon } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { requireAuth, canCreateCourses } from '@/lib/scope';
import { db } from '@/lib/db';
import { Role } from '@prisma/client';

export default async function CoursesCatalogPage() {
  const session = await getServerSession(authOptions);
  const user = requireAuth(session);
  const t = await getTranslations('nav');

  // Visibilidad: ADMIN ve todo; el resto ve cursos globales (sin empresa
  // asignada), cursos de su propia empresa, y los que instruye.
  const courses = await db.course.findMany({
    where:
      user.role === Role.ADMIN
        ? {}
        : {
            OR: [
              { assignedCompanies: { none: {} } },
              { assignedCompanies: { some: { companyId: user.companyId } } },
              { instructorId: user.id },
            ],
          },
    include: {
      category: true,
      instructor: { select: { name: true } },
      _count: { select: { modules: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div className="glass-panel" style={{ padding: 'var(--space-8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div>
            <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-1)' }}>{t('courses')}</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
              Cursos de capacitación disponibles para tu empresa.
            </p>
          </div>
          {canCreateCourses(user) && (
            <Link href="/courses/new" className="btn-primary">
              <Plus size={18} />
              <span>Nuevo curso</span>
            </Link>
          )}
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="glass-panel" style={{ padding: 'var(--space-12) 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <BookOpen size={48} style={{ margin: '0 auto var(--space-4)', color: 'var(--brand-primary)' }} />
          <p>Todavía no hay cursos creados.</p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/courses/${course.id}`}
              className="glass-panel"
              style={{ padding: 'var(--space-5)', display: 'block', color: 'inherit', textDecoration: 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                <span
                  className={`badge ${
                    course.status === 'PUBLISHED' ? 'badge-success' : course.status === 'ARCHIVED' ? 'badge-error' : 'badge-warning'
                  }`}
                >
                  {course.status}
                </span>
                {course.category && (
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{course.category.name}</span>
                )}
              </div>
              <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2)' }}>{course.title}</h3>
              {course.description && (
                <p
                  style={{
                    fontSize: 'var(--text-sm)',
                    color: 'var(--text-secondary)',
                    marginBottom: 'var(--space-4)',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {course.description}
                </p>
              )}
              <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                  <Layers size={14} /> {course._count.modules} módulos
                </span>
                {course.instructor?.name && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                    <UserIcon size={14} /> {course.instructor.name}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
