'use client';

import React, { useState } from 'react';

interface DonutSegment {
  label: string;
  count: number;
  color: string;
}

interface DonutChartCardProps {
  title: string;
  subtitle?: string;
  completed: number;
  active: number;
  suspended: number;
  completedLabel?: string;
  activeLabel?: string;
  suspendedLabel?: string;
}

export function DonutChartCard({
  title,
  subtitle,
  completed,
  active,
  suspended,
  completedLabel = 'Finalizados',
  activeLabel = 'En progreso',
  suspendedLabel = 'Suspendidos',
}: DonutChartCardProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const total = completed + active + suspended;

  const segments: DonutSegment[] = [
    { label: completedLabel, count: completed, color: 'var(--color-success)' },
    { label: activeLabel, count: active, color: 'var(--brand-primary)' },
    { label: suspendedLabel, count: suspended, color: 'var(--color-warning)' },
  ];

  // SVG Donut geometry
  const size = 160;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Compute strokeDasharray and strokeDashoffset for each segment
  let accumulatedAngle = 0;
  const svgSegments = segments.map((seg, idx) => {
    const pct = total > 0 ? seg.count / total : 0;
    const strokeDash = pct * circumference;
    const strokeOffset = -accumulatedAngle;
    accumulatedAngle += strokeDash;

    return {
      ...seg,
      pct: Math.round(pct * 100),
      strokeDash,
      strokeOffset,
      isHovered: hoveredIndex === idx,
    };
  });

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

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          flexWrap: 'wrap',
          gap: 'var(--space-6)',
          flex: 1,
        }}
      >
        {/* SVG Donut */}
        <div style={{ position: 'relative', width: size, height: size }}>
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            style={{ transform: 'rotate(-90deg)' }}
          >
            {/* Background circle track */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="var(--bg-surface-elevated)"
              strokeWidth={strokeWidth}
            />

            {total > 0 &&
              svgSegments.map((seg, idx) => (
                <circle
                  key={idx}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={seg.isHovered ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={`${seg.strokeDash} ${circumference}`}
                  strokeDashoffset={seg.strokeOffset}
                  strokeLinecap="butt"
                  style={{
                    transition: 'stroke-width 0.2s ease, opacity 0.2s ease',
                    cursor: 'pointer',
                    opacity: hoveredIndex === null || hoveredIndex === idx ? 1 : 0.4,
                  }}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              ))}
          </svg>

          {/* Center Info */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <span
              style={{
                fontSize: 'var(--text-2xl)',
                fontWeight: 700,
                fontFamily: 'var(--font-heading)',
                color: 'var(--text-primary)',
                lineHeight: 1,
              }}
            >
              {completionPct}%
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Finalización
            </span>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', minWidth: '150px' }}>
          {svgSegments.map((seg, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--space-1) var(--space-2)',
                borderRadius: 'var(--radius-sm)',
                background: hoveredIndex === idx ? 'var(--bg-surface-elevated)' : 'transparent',
                cursor: 'pointer',
                transition: 'background var(--transition-fast)',
              }}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <div
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: 'var(--radius-full)',
                    background: seg.color,
                  }}
                />
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                  {seg.label}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {seg.count}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  ({seg.pct}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
