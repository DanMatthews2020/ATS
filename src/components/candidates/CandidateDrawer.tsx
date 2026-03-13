'use client';

import { X, Mail, Phone, MapPin, Calendar, Briefcase, Clock } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { CandidateProfile, CandidateStatus, BadgeVariant } from '@/types';

const STATUS_CONFIG: Record<CandidateStatus, { label: string; variant: BadgeVariant }> = {
  new: { label: 'Available', variant: 'info' },
  screening: { label: 'In Review', variant: 'default' },
  interview: { label: 'Interviewing', variant: 'warning' },
  offer: { label: 'Offer Sent', variant: 'success' },
  hired: { label: 'Hired', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'error' },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface CandidateDrawerProps {
  candidate: CandidateProfile | null;
  onClose: () => void;
}

export function CandidateDrawer({ candidate, onClose }: CandidateDrawerProps) {
  const isOpen = candidate !== null;
  const status = candidate ? STATUS_CONFIG[candidate.status] : null;
  const canMoveForward =
    candidate?.status !== 'hired' && candidate?.status !== 'rejected';

  return (
    <>
      {/* Backdrop */}
      <div
        className={[
          'fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px] transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={candidate?.name ?? 'Candidate details'}
        className={[
          'fixed right-0 top-0 h-full w-[440px] bg-white z-50 shadow-2xl flex flex-col',
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full invisible',
        ].join(' ')}
      >
        {candidate && (
          <>
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-4">
                <Avatar name={candidate.name} size="lg" />
                <div>
                  <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                    {candidate.name}
                  </h2>
                  <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{candidate.role}</p>
                  {status && (
                    <Badge variant={status.variant} className="mt-2">
                      {status.label}
                    </Badge>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors mt-0.5"
                aria-label="Close panel"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-7">
              {/* Contact */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
                  Contact
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-sm">
                    <Mail size={14} className="text-[var(--color-text-muted)] flex-shrink-0" />
                    <a
                      href={`mailto:${candidate.email}`}
                      className="text-blue-600 hover:underline"
                    >
                      {candidate.email}
                    </a>
                  </li>
                  <li className="flex items-center gap-3 text-sm text-[var(--color-text-primary)]">
                    <Phone size={14} className="text-[var(--color-text-muted)] flex-shrink-0" />
                    {candidate.phone}
                  </li>
                  <li className="flex items-center gap-3 text-sm text-[var(--color-text-primary)]">
                    <MapPin size={14} className="text-[var(--color-text-muted)] flex-shrink-0" />
                    {candidate.location}
                  </li>
                </ul>
              </section>

              {/* Application */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
                  Application
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-sm text-[var(--color-text-primary)]">
                    <Briefcase size={14} className="text-[var(--color-text-muted)] flex-shrink-0" />
                    {candidate.jobTitle}
                  </li>
                  <li className="flex items-center gap-3 text-sm text-[var(--color-text-primary)]">
                    <Calendar size={14} className="text-[var(--color-text-muted)] flex-shrink-0" />
                    Applied {formatDate(candidate.appliedAt)}
                  </li>
                  <li className="flex items-center gap-3 text-sm text-[var(--color-text-primary)]">
                    <Clock size={14} className="text-[var(--color-text-muted)] flex-shrink-0" />
                    {candidate.experience} of experience
                  </li>
                </ul>
              </section>

              {/* Skills */}
              {candidate.skills.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
                    Skills
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {candidate.skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-2.5 py-1 text-xs font-medium bg-[var(--color-surface)] text-[var(--color-text-primary)] rounded-lg border border-[var(--color-border)]"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* Education */}
              {candidate.education && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
                    Education
                  </h3>
                  <p className="text-sm text-[var(--color-text-primary)]">{candidate.education}</p>
                </section>
              )}

              {/* Notes */}
              {candidate.notes && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
                    Notes
                  </h3>
                  <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">
                    {candidate.notes}
                  </p>
                </section>
              )}
            </div>

            {/* Actions footer */}
            <div className="p-6 border-t border-[var(--color-border)] space-y-2.5">
              <Button variant="primary" size="md" className="w-full justify-center">
                Schedule Interview
              </Button>
              <div className="flex gap-2.5">
                <Button variant="secondary" size="md" className="flex-1 justify-center">
                  Send Email
                </Button>
                {canMoveForward && (
                  <Button variant="secondary" size="md" className="flex-1 justify-center">
                    Move Forward
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
