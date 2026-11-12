import { test, expect } from '@playwright/test';

test.describe('Statistics Alignment & Descriptive Insights (Issue #12)', () => {
  test('displays coin percentages, statistical verdict, aligned d2 grid, and accessible distribution bars', async ({ page }) => {
    await page.goto('/');

    // Enable Fast mode for deterministic instant execution
    const fastModeBtn = page.locator('.instant-toggle-btn');
    if ((await fastModeBtn.getAttribute('aria-pressed')) !== 'true') {
      await fastModeBtn.click();
    }

    // Select Coin (d2) instrument and set quantity to 2
    await page.getByRole('radio', { name: /Coin \(d2\)/i }).click();
    await page.getByRole('button', { name: 'Increase quantity' }).click();

    // Verify Bo3 preset is selected (3 rounds * 2 coins = 6 coins total -> small sample)
    const toolbar = page.getByRole('toolbar', { name: 'Roll controls' });
    const rollBtn = toolbar.locator('.primary-btn');

    // Complete 3 rounds to populate both Live Analytics and History Leaderboard
    await rollBtn.click();
    await expect(page.locator('.series-badge')).toHaveText('Round 1 of 3');

    // Verify descriptive verdict and sample reliability chip
    await expect(page.locator('.insight-banner .insight-title')).toHaveText('Statistical Verdict');
    await expect(page.locator('.reliability-chip')).toContainText('Small sample');
    const verdictText = await page.locator('.insight-text').textContent();
    expect(verdictText?.trim().length).toBeGreaterThan(15);

    // Verify coin summary cards display percentages (%)
    await expect(page.locator('.heads-card .sub-stat-pct')).toContainText('%');
    await expect(page.locator('.tails-card .sub-stat-pct')).toContainText('%');

    // Verify d2 aligned analytics grid (Heads Share, Tails Share, Balance Deviation, Round Split)
    const coinGrid = page.locator('.coin-analytics-grid');
    await expect(coinGrid).toContainText('Heads Share');
    await expect(coinGrid).toContainText('Tails Share');
    await expect(coinGrid).toContainText('Balance Deviation (z)');
    await expect(coinGrid).toContainText('Round Split');

    // Verify accessible distribution chart bars have role="img" and descriptive aria-label
    const distBars = page.locator('.distribution-card .empirical-bar');
    await expect(distBars).toHaveCount(2);
    await expect(distBars.nth(0)).toHaveAttribute('role', 'img');
    await expect(distBars.nth(0)).toHaveAttribute('aria-label', /Face HEADS:.*expected 50\.0%/);

    // Complete remaining rounds
    await rollBtn.click();
    await rollBtn.click();
    await expect(page.locator('.series-badge')).toHaveText('Round 3 of 3');

    // Verify History & Leaderboard reflects Luck Index aria-label and Coin % breakdown
    const luckBadge = page.locator('.luck-badge').first();
    await expect(luckBadge).toHaveAttribute('role', 'img');
    await expect(luckBadge).toHaveAttribute('aria-label', /100% is fair baseline/);
    await expect(page.locator('.coin-history-pct').first()).toContainText('% Heads /');
  });

  test('renders Quick Roll expected comparisons, session summary, and preserves historical die badges', async ({ page }) => {
    await page.goto('/');

    const fastModeBtn = page.locator('.instant-toggle-btn');
    if ((await fastModeBtn.getAttribute('aria-pressed')) !== 'true') {
      await fastModeBtn.click();
    }

    // Switch to Quick Roll mode with 2d6
    await page.locator('.mode-switch-group').getByRole('button', { name: /Quick Roll/i }).click();
    await page.getByRole('button', { name: 'Increase quantity' }).click();

    const toolbar = page.getByRole('toolbar', { name: 'Roll controls' });
    const rollBtn = toolbar.locator('.primary-btn');

    // Execute 2 throws of 2d6
    await rollBtn.click();
    await rollBtn.click();

    // Verify descriptive hero stats and Session Summary strip appear
    const heroCard = page.locator('.latest-hero-card');
    await expect(heroCard).toContainText('Expected: 7.0');
    await expect(heroCard.locator('.quick-insight-narrative')).toBeVisible();

    const sessionStrip = page.locator('.session-summary-strip');
    await expect(sessionStrip).toBeVisible();
    await expect(sessionStrip).toContainText('Session Summary (d6)');
    await expect(sessionStrip).toContainText('2 throws • 4 dice');

    // Switch to Coin (d2) and roll once: verify previous d6 feed items retain their 'd6' die badge
    await page.getByRole('radio', { name: /Coin \(d2\)/i }).click();
    await rollBtn.click();

    const feedBadges = page.locator('.feed-item .feed-die-badge');
    await expect(feedBadges).toHaveCount(3);
    await expect(feedBadges.nth(0)).toHaveText('Coin');
    await expect(feedBadges.nth(1)).toHaveText('d6');
    await expect(feedBadges.nth(2)).toHaveText('d6');
  });
});
