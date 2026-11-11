# Handoff: AG-290 — Barrel Heat: Muzzle Smoke Wisp & Barrel / Suppressor Red-Orange Glow

- **Agent:** `antigravity` (`Gemini 4 Carbon`)
- **Date:** `2026-11-11` (Updated following Director review)
- **Status:** `DONE`

## Director Review (02:25Z) Findings Addressed:
1. **Heat Colour Ramp & Daylight Attenuation (J132):**
   - Implemented calibrated multi-stage heat ramp: dull dark crimson (`0.18 - 0.50`), rich cherry red to crimson (`0.50 - 0.82`), and incandescent red-orange (`0.82 - 1.00`) only when very hot.
   - Added longitudinal heat gradient map (`getHeatGradientTexture`) along the barrel: hottest core at mid-barrel / gas block, fading smoothly toward chamber and muzzle crown.
   - Added daylight attenuation: in bright noon daylight, emissive intensity is reduced to ~28% of nighttime value, giving an authentic deep crimson heat blush without the flat neon orange "airsoft tip" appearance.
2. **Visible Smoke Plume (J131):**
   - Overhauled smoke wisp particle simulation: 48 pooled billboard particles with soft slate-gray smoky texture (`0x98a2b0`), renderOrder 999, vertically elongated ribbon scaling (`s * 0.70, s * 2.2, 1`), and rising velocity (`28 - 54 cm/s`) with sinusoidal curling.
   - Smoke plume is clearly visible across all 4 lights (noon, overcast, dusk, night) rising from the muzzle crown or suppressor tip.
3. **Third-Person Marine Bounds & Laser Isolation:**
   - Identified and resolved the "long orange rod": the gun's tactical laser beam was active during capture; added strict exclusion in `applyGlowToNode` to ignore lasers/beams/flash, and explicitly disabled lasers (`setLasersDbg(false)`).
   - Re-framed 3P camera view (`x: p.x - 1.45, y: p.y + 1.40, z: p.z - 0.08, fov: 38`) to center the marine, hands, weapon, barrel/suppressor, and rising smoke cleanly in frame.
4. **Rounds-to-Glow Calibration Table:**
   - Per Jerry's request for machine guns and extensive use, a rifle does NOT glow after one magazine (30 rounds); minigun is quickest in time.

### Calibrated Steady Fire Rounds to Glow per Weapon:
| Weapon | Mag / Capacity | Heat / Shot | Continuous Rounds to Glow (`heat >= 0.18`) | Time to Glow at Max Cyclic Rate | Behavior |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Minigun** | Unlimited / Belt | 0.0033 | **55 rounds** | **~1.1 s** (Quickest!) | Begins dull red glow after 1.1s; 6 barrels incandescent by 250 rds |
| **M240** | 100-round Belt | 0.0040 | **45 rounds** | **~3.6 s** | Sustained belt burst reaches cherry glow; heavy machine gun barrel |
| **M4 (GW-4)** | 30 rounds | 0.0038 | **48 rounds** (1.6 mags) | **~3.8 s** | **Clean after 1 mag** (heat ~0.11: smoke wisps, zero glow); glows after 1.6 mags |
| **AK** | 30 rounds | 0.0040 | **45 rounds** (1.5 mags) | **~4.5 s** | Clean after 1 mag; starts glowing during second magazine |
| **Uzi** | 32 rounds | 0.0035 | **52 rounds** (1.6 mags) | **~3.5 s** | Clean after 1 mag; rapid 9mm spray glows on sustained 2nd mag |
| **AA-12** | 20 rounds | 0.0055 | **33 rounds** (1.65 drums) | **~6.6 s** | Clean after 1 drum; continuous auto-shotgun drum dump glows |
| **Pistol** | 17 rounds | 0.0052 | **35 rounds** (2.1 mags) | **~7.0 s** | Clean through 2 mags; rapid double-mag fire starts faint glow |
| **Revolver** | 6 rounds | 0.0085 | **22 rounds** (3.6 cyls) | **~8.8 s** | Clean through 3 cylinders; heavy repeated magnum fire heats barrel |
| **Shotgun** | 8 rounds | 0.0140 | **13 rounds** (1.6 tubes) | **~9.7 s** | Clean after 1 tube; rapid continuous heavy 12ga cycling heats barrel |
| **Sniper** | 5 rounds | 0.0220 | **9 rounds** (1.8 mags) | **~12.0 s** | Clean after 1 mag; heavy .50/.338 magnum rounds heat long barrel |
| **Launcher** | 1 round | 0.0320 | **6 rounds** | **~18.0 s** | Heavy thermal discharge; heats on repeated reloading |
| **Flamer** | 100 fuel | 0.0400/s | **4.5 seconds** | **~4.5 s** | Continuous flame jet heats nozzle into cherry glow |

