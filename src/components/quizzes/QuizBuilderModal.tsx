'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { X, Plus, Trash2, HelpCircle, Check, Settings, ListPlus } from 'lucide-react';
import { QuestionType } from '@prisma/client';

interface QuestionItem {
  id: string;
  type: QuestionType;
  text: string;
  points: number;
  position: number;
  options?: unknown;
  correctAnswer?: unknown;
}

interface QuizData {
  id: string;
  title: string;
  description?: string | null;
  passingScore: number;
  maxAttempts: number;
  timeLimit?: number | null;
  shuffleQuestions: boolean;
  questions: QuestionItem[];
}

interface QuizBuilderModalProps {
  lessonId: string;
  lessonTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function QuizBuilderModal({
  lessonId,
  lessonTitle,
  isOpen,
  onClose,
  onSuccess,
}: QuizBuilderModalProps) {
  const t = useTranslations('quizzes');
  const tCommon = useTranslations('common');

  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'settings' | 'questions'>('settings');

  // Form states for Quiz settings
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [passingScore, setPassingScore] = useState(70);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [timeLimit, setTimeLimit] = useState<number | ''>('');
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states for New Question
  const [newType, setNewType] = useState<QuestionType>(QuestionType.MULTIPLE_CHOICE);
  const [newText, setNewText] = useState('');
  const [newPoints, setNewPoints] = useState(1);
  const [mcOptions, setMcOptions] = useState<string[]>(['', '']);
  const [mcCorrect, setMcCorrect] = useState<string>('0');
  const [tfCorrect, setTfCorrect] = useState<'true' | 'false'>('true');
  const [matchingPairs, setMatchingPairs] = useState<{ prompt: string; match: string }[]>([
    { prompt: '', match: '' },
    { prompt: '', match: '' },
  ]);
  const [addingQuestion, setAddingQuestion] = useState(false);

  // Cargar datos de la evaluación
  const fetchQuiz = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Buscar lección para ver si ya tiene quiz
      const res = await fetch(`/api/lessons/${lessonId}/quiz`);
      if (res.ok) {
        const data: QuizData = await res.json();
        setQuiz(data);
        setTitle(data.title);
        setDescription(data.description || '');
        setPassingScore(data.passingScore);
        setMaxAttempts(data.maxAttempts);
        setTimeLimit(data.timeLimit ?? '');
        setShuffleQuestions(data.shuffleQuestions);
      } else {
        // No tiene quiz aún
        setQuiz(null);
        setTitle(`Evaluación: ${lessonTitle}`);
      }
    } catch {
      setError('Error al cargar la evaluación');
    } finally {
      setLoading(false);
    }
  }, [lessonId, lessonTitle]);

  useEffect(() => {
    if (isOpen) {
      fetchQuiz();
    }
  }, [isOpen, fetchQuiz]);

  if (!isOpen) return null;

  // Guardar configuración del Quiz
  const handleSaveQuizSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setError(null);

    try {
      const payload = {
        lessonId,
        title,
        description: description || null,
        passingScore: Number(passingScore),
        maxAttempts: Number(maxAttempts),
        timeLimit: timeLimit ? Number(timeLimit) : null,
        shuffleQuestions,
      };

      if (!quiz) {
        // Crear nuevo quiz
        const res = await fetch('/api/quizzes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Error al crear la evaluación');
        }
        const created: QuizData = await res.json();
        setQuiz({ ...created, questions: [] });
        setActiveTab('questions');
      } else {
        // Actualizar existente
        const res = await fetch(`/api/quizzes/${quiz.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Error al actualizar la evaluación');
        }
        const updated: QuizData = await res.json();
        setQuiz((prev) => (prev ? { ...prev, ...updated } : updated));
      }
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSavingSettings(false);
    }
  };

  // Agregar nueva pregunta
  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quiz) return;
    setAddingQuestion(true);
    setError(null);

    try {
      let options: unknown = null;
      let correctAnswer: unknown = null;

      if (newType === QuestionType.MULTIPLE_CHOICE) {
        const validOptions = mcOptions.filter((o) => o.trim().length > 0);
        if (validOptions.length < 2) {
          throw new Error('Debes ingresar al menos 2 opciones');
        }
        options = validOptions;
        const selectedIndex = parseInt(mcCorrect, 10);
        correctAnswer = validOptions[selectedIndex] || validOptions[0];
      } else if (newType === QuestionType.TRUE_FALSE) {
        options = ['true', 'false'];
        correctAnswer = tfCorrect;
      } else if (newType === QuestionType.MATCHING) {
        const validPairs = matchingPairs.filter(
          (p) => p.prompt.trim().length > 0 && p.match.trim().length > 0
        );
        if (validPairs.length < 2) {
          throw new Error('Debes ingresar al menos 2 pares para correspondencia');
        }
        const matchObj: Record<string, string> = {};
        validPairs.forEach((p) => {
          matchObj[p.prompt.trim()] = p.match.trim();
        });
        options = {
          prompts: validPairs.map((p) => p.prompt.trim()),
          matches: validPairs.map((p) => p.match.trim()),
        };
        correctAnswer = matchObj;
      }

      const res = await fetch(`/api/quizzes/${quiz.id}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: newType,
          text: newText,
          points: Number(newPoints),
          options,
          correctAnswer,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al agregar pregunta');
      }

      const createdQ = await res.json();
      setQuiz((prev) => (prev ? { ...prev, questions: [...prev.questions, createdQ] } : null));

      // Reset question form
      setNewText('');
      setNewPoints(1);
      setMcOptions(['', '']);
      setMatchingPairs([
        { prompt: '', match: '' },
        { prompt: '', match: '' },
      ]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al agregar pregunta');
    } finally {
      setAddingQuestion(false);
    }
  };

  // Eliminar pregunta
  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta pregunta?')) return;
    try {
      const res = await fetch(`/api/questions/${questionId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar pregunta');
      setQuiz((prev) =>
        prev
          ? {
              ...prev,
              questions: prev.questions.filter((q) => q.id !== questionId),
            }
          : null
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
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
          maxWidth: '750px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Modal Header */}
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
            <HelpCircle size={20} style={{ color: 'var(--brand-primary)' }} />
            <h3 style={{ fontSize: 'var(--text-lg)', margin: 0 }}>{t('createQuizTitle')}</h3>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost"
            style={{ padding: 'var(--space-1)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-subtle)',
            padding: '0 var(--space-6)',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            style={{
              padding: 'var(--space-3) var(--space-4)',
              borderBottom: activeTab === 'settings' ? '2px solid var(--brand-primary)' : 'none',
              color: activeTab === 'settings' ? 'var(--brand-primary)' : 'var(--text-secondary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
            }}
          >
            <Settings size={16} /> Configuración
          </button>
          <button
            type="button"
            disabled={!quiz}
            onClick={() => setActiveTab('questions')}
            style={{
              padding: 'var(--space-3) var(--space-4)',
              borderBottom: activeTab === 'questions' ? '2px solid var(--brand-primary)' : 'none',
              color: activeTab === 'questions' ? 'var(--brand-primary)' : 'var(--text-secondary)',
              background: 'none',
              border: 'none',
              cursor: quiz ? 'pointer' : 'not-allowed',
              opacity: quiz ? 1 : 0.5,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
            }}
          >
            <ListPlus size={16} /> Preguntas ({quiz?.questions.length ?? 0})
          </button>
        </div>

        {/* Error Alert */}
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

        {/* Modal Body */}
        <div style={{ padding: 'var(--space-6)', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Cargando evaluación...</p>
          ) : activeTab === 'settings' ? (
            <form onSubmit={handleSaveQuizSettings} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div>
                <label className="form-label">{t('quizTitle')} *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">{t('quizDescription')}</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Instrucciones para el estudiante..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div>
                  <label className="form-label">Nota mínima aprobatoria (%) *</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    className="form-input"
                    value={passingScore}
                    onChange={(e) => setPassingScore(Number(e.target.value))}
                  />
                </div>

                <div>
                  <label className="form-label">Máximo de intentos *</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    className="form-input"
                    value={maxAttempts}
                    onChange={(e) => setMaxAttempts(Number(e.target.value))}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div>
                  <label className="form-label">Tiempo límite (minutos, opcional)</label>
                  <input
                    type="number"
                    min="1"
                    max="300"
                    className="form-input"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(e.target.value ? Number(e.target.value) : '')}
                    placeholder="Ej. 30 (dejar vacío si es libre)"
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-6)' }}>
                  <input
                    type="checkbox"
                    id="shuffleCheck"
                    checked={shuffleQuestions}
                    onChange={(e) => setShuffleQuestions(e.target.checked)}
                  />
                  <label htmlFor="shuffleCheck" style={{ fontSize: 'var(--text-sm)', cursor: 'pointer' }}>
                    {t('shuffleQuestions')}
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
                <button type="button" onClick={onClose} className="btn btn-secondary">
                  {tCommon('cancel')}
                </button>
                <button type="submit" disabled={savingSettings} className="btn btn-primary">
                  {savingSettings ? 'Guardando...' : t('saveQuiz')}
                </button>
              </div>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
              {/* Lista de preguntas creadas */}
              <div>
                <h4 style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-3)', color: 'var(--text-secondary)' }}>
                  Preguntas configuradas ({quiz?.questions.length ?? 0})
                </h4>

                {quiz?.questions.length === 0 ? (
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    Aún no hay preguntas. Agrega la primera abajo.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    {quiz?.questions.map((q, idx) => (
                      <div
                        key={q.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: 'var(--space-3)',
                          backgroundColor: 'rgba(255, 255, 255, 0.03)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                          <span style={{ fontWeight: 600, color: 'var(--brand-primary)', fontSize: 'var(--text-xs)' }}>
                            #{idx + 1}
                          </span>
                          <div>
                            <p style={{ fontSize: 'var(--text-sm)', margin: 0, fontWeight: 500 }}>{q.text}</p>
                            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-1)' }}>
                              <span className="badge badge-info" style={{ fontSize: '10px' }}>{q.type}</span>
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{q.points} pt(s)</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="btn btn-ghost"
                          style={{ color: '#ef4444', padding: 'var(--space-1)' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Formulario para agregar pregunta */}
              <div
                style={{
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: 'var(--space-4)',
                }}
              >
                <h4 style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Plus size={16} style={{ color: 'var(--brand-primary)' }} /> {t('addQuestion')}
                </h4>

                <form onSubmit={handleAddQuestion} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-3)' }}>
                    <div>
                      <label className="form-label">{t('questionType')} *</label>
                      <select
                        className="form-input"
                        value={newType}
                        onChange={(e) => setNewType(e.target.value as QuestionType)}
                      >
                        <option value={QuestionType.MULTIPLE_CHOICE}>{t('typeMultipleChoice')}</option>
                        <option value={QuestionType.TRUE_FALSE}>{t('typeTrueFalse')}</option>
                        <option value={QuestionType.OPEN}>{t('typeOpen')}</option>
                        <option value={QuestionType.MATCHING}>{t('typeMatching')}</option>
                      </select>
                    </div>

                    <div>
                      <label className="form-label">{t('questionPoints')} *</label>
                      <input
                        type="number"
                        min="0.1"
                        step="any"
                        required
                        className="form-input"
                        value={newPoints}
                        onChange={(e) => setNewPoints(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="form-label">{t('questionText')} *</label>
                    <textarea
                      required
                      className="form-input"
                      rows={2}
                      value={newText}
                      onChange={(e) => setNewText(e.target.value)}
                      placeholder="Redacta la pregunta o consigna..."
                    />
                  </div>

                  {/* Campos específicos por tipo */}
                  {newType === QuestionType.MULTIPLE_CHOICE && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                      <label className="form-label">{t('options')} (marca la opción correcta) *</label>
                      {mcOptions.map((opt, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <input
                            type="radio"
                            name="correctMc"
                            checked={mcCorrect === String(idx)}
                            onChange={() => setMcCorrect(String(idx))}
                          />
                          <input
                            type="text"
                            required
                            className="form-input"
                            style={{ flex: 1 }}
                            value={opt}
                            onChange={(e) => {
                              const updated = [...mcOptions];
                              updated[idx] = e.target.value;
                              setMcOptions(updated);
                            }}
                            placeholder={`Opción ${idx + 1}`}
                          />
                          {mcOptions.length > 2 && (
                            <button
                              type="button"
                              onClick={() => setMcOptions(mcOptions.filter((_, i) => i !== idx))}
                              className="btn btn-ghost"
                              style={{ padding: 'var(--space-1)', color: '#ef4444' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setMcOptions([...mcOptions, ''])}
                        className="btn btn-ghost"
                        style={{ alignSelf: 'flex-start', fontSize: 'var(--text-xs)' }}
                      >
                        <Plus size={14} /> {t('addOption')}
                      </button>
                    </div>
                  )}

                  {newType === QuestionType.TRUE_FALSE && (
                    <div>
                      <label className="form-label">{t('correctAnswer')} *</label>
                      <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="tfChoice"
                            value="true"
                            checked={tfCorrect === 'true'}
                            onChange={() => setTfCorrect('true')}
                          />
                          {t('true')}
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="tfChoice"
                            value="false"
                            checked={tfCorrect === 'false'}
                            onChange={() => setTfCorrect('false')}
                          />
                          {t('false')}
                        </label>
                      </div>
                    </div>
                  )}

                  {newType === QuestionType.MATCHING && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                      <label className="form-label">Pares de correspondencia *</label>
                      {matchingPairs.map((pair, idx) => (
                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 'var(--space-2)', alignItems: 'center' }}>
                          <input
                            type="text"
                            required
                            className="form-input"
                            value={pair.prompt}
                            onChange={(e) => {
                              const updated = [...matchingPairs];
                              updated[idx].prompt = e.target.value;
                              setMatchingPairs(updated);
                            }}
                            placeholder={`Elemento ${idx + 1}`}
                          />
                          <input
                            type="text"
                            required
                            className="form-input"
                            value={pair.match}
                            onChange={(e) => {
                              const updated = [...matchingPairs];
                              updated[idx].match = e.target.value;
                              setMatchingPairs(updated);
                            }}
                            placeholder={`Correspondencia ${idx + 1}`}
                          />
                          {matchingPairs.length > 2 && (
                            <button
                              type="button"
                              onClick={() => setMatchingPairs(matchingPairs.filter((_, i) => i !== idx))}
                              className="btn btn-ghost"
                              style={{ padding: 'var(--space-1)', color: '#ef4444' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setMatchingPairs([...matchingPairs, { prompt: '', match: '' }])}
                        className="btn btn-ghost"
                        style={{ alignSelf: 'flex-start', fontSize: 'var(--text-xs)' }}
                      >
                        <Plus size={14} /> {t('addPair')}
                      </button>
                    </div>
                  )}

                  {newType === QuestionType.OPEN && (
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      Las preguntas abiertas son evaluadas manualmente por el instructor luego de la entrega.
                    </p>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
                    <button type="submit" disabled={addingQuestion} className="btn btn-primary" style={{ fontSize: 'var(--text-sm)' }}>
                      <Check size={16} /> {addingQuestion ? 'Guardando...' : t('saveQuestion')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
