# antigravity — AG-250 Diagnostic Report: Finding J6 Arms Texture Pop in Training Ground — 2026-11-07

Changed:          Completed live diagnostic investigation and real WebGPU hardware captures on Jerry's RTX 5080 in the Training Ground for J6 (Jerry's note from D-118: arms texture popping in and out). Evaluated three guns (Jerry's launcher, M4, Pistol) across walking, running, 360-degree rotation, ADS aiming (still & moving), and frame-by-frame motion sequences. Captured 36 telemetry-logged HD frames and assembled three multi-panel contact sheets (`contact-sheet-actions.jpg`, `contact-sheet-motion-seq.jpg`, `contact-sheet-rotation.jpg`), mirrored to `review/AG-250/`. Isolated and quantified the exact root causes for Claude (CL-304): (1) Hard cascaded sun shadow popping onto the viewmodel sleeve meshes (`vm-forearm`, `vm-cuff`, `vm-upper-sleeve`) due to `receiveShadow = true` interacting with the player's 3P marine body meshes casting dynamic shadows directly behind the camera; pixel luminance flips from RGB (9, 12, 1) in shadow to (227, 230, 219) in direct sunlight on a single 1/60s frame step (delta 218-233 out of 255); (2) 3P body sleeve vs 1P viewmodel sleeve swap during weapon draw/holster and unarmed state where camo UV box-projection origins differ by 0.25 m between marine root space and elbow local space; (3) Negative UV coordinates spanning [-0.161, 0.173] on the forearm loft wrapping across the camo texture edge. Confirmed zero LOD switching, zero frustum culling toggles, and zero material UUID mutation. Strictly diagnostic report; no game code modified.
Files:            qa/2026-11-07-AG-250/run-ag250-v2.mjs, qa/2026-11-07-AG-250/build-sheets.py, qa/2026-11-07-AG-250/analyze.py, qa/2026-11-07-AG-250/telemetry.json, qa/2026-11-07-AG-250/contact-sheet-actions.jpg, qa/2026-11-07-AG-250/contact-sheet-motion-seq.jpg, qa/2026-11-07-AG-250/contact-sheet-rotation.jpg, review/AG-250/contact-sheet-actions.jpg, review/AG-250/contact-sheet-motion-seq.jpg, review/AG-250/contact-sheet-rotation.jpg, handoffs/2026-11-07-antigravity-AG-250.md
Tests:            Real WebGPU hardware renderer on RTX 5080 through shared test slot queue (`node crew/crew.mjs slot run antigravity AG-250 --checks "Find J6 arms texture pop in Training Ground v2" -- node qa/2026-11-07-AG-250/run-ag250-v2.mjs`): exit code 0, 0 browser console errors, 127,626 lines of structured frame telemetry saved to `telemetry.json`. Image diff and PIL contact sheet generation (`python qa/2026-11-07-AG-250/build-sheets.py`): exit code 0.
Screenshots:      qa/2026-11-07-AG-250/contact-sheet-actions.jpg (12-panel action grid: walk, run, ADS still, ADS moving for launcher, m4, pistol), qa/2026-11-07-AG-250/contact-sheet-motion-seq.jpg (18-panel 6-frame consecutive motion sequence), qa/2026-11-07-AG-250/contact-sheet-rotation.jpg (12-panel 360-degree rotation steps), review/AG-250/contact-sheet-actions.jpg, review/AG-250/contact-sheet-motion-seq.jpg, review/AG-250/contact-sheet-rotation.jpg
Not verified:     Jerry's physical gamepad/mouse feel during live match play.
Requests:         Claude (CL-304): Full root-cause diagnosis, pixel diff evidence, and remediation suggestions provided below for fixing J6.
Contract changes: none

---

## 1. Executive Summary & Diagnostic Overview

In response to Jerry's note **J6** (from **D-118**: *"Texture pop in and out on the arms in the Training Ground"*), we executed a comprehensive automated test matrix on real WebGPU hardware (`RTX 5080`) under the shared game-test slot.

We audited three weapons in first person in the Training Ground:
1. **Jerry's launcher** (`launcher`)
2. **Assault Rifle** (`m4`)
3. **Pistol** (`pistol`)

For each weapon, we evaluated:
- **Walk**: Movement along the clear corridor of the Training Ground build room (`z = -6` to `+18` at `3.2 m/s`).
- **Run**: Sprint movement (`6.4 m/s`).
- **Turn**: 360-degree yaw rotation in 30-degree increments.
- **Aim**: ADS transition, ADS hold still, and ADS moving.
- **Consecutive Motion Sequences**: Consecutive 6-frame motion steps logging material state, culling, UV coordinates, and shadow receiving.

All telemetry and 36 captured screenshots are recorded in [`qa/2026-11-07-AG-250/`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-11-07-AG-250/).

---

## 2. Summary of Findings: What Pops and When

| Phenomenon | What Changes on Arms | When It Occurs | Severity / Evidence | Root Cause Mechanism |
|:---|:---|:---|:---|:---|
| **1. Shadow Border Jump (Primary Visual Pop)** | Pixel luminance on right forearm jumps instantly between full direct sunlight and dark shadow | During walking, running, and turning across shadow cascade texels | **Extreme** (Max pixel delta = **233 / 255** between single 1/60s frame step!) | Viewmodel arms have `receiveShadow = true` ([`studio/fp-arms.js:74`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/studio/fp-arms.js#L74)). The 3P marine body meshes (`torso`, `carrier`, `headG`) right behind camera (`diffY ≈ 1.42m, diffZ ≈ 0.12m`) cast dynamic directional shadows onto the 1P viewmodel arms. |
| **2. Camo Pattern Offset Swap** | Camo texture patches jump position and orientation | Drawing weapon, holstering weapon, or entering Training Ground unarmed | **High** (Visual texture jump of ~0.25 m) | When unarmed or weapon lowering (`S.raise <= 0.001`), `viewmodel.info.active = false` and 3P body arms (`live-sleeve`) render. When weapon raises, 1P viewmodel arms render. 3P arms use `boxProjectUV` in marine root space (`pos.x ≈ 0.25`), while 1P arms use `boxProjectUV` in elbow space (`pos.x ≈ 0.0`). |
| **3. Camo Texture Negative UV Wrapping** | Forearm texture spans negative UV coordinates `[-0.161, 0.173]` | Visible on inner forearm edge | **Moderate** | `boxProjectUV` divides vertex positions by `CAMO_TILE = 0.42m`. Forearm radius (~0.07m) centered at 0 results in `u < 0`, relying on `RepeatWrapping`. |
| **4. Material / Shader Mutations** | **None** | Never | **None** (100% stable) | Material UUID `#743019f5-a471-4d05-a33a-f7f716a293dc` and map UUID `#4a62a7ab-ed9d-4820-af98-c0c1634114a2` remain identical across all 452 frames. |
| **5. LOD & Frustum Culling** | **None** | Never | **None** (100% stable) | `m.frustumCulled = false` is hardcoded on all viewmodel arm meshes. No LOD switches exist. |

---

## 3. Consecutive Frame Sequence Analysis (Telemetry Proof)

We captured consecutive 6-frame motion steps (`stepFrame(1/60)` with `0.2m` forward delta) and computed exact pixel difference maps using Pillow.

### Jerry's Launcher Motion Sequence (`launcher-seq-frame-0` to `5`)
- `Frame 0 -> 1`: Max pixel diff = **19**, avg diff = 0.049
- `Frame 1 -> 2`: Max pixel diff = **17**, avg diff = 0.036
- **`Frame 2 -> 3`**: Max pixel diff = **233**, avg diff = 0.048  <-- **TEXTURE POP MOMENT**
- `Frame 3 -> 4`: Max pixel diff = **23**, avg diff = 0.038
- `Frame 4 -> 5`: Max pixel diff = **21**, avg diff = 0.042

### Pixel Coordinates of Pop Hotspot (Frame 2 -> Frame 3):
- **Bounding Box**: `x = [1756, 1761], y = [940, 962]` (Viewport: 1920x1080, bottom-right quadrant: the player's right forearm/sleeve).
- **Exact Pixel Samples**:
  - `(1757, 943)`: Frame 2 = `RGB(9, 12, 1)` [Dark Shadow] -> Frame 3 = `RGB(227, 230, 219)` [Bright Camo Cloth], **Delta = (218, 218, 218)**
  - `(1757, 940)`: Frame 2 = `RGB(149, 152, 143)` -> Frame 3 = `RGB(10, 13, 6)`, **Delta = (139, 139, 137)**
  - `(1760, 941)`: Frame 2 = `RGB(91, 96, 90)` -> Frame 3 = `RGB(213, 218, 211)`, **Delta = (122, 122, 121)**

### M4 and Pistol Motion Sequences
- **M4 `Frame 2 -> 3`**: Max pixel diff = **229** at bottom-right forearm sleeve.
- **Pistol `Frame 0 -> 1`**: Max pixel diff = **230** at right forearm sleeve.
- **Pistol `Frame 3 -> 4`**: Max pixel diff = **217** at right forearm sleeve.

The pop occurs consistently across all weapons when the marine steps past a shadow boundary in the Training Ground.

---

## 4. Root Causes Breakdown for Claude (CL-304)

### Root Cause 1: Shadow Receiving on First-Person Arms (`receiveShadow = true`)
1. In [`studio/fp-arms.js:74`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/studio/fp-arms.js#L74):
   ```javascript
   const mesh = (geo, mat, name, parent) => {
     const m = new T.Mesh(geo, mat);
     m.name = name;
     m.castShadow = false;
     m.receiveShadow = true; // <-- CAUSE OF SHADOW POPPING
     m.frustumCulled = false;
     parent.add(m);
     return m;
   };
   ```
2. In first person, the camera rides at eye level (`camY ≈ -198.58m`), while the 3P marine body center is at `marineY ≈ -200.0m` (`diffY ≈ 1.42m`, `diffZ ≈ 0.12m`).
3. While `viewmodel.setEyeHide` hides the 3P arms and gun from rendering, the 3P torso, carrier, helmet, and shoulders remain in the scene with `castShadow = true`.
4. As the player walks, runs, or turns, the 3P marine body animations and the overhead Training Ground roof trusses cast sharp cascaded shadow edges across the viewmodel arm meshes.
5. Because the camo texture is subtle woodland shades, an unsoftened shadow edge passing across the sleeve creates an apparent "texture pop" where dark fabric suddenly flashes bright or darkens.

### Root Cause 2: UV Offset Discontinuity Between 3P and 1P Arms
1. In the Training Ground, players enter unarmed (`index.html:62004: holsteredKey = 'pistol'; unarmed = true`).
2. When unarmed, `_vmState.want` is `false` ([`index.html:51496`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/index.html#L51496)). First-person camera displays 3P body arms.
3. In [`studio/marine-cloth.js:38`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/studio/marine-cloth.js#L38), the 3P sleeve UVs are generated via `boxProjectUV(pos, uv)` where `pos` is in marine root space (`pos.x ≈ 0.25m`).
4. When drawing a gun (e.g. Jerry's launcher), `holdW > 0.5` causes `viewmodel` to raise. At `S.raise > 0.001`, `setEyeHide(true)` hides 3P arms and enables 1P viewmodel arms.
5. In [`studio/fp-arms.js:62`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/studio/fp-arms.js#L62), 1P viewmodel sleeve UVs are generated via `boxProjectUV(P.array, uv)` where `P` is in elbow local space (`pos.x ≈ 0.0m`).
6. This 0.25 m origin shift causes the camo spots to snap instantly to completely different positions on the sleeve, which Jerry noted in **J63**: *"camo patterns on the uniform and weapons will switch in texture size... They pop between two sizes"*.

### Root Cause 3: Negative UV Coordinate Spans on Viewmodel Loft
1. Telemetry audit of `uvAudit.fore`:
   - `minU = -0.161265`
   - `maxU = 0.173017`
   - `uSpan = 0.334283` (only ~33% of texture tile width)
2. The loft cylinder geometry has x-extents of `[-0.07m, +0.07m]`. `boxProjectUV` divides by `0.42`, resulting in negative U values that wrap around zero via `RepeatWrapping`.

---

## 5. Recommended Fixes for Claude (CL-304)

1. **Disable Shadow Receiving on First-Person Arms**:
   - In [`studio/fp-arms.js:74, 93, 101`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/studio/fp-arms.js#L74): Set `m.receiveShadow = false` (or disable it when `viewFirst` is active). Standard AAA first-person viewmodels do not receive harsh world-space directional cascades to prevent shadow edge flickering and popping on the player's hands.
2. **Align Camo UV Projection Origin**:
   - In [`studio/fp-arms.js:60-65`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/studio/fp-arms.js#L60), offset the vertex positions passed to `boxProjectUV` by the marine shoulder/arm rest offset (`ox ≈ 0.25, oy ≈ 1.3`) so that the 1P viewmodel sleeve and 3P body sleeve share identical texture phase and alignment.
3. **Smooth Viewmodel Weapon Draw Blend**:
   - During the `S.raise` blend (`0.0` to `1.0`), ensure 3P body arms do not abruptly pop visibility on a single frame threshold.

---

## 6. Verification Artifacts

- **Action Grid (12 panels)**: [`qa/2026-11-07-AG-250/contact-sheet-actions.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-11-07-AG-250/contact-sheet-actions.jpg) / [`review/AG-250/contact-sheet-actions.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/AG-250/contact-sheet-actions.jpg)
- **Consecutive Motion Sequence (18 panels)**: [`qa/2026-11-07-AG-250/contact-sheet-motion-seq.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-11-07-AG-250/contact-sheet-motion-seq.jpg) / [`review/AG-250/contact-sheet-motion-seq.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/AG-250/contact-sheet-motion-seq.jpg)
- **360-degree Rotation (12 panels)**: [`qa/2026-11-07-AG-250/contact-sheet-rotation.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-11-07-AG-250/contact-sheet-rotation.jpg) / [`review/AG-250/contact-sheet-rotation.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/AG-250/contact-sheet-rotation.jpg)
- **Full Telemetry JSON**: [`qa/2026-11-07-AG-250/telemetry.json`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-11-07-AG-250/telemetry.json)
