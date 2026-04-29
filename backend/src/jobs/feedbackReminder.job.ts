/**
 * @file feedbackReminder.job.ts
 * @description Scheduled job that processes overdue feedback requests.
 *
 * Uses setInterval since node-cron is not installed and this avoids
 * adding a new dependency. Parses FEEDBACK_REMINDER_CRON for the hour
 * or defaults to running every hour with a check for 9 AM.
 */
import { feedbackWorkflowService } from '../services/feedbackWorkflow.service';

const INTERVAL_MS = 60 * 60 * 1000; // check every hour
const RUN_HOUR = Number(process.env.FEEDBACK_REMINDER_HOUR ?? 9); // default 9 AM

let started = false;

export function startFeedbackReminderJob(): void {
  if (started) return;
  started = true;

  console.log(`[FeedbackReminder] Scheduled — will run daily at ${RUN_HOUR}:00`);

  setInterval(async () => {
    const currentHour = new Date().getHours();
    if (currentHour !== RUN_HOUR) return;

    console.log('[FeedbackReminder] Starting overdue feedback check...');
    try {
      const result = await feedbackWorkflowService.processOverdueFeedback();
      console.log(`[FeedbackReminder] Done — ${result.processed} reminders sent`);
    } catch (err) {
      console.error('[FeedbackReminder] Error:', err);
    }
  }, INTERVAL_MS);
}
