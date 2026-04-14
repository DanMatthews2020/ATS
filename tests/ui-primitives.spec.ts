import { test, expect } from '@playwright/test';

test.describe('UI Primitives', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ui-test');
  });

  // ── Modal ──────────────────────────────────────────────────────────

  test.describe('Modal', () => {
    test('opens on trigger click', async ({ page }) => {
      await page.getByTestId('open-modal').click();
      await expect(page.getByTestId('modal-body')).toBeVisible();
      await expect(page.getByRole('dialog')).toBeVisible();
    });

    test('closes on Escape key', async ({ page }) => {
      await page.getByTestId('open-modal').click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).not.toBeVisible();
    });

    test('closes on backdrop click', async ({ page }) => {
      await page.getByTestId('open-modal').click();
      await expect(page.getByRole('dialog')).toBeVisible();
      // Click the backdrop (top-left corner of the viewport, outside the dialog)
      await page.mouse.click(10, 10);
      await expect(page.getByRole('dialog')).not.toBeVisible();
    });

    test('traps focus inside modal', async ({ page }) => {
      await page.getByTestId('open-modal').click();
      await expect(page.getByRole('dialog')).toBeVisible();
      // Tab through all focusable elements — focus should wrap
      // The modal has: close button (X), input, Cancel button, Confirm button
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      // After cycling through all elements, focus should wrap back to the first
      const activeTag = await page.evaluate(() => document.activeElement?.tagName);
      expect(activeTag).toBeTruthy();
      // Verify focus is still inside the dialog
      const insideDialog = await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]');
        return dialog?.contains(document.activeElement) ?? false;
      });
      expect(insideDialog).toBe(true);
    });
  });

  // ── Select ─────────────────────────────────────────────────────────

  test.describe('Select', () => {
    test('renders all options', async ({ page }) => {
      const select = page.getByLabel('Favourite colour');
      const options = select.locator('option');
      // placeholder + 4 options = 5 total
      await expect(options).toHaveCount(5);
    });

    test('onChange fires with correct value', async ({ page }) => {
      await page.getByLabel('Favourite colour').selectOption('green');
      await expect(page.getByTestId('select-value')).toHaveText('Selected: green');
    });

    test('error message renders', async ({ page }) => {
      await page.getByTestId('select-show-error').click();
      await expect(page.getByRole('alert')).toHaveText('Please choose a colour');
    });
  });

  // ── Checkbox ───────────────────────────────────────────────────────

  test.describe('Checkbox', () => {
    test('toggles on click', async ({ page }) => {
      const checkbox = page.getByLabel('I agree to the terms');
      await expect(page.getByTestId('checkbox-value')).toHaveText('Checked: false');
      await checkbox.check();
      await expect(page.getByTestId('checkbox-value')).toHaveText('Checked: true');
      await checkbox.uncheck();
      await expect(page.getByTestId('checkbox-value')).toHaveText('Checked: false');
    });

    test('label click also toggles', async ({ page }) => {
      await page.getByText('I agree to the terms').click();
      await expect(page.getByTestId('checkbox-value')).toHaveText('Checked: true');
    });

    test('error message renders', async ({ page }) => {
      await page.getByTestId('checkbox-show-error').click();
      await expect(page.getByRole('alert')).toHaveText('You must agree to continue');
    });
  });

  // ── Tooltip ────────────────────────────────────────────────────────

  test.describe('Tooltip', () => {
    test('content appears on hover', async ({ page }) => {
      const trigger = page.getByTestId('tooltip-trigger-hover');
      await trigger.hover();
      await expect(page.getByRole('tooltip', { name: 'Tooltip on top' })).toBeVisible();
    });

    test('content appears on focus', async ({ page }) => {
      const trigger = page.getByTestId('tooltip-trigger-focus');
      await trigger.focus();
      await expect(page.getByRole('tooltip', { name: 'Tooltip on focus' })).toBeVisible();
    });
  });
});
