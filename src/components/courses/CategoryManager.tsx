'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Plus, Edit2, Trash2, FolderPlus, AlertCircle, Loader2, X } from 'lucide-react';

interface CategoryItem {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  parent?: { id: string; name: string } | null;
  _count?: { courses: number; children: number };
}

interface CategoryManagerProps {
  initialCategories: CategoryItem[];
  isAdmin: boolean;
}

export function CategoryManager({ initialCategories, isAdmin }: CategoryManagerProps) {
  const router = useRouter();
  const t = useTranslations('categories');
  const tCommon = useTranslations('common');

  const [categories] = useState<CategoryItem[]>(initialCategories);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openCreateModal = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setParentId('');
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (cat: CategoryItem) => {
    setEditingId(cat.id);
    setName(cat.name);
    setDescription(cat.description || '');
    setParentId(cat.parentId || '');
    setError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const url = editingId ? `/api/categories/${editingId}` : '/api/categories';
      const method = editingId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          parentId: parentId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || tCommon('error'));
        setLoading(false);
        return;
      }

      closeModal();
      router.refresh();
    } catch {
      setError(tCommon('error'));
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('confirmDelete'))) {
      return;
    }

    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || tCommon('error'));
        return;
      }

      router.refresh();
    } catch {
      alert(tCommon('error'));
    }
  };

  // Candidatos a padres para el modal (excluyendo a la misma categoría si se está editando)
  const parentCandidates = categories.filter((c) => !editingId || c.id !== editingId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-1)' }}>{t('title')}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>{t('subtitle')}</p>
        </div>
        <button type="button" onClick={openCreateModal} className="btn-primary">
          <Plus size={18} />
          <span>{t('newCategory')}</span>
        </button>
      </div>

      {categories.length === 0 ? (
        <div className="glass-panel" style={{ padding: 'var(--space-12) 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <FolderPlus size={48} style={{ margin: '0 auto var(--space-4)', color: 'var(--brand-primary)' }} />
          <p>{t('empty')}</p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="glass-panel"
              style={{
                padding: 'var(--space-5)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
                  <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>{cat.name}</h3>
                  <span className="badge badge-info" style={{ fontSize: 'var(--text-xs)' }}>
                    {t('coursesCount', { count: cat._count?.courses || 0 })}
                  </span>
                </div>

                {cat.parent && (
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>
                    {t('parent')}: <strong>{cat.parent.name}</strong>
                  </p>
                )}

                {cat.description && (
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
                    {cat.description}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-4)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  type="button"
                  onClick={() => openEditModal(cat)}
                  className="btn-secondary"
                  style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-1) var(--space-3)' }}
                >
                  <Edit2 size={14} />
                  <span>{tCommon('edit')}</span>
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleDelete(cat.id)}
                    className="btn-danger"
                    style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-1) var(--space-3)' }}
                  >
                    <Trash2 size={14} />
                    <span>{tCommon('delete')}</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
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
              maxWidth: '480px',
              padding: 'var(--space-6)',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>
                {editingId ? t('editCategory') : t('newCategory')}
              </h3>
              <button
                type="button"
                onClick={closeModal}
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

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div>
                <label htmlFor="cat-name" style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: 'var(--space-1)' }}>
                  {t('name')}
                </label>
                <input
                  id="cat-name"
                  className="input-field"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="cat-desc" style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: 'var(--space-1)' }}>
                  {t('description')}
                </label>
                <textarea
                  id="cat-desc"
                  className="input-field"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="cat-parent" style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: 'var(--space-1)' }}>
                  {t('parent')}
                </label>
                <select
                  id="cat-parent"
                  className="input-field"
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  disabled={loading}
                >
                  <option value="">{t('noParent')}</option>
                  {parentCandidates.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
                <button type="button" onClick={closeModal} className="btn-secondary" disabled={loading}>
                  {tCommon('cancel')}
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  <span>{editingId ? tCommon('save') : tCommon('create')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
