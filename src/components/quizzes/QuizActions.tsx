'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { HelpCircle, Settings, PlayCircle } from 'lucide-react';
import { QuizBuilderModal } from './QuizBuilderModal';

interface QuizActionsProps {
  lessonId: string;
  lessonTitle: string;
  courseId: string;
  hasQuiz: boolean;
  isEnrolled: boolean;
  canManage: boolean;
}

export function QuizActions({
  lessonId,
  lessonTitle,
  courseId,
  hasQuiz,
  isEnrolled,
  canManage,
}: QuizActionsProps) {
  const t = useTranslations('quizzes');
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
      {/* Botón para rendir evaluación si es alumno inscrito y tiene quiz */}
      {hasQuiz && isEnrolled && (
        <Link
          href={`/courses/${courseId}/lessons/${lessonId}/quiz`}
          className="btn btn-primary"
          style={{
            fontSize: 'var(--text-xs)',
            padding: 'var(--space-1) var(--space-3)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-1)',
          }}
        >
          <PlayCircle size={14} /> {t('takeQuiz')}
        </Link>
      )}

      {/* Botón para configurar evaluación si es instructor / admin */}
      {canManage && (
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="btn btn-secondary"
          style={{
            fontSize: 'var(--text-xs)',
            padding: 'var(--space-1) var(--space-2)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-1)',
          }}
          title={t('configure')}
        >
          {hasQuiz ? <Settings size={14} /> : <HelpCircle size={14} />}
          <span>{hasQuiz ? 'Editar evaluación' : t('configure')}</span>
        </button>
      )}

      {/* Modal para configurar quiz */}
      {canManage && (
        <QuizBuilderModal
          lessonId={lessonId}
          lessonTitle={lessonTitle}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
