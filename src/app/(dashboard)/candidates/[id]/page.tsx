'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Mail, Phone, MapPin, Linkedin, Calendar,
  Briefcase, Award, FileText, Loader2, ExternalLink,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { candidatesApi, type CandidateDetailDto } from '@/lib/api';
import type { CandidateStatus, BadgeVariant } from '@/types';

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; variant: BadgeVariant }> = {
  new:       { label: 'Available',    variant: 'info' },
  screening: { label: 'In Review',    variant: 'default' },
  interview: { label: 'Interviewing', variant: 'warning' },
  offer:     { label: 'Offer Sent',   variant: 'success' },
  hired:     { label: 'Hired',        variant: 'success' },
  rejected:  { label: 'Rejected',     variant: 'error' },
};

const OFFER_STATUS_CONFIG: Record<string, { label: string; variant: BadgeVariant }> = {
  draft:    { label: 'Draft',    variant: 'default' },
  sent:     { label: 'Sent',     variant: 'info' },
  accepted: { label: 'Accepted', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'error' },
  expired:  { label: 'Expired',  variant: 'error' },
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatSalary(salary: string, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(salary));
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CandidateProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [candidate, setCandidate] = useState<CandidateDetailDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await candidatesApi.getCandidate(id);
        setCandidate(data.candidate);
      } catch {
        setError('Candidate not found.');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 size={28} className="animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="p-8">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-6">
          <ArrowLeft size={14} /> Back
        </Button>
        <p className="text-sm text-red-600">{error || 'Candidate not found.'}</p>
      </div>
    );
  }

  const fullName = `${candidate.firstName} ${candidate.lastName}`;
  const latestApp = candidate.applications[0];
  const latestStatus = latestApp ? STATUS_CONFIG[latestApp.status] : null;

  return (
    <div className="p-8 max-w-5xl">

      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors mb-6"
      >
        <ArrowLeft size={14} /> Back to Candidates
      </button>

      {/* Header card */}
      <Card padding="lg" className="mb-6">
        <div className="flex items-start gap-5">
          <Avatar name={fullName} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-[var(--color-text-primary)]">{fullName}</h1>
                {latestApp && (
                  <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{latestApp.jobTitle}</p>
                )}
                {latestStatus && (
                  <Badge variant={latestStatus.variant} className="mt-2">{latestStatus.label}</Badge>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <a href={`mailto:${candidate.email}`}>
                  <Button variant="secondary" size="sm">
                    <Mail size={13} /> Send Email
                  </Button>
                </a>
                {candidate.linkedInUrl && (
                  <a href={candidate.linkedInUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="secondary" size="sm">
                      <Linkedin size={13} /> LinkedIn
                    </Button>
                  </a>
                )}
              </div>
            </div>

            {/* Contact info */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 text-sm text-[var(--color-text-muted)]">
              <span className="flex items-center gap-1.5">
                <Mail size={13} />
                <a href={`mailto:${candidate.email}`} className="text-blue-600 hover:underline">{candidate.email}</a>
              </span>
              {candidate.phone && (
                <span className="flex items-center gap-1.5"><Phone size={13} />{candidate.phone}</span>
              )}
              {candidate.location && (
                <span className="flex items-center gap-1.5"><MapPin size={13} />{candidate.location}</span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar size={13} /> Added {formatDate(candidate.createdAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Skills */}
        {candidate.skills.length > 0 && (
          <div className="mt-5 pt-5 border-t border-[var(--color-border)]">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2.5">Skills</p>
            <div className="flex flex-wrap gap-2">
              {candidate.skills.map((skill) => (
                <span key={skill} className="px-2.5 py-1 text-xs font-medium bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)]">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Applications */}
      {candidate.applications.length === 0 ? (
        <Card padding="lg">
          <p className="text-sm text-[var(--color-text-muted)] text-center py-8">No applications yet.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
            Applications ({candidate.applications.length})
          </h2>
          {candidate.applications.map((app) => {
            const appStatus = STATUS_CONFIG[app.status];
            return (
              <Card key={app.id} padding="lg">
                {/* App header */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2.5 mb-1">
                      <Briefcase size={14} className="text-[var(--color-text-muted)]" />
                      <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{app.jobTitle}</h3>
                      {appStatus && <Badge variant={appStatus.variant}>{appStatus.label}</Badge>}
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] ml-[22px]">
                      {app.jobDepartment} · {app.jobLocation}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-[var(--color-text-muted)]">Applied</p>
                    <p className="text-xs font-medium text-[var(--color-text-primary)]">{formatDate(app.appliedAt)}</p>
                  </div>
                </div>

                {/* Interviews */}
                {app.interviews.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2.5">
                      Interviews
                    </p>
                    <ul className="space-y-2">
                      {app.interviews.map((interview) => (
                        <li key={interview.id} className="flex items-center justify-between text-xs bg-[var(--color-surface)] rounded-xl px-3.5 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <span className="font-medium text-[var(--color-text-primary)] capitalize">{interview.type}</span>
                            <span className="text-[var(--color-text-muted)]">·</span>
                            <span className="text-[var(--color-text-muted)]">{formatDate(interview.scheduledAt)}</span>
                            <span className="text-[var(--color-text-muted)]">·</span>
                            <span className="text-[var(--color-text-muted)]">{interview.duration}min</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {interview.rating && (
                              <span className="flex items-center gap-0.5 text-[var(--color-text-muted)]">
                                <Award size={11} /> {interview.rating}/5
                              </span>
                            )}
                            <span className="capitalize text-[var(--color-text-muted)]">{interview.status}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Offer */}
                {app.offer && (() => {
                  const offerStatus = OFFER_STATUS_CONFIG[app.offer.status] ?? { label: app.offer.status, variant: 'default' as BadgeVariant };
                  return (
                    <div className="pt-4 border-t border-[var(--color-border)]">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2.5">
                        Offer
                      </p>
                      <div className="flex items-center justify-between bg-[var(--color-surface)] rounded-xl px-3.5 py-2.5">
                        <div className="flex items-center gap-2.5 text-sm">
                          <span className="font-semibold text-[var(--color-text-primary)]">
                            {formatSalary(app.offer.salary, app.offer.currency)}
                          </span>
                          <span className="text-[var(--color-text-muted)] text-xs">{app.offer.currency}</span>
                        </div>
                        <Badge variant={offerStatus.variant}>{offerStatus.label}</Badge>
                      </div>
                    </div>
                  );
                })()}

                {/* Notes */}
                {app.notes && (
                  <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Notes</p>
                    <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">{app.notes}</p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
