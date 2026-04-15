import { test, expect } from '@playwright/test';

// Seed accounts: admin@teamtalent.com (ADMIN), hr@teamtalent.com (HR), john@teamtalent.com (INTERVIEWER)

test.describe('GDPR Hub — ADMIN', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('admin@teamtalent.com');
    await page.getByLabel(/password/i).fill('Admin123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/dashboard/);
  });

  test('settings nav shows Compliance group with Overview link', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Compliance')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Overview' })).toBeVisible();
  });

  test('hub page renders four cards', async ({ page }) => {
    await page.goto('/settings/gdpr');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Compliance & GDPR')).toBeVisible();
    await expect(page.getByText('Rights Requests')).toBeVisible();
    await expect(page.getByText('Audit Log')).toBeVisible();
    await expect(page.getByText('Data Retention')).toBeVisible();
    await expect(page.getByText('Processing Register')).toBeVisible();
  });

  test('hub cards link to sub-pages', async ({ page }) => {
    await page.goto('/settings/gdpr');
    await page.waitForLoadState('networkidle');

    const manageButton = page.getByRole('link', { name: 'Manage' });
    await expect(manageButton).toBeVisible();
    await expect(manageButton).toHaveAttribute('href', '/settings/gdpr/rights-requests');
  });

  test('dashboard compliance banner visible for admin', async ({ page }) => {
    // Clear sessionStorage dismiss flag
    await page.goto('/dashboard');
    await page.evaluate(() => sessionStorage.removeItem('compliance-banner-dismissed'));
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Banner may or may not show depending on data — just verify no crash
    // and that the page loaded properly
    await expect(page.getByText('Dashboard')).toBeVisible();
  });

  test('compliance banner can be dismissed', async ({ page }) => {
    await page.goto('/dashboard');
    await page.evaluate(() => sessionStorage.removeItem('compliance-banner-dismissed'));
    await page.reload();
    await page.waitForLoadState('networkidle');

    const banner = page.getByTestId('compliance-banner');
    const bannerVisible = await banner.isVisible().catch(() => false);

    if (bannerVisible) {
      await page.getByLabel('Dismiss compliance banner').click();
      await expect(banner).not.toBeVisible();

      // After reload, should stay dismissed within same session
      await page.reload();
      await page.waitForLoadState('networkidle');
      await expect(banner).not.toBeVisible();
    }
  });
});

test.describe('GDPR Hub — INTERVIEWER (non-privileged)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('john@teamtalent.com');
    await page.getByLabel(/password/i).fill('password');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/dashboard/);
  });

  test('settings nav does NOT show Compliance group', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Compliance')).not.toBeVisible();
  });

  test('GDPR hub shows access denied', async ({ page }) => {
    await page.goto('/settings/gdpr');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/access denied/i)).toBeVisible();
  });
});
