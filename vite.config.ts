import { svelte } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';
import { coverageConfigDefaults, defineConfig } from 'vite-plus';
import pkg from './package.json' with { type: 'json' };

const CONTAINER_FILES = [
  'src/ui/layout/AppHeader.svelte',
  'src/ui/layout/RightPanel.svelte',
  'src/ui/controls/ControlPanel.svelte',
  'src/ui/arena/ArenaViewport.svelte',
  'src/ui/history/HistoryPanel.svelte',
  'src/ui/quick/QuickResultPanel.svelte',
  'src/ui/series/SeriesScoreboard.svelte',
  'src/ui/series/StatisticalBreakdown.svelte',
];

const CONTAINER_TEST_FILES = CONTAINER_FILES.map((file) =>
  file.replace(/\/([^/]+)\.svelte$/, '/__tests__/$1.test.ts'),
);

const NO_ROLL_STATE_MESSAGE =
  'Presentational subcomponents must not import rollState; pass typed props and callbacks from a panel container.';

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
    ],
    categories: {
      correctness: 'error',
      suspicious: 'warn',
    },
    rules: {
      'eslint/no-underscore-dangle': 'off',
      'typescript/require-array-sort-compare': 'error',
    },
    overrides: [
      {
        files: ['src/**/*.{test,spec}.{js,ts}'],
        plugins: ['vitest'],
        rules: {
          'typescript/no-unsafe-type-assertion': 'off',
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
                  group: ['*rollState*', '**/lib/*', '../lib/*', '../../lib/*'],
                  message:
                    'Presentational primitives must not import rollState or lib helpers; pass typed props and callbacks instead.',
                },
              ],
            },
          ],
        },
      },
      {
        files: [
          'src/ui/series/**',
          'src/ui/quick/**',
          'src/ui/layout/**',
          'src/ui/history/**',
          'src/ui/controls/**',
        ],
        rules: {
          'no-restricted-imports': [
            'error',
            {
              patterns: [
                {
                  group: ['*rollState*'],
                  message: NO_ROLL_STATE_MESSAGE,
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
                  group: ['*rollState*'],
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
        // Containers and their tests are the only UI files allowed to touch the rollState singleton
        files: [...CONTAINER_FILES, ...CONTAINER_TEST_FILES],
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
        'src/ui/primitives/**/*.svelte',
        'src/ui/{layout,controls,arena,history,quick,series}/*.svelte',
      ],
      exclude: [...coverageConfigDefaults.exclude, ...CONTAINER_FILES],
      thresholds: {
        statements: 90,
        branches: 80,
        functions: 90,
        lines: 90,
        'src/core/**/*.ts': {
          statements: 90,
          branches: 85,
          functions: 90,
          lines: 90,
        },
        'src/ui/state/**/*.ts': {
          statements: 90,
          branches: 85,
          functions: 90,
          lines: 90,
        },
        'src/ui/**/*.svelte': {
          statements: 90,
          branches: 80,
          functions: 90,
          lines: 90,
        },
      },
    },
  },
}));
