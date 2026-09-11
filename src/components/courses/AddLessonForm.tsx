'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Plus, X, Loader2 } from 'lucide-react';
import { LessonType } from '@prisma/client';

export function AddLessonForm({ moduleId }: { moduleId: string }) {
  const router = useRouter();
  const t = useTranslations('lessons');
  const tCommon = useTranslations('common');

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<LessonType>(LessonType.VIDEO);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/modules/${moduleId}/lessons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, type }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || tCommon('error'));
      setLoading(false);
      return;
    }
    setTitle('');
    setOpen(false);
    setLoading(false);
    router.refresh();
  };

  if (!open) {
    return (
      <button type="button" className="btn-secondary" style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-1) var(--space-3)' }} onClick={() => setOpen(true)}>
        <Plus size={14} /> <span>{t('newLesson')}</span>
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
      <input
        className="input-field"
        style={{ maxWidth: '220px' }}
        placeholder={t('title')}
        required
        minLength={2}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={loading}
        autoFocus
      />
      <select className="input-field" style={{ maxWidth: '160px' }} value={type} onChange={(e) => setType(e.target.value as LessonType)} disabled={loading}>
        <option value="VIDEO">Video</option>
        <option value="PRESENTATION">Presentación</option>
        <option value="DOCUMENT">Documento</option>
        <option value="TEXT">Texto</option>
        <option value="QUIZ">Evaluación</option>
      </select>
      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? <Loader2 size={14} className="animate-spin" /> : tCommon('save')}
      </button>
      <button type="button" className="btn-secondary" onClick={() => setOpen(false)} disabled={loading}>
        <X size={16} />
      </button>
      {error && <span style={{ color: 'var(--color-error)', fontSize: 'var(--text-xs)' }}>{error}</span>}
    </form>
  );
}
