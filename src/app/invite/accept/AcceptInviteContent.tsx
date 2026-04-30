'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Users, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { invitationsApi, authApi, ApiError, type InvitationDto } from '@/lib/api';

type PageState = 'loading' | 'valid' | 'accepted' | 'expired' | 'not_found' | 'error';

export default function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [state, setState] = useState<PageState>('loading');
  const [invitation, setInvitation] = useState<InvitationDto | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setState('not_found');
      return;
    }

    invitationsApi.validate(token)
      .then(({ invitation: inv }) => {
        setInvitation(inv);
        setState('valid');
      })
      .catch((err: unknown) => {
        const code = err instanceof ApiError ? err.code : undefined;
        const message = err instanceof ApiError ? err.message : 'Something went wrong';
        if (code === 'INVITATION_EXPIRED') setState('expired');
        else if (code === 'INVITATION_ALREADY_ACCEPTED') setState('accepted');
        else if (code === 'INVITATION_NOT_FOUND') setState('not_found');
        else { setState('error'); setErrorMessage(message); }
      });
  }, [token]);

  async function handleAcceptWithGoogle() {
    if (!token) return;
    setAccepting(true);
    try {
      // Redirect to Google SSO — the state param carries the invite token
      // so we can accept it after authentication
      const { url } = await authApi.getGoogleUrl(`/invite/accept?token=${token}`);
      window.location.href = url;
    } catch {
      setErrorMessage('Failed to start Google sign-in.');
      setAccepting(false);
    }
  }

  const ROLE_LABELS: Record<string, string> = {
    ADMIN: 'Admin',
    HR: 'Recruiter',
    MANAGER: 'Hiring Manager',
    INTERVIEWER: 'Interviewer',
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface)] p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[var(--color-primary)]">
            <Users size={18} strokeWidth={2} className="text-white" aria-hidden="true" />
          </div>
          <span className="text-lg font-semibold text-[var(--color-primary)] tracking-tight">
            TeamTalent
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-8 text-center">
          {state === 'loading' && (
            <div className="py-8">
              <Loader2 size={28} className="animate-spin mx-auto text-[var(--color-text-muted)]" />
              <p className="text-sm text-[var(--color-text-muted)] mt-4">Verifying invitation…</p>
            </div>
          )}

          {state === 'valid' && invitation && (
            <div className="space-y-5">
              <div className="w-12 h-12 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center mx-auto">
                <Users size={22} className="text-[var(--color-primary)]" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
                  You&apos;re invited to join TeamTalent
                </h1>
                <p className="text-sm text-[var(--color-text-muted)] mt-2">
                  You&apos;ve been invited as a <strong>{ROLE_LABELS[invitation.role] ?? invitation.role}</strong>.
                  Sign in with your Google account to accept.
                </p>
              </div>
              <div className="bg-[var(--color-surface)] rounded-xl px-4 py-3 text-left">
                <p className="text-xs text-[var(--color-text-muted)]">Invited email</p>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">{invitation.email}</p>
              </div>
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={accepting}
                onClick={handleAcceptWithGoogle}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Accept with Google
              </Button>
            </div>
          )}

          {state === 'accepted' && (
            <div className="py-4 space-y-4">
              <CheckCircle2 size={36} className="text-emerald-500 mx-auto" />
              <div>
                <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
                  Invitation already accepted
                </h1>
                <p className="text-sm text-[var(--color-text-muted)] mt-2">
                  This invitation has already been used. You can sign in to access your account.
                </p>
              </div>
              <Button variant="primary" size="lg" className="w-full" onClick={() => window.location.href = '/login'}>
                Go to Sign In
              </Button>
            </div>
          )}

          {state === 'expired' && (
            <div className="py-4 space-y-4">
              <Clock size={36} className="text-amber-500 mx-auto" />
              <div>
                <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
                  Invitation expired
                </h1>
                <p className="text-sm text-[var(--color-text-muted)] mt-2">
                  This invitation has expired. Please ask the person who invited you to send a new one.
                </p>
              </div>
            </div>
          )}

          {state === 'not_found' && (
            <div className="py-4 space-y-4">
              <XCircle size={36} className="text-red-500 mx-auto" />
              <div>
                <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
                  Invitation not found
                </h1>
                <p className="text-sm text-[var(--color-text-muted)] mt-2">
                  This invitation link is invalid or has been cancelled.
                </p>
              </div>
            </div>
          )}

          {state === 'error' && (
            <div className="py-4 space-y-4">
              <XCircle size={36} className="text-red-500 mx-auto" />
              <div>
                <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
                  Something went wrong
                </h1>
                <p className="text-sm text-[var(--color-text-muted)] mt-2">
                  {errorMessage || 'Unable to load this invitation. Please try again later.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
