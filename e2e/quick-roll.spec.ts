import { test, expect } from '@playwright/test';

test.describe('Quick Roll Mode Flow', () => {
  test('switches to Quick Roll, executes rolls within valid bounds, updates feed, and clears feed cleanly', async ({ page }) => {
    await page.goto('/');

    // Switch to Quick Roll mode
    const quickModeBtn = page.locator('.mode-switch-group').getByRole('button', { name: /Quick Roll/i });
    await quickModeBtn.click();
    await expect(quickModeBtn).toHaveClass(/active/);

    // Verify Quick Result Panel is visible in empty state initially
    const quickPanel = page.locator('.quick-result-panel');
    await expect(quickPanel).toBeVisible();
    await expect(page.locator('.empty-quick-state')).toBeVisible();

    // Enable Fast mode for deterministic, non-flaky execution
    const fastModeBtn = page.locator('.instant-toggle-btn');
    if (!(await fastModeBtn.getAttribute('aria-pressed') === 'true')) {
      await fastModeBtn.click();
    }

    // Trigger first quick roll
    const toolbar = page.getByRole('toolbar', { name: 'Roll controls' });
    const rollBtn = toolbar.locator('.primary-btn');
    await expect(rollBtn).toContainText('Roll 1d6');
    await rollBtn.click();

    // Verify latest hero card displays valid numeric result (1..6 for d6)
    const heroCard = page.locator('.latest-hero-card');
    await expect(heroCard).toBeVisible();

    const sumElement = heroCard.locator('.sum-big-number');
    await expect(sumElement).toBeVisible();
    const sum = Number(await sumElement.textContent());
    expect(sum).toBeGreaterThanOrEqual(1);
    expect(sum).toBeLessThanOrEqual(6);

    // Verify session feed contains 1 entry
    const feedItems = page.locator('.feed-item');
    await expect(feedItems).toHaveCount(1);

    // Trigger second quick roll
    await rollBtn.click();
    await expect(feedItems).toHaveCount(2);

    // Clear feed via toolbar clear button
    const clearFeedBtn = toolbar.locator('.btn-clear-quick');
    await expect(clearFeedBtn).toBeEnabled();
    await clearFeedBtn.click();

    // Verify feed is emptied and empty state returns
    await expect(page.locator('.empty-quick-state')).toBeVisible();
    await expect(page.locator('.feed-item')).toHaveCount(0);
  });
});
