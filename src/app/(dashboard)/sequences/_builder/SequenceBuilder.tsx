'use client';

import {
  useState, useEffect, useRef, useLayoutEffect, useCallback,
} from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft, Mail, CheckSquare, Trash2, Plus,
  Bold, Italic, Underline, Link2, List, ListOrdered,
  Search, Info, X, Loader2, Check, AlertCircle, Cloud,
} from 'lucide-react';
import {
  sequencesApi, teamApi,
  type SequenceDetailDto, type TeamMemberDto,
} from '@/lib/api';
import {
  SEQUENCE_TOKENS, TOKEN_VARIABLE_TO_LABEL, CATEGORY_LABELS,
  type SequenceToken,
} from '@/lib/sequenceTokens';

// ── Types ─────────────────────────────────────────────────────────────────────

interface LocalStep {
  localId: string;
  serverId: string | null;
  position: number;
  type: 'EMAIL' | 'TASK';
  delayDays: number;
  subject: string;
  body: string;
  sendFrom: string | null;
  taskDescription: string;
  dirty: boolean;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// ── Constants ─────────────────────────────────────────────────────────────────

const DELAY_OPTIONS = [
  { label: 'Immediately',           days: 0 },
  { label: '1 day after previous',  days: 1 },
  { label: '2 days after',          days: 2 },
  { label: '3 days after',          days: 3 },
  { label: '5 days after',          days: 5 },
  { label: '7 days after',          days: 7 },
  { label: '10 days after',         days: 10 },
  { label: '14 days after',         days: 14 },
];

const CHIP_STYLE =
  'display:inline-block;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:9999px;padding:0 6px;font-size:11px;line-height:1.8;white-space:nowrap;cursor:default;user-select:none';

// ── Helpers ───────────────────────────────────────────────────────────────────

function newLocalStep(position: number): LocalStep {
  return {
    localId: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    serverId: null,
    position,
    type: 'EMAIL',
    delayDays: position === 0 ? 0 : 3,
    subject: '',
    body: '',
    sendFrom: null,
    taskDescription: '',
    dirty: true,
  };
}

function computeSendDate(stageIndex: number, steps: LocalStep[]): string {
  const now = new Date();
  let totalDays = 0;
  for (let i = 0; i <= stageIndex; i++) totalDays += steps[i].delayDays;

  if (totalDays === 0) {
    const h = now.getHours();
    const m = now.getMinutes();
    const ampm = h >= 12 ? 'pm' : 'am';
    const h12 = h % 12 || 12;
    return `Today, ${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
  }

  const d = new Date(now.getTime() + totalDays * 86_400_000);
  const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** Serialize contentEditable div → storage string (chip spans → {{token}}) */
function serializeBody(el: HTMLElement): string {
  const clone = el.cloneNode(true) as HTMLElement;
  clone.querySelectorAll<HTMLElement>('[data-token]').forEach((chip) => {
    chip.replaceWith(document.createTextNode(chip.getAttribute('data-token') ?? ''));
  });
  return clone.innerHTML;
}

/** Deserialize storage string → display HTML ({{token}} → chip spans) */
function deserializeBody(html: string): string {
  if (!html) return '';
  return html.replace(/\{\{\w+\}\}/g, (match) => {
    const label = TOKEN_VARIABLE_TO_LABEL.get(match) ?? match;
    return `<span contenteditable="false" data-token="${match}" style="${CHIP_STYLE}">${label}</span>`;
  });
}

// ── TokenPicker ───────────────────────────────────────────────────────────────

function TokenPicker({
  onSelect,
  onClose,
}: {
  onSelect: (token: SequenceToken) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const lower = search.toLowerCase();
  const filtered = SEQUENCE_TOKENS.filter((t) => t.label.toLowerCase().includes(lower));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <h3 className="text-sm font-semibold text-neutral-900">Select a token</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-neutral-100">
          <div className="flex items-center gap-2 bg-neutral-50 rounded-xl px-3 py-2">
            <Search size={13} className="text-neutral-400 flex-shrink-0" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="flex-1 text-sm bg-transparent outline-none text-neutral-900 placeholder:text-neutral-400"
            />
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto max-h-[340px]">
          {(['candidate', 'sender', 'job'] as const).map((cat) => {
            const tokens = filtered.filter((t) => t.category === cat);
            if (!tokens.length) return null;
            return (
              <div key={cat}>
                <p className="px-4 pt-3 pb-1 text-[10px] font-semibold tracking-wider text-neutral-400 sticky top-0 bg-white">
                  {CATEGORY_LABELS[cat]}
                </p>
                {tokens.map((token) => (
                  <button
                    key={token.variable}
                    onClick={() => onSelect(token)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 text-left group transition-colors"
                  >
                    <span
                      className={`w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${
                        token.icon === 'h1'
                          ? 'bg-purple-100 text-purple-600'
                          : 'bg-neutral-100 text-neutral-500'
                      }`}
                    >
                      {token.icon === 'h1' ? 'H1' : '='}
                    </span>
                    <span className="flex-1 text-sm text-neutral-800 group-hover:text-blue-700 transition-colors">
                      {token.label}
                    </span>
                    {token.hasInfo && (
                      <Info size={12} className="text-neutral-300 group-hover:text-blue-400 flex-shrink-0 transition-colors" />
                    )}
                  </button>
                ))}
              </div>
            );
          })}
          {!filtered.length && (
            <p className="text-sm text-neutral-400 text-center py-8">No tokens match &ldquo;{search}&rdquo;</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── BodyEditor ────────────────────────────────────────────────────────────────

interface BodyEditorProps {
  initialHtml: string;
  onChange: (html: string) => void;
  onRangeChange: (range: Range | null) => void;
  onTokenClick: () => void;
  editorRef: React.MutableRefObject<HTMLDivElement | null>;
}

function BodyEditor({ initialHtml, onChange, onRangeChange, onTokenClick, editorRef }: BodyEditorProps) {
  // Set initial content before first paint — no flash
  useLayoutEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = deserializeBody(initialHtml);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally mount-only

  // Track selection to know where to insert tokens
  useEffect(() => {
    function onSelChange() {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
        onRangeChange(sel.getRangeAt(0).cloneRange());
      }
    }
    document.addEventListener('selectionchange', onSelChange);
    return () => document.removeEventListener('selectionchange', onSelChange);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function execCmd(cmd: string, value?: string) {
    editorRef.current?.focus();
    // execCommand is deprecated but remains the only cross-browser way
    // for basic rich text in a contentEditable div without a library
    document.execCommand(cmd, false, value);
  }

  function handleLink() {
    const url = prompt('Enter URL:');
    if (url) execCmd('createLink', url);
  }

  const btn =
    'p-1.5 rounded hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800 transition-colors';

  return (
    <div className="border border-[var(--color-border)] rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[var(--color-primary)]/20">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <button type="button" title="Bold"        onMouseDown={(e) => { e.preventDefault(); execCmd('bold'); }}                  className={btn}><Bold size={12} /></button>
        <button type="button" title="Italic"      onMouseDown={(e) => { e.preventDefault(); execCmd('italic'); }}                className={btn}><Italic size={12} /></button>
        <button type="button" title="Underline"   onMouseDown={(e) => { e.preventDefault(); execCmd('underline'); }}             className={btn}><Underline size={12} /></button>
        <div className="w-px h-4 bg-[var(--color-border)] mx-1" />
        <button type="button" title="Link"        onMouseDown={(e) => { e.preventDefault(); handleLink(); }}                     className={btn}><Link2 size={12} /></button>
        <div className="w-px h-4 bg-[var(--color-border)] mx-1" />
        <button type="button" title="Bullet list" onMouseDown={(e) => { e.preventDefault(); execCmd('insertUnorderedList'); }}   className={btn}><List size={12} /></button>
        <button type="button" title="Numbered"    onMouseDown={(e) => { e.preventDefault(); execCmd('insertOrderedList'); }}     className={btn}><ListOrdered size={12} /></button>
        <div className="flex-1" />
        <button
          type="button"
          title="Insert token"
          onMouseDown={(e) => { e.preventDefault(); onTokenClick(); }}
          className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
        >
          <span className="font-mono">T</span>
          <span className="hidden sm:inline text-[10px]">Token</span>
        </button>
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={() => { if (editorRef.current) onChange(serializeBody(editorRef.current)); }}
        className="min-h-[180px] p-3 text-sm text-[var(--color-text-primary)] outline-none"
        style={{ lineHeight: '1.7' }}
      />
    </div>
  );
}

// ── StageCard ─────────────────────────────────────────────────────────────────

function StageCard({
  step, index, allSteps, isSelected, onClick, onDelete,
}: {
  step: LocalStep;
  index: number;
  allSteps: LocalStep[];
  isSelected: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-3 rounded-xl border transition-all ${
        isSelected
          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-sm'
          : 'border-[var(--color-border)] hover:bg-[var(--color-surface)]'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
              isSelected ? 'bg-[var(--color-primary)]/10' : 'bg-neutral-100'
            }`}
          >
            {step.type === 'EMAIL'
              ? <Mail size={13} className={isSelected ? 'text-[var(--color-primary)]' : 'text-neutral-500'} />
              : <CheckSquare size={13} className={isSelected ? 'text-[var(--color-primary)]' : 'text-neutral-500'} />
            }
          </div>
          <div className="text-left">
            <p className={`text-xs font-semibold leading-tight ${isSelected ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-primary)]'}`}>
              Stage {index + 1}
            </p>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5 leading-tight">
              Sending {computeSendDate(index, allSteps)}
            </p>
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1 rounded-lg text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </button>
  );
}

