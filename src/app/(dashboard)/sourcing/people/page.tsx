'use client';

import { useState } from 'react';
import {
  Search,
  X,
  MapPin,
  Clock,
  Briefcase,
  BookmarkPlus,
  ExternalLink,
  Sparkles,
  ChevronDown,
  Users,
  SlidersHorizontal,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { MOCK_PEOPLE_SEARCH_RESULTS } from '@/lib/constants';
import type { PersonResult } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Weights {
  skillsFit: number;
  industryRelevance: number;
  seniority: number;
  leadership: number;
  signals: number;
}

interface Chip {
  id: string;
  label: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_CHIPS: Chip[] = [
  { id: 'role', label: 'Senior Scientist' },
  { id: 'location', label: 'Australia' },
  { id: 'exp', label: '8+ Years' },
];

const DEFAULT_WEIGHTS: Weights = {
  skillsFit: 70,
  industryRelevance: 55,
  seniority: 45,
  leadership: 50,
  signals: 50,
};

const WEIGHT_KEYS: { key: keyof Weights; label: string }[] = [
  { key: 'skillsFit', label: 'Skills Fit' },
  { key: 'industryRelevance', label: 'Industry Relevance' },
  { key: 'seniority', label: 'Seniority' },
  { key: 'leadership', label: 'Leadership' },
  { key: 'signals', label: 'Signals / Engagement' },
];

const SORT_OPTIONS = ['Best Match', 'Most Experience', 'Recently Active', 'Name A–Z'];

const PARSED_TAGS = [
  { label: 'Role / Title', value: 'Senior Scientist' },
  { label: 'Location', value: 'Australia' },
  { label: 'Years of Experience', value: '8+' },
  { label: 'Skills', value: 'Research Leadership' },
  { label: 'Industry', value: 'Biotech' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PeopleSearchPage() {
  const [query, setQuery] = useState(
    'Senior Scientist | Australia | 8+ Years | Research Leadership | Biotech',
  );
  const [chips, setChips] = useState<Chip[]>(DEFAULT_CHIPS);
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [broadMatch, setBroadMatch] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState('Best Match');
  const [showSortMenu, setShowSortMenu] = useState(false);

  function removeChip(id: string) {
    setChips((prev) => prev.filter((c) => c.id !== id));
  }

  function toggleSave(id: string) {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function setWeight(key: keyof Weights, value: number) {
    setWeights((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="p-8 flex-1">

      {/* ── Page header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 bg-[var(--color-primary)] rounded-xl flex items-center justify-center flex-shrink-0">
            <Users size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] leading-tight">
              People Search
            </h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
              AI-powered candidate sourcing across the web
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="md">
            <Download size={14} />
            Export
          </Button>
          <Button variant="primary" size="md">
            <Sparkles size={14} />
            Start Autopilot
          </Button>
        </div>
      </div>

      {/* ── Two-column layout ───────────────────────────────────────────── */}
      <div className="flex gap-6 items-start">

        {/* ── Left: filter panel ─────────────────────────────────────── */}
        <div className="w-[272px] flex-shrink-0 space-y-4">

          {/* Search input + AI parsed */}
          <Card padding="md">
            <div className="relative mb-3">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter search criteria..."
                className="w-full h-9 pl-8 pr-3 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-shadow"
              />
            </div>

            {/* AI parsed panel */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-2.5">
                <Sparkles size={11} className="text-[var(--color-accent)]" />
                <p className="text-[11px] font-semibold text-[var(--color-text-primary)]">
                  AI parsed your search
                </p>
              </div>
              <ul className="space-y-1.5">
                {PARSED_TAGS.map(({ label, value }) => (
                  <li key={label} className="flex items-start gap-1.5 text-[11px]">
                    <span className="text-[var(--color-text-muted)] w-[108px] flex-shrink-0">
                      {label}:
                    </span>
                    <span className="text-[var(--color-text-primary)] font-medium">{value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          {/* Criteria Weights */}
          <Card padding="md">
            <div className="flex items-center gap-2 mb-4">
              <SlidersHorizontal size={13} className="text-[var(--color-text-muted)]" />
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
                Criteria Weights
              </h2>
            </div>

            <div className="space-y-4">
              {WEIGHT_KEYS.map(({ key, label }) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
                    <span className="text-xs font-semibold text-[var(--color-text-primary)] tabular-nums">
                      {weights[key]}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={weights[key]}
                    onChange={(e) => setWeight(key, Number(e.target.value))}
                    className="w-full h-1 rounded-full appearance-none bg-[var(--color-border)] accent-[var(--color-primary)] cursor-pointer"
                  />
                </div>
              ))}
            </div>

            {/* Match Type toggle */}
            <div className="mt-5 pt-4 border-t border-[var(--color-border)]">
              <p className="text-xs font-semibold text-[var(--color-text-primary)] mb-2.5">
                Match Type
              </p>
              <div className="flex items-center gap-2.5">
                <button
                  role="switch"
                  aria-checked={broadMatch}
                  onClick={() => setBroadMatch((v) => !v)}
                  className={[
                    'relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]',
                    broadMatch ? 'bg-[var(--color-primary)]' : 'bg-neutral-200',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200',
                      broadMatch ? 'translate-x-[18px]' : 'translate-x-[3px]',
                    ].join(' ')}
                  />
                </button>
                <span className="text-xs text-[var(--color-text-muted)]">Broad Match</span>
              </div>
            </div>
          </Card>
        </div>

        {/* ── Right: results ─────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">

          {/* Active chips + controls row */}
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <div className="flex items-center flex-wrap gap-2">
              {chips.map((chip) => (
                <span
                  key={chip.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[var(--color-border)] rounded-lg text-xs font-medium text-[var(--color-text-primary)] shadow-sm"
                >
                  {chip.label}
                  <button
                    onClick={() => removeChip(chip.id)}
                    className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                    aria-label={`Remove ${chip.label} filter`}
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <p className="text-xs text-[var(--color-text-muted)] whitespace-nowrap">
                Evaluating{' '}
                <span className="font-semibold text-[var(--color-text-primary)]">5,000</span>
              </p>

              {/* Sort dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowSortMenu((v) => !v)}
                  className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium bg-white border border-[var(--color-border)] rounded-lg shadow-sm hover:border-neutral-300 transition-colors"
                >
                  {sortBy}
                  <ChevronDown size={11} />
                </button>
                {showSortMenu && (
                  <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-[var(--color-border)] rounded-xl shadow-card-hover z-10">
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => {
                          setSortBy(opt);
                          setShowSortMenu(false);
                        }}
                        className={[
                          'w-full text-left px-3 py-2 text-xs transition-colors first:rounded-t-xl last:rounded-b-xl',
                          sortBy === opt
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
          </div>

          {/* Results list */}
          <ul className="space-y-3">
            {MOCK_PEOPLE_SEARCH_RESULTS.map((person) => (
              <PersonCard
                key={person.id}
                person={person}
                saved={savedIds.has(person.id)}
                onSave={() => toggleSave(person.id)}
              />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ─── PersonCard ───────────────────────────────────────────────────────────────

function PersonCard({
  person,
  saved,
  onSave,
}: {
  person: PersonResult;
  saved: boolean;
  onSave: () => void;
}) {
  // Locked / blurred card
  if (person.locked) {
    return (
      <li>
        <div className="relative bg-white border border-[var(--color-border)] rounded-2xl px-5 py-4 shadow-card overflow-hidden">
          {/* Blurred skeleton content */}
          <div className="flex items-center gap-4 blur-sm select-none pointer-events-none">
            <div className="w-10 h-10 rounded-full bg-neutral-200 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-neutral-200 rounded-md w-48" />
              <div className="h-2.5 bg-neutral-100 rounded-md w-64" />
              <div className="h-2.5 bg-neutral-100 rounded-md w-40" />
            </div>
            <div className="space-y-2 flex-shrink-0">
              <div className="h-4 bg-neutral-200 rounded-md w-10" />
              <div className="h-6 bg-neutral-200 rounded-md w-20" />
            </div>
          </div>

          {/* Shortlist banner */}
          {person.savedToShortlist && (
            <div className="absolute inset-x-0 bottom-0 h-7 bg-[var(--color-primary)] flex items-center justify-center">
              <p className="text-white text-[11px] font-medium tracking-wide">
                Saved to Shortlist
              </p>
            </div>
          )}

          {/* Unlock overlay (only when NOT saved to shortlist) */}
          {!person.savedToShortlist && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/30 backdrop-blur-[1px]">
              <Button variant="primary" size="sm">
                Unlock Profile
              </Button>
            </div>
          )}
        </div>
      </li>
    );
  }

  // Match score colour
  const scoreColor =
    person.matchScore >= 90
      ? 'text-emerald-600'
      : person.matchScore >= 80
        ? 'text-amber-600'
        : 'text-[var(--color-text-muted)]';

  return (
    <li>
      <div className="bg-white border border-[var(--color-border)] rounded-2xl px-5 py-4 shadow-card hover:shadow-card-hover hover:border-neutral-300 transition-all duration-150">
        <div className="flex items-center gap-4">
          <Avatar name={person.name} size="md" />

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
              {person.name}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              {person.title} at {person.company}
            </p>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                <MapPin size={10} aria-hidden="true" />
                {person.location}
              </span>
              <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                <Clock size={10} aria-hidden="true" />
                {person.yearsExp} years exp.
              </span>
              <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                <Briefcase size={10} aria-hidden="true" />
                {person.industry}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {person.skills.slice(0, 4).map((skill) => (
                <span
                  key={skill}
                  className="px-2 py-0.5 text-[11px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md text-[var(--color-text-muted)]"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <div className="text-right">
              <p className={`text-2xl font-bold leading-none tabular-nums ${scoreColor}`}>
                {person.matchScore}%
              </p>
              <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">match</p>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Button variant="primary" size="sm">
                <ExternalLink size={11} />
                Open Profile
              </Button>
              <Button
                variant={saved ? 'primary' : 'secondary'}
                size="sm"
                onClick={onSave}
              >
                <BookmarkPlus size={11} />
                {saved ? 'Saved' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}
