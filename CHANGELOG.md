# Changelog

## [1.1.0](https://github.com/fabogit/dices/compare/v1.0.2...v1.1.0) (2026-11-16)


### Features

* **persistence:** migrate localStorage to raw v2 state and persist players ([#47](https://github.com/fabogit/dices/issues/47)) ([dd72fb2](https://github.com/fabogit/dices/commit/dd72fb205cfd52647474e2bab57ab5a19dc5e7e6))
* **ui:** add presentational UI primitives and unit tests ([09d8d5c](https://github.com/fabogit/dices/commit/09d8d5cc662a479b9d1c2fdea7ada4d495317c8a))


### Bug Fixes

* **deps:** revert @sveltejs/vite-plugin-svelte 6 and ignore Phase 6/TS major updates ([22d85b7](https://github.com/fabogit/dices/commit/22d85b76cb0b9b1ad17bc820a18d251567abbb9d))
* harden roll lifecycle, persistence, bundle lazy-loading, and e2e type-check ([381dbc5](https://github.com/fabogit/dices/commit/381dbc5b218daec44a191591f246aea79846d42e))
* **quality:** resolve surfaced oxlint, svelte-check, and format issues ([#23](https://github.com/fabogit/dices/issues/23)) ([a3ad906](https://github.com/fabogit/dices/commit/a3ad906aebd03c564d1b5e651ee91503664c68b3))
* **ui:** avoid mode-button blink on auto-roll and lock-hint flash in flight ([555a97c](https://github.com/fabogit/dices/commit/555a97ca32574a5af20641257b024673f70dc9cd))


### Refactoring

* **core,ui:** convert coin/dice stats & summaries into discriminated unions ([#54](https://github.com/fabogit/dices/issues/54)) ([#59](https://github.com/fabogit/dices/issues/59)) ([8dc1a28](https://github.com/fabogit/dices/commit/8dc1a28d7eb70f31249df9f3cad59056c9cbcad2))
* **core:** type series summary rounds per coin/dice kind ([#60](https://github.com/fabogit/dices/issues/60)) ([45d332c](https://github.com/fabogit/dices/commit/45d332c90ecebb249ba4dae88aa84658f8e667fa))
* **e2e:** Phase 0 accessible E2E locators, CI container split, and visual baselines ([744ddf1](https://github.com/fabogit/dices/commit/744ddf1ec24c6c47e8359f085fa86670ffa73460))
* **foundations:** centralize tokens, formatters, and core analytics ([#25](https://github.com/fabogit/dices/issues/25)) ([107d220](https://github.com/fabogit/dices/commit/107d22010d2a93a7d6a12abfd6bad4f68087af79))
* **state:** unify series state in RollState and inject provider/storage ([#46](https://github.com/fabogit/dices/issues/46)) ([4edd779](https://github.com/fabogit/dices/commit/4edd77977215dbd30c1be93f511349f91ac6d5e2))
* **ui:** decompose App into AppHeader, AppFooter, and RightPanel ([#29](https://github.com/fabogit/dices/issues/29)) ([#50](https://github.com/fabogit/dices/issues/50)) ([68afef6](https://github.com/fabogit/dices/commit/68afef69e8f19600d63478312ff116b7a5a45207))
* **ui:** decompose ArenaViewport into ArenaHud and ArenaToolbar ([#51](https://github.com/fabogit/dices/issues/51)) ([7134bbf](https://github.com/fabogit/dices/commit/7134bbf8d7f163b9fc4c811c6998bb948b868a8f))
* **ui:** decompose HistoryPanel and ControlPanel with FaceSelector a11y ([#31](https://github.com/fabogit/dices/issues/31)) ([#52](https://github.com/fabogit/dices/issues/52)) ([4eb516e](https://github.com/fabogit/dices/commit/4eb516e782b664b04233a6699ef098686b29c248))
* **ui:** decompose QuickResultPanel (Phase 4.2) ([#49](https://github.com/fabogit/dices/issues/49)) ([2b006b5](https://github.com/fabogit/dices/commit/2b006b5f853f6b7bffa1f6f2c6edea2025a02494))
* **ui:** decompose SeriesScoreboard and StatisticalBreakdown (Phase 4.1) ([#48](https://github.com/fabogit/dices/issues/48)) ([e7a3337](https://github.com/fabogit/dices/commit/e7a333734a924085a98435f4b0bb39da03f13026))
* **ui:** integrate CollapsiblePanel and RangeStepper in ControlPanel ([7f9c127](https://github.com/fabogit/dices/commit/7f9c127cafd3e5cb1d63ee45b33d60f2063ffee6))
* **ui:** integrate CollapsiblePanel in ArenaViewport ([002bc08](https://github.com/fabogit/dices/commit/002bc08d609845bb98d675b81458aed1bd5dd291))
* **ui:** integrate Dialog and Tabs primitives in App ([9acb870](https://github.com/fabogit/dices/commit/9acb8701db28ce714b8ce4325db426b60f9c9ff2))
* **ui:** integrate primitives in HistoryPanel ([2d5e19a](https://github.com/fabogit/dices/commit/2d5e19a3eaf651b510792ee79aa29fc80250c4e7))
* **ui:** integrate primitives in QuickResultPanel ([32b07ec](https://github.com/fabogit/dices/commit/32b07eca963594378172b1b721981bef85665af2))
* **ui:** integrate primitives in SeriesScoreboard ([6885393](https://github.com/fabogit/dices/commit/68853930ab5c8a54b5e02c1293672fa838e4d219))


### Build System

* **deps:** ignore Vite/Vitest/Svelte plugin and TS major updates in Dependabot ([811813d](https://github.com/fabogit/dices/commit/811813d91f74ccbcf253dd2c9488851da06173e2))
* **tooling:** configure oxlint, oxfmt, and svelte-check ([#23](https://github.com/fabogit/dices/issues/23)) ([279191d](https://github.com/fabogit/dices/commit/279191dceee3c715690d3f503ff17e1b08f2df4e))
* **tooling:** migrate to Vite 8 (Rolldown), plugin-svelte 7, and Vite+ ([#34](https://github.com/fabogit/dices/issues/34)) ([#57](https://github.com/fabogit/dices/issues/57)) ([8646416](https://github.com/fabogit/dices/commit/86464164c9e40d6a439228459f60aa3771a30242))
