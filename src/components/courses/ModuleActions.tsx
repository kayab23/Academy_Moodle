'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Edit2, Trash2, X, Loader2, Save } from 'lucide-react';
import { LessonType } from '@prisma/client';

interface ModuleActionsProps {
  moduleId: string;
  initialTitle: string;
  initialDescription?: string | null;
}

export function ModuleActions({ moduleId, initialTitle, initialDescription }: ModuleActionsProps) {
  const router = useRouter();
  const t = useTranslations('modules');
  const tCommon = useTranslations('common');

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/modules/${moduleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || tCommon('error'));
        setLoading(false);
        return;
      }

      setEditing(false);
      router.refresh();
    } catch {
      setError(tCommon('error'));
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t('confirmDelete'))) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/modules/${moduleId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || tCommon('error'));
        setLoading(false);
        return;
      }

      router.refresh();
    } catch {
      alert(tCommon('error'));
      setLoading(false);
    }
  };

  if (editing) {
    return (
      <form onSubmit={handleUpdate} className="glass-panel" style={{ padding: 'var(--space-4)', margin: 'var(--space-2) 0', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ fontSize: 'var(--text-sm)' }}>{t('editModule')}</strong>
          <button type="button" onClick={() => setEditing(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>
        </div>

        {error && <span style={{ color: 'var(--color-error)', fontSize: 'var(--text-xs)' }}>{error}</span>}

        <input
          className="input-field"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          disabled={loading}
        />

        <textarea
          className="input-field"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('description')}
          disabled={loading}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <button type="button" onClick={() => setEditing(false)} className="btn-secondary" disabled={loading} style={{ fontSize: 'var(--text-xs)' }}>
            {tCommon('cancel')}
          </button>
          <button type="submit" className="btn-primary" disabled={loading} style={{ fontSize: 'var(--text-xs)' }}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            <span>{tCommon('save')}</span>
          </button>
        </div>
      </form>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="btn-secondary"
        style={{ padding: 'var(--space-1) var(--space-2)', fontSize: 'var(--text-xs)' }}
        title={t('editModule')}
      >
        <Edit2 size={13} />
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={loading}
        className="btn-danger"
        style={{ padding: 'var(--space-1) var(--space-2)', fontSize: 'var(--text-xs)' }}
        title={t('deleteModule')}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

interface LessonActionsProps {
  lessonId: string;
  initialTitle: string;
  initialType: LessonType;
  initialContent?: string | null;
  initialDuration?: number | null;
  initialIsRequired: boolean;
}

export function LessonActions({
  lessonId,
  initialTitle,
  initialType,
  initialContent,
  initialDuration,
  initialIsRequired,
}: LessonActionsProps) {
  const router = useRouter();
  const t = useTranslations('lessons');
  const tCommon = useTranslations('common');

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [type, setType] = useState<LessonType>(initialType);
  const [content, setContent] = useState(initialContent || '');
  const [duration, setDuration] = useState(initialDuration !== null && initialDuration !== undefined ? String(initialDuration) : '');
  const [isRequired, setIsRequired] = useState(initialIsRequired);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/lessons/${lessonId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          type,
          content: content.trim() || null,
          duration: duration !== '' ? Number(duration) : null,
          isRequired,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || tCommon('error'));
        setLoading(false);
        return;
      }

      setEditing(false);
      router.refresh();
    } catch {
      setError(tCommon('error'));
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t('confirmDelete'))) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/lessons/${lessonId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || tCommon('error'));
        setLoading(false);
        return;
      }

      router.refresh();
    } catch {
      alert(tCommon('error'));
      setLoading(false);
    }
  };

  if (editing) {
    return (
      <form onSubmit={handleUpdate} className="glass-panel" style={{ padding: 'var(--space-4)', margin: 'var(--space-2) 0', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ fontSize: 'var(--text-sm)' }}>{t('editLesson')}</strong>
          <button type="button" onClick={() => setEditing(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>
        </div>

        {error && <span style={{ color: 'var(--color-error)', fontSize: 'var(--text-xs)' }}>{error}</span>}

        <input
          className="input-field"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          disabled={loading}
          placeholder={t('title')}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          <select
            className="input-field"
            value={type}
            onChange={(e) => setType(e.target.value as LessonType)}
            disabled={loading}
          >
            <option value="TEXT">Texto</option>
            <option value="PRESENTATION">Presentación</option>
            <option value="VIDEO">Video</option>
            <option value="DOCUMENT">Documento</option>
            <option value="QUIZ">Evaluación / Quiz</option>
          </select>

          <input
            type="number"
            min="0"
            className="input-field"
            placeholder={t('duration')}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            disabled={loading}
          />
        </div>

        <textarea
          className="input-field"
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t('content')}
          disabled={loading}
        />

        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-xs)', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={isRequired}
            onChange={(e) => setIsRequired(e.target.checked)}
            disabled={loading}
          />
          <span>{t('required')}</span>
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <button type="button" onClick={() => setEditing(false)} className="btn-secondary" disabled={loading} style={{ fontSize: 'var(--text-xs)' }}>
            {tCommon('cancel')}
          </button>
          <button type="submit" className="btn-primary" disabled={loading} style={{ fontSize: 'var(--text-xs)' }}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            <span>{tCommon('save')}</span>
          </button>
        </div>
      </form>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="btn-secondary"
        style={{ padding: 'var(--space-1) var(--space-2)', fontSize: 'var(--text-xs)' }}
        title={t('editLesson')}
      >
        <Edit2 size={12} />
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={loading}
        className="btn-danger"
        style={{ padding: 'var(--space-1) var(--space-2)', fontSize: 'var(--text-xs)' }}
        title={t('deleteLesson')}
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}
