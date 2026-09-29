import React from 'react';
import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { AuthProvider } from '@/components/providers/AuthProvider';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'Academy LMS — Capacitación Empresarial',
  description: 'Plataforma empresarial de cursos, capacitaciones, evaluaciones y seguimiento corporativo.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = await getMessages();

  // Oscuro por defecto (Academy nació oscuro). Dentro de SIGE, sige-embed.js cambia data-theme/dark según el tema de SIGE.

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var inIframe = window.self !== window.top;
                var theme = inIframe ? (sessionStorage.getItem('sige_theme') || 'dark') : 'dark';
                document.documentElement.setAttribute('data-theme', theme);
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
                if (inIframe) {
                  document.documentElement.setAttribute('data-embedded', 'true');
                  var emp = sessionStorage.getItem('sige_empresa');
                  if (emp) document.documentElement.setAttribute('data-empresa', emp);
                  var brandRaw = sessionStorage.getItem('sige_brand');
                  if (brandRaw) {
                    var b = JSON.parse(brandRaw);
                    if (b.from) document.documentElement.style.setProperty('--sige-brand-from', b.from);
                    if (b.to) document.documentElement.style.setProperty('--sige-brand-to', b.to);
                    if (b.accent) document.documentElement.style.setProperty('--sige-brand-accent', b.accent);
                    if (b.c500) document.documentElement.style.setProperty('--sige-brand-500', b.c500);
                  }
                }
              } catch (e) {}
            `,
          }}
        />
        {/* Protocolo SIGE (OPS-013): se inicializa solo con data-app; fuera de un iframe no hace nada */}
        <script src="/sige-embed.js" data-app="academy" defer></script>
      </head>
      <body>
        <AuthProvider>
          <NextIntlClientProvider messages={messages}>
            {children}
          </NextIntlClientProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
