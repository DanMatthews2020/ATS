import { test, expect } from '@playwright/test';

test.describe('Google SSO Login', () => {
  test('shows Google sign-in button when SSO is configured', async ({ page }) => {
    await page.route('**/api/auth/google/status', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { configured: true } }) }),
    );
    await page.goto('/login');
    await expect(page.getByRole('button', { name: /sign in with google/i })).toBeVisible();
  });

  test('shows "or" divider between form and Google button', async ({ page }) => {
    await page.route('**/api/auth/google/status', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { configured: true } }) }),
    );
    await page.goto('/login');
    // Wait for Google button to confirm SSO section rendered
    await expect(page.getByRole('button', { name: /sign in with google/i })).toBeVisible();
    await expect(page.getByText('or', { exact: true })).toBeVisible();
  });

  test('hides Google button when SSO is not configured', async ({ page }) => {
    await page.route('**/api/auth/google/status', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { configured: false } }) }),
    );
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in with google/i })).not.toBeVisible();
  });

  test('displays error message for domain mismatch', async ({ page }) => {
    await page.goto('/login?error=DOMAIN_NOT_ALLOWED');
    await expect(page.getByText(/only @ordios\.com accounts/i)).toBeVisible();
  });

  test('displays error message for cancelled Google auth', async ({ page }) => {
    await page.goto('/login?error=google_auth_denied');
    await expect(page.getByText(/google sign-in was cancelled/i)).toBeVisible();
  });

  test('displays generic error message for failed Google auth', async ({ page }) => {
    await page.goto('/login?error=google_auth_failed');
    await expect(page.getByText(/google sign-in failed/i)).toBeVisible();
  });
});

test.describe('Invitation Flow', () => {
  test('shows not found when no token provided', async ({ page }) => {
    await page.goto('/invite/accept');
    await expect(page.getByText(/invitation not found/i)).toBeVisible();
  });

  test('shows not found for invalid invitation token', async ({ page }) => {
    await page.route('**/api/invitations/*', (route) =>
      route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ success: false, error: { code: 'INVITATION_NOT_FOUND', message: 'Invitation not found' } }) }),
    );
    await page.goto('/invite/accept?token=invalid-token-123');
    await expect(page.getByText(/invitation not found/i)).toBeVisible();
  });

  test('shows expired state for expired invitation', async ({ page }) => {
    await page.route('**/api/invitations/*', (route) =>
      route.fulfill({ status: 410, contentType: 'application/json', body: JSON.stringify({ success: false, error: { code: 'INVITATION_EXPIRED', message: 'This invitation has expired' } }) }),
    );
    await page.goto('/invite/accept?token=expired-token');
    await expect(page.getByText(/invitation expired/i)).toBeVisible();
  });

  test('shows already accepted state', async ({ page }) => {
    await page.route('**/api/invitations/*', (route) =>
      route.fulfill({ status: 410, contentType: 'application/json', body: JSON.stringify({ success: false, error: { code: 'INVITATION_ALREADY_ACCEPTED', message: 'Already accepted' } }) }),
    );
    await page.goto('/invite/accept?token=accepted-token');
    await expect(page.getByText(/invitation already accepted/i)).toBeVisible();
  });

  test('shows valid invitation with accept button', async ({ page }) => {
    await page.route('**/api/invitations/*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { invitation: { id: '1', email: 'new@ordios.com', role: 'MANAGER', token: 'test-token', jobIds: [], status: 'pending', expiresAt: new Date(Date.now() + 86400000).toISOString(), createdAt: new Date().toISOString(), acceptedAt: null } } }) }),
    );
    await page.goto('/invite/accept?token=test-token');
    await expect(page.getByText(/you.*re invited to join teamtalent/i)).toBeVisible();
    await expect(page.getByText('new@ordios.com')).toBeVisible();
    await expect(page.getByRole('button', { name: /accept with google/i })).toBeVisible();
  });

  test('invitation page shows TeamTalent branding', async ({ page }) => {
    await page.goto('/invite/accept?token=test');
    await expect(page.getByText('TeamTalent')).toBeVisible();
  });
});
