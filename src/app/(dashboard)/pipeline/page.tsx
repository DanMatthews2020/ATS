'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SlidersHorizontal, Plus, X, Mail, Phone, MapPin,
  Linkedin, FileDown, Star, ChevronDown, Loader2,
  Search, Calendar,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PipelineCandidateCard } from '@/components/pipeline/PipelineCandidateCard';
import {
  jobsApi, applicationsApi, candidatesApi,
  type JobListingDto, type PipelineApplicationDto, type CandidateListDto,
} from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import type { BadgeVariant } from '@/types';

// ─── Config ───────────────────────────────────────────────────────────────────

const COLUMNS: { id: string; label: string; colorClass: string; dotClass: string; variant: BadgeVariant }[] = [
  { id: 'applied',   label: 'Applied',   colorClass: 'border-t-indigo-400',  dotClass: 'bg-indigo-400',  variant: 'info' },
  { id: 'screening', label: 'Screening', colorClass: 'border-t-blue-400',    dotClass: 'bg-blue-400',    variant: 'info' },
  { id: 'interview', label: 'Interview', colorClass: 'border-t-amber-400',   dotClass: 'bg-amber-400',   variant: 'warning' },
  { id: 'offer',     label: 'Offer',     colorClass: 'border-t-emerald-400', dotClass: 'bg-emerald-400', variant: 'success' },
  { id: 'hired',     label: 'Hired',     colorClass: 'border-t-green-500',   dotClass: 'bg-green-500',   variant: 'success' },
  { id: 'rejected',  label: 'Rejected',  colorClass: 'border-t-red-400',     dotClass: 'bg-red-400',     variant: 'error' },
];

const STAGE_TO_ENUM: Record<string, string> = {
  applied: 'APPLIED', screening: 'SCREENING', interview: 'INTERVIEW',
  offer: 'OFFER', hired: 'HIRED', rejected: 'REJECTED',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getScoreBreakdown(score: number, skillCount: number, interviewCount: number) {
  return {
    skillsMatch:    Math.min(100, score + 5 - (skillCount > 4 ? 0 : 5)),
    experience:     Math.max(40, score - 8),
    appQuality:     Math.max(50, score - 4),
    interviewPerf:  interviewCount > 0 ? Math.min(100, score + 10) : null,
  };
}

function ScoreBar({ value }: { value: number }) {
  const color = value >= 85 ? 'bg-emerald-500' : value >= 70 ? 'bg-amber-400' : 'bg-neutral-300';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs tabular-nums text-[var(--color-text-muted)] w-7 text-right">{value}%</span>
    </div>
  );
}

// ─── DraggableCard ────────────────────────────────────────────────────────────

function DraggableCard({
  app, isFiltered, onSkillClick, onClick,
}: {
  app: PipelineApplicationDto;
  isFiltered: boolean;
  onSkillClick: (skill: string) => void;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: app.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)`, zIndex: 50 }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}
      className={isDragging ? 'opacity-0' : ''}>
      <PipelineCandidateCard
        app={app}
        isFiltered={isFiltered}
        onClick={onClick}
        onSkillClick={onSkillClick}
      />
    </div>
  );
}

// ─── DroppableColumn ──────────────────────────────────────────────────────────

function DroppableColumn({
  col, apps, activeSkillFilters, onCardClick, onSkillClick, onAddClick,
}: {
  col: typeof COLUMNS[number];
  apps: PipelineApplicationDto[];
  activeSkillFilters: Set<string>;
  onCardClick: (app: PipelineApplicationDto) => void;
  onSkillClick: (skill: string) => void;
  onAddClick: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  const filtered = apps.filter(
    (a) => activeSkillFilters.size === 0 || a.skills.some((s) => activeSkillFilters.has(s))
  );

  return (
    <div className="flex flex-col w-[240px] flex-shrink-0">
      {/* Column header */}
      <div className={`flex items-center justify-between mb-2 px-1`}>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${col.dotClass}`} />
          <span className="text-xs font-semibold text-[var(--color-text-primary)]">{col.label}</span>
          <span className="text-xs font-medium text-[var(--color-text-muted)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full px-1.5">
            {apps.length}
          </span>
        </div>
        <button
          onClick={onAddClick}
          className="w-5 h-5 rounded-md border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/50 hover:text-[var(--color-primary)] transition-colors"
          title={`Add candidate to ${col.label}`}
        >
          <Plus size={11} />
        </button>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={[
          'flex-1 rounded-xl border-2 border-dashed transition-colors duration-150 p-2 space-y-2 min-h-[120px]',
          isOver
            ? 'border-[var(--color-primary)]/50 bg-[var(--color-primary)]/3'
            : 'border-[var(--color-border)] bg-[var(--color-surface)]/50',
        ].join(' ')}
      >
        {apps.map((app) => (
          <DraggableCard
            key={app.id}
            app={app}
            isFiltered={activeSkillFilters.size > 0 && !app.skills.some((s) => activeSkillFilters.has(s))}
            onSkillClick={onSkillClick}
            onClick={() => onCardClick(app)}
          />
        ))}
        {apps.length === 0 && (
          <p className="text-[10px] text-[var(--color-text-muted)] text-center pt-4">
            Drop here
          </p>
        )}
      </div>
    </div>
  );
}

