'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  X, Mail, Phone, Linkedin, FileText, Star, Plus, Pencil, Trash2,
  ChevronDown, ExternalLink, MapPin, Briefcase, Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import {
  candidatesApi,
  candidatePanelApi,
  type CandidateDetailDto,
  type CandidateNoteDto,
  type FeedEventDto,
  type CandidateFeedbackDto,
} from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

// ─── Props ────────────────────────────────────────────────────────────────────

interface CandidatePanelProps {
  candidateId: string | null;
  applicationId?: string;
  onClose: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDate(ts: string): string {
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const FEED_COLORS: Record<string, string> = {
  applied:              'bg-blue-500',
  stage_changed:        'bg-violet-500',
  interview_scheduled:  'bg-amber-500',
  interview_completed:  'bg-green-500',
  offer_sent:           'bg-orange-500',
  offer_accepted:       'bg-emerald-500',
  offer_rejected:       'bg-red-500',
  note_added:           'bg-neutral-400',
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  new:        { label: 'New',        cls: 'bg-blue-100 text-blue-700' },
  screening:  { label: 'Screening',  cls: 'bg-purple-100 text-purple-700' },
  interview:  { label: 'Interview',  cls: 'bg-amber-100 text-amber-700' },
  offer:      { label: 'Offer',      cls: 'bg-orange-100 text-orange-700' },
  hired:      { label: 'Hired',      cls: 'bg-emerald-100 text-emerald-700' },
  rejected:   { label: 'Rejected',   cls: 'bg-red-100 text-red-700' },
};

function StageBadge({ status }: { status: string }) {
  const cfg = STATUS_BADGE[status] ?? { label: status, cls: 'bg-neutral-100 text-neutral-700' };
  return (
    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

// ─── Skeleton rows ────────────────────────────────────────────────────────────

function SkeletonRows({ count }: { count: number }) {
  return (
    <div className="animate-pulse space-y-3 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-3 items-start">
          <div className="w-2 h-2 rounded-full bg-neutral-200 mt-1.5 flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-neutral-200 rounded w-3/4" />
            <div className="h-2.5 bg-neutral-100 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SkeletonCards({ count }: { count: number }) {
  return (
    <div className="animate-pulse space-y-3 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border border-[var(--color-border)] rounded-xl p-4 space-y-2">
          <div className="h-3.5 bg-neutral-200 rounded w-1/2" />
          <div className="h-3 bg-neutral-100 rounded w-3/4" />
          <div className="h-3 bg-neutral-100 rounded w-full" />
        </div>
      ))}
    </div>
  );
}

// ─── Tab list ─────────────────────────────────────────────────────────────────

const LEFT_TABS  = ['Activities & Progress', 'Summary', 'Resume'] as const;
const RIGHT_TABS = ['Feed', 'Notes', 'Feedback', 'Emails', 'Texts', 'Referrals', 'Forms'] as const;

type LeftTab  = typeof LEFT_TABS[number];
type RightTab = typeof RIGHT_TABS[number];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CandidatePanel({ candidateId, applicationId, onClose }: CandidatePanelProps) {
  const { showToast } = useToast();

  // Animation
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (candidateId) {
      // Micro-delay so the transform starts from off-screen
      const t = setTimeout(() => setVisible(true), 16);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [candidateId]);

  // Candidate data
  const [candidate, setCandidate] = useState<CandidateDetailDto | null>(null);
  const [loadingCandidate, setLoadingCandidate] = useState(false);
  const [candidateError, setCandidateError] = useState('');

  // Tags
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const tagInputRef = useRef<HTMLInputElement>(null);

  // Tabs
  const [leftTab, setLeftTab]   = useState<LeftTab>('Activities & Progress');
  const [rightTab, setRightTab] = useState<RightTab>('Feed');

  // Right column lazy data
  const [feedData, setFeedData]         = useState<FeedEventDto[] | null>(null);
  const [feedLoading, setFeedLoading]   = useState(false);
  const [feedError, setFeedError]       = useState('');
  const loadedTabs = useRef<Set<RightTab>>(new Set());

  const [notesData, setNotesData]       = useState<CandidateNoteDto[] | null>(null);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError]     = useState('');
  const [newNoteText, setNewNoteText]   = useState('');
  const [savingNote, setSavingNote]     = useState(false);
  const [editNoteId, setEditNoteId]     = useState<string | null>(null);
  const [editNoteText, setEditNoteText] = useState('');

  const [feedbackData, setFeedbackData]     = useState<CandidateFeedbackDto[] | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError]   = useState('');

