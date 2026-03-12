'use client';

import { useState, useMemo } from 'react';
import { Users, Plus, Search } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CandidateDrawer } from '@/components/candidates/CandidateDrawer';
import { CANDIDATES_PAGE_DATA } from '@/lib/constants';
import type { CandidateProfile, CandidateStatus, BadgeVariant } from '@/types';

const STATUS_CONFIG: Record<CandidateStatus, { label: string; variant: BadgeVariant }> = {
  new: { label: 'Available', variant: 'info' },
  screening: { label: 'In Review', variant: 'default' },
  interview: { label: 'Interviewing', variant: 'warning' },
  offer: { label: 'Offer Sent', variant: 'success' },
  hired: { label: 'Hired', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'error' },
};

type FilterKey = CandidateStatus | 'all';

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'Available' },
  { key: 'screening', label: 'In Review' },
  { key: 'interview', label: 'Interviewing' },
  { key: 'offer', label: 'Offer Sent' },
  { key: 'hired', label: 'Hired' },
  { key: 'rejected', label: 'Rejected' },
];

export default function CandidatesPage() {
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateProfile | null>(null);

  const filtered = useMemo(() => {
    return CANDIDATES_PAGE_DATA.filter((c) => {
      const matchesFilter = activeFilter === 'all' || c.status === activeFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.role.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [searchQuery, activeFilter]);

  function handleSearch() {
    setSearchQuery(searchInput);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSearch();
  }

  function tabCount(key: FilterKey): number {
    if (key === 'all') return CANDIDATES_PAGE_DATA.length;
    return CANDIDATES_PAGE_DATA.filter((c) => c.status === key).length;
  }

  return (
    <>
      <div className="min-h-screen bg-[var(--color-surface)]">
        <div className="px-8 py-8 max-w-5xl">

          {/* Page header */}
          <div className="flex items-center justify-between mb-7">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 bg-[var(--color-primary)] rounded-xl flex items-center justify-center flex-shrink-0">
                <Users size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[var(--color-text-primary)] leading-tight">
                  Candidate Management
                </h1>
                <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
                  {CANDIDATES_PAGE_DATA.length} candidates total
                </p>
              </div>
            </div>
            <Button variant="primary" size="md">
              <Plus size={15} />
              Add Candidate
            </Button>
          </div>

          {/* Search bar */}
          <div className="flex gap-2.5 mb-5">
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search candidates..."
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  if (e.target.value === '') setSearchQuery('');
                }}
                onKeyDown={handleKeyDown}
                className="w-full h-10 pl-9 pr-4 text-sm rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-shadow"
              />
            </div>
            <Button variant="primary" size="md" onClick={handleSearch}>
              Search
            </Button>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-0.5 mb-6 border-b border-[var(--color-border)]">
            {FILTER_TABS.map((tab) => {
              const count = tabCount(tab.key);
              const isActive = activeFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key)}
                  className={[
                    'px-3.5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                    isActive
                      ? 'border-[var(--color-primary)] text-[var(--color-text-primary)]'
                      : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:border-neutral-300',
                  ].join(' ')}
                >
                  {tab.label}
                  <span
                    className={[
                      'ml-1.5 text-xs tabular-nums',
                      isActive ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text-muted)]/60',
                    ].join(' ')}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Candidate list */}
          {filtered.length > 0 ? (
            <ul className="space-y-3">
              {filtered.map((candidate) => {
                const status = STATUS_CONFIG[candidate.status];
                return (
                  <li key={candidate.id}>
                    <button
                      onClick={() => setSelectedCandidate(candidate)}
                      className="w-full text-left bg-white border border-[var(--color-border)] rounded-2xl px-5 py-4 flex items-center gap-5 shadow-card hover:shadow-card-hover hover:border-neutral-300 transition-all duration-150 group"
                    >
                      <Avatar name={candidate.name} size="md" />

                      {/* Name + role */}
                      <div className="w-48 flex-shrink-0">
                        <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                          {candidate.name}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                          {candidate.role}
                        </p>
                      </div>

                      {/* Email */}
                      <div className="flex-1 min-w-0">
                        <a
                          href={`mailto:${candidate.email}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm text-blue-600 hover:underline truncate block"
                        >
                          {candidate.email}
                        </a>
                      </div>

                      {/* Status badge */}
                      <div className="flex-shrink-0">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 rounded-xl bg-white border border-[var(--color-border)] flex items-center justify-center mb-4 shadow-card">
                <Users size={20} className="text-[var(--color-text-muted)]" />
              </div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                No candidates found
              </p>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">
                Try adjusting your search or filter criteria
              </p>
            </div>
          )}
        </div>
      </div>

      <CandidateDrawer
        candidate={selectedCandidate}
        onClose={() => setSelectedCandidate(null)}
      />
    </>
  );
}
