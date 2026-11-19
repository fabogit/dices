#!/usr/bin/env node

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = fileURLToPath(new URL('..', import.meta.url));
const SRC_DIR = join(ROOT_DIR, 'src');
const STYLES_DIR = join(SRC_DIR, 'styles');
const TOKENS_FILE = 'src/styles/tokens.css';

/**
 * Literals that may stay in component styles, matched by repository-relative path and the
 * reported literal. Every entry needs a comment saying why no token fits. Target: empty.
 * @type {ReadonlyArray<{ file: string, literal: string }>}
 */
const ALLOWLIST = [];

/** The CSS named colours (CSS Color 4). `transparent` and `currentColor` are deliberately absent. */
const NAMED_COLORS = new Set(
  (
    'aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue ' +
    'blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk ' +
    'crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki ' +
    'darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen ' +
    'darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue ' +
    'dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite ' +
    'gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki ' +
    'lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan ' +
    'lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen ' +
    'lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen ' +
    'magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen ' +
    'mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream ' +
    'mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid ' +
    'palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum ' +
    'powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown ' +
    'seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen ' +
    'steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen'
  ).split(' '),
);

/** Properties whose value is (or contains) a colour; only these are checked for named colours. */
const COLOR_PROPERTY =
  /^(?:color|background(?:-[a-z-]+)?|border(?:-[a-z-]+)?|outline(?:-[a-z-]+)?|box-shadow|text-shadow|fill|stroke|caret-color|accent-color|text-decoration-color|column-rule(?:-[a-z-]+)?)$/;