// ── StageEditor ───────────────────────────────────────────────────────────────

interface StageEditorProps {
  step: LocalStep;
  index: number;
  allSteps: LocalStep[];
  teamMembers: TeamMemberDto[];
  sequenceSenderEmail: string;
  onChange: (updates: Partial<LocalStep>) => void;
  onOpenSubjectTokenPicker: () => void;
  onOpenBodyTokenPicker: () => void;
  subjectInputRef: React.RefObject<HTMLInputElement>;
  bodyEditorRef: React.MutableRefObject<HTMLDivElement | null>;
  onRangeChange: (range: Range | null) => void;
}

function StageEditor({
  step, index, allSteps, teamMembers, sequenceSenderEmail,
  onChange, onOpenSubjectTokenPicker, onOpenBodyTokenPicker,
  subjectInputRef, bodyEditorRef, onRangeChange,
}: StageEditorProps) {
  const [showCc, setShowCc]   = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [cc, setCc]   = useState('');
  const [bcc, setBcc] = useState('');

  // Custom delay input when selected delay doesn't match presets
  const isCustomDelay = !DELAY_OPTIONS.some((o) => o.days === step.delayDays);
  const [customDays, setCustomDays] = useState(isCustomDelay ? String(step.delayDays) : '');

  const labelClass  = 'block text-xs font-medium text-[var(--color-text-muted)] mb-1.5';
  const inputClass  = 'w-full h-9 px-3 text-sm border border-[var(--color-border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 bg-white text-[var(--color-text-primary)]';
  const selectClass = 'h-9 px-3 text-sm border border-[var(--color-border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 bg-white text-[var(--color-text-primary)]';

  const sendDate = computeSendDate(index, allSteps);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Stage header */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Stage {index + 1}</h2>
      </div>

      {/* Type */}
      <div className="mb-5">
        <label className={labelClass}>Type</label>
        <select
          value={step.type}
          onChange={(e) => onChange({ type: e.target.value as 'EMAIL' | 'TASK' })}
          className={`${selectClass} w-full`}
        >
          <option value="EMAIL">✉️  Email</option>
          <option value="TASK">✓  Task</option>
        </select>
      </div>

      {/* Send timing */}
      <div className="mb-5">
        <label className={labelClass}>Send</label>
        <div className="flex items-center gap-2">
          <select
            value={isCustomDelay ? 'custom' : String(step.delayDays)}
            onChange={(e) => {
              if (e.target.value === 'custom') {
                setCustomDays('7');
                onChange({ delayDays: 7 });
              } else {
                onChange({ delayDays: Number(e.target.value) });
              }
            }}
            className={`${selectClass} flex-1`}
          >
            {DELAY_OPTIONS.map((o) => (
              <option key={o.days} value={String(o.days)}>{o.label}</option>
            ))}
            <option value="custom">Custom…</option>
          </select>

          {isCustomDelay && (
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={1}
                max={365}
                value={customDays}
                onChange={(e) => {
                  setCustomDays(e.target.value);
                  const n = parseInt(e.target.value, 10);
                  if (!isNaN(n) && n > 0) onChange({ delayDays: n });
                }}
                className="w-16 h-9 px-2 text-sm text-center border border-[var(--color-border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
              />
              <span className="text-xs text-[var(--color-text-muted)]">days</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)] whitespace-nowrap">
            <span>{sendDate} (approx.)</span>
            <Info size={11} className="text-[var(--color-text-muted)]" />
          </div>
        </div>
      </div>

      {step.type === 'EMAIL' ? (
        <>
          {/* From */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-1.5">
              <label className={labelClass.replace('mb-1.5', '')}>From</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCc(!showCc)}
                  className={`text-xs px-2 py-0.5 rounded transition-colors ${showCc ? 'text-blue-600 bg-blue-50' : 'text-[var(--color-text-muted)] hover:text-[var(--color-primary)]'}`}
                >
                  Cc
                </button>
                <button
                  type="button"
                  onClick={() => setShowBcc(!showBcc)}
                  className={`text-xs px-2 py-0.5 rounded transition-colors ${showBcc ? 'text-blue-600 bg-blue-50' : 'text-[var(--color-text-muted)] hover:text-[var(--color-primary)]'}`}
                >
                  Bcc
                </button>
              </div>
            </div>
            <select
              value={step.sendFrom ?? ''}
              onChange={(e) => onChange({ sendFrom: e.target.value || null })}
              className={`${selectClass} w-full`}
            >
              <option value="">— Inherit sequence sender{sequenceSenderEmail ? ` (${sequenceSenderEmail})` : ''} —</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.email}>
                  {m.name} &lt;{m.email}&gt;
                </option>
              ))}
            </select>

            {showCc && (
              <input
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="Cc..."
                className={`${inputClass} mt-2`}
              />
            )}
            {showBcc && (
              <input
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
                placeholder="Bcc..."
                className={`${inputClass} mt-2`}
              />
            )}
          </div>

          {/* Subject */}
          <div className="mb-5">
            <label className={labelClass}>Subject</label>
            <div className="flex items-center gap-2">
              <input
                ref={subjectInputRef}
                value={step.subject}
                onChange={(e) => onChange({ subject: e.target.value })}
                onClick={(e) => {
                  const t = e.currentTarget;
                  // cursor pos updated on every click/keyup in SequenceBuilder
                }}
                onKeyUp={() => {}}
                placeholder="e.g. Quick question about your experience"
                className={`${inputClass} flex-1`}
              />
              <button
                type="button"
                onClick={onOpenSubjectTokenPicker}
                className="flex-shrink-0 h-9 px-2.5 text-[11px] font-semibold text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                title="Insert token"
              >
                T
              </button>
            </div>
          </div>

          {/* Body */}
          <div>
            <label className={labelClass}>
              Body <span className="text-red-500">*</span>
            </label>
            <BodyEditor
              key={step.localId}
              initialHtml={step.body}
              onChange={(html) => onChange({ body: html })}
              onRangeChange={onRangeChange}
              onTokenClick={onOpenBodyTokenPicker}
              editorRef={bodyEditorRef}
            />
          </div>
        </>
      ) : (
        /* Task type */
        <div>
          <label className={labelClass}>Task Description</label>
          <textarea
            value={step.taskDescription}
            onChange={(e) => onChange({ taskDescription: e.target.value })}
            placeholder="e.g. Call the candidate to introduce yourself…"
            rows={5}
            className="w-full px-3 py-2.5 text-sm border border-[var(--color-border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 resize-none text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]"
          />
        </div>
      )}
    </div>
  );
}

