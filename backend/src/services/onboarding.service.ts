/**
 * @file onboarding.service.ts
 * @description Onboarding service — tasks backed by Prisma OnboardingTask,
 * wizard state (step, documents, activity) kept in memory.
 */

import { prisma } from '../lib/prisma';
import { OnboardingCategory, TaskStatus } from '@prisma/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OnboardingProfile {
  fullName:     string;
  pronouns:     string;
  jobTitle:     string;
  manager:      string;
  startDate:    string;
  workLocation: string;
  workEmail:    string;
  phone:        string;
}

export interface OnboardingDocument {
  filename:   string;
  uploadedAt: string;
}

export interface OnboardingSession {
  step:      number;
  profile:   OnboardingProfile;
  documents: { resume: OnboardingDocument | null; id: OnboardingDocument | null };
  tasks:     Record<string, boolean>;
  completed: boolean;
  activity:  { text: string; time: string }[];
}

// ─── Task metadata ────────────────────────────────────────────────────────────

const TASK_LABELS: Record<string, string> = {
  it1: 'Set up laptop and workstation',
  it2: 'Create corporate email account',
  it3: 'Configure VPN access',
  it4: 'Set up Slack and communication tools',
  it5: 'Install required software and tools',
  it6: 'Enable two-factor authentication',
  nh1: 'Complete I-9 employment verification',
  nh2: 'Submit direct deposit information',
  nh3: 'Review and sign offer letter',
  nh4: 'Complete benefits enrollment',
  nh5: 'Review employee handbook',
  nh6: 'Complete mandatory compliance training',
  mg1: 'Schedule 30/60/90-day check-in meetings',
  mg2: 'Assign onboarding buddy',
  mg3: 'Arrange team introduction meetings',
  mg4: 'Define first-week goals and expectations',
  mg5: 'Schedule department overview sessions',
};

/** Which short keys start pre-checked for new employees */
const DEFAULT_CHECKED = new Set(['it2', 'it4', 'nh3', 'mg2', 'mg3']);

function keyToCategory(key: string): OnboardingCategory {
  if (key.startsWith('it')) return 'IT';
  if (key.startsWith('nh')) return 'NEW_HIRE';
  if (key.startsWith('mg')) return 'MANAGER';
  return 'HR';
}

// ─── Wizard state (no DB model — kept in memory) ─────────────────────────────

interface WizardState {
  step:      number;
  documents: { resume: OnboardingDocument | null; id: OnboardingDocument | null };
  completed: boolean;
  activity:  { text: string; time: string }[];
}

const wizardStates = new Map<string, WizardState>();

