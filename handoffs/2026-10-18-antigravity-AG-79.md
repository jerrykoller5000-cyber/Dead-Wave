# antigravity — AG-79 Buildables, part 1: Skeletal Marine, Bone Raft, Wood wall (all 5 tiers), Wood floor (all 3 tiers), Barricade (all 3 tiers), and Sandbag Wall (all 3 tiers) — 2026-10-18
Changed:          Completed the game-test slot verification and contact sheet capture for all 16 AG-79 model variants on Jerry's RTX 5080 (`person.skeletal-marine` compacted `325 -> 54` meshes via `mergeStatic`, `prop.bone-raft` compacted `294 -> 35` meshes via `mergeStatic`, `build.wall` Tiers 0–4, `build.floor` Tiers 0–2, `build.barricade` Tiers 0–2, and `build.sandbag` Tiers 0–2). Note: `build.sandbag:2` (Gabion wall) is scheduled for triangle reduction from `6,216` to `<= 1,500` in `AG-84`.
Files:            index.html, qa/2026-10-15-AG-79/verify-node.mjs, qa/2026-10-15-AG-79/after-job.json, qa/2026-10-15-AG-79/run-slot-checks.mjs, qa/2026-10-15-AG-79/after/sheet.jpg, qa/2026-10-15-AG-79/after/check.json
Tests:            `node qa/2026-10-15-AG-79/verify-node.mjs` → 18/18 pass; `DWInspect.contactSheet` via `node crew/crew.mjs slot run` → 16/16 variants ok, 0 broken.
Screenshots:      qa/2026-10-15-AG-79/after/sheet.jpg, qa/2026-10-15-AG-79/after/person-skeletal-marine-three.png, qa/2026-10-15-AG-79/after/prop-bone-raft-three.png, qa/2026-10-15-AG-79/after/build-wall-three.png .. qa/2026-10-15-AG-79/after/build-sandbag-2-three.png (all 16 PNGs)
Not verified:     Full suite remains the coordinated integration job per `AGENTS.md` Rule 16; `build.sandbag:2` triangle budget (`<= 1.5k`) is addressed in `AG-84`.
Requests:         none
Contract changes: none

## Standing Rule 16 Record (`AGENTS.md` Rule 16)
- Captured all 16 variants in the shared game-test slot batch (`node crew/crew.mjs slot run`), using one inspector instance (`--jobs 1`) and stopping the camera daemon cleanly before releasing the slot.

## Verification Evidence
1. **Pure-Node Geometry, Baking, Opening & Encoding Check (`node qa/2026-10-15-AG-79/verify-node.mjs`)**: `18/18 checks passed`:
   - `person.skeletal-marine`: `54` meshes (`8,806` tris, `14` shared mats, `0.39x1.70x0.41m`)
   - `prop.bone-raft`: `35` meshes (`8,504` tris, `3.03x0.84x2.96m`)
   - `build.wall`: Tier 0 (`900` tris, `8` baked meshes), Tier 1 (`1,764` tris, `9` baked), Tier 2 (`1,164` tris, `5` baked), Tier 3 (`1,848` tris, `7` baked), Tier 4 (`2,400` tris, `5` baked)
   - `build.floor`: Tier 0 (`1,368` tris, `2` baked), Tier 1 (`588` tris, `1` baked), Tier 2 (`1,512` tris, `1` baked)
   - `build.barricade`: Tier 0 (`480` tris, `4` baked), Tier 1 (`972` tris, `5` baked), Tier 2 (`1,008` tris, `1` baked)
   - `build.sandbag`: Tier 0 (`1,656` tris, `1` baked), Tier 1 (`2,352` tris, `3` baked), Tier 2 (`6,216` tris, `2` baked — budget reduction in `AG-84`)
2. **Live GPU Inspector Check (`qa/2026-10-15-AG-79/after/check.json` & `sheet.jpg`)**:
   - Renderer: `ANGLE (NVIDIA, NVIDIA GeForce RTX 5080 (0x00002C02) Direct3D11 vs_5_0 ps_5_0, D3D11)`
   - `16 variants · 0 broken`
