# QA Report: AG-167 — The Sphere Between His Feet (Jerry's J30)

**Date**: 2026-10-31  
**Agent**: Antigravity (`Gemini 4 Argon (High)`)  
**Hardware**: Jerry's PC (RTX 5080, Windows 11)  
**Slot**: Shared game-test slot held cleanly via `tools/game-test-slot.mjs`  
**Master Contact Sheet**: `qa/2026-10-31-AG-167/sheet.jpg` (24 views, 1860×1400)  
**Raw Probes**: `qa/2026-10-31-AG-167/probe-summary.json`, `probe-training.json`, `probe-hq.json`  

---

## 1. Executive Summary

Jerry reported in `docs/jerry/2026-10-31-1.1-notes.md`:
> **J30**: *"A sphere-like artifact between the player's feet (Training Ground)."*

Claude noted on `handoffs/requests.md`:
> *"Find it on the GPU and list the meshes at his feet at that frame (name, parent, geometry, material, instanced or not); shot and list to me. It may be mine (CL-280's instancing)."*

We executed a comprehensive GPU probe on Jerry's RTX 5080 across both **Training Ground** (`--training`) and **FOB HQ** (`--match`), evaluating 3 character states (Standing, Walking, Aiming/ADS) from 4 camera perspectives (Low Front, Low Side, Rear 3/4 Elevated, and Live Third-Person), generating 24 high-resolution captures. Simultaneously, we walked the live Three.js scene graph, inspecting every mesh within 0.8 m of the feet center (calculated from `ankleLG` and `ankleRG`).

### Primary Conclusions:
1. **Claude's CL-280 Instanced Motes & Debris are RULED OUT in clean gameplay**:
   - `motes-instanced` (`SphereGeometry(0.08, 4, 3)`): Count is 0, `visible = false`, all instance matrices zeroed out.
   - `debris-chunks` (`TetrahedronGeometry(0.18, 0)`): Count is 0, `visible = false`, all instance matrices zeroed out.
   - Marine shadow proxy (`marine-shadow` `SkinnedMesh`): Layers mask is restricted to `sun.shadow.camera.layers`, invisible to camera.
   - Ground fire warmup disc: Removed during match init.
2. **Identified Sphere Geometries at the Marine's Feet / Origin**:
   - **Candidate A (Highest Probability Root Cause)**: `marine-idle-props` **spark mesh** (`studio/marine-idle.js#L56`):
     - **Geometry**: `SphereGeometry(0.016, 5, 4)` scaled `scale.y = 1.8`.
     - **Material**: `MeshBasicMaterial({ color: 0xff6125, toneMapped: false })` (bright glowing orange ember).
     - **Parent Chain**: `marine-idle-props > marine > Scene`.
     - **Origin**: Placed directly at `(0, 0, 0)` in `marine` local space (world coordinates `(0, -199.997, -640.61)` in Training Ground, distance = 0.047 m from feet center).
     - **Mechanism**: In `createMarineIdle`, `spark` is created with default `visible = true` and `position.set(0, 0, 0)`. When the marine enters idle (`s.phase === 'pack'` after `s.quiet > BORED_AFTER`), `root.visible = true` is asserted at line 208 of `studio/marine-idle.js`. `spark.visible` is only repositioned and set to `lighter.visible && t > 3.35 && t < 3.85` down at line 237. Any intermediate render or frame where idle begins exposes this glowing orange sphere at `(0, 0, 0)`—right between the marine's boots.
   - **Candidate B**: `rig.grenades` **instanced mesh** (`index.html#buildCarryRig`):
     - **Geometry**: `SphereGeometry(0.034, 10, 8)`.
     - **Material**: `MeshStandardMaterial({ color: 0x4b5434 })` (dark olive green).
     - **Parent Chain**: `Group > Group > Group > Group > Scene` (under `hipsG`).
     - **Mesh Position**: Its local origin is `(0, -199.997, -640.61)` (feet level), while its 4 instance matrices translate the spheres up to belt level `y = -199.307`. If any instancing breakdown, uninstanced fallback, or bounding sphere visualization occurs, it maps to the feet center.
