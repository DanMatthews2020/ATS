'use client';

import { useState } from 'react';
import { X, BookmarkCheck } from 'lucide-react';
import { SearchFiltersPanel } from '@/components/sourcing/SearchFiltersPanel';
import { SearchResultCard } from '@/components/sourcing/SearchResultCard';
import { SkeletonResultCard } from '@/components/sourcing/SkeletonResultCard';
import { Button } from '@/components/ui/Button';
import {
  INITIAL_CRITERIA_WEIGHTS,
  INITIAL_SEARCH_FILTER_CHIPS,
  MOCK_SEARCH_RESULTS,
} from '@/lib/constants';
import type { CriteriaWeight, SearchFilterChip, SearchResultPerson } from '@/types';

const SORT_OPTIONS = ['Best Match', 'Most Recent', 'Most Experienced'];

export default function PeopleSearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [weights, setWeights] = useState<CriteriaWeight[]>(INITIAL_CRITERIA_WEIGHTS);
  const [broadMatch, setBroadMatch] = useState(true);
  const [filterChips, setFilterChips] = useState<SearchFilterChip[]>(
    INITIAL_SEARCH_FILTER_CHIPS,
  );
  const [sortBy, setSortBy] = useState(SORT_OPTIONS[0]);
  const [results, setResults] = useState<SearchResultPerson[]>(MOCK_SEARCH_RESULTS);

  function handleWeightChange(key: string, value: number) {
    setWeights((prev) =>
      prev.map((w) => (w.key === key ? { ...w, value } : w)),
    );
  }

  function removeChip(id: string) {
    setFilterChips((prev) => prev.filter((c) => c.id !== id));
  }

  function handleSave(id: string) {
    setResults((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, savedToShortlist: !r.savedToShortlist } : r,
      ),
    );
  }

  const visibleResults = results;
  const savedCount = results.filter((r) => r.savedToShortlist).length;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 px-8 py-4 bg-white border-b border-[var(--color-border)] flex-shrink-0">
        <div className="flex items-center gap-6">
          <h1 className="text-lg font-semibold text-[var(--color-primary)] tracking-tight whitespace-nowrap">
            People Search
          </h1>
          <nav className="flex items-center gap-1" aria-label="Search views">
            {(['Search', 'Autopilot', 'Insights'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                className={[
                  'px-3 py-1.5 text-sm rounded-lg transition-colors duration-100 outline-none',
                  'focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30',
                  tab === 'Search'
                    ? 'font-medium text-[var(--color-primary)] bg-[var(--color-surface)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface)]',
                ].join(' ')}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <input
            type="search"
            placeholder="Search..."
            className="h-9 w-44 px-3 rounded-lg border border-[var(--color-border)] bg-white text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 transition-colors duration-150"
          />
          <Button variant="primary" size="sm">
            Save Search
          </Button>
          <Button variant="secondary" size="sm">
            Export
          </Button>
          <Button variant="primary" size="sm">
            Start Autopilot
          </Button>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left filter panel */}
        <div className="w-64 flex-shrink-0 border-r border-[var(--color-border)] bg-white overflow-y-auto p-5">
          <SearchFiltersPanel
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            weights={weights}
            onWeightChange={handleWeightChange}
            broadMatch={broadMatch}
            onBroadMatchChange={setBroadMatch}
          />
        </div>

        {/* Results area */}
        <div className="flex-1 overflow-y-auto">
          {/* Filter chips + sort bar */}
          <div className="flex items-center justify-between gap-4 px-6 py-3 border-b border-[var(--color-border)] bg-white sticky top-0 z-10">
            <div className="flex items-center gap-2 flex-wrap">
              {filterChips.map((chip) => (
                <span
                  key={chip.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[var(--color-primary)] text-white"
                >
                  {chip.label}
                  {chip.removable ? (
                    <button
                      type="button"
                      aria-label={`Remove filter: ${chip.label}`}
                      onClick={() => removeChip(chip.id)}
                      className="hover:opacity-70 transition-opacity outline-none focus-visible:ring-1 focus-visible:ring-white rounded-full"
                    >
                      <X size={11} aria-hidden="true" />
                    </button>
                  ) : null}
                </span>
              ))}

              <span className="text-xs text-[var(--color-text-muted)] ml-2">
                Evaluating <strong className="text-[var(--color-text-primary)]">5,000</strong>
              </span>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {savedCount > 0 ? (
                <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
                  <BookmarkCheck size={12} aria-hidden="true" />
                  {savedCount} saved
                </span>
              ) : null}

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sort results"
                className="h-8 pl-3 pr-7 rounded-lg border border-[var(--color-border)] bg-white text-xs text-[var(--color-primary)] font-medium outline-none cursor-pointer appearance-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 transition-colors duration-150"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'calc(100% - 8px) center',
                }}
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>

              <Button variant="secondary" size="sm">
                List View
              </Button>
            </div>
          </div>

          {/* Result cards */}
          <div className="p-6 space-y-3">
            {visibleResults.map((person) =>
              person.isLocked ? (
                <SkeletonResultCard key={person.id} person={person} />
              ) : (
                <SearchResultCard
                  key={person.id}
                  person={person}
                  onSave={handleSave}
                />
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
