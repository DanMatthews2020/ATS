'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Users, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LOGIN_FEATURES } from '@/lib/constants';
import { authApi } from '@/lib/api';

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google_auth_denied: 'Google sign-in was cancelled.',
  google_auth_failed: 'Google sign-in failed. Please try again.',
  DOMAIN_NOT_ALLOWED: 'Only @ordios.com accounts are permitted.',
  google_auth_missing_code: 'Google sign-in failed. Please try again.',
};

export default function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleAvailable, setGoogleAvailable] = useState(false);

  // Check for Google SSO error in URL params
  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      setFormError(GOOGLE_ERROR_MESSAGES[error] ?? 'Sign-in failed. Please try again.');
    }
  }, [searchParams]);

  // Check if Google SSO is configured
  useEffect(() => {
    authApi.getGoogleStatus().then(({ configured }) => setGoogleAvailable(configured)).catch(() => {});
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError('');

    if (!email.trim() || !password) {
      setFormError('Please enter your email address and password.');
      return;
    }

    try {
      await login(email.trim(), password);
      router.push('/dashboard');
    } catch {
      setFormError('Something went wrong. Please try again.');
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel ──────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[54%] bg-[var(--color-primary)] flex-col justify-between p-10 relative overflow-hidden">

        {/* Background geometry */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          {/* Subtle grid */}
          <div
            className="absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
              backgroundSize: '44px 44px',
            }}
          />
          {/* Glow blobs */}
          <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-[var(--color-accent)]/[0.08] blur-3xl" />
          <div className="absolute top-1/2 -right-32 w-72 h-72 rounded-full bg-[var(--color-accent)]/[0.06] blur-2xl" />
          <div className="absolute -bottom-24 left-1/3 w-80 h-80 rounded-full bg-white/[0.03] blur-2xl" />

          {/* Decorative ring */}
          <div className="absolute bottom-20 right-12 w-48 h-48 rounded-full border border-white/[0.06]" />
          <div className="absolute bottom-8 right-0 w-72 h-72 rounded-full border border-white/[0.04]" />
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[var(--color-accent)]">
            <Users size={18} strokeWidth={2} className="text-white" aria-hidden="true" />
          </div>
          <span
            className="text-white text-lg font-semibold tracking-tight"
            style={{ fontFamily: 'var(--font-dm-serif)' }}
          >
            TeamTalent
          </span>
        </div>

        {/* Hero content */}
        <div className="relative space-y-8 max-w-sm">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/20">
              <Sparkles size={11} className="text-[var(--color-accent)]" aria-hidden="true" />
              <span className="text-xs font-medium text-[var(--color-accent)]">
                AI-Powered Recruiting
              </span>
            </div>

            <h1
              className="text-[2.6rem] leading-[1.15] font-normal text-white"
              style={{ fontFamily: 'var(--font-dm-serif)' }}
            >
              Hire smarter,{' '}
              <span className="text-[var(--color-accent)]">build better</span>{' '}
              teams.
            </h1>

            <p className="text-neutral-400 text-sm leading-relaxed">
              The all-in-one platform for modern talent teams. From sourcing
              to onboarding — all in one place.
            </p>
          </div>

          <ul className="space-y-3.5" aria-label="Platform features">
            {LOGIN_FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-3">
                <CheckCircle2
                  size={15}
                  className="text-[var(--color-accent)] flex-shrink-0"
                  aria-hidden="true"
                />
                <span className="text-sm text-neutral-300">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="relative">
          <p className="text-neutral-600 text-xs">
            © 2024 TeamTalent, Inc. All rights reserved.
          </p>
        </div>
      </div>

      {/* ── Right panel ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[var(--color-surface)]">
        <div className="w-full max-w-[340px] space-y-8">

          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-[var(--color-primary)]">
              <Users size={15} strokeWidth={2} className="text-white" aria-hidden="true" />
            </div>
            <span className="font-semibold text-[var(--color-primary)]">
              TeamTalent
            </span>
          </div>

          {/* Heading */}
          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold text-[var(--color-primary)] tracking-tight">
              Welcome back
            </h2>
            <p className="text-sm text-[var(--color-text-muted)]">
              Sign in to your account to continue.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <Input
              label="Email address"
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <div className="space-y-1">
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors duration-100 outline-none focus-visible:underline"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            {formError ? (
              <p
                role="alert"
                className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3"
              >
                {formError}
              </p>
            ) : null}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full mt-2"
            >
              Sign in
              {!isLoading ? (
                <ArrowRight size={15} aria-hidden="true" />
              ) : null}
            </Button>
          </form>

          {/* Google SSO divider + button */}
          {googleAvailable && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-[var(--color-border)]" />
                <span className="text-xs text-[var(--color-text-muted)]">or</span>
                <div className="flex-1 h-px bg-[var(--color-border)]" />
              </div>

              <button
                type="button"
                disabled={googleLoading}
                onClick={async () => {
                  setGoogleLoading(true);
                  setFormError('');
                  try {
                    const { url } = await authApi.getGoogleUrl();
                    window.location.href = url;
                  } catch {
                    setFormError('Failed to start Google sign-in.');
                    setGoogleLoading(false);
                  }
                }}
                className="w-full flex items-center justify-center gap-2.5 h-11 px-4 text-sm font-medium rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors duration-100 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/20 disabled:opacity-60"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {googleLoading ? 'Redirecting…' : 'Sign in with Google'}
              </button>
            </div>
          )}

          <p className="text-center text-xs text-[var(--color-text-muted)]">
            Demo mode — enter any email and password to sign in.
          </p>
        </div>
      </div>
    </div>
  );
}
