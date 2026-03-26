'use client';

import {
  useState, useEffect, useCallback, useRef,
  type FormEvent, type DragEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Plus, Search, X, Loader2, Upload,
  FileText, CheckCircle2, AlertCircle, ChevronDown,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { candidatesApi, type CandidateListDto, type ParsedCvData } from '@/lib/api';
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

const SELECT_CLASS =
  'w-full h-10 px-3.5 text-sm rounded-xl border border-[var(--color-border)] bg-white ' +
  'text-[var(--color-text-primary)] focus:outline-none focus:ring-2 ' +
  'focus:ring-[var(--color-primary)] focus:border-transparent transition-shadow appearance-none';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CandidatesPage() {
  const router        = useRouter();
  const { showToast } = useToast();

  const [candidates, setCandidates]     = useState<CandidateListDto[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [error, setError]               = useState('');
  const [searchInput, setSearchInput]   = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [showDrawer, setShowDrawer]     = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
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

  // ── Debounced search ──────────────────────────────────────────────────────
  function handleSearchChange(value: string) {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value === '') { fetchCandidates(undefined); return; }
    debounceRef.current = setTimeout(() => {
      fetchCandidates(value.trim() || undefined);
    }, 400);
  }

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = candidates.filter((c) => {
    if (activeFilter === 'all') return true;
    return (c.latestStatus as CandidateStatus | undefined) === activeFilter;
  });

  function tabCount(key: FilterKey) {
    if (key === 'all') return candidates.length;
    return candidates.filter((c) => (c.latestStatus as CandidateStatus | undefined) === key).length;
  }

  function handleCandidateAdded() {
    setShowDrawer(false);
    showToast('Candidate added successfully');
    fetchCandidates(searchInput.trim() || undefined);
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
            <Button variant="primary" size="md" onClick={() => setShowDrawer(true)}>
              <Plus size={15} />
              Add Candidate
            </Button>
          </div>

          {/* Search bar — debounced */}
          <div className="relative mb-5">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name or email…"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full h-10 pl-9 pr-4 text-sm rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-shadow"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-0.5 mb-6 border-b border-[var(--color-border)]">
            {FILTER_TABS.map((tab) => {
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
                    {tabCount(tab.key)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Content */}
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
                const status    = statusKey ? STATUS_CONFIG[statusKey] : null;
                return (
                  <li key={candidate.id}>
                    <button
                      onClick={() => router.push(`/candidates/${candidate.id}`)}
                      className="w-full text-left bg-white border border-[var(--color-border)] rounded-2xl px-5 py-4 flex items-center gap-5 shadow-card hover:shadow-card-hover hover:border-neutral-300 transition-all duration-150"
                    >
                      <Avatar name={candidate.name} size="md" />
                      <div className="w-48 flex-shrink-0">
                        <p className="text-sm font-semibold text-[var(--color-text-primary)]">{candidate.name}</p>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{candidate.latestJobTitle ?? 'No applications yet'}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <a href={`mailto:${candidate.email}`} onClick={(e) => e.stopPropagation()} className="text-sm text-blue-600 hover:underline truncate block">
                          {candidate.email}
                        </a>
                        {candidate.location && (
                          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{candidate.location}</p>
                        )}
                      </div>
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
                      <div className="flex-shrink-0">
                        {status ? <Badge variant={status.variant}>{status.label}</Badge> : <span className="text-xs text-[var(--color-text-muted)]">—</span>}
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
                {searchInput ? 'Try a different search term' : 'Add your first candidate to get started'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Candidate Drawer */}
      <AddCandidateDrawer
        open={showDrawer}
        onClose={() => setShowDrawer(false)}
        onSuccess={handleCandidateAdded}
      />
    </>
  );
}

// ─── Add Candidate Drawer ────────────────────────────────────────────────────

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ManualForm {
  firstName: string; lastName: string; email: string;
  phone: string; linkedInUrl: string; location: string;
  title: string; company: string;
  skills: string; source: string; notes: string;
}

const EMPTY_FORM: ManualForm = {
  firstName: '', lastName: '', email: '',
  phone: '', linkedInUrl: '', location: '',
  title: '', company: '',
  skills: '', source: 'JOB_BOARD', notes: '',
};

type UploadState = 'idle' | 'dragging' | 'parsing' | 'success' | 'error';

function AddCandidateDrawer({ open, onClose, onSuccess }: DrawerProps) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab]     = useState<'cv' | 'manual'>('cv');
  const [form, setForm]               = useState<ManualForm>(EMPTY_FORM);
  const [errors, setErrors]           = useState<Partial<ManualForm>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // CV upload state
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parseErrorMsg, setParseErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formBodyRef = useRef<HTMLDivElement>(null);

  // Reset when drawer closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setActiveTab('cv');
        setForm(EMPTY_FORM);
        setErrors({});
        setUploadState('idle');
        setUploadedFile(null);
        setParseErrorMsg('');
      }, 300);
    }
  }, [open]);

  function updateField(field: keyof ManualForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  }

  // ── CV parsing ─────────────────────────────────────────────────────────────
  async function handleFileSelected(file: File) {
    const allowed = ['application/pdf', 'text/plain'];
    if (!allowed.includes(file.type)) {
      setParseErrorMsg('Only PDF and plain-text files are supported.');
      setUploadState('error');
      return;
    }
    setUploadedFile(file);
    setUploadState('parsing');
    setParseErrorMsg('');
    try {
      const result = await candidatesApi.parseCv(file);
      const p: ParsedCvData = result.parsed;
      setForm((prev) => ({
        ...prev,
        firstName:   p.firstName   ?? prev.firstName,
        lastName:    p.lastName    ?? prev.lastName,
        email:       p.email       ?? prev.email,
        phone:       p.phone       ?? prev.phone,
        linkedInUrl: p.linkedInUrl ?? prev.linkedInUrl,
        location:    p.location    ?? prev.location,
        title:       p.title       ?? prev.title,
        company:     p.company     ?? prev.company,
        skills:      p.skills.length ? p.skills.join(', ') : prev.skills,
        source:      'AI_SOURCED',
      }));
      setUploadState('success');
      setActiveTab('manual');
      showToast('CV parsed — review the auto-filled details below');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      // Use the server's descriptive message if available, otherwise provide a helpful fallback
      if (msg && msg.length > 0) {
        setParseErrorMsg(msg);
      } else {
        setParseErrorMsg('Could not parse this CV. Please fill in the details manually.');
      }
      setUploadState('error');
      setActiveTab('manual');
    }
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setUploadState('dragging');
  }
  function handleDragLeave() {
    if (uploadState === 'dragging') setUploadState('idle');
  }
  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelected(file);
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: Partial<ManualForm> = {};
    if (!form.firstName.trim()) newErrors.firstName = 'Required';
    if (!form.lastName.trim())  newErrors.lastName  = 'Required';
    if (!form.email.trim()) {
      newErrors.email = 'Required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      newErrors.email = 'Enter a valid email address';
    }
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      // Scroll to the top of the form so validation errors are visible
      formBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);
    try {
      await candidatesApi.createCandidate({
        firstName:   form.firstName.trim(),
        lastName:    form.lastName.trim(),
        email:       form.email.trim(),
        phone:       form.phone.trim()       || undefined,
        linkedInUrl: form.linkedInUrl.trim() || undefined,
        location:    form.location.trim()    || undefined,
        source:      form.source             || undefined,
        skills:      form.skills ? form.skills.split(',').map((s) => s.trim()).filter(Boolean) : [],
      });
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add candidate';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className={[
          'fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add Candidate"
        className={[
          'fixed right-0 top-0 h-full w-[540px] bg-white z-50 shadow-2xl flex flex-col',
          'transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--color-border)] flex-shrink-0">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Add Candidate</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--color-border)] flex-shrink-0">
          {(['cv', 'manual'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={[
                'flex-1 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === tab
                  ? 'border-[var(--color-primary)] text-[var(--color-text-primary)]'
                  : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]',
              ].join(' ')}
            >
              {tab === 'cv' ? 'Upload CV' : 'Manual Entry'}
            </button>
          ))}
        </div>

        {/* Body */}
        {activeTab === 'cv' ? (
          <div className="flex-1 overflow-y-auto">
            <CvUploadTab
              uploadState={uploadState}
              uploadedFile={uploadedFile}
              parseErrorMsg={parseErrorMsg}
              fileInputRef={fileInputRef}
              onFileSelected={handleFileSelected}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onSwitchToManual={() => setActiveTab('manual')}
            />
          </div>
        ) : (
          /* Form wraps both the scrollable fields AND the footer so the submit
             button is naturally inside the form — no cross-form id reference needed */
          <form onSubmit={handleSubmit} noValidate className="flex flex-col flex-1 overflow-hidden">
            <div ref={formBodyRef} className="flex-1 overflow-y-auto p-6 space-y-4">
              {uploadState === 'success' && (
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
                  <CheckCircle2 size={15} className="flex-shrink-0 text-emerald-600" />
                  CV parsed — fields auto-filled. Review and confirm below.
                </div>
              )}
              {uploadState === 'error' && parseErrorMsg && (
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
                  <AlertCircle size={15} className="flex-shrink-0 text-amber-600" />
                  {parseErrorMsg}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Input label="First Name *" placeholder="Jane" value={form.firstName} onChange={(e) => updateField('firstName', e.target.value)} error={errors.firstName} />
                <Input label="Last Name *"  placeholder="Smith" value={form.lastName}  onChange={(e) => updateField('lastName',  e.target.value)} error={errors.lastName}  />
              </div>
              <Input label="Email *" type="email" placeholder="jane@example.com" value={form.email} onChange={(e) => updateField('email', e.target.value)} error={errors.email} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Phone" placeholder="+1 555 0123" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />
                <Input label="Location" placeholder="New York, NY" value={form.location} onChange={(e) => updateField('location', e.target.value)} />
              </div>
              <Input label="LinkedIn URL" placeholder="https://linkedin.com/in/…" value={form.linkedInUrl} onChange={(e) => updateField('linkedInUrl', e.target.value)} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Current Title" placeholder="Senior Engineer" value={form.title} onChange={(e) => updateField('title', e.target.value)} hint="Display only — not saved to profile yet" />
                <Input label="Current Company" placeholder="Acme Corp" value={form.company} onChange={(e) => updateField('company', e.target.value)} hint="Display only — not saved to profile yet" />
              </div>
              <Input label="Skills (comma-separated)" placeholder="React, TypeScript, Node.js" value={form.skills} onChange={(e) => updateField('skills', e.target.value)} />
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Source</label>
                <select value={form.source} onChange={(e) => updateField('source', e.target.value)} className={SELECT_CLASS}>
                  <option value="JOB_BOARD">Job Board</option>
                  <option value="REFERRAL">Referral</option>
                  <option value="DIRECT">Direct</option>
                  <option value="AGENCY">Agency</option>
                  <option value="AI_SOURCED">AI Sourced</option>
                </select>
              </div>
              <Input label="Notes" multiline rows={3} placeholder="Any relevant notes about this candidate…" value={form.notes} onChange={(e) => updateField('notes', e.target.value)} hint="Attached to their first application when one is created." />
            </div>

            {/* Footer is inside the form — button is a natural type="submit" */}
            <div className="p-6 border-t border-[var(--color-border)] flex gap-3 flex-shrink-0">
              <Button type="button" variant="secondary" size="md" className="flex-1 justify-center" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="md" className="flex-1 justify-center" isLoading={isSubmitting}>
                Add Candidate
              </Button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}

// ─── CV Upload Tab ────────────────────────────────────────────────────────────

interface CvUploadTabProps {
  uploadState: UploadState;
  uploadedFile: File | null;
  parseErrorMsg: string;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileSelected: (f: File) => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  onSwitchToManual: () => void;
}

function CvUploadTab({
  uploadState, uploadedFile, parseErrorMsg,
  fileInputRef, onFileSelected, onDragOver, onDragLeave, onDrop, onSwitchToManual,
}: CvUploadTabProps) {
  const isDragging = uploadState === 'dragging';
  const isParsing  = uploadState === 'parsing';
  const isSuccess  = uploadState === 'success';
  const isError    = uploadState === 'error';

  return (
    <div className="p-6 space-y-5">
      <p className="text-sm text-[var(--color-text-muted)]">
        Upload a CV to automatically extract candidate information. Supports PDF and plain text files up to 5 MB.
      </p>

      {/* Drop zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !isParsing && fileInputRef.current?.click()}
        className={[
          'relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12',
          'transition-colors duration-150 cursor-pointer select-none',
          isDragging  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' : '',
          isParsing   ? 'border-[var(--color-border)] bg-[var(--color-surface)] cursor-wait' : '',
          isSuccess   ? 'border-emerald-300 bg-emerald-50' : '',
          isError     ? 'border-red-300 bg-red-50' : '',
          !isDragging && !isParsing && !isSuccess && !isError
            ? 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5'
            : '',
        ].join(' ')}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt"
          className="sr-only"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileSelected(f); }}
        />

        {isParsing ? (
          <>
            <Loader2 size={32} className="animate-spin text-[var(--color-primary)] mb-3" />
            <p className="text-sm font-medium text-[var(--color-text-primary)]">Parsing CV with Claude…</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">This usually takes a few seconds</p>
          </>
        ) : isSuccess ? (
          <>
            <CheckCircle2 size={32} className="text-emerald-500 mb-3" />
            <p className="text-sm font-medium text-emerald-800">Parsed successfully</p>
            <p className="text-xs text-emerald-600 mt-1">{uploadedFile?.name}</p>
          </>
        ) : isError ? (
          <>
            <AlertCircle size={32} className="text-red-400 mb-3" />
            <p className="text-sm font-medium text-red-700">Parsing failed</p>
            {uploadedFile && <p className="text-xs text-red-500 mt-0.5">{uploadedFile.name}</p>}
            <p className="text-xs text-[var(--color-text-muted)] mt-2 text-center">{parseErrorMsg}</p>
          </>
        ) : (
          <>
            <div className={['w-12 h-12 rounded-xl flex items-center justify-center mb-3', isDragging ? 'bg-[var(--color-primary)]' : 'bg-white border border-[var(--color-border)] shadow-card'].join(' ')}>
              <Upload size={20} className={isDragging ? 'text-white' : 'text-[var(--color-text-muted)]'} />
            </div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">
              {isDragging ? 'Drop to upload' : 'Drag & drop a CV here'}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">or click to browse — PDF or TXT, up to 5 MB</p>
          </>
        )}
      </div>

      {uploadedFile && !isParsing && (
        <div className="flex items-center gap-3 px-4 py-3 bg-white border border-[var(--color-border)] rounded-xl text-sm">
          <FileText size={15} className="text-[var(--color-text-muted)] flex-shrink-0" />
          <span className="flex-1 truncate text-[var(--color-text-primary)]">{uploadedFile.name}</span>
          <span className="text-xs text-[var(--color-text-muted)]">{(uploadedFile.size / 1024).toFixed(0)} KB</span>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[var(--color-border)]" />
        <span className="text-xs text-[var(--color-text-muted)]">or</span>
        <div className="flex-1 h-px bg-[var(--color-border)]" />
      </div>

      <Button variant="secondary" size="md" className="w-full justify-center" onClick={onSwitchToManual}>
        Fill in manually
      </Button>
    </div>
  );
}
