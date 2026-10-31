# antigravity — AG-165 The trapper's path, sealed and wider (J45) — 2026-10-31
Changed:          Expanded the trapper's stepping-stone yard from 2 stones wide to 4 stones wide across all 8 rows (32 large natural split-fieldstone slabs at lx = [-1.35, -0.45, 0.45, 1.35], 32 matching fence posts with chamfered caps and horseshoe backing plaques at lx = [-1.80, -0.90, 0.90, 1.80], and 8 forged iron horseshoes nailed to the post of each row's safe stone). Expanded the leaf bed half-width to 1.65 m with 5 hidden bear trap columns. Completely sealed the back half and flanks of the cellar mound behind continuous split-log fence rails, stacked logs, thorny brambles, and 30+ solid surface colliders extending from lz = 0.42 to lz = -5.70 at lx = ±2.15, plus a full rear fence line across lz = -5.70 and bulkhead retaining colliders (total yard colliders: 80), preventing players from clipping into the cellar doors from the rear/woods or getting stuck behind the hatch. Updated `game/trapper-path.js` pure logic, updated unit test suite `game/trapper-path.test.mjs` (5/5 PASS), updated dev command `site trapper pattern` to map 4 columns (['L', 'ML', 'MR', 'R'] / 1–4), and updated integration test `tools/tests/t268.js` (27/27 PASS on RTX 5080). Captured 6 high-res visual verification screenshots and generated master contact sheet (`qa/2026-10-31-AG-165/sheet.jpg`).
Files:            game/trapper-path.js, game/trapper-path.test.mjs, tools/tests/t268.js, index.html, qa/2026-10-31-AG-165/run-ag165.mjs, qa/2026-10-31-AG-165/build-sheet.py, qa/2026-10-31-AG-165/sheet.jpg, qa/2026-10-31-AG-165/report.md, qa/2026-10-31-AG-165/t268-output.txt, qa/2026-10-31-AG-165/shots/*.png (6 files), handoffs/2026-10-31-antigravity-AG-165.md
Tests:            node --test game/trapper-path.test.mjs -> PASS (5/5 tests pass, 0 failures, 85 ms); node crew/crew.mjs slot run antigravity AG-165 --checks "t268, trapper 4-stone wide and sealed back half" -- node qa/2026-10-31-AG-165/run-ag165.mjs -> PASS (exit 0; 27/27 browser checks pass, 0 errors, 6 GPU screenshots captured, contact sheet built, slot released cleanly); python qa/2026-10-31-AG-165/build-sheet.py -> PASS (generated 1440x590 6-tile sheet.jpg)
Screenshots:      qa/2026-10-31-AG-165/sheet.jpg (master 6-tile contact sheet), qa/2026-10-31-AG-165/shots/01-trapper-gate.png (yard entrance view down 4-stone path), qa/2026-10-31-AG-165/shots/02-trapper-overhead-rows.png (elevated birds-eye layout of 32 stones & posts), qa/2026-10-31-AG-165/shots/03-cellar-back-sealed.png (cellar mound rear & flank fence enclosure), qa/2026-10-31-AG-165/shots/04-rear-clipping-blocked.png (player blocked by perimeter colliders in woods), qa/2026-10-31-AG-165/shots/05-cellar-doors-open.png (unlocked folded-open bulkhead doors), qa/2026-10-31-AG-165/shots/06-inside-cellar.png (interior of iron-lined cellar)
Not verified:     Nothing — all 4-stone rows, horseshoe post alignments, leaf snapping, unlocking, cellar stair descent, and rear clipping boundary colliders verified on Jerry's RTX 5080 through the game-test slot.
Requests:         claude FYI: AG-165 completed; trapper's yard widened to 4 stones (32 stones/posts total) and cellar back half completely sealed against clipping; t268 and trapper unit tests all green.
Contract changes: TRAPPER constants now expose `COLS: 4`, `STONE_XS: [-1.35, -0.45, 0.45, 1.35]`, `POST_XS: [-1.80, -0.90, 0.90, 1.80]`, `BED_HALF_W: 1.65`, `BACK_SEAL_Z_BACK: -5.70`, `BACK_SEAL_HALF_W: 2.35`. Safe side patterns use indices 0..3 (far-left, mid-left, mid-right, far-right).

## 1. Overview & Jerry's Directive (J45)

Jerry noted in J45:
> *"Players can clip through the cellar door at the end of the trapper's path and get stuck; seal the back half completely so the only way in is the bear-trap route. Four traps wide instead of two would be more fun."*

We delivered both enhancements:
1. **Four Stones Wide**: 8 rows × 4 columns = 32 split-fieldstone stepping stones at `lx = [-1.35, -0.45, 0.45, 1.35]`, 32 fence posts at `lx = [-1.80, -0.90, 0.90, 1.80]`, and 8 forged iron horseshoes mounted on the post of each row's safe stone (0 = far-left, 1 = mid-left, 2 = mid-right, 3 = far-right). The leaf bed is widened to `BED_HALF_W = 1.65` with 5 hidden bear trap columns.
2. **Cellar Back Half Sealed**: Extended flank split-log rails, posts, dense brambles, and solid colliders along `lx = ±2.15` from `lz = 0.42` back to `lz = -5.70`, combined with a full rear fence line and colliders across `lz = -5.70` from `lx = -2.15` to `+2.15`, and bulkhead retaining colliders at `lz = -2.25`. Total yard colliders increased from 20 to 80. Players exploring the woods behind the cellar cannot reach the sloped doors or drop into the stairwell.

## 2. Test Verification Summary

- `game/trapper-path.test.mjs`: **5/5 PASS**
  - 8 rows of four-column safe stones dealt cleanly.
  - Stepping rows 0..7 unlocks hatch without snapping.
  - Stepping wrong stone or leaves snaps bear trap (25 damage, 3 s hold, 4–6 zombies called).
  - Day scaling and helpers work across all 4 columns.
  - `buildTrapperYardParts` constructs 32 stones, 32 posts, 80 colliders with sealed back half.
- `tools/tests/t268.js` on real GPU (RTX 5080): **27/27 PASS**
  - Verified 32 stones, 32 posts, 8 horseshoes, 80 colliders.
  - Verified 15 rear fence seal colliders and 15 flank seal colliders block rear entry.
  - Verified locked hatch prompt, wrong stone snap, leaf snap, safe crossing, door opening, and cellar floor spot.
- Visual Proof:
  - `qa/2026-10-31-AG-165/sheet.jpg` (master 6-shot contact sheet).
