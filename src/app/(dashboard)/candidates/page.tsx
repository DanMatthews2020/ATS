'use client';

import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Plus, Search, X, Loader2 } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { candidatesApi, type CandidateListDto } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import type { CandidateStatus, BadgeVariant } from '@/types';

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<CandidateStatus, { label: string; variant: BadgeVariant }> = {
  new:       { label: 'Available',    variant: 'info' },
  screening: { label: 'In Review',    variant: 'default' },
  interview: { label: 'Interviewing', variant: 'warning' },
  offer:     { label: 'Offer Sent',   variant: 'success' },
  hired:     { label: 'Hired',        variant: 'success' },
  rejected:  { label: 'Rejected',     variant: 'error' },
};

type FilterKey = CandidateStatus | 'all';

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: 'all',       label: 'All' },
  { key: 'new',       label: 'Available' },
  { key: 'screening', label: 'In Review' },
  { key: 'interview', label: 'Interviewing' },
  { key: 'offer',     label: 'Offer Sent' },
  { key: 'hired',     label: 'Hired' },
  { key: 'rejected',  label: 'Rejected' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CandidatesPage() {
  const router  = useRouter();
  const { showToast } = useToast();

  const [candidates, setCandidates]   = useState<CandidateListDto[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [error, setError]             = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // ── Fetch candidates ────────────────────────────────────────────────────────
  const fetchCandidates = useCallback(async (search?: string) => {
    setIsLoading(true);
    setError('');
    try {
      const result = await candidatesApi.getCandidates(1, 100, search);
      setCandidates(result.items);
    } catch {
      setError('Failed to load candidates. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchCandidates(); }, [fetchCandidates]);

  function handleSearch() {
    setSearchQuery(searchInput);
    fetchCandidates(searchInput.trim() || undefined);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSearch();
  }

  function handleClearSearch() {
    setSearchInput('');
    setSearchQuery('');
    fetchCandidates(undefined);
  }

  // ── Filter ──────────────────────────────────────────────────────────────────
  const filtered = candidates.filter((c) => {
    if (activeFilter === 'all') return true;
    return (c.latestStatus as CandidateStatus | undefined) === activeFilter;
  });

  function tabCount(key: FilterKey): number {
    if (key === 'all') return candidates.length;
    return candidates.filter((c) => (c.latestStatus as CandidateStatus | undefined) === key).length;
  }

  // ── After add ───────────────────────────────────────────────────────────────
  function handleCandidateAdded() {
    setShowAddModal(false);
    showToast('Candidate added successfully');
    fetchCandidates(searchQuery || undefined);
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
                  {isLoading ? 'Loading…' : `${candidates.length} candidates total`}
                </p>
              </div>
            </div>
            <Button variant="primary" size="md" onClick={() => setShowAddModal(true)}>
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
                placeholder="Search by name or email…"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  if (e.target.value === '') handleClearSearch();
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
                  <span className={['ml-1.5 text-xs tabular-nums', isActive ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text-muted)]/60'].join(' ')}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* States */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-[var(--color-text-muted)]" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-sm font-semibold text-red-600">{error}</p>
              <Button variant="secondary" size="sm" className="mt-3" onClick={() => fetchCandidates()}>
                Retry
              </Button>
            </div>
          ) : filtered.length > 0 ? (
            <ul className="space-y-3">
              {filtered.map((candidate) => {
                const statusKey = candidate.latestStatus as CandidateStatus | undefined;
                const status = statusKey ? STATUS_CONFIG[statusKey] : null;
                return (
                  <li key={candidate.id}>
                    <button
                      onClick={() => router.push(`/candidates/${candidate.id}`)}
                      className="w-full text-left bg-white border border-[var(--color-border)] rounded-2xl px-5 py-4 flex items-center gap-5 shadow-card hover:shadow-card-hover hover:border-neutral-300 transition-all duration-150 group"
                    >
                      <Avatar name={candidate.name} size="md" />

                      {/* Name + role */}
                      <div className="w-48 flex-shrink-0">
                        <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                          {candidate.name}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                          {candidate.latestJobTitle ?? 'No applications yet'}
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
                        {candidate.location && (
                          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{candidate.location}</p>
                        )}
                      </div>

                      {/* Skills */}
                      {candidate.skills.length > 0 && (
                        <div className="hidden lg:flex items-center gap-1.5 flex-shrink-0">
                          {candidate.skills.slice(0, 3).map((skill) => (
                            <span key={skill} className="px-2 py-0.5 text-xs bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md text-[var(--color-text-muted)]">
                              {skill}
                            </span>
                          ))}
                          {candidate.skills.length > 3 && (
                            <span className="text-xs text-[var(--color-text-muted)]">+{candidate.skills.length - 3}</span>
                          )}
                        </div>
                      )}

                      {/* Status badge */}
                      <div className="flex-shrink-0">
                        {status ? (
                          <Badge variant={status.variant}>{status.label}</Badge>
                        ) : (
                          <span className="text-xs text-[var(--color-text-muted)]">—</span>
                        )}
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
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">No candidates found</p>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">
                {searchQuery ? 'Try adjusting your search' : 'Add your first candidate to get started'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Candidate Modal */}
      {showAddModal && (
        <AddCandidateModal
          onClose={() => setShowAddModal(false)}
          onSuccess={handleCandidateAdded}
        />
      )}
    </>
  );
}

// ─── Add Candidate Modal ──────────────────────────────────────────────────────

interface AddCandidateModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function AddCandidateModal({ onClose, onSuccess }: AddCandidateModalProps) {
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '',
    phone: '', location: '', skills: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!form.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!form.lastName.trim())  newErrors.lastName  = 'Last name is required';
    if (!form.email.trim())     newErrors.email     = 'Email is required';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    setIsSubmitting(true);
    try {
      await candidatesApi.createCandidate({
        firstName: form.firstName.trim(),
        lastName:  form.lastName.trim(),
        email:     form.email.trim(),
        phone:     form.phone.trim() || undefined,
        location:  form.location.trim() || undefined,
        skills:    form.skills ? form.skills.split(',').map((s) => s.trim()).filter(Boolean) : [],
      });
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add candidate';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add Candidate"
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-2xl shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--color-border)]">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Add Candidate</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              placeholder="Jane"
              value={form.firstName}
              onChange={(e) => update('firstName', e.target.value)}
              error={errors.firstName}
            />
            <Input
              label="Last Name"
              placeholder="Smith"
              value={form.lastName}
              onChange={(e) => update('lastName', e.target.value)}
              error={errors.lastName}
            />
          </div>
          <Input
            label="Email"
            type="email"
            placeholder="jane@example.com"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            error={errors.email}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone (optional)"
              placeholder="+1 555 0123"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
            />
            <Input
              label="Location (optional)"
              placeholder="New York, NY"
              value={form.location}
              onChange={(e) => update('location', e.target.value)}
            />
          </div>
          <Input
            label="Skills (optional, comma-separated)"
            placeholder="React, TypeScript, Node.js"
            value={form.skills}
            onChange={(e) => update('skills', e.target.value)}
          />

          <div className="flex gap-2.5 pt-1">
            <Button type="button" variant="secondary" size="md" className="flex-1 justify-center" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" className="flex-1 justify-center" isLoading={isSubmitting}>
              Add Candidate
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
