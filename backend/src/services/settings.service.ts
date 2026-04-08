/**
 * @file settings.service.ts
 * @description Settings: profile via Prisma, everything else in-memory.
 */

import { prisma } from '../lib/prisma';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Integration {
  key:         string;
  name:        string;
  description: string;
  category:    string;
  connected:   boolean;
  lastSync:    string | null;
}

export type NotifKey =
  | 'newApplication'
  | 'interviewScheduled'
  | 'offerAccepted'
  | 'onboardingTaskDue'
  | 'reviewCycleStarting';

export interface NotificationSettings {
  email: Record<NotifKey, boolean>;
  inApp: Record<NotifKey, boolean>;
}

export interface BillingInfo {
  plan:            string;
  planDescription: string;
  creditsUsed:     number;
  creditsTotal:    number;
  seatsUsed:       number;
  seatsTotal:      number;
  paymentLast4:    string;
  paymentBrand:    string;
  nextBillingDate: string;
  monthlyAmount:   number;
}

export interface ActiveSession {
  id:         string;
  device:     string;
  browser:    string;
  location:   string;
  ip:         string;
  lastActive: string;
  current:    boolean;
}

export interface LoginHistoryEntry {
  id:     string;
  at:     string;
  ip:     string;
  device: string;
  status: 'success' | 'failed';
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
}

export interface UserProfile {
  firstName:  string;
  lastName:   string;
  email:      string;
  timezone:   string;
  language:   string;
  avatarUrl:  string | null;
}

// ── Seed data ─────────────────────────────────────────────────────────────────

const integrations = new Map<string, Integration>([
  ['linkedin', {
    key: 'linkedin', name: 'LinkedIn', category: 'Sourcing',
    description: 'Import candidates and post jobs directly to LinkedIn.',
    connected: true, lastSync: '2026-03-24T08:15:00Z',
  }],
  ['indeed', {
    key: 'indeed', name: 'Indeed', category: 'Sourcing',
    description: 'Sync job postings and receive applicants from Indeed.',
    connected: true, lastSync: '2026-03-24T07:45:00Z',
  }],
  ['slack', {
    key: 'slack', name: 'Slack', category: 'Collaboration',
    description: 'Get hiring notifications and team alerts in Slack channels.',
    connected: true, lastSync: '2026-03-24T09:00:00Z',
  }],
  ['google-calendar', {
    key: 'google-calendar', name: 'Google Calendar', category: 'Scheduling',
    description: 'Automatically schedule interviews and sync calendar events.',
    connected: false, lastSync: null,
  }],
  ['outlook', {
    key: 'outlook', name: 'Outlook', category: 'Scheduling',
    description: 'Sync interviews with Outlook Calendar and send email invites.',
    connected: false, lastSync: null,
  }],
  ['greenhouse', {
    key: 'greenhouse', name: 'Greenhouse', category: 'ATS',
    description: 'Migrate candidates and job data from Greenhouse.',
    connected: false, lastSync: null,
  }],
  ['docusign', {
    key: 'docusign', name: 'DocuSign', category: 'Documents',
    description: 'Send offer letters for e-signature via DocuSign.',
    connected: true, lastSync: '2026-03-23T14:30:00Z',
  }],
]);

const DEFAULT_NOTIF: NotificationSettings = {
  email: {
    newApplication:      true,
    interviewScheduled:  true,
    offerAccepted:       true,
    onboardingTaskDue:   false,
    reviewCycleStarting: true,
  },
  inApp: {
    newApplication:      true,
    interviewScheduled:  true,
    offerAccepted:       true,
    onboardingTaskDue:   true,
    reviewCycleStarting: true,
  },
};
const notifications = { ...DEFAULT_NOTIF };

const billing: BillingInfo = {
  plan:            'Pro',
  planDescription: 'Unlimited job postings, up to 25 seats, advanced analytics',
  creditsUsed:     3_840,
  creditsTotal:    5_000,
  seatsUsed:       8,
  seatsTotal:      25,
  paymentLast4:    '4242',
  paymentBrand:    'Visa',
  nextBillingDate: '2026-04-24',
  monthlyAmount:   299,
};

const securityState: SecuritySettings = { twoFactorEnabled: false };

