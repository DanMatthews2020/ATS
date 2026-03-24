'use client';

import {
  useState, useMemo, useEffect, useCallback, useRef,
} from 'react';
import {
  FileText, Plus, Download, Search, Play, CalendarClock, Eye,
  Clock, CheckCircle2, AlertCircle, Loader2, Users, Briefcase,
  Star, DollarSign, BookOpen, MoreHorizontal, X, Check, ChevronRight,
  Pause, RotateCcw, Trash2, Edit2, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/contexts/ToastContext';
import {
  reportsApi,
  type ReportRunDto,
  type ScheduledReportDto,
  type ReportCategoryId,
  type RunStatus,
  type OutputFormat,
  type ScheduleFreq,
} from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type CategoryId = 'all' | ReportCategoryId;

interface Report {
  id: string;
  name: string;
  description: string;
  category: ReportCategoryId;
  lastRun: string | null;
  popular?: boolean;
}

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORIES: { id: CategoryId; label: string; icon: React.ReactNode; color: string; bg: string }[] = [
  { id: 'all',               label: 'All Reports',              icon: <FileText   size={14} />, color: 'text-[var(--color-text-primary)]', bg: 'bg-[var(--color-surface)]' },
  { id: 'workforce',         label: 'Workforce & Demographics', icon: <Users      size={14} />, color: 'text-indigo-700',  bg: 'bg-indigo-600'  },
  { id: 'talent-acquisition',label: 'Talent Acquisition',       icon: <Briefcase  size={14} />, color: 'text-orange-700',  bg: 'bg-orange-500'  },
  { id: 'performance',       label: 'Performance & Talent',     icon: <Star       size={14} />, color: 'text-emerald-700', bg: 'bg-emerald-600' },
  { id: 'compensation',      label: 'Compensation & Benefits',  icon: <DollarSign size={14} />, color: 'text-violet-700',  bg: 'bg-violet-600'  },
  { id: 'learning',          label: 'Learning & Development',   icon: <BookOpen   size={14} />, color: 'text-amber-700',   bg: 'bg-amber-500'   },
];

const CAT_META = Object.fromEntries(
  CATEGORIES.slice(1).map((c) => [c.id, c]),
) as Record<ReportCategoryId, (typeof CATEGORIES)[number]>;

const CAT_BG: Record<ReportCategoryId, string> = {
  workforce:          '#EEF2FF',
  'talent-acquisition': '#FFF7ED',
  performance:        '#F0FDF4',
  compensation:       '#F5F3FF',
  learning:           '#FFFBEB',
};

// ─── Metrics per category ─────────────────────────────────────────────────────

const METRICS_BY_CAT: Record<ReportCategoryId, string[]> = {
  workforce:           ['Headcount', 'Turnover Rate', 'Average Tenure', 'Gender Distribution', 'Location Split', 'Employment Type'],
  'talent-acquisition': ['Applications', 'Time to Hire', 'Time to Fill', 'Source of Hire', 'Offer Accept Rate', 'Pipeline Velocity'],
  performance:         ['Average Score', 'Rating Distribution', 'Goal Completion', 'High Performers', 'Review Completion'],
  compensation:        ['Salary Bands', 'Pay Equity', 'Benefits Enrollment', 'Total Comp', 'Bonus Distribution'],
  learning:            ['Training Completion', 'Skills Gap', 'Certifications', 'Learning Hours', 'Path Progress'],
};

const DEPARTMENTS = ['All Departments', 'Engineering', 'Product', 'Design', 'Analytics', 'HR', 'Finance', 'Sales'];
const LOCATIONS   = ['All Locations', 'Remote', 'New York', 'San Francisco', 'London', 'Austin'];
const DATE_RANGES = ['Last 30 days', 'Last 90 days', 'Last 6 months', 'Last 12 months', 'Year to Date', 'Custom'];

// ─── Report library ───────────────────────────────────────────────────────────

const REPORT_LIBRARY: Report[] = [
  { id: 'wf1', name: 'Headcount Summary',           description: 'Total headcount by department, location, and employment type with month-over-month trend.',    category: 'workforce',          lastRun: 'Mar 20, 2026', popular: true  },
  { id: 'wf2', name: 'Turnover & Retention',         description: 'Monthly attrition rates with voluntary vs involuntary breakdown and rolling 12-month view.',   category: 'workforce',          lastRun: 'Mar 15, 2026', popular: true  },
  { id: 'wf3', name: 'Workforce Demographics',       description: 'Age, tenure, gender, ethnicity, and diversity metrics across all departments.',                category: 'workforce',          lastRun: 'Feb 28, 2026'               },
  { id: 'wf4', name: 'Department Overview',          description: 'Per-department headcount, open roles, avg tenure, and org structure snapshot.',                category: 'workforce',          lastRun: null                         },
  { id: 'ta1', name: 'Hiring Funnel',                description: 'Stage-by-stage conversion rates across all open roles with drop-off analysis.',               category: 'talent-acquisition', lastRun: 'Mar 18, 2026', popular: true  },
  { id: 'ta2', name: 'Source of Hire',               description: 'Which sourcing channels — LinkedIn, referrals, AI Agent, job boards — are producing hires.',   category: 'talent-acquisition', lastRun: 'Mar 10, 2026'               },
  { id: 'ta3', name: 'Time to Hire & Fill',          description: 'Average hiring velocity by role type and department with benchmark comparisons.',              category: 'talent-acquisition', lastRun: 'Mar 1, 2026',  popular: true  },
  { id: 'ta4', name: 'Job Posting Performance',      description: 'Views, applications, and conversion rates per job posting over a selected period.',            category: 'talent-acquisition', lastRun: null                         },
  { id: 'pf1', name: 'Performance Rating Distribution', description: 'Breakdown of employee ratings across the 1–5 scale by department and cycle.',             category: 'performance',        lastRun: 'Mar 12, 2026', popular: true  },
  { id: 'pf2', name: 'Goal Completion Rate',         description: '% of goals completed on time per department, with on-track vs at-risk breakdown.',            category: 'performance',        lastRun: 'Mar 5, 2026'                },
  { id: 'pf3', name: 'High Performer Analysis',      description: 'Identifies top performers, flight risk signals, and promotion-ready employees.',              category: 'performance',        lastRun: 'Feb 20, 2026'               },
  { id: 'pf4', name: '9-Box Talent Grid',            description: 'Performance vs potential matrix to support succession planning and talent reviews.',           category: 'performance',        lastRun: null                         },
  { id: 'cb1', name: 'Salary Bands & Benchmarking',  description: 'Pay ranges vs external market median by role, level, and location.',                          category: 'compensation',       lastRun: 'Mar 8, 2026',  popular: true  },
  { id: 'cb2', name: 'Benefits Enrollment Summary',  description: 'Enrollment rates by benefit type (health, dental, 401k, equity) across the workforce.',       category: 'compensation',       lastRun: 'Jan 31, 2026'               },
  { id: 'cb3', name: 'Compensation Equity Analysis', description: 'Pay equity report segmented by gender, ethnicity, and department to surface disparities.',    category: 'compensation',       lastRun: 'Feb 14, 2026'               },
  { id: 'cb4', name: 'Total Compensation Overview',  description: 'Base salary, bonus, equity grants, and benefits breakdown by employee or department.',         category: 'compensation',       lastRun: null                         },
  { id: 'ld1', name: 'Training Completion Rate',     description: '% of assigned training modules completed by team, department, and individual.',                category: 'learning',           lastRun: 'Mar 14, 2026'               },
  { id: 'ld2', name: 'Skills Gap Analysis',          description: 'Required vs current skills by department, highlighting gaps to inform L&D investment.',        category: 'learning',           lastRun: 'Feb 25, 2026', popular: true  },
  { id: 'ld3', name: 'Certification Tracker',        description: 'Certifications due, expired, and completed across teams — with renewal alerts.',               category: 'learning',           lastRun: 'Mar 7, 2026'                },
  { id: 'ld4', name: 'Learning Path Progress',       description: 'Individual progress through assigned learning tracks and time-to-completion estimates.',       category: 'learning',           lastRun: null                         },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { showToast } = useToast();

  const [activeCategory, setActiveCategory] = useState<CategoryId>('all');
  const [query,          setQuery]          = useState('');
  const [runs,           setRuns]           = useState<ReportRunDto[]>([]);
  const [runningIds,     setRunningIds]      = useState<Set<string>>(new Set()); // reportId
  const [scheduledOpen,  setScheduledOpen]  = useState(false);
  const [createOpen,     setCreateOpen]     = useState(false);
  const [errorRun,       setErrorRun]       = useState<ReportRunDto | null>(null);
  const pollRef                              = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Open builder if ?builder=open
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('builder') === 'open') setCreateOpen(true);
    }
  }, []);

  // ── Load runs
  useEffect(() => {
    reportsApi.getRuns()
      .then(({ runs: r }) => setRuns(r))
      .catch(() => showToast('Failed to load recent runs', 'error'));
  }, [showToast]);

  // ── Poll processing runs every 3s
  useEffect(() => {
    const processing = runs.filter((r) => r.status === 'processing');
    if (processing.length === 0) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    if (pollRef.current) return; // already polling

    pollRef.current = setInterval(async () => {
      const current = runs.filter((r) => r.status === 'processing');
      if (current.length === 0) { clearInterval(pollRef.current!); pollRef.current = null; return; }

      await Promise.all(
        current.map(async (run) => {
          try {
            const { status, errorDetail } = await reportsApi.getRunStatus(run.id);
            if (status !== 'processing') {
              setRuns((prev) => prev.map((r) => r.id === run.id ? { ...r, status, errorDetail: errorDetail ?? null } : r));
              setRunningIds((prev) => { const n = new Set(prev); n.delete(run.reportId); return n; });
              if (status === 'completed') showToast(`"${run.reportName}" is ready to download`, 'success');
              if (status === 'failed')    showToast(`"${run.reportName}" failed to generate`, 'error');
            }
          } catch { /* ignore */ }
        }),
      );
    }, 3_000);

    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [runs, showToast]);

  // ── Run a report
  const handleRun = useCallback(async (report: Report) => {
    setRunningIds((prev) => new Set(prev).add(report.id));
    try {
      const { run } = await reportsApi.startRun({
        reportId:   report.id,
        reportName: report.name,
        category:   report.category,
        format:     'PDF',
      });
      setRuns((prev) => [run, ...prev]);
      showToast(`Generating "${report.name}"…`, 'info');
    } catch {
      setRunningIds((prev) => { const n = new Set(prev); n.delete(report.id); return n; });
      showToast(`Failed to start run`, 'error');
    }
  }, [showToast]);

  // ── Re-run
  const handleReRun = useCallback(async (run: ReportRunDto) => {
    const report = REPORT_LIBRARY.find((r) => r.id === run.reportId);
    if (!report) return;
    setRunningIds((prev) => new Set(prev).add(run.reportId));
    try {
      const { run: newRun } = await reportsApi.startRun({
        reportId:   run.reportId,
        reportName: run.reportName,
        category:   run.category,
        format:     run.format,
        params:     run.params,
      });
      setRuns((prev) => [newRun, ...prev]);
      showToast(`Re-generating "${run.reportName}"…`, 'info');
    } catch {
      setRunningIds((prev) => { const n = new Set(prev); n.delete(run.reportId); return n; });
      showToast('Failed to start re-run', 'error');
    }
  }, [showToast]);

  // ── Download
  async function handleDownload(run: ReportRunDto) {
    try {
      const ext = run.format === 'CSV' ? 'csv' : run.format === 'Excel' ? 'csv' : 'txt';
      await reportsApi.downloadRun(run.id, `${run.reportName.replace(/\s+/g, '-').toLowerCase()}.${ext}`);
    } catch {
      showToast('Download failed', 'error');
    }
  }

  // ── Export all
  async function handleExportAll() {
    try {
      await reportsApi.exportAll();
    } catch {
      showToast('Export failed', 'error');
    }
  }

  // ── Filtered report library
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return REPORT_LIBRARY.filter((r) => {
      const matchesCat = activeCategory === 'all' || r.category === activeCategory;
      const matchesQ   = !q || r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q);
      return matchesCat && matchesQ;
    });
  }, [activeCategory, query]);

  const grouped = useMemo(() => {
    if (activeCategory !== 'all') return null;
    const g: Partial<Record<ReportCategoryId, Report[]>> = {};
    for (const r of filtered) {
      if (!g[r.category]) g[r.category] = [];
      g[r.category]!.push(r);
    }
    return g;
  }, [filtered, activeCategory]);

  return (
    <div className="p-8 flex-1">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 bg-[var(--color-primary)] rounded-xl flex items-center justify-center flex-shrink-0">
            <FileText size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] leading-tight">Reports</h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
              Pre-built and custom reports across every area of your organisation
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="md" onClick={() => setScheduledOpen(true)}>
            <CalendarClock size={14} />
            Scheduled Reports
          </Button>
          <Button variant="primary" size="md" onClick={() => setCreateOpen(true)}>
            <Plus size={14} />
            Create Custom Report
          </Button>
        </div>
      </div>

      {/* ── Search ──────────────────────────────────────────────────────── */}
      <div className="relative mb-5 max-w-md">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search reports..."
          className="w-full h-10 pl-9 pr-4 text-sm rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent shadow-sm"
        />
      </div>

      {/* ── Category filter tabs ─────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-8">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={[
              'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border transition-all duration-100 outline-none',
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
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Try adjusting your search or filter</p>
        </div>
      ) : activeCategory === 'all' && grouped ? (
        <div className="space-y-8 mb-8">
          {(Object.keys(grouped) as ReportCategoryId[]).map((catId) => {
            const meta = CAT_META[catId];
            return (
              <section key={catId}>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className={`w-7 h-7 ${meta.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <span className="text-white [&>svg]:w-3.5 [&>svg]:h-3.5">{meta.icon}</span>
                  </div>
                  <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">{meta.label}</h2>
                  <span className="text-xs text-[var(--color-text-muted)]">({grouped[catId]!.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                  {grouped[catId]!.map((r) => (
                    <ReportCard
                      key={r.id}
                      report={r}
                      running={runningIds.has(r.id)}
                      onRun={() => handleRun(r)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-8">
          {filtered.map((r) => (
            <ReportCard
              key={r.id}
              report={r}
              running={runningIds.has(r.id)}
              onRun={() => handleRun(r)}
            />
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
          <Button variant="secondary" size="sm" onClick={handleExportAll}>
            <Download size={13} />
            Export All
          </Button>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
              {['Report', 'Category', 'Run By', 'Date', 'Format', 'Status', 'Actions'].map((col) => (
                <th key={col} className="px-5 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {runs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm text-[var(--color-text-muted)]">
                  No runs yet. Run a report above to get started.
                </td>
              </tr>
            )}
            {runs.map((run) => {
              const meta = CAT_META[run.category];
              return (
                <tr
                  key={run.id}
                  className={['hover:bg-[var(--color-surface)] transition-colors', run.status === 'failed' ? 'cursor-pointer' : ''].join(' ')}
                  onClick={run.status === 'failed' ? () => setErrorRun(run) : undefined}
                >
                  <td className="px-5 py-4">
                    <p className="font-medium text-[var(--color-text-primary)]">{run.reportName}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${meta.color}`}
                      style={{ backgroundColor: CAT_BG[run.category] }}
                    >
                      {meta.icon}
                      {meta.label.split(' ')[0]}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-[var(--color-text-muted)]">{run.runBy}</td>
                  <td className="px-5 py-4">
                    <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] whitespace-nowrap">
                      <Clock size={11} />
                      {run.date}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold bg-[var(--color-surface)] text-[var(--color-text-muted)]">
                      {run.format}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <RunStatusBadge status={run.status} />
                  </td>
                  <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      {run.status === 'completed' && (
                        <Button variant="secondary" size="sm" onClick={() => handleDownload(run)}>
                          <Download size={12} />
                          Download
                        </Button>
                      )}
                      {run.status === 'failed' && (
                        <button
                          onClick={() => setErrorRun(run)}
                          className="h-8 px-3 text-xs font-medium rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition-colors flex items-center gap-1.5"
                        >
                          <AlertTriangle size={11} />
                          Details
                        </button>
                      )}
                      {run.status !== 'processing' && (
                        <Button variant="ghost" size="sm" onClick={() => handleReRun(run)}>
                          <RotateCcw size={12} />
                          Re-run
                        </Button>
                      )}
                      {run.status === 'processing' && (
                        <span className="text-xs text-blue-600 flex items-center gap-1.5">
                          <Loader2 size={11} className="animate-spin" />
                          Generating…
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Modals & Panels ─────────────────────────────────────────────── */}
      {scheduledOpen && (
        <ScheduledPanel
          onClose={() => setScheduledOpen(false)}
          onScheduleCreated={(s) => showToast(`Schedule for "${s.reportName}" saved`, 'success')}
        />
      )}

      {createOpen && (
        <CreateReportModal
          onClose={() => setCreateOpen(false)}
          onCreated={(run) => {
            setRuns((prev) => [run, ...prev]);
            showToast(`Custom report queued — generating…`, 'info');
            setCreateOpen(false);
          }}
        />
      )}

      {errorRun && (
        <ErrorDetailModal run={errorRun} onClose={() => setErrorRun(null)} onReRun={() => { handleReRun(errorRun); setErrorRun(null); }} />
      )}
    </div>
  );
}

