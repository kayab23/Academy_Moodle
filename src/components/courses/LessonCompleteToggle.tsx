'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

interface LessonCompleteToggleProps {
  lessonId: string;
  initialCompleted: boolean;
  isRequired: boolean;
}

export function LessonCompleteToggle({
  lessonId,
  initialCompleted,
  isRequired,
}: LessonCompleteToggleProps) {
  const router = useRouter();
  const t = useTranslations('progress');
  const [completed, setCompleted] = useState(initialCompleted);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    const nextState = !completed;

    try {
      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId,
          isCompleted: nextState,
        }),
      });

      if (!res.ok) {
        setLoading(false);
        return;
      }

      setCompleted(nextState);
      setLoading(false);
      router.refresh();
    } catch {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className={completed ? 'badge badge-success' : 'btn-secondary'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-1)',
        fontSize: 'var(--text-xs)',
        padding: 'var(--space-1) var(--space-2)',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      title={completed ? t('completed') : t('markComplete')}
    >
      {loading ? (
        <Loader2 size={13} className="animate-spin" />
      ) : completed ? (
        <CheckCircle2 size={13} />
      ) : (
        <Circle size={13} />
      )}
      <span>{completed ? t('completed') : t('markComplete')}</span>
      {isRequired && !completed && (
        <span style={{ color: 'var(--brand-primary)', fontWeight: 700 }}>*</span>
      )}
    </button>
  );
}
