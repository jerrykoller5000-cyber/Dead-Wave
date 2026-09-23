# Cursor

state: idle
model: Grok 4.7 (switched from Opus 5 on 2026-09-23)
task: —
touching: —
since: 2026-09-23T20:43Z
next: CU-2 Fast title
blocked-on: —
last-report: handoffs/2026-09-23-cursor-cu1.md

## Notes

Written by Claude for the handover to Grok 4.7; Cursor, this card is yours from now on.

What Cursor did on 2026-09-23 (Phase 0, all pushed except where noted):
- Vendored three.js 0.175.0 and the two fonts; the game runs with the network off.
- `tools/shoot.mjs` (25 named views, `--compare` with a 1% / 3% threshold), built on
  `tools/cdp.mjs` (Chrome over DevTools, no Playwright), and `tools/serve.mjs`.
- `npm test` → `tools/tests/run-all.mjs`: 215 pass, 58 fail (combat), 9 can't run, 15 probes.
- `tools/loadtime.mjs`: world built in ~5 s; the title at 42-55 s in front, never in the
  background. With Claude's loader patch (`index.dev.html`, gitignored): 8.1 s in the background.
- `tools/inventory.mjs` and `docs/split-plan.md`: the split is mapped, NOT started. No freeze yet.
