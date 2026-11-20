# AG-378 — Spider17 Joint Seats Native20 + 90-Pose Look

- **Date:** 2026-11-18
- **Scope:** Crew-only `D-204` / `D-191` visual QA of `review/GT-20111/d204/spider-shape-p4-owner-v13-sockets/` (`SPIDER-P4-JOINT-SEATS-v1.png`, `SPIDER-P4-JOINT-SEAT-CONTEXT-v1.jpg`, `before/` & `plan/` RAW `close-{front,threequarter,side,back}-{noon,black}.png` and `wide-threequarter-{noon,night}.png`), answering ChatGPT 2's request (`LOOK Spider17 joint seats closes native90parts gaps; native20 before-after sheet`). Intermediate crew check only—no finished Jerry verdict, no landing, no all-clip/live-floor waiver. Zero game launches, zero code/test/bar edits.
- **Sheets Built:**
  - `qa/2026-11-18-AG-378/sheet-spider17-sockets-zoom.jpg` (`1320x1280`, `BEFORE natural15` vs `PLAN Spider17` close `side`, `3/4`, `front`, `back`)
  - `qa/2026-11-18-AG-378/sheet-spider17-root-closeup.jpg` (`1280x920`, tight crop on cervical collar & femur root cuffs in `side` and `3/4`)

## Verified Checks & Counts (Read-Only from `spider-shape-p4-owner-v13-sockets` Receipts)
- **`receipt.json` & `sockets-rest-proof.json`:** `WebGPU`, `sourceStable: true`, `pageErrors: []`, `frames: 20`, `matchedCameras: true`, `allOriginalRigAndRestExact: true`, `protectedActualParts: 45` exact, `newNamedSeats: 7` (`6` limb root sockets + `1` cervical joint socket), `4,712` triangles / `1` draw (`< 4,742`, `hitH: 0.95` exact).
- **`NATIVE-LIVE29-DEATH61-STRICT-CONTACT-SUPPORT-v4.json` (`90` poses = `29` live + `61` death-curl):**
  - `before` (`natural15`): `floatingParts: 12..17` live, `12..22` death (`2..3` components, `minRooted: 29`), `maxContacts: 0`.
  - `plan` (`Spider17`): `58/58` parts rooted (`floatingParts: 0`, `1` component across all `90` poses), `nonAdjacentContacts: 0` across all `90` poses, `plan/native-death.json` `minFloorGap: +0.000421 m` (`+0.421 mm`). Alive feet-floor defects (`walk`/`spit-snap`) remain unwaived per request.

## Visual Assessment: Seat Read & Articulation vs Art Fixes
1. **PASS on Structural Seat Read & Silhouette Closure:**
   - **Where:** `sheet-spider17-sockets-zoom.jpg` (`side`, `3/4`), `SPIDER-P4-JOINT-SEAT-CONTEXT-v1.jpg` (`close-side-black.png`, `wide-threequarter-{noon,night}.png`).
   - **What is visible:** In `BEFORE`, `close-side-noon.png` and `close-threequarter-noon.png` show a clear sky-colored gap behind the cephalothorax and disconnected shadow seams at the proximal femur roots. In `PLAN`, the `7` dark-brown sockets close the neck notch cleanly in silhouette (`close-side-black.png`) and at gameplay scale (`wide-threequarter-{noon,night}.png`), reading logically as dark chitin joint collars (`58/58` connected at `2 um`, `0` non-adjacent contacts across `90` poses) rather than arbitrary burial.
2. **MODERATE-HIGH (Art FIX) — Jagged brown triangular shards poke out beneath ventral femur-root cuffs:**
   - **Where:** `review/GT-20111/d204/spider-shape-p4-owner-v13-sockets/plan/close-side-noon.png`, `plan/close-threequarter-noon.png`, and `qa/2026-11-18-AG-378/sheet-spider17-root-closeup.jpg` (top-right and bottom-right tiles).
   - **What is visible:** Under the underside of the front, middle, and rear femur root sockets, sharp dark-brown triangular shard corners/fins poke out past the smooth tan femur cylinder contour (most clearly visible at the front-mid junction and beneath the middle and rear femur cuffs in `PLAN side`, plus under the right front/mid cuffs in `PLAN 3/4`). Tightening the socket cone radii/angles so they wrap smoothly around and tuck inside the femur root (like the smooth knee cuffs or Tripo's coxa folds) will remove those spiky ventral tags.
3. **MODERATE (Art FIX) — Hard-cut posterior rim & striped step on the cervical neck collar:**
   - **Where:** `plan/close-side-noon.png`, `plan/close-threequarter-noon.png`, `sheet-spider17-root-closeup.jpg`.
   - **What is visible:** The dark cervical collar tucks cleanly at the head side, but its posterior boundary meets the pale thorax along a sharp diagonal step/edge slightly proud of the pale carapace lip with visible horizontal dark stripe rings stopping abruptly at the cut. Tucking the rear collar rim slightly inside a subtle pale carapace lip will read cleaner as an anatomical ball-socket joint.
4. **Pending D-204 Non-Socket Items (Retained per Request):**
   - Bigger inward-curving hooked claws (`close-front-noon.png`, `close-back-noon.png`), slightly thicker lower legs near the knee (`close-side-noon.png`), matte lateral eye beads vs glowing cyan pair, `10`-tuft subtle knee hair, and open live feet-floor fixes (`walk`/`spit-snap`).
