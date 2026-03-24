import { randomUUID } from 'crypto';

export type NotificationType = 'interview' | 'offer' | 'application' | 'task' | 'review';

export interface Notification {
  id:        string;
  type:      NotificationType;
  title:     string;
  message:   string;
  read:      boolean;
  href:      string;
  createdAt: string;
}

// ── Seed ──────────────────────────────────────────────────────────────────────

function ago(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

let notifications: Notification[] = [
  { id: 'n-1',  type: 'application', title: 'New Application', message: 'Emily Carter applied for Senior Frontend Engineer', read: false, href: '/candidates', createdAt: ago(5) },
  { id: 'n-2',  type: 'interview',   title: 'Interview Scheduled', message: 'Liam Nguyen — Product Manager — Tomorrow at 2:00 PM', read: false, href: '/interviews', createdAt: ago(18) },
  { id: 'n-3',  type: 'offer',       title: 'Offer Accepted', message: 'Sophia Okonkwo accepted the Data Analyst offer', read: false, href: '/offers', createdAt: ago(45) },
  { id: 'n-4',  type: 'interview',   title: 'Feedback Required', message: 'Aisha Kamara\'s on-site interview is complete — please submit feedback', read: false, href: '/interviews', createdAt: ago(90) },
  { id: 'n-5',  type: 'task',        title: 'Onboarding Task Due', message: 'Sophia Okonkwo: IT setup checklist due tomorrow', read: false, href: '/onboarding', createdAt: ago(120) },
  { id: 'n-6',  type: 'offer',       title: 'Offer Sent', message: 'Offer letter sent to Hassan Ali for Sales Executive', read: false, href: '/offers', createdAt: ago(180) },
  { id: 'n-7',  type: 'review',      title: 'Review Cycle Starting', message: 'Q1 2026 Review Cycle begins in 3 days — 24 participants', read: false, href: '/performance', createdAt: ago(240) },
  { id: 'n-8',  type: 'application', title: 'New Application', message: 'Daniel Osei applied for Data Analyst', read: true, href: '/candidates', createdAt: ago(360) },
  { id: 'n-9',  type: 'interview',   title: 'Interview Cancelled', message: 'Ryan Park cancelled the Product Manager phone screen', read: true, href: '/interviews', createdAt: ago(480) },
  { id: 'n-10', type: 'offer',       title: 'Offer Rejected', message: 'Jordan Mills declined the Marketing Manager offer', read: true, href: '/offers', createdAt: ago(720) },
  { id: 'n-11', type: 'interview',   title: 'No-Show Recorded', message: 'Nadia Svensson did not attend the Frontend Engineer technical interview', read: true, href: '/interviews', createdAt: ago(1440) },
  { id: 'n-12', type: 'application', title: 'New Application', message: 'Clara Müller applied for UX Designer', read: true, href: '/candidates', createdAt: ago(1560) },
  { id: 'n-13', type: 'task',        title: 'Onboarding Task Due', message: 'Priya Sharma: Sign employment contract — due today', read: true, href: '/onboarding', createdAt: ago(1800) },
  { id: 'n-14', type: 'review',      title: 'Goal Updated', message: 'Marcus Williams updated "Hire 10 Engineers" — now 70% complete', read: true, href: '/performance', createdAt: ago(2160) },
  { id: 'n-15', type: 'offer',       title: 'Offer Expired', message: 'Laura Bennet\'s Finance Analyst offer expired without response', read: true, href: '/offers', createdAt: ago(2880) },
  { id: 'n-16', type: 'application', title: 'New Application', message: 'Isaac Fernandez applied for Backend Engineer', read: true, href: '/candidates', createdAt: ago(3600) },
  { id: 'n-17', type: 'interview',   title: 'Interview Completed', message: 'Tom Bradley completed the Frontend Engineer technical screen', read: true, href: '/interviews', createdAt: ago(4320) },
  { id: 'n-18', type: 'offer',       title: 'Offer Accepted', message: 'Priya Sharma accepted the Product Manager offer', read: true, href: '/offers', createdAt: ago(5040) },
];

// ── Service ───────────────────────────────────────────────────────────────────

export const notificationsService = {
  getAll(type?: NotificationType): Notification[] {
    let list = [...notifications];
    if (type) list = list.filter((n) => n.type === type);
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  getUnreadCount(): number {
    return notifications.filter((n) => !n.read).length;
  },

  markRead(id: string): boolean {
    const n = notifications.find((n) => n.id === id);
    if (!n) return false;
    n.read = true;
    return true;
  },

  markAllRead(): number {
    let count = 0;
    for (const n of notifications) {
      if (!n.read) { n.read = true; count++; }
    }
    return count;
  },

  push(data: { type: NotificationType; title: string; message: string; href: string }): Notification {
    const n: Notification = {
      id:        `n-${randomUUID().slice(0, 8)}`,
      type:      data.type,
      title:     data.title,
      message:   data.message,
      read:      false,
      href:      data.href,
      createdAt: new Date().toISOString(),
    };
    notifications = [n, ...notifications];
    return n;
  },
};
