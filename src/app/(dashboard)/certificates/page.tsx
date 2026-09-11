import React from 'react';
import { getTranslations } from 'next-intl/server';
import { Award } from 'lucide-react';

export default async function CertificatesPage() {
  const t = await getTranslations('nav');
  return (
    <div className="glass-panel" style={{ padding: 'var(--space-8)' }}>
      <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-4)' }}>{t('certificates')}</h1>
      <div style={{ textAlign: 'center', padding: 'var(--space-12) 0', color: 'var(--text-secondary)' }}>
        <Award size={48} style={{ margin: '0 auto var(--space-4)', color: 'var(--brand-primary)' }} />
        <p>Acreditaciones y certificados en preparación para Fase 5.</p>
      </div>
    </div>
  );
}