// ─── ReportCard ───────────────────────────────────────────────────────────────

function ReportCard({ report, running, onRun }: { report: Report; running: boolean; onRun: () => void }) {
  const meta = CAT_META[report.category];
  return (
    <div className="group flex flex-col bg-white border border-[var(--color-border)] rounded-2xl shadow-card hover:shadow-card-hover hover:border-neutral-300 transition-all duration-150 overflow-hidden">
      <div className={`${meta.bg} h-1.5 w-full`} />
      <div className="flex flex-col flex-1 p-4">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <p className="text-sm font-semibold text-[var(--color-text-primary)] leading-snug">{report.name}</p>
          {report.popular && (
            <span className="flex-shrink-0 inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 whitespace-nowrap">
              Popular
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed flex-1 mb-3">{report.description}</p>
        <p className="text-[11px] text-[var(--color-text-muted)] mb-3 flex items-center gap-1">
          <Clock size={10} />
          {report.lastRun ? `Last run ${report.lastRun}` : 'Never run'}
        </p>
        <div className="flex items-center gap-1.5">
          <Button
            variant="primary" size="sm"
            className="flex-1 justify-center"
            onClick={onRun}
            disabled={running}
          >
            {running ? (
              <><Loader2 size={11} className="animate-spin" />Generating…</>
            ) : (
              <><Play size={11} />Run</>
            )}
          </Button>
          <button className="h-8 px-2.5 flex items-center justify-center rounded-lg border border-[var(--color-border)] bg-white text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)] transition-colors" title="Schedule">
            <CalendarClock size={13} />
          </button>
          <button className="h-8 px-2.5 flex items-center justify-center rounded-lg border border-[var(--color-border)] bg-white text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)] transition-colors" title="Preview">
            <Eye size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Scheduled Panel ──────────────────────────────────────────────────────────

function ScheduledPanel({
  onClose,
  onScheduleCreated,
}: {
  onClose: () => void;
  onScheduleCreated: (s: ScheduledReportDto) => void;
}) {
  const { showToast } = useToast();
  const [scheduled,    setScheduled]    = useState<ScheduledReportDto[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [editId,       setEditId]       = useState<string | null>(null);
  const [deleteConfirm,setDeleteConfirm]= useState<string | null>(null);
  const [editFreq,     setEditFreq]     = useState<ScheduleFreq>('Monthly');
  const [editNext,     setEditNext]     = useState('');

  useEffect(() => {
    reportsApi.getScheduled()
      .then(({ scheduled: s }) => setScheduled(s))
      .catch(() => showToast('Failed to load scheduled reports', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  async function togglePause(id: string, paused: boolean) {
    try {
      const { schedule } = await reportsApi.updateSchedule(id, { paused: !paused });
      setScheduled((prev) => prev.map((s) => s.id === id ? schedule : s));
    } catch { showToast('Failed to update schedule', 'error'); }
  }

  async function saveEdit(id: string) {
    try {
      const { schedule } = await reportsApi.updateSchedule(id, { frequency: editFreq, nextRun: editNext });
      setScheduled((prev) => prev.map((s) => s.id === id ? schedule : s));
      setEditId(null);
      showToast('Schedule updated', 'success');
    } catch { showToast('Failed to update schedule', 'error'); }
  }

  async function confirmDelete(id: string) {
    try {
      await reportsApi.deleteSchedule(id);
      setScheduled((prev) => prev.filter((s) => s.id !== id));
      setDeleteConfirm(null);
      showToast('Schedule deleted', 'success');
    } catch { showToast('Failed to delete schedule', 'error'); }
  }

  const FREQS: ScheduleFreq[] = ['Daily', 'Weekly', 'Monthly', 'Quarterly'];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md z-50 bg-white border-l border-[var(--color-border)] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Scheduled Reports</h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Auto-generated on a recurring schedule</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--color-surface)] transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && <p className="text-sm text-[var(--color-text-muted)] text-center py-8">Loading…</p>}
          {!loading && scheduled.length === 0 && (
            <p className="text-sm text-[var(--color-text-muted)] text-center py-8">No scheduled reports yet.</p>
          )}
          {scheduled.map((s) => {
            const meta = CAT_META[s.category];
            const isEditing = editId === s.id;
            return (
              <div key={s.id} className={['bg-white border rounded-2xl p-4 shadow-card transition-all', s.paused ? 'opacity-60 border-[var(--color-border)]' : 'border-[var(--color-border)]'].join(' ')}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">{s.reportName}</p>
                    <span className={`inline-flex items-center gap-1 text-xs mt-0.5 ${meta.color}`}>
                      {meta.icon}
                      {meta.label.split(' ')[0]}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {s.paused ? (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500 font-medium">Paused</span>
                    ) : (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">Active</span>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div className="space-y-3 mb-3">
                    <div>
                      <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Frequency</label>
                      <div className="flex gap-1.5 flex-wrap">
                        {FREQS.map((f) => (
                          <button key={f} onClick={() => setEditFreq(f)}
                            className={['px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors', editFreq === f ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-neutral-300'].join(' ')}>
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Next Run</label>
                      <input type="date" value={editNext} onChange={(e) => setEditNext(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/10 focus:border-[var(--color-primary)]" />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="primary" size="sm" onClick={() => saveEdit(s.id)}>Save</Button>
                      <Button variant="secondary" size="sm" onClick={() => setEditId(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-[var(--color-text-muted)] space-y-1 mb-3">
                    <p><span className="font-medium">Frequency:</span> {s.frequency}</p>
                    <p><span className="font-medium">Next run:</span> {s.nextRun}</p>
                  </div>
                )}

                {!isEditing && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => togglePause(s.id, s.paused)}
                      className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-[var(--color-border)] text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] transition-colors"
                    >
                      {s.paused ? <><Play size={11} />Resume</> : <><Pause size={11} />Pause</>}
                    </button>
                    <button
                      onClick={() => { setEditId(s.id); setEditFreq(s.frequency); setEditNext(s.nextRun); }}
                      className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-[var(--color-border)] text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] transition-colors"
                    >
                      <Edit2 size={11} />Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(s.id)}
                      className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-[var(--color-border)] text-xs text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors ml-auto"
                    >
                      <Trash2 size={11} />Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl border border-[var(--color-border)] w-full max-w-sm mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={18} className="text-red-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">Delete schedule?</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">This will stop all future automated runs.</p>
              </div>
            </div>
            <div className="flex gap-2.5 justify-end">
              <Button variant="secondary" size="md" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <button onClick={() => confirmDelete(deleteConfirm)} className="h-10 px-4 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Create Report Modal (5-step wizard) ─────────────────────────────────────

function CreateReportModal({
  onClose,
  onCreated,
}: {
  onClose:   () => void;
  onCreated: (run: ReportRunDto) => void;
}) {
  const { showToast } = useToast();
  const [step, setStep] = useState(1);

  // Form state
  const [category,   setCategory]   = useState<ReportCategoryId | null>(null);
  const [metrics,    setMetrics]     = useState<string[]>([]);
  const [dateRange,  setDateRange]   = useState('Last 12 months');
  const [department, setDepartment]  = useState('All Departments');
  const [location,   setLocation]    = useState('All Locations');
  const [format,     setFormat]      = useState<OutputFormat>('PDF');
  const [name,       setName]        = useState('');
  const [scheduled,  setScheduled]   = useState(false);
  const [schedFreq,  setSchedFreq]   = useState<ScheduleFreq>('Monthly');
  const [saving,     setSaving]      = useState(false);

  const STEP_LABELS = ['Category', 'Metrics', 'Filters', 'Format', 'Name & Schedule'];
  const FORMATS: OutputFormat[] = ['PDF', 'CSV', 'Excel'];

  function toggleMetric(m: string) {
    setMetrics((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]);
  }

  function canNext(): boolean {
    if (step === 1) return category !== null;
    if (step === 2) return metrics.length > 0;
    if (step === 5) return name.trim().length > 0;
    return true;
  }

  async function handleSubmit() {
    if (!category || !name.trim()) return;
    setSaving(true);
    try {
      const { run } = await reportsApi.createCustomReport({
        name:     name.trim(),
        category,
        metrics,
        filters:  { dateRange, department, location },
        format,
        schedule: scheduled ? schedFreq : null,
      });
      onCreated(run);
    } catch {
      showToast('Failed to create report', 'error');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl border border-[var(--color-border)] w-full max-w-lg mx-4 overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Create Custom Report</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--color-surface)] transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="flex items-center gap-1.5">
            {STEP_LABELS.map((label, i) => {
              const n      = i + 1;
              const isDone = step > n;
              const isActive = step === n;
              return (
                <div key={n} className="flex items-center gap-1.5">
                  <div className={['w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0', isDone ? 'bg-emerald-500 text-white' : isActive ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-border)] text-[var(--color-text-muted)]'].join(' ')}>
                    {isDone ? <Check size={9} strokeWidth={3} /> : n}
                  </div>
                  <span className={['text-xs whitespace-nowrap', isActive ? 'font-medium text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)]'].join(' ')}>
                    {label}
                  </span>
                  {i < STEP_LABELS.length - 1 && <ChevronRight size={10} className="text-[var(--color-border)] flex-shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* Step 1: Category */}
          {step === 1 && (
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)] mb-4">Choose a report category</p>
              <div className="grid grid-cols-2 gap-3">
                {CATEGORIES.slice(1).map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => { setCategory(cat.id as ReportCategoryId); setMetrics([]); }}
                    className={['flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all', category === cat.id ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 ring-1 ring-[var(--color-primary)]/20' : 'border-[var(--color-border)] hover:border-neutral-300'].join(' ')}
                  >
                    <div className={`w-8 h-8 ${cat.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <span className="text-white [&>svg]:w-4 [&>svg]:h-4">{cat.icon}</span>
                    </div>
                    <p className="text-xs font-medium text-[var(--color-text-primary)] mt-0.5 leading-snug">{cat.label}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Metrics */}
          {step === 2 && category && (
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">Select metrics to include</p>
              <p className="text-xs text-[var(--color-text-muted)] mb-4">{metrics.length} selected</p>
              <div className="space-y-2">
                {METRICS_BY_CAT[category].map((m) => {
                  const selected = metrics.includes(m);
                  return (
                    <label key={m} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border)] hover:border-neutral-300 cursor-pointer transition-all">
                      <div className={['w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors', selected ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : 'border-[var(--color-border)]'].join(' ')}>
                        {selected && <Check size={9} className="text-white" strokeWidth={3} />}
                      </div>
                      <input type="checkbox" className="hidden" checked={selected} onChange={() => toggleMetric(m)} />
                      <span className="text-sm text-[var(--color-text-primary)]">{m}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Filters */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Set report filters</p>
              {[
                { label: 'Date range',  value: dateRange,  set: setDateRange,  opts: DATE_RANGES  },
                { label: 'Department',  value: department, set: setDepartment, opts: DEPARTMENTS  },
                { label: 'Location',    value: location,   set: setLocation,   opts: LOCATIONS    },
              ].map(({ label, value, set, opts }) => (
                <div key={label}>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">{label}</label>
                  <select
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl border border-[var(--color-border)] bg-white text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/10 focus:border-[var(--color-primary)] appearance-none cursor-pointer"
                  >
                    {opts.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}

          {/* Step 4: Format */}
          {step === 4 && (
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)] mb-4">Choose output format</p>
              <div className="grid grid-cols-3 gap-3">
                {FORMATS.map((f) => {
                  const icons: Record<OutputFormat, string> = { PDF: '📄', CSV: '📊', Excel: '📗' };
                  return (
                    <button
                      key={f}
                      onClick={() => setFormat(f)}
                      className={['flex flex-col items-center gap-2 p-4 rounded-xl border text-sm font-medium transition-all', format === f ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 ring-1 ring-[var(--color-primary)]/20 text-[var(--color-primary)]' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-neutral-300'].join(' ')}
                    >
                      <span className="text-2xl">{icons[f]}</span>
                      {f}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 5: Name + Schedule */}
          {step === 5 && (
            <div className="space-y-4">
              <Input label="Report name *" placeholder="e.g. Q2 Engineering Headcount" value={name} onChange={(e) => setName(e.target.value)} />

              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className={['w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors', scheduled ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : 'border-[var(--color-border)]'].join(' ')}>
                    {scheduled && <Check size={10} className="text-white" strokeWidth={3} />}
                  </div>
                  <input type="checkbox" className="hidden" checked={scheduled} onChange={(e) => setScheduled(e.target.checked)} />
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">Schedule this report</span>
                </label>
                <p className="text-xs text-[var(--color-text-muted)] mt-1 ml-8">Automatically regenerate on a recurring basis</p>
              </div>

              {scheduled && (
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Frequency</label>
                  <div className="flex gap-2 flex-wrap">
                    {(['Daily', 'Weekly', 'Monthly', 'Quarterly'] as ScheduleFreq[]).map((f) => (
                      <button key={f} onClick={() => setSchedFreq(f)}
                        className={['px-4 py-2 rounded-xl border text-sm font-medium transition-colors', schedFreq === f ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-neutral-300'].join(' ')}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-border)] text-xs space-y-1.5">
                <p className="font-semibold text-[var(--color-text-primary)] mb-2">Summary</p>
                <p><span className="text-[var(--color-text-muted)]">Category:</span> {category ? CAT_META[category].label : '—'}</p>
                <p><span className="text-[var(--color-text-muted)]">Metrics:</span> {metrics.join(', ') || '—'}</p>
                <p><span className="text-[var(--color-text-muted)]">Period:</span> {dateRange}</p>
                <p><span className="text-[var(--color-text-muted)]">Format:</span> {format}</p>
                {scheduled && <p><span className="text-[var(--color-text-muted)]">Schedule:</span> {schedFreq}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--color-border)] flex justify-between">
          <Button variant="secondary" size="md" onClick={() => step > 1 ? setStep(step - 1) : onClose()}>
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>
          {step < 5 ? (
            <Button variant="primary" size="md" onClick={() => setStep(step + 1)} disabled={!canNext()}>
              Next <ChevronRight size={14} />
            </Button>
          ) : (
            <Button variant="primary" size="md" onClick={handleSubmit} disabled={!canNext() || saving}>
              {saving ? 'Creating…' : 'Create & Run'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Error Detail Modal ───────────────────────────────────────────────────────

function ErrorDetailModal({
  run, onClose, onReRun,
}: { run: ReportRunDto; onClose: () => void; onReRun: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl border border-[var(--color-border)] w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
              <AlertCircle size={17} className="text-red-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">Run Failed</p>
              <p className="text-xs text-[var(--color-text-muted)]">{run.reportName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--color-surface)] transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-xl p-3.5 mb-4">
          <p className="text-xs text-red-700 leading-relaxed font-mono">
            {run.errorDetail ?? 'An unexpected error occurred.'}
          </p>
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">
          Run attempted on <span className="font-medium text-[var(--color-text-primary)]">{run.date}</span> · Format: {run.format}
        </p>
        <div className="flex gap-2.5 justify-end">
          <Button variant="secondary" size="md" onClick={onClose}>Dismiss</Button>
          <Button variant="primary" size="md" onClick={onReRun}>
            <RotateCcw size={13} />
            Re-run
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── RunStatusBadge ───────────────────────────────────────────────────────────

function RunStatusBadge({ status }: { status: RunStatus }) {
  if (status === 'completed') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
      <CheckCircle2 size={11} />Completed
    </span>
  );
  if (status === 'processing') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
      <Loader2 size={11} className="animate-spin" />Processing
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600">
      <AlertCircle size={11} />Failed
    </span>
  );
}
