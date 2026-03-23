'use client';

import { useState } from 'react';
import {
  Sparkles,
  Play,
  Pause,
  Settings2,
  CheckCircle2,
  Clock,
  Users,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_RUNS = [
  { id: 'r1', role: 'Senior Scientist — Biotech', candidatesFound: 24, status: 'completed', ranAt: '2 hours ago' },
  { id: 'r2', role: 'Product Manager — SaaS', candidatesFound: 18, status: 'completed', ranAt: '5 hours ago' },
  { id: 'r3', role: 'Frontend Engineer — React', candidatesFound: 0, status: 'running', ranAt: 'Running now' },
];

const JOB_OPTIONS = [
  'Senior Scientist',
  'Product Manager',
  'Frontend Engineer',
  'Backend Engineer',
  'UX Designer',
  'Data Analyst',
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AISourcingAgentPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [selectedJob, setSelectedJob] = useState(JOB_OPTIONS[0]);
  const [showJobMenu, setShowJobMenu] = useState(false);

  return (
    <div className="p-8 flex-1">

      {/* ── Page header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 bg-[var(--color-accent)] rounded-xl flex items-center justify-center flex-shrink-0">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] leading-tight">
              AI Sourcing Agent
            </h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
              Autonomous candidate discovery — configure once, run continuously
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="md">
            <Settings2 size={14} />
            Configure
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsRunning((v) => !v)}
          >
            {isRunning ? (
              <>
                <Pause size={14} />
                Pause Agent
              </>
            ) : (
              <>
                <Play size={14} />
                Start Agent
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── Status banner ───────────────────────────────────────────────── */}
      <div
        className={[
          'flex items-center gap-3 px-5 py-3.5 rounded-xl border mb-6 text-sm font-medium transition-colors duration-200',
          isRunning
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)]',
        ].join(' ')}
      >
        <span
          className={[
            'w-2 h-2 rounded-full flex-shrink-0',
            isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-300',
          ].join(' ')}
        />
        {isRunning ? 'Agent is running — evaluating new profiles in real time' : 'Agent is paused — click Start Agent to begin'}
      </div>

      {/* ── Two-column layout ───────────────────────────────────────────── */}
      <div className="flex gap-6 items-start">

        {/* ── Left: config panel ──────────────────────────────────────── */}
        <div className="w-[272px] flex-shrink-0 space-y-4">
          <Card padding="md">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">
              Agent Configuration
            </h2>

            {/* Job role selector */}
            <div className="mb-4">
              <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">
                Target Role
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowJobMenu((v) => !v)}
                  className="w-full flex items-center justify-between h-9 px-3 text-xs font-medium bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg hover:border-neutral-300 transition-colors"
                >
                  {selectedJob}
                  <ChevronDown size={12} />
                </button>
                {showJobMenu && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[var(--color-border)] rounded-xl shadow-card-hover z-10">
                    {JOB_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => { setSelectedJob(opt); setShowJobMenu(false); }}
                        className={[
                          'w-full text-left px-3 py-2 text-xs transition-colors first:rounded-t-xl last:rounded-b-xl',
                          selectedJob === opt
                            ? 'bg-[var(--color-surface)] text-[var(--color-text-primary)] font-semibold'
                            : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]',
                        ].join(' ')}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Stat row */}
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[var(--color-border)]">
              {[
                { label: 'Candidates found', value: '42' },
                { label: 'Outreach drafted', value: '17' },
                { label: 'Runs completed', value: '2' },
                { label: 'Avg. match score', value: '84%' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-[var(--color-surface)] rounded-lg p-2.5">
                  <p className="text-lg font-bold text-[var(--color-text-primary)] leading-none">{value}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 leading-tight">{label}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ── Right: run history ──────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">
            Recent Runs
          </h2>
          <ul className="space-y-3">
            {MOCK_RUNS.map((run) => (
              <li
                key={run.id}
                className="bg-white border border-[var(--color-border)] rounded-2xl px-5 py-4 shadow-card flex items-center gap-4"
              >
                <div
                  className={[
                    'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                    run.status === 'running' ? 'bg-emerald-50' : 'bg-[var(--color-surface)]',
                  ].join(' ')}
                >
                  {run.status === 'running' ? (
                    <Sparkles size={16} className="text-emerald-600 animate-pulse" />
                  ) : (
                    <CheckCircle2 size={16} className="text-[var(--color-text-muted)]" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                    {run.role}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                      <Users size={10} />
                      {run.candidatesFound} candidates found
                    </span>
                    <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                      <Clock size={10} />
                      {run.ranAt}
                    </span>
                  </div>
                </div>

                <Badge variant={run.status === 'running' ? 'success' : 'default'}>
                  {run.status === 'running' ? 'Running' : 'Completed'}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