  // More dropdown
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Load candidate when id changes
  useEffect(() => {
    if (!candidateId) {
      setCandidate(null);
      setTags([]);
      setFeedData(null);
      setNotesData(null);
      setFeedbackData(null);
      loadedTabs.current.clear();
      setLeftTab('Activities & Progress');
      setRightTab('Feed');
      return;
    }

    setLoadingCandidate(true);
    setCandidateError('');
    candidatesApi.getCandidate(candidateId)
      .then((res) => {
        setCandidate(res.candidate);
        setTags(res.candidate.tags ?? []);
      })
      .catch(() => setCandidateError('Failed to load candidate.'))
      .finally(() => setLoadingCandidate(false));
  }, [candidateId]);

  // Lazy load right-tab data
  const loadFeed = useCallback(() => {
    if (!candidateId || loadedTabs.current.has('Feed')) return;
    loadedTabs.current.add('Feed');
    setFeedLoading(true);
    setFeedError('');
    candidatePanelApi.getFeed(candidateId)
      .then((res) => setFeedData(res.feed))
      .catch(() => { setFeedError('Failed to load feed.'); loadedTabs.current.delete('Feed'); })
      .finally(() => setFeedLoading(false));
  }, [candidateId]);

  const loadNotes = useCallback(() => {
    if (!candidateId || loadedTabs.current.has('Notes')) return;
    loadedTabs.current.add('Notes');
    setNotesLoading(true);
    setNotesError('');
    candidatePanelApi.getNotes(candidateId)
      .then((res) => setNotesData(res.notes))
      .catch(() => { setNotesError('Failed to load notes.'); loadedTabs.current.delete('Notes'); })
      .finally(() => setNotesLoading(false));
  }, [candidateId]);

  const loadFeedback = useCallback(() => {
    if (!candidateId || loadedTabs.current.has('Feedback')) return;
    loadedTabs.current.add('Feedback');
    setFeedbackLoading(true);
    setFeedbackError('');
    candidatePanelApi.getFeedback(candidateId)
      .then((res) => setFeedbackData(res.feedback))
      .catch(() => { setFeedbackError('Failed to load feedback.'); loadedTabs.current.delete('Feedback'); })
      .finally(() => setFeedbackLoading(false));
  }, [candidateId]);

  useEffect(() => {
    if (rightTab === 'Feed')     loadFeed();
    if (rightTab === 'Notes')    loadNotes();
    if (rightTab === 'Feedback') loadFeedback();
  }, [rightTab, loadFeed, loadNotes, loadFeedback]);

  // Keyboard close
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Tag handlers
  function addTag(val: string) {
    const t = val.trim();
    if (!t || tags.includes(t) || !candidateId) return;
    const next = [...tags, t];
    setTags(next);
    setTagInput('');
    candidatePanelApi.updateTags(candidateId, next).catch(() => {
      setTags(tags);
      showToast('Failed to save tag', 'error');
    });
  }

  function removeTag(t: string) {
    if (!candidateId) return;
    const next = tags.filter((x) => x !== t);
    setTags(next);
    candidatePanelApi.updateTags(candidateId, next).catch(() => {
      setTags(tags);
      showToast('Failed to remove tag', 'error');
    });
  }

  // Notes handlers
  async function handleAddNote() {
    if (!newNoteText.trim() || !candidateId) return;
    setSavingNote(true);
    try {
      const res = await candidatePanelApi.createNote(candidateId, {
        content: newNoteText.trim(),
        applicationId,
      });
      setNotesData((prev) => [res.note, ...(prev ?? [])]);
      setNewNoteText('');
      loadedTabs.current.add('Notes');
    } catch {
      showToast('Failed to save note', 'error');
    } finally {
      setSavingNote(false);
    }
  }