function now(): string {
  return new Date().toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function getWizard(userId: string): WizardState {
  if (!wizardStates.has(userId)) {
    wizardStates.set(userId, {
      step: 1,
      documents: { resume: null, id: null },
      completed: false,
      activity: [{ text: 'Onboarding session started', time: now() }],
    });
  }
  return wizardStates.get(userId)!;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const employeeInclude = {
  user:      { select: { firstName: true, lastName: true, email: true } },
  candidate: { select: { firstName: true, lastName: true, email: true, phone: true } },
  manager:   {
    include: {
      user:      { select: { firstName: true, lastName: true } },
      candidate: { select: { firstName: true, lastName: true } },
    },
  },
} as const;

async function findEmployee(userId: string) {
  return prisma.employee.findFirst({
    where: { userId },
    include: employeeInclude,
  });
}

/** Ensure OnboardingTask rows exist for the employee. Seed them if missing. */
async function ensureTasks(employeeId: string): Promise<void> {
  const count = await prisma.onboardingTask.count({ where: { employeeId } });
  if (count > 0) return;

  const data = Object.entries(TASK_LABELS).map(([key, title]) => ({
    employeeId,
    title,
    category: keyToCategory(key),
    status: DEFAULT_CHECKED.has(key) ? TaskStatus.DONE : TaskStatus.TODO,
    completedAt: DEFAULT_CHECKED.has(key) ? new Date() : null,
    notes: key, // store the short key for mapping back
  }));

  await prisma.onboardingTask.createMany({ data });
}

/** Read all OnboardingTask rows for an employee, return as Record<shortKey, boolean> */
async function readTasks(employeeId: string): Promise<Record<string, boolean>> {
  const rows = await prisma.onboardingTask.findMany({ where: { employeeId } });
  const tasks: Record<string, boolean> = {};
  for (const row of rows) {
    const key = row.notes ?? row.id; // notes holds the short key
    tasks[key] = row.status === 'DONE';
  }
  return tasks;
}

/** Build profile from Employee + relations */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildProfile(emp: any): OnboardingProfile {
  const firstName = emp.user?.firstName ?? emp.candidate?.firstName ?? '';
  const lastName  = emp.user?.lastName  ?? emp.candidate?.lastName  ?? '';
  const email     = emp.user?.email     ?? emp.candidate?.email     ?? '';
  const phone     = emp.candidate?.phone ?? '';

  let managerName = '';
  if (emp.manager) {
    const mf = emp.manager.user?.firstName ?? emp.manager.candidate?.firstName ?? '';
    const ml = emp.manager.user?.lastName  ?? emp.manager.candidate?.lastName  ?? '';
    if (mf) managerName = `${mf} ${ml}`;
  }

  return {
    fullName:     `${firstName} ${lastName}`.trim(),
    pronouns:     '',
    jobTitle:     emp.jobTitle ?? '',
    manager:      managerName,
    startDate:    emp.startDate ? emp.startDate.toISOString().slice(0, 10) : '',
    workLocation: emp.workLocation ?? 'remote',
    workEmail:    email,
    phone:        phone,
  };
}

const EMPTY_PROFILE: OnboardingProfile = {
  fullName: '', pronouns: '', jobTitle: '', manager: '',
  startDate: '', workLocation: 'remote', workEmail: '', phone: '',
};

// ─── Service ──────────────────────────────────────────────────────────────────

export const onboardingService = {
  async getSession(userId: string): Promise<OnboardingSession> {
    const emp = await findEmployee(userId);
    const wizard = getWizard(userId);

    if (!emp) {
      return {
        ...wizard,
        profile: EMPTY_PROFILE,
        tasks: {},
      };
    }

    await ensureTasks(emp.id);
    const tasks = await readTasks(emp.id);
    const profile = buildProfile(emp);

    return {
      ...wizard,
      profile,
      tasks,
    };
  },

  async saveProfile(userId: string, profile: OnboardingProfile): Promise<OnboardingSession> {
    const wizard = getWizard(userId);
    // We don't overwrite DB fields — the profile form is informational for the wizard.
    // But store the profile values in the wizard state for re-display.
    if (wizard.step < 2) wizard.step = 2;
    wizard.activity.unshift({ text: 'Profile information saved', time: now() });

    // Return a full session using the saved profile overlaid
    const emp = await findEmployee(userId);
    let tasks: Record<string, boolean> = {};
    if (emp) {
      await ensureTasks(emp.id);
      tasks = await readTasks(emp.id);
    }

    return { ...wizard, profile, tasks };
  },

  async advanceToStep3(userId: string): Promise<OnboardingSession> {
    const wizard = getWizard(userId);
    if (wizard.step < 3) wizard.step = 3;
    wizard.activity.unshift({ text: 'Tasks step completed', time: now() });
    return this.getSession(userId);
  },

  async skipStep(userId: string): Promise<OnboardingSession> {
    const wizard = getWizard(userId);
    const prev = wizard.step;
    if (wizard.step < 3) wizard.step += 1;
    wizard.activity.unshift({ text: `Step ${prev} skipped`, time: now() });
    return this.getSession(userId);
  },

  async updateTask(userId: string, taskId: string, checked: boolean): Promise<{ id: string; checked: boolean }> {
    const emp = await findEmployee(userId);
    if (emp) {
      // Find the OnboardingTask row by short key stored in notes
      const task = await prisma.onboardingTask.findFirst({
        where: { employeeId: emp.id, notes: taskId },
      });
      if (task) {
        await prisma.onboardingTask.update({
          where: { id: task.id },
          data: {
            status: checked ? TaskStatus.DONE : TaskStatus.TODO,
            completedAt: checked ? new Date() : null,
          },
        });
      }
    }

    if (checked) {
      const wizard = getWizard(userId);
      const label = TASK_LABELS[taskId] ?? taskId;
      wizard.activity.unshift({ text: `Task completed: ${label}`, time: now() });
    }

    return { id: taskId, checked };
  },

  uploadDocument(userId: string, type: 'resume' | 'id', filename: string): OnboardingDocument {
    const wizard = getWizard(userId);
    const doc: OnboardingDocument = { filename, uploadedAt: new Date().toISOString() };
    if (type === 'resume') wizard.documents.resume = doc;
    else wizard.documents.id = doc;
    wizard.activity.unshift({
      text: `${type === 'resume' ? 'Resume' : 'ID document'} uploaded: ${filename}`,
      time: now(),
    });
    return doc;
  },

  async complete(userId: string): Promise<OnboardingSession> {
    const wizard = getWizard(userId);
    wizard.completed = true;
    wizard.step = 3;
    wizard.activity.unshift({ text: '🎉 Onboarding completed successfully', time: now() });
    return this.getSession(userId);
  },

  requestAssistance(userId: string, message: string): { sent: boolean } {
    const wizard = getWizard(userId);
    wizard.activity.unshift({ text: 'HR assistance requested', time: now() });
    console.info(`[Onboarding] Assistance from ${userId}: ${message}`);
    return { sent: true };
  },

  async getActivity(userId: string): Promise<{ text: string; time: string }[]> {
    return getWizard(userId).activity;
  },
};
