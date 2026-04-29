'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Calendar, Clock, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

interface PublicLink {
  jobTitle: string;
  companyName: string;
  durationMinutes: number;
  timezone: string;
  expiresAt: string;
  slots: { id: string; startTime: string; endTime: string }[];
}

export default function ScheduleSelfBookingPage() {
  const { token } = useParams<{ token: string }>();

  const [link, setLink] = useState<PublicLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);

  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [booked, setBooked] = useState(false);
  const [bookedSlot, setBookedSlot] = useState<{ startTime: string; endTime: string } | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/scheduling/public/${token}`)
      .then((res) => res.json())
      .then((body) => {
        if (body.success && body.data) {
          setLink(body.data);
        } else {
          const code = body.error?.code;
          if (code === 'LINK_EXPIRED' || code === 'LINK_USED') {
            setExpired(true);
            setError(
              code === 'LINK_EXPIRED'
                ? 'This scheduling link has expired. Please contact the recruiter for a new link.'
                : 'This interview has already been scheduled.',
            );
          } else {
            setError('Scheduling link not found.');
          }
        }
      })
      .catch(() => setError('Network error. Please check your connection and try again.'))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleBook() {
    if (!selectedSlotId || !token) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/scheduling/public/${token}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId: selectedSlotId }),
      });

      const body = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setError('This slot has already been booked. Please select another time or contact the recruiter.');
        } else {
          setError(body.error?.message ?? 'Something went wrong. Please try again.');
        }
        return;
      }

      const slot = link?.slots.find((s) => s.id === selectedSlotId);
      if (slot) setBookedSlot(slot);
      setBooked(true);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // ── Error / Expired ─────────────────────────────────────────────────────
  if (error && !link) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            {expired ? 'Link Expired' : 'Not Available'}
          </h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  // ── Success ─────────────────────────────────────────────────────────────
  if (booked) {
    const dt = bookedSlot ? new Date(bookedSlot.startTime) : null;
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Interview Scheduled!</h1>
          <p className="text-gray-500 mb-1">
            Your interview for <span className="font-medium text-gray-700">{link?.jobTitle}</span> at{' '}
            <span className="font-medium text-gray-700">{link?.companyName}</span> has been confirmed.
          </p>
          {dt && (
            <div className="mt-4 bg-gray-50 rounded-xl px-6 py-4 text-sm space-y-2 inline-block">
              <div className="flex items-center gap-2 text-gray-700">
                <Calendar size={15} className="text-gray-400" />
                {dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Clock size={15} className="text-gray-400" />
                {dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} ({link?.durationMinutes} min)
              </div>
            </div>
          )}
          <p className="text-gray-400 text-sm mt-6">You may close this page.</p>
        </div>
      </div>
    );
  }

  // ── Slot selection ──────────────────────────────────────────────────────
  if (!link) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">{link.jobTitle}</h1>
          <div className="flex flex-wrap gap-3 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <Clock size={14} /> {link.durationMinutes} min
            </span>
            <span>{link.companyName}</span>
          </div>
        </div>

        {/* Slot selection card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">Select a time</h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {link.slots.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm">No available time slots. Please contact the recruiter.</p>
            </div>
          ) : (
            <div
              className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6 max-h-[400px] overflow-y-auto pr-1"
              role="radiogroup"
              aria-label="Available interview time slots"
            >
              {link.slots.map((slot) => {
                const start = new Date(slot.startTime);
                const dateStr = start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                const timeStr = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                const selected = selectedSlotId === slot.id;

                return (
                  <button
                    key={slot.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => { setSelectedSlotId(slot.id); setError(null); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedSlotId(slot.id); setError(null); } }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
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
          )}

          <button
            type="button"
            disabled={!selectedSlotId || submitting}
            onClick={handleBook}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors"
          >
            {submitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Calendar size={16} />
            )}
            {submitting ? 'Scheduling...' : 'Confirm Interview'}
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Powered by {link.companyName}
        </p>
      </div>
    </div>
  );
}
