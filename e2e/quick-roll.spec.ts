import { test, expect } from '@playwright/test';

test.describe('Quick Roll Mode Flow', () => {
  test('switches to Quick Roll, executes rolls within valid bounds, updates feed, and clears feed cleanly', async ({
    page,
  }) => {
    await page.goto('/');

    // Switch to Quick Roll mode
    const quickModeBtn = page
      .getByRole('group', { name: 'Application mode' })
      .getByRole('button', { name: /Quick Roll/i });
    await quickModeBtn.click();
    await expect(quickModeBtn).toHaveAttribute('aria-pressed', 'true');

    // Verify Quick Result Panel is visible in empty state initially
    const quickPanel = page.getByRole('region', { name: 'Quick Roll Feed' });
    await expect(quickPanel).toBeVisible();
    await expect(quickPanel.getByText('Ready to Roll', { exact: true })).toBeVisible();

    // Enable Fast mode for deterministic, non-flaky execution
    const fastModeBtn = page.getByRole('button', { name: /Fast: (ON|OFF)/ });
    if ((await fastModeBtn.getAttribute('aria-pressed')) !== 'true') {
      await fastModeBtn.click();
    }

    // Trigger first quick roll
    const toolbar = page.getByRole('toolbar', { name: 'Roll controls' });
    const rollBtn = toolbar.getByRole('button', {
      name: /Roll Round|Roll \d+d\d+|Flip|Series Complete/,
    });
    await expect(rollBtn).toContainText('Roll 1d6');
    await rollBtn.click();

    // Verify latest hero card displays valid numeric result (1..6 for d6)
    const heroCard = page.getByRole('region', { name: 'Latest Quick Roll Result' });
    await expect(heroCard).toBeVisible();

    const sumElement = heroCard.getByTestId('hero-sum');
    await expect(sumElement).toBeVisible();
    const sum = Number(await sumElement.textContent());
    expect(sum).toBeGreaterThanOrEqual(1);
    expect(sum).toBeLessThanOrEqual(6);

    // Verify session feed contains 1 entry
    const feedItems = page
      .getByRole('region', { name: 'Recent quick rolls feed' })
      .getByRole('listitem');
    await expect(feedItems).toHaveCount(1);

    // Trigger second quick roll
    await rollBtn.click();
    await expect(feedItems).toHaveCount(2);

    // Clear feed via toolbar clear button
    const clearFeedBtn = toolbar.getByRole('button', { name: 'Clear quick roll feed' });
    await expect(clearFeedBtn).toBeEnabled();
    await clearFeedBtn.click();

    // Verify feed is emptied and empty state returns
    await expect(quickPanel.getByText('Ready to Roll', { exact: true })).toBeVisible();
    await expect(feedItems).toHaveCount(0);
  });
});
