'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2 } from 'lucide-react';

interface Category {
  id: string;
  name: string;
}

interface Company {
  id: string;
  name: string;
}

interface NewCourseFormProps {
  categories: Category[];
  companies: Company[];
  isAdmin: boolean;
}

export function NewCourseForm({ categories, companies, isAdmin }: NewCourseFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [difficulty, setDifficulty] = useState('BEGINNER');
  const [companyIds, setCompanyIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const toggleCompany = (id: string) => {
    setCompanyIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || undefined,
          categoryId: categoryId || undefined,
          difficulty,
          companyIds: isAdmin ? companyIds : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'No se pudo crear el curso.');
        setLoading(false);
        return;
      }

      router.push(`/courses/${data.id}`);
      router.refresh();
    } catch {
      setError('Error de red al crear el curso.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
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

      <div style={{ marginBottom: 'var(--space-4)' }}>
        <label htmlFor="title" style={labelStyle}>Título</label>
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

      <div style={{ marginBottom: 'var(--space-4)' }}>
        <label htmlFor="description" style={labelStyle}>Descripción</label>
        <textarea
          id="description"
          className="input-field"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={loading}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        <div>
          <label htmlFor="category" style={labelStyle}>Categoría</label>
          <select id="category" className="input-field" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} disabled={loading}>
            <option value="">Sin categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="difficulty" style={labelStyle}>Dificultad</label>
          <select id="difficulty" className="input-field" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} disabled={loading}>
            <option value="BEGINNER">Principiante</option>
            <option value="INTERMEDIATE">Intermedio</option>
            <option value="ADVANCED">Avanzado</option>
          </select>
        </div>
      </div>

      {isAdmin && companies.length > 0 && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <span style={labelStyle}>Empresas con acceso (vacío = todas)</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
            {companies.map((c) => (
              <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
                <input type="checkbox" checked={companyIds.includes(c.id)} onChange={() => toggleCompany(c.id)} disabled={loading} />
                {c.name}
              </label>
            ))}
          </div>
        </div>
      )}

      <button type="submit" className="btn-primary" style={{ width: '100%', padding: 'var(--space-3)' }} disabled={loading}>
        {loading ? (
          <>
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            <span>Creando...</span>
          </>
        ) : (
          <span>Crear curso</span>
        )}
      </button>
      <style jsx global>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </form>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 'var(--text-xs)',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-secondary)',
  marginBottom: 'var(--space-2)',
};
