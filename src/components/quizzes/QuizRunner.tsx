'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Clock,
  Award,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
} from 'lucide-react';
import { QuestionType } from '@prisma/client';

interface QuestionItem {
  id: string;
  type: QuestionType;
  text: string;
  points: number;
  position: number;
  options?: unknown;
}

interface QuizRunnerProps {
  quiz: {
    id: string;
    title: string;
    description?: string | null;
    passingScore: number;
    maxAttempts: number;
    timeLimit?: number | null;
    shuffleQuestions: boolean;
    questions: QuestionItem[];
  };
  courseId: string;
  lessonId: string;
  initialAttempts: {
    id: string;
    score: number | null;
    attemptNumber: number;
    startedAt: string | Date;
    finishedAt: string | Date | null;
  }[];
}

interface SubmitResult {
  isFullyGraded: boolean;
  totalPoints: number;
  maxPoints: number;
  percentage: number;
  isPassing: boolean;
}

function isMatchingOptions(
  options: unknown
): options is { prompts: string[]; matches: string[] } {
  if (!options || typeof options !== 'object') return false;
  const opt = options as Record<string, unknown>;
  return Array.isArray(opt.prompts) && Array.isArray(opt.matches);
}

export function QuizRunner({
  quiz,
  courseId,
  initialAttempts,
}: QuizRunnerProps) {
  const t = useTranslations('quizzes');

  const [status, setStatus] = useState<'ready' | 'in_progress' | 'submitted'>('ready');
  const [attempts, setAttempts] = useState(initialAttempts);
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>(quiz.questions);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);

  // Iniciar intento
  const handleStartAttempt = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/quizzes/${quiz.id}/attempts`, {
        method: 'POST',
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'No fue posible iniciar el intento');
      }
      const attempt = await res.json();
      setCurrentAttemptId(attempt.id);

      // Barajar preguntas si shuffleQuestions está activo
      let qs = [...quiz.questions];
      if (quiz.shuffleQuestions) {
        qs = qs.sort(() => Math.random() - 0.5);
      }
      setQuestions(qs);
      setCurrentIndex(0);
      setAnswers({});

      // Iniciar temporizador si hay límite de tiempo
      if (quiz.timeLimit) {
        setSecondsRemaining(quiz.timeLimit * 60);
      } else {
        setSecondsRemaining(null);
      }

      setStatus('in_progress');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al iniciar');
    } finally {
      setSubmitting(false);
    }
  };

  // Enviar respuestas
  const handleSubmit = useCallback(async () => {
    if (!currentAttemptId || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const formattedAnswers = Object.entries(answers).map(([qId, val]) => ({
        questionId: qId,
        selectedAnswer: val,
      }));

      const res = await fetch(
        `/api/quizzes/${quiz.id}/attempts/${currentAttemptId}/submit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers: formattedAnswers }),
        }
      );

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al enviar evaluación');
      }

      const evalData: SubmitResult = await res.json();
      setResult(evalData);
      setStatus('submitted');

      // Actualizar lista de intentos
      const attemptsRes = await fetch(`/api/quizzes/${quiz.id}/attempts`);
      if (attemptsRes.ok) {
        const updated = await attemptsRes.json();
        setAttempts(updated);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al entregar');
    } finally {
      setSubmitting(false);
    }
  }, [currentAttemptId, submitting, answers, quiz.id]);

  // Manejo de temporizador
  useEffect(() => {
    if (status !== 'in_progress' || secondsRemaining === null) return;

    if (secondsRemaining <= 0) {
      handleSubmit();
      return;
    }

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(timer);
  }, [status, secondsRemaining, handleSubmit]);

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainder = sec % 60;
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  const currentQ = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const attemptsLeft = Math.max(0, quiz.maxAttempts - attempts.length);

  // 1. Pantalla Inicial (Instrucciones e Intentos pasados)
  if (status === 'ready') {
    const bestAttempt = attempts
      .filter((a) => a.score !== null)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: '800px', margin: '0 auto' }}>
        <div className="glass-panel" style={{ padding: 'var(--space-8)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
            <div>
              <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-2)' }}>{quiz.title}</h1>
              {quiz.description && (
                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', whiteSpace: 'pre-wrap' }}>
                  {quiz.description}
                </p>
              )}
            </div>
            <span className="badge badge-info" style={{ fontSize: 'var(--text-xs)' }}>
              {quiz.questions.length} preguntas
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 'var(--space-4)',
              padding: 'var(--space-4)',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 'var(--radius-md)',
              margin: 'var(--space-4) 0',
            }}
          >
            <div>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Calificación mínima</span>
              <p style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--brand-primary)', margin: 0 }}>
                {quiz.passingScore}%
              </p>
            </div>
            <div>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Intentos permitidos</span>
              <p style={{ fontSize: 'var(--text-base)', fontWeight: 600, margin: 0 }}>
                {attempts.length} de {quiz.maxAttempts}
              </p>
            </div>
            <div>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Tiempo límite</span>
              <p style={{ fontSize: 'var(--text-base)', fontWeight: 600, margin: 0 }}>
                {quiz.timeLimit ? `${quiz.timeLimit} min` : 'Sin límite'}
              </p>
            </div>
            {bestAttempt && (
              <div>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Mejor calificación</span>
                <p style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: '#10b981', margin: 0 }}>
                  {bestAttempt.score} pts
                </p>
              </div>
            )}
          </div>

          {error && (
            <div
              style={{
                padding: 'var(--space-3)',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--space-4)',
                fontSize: 'var(--text-sm)',
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-6)' }}>
            <Link href={`/courses/${courseId}`} className="btn btn-secondary">
              <ArrowLeft size={16} /> {t('returnToCourse')}
            </Link>

            {quiz.questions.length === 0 ? (
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: 0 }}>
                La evaluación aún no contiene preguntas.
              </p>
            ) : attemptsLeft > 0 ? (
              <button
                type="button"
                onClick={handleStartAttempt}
                disabled={submitting}
                className="btn btn-primary"
                style={{ padding: 'var(--space-3) var(--space-6)', fontSize: 'var(--text-base)' }}
              >
                {submitting ? 'Iniciando...' : t('startAttempt')} <ArrowRight size={18} />
              </button>
            ) : (
              <p style={{ color: '#ef4444', fontSize: 'var(--text-sm)', fontWeight: 500, margin: 0 }}>
                {t('noAttemptsLeft')}
              </p>
            )}
          </div>
        </div>

        {/* Historial de Intentos */}
        {attempts.length > 0 && (
          <div className="glass-panel" style={{ padding: 'var(--space-6)' }}>
            <h3 style={{ fontSize: 'var(--text-base)', marginBottom: 'var(--space-4)' }}>{t('attemptHistory')}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {attempts.map((att) => (
                <div
                  key={att.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 'var(--space-3)',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <span style={{ fontWeight: 600 }}>Intento #{att.attemptNumber}</span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {new Date(att.startedAt).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    {att.score !== null ? (
                      <span
                        className={`badge ${att.score >= quiz.passingScore ? 'badge-success' : 'badge-danger'}`}
                      >
                        {att.score} pts
                      </span>
                    ) : (
                      <span className="badge badge-warning">En revisión</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. Pantalla de Resultados
  if (status === 'submitted' && result) {
    return (
      <div style={{ maxWidth: '650px', margin: '0 auto' }}>
        <div className="glass-panel" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
          {result.isFullyGraded ? (
            result.isPassing ? (
              <CheckCircle2 size={64} style={{ color: '#10b981', margin: '0 auto var(--space-4)' }} />
            ) : (
              <XCircle size={64} style={{ color: '#ef4444', margin: '0 auto var(--space-4)' }} />
            )
          ) : (
            <AlertCircle size={64} style={{ color: '#f59e0b', margin: '0 auto var(--space-4)' }} />
          )}

          <h2 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-2)' }}>
            {t('resultsTitle')}
          </h2>

          <p style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--brand-primary)', marginBottom: 'var(--space-4)' }}>
            {t('scoreObtained', { score: result.percentage })}
          </p>

          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-6)' }}>
            {!result.isFullyGraded
              ? t('statusPending')
              : result.isPassing
              ? t('statusPassed')
              : t('statusFailed')}
          </p>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-around',
              padding: 'var(--space-4)',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-6)',
            }}
          >
            <div>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Puntos</span>
              <p style={{ fontSize: 'var(--text-lg)', fontWeight: 600, margin: 0 }}>
                {result.totalPoints} / {result.maxPoints}
              </p>
            </div>
            <div>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Mínimo requerido</span>
              <p style={{ fontSize: 'var(--text-lg)', fontWeight: 600, margin: 0 }}>
                {quiz.passingScore}%
              </p>
            </div>
            <div>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Estado</span>
              <p
                style={{
                  fontSize: 'var(--text-lg)',
                  fontWeight: 600,
                  margin: 0,
                  color: !result.isFullyGraded ? '#f59e0b' : result.isPassing ? '#10b981' : '#ef4444',
                }}
              >
                {!result.isFullyGraded ? 'En revisión' : result.isPassing ? 'Aprobado' : 'Reprobado'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-3)' }}>
            <Link href={`/courses/${courseId}`} className="btn btn-primary">
              {t('returnToCourse')}
            </Link>
            {!result.isPassing && attemptsLeft > 0 && (
              <button
                type="button"
                onClick={() => setStatus('ready')}
                className="btn btn-secondary"
              >
                <RotateCcw size={16} /> {t('tryAgain')}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 3. Pantalla de Evaluación en Progreso
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Header flotante de evaluación */}
      <div
        className="glass-panel"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 'var(--space-4) var(--space-6)',
        }}
      >
        <div>
          <h2 style={{ fontSize: 'var(--text-base)', margin: 0 }}>{quiz.title}</h2>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            {t('questionNumber', { current: currentIndex + 1, total: questions.length })} ({answeredCount} respondidas)
          </span>
        </div>

        {secondsRemaining !== null && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              color: secondsRemaining < 120 ? '#ef4444' : 'var(--brand-primary)',
              fontWeight: 700,
              fontSize: 'var(--text-lg)',
            }}
          >
            <Clock size={20} />
            <span>{formatTimer(secondsRemaining)}</span>
          </div>
        )}
      </div>

      {/* Píldoras de navegación de preguntas */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', overflowX: 'auto', padding: 'var(--space-2) 0' }}>
        {questions.map((q, idx) => {
          const isAnswered = answers[q.id] !== undefined && answers[q.id] !== '';
          const isCurrent = idx === currentIndex;
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                cursor: 'pointer',
                border: isCurrent ? '2px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
                backgroundColor: isCurrent
                  ? 'var(--brand-primary)'
                  : isAnswered
                  ? 'rgba(16, 185, 129, 0.2)'
                  : 'rgba(255, 255, 255, 0.05)',
                color: isCurrent ? '#ffffff' : isAnswered ? '#10b981' : 'var(--text-secondary)',
              }}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      {/* Tarjeta de la Pregunta Actual */}
      {currentQ && (
        <div className="glass-panel" style={{ padding: 'var(--space-6)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
            <span className="badge badge-info">{currentQ.type}</span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              {t('points', { points: currentQ.points })}
            </span>
          </div>

          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 500, marginBottom: 'var(--space-6)', lineHeight: 1.5 }}>
            {currentQ.text}
          </h3>

          {/* Opciones por tipo */}
          <div style={{ marginBottom: 'var(--space-6)' }}>
            {currentQ.type === QuestionType.MULTIPLE_CHOICE && Array.isArray(currentQ.options) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {currentQ.options.map((opt: string, idx: number) => {
                  const isSelected = answers[currentQ.id] === opt;
                  return (
                    <label
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-3)',
                        padding: 'var(--space-3) var(--space-4)',
                        borderRadius: 'var(--radius-md)',
                        border: isSelected ? '1px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
                        backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <input
                        type="radio"
                        name={`q_${currentQ.id}`}
                        value={opt}
                        checked={isSelected}
                        onChange={() => setAnswers({ ...answers, [currentQ.id]: opt })}
                      />
                      <span style={{ fontSize: 'var(--text-sm)' }}>{opt}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {currentQ.type === QuestionType.TRUE_FALSE && (
              <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                {['true', 'false'].map((val) => {
                  const isSelected = answers[currentQ.id] === val;
                  return (
                    <label
                      key={val}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 'var(--space-3)',
                        padding: 'var(--space-4)',
                        borderRadius: 'var(--radius-md)',
                        border: isSelected ? '1px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
                        backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name={`q_${currentQ.id}`}
                        value={val}
                        checked={isSelected}
                        onChange={() => setAnswers({ ...answers, [currentQ.id]: val })}
                      />
                      <span style={{ fontWeight: 600 }}>{val === 'true' ? t('true') : t('false')}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {currentQ.type === QuestionType.OPEN && (
              <div>
                <textarea
                  className="form-input"
                  rows={5}
                  value={String(answers[currentQ.id] || '')}
                  onChange={(e) => setAnswers({ ...answers, [currentQ.id]: e.target.value })}
                  placeholder={t('typeAnswer')}
                />
              </div>
            )}

            {currentQ.type === QuestionType.MATCHING && isMatchingOptions(currentQ.options) ? (() => {
              const matching = currentQ.options;
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    {t('matchingInstruction')}
                  </p>
                  {matching.prompts.map((prompt: string, idx: number) => {
                    const currentMatchObj =
                      (answers[currentQ.id] as Record<string, string>) || {};
                    const selectedVal = currentMatchObj[prompt] || '';

                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: 'var(--space-3)',
                          alignItems: 'center',
                        }}
                      >
                        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>{prompt}</span>
                        <select
                          className="form-input"
                          value={selectedVal}
                          onChange={(e) => {
                            const updated = { ...currentMatchObj, [prompt]: e.target.value };
                            setAnswers({ ...answers, [currentQ.id]: updated });
                          }}
                        >
                          <option value="">{t('selectOption')}</option>
                          {matching.matches.map((match: string, mIdx: number) => (
                            <option key={mIdx} value={match}>
                              {match}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              );
            })() : null}
          </div>

          {/* Botones de navegación */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((prev) => prev - 1)}
              className="btn btn-secondary"
            >
              <ArrowLeft size={16} /> Anterior
            </button>

            {currentIndex < questions.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => prev + 1)}
                className="btn btn-secondary"
              >
                Siguiente <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="btn btn-primary"
                style={{ backgroundColor: '#10b981' }}
              >
                {submitting ? t('submitting') : t('submitQuiz')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
