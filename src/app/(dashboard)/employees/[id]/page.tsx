'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Building2, ArrowLeft, Mail, Phone, MapPin, Calendar,
  Edit2, X, Check, Briefcase, User,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/contexts/ToastContext';
import { employeesApi, type EmployeeDto, type EmployeeStatus } from '@/lib/api';
import type { BadgeVariant } from '@/types';

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<EmployeeStatus, { label: string; variant: BadgeVariant }> = {
  active:      { label: 'Active',    variant: 'success' },
  'on-leave':  { label: 'On Leave',  variant: 'warning' },
  terminated:  { label: 'Terminated', variant: 'error'  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function tenure(hireDate: string) {
  const ms   = Date.now() - new Date(hireDate).getTime();
  const days  = Math.floor(ms / 86_400_000);
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  if (years > 0) return `${years}y ${months}m`;
  if (months > 0) return `${months} month${months > 1 ? 's' : ''}`;
  return `${days} day${days !== 1 ? 's' : ''}`;
}

// ─── Edit modal ───────────────────────────────────────────────────────────────

function EditModal({ employee, onClose, onSaved }: {
  employee: EmployeeDto;
  onClose: () => void;
  onSaved: (emp: EmployeeDto) => void;
}) {
  const { showToast } = useToast();
  const [form, setForm] = useState({
    firstName: employee.firstName,
    lastName:  employee.lastName,
    email:     employee.email,
    phone:     employee.phone ?? '',
    title:     employee.title,
    department: employee.department,
    location:  employee.location,
    status:    employee.status,
    skills:    employee.skills.join(', '),
    bio:       employee.bio ?? '',
  });
  const [saving, setSaving] = useState(false);

  const f = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  async function handleSave() {
    setSaving(true);
    try {
      const { employee: updated } = await employeesApi.update(employee.id, {
        firstName:  form.firstName,
        lastName:   form.lastName,
        email:      form.email,
        phone:      form.phone || null,
        title:      form.title,
        department: form.department,
        location:   form.location,
        status:     form.status as EmployeeStatus,
        skills:     form.skills ? form.skills.split(',').map((s) => s.trim()).filter(Boolean) : [],
        bio:        form.bio || null,
      });
      onSaved(updated);
      showToast('Employee updated');
      onClose();
    } catch { showToast('Failed to save changes', 'error'); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl border border-[var(--color-border)] w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 pb-4 border-b border-[var(--color-border)]">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Edit Employee</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-[var(--color-surface)] rounded-lg">
            <X size={15} className="text-[var(--color-text-muted)]" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">First name</label>
              <Input value={form.firstName} onChange={f('firstName')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Last name</label>
              <Input value={form.lastName} onChange={f('lastName')} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Email</label>
            <Input type="email" value={form.email} onChange={f('email')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Phone</label>
              <Input value={form.phone} onChange={f('phone')} placeholder="+44 7700 900000" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Job title</label>
              <Input value={form.title} onChange={f('title')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Department</label>
              <Input value={form.department} onChange={f('department')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Location</label>
              <Input value={form.location} onChange={f('location')} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Status</label>
            <select value={form.status} onChange={f('status')}
              className="w-full h-10 px-3 text-sm border border-[var(--color-border)] rounded-xl bg-white outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20">
              <option value="active">Active</option>
              <option value="on-leave">On Leave</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Skills <span className="font-normal opacity-60">(comma-separated)</span></label>
            <Input value={form.skills} onChange={f('skills')} placeholder="TypeScript, React, Node.js" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Bio</label>
            <textarea value={form.bio} onChange={f('bio')} rows={3}
              className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-xl resize-none outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20" />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 pb-6">
          <Button variant="secondary" size="md" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="md" isLoading={saving} onClick={handleSave}>
            <Check size={14} /> Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 mt-0.5 text-[var(--color-text-muted)]">{icon}</div>
      <div>
        <p className="text-[11px] text-[var(--color-text-muted)] leading-none mb-0.5">{label}</p>
        <p className="text-sm text-[var(--color-text-primary)]">{value}</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EmployeeDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  const [employee, setEmployee] = useState<EmployeeDto | null>(null);
  const [loading, setLoading]   = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    employeesApi.getById(params.id)
      .then(({ employee: e }) => setEmployee(e))
      .catch(() => showToast('Failed to load employee', 'error'))
      .finally(() => setLoading(false));
  }, [params.id, showToast]);

  if (loading) {
    return (
      <div className="p-8 flex-1">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-neutral-100 rounded" />
          <div className="h-40 bg-neutral-100 rounded-2xl" />
          <div className="h-64 bg-neutral-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-8 flex-1 flex flex-col items-center justify-center">
        <User size={40} className="text-[var(--color-text-muted)] opacity-30 mb-3" />
        <p className="text-sm text-[var(--color-text-muted)]">Employee not found</p>
        <Button variant="secondary" size="md" className="mt-4" onClick={() => router.push('/employees')}>
          <ArrowLeft size={14} /> Back to directory
        </Button>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[employee.status];

  return (
    <div className="p-8 flex-1 max-w-4xl">
      {/* Back button */}
      <button
        onClick={() => router.push('/employees')}
        className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] mb-6 transition-colors"
      >
        <ArrowLeft size={14} />
        Employee Directory
      </button>

      {/* Hero card */}
      <div className="bg-white border border-[var(--color-border)] rounded-2xl shadow-card p-6 mb-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Avatar name={`${employee.firstName} ${employee.lastName}`} size="lg" />
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-[var(--color-text-primary)] leading-tight">
                  {employee.firstName} {employee.lastName}
                </h1>
                <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
              </div>
              <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{employee.title}</p>
              <p className="text-sm font-medium text-[var(--color-primary)] mt-0.5">{employee.department}</p>
            </div>
          </div>
          <Button variant="secondary" size="md" onClick={() => setEditOpen(true)}>
            <Edit2 size={14} /> Edit Profile
          </Button>
        </div>

        {employee.bio && (
          <p className="mt-4 text-sm text-[var(--color-text-muted)] leading-relaxed border-t border-[var(--color-border)] pt-4">
            {employee.bio}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Contact & employment */}
        <div className="md:col-span-2 space-y-5">

          {/* Contact info */}
          <div className="bg-white border border-[var(--color-border)] rounded-2xl shadow-card p-5">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">Contact Information</h2>
            <div className="space-y-3.5">
              <InfoRow icon={<Mail size={14} />}    label="Email"    value={employee.email} />
              <InfoRow icon={<Phone size={14} />}   label="Phone"    value={employee.phone} />
              <InfoRow icon={<MapPin size={14} />}  label="Location" value={employee.location} />
            </div>
          </div>

          {/* Employment details */}
          <div className="bg-white border border-[var(--color-border)] rounded-2xl shadow-card p-5">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">Employment Details</h2>
            <div className="space-y-3.5">
              <InfoRow icon={<Briefcase size={14} />}  label="Job Title"   value={employee.title} />
              <InfoRow icon={<Building2 size={14} />}  label="Department"  value={employee.department} />
              <InfoRow icon={<Calendar size={14} />}   label="Hire Date"   value={fmtDate(employee.hireDate)} />
              <InfoRow icon={<User size={14} />}       label="Manager"     value={employee.managerName} />
            </div>
          </div>

          {/* Skills */}
          {employee.skills.length > 0 && (
            <div className="bg-white border border-[var(--color-border)] rounded-2xl shadow-card p-5">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">Skills</h2>
              <div className="flex flex-wrap gap-1.5">
                {employee.skills.map((s) => (
                  <span key={s} className="text-xs px-2.5 py-1 bg-[var(--color-surface)] text-[var(--color-text-muted)] rounded-lg font-medium">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar stats */}
        <div className="space-y-4">
          <div className="bg-white border border-[var(--color-border)] rounded-2xl shadow-card p-5">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">At a Glance</h2>
            <div className="space-y-4">
              <div>
                <p className="text-[11px] text-[var(--color-text-muted)] mb-0.5">Tenure</p>
                <p className="text-lg font-bold text-[var(--color-text-primary)]">{tenure(employee.hireDate)}</p>
                <p className="text-[11px] text-[var(--color-text-muted)]">Since {fmtDate(employee.hireDate)}</p>
              </div>
              <div className="border-t border-[var(--color-border)] pt-4">
                <p className="text-[11px] text-[var(--color-text-muted)] mb-0.5">Status</p>
                <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
              </div>
              <div className="border-t border-[var(--color-border)] pt-4">
                <p className="text-[11px] text-[var(--color-text-muted)] mb-0.5">Department</p>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">{employee.department}</p>
              </div>
              <div className="border-t border-[var(--color-border)] pt-4">
                <p className="text-[11px] text-[var(--color-text-muted)] mb-0.5">Location</p>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">{employee.location}</p>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white border border-[var(--color-border)] rounded-2xl shadow-card p-5">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Quick Actions</h2>
            <div className="space-y-2">
              <a
                href={`mailto:${employee.email}`}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface)] rounded-lg transition-colors"
              >
                <Mail size={14} /> Send Email
              </a>
              <button
                onClick={() => setEditOpen(true)}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface)] rounded-lg transition-colors text-left"
              >
                <Edit2 size={14} /> Edit Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      {editOpen && (
        <EditModal
          employee={employee}
          onClose={() => setEditOpen(false)}
          onSaved={(emp) => setEmployee(emp)}
        />
      )}
    </div>
  );
}
