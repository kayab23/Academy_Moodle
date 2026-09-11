'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { UserPlus, X, Loader2, AlertCircle, Check } from 'lucide-react';

interface CandidateStudent {
  id: string;
  name: string;
  email: string;
  position: string | null;
  departmentName?: string | null;
  companyName: string;
}

interface EnrollStudentsModalProps {
  courseId: string;
  candidateStudents: CandidateStudent[];
}

export function EnrollStudentsModal({ courseId, candidateStudents }: EnrollStudentsModalProps) {
  const router = useRouter();
  const t = useTranslations('enrollment');
  const tCommon = useTranslations('common');

  const [open, setOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleUser = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedUserIds.length === candidateStudents.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(candidateStudents.map((s) => s.id));
    }
  };

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserIds.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          userIds: selectedUserIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || tCommon('error'));
        setLoading(false);
        return;
      }

      setOpen(false);
      setSelectedUserIds([]);
      setLoading(false);
      router.refresh();
    } catch {
      setError(tCommon('error'));
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-secondary"
        style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-1) var(--space-3)' }}
      >
        <UserPlus size={14} />
        <span>{t('enrollStudents')}</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 'var(--space-4)',
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '540px',
              padding: 'var(--space-6)',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>{t('enrollStudentsTitle')}</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={loading}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div
                role="alert"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  padding: 'var(--space-3)',
                  background: 'var(--color-error-bg)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-error)',
                  fontSize: 'var(--text-sm)',
                  marginBottom: 'var(--space-4)',
                }}
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {candidateStudents.length === 0 ? (
              <div style={{ padding: 'var(--space-6) 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <p>{t('noAvailableStudents')}</p>
              </div>
            ) : (
              <form onSubmit={handleEnroll} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', flex: 1, overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  <span>{t('selectStudents')} ({selectedUserIds.length} seleccionados)</span>
                  <button
                    type="button"
                    onClick={selectAll}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand-primary)', fontWeight: 600 }}
                  >
                    {selectedUserIds.length === candidateStudents.length ? 'Desmarcar todos' : 'Seleccionar todos'}
                  </button>
                </div>

                <div
                  style={{
                    overflowY: 'auto',
                    maxHeight: '320px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-2)',
                    paddingRight: 'var(--space-2)',
                  }}
                >
                  {candidateStudents.map((student) => {
                    const isSelected = selectedUserIds.includes(student.id);
                    return (
                      <label
                        key={student.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-3)',
                          padding: 'var(--space-3)',
                          borderRadius: 'var(--radius-md)',
                          background: isSelected ? 'rgba(2, 132, 199, 0.1)' : 'var(--bg-surface-elevated)',
                          border: `1px solid ${isSelected ? 'var(--brand-primary)' : 'var(--border-subtle)'}`,
                          cursor: 'pointer',
                          transition: 'background 0.2s, border-color 0.2s',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleUser(student.id)}
                          disabled={loading}
                        />
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <strong style={{ fontSize: 'var(--text-sm)', display: 'block' }}>{student.name}</strong>
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                            {student.email} • {student.companyName}
                            {student.position ? ` • ${student.position}` : ''}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
                  <button type="button" onClick={() => setOpen(false)} className="btn-secondary" disabled={loading}>
                    {tCommon('cancel')}
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={loading || selectedUserIds.length === 0}
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    <span>{t('enrollStudents')}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
