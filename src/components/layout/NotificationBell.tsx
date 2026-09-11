'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Bell, Award, BookOpen, CheckCheck, Info, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  linkUrl?: string | null;
  createdAt: string;
}

export function NotificationBell() {
  const t = useTranslations('notifications');
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Cargar notificaciones
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.warn('Error al cargar notificaciones:', err);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    // Poll cada 60 segundos
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Cerrar al hacer clic afuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Marcar una como leída
  const handleMarkAsRead = async (item: NotificationItem) => {
    if (!item.isRead) {
      try {
        await fetch(`/api/notifications/${item.id}`, { method: 'PATCH' });
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.warn('Error al marcar leída:', err);
      }
    }

    if (item.linkUrl) {
      setIsOpen(false);
      router.push(item.linkUrl);
    }
  };

  // Marcar todas como leídas
  const handleMarkAllRead = async () => {
    setLoading(true);
    try {
      await fetch('/api/notifications/mark-all-read', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.warn('Error al marcar todas:', err);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'CERTIFICATE':
        return <Award size={16} style={{ color: '#10b981' }} />;
      case 'ENROLLMENT':
        return <BookOpen size={16} style={{ color: 'var(--brand-primary)' }} />;
      default:
        return <Info size={16} style={{ color: 'var(--text-muted)' }} />;
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Botón campana */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="btn-secondary"
        style={{
          position: 'relative',
          padding: 'var(--space-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title={t('title')}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: 700,
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid var(--bg-surface)',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          className="glass-panel"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '360px',
            maxHeight: '450px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 100,
            boxShadow: 'var(--shadow-xl)',
            animation: 'fadeIn 0.15s ease-out',
            padding: 0,
          }}
        >
          {/* Header del dropdown */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 'var(--space-3) var(--space-4)',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{t('title')}</span>
              {unreadCount > 0 && (
                <span className="badge badge-info" style={{ fontSize: '10px' }}>
                  {unreadCount}
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={loading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--brand-primary)',
                  fontSize: 'var(--text-xs)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-1)',
                  padding: 0,
                }}
              >
                <CheckCheck size={14} /> {t('markAllRead')}
              </button>
            )}
          </div>

          {/* Lista de notificaciones */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: 'var(--text-xs)', margin: 0 }}>{t('noNotifications')}</p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleMarkAsRead(item)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 'var(--space-3)',
                    padding: 'var(--space-3) var(--space-4)',
                    borderBottom: '1px solid var(--border-subtle)',
                    backgroundColor: item.isRead ? 'transparent' : 'rgba(59, 130, 246, 0.06)',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  <div style={{ marginTop: 'var(--space-1)' }}>{getIcon(item.type)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong
                        style={{
                          fontSize: 'var(--text-xs)',
                          color: item.isRead ? 'var(--text-secondary)' : 'var(--text-primary)',
                        }}
                      >
                        {item.title}
                      </strong>
                      {!item.isRead && (
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--brand-primary)',
                          }}
                        />
                      )}
                    </div>
                    <p
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        margin: 'var(--space-1) 0 0',
                        lineHeight: 1.4,
                      }}
                    >
                      {item.message}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-1)' }}>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                        {new Date(item.createdAt).toLocaleDateString('es-MX', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {item.linkUrl && (
                        <span
                          style={{
                            fontSize: '10px',
                            color: 'var(--brand-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px',
                          }}
                        >
                          {t('viewDetails')} <ExternalLink size={10} />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
