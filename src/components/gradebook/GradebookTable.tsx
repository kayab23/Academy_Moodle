'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Download, Search, AlertCircle, Award } from 'lucide-react';
import { ManualGradingModal } from '@/components/quizzes/ManualGradingModal';

interface LessonCol {
  id: string;
  title: string;
  isRequired: boolean;
  type: string;
}

interface StudentRow {
  id: string;
  name: string;
  email: string;
  companyName: string;
  position?: string;
  enrollmentStatus: string;
  grades: Record<string, { percentage: number; score: number; maxScore: number }>;
  courseAverage: number | null;
  isPassing: boolean;
}

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

interface GradebookTableProps {
  course: {
    id: string;
    title: string;
    passingScore: number;
  };
  lessons: LessonCol[];
  students: StudentRow[];
  initialPendingReviews?: PendingReviewItem[];
}

export function GradebookTable({
  course,
  lessons,
  students,
  initialPendingReviews = [],
}: GradebookTableProps) {
  const t = useTranslations('gradebook');
  const tGrading = useTranslations('grading');

  const [searchTerm, setSearchTerm] = useState('');
  const [pendingReviews, setPendingReviews] = useState<PendingReviewItem[]>(initialPendingReviews);
  const [selectedReview, setSelectedReview] = useState<PendingReviewItem | null>(null);

  // Filtrado de alumnos
  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Exportar a CSV con BOM UTF-8
  const handleExportCsv = () => {
    const headers = [
      'Estudiante',
      'Email',
      'Empresa',
      'Puesto',
      ...lessons.map((l) => `${l.title} (%)`),
      'Promedio Final (%)',
      'Estado',
    ];

    const rows = filteredStudents.map((s) => [
      `"${s.name.replace(/"/g, '""')}"`,
      `"${s.email}"`,
      `"${s.companyName}"`,
      `"${s.position || ''}"`,
      ...lessons.map((l) => (s.grades[l.id] ? `${s.grades[l.id].percentage}%` : 'N/A')),
      s.courseAverage !== null ? `${s.courseAverage}%` : 'N/A',
      s.isPassing ? 'Aprobado' : s.courseAverage !== null ? 'Reprobado' : 'En curso',
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `calificaciones_${course.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGradedSuccess = (gradedAnswerId: string) => {
    setPendingReviews((prev) => prev.filter((r) => r.answerId !== gradedAnswerId));
    // Recargar página para reflejar notas actualizadas
    window.location.reload();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Sección de entregas pendientes de revisión */}
      {pendingReviews.length > 0 && (
        <div
          className="glass-panel"
          style={{
            padding: 'var(--space-6)',
            borderLeft: '4px solid #f59e0b',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            <AlertCircle size={20} style={{ color: '#f59e0b' }} />
            <h3 style={{ fontSize: 'var(--text-base)', margin: 0 }}>
              {tGrading('pendingReviews', { count: pendingReviews.length })}
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {pendingReviews.map((rev) => (
              <div
                key={rev.answerId}
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
                <div>
                  <strong style={{ fontSize: 'var(--text-sm)' }}>{rev.studentName}</strong>
                  <span style={{ margin: '0 var(--space-2)', color: 'var(--text-muted)' }}>•</span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{rev.quizTitle}</span>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 'var(--space-1) 0 0' }}>
                    Pregunta: {rev.questionText.slice(0, 70)}...
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedReview(rev)}
                  className="btn btn-secondary"
                  style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-2) var(--space-3)' }}
                >
                  <Award size={14} /> {tGrading('gradeAttempt')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controles de tabla */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div style={{ position: 'relative', width: '320px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: 'var(--space-3)',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: 'var(--space-8)' }}
            placeholder="Buscar por nombre o correo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          disabled={filteredStudents.length === 0}
          className="btn btn-secondary"
        >
          <Download size={16} /> {t('exportCsv')}
        </button>
      </div>

      {/* Tabla matriz de calificaciones */}
      <div className="glass-panel" style={{ overflowX: 'auto', padding: 0 }}>
        {filteredStudents.length === 0 ? (
          <div style={{ padding: 'var(--space-12)', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p>{t('noGrades')}</p>
          </div>
        ) : (
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                <th style={{ padding: 'var(--space-4)' }}>{t('student')}</th>
                <th style={{ padding: 'var(--space-4)' }}>{t('company')}</th>
                {lessons.map((lesson) => (
                  <th key={lesson.id} style={{ padding: 'var(--space-4)', minWidth: '120px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>{lesson.title}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{lesson.type}</span>
                    </div>
                  </th>
                ))}
                <th style={{ padding: 'var(--space-4)', minWidth: '130px' }}>{t('averageScore')}</th>
                <th style={{ padding: 'var(--space-4)' }}>{t('status')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr
                  key={student.id}
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  <td style={{ padding: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <strong style={{ fontSize: 'var(--text-sm)' }}>{student.name}</strong>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{student.email}</span>
                    </div>
                  </td>
                  <td style={{ padding: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    {student.companyName}
                  </td>
                  {lessons.map((lesson) => {
                    const g = student.grades[lesson.id];
                    return (
                      <td key={lesson.id} style={{ padding: 'var(--space-4)' }}>
                        {g ? (
                          <span
                            className={`badge ${
                              g.percentage >= course.passingScore ? 'badge-success' : 'badge-danger'
                            }`}
                            style={{ fontSize: '11px' }}
                          >
                            {g.percentage}% ({g.score}/{g.maxScore})
                          </span>
                        ) : (
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                    );
                  })}
                  <td style={{ padding: 'var(--space-4)' }}>
                    {student.courseAverage !== null ? (
                      <strong
                        style={{
                          fontSize: 'var(--text-sm)',
                          color: student.isPassing ? '#10b981' : '#ef4444',
                        }}
                      >
                        {student.courseAverage}%
                      </strong>
                    ) : (
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: 'var(--space-4)' }}>
                    {student.isPassing ? (
                      <span className="badge badge-success">{t('passed')}</span>
                    ) : student.courseAverage !== null ? (
                      <span className="badge badge-danger">{t('failed')}</span>
                    ) : (
                      <span className="badge badge-warning">{t('inProgress')}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal para calificar respuestas abiertas */}
      <ManualGradingModal
        item={selectedReview}
        isOpen={Boolean(selectedReview)}
        onClose={() => setSelectedReview(null)}
        onGraded={handleGradedSuccess}
      />
    </div>
  );
}
