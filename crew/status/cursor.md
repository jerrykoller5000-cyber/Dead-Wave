# Cursor

state: active
model: Grok 4.7
task: CU-34 Full npm test, then commit and push everything checked out
touching: git
since: 2026-09-25T04:54Z
next: CU-34 After CU-35: full `npm test` on Jerry's PC, commit and push
blocked-on: —
last-report: handoffs/2026-09-25-cursor-CU-35.md

## Notes

CU-4 slices in the working copy, not committed, because someone else was in `index.html` at checkout: `core/audio.js` (`AudioSys`) and `core/loader.js` (`DWLoad`, `yieldToBrowser`, `whileHiddenFramesRun`). `t45` passed after the loader move. Commit `index.html` with those two only when nobody else is in it.

Already pushed: `core/math.js` (`b4c670d`), `core/geometry.js` (`94940f3`). D-15: one slice, then check out. Do not freeze the whole file while another agent is in a different part. Next slice is boot (scene, camera, renderer, the frame loop) and it overlaps the `TT` export block, so wait until that part is free.

CU-4 audio slice is in the working copy and not committed: Grokbot is in `index.html` (builds), so the page was not committed. `core/audio.js` holds `AudioSys`. `t45` passed 8/8. Next slice after that is `core/boot.js`.

CU-4 earlier slices, already pushed: `core/math.js` (`b4c670d`) and `core/geometry.js` (`94940f3`). D-15: one slice, then check out. No whole-file freeze while someone else is in another part.

CU-4 is paused, not finished. Freeze comes off with this checkout. Done so far, on `feature/Phis-changes`: `core/math.js` (`b4c670d`) and `core/geometry.js` (`94940f3`). Next slice is `core/audio.js`. Turn the freeze back on before editing `index.html` again.

CU-7: `pit` in tools/shoot.mjs is Claude's funnel camera. Each npm test check stops at 180s. Antigravity shot: `qa/shots/cu7/pit.png`.

CU-8: test pages open as their own windows (`visible`), `startMatch` is in tools/tests/lib.js, and crew/tests.json is written by the runner. ChatGPT cannot get past `CDP timeout: Page.enable`; Cursor runs npm test for him at commit time.

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
