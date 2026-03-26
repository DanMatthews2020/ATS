'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Mail, Plus, ChevronUp, ChevronDown, ChevronsUpDown,
  Loader2, AlertCircle, Search, X, ChevronDown as ChevronDownSm,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { sequencesApi, type SequenceListDto } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type SortKey = 'name' | 'enrolledCount' | 'openRate' | 'clickRate' | 'replyRate' | 'converted' | 'conversionRate' | 'createdByName';
type SortDir = 'asc' | 'desc';
type StatusFilter = 'ACTIVE' | 'PAUSED' | 'all';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(num: number, den: number): string {
  if (!den) return '—';
  return `${Math.round((num / den) * 100)}%`;
}

function getOpenRate(s: SequenceListDto): number {
  if (!s.enrolledCount) return 0;
  // Backend stats not on list DTO — placeholder until detail is loaded
  return 0;
}

// ─── Column header with sort ──────────────────────────────────────────────────

function SortHeader({
  label,
  col,
  active,
  dir,
  onSort,
  align = 'left',
}: {
  label: string;
  col: SortKey;
  active: SortKey;
  dir: SortDir;
  onSort: (col: SortKey) => void;
  align?: 'left' | 'right';
}) {
  const isActive = active === col;
  const Icon = isActive ? (dir === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown;
  return (
    <th
      className={`px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider cursor-pointer select-none whitespace-nowrap ${align === 'right' ? 'text-right' : 'text-left'}`}
      onClick={() => onSort(col)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <Icon size={11} className={isActive ? 'text-[var(--color-primary)]' : 'opacity-40'} />
      </span>
    </th>
  );
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-[var(--color-border)]">
      {[...Array(8)].map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-3.5 bg-neutral-100 rounded animate-pulse" style={{ width: i === 0 ? '60%' : i === 7 ? '80%' : '40%' }} />
        </td>
      ))}
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SequencesPage() {
  const [sequences, setSequences]     = useState<SequenceListDto[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [error, setError]             = useState('');
  const [search, setSearch]           = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ACTIVE');
  const [statusOpen, setStatusOpen]   = useState(false);
  const [sortKey, setSortKey]         = useState<SortKey>('name');
  const [sortDir, setSortDir]         = useState<SortDir>('asc');
  const statusRef = useRef<HTMLDivElement>(null);

  // ── Debounce search ──────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // ── Close status dropdown on outside click ───────────────────────────────
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setStatusOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchSequences = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const params: { status?: string; search?: string } = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (debouncedSearch) params.search = debouncedSearch;
      const data = await sequencesApi.getAll(params);
      setSequences(data.sequences);
    } catch {
      setError('Failed to load sequences');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, debouncedSearch]);

  useEffect(() => { fetchSequences(); }, [fetchSequences]);

  // ── Sort ─────────────────────────────────────────────────────────────────
  function handleSort(col: SortKey) {
    if (sortKey === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(col);
      setSortDir('asc');
    }
  }

  const sorted = [...sequences].sort((a, b) => {
    let av: string | number = 0;
    let bv: string | number = 0;
    switch (sortKey) {
      case 'name':           av = a.name; bv = b.name; break;
      case 'enrolledCount':  av = a.enrolledCount; bv = b.enrolledCount; break;
      case 'createdByName':  av = a.createdByName ?? ''; bv = b.createdByName ?? ''; break;
      // Rate columns are all 0 on list view (stats live on detail DTO)
      default:               av = 0; bv = 0;
    }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  // ── Status filter label ───────────────────────────────────────────────────
  const statusLabel = statusFilter === 'all' ? 'All' : statusFilter === 'ACTIVE' ? 'Active' : 'Paused';

  // ── Sort props shorthand ──────────────────────────────────────────────────
  const sh = { active: sortKey, dir: sortDir, onSort: handleSort };

  return (
    <div className="p-8 flex-1">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 bg-[var(--color-primary)] rounded-xl flex items-center justify-center flex-shrink-0">
            <Mail size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] leading-tight">
              Sequences
            </h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
              Automated outreach campaigns for candidates
            </p>
          </div>
        </div>
        <Link href="/sequences/new">
          <Button variant="primary" size="md">
            <Plus size={15} />
            New
          </Button>
        </Link>
      </div>

      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Button variant="secondary" size="sm">New Filter</Button>
        <Button variant="secondary" size="sm">Save as New</Button>

        {/* Status chip */}
        <div className="relative" ref={statusRef}>
          <div className="flex items-center gap-0 border border-[var(--color-border)] rounded-lg overflow-hidden text-xs bg-white">
            <span className="px-2.5 py-1.5 text-[var(--color-text-muted)] border-r border-[var(--color-border)] whitespace-nowrap">
              Status: equals
            </span>
            <button
              onClick={() => setStatusOpen((o) => !o)}
              className="flex items-center gap-1 px-2.5 py-1.5 font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors"
            >
              {statusLabel}
              <ChevronDownSm size={11} className="text-[var(--color-text-muted)]" />
            </button>
            {statusFilter !== 'all' && (
              <button
                onClick={() => setStatusFilter('all')}
                className="px-2 py-1.5 hover:bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors border-l border-[var(--color-border)]"
              >
                <X size={11} />
              </button>
            )}
          </div>

          {/* Dropdown */}
          {statusOpen && (
            <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-[var(--color-border)] rounded-xl shadow-card-hover w-36 py-1 text-sm">
              {(['ACTIVE', 'PAUSED', 'all'] as StatusFilter[]).map((s) => (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setStatusOpen(false); }}
                  className={[
                    'w-full text-left px-3 py-1.5 hover:bg-[var(--color-surface)] transition-colors',
                    statusFilter === s ? 'text-[var(--color-primary)] font-medium' : 'text-[var(--color-text-primary)]',
                  ].join(' ')}
                >
                  {s === 'all' ? 'All' : s === 'ACTIVE' ? 'Active' : 'Paused'}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1" />
        <button className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors">
          Advanced
        </button>
        <button className="text-xs text-[var(--color-primary)] hover:underline transition-colors">
          + Add Field to Match
        </button>
      </div>

      {/* ── Search bar ──────────────────────────────────────────────────── */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
        <Input
          placeholder="Search for a sequence by title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-9 text-sm w-full"
        />
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="bg-white border border-[var(--color-border)] rounded-2xl shadow-card overflow-hidden">
        {error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <AlertCircle size={24} className="text-red-500" />
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">Failed to load sequences</p>
            <Button variant="secondary" size="sm" onClick={fetchSequences}>Try again</Button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                <SortHeader label="Sequence"         col="name"            {...sh} />
                <SortHeader label="Total Enrolled"   col="enrolledCount"   {...sh} align="right" />
                <SortHeader label="Open Rate"        col="openRate"        {...sh} align="right" />
                <SortHeader label="Click Rate"       col="clickRate"       {...sh} align="right" />
                <SortHeader label="Reply Rate"       col="replyRate"       {...sh} align="right" />
                <SortHeader label="Converted"        col="converted"       {...sh} align="right" />
                <SortHeader label="Conversion Rate"  col="conversionRate"  {...sh} align="right" />
                <SortHeader label="Created By"       col="createdByName"   {...sh} />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {isLoading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white border border-[var(--color-border)] flex items-center justify-center shadow-card">
                        <Mail size={20} className="text-[var(--color-text-muted)]" />
                      </div>
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">No sequences yet</p>
                      <p className="text-sm text-[var(--color-text-muted)]">
                        {debouncedSearch || statusFilter !== 'all'
                          ? 'Try adjusting your filters'
                          : 'Create your first sequence to get started'}
                      </p>
                      {!debouncedSearch && statusFilter === 'all' && (
                        <Link href="/sequences/new">
                          <Button variant="primary" size="sm">
                            <Plus size={13} />
                            Create your first sequence
                          </Button>
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                sorted.map((seq) => (
                  <SequenceRow key={seq.id} sequence={seq} />
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Row count */}
      {!isLoading && !error && sorted.length > 0 && (
        <p className="mt-2 text-xs text-[var(--color-text-muted)] text-right">
          {sorted.length} sequence{sorted.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}

// ─── SequenceRow ──────────────────────────────────────────────────────────────

function SequenceRow({ sequence: s }: { sequence: SequenceListDto }) {
  // Rates aren't available on the list DTO (they live in stats on the detail DTO).
  // Display a dash until the user opens the detail view.
  const dash = '—';

  return (
    <tr className="hover:bg-[var(--color-surface)] transition-colors">
      {/* Name */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className={[
            'w-2 h-2 rounded-full flex-shrink-0',
            s.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-neutral-300',
          ].join(' ')} />
          <Link
            href={`/sequences/${s.id}`}
            className="font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-primary)] transition-colors"
          >
            {s.name}
          </Link>
          {s.stepCount > 0 && (
            <span className="text-[11px] text-[var(--color-text-muted)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1.5 py-0.5">
              {s.stepCount} step{s.stepCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </td>

      {/* Total Enrolled */}
      <td className="px-4 py-3.5 text-right tabular-nums text-[var(--color-text-primary)]">
        {s.enrolledCount}
      </td>

      {/* Open Rate */}
      <td className="px-4 py-3.5 text-right tabular-nums text-[var(--color-text-muted)]">
        {dash}
      </td>

      {/* Click Rate */}
      <td className="px-4 py-3.5 text-right tabular-nums text-[var(--color-text-muted)]">
        {dash}
      </td>

      {/* Reply Rate */}
      <td className="px-4 py-3.5 text-right tabular-nums text-[var(--color-text-muted)]">
        {dash}
      </td>

      {/* Total Converted */}
      <td className="px-4 py-3.5 text-right tabular-nums text-[var(--color-text-muted)]">
        {dash}
      </td>

      {/* Conversion Rate */}
      <td className="px-4 py-3.5 text-right tabular-nums text-[var(--color-text-muted)]">
        {dash}
      </td>

      {/* Created By */}
      <td className="px-4 py-3.5">
        {s.createdByName ? (
          <div className="flex items-center gap-2">
            <Avatar name={s.createdByName} size="sm" />
            <span className="text-[var(--color-text-primary)] text-xs font-medium">{s.createdByName}</span>
          </div>
        ) : (
          <span className="text-[var(--color-text-muted)]">—</span>
        )}
      </td>
    </tr>
  );
}
