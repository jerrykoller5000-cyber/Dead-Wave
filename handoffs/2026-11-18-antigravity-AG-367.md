# Antigravity AG-367 Handoff — AG-357 Step 4b Shambler (Claude 5 CE-14 + Director Pass 3 & Pass 4 Fixes)

## Changed
- [shambler-head-skull.mjs](review/AG-357/shambler-head-skull.mjs): Unified one-piece continuous cranium/cheekbones/hollow-cheeks/jaw/rounded-chin mesh with smooth dual-bone `[head, jaw]` skinning weights; slimmed upper neck flaring into high diagonal trapezius slope with sculpted nuchal cords & V SCM tendons; tucked `neckRows` `-0.088..-0.044` cleanly inside torso to remove chest/back collar shelf; fixed monotonic nape profile (`yB = 0.152`); sunk smaller `r=0.0074` eyes inside darkened `-0.055 m` orbital cavities; restored Pass-2 big blocky crowded 12 upper + 12 matching-size lower teeth inside dark-red gums (`0.0576 m` gape).
- [shambler-step1.mjs](review/AG-357/shambler-step1.mjs): Strengthened 3D sculpted clavicles & exposed lower-left ribs, narrowed central sternal wash off collarbones, smoothed elbow humerus-to-forearm overlap, added dark cloth-tear drop-shadow AO + bruised intercostal valley contrast behind `hole1`/`hole3`, and set rest `jaw.rotation.x = 0`.
- [shambler-step3.mjs](review/AG-357/shambler-step3.mjs): Added smooth dual-bone `[head, jaw]` vertex weighting across `shambler-skull-cranium` and set rest `jaw.rotation.x = 0`.
- [shambler-clothes.mjs](review/AG-357/shambler-clothes.mjs): Adjusted tank grid tessellation (`U=54, V=24`, trousers `18`/`16`), deepened loose tank drape off chest & upper back (`hangT * 0.85`).
- [textures-step2.mjs](review/AG-357/textures-step2.mjs): Removed unrequested back tank hole (`u=0.54`), lifted front-left tear `hole1` onto lower-left ribs (`v=0.43`) with dark frayed tear edges (`alpha=0` dark border texels), and broke up back hair into asymmetric moth-eaten scalp patches + feathered V-nape.
- [index.html](review/AG-357/index.html): Updated `measureProtoHeadNeck()` to fall back cleanly to unified `shambler-skull-cranium` for `chinY` & mandibular width.
- [capture-step4b.mjs](qa/2026-11-18-AG-367/capture-step4b.mjs), [build_step4b_sheets.py](qa/2026-11-18-AG-367/build_step4b_sheets.py), [report.md](qa/2026-11-18-AG-367/report.md): Atomic capture & sheet generation for `review/AG-357/13..17-shambler-step4b-*.jpg`.

## Tests
- Syntax check: `node --check` passed on all `review/AG-357/*.mjs` and `qa/2026-11-18-AG-367/*.mjs` files after the final edit.
- WebGPU capture: `node crew/crew.mjs slot run antigravity AG-367 --checks "AG-357 Step 4b Pass 4 fix ... WebGPU capture" -- node qa/2026-11-18-AG-367/capture-step4b.mjs` passed with exit code `0`, `WebGPUBackend`, `errors: []`, LOD0=`36,496` tris (`2` draws, `3` textures / `3,145,728` bytes @ `512`), LOD1=`7,820` tris, `mouthGapeM=0.0576`, `craniumToNeckRatio=1.67`, `chinY=1.5284`, `jawGonionWidthM=0.1242`.
- Visual inspection: All 5 rebuilt comparison sheets `review/AG-357/13..17-shambler-step4b-*.jpg` visually inspected via `read_file` after the final edit.

## Not verified
- Live game / `studio/` integration is out of scope for review-only `AG-357` Step 4b (zero live game files touched); awaits Claude 5 (`CE-14`) + Claude Director verdict and Claude 6 (`CF-18`) Tripo proportion table.
