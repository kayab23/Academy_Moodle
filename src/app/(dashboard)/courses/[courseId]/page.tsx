import React from 'react';
import { getServerSession } from 'next-auth';
import { notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { requireAuth, canAccessCourse, canManageCourse } from '@/lib/scope';
import { db } from '@/lib/db';
import { Layers, BookOpen } from 'lucide-react';
import { AddModuleForm } from '@/components/courses/AddModuleForm';
import { AddLessonForm } from '@/components/courses/AddLessonForm';
import { UploadResourceForm } from '@/components/courses/UploadResourceForm';
import { ResourceViewer } from '@/components/courses/ResourceViewer';

export default async function CourseDetailPage({ params }: { params: { courseId: string } }) {
  const session = await getServerSession(authOptions);
  const user = requireAuth(session);

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div className="glass-panel" style={{ padding: 'var(--space-8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
          <span className={`badge ${course.status === 'PUBLISHED' ? 'badge-success' : course.status === 'ARCHIVED' ? 'badge-error' : 'badge-warning'}`}>
            {course.status}
          </span>
          {course.category && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{course.category.name}</span>}
        </div>
        <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-2)' }}>{course.title}</h1>
        {course.description && (
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>{course.description}</p>
        )}
        <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          {course.instructor?.name && <span>Instructor: {course.instructor.name}</span>}
          <span>
            Empresas: {course.assignedCompanies.length === 0 ? 'Todas' : course.assignedCompanies.map((ac) => ac.company.name).join(', ')}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {course.modules.length === 0 && (
          <div className="glass-panel" style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Layers size={40} style={{ margin: '0 auto var(--space-3)', color: 'var(--brand-primary)' }} />
            <p>Este curso todavía no tiene módulos.</p>
          </div>
        )}

        {course.modules.map((module) => (
          <div key={module.id} className="glass-panel" style={{ padding: 'var(--space-6)' }}>
            <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Layers size={18} style={{ color: 'var(--brand-primary)' }} /> {module.title}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginLeft: 'var(--space-4)' }}>
              {module.lessons.length === 0 && (
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Sin lecciones todavía.</p>
              )}

              {module.lessons.map((lesson) => (
                <div key={lesson.id} style={{ borderLeft: '2px solid var(--border-subtle)', paddingLeft: 'var(--space-4)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                    <BookOpen size={16} style={{ color: 'var(--text-muted)' }} />
                    <strong style={{ fontSize: 'var(--text-sm)' }}>{lesson.title}</strong>
                    <span className="badge badge-info" style={{ fontSize: '10px' }}>{lesson.type}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                    {lesson.resources.length === 0 ? (
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Sin recursos todavía.</span>
                    ) : (
                      lesson.resources.map((resource) => <ResourceViewer key={resource.id} resource={resource} />)
                    )}
                  </div>

                  {canManage && <UploadResourceForm lessonId={lesson.id} />}
                </div>
              ))}

              {canManage && <AddLessonForm moduleId={module.id} />}
            </div>
          </div>
        ))}

        {canManage && <AddModuleForm courseId={course.id} />}
      </div>
    </div>
  );
}
