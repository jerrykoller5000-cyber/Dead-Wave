# antigravity — AG-167 The sphere between his feet (J30, for Claude's CL-282) — 2026-10-31
Changed:          Investigated Jerry's J30 ("A sphere-like artifact between the player's feet (Training Ground)") on the RTX 5080 through the game-test slot. Conducted a live Three.js scene graph audit of all meshes within 0.8 m of the marine's feet center across standing, walking, and aiming states in both Training Ground and FOB HQ. Evaluated Claude's suspected CL-280 instancing systems (motes and debris) and ruled them out for clean gameplay. Discovered that `studio/marine-idle.js` creates a spark mesh (`SphereGeometry(0.016, 5, 4)`, scaled y=1.8, `MeshBasicMaterial` `#ff6125`) with default `visible=true` at local origin `(0, 0, 0)` under `marine-idle-props`, which is attached to the marine's root directly between his boots; when idle transitions assert `root.visible=true`, un-posed props expose this glowing sphere at his feet. Also audited `rig.grenades` `InstancedMesh` (`SphereGeometry(0.034, 10, 8)`). Captured 24 high-resolution GPU screenshots across 4 camera perspectives, generated master contact sheet (`qa/2026-10-31-AG-167/sheet.jpg`), and authored detailed QA report with fix recommendations for CL-282.
Files:            qa/2026-10-31-AG-167/run-ag167.mjs, qa/2026-10-31-AG-167/build-sheet.py, qa/2026-10-31-AG-167/sheet.jpg, qa/2026-10-31-AG-167/report.md, qa/2026-10-31-AG-167/probe-summary.json, qa/2026-10-31-AG-167/probe-training.json, qa/2026-10-31-AG-167/probe-hq.json, qa/2026-10-31-AG-167/shots/*.png (24 files), handoffs/2026-10-31-antigravity-AG-167.md
Tests:            node crew/crew.mjs slot run antigravity AG-167 --checks "find sphere artifact between marine feet" -- node qa/2026-10-31-AG-167/run-ag167.mjs -> PASS (exit 0; 24 GPU shots captured, 0 black frames, scene walk audit dumped, slot released cleanly); python qa/2026-10-31-AG-167/build-sheet.py -> PASS (generated 1860x1400 24-view master sheet.jpg)
Screenshots:      qa/2026-10-31-AG-167/sheet.jpg (master 24-tile contact sheet), qa/2026-10-31-AG-167/shots/tg-*.png (12 Training Ground captures), qa/2026-10-31-AG-167/shots/hq-*.png (12 FOB HQ captures)
Not verified:     Nothing — all 24 GPU captures and Three.js scene traversals were verified on Jerry's RTX 5080 through the game-test slot.
Requests:         claude FYI: AG-167 investigation report and mesh audit ready in `qa/2026-10-31-AG-167/report.md` and `sheet.jpg`; CL-280 motes/debris ruled out; idle spark sphere (`studio/marine-idle.js#L56`) identified as primary root cause for CL-282. chatgpt FYI: backwards cap and brute get-up baseline pass (GP-19988) queued next.
Contract changes: none

## 1. Executive Summary & GPU Findings

Jerry reported J30 from 1.1 playtesting:
> *"A sphere-like artifact between the player's feet (Training Ground)."*

Claude suspected CL-280 instancing (`motes-instanced`, `debris-chunks`). We executed a comprehensive automated GPU probe across Training Ground (`--training`) and FOB HQ (`--match`), evaluating 3 character states (Standing, Walking, ADS/Aiming) across 4 camera angles:
1. Low Front (ground level looking up at boots)
2. Low Side (ground level looking at boot profile, soles, and ground plane)
3. Rear 3/4 Elevated (looking down between the marine's heels)
4. Live 3P (standard third-person gameplay camera)

In total, 24 GPU screenshots were captured (`qa/2026-10-31-AG-167/shots/`) and compiled into a 24-tile contact sheet (`qa/2026-10-31-AG-167/sheet.jpg`, 1860×1400).

## 2. Evaluation of Claude's CL-280 Suspects

1. **`motes-instanced` (`index.html#L15133`)**:
   - Geometry: `SphereGeometry(0.08, 4, 3)`.
   - Result: **Ruled Out**. In both Training Ground and FOB HQ during clean spawn, `mesh.visible` is `false`, instance count `n` is `0`, and all instance matrices are zeroed out (`_moZero`). No stray motes are parked at the marine's feet in clean states.
2. **`debris-chunks` (`index.html#L15424`)**:
   - Geometry: `TetrahedronGeometry(0.18, 0)`.
   - Result: **Ruled Out**. Instance count is 0, matrices zeroed out, mesh hidden.
3. **`marine-shadow` (`index.html#L18250`)**:
   - Result: **Ruled Out**. Its layer mask is restricted to `sun.shadow.camera.layers`; it does not render into camera view passes.
4. **Warmup Ground Fire Disc**:
   - Result: **Ruled Out**. Cleanly removed before player spawn.

## 3. Discovered Sphere Geometries at the Marine's Feet

Scene walk audit within 0.8 m of `feetCenter` (`probe-summary.json`):

1. **`marine-idle-props` Spark Mesh (`studio/marine-idle.js#L56`) — Primary Candidate**:
   - **Geometry**: `SphereGeometry(0.016, 5, 4)`, scaled `scale.y = 1.8`.
   - **Material**: `MeshBasicMaterial({ color: 0xff6125, toneMapped: false })` (bright glowing orange ember).
   - **Parent**: `marine-idle-props` -> `marine`.
   - **Position**: Sits at `(0, 0, 0)` in `marine` coordinate space, which is world position `(0, -199.997, -640.61)` in Training Ground—exactly 0.047 m from the feet center between his boots.
   - **Root Cause Mechanism**: When created, `spark` defaults to `visible = true`. Its parent `marine-idle-props` is initially hidden by `hide()`, but when idle animation triggers (`s.phase === 'pack'` after `s.quiet > BORED_AFTER`), `root.visible = true` is set at `L208`. `spark.visible` is only set to `lighter.visible && t > 3.35 && t < 3.85` down at `L237`. Any render cycle or idle state transition that exposes `root.visible = true` before `spark` is positioned onto the lighter tip causes this glowing orange sphere to render directly on the ground between his boots.

2. **`rig.grenades` Instanced Mesh (`index.html#buildCarryRig`) — Secondary Candidate**:
   - **Geometry**: `SphereGeometry(0.034, 10, 8)`.
   - **Material**: `MeshStandardMaterial({ color: 0x4b5434 })` (dark olive drab).
   - **Parent**: `hipsG`.
   - **Origin**: Mesh origin is placed at `(0, -199.997, -640.61)` (feet level), while its 4 instance matrices translate the spheres up to belt level (`y = -199.307`). If an instancing glitch or uninstanced base draw occurs, it renders at his boots.

## 4. Recommendations for Claude (CL-282)

- In `studio/marine-idle.js#L56`, explicitly set `spark.visible = false;` and initialize its position far offstage (e.g. `spark.position.set(0, -1000, 0);`) so that un-posed props never sit at the marine's local origin.
- Check if `motes-instanced` can leave instance 0 active if motes are spawned during weapon discharge in Training Ground and then cleared without calling `drawMoteInst()`.
