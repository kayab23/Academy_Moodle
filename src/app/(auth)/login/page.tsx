'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { GraduationCap, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('from') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
        callbackUrl,
      });

      if (!res) {
        setError(t('invalidCredentials'));
        setLoading(false);
        return;
      }

      if (res.error) {
        if (res.error === 'RATE_LIMITED') {
          setError(t('rateLimited'));
        } else {
          setError(t('invalidCredentials'));
        }
        setLoading(false);
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError(tCommon('error'));
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-4)',
        background: 'radial-gradient(ellipse at top, rgba(59, 130, 246, 0.15) 0%, var(--bg-main) 70%)',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: 'var(--space-8)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 40px rgba(59, 130, 246, 0.1)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--brand-gradient)',
              color: '#ffffff',
              boxShadow: '0 8px 24px var(--brand-glow)',
              marginBottom: 'var(--space-4)',
            }}
          >
            <GraduationCap size={32} />
          </div>
          <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-2)' }}>
            {t('loginTitle')}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
            {t('loginSubtitle')}
          </p>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-3) var(--space-4)',
              background: 'var(--color-error-bg)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-error)',
              fontSize: 'var(--text-sm)',
              marginBottom: 'var(--space-5)',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label
              htmlFor="email"
              style={{
                display: 'block',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-secondary)',
                marginBottom: 'var(--space-2)',
              }}
            >
              {t('emailLabel')}
            </label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={18}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('emailPlaceholder')}
                className="input-field"
                style={{ paddingLeft: '40px' }}
                disabled={loading}
              />
            </div>
          </div>

          <div style={{ marginBottom: 'var(--space-6)' }}>
            <label
              htmlFor="password"
              style={{
                display: 'block',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-secondary)',
                marginBottom: 'var(--space-2)',
              }}
            >
              {t('passwordLabel')}
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={18}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('passwordPlaceholder')}
                className="input-field"
                style={{ paddingLeft: '40px' }}
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', padding: 'var(--space-3)' }}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                <span>{t('signingIn')}</span>
              </>
            ) : (
              <span>{t('submit')}</span>
            )}
          </button>
        </form>

        <div
          style={{
            marginTop: 'var(--space-8)',
            paddingTop: 'var(--space-4)',
            borderTop: '1px solid var(--border-subtle)',
            textAlign: 'center',
            fontSize: 'var(--text-xs)',
            color: 'var(--text-muted)',
          }}
        >
          <span>Kezelmedica • Red Beat • Vitaris</span>
        </div>
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
