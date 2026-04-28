'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Calendar, CheckCircle2, Unlink, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { useToast } from '@/contexts/ToastContext';
import { calendarApi, type CalendarStatusDto } from '@/lib/api';

export default function CalendarSettingsPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Calendar Integration</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Connect your Google Calendar for scheduling.</p>
        </div>
        <Card>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--color-text-muted)]" />
          </div>
        </Card>
      </div>
    }>
      <CalendarSettingsContent />
    </Suspense>
  );
}

function CalendarSettingsContent() {
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [status, setStatus] = useState<CalendarStatusDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showDisconnect, setShowDisconnect] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // ── Handle OAuth redirect params ──────────────────────────────────────────
  useEffect(() => {
    const connected = searchParams.get('connected');
    const error = searchParams.get('error');

    if (connected === 'true') {
      showToast('Google Calendar connected successfully', 'success');
      // Clean URL without reload
      window.history.replaceState({}, '', '/settings/calendar');
    } else if (error) {
      const messages: Record<string, string> = {
        access_denied: 'Calendar access was denied',
        INVALID_STATE: 'Invalid OAuth state — please try again',
        TOKEN_EXCHANGE_FAILED: 'Failed to connect — please try again',
        missing_params: 'Missing OAuth parameters — please try again',
      };
      showToast(messages[error] ?? `Connection failed: ${error}`, 'error');
      window.history.replaceState({}, '', '/settings/calendar');
    }
  }, [searchParams, showToast]);

  // ── Fetch status ──────────────────────────────────────────────────────────
  useEffect(() => {
    calendarApi.getStatus()
      .then(setStatus)
      .catch(() => setFetchError(true))
      .finally(() => setIsLoading(false));
  }, []);

  // ── Connect handler ───────────────────────────────────────────────────────
  async function handleConnect() {
    setIsConnecting(true);
    try {
      const url = await calendarApi.getAuthUrl();
      window.location.href = url;
    } catch {
      showToast('Failed to start Google connection', 'error');
      setIsConnecting(false);
    }
  }

  // ── Disconnect handler ────────────────────────────────────────────────────
  async function handleDisconnect() {
    setIsDisconnecting(true);
    try {
      await calendarApi.disconnect();
      setStatus({ connected: false });
      setShowDisconnect(false);
      showToast('Google Calendar disconnected', 'success');
    } catch {
      showToast('Failed to disconnect calendar', 'error');
    } finally {
      setIsDisconnecting(false);
    }
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Calendar Integration</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Connect your Google Calendar for scheduling.</p>
        </div>
        <Card>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--color-text-muted)]" />
          </div>
        </Card>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (fetchError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Calendar Integration</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Connect your Google Calendar for scheduling.</p>
        </div>
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-[var(--color-text-muted)]">
            <AlertCircle size={40} strokeWidth={1.5} className="mb-3 opacity-40" />
            <p className="text-sm">Failed to load calendar status. Please try again later.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Calendar Integration</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Connect your Google Calendar to enable interview scheduling and availability checks.
        </p>
      </div>

      <Card>
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--color-surface)] shrink-0">
            <Calendar size={22} className="text-[var(--color-text-muted)]" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-1">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Google Calendar</h2>
              {status?.connected ? (
                <Badge variant="success">Connected</Badge>
              ) : (
                <Badge variant="default">Not connected</Badge>
              )}
            </div>

            {status?.connected ? (
              <>
                <p className="text-sm text-[var(--color-text-muted)] mb-1">
                  Synced with <span className="font-medium text-[var(--color-text-primary)]">{status.email}</span>
                </p>
                {status.calendarId && status.calendarId !== status.email && (
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Calendar: {status.calendarId}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-[var(--color-text-muted)]">
                Connect your calendar to automatically check availability and create interview events.
              </p>
            )}
          </div>

          {/* Action */}
          <div className="shrink-0">
            {status?.connected ? (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowDisconnect(true)}
                aria-label="Disconnect Google Calendar"
              >
                <Unlink size={14} />
                Disconnect
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={handleConnect}
                isLoading={isConnecting}
                aria-label="Connect Google Calendar"
              >
                {!isConnecting && <CheckCircle2 size={14} />}
                Connect
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Info */}
      <div className="text-xs text-[var(--color-text-muted)] space-y-1">
        <p>TeamTalent will only read your calendar availability and create interview events.</p>
        <p>You can disconnect at any time to revoke access.</p>
      </div>

      {/* Disconnect confirmation */}
      <ConfirmDeleteModal
        isOpen={showDisconnect}
        onClose={() => setShowDisconnect(false)}
        onConfirm={handleDisconnect}
        isLoading={isDisconnecting}
        title="Disconnect Google Calendar"
        description="This will revoke TeamTalent's access to your calendar. Existing interview events will not be deleted."
        confirmLabel="Disconnect"
      />
    </div>
  );
}