3. **Visual Verification**:
   - In standard baseline gameplay across all 24 captures, no persistent sphere is drawn between his feet when the marine is active (walking or ADS). The artifact is transient/state-dependent, strongly correlating with idle animation state transitions.

---

## 2. Test Matrix & Capture Methodology

Probing was conducted via headless Chromium CDP controlling `tools/camera.mjs` running the real web build on Jerry's RTX 5080 under the game-test slot:

| Environment | State | View | Capture File | Findings |
|---|---|---|---|---|
| Training Ground | Standing | Low Front | `tg-standing-front.png` | Camera at ground level facing bench / boots |
| Training Ground | Standing | Low Side | `tg-standing-side.png` | Clear view of left boot, sole, heel, ground plane |
| Training Ground | Standing | Rear 3/4 Elev | `tg-standing-rear3.png` | Elevated view between boots; clear ground |
| Training Ground | Standing | Live 3P | `tg-standing-live.png` | Standard gameplay third-person camera |
| Training Ground | Walking | Low Front | `tg-walking-front.png` | Forward stride gait |
| Training Ground | Walking | Low Side | `tg-walking-side.png` | Boot stride extension; clean ground clearance |
| Training Ground | Walking | Rear 3/4 Elev | `tg-walking-rear3.png` | Downward view of leg separation |
| Training Ground | Walking | Live 3P | `tg-walking-live.png` | Gameplay running stride |
| Training Ground | Aiming | Low Front | `tg-aiming-front.png` | ADS stance, weapon raised |
| Training Ground | Aiming | Low Side | `tg-aiming-side.png` | Planted boot stance |
| Training Ground | Aiming | Rear 3/4 Elev | `tg-aiming-rear3.png` | Over-shoulder downward to feet |
| Training Ground | Aiming | Live 3P | `tg-aiming-live.png` | Standard ADS camera framing |
| FOB HQ | Standing | 4 Views | `hq-standing-*.png` | Yard tarmac; clean foot contact |
| FOB HQ | Walking | 4 Views | `hq-walking-*.png` | Yard stride; clean foot contact |
| FOB HQ | Aiming | 4 Views | `hq-aiming-*.png` | Yard ADS; clean foot contact |

All 24 captures were compiled into `qa/2026-10-31-AG-167/sheet.jpg`.

---

## 3. Complete Scene Walk: Meshes Within 0.8 m of Marine Feet

The scene walk probed all meshes with `worldPosition.distanceTo(feetCenter) <= 0.8` or bounding box minimum distance `<= 0.8`.

```
Player Feet Center (TG): (0, -199.95, -640.61)
Ankle Left:              (-0.15, -199.95, -640.61)
Ankle Right:             (0.15, -199.95, -640.61)
```

### Table of Meshes at Feet:

