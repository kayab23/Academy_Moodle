import React from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { authOptions } from '@/lib/auth';
import { requireRole, getCompanyScope } from '@/lib/scope';
import { Role } from '@prisma/client';
import { ShieldCheck, Building2, Users, Layers } from 'lucide-react';
import { db } from '@/lib/db';

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  let user;
  try {
    user = requireRole(session, [Role.ADMIN, Role.MANAGER]);
  } catch {
    redirect('/dashboard');
  }

  const t = await getTranslations('nav');

  // SPEC.md 1.2 / PLAN.md regla 4: MANAGER solo ve su propia empresa, ADMIN ve todas.
  const companyScope = getCompanyScope(user);

  const [companiesCount, usersCount, departmentsCount] = await Promise.all([
    db.company.count({
      where: user.role === Role.ADMIN ? {} : { id: user.companyId },
    }),
    db.user.count({ where: companyScope }),
    db.department.count({ where: companyScope }),
  ]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div className="glass-panel" style={{ padding: 'var(--space-8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
          <ShieldCheck size={28} style={{ color: 'var(--brand-primary)' }} />
          <h1 style={{ fontSize: 'var(--text-2xl)' }}>{t('admin')}</h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
          Panel de administración global y supervisión multi-empresa.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--space-4)',
            marginTop: 'var(--space-6)',
          }}
        >
          <div className="glass-panel" style={{ padding: 'var(--space-4)', background: 'var(--bg-surface-elevated)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-muted)' }}>
              <Building2 size={16} />
              <span style={{ fontSize: 'var(--text-xs)' }}>Empresas Activas</span>
            </div>
            <p style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, marginTop: 'var(--space-2)' }}>
              {companiesCount}
            </p>
          </div>

          <div className="glass-panel" style={{ padding: 'var(--space-4)', background: 'var(--bg-surface-elevated)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-muted)' }}>
              <Users size={16} />
              <span style={{ fontSize: 'var(--text-xs)' }}>Usuarios Registrados</span>
            </div>
            <p style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, marginTop: 'var(--space-2)' }}>
              {usersCount}
            </p>
          </div>

          <div className="glass-panel" style={{ padding: 'var(--space-4)', background: 'var(--bg-surface-elevated)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-muted)' }}>
              <Layers size={16} />
              <span style={{ fontSize: 'var(--text-xs)' }}>Departamentos</span>
            </div>
            <p style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, marginTop: 'var(--space-2)' }}>
              {departmentsCount}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
