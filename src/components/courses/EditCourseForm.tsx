'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AlertCircle, Loader2, Save, Trash2, ArrowLeft } from 'lucide-react';
import { CourseDifficulty, CourseStatus } from '@prisma/client';

interface Category {
  id: string;
  name: string;
}

interface Company {
  id: string;
  name: string;
}

interface CourseData {
  id: string;
  title: string;
  description: string | null;
  categoryId: string | null;
  difficulty: CourseDifficulty;
  estimatedHours: number | null;
  passingScore: number;
  status: CourseStatus;
  assignedCompanies: { companyId: string }[];
}

interface EditCourseFormProps {
  course: CourseData;
  categories: Category[];
  companies: Company[];
  isAdmin: boolean;
}

export function EditCourseForm({ course, categories, companies, isAdmin }: EditCourseFormProps) {
  const router = useRouter();
  const t = useTranslations('courses');
  const tCommon = useTranslations('common');

  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description || '');
  const [categoryId, setCategoryId] = useState(course.categoryId || '');
  const [difficulty, setDifficulty] = useState<CourseDifficulty>(course.difficulty);
  const [estimatedHours, setEstimatedHours] = useState<string>(
    course.estimatedHours !== null ? String(course.estimatedHours) : ''
  );
  const [passingScore, setPassingScore] = useState<number>(course.passingScore);
  const [status, setStatus] = useState<CourseStatus>(course.status);
  const [companyIds, setCompanyIds] = useState<string[]>(
    course.assignedCompanies.map((ac) => ac.companyId)
  );

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);

  const toggleCompany = (id: string) => {
    setCompanyIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/courses/${course.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          categoryId: categoryId || null,
          difficulty,
          estimatedHours: estimatedHours !== '' ? Number(estimatedHours) : null,
          passingScore: Number(passingScore),
          status,
          companyIds: isAdmin ? companyIds : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || tCommon('error'));
        setLoading(false);
        return;
      }

      router.push(`/courses/${course.id}`);
      router.refresh();
    } catch {
      setError(tCommon('error'));
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!window.confirm(t('confirmArchive'))) {
      return;
    }

    setArchiveLoading(true);
    try {
      const res = await fetch(`/api/courses/${course.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || tCommon('error'));
        setArchiveLoading(false);
        return;
      }

      router.push('/courses');
      router.refresh();
    } catch {
      alert(tCommon('error'));
      setArchiveLoading(false);
    }
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 'var(--text-xs)',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--text-secondary)',
    marginBottom: 'var(--space-1)',
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <Link href={`/courses/${course.id}`} className="btn-secondary">
          <ArrowLeft size={16} />
          <span>{tCommon('back')}</span>
        </Link>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button
            type="button"
            onClick={handleArchive}
            disabled={archiveLoading || loading}
            className="btn-danger"
          >
            {archiveLoading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            <span>{t('archiveCourse')}</span>
          </button>
          <button type="submit" className="btn-primary" disabled={loading || archiveLoading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>{t('saveChanges')}</span>
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-3) var(--space-4)',
            background: 'var(--color-error-bg)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-error)',
            fontSize: 'var(--text-sm)',
            marginBottom: 'var(--space-5)',
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      <div className="glass-panel" style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2)' }}>{t('courseDetails')}</h2>

        <div>
          <label htmlFor="title" style={labelStyle}>{t('titleLabel')}</label>
          <input
            id="title"
            className="input-field"
            required
            minLength={3}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="description" style={labelStyle}>{t('descriptionLabel')}</label>
          <textarea
            id="description"
            className="input-field"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
          <div>
            <label htmlFor="category" style={labelStyle}>{t('categoryLabel')}</label>
            <select
              id="category"
              className="input-field"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={loading}
            >
              <option value="">{t('noCategory')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="difficulty" style={labelStyle}>{t('difficultyLabel')}</label>
            <select
              id="difficulty"
              className="input-field"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as CourseDifficulty)}
              disabled={loading}
            >
              <option value="BEGINNER">{t('difficultyBeginner')}</option>
              <option value="INTERMEDIATE">{t('difficultyIntermediate')}</option>
              <option value="ADVANCED">{t('difficultyAdvanced')}</option>
            </select>
          </div>

          <div>
            <label htmlFor="status" style={labelStyle}>{t('statusLabel')}</label>
            <select
              id="status"
              className="input-field"
              value={status}
              onChange={(e) => setStatus(e.target.value as CourseStatus)}
              disabled={loading}
            >
              <option value="DRAFT">{t('statusDraft')}</option>
              <option value="PUBLISHED">{t('statusPublished')}</option>
              <option value="ARCHIVED">{t('statusArchived')}</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
          <div>
            <label htmlFor="estimatedHours" style={labelStyle}>{t('durationLabel')}</label>
            <input
              id="estimatedHours"
              type="number"
              step="0.5"
              min="0"
              max="1000"
              className="input-field"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="passingScore" style={labelStyle}>{t('passingScoreLabel')}</label>
            <input
              id="passingScore"
              type="number"
              min="0"
              max="100"
              className="input-field"
              value={passingScore}
              onChange={(e) => setPassingScore(Number(e.target.value))}
              disabled={loading}
            />
          </div>
        </div>

        {isAdmin && companies.length > 0 && (
          <div style={{ marginTop: 'var(--space-2)' }}>
            <span style={labelStyle}>{t('companiesAccess')}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
              {companies.map((c) => (
                <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={companyIds.includes(c.id)}
                    onChange={() => toggleCompany(c.id)}
                    disabled={loading}
                  />
                  <span>{c.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </form>
  );
}
