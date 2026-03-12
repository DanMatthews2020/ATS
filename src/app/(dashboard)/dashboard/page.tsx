import type { Metadata } from 'next';
import { MOCK_JOBS, MOCK_CANDIDATES, DASHBOARD_STATS } from '@/lib/constants';
import { JobListingCard } from '@/components/dashboard/JobListingCard';
import { CandidateCard } from '@/components/dashboard/CandidateCard';

export const metadata: Metadata = { title: 'Dashboard' };

export default function DashboardPage() {
  const featuredJobs = MOCK_JOBS.slice(0, 3);
  const recentCandidates = MOCK_CANDIDATES.slice(0, 3);

  return (
    <div className="p-8 space-y-8 flex-1">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <header>
        <h1 className="text-2xl font-semibold text-[var(--color-primary)] tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Here&apos;s what&apos;s happening across your talent pipeline today.
        </p>
      </header>

      {/* ── Stat cards ──────────────────────────────────────────────────── */}
      <section aria-label="Key metrics">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {DASHBOARD_STATS.map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-xl border border-[var(--color-border)] shadow-card p-5 space-y-1"
            >
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
                {stat.label}
              </p>
              <p className="text-2xl font-bold text-[var(--color-primary)] tabular-nums">
                {stat.value}
              </p>
              <p
                className={`text-xs font-medium ${
                  stat.positive ? 'text-emerald-600' : 'text-red-500'
                }`}
              >
                {stat.change}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Job Listings ─────────────────────────────────────────────────── */}
      <section aria-labelledby="job-listings-heading">
        <div className="flex items-center justify-between mb-4">
          <h2
            id="job-listings-heading"
            className="text-base font-semibold text-[var(--color-primary)]"
          >
            Job Listings
          </h2>
          <a
            href="/job-postings"
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors duration-100 outline-none focus-visible:underline"
          >
            View all →
          </a>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {featuredJobs.map((job) => (
            <JobListingCard key={job.id} job={job} />
          ))}
        </div>
      </section>

      {/* ── Candidate Tracking ───────────────────────────────────────────── */}
      <section aria-labelledby="candidate-tracking-heading">
        <div className="flex items-center justify-between mb-4">
          <h2
            id="candidate-tracking-heading"
            className="text-base font-semibold text-[var(--color-primary)]"
          >
            Candidate Tracking
          </h2>
          <a
            href="/candidates"
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors duration-100 outline-none focus-visible:underline"
          >
            View all →
          </a>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {recentCandidates.map((candidate) => (
            <CandidateCard key={candidate.id} candidate={candidate} />
          ))}
        </div>
      </section>
    </div>
  );
}
