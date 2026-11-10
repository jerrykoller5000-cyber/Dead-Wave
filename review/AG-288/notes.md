# AG-288 — Training Ground 4-Light Re-Capture (0 Blanks), Noon Blowout Before/After, Eye-Level Finds & Prop Fixes, and Skeletal Marine Kit Check

- **Agent**: `antigravity` (`--model "Gemini 4 Carbon"`)
- **Renderer / GPU**: `WebGPURenderer` (`WebGPU`) on `NVIDIA GeForce RTX 5080` (`1280x720`, `?debug=1&raf=timer`, off-screen `-3800,-3800` inside shared game-test slot)
- **Contact Sheets (`review/AG-288/`)**:
  - `review/AG-288/sheet.jpg` — Master executive overview (Before/After noon blowout on Areas 8 & 9, 4-light comparisons, fixed station props, and `skeletalMarine` kit verification)
  - `review/AG-288/before-after-noon-and-props.jpg` — Matched Before/After pairs for **Areas 06, 08, 09 noon blowout** AND **Antigravity's 3 `index.html` station prop seating fixes**
  - `review/AG-288/four-lights-range.jpg` — Firing Range (`Areas 01–05`) across `noon`, `overcast`, `dusk`, `night + tactical flashlight` (**20/20 verified non-blank**)
  - `review/AG-288/four-lights-build.jpg` — Build Room & Field Infirmary (`Areas 06–10`) across `noon`, `overcast`, `dusk`, `night + tactical flashlight` (**20/20 verified non-blank**)
  - `review/AG-288/closeups-sheet.jpg` — All 12 station, keypad, `J124` fence & `J128` baseplate close-ups (re-capturing previously blank `close-07`, `close-10`, `close-11` and showing fixed props)
  - `review/AG-288/finds-sheet.jpg` — 8 out-of-lane eye-level walkthrough finds, 1 crisp picture + owner + `file:line` per find
  - *(Also mirrored updated non-blank PNGs & sheets into `qa/2026-11-10-AG-287/` and `review/AG-287/` so `AG-287` contains zero blank files.)*

---

## (1) Why 26/40 `AG-287` Captures Were Blank & Programmatic Verification

- **Root Cause**: `ag287-walkthrough.mjs` awaited `H.renderer.waitForGPU()` *between* `H.render()` and `ctx2d.drawImage(H.renderer.domElement, 0, 0)`. Yielding across a macrotask allowed Chrome's WebGPU compositor swapchain presentation to clear the backbuffer to `RGBA(0,0,0,0)` (`20,861` bytes, `meanRGB = [0,0,0]`).
- **Fix & Integrity Gate (`qa/2026-11-10-AG-288/integrity-report.json`)**:
  - Paused animation loop (`H.loop(false)`), called `H.render()`, and **synchronously in the exact same JS turn with zero `await`** executed `drawImage(src, 0, 0)` + `getImageData(...)` before resuming `H.loop(true)` (same zero-yield pattern as `studio/inspector/inspector.js:53-55`).
  - Also granted `laserLight` (`T.grantAllWeapons()`) and drew the pistol on `night` captures so the weapon-mounted `SpotLight` (`intensity = 42`) casts an authentic tactical flashlight cone while the room switch is OFF.
  - **Programmatic Gate Result**: Every single PNG across `qa/2026-11-10-AG-288/` and `qa/2026-11-10-AG-287/` passed `bytes >= 45,000`, `meanLuma >= 6.0`, `meanLuma <= 240.0`, `stdLuma >= 4.0`, and **0 unintended duplicate SHA-256 hashes**.

---

## (2) Build Room "White Openings" & Zombie Gate Surround at Noon (Areas 6, 8, 9) — Diagnosis & Before/After

See **`review/AG-288/before-after-noon-and-props.jpg` (Rows 1–3)**:

