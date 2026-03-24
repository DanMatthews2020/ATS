'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell, Calendar, FileCheck, ClipboardList, Star, FileText,
  CheckCheck, Check, Circle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/contexts/ToastContext';
import { notificationsApi, type NotificationDto, type NotificationType } from '@/lib/api';

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_TABS: { key: NotificationType | 'all'; label: string; Icon: React.ElementType }[] = [
  { key: 'all',         label: 'All',          Icon: Bell         },
  { key: 'interview',   label: 'Interviews',   Icon: Calendar     },
  { key: 'offer',       label: 'Offers',       Icon: FileCheck    },
  { key: 'application', label: 'Applications', Icon: ClipboardList },
  { key: 'task',        label: 'Tasks',        Icon: FileText     },
  { key: 'review',      label: 'Reviews',      Icon: Star         },
];

const TYPE_ICON: Record<NotificationType, React.ElementType> = {
  interview:   Calendar,
  offer:       FileCheck,
  application: ClipboardList,
  task:        FileText,
  review:      Star,
};

const TYPE_COLOR: Record<NotificationType, string> = {
  interview:   'bg-blue-50 text-blue-600',
  offer:       'bg-emerald-50 text-emerald-600',
  application: 'bg-violet-50 text-violet-600',
  task:        'bg-amber-50 text-amber-600',
  review:      'bg-rose-50 text-rose-600',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtRelative(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m  = Math.floor(ms / 60_000);
  const h  = Math.floor(m  / 60);
  const d  = Math.floor(h  / 24);
  if (m  < 1)  return 'just now';
  if (m  < 60) return `${m}m ago`;
  if (h  < 24) return `${h}h ago`;
  if (d  < 7)  return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ─── Notification row ─────────────────────────────────────────────────────────

function NotificationRow({ notif, onRead, onClick }: {
  notif: NotificationDto;
  onRead: (id: string) => void;
  onClick: (notif: NotificationDto) => void;
}) {
  const Icon      = TYPE_ICON[notif.type];
  const colorCls  = TYPE_COLOR[notif.type];

  return (
    <div
      className={[
        'group flex items-start gap-4 px-5 py-4 border-b border-[var(--color-border)] transition-colors cursor-pointer',
        notif.read
          ? 'bg-white hover:bg-[var(--color-surface)]'
          : 'bg-blue-50/40 hover:bg-blue-50/70',
      ].join(' ')}
      onClick={() => onClick(notif)}
    >
      {/* Type icon */}
      <div className={`flex-shrink-0 mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center ${colorCls}`}>
        <Icon size={14} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={`text-sm leading-snug ${notif.read ? 'text-[var(--color-text-primary)]' : 'font-semibold text-[var(--color-text-primary)]'}`}>
            {notif.title}
          </p>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[11px] text-[var(--color-text-muted)]">{fmtRelative(notif.createdAt)}</span>
            {!notif.read && (
              <button
                onClick={(e) => { e.stopPropagation(); onRead(notif.id); }}
                title="Mark as read"
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/80 transition-all"
              >
                <Check size={13} className="text-[var(--color-primary)]" />
              </button>
            )}
          </div>
        </div>
        <p className="text-[13px] text-[var(--color-text-muted)] mt-0.5 leading-snug">{notif.message}</p>
      </div>

      {/* Unread dot */}
      {!notif.read && (
        <div className="flex-shrink-0 mt-2">
          <Circle size={7} className="fill-[var(--color-primary)] text-[var(--color-primary)]" />
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InboxPage() {
  const router     = useRouter();
  const { showToast } = useToast();

  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [activeTab, setActiveTab]         = useState<NotificationType | 'all'>('all');
  const [loading, setLoading]             = useState(true);
  const [markingAll, setMarkingAll]       = useState(false);

  const load = useCallback(async () => {
    try {
      const { notifications: n, unreadCount: u } = await notificationsApi.getAll(
        activeTab !== 'all' ? activeTab : undefined,
      );
      setNotifications(n);
      setUnreadCount(u);
    } catch { showToast('Failed to load notifications', 'error'); }
    finally { setLoading(false); }
  }, [activeTab, showToast]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  async function handleMarkRead(id: string) {
    // optimistic
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await notificationsApi.markRead(id);
    } catch {
      // revert on failure
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: false } : n));
      setUnreadCount((c) => c + 1);
      showToast('Failed to mark as read', 'error');
    }
  }

  async function handleMarkAllRead() {
    if (unreadCount === 0) return;
    setMarkingAll(true);
    const prev = notifications;
    const prevCount = unreadCount;
    setNotifications((ns) => ns.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await notificationsApi.markAllRead();
      showToast('All notifications marked as read');
    } catch {
      setNotifications(prev);
      setUnreadCount(prevCount);
      showToast('Failed to mark all as read', 'error');
    } finally { setMarkingAll(false); }
  }

  function handleClick(notif: NotificationDto) {
    if (!notif.read) handleMarkRead(notif.id);
    if (notif.href && notif.href !== '#') router.push(notif.href);
  }

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="p-8 flex-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 bg-[var(--color-primary)] rounded-xl flex items-center justify-center flex-shrink-0">
            <Bell size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] leading-tight">Inbox</h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
              {unread > 0 ? `${unread} unread notification${unread > 1 ? 's' : ''}` : 'All caught up'}
            </p>
          </div>
        </div>
        {unread > 0 && (
          <Button variant="secondary" size="md" isLoading={markingAll} onClick={handleMarkAllRead}>
            <CheckCheck size={14} /> Mark All Read
          </Button>
        )}
      </div>

      {/* Type filter tabs */}
      <div className="flex items-center gap-1 mb-5 bg-white border border-[var(--color-border)] rounded-xl p-1 w-fit flex-wrap">
        {TYPE_TABS.map(({ key, label, Icon }) => {
          const count = key === 'all'
            ? notifications.filter((n) => !n.read).length
            : notifications.filter((n) => n.type === key && !n.read).length;
          const active = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={[
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors',
                active
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-primary)]',
              ].join(' ')}
            >
              <Icon size={13} />
              {label}
              {count > 0 && (
                <span className={[
                  'text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none',
                  active ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600',
                ].join(' ')}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Notification list */}
      <div className="bg-white border border-[var(--color-border)] rounded-2xl shadow-card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-start gap-4 animate-pulse">
                <div className="w-8 h-8 rounded-lg bg-neutral-100 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-48 bg-neutral-100 rounded" />
                  <div className="h-2.5 w-72 bg-neutral-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center">
            <Bell size={32} className="text-[var(--color-text-muted)] mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium text-[var(--color-text-muted)]">No notifications</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1 opacity-70">
              {activeTab !== 'all' ? 'Try a different filter' : "You're all caught up!"}
            </p>
          </div>
        ) : (
          <>
            {/* Unread section */}
            {notifications.some((n) => !n.read) && (
              <>
                <div className="px-5 py-2.5 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
                  <p className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
                    Unread · {notifications.filter((n) => !n.read).length}
                  </p>
                </div>
                {notifications
                  .filter((n) => !n.read)
                  .map((n) => (
                    <NotificationRow key={n.id} notif={n} onRead={handleMarkRead} onClick={handleClick} />
                  ))}
              </>
            )}

            {/* Read section */}
            {notifications.some((n) => n.read) && (
              <>
                <div className="px-5 py-2.5 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
                  <p className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
                    Earlier · {notifications.filter((n) => n.read).length}
                  </p>
                </div>
                {notifications
                  .filter((n) => n.read)
                  .map((n) => (
                    <NotificationRow key={n.id} notif={n} onRead={handleMarkRead} onClick={handleClick} />
                  ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
