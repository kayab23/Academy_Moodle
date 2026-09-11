'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, X, AlertCircle } from 'lucide-react';

const FILE_TYPES = [
  { value: 'VIDEO', label: 'Video (MP4, WebM, MOV)', accept: '.mp4,.webm,.mov' },
  { value: 'PPTX', label: 'Presentación (PPTX)', accept: '.pptx' },
  { value: 'PDF', label: 'Documento (PDF)', accept: '.pdf' },
  { value: 'IMAGE', label: 'Imagen (PNG, JPG, WEBP)', accept: '.png,.jpg,.jpeg,.webp' },
  { value: 'LINK', label: 'Enlace externo', accept: '' },
];

export function UploadResourceForm({ lessonId }: { lessonId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('VIDEO');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedType = FILE_TYPES.find((t) => t.value === type)!;

  const resetForm = () => {
    setTitle('');
    setUrl('');
    setFile(null);
    setProgress(0);
    setOpen(false);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (type === 'LINK') {
      setLoading(true);
      const res = await fetch(`/api/lessons/${lessonId}/resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo agregar el enlace.');
        setLoading(false);
        return;
      }
      resetForm();
      router.refresh();
      return;
    }

    if (!file) {
      setError('Selecciona un archivo.');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('title', title);
    formData.append('type', type);
    formData.append('file', file);

    // Se usa XMLHttpRequest (en vez de fetch) porque expone eventos de
    // progreso de subida, útil para videos grandes.
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/lessons/${lessonId}/resources`);
    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable) {
        setProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resetForm();
        router.refresh();
      } else {
        try {
          const data = JSON.parse(xhr.responseText);
          setError(data.error || 'No se pudo subir el archivo.');
        } catch {
          setError('No se pudo subir el archivo.');
        }
        setLoading(false);
      }
    };
    xhr.onerror = () => {
      setError('Error de red durante la subida.');
      setLoading(false);
    };
    xhr.send(formData);
  };

  if (!open) {
    return (
      <button type="button" className="btn-secondary" style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-1) var(--space-3)' }} onClick={() => setOpen(true)}>
        <UploadCloud size={14} /> <span>Subir recurso</span>
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="glass-panel"
      style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', maxWidth: '420px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ fontSize: 'var(--text-sm)' }}>Subir recurso</strong>
        <button type="button" onClick={resetForm} disabled={loading} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
          <X size={16} />
        </button>
      </div>

      {error && (
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', color: 'var(--color-error)', fontSize: 'var(--text-xs)' }}>
          <AlertCircle size={14} /> <span>{error}</span>
        </div>
      )}

      <select className="input-field" value={type} onChange={(e) => setType(e.target.value)} disabled={loading}>
        {FILE_TYPES.map((ft) => (
          <option key={ft.value} value={ft.value}>{ft.label}</option>
        ))}
      </select>

      <input
        className="input-field"
        placeholder="Título del recurso"
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={loading}
      />

      {type === 'LINK' ? (
        <input
          className="input-field"
          type="url"
          placeholder="https://..."
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={loading}
        />
      ) : (
        <input
          className="input-field"
          type="file"
          accept={selectedType.accept}
          required
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          disabled={loading}
        />
      )}

      {loading && type !== 'LINK' && (
        <div style={{ width: '100%', height: '6px', borderRadius: 'var(--radius-full)', background: 'var(--bg-surface)', overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: 'var(--brand-primary)', transition: 'width 0.2s' }} />
        </div>
      )}

      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? `Subiendo... ${type !== 'LINK' ? progress + '%' : ''}` : 'Subir'}
      </button>
    </form>
  );
}
