import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Page } from '@playwright/test';

/**
 * Automated axe-core scan of the main screens. Any exclusion below must be narrow
 * (one rule or one selector), commented, and tied to an owning ticket; never disable a
 * rule globally.
 */
/**
 * Known violations, each scoped to one rule on one node, tied to an owning ticket.
 * Remove an entry when the app is fixed. Currently none.
 */
const KNOWN_VIOLATIONS: ReadonlyArray<{ rule: string; target: string }> = [];

async function scan(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return results.violations
    .map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes
        .map((n) => n.target.join(' '))
        .filter((t) => !KNOWN_VIOLATIONS.some((k) => k.rule === v.id && t === k.target)),
    }))
    .filter((v) => v.nodes.length > 0);
}

test.describe('Accessibility (axe-core)', () => {
  test('series mode has no violations', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('group', { name: 'Series length presets' })).toBeVisible();
    expect(await scan(page)).toEqual([]);
  });

  test('quick mode has no violations', async ({ page }) => {
    await page.goto('/');
    await page
      .getByRole('group', { name: 'Application mode' })
      .getByRole('button', { name: /Quick Roll/i })
      .click();
    await expect(page.getByRole('region', { name: 'Quick Roll Feed' })).toBeVisible();
    expect(await scan(page)).toEqual([]);
  });

  test('history tab has no violations', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: /History/i }).click();
    await expect(page.getByRole('tab', { name: /History/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(await scan(page)).toEqual([]);
  });

  test('add-player dialog has no violations', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Add new local player' }).click();
    await expect(page.getByRole('dialog', { name: 'Add Local Player' })).toBeVisible();
    expect(await scan(page)).toEqual([]);
  });

  test('clear-history confirm dialog has no violations', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Single (1)' }).click();
    const rollBtn = page.getByRole('toolbar', { name: 'Roll controls' }).getByRole('button', {
      name: /Roll Round|Roll \d+d\d+|Flip|Series Complete/,
    });
    await rollBtn.click();
    await expect(rollBtn).toHaveText(/Series Complete/i);

    await page.getByRole('tab', { name: /History/i }).click();
    await page.getByRole('button', { name: 'Clear all completed series history' }).click();
    await expect(page.getByRole('dialog', { name: 'Clear history?' })).toBeVisible();
    expect(await scan(page)).toEqual([]);
  });
});
