'use client';

import { Slider } from '@/components/ui/Slider';
import { Toggle } from '@/components/ui/Toggle';
import { PARSED_SEARCH_CRITERIA } from '@/lib/constants';
import type { CriteriaWeight } from '@/types';

interface SearchFiltersPanelProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  weights: CriteriaWeight[];
  onWeightChange: (key: string, value: number) => void;
  broadMatch: boolean;
  onBroadMatchChange: (value: boolean) => void;
}

export function SearchFiltersPanel({
  searchQuery,
  onSearchQueryChange,
  weights,
  onWeightChange,
  broadMatch,
  onBroadMatchChange,
}: SearchFiltersPanelProps) {
  const parsed = PARSED_SEARCH_CRITERIA;

  return (
    <aside className="flex flex-col gap-5 w-64 flex-shrink-0">
      {/* Search input */}
      <div>
        <input
          type="text"
          placeholder="Enter search criteria..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className="w-full h-9 px-3 rounded-lg border border-[var(--color-border)] bg-white text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 transition-colors duration-150"
        />
      </div>

      {/* AI Parsed criteria */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-card p-4 space-y-2">
        <p className="text-xs font-semibold text-[var(--color-primary)]">
          AI parsed your search
        </p>
        <ul className="space-y-1 text-xs text-[var(--color-text-muted)]">
          <li>
            <span className="text-[var(--color-text-primary)]">Role/Title:</span>{' '}
            {parsed.role}
          </li>
          <li>
            <span className="text-[var(--color-text-primary)]">Location:</span>{' '}
            {parsed.location}
          </li>
          <li>
            <span className="text-[var(--color-text-primary)]">Years of Experience:</span>{' '}
            {parsed.yearsOfExperience}
          </li>
          <li>
            <span className="text-[var(--color-text-primary)]">Skills:</span>{' '}
            {parsed.skills}
          </li>
          <li>
            <span className="text-[var(--color-text-primary)]">Industry:</span>{' '}
            {parsed.industry}
          </li>
        </ul>
      </div>

      {/* Criteria Weights */}
      <div className="space-y-4">
        <p className="text-xs font-semibold text-[var(--color-primary)]">
          Editable Criteria Weights
        </p>
        {weights.map((weight) => (
          <Slider
            key={weight.key}
            label={weight.label}
            value={weight.value}
            onChange={(val) => onWeightChange(weight.key, val)}
          />
        ))}
      </div>

      {/* Match Type */}
      <div className="space-y-2 pt-1 border-t border-[var(--color-border)]">
        <p className="text-xs font-semibold text-[var(--color-primary)]">
          Match Type
        </p>
        <Toggle
          label="Broad Match"
          checked={broadMatch}
          onChange={onBroadMatchChange}
        />
      </div>
    </aside>
  );
}