// ─── ScoreBreakdown ────────────────────────────────────────────────────────────

function ScoreBreakdown({ score, skillCount, interviewCount }: { score: number; skillCount: number; interviewCount: number }) {
  const bd = getScoreBreakdown(score, skillCount, interviewCount);
  return (
    <div className="mt-2 p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Score Breakdown</p>
      <div className="space-y-1.5">
        <div>
          <p className="text-xs text-[var(--color-text-muted)] mb-0.5">Skills Alignment</p>
          <ScoreBar value={bd.skillsMatch} />
        </div>
        <div>
          <p className="text-xs text-[var(--color-text-muted)] mb-0.5">Experience</p>
          <ScoreBar value={bd.experience} />
        </div>
        <div>
          <p className="text-xs text-[var(--color-text-muted)] mb-0.5">Application Quality</p>
          <ScoreBar value={bd.appQuality} />
        </div>
        {bd.interviewPerf !== null && (
          <div>
            <p className="text-xs text-[var(--color-text-muted)] mb-0.5">Interview Performance</p>
            <ScoreBar value={bd.interviewPerf} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CandidatePanel ───────────────────────────────────────────────────────────

function CandidatePanel({
  app, onClose, onStageUpdated, onNotesUpdated,
}: {
  app: PipelineApplicationDto;
  onClose: () => void;
  onStageUpdated: (appId: string, newStatus: string) => void;
  onNotesUpdated: (appId: string, notes: string) => void;
}) {
  const { showToast } = useToast();
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false);
  const [noteText, setNoteText] = useState(app.notes ?? '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [showStageSelect, setShowStageSelect] = useState(false);
  const [movingStage, setMovingStage] = useState(false);

  const scoreColor = app.score >= 85 ? 'text-emerald-600' : app.score >= 70 ? 'text-amber-500' : 'text-neutral-400';
  const scoreBg    = app.score >= 85 ? 'bg-emerald-50 border-emerald-200' : app.score >= 70 ? 'bg-amber-50 border-amber-200' : 'bg-neutral-50 border-neutral-200';

  async function handleSaveNotes() {
    if (!noteText.trim() && !app.notes) return;
    setSavingNotes(true);
    try {
      await applicationsApi.updateNotes(app.id, noteText);
      onNotesUpdated(app.id, noteText);
      showToast('Notes saved', 'success');
    } catch {
      showToast('Failed to save notes', 'error');
    } finally {
      setSavingNotes(false);
    }
  }

  async function handleMoveStage(newStage: string) {
    if (newStage === app.status) { setShowStageSelect(false); return; }
    setMovingStage(true);
    try {
      await applicationsApi.updateStage(app.id, STAGE_TO_ENUM[newStage] ?? newStage.toUpperCase());
      onStageUpdated(app.id, newStage);
      showToast('Stage updated', 'success');
      setShowStageSelect(false);
    } catch {
      showToast('Failed to update stage', 'error');
    } finally {
      setMovingStage(false);
    }
  }

  async function handleReject() {
    if (app.status === 'rejected') return;
    setMovingStage(true);
    try {
      await applicationsApi.updateStage(app.id, 'REJECTED');
      onStageUpdated(app.id, 'rejected');
      showToast('Candidate rejected', 'info');
      onClose();
    } catch {
      showToast('Failed to reject', 'error');
    } finally {
      setMovingStage(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[360px] bg-[var(--color-bg-primary)] border-l border-[var(--color-border)] shadow-2xl z-50 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] flex-shrink-0">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Candidate Details</h2>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Identity + score */}
          <div className="flex items-start gap-3">
            <Avatar name={app.candidateName} size="lg" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[var(--color-text-primary)]">{app.candidateName}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={COLUMNS.find(c => c.id === app.status)?.variant ?? 'default'}>
                  {COLUMNS.find(c => c.id === app.status)?.label ?? app.status}
                </Badge>
                <button
                  onClick={() => setShowScoreBreakdown((v) => !v)}
                  className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border cursor-pointer hover:opacity-80 transition-opacity ${scoreBg} ${scoreColor}`}
                  title="Click to see score breakdown"
                >
                  <Star size={10} fill="currentColor" /> {app.score}
                  <ChevronDown size={10} className={`transition-transform ${showScoreBreakdown ? 'rotate-180' : ''}`} />
                </button>
              </div>
              {showScoreBreakdown && (
                <ScoreBreakdown score={app.score} skillCount={app.skills.length} interviewCount={app.interviewCount} />
              )}
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Contact</p>
            <div className="space-y-1.5">
              <a href={`mailto:${app.candidateEmail}`} className="flex items-center gap-2 text-xs text-blue-600 hover:underline">
                <Mail size={12} />{app.candidateEmail}
              </a>
              {app.candidatePhone && (
                <p className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                  <Phone size={12} />{app.candidatePhone}
                </p>
              )}
              {app.candidateLocation && (
                <p className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                  <MapPin size={12} />{app.candidateLocation}
                </p>
              )}
            </div>
          </div>

          {/* Skills */}
          {app.skills.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {app.skills.map((s) => (
                  <span key={s} className="text-xs px-2 py-0.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-muted)]">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* CV download */}
          {app.cvUrl ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">CV</p>
              <a
                href={app.cvUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-[var(--color-primary)] hover:underline font-medium"
              >
                <FileDown size={13} /> Download CV
              </a>
            </div>
          ) : (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">CV</p>
              <p className="text-xs text-[var(--color-text-muted)]">No CV uploaded</p>
            </div>
          )}

          {/* Application meta */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-[10px] text-[var(--color-text-muted)] mb-0.5">Applied</p>
              <p className="font-medium text-[var(--color-text-primary)]">
                {new Date(app.appliedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--color-text-muted)] mb-0.5">Interviews</p>
              <p className="font-medium text-[var(--color-text-primary)]">{app.interviewCount}</p>
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Notes</p>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add an internal note…"
              rows={4}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 resize-none"
            />
            <div className="flex justify-end mt-1.5">
              <Button variant="secondary" size="sm" onClick={handleSaveNotes} disabled={savingNotes}>
                {savingNotes ? <Loader2 size={11} className="animate-spin" /> : null}
                Save Notes
              </Button>
            </div>
          </div>
        </div>

        {/* Action buttons footer */}
        <div className="border-t border-[var(--color-border)] p-4 space-y-2 flex-shrink-0">
          {/* Move Stage selector */}
          <div className="relative">
            <Button
              variant="primary"
              size="sm"
              className="w-full justify-center"
              onClick={() => setShowStageSelect((v) => !v)}
              disabled={movingStage}
            >
              {movingStage ? <Loader2 size={13} className="animate-spin" /> : null}
              Move Stage
              <ChevronDown size={13} className={`ml-auto transition-transform ${showStageSelect ? 'rotate-180' : ''}`} />
            </Button>
            {showStageSelect && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl shadow-xl overflow-hidden z-10">
                {COLUMNS.map((col) => (
                  <button
                    key={col.id}
                    onClick={() => handleMoveStage(col.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left hover:bg-[var(--color-surface)] transition-colors ${col.id === app.status ? 'font-semibold text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)]'}`}
                  >
                    <div className={`w-2 h-2 rounded-full ${col.dotClass}`} />
                    {col.label}
                    {col.id === app.status && <span className="ml-auto text-[10px] text-[var(--color-text-muted)]">current</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1 justify-center"
              onClick={() => showToast('Schedule Interview — coming soon', 'info')}
            >
              <Calendar size={12} /> Schedule
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="flex-1 justify-center !text-red-600 !border-red-200 hover:!bg-red-50"
              onClick={handleReject}
              disabled={movingStage || app.status === 'rejected'}
            >
              {movingStage ? <Loader2 size={12} className="animate-spin" /> : null}
              Reject
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── AddCandidateModal ────────────────────────────────────────────────────────

function AddCandidateModal({
  stage, jobId, onClose, onAdded,
}: {
  stage: string;
  jobId: string;
  onClose: () => void;
  onAdded: (app: PipelineApplicationDto) => void;
}) {
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CandidateListDto[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await candidatesApi.getCandidates(1, 20, query.trim());
        setResults(res.items);
      } catch {
        /* ignore */
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  async function handleAdd(candidate: CandidateListDto) {
    setAddingId(candidate.id);
    try {
      const result = await applicationsApi.createApplication({
        candidateId:  candidate.id,
        jobPostingId: jobId,
        status:       STAGE_TO_ENUM[stage] ?? 'APPLIED',
      });
      // Build a minimal PipelineApplicationDto for the new card
      const newApp: PipelineApplicationDto = {
        id:                result.application.id,
        candidateId:       result.application.candidateId,
        candidateName:     result.application.candidateName,
        candidateEmail:    result.application.candidateEmail,
        candidatePhone:    candidate.phone ?? null,
        candidateLocation: candidate.location ?? null,
        cvUrl:             null,
        source:            candidate.source ?? 'JOB_BOARD',
        status:            result.application.status,
        stage:             null,
        notes:             null,
        appliedAt:         result.application.appliedAt,
        lastUpdated:       result.application.lastUpdated,
        skills:            candidate.skills,
        interviewCount:    0,
        interviewRatings:  [],
        offerStatus:       null,
        score:             60 + (candidate.skills.length * 3),
      };
      onAdded(newApp);
      showToast(`${candidate.name} added to ${COLUMNS.find(c => c.id === stage)?.label ?? stage}`, 'success');
      onClose();
    } catch (err: unknown) {
      const msg = (err instanceof Error && err.message.includes('ALREADY_EXISTS'))
        ? 'Candidate already in this pipeline'
        : 'Failed to add candidate';
      showToast(msg, 'error');
    } finally {
      setAddingId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--color-bg-primary)] rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
          <div>
            <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Add Candidate</h3>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              Add to <span className="font-medium">{COLUMNS.find(c => c.id === stage)?.label ?? stage}</span> stage
            </p>
          </div>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
            <X size={16} />
          </button>
        </div>
        <div className="p-5">
          {/* Search */}
          <div className="relative mb-4">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              autoFocus
              type="text"
              placeholder="Search by name or email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-3 text-sm rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
            />
            {searching && (
              <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[var(--color-text-muted)]" />
            )}
          </div>

          {/* Results */}
          <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
            {results.length === 0 && query && !searching && (
              <p className="text-sm text-[var(--color-text-muted)] text-center py-6">No candidates found</p>
            )}
            {results.length === 0 && !query && (
              <p className="text-sm text-[var(--color-text-muted)] text-center py-6">Start typing to search candidates</p>
            )}
            {results.map((candidate) => (
              <div key={candidate.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[var(--color-surface)] transition-colors">
                <Avatar name={candidate.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{candidate.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)] truncate">{candidate.email}</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAdd(candidate)}
                  disabled={addingId === candidate.id}
                >
                  {addingId === candidate.id ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                  Add
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const router = useRouter();
  const { showToast } = useToast();

  // Jobs
  const [jobs, setJobs] = useState<JobListingDto[]>([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [jobsLoading, setJobsLoading] = useState(true);

  // Applications, organised by stage
  const [columns, setColumns] = useState<Record<string, PipelineApplicationDto[]>>(() =>
    Object.fromEntries(COLUMNS.map((c) => [c.id, []]))
  );
  const [appsLoading, setAppsLoading] = useState(false);
  const [appsError, setAppsError] = useState('');

  // UI state
  const [activeSkillFilters, setActiveSkillFilters] = useState<Set<string>>(new Set());
  const [openPanelApp, setOpenPanelApp] = useState<PipelineApplicationDto | null>(null);
  const [addModal, setAddModal] = useState<{ stage: string } | null>(null);
  const [dragActiveId, setDragActiveId] = useState<string | null>(null);

  // DnD sensors — require 5px movement before activating drag to allow click-through
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  // Fetch jobs on mount
  useEffect(() => {
    jobsApi.getJobs(1, 100).then((res) => {
      setJobs(res.items.filter((j) => j.status === 'open' || j.status === 'draft'));
      if (res.items.length > 0) setSelectedJobId(res.items[0].id);
    }).catch(() => {
      // ignore
    }).finally(() => setJobsLoading(false));
  }, []);

  // Fetch applications when job changes
  const fetchApplications = useCallback(async (jobId: string) => {
    if (!jobId) return;
    setAppsLoading(true);
    setAppsError('');
    try {
      const res = await jobsApi.getJobApplications(jobId);
      const grouped: Record<string, PipelineApplicationDto[]> =
        Object.fromEntries(COLUMNS.map((c) => [c.id, []]));
      // Safety net: backend already excludes rejected, but filter client-side too
      const activeApps = res.applications.filter((app) => app.status !== 'rejected');
      for (const app of activeApps) {
        const key = app.status in grouped ? app.status : 'applied';
        grouped[key].push(app);
      }
      setColumns(grouped);
    } catch {
      setAppsError('Failed to load applications.');
    } finally {
      setAppsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedJobId) fetchApplications(selectedJobId);
  }, [selectedJobId, fetchApplications]);

  // Sync open panel app when columns update (e.g., after stage move)
  useEffect(() => {
    if (openPanelApp) {
      const all = Object.values(columns).flat();
      const updated = all.find((a) => a.id === openPanelApp.id);
      if (updated) setOpenPanelApp(updated);
    }
  }, [columns]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── DnD ────────────────────────────────────────────────────────────────────

  const dragActiveApp = dragActiveId
    ? Object.values(columns).flat().find((a) => a.id === dragActiveId) ?? null
    : null;

  function handleDragStart({ active }: DragStartEvent) {
    setDragActiveId(active.id as string);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setDragActiveId(null);
    if (!over) return;
    const appId = active.id as string;
    const newStage = over.id as string;

    // Find which column the app is currently in
    const currentStage = Object.entries(columns).find(([, apps]) =>
      apps.some((a) => a.id === appId)
    )?.[0];
    if (!currentStage || currentStage === newStage) return;

    // Optimistic update
    setColumns((prev) => {
      const app = prev[currentStage]?.find((a) => a.id === appId);
      if (!app) return prev;
      const updatedApp = { ...app, status: newStage };
      return {
        ...prev,
        [currentStage]: prev[currentStage].filter((a) => a.id !== appId),
        [newStage]:      [...(prev[newStage] ?? []), updatedApp],
      };
    });

    // API call — revert on failure
    applicationsApi.updateStage(appId, STAGE_TO_ENUM[newStage] ?? newStage.toUpperCase())
      .then(() => showToast(`Moved to ${COLUMNS.find((c) => c.id === newStage)?.label ?? newStage}`, 'success'))
      .catch(() => {
        showToast('Failed to move — reverting', 'error');
        fetchApplications(selectedJobId);
      });
  }

  // ── Skill filter ───────────────────────────────────────────────────────────

  function toggleSkillFilter(skill: string) {
    setActiveSkillFilters((prev) => {
      const next = new Set(prev);
      next.has(skill) ? next.delete(skill) : next.add(skill);
      return next;
    });
  }

  // Collect all unique skills across all visible apps
  const allSkills = Array.from(
    new Set(Object.values(columns).flat().flatMap((a) => a.skills))
  ).sort();

  // ── Panel / column callbacks ────────────────────────────────────────────────

  function handleStageUpdatedFromPanel(appId: string, newStatus: string) {
    setColumns((prev) => {
      const currentStage = Object.entries(prev).find(([, apps]) =>
        apps.some((a) => a.id === appId)
      )?.[0];
      if (!currentStage || currentStage === newStatus) return prev;
      const app = prev[currentStage]?.find((a) => a.id === appId);
      if (!app) return prev;
      return {
        ...prev,
        [currentStage]: prev[currentStage].filter((a) => a.id !== appId),
        [newStatus]:     [...(prev[newStatus] ?? []), { ...app, status: newStatus }],
      };
    });
  }

  function handleNotesUpdated(appId: string, notes: string) {
    setColumns((prev) => {
      const updated = { ...prev };
      for (const [stage, apps] of Object.entries(prev)) {
        const idx = apps.findIndex((a) => a.id === appId);
        if (idx !== -1) {
          updated[stage] = [...apps];
          updated[stage][idx] = { ...apps[idx], notes };
          break;
        }
      }
      return updated;
    });
  }

  function handleCandidateAdded(app: PipelineApplicationDto) {
    setColumns((prev) => ({
      ...prev,
      [app.status]: [...(prev[app.status] ?? []), app],
    }));
  }

  const totalApps = Object.values(columns).reduce((sum, arr) => sum + arr.length, 0);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between gap-4 px-8 py-5 border-b border-[var(--color-border)] flex-shrink-0 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] leading-tight">Pipeline</h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            {appsLoading ? 'Loading…' : `${totalApps} candidate${totalApps !== 1 ? 's' : ''}${selectedJobId && jobs.length ? ` · ${jobs.find(j => j.id === selectedJobId)?.title ?? ''}` : ''}`}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Job selector */}
          <div className="relative">
            <SlidersHorizontal size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
            {jobsLoading ? (
              <div className="h-10 w-48 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] animate-pulse" />
            ) : (
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="h-10 pl-8 pr-9 rounded-xl border border-[var(--color-border)] bg-white text-sm text-[var(--color-primary)] font-medium outline-none cursor-pointer appearance-none hover:border-neutral-300 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 transition-colors"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'calc(100% - 12px) center',
                }}
              >
                {jobs.length === 0 && <option value="">No open jobs</option>}
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>{j.title}</option>
                ))}
              </select>
            )}
          </div>

          {/* Refresh */}
          <Button variant="secondary" size="sm" onClick={() => fetchApplications(selectedJobId)} disabled={appsLoading}>
            {appsLoading ? <Loader2 size={13} className="animate-spin" /> : null}
            Refresh
          </Button>
        </div>
      </header>

      {/* ── Skill filter bar ───────────────────────────────────────────────── */}
      {allSkills.length > 0 && (
        <div className="px-8 py-2.5 border-b border-[var(--color-border)] flex items-center gap-2 flex-wrap flex-shrink-0">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mr-1">
            Filter by skill:
          </span>
          {allSkills.slice(0, 20).map((skill) => {
            const active = activeSkillFilters.has(skill);
            return (
              <button
                key={skill}
                onClick={() => toggleSkillFilter(skill)}
                className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                  active
                    ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/50 hover:text-[var(--color-primary)]'
                }`}
              >
                {skill}
              </button>
            );
          })}
          {activeSkillFilters.size > 0 && (
            <button
              onClick={() => setActiveSkillFilters(new Set())}
              className="text-[11px] text-red-500 hover:underline ml-1 flex items-center gap-1"
            >
              <X size={10} /> Clear
            </button>
          )}
        </div>
      )}

      {/* ── Board ─────────────────────────────────────────────────────────── */}
      {appsError ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-red-600 mb-3">{appsError}</p>
            <Button variant="secondary" size="sm" onClick={() => fetchApplications(selectedJobId)}>Retry</Button>
          </div>
        </div>
      ) : appsLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={28} className="animate-spin text-[var(--color-text-muted)]" />
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 overflow-x-auto overflow-y-hidden">
            <div className="flex gap-4 px-8 py-5 min-w-max h-full items-start">
              {COLUMNS.map((col) => (
                <DroppableColumn
                  key={col.id}
                  col={col}
                  apps={columns[col.id] ?? []}
                  activeSkillFilters={activeSkillFilters}
                  onCardClick={(app) => router.push(
                    `/candidates/${app.candidateId}?fromJob=${selectedJobId}&fromJobTitle=${encodeURIComponent(jobs.find(j => j.id === selectedJobId)?.title ?? '')}`
                  )}
                  onSkillClick={toggleSkillFilter}
                  onAddClick={() => setAddModal({ stage: col.id })}
                />
              ))}
            </div>
          </div>

          {/* Ghost overlay while dragging */}
          <DragOverlay dropAnimation={null}>
            {dragActiveApp ? (
              <div className="w-[240px] rotate-2 shadow-2xl">
                <PipelineCandidateCard
                  app={dragActiveApp}
                  isDragging
                  onClick={() => {}}
                  onSkillClick={() => {}}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* ── Detail panel ──────────────────────────────────────────────────── */}
      {openPanelApp && (
        <CandidatePanel
          app={openPanelApp}
          onClose={() => setOpenPanelApp(null)}
          onStageUpdated={handleStageUpdatedFromPanel}
          onNotesUpdated={handleNotesUpdated}
        />
      )}

      {/* ── Add candidate modal ────────────────────────────────────────────── */}
      {addModal && selectedJobId && (
        <AddCandidateModal
          stage={addModal.stage}
          jobId={selectedJobId}
          onClose={() => setAddModal(null)}
          onAdded={handleCandidateAdded}
        />
      )}
    </div>
  );
}
