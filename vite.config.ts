import { svelte } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig } from 'vite-plus';
import pkg from './package.json' with { type: 'json' };

// Containers are the only UI components that read the store (getRollState); every other UI
// folder is presentational. Living in one folder lets lint match them with a glob instead of a list.
const CONTAINERS = 'src/ui/containers/**';

// Basename glob: matches both the store module (rollState.svelte) and its context accessor
// (rollStateContext: getRollState/setRollState), so presentational folders cannot reach the store.
const ROLL_STATE_IMPORTS = '*rollState*';

// Svelte compiles every text or attribute interpolation `{x}` to `x ?? ''`, and v8 counts the
// never-taken `''` side as an uncovered branch. In these interpolation-heavy components that
// noise keeps branch coverage under the 80% default even though every real branch is covered,
// so each gets its own floor at today's value (rounded down): it may go up, never silently down.
// Lower a floor deliberately if a change really needs it.
const SVELTE_BRANCH_FLOORS: Record<string, number> = {
  'src/ui/series/CoinSummaryCards.svelte': 58,
  'src/ui/history/HistoryList.svelte': 65,
  'src/ui/quick/SessionSummaryStrip.svelte': 66,
  'src/ui/quick/LatestRollHero.svelte': 73,
  'src/ui/series/DistributionChart.svelte': 75,
  'src/ui/history/Leaderboard.svelte': 80,
  'src/ui/series/RoundsTable.svelte': 81,
  'src/ui/primitives/Tabs.svelte': 84,
  'src/ui/containers/ControlPanel.svelte': 72,
  'src/ui/containers/SeriesScoreboard.svelte': 62,
};

// Vitest checks every threshold glob independently and a file matching two globs must pass
// both, so the default glob has to exclude the files above rather than be overridden by them.
const SVELTE_FLOOR_NAMES = Object.keys(SVELTE_BRANCH_FLOORS).map((file) =>
  file.replace(/^.*\/([^/]+)\.svelte$/, '$1'),
);
const SVELTE_DEFAULT_GLOB = `src/ui/**/!(${SVELTE_FLOOR_NAMES.join('|')}).svelte`;
const SVELTE_FLOOR_THRESHOLDS = Object.fromEntries(
  Object.entries(SVELTE_BRANCH_FLOORS).map(([file, branches]) => [
    file,
    { perFile: true, statements: 90, branches, functions: 90, lines: 90 },
  ]),
);

const NO_ROLL_STATE_MESSAGE =
  'Presentational components must not import rollState or getRollState; pass typed props and callbacks from a container in src/ui/containers/.';

