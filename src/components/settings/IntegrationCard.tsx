'use client';

import { useState } from 'react';
import { Check, Zap, RefreshCw, AlertCircle, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';

// ── Types ────────────────────────────────────────────────────────────────────

export type IntegrationStatus = 'connected' | 'disconnected' | 'partial' | 'loading' | 'coming-soon';

export interface IntegrationFeature {
  label: string;
  enabled: boolean;
}

export interface IntegrationCardProps {
  icon: React.ReactNode;
  iconBg: string;
  name: string;
  description: string;
  status: IntegrationStatus;
  connectedEmail?: string;
  connectedAt?: string;
  lastSync?: string;
  features?: IntegrationFeature[];
  connectLabel?: string;
  disconnectWarning?: string;
  onConnect?: () => void | Promise<void>;
  onDisconnect?: () => void | Promise<void>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function StatusBadge({ status }: { status: IntegrationStatus }) {
  switch (status) {
    case 'connected':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
          Connected
        </span>
      );
    case 'partial':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
          <AlertCircle size={10} />
          Partial
        </span>
      );
    case 'loading':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--color-text-muted)] bg-[var(--color-bg-tertiary)] px-2 py-0.5 rounded-full">
          <Loader2 size={10} className="animate-spin" />
          Loading
        </span>
      );
    case 'coming-soon':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--color-text-muted)] bg-[var(--color-bg-tertiary)] px-2 py-0.5 rounded-full">
          <Lock size={10} />
          Coming Soon
        </span>
      );
    default:
      return null;
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export function IntegrationCard({
  icon,
  iconBg,
  name,
  description,
  status,
  connectedEmail,
  connectedAt,
  lastSync,
  features,
  connectLabel = 'Connect',
  disconnectWarning,
  onConnect,
  onDisconnect,
}: IntegrationCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const isActive = status === 'connected' || status === 'partial';
  const isComingSoon = status === 'coming-soon';
  const isLoading = status === 'loading';

  async function handleAction() {
    if (isActive && onDisconnect) {
      if (disconnectWarning) {
        setShowConfirm(true);
        return;
      }
      setActionLoading(true);
      try { await onDisconnect(); } finally { setActionLoading(false); }
    } else if (!isActive && onConnect) {
      setActionLoading(true);
      try { await onConnect(); } finally { setActionLoading(false); }
    }
  }

  async function handleConfirmDisconnect() {
    setActionLoading(true);
    try {
      await onDisconnect?.();
    } finally {
      setActionLoading(false);
      setShowConfirm(false);
    }
  }

  return (
    <>
      <div className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-5 ${isComingSoon ? 'opacity-60' : ''}`}>
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${iconBg}`}>
            {icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">{name}</p>
              <StatusBadge status={status} />
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{description}</p>

            {isActive && connectedEmail && (
              <p className="text-[11px] text-[var(--color-text-muted)] mt-1">{connectedEmail}</p>
            )}
            {isActive && connectedAt && (
              <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">Connected {fmtDate(connectedAt)}</p>
            )}
            {isActive && lastSync && (
              <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">Last sync: {fmtDate(lastSync)}</p>
            )}

            {/* Feature list */}
            {features && features.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {features.map((f) => (
                  <span
                    key={f.label}
                    className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      f.enabled
                        ? 'text-emerald-700 bg-emerald-50'
                        : 'text-[var(--color-text-muted)] bg-[var(--color-bg-tertiary)]'
                    }`}
                  >
                    {f.enabled ? <Check size={8} /> : <AlertCircle size={8} />}
                    {f.label}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Action button */}
          {!isComingSoon && !isLoading && (onConnect || onDisconnect) && (
            <Button
              variant={isActive ? 'secondary' : 'primary'}
              size="sm"
              isLoading={actionLoading}
              disabled={actionLoading}
              onClick={handleAction}
            >
              {isActive ? (
                <><RefreshCw size={12} /> Disconnect</>
              ) : (
                <><Zap size={12} /> {connectLabel}</>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Disconnect confirmation modal */}
      <ConfirmDeleteModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmDisconnect}
        isLoading={actionLoading}
        title={`Disconnect ${name}?`}
        description={disconnectWarning || ''}
        confirmLabel="Disconnect"
      />
    </>
  );
}
