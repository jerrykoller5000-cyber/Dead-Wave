# Handoff: AG-300 — Independent RTX 5080 4-Light Look for GT-20077/79 Flamethrower & Chainsaw (Factory + M81)

- **Agent:** Antigravity (`Gemini 4 Carbon`)
- **Date:** 2026-11-11 (`10:26Z`)
- **Hardware / Backend:** NVIDIA GeForce RTX 5080 (16 GB) · `WebGPUBackend` (`gfx: high`, `1280x720`, offscreen `-3800,-3800`)
- **Sheets & Reports:**
  - `review/GT-20077/flamer/gpu/sheet-flamer-factory-m81-4lights.jpg` (also mirrored in `review/AG-300/` and `qa/2026-11-11-AG-300/`)
  - `review/GT-20077/chainsaw/gpu/sheet-chainsaw-factory-m81-4lights.jpg` (also mirrored in `review/AG-300/` and `qa/2026-11-11-AG-300/`)
  - `qa/2026-11-11-AG-300/gpu-heavy-report.json` + `ag300-heavy-gpu.mjs` + `build-ag300-sheets.py`

## Findings on RTX 5080 WebGPU (Noon / Overcast / Dusk / Night)

### 1. Flamethrower (`flamer` — `GT-20077` / `GT-20079`)
- **Gauge Readability:** Clean and crisp across all 4 lights at both 1P Hip and 1P Aimed — needle, red zone, and dial ticks remain legible under direct Noon sun with zero specular whitewash, and stay readable in Dusk/Night.
- **Factory vs M81 Finish Masking:** Only the main casing and service cover panels receive M81 woodland camouflage (`1P Hip`, `1P Aimed`, `3P Held`, and `Armory Rack`). The red pressurized fuel bottle, perforated steel barrel shroud, pressure gauge bezel/face, grips, and feed hose remain clean factory materials with **zero camo bleed**; switching back to Factory (`''`) restores the original steel/olive finish cleanly.
- **Hose & Hold (`J120` / `CC-342b`):** Feed hose stays attached to the gun and clear of both 1P and 3P forearms across all views.

### 2. Chainsaw (`chainsaw` — `GT-20077` / `GT-20079` + `CC-342` `J121`)
- **1P Framing (`J121`, `VIEW_FOV.chainsaw = 48`):** At 1P Hip, the chainsaw sits lower right and pulled in at `48°` FOV, leaving the center downrange sight picture unobstructed across all 4 lights.
- **Factory vs M81 Finish Masking:** Only the removable top louvered cover takes M81 camo (`1P Hip`, `1P Aimed`, `3P Held`), while the orange motor housing, steel guide bar, instanced chain cutters, tubular wraparound front handle, rear rubber grip, and starter handle remain factory. *(Note: `armoryRack` has no wall-peg slot for `chainsaw`, so Rows 7–8 on the chainsaw sheet repeat the 3P held camera with `foundRack: false` recorded in `gpu-chainsaw-report.json`.)*
- **Chain Cutters at the Eye:** Confirms CLAUDE DIRECTOR's follow-up note on real 5080 WebGPU: the 22 instanced chain teeth read as ~3 cm square blocks along the guide bar edge at 1P Hip/Aimed (finer ~1 cm alternating cutters + drive links already queued by Director for after the frag grenade).

## Asset Principles Self-Score (`docs/asset-principles.md`, 0–5)
- **Material Separation & Camo Masking:** `5/5` (clean cover-only M81 coating on both heavy weapons; zero bleed onto gauge, bottle, shroud, orange motor, bar, or grips)
- **Four-Light Readability (Noon / Overcast / Dusk / Night):** `5/5` (zero Noon dial glare; clean Dusk/Night silhouette and edge definition)
- **Draw & Batch Discipline:** `5/5` (`flamer` 10 view meshes / 0 extra draws on M81; `chainsaw` instanced chain teeth preserved)

Changed:
- `qa/2026-11-11-AG-300/ag300-heavy-gpu.mjs` (new offscreen RTX 5080 WebGPU 4-light capture script for flamer & chainsaw)
- `qa/2026-11-11-AG-300/build-ag300-sheets.py` (new contact sheet builder)
- `review/GT-20077/flamer/gpu/` (`sheet-flamer-factory-m81-4lights.jpg` + 32 4-light PNGs + `gpu-flamer-report.json`)
- `review/GT-20077/chainsaw/gpu/` (`sheet-chainsaw-factory-m81-4lights.jpg` + 32 4-light PNGs + `gpu-chainsaw-report.json`)
- `review/AG-300/` & `qa/2026-11-11-AG-300/` (mirrored sheets + `gpu-heavy-report.json`)

Tests:
- `node crew/crew.mjs slot run antigravity AG-300 --checks "Independent 5080 4-light look for GT-20077/79 flamer & chainsaw (factory + M81)" -- node qa/2026-11-11-AG-300/ag300-heavy-gpu.mjs`: `64/64` WebGPU frames captured across Noon/Overcast/Dusk/Night, `0` page errors.

Not verified:
- Chainsaw `armoryRack` wall-peg slot (`foundRack: false` because `armoryRack` does not hang `chainsaw` on the rifle/flamer wall pegs; 1P hip, 1P aimed, and 3P held Factory/M81/restore verified in full).

