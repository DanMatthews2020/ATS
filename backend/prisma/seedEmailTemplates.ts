/**
 * @file seedEmailTemplates.ts
 * @description Seeds interview + feedback email templates.
 * Run with: npx tsx prisma/seedEmailTemplates.ts
 *
 * Templates use {{variable}} format consistent with existing templates.
 * Each template has HTML body with plain-text fallback in a comment block.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Template {
  name: string;
  category: string;
  subject: string;
  body: string;
  plainText: string;
}

const TEMPLATES: Template[] = [
  {
    name: 'Interview Confirmation',
    category: 'interview',
    subject: 'Interview confirmed — {{jobTitle}} with {{companyName}}',
    body: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #1a1a1a; margin-bottom: 16px;">Interview Confirmed</h2>
  <p>Hi {{candidateFirstName}},</p>
  <p>Your interview for <strong>{{jobTitle}}</strong> at <strong>{{companyName}}</strong> has been confirmed.</p>
  <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f8f9fa; border-radius: 8px;">
    <tr><td style="padding: 12px 16px; color: #6b7280; font-size: 13px;">Stage</td><td style="padding: 12px 16px; font-weight: 600;">{{interviewStage}}</td></tr>
    <tr><td style="padding: 12px 16px; color: #6b7280; font-size: 13px;">Date</td><td style="padding: 12px 16px; font-weight: 600;">{{interviewDate}}</td></tr>
    <tr><td style="padding: 12px 16px; color: #6b7280; font-size: 13px;">Time</td><td style="padding: 12px 16px; font-weight: 600;">{{interviewTime}}</td></tr>
    <tr><td style="padding: 12px 16px; color: #6b7280; font-size: 13px;">Interviewer(s)</td><td style="padding: 12px 16px; font-weight: 600;">{{interviewerNames}}</td></tr>
    <tr><td style="padding: 12px 16px; color: #6b7280; font-size: 13px;">Location / Link</td><td style="padding: 12px 16px; font-weight: 600;">{{locationOrLink}}</td></tr>
  </table>
  <p>Please let us know if you have any questions. Good luck!</p>
  <p style="color: #6b7280; font-size: 13px; margin-top: 32px;">— The {{companyName}} Team</p>
</div>`,
    plainText: `Interview Confirmed

Hi {{candidateFirstName}},

Your interview for {{jobTitle}} at {{companyName}} has been confirmed.

Stage: {{interviewStage}}
Date: {{interviewDate}}
Time: {{interviewTime}}
Interviewer(s): {{interviewerNames}}
Location / Link: {{locationOrLink}}

Please let us know if you have any questions. Good luck!

— The {{companyName}} Team`,
  },
  {
    name: 'Interview Rescheduled',
    category: 'interview',
    subject: 'Your {{jobTitle}} interview has been rescheduled',
    body: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #1a1a1a; margin-bottom: 16px;">Interview Rescheduled</h2>
  <p>Hi {{candidateFirstName}},</p>
  <p>Your interview for <strong>{{jobTitle}}</strong> at <strong>{{companyName}}</strong> has been rescheduled.</p>
  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
    <tr><td style="padding: 8px 16px; color: #9ca3af; text-decoration: line-through;">{{oldInterviewDate}} at {{oldInterviewTime}}</td></tr>
  </table>
  <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f8f9fa; border-radius: 8px;">
    <tr><td style="padding: 12px 16px; color: #6b7280; font-size: 13px;">New Date</td><td style="padding: 12px 16px; font-weight: 600;">{{interviewDate}}</td></tr>
    <tr><td style="padding: 12px 16px; color: #6b7280; font-size: 13px;">New Time</td><td style="padding: 12px 16px; font-weight: 600;">{{interviewTime}}</td></tr>
    <tr><td style="padding: 12px 16px; color: #6b7280; font-size: 13px;">Interviewer(s)</td><td style="padding: 12px 16px; font-weight: 600;">{{interviewerNames}}</td></tr>
    <tr><td style="padding: 12px 16px; color: #6b7280; font-size: 13px;">Location / Link</td><td style="padding: 12px 16px; font-weight: 600;">{{locationOrLink}}</td></tr>
  </table>
  <p>We apologise for any inconvenience. Please let us know if the new time doesn't work for you.</p>
  <p style="color: #6b7280; font-size: 13px; margin-top: 32px;">— The {{companyName}} Team</p>
</div>`,
    plainText: `Interview Rescheduled

Hi {{candidateFirstName}},

Your interview for {{jobTitle}} at {{companyName}} has been rescheduled.

Previously: {{oldInterviewDate}} at {{oldInterviewTime}}

New Date: {{interviewDate}}
New Time: {{interviewTime}}
Interviewer(s): {{interviewerNames}}
Location / Link: {{locationOrLink}}

We apologise for any inconvenience. Please let us know if the new time doesn't work for you.

— The {{companyName}} Team`,
  },
  {
    name: 'Interview Cancellation',
    category: 'interview',
    subject: 'Your interview for {{jobTitle}} has been cancelled',
    body: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #1a1a1a; margin-bottom: 16px;">Interview Cancelled</h2>
  <p>Hi {{candidateFirstName}},</p>
  <p>We're writing to let you know that your interview for <strong>{{jobTitle}}</strong> at <strong>{{companyName}}</strong> has been cancelled.</p>
  <p><strong>Reason:</strong> {{reason}}</p>
  <p>We appreciate your time and interest. A member of our team will be in touch regarding next steps.</p>
  <p style="color: #6b7280; font-size: 13px; margin-top: 32px;">— The {{companyName}} Team</p>
</div>`,
    plainText: `Interview Cancelled

Hi {{candidateFirstName}},

We're writing to let you know that your interview for {{jobTitle}} at {{companyName}} has been cancelled.

Reason: {{reason}}

We appreciate your time and interest. A member of our team will be in touch regarding next steps.

— The {{companyName}} Team`,
  },
  {
    name: 'Candidate Scheduling',
    category: 'interview',
    subject: 'Schedule your interview for {{jobTitle}}',
    body: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #1a1a1a; margin-bottom: 16px;">Schedule Your Interview</h2>
  <p>Hi {{candidateFirstName}},</p>
  <p>We'd like to invite you to schedule an interview for the <strong>{{jobTitle}}</strong> position at <strong>{{companyName}}</strong>.</p>
  <p>Please use the link below to choose a time that works best for you:</p>
  <div style="text-align: center; margin: 28px 0;">
    <a href="{{schedulingLink}}" style="display: inline-block; background: #4f46e5; color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">Choose a Time</a>
  </div>
  <p style="color: #6b7280; font-size: 13px;">This link expires on <strong>{{expiresAt}}</strong>.</p>
  <p>If you have any questions, feel free to reply to this email.</p>
  <p style="color: #6b7280; font-size: 13px; margin-top: 32px;">— The {{companyName}} Team</p>
</div>`,
    plainText: `Schedule Your Interview

Hi {{candidateFirstName}},

We'd like to invite you to schedule an interview for the {{jobTitle}} position at {{companyName}}.

Please use the link below to choose a time that works best for you:

{{schedulingLink}}

This link expires on {{expiresAt}}.

If you have any questions, feel free to reply to this email.

— The {{companyName}} Team`,
  },
  {
    name: 'Feedback Reminder',
    category: 'interview',
    subject: 'Feedback needed — {{candidateFullName}} for {{jobTitle}}',
    body: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #1a1a1a; margin-bottom: 16px;">Feedback Reminder</h2>
  <p>Hi {{interviewerFirstName}},</p>
  <p>Your feedback for <strong>{{candidateFullName}}</strong> ({{jobTitle}}) is still outstanding.</p>
  <p>The interview took place on <strong>{{interviewDate}}</strong>. Please submit your feedback as soon as possible to keep the hiring process moving.</p>
  <div style="text-align: center; margin: 28px 0;">
    <a href="{{feedbackLink}}" style="display: inline-block; background: #4f46e5; color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">Submit Feedback</a>
  </div>
  <p style="color: #6b7280; font-size: 13px; margin-top: 32px;">— TeamTalent</p>
</div>`,
    plainText: `Feedback Reminder

Hi {{interviewerFirstName}},

Your feedback for {{candidateFullName}} ({{jobTitle}}) is still outstanding.

The interview took place on {{interviewDate}}. Please submit your feedback as soon as possible to keep the hiring process moving.

Submit feedback: {{feedbackLink}}

— TeamTalent`,
  },
];

async function main() {
  // Find or create a system user for template ownership
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) {
    console.error('No ADMIN user found — cannot seed templates.');
    process.exit(1);
  }

  for (const tpl of TEMPLATES) {
    const existing = await prisma.emailTemplate.findFirst({
      where: { name: tpl.name, category: tpl.category },
    });

    if (existing) {
      console.log(`  ✓ "${tpl.name}" already exists — skipping`);
      continue;
    }

    // Store plain text in body alongside HTML, separated by a marker
    // The body field stores HTML. We append the plain text with a separator
    // so the rendering layer can extract it.
    const combinedBody = `${tpl.body}\n\n<!-- PLAIN_TEXT -->\n${tpl.plainText}`;

    await prisma.emailTemplate.create({
      data: {
        name: tpl.name,
        category: tpl.category,
        subject: tpl.subject,
        body: combinedBody,
        isShared: true,
        createdById: admin.id,
      },
    });
    console.log(`  + Created "${tpl.name}"`);
  }

  console.log('\nEmail template seeding complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
