# Handoff: AG-290 — Barrel Heat: Muzzle Smoke Wisp & Barrel / Suppressor Red-Orange Glow

- **Agent:** `antigravity` (`Gemini 4 Carbon`)
- **Date:** `2026-11-11` (Updated following Director review)
- **Status:** `DONE`

## Director Review (02:25Z & 02:50Z) Findings Addressed:
1. **Heat Colour Ramp & Daylight Attenuation (J132):**
   - Implemented calibrated multi-stage heat ramp: dull dark crimson (`0.18 - 0.50`), rich cherry red to crimson (`0.50 - 0.82`), and incandescent red-orange (`0.82 - 1.00`) only when very hot.
   - Added longitudinal heat gradient map (`getHeatGradientTexture`) along the barrel: hottest core at mid-barrel / gas block, fading smoothly toward chamber and muzzle crown.
   - Added daylight attenuation: in bright noon daylight, emissive intensity is reduced to ~28% of nighttime value, giving an authentic deep crimson heat blush without the flat neon orange "airsoft tip" appearance.
2. **Refined Smoke Wisps (J131 & Director Review):**
   - Calibrated to Jerry's 'slight smoke whisp' and Director's review:
     - 48 pooled billboard quads, rendering with delicate slate-gray gaussian smoke texture (`0xafb6c0`).
     - Wisps spawn as delicate thin puffs (~2.2 - 3.8 cm diameter), rising at 20-28 cm/s with gentle sinusoidal curling.
     - Wisps rise 20-35 cm above the muzzle (or suppressor tip) and break up/diffuse, dissipating completely to 0 opacity.
     - Opacity is see-through: 0.16 at low heat to 0.35 at peak heat.
     - Spawn interval scaled: ~0.12 s at heat 0.90 down to ~0.22 s at cooling heat 0.32 (only 4-8 wisps active at once).
     - Smoke completely gone soon after barrel cools below threshold.
   - Verified in `review/AG-290/smoke-strip.jpg` across Noon and Night (hot 0.90 -> cooling 0.32 -> cold 0.00).
3. **Third-Person Marine Bounds & Laser Isolation:**
   - Identified and resolved the "long orange rod": tactical laser beam was active during previous capture; added strict exclusion in `applyGlowToNode` to ignore lasers/beams/flash, and explicitly disabled lasers (`setLasersDbg(false)`).
   - Re-framed 3P camera view (`x: p.x - 1.45, y: p.y + 1.40, z: p.z - 0.08, fov: 38`) to center the marine, hands, weapon, barrel/suppressor, and rising smoke cleanly in frame.
4. **Rounds-to-Glow Calibration Table:**
   - Per Jerry's request for machine guns and extensive use, a rifle does NOT glow after one magazine (30 rounds); minigun is quickest in time.

| Weapon | Heat / Shot | Continuous Rounds to Glow (`heat >= 0.18`) | Time to Glow at Cyclic Rate | Behaviour / Real-world Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **M4 (GW-4)** | `0.0038` | **48 rounds** (~1.6 standard 30-rd magazines) | ~3.8 seconds | Stays cold during standard 30-round mag dumps; glows only under heavy sustained bursts. |
| **AK (KR-7)** | `0.0042` | **43 rounds** (~1.4 standard 30-rd magazines) | ~4.3 seconds | Heavy 7.62x39 cartridge builds heat slightly faster than 5.56 NATO. |
| **M240** | `0.0040` | **45 rounds** (~0.45 of a 100-rd belt) | ~3.4 seconds | Sustained suppression machine gun barrel with heavy thermal mass. |
| **Minigun** | `0.0033` | **55 rounds** across 6 rotating barrels | **~1.1 seconds** (Quickest in time!) | 3,000 RPM rotary fire rapidly warms all 6 barrels simultaneously. |
| **Shotgun** | `0.0140` | **13 shells** (~1.6 full 8-round tubes) | ~7.8 seconds | High propellant charge; pump cycle allows natural cooling between shots. |
| **Pistol** | `0.0070` | **26 rounds** (~1.7 15-rd magazines) | ~5.2 seconds | Compact handgun barrel warms under rapid double-taps. |
| **Revolver** | `0.0100` | **18 rounds** (3 full cylinder reloads) | ~7.2 seconds | Heavy .357 magnum propellant loads. |
| **Sniper** | `0.0250` | **8 rounds** (~1.6 5-rd magazines) | ~9.6 seconds | Heavy bolt-action rifle cartridge (.308 / .338). |
| **Flamethrower** | `0.0400` / tick | **5 ticks** | **~0.25 seconds** | Direct combustion inside the flame projector nozzle. |

---

## Verification Artifacts
- **Automated Tests:** `tools/tests/tag290.js` — 51/51 assertions passed via `tools/realtest.mjs tag290` (18.2s).
- **Master Review Sheet:** `review/AG-290/sheet.jpg` (`1496x4512`, 10 before/after rows).
- **Heat Progression Strips:** `review/AG-290/heat-strips.jpg` (`1604x1340`, 5 progression strips).
- **Dedicated Smoke Wisps Strip:** `review/AG-290/smoke-strip.jpg` (`1496x686`, hot, cooling, and cold at Noon and Night).
- **All 37 Verified Range Captures:** `review/AG-290/*.png` and `qa/2026-11-10-AG-290/*.png`.
