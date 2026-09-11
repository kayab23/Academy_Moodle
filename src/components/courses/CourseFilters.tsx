'use client';

import React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Search, X, Filter } from 'lucide-react';

interface Category {
  id: string;
  name: string;
}

interface Company {
  id: string;
  name: string;
}

interface CourseFiltersProps {
  categories: Category[];
  companies: Company[];
  isAdmin: boolean;
  canManage: boolean;
}

export function CourseFilters({ categories, companies, isAdmin, canManage }: CourseFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('courses');

  const currentQ = searchParams.get('q') || '';
  const currentCategory = searchParams.get('category') || '';
  const currentDifficulty = searchParams.get('difficulty') || '';
  const currentStatus = searchParams.get('status') || '';
  const currentCompany = searchParams.get('company') || '';

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const clearAllFilters = () => {
    router.push(pathname);
  };

  const hasActiveFilters = Boolean(
    currentQ || currentCategory || currentDifficulty || currentStatus || currentCompany
  );

  return (
    <div
      className="glass-panel"
      style={{
        padding: 'var(--space-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
      }}
    >
      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Barra de Búsqueda */}
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '200px' }}>
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
            className="input-field"
            style={{ paddingLeft: 'var(--space-8)', paddingRight: currentQ ? 'var(--space-8)' : 'var(--space-3)' }}
            placeholder={t('searchPlaceholder')}
            value={currentQ}
            onChange={(e) => updateParam('q', e.target.value)}
          />
          {currentQ && (
            <button
              type="button"
              onClick={() => updateParam('q', '')}
              style={{
                position: 'absolute',
                right: 'var(--space-3)',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filtro por Categoría */}
        <select
          className="input-field"
          style={{ flex: '0 1 180px', minWidth: '140px' }}
          value={currentCategory}
          onChange={(e) => updateParam('category', e.target.value)}
        >
          <option value="">{t('allCategories')}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Filtro por Dificultad */}
        <select
          className="input-field"
          style={{ flex: '0 1 160px', minWidth: '130px' }}
          value={currentDifficulty}
          onChange={(e) => updateParam('difficulty', e.target.value)}
        >
          <option value="">{t('allDifficulties')}</option>
          <option value="BEGINNER">{t('difficultyBeginner')}</option>
          <option value="INTERMEDIATE">{t('difficultyIntermediate')}</option>
          <option value="ADVANCED">{t('difficultyAdvanced')}</option>
        </select>

        {/* Filtro por Estado (solo staff) */}
        {canManage && (
          <select
            className="input-field"
            style={{ flex: '0 1 150px', minWidth: '120px' }}
            value={currentStatus}
            onChange={(e) => updateParam('status', e.target.value)}
          >
            <option value="">{t('allStatuses')}</option>
            <option value="DRAFT">{t('statusDraft')}</option>
            <option value="PUBLISHED">{t('statusPublished')}</option>
            <option value="ARCHIVED">{t('statusArchived')}</option>
          </select>
        )}

        {/* Filtro por Empresa (solo ADMIN) */}
        {isAdmin && companies.length > 0 && (
          <select
            className="input-field"
            style={{ flex: '0 1 180px', minWidth: '140px' }}
            value={currentCompany}
            onChange={(e) => updateParam('company', e.target.value)}
          >
            <option value="">{t('allCompaniesFilter')}</option>
            <option value="global">{t('allCompanies')}</option>
            {companies.map((comp) => (
              <option key={comp.id} value={comp.id}>{comp.name}</option>
            ))}
          </select>
        )}

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="btn-secondary"
            style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-2) var(--space-3)' }}
          >
            <Filter size={13} />
            <span>{t('clearFilters')}</span>
          </button>
        )}
      </div>
    </div>
  );
}
