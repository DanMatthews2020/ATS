'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  ChevronRight,
  Phone,
  Video,
  Building2,
  FileText,
  Gift,
  CheckCircle2,
  Loader2,
  Clipboard,
} from 'lucide-react';
import { workflowsApi, jobsApi, type WorkflowStageDto, type WorkflowTemplateDto } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type StageType = 'phone-screen' | 'video-call' | 'on-site' | 'take-home' | 'offer' | 'hired';

interface LocalStage {
  id: string; // may be a temp id before save
  stageName: string;
  stageType: StageType;
  description: string;
  requiresScorecard: boolean;
  position: number;
  isSaved: boolean; // false = not yet persisted
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGE_TYPES: { value: StageType; label: string; icon: React.ReactNode }[] = [
  { value: 'phone-screen', label: 'Phone Screen',    icon: <Phone size={14} /> },
  { value: 'video-call',   label: 'Video Call',      icon: <Video size={14} /> },
  { value: 'on-site',      label: 'On-site',         icon: <Building2 size={14} /> },
  { value: 'take-home',    label: 'Take Home Task',  icon: <FileText size={14} /> },
  { value: 'offer',        label: 'Offer',           icon: <Gift size={14} /> },
  { value: 'hired',        label: 'Hired',           icon: <CheckCircle2 size={14} /> },
];

const STAGE_COLORS: Record<StageType, string> = {
  'phone-screen': '#6366f1',
  'video-call':   '#0ea5e9',
  'on-site':      '#f59e0b',
  'take-home':    '#8b5cf6',
  'offer':        '#10b981',
  'hired':        '#22c55e',
};

const TEMPLATES: { id: string; label: string; stages: { stageName: string; stageType: StageType; description: string }[] }[] = [
  {
    id: 'engineering',
    label: 'Engineering',
    stages: [
      { stageName: 'Recruiter Screen',     stageType: 'phone-screen', description: 'Initial 30-min call to assess fit and background.' },
      { stageName: 'Technical Screen',     stageType: 'video-call',   description: 'Video call with engineer — coding fundamentals.' },
      { stageName: 'Take Home Assignment', stageType: 'take-home',    description: '4-hour practical task relevant to the role.' },
      { stageName: 'On-site Loop',         stageType: 'on-site',      description: 'Full-day loop with team members and leadership.' },
      { stageName: 'Offer',                stageType: 'offer',        description: 'Extend formal offer and negotiate terms.' },
    ],
  },
  {
    id: 'sales',
    label: 'Sales',
    stages: [
      { stageName: 'Initial Call',         stageType: 'phone-screen', description: 'Qualify candidate motivation and experience.' },
      { stageName: 'Sales Pitch Exercise', stageType: 'take-home',    description: 'Mock pitch deck or product demo exercise.' },
      { stageName: 'Manager Interview',    stageType: 'video-call',   description: '45-min structured interview with hiring manager.' },
      { stageName: 'Executive Round',      stageType: 'on-site',      description: 'Panel with VP and CRO.' },
      { stageName: 'Offer',                stageType: 'offer',        description: 'Compensation and start date negotiation.' },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    stages: [
      { stageName: 'Phone Screen',         stageType: 'phone-screen', description: 'Recruiter intro call — 20 mins.' },
      { stageName: 'Case Study',           stageType: 'take-home',    description: 'Process improvement or data analysis case.' },
      { stageName: 'Team Interview',       stageType: 'video-call',   description: 'Cross-functional panel video interview.' },
      { stageName: 'Offer',                stageType: 'offer',        description: 'Extend offer letter.' },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    stages: [
      { stageName: 'Recruiter Screen',     stageType: 'phone-screen', description: 'Portfolio review and background call.' },
      { stageName: 'Creative Exercise',    stageType: 'take-home',    description: 'Campaign brief or copy writing task.' },
      { stageName: 'Marketing Director',   stageType: 'video-call',   description: 'Structured interview with marketing leadership.' },
      { stageName: 'On-site Presentation', stageType: 'on-site',      description: 'Present creative exercise to the team.' },
      { stageName: 'Offer',                stageType: 'offer',        description: 'Compensation and timeline discussion.' },
    ],
  },
];

// ─── Draggable Stage Row ──────────────────────────────────────────────────────

function DraggableStageRow({
  stage,
  onUpdate,
  onDelete,
}: {
  stage: LocalStage;
  onUpdate: (id: string, patch: Partial<LocalStage>) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({ id: stage.id });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: stage.id });

  const ref = useCallback(
    (node: HTMLDivElement | null) => {
      setDragRef(node);
      setDropRef(node);
    },
    [setDragRef, setDropRef],
  );

  const style: React.CSSProperties = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
    : {};

  return (
    <div
      ref={ref}
      style={style}
      className={`rounded-2xl border bg-white transition-shadow ${
        isDragging ? 'opacity-40' : isOver ? 'border-[var(--color-primary)] shadow-md' : 'border-[var(--color-border)]'
      }`}
    >
      <div className="flex items-center gap-3 p-4 pb-3">
        {/* Drag handle */}
        <button
          type="button"
          {...listeners}
          {...attributes}
          className="cursor-grab active:cursor-grabbing text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] flex-shrink-0 touch-none"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <GripVertical size={16} />
        </button>

        {/* Stage icon */}
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-white"
          style={{ backgroundColor: STAGE_COLORS[stage.stageType] }}
        >
          {STAGE_TYPES.find((t) => t.value === stage.stageType)?.icon}
        </div>

        {/* Stage name */}
        <input
          type="text"
          value={stage.stageName}
          onChange={(e) => onUpdate(stage.id, { stageName: e.target.value })}
          placeholder="Stage name…"
          className="flex-1 text-sm font-medium text-[var(--color-text-primary)] bg-transparent focus:outline-none placeholder:text-[var(--color-text-muted)]"
        />

        {/* Type selector */}
        <select
          value={stage.stageType}
          onChange={(e) => onUpdate(stage.id, { stageType: e.target.value as StageType })}
          className="text-xs rounded-lg border border-[var(--color-border)] px-2 py-1.5 bg-white text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 appearance-none"
        >
          {STAGE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        {/* Delete */}
        <button
          type="button"
          onClick={() => onDelete(stage.id)}
          className="text-[var(--color-text-muted)] hover:text-red-500 transition-colors flex-shrink-0"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Description + scorecard */}
      <div className="px-4 pb-4 pl-14 flex gap-4 items-start">
        <input
          type="text"
          value={stage.description}
          onChange={(e) => onUpdate(stage.id, { description: e.target.value })}
          placeholder="Add a description (optional)…"
          className="flex-1 text-xs text-[var(--color-text-muted)] bg-transparent focus:outline-none placeholder:text-[var(--color-text-muted)]/60"
        />
        <label className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] whitespace-nowrap flex-shrink-0 cursor-pointer">
          <input
            type="checkbox"
            checked={stage.requiresScorecard}
            onChange={(e) => onUpdate(stage.id, { requiresScorecard: e.target.checked })}
            className="w-3.5 h-3.5 accent-[var(--color-primary)]"
          />
          Scorecard required
        </label>
      </div>
    </div>
  );
}

// ─── Preview Node ─────────────────────────────────────────────────────────────

function PreviewNode({ stage, index, total }: { stage: LocalStage; index: number; total: number }) {
  return (
    <div className="relative flex flex-col items-center">
      <div className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-white shadow-sm">
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 text-white"
          style={{ backgroundColor: STAGE_COLORS[stage.stageType] }}
        >
          {STAGE_TYPES.find((t) => t.value === stage.stageType)?.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-[var(--color-text-primary)] truncate">
            {stage.stageName || 'Untitled Stage'}
          </p>
          <p className="text-[10px] text-[var(--color-text-muted)]">
            {STAGE_TYPES.find((t) => t.value === stage.stageType)?.label}
          </p>
        </div>
        {stage.requiresScorecard && (
          <Clipboard size={10} className="text-[var(--color-text-muted)] flex-shrink-0" />
        )}
      </div>
      {index < total - 1 && (
        <div className="flex flex-col items-center my-1">
          <div className="w-px h-3 bg-[var(--color-border)]" />
          <ChevronRight size={10} className="text-[var(--color-text-muted)] rotate-90" />
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WorkflowBuilderPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;
  const { showToast } = useToast();

  const [jobTitle, setJobTitle]           = useState('');
  const [stages, setStages]               = useState<LocalStage[]>([]);
  const [workflowId, setWorkflowId]       = useState<string | null>(null);
  const [activeId, setActiveId]           = useState<string | null>(null);
  const [isSaving, setIsSaving]           = useState(false);
  const [isLoading, setIsLoading]         = useState(true);
  const tempCounter                        = useRef(0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  // Load existing workflow + job title on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [job, workflow] = await Promise.allSettled([
          jobsApi.getJob(jobId),
          workflowsApi.getByJobId(jobId),
        ]);

        if (cancelled) return;

        if (job.status === 'fulfilled') setJobTitle(job.value.job.title);

        if (workflow.status === 'fulfilled') {
          setWorkflowId(workflow.value.id);
          setStages(
            workflow.value.stages.map((s) => ({
              id: s.id,
              stageName: s.stageName,
              stageType: s.stageType as StageType,
              description: s.description ?? '',
              requiresScorecard: s.requiresScorecard,
              position: s.position,
              isSaved: true,
            })),
          );
        }
      } catch {
        // no workflow yet — start blank
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [jobId]);

  function makeTempId() {
    tempCounter.current += 1;
    return `tmp-${tempCounter.current}`;
  }

  function addStage() {
    setStages((prev) => [
      ...prev,
      {
        id: makeTempId(),
        stageName: '',
        stageType: 'phone-screen',
        description: '',
        requiresScorecard: false,
        position: prev.length,
        isSaved: false,
      },
    ]);
  }

  function updateStage(id: string, patch: Partial<LocalStage>) {
    setStages((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function deleteStage(id: string) {
    setStages((prev) => prev.filter((s) => s.id !== id).map((s, i) => ({ ...s, position: i })));
  }

  function applyTemplate(templateId: string) {
    const tpl = TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    setStages(
      tpl.stages.map((s, i) => ({
        id: makeTempId(),
        stageName: s.stageName,
        stageType: s.stageType,
        description: s.description,
        requiresScorecard: false,
        position: i,
        isSaved: false,
      })),
    );
  }

  // ── DnD handlers ──────────────────────────────────────────────────────────

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setStages((prev) => {
      const oldIndex = prev.findIndex((s) => s.id === active.id);
      const newIndex = prev.findIndex((s) => s.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(oldIndex, 1);
      next.splice(newIndex, 0, moved);
      return next.map((s, i) => ({ ...s, position: i }));
    });
  }

  // ── Save workflow ──────────────────────────────────────────────────────────

  async function save() {
    if (stages.length === 0) {
      showToast('Add at least one stage before saving', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const stagesPayload = stages.map((s) => ({
        stageName: s.stageName || 'Untitled Stage',
        stageType: s.stageType,
        description: s.description || undefined,
        requiresScorecard: s.requiresScorecard,
      }));

      if (workflowId) {
        // Update: patch name, then reorder + upsert stages via create anew
        // Simplest: delete all existing and re-create via a fresh workflow
        // Actually: call reorder if stages haven't changed, or just re-POST
        // For simplicity, always save as new workflow (backend handles unique constraint)
        // The cleanest approach: just create a new workflow (backend returns 409 if exists)
        // Instead, let's patch the existing workflow by updating name and reordering stages.
        // Since we track isSaved, we can diff — but for simplicity just recreate all stages.

        // Re-create: delete all old stages by calling PATCH reorder with empty list,
        // then add all new stages. But the easiest is to just call POST again — backend
        // will 409. So instead we need to send all stages fresh.

        // Best approach: the workflow exists, so we send reorder + we know stage IDs for saved ones.
        // For unsaved stages, add them. For deleted ones, they're no longer in state.
        // This is complex. Simplest working solution: save all as a fresh workflow by calling
        // the create endpoint with upsert semantics — but backend returns 409.
        // Solution: add an upsert endpoint. But we don't have one.
        // Instead: just update the workflow name, and for each stage that's new, add it,
        // then reorder by stage ID.

        // 1. Add all unsaved stages
        const updatedStages: WorkflowStageDto[] = [];
        for (const s of stages) {
          if (!s.isSaved) {
            const created = await workflowsApi.addStage(workflowId, {
              stageName: s.stageName || 'Untitled Stage',
              stageType: s.stageType,
              description: s.description || undefined,
              requiresScorecard: s.requiresScorecard,
            });
            updatedStages.push(created);
          } else {
            // Update the saved stage
            await workflowsApi.updateStage(workflowId, s.id, {
              stageName: s.stageName || 'Untitled Stage',
              stageType: s.stageType,
              description: s.description || undefined,
              requiresScorecard: s.requiresScorecard,
            });
            updatedStages.push({ id: s.id, stageName: s.stageName, stageType: s.stageType, description: s.description, requiresScorecard: s.requiresScorecard, position: s.position });
          }
        }

        // 2. Reorder with final IDs in order
        const orderedIds = stages.map((s) => {
          if (s.isSaved) return s.id;
          const created = updatedStages[stages.indexOf(s)];
          return created.id;
        });

        const result = await workflowsApi.reorderStages(workflowId, orderedIds);

        setWorkflowId(result.id);
        setStages(
          result.stages.map((s) => ({
            id: s.id,
            stageName: s.stageName,
            stageType: s.stageType as StageType,
            description: s.description ?? '',
            requiresScorecard: s.requiresScorecard,
            position: s.position,
            isSaved: true,
          })),
        );
      } else {
        // Create fresh
        const result = await workflowsApi.create({
          jobId,
          stages: stagesPayload,
        });
        setWorkflowId(result.id);
        setStages(
          result.stages.map((s) => ({
            id: s.id,
            stageName: s.stageName,
            stageType: s.stageType as StageType,
            description: s.description ?? '',
            requiresScorecard: s.requiresScorecard,
            position: s.position,
            isSaved: true,
          })),
        );
      }

      showToast('Workflow saved', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save workflow';
      showToast(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  }

  const activeStage = stages.find((s) => s.id === activeId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 size={20} className="animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--color-bg-primary)]">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/jobs/${jobId}`)}
            className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <ArrowLeft size={14} />
            Back
          </button>
          <span className="text-[var(--color-border)]">/</span>
          <span className="text-sm text-[var(--color-text-muted)] truncate max-w-[200px]">{jobTitle}</span>
          <span className="text-[var(--color-border)]">/</span>
          <span className="text-sm font-medium text-[var(--color-text-primary)]">Interview Workflow</span>
        </div>

        <button
          onClick={save}
          disabled={isSaving || stages.length === 0}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={13} className="animate-spin" /> : null}
          Save Workflow
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: Builder ────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-xl mx-auto">

            {/* Templates */}
            <div className="mb-6">
              <p className="text-xs font-medium text-[var(--color-text-muted)] mb-2">Start from a template</p>
              <div className="flex gap-2 flex-wrap">
                {TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => applyTemplate(tpl.id)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-colors"
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Stage list */}
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="space-y-3">
                {stages.length === 0 && (
                  <div className="rounded-2xl border-2 border-dashed border-[var(--color-border)] p-8 text-center">
                    <p className="text-sm text-[var(--color-text-muted)]">No stages yet.</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">Pick a template above or add a stage below.</p>
                  </div>
                )}
                {stages.map((stage) => (
                  <DraggableStageRow
                    key={stage.id}
                    stage={stage}
                    onUpdate={updateStage}
                    onDelete={deleteStage}
                  />
                ))}
              </div>

              <DragOverlay>
                {activeStage ? (
                  <div className="rounded-2xl border border-[var(--color-primary)] bg-white shadow-xl opacity-95 p-4">
                    <div className="flex items-center gap-3">
                      <GripVertical size={16} className="text-[var(--color-text-muted)]" />
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-white"
                        style={{ backgroundColor: STAGE_COLORS[activeStage.stageType] }}
                      >
                        {STAGE_TYPES.find((t) => t.value === activeStage.stageType)?.icon}
                      </div>
                      <span className="text-sm font-medium text-[var(--color-text-primary)]">
                        {activeStage.stageName || 'Untitled Stage'}
                      </span>
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>

            {/* Add stage button */}
            <button
              type="button"
              onClick={addStage}
              className="mt-4 flex items-center gap-2 w-full px-4 py-3 rounded-2xl border-2 border-dashed border-[var(--color-border)] text-sm text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
            >
              <Plus size={14} />
              Add Stage
            </button>
          </div>
        </div>

        {/* ── Right: Preview panel ─────────────────────────────────────── */}
        <aside className="w-72 border-l border-[var(--color-border)] bg-white overflow-y-auto flex-shrink-0">
          <div className="p-5">
            <h3 className="text-xs font-semibold text-[var(--color-text-primary)] uppercase tracking-wider mb-4">
              Pipeline Preview
            </h3>

            {stages.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)]">Add stages to see a preview.</p>
            ) : (
              <div className="flex flex-col">
                {/* Lead in */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] mb-1">
                  <div className="w-5 h-5 rounded-md bg-gray-200 flex items-center justify-center">
                    <span className="text-[9px] font-bold text-gray-500">IN</span>
                  </div>
                  <span className="text-[11px] font-medium text-[var(--color-text-muted)]">Application Received</span>
                </div>
                <div className="flex flex-col items-center my-1 ml-4">
                  <div className="w-px h-3 bg-[var(--color-border)]" />
                  <ChevronRight size={10} className="text-[var(--color-text-muted)] rotate-90" />
                </div>

                {stages.map((stage, i) => (
                  <PreviewNode key={stage.id} stage={stage} index={i} total={stages.length} />
                ))}

                <div className="flex flex-col items-center my-1 ml-4">
                  <div className="w-px h-3 bg-[var(--color-border)]" />
                  <ChevronRight size={10} className="text-[var(--color-text-muted)] rotate-90" />
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 border border-green-200">
                  <CheckCircle2 size={14} className="text-green-600" />
                  <span className="text-[11px] font-medium text-green-700">Decision</span>
                </div>
              </div>
            )}

            {stages.length > 0 && (
              <div className="mt-6 pt-4 border-t border-[var(--color-border)]">
                <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-semibold mb-2">Summary</p>
                <dl className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <dt className="text-[var(--color-text-muted)]">Total stages</dt>
                    <dd className="font-medium text-[var(--color-text-primary)]">{stages.length}</dd>
                  </div>
                  <div className="flex justify-between text-xs">
                    <dt className="text-[var(--color-text-muted)]">With scorecard</dt>
                    <dd className="font-medium text-[var(--color-text-primary)]">{stages.filter((s) => s.requiresScorecard).length}</dd>
                  </div>
                </dl>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
