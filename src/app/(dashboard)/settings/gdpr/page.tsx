'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Shield, FileText, Clock, BookOpen, Loader2, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { rightsRequestsApi, retentionApi, ropaApi } from '@/lib/api';
import type { BadgeVariant } from '@/types';

export default function GdprHubPage() {
  const { user, isLoading: authLoading } = useAuth();

  const [counts, setCounts] = useState({ openRequests: 0, expiredCandidates: 0, overdueRopa: 0, loaded: false });

  useEffect(() => {
    if (authLoading) return;
    if (user?.role !== 'ADMIN' && user?.role !== 'HR') return;

    Promise.all([
      rightsRequestsApi.fetchAll({ status: 'OPEN', limit: 1 }),
      retentionApi.fetchCandidates(),
      ropaApi.fetchEntries(),
    ]).then(([reqData, retData, ropaData]) => {
      setCounts({
        openRequests: reqData.total,
        expiredCandidates: retData.items.filter((c) => c.retentionStatus === 'EXPIRED').length,
        overdueRopa: ropaData.entries.filter((e) =>
          !e.lastReviewedAt || Date.now() - new Date(e.lastReviewedAt).getTime() > 365 * 24 * 60 * 60 * 1000,
        ).length,
        loaded: true,
      });
    }).catch(() => setCounts((s) => ({ ...s, loaded: true })));
  }, [authLoading, user?.role]);

  // Auth gate
  if (authLoading) {
    return <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-[var(--color-text-muted)]" /></div>;
  }
  if (user?.role !== 'ADMIN' && user?.role !== 'HR') {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Shield size={48} className="text-[var(--color-text-muted)]" />
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Access Denied</h2>
        <p className="text-sm text-[var(--color-text-muted)]">Only Admin and HR users can view the compliance hub.</p>
      </div>
    );
  }

  function countBadge(count: number, loaded: boolean, opts: { zeroVariant?: BadgeVariant; zeroLabel?: string; label?: string } = {}) {
    if (!loaded) return <Badge variant="default">...</Badge>;
    if (count > 0) return <Badge variant="error">{count} {opts.label ?? 'open'}</Badge>;
    return <Badge variant={opts.zeroVariant ?? 'success'}>{opts.zeroLabel ?? 'All clear'}</Badge>;
  }

  const CARDS: { icon: React.ElementType; title: string; badge: React.ReactNode; description: string; href: string; buttonLabel: string }[] = [
    {
      icon: FileText,
      title: 'Rights Requests',
      badge: countBadge(counts.openRequests, counts.loaded),
      description: 'Subject access, erasure, and portability requests with 30-day SLA tracking.',
      href: '/settings/gdpr/rights-requests',
      buttonLabel: 'Manage',
    },
    {
      icon: Shield,
      title: 'Audit Log',
      badge: <span className="text-xs text-gray-500">Append-only log</span>,
      description: 'Immutable record of all data access and modification events.',
      href: '/settings/gdpr/audit-log',
      buttonLabel: 'View Log',
    },
    {
      icon: Clock,
      title: 'Data Retention',
      badge: countBadge(counts.expiredCandidates, counts.loaded, { label: 'overdue' }),
      description: 'Candidate data retention policies, expiry tracking, and anonymisation.',
      href: '/settings/gdpr/retention',
      buttonLabel: 'Review',
    },
    {
      icon: BookOpen,
      title: 'Processing Register',
      badge: countBadge(counts.overdueRopa, counts.loaded, { label: 'review overdue', zeroVariant: 'success' }),
      description: 'Article 30 register of all processing activities.',
      href: '/settings/gdpr/ropa',
      buttonLabel: 'View Register',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Compliance &amp; GDPR</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">Manage candidate data obligations under GDPR.</p>
        <a
          href="/privacy-policy"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--color-primary)] hover:underline mt-2"
        >
          <ExternalLink size={13} /> View public privacy policy
        </a>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {CARDS.map((card) => (
          <Card key={card.title} padding="md">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <card.icon size={18} className="text-[var(--color-text-muted)]" />
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{card.title}</h3>
              </div>
              {card.badge}
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mb-4">{card.description}</p>
            <Link href={card.href}>
              <Button variant="secondary" size="sm">{card.buttonLabel}</Button>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
