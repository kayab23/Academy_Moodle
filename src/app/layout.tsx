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

  return (
    <html lang="es">
      <head>
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