1. **Not outside sky openings**: The Training Ground sits inside an unlit `#0b0d0f` enclosure (`training-void`, `world/training.js:251-252`). The three pure-white rectangles seen in `AG-287` (`y = 0..6 m` flanking the Zombie Gate and `y = 6.3..24 m` above the gate) are solid **`wallMatOne` (`#dfe3e5` white ceramic tile)** planes (`world/training.js:308-312`).
2. **Primary Cause (Fixed in `AG-288` Captures)**: `AG-287`'s capture script drove a synthetic noon (`sun.intensity = 3.25`, `hemi.intensity = 1.45`, `ambientFill.intensity = 0.25`) — **nearly 2×** Dead-Wave's actual noon (`index.html:2887-2890`: `sun.intensity = 1.73`, `hemi.intensity = 0.68`, `ambientFill.intensity = 0.04`). On the north wall facing `-Z` directly into the `+Z` sun, `3.25×` pushed `#dfe3e5` tiles past the WebGPU post-processing bloom threshold (`25.58%` of `before-area-08` pixels clipped at `RGB >= 250`). Under **true game noon (`1.73×`)**, `after-area-06-noon.png`, `after-area-08-noon.png`, and `after-area-09-noon.png` read cleanly with crisp tile grout lines, blue waist band, and `ZOMBIE GATE` surround (`0%` blowout).
3. **Architectural Material Recommendation for `CLAUDE DIRECTOR` (`world/training.js:310-312`)**:
   - Every Build Room hangar wall switches from white ceramic tile (`y = 0..6 m`) to `#6f777c` corrugated steel (`siding`, `y = 6..24 m`, `lines 278-282`, including over the security doorway on `line 327`), **EXCEPT** `gateHeader` (`6.6 m × 17.7 m`, `y = 6.3..24.0 m` directly above the Zombie Gate, `line 310`), which uses `wallMatOne` (white bathroom tile) all the way up to the `24 m` roof (`find-02-gate-header-white-tile.png`).
   - **Recommendation**: Switch `gateHeader` (`world/training.js:310`) from `tileUv(..., wallMatOne)` to `sidingUv(..., siding)` so the corrugated steel hangar wall runs continuously across `y = 6.3..24.0 m` above the Zombie Gate. No backdrop change is needed (the room is already enclosed inside `training-void`).

---

## (3) Eye-Level Walkthrough Finds — Fixed in Antigravity's Lane vs Sent to Owners

### A. Fixed Directly in Antigravity's Lane (`index.html`, Before/After in `before-after-noon-and-props.jpg` Rows 4–6)

1. **Supply Kiosk floating counter braces (`index.html` `makeKiosk`, `training-kiosk`, `before/after-prop-01-kiosk-braces.png`)**: `0.30 m` diagonal braces stopped `193 mm` short of the steel cabinet in mid-air (`z_bot = +0.203 m` vs cabinet `z = +0.010 m`). Extended braces to `0.44 m` (`rotation.x = +0.785`) seated into `0.08 × 0.11 × 0.024 m` steel cabinet cleats (`z = 0.000..0.024 m`).
2. **Skull Intake Window backwards floating tray braces (`index.html` `hq-skull-intake`, `training-skullWindow`, `before/after-prop-02-skull-tray-braces.png`)**: `brace.rotation.x = -0.68` tilted both braces **down-and-outward** into thin air (`z_bot = +0.535 m`, `53.5 cm` off the wall) instead of down-and-back toward the wall. Reversed to `rotation.x = +1.21` (`0.695 m` braces at `sx = ±0.81` clearing the `SKULLS -> CASH` plaque) seated flush into `z = 0.000..0.030 m` wall mounting cleats.
3. **HQ Wave Panel cut-off & eccentric conduit pipe (`index.html` `hq-alarm-cabinet`, `training-hqPanel`, `before/after-prop-03-hqpanel-conduit.png`)**: Lower conduit pipe (`z = 0.13`) was `50 mm` eccentric to the `z = 0.18` cable gland and terminated in thin air **`190 mm` above the floor** (`minYRel = +0.1900 m`). Aligned coaxially at `z = 0.18`, extended `h = 0.57 m` (`y = 0.000..0.570 m`), and added a tapered steel floor flange (`y = 0.000..0.024 m`, `minYRel = 0.0000 m`).

### B. Out-of-Lane Eye-Level Finds (1 Line + 1 Picture + Owner Each, `review/AG-288/finds-sheet.jpg`)

