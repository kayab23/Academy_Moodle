'use client';

import React from 'react';
import { DepartmentReportItem } from '@/lib/reports';

interface DepartmentComparisonChartProps {
  title: string;
  subtitle?: string;
  departments: DepartmentReportItem[];
  emptyText?: string;
}

export function DepartmentComparisonChart({
  title,
  subtitle,
  departments,
  emptyText = 'No hay departamentos registrados.',
}: DepartmentComparisonChartProps) {
  return (
    <div
      className="glass-panel"
      style={{
        padding: 'var(--space-6)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
        height: '100%',
      }}
    >
      <div>
        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)' }}>
          {title}
        </h3>
        {subtitle && (
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {subtitle}
          </p>
        )}
      </div>

      {departments.length === 0 ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-8)',
            color: 'var(--text-muted)',
            fontSize: 'var(--text-sm)',
          }}
        >
          {emptyText}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', flex: 1 }}>
          {departments.map((dept) => (
            <div
              key={dept.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2)',
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {dept.name}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      marginLeft: 'var(--space-2)',
                    }}
                  >
                    ({dept.companyName} • {dept.membersCount} colaboradores)
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: 'var(--text-xs)' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Avance: </span>
                    <span style={{ fontWeight: 600, color: 'var(--brand-primary)' }}>
                      {dept.completionRate}%
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Promedio: </span>
                    <span style={{ fontWeight: 600, color: 'var(--color-warning)' }}>
                      {dept.avgGrade}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Comparative Dual Progress Bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div
                  style={{
                    height: '6px',
                    width: '100%',
                    background: 'var(--bg-surface)',
                    borderRadius: 'var(--radius-full)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, Math.max(0, dept.completionRate))}%`,
                      background: 'var(--brand-primary)',
                      borderRadius: 'var(--radius-full)',
                    }}
                    title={`Tasa de avance: ${dept.completionRate}%`}
                  />
                </div>
                <div
                  style={{
                    height: '6px',
                    width: '100%',
                    background: 'var(--bg-surface)',
                    borderRadius: 'var(--radius-full)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, Math.max(0, dept.avgGrade))}%`,
                      background: 'var(--color-warning)',
                      borderRadius: 'var(--radius-full)',
                    }}
                    title={`Promedio de calificación: ${dept.avgGrade}%`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
