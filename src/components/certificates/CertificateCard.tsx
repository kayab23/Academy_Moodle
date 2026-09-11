'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Award, Download, Calendar, ShieldCheck } from 'lucide-react';

interface CertificateData {
  id: string;
  certificateNumber: string;
  title: string;
  finalGrade: number;
  issuedAt: string | Date;
  pdfUrl?: string | null;
  course: {
    id: string;
    title: string;
  };
  user?: {
    name: string;
    company?: {
      name: string;
      primaryColor?: string | null;
    } | null;
  };
}

interface CertificateCardProps {
  certificate: CertificateData;
}

export function CertificateCard({ certificate }: CertificateCardProps) {
  const t = useTranslations('certificates');

  const formattedDate = new Date(certificate.issuedAt).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const companyColor = certificate.user?.company?.primaryColor || 'var(--brand-primary)';

  return (
    <div
      className="glass-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 'var(--space-6)',
        position: 'relative',
        overflow: 'hidden',
        borderTop: `4px solid ${companyColor}`,
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
    >
      <div>
        {/* Top meta */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--space-4)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-1)',
              color: 'var(--brand-primary)',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
            }}
          >
            <ShieldCheck size={16} />
            <span>{t('verified')}</span>
          </div>

          <span
            className="badge badge-success"
            style={{ fontSize: '11px', fontWeight: 600 }}
          >
            {certificate.finalGrade}% {t('finalGrade')}
          </span>
        </div>

        {/* Title */}
        <h3
          style={{
            fontSize: 'var(--text-lg)',
            fontWeight: 600,
            marginBottom: 'var(--space-2)',
            color: 'var(--text-primary)',
            lineHeight: 1.3,
          }}
        >
          {certificate.course.title}
        </h3>

        {certificate.user && (
          <p
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--text-secondary)',
              marginBottom: 'var(--space-4)',
            }}
          >
            Acreditado a: <strong>{certificate.user.name}</strong>
            {certificate.user.company && ` (${certificate.user.company.name})`}
          </p>
        )}

        {/* Details */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
            padding: 'var(--space-3)',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            marginBottom: 'var(--space-6)',
            fontSize: 'var(--text-xs)',
            color: 'var(--text-muted)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Award size={14} style={{ color: companyColor }} />
            <span>
              {t('folio')}: <strong style={{ color: 'var(--text-secondary)' }}>{certificate.certificateNumber}</strong>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Calendar size={14} style={{ color: companyColor }} />
            <span>
              {t('issuedDate')}: {formattedDate}
            </span>
          </div>
        </div>
      </div>

      {/* Download Action */}
      <a
        href={`/api/certificates/${certificate.certificateNumber}/download`}
        download={`certificado-${certificate.certificateNumber}.pdf`}
        className="btn btn-primary"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--space-2)',
          textDecoration: 'none',
        }}
      >
        <Download size={16} />
        <span>{t('downloadPdf')}</span>
      </a>
    </div>
  );
}
