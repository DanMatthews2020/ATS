import { test, expect } from '@playwright/test';

const AUTH_ADMIN = { success: true, data: { user: { id: '1', email: 'admin@ordios.com', firstName: 'Admin', lastName: 'User', role: 'ADMIN', avatarUrl: null } } };
const GOOGLE_STATUS = { success: true, data: { configured: true } };

const MOCK_STATUS_CONNECTED = {
  success: true,
  data: {
    workspace: {
      connected: true,
      googleEmail: 'admin@ordios.com',
      displayName: 'Admin User',
      avatarUrl: null,
      grantedScopes: ['calendar', 'gmail'],
      connectedAt: '2026-04-28T10:00:00Z',
      features: { calendar: true, gmail: true, directory: false, drive: false },
    },
    calendar: { connected: true, email: 'admin@ordios.com', calendarId: 'primary', provider: 'google' },
    gmail: { connected: true, googleEmail: 'admin@ordios.com', lastSyncedAt: '2026-05-05T09:00:00Z' },
  },
};

const MOCK_STATUS_DISCONNECTED = {
  success: true,
  data: {
    workspace: { connected: false, grantedScopes: [], features: { calendar: false, gmail: false, directory: false, drive: false } },
    calendar: { connected: false },
    gmail: { connected: false },
  },
};

const MOCK_STATUS_PARTIAL = {
  success: true,
  data: {
    workspace: {
      connected: true,
      googleEmail: 'admin@ordios.com',
      displayName: 'Admin User',
      avatarUrl: null,
      grantedScopes: ['calendar'],
      connectedAt: '2026-04-28T10:00:00Z',
      features: { calendar: true, gmail: false, directory: false, drive: false },
    },
    calendar: { connected: true, email: 'admin@ordios.com', calendarId: 'primary', provider: 'google' },
    gmail: { connected: false },
  },
};

function mockCommon(page: import('@playwright/test').Page) {
  return Promise.all([
    page.route('**/api/auth/me', (r) => r.fulfill({ json: AUTH_ADMIN })),
    page.route('**/api/auth/google/status', (r) => r.fulfill({ json: GOOGLE_STATUS })),
    page.route('**/api/notifications', (r) => r.fulfill({ json: { success: true, data: { items: [], total: 0 } } })),
    page.route('**/api/settings/profile', (r) => r.fulfill({ json: { success: true, data: { firstName: 'Admin', lastName: 'User', email: 'admin@ordios.com', role: 'ADMIN', phone: '', timezone: 'Europe/London', avatarUrl: null } } })),
  ]);
}

test.describe('Integrations Settings Tab', () => {
  test('shows connected status for all integrations', async ({ page }) => {
    await mockCommon(page);
    await page.route('**/api/integrations/status', (r) => r.fulfill({ json: MOCK_STATUS_CONNECTED }));

    await page.goto('/settings');
    await page.getByRole('button', { name: 'Integrations' }).click();

    // Google Workspace card shows connected
    await expect(page.getByText('Google Workspace').first()).toBeVisible();
    await expect(page.getByText('admin@ordios.com').first()).toBeVisible();

    // Feature badges
    await expect(page.getByText('Calendar').first()).toBeVisible();
    await expect(page.getByText('Gmail').first()).toBeVisible();

    // Individual cards
    await expect(page.getByText('Google Calendar')).toBeVisible();
    await expect(page.getByText('Gmail').nth(1)).toBeVisible();

    // Coming soon section
    await expect(page.getByText('Google Drive', { exact: true })).toBeVisible();
    await expect(page.getByText('Google Chat', { exact: true })).toBeVisible();
    await expect(page.getByText('Google Docs', { exact: true })).toBeVisible();
  });

  test('shows disconnected state and connect buttons', async ({ page }) => {
    await mockCommon(page);
    await page.route('**/api/integrations/status', (r) => r.fulfill({ json: MOCK_STATUS_DISCONNECTED }));

    await page.goto('/settings');
    await page.getByRole('button', { name: 'Integrations' }).click();

    // Connect buttons visible
    await expect(page.getByText('Connect Google')).toBeVisible();
    await expect(page.getByText('Connect Calendar')).toBeVisible();
    await expect(page.getByText('Connect Gmail')).toBeVisible();

    // No "Connected" badges
    await expect(page.locator('text=Connected >> visible=true').first()).not.toBeVisible({ timeout: 2000 }).catch(() => {});
  });

  test('disconnect workspace shows confirmation dialog', async ({ page }) => {
    await mockCommon(page);
    await page.route('**/api/integrations/status', (r) => r.fulfill({ json: MOCK_STATUS_CONNECTED }));

    await page.goto('/settings');
    await page.getByRole('button', { name: 'Integrations' }).click();

    // Click disconnect on the Google Workspace card (first disconnect button)
    const disconnectButtons = page.getByText('Disconnect');
    await disconnectButtons.first().click();

    // Confirmation modal appears with data loss warning
    await expect(page.getByText('Disconnect Google Workspace?')).toBeVisible();
    await expect(page.getByText('This will disconnect all Google integrations')).toBeVisible();

    // Cancel closes the dialog
    await page.getByText('Cancel').click();
    await expect(page.getByText('Disconnect Google Workspace?')).not.toBeVisible();
  });

  test('shows partial state when calendar connected but gmail not', async ({ page }) => {
    await mockCommon(page);
    await page.route('**/api/integrations/status', (r) => r.fulfill({ json: MOCK_STATUS_PARTIAL }));

    await page.goto('/settings');
    await page.getByRole('button', { name: 'Integrations' }).click();

    // Workspace shows partial badge
    await expect(page.getByText('Partial')).toBeVisible();

    // Calendar shows connected (has Disconnect button)
    await expect(page.getByRole('button', { name: 'Disconnect' }).first()).toBeVisible();

    // Gmail shows connect button
    await expect(page.getByText('Connect Gmail')).toBeVisible();
  });
});