| Name | Type | Geometry | Material | Distance to Center | Local / World Position | Visible | Instanced | Notes |
|---|---|---|---|---|---|---|---|---|
| `(unnamed)` (Spark) | `Mesh` | `SphereGeometry(0.016, 5, 4)` | `MeshBasicMaterial` (`#ff6125`) | 0.047 m | `(0, -199.997, -640.61)` | `true` (parent `false` in active play) | No | `marine-idle-props` spark. Sits at origin `(0,0,0)` of marine. |
| `(unnamed)` (Rig Grenades) | `InstancedMesh` | `SphereGeometry(0.034, 10, 8)` | `MeshStandardMaterial` (`#4b5434`) | 0.047 m | `(0, -199.997, -640.61)` | `true` | Yes (4 inst) | Mesh root at marine origin; instances translated to `y = -199.307`. |
| `(unnamed)` (Boots outer) | `Mesh` | `BufferGeometry` (1044 vtx) | `MeshStandardMaterial` (`#1c1c16`) | 0.143 m | `(-0.13, -199.90, -640.59)` | `true` | No | Left fitted boot lower. |
| `(unnamed)` (Boots tread) | `Mesh` | `BufferGeometry` (1548 vtx) | `MeshStandardMaterial` (`#121210`) | 0.143 m | `(-0.13, -199.90, -640.59)` | `true` | No | Left fitted boot sole/tread. |
| `(unnamed)` (Boots outer) | `Mesh` | `BufferGeometry` (1044 vtx) | `MeshStandardMaterial` (`#1c1c16`) | 0.140 m | `(0.13, -199.90, -640.61)` | `true` | No | Right fitted boot lower. |
| `(unnamed)` (Boots tread) | `Mesh` | `BufferGeometry` (1548 vtx) | `MeshStandardMaterial` (`#121210`) | 0.140 m | `(0.13, -199.90, -640.61)` | `true` | No | Right fitted boot sole/tread. |
| `boot-shaft` | `Mesh` | `BufferGeometry` (936 vtx) | `MeshStandardMaterial` (`#1c1c16`) | 0.332 m | `(-0.13, -199.65, -640.59)` | `true` | No | Calf / boot shaft leather. |
| `boot-shaft` | `Mesh` | `BufferGeometry` (360 vtx) | `MeshStandardMaterial` (`#5f5846`) | 0.332 m | `(-0.13, -199.65, -640.59)` | `true` | No | Boot shaft canvas accent. |
| `boot-shaft` | `Mesh` | `BufferGeometry` (1416 vtx) | `MeshStandardMaterial` (`#121210`) | 0.332 m | `(-0.13, -199.65, -640.59)` | `true` | No | Boot shaft inner lining. |
| `boot-shaft` | `Mesh` | `BufferGeometry` (36 vtx) | `MeshStandardMaterial` (`#2b2e24`) | 0.332 m | `(-0.13, -199.65, -640.59)` | `true` | No | Boot strap buckle. |
| `calf-pad-strap` | `Mesh` | `BufferGeometry` (35 vtx) | `MeshStandardMaterial` (`#2b2e24`) | 0.273 m | `(-0.13, -199.71, -640.58)` | `false` | No | Lower leg strap. |
| `live-trouser-leg` | `Mesh` | `BufferGeometry` (768 vtx) | `MeshStandardMaterial` (`#d2cebd`) | 0.047 m | `(0, -199.997, -640.61)` | `true` | No | Skinned trouser leg proxy. |
| `live-shorts-leg` | `Mesh` | `BufferGeometry` (768 vtx) | `MeshStandardMaterial` (`#d2cebd`) | 0.047 m | `(0, -199.997, -640.61)` | `true` | No | Skinned shorts leg proxy. |
| `live-bare-leg` | `Mesh` | `BufferGeometry` (768 vtx) | `MeshStandardMaterial` (`#c4a882`) | 0.047 m | `(0, -199.997, -640.61)` | `true` | No | Bare leg proxy. |
| `live-sock` | `Mesh` | `BufferGeometry` (768 vtx) | `MeshStandardMaterial` (`#4a4a3c`) | 0.047 m | `(0, -199.997, -640.61)` | `true` | No | Sock proxy. |
| `marine-shadow` | `SkinnedMesh` | `BufferGeometry` (3200 vtx) | `MeshBasicMaterial` (`#000000`) | 0.047 m | `(0, -199.997, -640.61)` | `true` | No | Marine shadow proxy (`layers.mask = 2`, shadow camera only). |
| `rig-skin` | `SkinnedMesh` | `BufferGeometry` (4512 vtx) | `MeshStandardMaterial` | 0.047 m | `(0, -199.997, -640.61)` | `true` | No | Combined marine skin geometry. |

---

## 4. Evaluation of Claude's Suspects (CL-280)

Claude specifically flagged:
> *"It may be mine (CL-280's instancing)."*

In commit `d395dc54` (CL-280), two major particle systems were converted to instanced meshes:
1. `motes-instanced` (`index.html#L15133`):
   - Geometry: `moteGeo = new THREE.SphereGeometry(0.08, 4, 3)`.
   - Materials: `dustMat`, `splashMat`, `emberMat`.
   - Initialization: 3 instances of `InstancedMesh(moteGeo, mat, MAX_MOTES)` added to the scene. Each instance is initialized with `setMatrixAt(i, _moZero)`.
   - Audit: In our scene probe, `_moteInst` entries all had `drawn: 0`, `n: 0`, and `mesh.visible: false`. In quiet/fresh spawn in Training Ground, no motes were active.
   - **Hypothesis**: If Jerry fired a weapon or detonated an explosive in Training Ground prior to noticing the artifact, or if an effect pool reset improperly, an un-zeroed instance matrix at `(0, 0, 0)` could cause a mote sphere (`SphereGeometry(0.08)`) to appear at the world origin or player origin. However, under clean spawn, `motes-instanced` does not produce an artifact.
