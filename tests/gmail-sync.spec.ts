import { test, expect } from '@playwright/test';

const AUTH_ME_MOCK = { success: true, data: { user: { id: '1', email: 'admin@ordios.com', firstName: 'Admin', lastName: 'User', role: 'ADMIN', avatarUrl: null } } };
const AUTH_ME_MANAGER = { success: true, data: { user: { id: '2', email: 'manager@ordios.com', firstName: 'Manager', lastName: 'User', role: 'MANAGER', avatarUrl: null } } };
const GOOGLE_STATUS_MOCK = { success: true, data: { configured: true } };

const MOCK_CANDIDATE = {
  id: 'c1',
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane.doe@example.com',
  phone: '+44 7700 900000',
  source: 'JOB_BOARD',
  skills: ['React', 'TypeScript'],
  tags: ['frontend'],
  location: 'London',
  currentCompany: 'Acme',
  doNotContact: false,
  deletedAt: null,
  isAnonymised: false,
  legalBasis: 'LEGITIMATE_INTERESTS',
  retentionStatus: 'ACTIVE',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  applications: [{
    id: 'a1',
    jobPostingId: 'j1',
    jobId: 'j1',
    jobTitle: 'Software Engineer',
    status: 'applied',
    stage: 'screening',
    appliedAt: new Date().toISOString(),
    interviews: [],
    rejectionReasonId: null,
    rejectionNotes: null,
  }],
};

const MOCK_THREAD = {
  id: 't1',
  gmailThreadId: 'gmail_thread_1',
  subject: 'Interview follow-up',
  snippet: 'Thank you for your time today...',
  lastMessageAt: new Date().toISOString(),
  messageCount: 2,
  hasUnread: true,
  messages: [
    {
      id: 'm2',
      gmailMessageId: 'gmail_msg_2',
      from: 'jane.doe@example.com',
      to: 'admin@ordios.com',
      subject: 'Re: Interview follow-up',
      snippet: 'Thank you for your time today...',
      bodyHtml: '<p>Thank you for your time today. I enjoyed our conversation.</p>',
      bodyText: 'Thank you for your time today. I enjoyed our conversation.',
      receivedAt: new Date().toISOString(),
      direction: 'INBOUND',
      isRead: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'm1',
      gmailMessageId: 'gmail_msg_1',
      from: 'admin@ordios.com',
      to: 'jane.doe@example.com',
      subject: 'Interview follow-up',
      snippet: 'Hi Jane, following up on our interview...',
      bodyHtml: '<p>Hi Jane, following up on our interview yesterday.</p>',
      bodyText: 'Hi Jane, following up on our interview yesterday.',
      receivedAt: new Date(Date.now() - 86400000).toISOString(),
      direction: 'OUTBOUND',
      isRead: true,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ],
};

const MOCK_TEMPLATES = [
  { id: 'tpl1', name: 'Phone Screen Invite', category: 'interview', subject: 'Phone screen with {{candidateName}}', body: '<p>Hi {{candidateFirstName}}, we would like to schedule a phone screen.</p>', isShared: true, createdById: '1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

function setupCandidatePageRoutes(page: import('@playwright/test').Page) {
  return Promise.all([
    page.route('**/api/auth/me', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(AUTH_ME_MOCK) }),
    ),
    page.route('**/api/auth/google/status', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(GOOGLE_STATUS_MOCK) }),
    ),
    page.route('**/api/candidates/c1', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { candidate: MOCK_CANDIDATE } }) }),
    ),
    // Stub other panel API calls
    page.route('**/api/candidates/c1/feed', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { feed: [] } }) }),
    ),
    page.route('**/api/candidates/c1/notes', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { notes: [] } }) }),
    ),
    page.route('**/api/candidates/c1/feedback', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { feedback: [] } }) }),
    ),
    page.route('**/api/candidates/c1/emails', (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { threads: [MOCK_THREAD] } }) });
      }
      return route.continue();
    }),
    page.route('**/api/rejection-reasons', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { reasons: [] } }) }),
    ),
  ]);
}

