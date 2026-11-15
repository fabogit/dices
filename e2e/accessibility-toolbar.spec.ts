import { test, expect } from '@playwright/test';

test.describe('Accessibility & Arena Toolbar (Issue #9)', () => {
  test('verifies role="toolbar", keyboard focus traversal, and live region announcements', async ({ page }) => {
    await page.goto('/');

    // Verify presence and accessibility label of the roll controls toolbar
    const toolbar = page.getByRole('toolbar', { name: 'Roll controls' });
    await expect(toolbar).toBeVisible();

    const rollBtn = toolbar.getByRole('button', { name: /Roll Round|Roll \d+d\d+|Flip|Series Complete/ });
    await expect(rollBtn).toBeVisible();

    // Verify keyboard focus traversal to skip link and within the toolbar
    await page.keyboard.press('Tab');
    const skipLink = page.getByRole('link', { name: 'Skip to main content' });
    await expect(skipLink).toBeFocused();

    // Verify direct focus and Tab traversal across toolbar interactive elements
    await rollBtn.focus();
    await expect(rollBtn).toBeFocused();

    await page.keyboard.press('Tab');
    const autoRollBtn = toolbar.getByRole('button', { name: /Auto-Roll Series/i });
    await expect(autoRollBtn).toBeFocused();

    // Verify centralized ARIA live region updates
    const liveRegion = page.getByRole('status');
    await expect(liveRegion).toBeAttached();

    // Switch mode to Quick Roll to test announcement update
    const modeGroup = page.getByRole('group', { name: 'Application mode' });
    const quickModeBtn = modeGroup.getByRole('button', { name: /Quick Roll/i });
    await quickModeBtn.click();
    await expect(liveRegion).toHaveText('Switched to Quick Roll mode.');

    // Switch back to Series mode
    const seriesModeBtn = modeGroup.getByRole('button', { name: /Series/i });
    await seriesModeBtn.click();
    await expect(liveRegion).toHaveText('Switched to Series mode.');

    // Enable Fast mode and trigger a roll in Series mode to test round announcement
    const fastModeBtn = page.getByRole('button', { name: /Fast: (ON|OFF)/ });
    if (!(await fastModeBtn.getAttribute('aria-pressed') === 'true')) {
      await fastModeBtn.click();
    }

    await rollBtn.click();
    await expect(liveRegion).toContainText('Round 1 of');

    // Verify right-column WAI-ARIA tablist keyboard navigation
    const scoreboardTab = page.getByRole('tab', { name: /Scoreboard/i });
    const breakdownTab = page.getByRole('tab', { name: /Breakdown/i });
    const historyTab = page.getByRole('tab', { name: /History/i });

    await scoreboardTab.focus();
    await expect(scoreboardTab).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowRight');
    await expect(breakdownTab).toBeFocused();
    await expect(breakdownTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel', { name: /Breakdown/i })).toBeVisible();

    await page.keyboard.press('ArrowRight');
    await expect(historyTab).toBeFocused();
    await expect(historyTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel', { name: /History/i })).toBeVisible();

    await page.keyboard.press('Home');
    await expect(scoreboardTab).toBeFocused();
    await expect(scoreboardTab).toHaveAttribute('aria-selected', 'true');
  });
});
