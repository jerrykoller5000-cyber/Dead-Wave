# AG-84 — Sandbag tier 2 (`build.sandbag` variant 2): merge its 248 parts and trim under 1,500 tris

- **Date:** 2026-10-18
- **Agent:** Antigravity (`Gemini 4 Argon (High)`)
- **Task:** `AG-84` — `build.sandbag` variant 2: merge its 248 parts and trim under 1,500 tris (`studio/inspector/baseline.json` has 6,216 tris, 248 parts; budget: 1,500 tris, ≤ 2 draws in `docs/budgets.md`).

## Before vs After (`DWInspect.show("build.sandbag", { variant: "2" }).info`)

| Metric | Before (`baseline.json`) | After (`qa/2026-10-18-AG-84/after/check.json`) | Budget (`docs/budgets.md`) |
| --- | --- | --- | --- |
| Triangles (`tris`) | `6,216` | **`1,428`** (−77.0%) | `≤ 1,500` |
| Meshes (`meshes`) | `248` | **`2`** (−99.2%) | `≤ 2` |
| Drawables (`drawables`) | `248` | **`2`** | `≤ 2` |
| Materials (`materials`) | `2` | **`2`** | `≤ 2` |
| World Bounds (`size`) | `2.03 × 1.69 × 0.66 m` | **`2.03 × 1.69 × 0.66 m`** | unchanged |

## What Changed (`index.html` lines 31120–31173)
1. **Replaced rounded `_rbox` cobbles/boulders with angular quarried `_box` blocks**: Each `_rbox` had 44 triangles; switching the tiered stone courses and base boulders to crisp `_box` blocks (`12` tris each) with deterministic yaw/roll tilt preserves the stacked fieldstone silhouette at 5 m while cutting 73% of the per-stone triangles.
2. **Consolidated through-cobbles and full-span horizontal steel/wire bars**: Instead of doubling front/back cobbles and short wire segments per stone, stones span through the mortar core (`d * 0.78`) and horizontal steel reinforcement bars (`wireMat`) span full courses with 6 vertical binding straps.
3. **Added `mergeStatic(root)` at the end of `tier === 2`**: Collapses all stone/concrete/earth/timber (`fieldstoneMat`) and steel (`wireMat`) child meshes into **2 static draw calls** (`1,428` triangles total), matching tiers 0, 1, 3, and 4.

## Verification & Proof
- **Node check (`qa/2026-10-15-AG-79/verify-node.mjs`)**: `18 passed, 0 failed` (`build.sandbag tier 2 -> raw 2 meshes (1428 tris) -> baked 2 meshes (2 mats), size 2.03x1.69x0.66m`, UTF-8 no-BOM clean).
- **Live Inspector check via game-test slot (`qa/2026-10-18-AG-84/run-ag84.mjs`)**:
  - `DWInspect.show("build.sandbag", { variant: "2" }).info` → `{"meshes":2,"drawables":2,"tris":1428,"points":0,"segments":0,"materials":2}`.
- **Screenshots**:
  - Before (3-angle): `qa/2026-10-18-AG-84/before/build-sandbag-2-three.png`
  - After (3-angle): `qa/2026-10-18-AG-84/after/build-sandbag-2-three.png`
  - After (5 m game-camera view): `qa/2026-10-18-AG-84/after/build-sandbag-2-5m.png`
  - Contact sheet (`node tools/camera.mjs check build.sandbag`): `qa/2026-10-18-AG-84/after/sheet.jpg`
