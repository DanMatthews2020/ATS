'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart2, TrendingUp, TrendingDown, Users, Clock, Target, Download, Plus,
  Trash2, Eye, X, FileText, Calendar,
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/contexts/ToastContext';
import {
  insightsApi,
  type InsightsPeriod,
  type InsightsAllDto,
  type InsightsStatsDto,
  type SavedReportDto,
} from '@/lib/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const PERIODS: { label: string; value: InsightsPeriod }[] = [
  { label: '30d',  value: '30d'  },
  { label: '90d',  value: '90d'  },
  { label: '6M',   value: '6m'  },
  { label: '12M',  value: '12m' },
];

const PERIOD_LABEL: Record<InsightsPeriod, string> = {
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  '6m':  'Last 6 months',
  '12m': 'Last 12 months',
};

const AXIS_STYLE       = { fill: '#6B7280', fontSize: 11 };
const GRID_COLOR       = '#E5E5E3';
const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: '#fff',
  border:          '1px solid #E5E5E3',
  borderRadius:    12,
  fontSize:        12,
  boxShadow:       '0 1px 4px rgba(0,0,0,0.06)',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TalentInsightsPage() {
  const router        = useRouter();
  const { showToast } = useToast();
  const pageRef       = useRef<HTMLDivElement>(null);

  const [period,    setPeriod]    = useState<InsightsPeriod>('12m');
  const [data,      setData]      = useState<InsightsAllDto | null>(null);
  const [reports,   setReports]   = useState<SavedReportDto[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [viewReport, setViewReport] = useState<SavedReportDto | null>(null);

  // ── Initial load
  useEffect(() => {
    Promise.all([
      insightsApi.getAll(period),
      insightsApi.getReports(),
    ]).then(([d, r]) => {
      setData(d);
      setReports(r.reports);
    }).catch(() => showToast('Failed to load insights', 'error'))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Period change → re-fetch everything
  const changePeriod = useCallback(async (p: InsightsPeriod) => {
    setPeriod(p);
    setLoading(true);
    try {
      const d = await insightsApi.getAll(p);
      setData(d);
    } catch {
      showToast('Failed to reload insights', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // ── Report actions
  async function handleDeleteReport(id: string) {
    try {
      await insightsApi.deleteReport(id);
      setReports((prev) => prev.filter((r) => r.id !== id));
      showToast('Report deleted', 'success');
    } catch {
      showToast('Failed to delete report', 'error');
    }
  }

  function handleExportReport(report: SavedReportDto) {
    const lines = [
      `Report: ${report.name}`,
      `Description: ${report.description}`,
      `Type: ${report.type}`,
      `Created: ${report.createdDate}`,
      `Last Run: ${report.lastRun}`,
      '',
      'Data:',
      JSON.stringify(report.data, null, 2),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${report.name.replace(/\s+/g, '-').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Page PDF export
  function handlePageExport() {
    const title = document.title;
    document.title = `Talent Insights — ${PERIOD_LABEL[period]}`;
    window.print();
    document.title = title;
  }

  // ── Team CSV export (stats snapshot)
  function handleStatsExport() {
    if (!data) return;
    const { stats } = data;
    const rows = [
      ['Metric', 'Value', 'Change'],
      ['Total Candidates Sourced', String(stats.totalCandidatesSourced), stats.candidatesDelta],
      ['Active Pipelines',        String(stats.activePipelines),        stats.pipelinesDelta],
      ['Avg. Time to Hire (days)', String(stats.avgTimeToHire),         stats.timeToHireDelta],
      ['Offers Accepted Rate (%)', String(stats.offersAcceptedRate),    stats.offersDelta],
    ];
    const csv  = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `talent-insights-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Trend data: rename keys for Recharts
  const trendData = (data?.trends ?? []).map((t) => ({
    month:         t.month,
    'Time to Hire': t.timeToHire,
    'Time to Fill': t.timeToFill,
  }));

  const stats     = data?.stats ?? null;
  const pipeline  = data?.pipeline ?? [];
  const sources   = data?.sources ?? [];

  return (
    <div className="p-8 flex-1 print:p-4" ref={pageRef}>

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6 print:mb-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 bg-[var(--color-primary)] rounded-xl flex items-center justify-center flex-shrink-0 print:hidden">
            <BarChart2 size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] leading-tight">
              Talent Insights
            </h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
              Hiring metrics and pipeline analytics
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 print:hidden">
          <Button variant="secondary" size="md" onClick={handleStatsExport}>
            <Download size={14} />
            Export
          </Button>
          <Button variant="primary" size="md" onClick={() => router.push('/reports?builder=open')}>
            <Plus size={14} />
            Create Report
          </Button>
        </div>
      </div>

      {/* ── Date range tabs ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 mb-6 print:hidden">
        <span className="text-sm text-[var(--color-text-muted)] mr-2">Period:</span>
        <div className="flex gap-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-1">
          {PERIODS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => changePeriod(value)}
              className={[
                'px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150',
                period === value
                  ? 'bg-white text-[var(--color-text-primary)] shadow-sm border border-[var(--color-border)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="ml-3 text-xs text-[var(--color-text-muted)]">{PERIOD_LABEL[period]}</span>
        <button
          onClick={handlePageExport}
          className="ml-auto flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors px-3 py-1.5 rounded-lg hover:bg-[var(--color-surface)] border border-transparent hover:border-[var(--color-border)]"
        >
          <FileText size={13} />
          Export PDF
        </button>
      </div>

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <InsightStatCard
          label="Total Candidates Sourced"
          value={stats ? stats.totalCandidatesSourced.toLocaleString() : '—'}
          change={stats?.candidatesDelta ?? ''}
          positive={stats?.candidatesPositive ?? true}
          icon={<Users size={14} />}
          loading={loading}
        />
        <InsightStatCard
          label="Active Pipelines"
          value={stats ? String(stats.activePipelines) : '—'}
          change={stats?.pipelinesDelta ?? ''}
          positive={stats?.pipelinesPositive ?? true}
          icon={<Target size={14} />}
          loading={loading}
        />
        <InsightStatCard
          label="Avg. Time to Hire"
          value={stats ? `${stats.avgTimeToHire} days` : '—'}
          change={stats?.timeToHireDelta ?? ''}
          positive={stats?.timeToHirePositive ?? false}
          icon={<Clock size={14} />}
          loading={loading}
        />
        <InsightStatCard
          label="Offers Accepted Rate"
          value={stats ? `${stats.offersAcceptedRate}%` : '—'}
          change={stats?.offersDelta ?? ''}
          positive={stats?.offersPositive ?? true}
          icon={<BarChart2 size={14} />}
          loading={loading}
        />
      </div>

      {/* ── Charts row 1 ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4 mb-4">

        {/* Time to Hire vs Fill — dual line chart */}
        <ChartCard
          title="Time to Hire vs. Time to Fill"
          subtitle="Average days per month"
          aside={PERIOD_LABEL[period]}
          loading={loading}
        >
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trendData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
              <XAxis dataKey="month" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} domain={['auto', 'auto']} unit="d" />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v} days`]} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#6B7280', paddingTop: 12 }} />
              <Line type="monotone" dataKey="Time to Hire" stroke="#0A0A0A" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="Time to Fill" stroke="#F97316" strokeWidth={2} dot={false} activeDot={{ r: 4 }} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Source Effectiveness — donut */}
        <ChartCard title="Source Effectiveness" subtitle="Distribution of candidates by channel" loading={loading}>
          {sources.length > 0 && (
            <div className="flex items-center gap-4 mt-2">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie
                    data={sources}
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={66}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {sources.map((s, i) => <Cell key={i} fill={s.color} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}%`]} />
                </PieChart>
              </ResponsiveContainer>
              <ul className="space-y-2.5 flex-1">
                {sources.map((s) => (
                  <li key={s.name} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="text-sm text-[var(--color-text-primary)]">{s.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-[var(--color-text-primary)]">{s.value}%</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </ChartCard>
      </div>

      {/* ── Charts row 2 ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4 mb-6">

        {/* Pipeline Activity — stacked bar */}
        <ChartCard
          title="Pipeline Activity"
          subtitle="Candidates per stage over the selected period"
          aside={PERIOD_LABEL[period]}
          loading={loading}
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={pipeline} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
              <XAxis dataKey="month" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#6B7280', paddingTop: 12 }} />
              <Bar dataKey="Sourced"   stackId="a" fill="#0A0A0A" />
              <Bar dataKey="Screened"  stackId="a" fill="#374151" />
              <Bar dataKey="Interview" stackId="a" fill="#9CA3AF" />
              <Bar dataKey="Offer"     stackId="a" fill="#F97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Source per Hire — horizontal bar */}
        <ChartCard
          title="Source per Hire"
          subtitle="Hires attributed to each sourcing channel"
          aside="YTD"
          loading={loading}
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={sources} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} horizontal={false} />
              <XAxis type="number" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={AXIS_STYLE} axisLine={false} tickLine={false} width={66} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v} hires`]} />
              <Bar dataKey="hires" fill="#0A0A0A" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Source channel breakdown ─────────────────────────────────────── */}
      {sources.length > 0 && (
        <div className="bg-white border border-[var(--color-border)] rounded-2xl p-5 shadow-card mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                Source Channel Breakdown
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Detailed breakdown by sourcing channel — {PERIOD_LABEL[period]}
              </p>
            </div>
          </div>
          <div className="space-y-3.5">
            {sources.map((s) => (
              <div key={s.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">{s.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-[var(--color-text-muted)]">{s.hires} hires</span>
                    <span className="text-sm font-bold text-[var(--color-text-primary)] tabular-nums w-9 text-right">
                      {s.value}%
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-[var(--color-surface)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${s.value}%`, backgroundColor: s.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Saved Reports table ──────────────────────────────────────────── */}
      <div className="bg-white border border-[var(--color-border)] rounded-2xl shadow-card overflow-hidden print:hidden">
        <div className="flex items-start justify-between gap-4 p-5 border-b border-[var(--color-border)]">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Saved Reports</h2>
            <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
              Manage and export your saved analytics reports
            </p>
          </div>
          <div className="flex gap-2.5 flex-shrink-0">
            <Button variant="secondary" size="sm" onClick={handleStatsExport}>
              <Download size={13} />
              Export Report
            </Button>
            <Button variant="primary" size="sm" onClick={() => router.push('/reports?builder=open')}>
              <Plus size={13} />
              Create Custom Report
            </Button>
          </div>
        </div>

        {reports.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                {['Report Name', 'Type', 'Created Date', 'Last Run', 'Actions'].map((col) => (
                  <th key={col} className="px-5 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-[var(--color-surface)] transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-medium text-[var(--color-text-primary)]">{report.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{report.description}</p>
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant={report.type === 'Scheduled' ? 'info' : 'default'}>{report.type}</Badge>
                  </td>
                  <td className="px-5 py-4 text-[var(--color-text-muted)]">{report.createdDate}</td>
                  <td className="px-5 py-4 text-[var(--color-text-muted)]">{report.lastRun}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" size="sm" onClick={() => setViewReport(report)}>
                        <Eye size={12} />
                        View
                      </Button>
                      <Button variant="primary" size="sm" onClick={() => handleExportReport(report)}>
                        <Download size={12} />
                        Export
                      </Button>
                      <button
                        onClick={() => handleDeleteReport(report.id)}
                        className="h-8 w-8 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-red-600 hover:bg-red-50 transition-colors"
                        aria-label="Delete report"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BarChart2 size={24} className="text-[var(--color-text-muted)] mb-3" />
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">No saved reports</p>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              Create a custom report to get started
            </p>
          </div>
        )}
      </div>

      {/* ── Report View Modal ────────────────────────────────────────────── */}
      {viewReport && (
        <ReportViewModal
          report={viewReport}
          onClose={() => setViewReport(null)}
          onExport={() => { handleExportReport(viewReport); setViewReport(null); }}
        />
      )}
    </div>
  );
}

// ─── Report View Modal ────────────────────────────────────────────────────────

function ReportViewModal({
  report, onClose, onExport,
}: { report: SavedReportDto; onClose: () => void; onExport: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl border border-[var(--color-border)] w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">{report.name}</h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{report.description}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--color-surface)] transition-colors ml-4">
            <X size={16} />
          </button>
        </div>

        {/* Meta */}
        <div className="px-6 py-4 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-[var(--color-text-muted)] mb-0.5">Type</p>
              <Badge variant={report.type === 'Scheduled' ? 'info' : 'default'}>{report.type}</Badge>
            </div>
            <div>
              <p className="text-xs text-[var(--color-text-muted)] mb-0.5">Created</p>
              <p className="text-sm text-[var(--color-text-primary)]">{report.createdDate}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-text-muted)] mb-0.5">Last Run</p>
              <div className="flex items-center gap-1.5">
                <Calendar size={11} className="text-[var(--color-text-muted)]" />
                <p className="text-sm text-[var(--color-text-primary)]">{report.lastRun}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Data preview */}
        <div className="px-6 py-4 max-h-64 overflow-y-auto">
          <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-2">
            Report Data
          </p>
          <pre className="text-xs text-[var(--color-text-primary)] bg-[var(--color-surface)] rounded-xl p-3 border border-[var(--color-border)] overflow-x-auto whitespace-pre-wrap leading-relaxed">
            {JSON.stringify(report.data, null, 2)}
          </pre>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--color-border)] flex justify-end gap-2.5">
          <Button variant="secondary" size="md" onClick={onClose}>Close</Button>
          <Button variant="primary" size="md" onClick={onExport}>
            <Download size={13} />
            Export
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InsightStatCard({
  label, value, change, positive, icon, loading = false,
}: {
  label: string; value: string; change: string;
  positive: boolean; icon: React.ReactNode; loading?: boolean;
}) {
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-2xl p-4 shadow-card">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
        <span className="text-[var(--color-text-muted)]">{icon}</span>
      </div>
      {loading ? (
        <div className="h-8 w-24 bg-[var(--color-border)] rounded-lg animate-pulse mt-1" />
      ) : (
        <p className="text-2xl font-bold text-[var(--color-text-primary)] leading-tight mt-1">{value}</p>
      )}
      <div className="flex items-center gap-1 mt-1">
        {positive
          ? <TrendingUp  size={12} className="text-emerald-500 flex-shrink-0" />
          : <TrendingDown size={12} className="text-red-500 flex-shrink-0" />}
        <span className={['text-xs font-medium', positive ? 'text-emerald-600' : 'text-red-500'].join(' ')}>
          {change}
        </span>
      </div>
    </div>
  );
}

function ChartCard({
  title, subtitle, aside, loading = false, children,
}: {
  title: string; subtitle: string; aside?: string; loading?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-2xl p-5 shadow-card">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">{title}</h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{subtitle}</p>
        </div>
        {aside && <span className="text-xs text-[var(--color-text-muted)] flex-shrink-0 mt-0.5">{aside}</span>}
      </div>
      {loading ? (
        <div className="h-[240px] bg-[var(--color-surface)] rounded-xl animate-pulse" />
      ) : (
        children
      )}
    </div>
  );
}
