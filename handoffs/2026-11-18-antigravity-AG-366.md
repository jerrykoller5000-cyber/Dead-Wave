# antigravity — AG-366 AG-357 Step 4b (D-209/Jerry) — 2026-11-18

Changed:
- Completed `AG-357` Step 4b in `review/AG-357/` (review-only; zero live game files modified): rebuilt round cranium & occiput base (`0.1817 m` vs `0.1077 m` neck = `1.69x`), slim posterior neck wrapped smoothly over trapezius (`seam_neck_torso_back` seam removed), wide U-shaped mandible (`0.1205 m`) + tall scream (`0.0383 m` incisor gape, ~`5.8 cm` gum-to-gum) + 12 big upper & 12 matching-size lower blocky teeth in sculpted gums, seamless stretched cheek wall, deeper sculpted eye sockets/open piriform nose/larynx/SCM/nuchal cords with stronger normal maps, flush patchy scabby hair with V-tapered nape (removed protruding hair cards), and U-scoop front+back tank top with closed rolled binding rim, `~3.7 cm` straps, deep armholes, loose drape folds & ragged hem.

Files:
- `review/AG-357/shambler-head-skull.mjs`
- `review/AG-357/shambler-clothes.mjs`
- `review/AG-357/shambler-step1.mjs`
- `review/AG-357/shambler-step3.mjs`
- `review/AG-357/textures-step2.mjs`
- `review/AG-357/atlas-step3.mjs`
- `review/AG-357/index.html`
- `qa/2026-11-18-AG-366/capture-step4b.mjs`
- `qa/2026-11-18-AG-366/build_step4b_sheets.py`
- `qa/2026-11-18-AG-366/step4b-report.json`
- `qa/2026-11-18-AG-366/report.md`
- `qa/2026-11-18-AG-366/frames-step4b/*.png`
- `review/AG-357/13-shambler-step4b-noon-compare.jpg`
- `review/AG-357/14-shambler-step4b-head-closeups.jpg`
- `review/AG-357/15-shambler-step4b-tank-compare.jpg`
- `review/AG-357/16-shambler-step4b-seam-closeups.jpg`
- `review/AG-357/17-shambler-step4b-night-check.jpg`

Tests:
- `Get-ChildItem review/AG-357/*.mjs` syntax checks (`node --check`) -> pass.
- `node crew/crew.mjs slot run antigravity AG-366 --checks "AG-357 Step 4b pass 2 WebGPU capture" -- node qa/2026-11-18-AG-366/capture-step4b.mjs` -> exit `0` (`WebGPUBackend`, `errors: []`, `52,136` tris LOD0 / `9,636` tris LOD1, `2` draws, `3` textures, `3.00 MB @ 512`).
- `python qa/2026-11-18-AG-366/build_step4b_sheets.py` -> exit `0` (generated sheets `13..17`).

Screenshots:
- `review/AG-357/13-shambler-step4b-noon-compare.jpg`
- `review/AG-357/14-shambler-step4b-head-closeups.jpg`
- `review/AG-357/15-shambler-step4b-tank-compare.jpg`
- `review/AG-357/16-shambler-step4b-seam-closeups.jpg`
- `review/AG-357/17-shambler-step4b-night-check.jpg`

Not verified:
- Production rig integration (`studio/zombie-humanoids.js` belongs to Claude 3 after Jerry signs off); 30-shambler bench not rerun since draw/texture/VRAM counts (`2` draws, `3` textures, `3.00 MB @ 512`) remain unchanged (LOD0 tris increased from `43,616` to `52,136`; LOD1 `9,636`).

Requests:
- Replied `DONE` to all 5 `AG-357 4b` requests from CLAUDE DIRECTOR and sent `AG-357 STEP 4b COMPLETE: sheets 13-17 ready for Director & Jerry review` to `claude`.

Contract changes:
- None.
