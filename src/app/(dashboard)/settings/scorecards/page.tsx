'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Plus, Pencil, Trash2, Copy, GripVertical, X,
  Star, ToggleLeft, AlignLeft, List, Loader2, ClipboardList,
} from 'lucide-react';
import { scorecardsApi, type ScorecardDto, type ScorecardCriterionDto } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

// ─── Types ────────────────────────────────────────────────────────────────────

type CriterionType = 'rating' | 'yes-no' | 'free-text' | 'multiple-choice';

interface LocalCriterion {
  id: string; // temp or real
  name: string;
  type: CriterionType;
  description: string;
  isRequired: boolean;
  position: number;
}

const CRITERION_TYPES: { value: CriterionType; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: 'rating',          label: 'Rating 1–5',       icon: <Star size={13} />,        desc: 'Star rating from 1 to 5' },
  { value: 'yes-no',          label: 'Yes / No',         icon: <ToggleLeft size={13} />,  desc: 'Binary toggle' },
  { value: 'free-text',       label: 'Free Text',        icon: <AlignLeft size={13} />,   desc: 'Open text response' },
  { value: 'multiple-choice', label: 'Multiple Choice',  icon: <List size={13} />,         desc: 'Select from options' },
];

const LABEL_CLASS = 'block text-sm font-medium text-[var(--color-text-primary)] mb-1.5';
let tempId = 0;
function nextTempId() { return `tmp-${++tempId}`; }

// ─── Draggable Criterion Row ──────────────────────────────────────────────────

