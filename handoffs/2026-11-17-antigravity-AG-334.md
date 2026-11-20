# Task: AG-334 — CC-357 b (J164 5-8) marine copy 5080 shots + aims before/after

- **Owner:** antigravity
- **Date:** 2026-11-17
- **Model:** Gemini 4 Carbon
- **Status:** DONE
- **Goal:** Capture the complete `CC-357 b` (`review/CC-357/b/marine-body.js` `ef85ea17`, `review/CC-357/marine-face.js` `0ec0cb83`, `review/CC-357/marine-hats.js` `c2695acf` over LIVE `index.html` `9311196f`, zero game-code edits) marine set on RTX 5080 WebGPU plus `CC357_SET=a` (`review/CC-357/marine-body.js` `f5e0e02d`) aim BEFORE shots, build comparison sheets and zoomed crops, and inspect all details visually.

Changed:
- Capture-only scripts and verified outputs under `review/CC-357/ag-b/` (32 PNGs + `summary.json` + `pair-sheet-stand.jpg` + `pair-sheet-aims.jpg`), `review/CC-357/ag-b-before/` (12 PNGs + `summary.json`), and `qa/2026-11-17-AG-334/` (`capture-ag-b.mjs`, `capture-a-clean.mjs`, `crop-cc357b-details.png`). Zero game files modified.

Tests:
- `node crew/crew.mjs slot run antigravity AG-334 --checks "CC-357 b marine 5080 set (b)" -- node qa/2026-11-17-AG-334/capture-ag-b.mjs`: exited `0`, `32/32` unique `1600x1600` WebGPU PNGs (`pistol`, `unarmed`, `pistolaim`, `rifleaim`), `copiesServed` verified (`ef85ea17`, `0ec0cb83`, `c2695acf`), `fill=84.86%..85.12%` (`35.86%..37.02%` at `fight3q` 4.5 m), `pageErrors=1` (background `objectives-runtime` `TT.resetEconomyDbg()` hook; zero inspector errors blocking capture).
- `node crew/crew.mjs slot run antigravity AG-334 --checks "CC-357 b marine 5080 before aims (a)" -- node qa/2026-11-17-AG-334/capture-a-clean.mjs`: exited `0`, `12/12` unique `1600x1600` WebGPU PNGs (`pistolaim` & `rifleaim`, noon), `pageErrors=0`, `inspectorErrors=0`, `copiesServed` verified (`f5e0e02d`, `0ec0cb83`, `c2695acf`).
- `python review/CC-357/b/build_ag_b_sheets.py "C:/Users/Zero/Desktop/Tiny Trek/qa/2026-11-17-AG-334"`: exited `0`, verified all `32/32` (`ag-b`) and `12/12` (`ag-b-before`) unique MD5s and wrote `pair-sheet-stand.jpg`, `pair-sheet-aims.jpg`, and `crop-cc357b-details.png`.

Not verified:
- Matching `ag-b-before/` to bare Issue kit without `helmet`/`pads`/`gun stack` (`TT.resetEconomyDbg()` + `updateCarriedGear(0, true)` triggered blank `I.shot()` frames when skipping directly to `SET=a` aims without a full `pistol` pose pass); standing BEFORE comparison (`AG-330`) and `ag-b` both run bare Issue kit.

## Visual Inspection Findings (Observed on Sheets & Full-Res `1600x1600` PNGs)

- **Bent elbows (`pistolaim` & `rifleaim`, `side` / `sideR` / `3q`):** Crisp hinged elbow contour with a clean outer olecranon point instead of a hose curve or collapsed fold; tight flex inside `M4` left crook has only a slight crease pinch line, reading naturally at both close-up and 4.5 m `fight3q`.
- **Shoulders & deltoids:** Significant improvement over `1-3` (`crop-cc357b-details.png` row 3): single rounded deltoid cap blends smoothly into upper torso and back without separate front/back bulbs or deep chest-strap hollows (`Standing 3/4` & `Back`). Minor shallow shadow dimple at top-rear right deltoid seam in elevated `rifleaim` (`sideR`), and backpack top straps hover slightly off the traps.
- **Torso, chest rig & pouch clearance:** Rounded chest/ribs and waist with no flat slab sides; plate carrier straps and front/belt pouches sit clear of the camo shirt.
- **Upper arm, forearm, sleeve cuff & glove:** Smooth taper from upper sleeve into fuller forearm and flared cuff wrapping the dark gloves (`unarmed`, `pistol`, `pistolaim`, `rifleaim`).
- **M4 `rifleaim` on 5080:** Works cleanly on RTX 5080 WebGPU — stock seats cleanly into the right shoulder, both hands meet grip and handguard properly, and head tilts cleanly onto the optic line.
- **Boot cuff & laces (`Boot Cuff Front` / `3/4`):** Clean improvement over `AG-330` — vertical tongue slab sliver poking over the cloth hem is gone; trouser cuffs drape over the boot collars with only the clean upper X-lace tips visible.
- **Wrist cord / dark buckle block float & hip straps (Follow-up):** A small dark rectangular box (wrist block) detaches from the wrist cuff and floats `~12–15 cm` in front of the marine's hip/pelvis in `pistol`, `pistolaim`, and `rifleaim` (also present in `a` aims, attached at right wrist cuff only in `unarmed`), accompanied by a thin wrist thread sticking diagonally up behind the left cuff in `pistolaim` `side`/`sideR`. Also note the grey thigh straps still hover slightly proud with side air gaps around the tapered upper thighs in `front`/`3q`.

## Outputs
- `review/CC-357/ag-b/pair-sheet-stand.jpg`
- `review/CC-357/ag-b/pair-sheet-aims.jpg`
- `qa/2026-11-17-AG-334/crop-cc357b-details.png`
- `review/CC-357/ag-b/marine-{pistol,unarmed,pistolaim,rifleaim}-*.png` (32 PNGs) & `review/CC-357/ag-b/summary.json`
- `review/CC-357/ag-b-before/marine-{pistolaim,rifleaim}-noon-*.png` (12 PNGs) & `review/CC-357/ag-b-before/summary.json`
