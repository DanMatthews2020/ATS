'use client';

// Archive page — shows all rejected candidates for a given job.
// Path: /archive?jobId=<id>&jobTitle=<title>
// Accessed via the Archive button on the pipeline page, scoped to the selected job.
// TODO: add pagination if archive grows beyond ~100 records

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArchiveX } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { jobsApi } from '@/lib/api';
import type { ArchivedCandidate } from '@/types';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

const STAGE_LABELS: Record<string, string> = {
  APPLIED: 'Applied',
  SCREENING: 'Screening',
  INTERVIEW: 'Interview',
  OFFER: 'Offer',
  HIRED: 'Hired',
};

export default function ArchivePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = searchParams.get('jobId') ?? '';
  const jobTitle = searchParams.get('jobTitle') ?? '';

  const [candidates, setCandidates] = useState<ArchivedCandidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jobId) { setLoading(false); return; }
    jobsApi.getArchivedApplications(jobId)
      .then((res) => setCandidates(res.archivedCandidates))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [jobId]);

  const profileUrl = (c: ArchivedCandidate) =>
    `/candidates/${c.candidateId}?fromJob=${jobId}&fromJobTitle=${encodeURIComponent(jobTitle)}`;

  return (
    <div className="px-8 py-6 max-w-6xl mx-auto">
      {/* Back + header */}
      <button
        onClick={() => router.push('/pipeline')}
        className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        Back to Pipeline
      </button>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Archived Candidates</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          {jobTitle ? `${jobTitle} · ` : ''}
          {loading ? 'Loading…' : candidates.length === 0 ? 'No rejected candidates' : `${candidates.length} rejected`}
        </p>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <table className="w-full">
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                <td colSpan={4} className="px-5 py-3">
                  <div className="animate-pulse h-10 bg-gray-100 rounded" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Empty state */}
      {!loading && candidates.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ArchiveX size={40} className="text-[var(--color-text-muted)] mb-3" />
          <p className="text-sm font-medium text-[var(--color-text-primary)]">No rejected candidates</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Candidates rejected for this role will appear here.
          </p>
        </div>
      )}

      {/* Table */}
      {!loading && candidates.length > 0 && (
        <div className="border border-[var(--color-border)] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left text-xs font-medium text-[var(--color-text-muted)] px-5 py-3">Candidate</th>
                <th className="text-left text-xs font-medium text-[var(--color-text-muted)] px-5 py-3">Stage Rejected At</th>
                <th className="text-left text-xs font-medium text-[var(--color-text-muted)] px-5 py-3">Rejection Reason</th>
                <th className="text-left text-xs font-medium text-[var(--color-text-muted)] px-5 py-3">Rejected Date</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
                <tr
                  key={c.applicationId}
                  onClick={() => router.push(profileUrl(c))}
                  onKeyDown={(e) => { if (e.key === 'Enter') router.push(profileUrl(c)); }}
                  tabIndex={0}
                  className="hover:bg-[var(--color-surface)] transition-colors border-b border-[var(--color-border)] last:border-b-0 cursor-pointer"
                >
                  <td className="px-5 py-3">
                    <span className="text-sm font-medium text-[var(--color-primary)] hover:underline">
                      {c.candidateName}
                    </span>
                    {c.currentCompany && (
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{c.currentCompany}</p>
                    )}
                  </td>
                  <td className="px-5 py-3 text-sm text-[var(--color-text-primary)]">
                    {c.stageAtRejection ? (
                      <Badge variant="default">{STAGE_LABELS[c.stageAtRejection] ?? c.stageAtRejection}</Badge>
                    ) : (
                      <span className="text-[var(--color-text-muted)]">&mdash;</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-sm text-[var(--color-text-primary)]">
                    <span>{c.rejectionReason}</span>
                    {c.rejectionNote && (
                      <p className="text-xs text-[var(--color-text-muted)] italic mt-0.5">
                        {c.rejectionNote.length > 60 ? `${c.rejectionNote.slice(0, 60)}…` : c.rejectionNote}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3 text-sm text-[var(--color-text-muted)] whitespace-nowrap">
                    {fmtDate(c.rejectedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