export default defineConfig(({ mode }) => ({
  plugins: [svelte(), ...(mode === 'test' ? [svelteTesting()] : [])],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_AUTHOR__: JSON.stringify(pkg.author),
    __BUILD_YEAR__: JSON.stringify(new Date().getFullYear().toString()),
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
  },
  build: {
    // The lazily loaded WebGL `three` chunk is ~534 kB minified (loaded only when the arena
    // opens); raise the warning threshold just above it so new oversized chunks still warn.
    chunkSizeWarningLimit: 550,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'three',
              test: /node_modules[/\\]three[/\\]/,
              priority: 20,
            },
          ],
        },
      },
    },
  },
  fmt: {
    printWidth: 100,
    tabWidth: 2,
    useTabs: false,
    semi: true,
    singleQuote: true,
    trailingComma: 'all',
    svelte: true,
    ignorePatterns: [
      'dist/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      '.svelte-check/**',
      '.claude/**',
      'e2e/**/*.png',
      'pnpm-lock.yaml',
      // Generated and rewritten by release-please on every release PR
      'CHANGELOG.md',
      '.release-please-manifest.json',
    ],
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
      denyWarnings: true,
    },
    plugins: ['typescript', 'unicorn', 'oxc'],
    env: {
      browser: true,
      es2022: true,
      node: true,
    },
    ignorePatterns: [
      'dist/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      '.svelte-check/**',
      '.claude/**',
    ],
    categories: {
      correctness: 'error',
      suspicious: 'warn',
      perf: 'warn',
      pedantic: 'warn',
    },
    rules: {
      'eslint/no-underscore-dangle': 'off',
      // `perf` and `pedantic` are enabled above. The rules below stay off by decision (#91):
      // declined ones state why, the deferred one still needs `.svelte` fixes.
      // Declined: a flag-everything regex rule; the patterns here are ASCII-only, `u` adds no safety.
      'eslint/require-unicode-regexp': 'off',
      // Declined: demands `readonly` on every parameter (and fails on DOM/Three.js types), which fights idiomatic TS.
      'typescript/prefer-readonly-parameter-types': 'off',
      // Declined: arbitrary length cap that fires on every `describe` block and Svelte factory; no signal.
      'eslint/max-lines-per-function': 'off',
      // Declined: trailing annotations on data tables and test expectations are deliberate, and oxfmt keeps them stable.
      'eslint/no-inline-comments': 'off',
      // Declined: forbids concise `() => expect(...)` / `() => fn()` arrows that are the standard test style.
      'typescript/no-confusing-void-expression': 'off',
      // Declined: awaits in loops are sequential on purpose (ordered rolls, e2e steps, UI interactions).
      'eslint/no-await-in-loop': 'off',
      // Declined: arbitrary file-length cap; big test files and geometry tables are cohesive, splitting adds churn.
      'eslint/max-lines': 'off',
      // Declined: declaration order in geometries follows meaning (grouped vectors), not the alphabet.
      'eslint/sort-vars': 'off',
      // Declined: `async` without `await` is deliberate to satisfy Promise-returning interfaces (IRollProvider)
      // and to turn synchronous throws into rejections.
      'eslint/require-await': 'off',
      'typescript/require-await': 'off',
      'typescript/require-array-sort-compare': 'error',
    },
    overrides: [
      {
        files: ['src/**/*.{test,spec}.{js,ts}'],
        plugins: ['vitest'],
        rules: {
          'typescript/no-unsafe-type-assertion': 'off',
          // Declined: guards that narrow nullable values or branch on fixture shape are cheaper and safer
          // than non-null assertions; splitting them into separate tests duplicates setup.
          'vitest/no-conditional-in-test': 'off',
        },
      },
      {
        // Default deny: every UI folder is presentational unless an override below says otherwise
        files: ['src/ui/**'],
        rules: {
          'no-restricted-imports': [
            'error',
            {
              patterns: [
                {
                  group: [ROLL_STATE_IMPORTS],
                  message: NO_ROLL_STATE_MESSAGE,
                },
              ],
            },
          ],
        },
      },
      {
        files: ['src/ui/primitives/**'],
        rules: {
          'no-restricted-imports': [
            'error',
            {
              patterns: [
                {
                  group: [ROLL_STATE_IMPORTS, '**/lib/*', '../lib/*', '../../lib/*'],
                  message:
                    'Presentational primitives must not import rollState, getRollState or lib helpers; pass typed props and callbacks instead.',
                },
              ],
            },
          ],
        },
      },
      {
        files: ['src/ui/arena/**'],
        rules: {
          'no-restricted-imports': [
            'error',
            {
              patterns: [
                {
                  group: [ROLL_STATE_IMPORTS],
                  message: NO_ROLL_STATE_MESSAGE,
                },
                {
                  group: ['**/three/**'],
                  message:
                    'Arena HUD/toolbar must stay WebGL-free; only ArenaViewport may load DiceArena3D.',
                },
              ],
            },
          ],
        },
      },
      {
        // The store itself, the test harness that provides it, and the containers (with their tests)
        files: ['src/ui/state/**', 'src/ui/__tests__/**', CONTAINERS],
        rules: {
          'no-restricted-imports': 'off',
        },
      },
    ],
  },
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.{test,spec}.{js,ts}'],
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'src/core/**/*.ts',
        'src/lib/**/*.ts',
        'src/three/geometries.ts',
        'src/three/DiceArena3D.ts',
        'src/ui/state/rollState.svelte.ts',
        'src/ui/state/announcements.ts',
        'src/ui/primitives/**/*.svelte',
        'src/ui/{containers,layout,header,controls,arena,history,quick,series}/*.svelte',
      ],
      thresholds: {
        // `perFile` is set on each glob below (not at the top level): a top-level `perFile` would
        // also hold glob-matched files to the global numbers. Every included file must match a
        // glob so none falls back to the aggregate check (#74).
        statements: 90,
        branches: 80,
        functions: 90,
        lines: 90,
        'src/lib/**/*.ts': {
          perFile: true,
          statements: 90,
          branches: 80,
          functions: 90,
          lines: 90,
        },
        // WebGL code is only partly reachable in happy-dom; floors sit just under today's
        // per-file numbers so they can ratchet up but not regress.
        'src/three/**/*.ts': {
          perFile: true,
          statements: 87,
          branches: 65,
          functions: 87,
          lines: 86,
        },
        'src/core/**/*.ts': {
          perFile: true,
          statements: 90,
          branches: 85,
          functions: 90,
          lines: 90,
        },
        'src/ui/state/**/*.ts': {
          perFile: true,
          statements: 90,
          branches: 85,
          functions: 90,
          lines: 90,
        },
        [SVELTE_DEFAULT_GLOB]: {
          perFile: true,
          statements: 90,
          branches: 80,
          functions: 90,
          lines: 90,
        },
        ...SVELTE_FLOOR_THRESHOLDS,
      },
    },
  },
}));
