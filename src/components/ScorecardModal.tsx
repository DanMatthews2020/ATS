'use client';

import { useState, useEffect } from 'react';
import { X, Star, ChevronRight, Loader2, CheckCircle2, Clock, AlertCircle, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  workflowsApi,
  evaluationsApi,
  scorecardsApi,
  type WorkflowStageDto,
  type ScorecardDto,
  type EvaluationDto,
} from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ScorecardModalProps {
  candidateId: string;
  candidateName: string;
  jobId: string;
  /** Pre-select a specific stage directly to the form */
  initialStageId?: string;
  onClose: () => void;
  onSubmitted?: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STAGE_TYPE_COLORS: Record<string, string> = {
  'phone-screen': 'bg-indigo-100 text-indigo-700',
  'video-call':   'bg-sky-100 text-sky-700',
  'on-site':      'bg-amber-100 text-amber-700',
  'take-home':    'bg-purple-100 text-purple-700',
  'offer':        'bg-emerald-100 text-emerald-700',
  'hired':        'bg-green-100 text-green-700',
};

const REC_OPTIONS = [
  { value: 'strong-yes', label: 'Strong Yes', cls: 'border-emerald-500 bg-emerald-50 text-emerald-700' },
  { value: 'yes',        label: 'Yes',        cls: 'border-green-400 bg-green-50 text-green-700' },
  { value: 'no',         label: 'No',         cls: 'border-red-400 bg-red-50 text-red-700' },
  { value: 'strong-no',  label: 'Strong No',  cls: 'border-red-600 bg-red-100 text-red-800' },
];

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  pending:       { label: 'Pending',     icon: <Clock size={11} />,        cls: 'bg-amber-100 text-amber-700' },
  'in-progress': { label: 'In Progress', icon: <AlertCircle size={11} />,  cls: 'bg-blue-100 text-blue-700' },
  submitted:     { label: 'Submitted',   icon: <CheckCircle2 size={11} />, cls: 'bg-emerald-100 text-emerald-700' },
};

// ─── Star Rating Input ────────────────────────────────────────────────────────

function StarInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [hover, setHover] = useState(0);
  const current = parseInt(value) || 0;
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(String(n))}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="p-0.5 transition-transform hover:scale-110"
        >
          <Star
            size={20}
            className={
              n <= (hover || current)
                ? 'text-amber-400 fill-amber-400'
                : 'text-neutral-200 fill-neutral-200'
            }
          />
        </button>
      ))}
      {current > 0 && (
        <span className="self-center ml-1 text-xs text-[var(--color-text-muted)]">{current}/5</span>
      )}
    </div>
  );
}

// ─── Evaluation Form ──────────────────────────────────────────────────────────

