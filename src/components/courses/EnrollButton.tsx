'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { GraduationCap, Check, Loader2, LogOut } from 'lucide-react';
import { EnrollmentStatus } from '@prisma/client';

interface EnrollButtonProps {
  courseId: string;
  isEnrolled: boolean;
  enrollmentId?: string | null;
  status?: EnrollmentStatus;
}

export function EnrollButton({ courseId, isEnrolled, enrollmentId, status }: EnrollButtonProps) {
  const router = useRouter();
  const t = useTranslations('enrollment');
  const tCommon = useTranslations('common');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEnroll = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || tCommon('error'));
        setLoading(false);
        return;
      }

      router.refresh();
    } catch {
      setError(tCommon('error'));
      setLoading(false);
    }
  };

  const handleUnenroll = async () => {
    if (!enrollmentId || !window.confirm(t('confirmUnenroll'))) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/enrollments/${enrollmentId}`, {
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

  if (isEnrolled && status !== 'SUSPENDED') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <span className={`badge ${status === 'COMPLETED' ? 'badge-success' : 'badge-info'}`} style={{ padding: 'var(--space-1) var(--space-3)' }}>
          <Check size={14} style={{ marginRight: 'var(--space-1)' }} />
          {status === 'COMPLETED' ? t('completed') : t('enrolled')}
        </span>

        {status !== 'COMPLETED' && enrollmentId && (
          <button
            type="button"
            onClick={handleUnenroll}
            disabled={loading}
            className="btn-secondary"
            style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-1) var(--space-2)' }}
            title={t('unenroll')}
          >
            <LogOut size={13} />
            <span>{t('unenroll')}</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      {error && <span style={{ color: 'var(--color-error)', fontSize: 'var(--text-xs)', display: 'block', marginBottom: 'var(--space-1)' }}>{error}</span>}
      <button
        type="button"
        onClick={handleEnroll}
        disabled={loading}
        className="btn-primary"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <GraduationCap size={18} />}
        <span>{t('enroll')}</span>
      </button>
    </div>
  );
}
