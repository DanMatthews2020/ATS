/**
 * @file onboarding.service.ts
 * @description In-memory onboarding session store keyed by userId.
 * Persists for the lifetime of the server process — sufficient for a
 * wizard that completes in one session.
 */

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

const DEFAULT_TASKS: Record<string, boolean> = {
  it1: false, it2: true,  it3: false, it4: true,  it5: false, it6: false,
  nh1: false, nh2: false, nh3: true,  nh4: false, nh5: false, nh6: false,
  mg1: false, mg2: true,  mg3: true,  mg4: false, mg5: false,
};

// ─── Store ────────────────────────────────────────────────────────────────────

const sessions = new Map<string, OnboardingSession>();

function now(): string {
  return new Date().toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function getOrCreate(userId: string): OnboardingSession {
  if (!sessions.has(userId)) {
    sessions.set(userId, {
      step: 1,
      profile: {
        fullName: '', pronouns: '', jobTitle: '', manager: '',
        startDate: '', workLocation: 'remote', workEmail: '', phone: '',
      },
      documents: { resume: null, id: null },
      tasks: { ...DEFAULT_TASKS },
      completed: false,
      activity: [
        { text: 'Onboarding session started', time: now() },
      ],
    });
  }
  return sessions.get(userId)!;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const onboardingService = {
  getSession(userId: string): OnboardingSession {
    return getOrCreate(userId);
  },

  saveProfile(userId: string, profile: OnboardingProfile): OnboardingSession {
    const s = getOrCreate(userId);
    s.profile = profile;
    if (s.step < 2) s.step = 2;
    s.activity.unshift({ text: 'Profile information saved', time: now() });
    return s;
  },

  advanceToStep3(userId: string): OnboardingSession {
    const s = getOrCreate(userId);
    if (s.step < 3) s.step = 3;
    s.activity.unshift({ text: 'Tasks step completed', time: now() });
    return s;
  },

  skipStep(userId: string): OnboardingSession {
    const s = getOrCreate(userId);
    const prev = s.step;
    if (s.step < 3) s.step += 1;
    s.activity.unshift({ text: `Step ${prev} skipped`, time: now() });
    return s;
  },

  updateTask(userId: string, taskId: string, checked: boolean): { id: string; checked: boolean } {
    const s = getOrCreate(userId);
    s.tasks[taskId] = checked;
    if (checked) {
      const label = TASK_LABELS[taskId] ?? taskId;
      s.activity.unshift({ text: `Task completed: ${label}`, time: now() });
    }
    return { id: taskId, checked };
  },

  uploadDocument(userId: string, type: 'resume' | 'id', filename: string): OnboardingDocument {
    const s = getOrCreate(userId);
    const doc: OnboardingDocument = { filename, uploadedAt: new Date().toISOString() };
    if (type === 'resume') s.documents.resume = doc;
    else s.documents.id = doc;
    s.activity.unshift({
      text: `${type === 'resume' ? 'Resume' : 'ID document'} uploaded: ${filename}`,
      time: now(),
    });
    return doc;
  },

  complete(userId: string): OnboardingSession {
    const s = getOrCreate(userId);
    s.completed = true;
    s.step = 3;
    s.activity.unshift({ text: '🎉 Onboarding completed successfully', time: now() });
    return s;
  },

  requestAssistance(userId: string, message: string): { sent: boolean } {
    const s = getOrCreate(userId);
    s.activity.unshift({ text: 'HR assistance requested', time: now() });
    console.info(`[Onboarding] Assistance from ${userId}: ${message}`);
    return { sent: true };
  },

  getActivity(userId: string): { text: string; time: string }[] {
    return getOrCreate(userId).activity;
  },
};
