import React from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { DashboardShell } from '@/components/layout/DashboardShell';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  // Cargar branding por empresa (Kezelmedica / Red Beat / Vitaris)
  const company = await db.company.findUnique({
    where: { id: session.user.companyId },
    select: {
      id: true,
      name: true,
      slug: true,
      primaryColor: true,
      secondaryColor: true,
      logoUrl: true,
    },
  });

  const primaryColor = company?.primaryColor || '#3b82f6';
  const secondaryColor = company?.secondaryColor || '#8b5cf6';

  const brandStyles = {
    '--brand-primary': primaryColor,
    '--brand-secondary': secondaryColor,
    '--brand-gradient': `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
    '--brand-glow': `${primaryColor}40`,
  } as React.CSSProperties;

  return (
    <div style={{ ...brandStyles, minHeight: '100vh' }}>
      <DashboardShell
        sidebar={<Sidebar />}
        navbar={<Navbar companyName={company?.name} companySlug={company?.slug} />}
        footer={<Footer />}
      >
        {children}
      </DashboardShell>
    </div>
  );
}
