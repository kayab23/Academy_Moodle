'use client';

import React, { useEffect, useState } from 'react';

interface DashboardShellProps {
  sidebar: React.ReactNode;
  navbar: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}

export function DashboardShell({
  sidebar,
  navbar,
  footer,
  children,
}: DashboardShellProps) {
  const [isEmbedded, setIsEmbedded] = useState(false);

  useEffect(() => {
    try {
      // Si la ventana no es la superior, corre dentro de un iframe (ej. SIGE)
      if (window.self !== window.top) {
        setIsEmbedded(true);
      }
    } catch {
      // Cross-origin restriction al acceder a window.top indica presencia de iframe
      setIsEmbedded(true);
    }
  }, []);

  // Modo Embebido en SIGE: Oculta Sidebar, Navbar y Footer para no duplicar navegación
  if (isEmbedded) {
    return (
      <div
        className="embedded-portal-root"
        style={{
          width: '100%',
          minHeight: '100%',
          background: 'var(--bg-main)',
        }}
      >
        <main
          style={{
            padding: 'var(--space-6)',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          {children}
        </main>
      </div>
    );
  }

  // Modo Standalone: Renderiza layout completo con Sidebar, Navbar y Footer
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {sidebar}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {navbar}
        <main
          style={{
            flex: 1,
            padding: 'var(--space-8)',
            maxWidth: '1400px',
            width: '100%',
            margin: '0 auto',
          }}
        >
          {children}
        </main>
        {footer}
      </div>
    </div>
  );
}
