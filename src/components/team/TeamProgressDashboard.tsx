'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Search, Users, BookOpen, CheckCircle2, Clock, ChevronRight } from 'lucide-react';

interface CourseProgressInfo {
  courseId: string;
  courseTitle: string;
  enrollmentStatus: string;
  enrolledAt: string | Date;
  completedAt?: string | Date | null;
  percentage: number;
  completedRequired: number;
  totalRequired: number;
}

interface MemberReport {
  id: string;
  name: string;
  email: string;
  position: string | null;
  department: string;
  company: string;
  completedCount: number;
  inProgressCount: number;
  courses: CourseProgressInfo[];
}

interface TeamProgressDashboardProps {
  members: MemberReport[];
}

export function TeamProgressDashboard({ members }: TeamProgressDashboardProps) {
  const t = useTranslations('team');

  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');

  const departments = Array.from(new Set(members.map((m) => m.department))).filter(Boolean);

  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = !departmentFilter || m.department === departmentFilter;
    return matchesSearch && matchesDept;
  });

  const totalCollaborators = members.length;
  const totalCompletedCourses = members.reduce((sum, m) => sum + m.completedCount, 0);
  const totalInProgressCourses = members.reduce((sum, m) => sum + m.inProgressCount, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* KPIs del Equipo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
        <div className="glass-panel" style={{ padding: 'var(--space-5)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', background: 'rgba(2, 132, 199, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-primary)' }}>
            <Users size={22} />
          </div>
          <div>
            <span style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
              {totalCollaborators}
            </span>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Colaboradores supervisados</p>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: 'var(--space-5)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-warning)' }}>
            <BookOpen size={22} />
          </div>
          <div>
            <span style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
              {totalInProgressCourses}
            </span>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Capacitaciones en curso</p>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: 'var(--space-5)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-success)' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <span style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
              {totalCompletedCourses}
            </span>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Cursos completados</p>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="glass-panel" style={{ padding: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <Search size={16} style={{ position: 'absolute', left: 'var(--space-3)', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input-field"
            style={{ paddingLeft: 'var(--space-8)' }}
            placeholder="Buscar por colaborador o correo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {departments.length > 0 && (
          <select
            className="input-field"
            style={{ flex: '0 1 200px' }}
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
          >
            <option value="">{t('allDepartments')}</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        )}
      </div>

      {/* Lista de Colaboradores */}
      {filteredMembers.length === 0 ? (
        <div className="glass-panel" style={{ padding: 'var(--space-12) 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Users size={48} style={{ margin: '0 auto var(--space-4)', color: 'var(--brand-primary)' }} />
          <p>{t('noData')}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {filteredMembers.map((member) => (
            <div key={member.id} className="glass-panel" style={{ padding: 'var(--space-5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                <div>
                  <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>{member.name}</h3>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    {member.email} • {member.position || 'Colaborador'} • <strong>{member.department}</strong>
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <span className="badge badge-info" style={{ fontSize: '11px' }}>
                    {member.inProgressCount} en progreso
                  </span>
                  <span className="badge badge-success" style={{ fontSize: '11px' }}>
                    {member.completedCount} completados
                  </span>
                </div>
              </div>

              {/* Cursos del Colaborador */}
              {member.courses.length === 0 ? (
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  Sin cursos inscritos en este momento.
                </p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-3)' }}>
                  {member.courses.map((course) => (
                    <div
                      key={course.courseId}
                      style={{
                        padding: 'var(--space-3)',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-surface-elevated)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: 'var(--space-2)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Link
                          href={`/courses/${course.courseId}`}
                          style={{
                            fontSize: 'var(--text-sm)',
                            fontWeight: 600,
                            color: 'inherit',
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-1)',
                          }}
                        >
                          <span>{course.courseTitle}</span>
                          <ChevronRight size={13} style={{ color: 'var(--text-muted)' }} />
                        </Link>
                        <span className={`badge ${course.enrollmentStatus === 'COMPLETED' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '10px' }}>
                          {course.enrollmentStatus === 'COMPLETED' ? 'Completado' : 'En progreso'}
                        </span>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                          <span>Avance</span>
                          <strong style={{ color: course.percentage === 100 ? 'var(--color-success)' : 'var(--brand-primary)' }}>
                            {course.percentage}%
                          </strong>
                        </div>
                        <div style={{ width: '100%', height: '4px', borderRadius: 'var(--radius-full)', background: 'var(--border-subtle)', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${course.percentage}%`,
                              height: '100%',
                              background: course.percentage === 100 ? 'var(--color-success)' : 'var(--brand-primary)',
                              borderRadius: 'var(--radius-full)',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
