# Code Review Checklist

This checklist covers Svelte template semantics and architectural constraints that are **not enforced automatically by `oxlint`** (because Oxlint JS plugins do not support `svelte-eslint-parser`). Verify every item on PRs touching `.svelte` files.

## Svelte 5 Reactivity & Templates

- [ ] **No destructuring of reactive props in child `<script>` blocks that drops reactivity:** Keep reactive reads inside `$derived` / template expressions or pass getter/callback props instead of capturing one-shot values.
- [ ] **No unescaped `{@html}`:** Never pass untrusted or dynamic strings to `{@html}`; prefer declarative Svelte markup.
- [ ] **Keyed `{#each}` blocks (`{#each items as item (item.id)}`):** All dynamic or stateful lists must provide a unique, stable key.
- [ ] **Unique DOM IDs with `$props.id()`:** Never hardcode shared element IDs (`aria-labelledby`, `for`, `id`) in reusable components; use `const uid = $props.id()`.
- [ ] **Preserved local panel state (`hidden` vs `{#if}`):** Keep tab panels hidden with the `hidden` attribute when transient child UI state (e.g. collapsed sections) must survive tab switches.
- [ ] **Scoped CSS isolation:** Do not rely on parent-to-child descendant CSS selectors across component boundaries; move styles into the owning component or explicit CSS custom properties.

## Architecture & Tooling Boundaries

- [ ] **Container / Presentational split (`src/ui/containers/**`):** Only containers in `src/ui/containers/` may read the store with `getRollState`; every other UI folder (primitives included) is presentational and must not import `rollState` or `getRollState` (enforced by the `lint` block in `vite.config.ts` via `no-restricted-imports`, default deny for `src/ui/**`). A new container goes in `src/ui/containers/` with a test in its `__tests__/`; coverage includes it automatically.
- [ ] **Colour tokens only (`src/styles/tokens.css`):** Component styles and the other stylesheets reference colour tokens, never hex, `rgb()`/`rgba()`/`hsl()` or named-colour literals. A new colour, or a new alpha of an existing one (`--color-<palette>-<shade>-a<NN>`), is added to `tokens.css` first. `pnpm run check:style-colors` (part of `pnpm run check`) enforces this and also fails on unused palette channels and alpha tokens.
- [ ] **Accessibility (`a11y_*`):** Verify `svelte-check --fail-on-warnings` passes without new `svelte-ignore` suppressions lacking written justification.
- [ ] **TypeScript 7 re-upgrade tracking (`[TECHNICAL DEBT]`):** `package.json` uses `typescript@^6.0.3` uniformly because `svelte-check@4.7.8` gates out `typescript >= 7` unless TS 6 is also installed via `@typescript/native` alias. Revisit upgrading to TypeScript 7 once `svelte-check` removes the TS 6 dependency.
