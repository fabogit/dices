import { test, expect } from '@playwright/test';

test.describe('Series Mode & Custom 1..21 Slider Flow', () => {
  test('verifies presets (Single, Bo3, Bo5, no Bo7), adjusts 1..21 slider, tracks rounds, and resets cleanly', async ({ page }) => {
    await page.goto('/');

    // Verify preset buttons exist for Single (1), Bo3 (3), Bo5 (5)
    const presetGroup = page.getByRole('group', { name: 'Series length presets' });
    await expect(presetGroup).toBeVisible();

    const singleBtn = presetGroup.getByRole('button', { name: 'Single (1)' });
    const bo3Btn = presetGroup.getByRole('button', { name: 'Bo3 (3)' });
    const bo5Btn = presetGroup.getByRole('button', { name: 'Bo5 (5)' });

    await expect(singleBtn).toBeVisible();
    await expect(bo3Btn).toBeVisible();
    await expect(bo5Btn).toBeVisible();

    // Verify Bo7 does NOT exist in presets
    const bo7Btn = presetGroup.getByRole('button', { name: /Bo7/i });
    await expect(bo7Btn).toHaveCount(0);

    // Click Bo5 preset
    await bo5Btn.click();
    await expect(bo5Btn).toHaveClass(/active/);

    const scoreboardBadge = page.locator('.series-badge');
    await expect(scoreboardBadge).toHaveText('Round 0 of 5');

    // Adjust series length using the 1..21 range slider / numeric input to a custom length (e.g., 4)
    const seriesInput = page.locator('#series-length-input');
    await seriesInput.fill('4');
    await seriesInput.dispatchEvent('change');

    await expect(scoreboardBadge).toHaveText('Round 0 of 4');

    // Enable Fast mode for deterministic, instant execution
    const fastModeBtn = page.locator('.instant-toggle-btn');
    if (!(await fastModeBtn.getAttribute('aria-pressed') === 'true')) {
      await fastModeBtn.click();
    }

    // Trigger round 1 roll
    const toolbar = page.getByRole('toolbar', { name: 'Roll controls' });
    const rollRoundBtn = toolbar.locator('.primary-btn');
    await expect(rollRoundBtn).toContainText('Roll Round (1/4)');
    await rollRoundBtn.click();

    // Verify scoreboard reflects round 1 completion
    await expect(scoreboardBadge).toHaveText('Round 1 of 4');
    const progressBar = page.getByRole('progressbar');
    await expect(progressBar).toHaveAttribute('aria-valuenow', '1');
    await expect(progressBar).toHaveAttribute('aria-valuemax', '4');

    // Verify toolbar now prompts for round 2
    await expect(rollRoundBtn).toContainText('Roll Round (2/4)');

    // Trigger Reset action
    const resetBtn = toolbar.locator('.btn-reset-series');
    await resetBtn.click();

    // Verify rounds are reset back to 0
    await expect(scoreboardBadge).toHaveText('Round 0 of 4');
    await expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    await expect(rollRoundBtn).toContainText('Roll Round (1/4)');
  });
});