function DraggableCriterion({
  crit,
  onUpdate,
  onDelete,
}: {
  crit: LocalCriterion;
  onUpdate: (id: string, patch: Partial<LocalCriterion>) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef: setDrag, transform, isDragging } = useDraggable({ id: crit.id });
  const { setNodeRef: setDrop, isOver } = useDroppable({ id: crit.id });

  const ref = (node: HTMLDivElement | null) => { setDrag(node); setDrop(node); };
  const style: React.CSSProperties = transform ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)`, zIndex: 50 } : {};

  return (
    <div
      ref={ref}
      style={style}
      className={`rounded-xl border bg-white transition-shadow ${isDragging ? 'opacity-40' : isOver ? 'border-[var(--color-primary)] shadow-md' : 'border-[var(--color-border)]'}`}
    >
      <div className="flex items-center gap-2 p-3 pb-2">
        <button type="button" {...listeners} {...attributes}
          className="cursor-grab active:cursor-grabbing text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] flex-shrink-0 touch-none"
          onPointerDown={(e) => e.stopPropagation()}>
          <GripVertical size={14} />
        </button>
        <input
          type="text"
          value={crit.name}
          onChange={(e) => onUpdate(crit.id, { name: e.target.value })}
          placeholder="Criterion name…"
          className="flex-1 text-sm font-medium bg-transparent text-[var(--color-text-primary)] focus:outline-none placeholder:text-[var(--color-text-muted)]"
        />
        <select
          value={crit.type}
          onChange={(e) => onUpdate(crit.id, { type: e.target.value as CriterionType })}
          className="text-xs rounded-lg border border-[var(--color-border)] px-2 py-1.5 bg-white text-[var(--color-text-primary)] focus:outline-none appearance-none"
        >
          {CRITERION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <label className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] cursor-pointer whitespace-nowrap">
          <input
            type="checkbox"
            checked={crit.isRequired}
            onChange={(e) => onUpdate(crit.id, { isRequired: e.target.checked })}
            className="w-3.5 h-3.5 accent-[var(--color-primary)]"
          />
          Required
        </label>
        <button type="button" onClick={() => onDelete(crit.id)} className="text-[var(--color-text-muted)] hover:text-red-500 transition-colors flex-shrink-0">
          <Trash2 size={13} />
        </button>
      </div>
      <div className="px-3 pb-3 pl-9">
        <input
          type="text"
          value={crit.description}
          onChange={(e) => onUpdate(crit.id, { description: e.target.value })}
          placeholder="Guidance notes for the interviewer (optional)…"
          className="w-full text-xs text-[var(--color-text-muted)] bg-transparent focus:outline-none placeholder:text-[var(--color-text-muted)]/60"
        />
      </div>
    </div>
  );
}

// ─── Preview ──────────────────────────────────────────────────────────────────

function CriterionPreview({ crit }: { crit: LocalCriterion }) {
  const typeCfg = CRITERION_TYPES.find((t) => t.value === crit.type);
  return (
    <div className="rounded-xl border border-[var(--color-border)] p-3.5 bg-white">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="text-sm font-medium text-[var(--color-text-primary)]">
            {crit.name || <span className="italic text-[var(--color-text-muted)]">Unnamed criterion</span>}
            {crit.isRequired && <span className="text-red-500 ml-0.5">*</span>}
          </p>
          {crit.description && <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{crit.description}</p>}
        </div>
        <span className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)] bg-[var(--color-surface)] border border-[var(--color-border)] px-1.5 py-0.5 rounded-md whitespace-nowrap flex-shrink-0">
          {typeCfg?.icon}{typeCfg?.label}
        </span>
      </div>
      {crit.type === 'rating' && (
        <div className="flex gap-1">
          {[1,2,3,4,5].map((n) => <Star key={n} size={16} className="text-neutral-200 fill-neutral-200" />)}
        </div>
      )}
      {crit.type === 'yes-no' && (
        <div className="flex gap-2">
          {['Yes','No'].map((o) => <span key={o} className="px-3 py-1 text-xs border border-[var(--color-border)] rounded-lg text-[var(--color-text-muted)]">{o}</span>)}
        </div>
      )}
      {crit.type === 'free-text' && (
        <div className="h-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]" />
      )}
      {crit.type === 'multiple-choice' && (
        <div className="flex gap-1.5 flex-wrap">
          {['Strong','Good','Average','Below Average','Poor'].map((o) => (
            <span key={o} className="px-2 py-0.5 text-[10px] border border-[var(--color-border)] rounded-md text-[var(--color-text-muted)]">{o}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Builder Modal ────────────────────────────────────────────────────────────

function BuilderModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: ScorecardDto;
  onSave: (sc: ScorecardDto) => void;
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const [name, setName]               = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [criteria, setCriteria]       = useState<LocalCriterion[]>(() =>
    initial?.criteria.map((c) => ({ ...c, type: c.type as CriterionType, description: c.description ?? '' })) ?? []
  );
  const [saving, setSaving]           = useState(false);
  const [activeId, setActiveId]       = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  function addCriterion() {
    setCriteria((prev) => [...prev, {
      id: nextTempId(), name: '', type: 'rating', description: '', isRequired: true, position: prev.length,
    }]);
  }

  function updateCriterion(id: string, patch: Partial<LocalCriterion>) {
    setCriteria((prev) => prev.map((c) => c.id === id ? { ...c, ...patch } : c));
  }

  function deleteCriterion(id: string) {
    setCriteria((prev) => prev.filter((c) => c.id !== id).map((c, i) => ({ ...c, position: i })));
  }

  function handleDragStart(e: DragStartEvent) { setActiveId(e.active.id as string); }
  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    if (!e.over || e.active.id === e.over.id) return;
    setCriteria((prev) => {
      const from = prev.findIndex((c) => c.id === e.active.id);
      const to   = prev.findIndex((c) => c.id === e.over!.id);
      if (from < 0 || to < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next.map((c, i) => ({ ...c, position: i }));
    });
  }

  async function handleSave() {
    if (!name.trim()) { showToast('Scorecard name is required', 'error'); return; }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        criteria: criteria.map((c, i) => ({
          name: c.name || 'Unnamed',
          type: c.type,
          description: c.description || undefined,
          isRequired: c.isRequired,
          position: i,
        })),
      };
      const result = initial
        ? await scorecardsApi.update(initial.id, payload)
        : await scorecardsApi.create(payload);
      showToast(initial ? 'Scorecard updated' : 'Scorecard created', 'success');
      onSave(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save scorecard';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  }

  const activeCrit = criteria.find((c) => c.id === activeId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative z-10 bg-[var(--color-bg-primary)] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] flex-shrink-0">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
            {initial ? 'Edit Scorecard' : 'Create Scorecard'}
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 size={13} className="animate-spin" /> : null}
              Save Scorecard
            </Button>
            <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] p-1.5 rounded-lg hover:bg-[var(--color-surface)] transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body: builder + preview */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Builder */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-4 max-w-xl">
              <div>
                <label className={LABEL_CLASS}>Scorecard Name <span className="text-red-500">*</span></label>
                <Input
                  placeholder="e.g. Engineering Technical Interview"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Description <span className="text-[var(--color-text-muted)] font-normal">(optional)</span></label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="What is this scorecard for?"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] resize-none"
                />
              </div>

              <div>
                <p className={LABEL_CLASS}>Evaluation Criteria</p>
                <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                  <div className="space-y-2">
                    {criteria.length === 0 && (
                      <div className="rounded-xl border-2 border-dashed border-[var(--color-border)] p-6 text-center">
                        <p className="text-sm text-[var(--color-text-muted)]">No criteria yet. Add one below.</p>
                      </div>
                    )}
                    {criteria.map((c) => (
                      <DraggableCriterion key={c.id} crit={c} onUpdate={updateCriterion} onDelete={deleteCriterion} />
                    ))}
                  </div>
                  <DragOverlay>
                    {activeCrit ? (
                      <div className="rounded-xl border border-[var(--color-primary)] bg-white shadow-xl p-3 flex items-center gap-2">
                        <GripVertical size={14} className="text-[var(--color-text-muted)]" />
                        <span className="text-sm font-medium">{activeCrit.name || 'Unnamed'}</span>
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
                <button
                  type="button"
                  onClick={addCriterion}
                  className="mt-2 flex items-center gap-2 w-full px-4 py-3 rounded-xl border-2 border-dashed border-[var(--color-border)] text-sm text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
                >
                  <Plus size={14} />
                  Add Criterion
                </button>
              </div>
            </div>
          </div>

          {/* Right: Preview */}
          <aside className="w-72 border-l border-[var(--color-border)] bg-white overflow-y-auto flex-shrink-0">
            <div className="p-5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-4">Live Preview</p>
              {name && (
                <div className="mb-4">
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">{name}</p>
                  {description && <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{description}</p>}
                </div>
              )}
              {criteria.length === 0 ? (
                <p className="text-xs text-[var(--color-text-muted)]">Add criteria to see the preview.</p>
              ) : (
                <div className="space-y-3">
                  {criteria.map((c) => <CriterionPreview key={c.id} crit={c} />)}
                </div>
              )}
              {criteria.length > 0 && (
                <div className="mt-5 pt-4 border-t border-[var(--color-border)]">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Summary</p>
                  <dl className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <dt className="text-[var(--color-text-muted)]">Total criteria</dt>
                      <dd className="font-medium">{criteria.length}</dd>
                    </div>
                    <div className="flex justify-between text-xs">
                      <dt className="text-[var(--color-text-muted)]">Required</dt>
                      <dd className="font-medium">{criteria.filter((c) => c.isRequired).length}</dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ScorecardsPage() {
  const { showToast } = useToast();
  const [scorecards, setScorecards] = useState<ScorecardDto[]>([]);
  const [loading, setLoading]       = useState(true);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editing, setEditing]       = useState<ScorecardDto | undefined>();
  const [deleting, setDeleting]     = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await scorecardsApi.getAll();
      setScorecards(res.scorecards);
    } catch {
      showToast('Failed to load scorecards', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  function handleSaved(sc: ScorecardDto) {
    setScorecards((prev) => {
      const idx = prev.findIndex((s) => s.id === sc.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = sc; return next; }
      return [sc, ...prev];
    });
    setBuilderOpen(false);
    setEditing(undefined);
  }

  async function handleDuplicate(sc: ScorecardDto) {
    try {
      const result = await scorecardsApi.create({
        name: `${sc.name} (copy)`,
        description: sc.description ?? undefined,
        criteria: sc.criteria.map((c) => ({
          name: c.name, type: c.type, description: c.description ?? undefined,
          isRequired: c.isRequired, position: c.position,
        })),
      });
      setScorecards((prev) => [result, ...prev]);
      showToast('Scorecard duplicated', 'success');
    } catch {
      showToast('Failed to duplicate', 'error');
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await scorecardsApi.delete(id);
      setScorecards((prev) => prev.filter((s) => s.id !== id));
      showToast('Scorecard deleted', 'success');
    } catch {
      showToast('Failed to delete', 'error');
    } finally {
      setDeleting(null);
    }
  }

  function openEdit(sc: ScorecardDto) {
    setEditing(sc);
    setBuilderOpen(true);
  }

  function openCreate() {
    setEditing(undefined);
    setBuilderOpen(true);
  }

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-primary)] tracking-tight">Scorecards</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Build reusable evaluation templates for your interview stages.
          </p>
        </div>
        <Button variant="primary" size="md" onClick={openCreate}>
          <Plus size={14} />
          Create Scorecard
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-[var(--color-border)] rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 w-48 bg-neutral-200 rounded" />
                  <div className="h-3 w-32 bg-neutral-100 rounded" />
                </div>
                <div className="flex gap-2">
                  {[24, 24, 24].map((w, j) => <div key={j} style={{ width: w, height: 24 }} className="bg-neutral-200 rounded-lg" />)}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : scorecards.length === 0 ? (
        <div className="border-2 border-dashed border-[var(--color-border)] rounded-2xl p-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center mx-auto mb-4">
            <ClipboardList size={20} className="text-[var(--color-text-muted)]" />
          </div>
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">No scorecards yet</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-4">Create your first scorecard to start evaluating candidates.</p>
          <Button variant="primary" size="sm" onClick={openCreate}>
            <Plus size={13} /> Create Scorecard
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {scorecards.map((sc) => (
            <div key={sc.id} className="bg-white border border-[var(--color-border)] rounded-2xl p-5 flex items-center gap-4 hover:shadow-card transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center flex-shrink-0">
                <ClipboardList size={18} className="text-[var(--color-primary)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">{sc.name}</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  {sc.criteriaCount} criteria · Created {new Date(sc.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => openEdit(sc)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/50 transition-colors"
                >
                  <Pencil size={12} /> Edit
                </button>
                <button
                  onClick={() => handleDuplicate(sc)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/50 transition-colors"
                >
                  <Copy size={12} /> Duplicate
                </button>
                <button
                  onClick={() => handleDelete(sc.id)}
                  disabled={deleting === sc.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-red-500 hover:border-red-300 transition-colors disabled:opacity-50"
                >
                  {deleting === sc.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {builderOpen && (
        <BuilderModal
          initial={editing}
          onSave={handleSaved}
          onClose={() => { setBuilderOpen(false); setEditing(undefined); }}
        />
      )}
    </div>
  );
}
