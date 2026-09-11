import React from 'react';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { getTranslations } from 'next-intl/server';
import { BookMarked, ArrowRight, CheckCircle2, Compass, Layers, User as UserIcon, Award } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { requireAuth } from '@/lib/scope';
import { db } from '@/lib/db';
import { calculateCourseProgress } from '@/lib/progress';

interface MyLearningPageProps {
  searchParams?: {
    tab?: 'active' | 'completed';
  };
}

export default async function MyLearningPage({ searchParams }: MyLearningPageProps) {
  const session = await getServerSession(authOptions);
  const user = requireAuth(session);
  const t = await getTranslations('myLearning');
  const tCourses = await getTranslations('courses');
  const tProgress = await getTranslations('progress');

  const currentTab = searchParams?.tab === 'completed' ? 'completed' : 'active';

  const enrollments = await db.enrollment.findMany({
    where: {
      userId: user.id,
      status: { in: ['ACTIVE', 'COMPLETED'] },
    },
    include: {
      course: {
        include: {
          category: true,
          instructor: { select: { name: true } },
          _count: { select: { modules: true } },
        },
      },
    },
    orderBy: { enrolledAt: 'desc' },
  });

  const enrolledWithProgress = await Promise.all(
    enrollments.map(async (enr) => {
      const progress = await calculateCourseProgress(user.id, enr.courseId);
      return {
        ...enr,
        progress,
      };
    })
  );

  const activeCourses = enrolledWithProgress.filter((e) => e.status === 'ACTIVE');
  const completedCourses = enrolledWithProgress.filter((e) => e.status === 'COMPLETED');

  const displayedCourses = currentTab === 'completed' ? completedCourses : activeCourses;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Cabecera */}
      <div className="glass-panel" style={{ padding: 'var(--space-8)' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-1)' }}>{t('title')}</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>{t('subtitle')}</p>

        {/* Pestañas */}
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-6)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 'var(--space-1)' }}>
          <Link
            href="/my-learning?tab=active"
            className={currentTab === 'active' ? 'btn-primary' : 'btn-secondary'}
            style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-2) var(--space-4)' }}
          >
            <BookMarked size={16} />
            <span>{t('tabInProgress', { count: activeCourses.length })}</span>
          </Link>
          <Link
            href="/my-learning?tab=completed"
            className={currentTab === 'completed' ? 'btn-primary' : 'btn-secondary'}
            style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-2) var(--space-4)' }}
          >
            <CheckCircle2 size={16} />
            <span>{t('tabCompleted', { count: completedCourses.length })}</span>
          </Link>
        </div>
      </div>

      {/* Lista de cursos según pestaña */}
      {displayedCourses.length === 0 ? (
        <div className="glass-panel" style={{ padding: 'var(--space-12) 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Compass size={48} style={{ margin: '0 auto var(--space-4)', color: 'var(--brand-primary)' }} />
          <p style={{ marginBottom: 'var(--space-4)' }}>
            {currentTab === 'completed' ? t('emptyCompleted') : t('emptyInProgress')}
          </p>
          <Link href="/courses" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span>{t('exploreCatalog')}</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          {displayedCourses.map((item) => {
            const course = item.course;
            const progress = item.progress;

            return (
              <div
                key={item.id}
                className="glass-panel"
                style={{
                  padding: 'var(--space-5)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 'var(--space-4)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                    <span className={`badge ${item.status === 'COMPLETED' ? 'badge-success' : 'badge-info'}`}>
                      {item.status === 'COMPLETED' ? 'Completado' : 'En progreso'}
                    </span>
                    {course.category && (
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        {course.category.name}
                      </span>
                    )}
                  </div>

                  <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
                    {course.title}
                  </h3>

                  {course.description && (
                    <p
                      style={{
                        fontSize: 'var(--text-sm)',
                        color: 'var(--text-secondary)',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.5,
                        marginBottom: 'var(--space-3)',
                      }}
                    >
                      {course.description}
                    </p>
                  )}
                </div>

                {/* Barra de Progreso del Curso */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-1)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {tProgress('requiredLessonsProgress', {
                        completed: progress.completedRequired,
                        total: progress.totalRequired,
                      })}
                    </span>
                    <strong style={{ color: progress.isFullyCompleted ? 'var(--color-success)' : 'var(--brand-primary)' }}>
                      {progress.percentage}%
                    </strong>
                  </div>

                  <div
                    style={{
                      width: '100%',
                      height: '6px',
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                      overflow: 'hidden',
                      marginBottom: 'var(--space-4)',
                    }}
                  >
                    <div
                      style={{
                        width: `${progress.percentage}%`,
                        height: '100%',
                        background: progress.isFullyCompleted
                          ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
                          : 'var(--brand-gradient)',
                        borderRadius: 'var(--radius-full)',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', gap: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                        <Layers size={13} /> {tCourses('modulesCount', { count: course._count.modules })}
                      </span>
                      {course.instructor?.name && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                          <UserIcon size={13} /> {course.instructor.name}
                        </span>
                      )}
                    </div>

                    <Link
                      href={`/courses/${course.id}`}
                      className="btn-primary"
                      style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-1) var(--space-3)' }}
                    >
                      <span>{item.status === 'COMPLETED' ? t('reviewCourse') : t('continueCourse')}</span>
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
