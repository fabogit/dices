#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = fileURLToPath(new URL('..', import.meta.url));
const EXACT_VERSION = /^\d+\.\d+\.\d+$/;
const IMAGE_TAG = /mcr\.microsoft\.com\/playwright:v(\d+\.\d+\.\d+)-[a-z0-9]+/g;

const BUMP_HINT =
  'When bumping @playwright/test, also bump the image tag in .github/workflows/ci.yml and ' +
  'DEFAULT_IMAGE in scripts/update-visual-baselines.sh, then regenerate the visual baselines.';

/**
 * @param {string} path Path relative to the repository root.
 * @returns {string}
 */
const read = (path) => readFileSync(new URL(path, `file://${ROOT_DIR}`), 'utf8');

/**
 * Parses a JSON file as `unknown` so every use has to be validated.
 * @param {string} path Path relative to the repository root.
 * @returns {unknown}
 */
const readJson = (path) => JSON.parse(read(path));

/**
 * Reads a property from an unknown value, yielding `undefined` when it is not an object.
 * @param {unknown} value
 * @param {string} key
 * @returns {unknown}
 */
function field(value, key) {
  return typeof value === 'object' && value !== null ? Reflect.get(value, key) : undefined;
}

/**
 * Returns a list of problems; empty when package.json spec, installed version and image tags agree.
 * @param {{ spec: string | undefined, installed: string, files: Record<string, string> }} input
 * @returns {string[]}
 */
export function findPlaywrightVersionProblems({ spec, installed, files }) {
  const problems = [];
  if (spec === undefined || spec === '') {
    problems.push('Missing @playwright/test in package.json devDependencies.');
  } else if (!EXACT_VERSION.test(spec)) {
    problems.push(
      `@playwright/test must be pinned to an exact version in package.json, found "${spec}".`,
    );
  } else if (spec !== installed) {
    problems.push(
      `package.json pins @playwright/test ${spec} but ${installed} is installed; run pnpm install.`,
    );
  }
  for (const [file, source] of Object.entries(files)) {
    const tags = [...source.matchAll(IMAGE_TAG)].map((match) => match[1]);
    if (tags.length === 0) {
      problems.push(`No Playwright container image tag found in ${file}.`);
    }
    for (const tag of tags) {
      if (tag !== installed) {
        problems.push(
          `${file} uses Playwright image v${tag} but installed @playwright/test is ${installed}.`,
        );
      }
    }
  }
  return problems;
}

function main() {
  const devDependencies = field(readJson('package.json'), 'devDependencies');
  const rawSpec = field(devDependencies, '@playwright/test');
  const spec = typeof rawSpec === 'string' ? rawSpec : undefined;
  const installed = field(readJson('node_modules/@playwright/test/package.json'), 'version');
  if (typeof installed !== 'string') {
    throw new TypeError('node_modules/@playwright/test/package.json has no string "version".');
  }
  const files = {
    '.github/workflows/ci.yml': read('.github/workflows/ci.yml'),
    'scripts/update-visual-baselines.sh': read('scripts/update-visual-baselines.sh'),
  };
  const problems = findPlaywrightVersionProblems({ spec, installed, files });
  if (problems.length > 0) {
    for (const problem of problems) console.error(`Error: ${problem}`);
    console.error(BUMP_HINT);
    process.exit(1);
  }
  console.log(`Playwright version verified: v${installed} (package, install and image tags).`);
}

if (process.argv[1] === import.meta.filename) {
  main();
}
