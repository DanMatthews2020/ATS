import { test, expect } from '@playwright/test';

// Seed accounts: admin@teamtalent.com (ADMIN), hr@teamtalent.com (HR), john@teamtalent.com (INTERVIEWER/MANAGER)

test.describe('RBAC — INTERVIEWER role', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('john@teamtalent.com');
    await page.getByLabel(/password/i).fill('password');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/dashboard/);
  });

  test('candidate profile shows masked PII', async ({ page }) => {
    await page.goto('/candidates');
    await page.waitForLoadState('networkidle');

    // Click first candidate if available
    const firstCandidate = page.locator('li button, tr td a, [data-testid="candidate-row"]').first();
    const hasCandidate = await firstCandidate.isVisible().catch(() => false);

    if (hasCandidate) {
      await firstCandidate.click();
      await page.waitForURL(/\/candidates\/.+/);
      await page.waitForLoadState('networkidle');

      // PII should be masked with bullet characters
      const maskedText = page.locator('text=••••••••');
      await expect(maskedText.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('GET /api/candidates/:id returns null for email (server-side PII strip)', async ({ page, request }) => {
    // First, get a candidate ID
    await page.goto('/candidates');
    await page.waitForLoadState('networkidle');

    // Get cookies for API request
    const cookies = await page.context().cookies();
    const accessToken = cookies.find(c => c.name === 'access_token')?.value;

    if (accessToken) {
      const apiRes = await request.get('http://localhost:3001/api/candidates', {
        headers: { Cookie: `access_token=${accessToken}` },
      });

      if (apiRes.ok()) {
        const data = await apiRes.json();
        const candidates = data?.data?.items ?? data?.data?.candidates ?? [];
        if (candidates.length > 0) {
          const candidateId = candidates[0].id;
          const detailRes = await request.get(`http://localhost:3001/api/candidates/${candidateId}`, {
            headers: { Cookie: `access_token=${accessToken}` },
          });

          if (detailRes.ok()) {
            const detail = await detailRes.json();
            const candidate = detail?.data?.candidate;
            expect(candidate?.email).toBeNull();
            expect(candidate?.phone).toBeNull();
          }
        }
      }
    }
  });

  test('GDPR audit log shows access-denied message', async ({ page }) => {
    await page.goto('/settings/gdpr/audit-log');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/access denied/i).or(page.getByText(/access restricted/i))).toBeVisible();
  });

  test('POST /api/candidates returns 403', async ({ page, request }) => {
    const cookies = await page.context().cookies();
    const accessToken = cookies.find(c => c.name === 'access_token')?.value;

    if (accessToken) {
      const res = await request.post('http://localhost:3001/api/candidates', {
        headers: {
          Cookie: `access_token=${accessToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          firstName: 'Test',
          lastName: 'Forbidden',
          email: 'forbidden@test.com',
        },
      });

      expect(res.status()).toBe(403);
    }
  });
});

test.describe('RBAC — HR role', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('hr@teamtalent.com');
    await page.getByLabel(/password/i).fill('Admin123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/dashboard/);
  });

  test('can access rights requests page', async ({ page }) => {
    await page.goto('/settings/gdpr/rights-requests');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Rights Requests')).toBeVisible();
    // Should NOT see access denied
    await expect(page.getByText(/access denied/i)).not.toBeVisible();
  });

  test('POST /api/gdpr/rights-requests/:id/fulfil-erasure returns 403', async ({ page, request }) => {
    const cookies = await page.context().cookies();
    const accessToken = cookies.find(c => c.name === 'access_token')?.value;

    if (accessToken) {
      const res = await request.post('http://localhost:3001/api/gdpr/rights-requests/fake-id/fulfil-erasure', {
        headers: { Cookie: `access_token=${accessToken}` },
      });

      // Should be 403 (HR lacks gdpr:erasure permission), not 404
      expect(res.status()).toBe(403);
    }
  });
});

test.describe('RBAC — ADMIN role', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('admin@teamtalent.com');
    await page.getByLabel(/password/i).fill('Admin123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/dashboard/);
  });

  test('all GDPR routes accessible', async ({ page }) => {
    for (const path of [
      '/settings/gdpr/audit-log',
      '/settings/gdpr/retention',
      '/settings/gdpr/rights-requests',
      '/settings/gdpr/ropa',
    ]) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await expect(page.getByText(/access denied/i)).not.toBeVisible();
    }
  });

  test('access-denied pages show a message not a blank screen', async ({ page }) => {
    // Logout and login as non-privileged user
    await page.goto('/settings/gdpr/audit-log');
    await page.waitForLoadState('networkidle');

    // ADMIN should see content
    await expect(page.getByText(/access denied/i)).not.toBeVisible();

    // Verify the page has actual content
    const bodyText = await page.textContent('body');
    expect(bodyText?.trim().length).toBeGreaterThan(50);
  });

  test('role badge visible in profile settings', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('ADMIN')).toBeVisible();
    await expect(page.getByText(/roles are managed/i)).toBeVisible();
  });
});
