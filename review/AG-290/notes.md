# AG-290 — Barrel Heat: Muzzle Smoke Wisp & Barrel / Suppressor Red-Orange Glow (J131, J132)

**Agent:** `antigravity` (`Gemini 4 Carbon`)  
**Date:** `2026-11-10`  
**Renderer:** `WebGPURenderer` on `NVIDIA GeForce RTX 5080` (`1280x720`)  
**Sheets:**
- `review/AG-290/sheet.jpg` (`1456x2684` — 8 rows of camera-matched `Before | After` captures across 4 lights, suppressed vs unsuppressed, FP and TP, M4 and Minigun)
- `review/AG-290/heat-strips.jpg` (`1324x614` — zoomed muzzle/barrel/suppressor detail strips)

---

## Orders Addressed

- **J131 (Jerry):** *"Slight smoke whisp effect from barrel of gun depending on how long you have been firing."*
- **J132 (Jerry):** *"For machine guns or extensive use of weapons have the barrel glow red and fade depending on it's use. That would apply as well to suppressors when they are on."*
- **Scope Constraints:**
  - One heat scalar per gun in hand (`0.0 .. 1.0`), up with each shot, down exponentially with time.
  - Drives thin muzzle smoke wisp drifting upward off muzzle / suppressor tip.
  - Drives barrel glowing dull red to cherry red to incandescent red-orange, fading as it cools.
  - When suppressor is fitted, suppressor glows and smokes instead while barrel remains cool.
  - First-person and third-person support.
  - Zero new dynamic lights (cheap per-instance material emissive uniforms).

---

## Technical Architecture & Implementation

### 1. `game/barrel-heat.js`
- **Heat Physics & Cooling:**
  - Per-shot heat increments tuned by weapon class (`minigun`: 0.012/shot, `m240`: 0.024/shot, `m4`/`ak`/`sniper`: 0.048–0.065/shot, `shotgun`/`aa12`: 0.075/shot, `flamer`: 0.35/s continuous).
  - Cooldown uses combined linear base + exponential cooling (`COOLING_BASE = 0.08`, `COOLING_EXP = 0.28`), ensuring initial rapid cooling from white-hot followed by gradual decay through dull crimson.
- **Color Progression (`getHeatGlow`):**
  - Threshold `GLOW_HEAT_THRESHOLD = 0.18`.
  - `heat < 0.18`: No glow (color black `0x000000`, `emissiveIntensity = 0.0`).
  - `0.18 <= heat < 0.50`: Dull crimson (`#380000` to `#8c0800`, intensity `0.3 .. 0.8`).
  - `0.50 <= heat < 0.80`: Deep cherry red (`#b81200` to `#ee2b00`, intensity `0.8 .. 1.8`).
  - `0.80 <= heat <= 1.00`: Incandescent red-orange / orange (`#ff3700` to `#ff7814`, intensity `1.8 .. 3.3`).
- **Material Isolation:**
  - Default Three.js weapon materials (`gunDark`, etc.) are shared across submeshes. `applyGlowToNode` clones the material once per mesh on first glow, isolating the emissive uniform to only the barrel or suppressor geometry without per-frame allocations.
  - When heat drops below threshold or when switching between barrel and suppressor, `emissiveIntensity` is unconditionally reset to `0.0` and `emissive` to black.
- **Suppressor Isolation:**
  - When a suppressor is fitted (`suppressor[weaponKey] === true` and `suppressor.visible === true`), heat routes to the suppressor: suppressor glows incandescent and emits smoke wisps; barrel remains cool (`emissiveIntensity = 0`).
  - When unsuppressed, barrel glows and smokes; suppressor has 0 emissive.
- **Zero-Allocation Muzzle Smoke Wisps:**
  - 36 pre-allocated billboard sprites pooled in `Scene`.
  - Spawns wisps when `heat >= SMOKE_HEAT_THRESHOLD (0.15)`.
  - Wisps drift upward in world coordinates with subtle horizontal turbulence (`Math.sin`), expand slightly (`0.035m` to `0.09m`), and fade out over lifetime (`0.45s` to `0.95s`).

### 2. Integration in `index.html`
- Instantiated `createBarrelHeat({ THREE, scene, camera, weaponMeshes })` (line ~23705).
- Hooked fire call sites:
  - Flamer firing tick (`barrelHeat.addShot('flamer', false, dt)`)
  - Minigun fire loop (`barrelHeat.addShot('minigun', false)`)
  - Auto/semi fire site (`barrelHeat.addShot(currentWeapon, !!suppressor[currentWeapon])`)
  - M240 fire site (`barrelHeat.addShot('m240', false)`)
- Hooked per-frame update tick in first and third person near `updateViewmodel`.
- Exposed debugging APIs on `window.TT`: `barrelHeat`, `getBarrelHeat()`, `setBarrelHeatDbg(weaponKey, heat)`.

---

## Visual Verification Artifacts (`review/AG-290/` & `qa/2026-11-10-AG-290/`)

All 15 screenshots captured on RTX 5080 WebGPU:
1. `before-fp-m4-cold-noon.png` vs `after-fp-m4-hot-noon.png`: M4 barrel glow and drifting smoke at Noon.
2. `before-fp-m4-cold-overcast.png` vs `after-fp-m4-hot-overcast.png`: M4 barrel glow under Overcast sky.
3. `before-fp-m4-cold-dusk.png` vs `after-fp-m4-hot-dusk.png`: Cherry-red barrel glow against Dusk shadows.
4. `before-fp-m4-cold-night.png` vs `after-fp-m4-hot-night.png`: Incandescent red-orange barrel glow against Night darkness with rising smoke wisp.
5. `before-fp-m4-suppressed-cold-night.png` vs `after-fp-m4-suppressed-hot-night.png`: Suppressor glowing incandescent orange with smoke wisp at tip; barrel body remains completely cold.
6. `before-fp-minigun-cold-noon.png` vs `after-fp-minigun-hot-noon.png`: All 6 spinning barrels glowing hot incandescent orange with heavy smoke drift.
7. `before-tp-marine-m4-cold-noon.png` vs `after-tp-marine-m4-hot-noon.png`: Third-person marine holding hot M4; barrel glows clearly at gameplay scale.
8. `after-tp-marine-m4-suppressed-hot-night.png`: Third-person marine at night with glowing suppressor canister.

Composite Sheets:
- `sheet.jpg` (`1456x2684`): Master 8-row comparison matrix.
- `heat-strips.jpg` (`1324x614`): Close crop strips showing muzzle and suppressor heat gradients.

---

## Test & Performance Benchmark

### 1. Automated Real-Renderer Test
- Command: `node tools/realtest.mjs tag290`
- Result: **`42 pass, 0 fail`** (20.6s on real WebGPU renderer).
- Validated: exports, per-shot tuning rates, exponential cooling, clamping, glow thresholds, material isolation, suppressor isolation, smoke pooling, live `window.TT` hooks.

### 2. Night 20 Exclusive Benchmark (48 Zombies, GFX High, 20s)
- Command: `node tools/bench.mjs --night 20 --gfx high --seconds 20 --prof`
- **Mean FPS:** **54.0 fps** (last 10s mean)
- **1% Low FPS:** **38.9 fps**
- **Worst Frame:** **27.8 ms**
- **Hitches (>50ms):** **2** (only during initial asset setup/GC, 0 in steady-state loop)
- **Draw Calls:** **207**
- **Triangles:** **520,504**
- **GPU Frame Time:** **0.22 ms**
- **Viewmodel Overhead:** **0.03 ms** (virtually zero overhead; zero allocations in update loop)
- Zero new WebGPU pipelines created after startup.
