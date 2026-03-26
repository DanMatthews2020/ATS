'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Search, Trash2, Save, X, ChevronDown, Eye, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/contexts/ToastContext';
import { emailTemplatesApi, type EmailTemplateDto } from '@/lib/api';

// ─── Config ───────────────────────────────────────────────────────────────────

const CATEGORIES = ['outreach', 'follow-up', 'interview', 'offer', 'rejection', 'onboarding', 'custom'] as const;
type Category = typeof CATEGORIES[number];

const CATEGORY_LABELS: Record<Category, string> = {
  outreach:   'Outreach',
  'follow-up':'Follow Up',
  interview:  'Interview',
  offer:      'Offer',
  rejection:  'Rejection',
  onboarding: 'Onboarding',
  custom:     'Custom',
};

const CATEGORY_COLORS: Record<Category, string> = {
  outreach:   'bg-blue-50 text-blue-700 border-blue-200',
  'follow-up':'bg-amber-50 text-amber-700 border-amber-200',
  interview:  'bg-purple-50 text-purple-700 border-purple-200',
  offer:      'bg-green-50 text-green-700 border-green-200',
  rejection:  'bg-red-50 text-red-700 border-red-200',
  onboarding: 'bg-teal-50 text-teal-700 border-teal-200',
  custom:     'bg-neutral-50 text-neutral-600 border-neutral-200',
};

const TEMPLATE_VARIABLES = [
  '{{candidateName}}',
  '{{recruiterName}}',
  '{{jobTitle}}',
  '{{companyName}}',
  '{{interviewDate}}',
  '{{interviewTime}}',
  '{{meetingLink}}',
];

const EXAMPLE_VARS: Record<string, string> = {
  '{{candidateName}}':  'Alex Johnson',
  '{{recruiterName}}':  'Sarah Taylor',
  '{{jobTitle}}':       'Senior Engineer',
  '{{companyName}}':    'TeamTalent',
  '{{interviewDate}}':  'Tuesday, April 8',
  '{{interviewTime}}':  '2:00 PM',
  '{{meetingLink}}':    'https://meet.google.com/abc-defg',
};

function applyPreviewVars(text: string) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => EXAMPLE_VARS[`{{${key}}}`] ?? `[${key}]`);
}

// ─── Variable Insert Button ───────────────────────────────────────────────────

