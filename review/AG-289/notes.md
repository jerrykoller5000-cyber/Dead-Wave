# AG-289 — Training Ground Props, Part-on-Part Seating & Night Flashlight Hotspot Cap

**Agent:** `antigravity` (`Gemini 4 Carbon`)  
**Date:** `2026-11-10`  
**Renderer:** `WebGPURenderer` on `NVIDIA GeForce RTX 5080` (`1280x720`)  
**Sheets:**
- `review/AG-289/sheet.jpg` (`1728x4754` — all 9 exact camera-matched `Before | After` rows: Finds 2, 4, 5, 6, 7, 8 + Flashlight @ `1 m`, `3 m`, `8 m`)
- `review/AG-289/flashlight-night-sheet.jpg` (`1728x3200` — `1 m`, `3 m`, `8 m` + matched `Areas 03–05` Night)

---

## Summary of All 7 Fixes

1. **Find 2 (`world/training.js:310-314`) — Zombie Gate Header Siding**:
   - Replaced white ceramic tile header (`y = 6.3..24.0 m`) with corrugated steel hangar siding (`mat.siding`, `z = B.maxZ - 0.025`, named `training-gate-header`) matching its adjacent Build Room end-wall panels.
2. **Find 4 (`world/training-props.js:126-274`) — Field Infirmary Floor & Mat Seating**:
   - Seated dark base mat (`2.70 x 0.014 x 2.00 m`) flush on `y = 0.000 m` and pale inset mat at `y = 0.012..0.020 m`.
   - Lowered O2 bottle (`-40 mm` -> `minY = 0.0200 m`) and IV stand 4 rubber feet (`-7 mm` -> `minY = 0.0200 m`) flush onto the mat surface.
3. **Find 5 (`world/training-props.js:146-246`) — Stretcher Casters & Medical Cabinet 4 Steel Legs**:
   - Raised stretcher assembly (`+20 mm`) so all 4 rubber casters (`R = 0.095 m`) sit flush on `y = 0.0200 m` instead of slicing into the mat.
   - Raised medical cabinet (`+30 mm`) and added the 2 missing rear steel legs (`z = -0.17 m`) matching the 2 front steel legs (`z = +0.17 m`), all 4 seated flush at `y = 0.0200 m`.
4. **Find 6 (`world/training-props.js:55-61`) — Containment Gate Steel Threshold Plate**:
   - Seated the steel threshold plate and hazard nosing flush on `y = 0.0000 m` (`gateFrame.scale.y = 1.4` accounted for: world height `0.0448 m` centered at `y = 0.0224 m`).
5. **Find 7 (`world/training-wear.js:531-563`) — Sagging Cot Scissor Legs & Pivot Pin**:
   - Offset the X-scissor leg pairs by `32.0 mm` along `X` (`6.0 mm` clear air gap between `26 mm` steel tubes — `0` triangle/AABB intersections) and added horizontal steel pivot pin, center spacer washer, and outer pin caps (`6` pivot hardware parts total).
6. **Find 8 (`world/training-build-wear.js:24, 182-200`) — Build Room Wall Wear Texel Density**:
   - Increased `BUILD_WEAR.WALL_PX` to `64 px/m` with canvas dimensions clamped `<= 2048 px`, and removed the stretched low-texel blurry wall smudge bars.
7. **Tactical Flashlight Close-Range Night Hotspot Cap (`index.html:21835, 21875-21882`)**:
   - Softened `SpotLight` penumbra (`0.55 -> 0.74`) and added an irradiance-matched ray distance cap along the beam (`laserStop(flashlight.position, _flashDir, 16, true)`, matching `SpotLight` `decay = 1.1`):
     `targetIntensity = Math.max(0.45, Math.min(baseIntensity, 2.35 * Math.pow(Math.max(0.20, stop.len), 1.1)))`.
   - Preserves a bright, readable pool of light with crisp tiles and grout lines across `1 m`, `3 m`, and `8 m` (`peak luma = 234.4 / 245.7 / 247.2`, **`0.00%` clipped white** at all distances vs `27.96% / 60.61% / 31.27%` pure-white burnout uncapped), while keeping full `42.0` throw downrange (`>= 14 m`).

---

## Automated Real-Renderer & Node Verification

- **`tools/realtest.mjs tag289` (RTX 5080 WebGPU)**: **`30 pass, 0 fail`** (`Containment Gate`: `135` parts, `0` gaps `> 0.5 mm`, `0` pass-throughs; `Field Infirmary + Cot`: `227` parts, `0` gaps `> 0.5 mm`, `0` pass-throughs; live `1 m` intensity `0.45`, `3 m` `4.73`, `8 m` `19.72`, `>= 16 m` open range `42.00`).
- **`tools/realtest.mjs t103`**: **`11 pass, 0 fail`**
- **`tools/realtest.mjs t215`**: **`4 pass, 0 fail`** (`223` files scanned, `0` mojibake)
- **`tools/realtest.mjs tag284`**: **`211 pass, 0 fail`**
- **Node unit tests** (`world/training-build-wear.test.mjs`, `world/training-wear.test.mjs`, `world/training-tunnel.test.mjs`): **`16 pass, 0 fail`**
- **Image Integrity Gate (`manifest.json`)**: All `15` captured `1280x720` PNGs verified non-blank and `100%` SHA-256 unique.
