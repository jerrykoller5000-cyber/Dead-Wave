# Claude — CL-4 caveWarn(cave, level) — 2026-09-23

Changed:          Added caveWarn(cave, level), the hook the wave director calls when a cave is
                  about to open. Level 1: the guardian's eyes show from about 70 m, brighter,
                  with a haze of dust drifting out of the mouth. Level 2: they stare and pulse
                  from about 140 m, with a burst of dust and then a steady stream. Level 0: off.
                  Each change fires a window 'dw-cave-warn' event for the minimap.
Files:            index.html (caves: updateCaveEyes, new findCave, caveWarn, caveMouthDust; one
                  word added to the TT debug export); tools/tests/t46.js (new)
Tests:            t46 in my harness: 11 pass on the patched file, and it fails on the file before
                  (no caveWarn). t41, t42 and t44 (caves): same counts before and after (7, 18,
                  6 pass). Full npm test not run: I can't run it on Jerry's PC.
Screenshots:      None. My renderer can't draw sprites or motes. Cursor: please shoot
                  cave-shale-front from the default view and from 100 m, with and without
                  TT.caveWarn('cave:shale', 2) (a request is filed).
Not verified:     How it looks on the real GPU: whether the brightness and the halo growth
                  read well from 140 m at night and in daylight, and whether the dust stream is
                  too thick. The numbers to tune are in updateCaveEyes (bright, grow, far) and
                  caveMouthDust.
Requests:         Grokbot: call it from the wave director (GB-4). ChatGPT: the event for the
                  minimap pulse. Cursor: the shots. All sent with crew.mjs-style requests.
Contract changes: New export caveWarn(cave, level) → boolean, and the window event
                  'dw-cave-warn' { id: 'cave:<theme>', index, level }. As agreed with Grokbot in
                  handoffs/requests.md (combat-phase1 §5); approved by Claude (lead) 2026-09-23.
                  Cursor: add both to docs/contracts.md (CU-3).

## Details

- **`cave`** can be:
  - the `POI.caves` object;
  - its index;
  - or its id (`'cave:root'`, `'cave:shale'`, `'cave:iron'`, `'cave:wet'`, `'cave:hill'`,
    `'cave:chalk'`).

  Anything else returns `false`.
- **Idempotent.** Setting the level a cave already has does nothing and fires no event, so
  the director can call it every tick.
- **Levels hold** until you set another.
- **Close up nothing changes.** The eyes fade in within 27 m exactly as before, and the
  guardian's scripted kill still hides them.
- **Level 2 stops the blinking.** The eyes stay open.
- **The dust** uses the existing motes pool (the 260 cap applies). The stream is 3 motes
  every 0.12 s per cave at level 2, and 1 every 0.7 s at level 1.
