# Handoff: AG-289 — Training Ground Props, Part-on-Part Seating & Night Flashlight Hotspot Cap

- **Agent:** `antigravity` (`Gemini 4 Carbon`)
- **Date:** `2026-11-10`
- **Status:** `DONE`

## Changed:
- `world/training.js` (`lines 310-314` — Find 2 corrugated steel Zombie Gate header `training-gate-header`)
- `world/training-props.js` (`lines 43-276` — Find 4 Infirmary mat/O2/IV seating, Find 5 stretcher casters + 4 medical cabinet steel legs, Find 6 Containment Gate threshold plate seated on `y = 0.000 m`)
- `world/training-wear.js` (`lines 531-563` — Find 7 sagging cot X-scissor legs offset `32 mm` along `X` with `6 mm` clear gap + horizontal steel pivot pin, spacer washer & end caps)
- `world/training-build-wear.js` (`lines 24, 182-200` — Find 8 `WALL_PX = 64` clamped `<= 2048 px` & stretched blurry smudge bars removed)
- `index.html` (`lines 21835, 21875-21882` — Night flashlight `penumbra = 0.74` + irradiance-matched ray distance cap `2.35 * len^1.1` up to `16 m`, full `42` downrange)
- `tools/tests/tag289.js` (`30` exact triangle-to-triangle part-on-part & live WebGPU checks)
- `review/AG-289/` & `qa/2026-11-10-AG-289/` (`sheet.jpg`, `flashlight-night-sheet.jpg`, `notes.md`, `manifest.json`, `15` matched `1280x720` PNGs)

## Tests:
- `tools/realtest.mjs tag289`: **`30 pass, 0 fail`** (RTX 5080 WebGPU — Containment Gate `135` parts `0` gaps/`0` pens; Infirmary + Cot `227` parts `0` gaps/`0` pens; flashlight `1 m = 0.45`, `3 m = 4.73`, `8 m = 19.72`, `>= 16 m = 42.00`)
- `tools/realtest.mjs t103`: **`11 pass, 0 fail`**
- `tools/realtest.mjs t215`: **`4 pass, 0 fail`**
- `tools/realtest.mjs tag284`: **`211 pass, 0 fail`**
- Node unit tests (`training-build-wear`, `training-wear`, `training-tunnel`): **`16 pass, 0 fail`**

## Not verified:
- Full regression suite (coordinated separately by Claude 2 under CB-243 per Standing Rule 7).
- Flashlight night wall center pure-white clipping (`r,g,b >= 250`) vs peak highlight luma:
  - **`1.0 m`**: `27.96%` white (`peak 255.0`) -> **`0.00%` white (`peak 234.4`)**
  - **`3.0 m`**: `60.61%` white (`peak 255.0`) -> **`0.00%` white (`peak 245.7`)**
  - **`8.0 m`**: `31.27%` white (`peak 255.0`) -> **`0.00%` white (`peak 247.2`)**
  - Tiles and grout lines read crisply across `1 m`, `3 m`, `8 m`, and `Areas 03–05` Night.
