'use client';

import { useState } from 'react';
import type { Metadata } from 'next';
import { LayoutGrid, List, SlidersHorizontal } from 'lucide-react';
import { MOCK_PIPELINE_CANDIDATES, PIPELINE_JOB_OPTIONS } from '@/lib/constants';
import { PipelineCandidateCard } from '@/components/pipeline/PipelineCandidateCard';

// Note: Metadata export is not supported in client components.
// Page title is set via the parent server layout if needed.

type ViewMode = 'grid' | 'list';

export default function PipelinePage() {
  const defaultJobId = PIPELINE_JOB_OPTIONS[0]?.value ?? '';
  const [selectedJobId, setSelectedJobId] = useState<string>(defaultJobId);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const filteredCandidates = MOCK_PIPELINE_CANDIDATES.filter(
    (c) => c.jobId === selectedJobId,
  );

  const selectedJobLabel =
    PIPELINE_JOB_OPTIONS.find((o) => o.value === selectedJobId)?.label ?? '';

  return (
    <div className="p-8 space-y-6 flex-1">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-primary)] tracking-tight">
            Pipeline
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            {selectedJobLabel
              ? `${filteredCandidates.length} candidate${filteredCandidates.length !== 1 ? 's' : ''} · ${selectedJobLabel}`
              : 'Select a job to view candidates'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Job selector */}
          <div className="relative">
            <SlidersHorizontal
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none"
              aria-hidden="true"
            />
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              aria-label="Select job posting"
              className={[
                'h-10 pl-8 pr-9 rounded-xl border border-[var(--color-border)]',
                'bg-white text-sm text-[var(--color-primary)] font-medium',
                'outline-none cursor-pointer appearance-none',
                'transition-colors duration-150',
                'hover:border-neutral-300',
                'focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10',
              ].join(' ')}
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'calc(100% - 12px) center',
              }}
            >
              {PIPELINE_JOB_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* View mode toggle */}
          <div
            role="group"
            aria-label="View mode"
            className="flex items-center bg-white border border-[var(--color-border)] rounded-xl p-1 gap-0.5"
          >
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-pressed={viewMode === 'grid'}
              aria-label="Grid view"
              className={[
                'p-2 rounded-lg transition-colors duration-100 outline-none',
                'focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30',
                viewMode === 'grid'
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface)]',
              ].join(' ')}
            >
              <LayoutGrid size={14} aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-pressed={viewMode === 'list'}
              aria-label="List view"
              className={[
                'p-2 rounded-lg transition-colors duration-100 outline-none',
                'focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30',
                viewMode === 'list'
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface)]',
              ].join(' ')}
            >
              <List size={14} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Candidate grid / list ────────────────────────────────────────── */}
      {filteredCandidates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-12 h-12 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center mb-4">
            <List size={20} className="text-[var(--color-text-muted)]" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-[var(--color-text-primary)]">
            No candidates found
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Try selecting a different job posting.
          </p>
        </div>
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'
              : 'flex flex-col gap-2.5'
          }
        >
          {filteredCandidates.map((candidate) => (
            <PipelineCandidateCard
              key={candidate.id}
              candidate={candidate}
              viewMode={viewMode}
            />
          ))}
        </div>
      )}
    </div>
  );
}
