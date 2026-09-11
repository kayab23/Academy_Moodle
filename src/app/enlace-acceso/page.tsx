'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function EnlaceAccesoPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Enlace de acceso no válido o token no provisto.');
      return;
    }

    let isMounted = true;

    async function authenticateWithToken() {
      try {
        const res = await signIn('credentials', {
          ssoToken: token,
          redirect: false,
        });

        if (!isMounted) return;

        if (res && res.ok && !res.error) {
          setStatus('success');
          // Redirigir de inmediato al dashboard
          router.push('/dashboard');
          router.refresh();
        } else {
          setStatus('error');
          setErrorMessage(
            'El enlace de acceso ha expirado o ya fue utilizado. Por favor ingresa nuevamente desde el portal SIGE.'
          );
        }
      } catch {
        if (!isMounted) return;
        setStatus('error');
        setErrorMessage(
          'No se pudo completar el acceso por enlace temporal. Intenta de nuevo desde SIGE.'
        );
      }
    }

    authenticateWithToken();

    return () => {
      isMounted = false;
    };
  }, [token, router]);

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-4)',
        background: 'var(--bg-main)',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: 'var(--space-8)',
          textAlign: 'center',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
        }}
      >
        {status === 'loading' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)' }}>
            <Loader2 size={36} style={{ color: 'var(--brand-primary)', animation: 'spin 1s linear infinite' }} />
            <div>
              <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-1)' }}>
                Accediendo a Capacitación
              </h2>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                Validando credenciales desde el portal corporativo...
              </p>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)' }}>
            <CheckCircle2 size={40} style={{ color: 'var(--color-success)' }} />
            <div>
              <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-1)' }}>
                Acceso Verificado
              </h2>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                Cargando tu sesión y cursos asignados...
              </p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)' }}>
            <AlertCircle size={40} style={{ color: 'var(--color-error)' }} />
            <div>
              <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2)', color: 'var(--text-primary)' }}>
                Acceso No Disponible
              </h2>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {errorMessage}
              </p>
            </div>
            <a href="/login" className="btn-secondary" style={{ marginTop: 'var(--space-2)' }}>
              <span>Ir al login tradicional</span>
            </a>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}
