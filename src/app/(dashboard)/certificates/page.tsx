import React from 'react';
import { getServerSession } from 'next-auth';
import { getTranslations } from 'next-intl/server';
import { authOptions } from '@/lib/auth';
import { requireAuth } from '@/lib/scope';
import { db } from '@/lib/db';
import { Role } from '@prisma/client';
import { Award } from 'lucide-react';
import { CertificateCard } from '@/components/certificates/CertificateCard';

export default async function CertificatesPage({
  searchParams,
}: {
  searchParams?: { q?: string };
}) {
  const session = await getServerSession(authOptions);
  const user = requireAuth(session);
  const t = await getTranslations('certificates');

  const query = searchParams?.q;

  // Filtrar certificados según rol y aislamiento
  const where: {
    userId?: string;
    user?: { companyId?: string };
    OR?: {
      title?: { contains: string; mode: 'insensitive' };
      certificateNumber?: { contains: string; mode: 'insensitive' };
    }[];
  } = {};

  if (user.role === Role.COLLABORATOR) {
    where.userId = user.id;
  } else if (user.role === Role.MANAGER) {
    where.user = { companyId: user.companyId };
  }

  if (query) {
    where.OR = [
      { title: { contains: query, mode: 'insensitive' } },
      { certificateNumber: { contains: query, mode: 'insensitive' } },
    ];
  }

  const certificates = await db.certificate.findMany({
    where,
    orderBy: { issuedAt: 'desc' },
    include: {
      course: {
        select: {
          id: true,
          title: true,
        },
      },
      user: {
        select: {
          name: true,
          company: {
            select: {
              name: true,
              primaryColor: true,
            },
          },
        },
      },
    },
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-4)',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 'var(--text-2xl)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
            }}
          >
            <Award style={{ color: 'var(--brand-primary)' }} /> {t('title')}
          </h1>
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: 'var(--text-sm)',
              marginTop: 'var(--space-1)',
            }}
          >
            {t('subtitle')}
          </p>
        </div>

        {certificates.length > 0 && (
          <span className="badge badge-info" style={{ fontSize: 'var(--text-sm)' }}>
            {t('totalCertificates', { count: certificates.length })}
          </span>
        )}
      </div>

      {/* Grid de certificados */}
      {certificates.length === 0 ? (
        <div
          className="glass-panel"
          style={{ padding: 'var(--space-12)', textAlign: 'center', color: 'var(--text-muted)' }}
        >
          <Award
            size={56}
            style={{ margin: '0 auto var(--space-4)', color: 'var(--brand-primary)', opacity: 0.6 }}
          />
          <h3 style={{ fontSize: 'var(--text-base)', marginBottom: 'var(--space-2)', color: 'var(--text-secondary)' }}>
            {t('noCertificates')}
          </h3>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 'var(--space-6)',
          }}
        >
          {certificates.map((cert) => (
            <CertificateCard key={cert.id} certificate={cert} />
          ))}
        </div>
      )}
    </div>
  );
}
