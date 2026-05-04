import { prisma } from '../lib/prisma';
import { SCOPE_SETS } from '../config/googleScopes';
import { gmailService } from '../services/gmail.service';

const INTERVAL_MINUTES = Number(process.env.GMAIL_SYNC_INTERVAL_MINUTES ?? 15);
const INTERVAL_MS = INTERVAL_MINUTES * 60 * 1000;

let started = false;

export function startGmailSyncJob(): void {
  if (started) return;
  started = true;

  console.log(`[GmailSync] Scheduled — every ${INTERVAL_MINUTES} minutes`);

  setInterval(async () => {
    console.log('[GmailSync] Starting batch sync…');

    try {
      // Find all users with Gmail scope granted
      const connections = await prisma.googleWorkspaceConnection.findMany({
        where: {
          isActive: true,
          user: { role: { in: ['ADMIN', 'HR'] } },
        },
        select: { userId: true, grantedScopes: true },
      });

      const gmailScope = SCOPE_SETS.GMAIL[0];
      const eligible = connections.filter((c) => c.grantedScopes.includes(gmailScope));

      if (eligible.length === 0) {
        console.log('[GmailSync] No eligible users — skipping');
        return;
      }

      let totalErrors = 0;
      for (const conn of eligible) {
        try {
          await gmailService.syncAllActiveCandidates(conn.userId);
        } catch (err) {
          totalErrors++;
          console.error(`[GmailSync] Error for user ${conn.userId}:`, err);
        }
      }

      console.log(`[GmailSync] Batch complete — ${eligible.length} users processed, ${totalErrors} errors`);
    } catch (err) {
      console.error('[GmailSync] Fatal batch error:', err);
    }
  }, INTERVAL_MS);
}
