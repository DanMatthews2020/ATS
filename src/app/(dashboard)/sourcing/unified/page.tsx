'use client';

import { useState } from 'react';
import {
  Globe,
  Search,
  Filter,
  Download,
  X,
  MapPin,
  Clock,
  Briefcase,
  ExternalLink,
  BookmarkPlus,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';

// ─── Mock data ────────────────────────────────────────────────────────────────

const CHANNELS = ['All Channels', 'LinkedIn', 'GitHub', 'Internal Pool', 'Referrals'];

const MOCK_RESULTS = [
  {
    id: 'u1',
    name: 'Jordan Lee',
    title: 'Senior Frontend Engineer',
    company: 'Stripe',
    location: 'San Francisco, CA',
    yearsExp: 7,
    channel: 'LinkedIn',
    matchScore: 94,
    skills: ['React', 'TypeScript', 'GraphQL', 'Design Systems'],
  },
  {
    id: 'u2',
    name: 'Mia Tanaka',
    title: 'Staff Engineer',
    company: 'Vercel',
    location: 'Remote',
    yearsExp: 9,
    channel: 'GitHub',
    matchScore: 91,
    skills: ['Next.js', 'Rust', 'Open Source', 'Performance'],
  },
  {
    id: 'u3',
    name: 'Ethan Brooks',
    title: 'Product Engineer',
    company: 'Linear',
    location: 'New York, NY',
    yearsExp: 5,
    channel: 'Internal Pool',
    matchScore: 86,
    skills: ['React', 'Node.js', 'Product Thinking', 'APIs'],
  },
  {
    id: 'u4',
    name: 'Aria Ndiaye',
    title: 'Frontend Developer',
    company: 'Shopify',
    location: 'Toronto, Canada',
    yearsExp: 4,
    channel: 'Referrals',
    matchScore: 82,
    skills: ['Vue.js', 'TypeScript', 'Tailwind CSS', 'Testing'],
  },
];

const CHANNEL_BADGE: Record<string, 'default' | 'info' | 'success' | 'warning'> = {
  LinkedIn: 'info',
  GitHub: 'default',
  'Internal Pool': 'success',
  Referrals: 'warning',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UnifiedSearchPage() {
  const [query, setQuery] = useState('');
  const [activeChannel, setActiveChannel] = useState('All Channels');
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [showChannelMenu, setShowChannelMenu] = useState(false);

  function toggleSave(id: string) {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filtered =
    activeChannel === 'All Channels'
      ? MOCK_RESULTS
      : MOCK_RESULTS.filter((r) => r.channel === activeChannel);

  return (
    <div className="p-8 flex-1">

      {/* ── Page header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Globe size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] leading-tight">
              Unified Search
            </h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
              Search all sourcing channels from one place
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="md">
            <Filter size={14} />
            Filters
          </Button>
          <Button variant="secondary" size="md">
            <Download size={14} />
            Export
          </Button>
        </div>
      </div>

      {/* ── Search bar ──────────────────────────────────────────────────── */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across LinkedIn, GitHub, internal pool, and more..."
            className="w-full h-10 pl-9 pr-4 text-sm rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent shadow-sm transition-shadow"
          />
        </div>
        <Button variant="primary" size="md">
          <Search size={14} />
          Search
        </Button>
      </div>

      {/* ── Channel filter tabs ─────────────────────────────────────────── */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
        {CHANNELS.map((ch) => (
          <button
            key={ch}
            onClick={() => setActiveChannel(ch)}
            className={[
              'px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors duration-100 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30',
              activeChannel === ch
                ? 'bg-[var(--color-primary)] text-white'
                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-primary)]',
            ].join(' ')}
          >
            {ch}
          </button>
        ))}
      </div>

      {/* ── Controls row ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-[var(--color-text-muted)]">
          Showing{' '}
          <span className="font-semibold text-[var(--color-text-primary)]">{filtered.length}</span>{' '}
          results
          {activeChannel !== 'All Channels' && (
            <>
              {' '}from{' '}
              <span className="font-semibold text-[var(--color-text-primary)]">{activeChannel}</span>
              <button
                onClick={() => setActiveChannel('All Channels')}
                className="ml-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                aria-label="Clear channel filter"
              >
                <X size={11} />
              </button>
            </>
          )}
        </p>

        {/* Sort */}
        <div className="relative">
          <button
            onClick={() => setShowChannelMenu((v) => !v)}
            className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium bg-white border border-[var(--color-border)] rounded-lg shadow-sm hover:border-neutral-300 transition-colors"
          >
            Best Match
            <ChevronDown size={11} />
          </button>
          {showChannelMenu && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-[var(--color-border)] rounded-xl shadow-card-hover z-10">
              {['Best Match', 'Most Experience', 'Recently Active', 'Name A–Z'].map((opt) => (
                <button
                  key={opt}
                  onClick={() => setShowChannelMenu(false)}
                  className="w-full text-left px-3 py-2 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)] transition-colors first:rounded-t-xl last:rounded-b-xl"
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Results list ────────────────────────────────────────────────── */}
      <ul className="space-y-3">
        {filtered.map((person) => {
          const saved = savedIds.has(person.id);
          const scoreColor =
            person.matchScore >= 90
              ? 'text-emerald-600'
              : person.matchScore >= 80
                ? 'text-amber-600'
                : 'text-[var(--color-text-muted)]';

          return (
            <li key={person.id}>
              <div className="bg-white border border-[var(--color-border)] rounded-2xl px-5 py-4 shadow-card hover:shadow-card-hover hover:border-neutral-300 transition-all duration-150">
                <div className="flex items-center gap-4">
                  <Avatar name={person.name} size="md" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                        {person.name}
                      </p>
                      <Badge variant={CHANNEL_BADGE[person.channel] ?? 'default'}>
                        {person.channel}
                      </Badge>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      {person.title} at {person.company}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                        <MapPin size={10} />
                        {person.location}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                        <Clock size={10} />
                        {person.yearsExp} years exp.
                      </span>
                      <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                        <Briefcase size={10} />
                        Engineering
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
                        onClick={() => toggleSave(person.id)}
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
        })}
      </ul>
    </div>
  );
}
