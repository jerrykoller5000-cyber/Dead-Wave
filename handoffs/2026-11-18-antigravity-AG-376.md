# antigravity — AG-376 GP155 v14 CaveGuard stone skull second look (supersedes v13) — 2026-11-18

Changed:
- Completed `REVIEW ONLY` visual second look on `review/GP-20155/native-stone-pair-v14/` (40 RAW WebGPU PNGs, `head16-before-after.jpg`, `all24-before-after.jpg`) and `review/GP-20155/hunt-live-v14-pair-v1/` (`actual-hunt26-part1.jpg`, `part2.jpg`, and RAW Hunt keyframes) answering ChatGPT's request (`LOOK GP155 v13 AG375 fang gum notch correction native40`) using `v14` per superseding `FYI GP155 v14 supersedes v13 rootseat corrected15of15 existing native40`. Cross-checked against `v12`, `v13`, and `Claude outputs/J168/caveguard-ours-vs-tripo.jpg`. Built 3 zoomed sheets and report in `qa/2026-11-18-AG-376/`. Zero game launches, zero code/test/bar edits.
- Visual findings (`v14/after/` vs `v12` / `v13`):
  - **Resolved (`AG-375` HIGH #1 & #2 + `v13` root seats)**: Upper fangs no longer pierce below the chin at `jaw = 0` (`+18.79 mm` above stone chin bottom); external brown gum bar and protruding corner balls are removed; `15/15` lower teeth visually and structurally sit inside the stone jaw rim (`v13` floating molars/incisors fixed); central brow notch is deeper and forward beak shelf pulled back (`head-front-noon.png`, `head-threequarter-noon.png`, `head-side-noon.png`).
  - **MODERATE-HIGH — Open mandible underside & tiny tan tips peeking beside oral-floor plate**: In `after/head-back-noon.png` and `head-back-night.png`, the mandible underside remains open around the dark brown oval oral-floor disc, with two small tan triangular points still peeking ~5–10 mm down beside the disc's left/right inner edges; at `jaw = 0` (`head-front-noon.png`), no upper fangs appear above/behind lower teeth, leaving a dark horizontal gap with two pale corner nubs.
  - **MODERATE — Flat-topped tray jaw / square rear rami, mild circular eyes + rear side sliver, crisp brow crease & zigzag forehead moss**: Mandible still projects flat-topped ahead of the snout (`head-side-noon.png`, `front-{dusk,night}-marine.png`) with square rear rami (`head-back-noon.png`); round cyan eyes (`head-front-noon.png`) still read mild and leak a small cyan sliver at the rear side cutout (`head-side-noon.png`, `head-side-night.png`); forehead moss ends in sharp sawtooth triangles (`head-front-noon.png`).
  - **MODERATE — Body/step-3 items confirmed (`v14` + `Hunt26`)**: Open-jaw Hunt frames read cleanly at gameplay scale (`13/13` clear), while pale skull contrast vs plain dark-brown body, reduced mid/lower back spines (`3` dorsal + `1` hip nub), boxy flat-topped shoulder caps, dark inner forearm strip, and retained old body items (pale throat/clavicle rods, dark chest/thigh patches, hanging green chest strands, segmented rib lobes) remain for Step 3.

Files:
- `qa/2026-11-18-AG-376/build_sheets.py`
- `qa/2026-11-18-AG-376/sheet-v14-head-zoom.jpg` (`1580x860`)
- `qa/2026-11-18-AG-376/sheet-v14-progression.jpg` (`1620x1105`)
- `qa/2026-11-18-AG-376/sheet-hunt-v14-zoom.jpg` (`1460x1060`)
- `qa/2026-11-18-AG-376/report.md`
- `handoffs/2026-11-18-antigravity-AG-376.md`

Tests:
- Read-only verification of existing `v14` receipts (`review/GP-20155/native-stone-pair-v14/{receipt.json,results.json,actual-closed-mouth-envelope-v2.json,actual-fang-crossings-v1.json,actual-jaw-root-seat-v1.json,actual-lower-tooth-seats-v1.json}`, `review/GP-20155/native-source-conservation-stone-native-stone-pair-v14.json`, `review/GP-20155/hunt-live-v14-pair-v1/{receipt.json,independent-physical-audit-v1.json,actual-live-mouth-and-seat-v1.json,actual-live-lower-tooth-seats-v1.json}`): `WebGPU`, `pageErrors: []`, `sourceDriftOutsideNamedStoneGroups: []`, `success: true`, `12,022 -> 8,358` tris / `3` meshes, `allProtectedGroupsExact: true`, `tipAboveChinMetres: +0.018794` (`pass: true`), `afterHasProperCrossing: false` (`8/8`), lower tooth seats `15/15` (`v14` bind & `13/13` Hunt poses), jaw root seats `16/16` static & `13/13` Hunt, Hunt `rawWholeBodyExactAll26: true`, `rawSoleExactAll696: true`, `camera.pass: true`.
- `python qa/2026-11-18-AG-376/build_sheets.py` exited `0`.

Screenshots:
- Visually inspected `review/GP-20155/native-stone-pair-v14/{head16-before-after.jpg,all24-before-after.jpg}`, `review/GP-20155/hunt-live-v14-pair-v1/{actual-hunt26-part1.jpg,part2.jpg}`, RAW `v14/after/{head-front-noon,head-threequarter-noon,head-side-noon,head-back-noon,head-front-night,head-threequarter-night,head-side-night,head-back-night,front-noon,threequarter-noon,side-noon,back-noon,threequarter-night,side-night,front-noon-marine,front-overcast-marine,front-dusk-marine,front-night-marine}.png`, RAW `hunt-live-v14-pair-v1/after/{00-stand-f030,04-gallop-f078,06-decelerate-f190,09-strike-f247,11-flinch-f288}.png`, and all 3 sheets in `qa/2026-11-18-AG-376/`.

Not verified:
- No new game launch (`no newgame` per request), no independent `t164`/`t340`/`tg164` execution or ABBA FPS/cost measurement (`matched-perf-stone-v14-abba24-v1` in progress by ChatGPT); whole-body bark/sinew, claw curl, and Step-3 items remain outside this skull-step second look.

Requests:
- Replied `DONE` to ChatGPT's request (`LOOK GP155 v13 AG375 fang gum notch correction native40`) using `v14` per superseding `FYI GP155 v14 supersedes v13`, and sent `--fyi` to `chatgpt,claude` pointing to `qa/2026-11-18-AG-376/report.md`, zoomed sheets, and `handoffs/2026-11-18-antigravity-AG-376.md`.

Contract changes:
- None.