function VarButton({ onInsert }: { onInsert: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-colors"
      >
        Insert variable <ChevronDown size={10} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-52 bg-white border border-[var(--color-border)] rounded-xl shadow-lg z-10 py-1.5">
          {TEMPLATE_VARIABLES.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => { onInsert(v); setOpen(false); }}
              className="w-full text-left px-3.5 py-2 text-xs font-mono text-[var(--color-primary)] hover:bg-[var(--color-surface)] transition-colors"
            >
              {v}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteModal({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-[var(--color-bg-primary)] rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-2">Delete Template</h3>
        <p className="text-sm text-[var(--color-text-muted)] mb-6">
          Delete <span className="font-medium text-[var(--color-text-primary)]">"{name}"</span>? This cannot be undone.
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" className="flex-1" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" size="sm" className="flex-1" onClick={onConfirm}>Delete</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Editor ───────────────────────────────────────────────────────────────────

interface EditorProps {
  initial: Partial<EmailTemplateDto> | null;
  onSaved: (t: EmailTemplateDto) => void;
  onCancel: () => void;
}

function TemplateEditor({ initial, onSaved, onCancel }: EditorProps) {
  const { showToast } = useToast();
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const [activePanel, setActivePanel] = useState<'edit' | 'preview'>('edit');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name:     initial?.name     ?? '',
    category: (initial?.category ?? 'custom') as Category,
    subject:  initial?.subject  ?? '',
    body:     initial?.body     ?? '',
    isShared: initial?.isShared ?? true,
  });

  function insertVar(v: string, field: 'subject' | 'body') {
    if (field === 'subject' && subjectRef.current) {
      const el = subjectRef.current;
      const start = el.selectionStart ?? el.value.length;
      const end   = el.selectionEnd   ?? el.value.length;
      const next  = el.value.slice(0, start) + v + el.value.slice(end);
      setForm((p) => ({ ...p, subject: next }));
      setTimeout(() => { el.selectionStart = el.selectionEnd = start + v.length; el.focus(); }, 0);
    } else if (field === 'body' && bodyRef.current) {
      const el = bodyRef.current;
      const start = el.selectionStart ?? el.value.length;
      const end   = el.selectionEnd   ?? el.value.length;
      const next  = el.value.slice(0, start) + v + el.value.slice(end);
      setForm((p) => ({ ...p, body: next }));
      setTimeout(() => { el.selectionStart = el.selectionEnd = start + v.length; el.focus(); }, 0);
    }
  }

  async function handleSave() {
    if (!form.name.trim() || !form.subject.trim() || !form.body.trim()) {
      showToast('Name, subject and body are required', 'error');
      return;
    }
    setSaving(true);
    try {
      let saved: EmailTemplateDto;
      if (initial?.id) {
        const res = await emailTemplatesApi.update(initial.id, form);
        saved = res.template;
      } else {
        const res = await emailTemplatesApi.create(form);
        saved = res.template;
      }
      onSaved(saved);
      showToast(initial?.id ? 'Template updated' : 'Template created', 'success');
    } catch {
      showToast('Failed to save template', 'error');
    } finally {
      setSaving(false);
    }
  }

  const isNew = !initial?.id;

  return (
    <div className="flex flex-col h-full">
      {/* Editor header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] flex-shrink-0">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
          {isNew ? 'New Template' : 'Edit Template'}
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-[var(--color-border)] overflow-hidden">
            <button
              onClick={() => setActivePanel('edit')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${activePanel === 'edit' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'}`}
            >
              <Pencil size={11} className="inline mr-1" />Edit
            </button>
            <button
              onClick={() => setActivePanel('preview')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${activePanel === 'preview' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'}`}
            >
              <Eye size={11} className="inline mr-1" />Preview
            </button>
          </div>
          <button onClick={onCancel} className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] rounded-lg hover:bg-[var(--color-surface)]">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Editor body */}
      <div className="flex-1 overflow-y-auto p-6">
        {activePanel === 'edit' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Template Name <span className="text-red-500">*</span></label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Initial Outreach"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value as Category }))}
                  className="w-full h-10 px-3 text-sm border border-[var(--color-border)] rounded-xl bg-white text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[var(--color-text-muted)]">Subject Line <span className="text-red-500">*</span></label>
                <VarButton onInsert={(v) => insertVar(v, 'subject')} />
              </div>
              <input
                ref={subjectRef}
                value={form.subject}
                onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                placeholder="e.g. Exciting opportunity — {{jobTitle}}"
                className="w-full h-10 px-3 text-sm border border-[var(--color-border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[var(--color-text-muted)]">Body <span className="text-red-500">*</span></label>
                <VarButton onInsert={(v) => insertVar(v, 'body')} />
              </div>
              <textarea
                ref={bodyRef}
                value={form.body}
                onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
                rows={12}
                placeholder="Hi {{candidateName}},&#10;&#10;..."
                className="w-full px-3 py-2.5 text-sm border border-[var(--color-border)] rounded-xl resize-none outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 font-mono leading-relaxed"
              />
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, isShared: !p.isShared }))}
                className={`relative w-9 h-5 rounded-full transition-colors ${form.isShared ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isShared ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
              <span className="text-sm text-[var(--color-text-secondary)]">Share with team</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-border)]">
              <p className="text-xs font-semibold text-[var(--color-text-muted)] mb-1">SUBJECT</p>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                {applyPreviewVars(form.subject) || <span className="text-[var(--color-text-muted)] italic">No subject</span>}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
              <p className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap leading-relaxed">
                {applyPreviewVars(form.body) || <span className="text-[var(--color-text-muted)] italic">No body</span>}
              </p>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] text-center">Preview uses example values for variables</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 px-6 py-4 border-t border-[var(--color-border)] flex-shrink-0">
        <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" size="sm" isLoading={saving} onClick={handleSave}>
          <Save size={13} /> {isNew ? 'Create Template' : 'Update Template'}
        </Button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EmailTemplatesPage() {
  const { showToast } = useToast();
  const [templates, setTemplates]     = useState<EmailTemplateDto[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | Category>('all');
  const [selected, setSelected]       = useState<EmailTemplateDto | null | 'new'>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmailTemplateDto | null>(null);

  useEffect(() => {
    emailTemplatesApi.getAll()
      .then((d) => setTemplates(d.templates))
      .catch(() => showToast('Failed to load templates', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = templates.filter((t) => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase());
    const matchCat    = activeCategory === 'all' || t.category === activeCategory;
    return matchSearch && matchCat;
  });

  const grouped = CATEGORIES.reduce<Record<Category, EmailTemplateDto[]>>((acc, c) => {
    acc[c] = filtered.filter((t) => t.category === c);
    return acc;
  }, {} as Record<Category, EmailTemplateDto[]>);

  function handleSaved(t: EmailTemplateDto) {
    setTemplates((prev) => {
      const idx = prev.findIndex((x) => x.id === t.id);
      return idx >= 0 ? prev.map((x, i) => i === idx ? t : x) : [t, ...prev];
    });
    setSelected(t);
  }

  async function handleDelete(t: EmailTemplateDto) {
    try {
      await emailTemplatesApi.delete(t.id);
      setTemplates((prev) => prev.filter((x) => x.id !== t.id));
      if (selected && selected !== 'new' && selected.id === t.id) setSelected(null);
      showToast('Template deleted', 'success');
    } catch {
      showToast('Failed to delete template', 'error');
    } finally {
      setDeleteTarget(null);
    }
  }

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  const showList  = activeCategory === 'all' ? filtered : filtered;
  const showEditor = selected !== null;

  return (
    <div className="flex h-full" style={{ height: 'calc(100vh - 57px)' }}>

      {/* ── Left panel ─────────────────────────────────────────────── */}
      <aside className="w-80 flex-shrink-0 border-r border-[var(--color-border)] flex flex-col bg-[var(--color-bg-primary)]">

        {/* Header */}
        <div className="px-4 pt-5 pb-4 border-b border-[var(--color-border)] flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-base font-semibold text-[var(--color-text-primary)]">Email Templates</h1>
            <Button variant="primary" size="sm" onClick={() => setSelected('new')}>
              <Plus size={13} /> New
            </Button>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates…"
              className="w-full h-8 pl-8 pr-3 text-sm border border-[var(--color-border)] rounded-lg outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>
        </div>

        {/* Category filter */}
        <div className="flex gap-1 px-3 py-2 border-b border-[var(--color-border)] overflow-x-auto flex-shrink-0">
          {(['all', ...CATEGORIES] as const).map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={`flex-shrink-0 px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors ${
                activeCategory === c
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]'
              }`}
            >
              {c === 'all' ? 'All' : CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 bg-[var(--color-surface)] rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)] text-center py-12 px-4">
              {search ? 'No templates match your search.' : 'No templates yet. Create your first one.'}
            </p>
          ) : activeCategory === 'all' ? (
            CATEGORIES.filter((c) => grouped[c].length > 0).map((c) => (
              <div key={c}>
                <p className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                  {CATEGORY_LABELS[c]}
                </p>
                {grouped[c].map((t) => (
                  <TemplateRow
                    key={t.id}
                    template={t}
                    isActive={selected !== 'new' && selected?.id === t.id}
                    onClick={() => setSelected(t)}
                    onDelete={() => setDeleteTarget(t)}
                  />
                ))}
              </div>
            ))
          ) : (
            filtered.map((t) => (
              <TemplateRow
                key={t.id}
                template={t}
                isActive={selected !== 'new' && selected?.id === t.id}
                onClick={() => setSelected(t)}
                onDelete={() => setDeleteTarget(t)}
              />
            ))
          )}
        </div>
      </aside>

      {/* ── Right panel ─────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0">
        {showEditor ? (
          <TemplateEditor
            initial={selected === 'new' ? null : selected}
            onSaved={handleSaved}
            onCancel={() => setSelected(null)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center flex-col gap-3 text-center p-8">
            <div className="w-14 h-14 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center mb-2">
              <Search size={22} className="text-[var(--color-text-muted)]" />
            </div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">Select a template to edit</p>
            <p className="text-xs text-[var(--color-text-muted)] max-w-xs">
              Choose a template from the list or create a new one to get started.
            </p>
            <Button variant="primary" size="sm" onClick={() => setSelected('new')}>
              <Plus size={13} /> New Template
            </Button>
          </div>
        )}
      </main>

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

function TemplateRow({ template, isActive, onClick, onDelete }: {
  template: EmailTemplateDto;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  const cat = template.category as Category;
  return (
    <div
      onClick={onClick}
      className={`group flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${isActive ? 'bg-[var(--color-primary)]/8 border-r-2 border-[var(--color-primary)]' : 'hover:bg-[var(--color-surface)]'}`}
    >
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-primary)]'}`}>{template.name}</p>
        <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">{template.subject}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border ${CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.custom}`}>
            {CATEGORY_LABELS[cat] ?? cat}
          </span>
          {template.isShared && (
            <span className="text-[10px] text-[var(--color-text-muted)]">Team</span>
          )}
        </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-50 transition-all"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}
