# antigravity — AG-375 GP155 v12 CaveGuard stone skull second look (supersedes v11) — 2026-11-18

Changed:
- Completed `REVIEW ONLY` visual second look on `review/GP-20155/native-stone-pair-v12/` (40 RAW WebGPU PNGs, `head16-before-after.jpg`, `all24-before-after.jpg`) and `review/GP-20155/hunt-live-v12-pair-v2/` (`actual-hunt26-part1.jpg`, `part2.jpg`, and RAW Hunt keyframes) per ChatGPT's request (`LOOK GP155 v11 heavier skull jaw fix existing native40`) and superseding FYI (`FYI GP155 v12 rounding supersedes v11 look`), comparing against `v6`, `v11`, and `Claude outputs/J168/caveguard-ours-vs-tripo.jpg`. Built 3 inspection sheets and report in `qa/2026-11-18-AG-375/`. Zero game launches, zero code/test/bar edits.
- Concrete visual findings (`v12/after/` vs `BEFORE`/`v11`/`Tripo`):
  - **Improved**: Cranium dome curve restored between `v6` and `v11` (`after/head-threequarter-noon.png`, `head-side-noon.png`); U-jaw outer bottom chamfered with full-rank stone/moss UVs (no vertical striping); three integral cranial spikes (`head-side-noon.png`, `head-back-noon.png`), larger body armor plates (`front-noon.png`), and open-jaw Hunt readability (`hunt-live-v12-pair-v2/after/{00-stand-f030,04-gallop-f078,09-strike-f247}.png`) are cleaner than `BEFORE`.
  - **HIGH — Upper fangs poke out beneath the chin at bind pose (`jaw = 0`)**: In `after/head-{front,threequarter,side,back}-{noon,night}.png` and `front/3q/side` body views, two sharp tan upper-fang tips protrude ~4–5 cm below the chin underside through the open-bottom hollow U-jaw cavity (`properTriangleCrossings: 0` only because the jaw interior is open, `head-back-noon.png`), while no upper fangs show above the jaw rim at `jaw = 0`.
  - **HIGH — Dark brown horizontal gum bar & protruding corner spheres**: In `after/head-{front,threequarter,side}-{noon,night}.png`, a thin dark brown horizontal band cuts across the lower incisors/canine bases and two dark brown spheres poke visibly out through the front-lateral grey stone jaw rim beneath the tall corner lower fangs.
  - **MODERATE-HIGH — Sharp visor brow overhang & weak front notch; protruding tray jaw / wide rear rami**: Confirming the Director's 23:02Z note, `after/head-front-noon.png` still reads near one horizontal brow bar; in `after/head-{threequarter,side}-noon.png` the brow juts forward like an acute thin visor/beak with a hard brow-to-temple crease. The mandible still extends far forward with a flat horizontal top rim (`head-side-noon.png`, `front-{dusk,night}-marine.png`, `hunt-live-v12-pair-v2/after/{06-decelerate-f190,11-flinch-f288}.png`) and wide square rear blocks around an open underside gap (`head-back-noon.png`).
  - **MODERATE — Mild circular eyes & side sliver, zigzag forehead moss, boxy shoulder caps & dark forearm seam**: Circular sockets/cyan orbs in `after/head-front-{noon,night}.png` read mild/robotic and leak a side cyan sliver in `head-side-noon.png`; moss on the forehead ends in sharp sawtooth triangles (`head-front-noon.png`); shoulder boulders have flat horizontal mossy tops/90-deg corners (`front-noon.png`, `threequarter-noon.png`) and forearms show a dark vertical inner/rear strip (`threequarter-noon.png`, `back-noon.png`). Retained old body items (pale throat/clavicle rods, dark chest/thigh flank patches, hanging green chest strands, segmented rib lobes under thin dorsal spine fins) unchanged.

Files:
- `qa/2026-11-18-AG-375/build_sheets.py`
- `qa/2026-11-18-AG-375/sheet-v12-head-zoom.jpg` (`1580x860`)
- `qa/2026-11-18-AG-375/sheet-progression-before-v6-v11-v12.jpg` (`1620x740`)
- `qa/2026-11-18-AG-375/sheet-hunt-v12-zoom.jpg` (`1460x1060`)
- `qa/2026-11-18-AG-375/report.md`
- `handoffs/2026-11-18-antigravity-AG-375.md`

Tests:
- Read-only verification of existing `v12` receipts (`review/GP-20155/native-stone-pair-v12/{results.json,receipt.json,actual-fang-crossings-v1.json,actual-jaw-root-seat-v1.json}`, `review/GP-20155/actual-head-winding-v12-v1.json`, `review/GP-20155/hunt-live-v12-pair-v2/{independent-physical-audit-v1.json,actual-live-mouth-and-seat-v1.json}`): `WebGPU`, `pageErrors: []`, `sourceDriftOutsideNamedStoneGroups: []`, `success: true`, `12,022 -> 8,366` tris / `3` meshes / `6` draws (`2` skinDraws), head winding `0` reversed / `0` open / `0` non-manifold (`1,300` tris), `8`-angle static & `13`-pose Hunt mouth `properCrossings: 0` (`before` reds retained), `16/16` & live ramus seats `connected: true`, Hunt `rawWholeBodyExactAll26: true`, `rawSoleExactAll696: true`, `camera.pass: true`.
- `python qa/2026-11-18-AG-375/build_sheets.py` exited `0`.

Screenshots:
- Visually inspected `review/GP-20155/native-stone-pair-v12/{head16-before-after.jpg,all24-before-after.jpg}`, `review/GP-20155/native-stone-pair-v11/head16-before-after.jpg`, `Claude outputs/J168/caveguard-ours-vs-tripo.jpg`, RAW `review/GP-20155/native-stone-pair-v12/after/{head-front-noon,head-threequarter-noon,head-side-noon,head-back-noon,head-front-night,head-threequarter-night,front-noon,threequarter-noon,side-noon,back-noon,threequarter-night,side-night,front-noon-marine,front-overcast-marine,front-dusk-marine,front-night-marine}.png`, RAW `review/GP-20155/hunt-live-v12-pair-v2/after/{00-stand-f030,04-gallop-f078,07-windup-f202,09-strike-f247}.png`, and all 3 sheets in `qa/2026-11-18-AG-375/`.

Not verified:
- No new browser/game launch run (explicitly waived by request: existing `WebGPU` `v12` renders reviewed); FPS/ABBA cost, full motion/all-light variants outside captured shots, claw curl, and whole-body/neck/chest rework remain outside this skull-step second look.

Requests:
- Replied `DONE` to ChatGPT's request (`LOOK GP155 v11 heavier skull jaw fix existing native40`) using `v12` per `FYI GP155 v12 rounding supersedes v11 look`, and sent `--fyi` to `chatgpt,claude` pointing to `qa/2026-11-18-AG-375/report.md`, zoomed sheets, and `handoffs/2026-11-18-antigravity-AG-375.md`.

Contract changes:
- None.
