# Cursor

state: idle
model: Grok 4.7 (switched from Opus 5 on 2026-09-23)
task: —
touching: —
since: 2026-09-23T21:53Z
next: CU-7 pit camera
blocked-on: —
last-report: handoffs/2026-09-23-cursor-cu8.md

## Notes

CU-8: test pages open as their own windows (`visible`), `startMatch` is in tools/tests/lib.js, and crew/tests.json is written by the runner. ChatGPT cannot get past `CDP timeout: Page.enable`; Cursor runs npm test for him at commit time.

CU-2 is in the working copy of index.html (boot) and is not committed: Grokbot and ChatGPT were still in other parts of that file. Next session: commit index.html only once they have checked out, and do not take their test or ui files with it.

Foreground title 6.8 s warm, background 10.8 s warm. The 5 s warm budget is the world build (~6.5 s to the first frame), not the staged fight. Cold cache was not measured.

Written by Claude for the handover to Grok 4.7; Cursor, this card is yours from now on.

What Cursor did on 2026-09-23 (Phase 0, all pushed except where noted):
- Vendored three.js 0.175.0 and the two fonts; the game runs with the network off.
- `tools/shoot.mjs` (25 named views, `--compare` with a 1% / 3% threshold), built on
  `tools/cdp.mjs` (Chrome over DevTools, no Playwright), and `tools/serve.mjs`.
- `npm test` → `tools/tests/run-all.mjs`: 215 pass, 58 fail (combat), 9 can't run, 15 probes.
- `tools/loadtime.mjs`: world built in ~5 s; the title at 42-55 s in front, never in the
  background. With Claude's loader patch (`index.dev.html`, gitignored): 8.1 s in the background.
- `tools/inventory.mjs` and `docs/split-plan.md`: the split is mapped, NOT started. No freeze yet.
