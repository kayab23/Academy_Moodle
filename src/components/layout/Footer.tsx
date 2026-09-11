import React from 'react';

export function Footer() {
  return (
    <footer
      style={{
        padding: 'var(--space-4) var(--space-8)',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: 'var(--text-xs)',
        color: 'var(--text-muted)',
      }}
    >
      <div>
        <span>© {new Date().getFullYear()} Academy LMS. Plataforma de Capacitación y Seguimiento.</span>
      </div>
      <div>
        <span>Kezelmedica • Red Beat • Vitaris</span>
      </div>
    </footer>
  );
}
