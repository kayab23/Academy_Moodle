'use client';

import React, { useState } from 'react';
import { FileText, Image as ImageIcon, Link as LinkIcon, Play, Download } from 'lucide-react';

interface ResourceViewerProps {
  resource: {
    id: string;
    title: string;
    type: string;
    fileUrl: string;
    convertedPdfUrl: string | null;
    fileName: string;
  };
}

export function ResourceViewer({ resource }: ResourceViewerProps) {
  const [expanded, setExpanded] = useState(false);

  const icon =
    resource.type === 'VIDEO' ? <Play size={14} /> :
    resource.type === 'IMAGE' ? <ImageIcon size={14} /> :
    resource.type === 'LINK' ? <LinkIcon size={14} /> :
    <FileText size={14} />;

  if (resource.type === 'LINK') {
    return (
      <a
        href={resource.fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--brand-primary)' }}
      >
        {icon} {resource.title}
      </a>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          fontSize: 'var(--text-sm)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-primary)',
          padding: 0,
        }}
      >
        {icon} {resource.title}
      </button>

      {expanded && (
        <div style={{ marginTop: 'var(--space-3)' }}>
          {resource.type === 'VIDEO' && (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video controls preload="metadata" style={{ width: '100%', maxHeight: '480px', borderRadius: 'var(--radius-md)', background: '#000' }}>
              <source src={resource.fileUrl} />
            </video>
          )}

          {resource.type === 'PDF' && (
            <iframe src={resource.fileUrl} title={resource.title} style={{ width: '100%', height: '600px', border: 'none', borderRadius: 'var(--radius-md)' }} />
          )}

          {resource.type === 'PPTX' && (
            resource.convertedPdfUrl ? (
              <iframe src={resource.convertedPdfUrl} title={resource.title} style={{ width: '100%', height: '600px', border: 'none', borderRadius: 'var(--radius-md)' }} />
            ) : (
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                <p style={{ marginBottom: 'var(--space-2)' }}>
                  Vista previa no disponible (el servidor no pudo convertir el PPTX a PDF). Puedes descargar el archivo original.
                </p>
                <a href={resource.fileUrl} download={resource.fileName} className="btn-secondary" style={{ display: 'inline-flex' }}>
                  <Download size={14} /> <span>Descargar</span>
                </a>
              </div>
            )
          )}

          {resource.type === 'IMAGE' && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={resource.fileUrl} alt={resource.title} style={{ maxWidth: '100%', borderRadius: 'var(--radius-md)' }} />
          )}
        </div>
      )}
    </div>
  );
}
