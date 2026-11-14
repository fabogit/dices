import { test, expect } from '@playwright/test';

test.describe('Statistics Alignment & Descriptive Insights (Issue #12 & #13)', () => {
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

    // Complete round 1 on default Scoreboard tab
    await rollBtn.click();
    await expect(page.locator('.series-badge')).toHaveText('Round 1 of 3');

    // Verify coin summary cards display percentages (%)
    await expect(page.locator('.heads-card .sub-stat-pct')).toContainText('%');
    await expect(page.locator('.tails-card .sub-stat-pct')).toContainText('%');

    // Switch to Breakdown tab to inspect statistical verdict & distribution
    await page.getByRole('tab', { name: /Breakdown/i }).click();

    // Verify descriptive verdict and sample reliability chip
    await expect(page.locator('.insight-banner .insight-title')).toHaveText('Statistical Verdict');
    await expect(page.locator('.reliability-chip')).toContainText('Small sample');
    const verdictText = await page.locator('.insight-text').textContent();
    expect(verdictText?.trim().length).toBeGreaterThan(15);

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

    // Complete remaining rounds and verify Scoreboard tab badge updates
    await rollBtn.click();
    await rollBtn.click();
    await page.getByRole('tab', { name: /Scoreboard/i }).click();
    await expect(page.locator('.series-badge')).toHaveText('Round 3 of 3');

    // Switch to History tab and verify Luck Index aria-label & Coin % breakdown
    await page.getByRole('tab', { name: /History/i }).click();
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

  test('computes deterministic polyhedral 2d6 statistics across multiple rounds and resets cleanly', async ({ page }) => {
    // Override crypto.getRandomValues with exact sequence: [1, 3, 5, 5]
    // rollCryptoFair computes (rand % faces) + 1:
    // Round 1 (2d6): rand 1 -> face 2, rand 3 -> face 4 => values [2, 4], sum 6
    // Round 2 (2d6): rand 5 -> face 6, rand 5 -> face 6 => values [6, 6], sum 12
    await page.addInitScript(() => {
      const mockValues = [1, 3, 5, 5];
      let callCount = 0;
      const originalGetRandomValues = window.crypto.getRandomValues.bind(window.crypto);
      window.crypto.getRandomValues = function <T extends ArrayBufferView | null>(array: T): T {
        if (array instanceof Uint32Array) {
          for (let i = 0; i < array.length; i++) {
            array[i] = mockValues[callCount % mockValues.length]!;
            callCount++;
          }
          return array;
        }
        return originalGetRandomValues(array);
      };
    });

    await page.goto('/');

    const fastModeBtn = page.locator('.instant-toggle-btn');
    if ((await fastModeBtn.getAttribute('aria-pressed')) !== 'true') {
      await fastModeBtn.click();
    }

    // Configure 2d6
    await page.getByRole('radio', { name: 'd6' }).click();
    await page.getByRole('button', { name: 'Increase quantity' }).click();

    const toolbar = page.getByRole('toolbar', { name: 'Roll controls' });
    const rollBtn = toolbar.locator('.primary-btn');

    // Execute Round 1 (values [2, 4], sum 6) and open Breakdown tab
    await rollBtn.click();
    await page.getByRole('tab', { name: /Breakdown/i }).click();

    const diceCountTag = page.locator('.dice-count-tag');
    await expect(diceCountTag).toHaveText('2 dice rolled');

    // Expected Avg (E[X]) = 7.0, -1.0 Δ
    const analyticsGrid = page.locator('.analytics-metrics-grid');
    await expect(analyticsGrid).toContainText('7.0');
    await expect(analyticsGrid).toContainText('-1.0 Δ');

    // Std Deviation (σ) = 0.00
    await expect(analyticsGrid).toContainText('0.00');

    // Crit Max (= 6) = 0.0% (0/2)
    await expect(analyticsGrid).toContainText('Crit Max (= 6)');
    await expect(analyticsGrid).toContainText('0.0%');
    await expect(analyticsGrid).toContainText('(0/2)');

    // Crit Min (= 1) = 0.0% (0/2)
    await expect(analyticsGrid).toContainText('Crit Min (= 1)');

    // Reliability badge: Small sample (<10)
    await expect(page.locator('.reliability-chip')).toContainText('Small sample (<10)');

    // Execute Round 2 (values [6, 6], sum 12)
    await rollBtn.click();

    await expect(diceCountTag).toHaveText('4 dice rolled');

    // Expected Avg (E[X]) = 7.0, +2.0 Δ (round average is (6 + 12) / 2 = 9.0 -> delta +2.0)
    await expect(analyticsGrid).toContainText('+2.0 Δ');

    // Population Std Deviation (σ) = 3.00
    await expect(analyticsGrid).toContainText('3.00');

    // Crit Max (= 6) = 50.0% (2/4)
    await expect(analyticsGrid).toContainText('50.0%');
    await expect(analyticsGrid).toContainText('(2/4)');

    // Crit Min (= 1) = 0.0% (0/4)
    await expect(analyticsGrid).toContainText('(0/4)');

    // Face 6 marked as hot face
    const hotFaceLabel = page.locator('.hot-face-label');
    await expect(hotFaceLabel).toContainText('6');
    await expect(hotFaceLabel.locator('.hot-badge')).toHaveText('🔥');

    // Distribution bar percentages sum to 100%
    const distRows = page.locator('.bars-container .dist-row');
    await expect(distRows).toHaveCount(6);
    let totalPct = 0;
    for (let i = 0; i < 6; i++) {
      const pctText = await distRows.nth(i).locator('.pct-text').textContent();
      totalPct += parseFloat(pctText?.replace('%', '') ?? '0');
    }
    expect(Math.round(totalPct)).toBe(100);

    // Face 6 empirical bar scales to 100% width
    const face6Bar = distRows.nth(5).locator('.empirical-bar');
    await expect(face6Bar).toHaveAttribute('style', /width:\s*100%/);

    // Trigger Reset via toolbar
    const resetBtn = toolbar.locator('.btn-reset-series');
    await resetBtn.click();

    // Verify clean reset
    await expect(diceCountTag).toHaveText('0 dice rolled');
    await expect(page.locator('.reliability-chip')).toHaveText('No Rolls');
    await expect(analyticsGrid).toContainText('0.0%');
    for (let i = 0; i < 6; i++) {
      await expect(distRows.nth(i).locator('.count-text')).toHaveText('0');
    }
  });

  test('handles sample reliability transitions, dynamic d20 switching, and collapse toggling', async ({ page }) => {
    await page.goto('/');

    const fastModeBtn = page.locator('.instant-toggle-btn');
    if ((await fastModeBtn.getAttribute('aria-pressed')) !== 'true') {
      await fastModeBtn.click();
    }

    // Set count to 5 on d6 (Bo3 preset)
    await page.getByRole('radio', { name: 'd6' }).click();
    for (let i = 1; i < 5; i++) {
      await page.getByRole('button', { name: 'Increase quantity' }).click();
    }

    const toolbar = page.getByRole('toolbar', { name: 'Roll controls' });
    const rollBtn = toolbar.locator('.primary-btn');

    // Open Breakdown tab to monitor live transitions
    await page.getByRole('tab', { name: /Breakdown/i }).click();

    // Round 1 (5 dice rolled -> Small sample (<10))
    await rollBtn.click();
    const reliabilityChip = page.locator('.reliability-chip');
    await expect(reliabilityChip).toContainText('Small sample (<10)');

    // Round 2 (10 dice rolled -> Moderate sample (10–29))
    await rollBtn.click();
    await expect(reliabilityChip).toContainText('Moderate sample (10–29)');

    // Dynamic instrument switching: switch to d20
    await page.getByRole('radio', { name: 'd20' }).click();
    await expect(page.locator('.analytics-section .section-subtitle')).toHaveText('Statistical Breakdown (d20)');

    // Distribution renders 20 rows
    const distRows = page.locator('.bars-container .dist-row');
    await expect(distRows).toHaveCount(20);

    // Expected legend updates to 5.0%
    await expect(page.locator('.expected-legend')).toContainText('Expected: 5.0%');

    // Crit labels update to d20
    const analyticsGrid = page.locator('.analytics-metrics-grid');
    await expect(analyticsGrid).toContainText('Crit Max (= 20)');
    await expect(analyticsGrid).toContainText('Crit Min (= 1)');

    // Test collapse/expand toggle for Statistical Breakdown & Distribution
    const collapseToggleBtn = page.locator('.analytics-section .collapse-toggle-btn');
    await expect(collapseToggleBtn).toHaveAttribute('aria-expanded', 'true');
    const analyticsBody = page.locator('.analytics-body');
    await expect(analyticsBody).not.toHaveClass(/collapsed/);

    // Collapse
    await collapseToggleBtn.click();
    await expect(collapseToggleBtn).toHaveAttribute('aria-expanded', 'false');
    await expect(analyticsBody).toHaveClass(/collapsed/);

    // Expand
    await collapseToggleBtn.click();
    await expect(collapseToggleBtn).toHaveAttribute('aria-expanded', 'true');
    await expect(analyticsBody).not.toHaveClass(/collapsed/);
  });
});
