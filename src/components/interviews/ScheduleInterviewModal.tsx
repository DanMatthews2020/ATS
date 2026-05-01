'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  interviewsApi, jobsApi, calendarApi,
  type InterviewType, type InterviewDto, type JobListingDto,
} from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScheduleInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (interview: InterviewDto) => void;
  candidateId: string;
  candidateName: string;
  preselectedJobId?: string;
  preselectedJobTitle?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INTERVIEW_TYPES: { value: InterviewType; label: string; emoji: string }[] = [
  { value: 'Phone',     label: 'Phone',     emoji: '📞' },
  { value: 'Video',     label: 'Video',     emoji: '🎥' },
  { value: 'On-site',   label: 'On-site',   emoji: '🏢' },
  { value: 'Technical', label: 'Technical', emoji: '💻' },
];

const DURATIONS = [30, 45, 60, 90];

// Generate 30-min time slots for the full day
const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  const hh = h.toString().padStart(2, '0');
  const display = `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${m} ${h < 12 ? 'AM' : 'PM'}`;
  return { value: `${hh}:${m}`, label: display };
});

// ─── Component ────────────────────────────────────────────────────────────────

export default function ScheduleInterviewModal({
  isOpen,
  onClose,
  onSuccess,
  candidateId,
  candidateName,
  preselectedJobId,
  preselectedJobTitle,
}: ScheduleInterviewModalProps) {
  const { showToast } = useToast();

  const [type,            setType]           = useState<InterviewType>('Video');
  const [date,            setDate]           = useState('');
  const [time,            setTime]           = useState('10:00');
  const [duration,        setDuration]       = useState(60);
  const [locationOrLink,  setLocationOrLink] = useState('');
  const [notes,           setNotes]          = useState('');
  const [selectedJobId,   setSelectedJobId]  = useState(preselectedJobId ?? '');
  const [jobs,            setJobs]           = useState<JobListingDto[]>([]);
  const [jobsLoading,     setJobsLoading]    = useState(false);
  const [isSubmitting,    setIsSubmitting]   = useState(false);
  const [error,           setError]          = useState('');

  // Set default date to tomorrow when modal opens
  useEffect(() => {
    if (isOpen) {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      setDate(d.toISOString().split('T')[0]);
      setError('');
      setLocationOrLink('');
      setNotes('');
      setType('Video');
      setTime('10:00');
      setDuration(60);
      setSelectedJobId(preselectedJobId ?? '');
    }
  }, [isOpen, preselectedJobId]);

  // If no preselected job, load open jobs for dropdown
  useEffect(() => {
    if (isOpen && !preselectedJobId) {
      setJobsLoading(true);
      jobsApi.getJobs(1, 100, 'open')
        .then((res) => setJobs(res.items))
        .catch(() => setJobs([]))
        .finally(() => setJobsLoading(false));
    }
  }, [isOpen, preselectedJobId]);

  if (!isOpen) return null;

  const jobId = preselectedJobId ?? selectedJobId;

  const locationLabel =
    type === 'Video'   ? 'Meeting Link' :
    type === 'Phone'   ? 'Phone Number' :
    'Location / Address';

  const locationPlaceholder =
    type === 'Video'   ? 'Add a Google Meet, Zoom, or Teams link' :
    type === 'Phone'   ? '+1 (555) 000-0000' :
    'Office address or room number';

  async function handleSubmit() {
    setError('');
    if (!date)  { setError('Date is required.'); return; }
    if (!jobId) { setError('Please select a job.'); return; }

    setIsSubmitting(true);
    try {
      const scheduledAt = `${date}T${time}:00`;
      const result = await interviewsApi.create({
        candidateId,
        jobId,
        type,
        scheduledAt,
        duration,
        ...(type === 'Video'
          ? { meetingLink: locationOrLink || undefined }
          : { location: locationOrLink || undefined }),
        notes: notes || undefined,
      });

      // Auto-create Google Calendar event with Meet link (best-effort)
      try {
        const endTime = new Date(new Date(scheduledAt).getTime() + duration * 60 * 1000);
        const calResult = await calendarApi.createEvent({
          interviewId: result.interview.id,
          startTime: new Date(scheduledAt).toISOString(),
          endTime: endTime.toISOString(),
          addMeetLink: type === 'Video',
        });
        if (calResult.meetLink) {
          result.interview.meetingLink = calResult.meetLink;
        }
      } catch {
        // Calendar event creation is non-critical
      }

      const formatted = new Date(scheduledAt).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric',
      });
      showToast(`Interview scheduled for ${formatted}`, 'success');
      onSuccess(result.interview);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule interview. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
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

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-[var(--color-border)] flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Schedule Interview</h2>
            <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{candidateName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] p-1 rounded-lg hover:bg-[var(--color-surface)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Job — read-only if preselected, dropdown if not */}
          {preselectedJobTitle ? (
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Job</label>
              <div className="px-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text-primary)]">
                {preselectedJobTitle}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                Job <span className="text-red-500">*</span>
              </label>
              {jobsLoading ? (
                <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                  <Loader2 size={14} className="animate-spin" /> Loading jobs…
                </div>
              ) : (
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] bg-white text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]"
                >
                  <option value="">Select a job…</option>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>{j.title} — {j.department}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Interview Type */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Interview Type</label>
            <div className="grid grid-cols-4 gap-2">
              {INTERVIEW_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => { setType(t.value); setLocationOrLink(''); }}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 text-xs font-medium transition-colors ${
                    type === t.value
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)]'
                      : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/40'
                  }`}
                >
                  <span className="text-base leading-none">{t.emoji}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] bg-white text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Time</label>
              <select
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] bg-white text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]"
              >
                {TIME_SLOTS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Duration</label>
            <div className="flex gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`flex-1 py-2 rounded-xl border-2 text-sm font-medium transition-colors ${
                    duration === d
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)]'
                      : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/40'
                  }`}
                >
                  {d} min
                </button>
              ))}
            </div>
          </div>

          {/* Location / Meeting link */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
              {locationLabel}
            </label>
            <input
              type="text"
              value={locationOrLink}
              onChange={(e) => setLocationOrLink(e.target.value)}
              placeholder={locationPlaceholder}
              className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] bg-white text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
              Notes for Interviewers
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Preparation notes, focus areas…"
              className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] bg-white text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--color-border)] flex-shrink-0">
          {error && (
            <p className="text-xs text-red-600 mb-3 px-1">{error}</p>
          )}
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1 justify-center"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="flex-1 justify-center"
              onClick={handleSubmit}
              isLoading={isSubmitting}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Scheduling…' : 'Schedule Interview'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
