import React from 'react';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { getTranslations } from 'next-intl/server';
import { BookOpen, Plus, Layers, User as UserIcon, Clock, FolderKanban } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { requireAuth, canCreateCourses } from '@/lib/scope';
import { db } from '@/lib/db';
import { CourseDifficulty, CourseStatus, Prisma, Role } from '@prisma/client';
import { CourseFilters } from '@/components/courses/CourseFilters';

interface CoursesPageProps {
  searchParams?: {
    q?: string;
    category?: string;
    difficulty?: string;
    status?: string;
    company?: string;
  };
}

export default async function CoursesCatalogPage({ searchParams }: CoursesPageProps) {
  const session = await getServerSession(authOptions);
  const user = requireAuth(session);
  const t = await getTranslations('courses');
  const tNav = await getTranslations('nav');

  const q = searchParams?.q?.trim();
  const categoryId = searchParams?.category;
  const difficulty = searchParams?.difficulty as CourseDifficulty | undefined;
  const status = searchParams?.status as CourseStatus | undefined;
  const companyFilter = searchParams?.company;

  // Condiciones de consulta con aislamiento multi-empresa
  const andConditions: Prisma.CourseWhereInput[] = [];

  // Aislamiento multi-empresa por defecto
  if (user.role === Role.ADMIN) {
    if (companyFilter === 'global') {
      andConditions.push({ assignedCompanies: { none: {} } });
    } else if (companyFilter) {
      andConditions.push({ assignedCompanies: { some: { companyId: companyFilter } } });
    }
  } else {
    // MANAGER, INSTRUCTOR, COLLABORATOR
    andConditions.push({
      OR: [
        { assignedCompanies: { none: {} } },
        { assignedCompanies: { some: { companyId: user.companyId } } },
        { instructorId: user.id },
      ],
    });

    // Colaboradores solo pueden ver cursos publicados
    if (user.role === Role.COLLABORATOR) {
      andConditions.push({ status: CourseStatus.PUBLISHED });
    }
  }

  // Filtro de búsqueda por texto
  if (q) {
    andConditions.push({
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ],
    });
  }

  // Filtro por categoría
  if (categoryId) {
    andConditions.push({ categoryId });
  }

  // Filtro por dificultad
  if (difficulty && Object.values(CourseDifficulty).includes(difficulty)) {
    andConditions.push({ difficulty });
  }

  // Filtro por estado (solo aplicable si no es colaborador)
  if (status && user.role !== Role.COLLABORATOR && Object.values(CourseStatus).includes(status)) {
    andConditions.push({ status });
  }

  const whereClause: Prisma.CourseWhereInput = andConditions.length > 0 ? { AND: andConditions } : {};

  const [courses, categories, companies] = await Promise.all([
    db.course.findMany({
      where: whereClause,
      include: {
        category: true,
        instructor: { select: { name: true } },
        assignedCompanies: { include: { company: true } },
        _count: { select: { modules: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    db.courseCategory.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    user.role === Role.ADMIN
      ? db.company.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } })
      : Promise.resolve([]),
  ]);

  const canManage = canCreateCourses(user);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Cabecera del catálogo */}
      <div className="glass-panel" style={{ padding: 'var(--space-8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div>
            <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-1)' }}>{t('title')}</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
              {t('subtitle')}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            {(user.role === Role.ADMIN || user.role === Role.MANAGER) && (
              <Link href="/courses/categories" className="btn-secondary">
                <FolderKanban size={18} />
                <span>{tNav('categories')}</span>
              </Link>
            )}
            {canManage && (
              <Link href="/courses/new" className="btn-primary">
                <Plus size={18} />
                <span>{t('newCourse')}</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <CourseFilters
        categories={categories}
        companies={companies}
        isAdmin={user.role === Role.ADMIN}
        canManage={canManage}
      />

      {/* Grid de Cursos */}
      {courses.length === 0 ? (
        <div className="glass-panel" style={{ padding: 'var(--space-12) 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <BookOpen size={48} style={{ margin: '0 auto var(--space-4)', color: 'var(--brand-primary)' }} />
          <p>{t('emptyCatalog')}</p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          {courses.map((course) => {
            const statusBadgeClass =
              course.status === 'PUBLISHED'
                ? 'badge-success'
                : course.status === 'ARCHIVED'
                ? 'badge-error'
                : 'badge-warning';

            const statusLabel =
              course.status === 'PUBLISHED'
                ? t('statusPublished')
                : course.status === 'ARCHIVED'
                ? t('statusArchived')
                : t('statusDraft');

            const difficultyLabel =
              course.difficulty === 'ADVANCED'
                ? t('difficultyAdvanced')
                : course.difficulty === 'INTERMEDIATE'
                ? t('difficultyIntermediate')
                : t('difficultyBeginner');

            return (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className="glass-panel"
                style={{
                  padding: 'var(--space-5)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  color: 'inherit',
                  textDecoration: 'none',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                      <span className={`badge ${statusBadgeClass}`}>
                        {statusLabel}
                      </span>
                      <span className="badge badge-info" style={{ fontSize: '10px' }}>
                        {difficultyLabel}
                      </span>
                    </div>
                    {course.category && (
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{course.category.name}</span>
                    )}
                  </div>

                  <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2)', fontWeight: 600 }}>{course.title}</h3>

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
                        lineHeight: 1.5,
                      }}
                    >
                      {course.description}
                    </p>
                  )}
                </div>

                <div style={{ paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                      <Layers size={14} /> {t('modulesCount', { count: course._count.modules })}
                    </span>
                    {course.estimatedHours !== null && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                        <Clock size={13} /> {course.estimatedHours}h
                      </span>
                    )}
                    {course.instructor?.name && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                        <UserIcon size={14} /> {course.instructor.name}
                      </span>
                    )}
                  </div>

                  {user.role === Role.ADMIN && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {course.assignedCompanies.length === 0
                        ? t('allCompanies')
                        : course.assignedCompanies.map((ac) => ac.company.name).join(', ')}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
