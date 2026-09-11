'use client';

import React from 'react';
import Link from 'next/navigation';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import {
  GraduationCap,
  LayoutDashboard,
  BookOpen,
  BookMarked,
  Award,
  FileSpreadsheet,
  BarChart3,
  ShieldAlert,
} from 'lucide-react';

export function Sidebar() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role;

  const navItems = [
    { label: t('dashboard'), href: '/dashboard', icon: LayoutDashboard },
    { label: t('courses'), href: '/courses', icon: BookOpen },
    { label: t('myLearning'), href: '/my-learning', icon: BookMarked },
    { label: t('gradebook'), href: '/gradebook', icon: FileSpreadsheet },
    { label: t('certificates'), href: '/certificates', icon: Award },
    { label: t('reports'), href: '/reports', icon: BarChart3 },
  ];

  if (role === 'ADMIN' || role === 'MANAGER') {
    navItems.push({
      label: t('admin'),
      href: '/admin',
      icon: ShieldAlert,
    });
  }

  return (
    <aside
      style={{
        width: 'var(--sidebar-width)',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          height: 'var(--navbar-height)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          padding: '0 var(--space-5)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--brand-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 4px 12px var(--brand-glow)',
          }}
        >
          <GraduationCap size={22} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'var(--text-lg)',
              fontWeight: 700,
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
              background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Academy
          </span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>
            LMS EMPRESARIAL
          </span>
        </div>
      </div>

      {/* Nav List */}
      <nav style={{ flex: 1, padding: 'var(--space-4) var(--space-3)', overflowY: 'auto' }}>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <li key={item.href}>
                <a
                  href={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    padding: 'var(--space-3) var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    color: isActive ? '#ffffff' : 'var(--text-secondary)',
                    background: isActive ? 'var(--brand-gradient)' : 'transparent',
                    boxShadow: isActive ? '0 4px 12px var(--brand-glow)' : 'none',
                    fontWeight: isActive ? 600 : 500,
                    fontSize: 'var(--text-sm)',
                    transition: 'all var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'var(--bg-surface-elevated)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }
                  }}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer info in sidebar */}
      <div
        style={{
          padding: 'var(--space-4) var(--space-5)',
          borderTop: '1px solid var(--border-subtle)',
          fontSize: 'var(--text-xs)',
          color: 'var(--text-muted)',
        }}
      >
        <span>Academy LMS v0.1.0</span>
      </div>
    </aside>
  );
}
