/**
 * @file team.service.ts
 * @description In-memory store for Team Members management.
 */

import { randomUUID } from 'crypto';

export type TeamRole = 'admin' | 'recruiter' | 'hiring_manager' | 'viewer';
export type MemberStatus = 'active' | 'pending';

export interface TeamMember {
  id:        string;
  name:      string;
  email:     string;
  role:      TeamRole;
  department: string;
  joinedAt:  string;
  avatarUrl: string | null;
  status:    MemberStatus;
}

// ── Seed ──────────────────────────────────────────────────────────────────────

const members = new Map<string, TeamMember>([
  ['tm-1', {
    id: 'tm-1', name: 'Alex Johnson', email: 'alex@teamtalent.io',
    role: 'admin', department: 'HR', joinedAt: '2024-01-15', avatarUrl: null, status: 'active',
  }],
  ['tm-2', {
    id: 'tm-2', name: 'Sarah Chen', email: 'sarah@teamtalent.io',
    role: 'recruiter', department: 'HR', joinedAt: '2024-03-01', avatarUrl: null, status: 'active',
  }],
  ['tm-3', {
    id: 'tm-3', name: 'Marcus Williams', email: 'marcus@teamtalent.io',
    role: 'hiring_manager', department: 'Engineering', joinedAt: '2024-04-10', avatarUrl: null, status: 'active',
  }],
  ['tm-4', {
    id: 'tm-4', name: 'Priya Patel', email: 'priya@teamtalent.io',
    role: 'hiring_manager', department: 'Product', joinedAt: '2024-06-20', avatarUrl: null, status: 'active',
  }],
  ['tm-5', {
    id: 'tm-5', name: 'James Okafor', email: 'james@teamtalent.io',
    role: 'recruiter', department: 'HR', joinedAt: '2024-09-05', avatarUrl: null, status: 'active',
  }],
  ['tm-6', {
    id: 'tm-6', name: 'Emily Torres', email: 'emily@teamtalent.io',
    role: 'viewer', department: 'Finance', joinedAt: '2025-01-12', avatarUrl: null, status: 'active',
  }],
  ['tm-7', {
    id: 'tm-7', name: 'invite@example.com', email: 'invite@example.com',
    role: 'recruiter', department: '', joinedAt: '2026-03-20', avatarUrl: null, status: 'pending',
  }],
]);

// ── Service ───────────────────────────────────────────────────────────────────

export const teamService = {
  getAll(): TeamMember[] {
    return Array.from(members.values());
  },

  invite(email: string, role: TeamRole, department = ''): TeamMember {
    const id = `tm-${randomUUID().slice(0, 8)}`;
    const member: TeamMember = {
      id,
      name:      email,     // name unknown until they accept
      email,
      role,
      department,
      joinedAt:  new Date().toISOString().slice(0, 10),
      avatarUrl: null,
      status:    'pending',
    };
    members.set(id, member);
    return member;
  },

  updateRole(id: string, role: TeamRole): TeamMember | null {
    const m = members.get(id);
    if (!m) return null;
    m.role = role;
    return m;
  },

  remove(id: string): boolean {
    return members.delete(id);
  },
};