  async function handleSaveEditNote(noteId: string) {
    if (!editNoteText.trim() || !candidateId) return;
    try {
      const res = await candidatePanelApi.updateNote(candidateId, noteId, editNoteText.trim());
      setNotesData((prev) => prev?.map((n) => n.id === noteId ? res.note : n) ?? null);
      setEditNoteId(null);
    } catch {
      showToast('Failed to update note', 'error');
    }
  }

  function handleDeleteNote(noteId: string) {
    if (!candidateId) return;
    setNotesData((prev) => prev?.filter((n) => n.id !== noteId) ?? null);
    candidatePanelApi.deleteNote(candidateId, noteId).catch(() => {
      showToast('Failed to delete note', 'error');
      // Re-fetch to restore
      candidatePanelApi.getNotes(candidateId).then((res) => setNotesData(res.notes)).catch(() => {});
    });
  }

  if (!candidateId) return null;

  const fullName = candidate ? `${candidate.firstName} ${candidate.lastName}` : '';
  const latestApp = candidate?.applications[0];
  const latestStatus = latestApp?.status ?? '';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-200"
        style={{ opacity: visible ? 1 : 0 }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 h-screen w-[900px] max-w-[95vw] bg-white shadow-2xl z-50 flex flex-col overflow-hidden transition-transform duration-300 ease-out"
        style={{ transform: visible ? 'translateX(0)' : 'translateX(100%)' }}
        role="dialog"
        aria-modal="true"
        aria-label={candidate ? `Candidate: ${fullName}` : 'Loading candidate'}
      >
        {loadingCandidate ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-pulse space-y-4 w-full p-8">
              <div className="h-6 bg-neutral-200 rounded w-1/3" />
              <div className="h-4 bg-neutral-100 rounded w-1/2" />
              <div className="h-4 bg-neutral-100 rounded w-2/3" />
            </div>
          </div>
        ) : candidateError ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
            <p className="text-sm text-red-600">{candidateError}</p>
            <Button variant="secondary" size="sm" onClick={() => {
              if (!candidateId) return;
              setLoadingCandidate(true);
              setCandidateError('');
              candidatesApi.getCandidate(candidateId)
                .then((r) => { setCandidate(r.candidate); setTags(r.candidate.tags ?? []); })
                .catch(() => setCandidateError('Failed to load candidate.'))
                .finally(() => setLoadingCandidate(false));
            }}>Retry</Button>
          </div>
        ) : candidate ? (
          <>
            {/* ── Header ────────────────────────────────────────────────────── */}
            <PanelHeader
              candidate={candidate}
              tags={tags}
              tagInput={tagInput}
              tagInputRef={tagInputRef}
              setTagInput={setTagInput}
              addTag={addTag}
              removeTag={removeTag}
              moreOpen={moreOpen}
              moreRef={moreRef}
              setMoreOpen={setMoreOpen}
              latestStatus={latestStatus}
              onClose={onClose}
              showToast={showToast}
            />

            {/* ── Body ──────────────────────────────────────────────────────── */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
              {/* Left column */}
              <div className="w-[55%] border-r border-[var(--color-border)] flex flex-col min-h-0">
                {/* Left tabs */}
                <div className="flex border-b border-[var(--color-border)] bg-[var(--color-surface)]/50 flex-shrink-0">
                  {LEFT_TABS.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setLeftTab(tab)}
                      className={[
                        'px-4 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                        leftTab === tab
                          ? 'border-[var(--color-primary)] text-[var(--color-text-primary)]'
                          : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]',
                      ].join(' ')}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <div className="flex-1 overflow-y-auto">
                  {leftTab === 'Activities & Progress' && (
                    <ActivitiesTab candidate={candidate} />
                  )}
                  {leftTab === 'Summary' && (
                    <SummaryTab candidate={candidate} />
                  )}
                  {leftTab === 'Resume' && (
                    <ResumeTab candidate={candidate} />
                  )}
                </div>
              </div>

              {/* Right column */}
              <div className="w-[45%] flex flex-col min-h-0">
                {/* Right tabs */}
                <div className="flex border-b border-[var(--color-border)] bg-[var(--color-surface)]/50 overflow-x-auto flex-shrink-0">
                  {RIGHT_TABS.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setRightTab(tab)}
                      className={[
                        'px-3 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                        rightTab === tab
                          ? 'border-[var(--color-primary)] text-[var(--color-text-primary)]'
                          : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]',
                      ].join(' ')}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <div className="flex-1 overflow-y-auto">
                  {rightTab === 'Feed' && (
                    <FeedTab
                      data={feedData}
                      loading={feedLoading}
                      error={feedError}
                      onRetry={() => { loadedTabs.current.delete('Feed'); loadFeed(); }}
                    />
                  )}
                  {rightTab === 'Notes' && (
                    <NotesTab
                      data={notesData}
                      loading={notesLoading}
                      error={notesError}
                      onRetry={() => { loadedTabs.current.delete('Notes'); loadNotes(); }}
                      newNoteText={newNoteText}
                      setNewNoteText={setNewNoteText}
                      savingNote={savingNote}
                      onAddNote={handleAddNote}
                      editNoteId={editNoteId}
                      editNoteText={editNoteText}
                      setEditNoteId={setEditNoteId}
                      setEditNoteText={setEditNoteText}
                      onSaveEdit={handleSaveEditNote}
                      onDelete={handleDeleteNote}
                    />
                  )}
                  {rightTab === 'Feedback' && (
                    <FeedbackTab
                      data={feedbackData}
                      loading={feedbackLoading}
                      error={feedbackError}
                      onRetry={() => { loadedTabs.current.delete('Feedback'); loadFeedback(); }}
                    />
                  )}
                  {rightTab === 'Emails' && (
                    <div className="p-6 text-center">
                      <p className="text-sm text-[var(--color-text-muted)]">No emails recorded. Email integration coming soon.</p>
                    </div>
                  )}
                  {(rightTab === 'Texts' || rightTab === 'Referrals' || rightTab === 'Forms') && (
                    <div className="p-6 text-center">
                      <p className="text-sm text-[var(--color-text-muted)]">{rightTab} — coming soon</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}

// ─── PanelHeader ──────────────────────────────────────────────────────────────

interface PanelHeaderProps {
  candidate: CandidateDetailDto;
  tags: string[];
  tagInput: string;
  tagInputRef: React.RefObject<HTMLInputElement>;
  setTagInput: (v: string) => void;
  addTag: (v: string) => void;
  removeTag: (t: string) => void;
  moreOpen: boolean;
  moreRef: React.RefObject<HTMLDivElement>;
  setMoreOpen: (v: boolean) => void;
  latestStatus: string;
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

function PanelHeader({
  candidate, tags, tagInput, tagInputRef, setTagInput, addTag, removeTag,
  moreOpen, moreRef, setMoreOpen, latestStatus, onClose, showToast,
}: PanelHeaderProps) {
  return (
    <div className="border-b border-[var(--color-border)] bg-white px-6 pt-4 pb-3 flex-shrink-0">
      {/* Row 1: Close + Name + Stage */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Avatar name={`${candidate.firstName} ${candidate.lastName}`} size="lg" />
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-[var(--color-text-primary)] leading-tight truncate">
              {candidate.firstName} {candidate.lastName}
            </h2>
            {latestStatus && <StageBadge status={latestStatus} />}
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors"
          aria-label="Close panel"
        >
          <X size={18} />
        </button>
      </div>

      {/* Row 2: Email + Phone */}
      <div className="flex items-center gap-4 mb-2 flex-wrap">
        {candidate.email && (
          <a
            href={`mailto:${candidate.email}`}
            className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
          >
            <Mail size={12} />
            <span className="truncate max-w-[180px]">{candidate.email}</span>
          </a>
        )}
        {candidate.phone && (
          <a
            href={`tel:${candidate.phone}`}
            className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
          >
            <Phone size={12} />
            <span>{candidate.phone}</span>
          </a>
        )}
        {candidate.linkedInUrl && (
          <a
            href={candidate.linkedInUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
          >
            <Linkedin size={12} />
            <span>LinkedIn</span>
          </a>
        )}
      </div>

      {/* Row 3: Tags */}
      <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
        <Tag size={11} className="text-[var(--color-text-muted)] flex-shrink-0" />
        {tags.map((t) => (
          <span
            key={t}
            className="flex items-center gap-1 text-[10px] font-medium bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-full px-2 py-0.5"
          >
            {t}
            <button
              onClick={() => removeTag(t)}
              className="hover:text-red-500 transition-colors ml-0.5"
              aria-label={`Remove tag ${t}`}
            >
              <X size={9} />
            </button>
          </span>
        ))}
        <input
          ref={tagInputRef}
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput); }
            if (e.key === ',' || e.key === 'Tab') { e.preventDefault(); addTag(tagInput); }
          }}
          placeholder="Add tag…"
          className="text-[10px] outline-none border-none bg-transparent text-[var(--color-text-muted)] placeholder:text-[var(--color-text-muted)]/60 min-w-[60px] w-20"
        />
      </div>

      {/* Row 4: Action buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="secondary" size="sm" onClick={() => showToast('Follow up — coming soon', 'info')}>
          Follow Up
        </Button>
        <Button variant="secondary" size="sm" onClick={() => showToast('Email — coming soon', 'info')}>
          <Mail size={12} />
          Email
        </Button>
        <Button variant="secondary" size="sm" onClick={() => showToast('Change stage — coming soon', 'info')}>
          Change Stage
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="!text-red-600 !border-red-200 hover:!bg-red-50"
          onClick={() => showToast('Archive — coming soon', 'info')}
        >
          Archive
        </Button>
        <div className="relative" ref={moreRef}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setMoreOpen(!moreOpen)}
          >
            ⋯
            <ChevronDown size={11} />
          </Button>
          {moreOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-[var(--color-border)] rounded-xl shadow-lg z-50 py-1">
              {['Duplicate', 'Add to another job', 'Download CV'].map((item) => (
                <button
                  key={item}
                  onClick={() => { setMoreOpen(false); showToast(`${item} — coming soon`, 'info'); }}
                  className="w-full text-left px-3.5 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors"
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ActivitiesTab ────────────────────────────────────────────────────────────

function ActivitiesTab({ candidate }: { candidate: CandidateDetailDto }) {
  const scheduledInterviews = candidate.applications.flatMap((app) =>
    app.interviews
      .filter((iv) => iv.status === 'scheduled')
      .map((iv) => ({ ...iv, jobTitle: app.jobTitle }))
  );

  const allInterviews = candidate.applications.flatMap((app) =>
    app.interviews.map((iv) => ({ ...iv, jobTitle: app.jobTitle }))
  );

  return (
    <div className="p-4 space-y-5">
      {/* Current Activities */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">Current Activities</h3>
          <button className="w-6 h-6 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">
            <Plus size={12} />
          </button>
        </div>
        {scheduledInterviews.length === 0 ? (
          <p className="text-xs text-[var(--color-text-muted)] text-center py-4">No pending activities</p>
        ) : (
          <div className="space-y-2">
            {scheduledInterviews.map((iv) => (
              <div key={iv.id} className="flex items-center gap-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3">
                <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full capitalize">
                  {iv.type}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[var(--color-text-primary)] truncate">{iv.jobTitle}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)]">{formatDate(iv.scheduledAt)}</p>
                </div>
                <span className="text-[10px] font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full capitalize">
                  {iv.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Interview Progress */}
      <div>
        <h3 className="text-xs font-semibold text-[var(--color-text-primary)] uppercase tracking-wide mb-3">Interview Progress</h3>
        {allInterviews.length === 0 ? (
          <p className="text-xs text-[var(--color-text-muted)] text-center py-4">No interviews recorded yet</p>
        ) : (
          <div className="border border-[var(--color-border)] rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-[var(--color-text-muted)]">Stage</th>
                  <th className="text-left px-3 py-2 font-semibold text-[var(--color-text-muted)]">Date</th>
                  <th className="text-left px-3 py-2 font-semibold text-[var(--color-text-muted)]">Duration</th>
                </tr>
              </thead>
              <tbody>
                {allInterviews.map((iv, i) => (
                  <tr key={iv.id} className={i % 2 === 0 ? 'bg-white' : 'bg-[var(--color-surface)]/40'}>
                    <td className="px-3 py-2 capitalize">{iv.type}</td>
                    <td className="px-3 py-2 text-[var(--color-text-muted)]">{formatDate(iv.scheduledAt)}</td>
                    <td className="px-3 py-2 text-[var(--color-text-muted)]">{iv.duration}m</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SummaryTab ───────────────────────────────────────────────────────────────

function SummaryTab({ candidate }: { candidate: CandidateDetailDto }) {
  return (
    <div className="p-4 space-y-4">
      {/* Info */}
      <div className="space-y-2">
        {candidate.location && (
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <MapPin size={12} className="flex-shrink-0" />
            <span>{candidate.location}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
          <Briefcase size={12} className="flex-shrink-0" />
          <span>Source: {candidate.source}</span>
        </div>
      </div>

      {/* Skills */}
      {candidate.skills.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[var(--color-text-primary)] mb-2">Skills</p>
          <div className="flex flex-wrap gap-1.5">
            {candidate.skills.map((s) => (
              <span key={s} className="text-[10px] px-2 py-0.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md text-[var(--color-text-muted)]">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Applications */}
      {candidate.applications.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[var(--color-text-primary)] mb-2">Applications</p>
          <div className="space-y-2">
            {candidate.applications.map((app) => (
              <div key={app.id} className="border border-[var(--color-border)] rounded-xl p-3 bg-[var(--color-surface)]/40">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-xs font-semibold text-[var(--color-text-primary)] truncate">{app.jobTitle}</p>
                  <StageBadge status={app.status} />
                </div>
                <p className="text-[10px] text-[var(--color-text-muted)]">{app.jobDepartment} · {app.jobLocation}</p>
                <p className="text-[10px] text-[var(--color-text-muted)]">Applied {formatDate(app.appliedAt)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ResumeTab ────────────────────────────────────────────────────────────────

function ResumeTab({ candidate }: { candidate: CandidateDetailDto }) {
  if (!candidate.cvUrl) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <FileText size={32} className="text-[var(--color-text-muted)]" />
        <p className="text-sm text-[var(--color-text-muted)]">No resume uploaded</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <a
        href={candidate.cvUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-sm text-[var(--color-primary)] hover:underline"
      >
        <FileText size={14} />
        View / Download Resume
        <ExternalLink size={12} />
      </a>
    </div>
  );
}

// ─── FeedTab ──────────────────────────────────────────────────────────────────

function FeedTab({
  data, loading, error, onRetry,
}: {
  data: FeedEventDto[] | null;
  loading: boolean;
  error: string;
  onRetry: () => void;
}) {
  if (loading) return <SkeletonRows count={5} />;
  if (error) return (
    <div className="p-4 text-center space-y-2">
      <p className="text-xs text-red-600">{error}</p>
      <Button variant="secondary" size="sm" onClick={onRetry}>Retry</Button>
    </div>
  );
  if (!data || data.length === 0) return (
    <div className="p-6 text-center">
      <p className="text-sm text-[var(--color-text-muted)]">No activity yet</p>
    </div>
  );

  return (
    <div className="p-4 space-y-3">
      {data.map((evt) => (
        <div key={evt.id} className="flex gap-3 items-start">
          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${FEED_COLORS[evt.type] ?? 'bg-neutral-400'}`} />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[var(--color-text-primary)] leading-snug">{evt.description}</p>
            <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
              {evt.actor} · {relativeTime(evt.timestamp)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── NotesTab ─────────────────────────────────────────────────────────────────

function NotesTab({
  data, loading, error, onRetry,
  newNoteText, setNewNoteText, savingNote, onAddNote,
  editNoteId, editNoteText, setEditNoteId, setEditNoteText, onSaveEdit, onDelete,
}: {
  data: CandidateNoteDto[] | null;
  loading: boolean;
  error: string;
  onRetry: () => void;
  newNoteText: string;
  setNewNoteText: (v: string) => void;
  savingNote: boolean;
  onAddNote: () => void;
  editNoteId: string | null;
  editNoteText: string;
  setEditNoteId: (id: string | null) => void;
  setEditNoteText: (v: string) => void;
  onSaveEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* New note */}
      <div className="p-3 border-b border-[var(--color-border)] flex-shrink-0">
        <textarea
          value={newNoteText}
          onChange={(e) => setNewNoteText(e.target.value)}
          placeholder="Add a note…"
          rows={3}
          className="w-full text-xs border border-[var(--color-border)] rounded-xl p-2.5 resize-none outline-none focus:border-[var(--color-primary)] transition-colors bg-[var(--color-surface)]/50"
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onAddNote(); }}
        />
        <div className="flex justify-end mt-2">
          <Button
            variant="primary"
            size="sm"
            onClick={onAddNote}
            disabled={savingNote || !newNoteText.trim()}
          >
            {savingNote ? 'Saving…' : 'Add Note'}
          </Button>
        </div>
      </div>

      {/* Note list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <SkeletonRows count={3} />
        ) : error ? (
          <div className="p-4 text-center space-y-2">
            <p className="text-xs text-red-600">{error}</p>
            <Button variant="secondary" size="sm" onClick={onRetry}>Retry</Button>
          </div>
        ) : !data || data.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-xs text-[var(--color-text-muted)]">No notes yet. Add the first note above.</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {data.map((note) => (
              <div key={note.id} className="p-3">
                {editNoteId === note.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editNoteText}
                      onChange={(e) => setEditNoteText(e.target.value)}
                      rows={3}
                      className="w-full text-xs border border-[var(--color-primary)] rounded-xl p-2.5 resize-none outline-none"
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <Button variant="secondary" size="sm" onClick={() => setEditNoteId(null)}>Cancel</Button>
                      <Button variant="primary" size="sm" onClick={() => onSaveEdit(note.id)}>Save</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <p className="flex-1 text-xs text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap">{note.content}</p>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => { setEditNoteId(note.id); setEditNoteText(note.content); }}
                        className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors rounded"
                        aria-label="Edit note"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => onDelete(note.id)}
                        className="p-1 text-[var(--color-text-muted)] hover:text-red-500 transition-colors rounded"
                        aria-label="Delete note"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                )}
                <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
                  {note.authorName} · {relativeTime(note.createdAt)}
                  {note.jobTitle && <> · {note.jobTitle}</>}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── FeedbackTab ──────────────────────────────────────────────────────────────

const REC_BADGE: Record<string, { label: string; cls: string }> = {
  hire:     { label: 'Hire',     cls: 'bg-emerald-100 text-emerald-700' },
  'no-hire': { label: 'No Hire', cls: 'bg-red-100 text-red-700' },
  maybe:    { label: 'Maybe',    cls: 'bg-amber-100 text-amber-700' },
};

function StarRating({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-[10px] text-[var(--color-text-muted)]">No rating</span>;
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={12}
          className={i < rating ? 'text-amber-400 fill-amber-400' : 'text-neutral-200 fill-neutral-200'}
        />
      ))}
    </div>
  );
}

function FeedbackTab({
  data, loading, error, onRetry,
}: {
  data: CandidateFeedbackDto[] | null;
  loading: boolean;
  error: string;
  onRetry: () => void;
}) {
  if (loading) return <SkeletonCards count={2} />;
  if (error) return (
    <div className="p-4 text-center space-y-2">
      <p className="text-xs text-red-600">{error}</p>
      <Button variant="secondary" size="sm" onClick={onRetry}>Retry</Button>
    </div>
  );
  if (!data || data.length === 0) return (
    <div className="p-6 text-center">
      <p className="text-sm text-[var(--color-text-muted)]">No feedback submitted yet</p>
    </div>
  );

  return (
    <div className="p-3 space-y-3">
      {data.map((fb) => {
        const recCfg = fb.recommendation ? (REC_BADGE[fb.recommendation] ?? { label: fb.recommendation, cls: 'bg-neutral-100 text-neutral-700' }) : null;
        return (
          <div key={fb.id} className="border border-[var(--color-border)] rounded-xl p-3 bg-white">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full capitalize">
                {fb.interviewType}
              </span>
              {fb.jobTitle && (
                <span className="text-[10px] text-[var(--color-text-muted)] truncate max-w-[120px]">{fb.jobTitle}</span>
              )}
              <span className="text-[10px] text-[var(--color-text-muted)] ml-auto">{formatDate(fb.scheduledAt)}</span>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <StarRating rating={fb.rating} />
              {recCfg && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${recCfg.cls}`}>
                  {recCfg.label}
                </span>
              )}
            </div>
            {fb.feedback && (
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">{fb.feedback}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
