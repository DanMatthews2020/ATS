import { getGmailClient } from '../utils/googleApiClient';
import { googleWorkspaceService } from './googleWorkspace.service';
import { SCOPE_SETS } from '../config/googleScopes';
import { gmailRepository } from '../repositories/gmail.repository';
import { prisma } from '../lib/prisma';
import type { GmailMessage } from '@prisma/client';

// ── Helpers ──────────────────────────────────────────────────────────────────

function base64urlEncode(str: string): string {
  return Buffer.from(str, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function buildRfc2822(params: {
  from: string;
  to: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  inReplyTo?: string;
  references?: string;
}): string {
  const boundary = `boundary_${Date.now()}`;
  const lines = [
    `From: ${params.from}`,
    `To: ${params.to}`,
    `Subject: ${params.subject}`,
    'MIME-Version: 1.0',
  ];
  if (params.inReplyTo) {
    lines.push(`In-Reply-To: ${params.inReplyTo}`);
    lines.push(`References: ${params.references ?? params.inReplyTo}`);
  }
  lines.push(`Content-Type: multipart/alternative; boundary="${boundary}"`, '', `--${boundary}`);
  lines.push('Content-Type: text/plain; charset="UTF-8"', '', params.bodyText, '', `--${boundary}`);
  lines.push('Content-Type: text/html; charset="UTF-8"', '', params.bodyHtml, '', `--${boundary}--`);
  return lines.join('\r\n');
}

function getHeader(headers: Array<{ name?: string | null; value?: string | null }> | undefined, name: string): string {
  return headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? '';
}

function decodeBody(payload: { body?: { data?: string | null }; parts?: Array<{ mimeType?: string | null; body?: { data?: string | null }; parts?: Array<{ mimeType?: string | null; body?: { data?: string | null } }> }> }): { html: string | null; text: string | null } {
  let html: string | null = null;
  let text: string | null = null;

  function extract(part: { mimeType?: string | null; body?: { data?: string | null }; parts?: Array<{ mimeType?: string | null; body?: { data?: string | null } }> }) {
    if (part.parts) {
      for (const sub of part.parts) extract(sub);
    }
    if (part.body?.data) {
      const decoded = Buffer.from(part.body.data, 'base64url').toString('utf-8');
      if (part.mimeType === 'text/html') html = decoded;
      else if (part.mimeType === 'text/plain') text = decoded;
    }
  }

  extract(payload);
  return { html, text };
}

// ── Timeline helper ──────────────────────────────────────────────────────────

async function createTimelineEvent(candidateId: string, type: string, actorId: string | null, metadata: Record<string, unknown>) {
  await prisma.timelineEvent.create({
    data: {
      candidateId,
      type: type as never, // enum value
      actorId,
      metadata: metadata as object,
    },
  });
}

// ── Service ──────────────────────────────────────────────────────────────────

export const gmailService = {
  async isGmailConnected(userId: string): Promise<boolean> {
    return googleWorkspaceService.hasGrantedScopes(userId, [...SCOPE_SETS.GMAIL]);
  },

  async getGmailStatus(userId: string): Promise<{ connected: boolean; googleEmail?: string; lastSyncedAt?: string }> {
    const profile = await prisma.googleWorkspaceConnection.findUnique({
      where: { userId },
      select: { googleEmail: true, grantedScopes: true, isActive: true },
    });
    if (!profile || !profile.isActive) return { connected: false };
    const connected = profile.grantedScopes.includes(SCOPE_SETS.GMAIL[0]);
    if (!connected) return { connected: false };

    // Find most recent sync across all candidates
    const latestThread = await prisma.gmailThread.findFirst({
      orderBy: { lastSyncedAt: 'desc' },
      select: { lastSyncedAt: true },
    });
    return {
      connected: true,
      googleEmail: profile.googleEmail,
      lastSyncedAt: latestThread?.lastSyncedAt?.toISOString(),
    };
  },

  async sendEmail(params: {
    recruiterId: string;
    candidateId: string;
    to: string;
    subject: string;
    bodyHtml: string;
    bodyText: string;
    replyToThreadId?: string;
  }): Promise<GmailMessage> {
    const gmail = await getGmailClient(params.recruiterId);

    // Get recruiter's email
    const profile = await prisma.googleWorkspaceConnection.findUnique({
      where: { userId: params.recruiterId },
      select: { googleEmail: true },
    });
    const fromEmail = profile?.googleEmail ?? '';

    // Build the raw message
    const rawOpts: Parameters<typeof buildRfc2822>[0] = {
      from: fromEmail,
      to: params.to,
      subject: params.subject,
      bodyHtml: params.bodyHtml,
      bodyText: params.bodyText,
    };

    // If replying, get the original message-id for threading
    let existingThread: Awaited<ReturnType<typeof gmailRepository.findThread>> = null;
    if (params.replyToThreadId) {
      existingThread = await gmailRepository.findThread(params.replyToThreadId);
      if (existingThread?.messages?.length) {
        const lastMsg = existingThread.messages[0]; // ordered desc
        rawOpts.inReplyTo = lastMsg.gmailMessageId;
      }
    }

    const raw = base64urlEncode(buildRfc2822(rawOpts));

    const sendParams: { userId: string; requestBody: { raw: string; threadId?: string } } = {
      userId: 'me',
      requestBody: { raw },
    };
    if (params.replyToThreadId) {
      sendParams.requestBody.threadId = params.replyToThreadId;
    }

    const sent = await gmail.users.messages.send(sendParams);
    const msgId = sent.data.id!;
    const threadId = sent.data.threadId!;

    // Fetch the full sent message for storage
    const full = await gmail.users.messages.get({ userId: 'me', id: msgId, format: 'full' });
    const headers = full.data.payload?.headers ?? [];
    const { html, text } = decodeBody(full.data.payload as Parameters<typeof decodeBody>[0]);

    // Upsert thread
    const thread = await gmailRepository.upsertThread(params.candidateId, {
      gmailThreadId: threadId,
      subject: params.subject,
      snippet: full.data.snippet ?? params.bodyText.slice(0, 200),
      lastMessageAt: new Date(),
      lastSyncedAt: new Date(),
      messageCount: (existingThread?.messageCount ?? 0) + 1,
      hasUnread: false,
    });

    // Create message record
    const message = await gmailRepository.upsertMessage(thread.id, {
      gmailMessageId: msgId,
      from: fromEmail,
      to: params.to,
      subject: getHeader(headers, 'Subject') || params.subject,
      snippet: full.data.snippet ?? '',
      bodyHtml: html,
      bodyText: text,
      receivedAt: new Date(),
      direction: 'OUTBOUND',
      isRead: true,
      gmailLabelIds: full.data.labelIds ?? [],
    });

    // Timeline event
    await createTimelineEvent(params.candidateId, 'EMAIL_SENT', params.recruiterId, {
      gmailMessageId: msgId,
      subject: params.subject,
      to: params.to,
    });

    return message;
  },

  async syncCandidateThreads(params: {
    recruiterId: string;
    candidateId: string;
    candidateEmail: string;
    fullSync?: boolean;
  }): Promise<{ threadsFound: number; messagesFound: number }> {
    const gmail = await getGmailClient(params.recruiterId);

    // Build search query
    let query = `to:${params.candidateEmail} OR from:${params.candidateEmail}`;
    if (!params.fullSync) {
      const lastSynced = await gmailRepository.getLastSyncedAt(params.candidateId);
      if (lastSynced) {
        const epochSec = Math.floor(lastSynced.getTime() / 1000);
        query += ` after:${epochSec}`;
      }
    }

    // List matching threads
    const listRes = await gmail.users.threads.list({ userId: 'me', q: query, maxResults: 50 });
    const gmailThreads = listRes.data.threads ?? [];

    // Get recruiter email for direction check
    const profile = await prisma.googleWorkspaceConnection.findUnique({
      where: { userId: params.recruiterId },
      select: { googleEmail: true },
    });
    const recruiterEmail = profile?.googleEmail?.toLowerCase() ?? '';

    let threadsFound = 0;
    let messagesFound = 0;

    for (const gmailThread of gmailThreads) {
      if (!gmailThread.id) continue;

      const threadData = await gmail.users.threads.get({ userId: 'me', id: gmailThread.id, format: 'full' });
      const messages = threadData.data.messages ?? [];
      if (messages.length === 0) continue;

      const firstMsg = messages[0];
      const lastMsg = messages[messages.length - 1];
      const firstHeaders = firstMsg.payload?.headers ?? [];
      const subject = getHeader(firstHeaders, 'Subject') || '(no subject)';

      // Check if any messages are unread
      const hasUnread = messages.some((m) => m.labelIds?.includes('UNREAD'));

      const thread = await gmailRepository.upsertThread(params.candidateId, {
        gmailThreadId: gmailThread.id,
        subject,
        snippet: lastMsg.snippet ?? '',
        lastMessageAt: new Date(Number(lastMsg.internalDate ?? Date.now())),
        lastSyncedAt: new Date(),
        messageCount: messages.length,
        hasUnread,
      });
      threadsFound++;

      for (const msg of messages) {
        if (!msg.id) continue;
        const headers = msg.payload?.headers ?? [];
        const fromHeader = getHeader(headers, 'From').toLowerCase();
        const direction = fromHeader.includes(recruiterEmail) ? 'OUTBOUND' : 'INBOUND';
        const { html, text } = decodeBody(msg.payload as Parameters<typeof decodeBody>[0]);

        const isNew = !(await prisma.gmailMessage.findUnique({
          where: { gmailMessageId: msg.id },
          select: { id: true },
        }));

        await gmailRepository.upsertMessage(thread.id, {
          gmailMessageId: msg.id,
          from: getHeader(headers, 'From'),
          to: getHeader(headers, 'To'),
          subject: getHeader(headers, 'Subject') || subject,
          snippet: msg.snippet ?? '',
          bodyHtml: html,
          bodyText: text,
          receivedAt: new Date(Number(msg.internalDate ?? Date.now())),
          direction,
          isRead: !msg.labelIds?.includes('UNREAD'),
          gmailLabelIds: msg.labelIds ?? [],
        });
        messagesFound++;

        // Timeline event for new inbound messages only
        if (isNew && direction === 'INBOUND') {
          await createTimelineEvent(params.candidateId, 'EMAIL_RECEIVED', null, {
            gmailMessageId: msg.id,
            subject: getHeader(headers, 'Subject'),
            from: getHeader(headers, 'From'),
          });
        }
      }
    }

    return { threadsFound, messagesFound };
  },

  async syncAllActiveCandidates(recruiterId: string): Promise<void> {
    const candidates = await prisma.candidate.findMany({
      where: {
        deletedAt: null,
        applications: { some: {} },
      },
      select: { id: true, email: true },
    });

    let synced = 0;
    let errors = 0;

    for (const candidate of candidates) {
      try {
        await gmailService.syncCandidateThreads({
          recruiterId,
          candidateId: candidate.id,
          candidateEmail: candidate.email,
          fullSync: false,
        });
        synced++;
      } catch (err) {
        errors++;
        console.error(`[GmailSync] Error syncing candidate ${candidate.id}:`, err);
      }
    }

    console.log(`[GmailSync] Completed for recruiter ${recruiterId}: ${synced} candidates synced, ${errors} errors`);
  },

  async getGmailConnectUrl(userId: string): Promise<string> {
    // Re-use the existing Google Auth URL which already requests Gmail scopes
    const { googleAuthService } = await import('./googleAuth.service');
    return googleAuthService.generateAuthUrl(`gmail_connect_${userId}`);
  },
};
