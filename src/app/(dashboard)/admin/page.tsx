import React from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { authOptions } from '@/lib/auth';
import { requireRole } from '@/lib/scope';
import { Role } from '@prisma/client';
import { db } from '@/lib/db';
import { getAdminKpis } from '@/lib/reports';
import {
  ShieldCheck,
  Building2,
  Users,
  BookOpen,
  TrendingUp,
  Award,
  Clock,
  ArrowRight,
  FileSpreadsheet,
  BarChart3,
  Activity,
  CheckCircle2,
} from 'lucide-react';

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  let user;
  try {
    user = requireRole(session, [Role.ADMIN, Role.MANAGER]);
  } catch {
    redirect('/dashboard');
  }

  const t = await getTranslations('admin');
  const tNav = await getTranslations('nav');

  const targetCompanyId = user.role === Role.ADMIN ? undefined : user.companyId;

  const [kpis, recentLogs, companiesDetail] = await Promise.all([
    getAdminKpis(targetCompanyId),
    db.activityLog.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true, company: { select: { name: true } } } },
      },
    }),
    db.company.findMany({
      where: { isActive: true, ...(targetCompanyId ? { id: targetCompanyId } : {}) },
      include: {
        _count: {
          select: {
            users: { where: { role: Role.COLLABORATOR, isActive: true } },
            departments: true,
            courseAccess: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header Banner */}
      <div
        className="glass-panel"
        style={{
          padding: 'var(--space-6) var(--space-8)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ zIndex: 1 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              color: 'var(--brand-primary)',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 'var(--space-2)',
            }}
          >
            <ShieldCheck size={16} />
            <span>{tNav('admin')}</span>
          </div>
          <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, marginBottom: 'var(--space-1)' }}>
            {t('title')}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', maxWidth: '650px' }}>
            {t('subtitle')}
          </p>
        </div>

        <div
          style={{
            position: 'absolute',
            right: '-30px',
            top: '-30px',
            width: '200px',
            height: '200px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--brand-gradient)',
            opacity: 0.12,
            filter: 'blur(30px)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Primary KPI Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--space-4)',
        }}
      >
        <div className="glass-panel" style={{ padding: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--brand-primary)' }}>
            <Building2 size={18} />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{t('activeCompanies')}</span>
          </div>
          <p style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, marginTop: 'var(--space-2)', color: 'var(--text-primary)' }}>
            {companiesDetail.length}
          </p>
        </div>

        <div className="glass-panel" style={{ padding: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--brand-secondary)' }}>
            <Users size={18} />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{t('activeStudents')}</span>
          </div>
          <p style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, marginTop: 'var(--space-2)', color: 'var(--text-primary)' }}>
            {kpis.totalStudents}
          </p>
        </div>

        <div className="glass-panel" style={{ padding: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-success)' }}>
            <BookOpen size={18} />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{t('publishedCourses')}</span>
          </div>
          <p style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, marginTop: 'var(--space-2)', color: 'var(--text-primary)' }}>
            {kpis.activeCourses} <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>/ {kpis.totalCourses}</span>
          </p>
        </div>

        <div className="glass-panel" style={{ padding: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: '#38bdf8' }}>
            <CheckCircle2 size={18} />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{t('completionRate')}</span>
          </div>
          <p style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, marginTop: 'var(--space-2)', color: 'var(--text-primary)' }}>
            {kpis.completionRate}%
          </p>
        </div>

        <div className="glass-panel" style={{ padding: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-warning)' }}>
            <TrendingUp size={18} />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{t('avgGrade')}</span>
          </div>
          <p style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, marginTop: 'var(--space-2)', color: 'var(--text-primary)' }}>
            {kpis.avgPlatformGrade}%
          </p>
        </div>

        <div className="glass-panel" style={{ padding: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: '#a855f7' }}>
            <Award size={18} />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{t('certificatesIssued')}</span>
          </div>
          <p style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, marginTop: 'var(--space-2)', color: 'var(--text-primary)' }}>
            {kpis.totalCertificates}
          </p>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>
          {t('quickLinks')}
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          <a
            href="/reports"
            className="glass-panel"
            style={{
              padding: 'var(--space-5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              textDecoration: 'none',
              transition: 'transform var(--transition-fast), border-color var(--transition-fast)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface-elevated)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--brand-primary)',
                }}
              >
                <BarChart3 size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {t('viewReports')}
                </h3>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                  Métricas por curso y equipo
                </p>
              </div>
            </div>
            <ArrowRight size={18} style={{ color: 'var(--text-muted)' }} />
          </a>

          <a
            href="/courses"
            className="glass-panel"
            style={{
              padding: 'var(--space-5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              textDecoration: 'none',
              transition: 'transform var(--transition-fast), border-color var(--transition-fast)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface-elevated)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--brand-secondary)',
                }}
              >
                <BookOpen size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {t('manageCourses')}
                </h3>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                  Crear y publicar contenidos
                </p>
              </div>
            </div>
            <ArrowRight size={18} style={{ color: 'var(--text-muted)' }} />
          </a>

          <a
            href="/team"
            className="glass-panel"
            style={{
              padding: 'var(--space-5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              textDecoration: 'none',
              transition: 'transform var(--transition-fast), border-color var(--transition-fast)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface-elevated)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-success)',
                }}
              >
                <Users size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {t('manageTeam')}
                </h3>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                  Progreso por colaborador
                </p>
              </div>
            </div>
            <ArrowRight size={18} style={{ color: 'var(--text-muted)' }} />
          </a>

          <a
            href="/gradebook"
            className="glass-panel"
            style={{
              padding: 'var(--space-5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              textDecoration: 'none',
              transition: 'transform var(--transition-fast), border-color var(--transition-fast)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface-elevated)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-warning)',
                }}
              >
                <FileSpreadsheet size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {t('viewGradebook')}
                </h3>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                  Libro de calificaciones
                </p>
              </div>
            </div>
            <ArrowRight size={18} style={{ color: 'var(--text-muted)' }} />
          </a>
        </div>
      </div>

      {/* Multi-Company Breakdown & Activity Feed */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 'var(--space-6)',
        }}
      >
        {/* Company breakdown */}
        <div className="glass-panel" style={{ padding: 'var(--space-6)' }}>
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>
            Empresas en la Plataforma
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {companiesDetail.map((comp) => (
              <div
                key={comp.id}
                style={{
                  padding: 'var(--space-3) var(--space-4)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                    {comp.name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Slug: {comp.slug}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-3)', fontSize: 'var(--text-xs)' }}>
                  <span className="badge" style={{ background: 'var(--bg-surface)' }}>
                    {comp._count.users} colaboradores
                  </span>
                  <span className="badge" style={{ background: 'var(--bg-surface)' }}>
                    {comp._count.departments} depts
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Log / Activity */}
        <div className="glass-panel" style={{ padding: 'var(--space-6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            <Activity size={18} style={{ color: 'var(--brand-primary)' }} />
            <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>
              {t('recentActivity')}
            </h2>
          </div>
          {recentLogs.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', padding: 'var(--space-4) 0' }}>
              No hay actividades registradas recientemente.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    fontSize: 'var(--text-xs)',
                    paddingBottom: 'var(--space-2)',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {log.action}
                    </div>
                    <div style={{ color: 'var(--text-muted)' }}>
                      {log.user?.name ? `${log.user.name} (${log.user.company.name})` : 'Sistema'}
                    </div>
                  </div>
                  <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: '10px' }}>
                    {new Date(log.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
