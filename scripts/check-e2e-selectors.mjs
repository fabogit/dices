#!/usr/bin/env node

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = fileURLToPath(new URL('..', import.meta.url));
const E2E_DIR = join(ROOT_DIR, 'e2e');

/**
 * Matches the start of a `.locator(` call. The first argument is then parsed by
 * `findForbiddenSelectors`, so string literals, template literals (including `${...}`
 * placeholders), multi-line calls and simple identifiers are all covered.
 */
const LOCATOR_CALL_PATTERN = /\.locator\(\s*/g;

/**
 * Whether a selector contains a CSS class (`.foo`) or id (`#bar`) outside bracketed
 * `[attr=...]` clauses. `${...}` placeholders are stripped first so interpolated values
 * (which may legitimately contain dots) are not mistaken for class selectors.
 * @param {string} selector
 * @returns {boolean}
 */
function hasClassOrId(selector) {
  const withoutPlaceholders = selector.replace(/\$\{[^}]*\}/g, '');
  const withoutAttrs = withoutPlaceholders.replace(/\[[^\]]*\]/g, '');
  return /[.#]/.test(withoutAttrs);
}

/**
 * Collects `const|let|var name = '<literal>'` assignments (string or template literal) so
 * `page.locator(name)` can be resolved when the variable is a simple constant.
 * @param {string} source
 * @returns {Map<string, string>}
 */
function collectStringVariables(source) {
  const vars = new Map();
  const pattern =
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::\s*string\s*)?=\s*(['"`])((?:\\.|(?!\2)[^\\])*)\2\s*[;,\n]/g;
  let match;
  while ((match = pattern.exec(source)) !== null) {
    vars.set(match[1], match[3]);
  }
  return vars;
}

/**
 * Finds all forbidden `.locator(...)` calls in a source string.
 * Handles string literals, template literals and identifiers bound to a literal in the
 * same file; anything more dynamic (function calls, concatenation) is out of scope.
 * @param {string} source
 * @returns {Array<{ line: number, selector: string }>}
 */
export function findForbiddenSelectors(source) {
  const matches = [];
  const variables = collectStringVariables(source);
  const callPattern = new RegExp(LOCATOR_CALL_PATTERN.source, 'g');
  let call;

  while ((call = callPattern.exec(source)) !== null) {
    const rest = source.slice(call.index + call[0].length);
    let selector = null;

    const literal = /^(['"`])((?:\\.|(?!\1)[^\\])*)\1/.exec(rest);
    if (literal) {
      selector = literal[2];
    } else {
      const ident = /^([A-Za-z_$][\w$]*)\s*[,)]/.exec(rest);
      if (ident && variables.has(ident[1])) {
        selector = variables.get(ident[1]);
      }
    }

    if (selector !== null && hasClassOrId(selector)) {
      const line = source.slice(0, call.index).split(/\r?\n/).length;
      matches.push({ line, selector });
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

  return files.toSorted((a, b) => (a < b ? -1 : a > b ? 1 : 0));
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
      name: 'rejects tag-qualified class and id selectors',
      source: `const c = page.locator('canvas.three-canvas');\nconst i = page.locator('input#new-player');`,
      expectedCount: 2,
    },
    {
      name: 'rejects template literals with placeholders and multi-line calls',
      source: `page.locator(\`.row-\${i}\`);\npage\n  .locator(\n    '#multi',\n  );`,
      expectedCount: 2,
    },
    {
      name: 'rejects simple variables bound to a class/id literal',
      source: `const sel = '.hero';\nconst id = \`#main\`;\npage.locator(sel);\npage.locator(id, { hasText: 'x' });`,
      expectedCount: 2,
    },
    {
      name: 'allows variables and placeholders that are not class/id selectors',
      source: `const sel = 'canvas';\npage.locator(sel);\npage.locator(\`[data-id="\${x}"]\`);\npage.locator(unknownVar);\npage.locator(\`\${tag}\`);`,
      expectedCount: 0,
    },
    {
      name: 'allows attribute, tag, and semantic locators',
      source: [
        `const favicon = page.locator('link[rel="icon"]');`,
        `const testId = page.locator('[data-testid="roll-btn"]');`,
        `const dottedAttr = page.locator('[data-testid="a.b"]');`,
        `const canvas = page.locator('canvas');`,
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

/** Zero tolerance: any forbidden class/id `.locator(...)` call in any spec fails the guard. */
function runGuard() {
  const specFiles = collectSpecFiles(E2E_DIR);
  let totalViolations = 0;

  for (const filePath of specFiles) {
    const relPath = relative(E2E_DIR, filePath).replace(/\\/g, '/');
    const violations = findForbiddenSelectors(readFileSync(filePath, 'utf8'));
    totalViolations += violations.length;

    if (violations.length > 0) {
      console.error(
        `FAIL: e2e/${relPath} has ${violations.length} forbidden class/id .locator(...) call(s); none are allowed.`,
      );
      for (const v of violations) {
        console.error(`  - line ${v.line}: .locator('${v.selector}')`);
      }
    }
  }

  if (totalViolations > 0) {
    console.error(
      `E2E selector guard failed (${totalViolations} forbidden class/id selector(s) across ${specFiles.length} spec file(s)).`,
    );
    process.exitCode = 1;
    return;
  }

  console.log(`E2E selector guard passed (${specFiles.length} spec file(s), 0 violations).`);
}

if (process.argv.slice(2).includes('--self-test')) {
  runSelfTest();
} else {
  runGuard();
}
