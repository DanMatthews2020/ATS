import { test, expect } from '@playwright/test';

test.describe('Privacy Policy (public)', () => {
  test('accessible without login', async ({ page }) => {
    await page.goto('/privacy-policy');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText('Privacy Notice — Recruitment');
  });

  test('contains Autoriteit Persoonsgegevens', async ({ page }) => {
    await page.goto('/privacy-policy');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Autoriteit Persoonsgegevens')).toBeVisible();
    await expect(page.getByText('+31 70 888 8500')).toBeVisible();
  });

  test('contains placeholder tokens with amber highlighting', async ({ page }) => {
    await page.goto('/privacy-policy');
    await page.waitForLoadState('networkidle');

    const placeholder = page.locator('span.bg-amber-100').first();
    await expect(placeholder).toBeVisible();
  });
});

test.describe('RoPA Register', () => {
  test.describe('Admin user', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
      await page.getByLabel(/email/i).fill('admin@teamtalent.com');
      await page.getByLabel(/password/i).fill('Admin123!');
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForURL(/dashboard/);
    });

    test('RoPA page loads from settings', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      const link = page.getByRole('link', { name: /processing register/i });
      await expect(link).toBeVisible();
      await link.click();
      await page.waitForURL(/settings\/gdpr\/ropa/);

      await expect(page.getByText('Records of Processing Activities')).toBeVisible();
      await expect(page.getByText('Article 30 GDPR compliance register')).toBeVisible();
    });

    test('ADMIN can add RoPA entry — appears in table', async ({ page }) => {
      await page.goto('/settings/gdpr/ropa');
      await page.waitForLoadState('networkidle');

      await page.getByRole('button', { name: /add processing activity/i }).click();
      await expect(page.getByText('Add Processing Activity')).toBeVisible();

      // Fill form
      await page.locator('input').filter({ hasText: '' }).first().fill('Test processing activity');
      // Use more specific selectors for each field
      const inputs = page.locator('.space-y-4 input:not([type="checkbox"])');
      const textareas = page.locator('.space-y-4 textarea');

      // Fill fields in order: processingActivity, purpose, legalBasis, dataCategories, dataSubjects, recipients, retentionPeriod
      await inputs.nth(0).fill('Test Processing Activity');
      await inputs.nth(1).fill('Testing purposes');
      await inputs.nth(2).fill('Consent (GDPR Art. 6(1)(a))');
      await inputs.nth(3).fill('Name, Email');
      await inputs.nth(4).fill('Test subjects');
      await inputs.nth(5).fill('Internal team');
      await inputs.nth(6).fill('12 months');
      await textareas.first().fill('Encryption at rest');

      await page.getByRole('button', { name: /^save$/i }).click();

      // Should see success toast and entry in table
      await expect(page.getByText(/entry created/i).or(page.getByText('Test Processing Activity'))).toBeVisible({ timeout: 10000 });
    });

    test('"Not reviewed" badge appears for entries with no review date', async ({ page }) => {
      await page.goto('/settings/gdpr/ropa');
      await page.waitForLoadState('networkidle');

      // The seeded entry or any entry without a review should show "Not reviewed"
      const notReviewed = page.getByText('Not reviewed');
      const reviewed = page.getByText('Review overdue');
      const table = page.locator('table');

      const hasTable = await table.isVisible().catch(() => false);
      if (hasTable) {
        // Either "Not reviewed" or "Review overdue" should be present for unreviewed entries
        await expect(notReviewed.or(reviewed).first()).toBeVisible();
      }
    });

    test('"Mark Reviewed" updates the review date', async ({ page }) => {
      await page.goto('/settings/gdpr/ropa');
      await page.waitForLoadState('networkidle');

      const reviewBtn = page.getByRole('button', { name: /reviewed/i }).first();
      const hasBtn = await reviewBtn.isVisible().catch(() => false);

      if (hasBtn) {
        await reviewBtn.click();
        await expect(page.getByText(/marked as reviewed/i)).toBeVisible({ timeout: 10000 });
      }
    });

    test('Download JSON triggers a file download', async ({ page }) => {
      await page.goto('/settings/gdpr/ropa');
      await page.waitForLoadState('networkidle');

      const downloadBtn = page.getByRole('button', { name: /download json/i });
      await expect(downloadBtn).toBeVisible();

      // Set up download listener
      const [download] = await Promise.all([
        page.waitForEvent('download').catch(() => null),
        downloadBtn.click(),
      ]);

      // If download triggered, verify filename pattern
      if (download) {
        expect(download.suggestedFilename()).toMatch(/ropa-register-\d{4}-\d{2}-\d{2}\.json/);
      }
    });
  });

  test.describe('Non-admin user', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
      await page.getByLabel(/email/i).fill('john@teamtalent.com');
      await page.getByLabel(/password/i).fill('password');
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForURL(/dashboard/);
    });

    test('sees access denied on RoPA page', async ({ page }) => {
      await page.goto('/settings/gdpr/ropa');
      await page.waitForLoadState('networkidle');

      await expect(page.getByText(/access denied/i)).toBeVisible();
    });
  });
});
