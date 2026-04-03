'use client';

import { useState, useEffect } from 'react';
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, sortableKeyboardCoordinates,
  arrayMove, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X, GripVertical, Trash2, Plus, AlertCircle } from 'lucide-react';
import { Button } from './Button';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BuilderStage {
  id: string;        // local-only UUID for React keys and dnd-kit
  stageName: string;
  stageType: string;
}

interface Props {
  isOpen: boolean;
  initialStages: BuilderStage[];
  onSave: (stages: BuilderStage[]) => void;
  onClose: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGE_TYPES = [
  { value: 'INTERVIEW',   label: 'Interview' },
  { value: 'ASSESSMENT',  label: 'Assessment' },
  { value: 'TASK',        label: 'Task' },
  { value: 'OFFER',       label: 'Offer' },
];

function uid() {
  return Math.random().toString(36).slice(2, 11);
}

function makeStage(stageName: string, stageType = 'INTERVIEW'): BuilderStage {
  return { id: uid(), stageName, stageType };
}

const TEMPLATES: { name: string; stages: Array<[string, string]> }[] = [
  {
    name: 'Tech Startup',
    stages: [
      ['Lead',                       'INTERVIEW'],
      ['Recruiter Screen',            'INTERVIEW'],
      ['Technical Assessment',        'ASSESSMENT'],
      ['Hiring Manager Interview',    'INTERVIEW'],
      ['Final Interview',             'INTERVIEW'],
      ['Offer',                       'OFFER'],
    ],
  },
  {
    name: 'Enterprise',
    stages: [
      ['Lead',                       'INTERVIEW'],
      ['Application Review',          'INTERVIEW'],
      ['Phone Screen',                'INTERVIEW'],
      ['Technical Round 1',           'ASSESSMENT'],
      ['Technical Round 2',           'ASSESSMENT'],
      ['Hiring Manager Interview',    'INTERVIEW'],
      ['Executive Interview',         'INTERVIEW'],
      ['Offer',                       'OFFER'],
    ],
  },
  {
    name: 'Sales Role',
    stages: [
      ['Lead',                       'INTERVIEW'],
      ['Recruiter Screen',            'INTERVIEW'],
      ['Sales Pitch Exercise',        'TASK'],
      ['Hiring Manager Interview',    'INTERVIEW'],
      ['Reference Check',             'TASK'],
      ['Offer',                       'OFFER'],
    ],
  },
  {
    name: 'Design Role',
    stages: [
      ['Lead',                       'INTERVIEW'],
      ['Portfolio Review',            'ASSESSMENT'],
      ['Design Challenge',            'TASK'],
      ['Team Interview',              'INTERVIEW'],
      ['Hiring Manager Interview',    'INTERVIEW'],
      ['Offer',                       'OFFER'],
    ],
  },
  {
    name: 'Start from scratch',
    stages: [
      ['Lead', 'INTERVIEW'],
    ],
  },
];

const SELECT_CLASS =
  'h-9 px-2.5 text-xs rounded-lg border border-[var(--color-border)] bg-white ' +
  'text-[var(--color-text-primary)] focus:outline-none focus:ring-2 ' +
  'focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] ' +
  'transition-shadow appearance-none';

// ─── Sortable Row ─────────────────────────────────────────────────────────────

function SortableRow({
  stage, index, total,
  onChangeName, onChangeType, onDelete,
}: {
  stage: BuilderStage;
  index: number;
  total: number;
  onChangeName: (id: string, v: string) => void;
  onChangeType: (id: string, v: string) => void;
  onDelete: (id: string) => void;
}) {
  const isLead = index === 0;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stage.id,
    disabled: isLead,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        'flex items-center gap-2 p-2.5 rounded-xl border bg-white',
        isDragging
          ? 'border-[var(--color-primary)] shadow-lg z-10'
          : 'border-[var(--color-border)] hover:border-neutral-300',
      ].join(' ')}
    >
      {/* Drag handle */}
      <div className="flex-shrink-0 w-5 flex items-center justify-center">
        {isLead ? (
          <div className="w-5" />
        ) : (
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="p-0.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] cursor-grab active:cursor-grabbing"
            aria-label="Drag to reorder"
          >
            <GripVertical size={15} />
          </button>
        )}
      </div>

      {/* Position badge */}
      <span className="flex-shrink-0 w-5 text-xs text-[var(--color-text-muted)] text-center tabular-nums">
        {index + 1}
      </span>

      {/* Name */}
      <input
        type="text"
        value={stage.stageName}
        onChange={(e) => onChangeName(stage.id, e.target.value)}
        placeholder="Stage name"
        className="flex-1 h-9 px-2.5 text-sm rounded-lg border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] transition-shadow"
      />

      {/* Type */}
      <select
        value={stage.stageType}
        onChange={(e) => onChangeType(stage.id, e.target.value)}
        className={SELECT_CLASS}
        aria-label="Stage type"
      >
        {STAGE_TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      {/* Delete */}
      <button
        type="button"
        onClick={() => onDelete(stage.id)}
        disabled={isLead || total <= 2}
        className="flex-shrink-0 p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        aria-label="Remove stage"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function WorkflowBuilderModal({ isOpen, initialStages, onSave, onClose }: Props) {
  const [stages, setStages] = useState<BuilderStage[]>([]);
  const [validationError, setValidationError] = useState('');

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStages(initialStages.length > 0 ? initialStages : []);
      setValidationError('');
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    function handler(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function applyTemplate(name: string) {
    const tpl = TEMPLATES.find((t) => t.name === name);
    if (!tpl) return;
    setStages(tpl.stages.map(([stageName, stageType]) => makeStage(stageName, stageType)));
    setValidationError('');
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setStages((prev) => {
      const oldIndex = prev.findIndex((s) => s.id === active.id);
      const newIndex = prev.findIndex((s) => s.id === over.id);
      if (newIndex === 0) return prev; // protect Lead position
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  function onChangeName(id: string, value: string) {
    setStages((prev) => prev.map((s) => s.id === id ? { ...s, stageName: value } : s));
    setValidationError('');
  }

  function onChangeType(id: string, value: string) {
    setStages((prev) => prev.map((s) => s.id === id ? { ...s, stageType: value } : s));
  }

  function onDelete(id: string) {
    setStages((prev) => prev.filter((s) => s.id !== id));
    setValidationError('');
  }

  function addStage() {
    setStages((prev) => [...prev, makeStage('', 'INTERVIEW')]);
  }

  function validate(): string | null {
    if (stages.length < 2) return 'At least 2 stages required.';
    const blanks = stages.filter((s) => !s.stageName.trim());
    if (blanks.length > 0) return 'All stages must have a name.';
    const names = stages.map((s) => s.stageName.trim().toLowerCase());
    if (new Set(names).size < names.length) return 'Stage names must be unique.';
    return null;
  }

  function handleSave() {
    const err = validate();
    if (err) { setValidationError(err); return; }
    onSave(stages);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal card */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[88vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--color-border)] flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Interview Workflow</h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              Define the stages candidates move through for this role
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Templates */}
          <div>
            <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
              Quick-start templates
            </p>
            <div className="flex flex-wrap gap-2">
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.name}
                  type="button"
                  onClick={() => applyTemplate(tpl.name)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-colors"
                >
                  + {tpl.name}
                </button>
              ))}
            </div>
          </div>

          {/* Stages */}
          {stages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 rounded-2xl border-2 border-dashed border-[var(--color-border)] text-center">
              <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">No stages yet</p>
              <p className="text-xs text-[var(--color-text-muted)] mb-4">Choose a template above or add stages manually</p>
              <Button type="button" variant="secondary" size="sm" onClick={addStage}>
                <Plus size={13} /> Add First Stage
              </Button>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                  Stages ({stages.length})
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">Drag ⠿ to reorder</p>
              </div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={stages.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {stages.map((stage, index) => (
                      <SortableRow
                        key={stage.id}
                        stage={stage}
                        index={index}
                        total={stages.length}
                        onChangeName={onChangeName}
                        onChangeType={onChangeType}
                        onDelete={onDelete}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              <button
                type="button"
                onClick={addStage}
                className="mt-3 flex items-center gap-1.5 px-3 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 rounded-xl transition-colors w-full"
              >
                <Plus size={14} />
                Add Stage
              </button>
            </div>
          )}

          {/* Validation error */}
          {validationError && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              <AlertCircle size={14} className="flex-shrink-0" />
              {validationError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--color-border)] flex-shrink-0">
          <Button type="button" variant="secondary" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="primary" size="md" onClick={handleSave}>
            Save Workflow
          </Button>
        </div>
      </div>
    </div>
  );
}
