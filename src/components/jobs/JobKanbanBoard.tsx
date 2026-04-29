'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext, DragOverlay, useDraggable, useDroppable,
  MouseSensor, TouchSensor, useSensor, useSensors, closestCenter,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core';
import {
  Plus, X, Mail, Phone, MapPin, FileDown, Star,
  ChevronDown, Loader2, Search, Calendar, GitBranch, CalendarPlus,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { PipelineCandidateCard } from '@/components/pipeline/PipelineCandidateCard';
import {
  jobsApi, applicationsApi, candidatesApi,
  type WorkflowStageDto, type PipelineApplicationDto, type CandidateListDto,
} from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { ScheduleInterviewModal } from '@/components/scheduling/ScheduleInterviewModal';

// ─── Config ───────────────────────────────────────────────────────────────────

const DOT_CLASSES = [
  'bg-violet-400', 'bg-blue-400', 'bg-cyan-400', 'bg-amber-400',
  'bg-emerald-400', 'bg-rose-400', 'bg-orange-400', 'bg-pink-400',
];

// ─── DraggableCard ────────────────────────────────────────────────────────────

function DraggableCard({
  app, stageScorecardRequired, onClick,
}: {
  app: PipelineApplicationDto;
  stageScorecardRequired: boolean;
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
        stageScorecardRequired={stageScorecardRequired}
        onClick={onClick}
        onSkillClick={() => {}}
      />
    </div>
  );
}

// ─── DroppableColumn ──────────────────────────────────────────────────────────

function DroppableColumn({
  stageName, dotClass, requiresScorecard, apps, onCardClick, onAddClick,
}: {
  stageName: string;
  dotClass: string;
  requiresScorecard: boolean;
  apps: PipelineApplicationDto[];
  onCardClick: (app: PipelineApplicationDto) => void;
  onAddClick: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stageName });

  return (
    <div className="flex flex-col w-[240px] flex-shrink-0">
      {/* Column header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${dotClass}`} />
          <span className="text-xs font-semibold text-[var(--color-text-primary)] truncate max-w-[140px]">{stageName}</span>
          <span className="text-xs font-medium text-[var(--color-text-muted)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full px-1.5">
            {apps.length}
          </span>
        </div>
        <button
          onClick={onAddClick}
          className="w-5 h-5 rounded-md border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/50 hover:text-[var(--color-primary)] transition-colors"
          title={`Add candidate to ${stageName}`}
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
            stageScorecardRequired={requiresScorecard}
            onClick={() => onCardClick(app)}
          />
        ))}
        {apps.length === 0 && (
          <p className="text-[10px] text-[var(--color-text-muted)] text-center pt-4">Drop here</p>
        )}
      </div>
    </div>
  );
}

// ─── CandidatePanel ───────────────────────────────────────────────────────────

function CandidatePanel({
  app, stages, jobId, jobTitle, onClose, onStageUpdated, onNotesUpdated,
}: {
  app: PipelineApplicationDto;
  stages: WorkflowStageDto[];
  jobId: string;
  jobTitle: string;
  onClose: () => void;
  onStageUpdated: (appId: string, newStage: string) => void;
  onNotesUpdated: (appId: string, notes: string) => void;
}) {
  const { showToast } = useToast();
  const [noteText, setNoteText] = useState(app.notes ?? '');
  const [savingNotes, setSavingNotes] = useState(false);

  // Sync notes when app changes (e.g. after a stage move while panel is open)
  useEffect(() => { setNoteText(app.notes ?? ''); }, [app.notes]);
  const [showStageSelect, setShowStageSelect] = useState(false);
  const [movingStage, setMovingStage] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const scoreColor = app.score >= 85 ? 'text-emerald-600' : app.score >= 70 ? 'text-amber-500' : 'text-neutral-400';

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
    if (newStage === app.stage) { setShowStageSelect(false); return; }
    setMovingStage(true);
    try {
      await applicationsApi.updateSubStage(app.id, newStage);
      onStageUpdated(app.id, newStage);
      showToast('Stage updated', 'success');
      setShowStageSelect(false);
    } catch {
      showToast('Failed to update stage', 'error');
    } finally {
      setMovingStage(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]" onClick={onClose} />
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
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{app.stage ?? stages[0]?.stageName ?? '—'}</p>
              <span className={`flex items-center gap-1 text-xs font-bold mt-1 ${scoreColor}`}>
                <Star size={10} fill="currentColor" /> {app.score}
              </span>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Contact</p>
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

          {/* Skills */}
          {app.skills.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {app.skills.map((s) => (
                  <span key={s} className="text-xs px-2 py-0.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-muted)]">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* CV */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">CV</p>
            {app.cvUrl ? (
              <a href={app.cvUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-[var(--color-primary)] hover:underline font-medium">
                <FileDown size={13} /> Download CV
              </a>
            ) : (
              <p className="text-xs text-[var(--color-text-muted)]">No CV uploaded</p>
            )}
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-[10px] text-[var(--color-text-muted)] mb-0.5">Applied</p>
              <p className="font-medium text-[var(--color-text-primary)] flex items-center gap-1">
                <Calendar size={10} />
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
                {savingNotes && <Loader2 size={11} className="animate-spin" />}
                Save Notes
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--color-border)] p-4 flex-shrink-0 space-y-2">
          <Button
            variant="secondary"
            size="sm"
            className="w-full justify-center"
            onClick={() => setShowScheduleModal(true)}
          >
            <CalendarPlus size={13} />
            Schedule Interview
          </Button>
          <div className="relative">
            <Button
              variant="primary"
              size="sm"
              className="w-full justify-center"
              onClick={() => setShowStageSelect((v) => !v)}
              disabled={movingStage}
            >
              {movingStage && <Loader2 size={13} className="animate-spin" />}
              Move Stage
              <ChevronDown size={13} className={`ml-auto transition-transform ${showStageSelect ? 'rotate-180' : ''}`} />
            </Button>
            {showStageSelect && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl shadow-xl overflow-hidden z-10 max-h-48 overflow-y-auto">
                {stages.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => handleMoveStage(s.stageName)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left hover:bg-[var(--color-surface)] transition-colors ${s.stageName === app.stage ? 'font-semibold text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)]'}`}
                  >
                    <div className={`w-2 h-2 rounded-full ${DOT_CLASSES[i % DOT_CLASSES.length]}`} />
                    {s.stageName}
                    {s.stageName === app.stage && <span className="ml-auto text-[10px]">current</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Schedule Interview Modal */}
        <ScheduleInterviewModal
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          onScheduled={() => { setShowScheduleModal(false); showToast('Interview scheduled', 'success'); }}
          applicationId={app.id}
          jobId={jobId}
          jobTitle={jobTitle}
        />
      </div>
    </>
  );
}

// ─── AddCandidateModal ────────────────────────────────────────────────────────

function AddCandidateModal({
  stageName, jobId, onClose, onAdded,
}: {
  stageName: string;
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
      } catch { /* ignore */ } finally {
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
        status:       'APPLIED',
      });
      // Set the workflow stage — non-fatal if it fails (candidate still added)
      let assignedStage = stageName;
      try {
        await applicationsApi.updateSubStage(result.application.id, stageName);
      } catch {
        assignedStage = '';
      }
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
        stage:             assignedStage || null,
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
      showToast(`${candidate.name} added to ${stageName}`, 'success');
      onClose();
    } catch (err: unknown) {
      const msg = (err instanceof Error && err.message.includes('ALREADY_EXISTS'))
        ? 'Candidate already applied to this job'
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
              Adding to <span className="font-medium">{stageName}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
            <X size={16} />
          </button>
        </div>
        <div className="p-5">
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
            {searching && <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[var(--color-text-muted)]" />}
          </div>
          <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
            {!query && <p className="text-sm text-[var(--color-text-muted)] text-center py-6">Start typing to search candidates</p>}
            {query && !searching && results.length === 0 && <p className="text-sm text-[var(--color-text-muted)] text-center py-6">No candidates found</p>}
            {results.map((candidate) => (
              <div key={candidate.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[var(--color-surface)] transition-colors">
                <Avatar name={candidate.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{candidate.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)] truncate">{candidate.email}</p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => handleAdd(candidate)} disabled={addingId === candidate.id}>
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

// ─── JobKanbanBoard ───────────────────────────────────────────────────────────

export function JobKanbanBoard({
  jobId, jobTitle, stages,
}: {
  jobId: string;
  jobTitle: string;
  stages: WorkflowStageDto[];
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const [columns, setColumns] = useState<Record<string, PipelineApplicationDto[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dragActiveId, setDragActiveId] = useState<string | null>(null);
  const [openPanelApp, setOpenPanelApp] = useState<PipelineApplicationDto | null>(null);
  const [addModal, setAddModal] = useState<{ stageName: string } | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await jobsApi.getJobApplications(jobId);
      const grouped: Record<string, PipelineApplicationDto[]> =
        Object.fromEntries(stages.map((s) => [s.stageName, []]));
      const firstStage = stages[0]?.stageName ?? '';
      for (const app of res.applications) {
        const key = app.stage && grouped[app.stage] !== undefined ? app.stage : firstStage;
        if (key) grouped[key].push(app);
      }
      setColumns(grouped);
    } catch {
      setError('Failed to load applications.');
    } finally {
      setLoading(false);
    }
  }, [jobId, stages]);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  // Sync open panel on column updates
  useEffect(() => {
    if (openPanelApp) {
      const updated = Object.values(columns).flat().find((a) => a.id === openPanelApp.id);
      if (updated) setOpenPanelApp(updated);
    }
  }, [columns]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers ───────────────────────────────────────────────────────────────

  // Shared optimistic column move — used by both drag-drop and panel "Move Stage"
  function applyColumnMove(appId: string, newStage: string) {
    setColumns((prev) => {
      const currentStage = Object.entries(prev).find(([, apps]) =>
        apps.some((a) => a.id === appId)
      )?.[0];
      if (!currentStage || currentStage === newStage) return prev;
      const app = prev[currentStage]?.find((a) => a.id === appId);
      if (!app) return prev;
      return {
        ...prev,
        [currentStage]: prev[currentStage].filter((a) => a.id !== appId),
        [newStage]:      [...(prev[newStage] ?? []), { ...app, stage: newStage }],
      };
    });
  }

  // ── DnD ──────────────────────────────────────────────────────────────────

  const dragActiveApp = useMemo(
    () => dragActiveId ? Object.values(columns).flat().find((a) => a.id === dragActiveId) ?? null : null,
    [dragActiveId, columns],
  );

  function handleDragStart({ active }: DragStartEvent) {
    setDragActiveId(active.id as string);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setDragActiveId(null);
    if (!over) return;
    const appId = active.id as string;
    const newStage = over.id as string;

    const currentStage = Object.entries(columns).find(([, apps]) =>
      apps.some((a) => a.id === appId)
    )?.[0];
    if (!currentStage || currentStage === newStage) return;

    applyColumnMove(appId, newStage);

    applicationsApi.updateSubStage(appId, newStage)
      .then(() => showToast(`Moved to ${newStage}`, 'success'))
      .catch(() => {
        showToast('Failed to move — reverting', 'error');
        fetchApplications();
      });
  }

  // ── Callbacks ─────────────────────────────────────────────────────────────

  function handleStageUpdated(appId: string, newStage: string) {
    applyColumnMove(appId, newStage);
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
    const stageName = app.stage ?? stages[0]?.stageName ?? '';
    setColumns((prev) => ({
      ...prev,
      [stageName]: [...(prev[stageName] ?? []), app],
    }));
  }

  // ── Empty state ───────────────────────────────────────────────────────────

  if (stages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[var(--color-primary)]/10 flex items-center justify-center mb-5">
          <GitBranch size={26} className="text-[var(--color-primary)]" />
        </div>
        <p className="text-base font-semibold text-[var(--color-text-primary)]">No workflow configured</p>
        <p className="text-sm text-[var(--color-text-muted)] mt-1 max-w-sm">
          Configure a workflow on the <strong>Workflow</strong> tab to enable the pipeline board.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm text-red-600 mb-3">{error}</p>
        <Button variant="secondary" size="sm" onClick={fetchApplications}>Retry</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }

  const totalApps = Object.values(columns).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-[var(--color-text-muted)]">
          {totalApps} candidate{totalApps !== 1 ? 's' : ''} · {stages.length} stage{stages.length !== 1 ? 's' : ''}
        </p>
        <Button variant="secondary" size="sm" onClick={fetchApplications} disabled={loading}>
          {loading && <Loader2 size={13} className="animate-spin" />}
          Refresh
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="overflow-x-auto">
          <div className="flex gap-4 min-w-max pb-4">
            {stages.map((stage, i) => (
              <DroppableColumn
                key={stage.id}
                stageName={stage.stageName}
                dotClass={DOT_CLASSES[i % DOT_CLASSES.length]}
                requiresScorecard={stage.requiresScorecard}
                apps={columns[stage.stageName] ?? []}
                onCardClick={(app) => router.push(
                  `/candidates/${app.candidateId}?fromJob=${jobId}&fromJobTitle=${encodeURIComponent(jobTitle)}`
                )}
                onAddClick={() => setAddModal({ stageName: stage.stageName })}
              />
            ))}
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {dragActiveApp ? (
            <div className="w-[240px] rotate-2 shadow-2xl">
              <PipelineCandidateCard app={dragActiveApp} isDragging onClick={() => {}} onSkillClick={() => {}} stageScorecardRequired={false} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {openPanelApp && (
        <CandidatePanel
          app={openPanelApp}
          stages={stages}
          jobId={jobId}
          jobTitle={jobTitle}
          onClose={() => setOpenPanelApp(null)}
          onStageUpdated={handleStageUpdated}
          onNotesUpdated={handleNotesUpdated}
        />
      )}

      {addModal && (
        <AddCandidateModal
          stageName={addModal.stageName}
          jobId={jobId}
          onClose={() => setAddModal(null)}
          onAdded={handleCandidateAdded}
        />
      )}
    </>
  );
}
