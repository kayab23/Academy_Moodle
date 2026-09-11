import React from 'react';
import { getTranslations } from 'next-intl/server';
import { BarChart3 } from 'lucide-react';

export default async function ReportsPage() {
  const t = await getTranslations('nav');
  return (
    <div className="glass-panel" style={{ padding: 'var(--space-8)' }}>
      <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-4)' }}>{t('reports')}</h1>
      <div style={{ textAlign: 'center', padding: 'var(--space-12) 0', color: 'var(--text-secondary)' }}>
        <BarChart3 size={48} style={{ margin: '0 auto var(--space-4)', color: 'var(--brand-primary)' }} />
        <p>Reportes y métricas de avance en preparación para Fase 6.</p>
      </div>
    </div>
  );
}