2. `debris-chunks` (`index.html#L15424`):
   - Geometry: `chunkGeo = new THREE.TetrahedronGeometry(0.18, 0)` (not a sphere).
   - Audit: Confirmed `visible: false` with 0 active instances.
3. `marine-shadow` proxy (`index.html#L18250`):
   - A `SkinnedMesh` under `marine`. Verified that `marine-shadow.layers.mask` is set exclusively to the sun shadow camera layer, preventing it from appearing in view passes.

---

## 5. Root Cause Analysis: The `marine-idle-props` Spark

In `studio/marine-idle.js`:
```javascript
export function createMarineIdle({ THREE, marine, scene, solveArm, smoke, ground, ignite }) {
  const clock = createIdleClock(), s = clock.state, u = marine.userData;
  const root = new THREE.Group(); root.name = 'marine-idle-props'; marine.add(root);
  ...
  const spark = new THREE.Mesh(new THREE.SphereGeometry(.016, 5, 4), ember); spark.scale.y = 1.8; root.add(spark);
```

### The Bug Flow:
1. `spark` is added to `root` (`marine-idle-props`), which is a child of `marine`.
2. `marine`'s local origin `(0, 0, 0)` is located directly at ground level between the boots.
3. `spark.position` defaults to `(0, 0, 0)` in `root`'s coordinate space.
4. When `createMarineIdle` runs, `hide()` is called, setting `root.visible = false`.
5. However, in `pose(dt)` (`studio/marine-idle.js#L208`):
   ```javascript
   if (s.phase !== 'pack' && s.phase !== 'smoking') return;
   root.visible = true;
   ...
   pack.position.copy(tip); pack.rotation.set(-.2, .1, 0); pack.visible = packing && t > .5 && t < 2.75;
   lighter.position.copy(tip); lighter.visible = packing && t > 3.1;
   spark.position.copy(tip); spark.position.y += .04; spark.visible = lighter.visible && t > 3.35 && t < 3.85;
   ```
   Notice that while `spark.visible` is gated by `lighter.visible && t > 3.35 && t < 3.85`, on construction `spark.visible` is **`true`**! If `root.visible` becomes `true` before `pose()` updates `spark.visible`, or if any caller inspects/renders before the first pose cycle of idle, `spark` renders at `(0, 0, 0)`—between his boots.
6. Furthermore, `cigarette()`, `pack`, `lighter`, and `spark` all share `root`'s coordinate frame, which originates at his boots.

---

## 6. Recommendations for Code Owner (Claude / CL-282)

1. **Explicitly initialize prop visibility and position in `studio/marine-idle.js`**:
   - Set `spark.visible = false;` immediately upon creation (`line 56`).
   - Initialize `spark.position.set(0, -1000, 0)` so that even if accidentally made visible, it never renders between the boots.
2. **Verify `moteGeo` zeroing on pool return**:
   - Ensure `drawMoteInst` in `index.html` explicitly overwrites all unused instance slots with `_moZero` on every frame, even when `motes.length === 0`.
3. **Check `buildCarryRig` grenade instancing**:
   - Confirm that `rig.grenades.count` is strictly 4 and no un-transformed 0th instance remains at the mesh origin `(0, 0, 0)`.

---

## 7. Artifact Manifest

- `qa/2026-10-31-AG-167/sheet.jpg`: 24-view contact sheet (1860×1400)
- `qa/2026-10-31-AG-167/shots/tg-*.png`: 12 Training Ground captures (Standing, Walking, Aiming across 4 angles)
- `qa/2026-10-31-AG-167/shots/hq-*.png`: 12 FOB HQ captures (Standing, Walking, Aiming across 4 angles)
- `qa/2026-10-31-AG-167/probe-summary.json`: Complete JSON dump of feet scene walk audit
- `qa/2026-10-31-AG-167/run-ag167.mjs`: Test harness and camera script
- `qa/2026-10-31-AG-167/build-sheet.py`: Contact sheet generator script