// ── SequenceBuilder ───────────────────────────────────────────────────────────

interface SequenceBuilderProps {
  initialSequence?: SequenceDetailDto;
}

export default function SequenceBuilder({ initialSequence }: SequenceBuilderProps) {
  const router = useRouter();

  // ── Sequence metadata state ───────────────────────────────────────────────
  const [name, setName]               = useState(initialSequence?.name ?? '');
  const [senderEmail, setSenderEmail] = useState(initialSequence?.senderEmail ?? '');
  const [teamMembers, setTeamMembers] = useState<TeamMemberDto[]>([]);

  // ── Steps state ───────────────────────────────────────────────────────────
  const [steps, setSteps] = useState<LocalStep[]>(() => {
    if (!initialSequence?.steps?.length) return [];
    return [...initialSequence.steps]
      .sort((a, b) => a.position - b.position)
      .map((s) => ({
        localId:         s.id,
        serverId:        s.id,
        position:        s.position,
        type:            (s.type === 'TASK' ? 'TASK' : 'EMAIL') as 'EMAIL' | 'TASK',
        delayDays:       s.delayDays,
        subject:         s.subject ?? '',
        body:            s.body ?? '',
        sendFrom:        s.sendFrom ?? null,
        taskDescription: s.taskDescription ?? '',
        dirty:           false,
      }));
  });

  const [selectedIdx, setSelectedIdx] = useState<number | null>(
    initialSequence?.steps?.length ? 0 : null,
  );

  const [saveStatus, setSaveStatus]   = useState<SaveStatus>('idle');
  const [tokenTarget, setTokenTarget] = useState<'subject' | 'body' | null>(null);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const seqIdRef        = useRef<string | null>(initialSequence?.id ?? null);
  const nameRef         = useRef(initialSequence?.name ?? '');
  const senderEmailRef  = useRef(initialSequence?.senderEmail ?? '');
  const stepsRef        = useRef<LocalStep[]>(steps);
  const saveTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef       = useRef(false);
  const pendingSaveRef  = useRef(false);
  const isCreatingRef   = useRef(false);
  const subjectInputRef = useRef<HTMLInputElement>(null);
  const bodyEditorRef   = useRef<HTMLDivElement | null>(null);
  const subjectCursorRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });
  const savedRangeRef   = useRef<Range | null>(null);

  // Keep refs in sync with state
  useEffect(() => { nameRef.current = name; }, [name]);
  useEffect(() => { senderEmailRef.current = senderEmail; }, [senderEmail]);
  useEffect(() => { stepsRef.current = steps; }, [steps]);

  // Load team members once
  useEffect(() => {
    teamApi.getAll().then((d) => setTeamMembers(d.members)).catch(() => {});
  }, []);

  // ── Auto-save logic ───────────────────────────────────────────────────────

  const doSave = useCallback(async () => {
    if (savingRef.current) { pendingSaveRef.current = true; return; }
    savingRef.current = true;
    setSaveStatus('saving');

    try {
      let id = seqIdRef.current;

      // Step 1 — ensure sequence exists
      if (!id) {
        if (isCreatingRef.current) {
          // Another creation is in flight; queue a retry
          pendingSaveRef.current = true;
          savingRef.current = false;
          return;
        }
        isCreatingRef.current = true;
        try {
          const res = await sequencesApi.create({
            name: nameRef.current.trim() || 'Untitled Sequence',
            senderEmail: senderEmailRef.current || undefined,
          });
          id = res.sequence.id;
          seqIdRef.current = id;
          // Update URL without triggering Next.js navigation / page re-mount
          window.history.replaceState(null, '', `/sequences/${id}/edit`);
        } finally {
          isCreatingRef.current = false;
        }
      } else {
        // Step 2 — patch metadata
        await sequencesApi.update(id, {
          name: nameRef.current.trim() || 'Untitled Sequence',
          senderEmail: senderEmailRef.current || undefined,
        });
      }

      // Step 3 — persist dirty steps in order
      const current = stepsRef.current;
      const updated  = [...current];
      let anyChanged = false;

      for (let i = 0; i < updated.length; i++) {
        const s = updated[i];
        if (!s.dirty) continue;
        anyChanged = true;

        const payload = {
          type:            s.type as 'EMAIL' | 'TASK',
          subject:         s.subject || undefined,
          body:            s.body || undefined,
          delayDays:       s.delayDays,
          sendFrom:        s.sendFrom || undefined,
          taskDescription: s.taskDescription || undefined,
          position:        s.position,
        };

        if (!s.serverId) {
          const res = await sequencesApi.addStep(id!, payload);
          updated[i] = { ...s, serverId: res.step.id, dirty: false };
        } else {
          await sequencesApi.updateStep(id!, s.serverId, payload);
          updated[i] = { ...s, dirty: false };
        }
      }

      if (anyChanged) {
        stepsRef.current = updated;
        setSteps(updated);
      }

      setSaveStatus('saved');
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
    } finally {
      savingRef.current = false;
      if (pendingSaveRef.current) {
        pendingSaveRef.current = false;
        doSave();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scheduleSave = useCallback((delay = 500) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(doSave, delay);
  }, [doSave]);

  // ── Step helpers ──────────────────────────────────────────────────────────

  function updateSelectedStep(updates: Partial<LocalStep>) {
    if (selectedIdx === null) return;
    setSteps((prev) => {
      const next = prev.map((s, i) =>
        i === selectedIdx ? { ...s, ...updates, dirty: true } : s,
      );
      stepsRef.current = next;
      return next;
    });
    scheduleSave();
  }

  function addStageAt(insertIdx: number) {
    const fresh = newLocalStep(insertIdx);
    setSteps((prev) => {
      const before = prev.slice(0, insertIdx);
      const after  = prev
        .slice(insertIdx)
        .map((s, i) => ({ ...s, position: insertIdx + 1 + i, dirty: true }));
      const next   = [...before, fresh, ...after];
      stepsRef.current = next;
      return next;
    });
    setSelectedIdx(insertIdx);
    scheduleSave();
  }

  function deleteStageAt(index: number) {
    const step = stepsRef.current[index];
    const newCount = stepsRef.current.length - 1;

    // Fire-and-forget server deletion
    if (step.serverId && seqIdRef.current) {
      sequencesApi.deleteStep(seqIdRef.current, step.serverId).catch(() => {});
    }

    setSteps((prev) => {
      const next = prev
        .filter((_, i) => i !== index)
        .map((s, i) => ({ ...s, position: i, dirty: true }));
      stepsRef.current = next;
      return next;
    });

    setSelectedIdx((prev) => {
      if (newCount === 0) return null;
      if (prev === null) return null;
      if (prev > index) return prev - 1;
      if (prev === index) return Math.min(index, newCount - 1);
      return prev;
    });

    if (newCount > 0) scheduleSave();
  }

  // ── Token picker helpers ──────────────────────────────────────────────────

  function openSubjectTokenPicker() {
    if (subjectInputRef.current) {
      subjectCursorRef.current = {
        start: subjectInputRef.current.selectionStart ?? 0,
        end:   subjectInputRef.current.selectionEnd   ?? 0,
      };
    }
    setTokenTarget('subject');
  }

  function openBodyTokenPicker() {
    // Selection already tracked by onRangeChange in BodyEditor
    setTokenTarget('body');
  }

  function handleTokenSelect(token: SequenceToken) {
    if (tokenTarget === 'subject') {
      const { start, end } = subjectCursorRef.current;
      const current = stepsRef.current[selectedIdx ?? 0]?.subject ?? '';
      const next = current.slice(0, start) + token.variable + current.slice(end);
      updateSelectedStep({ subject: next });
      // Restore cursor after re-render
      setTimeout(() => {
        if (subjectInputRef.current) {
          const pos = start + token.variable.length;
          subjectInputRef.current.focus();
          subjectInputRef.current.setSelectionRange(pos, pos);
        }
      }, 0);
    } else if (tokenTarget === 'body' && bodyEditorRef.current) {
      const chip = document.createElement('span');
      chip.setAttribute('contenteditable', 'false');
      chip.setAttribute('data-token', token.variable);
      chip.style.cssText = CHIP_STYLE;
      chip.textContent = token.label;

      const range = savedRangeRef.current;
      const editorEl = bodyEditorRef.current;

      if (range && editorEl.contains(range.startContainer)) {
        range.deleteContents();
        range.insertNode(chip);
        // Place cursor after chip
        const after = document.createRange();
        after.setStartAfter(chip);
        after.collapse(true);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(after);
      } else {
        // Fallback: append to end
        editorEl.appendChild(chip);
      }

      updateSelectedStep({ body: serializeBody(editorEl) });
      setTimeout(() => bodyEditorRef.current?.focus(), 0);
    }

    setTokenTarget(null);
  }

  // Keep cursor position updated when typing in subject
  function handleSubjectSelectionSave() {
    if (subjectInputRef.current) {
      subjectCursorRef.current = {
        start: subjectInputRef.current.selectionStart ?? 0,
        end:   subjectInputRef.current.selectionEnd   ?? 0,
      };
    }
  }

  // ── Derived values ────────────────────────────────────────────────────────

  const selectedStep  = selectedIdx !== null ? steps[selectedIdx] ?? null : null;
  const isNewMode     = !initialSequence;
  const pageTitle     = isNewMode ? 'New Sequence' : 'Edit Sequence Template';
  const backHref      = seqIdRef.current ? `/sequences/${seqIdRef.current}` : '/sequences';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--color-bg-primary)]">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg-primary)] flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href={backHref}
            className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-primary)] transition-colors"
          >
            <ChevronLeft size={18} />
          </Link>
          <div>
            <h1 className="text-base font-bold text-[var(--color-text-primary)] leading-tight">{pageTitle}</h1>
            {/* Auto-save badge */}
            <div className="flex items-center gap-1 mt-0.5">
              {saveStatus === 'saving' && (
                <span className="flex items-center gap-1 text-[11px] text-[var(--color-text-muted)]">
                  <Loader2 size={10} className="animate-spin" /> Saving…
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="flex items-center gap-1 text-[11px] text-emerald-600">
                  <Cloud size={10} /> <Check size={9} /> Saved
                </span>
              )}
              {saveStatus === 'error' && (
                <button
                  onClick={() => doSave()}
                  className="flex items-center gap-1 text-[11px] text-red-500 hover:underline"
                >
                  <AlertCircle size={10} /> Save failed — retry
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Two-column body ──────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT PANEL ─────────────────────────────────────────────────── */}
        <div className="w-[280px] flex-shrink-0 border-r border-[var(--color-border)] flex flex-col overflow-y-auto bg-[var(--color-surface)]">
          <div className="p-4 flex flex-col gap-5 flex-1">

            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => {
                  nameRef.current = name;
                  scheduleSave(0);
                }}
                placeholder="Untitled Sequence"
                className="w-full h-9 px-3 text-sm border border-[var(--color-border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 bg-white text-[var(--color-text-primary)]"
              />
            </div>

            {/* Sender */}
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">
                Sender&apos;s email address
              </label>
              <select
                value={senderEmail}
                onChange={(e) => {
                  setSenderEmail(e.target.value);
                  senderEmailRef.current = e.target.value;
                  scheduleSave();
                }}
                className="w-full h-9 px-3 text-sm border border-[var(--color-border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 bg-white text-[var(--color-text-primary)]"
              >
                <option value="">— Select sender —</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.email}>
                    {m.name} &lt;{m.email}&gt;
                  </option>
                ))}
              </select>
            </div>

            {/* Stages timeline */}
            <div>
              <p className="text-xs font-medium text-[var(--color-text-muted)] mb-3">Stages</p>

              {steps.length === 0 && (
                <p className="text-[12px] text-[var(--color-text-muted)] mb-3 text-center py-4">
                  No stages yet. Add one below.
                </p>
              )}

              <div className="flex flex-col gap-2">
                {steps.map((step, i) => (
                  <div key={step.localId} className="flex flex-col gap-2">
                    <StageCard
                      step={step}
                      index={i}
                      allSteps={steps}
                      isSelected={selectedIdx === i}
                      onClick={() => setSelectedIdx(i)}
                      onDelete={() => deleteStageAt(i)}
                    />

                    {/* Add between */}
                    {i < steps.length - 1 && (
                      <button
                        onClick={() => addStageAt(i + 1)}
                        className="flex items-center justify-center gap-1 py-1 text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 rounded-lg transition-colors border border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)]/40"
                      >
                        <Plus size={10} /> Add Stage
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add after last */}
              <button
                onClick={() => addStageAt(steps.length)}
                className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-[var(--color-primary)] border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 hover:bg-[var(--color-primary)]/10 rounded-xl transition-colors"
              >
                <Plus size={12} /> Add Stage
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ────────────────────────────────────────────────── */}
        <div className="flex-1 flex overflow-hidden">
          {selectedStep && selectedIdx !== null ? (
            <StageEditor
              step={selectedStep}
              index={selectedIdx}
              allSteps={steps}
              teamMembers={teamMembers}
              sequenceSenderEmail={senderEmail}
              onChange={updateSelectedStep}
              onOpenSubjectTokenPicker={openSubjectTokenPicker}
              onOpenBodyTokenPicker={openBodyTokenPicker}
              subjectInputRef={subjectInputRef as React.RefObject<HTMLInputElement>}
              bodyEditorRef={bodyEditorRef}
              onRangeChange={(range) => { savedRangeRef.current = range; }}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-14 h-14 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center mb-4">
                <Mail size={24} className="text-[var(--color-text-muted)]" />
              </div>
              <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">No stage selected</p>
              <p className="text-xs text-[var(--color-text-muted)] mb-5">
                Add a stage on the left to start building your sequence template.
              </p>
              <button
                onClick={() => addStageAt(steps.length)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[var(--color-primary)] border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 hover:bg-[var(--color-primary)]/10 rounded-xl transition-colors"
              >
                <Plus size={13} /> Add First Stage
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Token Picker modal ────────────────────────────────────────────── */}
      {tokenTarget && (
        <TokenPicker
          onSelect={handleTokenSelect}
          onClose={() => setTokenTarget(null)}
        />
      )}
    </div>
  );
}
