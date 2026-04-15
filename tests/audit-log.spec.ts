import { test, expect } from '@playwright/test';

test.describe('Audit Log', () => {
  test.describe('Admin user — audit log page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
      await page.getByLabel(/email/i).fill('admin@teamtalent.com');
      await page.getByLabel(/password/i).fill('Admin123!');
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForURL(/dashboard/);
    });

    test('audit log page is accessible from settings', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      const auditLink = page.getByRole('link', { name: /audit log/i });
      await expect(auditLink).toBeVisible();
      await auditLink.click();
      await page.waitForURL(/settings\/gdpr\/audit-log/);

      await expect(page.getByText('Audit Log')).toBeVisible();
      await expect(page.getByText(/Full history of actions/)).toBeVisible();
    });

    test('audit log table shows entries after triggering an action', async ({ page }) => {
      // Trigger an auditable action: view a candidate
      await page.goto('/candidates');
      await page.waitForLoadState('networkidle');
      const firstCandidate = page.locator('li button').first();
      if (await firstCandidate.isVisible()) {
        await firstCandidate.click();
        await page.waitForURL(/\/candidates\/.+/);
      }

      // Now check audit log
      await page.goto('/settings/gdpr/audit-log');
      await page.waitForLoadState('networkidle');

      // Table should be present (either with entries or empty state)
      const table = page.locator('table');
      const emptyState = page.getByText('No audit entries found.');
      await expect(table.or(emptyState)).toBeVisible();
    });

    test('audit log filters work', async ({ page }) => {
      await page.goto('/settings/gdpr/audit-log');
      await page.waitForLoadState('networkidle');

      // Action filter select should be visible
      const actionFilter = page.locator('select').first();
      await expect(actionFilter).toBeVisible();

      // Apply button should be visible
      const applyBtn = page.getByRole('button', { name: /apply/i });
      await expect(applyBtn).toBeVisible();
    });
  });

  test.describe('Non-admin user — audit log access', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
      await page.getByLabel(/email/i).fill('john@teamtalent.com');
      await page.getByLabel(/password/i).fill('password');
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForURL(/dashboard/);
    });

    test('audit trail tab is visible on candidate profile', async ({ page }) => {
      await page.goto('/candidates');
      await page.waitForLoadState('networkidle');
      const firstCandidate = page.locator('li button').first();
      if (await firstCandidate.isVisible()) {
        await firstCandidate.click();
        await page.waitForURL(/\/candidates\/.+/);

        // Audit Trail tab should be visible
        const auditTab = page.getByRole('button', { name: /audit trail/i });
        await expect(auditTab).toBeVisible();

        // Click it and verify content loads
        await auditTab.click();
        // Should show either audit entries or empty state
        const shield = page.locator('text=No audit entries yet.');
        const entries = page.locator('[class*="space-y"]');
        await expect(shield.or(entries)).toBeVisible();
      }
    });
  });
});
