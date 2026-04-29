'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import {
  LayoutDashboard,
  Search,
  Users,
  Layers,
  Briefcase,
  BarChart2,
  ClipboardList,
  Star,
  FileText,
  Settings,
  Calendar,
  FileCheck,
  Building2,
  Bell,
  FolderOpen,
  Mail,
  CheckCheck,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { NAV_ITEMS, SETTINGS_NAV_ITEM, INBOX_NAV_ITEM } from '@/lib/constants';
import { Avatar } from '@/components/ui/Avatar';
import { relativeTime } from '@/lib/relativeTime';
import { notificationsApi, type NotificationDto } from '@/lib/api';
import type { IconName } from '@/types';

// ─── Icon registry ────────────────────────────────────────────────────────────

const ICON_MAP: Record<IconName, LucideIcon> = {
  LayoutDashboard,
  Search,
  Users,
  Layers,
  Briefcase,
  BarChart2,
  ClipboardList,
  Star,
  FileText,
  Settings,
  Calendar,
  FileCheck,
  Building2,
  Bell,
  FolderOpen,
  Mail,
};

function NavIcon({ name }: { name: IconName }) {
  const Icon = ICON_MAP[name];
  return <Icon size={15} strokeWidth={1.75} aria-hidden="true" />;
}

// ─── Unread count hook ────────────────────────────────────────────────────────

function useUnreadCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

    async function fetch_() {
      try {
        const res = await fetch(`${BASE}/notifications/unread-count`, { credentials: 'include' });
        if (!res.ok || cancelled) return;
        const json = await res.json();
        setCount(json?.data?.count ?? 0);
      } catch { /* ignore */ }
    }

    fetch_();
    const id = setInterval(fetch_, 30_000); // refresh every 30s
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  return count;
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname    = usePathname();
  const router      = useRouter();
  const { user, logout } = useAuth();
  const unreadCount = useUnreadCount();

  // Notification dropdown
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    setNotifLoading(true);
    try {
      const data = await notificationsApi.getAll();
      setNotifications(data.notifications);
    } catch { /* ignore */ }
    finally { setNotifLoading(false); }
  }, []);

  function toggleDropdown() {
    const next = !notifOpen;
    setNotifOpen(next);
    if (next) fetchNotifications();
  }

  async function handleMarkAllRead() {
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch { /* ignore */ }
  }

  async function handleClickNotif(notif: NotificationDto) {
    if (!notif.read) {
      try {
        await notificationsApi.markRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)),
        );
      } catch { /* ignore */ }
    }
    setNotifOpen(false);
    if (notif.href) router.push(notif.href);
  }

  // Close dropdown on outside click or Escape
  useEffect(() => {
    if (!notifOpen) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setNotifOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [notifOpen]);

  function isActive(href: string, exact = false): boolean {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <aside
      style={{ width: 'var(--sidebar-width)' }}
      className="fixed inset-y-0 left-0 z-40 flex flex-col bg-white border-r border-[var(--color-border)]"
    >
      {/* ── Logo ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 px-4 h-[57px] border-b border-[var(--color-border)] flex-shrink-0">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--color-primary)]">
          <Users size={13} strokeWidth={2.25} className="text-white" aria-hidden="true" />
        </div>
        <span className="font-semibold text-sm tracking-tight text-[var(--color-primary)]">
          TeamTalent
        </span>
      </div>

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5" aria-label="Main navigation">
        <ul className="space-y-0.5" role="list">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href, !item.children);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={[
                    'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors duration-100 outline-none',
                    'focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30',
                    active && !item.children
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-primary)]',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-current={active && !item.children ? 'page' : undefined}
                >
                  <NavIcon name={item.icon} />
                  {item.label}
                </Link>

                {/* Sub-nav items (e.g. Sourcing children) */}
                {item.children ? (
                  <ul className="mt-0.5 ml-[30px] space-y-0.5" role="list">
                    {item.children.map((child) => {
                      const childActive = isActive(child.href, true);
                      return (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            className={[
                              'block px-2.5 py-1.5 rounded-lg text-[12px] transition-colors duration-100 outline-none',
                              'focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30',
                              childActive
                                ? 'text-[var(--color-primary)] font-semibold bg-[var(--color-surface)]'
                                : 'text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface)]',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            aria-current={childActive ? 'page' : undefined}
                          >
                            {child.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── Bottom section ──────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-[var(--color-border)] px-2.5 py-2.5 space-y-0.5">

        {/* Inbox with notification dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={toggleDropdown}
            aria-expanded={notifOpen}
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
            className={[
              'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors duration-100 outline-none',
              'focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30',
              notifOpen
                ? 'bg-[var(--color-primary)] text-white'
                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-primary)]',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div className="relative">
              <NavIcon name={INBOX_NAV_ITEM.icon} />
              {unreadCount > 0 && (
                <span className={[
                  'absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 px-0.5 rounded-full text-[9px] font-bold leading-[14px] text-center',
                  notifOpen ? 'bg-white text-[var(--color-primary)]' : 'bg-red-500 text-white',
                ].join(' ')}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            {INBOX_NAV_ITEM.label}
            {unreadCount > 0 && !notifOpen && (
              <span className="ml-auto text-[10px] font-semibold bg-red-500 text-white px-1.5 py-0.5 rounded-full leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {notifOpen && (
            <div className="absolute bottom-full left-0 mb-1 w-80 bg-white border border-[var(--color-border)] rounded-xl shadow-lg z-50 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-border)]">
                <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                  Notifications
                </span>
                {notifications.some((n) => !n.read) && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--color-primary)] hover:underline"
                  >
                    <CheckCheck size={12} />
                    Mark all read
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-[320px] overflow-y-auto">
                {notifLoading && notifications.length === 0 && (
                  <div className="py-6 text-center text-[12px] text-[var(--color-text-muted)]">
                    Loading...
                  </div>
                )}
                {!notifLoading && notifications.length === 0 && (
                  <div className="py-6 text-center text-[12px] text-[var(--color-text-muted)]">
                    No notifications
                  </div>
                )}
                {notifications.slice(0, 15).map((notif) => (
                  <button
                    key={notif.id}
                    type="button"
                    onClick={() => handleClickNotif(notif)}
                    className={[
                      'w-full text-left px-4 py-2.5 border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-surface)] transition-colors',
                      !notif.read ? 'bg-blue-50/40' : '',
                    ].join(' ')}
                  >
                    <div className="flex items-start gap-2">
                      {!notif.read && (
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-medium text-[var(--color-text-primary)] truncate">
                          {notif.title}
                        </p>
                        <p className="text-[11px] text-[var(--color-text-muted)] line-clamp-2 leading-snug">
                          {notif.message}
                        </p>
                        <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                          {relativeTime(notif.createdAt)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Footer */}
              <div className="border-t border-[var(--color-border)] px-4 py-2">
                <Link
                  href={INBOX_NAV_ITEM.href}
                  onClick={() => setNotifOpen(false)}
                  className="text-[12px] font-medium text-[var(--color-primary)] hover:underline"
                >
                  View all notifications
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Settings */}
        <Link
          href={SETTINGS_NAV_ITEM.href}
          className={[
            'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors duration-100 outline-none',
            'focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30',
            isActive(SETTINGS_NAV_ITEM.href)
              ? 'bg-[var(--color-primary)] text-white'
              : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-primary)]',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-current={isActive(SETTINGS_NAV_ITEM.href) ? 'page' : undefined}
        >
          <NavIcon name={SETTINGS_NAV_ITEM.icon} />
          {SETTINGS_NAV_ITEM.label}
        </Link>

{/* User profile / logout */}
        {user ? (
          <button
            type="button"
            onClick={logout}
            title="Sign out"
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-[var(--color-surface)] transition-colors duration-100 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30 group"
          >
            <Avatar name={user.name} size="sm" />
            <div className="flex-1 text-left min-w-0">
              <p className="text-[12px] font-semibold text-[var(--color-text-primary)] truncate leading-tight">
                {user.name}
              </p>
              <p className="text-[11px] text-[var(--color-text-muted)] truncate leading-tight">
                {user.role}
              </p>
            </div>
          </button>
        ) : null}
      </div>
    </aside>
  );
}
