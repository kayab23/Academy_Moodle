import React from 'react';
import { getTranslations } from 'next-intl/server';
import { BookOpen } from 'lucide-react';

export default async function CoursesCatalogPage() {
  const t = await getTranslations('nav');
  return (
    <div className="glass-panel" style={{ padding: 'var(--space-8)' }}>
      <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-4)' }}>{t('courses')}</h1>
      <div style={{ textAlign: 'center', padding: 'var(--space-12) 0', color: 'var(--text-secondary)' }}>
        <BookOpen size={48} style={{ margin: '0 auto var(--space-4)', color: 'var(--brand-primary)' }} />
        <p>Catálogo de cursos en preparación para Fase 2.</p>
      </div>
    </div>
  );
}
