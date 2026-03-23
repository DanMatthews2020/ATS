'use client';

import { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Download,
  Search,
  Play,
  CalendarClock,
  Eye,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  Briefcase,
  Star,
  DollarSign,
  BookOpen,
  MoreHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

// ─── Types ────────────────────────────────────────────────────────────────────

type CategoryId =
  | 'all'
  | 'workforce'
  | 'talent-acquisition'
  | 'performance'
  | 'compensation'
  | 'learning';

type RunStatus = 'completed' | 'processing' | 'failed';

interface Report {
  id: string;
  name: string;
  description: string;
  category: Exclude<CategoryId, 'all'>;
  lastRun: string | null;
  popular?: boolean;
}

interface RecentRun {
  id: string;
  reportName: string;
  category: Exclude<CategoryId, 'all'>;
  runBy: string;
  date: string;
  format: 'PDF' | 'CSV' | 'Excel';
  status: RunStatus;
}

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORIES: { id: CategoryId; label: string; icon: React.ReactNode; color: string; bg: string }[] = [
  {
    id: 'all',
    label: 'All Reports',
    icon: <FileText size={14} />,
    color: 'text-[var(--color-text-primary)]',
    bg: 'bg-[var(--color-surface)]',
  },
  {
    id: 'workforce',
    label: 'Workforce & Demographics',
    icon: <Users size={14} />,
    color: 'text-indigo-700',
    bg: 'bg-indigo-600',
  },
  {
    id: 'talent-acquisition',
    label: 'Talent Acquisition',
    icon: <Briefcase size={14} />,
    color: 'text-orange-700',
    bg: 'bg-[var(--color-accent)]',
  },
  {
    id: 'performance',
    label: 'Performance & Talent',
    icon: <Star size={14} />,
    color: 'text-emerald-700',
    bg: 'bg-emerald-600',
  },
  {
    id: 'compensation',
    label: 'Compensation & Benefits',
    icon: <DollarSign size={14} />,
    color: 'text-violet-700',
    bg: 'bg-violet-600',
  },
  {
    id: 'learning',
    label: 'Learning & Development',
    icon: <BookOpen size={14} />,
    color: 'text-amber-700',
    bg: 'bg-amber-500',
  },
];

// category metadata lookup (excludes 'all')
const CAT_META = Object.fromEntries(CATEGORIES.slice(1).map((c) => [c.id, c])) as Record<
  Exclude<CategoryId, 'all'>,
  (typeof CATEGORIES)[number]
>;

// ─── Report library ───────────────────────────────────────────────────────────

const REPORT_LIBRARY: Report[] = [
  // ── Workforce & Demographics
  {
    id: 'wf1',
    name: 'Headcount Summary',
    description: 'Total headcount by department, location, and employment type with month-over-month trend.',
    category: 'workforce',
    lastRun: 'Mar 20, 2026',
    popular: true,
  },
  {
    id: 'wf2',
    name: 'Turnover & Retention',
    description: 'Monthly attrition rates with voluntary vs involuntary breakdown and rolling 12-month view.',
    category: 'workforce',
    lastRun: 'Mar 15, 2026',
    popular: true,
  },
  {
    id: 'wf3',
    name: 'Workforce Demographics',
    description: 'Age, tenure, gender, ethnicity, and diversity metrics across all departments.',
    category: 'workforce',
    lastRun: 'Feb 28, 2026',
  },
  {
    id: 'wf4',
    name: 'Department Overview',
    description: 'Per-department headcount, open roles, avg tenure, and org structure snapshot.',
    category: 'workforce',
    lastRun: null,
  },

  // ── Talent Acquisition
  {
    id: 'ta1',
    name: 'Hiring Funnel',
    description: 'Stage-by-stage conversion rates across all open roles with drop-off analysis.',
    category: 'talent-acquisition',
    lastRun: 'Mar 18, 2026',
    popular: true,
  },
  {
    id: 'ta2',
    name: 'Source of Hire',
    description: 'Which sourcing channels — LinkedIn, referrals, AI Agent, job boards — are producing hires.',
    category: 'talent-acquisition',
    lastRun: 'Mar 10, 2026',
  },
  {
    id: 'ta3',
    name: 'Time to Hire & Fill',
    description: 'Average hiring velocity by role type and department with benchmark comparisons.',
    category: 'talent-acquisition',
    lastRun: 'Mar 1, 2026',
    popular: true,
  },
  {
    id: 'ta4',
    name: 'Job Posting Performance',
    description: 'Views, applications, and conversion rates per job posting over a selected period.',
    category: 'talent-acquisition',
    lastRun: null,
  },

  // ── Performance & Talent
  {
    id: 'pf1',
    name: 'Performance Rating Distribution',
    description: 'Breakdown of employee ratings across the 1–5 scale by department and cycle.',
    category: 'performance',
    lastRun: 'Mar 12, 2026',
    popular: true,
  },
  {
    id: 'pf2',
    name: 'Goal Completion Rate',
    description: '% of goals completed on time per department, with on-track vs at-risk breakdown.',
    category: 'performance',
    lastRun: 'Mar 5, 2026',
  },
  {
    id: 'pf3',
    name: 'High Performer Analysis',
    description: 'Identifies top performers, flight risk signals, and promotion-ready employees.',
    category: 'performance',
    lastRun: 'Feb 20, 2026',
  },
  {
    id: 'pf4',
    name: '9-Box Talent Grid',
    description: 'Performance vs potential matrix to support succession planning and talent reviews.',
    category: 'performance',
    lastRun: null,
  },

  // ── Compensation & Benefits
  {
    id: 'cb1',
    name: 'Salary Bands & Benchmarking',
    description: 'Pay ranges vs external market median by role, level, and location.',
    category: 'compensation',
    lastRun: 'Mar 8, 2026',
    popular: true,
  },
  {
    id: 'cb2',
    name: 'Benefits Enrollment Summary',
    description: 'Enrollment rates by benefit type (health, dental, 401k, equity) across the workforce.',
    category: 'compensation',
    lastRun: 'Jan 31, 2026',
  },
  {
    id: 'cb3',
    name: 'Compensation Equity Analysis',
    description: 'Pay equity report segmented by gender, ethnicity, and department to surface disparities.',
    category: 'compensation',
    lastRun: 'Feb 14, 2026',
  },
  {
    id: 'cb4',
    name: 'Total Compensation Overview',
    description: 'Base salary, bonus, equity grants, and benefits breakdown by employee or department.',
    category: 'compensation',
    lastRun: null,
  },

  // ── Learning & Development
  {
    id: 'ld1',
    name: 'Training Completion Rate',
    description: '% of assigned training modules completed by team, department, and individual.',
    category: 'learning',
    lastRun: 'Mar 14, 2026',
  },
  {
    id: 'ld2',
    name: 'Skills Gap Analysis',
    description: 'Required vs current skills by department, highlighting gaps to inform L&D investment.',
    category: 'learning',
    lastRun: 'Feb 25, 2026',
    popular: true,
  },
  {
    id: 'ld3',
    name: 'Certification Tracker',
    description: 'Certifications due, expired, and completed across teams — with renewal alerts.',
    category: 'learning',
    lastRun: 'Mar 7, 2026',
  },
  {
    id: 'ld4',
    name: 'Learning Path Progress',
    description: 'Individual progress through assigned learning tracks and time-to-completion estimates.',
    category: 'learning',
    lastRun: null,
  },
];

// ─── Recent runs ──────────────────────────────────────────────────────────────

const RECENT_RUNS: RecentRun[] = [
  {
    id: 'rr1',
    reportName: 'Headcount Summary',
    category: 'workforce',
    runBy: 'John Doe',
    date: 'Mar 20, 2026 — 09:14',
    format: 'PDF',
    status: 'completed',
  },
  {
    id: 'rr2',
    reportName: 'Hiring Funnel',
    category: 'talent-acquisition',
    runBy: 'Sarah Johnson',
    date: 'Mar 18, 2026 — 14:32',
    format: 'CSV',
    status: 'completed',
  },
  {
    id: 'rr3',
    reportName: 'Skills Gap Analysis',
    category: 'learning',
    runBy: 'Priya Patel',
    date: 'Mar 17, 2026 — 11:05',
    format: 'Excel',
    status: 'completed',
  },
  {
    id: 'rr4',
    reportName: 'Salary Bands & Benchmarking',
    category: 'compensation',
    runBy: 'John Doe',
    date: 'Mar 16, 2026 — 16:48',
    format: 'PDF',
    status: 'processing',
  },
  {
    id: 'rr5',
    reportName: 'Compensation Equity Analysis',
    category: 'compensation',
    runBy: 'Marcus Chen',
    date: 'Mar 14, 2026 — 10:22',
    format: 'CSV',
    status: 'failed',
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [activeCategory, setActiveCategory] = useState<CategoryId>('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return REPORT_LIBRARY.filter((r) => {
      const matchesCat = activeCategory === 'all' || r.category === activeCategory;
      const matchesQ =
        !q || r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q);
      return matchesCat && matchesQ;
    });
  }, [activeCategory, query]);

  // Group filtered results by category for the "all" view
  const grouped = useMemo(() => {
    if (activeCategory !== 'all') return null;
    const groups: Partial<Record<Exclude<CategoryId, 'all'>, Report[]>> = {};
    for (const r of filtered) {
      if (!groups[r.category]) groups[r.category] = [];
      groups[r.category]!.push(r);
    }
    return groups;
  }, [filtered, activeCategory]);

  return (
    <div className="p-8 flex-1">

      {/* ── Page header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 bg-[var(--color-primary)] rounded-xl flex items-center justify-center flex-shrink-0">
            <FileText size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] leading-tight">
              Reports
            </h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
              Pre-built and custom reports across every area of your organisation
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="md">
            <CalendarClock size={14} />
            Scheduled Reports
          </Button>
          <Button variant="primary" size="md">
            <Plus size={14} />
            Create Custom Report
          </Button>
        </div>
      </div>

      {/* ── Search bar ──────────────────────────────────────────────────── */}
      <div className="relative mb-5 max-w-md">
        <Search
          size={14}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search reports..."
          className="w-full h-10 pl-9 pr-4 text-sm rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent shadow-sm transition-shadow"
        />
      </div>

      {/* ── Category filter pills ────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-8">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={[
              'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border transition-all duration-100 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30',
              activeCategory === cat.id
                ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                : 'bg-white text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-neutral-300 hover:text-[var(--color-text-primary)]',
            ].join(' ')}
          >
            {cat.icon}
            {cat.label}
          </button>
        ))}
      </div>

      {/* ── Report library ───────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileText size={24} className="text-[var(--color-text-muted)] mb-3" />
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">No reports found</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Try adjusting your search or category filter
          </p>
        </div>
      ) : activeCategory === 'all' && grouped ? (
        // All categories — render section per category
        <div className="space-y-8 mb-8">
          {(Object.keys(grouped) as Exclude<CategoryId, 'all'>[]).map((catId) => {
            const meta = CAT_META[catId];
            return (
              <section key={catId}>
                <div className="flex items-center gap-2.5 mb-3">
                  <div
                    className={`w-7 h-7 ${meta.bg} rounded-lg flex items-center justify-center flex-shrink-0`}
                  >
                    <span className="text-white [&>svg]:w-3.5 [&>svg]:h-3.5">{meta.icon}</span>
                  </div>
                  <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {meta.label}
                  </h2>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    ({grouped[catId]!.length})
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                  {grouped[catId]!.map((report) => (
                    <ReportCard key={report.id} report={report} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        // Single category — flat grid
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-8">
          {filtered.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      )}

      {/* ── Recent runs table ────────────────────────────────────────────── */}
      <div className="bg-white border border-[var(--color-border)] rounded-2xl shadow-card overflow-hidden">
        <div className="flex items-start justify-between gap-4 p-5 border-b border-[var(--color-border)]">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Recent Runs</h2>
            <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
              Previously generated reports — download or re-run at any time
            </p>
          </div>
          <Button variant="secondary" size="sm">
            <Download size={13} />
            Export All
          </Button>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
              {['Report', 'Category', 'Run By', 'Date', 'Format', 'Status', 'Actions'].map(
                (col) => (
                  <th
                    key={col}
                    className="px-5 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide whitespace-nowrap"
                  >
                    {col}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {RECENT_RUNS.map((run) => {
              const meta = CAT_META[run.category];
              return (
                <tr key={run.id} className="hover:bg-[var(--color-surface)] transition-colors">
                  {/* Report name */}
                  <td className="px-5 py-4">
                    <p className="font-medium text-[var(--color-text-primary)]">{run.reportName}</p>
                  </td>

                  {/* Category */}
                  <td className="px-5 py-4">
                    <span
                      className={[
                        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap',
                        meta.color,
                        meta.bg.replace('bg-', 'bg-opacity-10 bg-').replace(/bg-\[.*?\]/, 'bg-orange-50'),
                      ].join(' ')}
                      style={{ backgroundColor: getCategoryBg(run.category) }}
                    >
                      {meta.icon}
                      {meta.label.split(' ')[0]}
                    </span>
                  </td>

                  {/* Run by */}
                  <td className="px-5 py-4 text-[var(--color-text-muted)]">{run.runBy}</td>

                  {/* Date */}
                  <td className="px-5 py-4">
                    <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] whitespace-nowrap">
                      <Clock size={11} />
                      {run.date}
                    </span>
                  </td>

                  {/* Format */}
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold bg-[var(--color-surface)] text-[var(--color-text-muted)]">
                      {run.format}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4">
                    <RunStatusBadge status={run.status} />
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      {run.status === 'completed' && (
                        <Button variant="secondary" size="sm">
                          <Download size={12} />
                          Download
                        </Button>
                      )}
                      {run.status !== 'processing' && (
                        <Button variant="ghost" size="sm">
                          <Play size={12} />
                          Re-run
                        </Button>
                      )}
                      <button
                        className="h-8 w-8 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)] transition-colors"
                        aria-label="More options"
                      >
                        <MoreHorizontal size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── ReportCard ───────────────────────────────────────────────────────────────

function ReportCard({ report }: { report: Report }) {
  const meta = CAT_META[report.category];
  return (
    <div className="group flex flex-col bg-white border border-[var(--color-border)] rounded-2xl shadow-card hover:shadow-card-hover hover:border-neutral-300 transition-all duration-150 overflow-hidden">
      {/* Coloured top stripe */}
      <div className={`${meta.bg} h-1.5 w-full`} />

      <div className="flex flex-col flex-1 p-4">
        {/* Name + popular badge */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <p className="text-sm font-semibold text-[var(--color-text-primary)] leading-snug">
            {report.name}
          </p>
          {report.popular && (
            <span className="flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 whitespace-nowrap">
              Popular
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed flex-1 mb-3">
          {report.description}
        </p>

        {/* Last run */}
        <p className="text-[11px] text-[var(--color-text-muted)] mb-3 flex items-center gap-1">
          <Clock size={10} />
          {report.lastRun ? `Last run ${report.lastRun}` : 'Never run'}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <Button variant="primary" size="sm" className="flex-1 justify-center">
            <Play size={11} />
            Run
          </Button>
          <button
            className="h-8 px-2.5 flex items-center justify-center rounded-lg border border-[var(--color-border)] bg-white text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)] transition-colors"
            aria-label="Schedule report"
            title="Schedule"
          >
            <CalendarClock size={13} />
          </button>
          <button
            className="h-8 px-2.5 flex items-center justify-center rounded-lg border border-[var(--color-border)] bg-white text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)] transition-colors"
            aria-label="Preview report"
            title="Preview"
          >
            <Eye size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── RunStatusBadge ───────────────────────────────────────────────────────────

function RunStatusBadge({ status }: { status: RunStatus }) {
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
        <CheckCircle2 size={11} />
        Completed
      </span>
    );
  }
  if (status === 'processing') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
        <Loader2 size={11} className="animate-spin" />
        Processing
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600">
      <AlertCircle size={11} />
      Failed
    </span>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCategoryBg(cat: Exclude<CategoryId, 'all'>): string {
  const map: Record<Exclude<CategoryId, 'all'>, string> = {
    workforce: '#EEF2FF',
    'talent-acquisition': '#FFF7ED',
    performance: '#F0FDF4',
    compensation: '#F5F3FF',
    learning: '#FFFBEB',
  };
  return map[cat];
}
