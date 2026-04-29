'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Users,
  Send,
  ChevronLeft,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/contexts/ToastContext';
import {
  jobsApi,
  schedulingApi,
  type JobMemberDto,
  type TimeSlotDto,
} from '@/lib/api';

// ── Types ────────────────────────────────────────────────────────────────────

type Step = 'configure' | 'method' | 'confirm';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onScheduled: () => void;
  applicationId: string;
  jobId: string;
  jobTitle?: string;
}

const DURATION_OPTIONS = [30, 45, 60, 90] as const;
const BUFFER_OPTIONS = [0, 5, 10, 15] as const;

// ── Component ────────────────────────────────────────────────────────────────

export function ScheduleInterviewModal({
  isOpen,
  onClose,
  onScheduled,
  applicationId,
  jobId,
  jobTitle,
}: Props) {
  const { showToast } = useToast();

  // Step state
  const [step, setStep] = useState<Step>('configure');

  // Step 1 — Configure
  const [members, setMembers] = useState<JobMemberDto[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [duration, setDuration] = useState<number>(60);
  const [bufferBefore, setBufferBefore] = useState<number>(0);
  const [bufferAfter, setBufferAfter] = useState<number>(0);
  const [windowStart, setWindowStart] = useState('');
  const [windowEnd, setWindowEnd] = useState('');
  const [timezone, setTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);

  // Step 2 — Method
  const [method, setMethod] = useState<'pick' | 'link' | null>(null);
  const [suggestedSlots, setSuggestedSlots] = useState<TimeSlotDto[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlotDto | null>(null);

  // Step 3 — Confirm
  const [confirming, setConfirming] = useState(false);

  // Error
  const [error, setError] = useState<string | null>(null);

  // Default date range: today + 7 days
  useEffect(() => {
    if (!windowStart) {
      const today = new Date();
      setWindowStart(today.toISOString().slice(0, 10));
      const end = new Date(today);
      end.setDate(end.getDate() + 7);
      setWindowEnd(end.toISOString().slice(0, 10));
    }
  }, [windowStart]);

  // Fetch job members when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setMembersLoading(true);
    jobsApi
      .getMembers(jobId)
      .then((data) => setMembers(data.members))
      .catch(() => setMembers([]))
      .finally(() => setMembersLoading(false));
  }, [isOpen, jobId]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setStep('configure');
      setSelectedUserIds([]);
      setDuration(60);
      setBufferBefore(0);
      setBufferAfter(0);
      setWindowStart('');
      setWindowEnd('');
      setMethod(null);
      setSuggestedSlots([]);
      setWarnings([]);
      setSelectedSlot(null);
      setError(null);
    }
  }, [isOpen]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  function toggleUser(userId: string) {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  }

  const configValid =
    selectedUserIds.length > 0 && windowStart && windowEnd && windowEnd >= windowStart;

  async function handleFindSlots() {
    if (!configValid) return;
    setError(null);
    setSlotsLoading(true);
    try {
      const result = await schedulingApi.suggestSlots({
        interviewerUserIds: selectedUserIds,
        durationMinutes: duration,
        bufferBefore,
        bufferAfter,
        windowStart: new Date(`${windowStart}T00:00:00`).toISOString(),
        windowEnd: new Date(`${windowEnd}T23:59:59`).toISOString(),
        timezone,
      });
      setSuggestedSlots(result.slots);
      setWarnings(result.warnings ?? []);
      setStep('method');
    } catch {
      setError('Failed to find available slots. Please try again.');
    } finally {
      setSlotsLoading(false);
    }
  }

  function handlePickMethod(m: 'pick' | 'link') {
    setMethod(m);
    setSelectedSlot(null);
    setError(null);
  }

  function handleBack() {
    if (step === 'confirm') {
      setStep('method');
      setError(null);
    } else if (step === 'method') {
      setStep('configure');
      setMethod(null);
      setError(null);
    }
  }

  function handleProceedToConfirm() {
    if (method === 'pick' && !selectedSlot) return;
    setStep('confirm');
    setError(null);
  }

  async function handleConfirm() {
    setConfirming(true);
    setError(null);

    try {
      if (method === 'link') {
        const link = await schedulingApi.createLink({
          applicationId,
          interviewerUserIds: selectedUserIds,
          durationMinutes: duration,
          bufferBefore,
          bufferAfter,
          expiresInHours: 72,
          timezone,
        });
        showToast(`Self-scheduling link created (${link.slots.length} slots)`);
      } else if (method === 'pick' && selectedSlot) {
        // Create link then immediately book the selected slot
        const link = await schedulingApi.createLink({
          applicationId,
          interviewerUserIds: selectedUserIds,
          durationMinutes: duration,
          bufferBefore,
          bufferAfter,
          expiresInHours: 1,
          timezone,
        });

        // Find the matching slot in the created link
        const matchingSlot = link.slots.find(
          (s) => s.startTime === selectedSlot.start && s.endTime === selectedSlot.end,
        );
        if (matchingSlot) {
          await schedulingApi.bookSlot(link.token, matchingSlot.id);
        }
        showToast('Interview scheduled successfully');
      }

      onScheduled();
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setConfirming(false);
    }
  }

  // ── Step title ───────────────────────────────────────────────────────────

  const title = useMemo(() => {
    const base = jobTitle ? `Schedule — ${jobTitle}` : 'Schedule Interview';
    if (step === 'configure') return base;
    if (step === 'method') return `${base} — Select Method`;
    return `${base} — Confirm`;
  }, [step, jobTitle]);

  // ── Footer ───────────────────────────────────────────────────────────────

  const footer = (
    <div className="flex items-center justify-between">
      <div>
        {step !== 'configure' && (
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <ChevronLeft size={14} /> Back
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          Cancel
        </button>

        {step === 'configure' && (
          <button
            type="button"
            disabled={!configValid || slotsLoading}
            onClick={handleFindSlots}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {slotsLoading ? <Loader2 size={14} className="animate-spin" /> : <Calendar size={14} />}
            Find Available Slots
          </button>
        )}

        {step === 'method' && method === 'pick' && (
          <button
            type="button"
            disabled={!selectedSlot}
            onClick={handleProceedToConfirm}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            Continue
          </button>
        )}

        {step === 'method' && method === 'link' && (
          <button
            type="button"
            onClick={handleProceedToConfirm}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] rounded-lg transition-colors"
          >
            Continue
          </button>
        )}

        {step === 'confirm' && (
          <button
            type="button"
            disabled={confirming}
            onClick={handleConfirm}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {confirming ? (
              <Loader2 size={14} className="animate-spin" />
            ) : method === 'link' ? (
              <Send size={14} />
            ) : (
              <CheckCircle2 size={14} />
            )}
            {confirming ? 'Scheduling...' : method === 'link' ? 'Send Link' : 'Confirm Interview'}
          </button>
        )}
      </div>
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg" footer={footer}>
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Step 1 — Configure */}
      {step === 'configure' && (
        <div className="space-y-5">
          {/* Interviewers */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              <Users size={14} className="inline mr-1.5 -mt-0.5" />
              Interviewers
            </label>
            {membersLoading ? (
              <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                <Loader2 size={14} className="animate-spin" /> Loading team members...
              </div>
            ) : members.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">
                No team members found for this job. Add members to the job first.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[180px] overflow-y-auto pr-1">
                {members.map((member) => {
                  const checked = selectedUserIds.includes(member.user.id);
                  return (
                    <label
                      key={member.id}
                      className={[
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 cursor-pointer transition-colors',
                        checked
                          ? 'border-[var(--color-primary)] bg-blue-50'
                          : 'border-[var(--color-border)] hover:border-blue-300',
                      ].join(' ')}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleUser(member.user.id)}
                        className="sr-only"
                      />
                      <div className="w-7 h-7 rounded-full bg-[var(--color-surface)] flex items-center justify-center text-xs font-medium text-[var(--color-text-secondary)]">
                        {member.user.firstName?.[0]}
                        {member.user.lastName?.[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                          {member.user.firstName} {member.user.lastName}
                        </div>
                        <div className="text-xs text-[var(--color-text-muted)] truncate">
                          {member.role}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Duration + Buffer */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                <Clock size={14} className="inline mr-1 -mt-0.5" />
                Duration
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40"
              >
                {DURATION_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d} min
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                Buffer before
              </label>
              <select
                value={bufferBefore}
                onChange={(e) => setBufferBefore(Number(e.target.value))}
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40"
              >
                {BUFFER_OPTIONS.map((b) => (
                  <option key={b} value={b}>
                    {b} min
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                Buffer after
              </label>
              <select
                value={bufferAfter}
                onChange={(e) => setBufferAfter(Number(e.target.value))}
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40"
              >
                {BUFFER_OPTIONS.map((b) => (
                  <option key={b} value={b}>
                    {b} min
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                From
              </label>
              <input
                type="date"
                value={windowStart}
                onChange={(e) => setWindowStart(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                To
              </label>
              <input
                type="date"
                value={windowEnd}
                onChange={(e) => setWindowEnd(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40"
              />
            </div>
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
              Timezone
            </label>
            <input
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40"
              placeholder="e.g. Europe/London"
            />
          </div>
        </div>
      )}

      {/* Step 2 — Choose Method */}
      {step === 'method' && (
        <div className="space-y-5">
          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700 space-y-1">
              {warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  {w}
                </div>
              ))}
            </div>
          )}

          {/* Method choice */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handlePickMethod('pick')}
              className={[
                'p-4 rounded-xl border-2 text-left transition-colors',
                method === 'pick'
                  ? 'border-[var(--color-primary)] bg-blue-50'
                  : 'border-[var(--color-border)] hover:border-blue-300',
              ].join(' ')}
            >
              <Calendar size={20} className={method === 'pick' ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'} />
              <div className="mt-2 text-sm font-medium text-[var(--color-text-primary)]">
                Recruiter picks slot
              </div>
              <div className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                Choose from {suggestedSlots.length} available times
              </div>
            </button>
            <button
              type="button"
              onClick={() => handlePickMethod('link')}
              className={[
                'p-4 rounded-xl border-2 text-left transition-colors',
                method === 'link'
                  ? 'border-[var(--color-primary)] bg-blue-50'
                  : 'border-[var(--color-border)] hover:border-blue-300',
              ].join(' ')}
            >
              <Send size={20} className={method === 'link' ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'} />
              <div className="mt-2 text-sm font-medium text-[var(--color-text-primary)]">
                Send self-scheduling link
              </div>
              <div className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                Candidate picks their preferred time
              </div>
            </button>
          </div>

          {/* Slot grid — only if "pick" method */}
          {method === 'pick' && (
            <div>
              <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-2">
                Available times
              </h3>
              {suggestedSlots.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)] py-4 text-center">
                  No available slots found. Try adjusting the date range or interviewers.
                </p>
              ) : (
                <div
                  className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[240px] overflow-y-auto pr-1"
                  role="radiogroup"
                  aria-label="Available interview slots"
                >
                  {suggestedSlots.map((slot, i) => {
                    const start = new Date(slot.start);
                    const dateStr = start.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    });
                    const timeStr = start.toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    });
                    const selected = selectedSlot === slot;

                    return (
                      <button
                        key={i}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setSelectedSlot(slot)}
                        className={[
                          'px-3 py-2 rounded-lg border-2 text-left transition-colors text-sm',
                          'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40',
                          selected
                            ? 'border-[var(--color-primary)] bg-blue-50 text-[var(--color-primary)]'
                            : 'border-[var(--color-border)] hover:border-blue-300 text-[var(--color-text-primary)]',
                        ].join(' ')}
                      >
                        <div className="font-medium">{dateStr}</div>
                        <div className="text-xs text-[var(--color-text-muted)]">{timeStr}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 3 — Confirm */}
      {step === 'confirm' && (
        <div className="space-y-4">
          <div className="rounded-xl bg-[var(--color-surface)] p-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-muted)]">Method</span>
              <span className="font-medium text-[var(--color-text-primary)]">
                {method === 'link' ? 'Self-scheduling link' : 'Recruiter-selected slot'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-muted)]">Duration</span>
              <span className="font-medium text-[var(--color-text-primary)]">{duration} min</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-muted)]">Interviewers</span>
              <span className="font-medium text-[var(--color-text-primary)]">
                {selectedUserIds.length} selected
              </span>
            </div>
            {method === 'pick' && selectedSlot && (
              <>
                <div className="border-t border-[var(--color-border)] pt-3 flex items-center justify-between">
                  <span className="text-[var(--color-text-muted)]">Date</span>
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {new Date(selectedSlot.start).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--color-text-muted)]">Time</span>
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {new Date(selectedSlot.start).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                    {' — '}
                    {new Date(selectedSlot.end).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </>
            )}
            {method === 'link' && (
              <div className="border-t border-[var(--color-border)] pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--color-text-muted)]">Link expires in</span>
                  <span className="font-medium text-[var(--color-text-primary)]">72 hours</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[var(--color-text-muted)]">Available slots</span>
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {suggestedSlots.length} times
                  </span>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-muted)]">Timezone</span>
              <span className="font-medium text-[var(--color-text-primary)]">{timezone}</span>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
