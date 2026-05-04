import { prisma } from '../lib/prisma';

export interface ThreadData {
  gmailThreadId: string;
  subject: string;
  snippet: string;
  lastMessageAt: Date;
  lastSyncedAt: Date;
  messageCount: number;
  hasUnread: boolean;
}

export interface MessageData {
  gmailMessageId: string;
  from: string;
  to: string;
  subject: string;
  snippet: string;
  bodyHtml: string | null;
  bodyText: string | null;
  receivedAt: Date;
  direction: 'INBOUND' | 'OUTBOUND';
  isRead: boolean;
  gmailLabelIds: string[];
}

const THREAD_INCLUDE = {
  messages: { orderBy: { receivedAt: 'desc' as const } },
} as const;

export const gmailRepository = {
  async findThreadsByCandidate(candidateId: string) {
    return prisma.gmailThread.findMany({
      where: { candidateId },
      include: THREAD_INCLUDE,
      orderBy: { lastMessageAt: 'desc' },
    });
  },

  async findThread(gmailThreadId: string) {
    return prisma.gmailThread.findUnique({
      where: { gmailThreadId },
      include: THREAD_INCLUDE,
    });
  },

  async upsertThread(candidateId: string, data: ThreadData) {
    return prisma.gmailThread.upsert({
      where: { gmailThreadId: data.gmailThreadId },
      create: { candidateId, ...data },
      update: {
        subject: data.subject,
        snippet: data.snippet,
        lastMessageAt: data.lastMessageAt,
        lastSyncedAt: data.lastSyncedAt,
        messageCount: data.messageCount,
        hasUnread: data.hasUnread,
      },
    });
  },

  async upsertMessage(threadId: string, data: MessageData) {
    return prisma.gmailMessage.upsert({
      where: { gmailMessageId: data.gmailMessageId },
      create: { threadId, ...data },
      update: {
        isRead: data.isRead,
        gmailLabelIds: data.gmailLabelIds,
      },
    });
  },

  async getLastSyncedAt(candidateId: string): Promise<Date | null> {
    const thread = await prisma.gmailThread.findFirst({
      where: { candidateId },
      orderBy: { lastSyncedAt: 'desc' },
      select: { lastSyncedAt: true },
    });
    return thread?.lastSyncedAt ?? null;
  },

  async markThreadRead(gmailThreadId: string) {
    const thread = await prisma.gmailThread.findUnique({
      where: { gmailThreadId },
      select: { id: true },
    });
    if (!thread) return;
    await prisma.$transaction([
      prisma.gmailMessage.updateMany({
        where: { threadId: thread.id },
        data: { isRead: true },
      }),
      prisma.gmailThread.update({
        where: { gmailThreadId },
        data: { hasUnread: false },
      }),
    ]);
  },
};
