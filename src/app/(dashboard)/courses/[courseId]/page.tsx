import React from 'react';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Layers, BookOpen, Clock, Award, ArrowLeft, Edit } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { requireAuth, canAccessCourse, canManageCourse } from '@/lib/scope';
import { db } from '@/lib/db';
import { Role, Prisma, EnrollmentStatus } from '@prisma/client';
import { calculateCourseProgress } from '@/lib/progress';
import { AddModuleForm } from '@/components/courses/AddModuleForm';
import { AddLessonForm } from '@/components/courses/AddLessonForm';
import { UploadResourceForm } from '@/components/courses/UploadResourceForm';
import { ResourceViewer } from '@/components/courses/ResourceViewer';
import { ModuleActions, LessonActions } from '@/components/courses/ModuleActions';
import { CourseProgressBar } from '@/components/courses/CourseProgressBar';
import { EnrollButton } from '@/components/courses/EnrollButton';
import { LessonCompleteToggle } from '@/components/courses/LessonCompleteToggle';
import { EnrollStudentsModal } from '@/components/courses/EnrollStudentsModal';

export default async function CourseDetailPage({ params }: { params: { courseId: string } }) {
  const session = await getServerSession(authOptions);
  const user = requireAuth(session);
  const t = await getTranslations('courses');
  const tModules = await getTranslations('modules');
  const tLessons = await getTranslations('lessons');
  const tCommon = await getTranslations('common');

  const course = await db.course.findUnique({
    where: { id: params.courseId },
    include: {
      category: true,
      instructor: { select: { name: true } },
      assignedCompanies: { include: { company: true } },
      modules: {
        orderBy: { position: 'asc' },
        include: {
          lessons: {
            orderBy: { position: 'asc' },
            include: { resources: { orderBy: { createdAt: 'asc' } } },
          },
        },
      },
    },
  });

  if (!course) {
    notFound();
  }

  if (!canAccessCourse(user, course)) {
    notFound();
  }

  const canManage = canManageCourse(user, course);

  // Consultar inscripción y progreso del usuario
  const [enrollment, progress] = await Promise.all([
    db.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: course.id } },
    }),
    calculateCourseProgress(user.id, course.id),
  ]);

  // Si tiene permisos de administración, buscar candidatos a inscribir
  let candidateStudents: {
    id: string;
    name: string;
    email: string;
    position: string | null;
    companyName: string;
  }[] = [];

  if (canManage) {
    const candidateWhere: Prisma.UserWhereInput = {
      isActive: true,
      role: Role.COLLABORATOR,
      enrollments: {
        none: {
          courseId: course.id,
          status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] },
        },
      },
    };

    if (user.role === Role.MANAGER) {
      candidateWhere.companyId = user.companyId;
    }

    const foundUsers = await db.user.findMany({
      where: candidateWhere,
      select: {
        id: true,
        name: true,
        email: true,
        position: true,
        company: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
      take: 50,
    });

    candidateStudents = foundUsers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      position: u.position,
      companyName: u.company.name,
    }));
  }

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

  const isEnrolled = Boolean(enrollment && enrollment.status !== 'SUSPENDED');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Cabecera del Curso */}
      <div className="glass-panel" style={{ padding: 'var(--space-8)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
          <Link href="/courses" className="btn-secondary" style={{ padding: 'var(--space-1) var(--space-3)', fontSize: 'var(--text-xs)' }}>
            <ArrowLeft size={14} />
            <span>{tCommon('back')}</span>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <span className={`badge ${statusBadgeClass}`}>
              {statusLabel}
            </span>
            <span className="badge badge-info">
              {difficultyLabel}
            </span>
            {course.category && (
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{course.category.name}</span>
            )}

            {canManage && (
              <>
                <EnrollStudentsModal courseId={course.id} candidateStudents={candidateStudents} />
                <Link href={`/courses/${course.id}/edit`} className="btn-primary" style={{ padding: 'var(--space-1) var(--space-3)', fontSize: 'var(--text-xs)' }}>
                  <Edit size={14} />
                  <span>{t('editCourse')}</span>
                </Link>
              </>
            )}

            <EnrollButton
              courseId={course.id}
              isEnrolled={isEnrolled}
              enrollmentId={enrollment?.id}
              status={enrollment?.status}
            />
          </div>
        </div>

        <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-2)' }}>{course.title}</h1>
        {course.description && (
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>{course.description}</p>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', marginTop: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          {course.instructor?.name && (
            <span><strong>{t('instructorLabel')}:</strong> {course.instructor.name}</span>
          )}
          {course.estimatedHours !== null && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
              <Clock size={13} /> {course.estimatedHours}h
            </span>
          )}
          <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
            <Award size={13} /> {course.passingScore}% min.
          </span>
          <span>
            <strong>{t('assignedCompanies')}:</strong>{' '}
            {course.assignedCompanies.length === 0 ? t('allCompanies') : course.assignedCompanies.map((ac) => ac.company.name).join(', ')}
          </span>
        </div>
      </div>

      {/* Barra de progreso interactiva (si está inscrito) */}
      {isEnrolled && (
        <CourseProgressBar
          percentage={progress.percentage}
          completedRequired={progress.completedRequired}
          totalRequired={progress.totalRequired}
          isFullyCompleted={progress.isFullyCompleted}
        />
      )}

      {/* Módulos y Lecciones */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {course.modules.length === 0 && (
          <div className="glass-panel" style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Layers size={40} style={{ margin: '0 auto var(--space-3)', color: 'var(--brand-primary)' }} />
            <p>{t('noModules')}</p>
          </div>
        )}

        {course.modules.map((module) => (
          <div key={module.id} className="glass-panel" style={{ padding: 'var(--space-6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h2 style={{ fontSize: 'var(--text-lg)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Layers size={18} style={{ color: 'var(--brand-primary)' }} /> {module.title}
              </h2>
              {canManage && (
                <ModuleActions
                  moduleId={module.id}
                  initialTitle={module.title}
                  initialDescription={module.description}
                />
              )}
            </div>

            {module.description && (
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
                {module.description}
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginLeft: 'var(--space-4)' }}>
              {module.lessons.length === 0 && (
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{tModules('noLessons')}</p>
              )}

              {module.lessons.map((lesson) => {
                const isLessonCompleted = progress.completedLessonIds.includes(lesson.id);

                return (
                  <div key={lesson.id} style={{ borderLeft: '2px solid var(--border-subtle)', paddingLeft: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <BookOpen size={16} style={{ color: 'var(--text-muted)' }} />
                        <strong style={{ fontSize: 'var(--text-sm)' }}>{lesson.title}</strong>
                        <span className="badge badge-info" style={{ fontSize: '10px' }}>{lesson.type}</span>
                        {lesson.duration && (
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{lesson.duration} min</span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <LessonCompleteToggle
                          lessonId={lesson.id}
                          initialCompleted={isLessonCompleted}
                          isRequired={lesson.isRequired}
                        />

                        {canManage && (
                          <LessonActions
                            lessonId={lesson.id}
                            initialTitle={lesson.title}
                            initialType={lesson.type}
                            initialContent={lesson.content}
                            initialDuration={lesson.duration}
                            initialIsRequired={lesson.isRequired}
                          />
                        )}
                      </div>
                    </div>

                    {lesson.content && (
                      <div
                        style={{
                          padding: 'var(--space-3)',
                          background: 'rgba(255, 255, 255, 0.03)',
                          borderRadius: 'var(--radius-md)',
                          fontSize: 'var(--text-sm)',
                          color: 'var(--text-secondary)',
                          marginBottom: 'var(--space-2)',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {lesson.content}
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                      {lesson.resources.length === 0 ? (
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{tLessons('noResources')}</span>
                      ) : (
                        lesson.resources.map((resource) => <ResourceViewer key={resource.id} resource={resource} />)
                      )}
                    </div>

                    {canManage && <UploadResourceForm lessonId={lesson.id} />}
                  </div>
                );
              })}

              {canManage && <AddLessonForm moduleId={module.id} />}
            </div>
          </div>
        ))}

        {canManage && <AddModuleForm courseId={course.id} />}
      </div>
    </div>
  );
}
