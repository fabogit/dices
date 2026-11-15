import { test, expect, type Page } from '@playwright/test';
import {
  defaultCanvasMask,
  installDeterministicRng,
  installFixedClock,
} from './helpers/determinism';

const VISUAL_RNG_SEQUENCE = [0, 2, 5, 1, 4, 3, 2, 0] as const;

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 375, height: 720 },
] as const;

test.use({
  locale: 'en-US',
  timezoneId: 'UTC',
});

async function prepareDeterministicPage(page: Page, width: number, height: number): Promise<void> {
  await page.setViewportSize({ width, height });
  await installDeterministicRng(page, VISUAL_RNG_SEQUENCE);
  await installFixedClock(page);
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);

  const fastModeBtn = page.getByRole('button', { name: /Fast: (ON|OFF)/ });
  if ((await fastModeBtn.getAttribute('aria-pressed')) !== 'true') {
    await fastModeBtn.click();
  }
  await expect(fastModeBtn).toHaveAttribute('aria-pressed', 'true');
}

test.describe('Visual Regression Baselines (Phase 0.7)', () => {
  for (const vp of VIEWPORTS) {
    test(`captures deterministic baselines on ${vp.name} (${vp.width}x${vp.height})`, async ({
      page,
    }) => {
      await prepareDeterministicPage(page, vp.width, vp.height);

      const toolbar = page.getByRole('toolbar', { name: 'Roll controls' });
      const rollBtn = toolbar.getByRole('button', {
        name: /Roll Round|Roll \d+d\d+|Flip|Series Complete/,
      });

      // Configure 2d6 Bo3 series and complete all 3 rounds so Scoreboard, Breakdown,
      // and History panels all render populated deterministic states.
      await page.getByRole('radio', { name: 'd6' }).click();
      await page.getByRole('button', { name: 'Increase quantity' }).click();
      await page.getByRole('button', { name: 'Bo3 (3)' }).click();

      await rollBtn.click();
      await rollBtn.click();
      await rollBtn.click();
      await expect(rollBtn).toHaveText(/Series Complete \(3\/3\)/i);

      // 1. Header
      const header = page.getByRole('banner');
      await expect(header).toHaveScreenshot(`${vp.name}-header.png`);

      // 2. Control panel
      const controlPanel = page.getByRole('region', { name: 'Dice & Series Setup' });
      await expect(controlPanel).toHaveScreenshot(`${vp.name}-control-panel.png`);

      // 3. Arena viewport + toolbar (with 3D WebGL canvas masked)
      const arenaSection = page.getByRole('region', { name: '3D Dice Arena', exact: true });
      await expect(arenaSection).toHaveScreenshot(`${vp.name}-arena.png`, {
        mask: defaultCanvasMask(page),
      });

      // 4. Scoreboard tab panel
      const scoreboardPanel = page.getByRole('tabpanel', { name: /Scoreboard/i });
      await expect(scoreboardPanel).toBeVisible();
      await expect(scoreboardPanel).toHaveScreenshot(`${vp.name}-scoreboard-tab.png`);

      // 5. Breakdown tab panel
      await page.getByRole('tab', { name: /Breakdown/i }).click();
      const breakdownPanel = page.getByRole('tabpanel', { name: /Breakdown/i });
      await expect(breakdownPanel).toBeVisible();
      await expect(breakdownPanel).toHaveScreenshot(`${vp.name}-breakdown-tab.png`);

      // 6. History tab panel
      await page.getByRole('tab', { name: /History/i }).click();
      const historyPanel = page.getByRole('tabpanel', { name: /History/i });
      await expect(historyPanel).toBeVisible();
      await expect(historyPanel).toHaveScreenshot(`${vp.name}-history-tab.png`);

      // 7. Quick Roll feed panel (switch to Quick Roll and trigger 2 deterministic throws)
      await page
        .getByRole('group', { name: 'Application mode' })
        .getByRole('button', { name: /Quick Roll/i })
        .click();

      await rollBtn.click();
      await rollBtn.click();

      const quickPanel = page.getByRole('region', { name: 'Quick Roll Feed' });
      await expect(quickPanel).toBeVisible();
      await expect(quickPanel).toHaveScreenshot(`${vp.name}-quick-feed.png`);
    });
  }
});
