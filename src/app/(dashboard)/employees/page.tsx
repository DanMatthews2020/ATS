'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2, Plus, Search, Download, X, Mail, Phone,
  MapPin, ChevronRight, Filter,
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
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function initials(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`;
}

// ─── Add Employee modal ───────────────────────────────────────────────────────

function AddEmployeeModal({ departments, onClose, onCreated }: {
  departments: string[];
  onClose: () => void;
  onCreated: (emp: EmployeeDto) => void;
}) {
  const { showToast } = useToast();
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    title: '', department: departments[0] ?? '', location: '',
    hireDate: new Date().toISOString().slice(0, 10),
    skills: '', bio: '',
  });
  const [saving, setSaving]   = useState(false);
  const [errors, setErrors]   = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName  = 'Required';
    if (!form.lastName.trim())  e.lastName   = 'Required';
    if (!form.email.trim())     e.email      = 'Required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email';
    if (!form.title.trim())     e.title      = 'Required';
    if (!form.location.trim())  e.location   = 'Required';
    return e;
  }

  async function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setSaving(true);
    try {
      const { employee } = await employeesApi.create({
        firstName:  form.firstName,
        lastName:   form.lastName,
        email:      form.email,
        phone:      form.phone || undefined,
        title:      form.title,
        department: form.department,
        location:   form.location,
        hireDate:   form.hireDate,
        skills:     form.skills ? form.skills.split(',').map((s) => s.trim()).filter(Boolean) : [],
        bio:        form.bio || undefined,
      });
      onCreated(employee);
      showToast(`${employee.firstName} ${employee.lastName} added to directory`);
      onClose();
    } catch { showToast('Failed to add employee', 'error'); }
    finally { setSaving(false); }
  }

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl border border-[var(--color-border)] w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 pb-4 border-b border-[var(--color-border)]">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Add Employee</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-[var(--color-surface)] rounded-lg">
            <X size={15} className="text-[var(--color-text-muted)]" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">First name *</label>
              <Input value={form.firstName} onChange={f('firstName')} placeholder="First name" />
              {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Last name *</label>
              <Input value={form.lastName} onChange={f('lastName')} placeholder="Last name" />
              {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Email address *</label>
            <Input type="email" value={form.email} onChange={f('email')} placeholder="employee@company.com" />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Phone <span className="font-normal opacity-60">(optional)</span></label>
              <Input value={form.phone} onChange={f('phone')} placeholder="+44 7700 900000" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Job title *</label>
              <Input value={form.title} onChange={f('title')} placeholder="e.g. Software Engineer" />
              {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Department</label>
              <select value={form.department} onChange={f('department')}
                className="w-full h-10 px-3 text-sm border border-[var(--color-border)] rounded-xl bg-white outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20">
                {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Location *</label>
              <Input value={form.location} onChange={f('location')} placeholder="e.g. London, UK" />
              {errors.location && <p className="text-xs text-red-500 mt-1">{errors.location}</p>}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Hire date</label>
            <input type="date" value={form.hireDate} onChange={f('hireDate')}
              className="w-full h-10 px-3 text-sm border border-[var(--color-border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Skills <span className="font-normal opacity-60">(comma-separated)</span></label>
            <Input value={form.skills} onChange={f('skills')} placeholder="TypeScript, React, Node.js" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Bio <span className="font-normal opacity-60">(optional)</span></label>
            <textarea value={form.bio} onChange={f('bio')} rows={2} placeholder="Short bio..."
              className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-xl resize-none outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20" />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 pb-6">
          <Button variant="secondary" size="md" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="md" isLoading={saving} onClick={handleSubmit}>
            <Plus size={14} /> Add Employee
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Employee card ────────────────────────────────────────────────────────────

function EmployeeCard({ emp, onClick }: { emp: EmployeeDto; onClick: () => void }) {
  const cfg = STATUS_CONFIG[emp.status];
  return (
    <button onClick={onClick}
      className="bg-white border border-[var(--color-border)] rounded-2xl shadow-card p-5 text-left hover:shadow-md hover:border-[var(--color-primary)]/30 transition-all group">
      <div className="flex items-start justify-between mb-3">
        <Avatar name={initials(emp.firstName, emp.lastName)} size="lg" />
        <Badge variant={cfg.variant}>{cfg.label}</Badge>
      </div>
      <p className="text-sm font-semibold text-[var(--color-text-primary)] leading-tight">{emp.firstName} {emp.lastName}</p>
      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{emp.title}</p>
      <p className="text-xs font-medium text-[var(--color-primary)] mt-0.5">{emp.department}</p>
      <div className="flex items-center gap-1 mt-3 text-[11px] text-[var(--color-text-muted)]">
        <MapPin size={10} /> {emp.location}
      </div>
      {emp.skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {emp.skills.slice(0, 3).map((s) => (
            <span key={s} className="text-[10px] px-1.5 py-0.5 bg-[var(--color-surface)] text-[var(--color-text-muted)] rounded-md">{s}</span>
          ))}
          {emp.skills.length > 3 && (
            <span className="text-[10px] px-1.5 py-0.5 bg-[var(--color-surface)] text-[var(--color-text-muted)] rounded-md">+{emp.skills.length - 3}</span>
          )}
        </div>
      )}
      <div className="flex items-center justify-end mt-3">
        <ChevronRight size={14} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] transition-colors" />
      </div>
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EmployeesPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [employees, setEmployees]     = useState<EmployeeDto[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [locations, setLocations]     = useState<string[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [deptFilter, setDeptFilter]   = useState('all');
  const [locFilter, setLocFilter]     = useState('all');
  const [statusFilter, setStatusFilter] = useState<EmployeeStatus | 'all'>('all');
  const [addOpen, setAddOpen]         = useState(false);
  const [exporting, setExporting]     = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const load = useCallback(async (q?: string) => {
    try {
      const { employees: e, departments: d, locations: l } = await employeesApi.getAll({
        search:     q,
        department: deptFilter !== 'all' ? deptFilter : undefined,
        location:   locFilter  !== 'all' ? locFilter  : undefined,
        status:     statusFilter !== 'all' ? statusFilter as EmployeeStatus : undefined,
      });
      setEmployees(e);
      if (d.length) setDepartments(d);
      if (l.length) setLocations(l);
    } catch { showToast('Failed to load employees', 'error'); }
    finally { setLoading(false); }
  }, [deptFilter, locFilter, statusFilter, showToast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(search || undefined), 300);
  }, [search, load]);

  async function handleExport() {
    setExporting(true);
    try {
      await employeesApi.exportCsv();
      showToast('CSV downloaded');
    } catch { showToast('Export failed', 'error'); }
    finally { setExporting(false); }
  }

  const active     = employees.filter((e) => e.status === 'active').length;
  const onLeave    = employees.filter((e) => e.status === 'on-leave').length;
  const terminated = employees.filter((e) => e.status === 'terminated').length;

  return (
    <div className="p-8 flex-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 bg-[var(--color-primary)] rounded-xl flex items-center justify-center flex-shrink-0">
            <Building2 size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] leading-tight">Employees</h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Your company employee directory</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="md" isLoading={exporting} onClick={handleExport}>
            <Download size={14} /> Export CSV
          </Button>
          <Button variant="primary" size="md" onClick={() => setAddOpen(true)}>
            <Plus size={14} /> Add Employee
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Employees', value: employees.length, color: 'bg-neutral-100 text-neutral-600' },
          { label: 'Active',          value: active,           color: 'bg-emerald-50 text-emerald-600' },
          { label: 'On Leave',        value: onLeave,          color: 'bg-amber-50 text-amber-600'    },
          { label: 'Departments',     value: departments.length, color: 'bg-blue-50 text-blue-600'    },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[var(--color-border)] rounded-2xl shadow-card p-5">
            <p className="text-2xl font-bold text-[var(--color-text-primary)]">{s.value}</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search + filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employees..."
            className="w-full h-10 pl-9 pr-4 text-sm border border-[var(--color-border)] rounded-xl bg-white outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
              <X size={13} />
            </button>
          )}
        </div>
        <Button variant="secondary" size="md" onClick={() => setShowFilters(!showFilters)}>
          <Filter size={14} /> Filters {showFilters ? '▲' : '▼'}
        </Button>
      </div>

      {showFilters && (
        <div className="bg-white border border-[var(--color-border)] rounded-2xl shadow-card p-4 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Department</label>
            <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-[var(--color-border)] rounded-xl bg-white outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20">
              <option value="all">All Departments</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Location</label>
            <select value={locFilter} onChange={(e) => setLocFilter(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-[var(--color-border)] rounded-xl bg-white outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20">
              <option value="all">All Locations</option>
              {locations.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as EmployeeStatus | 'all')}
              className="w-full h-9 px-3 text-sm border border-[var(--color-border)] rounded-xl bg-white outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20">
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="on-leave">On Leave</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white border border-[var(--color-border)] rounded-2xl shadow-card p-5 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-neutral-100 mb-3" />
              <div className="h-3 w-32 bg-neutral-100 rounded mb-1.5" />
              <div className="h-2.5 w-24 bg-neutral-100 rounded" />
            </div>
          ))}
        </div>
      ) : employees.length === 0 ? (
        <div className="bg-white border border-[var(--color-border)] rounded-2xl shadow-card p-12 text-center">
          <Building2 size={32} className="text-[var(--color-text-muted)] mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium text-[var(--color-text-muted)]">No employees found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {employees.map((emp) => (
            <EmployeeCard key={emp.id} emp={emp} onClick={() => router.push(`/employees/${emp.id}`)} />
          ))}
        </div>
      )}

      {addOpen && (
        <AddEmployeeModal
          departments={departments}
          onClose={() => setAddOpen(false)}
          onCreated={(emp) => setEmployees((p) => [emp, ...p])}
        />
      )}
    </div>
  );
}
