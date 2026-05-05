'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Briefcase, Calendar, ClipboardList, Activity,
  Loader2, AlertCircle, RefreshCw, Users, Clock, ExternalLink,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  managerDashboardApi,
  type ManagerDashboardDto,
  ApiError,
} from '@/lib/api';

// ── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  return (
    <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-card p-5 space-y-1">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className="text-[var(--color-text-muted)]" />
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">{label}</p>
      </div>
      <p className="text-2xl font-bold text-[var(--color-primary)] tabular-nums">{value}</p>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDateTime(s: string) {
  return new Date(s).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function fmtRelative(s: string) {
  const diff = Date.now() - new Date(s).getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const STATUS_VARIANT: Record<string, 'success' | 'default' | 'error' | 'warning'> = {
  OPEN: 'success', DRAFT: 'default', CLOSED: 'error', ON_HOLD: 'warning',
};

const TYPE_LABEL: Record<string, string> = {
  PHONE: 'Phone', VIDEO: 'Video', ON_SITE: 'On-Site', TECHNICAL: 'Technical',
};

// ── Main component ───────────────────────────────────────────────────────────

export default function ManagerDashboard() {
  const [data, setData] = useState<ManagerDashboardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    managerDashboardApi.get()
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center gap-3 px-4 py-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
        <AlertCircle size={15} className="flex-shrink-0" />
        <span className="flex-1">{error ?? 'Unknown error'}</span>
        <button onClick={load} className="inline-flex items-center gap-1.5 text-xs font-medium hover:underline">
          <RefreshCw size={12} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats */}
      <section aria-label="Manager stats">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="My Jobs" value={data.stats.totalJobs} icon={Briefcase} />
          <StatCard label="Total Candidates" value={data.stats.totalCandidates} icon={Users} />
          <StatCard label="Pending Feedback" value={data.stats.pendingFeedbackCount} icon={ClipboardList} />
          <StatCard label="Upcoming Interviews" value={data.stats.upcomingInterviewCount} icon={Calendar} />
        </div>
      </section>

      {/* My Jobs */}
      <section aria-labelledby="manager-jobs-heading">
        <div className="flex items-center justify-between mb-4">
          <h2 id="manager-jobs-heading" className="text-base font-semibold text-[var(--color-primary)]">My Jobs</h2>
          <Link href="/jobs" className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors">
            View all &rarr;
          </Link>
        </div>
        {data.myJobs.length === 0 ? (
          <Card padding="lg">
            <p className="text-sm text-[var(--color-text-muted)] text-center py-6">No jobs assigned to you yet.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {data.myJobs.map((job) => (
              <Link key={job.id} href={`/jobs/${job.id}`}>
                <Card padding="lg" className="hover:border-[var(--color-primary)]/30 transition-colors cursor-pointer">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-[var(--color-text-primary)] truncate">{job.title}</h3>
                    <Badge variant={STATUS_VARIANT[job.status] ?? 'default'}>{job.status}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
                    {job.department && <span>{job.department}</span>}
                    {job.location && <span>{job.location}</span>}
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] mt-2">
                    <Users size={11} className="inline mr-1" />{job.applicantCount} applicant{job.applicantCount !== 1 ? 's' : ''}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Pending Feedback */}
      {data.pendingFeedback.length > 0 && (
        <section aria-labelledby="pending-feedback-heading">
          <h2 id="pending-feedback-heading" className="text-base font-semibold text-[var(--color-primary)] mb-4">Pending Feedback</h2>
          <Card padding="lg">
            <div className="divide-y divide-[var(--color-border)]">
              {data.pendingFeedback.map((fb) => (
                <div key={fb.interviewId} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{fb.candidateName}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {fb.jobTitle} &middot; {TYPE_LABEL[fb.type] ?? fb.type} &middot; {fmtDateTime(fb.scheduledAt)}
                    </p>
                  </div>
                  <Badge variant="warning">Pending</Badge>
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}

      {/* Upcoming Interviews */}
      {data.upcomingInterviews.length > 0 && (
        <section aria-labelledby="upcoming-interviews-heading">
          <h2 id="upcoming-interviews-heading" className="text-base font-semibold text-[var(--color-primary)] mb-4">Upcoming Interviews</h2>
          <Card padding="lg">
            <div className="divide-y divide-[var(--color-border)]">
              {data.upcomingInterviews.map((iv) => (
                <div key={iv.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{iv.candidateName}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {iv.jobTitle} &middot; {TYPE_LABEL[iv.type] ?? iv.type} &middot; {iv.duration}min
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-1 mt-0.5">
                      <Clock size={10} /> {fmtDateTime(iv.scheduledAt)}
                    </p>
                  </div>
                  {iv.meetingLink && (
                    <a href={iv.meetingLink} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1"
                    >
                      <ExternalLink size={10} /> Join
                    </a>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}

      {/* Recent Activity */}
      {data.recentActivity.length > 0 && (
        <section aria-labelledby="recent-activity-heading">
          <h2 id="recent-activity-heading" className="text-base font-semibold text-[var(--color-primary)] mb-4">Recent Activity</h2>
          <Card padding="lg">
            <div className="space-y-3">
              {data.recentActivity.map((event) => (
                <div key={event.id} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Activity size={10} className="text-[var(--color-text-muted)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--color-text-primary)]">{event.description}</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{fmtRelative(event.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}
    </div>
  );
}
