import React from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { getCompanyScope } from '@/lib/scope';
import {
  BookOpen,
  CheckCircle2,
  TrendingUp,
  Award,
  Sparkles,
  ArrowRight,
  Compass,
} from 'lucide-react';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  const t = await getTranslations('dashboard');
  const tCommon = await getTranslations('common');

  const user = session.user;
  const companyScope = getCompanyScope(user);

  // Consultar métricas del usuario actual
  const [activeEnrollmentsCount, completedEnrollmentsCount, certificatesCount, grades] =
    await Promise.all([
      db.enrollment.count({
        where: {
          userId: user.id,
          status: 'ACTIVE',
        },
      }),
      db.enrollment.count({
        where: {
          userId: user.id,
          status: 'COMPLETED',
        },
      }),
      db.certificate.count({
        where: {
          userId: user.id,
        },
      }),
      db.grade.findMany({
        where: {
          userId: user.id,
        },
        select: {
          percentage: true,
        },
      }),
    ]);

  const avgGrade =
    grades.length > 0
      ? (grades.reduce((sum, g) => sum + g.percentage, 0) / grades.length).toFixed(1) + '%'
      : '--';

  const kpis = [
    {
      title: t('kpiActiveCourses'),
      value: activeEnrollmentsCount,
      icon: BookOpen,
      badge: 'En progreso',
      color: 'var(--brand-primary)',
    },
    {
      title: t('kpiCompletedCourses'),
      value: completedEnrollmentsCount,
      icon: CheckCircle2,
      badge: 'Finalizados',
      color: 'var(--color-success)',
    },
    {
      title: t('kpiAvgGrade'),
      value: avgGrade,
      icon: TrendingUp,
      badge: 'Rendimiento',
      color: 'var(--color-warning)',
    },
    {
      title: t('kpiCertificates'),
      value: certificatesCount,
      icon: Award,
      badge: 'Acreditados',
      color: 'var(--brand-secondary)',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
      {/* Welcome Banner */}
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
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              textTransform: 'uppercase',
              color: 'var(--brand-primary)',
              letterSpacing: '0.05em',
              marginBottom: 'var(--space-2)',
            }}
          >
            <Sparkles size={14} />
            <span>{t('welcome')}</span>
          </div>
          <h1 style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-2)' }}>
            {user.name}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', maxWidth: '600px' }}>
            Tu espacio personal de formación continua y seguimiento de competencias profesionales.
          </p>
        </div>

        <div
          style={{
            position: 'absolute',
            right: '-40px',
            top: '-40px',
            width: '240px',
            height: '240px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--brand-gradient)',
            opacity: 0.15,
            filter: 'blur(40px)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* KPI Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 'var(--space-5)',
        }}
      >
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="glass-panel"
              style={{
                padding: 'var(--space-5)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-4)',
                transition: 'transform var(--transition-fast), border-color var(--transition-fast)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: kpi.color,
                  }}
                >
                  <Icon size={20} />
                </div>
                <span className="badge" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                  {kpi.badge}
                </span>
              </div>
              <div>
                <span style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
                  {kpi.value}
                </span>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                  {kpi.title}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State / My Courses Section (SPEC.md 3.2 - Empty State) */}
      <div className="glass-panel" style={{ padding: 'var(--space-8)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
          <h2 style={{ fontSize: 'var(--text-xl)' }}>{t('myCourses')}</h2>
        </div>

        <div
          style={{
            padding: 'var(--space-12) var(--space-4)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-4)',
            border: '1px dashed var(--border-strong)',
            borderRadius: 'var(--radius-lg)',
            background: 'rgba(255, 255, 255, 0.01)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--brand-primary)',
            }}
          >
            <Compass size={32} />
          </div>
          <div>
            <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-1)' }}>
              {t('emptyCourses')}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', maxWidth: '420px' }}>
              Explora los programas formativos disponibles para tu área e inscríbete para comenzar tu ruta de aprendizaje.
            </p>
          </div>
          <a href="/courses" className="btn-primary" style={{ marginTop: 'var(--space-2)' }}>
            <span>{t('exploreCatalog')}</span>
            <ArrowRight size={16} />
          </a>
        </div>
      </div>
    </div>
  );
}
