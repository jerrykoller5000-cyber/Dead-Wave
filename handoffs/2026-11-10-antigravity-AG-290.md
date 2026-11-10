# Handoff: AG-290 — Barrel Heat: Muzzle Smoke Wisp & Barrel / Suppressor Red-Orange Glow

- **Agent:** `antigravity` (`Gemini 4 Carbon`)
- **Date:** `2026-11-10`
- **Status:** `DONE`

## Changed:
- `game/barrel-heat.js` (NEW: Barrel heat physics module, exponential cooling, `getHeatGlow` incandescent progression, material emissive isolation via per-mesh material cloning, suppressor vs barrel isolation, 36 pooled billboard smoke wisps).
- `index.html` (Imported `createBarrelHeat`; instantiated with scene/camera/weaponMeshes; hooked flamer, minigun, auto/semi guns, and M240 fire sites; added per-frame update tick in first and third person; exposed `window.TT.barrelHeat`, `getBarrelHeat`, `setBarrelHeatDbg`).
- `tools/tests/tag290.js` (NEW: 42 automated WebGPU assertions verifying heat increments, cooling, clamping, glow thresholds, material isolation, suppressor isolation, smoke pooling, live hooks).
- `tools/ag290-capture.mjs` (NEW: Automated capture script for 15 WebGPU screenshots across 4 lights, unsuppressed vs suppressed, FP & TP, M4 & Minigun).
- `tools/build-ag290-sheets.py` (NEW: PIL composite sheet generator for `sheet.jpg` and `heat-strips.jpg`).
- `tools/ag290-slot-batch.mjs` (NEW: Coordinated slot runner for test -> captures -> sheets -> Night 20 benchmark).
- `review/AG-290/` & `qa/2026-11-10-AG-290/` (`sheet.jpg`, `heat-strips.jpg`, `notes.md`, `capture-manifest.json`, `test-tag290.log`, `bench-night20.log`, 15 WebGPU PNGs).

## Tests:
- `tools/realtest.mjs tag290`: **`42 pass, 0 fail`** (20.6s on RTX 5080 WebGPU).
  - All physics rates, exponential decay, glow progression, material cloning isolation, suppressor routing, and live debug hooks pass.
- `tools/bench.mjs --night 20 --gfx high --seconds 20 --prof`:
  - **FPS:** **54.0 fps** (mean of last 10s)
  - **1% Low:** **38.9 fps**
  - **Worst Frame:** **27.8 ms**
  - **Hitches:** **2**
  - **Draw Calls:** **207**
  - **Triangles:** **520,504**
  - **GPU Frame Time:** **0.22 ms**
  - **Viewmodel Overhead:** **0.03 ms**

## Visuals Verified:
- Master sheet: `review/AG-290/sheet.jpg` (`1456x2684`)
- Detail strips: `review/AG-290/heat-strips.jpg` (`1324x614`)
- Suppressor isolation verified: with suppressor attached, suppressor glows cherry red to incandescent orange and emits smoke wisps; barrel remains cool (`emissiveIntensity = 0`). Unsuppressed, barrel glows and smokes while suppressor stays cold.
- Zero new dynamic lights added; all rendering runs through material emissive uniforms within standard viewmodel frame budget.

## Not verified:
- Full regression test suite (coordinated by Claude 2 under CB-243 per Standing Rule 7).
- Standalone multiplayer networking sync of heat (server authoritative heat sync deferred to multiplayer milestone).