1. **`find-01-boonie-hat-1p-clip.png` — Owner: `claude4` (`Claude 1`) / `claude3`**: In 1P at the Range Console (`0.40 m` away, `-37°` pitch), the marine's camo boonie hat crown/brim and olive vest collar cover the lower 50% of the screen and obscure lane knobs `2–4`.
2. **`find-02-gate-header-white-tile.png` — Owner: `claude` (`world/training.js:310-312`)**: The `6.6 m × 17.7 m` header panel (`y = 6.3..24.0 m`) above the Zombie Gate uses white ceramic bathroom tile (`wallMatOne`) instead of `#6f777c` corrugated hangar steel (`siding`).
3. **`close-01-cif-station.png` — Owner: `chatgpt` (`ui/cif-exterior.js:27, 157`)**: Under the CIF counter, the two dark vertical corbel blocks (`x = ±0.63, z = 0.13..0.47`) slice straight through the `z = 0.336` `RETURN IT IN ONE PIECE` plaque, cutting off `R` and `E`.
4. **`find-03-infirmary-o2-iv-floating.png` — Owner: `chatgpt` / `claude` (`world/training-props.js:117, 191-192, 201`)**: Field Infirmary oxygen cylinder floats `+40 mm` above the `0.030 m` mat (`y = +0.070 m`), IV stand spider legs float `+7 mm` above the mat (pole bottom `+80 mm`), and the dark mat base floats `+10 mm` above `y = 0`.
5. **`find-04-infirmary-casters-cabinet-clip.png` — Owner: `chatgpt` / `claude` (`world/training-props.js:136, 170`)**: Infirmary stretcher casters (`y_min = +0.010 m`) and medical cabinet front feet (`y_min = 0.000 m`) slice `20–30 mm` down through the `0.030 m` mat, and the medical cabinet has no rear feet (`cz - 0.30`).
6. **`find-05-gate-threshold-floating.png` — Owner: `chatgpt` / `claude` (`world/training-props.js:102`)**: Containment Gate steel threshold plate (`y = 0.028, h = 0.045`) floats `+5.5 mm` above the Build Room floor (`y_min = +0.0055 m`).
7. **`find-06-cot-scissor-legs-passthrough.png` — Owner: `claude` (`world/training-wear.js:535`)**: Infirmary sagging cot X-scissor legs share identical `x = cx + dx`, passing `100%` (`30 mm`) through each other at their midpoint instead of offsetting side-by-side (`±0.016 m`).
8. **`find-07-build-wall-blurry-smudge.png` — Owner: `claude` (`world/training-build-wear.js:25`)**: Build Room wall wear sheets use `WALL_PX: 24` (`41.7 mm` per texel), producing visibly blurry stretched smudge decals at eye distance beside crisp 3D geometry.
9. **Night Tactical Flashlight Hotspot on Close White Tiles (`four-lights-range.jpg` Areas 03 & 04 `NIGHT`, `four-lights-build.jpg` Area 07 `NIGHT`) — Owner: `claude` (`index.html:21843`)**: `flashlight.intensity = 42` when `training.lightsOff` reads great at `15–25 m` (`Areas 01, 08, 10`), but within `5–8 m` of `#dfe3e5` white ceramic tiles it bleaches the center cone to pure `RGB(255,255,255)` (`~6%` of screen).
- *(Additional scene-light audit note in `qa/2026-11-10-AG-288/lights-audit.json` for `claude` / `claude2`: `trainingCopies` in `index.html:63530` clones `KIOSK`'s `PointLight(0.9)` onto `training-kiosk` at `[7.18, 1.8, -6.6]` while `light-pool-0` is also active at `[7.18, 1.8, -6.6]`, stacking `0.9 + 0.9 = 1.8` intensity.)*

---

## (4) `skeletalMarine` Kit Check (`skeletal-marine-kit-check.png` & `index.html:49209-49485`)

**Confirmed: 0 kit items were removed in `AG-284`** (`AG-284` only shifted `spine.position.y = 1.0484` to seat the standing feet cleanly on `y = 0.0000 m`). Full kit verified in code and live RTX 5080 WebGPU render (`review/AG-288/skeletal-marine-kit-check.png`):
- **Flak vest & webbing (`lines 49294-49304`)**: Left & right olive-drab flak shoulder pads (`REM.flak`), chest flak panels, vertical webbing straps (`REM.strap`), brass chest buckle (`REM.brass`), and 6 hanging tattered woodland cloth strips (`REM.rags`) below chest flaps and dorsal scapulae.
- **Load-bearing belt & pouch (`lines 49306-49312`)**: 4-sided pelvic load-bearing belt (`REM.strap`), brass belt buckle (`REM.brass`), and left-hip ammo pouch (`REM.rags[2]`).
- **Dog tags & neck chain (`lines 49315-49323`)**: Double offset steel dog tags (`REM.steel`) on V-shaped steel neck chain (`remStrut` + chain nodes) resting against the sternum.
- **Uniform rags & footwear (`lines 49209-49255, 49366-49367, 49419-49421, 49439-49454`)**: Tattered woodland sleeve strips on both upper arms, trouser strips on both femurs, shredded boot-sock cuffs above the bare left skeletal ankle, and the complete right Marine combat boot (`remBoot`: lugged rubber outsole, heel block, contoured leather vamp & toe box, 8-gon ankle shaft, suede collar, 4 lace bars, 8 steel eyelets, and bloody ankle stump), plus thoracic/pubic/laryngeal gore remnants.
