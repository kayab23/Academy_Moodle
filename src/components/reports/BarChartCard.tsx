'use client';

import React, { useState } from 'react';

export interface BarChartItem {
  label: string;
  value: number;
  secondaryValue?: number;
  maxValue?: number;
  badge?: string;
}

interface BarChartCardProps {
  title: string;
  subtitle?: string;
  items: BarChartItem[];
  valueSuffix?: string;
  emptyText?: string;
}

export function BarChartCard({
  title,
  subtitle,
  items,
  valueSuffix = '%',
  emptyText = 'Sin datos disponibles',
}: BarChartCardProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const displayItems = items.slice(0, 8); // Top 8 items for clean layout
  const maxVal = Math.max(100, ...displayItems.map((i) => i.maxValue || i.value || 0));

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

      {displayItems.length === 0 ? (
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', flex: 1, justifyContent: 'center' }}>
          {displayItems.map((item, idx) => {
            const widthPct = Math.min(100, Math.max(4, (item.value / maxVal) * 100));
            const isHovered = hoveredIdx === idx;

            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  cursor: 'pointer',
                  position: 'relative',
                }}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-xs)' }}>
                  <span
                    style={{
                      fontWeight: 500,
                      color: isHovered ? 'var(--brand-primary)' : 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '70%',
                    }}
                    title={item.label}
                  >
                    {item.label}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    {item.badge && (
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '1px 6px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-surface-elevated)',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {item.value}
                      {valueSuffix}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    height: '8px',
                    width: '100%',
                    background: 'var(--bg-surface-elevated)',
                    borderRadius: 'var(--radius-full)',
                    overflow: 'hidden',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${widthPct}%`,
                      background: isHovered
                        ? 'var(--brand-primary)'
                        : 'linear-gradient(90deg, var(--brand-primary), var(--brand-secondary))',
                      borderRadius: 'var(--radius-full)',
                      transition: 'all var(--transition-normal)',
                      boxShadow: isHovered ? '0 0 10px var(--brand-glow)' : 'none',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