const HEX_COLOR = /(?<![\w-])#(?:[\da-f]{8}|[\da-f]{6}|[\da-f]{3,4})(?![\w-])/gi;
const COLOR_FUNCTION = /(?<![\w-])(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/gi;
const IDENTIFIER = /(?<![\w-])[a-z]+(?![\w(-])/gi;

/** @typedef {{ line: number, literal: string }} Violation */

/** @param {string} text */
const blank = (text) => text.replaceAll(/[^\n]/g, ' ');

/**
 * Blanks comments, string contents and `url(...)` arguments with spaces (newlines kept), so
 * offsets and line numbers still match the input but `#id` fragments and quoted text vanish.
 * @param {string} css
 * @returns {string}
 */
export function maskNonCode(css) {
  return css
    .replaceAll(/\/\*[\s\S]*?(?:\*\/|$)|(["'])(?:\\[\s\S]|(?!\1)[^\\])*\1/g, (match) =>
      match.startsWith('/*')
        ? blank(match)
        : match.charAt(0) + blank(match.slice(1, -1)) + match.charAt(0),
    )
    .replaceAll(/(url\()([^)]*)/gi, (_match, open, inner) => `${open}${blank(String(inner))}`);
}

/**
 * Returns the content of every `<style>` block (any attributes, e.g. `lang="postcss"`) with
 * the 1-based line on which the content starts.
 * @param {string} source
 * @returns {Array<{ css: string, startLine: number }>}
 */
export function extractStyleBlocks(source) {
  const blocks = [];
  for (const match of source.matchAll(/(<style\b[^>]*>)([\s\S]*?)<\/style\s*>/gi)) {
    const contentStart = (match.index ?? 0) + (match[1]?.length ?? 0);
    blocks.push({
      css: match[2] ?? '',
      startLine: source.slice(0, contentStart).split('\n').length,
    });
  }
  return blocks;
}

/**
 * Finds raw colour literals in the declarations of a stylesheet. Selectors and at-rule
 * preludes (`:global(.white)`, `#id`) are skipped; declarations may span several lines.
 * @param {string} css
 * @param {number} [startLine] Line of `css` within its file (1-based).
 * @returns {Violation[]}
 */
export function findColorLiterals(css, startLine = 1) {
  const masked = maskNonCode(css);
  /** @type {Array<{ index: number, literal: string }>} */
  const found = [];

  for (const segment of masked.matchAll(/[^{};]+(?=[{};]|$)/g)) {
    const end = segment.index + segment[0].length;
    const colon = segment[0].indexOf(':');
    if (masked.charAt(end) === '{' || colon === -1) continue;
    const property = segment[0].slice(0, colon).trim().toLowerCase();
    if (!/^-{0,2}[a-z][\w-]*$/.test(property)) continue;
    const valueStart = segment.index + colon + 1;
    const value = segment[0].slice(colon + 1);

    for (const hex of value.matchAll(HEX_COLOR)) {
      found.push({ index: valueStart + hex.index, literal: hex[0] });
    }
    for (const fn of value.matchAll(COLOR_FUNCTION)) {
      const open = fn.index + fn[0].length;
      let depth = 1;
      let close = open;
      while (close < value.length && depth > 0) {
        const char = value.charAt(close);
        if (char === '(') depth++;
        if (char === ')') depth--;
        close++;
      }
      // Any colour function is a violation, even one wrapping a single var(): components use the
      // semantic or alpha tokens, never the --rgb-* channels directly.
      const literal = value.slice(fn.index, close).replaceAll(/\s+/g, ' ');
      found.push({ index: valueStart + fn.index, literal });
    }
    if (COLOR_PROPERTY.test(property)) {
      for (const word of value.matchAll(IDENTIFIER)) {
        if (NAMED_COLORS.has(word[0].toLowerCase())) {
          found.push({ index: valueStart + word.index, literal: word[0] });
        }
      }
    }
  }

  return found
    .toSorted((a, b) => a.index - b.index)
    .map(({ index, literal }) => ({
      line: startLine + masked.slice(0, index).split('\n').length - 1,
      literal,
    }));
}

/**
 * Checks one file: `.svelte` files by their `<style>` blocks, anything else as plain CSS.
 * @param {string} path
 * @param {string} source
 * @returns {Violation[]}
 */
export function checkSource(path, source) {
  if (!path.endsWith('.svelte')) return findColorLiterals(source);
  return extractStyleBlocks(source).flatMap(({ css, startLine }) =>
    findColorLiterals(css, startLine),
  );
}

/**
 * Names the palette channels (`--rgb-*`) and alpha tokens (`--color-*-aNN`) defined in
 * tokens.css that no `var(...)` references, in tokens.css itself or in any other source.
 * @param {string} tokensCss
 * @param {string[]} sources
 * @returns {string[]}
 */
export function findOrphanTokens(tokensCss, sources) {
  const tokens = maskNonCode(tokensCss);
  const defined = [...tokens.matchAll(/(--(?:rgb-[\w-]+|color-[\w-]+-a\d+))\s*:/g)];
  const used = new Set();
  for (const source of [tokens, ...sources]) {
    for (const ref of source.matchAll(/var\(\s*(--[\w-]+)/g)) used.add(ref[1]);
  }
  return defined.map((match) => match[1] ?? '').filter((name) => !used.has(name));
}

/**
 * @param {string} dir
 * @param {string} extension
 * @param {boolean} recursive
 * @returns {string[]}
 */
function listFiles(dir, extension, recursive) {
  return readdirSync(dir, { recursive })
    .map(String)
    .filter((name) => name.endsWith(extension))
    .map((name) => relative(ROOT_DIR, join(dir, name)).replaceAll('\\', '/'))
    .toSorted();
}

function main() {
  const files = [
    ...listFiles(SRC_DIR, '.svelte', true),
    ...listFiles(STYLES_DIR, '.css', false).filter((file) => file !== TOKENS_FILE),
  ];
  const sources = files.map((file) => readFileSync(join(ROOT_DIR, file), 'utf8'));
  const unusedAllowlist = new Set(ALLOWLIST);
  let failures = 0;

  files.forEach((file, i) => {
    for (const { line, literal } of checkSource(file, sources[i] ?? '')) {
      const allowed = ALLOWLIST.find((entry) => entry.file === file && entry.literal === literal);
      if (allowed === undefined) {
        console.error(`${file}:${line}  ${literal}`);
        failures++;
      } else {
        unusedAllowlist.delete(allowed);
      }
    }
  });
  for (const entry of unusedAllowlist) {
    console.error(`Stale allowlist entry (no longer found): ${entry.file}  ${entry.literal}`);
    failures++;
  }
  const orphans = findOrphanTokens(readFileSync(join(ROOT_DIR, TOKENS_FILE), 'utf8'), sources);
  for (const name of orphans) console.error(`${TOKENS_FILE}: ${name} is defined but never used`);
  failures += orphans.length;

  if (failures > 0) {
    console.error(
      `Style colour guard failed (${failures} problem(s)). Use a token from ${TOKENS_FILE}, ` +
        'adding one there if needed; components must not write colour literals.',
    );
    process.exit(1);
  }
  console.log(`Style colour guard passed (${files.length} file(s), 0 raw colour literals).`);
}

if (process.argv[1] === import.meta.filename) {
  main();
}
