'use client';

import { useState } from 'react';
import {
  BarChart2,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  Target,
  Download,
  Plus,
  Trash2,
  Eye,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

// ─── Mock data ────────────────────────────────────────────────────────────────

const TIME_TO_HIRE_DATA = [
  { month: 'Apr', days: 34 },
  { month: 'May', days: 31 },
  { month: 'Jun', days: 29 },
  { month: 'Jul', days: 33 },
  { month: 'Aug', days: 28 },
  { month: 'Sep', days: 26 },
  { month: 'Oct', days: 30 },
  { month: 'Nov', days: 27 },
  { month: 'Dec', days: 25 },
  { month: 'Jan', days: 28 },
  { month: 'Feb', days: 26 },
  { month: 'Mar', days: 27 },
];

const TIME_TO_FILL_DATA = [
  { month: 'Apr', days: 48 },
  { month: 'May', days: 45 },
  { month: 'Jun', days: 44 },
  { month: 'Jul', days: 47 },
  { month: 'Aug', days: 41 },
  { month: 'Sep', days: 39 },
  { month: 'Oct', days: 43 },
  { month: 'Nov', days: 38 },
  { month: 'Dec', days: 36 },
  { month: 'Jan', days: 40 },
  { month: 'Feb', days: 37 },
  { month: 'Mar', days: 38 },
];

const COMBINED_TREND_DATA = TIME_TO_HIRE_DATA.map((d, i) => ({
  month: d.month,
  'Time to Hire': d.days,
  'Time to Fill': TIME_TO_FILL_DATA[i].days,
}));

const PIPELINE_ACTIVITY_DATA = [
  { month: 'Oct', Sourced: 142, Screened: 89, Interview: 42, Offer: 12 },
  { month: 'Nov', Sourced: 128, Screened: 76, Interview: 38, Offer: 10 },
  { month: 'Dec', Sourced: 95,  Screened: 58, Interview: 27, Offer: 8  },
  { month: 'Jan', Sourced: 167, Screened: 104,Interview: 51, Offer: 15 },
  { month: 'Feb', Sourced: 154, Screened: 93, Interview: 46, Offer: 13 },
  { month: 'Mar', Sourced: 178, Screened: 110,Interview: 54, Offer: 17 },
];

const SOURCE_PER_HIRE_DATA = [
  { channel: 'LinkedIn',  hires: 38 },
  { channel: 'Referral',  hires: 24 },
  { channel: 'AI Agent',  hires: 19 },
  { channel: 'GitHub',    hires: 12 },
  { channel: 'Job Board', hires: 9  },
  { channel: 'Direct',    hires: 6  },
];

const SOURCE_EFFECTIVENESS_DATA = [
  { name: 'LinkedIn',  value: 45, color: '#0A0A0A' },
  { name: 'AI Agent',  value: 22, color: '#F97316' },
  { name: 'GitHub',    value: 20, color: '#22C55E' },
  { name: 'Referral',  value: 13, color: '#EF4444' },
];

const SAVED_REPORTS = [
  {
    id: '1',
    name: 'Q1 Sourcing Overview',
    description: 'Sourcing trends and channel insights',
    type: 'Scheduled',
    createdDate: '2026-01-15',
    lastRun: '2026-03-01',
  },
  {
    id: '2',
    name: 'Engineering Pipeline Health',
    description: 'Stage velocity and bottleneck analysis',
    type: 'Manual',
    createdDate: '2026-02-02',
    lastRun: '2026-03-08',
  },
  {
    id: '3',
    name: 'Diversity Sourcing Snapshot',
    description: 'Demographic sourcing breakdown for leadership roles',
    type: 'Scheduled',
    createdDate: '2025-12-10',
    lastRun: '2026-03-02',
  },
  {
    id: '4',
    name: 'Referral Performance — March',
    description: 'Referrals converted and time-to-hire',
    type: 'Manual',
    createdDate: '2026-03-05',
    lastRun: '2026-03-09',
  },
];

const DATE_RANGES = ['Last 30 days', 'Last 90 days', 'Last 6 months', 'Last 12 months'];

// ─── Shared chart style ───────────────────────────────────────────────────────

const AXIS_STYLE = { fill: '#6B7280', fontSize: 11 };
const GRID_COLOR = '#E5E5E3';
const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: '#fff',
  border: '1px solid #E5E5E3',
  borderRadius: 12,
  fontSize: 12,
  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TalentInsightsPage() {
  const [dateRange, setDateRange] = useState('Last 12 months');
  const [reports, setReports] = useState(SAVED_REPORTS);

  function deleteReport(id: string) {
    setReports((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div className="p-8 flex-1">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 bg-[var(--color-primary)] rounded-xl flex items-center justify-center flex-shrink-0">
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
        <div className="flex items-center gap-2.5">
          {/* Date range selector */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="h-10 px-3.5 pr-8 rounded-xl border border-[var(--color-border)] bg-white text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/10 focus:border-[var(--color-primary)] transition-colors appearance-none cursor-pointer"
          >
            {DATE_RANGES.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <Button variant="secondary" size="md">
            <Download size={14} />
            Export
          </Button>
          <Button variant="primary" size="md">
            <Plus size={14} />
            Create Report
          </Button>
        </div>
      </div>

      {/* ── Stats row ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <InsightStatCard
          label="Total Candidates Sourced"
          value="8,742"
          change="+6.4%"
          positive={true}
          icon={<Users size={14} />}
        />
        <InsightStatCard
          label="Active Pipelines"
          value="14"
          change="+2.1%"
          positive={true}
          icon={<Target size={14} />}
        />
        <InsightStatCard
          label="Avg. Time to Hire"
          value="27 days"
          change="−0.8%"
          positive={false}
          icon={<Clock size={14} />}
        />
        <InsightStatCard
          label="Offers Accepted Rate"
          value="72%"
          change="+3.7%"
          positive={true}
          icon={<BarChart2 size={14} />}
        />
      </div>

      {/* ── Charts row 1: Time trends + Source effectiveness ────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4 mb-4">

        {/* Time to Hire & Fill — dual line chart */}
        <ChartCard
          title="Time to Hire vs. Time to Fill"
          subtitle="Average days per month"
          aside="Last 12 months"
        >
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={COMBINED_TREND_DATA} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
              <XAxis dataKey="month" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} domain={['auto', 'auto']} unit="d" />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v} days`]} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, color: '#6B7280', paddingTop: 12 }}
              />
              <Line
                type="monotone"
                dataKey="Time to Hire"
                stroke="#0A0A0A"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="Time to Fill"
                stroke="#F97316"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                strokeDasharray="4 2"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Source effectiveness — donut chart */}
        <ChartCard
          title="Source Effectiveness"
          subtitle="Distribution of candidates by sourcing channel"
          aside="Top Channels"
        >
          <div className="flex items-center gap-4 mt-2">
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie
                  data={SOURCE_EFFECTIVENESS_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={42}
                  outerRadius={66}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {SOURCE_EFFECTIVENESS_DATA.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v) => [`${v}%`]}
                />
              </PieChart>
            </ResponsiveContainer>
            <ul className="space-y-2.5 flex-1">
              {SOURCE_EFFECTIVENESS_DATA.map((entry) => (
                <li key={entry.name} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-sm text-[var(--color-text-primary)]">{entry.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {entry.value}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </ChartCard>
      </div>

      {/* ── Charts row 2: Pipeline activity + Source per hire ───────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4 mb-6">

        {/* Pipeline Activity — stacked bar chart */}
        <ChartCard
          title="Pipeline Activity"
          subtitle="Candidates per stage over the last 6 months"
          aside="Last 6 months"
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={PIPELINE_ACTIVITY_DATA} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
              <XAxis dataKey="month" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, color: '#6B7280', paddingTop: 12 }}
              />
              <Bar dataKey="Sourced"   stackId="a" fill="#0A0A0A" radius={[0,0,0,0]} />
              <Bar dataKey="Screened"  stackId="a" fill="#374151" />
              <Bar dataKey="Interview" stackId="a" fill="#9CA3AF" />
              <Bar dataKey="Offer"     stackId="a" fill="#F97316" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Source per Hire — horizontal bar chart */}
        <ChartCard
          title="Source per Hire"
          subtitle="Hires attributed to each sourcing channel"
          aside="YTD"
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={SOURCE_PER_HIRE_DATA}
              layout="vertical"
              margin={{ top: 0, right: 10, left: 10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} horizontal={false} />
              <XAxis type="number" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="channel"
                tick={AXIS_STYLE}
                axisLine={false}
                tickLine={false}
                width={62}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v} hires`]} />
              <Bar dataKey="hires" fill="#0A0A0A" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Saved Reports table ──────────────────────────────────────────── */}
      <div className="bg-white border border-[var(--color-border)] rounded-2xl shadow-card overflow-hidden">
        <div className="flex items-start justify-between gap-4 p-5 border-b border-[var(--color-border)]">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              Saved Reports
            </h2>
            <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
              Manage and export your saved analytics reports
            </p>
          </div>
          <div className="flex gap-2.5 flex-shrink-0">
            <Button variant="secondary" size="sm">
              <Download size={13} />
              Export Report
            </Button>
            <Button variant="primary" size="sm">
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
                  <th
                    key={col}
                    className="px-5 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {reports.map((report) => (
                <tr
                  key={report.id}
                  className="hover:bg-[var(--color-surface)] transition-colors"
                >
                  <td className="px-5 py-4">
                    <p className="font-medium text-[var(--color-text-primary)]">
                      {report.name}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      {report.description}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant={report.type === 'Scheduled' ? 'info' : 'default'}>
                      {report.type}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-[var(--color-text-muted)]">
                    {report.createdDate}
                  </td>
                  <td className="px-5 py-4 text-[var(--color-text-muted)]">
                    {report.lastRun}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" size="sm">
                        <Eye size={12} />
                        View
                      </Button>
                      <Button variant="primary" size="sm">
                        <Download size={12} />
                        Export
                      </Button>
                      <button
                        onClick={() => deleteReport(report.id)}
                        className="h-8 px-3 text-xs font-medium rounded-lg text-[var(--color-text-muted)] hover:text-red-600 hover:bg-red-50 transition-colors"
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

    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InsightStatCard({
  label,
  value,
  change,
  positive,
  icon,
}: {
  label: string;
  value: string;
  change: string;
  positive: boolean;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-2xl p-4 shadow-card">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
        <span className="text-[var(--color-text-muted)]">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-[var(--color-text-primary)] leading-tight mt-1">
        {value}
      </p>
      <div className="flex items-center gap-1 mt-1">
        {positive ? (
          <TrendingUp size={12} className="text-emerald-500 flex-shrink-0" />
        ) : (
          <TrendingDown size={12} className="text-red-500 flex-shrink-0" />
        )}
        <span
          className={[
            'text-xs font-medium',
            positive ? 'text-emerald-600' : 'text-red-500',
          ].join(' ')}
        >
          {change}
        </span>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  aside,
  children,
}: {
  title: string;
  subtitle: string;
  aside?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-2xl p-5 shadow-card">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">{title}</h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{subtitle}</p>
        </div>
        {aside && (
          <span className="text-xs text-[var(--color-text-muted)] flex-shrink-0 mt-0.5">
            {aside}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
