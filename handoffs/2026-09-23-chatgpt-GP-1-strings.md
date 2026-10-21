# ChatGPT — GP-1 keyed player copy — 2026-09-23

Changed:          Added a standalone native ES-module catalogue with 969 keyed
                  messages and a strict plain-text formatter. No imports or callers
                  were added to index.html; no runtime behavior was changed.
Files:            ui/strings.js; ui/strings.test.mjs; this note;
                  GP-3 acknowledgment in handoffs/requests.md; own crew card/log.
Tests:            node --test ui/strings.test.mjs → 11 pass, 0 fail.
                  node --check ui/strings.js → pass.
                  npm test → blocked before test discovery by
                  "CDP timeout: Page.enable" in tools/cdp.mjs:78.
                  Reproduced with --jobs 1 and with CHROME set to Edge. The first
                  failure occurred before ui/strings.js existed. No browser-suite
                  pass/fail counts or unchanged-baseline claim can be made here.
Screenshots:      Not applicable to this disconnected catalogue: no visible change.
                  tools/shoot.mjs was not run. Before/after UI images belong to the
                  caller-migration handoff, when the catalogue becomes visible.
Not verified:     Full npm suite, live caller migration, rendered text wrapping,
                  cold/warm load timing, 48-zombie frame rate. The file is not loaded
                  by the game, so it adds no runtime work in this handoff. Other
                  agents changed index.html concurrently; none of their edits were
                  rewritten, restored or included in this task.
Requests:         Cursor: when integrating, run this pure Node test file alongside
                  the browser harness, and investigate the Page.enable timeout.
                  Claude/Cursor: review the export surface below for the contract
                  register before callers migrate. These follow-ups are recorded
                  here because Claude currently holds handoffs/requests.md; I did
                  not append through that active reservation.
Contract changes: No existing contract changed and no cross-area call added.
                  Proposed UI exports: STRINGS, DEFAULT_INPUT_LABELS, hasText, text.
                  Claude's approval/registration is still needed for integration.

## What is in the catalogue

- Shell/intro/menu validation, HUD, maps and cardinal cave names, settings, tips
  and accessibility labels.
- All current weapon names/descriptions, gear, perks, build names/descriptions,
  fortification categories/tier names/descriptions, shop states and receipts.
- Build refusal reasons, placement/scrap/upgrade prompts, mortar interaction,
  waves/streaks, supply notifications, named deaths and grave/cinematic copy.
- Player-visible developer command results and performance overlay labels.
- Copy for the approved load stage/substage IDs, coach, Field Intel, prep goals
  and later objectives. These keys do not implement those features.

Current catalogue tables and all 42 Tips entries were read from the game; dynamic
sentences were consolidated into named templates. Static numbers in descriptions
are preserved from that inventory, not new balance decisions. Literal input keys
were replaced with action parameters. World IDs/labels still await Claude's world
inventory; existing cardinal cave names are retained rather than inventing themes.

The source snapshot hash is recorded at the top of ui/strings.js. Internal entity
IDs, command parser tokens, shaders, SVG paths, styles and console-only diagnostic
logs are not player copy. Source line numbers are not used as catalogue keys.

## Consuming the module after integration is authorized

```js
import { text } from './ui/strings.js'; // adjust relative path in the owning module

label.textContent = text('hq.deposit', { count: 2, interact: 'E' });
// E — Bank 2 skulls
label.textContent = text('hq.banked', { amount: 12 });
// Banked 12 Cash
```

`STRINGS` is a frozen flat key map; plural entries contain frozen `one` and `other`
templates. `text(key, params)` selects by a nonnegative integer `count`, preserves
zero values, and substitutes named values once. Player names containing braces,
dollar signs or HTML-looking text remain literal. Use textContent/canvas drawing,
never innerHTML. The formatter does not sanitize HTML because it does not emit HTML.

Input labels default to today's controls through DEFAULT_INPUT_LABELS, and callers
can override each action. `carry` and `repair` are separate actions even though
both currently use T; `rotate` and `reload` likewise both currently use R.

Unknown keys, missing values, invalid counts and object/nonfinite parameters throw
actionable errors. `hasText(key)` checks own keys only. There is no DOM, storage,
audio, Three.js dependency, timer, network call or production debug-global access.

Migration-only `legacy.*` keys preserve old wording for identification. GP-2 removes
Skip prep and its saved flag; do not wire that legacy setting back into the UI.
Do not use legacy.menu.tagline in the simplified menu. Existing valid descriptions
are preserved; Cash/skull-value wording is normalized as specified by Jerry.

## Test coverage and integration follow-up

The 11 tests cover Cash versus skull-value language, zero/one/many plurals,
invalid counts, key rebinding, literal names and dollar signs, missing/invalid
parameters, prototype isolation, immutable data, all catalogue templates and
both plural branches, duplicate keys, and current item/death/load ID coverage.

The package's browser runner does not automatically discover ui/*.test.mjs.
Cursor owns adding `node --test ui/strings.test.mjs` to its orchestration. No tests
were removed, weakened or changed outside this task's new test file. The current
browser startup failure is separate from the previously reported combat failures;
this session could not reach those assertions.

Checked in before work. Check out with next: `GP-2 Remove Skip prep`.
Cursor commits; ChatGPT did not run git or access GitHub.
