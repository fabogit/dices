// @vitest-environment node
import { describe, expect, it } from 'vite-plus/test';
import {
  checkSource,
  extractStyleBlocks,
  findColorLiterals,
  findOrphanTokens,
  maskNonCode,
} from '../check-style-colors.mjs';

const literals = (css: string): string[] => findColorLiterals(css).map((v) => v.literal);

describe('findColorLiterals', () => {
  it('flags hex colours of 3, 4, 6 and 8 digits with their line', () => {
    const css =
      '.a {\n  color: #fff;\n  background: #ffff;\n}\n.b { border: 1px solid #0c4a6e; outline-color: #11223344; }';
    expect(findColorLiterals(css)).toEqual([
      { line: 2, literal: '#fff' },
      { line: 3, literal: '#ffff' },
      { line: 5, literal: '#0c4a6e' },
      { line: 5, literal: '#11223344' },
    ]);
  });

  it('flags rgb/rgba/hsl/hsla literals, including rgba(var(...), alpha)', () => {
    expect(
      literals(
        '.a { color: rgb(1, 2, 3); background: rgba(var(--rgb-sky-400), 0.15); border-color: hsl(0 0% 0%); box-shadow: 0 0 0 1px hsla(0, 0%, 0%, 0.5); }',
      ),
    ).toEqual([
      'rgb(1, 2, 3)',
      'rgba(var(--rgb-sky-400), 0.15)',
      'hsl(0 0% 0%)',
      'hsla(0, 0%, 0%, 0.5)',
    ]);
  });

  it('rejects a colour function even when its only argument is a var() reference', () => {
    expect(literals('.a { color: rgb(var(--rgb-sky-400)); }')).toEqual(['rgb(var(--rgb-sky-400))']);
  });

  it('flags a multiline declaration on the line where the literal sits', () => {
    const css =
      '.a {\n  background: linear-gradient(\n    135deg,\n    rgba(30, 41, 59, 0.85) 0%,\n    var(--x) 100%\n  );\n}';
    expect(findColorLiterals(css)).toEqual([{ line: 4, literal: 'rgba(30, 41, 59, 0.85)' }]);
  });

  it('flags a colour function whose arguments span several lines, collapsing whitespace', () => {
    expect(literals('.a {\n  color: rgba(\n    0,\n    0,\n    0,\n    0.5\n  );\n}')).toEqual([
      'rgba( 0, 0, 0, 0.5 )',
    ]);
  });

  it('flags named colours in colour-bearing properties, including var() fallbacks', () => {
    expect(
      literals(
        '.a { color: white; border: 1px solid Red; box-shadow: 0 0 2px black; background: var(--x, navy); }',
      ),
    ).toEqual(['white', 'Red', 'black', 'navy']);
  });

  it('allows the colour keywords transparent, currentColor, inherit, initial, unset and none', () => {
    expect(
      literals(
        '.a { color: currentColor; background: transparent; border-color: inherit; outline: none; fill: initial; stroke: unset; }',
      ),
    ).toEqual([]);
  });

  it('ignores colour words in selectors, class names and animation names', () => {
    expect(
      literals(
        '.red-badge { animation: blue-pulse 1s infinite; }\n.white:hover { transition: color 0.2s; }\n@keyframes red { from { opacity: 0; } }',
      ),
    ).toEqual([]);
  });

  it('ignores named colours outside colour-bearing properties and in token names', () => {
    expect(
      literals('.a { animation-name: red; grid-area: white; color: var(--color-white-a20); }'),
    ).toEqual([]);
  });

  it('ignores :global(.white) selectors but checks the declarations of :global rules', () => {
    expect(
      findColorLiterals(
        ':global(.white) {\n  color: var(--text-white);\n}\n:global(.x) .y {\n  color: #abc;\n}',
      ),
    ).toEqual([{ line: 5, literal: '#abc' }]);
  });

  it('ignores id selectors, url() fragments, strings and comments', () => {
    expect(
      literals(
        '#main .a { fill: url(#gradient); mask: url("#m"); }\n/* color: #fff; red */\n.b::after { content: "#fff red"; }',
      ),
    ).toEqual([]);
  });

  it('does not mistake a math function like tan() for a named colour', () => {
    expect(literals('.a { border-width: calc(tan(45deg) * 1px); }')).toEqual([]);
  });
});

describe('extractStyleBlocks and checkSource', () => {
  const svelte = [
    '<script lang="ts">',
    "  const color = '#ffffff';",
    '</script>',
    '<div class="red" style="color: red"></div>',
    '<style lang="postcss">',
    '  .a {',
    '    color: #123456;',
    '  }',
    '</style>',
  ].join('\n');

  it('returns each style block with the line its content starts on', () => {
    expect(extractStyleBlocks(svelte)).toEqual([
      { css: '\n  .a {\n    color: #123456;\n  }\n', startLine: 5 },
    ]);
  });

  it('checks only <style> blocks of .svelte files, reporting file lines', () => {
    expect(checkSource('src/ui/A.svelte', svelte)).toEqual([{ line: 7, literal: '#123456' }]);
  });

  it('checks .css files as a whole', () => {
    expect(checkSource('src/styles/global.css', 'body {\n  color: rgb(0 0 0);\n}')).toEqual([
      { line: 2, literal: 'rgb(0 0 0)' },
    ]);
  });

  it('checks several style blocks, including :global rules', () => {
    const source =
      '<style>\n.a { color: var(--x); }\n</style>\n<style>\n:global(body) { background: gold; }\n</style>';
    expect(checkSource('src/App.svelte', source)).toEqual([{ line: 5, literal: 'gold' }]);
  });
});

describe('maskNonCode', () => {
  it('keeps length and newlines so offsets still map to lines', () => {
    const css = '/* a\n b */ .x { background: url(#g); content: "y\\"z"; }';
    const masked = maskNonCode(css);
    expect(masked).toHaveLength(css.length);
    expect(masked.split('\n')).toHaveLength(2);
    expect(masked).not.toContain('#g');
    expect(masked).not.toContain('b */');
    expect(masked).toContain('content: "    ";');
  });
});

describe('findOrphanTokens', () => {
  const tokens = [
    ':root {',
    '  /* --rgb-unused-1: mentioned in a comment only */',
    '  --rgb-sky-400: 56, 189, 248;',
    '  --rgb-red-500: 239, 68, 68;',
    '  --accent-blue: rgb(var(--rgb-sky-400));',
    '  --color-sky-400-a15: rgba(var(--rgb-sky-400), 0.15);',
    '  --color-sky-400-a1: rgba(var(--rgb-sky-400), 0.01);',
    '  --color-amber-500: #f59e0b;',
    '}',
  ].join('\n');

  it('reports channels and alpha tokens that no var() references', () => {
    expect(findOrphanTokens(tokens, ['.a { color: var(--color-sky-400-a15); }'])).toEqual([
      '--rgb-red-500',
      '--color-sky-400-a1',
    ]);
  });

  it('counts a reference from another token in tokens.css and from any source', () => {
    expect(
      findOrphanTokens(tokens, [
        '.a { color: var(--color-sky-400-a15); }',
        '.b { border-color: var( --color-sky-400-a1); background: rgb(var(--rgb-red-500)); }',
      ]),
    ).toEqual([]);
  });

  it('ignores tokens that are neither channels nor alpha variants', () => {
    expect(findOrphanTokens(':root { --color-amber-500: #f59e0b; --surface: #000; }', [])).toEqual(
      [],
    );
  });
});