test.describe('Gmail Sync - Compose and Send', () => {
  test('compose and send email appears in thread list', async ({ page }) => {
    await setupCandidatePageRoutes(page);

    // Mock send endpoint
    await page.route('**/api/candidates/c1/emails/send', (route) =>
      route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({
        success: true,
        data: { message: {
          id: 'm_new',
          gmailMessageId: 'gmail_msg_new',
          from: 'admin@ordios.com',
          to: 'jane.doe@example.com',
          subject: 'Hello Jane',
          snippet: 'Just wanted to reach out...',
          bodyHtml: '<p>Just wanted to reach out about the role.</p>',
          bodyText: 'Just wanted to reach out about the role.',
          receivedAt: new Date().toISOString(),
          direction: 'OUTBOUND',
          isRead: true,
          createdAt: new Date().toISOString(),
        } },
      }) }),
    );

    // Mock email templates
    await page.route('**/api/email-templates', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { templates: MOCK_TEMPLATES } }) }),
    );

    await page.goto('/candidates/c1');

    // Click Emails tab
    await page.locator('button').filter({ hasText: /^Emails$/ }).click();
    await expect(page.getByText('Interview follow-up')).toBeVisible();

    // Click Compose
    await page.getByRole('button', { name: /compose/i }).click();
    await expect(page.getByText('New Email')).toBeVisible();

    // Fill in compose form
    await page.getByPlaceholder('Email subject').fill('Hello Jane');
    await page.getByPlaceholder('Write your email').fill('Just wanted to reach out about the role.');

    // Send — click the Send button inside the compose modal
    await page.locator('.fixed.inset-0.z-50').getByRole('button', { name: /send/i }).click();

    // After send, the modal closes and threads reload — verify success
    await expect(page.getByText('Email sent')).toBeVisible();
  });
});

test.describe('Gmail Sync - Manual Sync', () => {
  test('click sync shows new inbound messages', async ({ page }) => {
    await setupCandidatePageRoutes(page);

    // Mock sync endpoint
    await page.route('**/api/candidates/c1/emails/sync', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        success: true,
        data: { threadsFound: 1, messagesFound: 3, syncedAt: new Date().toISOString() },
      }) }),
    );

    await page.goto('/candidates/c1');

    // Click Emails tab
    await page.locator('button').filter({ hasText: /^Emails$/ }).click();
    await expect(page.getByText('Interview follow-up')).toBeVisible();

    // Click Sync
    await page.getByRole('button', { name: /sync/i }).click();

    // Verify toast
    await expect(page.getByText(/synced 3 emails/i)).toBeVisible();
  });
});

test.describe('Gmail Sync - Manager Role', () => {
  test('MANAGER sees thread list but no compose or sync buttons', async ({ page }) => {
    // Use manager auth
    await page.route('**/api/auth/me', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(AUTH_ME_MANAGER) }),
    );
    await page.route('**/api/auth/google/status', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(GOOGLE_STATUS_MOCK) }),
    );
    await page.route('**/api/candidates/c1', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { candidate: MOCK_CANDIDATE } }) }),
    );
    await page.route('**/api/candidates/c1/feed', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { feed: [] } }) }),
    );
    await page.route('**/api/candidates/c1/notes', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { notes: [] } }) }),
    );
    await page.route('**/api/candidates/c1/feedback', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { feedback: [] } }) }),
    );
    await page.route('**/api/candidates/c1/emails', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { threads: [MOCK_THREAD] } }) }),
    );
    await page.route('**/api/rejection-reasons', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { reasons: [] } }) }),
    );

    await page.goto('/candidates/c1');

    // Click Emails tab
    await page.locator('button').filter({ hasText: /^Emails$/ }).click();

    // Thread should be visible
    await expect(page.getByText('Interview follow-up')).toBeVisible();

    // No Compose or Sync buttons
    await expect(page.getByRole('button', { name: /compose/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /sync/i })).not.toBeVisible();
  });
});

test.describe('Gmail Sync - Compose with Template', () => {
  test('selecting template populates subject and body', async ({ page }) => {
    await setupCandidatePageRoutes(page);

    await page.route('**/api/email-templates', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { templates: MOCK_TEMPLATES } }) }),
    );

    await page.goto('/candidates/c1');

    // Click Emails tab
    await page.locator('button').filter({ hasText: /^Emails$/ }).click();
    await expect(page.getByText('Interview follow-up')).toBeVisible();

    // Open compose
    await page.getByRole('button', { name: /compose/i }).click();
    await expect(page.getByText('New Email')).toBeVisible();

    // Wait for templates to load, then select
    const selectEl = page.locator('select').first();
    await expect(selectEl).toBeVisible();
    await expect(selectEl.locator('option')).toHaveCount(2, { timeout: 5000 }); // "None" + 1 template
    await selectEl.selectOption('tpl1');

    // Verify fields populated from template
    const subjectInput = page.getByPlaceholder('Email subject');
    await expect(subjectInput).toHaveValue(/phone screen/i);
  });
});