function EvalForm({
  candidateId,
  jobId,
  candidateName,
  stage,
  scorecard,
  existing,
  onBack,
  onDone,
}: {
  candidateId: string;
  jobId: string;
  candidateName: string;
  stage: WorkflowStageDto | null;
  scorecard: ScorecardDto;
  existing: EvaluationDto | null;
  onBack: () => void;
  onDone: (eval_: EvaluationDto) => void;
}) {
  const { showToast } = useToast();
  const [responses, setResponses] = useState<Record<string, string>>(() => {
    if (!existing) return {};
    return Object.fromEntries(existing.responses.map((r) => [r.criterionId, r.responseValue]));
  });
  const [recommendation, setRecommendation] = useState(existing?.overallRecommendation ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [saving, setSaving] = useState(false);

  function setResponse(criterionId: string, value: string) {
    setResponses((prev) => ({ ...prev, [criterionId]: value }));
  }

  async function handleSubmit(status: 'submitted' | 'in-progress') {
    const responsesPayload = scorecard.criteria.map((c) => ({
      criterionId: c.id,
      responseValue: responses[c.id] ?? '',
    }));

    setSaving(true);
    try {
      let result: EvaluationDto;
      if (existing) {
        result = (await evaluationsApi.update(existing.id, {
          overallRecommendation: recommendation || undefined,
          notes: notes || undefined,
          status,
          responses: responsesPayload,
        })).evaluation;
      } else {
        result = (await evaluationsApi.create({
          candidateId,
          jobId,
          stageId: stage?.id || undefined,
          scorecardId: scorecard.id,
          overallRecommendation: recommendation || undefined,
          notes: notes || undefined,
          status,
          responses: responsesPayload,
        })).evaluation;
      }
      showToast(status === 'submitted' ? 'Evaluation submitted' : 'Draft saved', 'success');
      onDone(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save evaluation';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center gap-3 p-5 border-b border-[var(--color-border)] flex-shrink-0">
        <button onClick={onBack} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">
          <ChevronRight size={16} className="rotate-180" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[var(--color-text-muted)]">{candidateName}</p>
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
            {stage ? stage.stageName : scorecard.name}
          </h3>
        </div>
        {stage && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STAGE_TYPE_COLORS[stage.stageType] ?? 'bg-neutral-100 text-neutral-600'}`}>
            {stage.stageType.replace(/-/g, ' ')}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div>
          <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
            {scorecard.name}
          </p>
          <div className="space-y-4">
            {scorecard.criteria.map((c) => (
              <div key={c.id} className="rounded-xl border border-[var(--color-border)] p-4 bg-white">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">
                      {c.name}
                      {c.isRequired && <span className="text-red-500 ml-0.5">*</span>}
                    </p>
                    {c.description && (
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{c.description}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-[var(--color-text-muted)] bg-[var(--color-surface)] border border-[var(--color-border)] px-1.5 py-0.5 rounded-md whitespace-nowrap flex-shrink-0">
                    {c.type === 'rating' ? '1–5' : c.type === 'yes-no' ? 'Yes/No' : c.type === 'short-text' ? 'Short' : c.type === 'long-text' ? 'Long' : c.type === 'free-text' ? 'Text' : 'Choice'}
                  </span>
                </div>

                {c.type === 'rating' && (
                  <StarInput value={responses[c.id] ?? ''} onChange={(v) => setResponse(c.id, v)} />
                )}

                {c.type === 'yes-no' && (
                  <div className="flex gap-2">
                    {['Yes', 'No'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setResponse(c.id, opt)}
                        className={`px-4 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                          responses[c.id] === opt
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                            : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/50'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {c.type === 'short-text' && (
                  <input
                    type="text"
                    value={responses[c.id] ?? ''}
                    onChange={(e) => setResponse(c.id, e.target.value)}
                    placeholder="Enter your response…"
                    className="w-full text-sm px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]"
                  />
                )}

                {(c.type === 'long-text' || c.type === 'free-text') && (
                  <textarea
                    value={responses[c.id] ?? ''}
                    onChange={(e) => setResponse(c.id, e.target.value)}
                    rows={c.type === 'long-text' ? 4 : 3}
                    placeholder="Enter your notes…"
                    className="w-full text-sm px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] resize-none"
                  />
                )}

                {c.type === 'multiple-choice' && (
                  <div className="flex gap-2 flex-wrap">
                    {['Strong', 'Good', 'Average', 'Below Average', 'Poor'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setResponse(c.id, opt)}
                        className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${
                          responses[c.id] === opt
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                            : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/50'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Overall Recommendation */}
        <div className="rounded-xl border border-[var(--color-border)] p-4 bg-white">
          <p className="text-sm font-medium text-[var(--color-text-primary)] mb-3">Overall Recommendation</p>
          <div className="grid grid-cols-2 gap-2">
            {REC_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRecommendation(recommendation === opt.value ? '' : opt.value)}
                className={`py-2 text-sm font-semibold rounded-xl border-2 transition-colors ${
                  recommendation === opt.value
                    ? opt.cls
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-neutral-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
            Additional Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Any additional comments or context…"
            className="w-full text-sm px-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] resize-none"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex gap-2 p-4 border-t border-[var(--color-border)] flex-shrink-0">
        <Button variant="secondary" size="sm" className="flex-1 justify-center" onClick={() => handleSubmit('in-progress')} disabled={saving}>
          Save Draft
        </Button>
        <Button variant="primary" size="sm" className="flex-1 justify-center" onClick={() => handleSubmit('submitted')} disabled={saving}>
          {saving ? <Loader2 size={13} className="animate-spin mr-1" /> : null}
          Submit Evaluation
        </Button>
      </div>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function ScorecardModal({
  candidateId,
  candidateName,
  jobId,
  initialStageId,
  onClose,
  onSubmitted,
}: ScorecardModalProps) {
  const { showToast } = useToast();

  const [scorecards,        setScorecards]        = useState<ScorecardDto[]>([]);
  const [stages,            setStages]            = useState<WorkflowStageDto[]>([]);
  const [evaluations,       setEvaluations]       = useState<EvaluationDto[]>([]);
  const [loading,           setLoading]           = useState(true);
  const [selectedScorecard, setSelectedScorecard] = useState<ScorecardDto | null>(null);
  const [selectedStage,     setSelectedStage]     = useState<WorkflowStageDto | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [scorecardsRes, evalsRes, workflowRes] = await Promise.allSettled([
          scorecardsApi.getAll(),
          evaluationsApi.getByCandidate(candidateId),
          workflowsApi.getByJobId(jobId),
        ]);

        if (cancelled) return;

        const scList = scorecardsRes.status === 'fulfilled'
          ? scorecardsRes.value.scorecards
          : [];
        setScorecards(scList);

        if (evalsRes.status === 'fulfilled') {
          setEvaluations(evalsRes.value.evaluations);
        }

        const stageList = workflowRes.status === 'fulfilled'
          ? workflowRes.value.stages
          : [];
        setStages(stageList);

        // Auto-select if initialStageId provided — find the scorecard for that stage
        if (initialStageId && !cancelled) {
          const stage = stageList.find((s) => s.id === initialStageId);
          if (stage?.scorecardId) {
            const sc = scList.find((s) => s.id === stage.scorecardId);
            if (sc) {
              setSelectedScorecard(sc);
              setSelectedStage(stage);
            }
          }
        }
      } catch {
        if (!cancelled) showToast('Failed to load scorecards', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [candidateId, jobId, initialStageId, showToast]);

  function getEvalForScorecard(scorecardId: string): EvaluationDto | null {
    return evaluations.find((e) => e.scorecardId === scorecardId) ?? null;
  }

  function getStageForScorecard(scorecardId: string): WorkflowStageDto | null {
    return stages.find((s) => s.scorecardId === scorecardId) ?? null;
  }

  function handleSelectScorecard(sc: ScorecardDto) {
    setSelectedScorecard(sc);
    setSelectedStage(getStageForScorecard(sc.id));
  }

  function handleEvalDone(eval_: EvaluationDto) {
    setEvaluations((prev) => {
      const idx = prev.findIndex((e) => e.id === eval_.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = eval_;
        return next;
      }
      return [...prev, eval_];
    });
    setSelectedScorecard(null);
    setSelectedStage(null);
    onSubmitted?.();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Panel */}
      <div className="relative z-10 bg-[var(--color-bg-primary)] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Interview Feedback</h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{candidateName}</p>
          </div>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors p-1 rounded-lg hover:bg-[var(--color-surface)]">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        {selectedScorecard ? (
          <EvalForm
            candidateId={candidateId}
            jobId={jobId}
            candidateName={candidateName}
            scorecard={selectedScorecard}
            stage={selectedStage}
            existing={getEvalForScorecard(selectedScorecard.id)}
            onBack={() => { setSelectedScorecard(null); setSelectedStage(null); }}
            onDone={handleEvalDone}
          />
        ) : (
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={18} className="animate-spin text-[var(--color-text-muted)]" />
              </div>
            ) : scorecards.length === 0 ? (
              <div className="py-12 px-6 text-center">
                <ClipboardList size={28} className="mx-auto text-[var(--color-text-muted)] mb-3" />
                <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">No scorecard templates yet</p>
                <p className="text-xs text-[var(--color-text-muted)] mb-4">
                  Create evaluation templates in Settings first.
                </p>
                <a
                  href="/settings/scorecards"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-primary)] hover:underline"
                >
                  Go to Settings → Scorecards
                </a>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {scorecards.map((sc) => {
                  const attachedStage = getStageForScorecard(sc.id);
                  const eval_         = getEvalForScorecard(sc.id);
                  const statusCfg     = STATUS_CONFIG[eval_?.status ?? 'pending'];
                  return (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => handleSelectScorecard(sc)}
                      className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-[var(--color-border)] bg-white hover:border-[var(--color-primary)]/50 hover:shadow-sm transition-all text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{sc.name}</p>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                          {sc.criteria.length} criteria{sc.description ? ` · ${sc.description}` : ''}
                        </p>
                        {attachedStage && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full mt-1">
                            📋 {attachedStage.stageName}
                          </span>
                        )}
                      </div>
                      <div className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full flex-shrink-0 ${statusCfg.cls}`}>
                        {statusCfg.icon}
                        {statusCfg.label}
                      </div>
                      <ChevronRight size={14} className="text-[var(--color-text-muted)] flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
