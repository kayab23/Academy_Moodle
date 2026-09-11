'use client';

import React from 'react';
import { signOut, useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { LogOut, Globe, User as UserIcon, Building2 } from 'lucide-react';

interface NavbarProps {
  companyName?: string;
  companySlug?: string;
}

export function Navbar({ companyName, companySlug }: NavbarProps) {
  const t = useTranslations('nav');
  const tAuth = useTranslations('auth');
  const tRoles = useTranslations('roles');
  const { data: session } = useSession();

  const currentRole = session?.user?.role || 'COLLABORATOR';
  const roleLabel = tRoles(currentRole as 'ADMIN' | 'MANAGER' | 'INSTRUCTOR' | 'COLLABORATOR');

  const toggleLocale = () => {
    const currentLocale = document.cookie
      .split('; ')
      .find((row) => row.startsWith('NEXT_LOCALE='))
      ?.split('=')[1] || 'es';
    const nextLocale = currentLocale === 'es' ? 'en' : 'es';
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
    window.location.reload();
  };

  return (
    <header
      style={{
        height: 'var(--navbar-height)',
        background: 'var(--glass-bg)',
        backdropFilter: 'var(--glass-backdrop)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--space-6)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}
    >
      {/* Left: Company Identification */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        {companyName && (
          <div
            className="badge"
            style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-primary)',
              padding: 'var(--space-1) var(--space-3)',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
            }}
          >
            <Building2 size={14} style={{ color: 'var(--brand-primary)' }} />
            <span>{companyName}</span>
          </div>
        )}
      </div>

      {/* Right: Actions & User Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        {/* Language Switcher */}
        <button
          onClick={toggleLocale}
          className="btn-secondary"
          title="Cambiar idioma / Change language"
          style={{ padding: 'var(--space-2) var(--space-3)' }}
        >
          <Globe size={16} />
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>
            {typeof document !== 'undefined' &&
            document.cookie.includes('NEXT_LOCALE=en')
              ? 'EN'
              : 'ES'}
          </span>
        </button>

        {/* User Card */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-strong)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-primary)',
            }}
          >
            <UserIcon size={18} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
              {session?.user?.name || 'Usuario'}
            </span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--brand-primary)', fontWeight: 500 }}>
              {roleLabel}
            </span>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="btn-secondary"
          title={tAuth('logout')}
          style={{ padding: 'var(--space-2)' }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
