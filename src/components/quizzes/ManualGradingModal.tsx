'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { X, Check, Award } from 'lucide-react';

interface PendingReviewItem {
  answerId: string;
  attemptId: string;
  studentName: string;
  quizTitle: string;
  questionText: string;
  maxPoints: number;
  studentAnswer: unknown;
  submittedAt: Date | null;
}

interface ManualGradingModalProps {
  item: PendingReviewItem | null;
  isOpen: boolean;
  onClose: () => void;
  onGraded: (answerId: string) => void;
}

export function ManualGradingModal({
  item,
  isOpen,
  onClose,
  onGraded,
}: ManualGradingModalProps) {
  const t = useTranslations('grading');
  const tCommon = useTranslations('common');

  const [points, setPoints] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (points < 0 || points > item.maxPoints) {
        throw new Error(`Los puntos deben estar entre 0 y ${item.maxPoints}`);
      }

      const res = await fetch(`/api/answers/${item.answerId}/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pointsAwarded: Number(points),
          feedback: feedback || null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al registrar calificación');
      }

      onGraded(item.answerId);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al calificar');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 'var(--space-4)',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '600px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 'var(--space-4) var(--space-6)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Award size={20} style={{ color: 'var(--brand-primary)' }} />
            <h3 style={{ fontSize: 'var(--text-lg)', margin: 0 }}>{t('gradeAttempt')}</h3>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: 'var(--space-1)' }}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: 'var(--space-3) var(--space-6)',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              fontSize: 'var(--text-sm)',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ padding: 'var(--space-6)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            <span>Estudiante: <strong style={{ color: 'var(--text-primary)' }}>{item.studentName}</strong></span>
            <span>Evaluación: <strong style={{ color: 'var(--text-primary)' }}>{item.quizTitle}</strong></span>
          </div>

          <div
            style={{
              padding: 'var(--space-4)',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Pregunta</span>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 500, margin: 'var(--space-1) 0 var(--space-3)' }}>
              {item.questionText}
            </p>

            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{t('studentAnswer')}</span>
            <div
              style={{
                marginTop: 'var(--space-1)',
                padding: 'var(--space-3)',
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--text-sm)',
                color: 'var(--text-primary)',
                whiteSpace: 'pre-wrap',
              }}
            >
              {String(item.studentAnswer || '(Sin respuesta)')}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-2)' }}>
            <label className="form-label">
              {t('pointsAwarded')} ({t('maxPoints', { max: item.maxPoints })}) *
            </label>
            <input
              type="number"
              min="0"
              max={item.maxPoints}
              step="0.5"
              required
              className="form-input"
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-2)' }}>
            <label className="form-label">{t('feedback')}</label>
            <textarea
              className="form-input"
              rows={3}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder={t('feedbackPlaceholder')}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              {tCommon('cancel')}
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary">
              <Check size={16} /> {submitting ? 'Guardando...' : t('saveGrade')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
