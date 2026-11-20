# antigravity — AG-368 AG-357 Step 4b Pass 5 (last) + final Jerry sheet — 2026-11-18

Changed: Fixed the four Pass 5 shambler items in the review-only `review/AG-357/` prototype (removed the `u = 0.5` vertical hair split via `wrapDU()` and continuous `cylFbm(u, ...)`, widened the U-jaw to `0.1418 m` with rounded chin, smoothed the posterior jaw-to-neck lump/intersection and chin underside, and shortened `chin-to-collar` from `11.34 cm` to `9.21 cm`) and built the ONE-page D-211 final Jerry sheet `review/AG-357/18-shambler-final-jerry.jpg` (atlas-512 only vs Tripo, noon + night) plus updated sheets `13..17`.
Files:
- `review/AG-357/textures-step2.mjs`
- `review/AG-357/shambler-head-skull.mjs`
- `review/AG-357/shambler-step1.mjs`
- `qa/2026-11-18-AG-368/capture-pass5.mjs`
- `qa/2026-11-18-AG-368/build_pass5_sheets.py`
- `qa/2026-11-18-AG-368/pass5-report.json`
- `qa/2026-11-18-AG-368/report.md`
- `review/AG-357/18-shambler-final-jerry.jpg`
- `review/AG-357/13-shambler-step4b-noon-compare.jpg`
- `review/AG-357/14-shambler-step4b-head-closeups.jpg`
- `review/AG-357/15-shambler-step4b-tank-compare.jpg`
- `review/AG-357/16-shambler-step4b-seam-closeups.jpg`
- `review/AG-357/17-shambler-step4b-night-check.jpg`
Tests:
- Syntax checks: `node --check` passed on all `review/AG-357/*.mjs` and `qa/2026-11-18-AG-368/capture-pass5.mjs`.
- Slot-managed WebGPU capture (`Rule 16`, released cleanly): `node crew/crew.mjs slot run antigravity AG-368 --checks "AG-357 Pass 5 final clean WebGPU capture" -- node qa/2026-11-18-AG-368/capture-pass5.mjs` exited `0`, `WebGPUBackend`, `errors: []`, LOD0=`36,496` tris (`2` draws, `3` textures / `3,145,728` bytes @ `512`), LOD1=`7,820` tris, `crownY: 1.8`, `chinY: 1.5066`, `collarY: 1.4145`, `neckLengthChinToCollar: 0.0921` (`9.21 cm`), `jawGonionWidthM: 0.1418`, `craniumWidthM: 0.1835`, `neckTopWidthM: 0.0918` (`craniumToNeckRatio: 2`), `mouthGapeM: 0.0528`.
- Sheet builder: `python qa/2026-11-18-AG-368/build_pass5_sheets.py` exited `0`.
Screenshots:
- Visually inspected `review/AG-357/18-shambler-final-jerry.jpg`, `review/AG-357/13..17-shambler-step4b-*.jpg`, and raw `qa/2026-11-18-AG-368/frames-pass5/noon-white_apose-{head_back,head_3q_back}.png` via `read_file` after the final edit: back-of-head vertical hair split is gone (patchy scabby hair across both sides with scalp islands), wide `0.1418 m` U-jaw and rounded chin read cleanly, zero lump behind jaw or neck-skull zig-zag seam, `9.21 cm` neck matches Tripo scale, and `18-shambler-final-jerry.jpg` shows only Atlas-512 (`A-pose` & `Shamble`) vs Tripo across all 6 required views in noon + night.
Not verified:
- Full `npm test` suite and live game / `studio/` integration are out of scope for review-only `AG-357` Pass 5 (zero live game files touched).
Requests:
- Replied `DONE` to CLAUDE DIRECTOR (`AG-357 pass 5 (last): hair split, jaw 0.14, neck lump, neck 9-9.5 cm; then ONE final sheet for Jerry`) and sent ready notice to CLAUDE DIRECTOR & Claude 5.
Contract changes: none
