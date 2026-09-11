'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2 } from 'lucide-react';

interface CourseProgressBarProps {
  percentage: number;
  completedRequired: number;
  totalRequired: number;
  isFullyCompleted?: boolean;
}

export function CourseProgressBar({
  percentage,
  completedRequired,
  totalRequired,
  isFullyCompleted,
}: CourseProgressBarProps) {
  const t = useTranslations('progress');

  return (
    <div
      className="glass-panel"
      style={{
        padding: 'var(--space-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          {isFullyCompleted ? (
            <CheckCircle2 size={18} style={{ color: 'var(--color-success)' }} />
          ) : null}
          <strong style={{ fontWeight: 600 }}>{t('courseProgress')}</strong>
        </div>
        <span style={{ fontWeight: 700, color: isFullyCompleted ? 'var(--color-success)' : 'var(--brand-primary)' }}>
          {percentage}%
        </span>
      </div>

      <div
        style={{
          width: '100%',
          height: '8px',
          borderRadius: 'var(--radius-full)',
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-subtle)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: '100%',
            background: isFullyCompleted
              ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
              : 'var(--brand-gradient)',
            borderRadius: 'var(--radius-full)',
            transition: 'width 0.4s ease',
          }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
        <span>{t('requiredLessonsProgress', { completed: completedRequired, total: totalRequired })}</span>
        {isFullyCompleted && (
          <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
            {t('allCompleted')}
          </span>
        )}
      </div>
    </div>
  );
}
