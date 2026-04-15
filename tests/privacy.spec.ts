import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('john@teamtalent.com');
  await page.getByLabel(/password/i).fill('password');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/dashboard/);
});

test.describe('Privacy & Consent section on candidate profile', () => {
  test('Privacy & Consent section is visible', async ({ page }) => {
    // Navigate to candidates list, click the first candidate
    await page.goto('/candidates');
    await page.waitForLoadState('networkidle');
    const firstCandidate = page.locator('li button').first();
    await firstCandidate.click();
    await page.waitForURL(/\/candidates\/.+/);

    // Verify the Privacy & Consent section exists
    await expect(page.getByText('Privacy & Consent')).toBeVisible();
    await expect(page.getByText('Legal basis')).toBeVisible();
  });

  test('selecting Consent shows consent fields, Legitimate Interests hides them', async ({ page }) => {
    await page.goto('/candidates');
    await page.waitForLoadState('networkidle');
    await page.locator('li button').first().click();
    await page.waitForURL(/\/candidates\/.+/);

    // Wait for Privacy section to load
    await expect(page.getByText('Legal basis')).toBeVisible();

    // Select Consent — consent fields should appear
    await page.locator('#legal-basis').selectOption('CONSENT');
    await expect(page.getByText('Consent given')).toBeVisible();
    await expect(page.getByText('Consent scope')).toBeVisible();

    // Select Legitimate Interests — consent fields should disappear
    await page.locator('#legal-basis').selectOption('LEGITIMATE_INTERESTS');
    await expect(page.getByText('Consent given')).not.toBeVisible();
    await expect(page.getByText('Consent scope')).not.toBeVisible();
  });

  test('save with CONSENT but no date shows inline error', async ({ page }) => {
    await page.goto('/candidates');
    await page.waitForLoadState('networkidle');
    await page.locator('li button').first().click();
    await page.waitForURL(/\/candidates\/.+/);

    await expect(page.getByText('Legal basis')).toBeVisible();

    // Select Consent
    await page.locator('#legal-basis').selectOption('CONSENT');
    await expect(page.getByText('Consent given')).toBeVisible();

    // Click Save without filling consent date
    await page.getByRole('button', { name: /save privacy settings/i }).click();

    // Should show inline error
    await expect(page.getByText('Consent date is required')).toBeVisible();
  });

  test('Send Privacy Notice opens modal and can confirm', async ({ page }) => {
    await page.goto('/candidates');
    await page.waitForLoadState('networkidle');
    await page.locator('li button').first().click();
    await page.waitForURL(/\/candidates\/.+/);

    await expect(page.getByText('Privacy & Consent')).toBeVisible();

    // Click Send Privacy Notice
    await page.getByRole('button', { name: /send privacy notice/i }).click();

    // Modal should open
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Privacy Notice Preview')).toBeVisible();
    await expect(page.getByText('Wire your email provider')).toBeVisible();

    // Confirm & Send
    await page.getByRole('button', { name: /confirm & send/i }).click();

    // Wait for modal to close and success toast
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
  });
});

test.describe('Candidates list privacy warning', () => {
  test('candidate without sent notice shows warning badge', async ({ page }) => {
    await page.goto('/candidates');
    await page.waitForLoadState('networkidle');

    // At least one candidate should show the "No notice" badge
    // (since privacy notices haven't been sent to seed data)
    await expect(page.getByText('No notice').first()).toBeVisible();
  });
});
