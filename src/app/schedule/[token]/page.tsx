'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Calendar, Clock, MapPin, Loader2, CheckCircle2, AlertCircle, Video, Phone, Building2, Code2 } from 'lucide-react';
import { schedulingApi, type PublicSchedulingLinkDto } from '@/lib/api';

// ─── Types ──────────────────────────────────────────────────────────────────

type InterviewType = 'PHONE' | 'VIDEO' | 'ON_SITE' | 'TECHNICAL';
type PageState = 'loading' | 'ready' | 'confirming' | 'booked' | 'error' | 'expired';

const TYPE_OPTIONS: { value: InterviewType; label: string; icon: typeof Video }[] = [
  { value: 'VIDEO',     label: 'Video Call',  icon: Video },
  { value: 'PHONE',     label: 'Phone Call',  icon: Phone },
  { value: 'ON_SITE',   label: 'On-site',     icon: Building2 },
  { value: 'TECHNICAL', label: 'Technical',   icon: Code2 },
];

// ─── Page ───────────────────────────────────────────────────────────────────

export default function ScheduleSelfBookingPage() {
  const { token } = useParams<{ token: string }>();

  const [state, setState] = useState<PageState>('loading');
  const [link, setLink] = useState<PublicSchedulingLinkDto | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [interviewType, setInterviewType] = useState<InterviewType>('VIDEO');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [bookedTime, setBookedTime] = useState('');

  useEffect(() => {
    if (!token) return;
    schedulingApi.getLink(token)
      .then((data) => {
        setLink(data);
        setState('ready');
      })
      .catch((err) => {
        const code = err?.code;
        if (code === 'LINK_EXPIRED' || code === 'LINK_USED') {
          setState('expired');
          setErrorMsg(code === 'LINK_EXPIRED'
            ? 'This scheduling link has expired. Please contact the recruiter for a new link.'
            : 'This time slot has already been booked.');
        } else {
          setState('error');
          setErrorMsg('Scheduling link not found.');
        }
      });
  }, [token]);

  async function handleBook() {
    if (!selectedSlotId || !token) return;
    setState('confirming');
    try {
      const result = await schedulingApi.bookSlot(token, {
        slotId: selectedSlotId,
        interviewType,
        notes: notes || undefined,
      });
      setBookedTime(result.scheduledAt);
      setState('booked');
    } catch (err) {
      setState('ready');
      setErrorMsg(err instanceof Error ? err.message : 'Failed to book slot. Please try again.');
    }
  }

  // ── Loading ─────────────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <Shell>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </Shell>
    );
  }

  // ── Error / Expired ─────────────────────────────────────────────────────
  if (state === 'error' || state === 'expired') {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertCircle size={48} strokeWidth={1.5} className="text-gray-300 mb-4" />
          <h2 className="text-lg font-semibold text-gray-800 mb-2">
            {state === 'expired' ? 'Link Expired' : 'Not Found'}
          </h2>
          <p className="text-sm text-gray-500 max-w-sm">{errorMsg}</p>
        </div>
      </Shell>
    );
  }

  // ── Booked (success) ────────────────────────────────────────────────────
  if (state === 'booked') {
    const dt = new Date(bookedTime);
    const formatted = dt.toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });
    const timeFormatted = dt.toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit',
    });

    return (
      <Shell>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-5">
            <CheckCircle2 size={32} className="text-emerald-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Interview Booked!</h2>
          <p className="text-sm text-gray-500 mb-6 max-w-sm">
            Your interview for <span className="font-medium text-gray-700">{link?.jobTitle}</span> has been confirmed.
          </p>
          <div className="bg-gray-50 rounded-xl px-6 py-4 text-sm space-y-2">
            <div className="flex items-center gap-2 text-gray-700">
              <Calendar size={15} className="text-gray-400" />
              {formatted}
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Clock size={15} className="text-gray-400" />
              {timeFormatted} ({link?.durationMinutes} min)
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-6">You may close this page.</p>
        </div>
      </Shell>
    );
  }

  // ── Ready — slot selection ──────────────────────────────────────────────
  const selectedSlot = link?.slots.find((s) => s.id === selectedSlotId);

  return (
    <Shell>
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-xl font-semibold text-gray-800">Pick a Time</h1>
        <p className="text-sm text-gray-500 mt-1">
          {link?.candidateName} — <span className="font-medium">{link?.jobTitle}</span>
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {link?.durationMinutes} min · Scheduled by {link?.createdBy}
        </p>
      </div>

      {errorMsg && (
        <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
          {errorMsg}
        </div>
      )}

      {/* Slot grid */}
      <div className="space-y-3 mb-6">
        <label className="block text-sm font-medium text-gray-700">Available Times</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[320px] overflow-y-auto pr-1">
          {link?.slots.map((slot) => {
            const start = new Date(slot.start);
            const dateStr = start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            const timeStr = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
            const selected = selectedSlotId === slot.id;

            return (
              <button
                key={slot.id}
                type="button"
                onClick={() => { setSelectedSlotId(slot.id); setErrorMsg(''); }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-colors ${
                  selected
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-blue-300 text-gray-700'
                }`}
              >
                <Calendar size={16} className={selected ? 'text-blue-500' : 'text-gray-400'} />
                <div>
                  <div className="text-sm font-medium">{dateStr}</div>
                  <div className="text-xs text-gray-500">{timeStr}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interview type */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Interview Format</label>
        <div className="grid grid-cols-2 gap-2">
          {TYPE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const selected = interviewType === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setInterviewType(opt.value)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm transition-colors ${
                  selected
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                    : 'border-gray-200 text-gray-600 hover:border-blue-300'
                }`}
              >
                <Icon size={15} />
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Notes */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Notes <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Anything the team should know…"
          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 resize-none"
        />
      </div>

      {/* Confirm */}
      <button
        type="button"
        disabled={!selectedSlotId || state === 'confirming'}
        onClick={handleBook}
        className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {state === 'confirming' ? (
          <><Loader2 size={16} className="animate-spin" /> Booking…</>
        ) : selectedSlot ? (
          <>Confirm — {new Date(selectedSlot.start).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {new Date(selectedSlot.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</>
        ) : (
          'Select a time slot'
        )}
      </button>
    </Shell>
  );
}

// ─── Shell wrapper ──────────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8">
        {children}
      </div>
    </div>
  );
}