## Changed:
- `game/barrel-heat.js`:
  - Recalibrated `HEAT_PER_SHOT`, `COOLING_BASE` (0.040), `COOLING_EXP` (0.040), `GLOW_HEAT_THRESHOLD` (0.18), `SMOKE_HEAT_THRESHOLD` (0.10).
  - Multi-stage `getHeatGlow` with daylight attenuation (`daylightFactor = 1.0 -> 0.28x intensity`).
  - `getHeatGradientTexture` generating a 1D gradient map with length-wise falloff on barrel meshes.
  - Enhanced smoke wisp particle simulation with 48 pooled billboards, slate-gray texture, higher opacity, and vertical plume drift.
  - Perspective-aware muzzle tracking: first-person uses viewmodel muzzle, third-person uses world weapon mesh muzzle.
  - Reset cleanup iterating over `ctx.weaponMeshes` to clear residual emissive intensity.
- `tools/tests/tag290.js`:
  - Added assertions for rounds-to-glow calibration (M4 does not glow after 1 mag, minigun quickest).
  - Added daylight attenuation checks, gradient texture verification, and laser exclusion assertions.
  - 51 automated assertions passing.
- `tools/ag290-capture.mjs`:
  - Added explicit laser disabling (`setLasersDbg(false)`).
  - Re-framed third-person camera to center marine, weapon, barrel, and smoke plume.
  - Adjusted smoke wisp simulation time to allow rising plume formation.
  - 37 screenshots captured and verified across 4 lights.
- `tools/build-ag290-sheets.py`:
  - Updated 10-row master comparison sheet (`review/AG-290/sheet.jpg`, 1496x4512) and 5-strip detail sheet (`review/AG-290/heat-strips.jpg`, 1604x1340).

## Tests:
- `tools/realtest.mjs tag290`: **`51 pass, 0 fail`** (18.2s on RTX 5080 WebGPU).
  - All physics rates, exponential decay, glow progression, rounds-to-glow calibration, daylight attenuation, material cloning isolation, suppressor routing, and live debug hooks pass.

## Visuals Verified:
- Master sheet: `review/AG-290/sheet.jpg` (`1496x4512` — 10 rows of matched `Before | After` captures across 4 lights, cooling cycle, suppressor isolation, FP and TP, GW-4 and Minigun).
- Detail strips: `review/AG-290/heat-strips.jpg` (`1604x1340` — 5 strips showing 4 lights, natural cooling decay, suppressor isolation, minigun cluster, and 3P marine in range).
- Visual verification:
  - Faint, realistic deep crimson heat blush at noon; bright incandescence at night.
  - Smooth temperature gradient falloff along the barrel.
  - Continuous visible vertical smoke plumes rising from the muzzle/suppressor into the air across all 4 light stages.
  - Suppressor isolation confirmed: only suppressor glows and smokes when fitted; barrel stays cold.
  - Third-person marine clean and centered with zero laser beam artifacts.

## Not verified:
- Full regression test suite (coordinated by Claude 2 under CB-243 per Standing Rule 7).
- Standalone multiplayer networking sync of heat.