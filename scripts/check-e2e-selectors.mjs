#!/usr/bin/env node

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = fileURLToPath(new URL('..', import.meta.url));
const E2E_DIR = join(ROOT_DIR, 'e2e');

/**
 * Decreasing per-file baseline ratchet for forbidden CSS class/id `.locator(...)`
 * selectors in E2E specs. Any new `.spec.ts` file defaults to 0.
 * Reduce counts here as specs are migrated to semantic/ARIA locators.
 */
const BASELINE_MAX_COUNTS = Object.freeze({
  'stats-analytics.spec.ts': 42,
  'players-history.spec.ts': 28,
  'arena-workflows.spec.ts': 22,
  'quick-roll.spec.ts': 11,
  'accessibility-toolbar.spec.ts': 6,
  'mobile-viewport.spec.ts': 6,
  'series-mode.spec.ts': 5,
  'production-boot.spec.ts': 1,
});

/**
 * Matches `.locator('...')`, `.locator("...")`, or `.locator(\`...\`)`
 * where the selector begins with `.` (class) or `#` (id).
 * Attribute selectors like `link[rel="icon"]` or `[data-testid="..."]`
 * and tag selectors are intentionally allowed.
 */
const FORBIDDEN_SELECTOR_PATTERN = /\.locator\(\s*(['"`])\s*([.#][^'"`\r\n]*)/g;

/**
 * Finds all forbidden `.locator(...)` calls in a source string.
 * @param {string} source
 * @returns {Array<{ line: number, selector: string }>}
 */
export function findForbiddenSelectors(source) {
  const matches = [];
  const lines = source.split(/\r?\n/);

  for (let idx = 0; idx < lines.length; idx++) {
    const lineText = lines[idx];
    FORBIDDEN_SELECTOR_PATTERN.lastIndex = 0;
    let match;
    while ((match = FORBIDDEN_SELECTOR_PATTERN.exec(lineText)) !== null) {
      matches.push({
        line: idx + 1,
        selector: match[2],
      });
    }
  }

  return matches;
}

/**
 * Recursively collects all `.spec.ts` files under `dir`.
 * @param {string} dir
 * @returns {string[]}
 */
function collectSpecFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSpecFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.spec.ts')) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

function runSelfTest() {
  const cases = [
    {
      name: 'rejects single-quoted class selector',
      source: `const btn = page.locator('.foo');`,
      expectedCount: 1,
    },
    {
      name: 'rejects double-quoted id selector',
      source: `const input = page.locator("#bar");`,
      expectedCount: 1,
    },
    {
      name: 'rejects template-literal class/id selectors with leading whitespace',
      source: `await expect(page.locator(\` .baz\`)).toBeVisible();\nawait page.locator(\`#qux\`).click();`,
      expectedCount: 2,
    },
    {
      name: 'rejects multi-argument locator with class selector',
      source: `const btn = page.locator('.collapse-toggle-btn', { hasText: 'Setup' });`,
      expectedCount: 1,
    },
    {
      name: 'allows attribute, tag, and semantic locators',
      source: [
        `const favicon = page.locator('link[rel="icon"]');`,
        `const testId = page.locator('[data-testid="roll-btn"]');`,
        `const live = page.locator('[aria-live="polite"]');`,
        `const canvas = page.locator('canvas.three-canvas');`,
        `const roleBtn = page.getByRole('button', { name: 'Roll' });`,
      ].join('\n'),
      expectedCount: 0,
    },
  ];

  let passed = 0;
  for (const testCase of cases) {
    const found = findForbiddenSelectors(testCase.source);
    if (found.length !== testCase.expectedCount) {
      console.error(
        `FAIL [self-test]: ${testCase.name} — expected ${testCase.expectedCount} match(es), got ${found.length}: ${JSON.stringify(found)}`,
      );
      process.exitCode = 1;
      return;
    }
    passed++;
  }

  console.log(`PASS [self-test]: ${passed}/${cases.length} selector guard checks passed.`);
}

function runGuard({ strict }) {
  const specFiles = collectSpecFiles(E2E_DIR);
  let totalViolations = 0;
  let hasFailure = false;
  const tightenable = [];

  for (const filePath of specFiles) {
    const relPath = relative(E2E_DIR, filePath).replace(/\\/g, '/');
    const source = readFileSync(filePath, 'utf8');
    const violations = findForbiddenSelectors(source);
    const count = violations.length;
    totalViolations += count;

    const maxAllowed = strict ? 0 : (BASELINE_MAX_COUNTS[relPath] ?? 0);

    if (count > maxAllowed) {
      hasFailure = true;
      console.error(
        `FAIL: e2e/${relPath} has ${count} forbidden class/id .locator(...) call(s) (max allowed: ${maxAllowed}).`,
      );
      for (const v of violations) {
        console.error(`  - line ${v.line}: .locator('${v.selector}')`);
      }
    } else if (!strict && count < maxAllowed) {
      tightenable.push({ relPath, count, maxAllowed });
    }
  }

  if (tightenable.length > 0) {
    console.log('INFO: Ratchet baselines can be tightened for:');
    for (const item of tightenable) {
      console.log(`  - e2e/${item.relPath}: ${item.count} (baseline: ${item.maxAllowed})`);
    }
  }

  if (hasFailure) {
    console.error(
      `E2E selector guard failed (${totalViolations} total forbidden class/id selector(s) across ${specFiles.length} spec file(s)).`,
    );
    process.exitCode = 1;
    return;
  }

  const modeLabel = strict ? 'strict' : 'ratchet';
  console.log(
    `E2E selector guard passed (${modeLabel} mode, ${totalViolations} baseline violation(s) across ${specFiles.length} spec file(s)).`,
  );
}

const args = process.argv.slice(2);
if (args.includes('--self-test')) {
  runSelfTest();
} else {
  runGuard({ strict: args.includes('--strict') });
}