const sessions = new Map<string, ActiveSession>([
  ['sess-1', {
    id: 'sess-1', device: 'MacBook Pro', browser: 'Chrome 132', ip: '86.11.45.23',
    location: 'London, UK', lastActive: new Date().toISOString(), current: true,
  }],
  ['sess-2', {
    id: 'sess-2', device: 'iPhone 15 Pro', browser: 'Safari 17', ip: '86.11.45.24',
    location: 'London, UK', lastActive: '2026-03-23T18:42:00Z', current: false,
  }],
  ['sess-3', {
    id: 'sess-3', device: 'Windows PC', browser: 'Edge 121', ip: '54.240.11.1',
    location: 'New York, US', lastActive: '2026-03-20T11:05:00Z', current: false,
  }],
]);

const loginHistory: LoginHistoryEntry[] = [
  { id: 'lh-1', at: '2026-03-24T08:02:11Z', ip: '86.11.45.23', device: 'Chrome 132 / MacBook Pro', status: 'success' },
  { id: 'lh-2', at: '2026-03-23T18:41:55Z', ip: '86.11.45.24', device: 'Safari 17 / iPhone 15 Pro', status: 'success' },
  { id: 'lh-3', at: '2026-03-22T09:15:02Z', ip: '86.11.45.23', device: 'Chrome 132 / MacBook Pro', status: 'success' },
  { id: 'lh-4', at: '2026-03-21T14:33:44Z', ip: '199.32.90.1',  device: 'Unknown / Unknown',       status: 'failed'  },
  { id: 'lh-5', at: '2026-03-20T11:04:50Z', ip: '54.240.11.1',  device: 'Edge 121 / Windows PC',   status: 'success' },
];

// timezone/language are not on the User model — keep in memory per user
const extraProfileFields = new Map<string, { timezone: string; language: string }>();

// ── Service ───────────────────────────────────────────────────────────────────

export const settingsService = {

  // ── Profile (reads from prisma.user)

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const extra = extraProfileFields.get(userId);
    return {
      firstName: user?.firstName ?? '',
      lastName:  user?.lastName  ?? '',
      email:     user?.email     ?? '',
      timezone:  extra?.timezone ?? 'Europe/London',
      language:  extra?.language ?? 'en',
      avatarUrl: user?.avatarUrl ?? null,
    };
  },

  async updateProfile(userId: string, data: Partial<UserProfile>): Promise<UserProfile> {
    // Update DB fields that exist on the User model
    const dbPatch: Record<string, unknown> = {};
    if (data.firstName !== undefined) dbPatch.firstName = data.firstName;
    if (data.lastName !== undefined)  dbPatch.lastName  = data.lastName;
    if (data.email !== undefined)     dbPatch.email     = data.email;
    if (data.avatarUrl !== undefined) dbPatch.avatarUrl  = data.avatarUrl;

    if (Object.keys(dbPatch).length > 0) {
      await prisma.user.update({ where: { id: userId }, data: dbPatch });
    }

    // timezone/language stored in memory
    const existing = extraProfileFields.get(userId) ?? { timezone: 'Europe/London', language: 'en' };
    if (data.timezone !== undefined) existing.timezone = data.timezone;
    if (data.language !== undefined) existing.language = data.language;
    extraProfileFields.set(userId, existing);

    return this.getProfile(userId);
  },

  // ── Integrations

  getIntegrations(): Integration[] {
    return Array.from(integrations.values());
  },

  toggleIntegration(key: string): Integration | null {
    const integ = integrations.get(key);
    if (!integ) return null;
    integ.connected = !integ.connected;
    integ.lastSync  = integ.connected ? new Date().toISOString() : null;
    return integ;
  },

  // ── Notifications

  getNotifications(): NotificationSettings {
    return notifications;
  },

  updateNotifications(patch: { email?: Partial<Record<NotifKey, boolean>>; inApp?: Partial<Record<NotifKey, boolean>> }): NotificationSettings {
    if (patch.email) Object.assign(notifications.email, patch.email);
    if (patch.inApp) Object.assign(notifications.inApp, patch.inApp);
    return notifications;
  },

  // ── Billing

  getBilling(): BillingInfo {
    return billing;
  },

  // ── Security

  getSecuritySettings(): SecuritySettings {
    return securityState;
  },

  updateSecuritySettings(patch: Partial<SecuritySettings>): SecuritySettings {
    Object.assign(securityState, patch);
    return securityState;
  },

  getSessions(): ActiveSession[] {
    return Array.from(sessions.values());
  },

  revokeSession(id: string): boolean {
    if (!sessions.has(id)) return false;
    const s = sessions.get(id)!;
    if (s.current) return false; // cannot revoke current session
    sessions.delete(id);
    return true;
  },

  getLoginHistory(): LoginHistoryEntry[] {
    return loginHistory;
  },
};
