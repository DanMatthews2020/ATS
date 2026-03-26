'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, MessageSquare, Loader2, Trash2, GripVertical, X,
  Star, ThumbsUp, AlignLeft, CheckCircle, Zap, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/contexts/ToastContext';
import {
  feedbackFormsApi,
  type FeedbackFormDto,
  type FeedbackQuestion,
} from '@/lib/api';

// ─── Config ───────────────────────────────────────────────────────────────────

type QuestionType = FeedbackQuestion['type'];

const Q_TYPES: { value: QuestionType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'rating',         label: 'Rating',         icon: <Star size={13} />,        description: '1–5 star rating' },
  { value: 'yes-no',         label: 'Yes / No',        icon: <ThumbsUp size={13} />,    description: 'Binary choice' },
  { value: 'recommendation', label: 'Recommendation',  icon: <CheckCircle size={13} />, description: 'Hire / No Hire / Maybe' },
  { value: 'text',           label: 'Free Text',       icon: <AlignLeft size={13} />,   description: 'Open-ended answer' },
  { value: 'skill',          label: 'Skill Rating',    icon: <Zap size={13} />,         description: 'Rate a specific skill' },
];

function qMeta(type: QuestionType) {
  return Q_TYPES.find((t) => t.value === type)!;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────

function DeleteModal({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-[var(--color-bg-primary)] rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-2">Delete Form</h3>
        <p className="text-sm text-[var(--color-text-muted)] mb-6">
          Delete <span className="font-medium text-[var(--color-text-primary)]">&ldquo;{name}&rdquo;</span>? All submissions will also be removed. This cannot be undone.
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" className="flex-1" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" size="sm" className="flex-1" onClick={onConfirm}>Delete Form</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Question Row ─────────────────────────────────────────────────────────────

function QuestionRow({ question, onChange, onDelete, onMoveUp, onMoveDown, isFirst, isLast }: {
  question: FeedbackQuestion;
  onChange: (q: FeedbackQuestion) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const meta = qMeta(question.type);

  return (
    <div className="group border border-[var(--color-border)] rounded-xl p-4 bg-[var(--color-bg-primary)] hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3">
        <GripVertical size={14} className="text-[var(--color-text-muted)] mt-0.5 cursor-grab flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
              {meta.icon} {meta.label}
            </span>
            <span className="text-[10px] text-[var(--color-text-muted)]">{meta.description}</span>
          </div>
          <input
            value={question.label}
            onChange={(e) => onChange({ ...question, label: e.target.value })}
            placeholder={`Question label…`}
            className="w-full h-9 px-3 text-sm border border-[var(--color-border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 mb-2"
          />
          {question.type === 'skill' && (
            <input
              value={question.skillName ?? ''}
              onChange={(e) => onChange({ ...question, skillName: e.target.value })}
              placeholder="Skill name (e.g. React, SQL, Communication)…"
              className="w-full h-9 px-3 text-sm border border-[var(--color-border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 mb-2"
            />
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={question.isRequired}
              onChange={(e) => onChange({ ...question, isRequired: e.target.checked })}
              className="rounded border-[var(--color-border)] accent-[var(--color-primary)]"
            />
            <span className="text-xs text-[var(--color-text-muted)]">Required</span>
          </label>
        </div>
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={onMoveUp} disabled={isFirst} className="p-1 rounded hover:bg-[var(--color-surface)] text-[var(--color-text-muted)] disabled:opacity-30 transition-colors">
            <ChevronUp size={12} />
          </button>
          <button onClick={onMoveDown} disabled={isLast} className="p-1 rounded hover:bg-[var(--color-surface)] text-[var(--color-text-muted)] disabled:opacity-30 transition-colors">
            <ChevronDown size={12} />
          </button>
          <button onClick={onDelete} className="p-1 rounded hover:bg-red-50 text-[var(--color-text-muted)] hover:text-red-500 transition-colors">
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Form Editor Panel ────────────────────────────────────────────────────────

function FormEditor({ form, onSaved, onClose }: {
  form: FeedbackFormDto | null;
  onSaved: (f: FeedbackFormDto) => void;
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const isEdit = !!form;

  const [name, setName] = useState(form?.name ?? '');
  const [stage, setStage] = useState(form?.stage ?? '');
  const [questions, setQuestions] = useState<FeedbackQuestion[]>(form?.questions ?? []);
  const [saving, setSaving] = useState(false);
  const [addingType, setAddingType] = useState(false);

  function addQuestion(type: QuestionType) {
    const newQ: FeedbackQuestion = { id: uid(), type, label: '', isRequired: false };
    setQuestions((prev) => [...prev, newQ]);
    setAddingType(false);
  }

  function updateQuestion(idx: number, q: FeedbackQuestion) {
    setQuestions((prev) => prev.map((x, i) => i === idx ? q : x));
  }

  function deleteQuestion(idx: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    setQuestions((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }

  function moveDown(idx: number) {
    setQuestions((prev) => {
      if (idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }

  async function handleSave() {
    if (!name.trim()) { showToast('Form name is required', 'error'); return; }
    if (questions.some((q) => !q.label.trim())) { showToast('All questions must have a label', 'error'); return; }
    setSaving(true);
    try {
      const payload = { name: name.trim(), stage: stage.trim() || undefined, questions };
      const res = isEdit
        ? await feedbackFormsApi.update(form!.id, payload)
        : await feedbackFormsApi.create(payload);
      onSaved(res.form ?? (res as { form: FeedbackFormDto }).form);
      showToast(isEdit ? 'Form updated' : 'Form created', 'success');
    } catch {
      showToast('Failed to save form', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Editor header */}
      <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
          {isEdit ? 'Edit Form' : 'New Form'}
        </h2>
        <button onClick={onClose} className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] rounded-lg hover:bg-[var(--color-surface)]">
          <X size={14} />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Meta */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Form Name <span className="text-red-500">*</span></label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Technical Interview Feedback"
              className="w-full h-10 px-3 text-sm border border-[var(--color-border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Stage <span className="opacity-60 font-normal">(optional)</span></label>
            <input
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              placeholder="e.g. Technical Interview, Final Round…"
              className="w-full h-10 px-3 text-sm border border-[var(--color-border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
            />
          </div>
        </div>

        {/* Questions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-medium text-[var(--color-text-muted)]">
              Questions <span className="ml-1 opacity-60">{questions.length}</span>
            </label>
          </div>

          <div className="space-y-2">
            {questions.map((q, idx) => (
              <QuestionRow
                key={q.id}
                question={q}
                onChange={(updated) => updateQuestion(idx, updated)}
                onDelete={() => deleteQuestion(idx)}
                onMoveUp={() => moveUp(idx)}
                onMoveDown={() => moveDown(idx)}
                isFirst={idx === 0}
                isLast={idx === questions.length - 1}
              />
            ))}
          </div>

          {/* Add question */}
          {addingType ? (
            <div className="mt-3 border border-[var(--color-border)] rounded-xl p-3 bg-[var(--color-surface)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[var(--color-text-muted)]">Choose question type</span>
                <button onClick={() => setAddingType(false)} className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
                  <X size={12} />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {Q_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => addQuestion(t.value)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--color-bg-primary)] text-left transition-colors"
                  >
                    <span className="text-[var(--color-text-muted)]">{t.icon}</span>
                    <div>
                      <p className="text-xs font-medium text-[var(--color-text-primary)]">{t.label}</p>
                      <p className="text-[10px] text-[var(--color-text-muted)]">{t.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingType(true)}
              className="mt-3 w-full flex items-center justify-center gap-2 h-9 border-2 border-dashed border-[var(--color-border)] rounded-xl text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-primary)]/40 transition-colors"
            >
              <Plus size={13} /> Add Question
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 p-5 border-t border-[var(--color-border)]">
        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="sm" isLoading={saving} onClick={handleSave}>
          {isEdit ? 'Save Changes' : 'Create Form'}
        </Button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FeedbackFormsPage() {
  const { showToast } = useToast();
  const [forms, setForms] = useState<FeedbackFormDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<FeedbackFormDto | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FeedbackFormDto | null>(null);

  const load = useCallback(() => {
    feedbackFormsApi.getAll()
      .then((d) => setForms(d.forms))
      .catch(() => showToast('Failed to load forms', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setSelected(null);
    setIsNew(true);
    setEditorOpen(true);
  }

  function openEdit(form: FeedbackFormDto) {
    setSelected(form);
    setIsNew(false);
    setEditorOpen(true);
  }

  function handleSaved(form: FeedbackFormDto) {
    if (isNew) {
      setForms((prev) => [form, ...prev]);
    } else {
      setForms((prev) => prev.map((f) => f.id === form.id ? form : f));
      setSelected(form);
    }
    setEditorOpen(false);
  }

  async function handleDelete(form: FeedbackFormDto) {
    try {
      await feedbackFormsApi.delete(form.id);
      setForms((prev) => prev.filter((f) => f.id !== form.id));
      if (selected?.id === form.id) setSelected(null);
      showToast('Form deleted', 'success');
    } catch {
      showToast('Failed to delete form', 'error');
    } finally {
      setDeleteTarget(null);
    }
  }

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  const STAGE_COLORS: Record<string, string> = {
    'Technical Interview': 'bg-blue-50 text-blue-700 border-blue-200',
    'Final Round':         'bg-purple-50 text-purple-700 border-purple-200',
    'Phone Screen':        'bg-amber-50 text-amber-700 border-amber-200',
  };

  function stageColor(stage: string | null) {
    if (!stage) return '';
    return STAGE_COLORS[stage] ?? 'bg-neutral-50 text-neutral-600 border-neutral-200';
  }

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Left panel — form list */}
      <div className="w-80 flex-shrink-0 border-r border-[var(--color-border)] flex flex-col">
        {/* List header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--color-border)]">
          <h1 className="text-sm font-semibold text-[var(--color-text-primary)]">Feedback Forms</h1>
          <button
            onClick={openNew}
            className="w-6 h-6 rounded-lg bg-[var(--color-primary)] text-white flex items-center justify-center hover:opacity-90 transition-opacity"
          >
            <Plus size={13} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={16} className="animate-spin text-[var(--color-text-muted)]" />
            </div>
          ) : forms.length === 0 ? (
            <div className="text-center px-4 py-10">
              <MessageSquare size={28} className="text-[var(--color-text-muted)] mx-auto mb-2" />
              <p className="text-xs text-[var(--color-text-muted)]">No forms yet</p>
              <button onClick={openNew} className="mt-3 text-xs text-[var(--color-primary)] hover:underline">Create your first form</button>
            </div>
          ) : (
            forms.map((form) => (
              <button
                key={form.id}
                onClick={() => { setSelected(form); setEditorOpen(false); }}
                className={`w-full text-left px-4 py-3 border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-surface)] group ${
                  selected?.id === form.id ? 'bg-[var(--color-primary)]/5 border-l-2 border-l-[var(--color-primary)]' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{form.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {form.stage && (
                        <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-md border ${stageColor(form.stage)}`}>
                          {form.stage}
                        </span>
                      )}
                      <span className="text-[10px] text-[var(--color-text-muted)]">
                        {form.questions.length} question{form.questions.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(form); }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Bottom CTA */}
        {forms.length > 0 && (
          <div className="p-3 border-t border-[var(--color-border)]">
            <button
              onClick={openNew}
              className="w-full flex items-center justify-center gap-2 h-8 rounded-xl text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] border border-dashed border-[var(--color-border)] transition-colors"
            >
              <Plus size={12} /> New Form
            </button>
          </div>
        )}
      </div>

      {/* Right panel */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {editorOpen ? (
          <FormEditor
            form={isNew ? null : selected}
            onSaved={handleSaved}
            onClose={() => setEditorOpen(false)}
          />
        ) : selected ? (
          /* Form detail view */
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-lg">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-[var(--color-text-primary)]">{selected.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    {selected.stage && (
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border ${stageColor(selected.stage)}`}>
                        {selected.stage}
                      </span>
                    )}
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {selected.submissionCount} submission{selected.submissionCount !== 1 ? 's' : ''}
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)]">·</span>
                    <span className="text-xs text-[var(--color-text-muted)]">Created {fmtDate(selected.createdAt)}</span>
                  </div>
                </div>
                <Button variant="secondary" size="sm" onClick={() => openEdit(selected)}>
                  Edit Form
                </Button>
              </div>

              {/* Questions preview */}
              {selected.questions.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-[var(--color-border)] rounded-2xl">
                  <MessageSquare size={24} className="text-[var(--color-text-muted)] mx-auto mb-2" />
                  <p className="text-sm text-[var(--color-text-muted)] mb-3">No questions yet</p>
                  <Button variant="secondary" size="sm" onClick={() => openEdit(selected)}>
                    <Plus size={13} /> Add Questions
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Questions</p>
                  {selected.questions.map((q, idx) => {
                    const meta = qMeta(q.type);
                    return (
                      <div key={q.id} className="flex items-start gap-3 p-4 border border-[var(--color-border)] rounded-xl">
                        <span className="text-xs font-semibold text-[var(--color-text-muted)] w-5 flex-shrink-0 mt-0.5">{idx + 1}.</span>
                        <div className="flex-1">
                          <p className="text-sm text-[var(--color-text-primary)]">{q.label || <span className="italic text-[var(--color-text-muted)]">No label</span>}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
                              {meta.icon} {meta.label}
                            </span>
                            {q.skillName && <span className="text-[10px] text-[var(--color-text-muted)]">· {q.skillName}</span>}
                            {q.isRequired && <span className="text-[10px] text-red-500">Required</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <MessageSquare size={40} className="text-[var(--color-text-muted)] mb-4" />
            <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">Feedback Forms</h2>
            <p className="text-sm text-[var(--color-text-muted)] mb-6 max-w-xs">
              Create structured feedback forms to gather consistent interviewer evaluations and hiring recommendations.
            </p>
            <Button variant="primary" size="sm" onClick={openNew}>
              <Plus size={14} /> Create Your First Form
            </Button>
          </div>
        )}
      </div>

      {deleteTarget && (
        <DeleteModal
          name={deleteTarget.name}
          onConfirm={() => handleDelete(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
