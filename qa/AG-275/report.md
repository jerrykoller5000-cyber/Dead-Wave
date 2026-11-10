# AG-274 / J95 — The Camo That Changes Size Again (M81 Density Pop on RTX 5080 WebGPU)

**Date:** 2026-11-10  
**Inspector:** Antigravity (`Gemini 4 Argon (High)`)  
**Hardware:** NVIDIA GeForce RTX 5080 (WebGPU Hardware Accelerated, Native Resolution 1920x1080)  
**Slot Allocation:** Verified under single-instance slot allocation via token authorization (`node crew/crew.mjs slot run antigravity AG-275 ...`).  
**Artifacts:**  
- Master Diagnostic Contact Sheet: `qa/AG-274/ag274-camo-pop-sheet.jpg` (mirrored `qa/AG-275/ag274-camo-pop-sheet.jpg`)  
- JSON Audit Telemetry: `qa/AG-274/camo-probe.json` (mirrored `qa/AG-275/camo-probe.json`)  
- Raw comparison frames: `qa/AG-274/01-facing-range-hip.png`, `02-facing-range-ads.png`, `03-facing-hq-hip.png`, `04-facing-hq-ads.png`, `turn-hip-0` through `turn-hip-4`, and candidate isolation frames `iso-00` through `iso-04`.

---

## 1. Executive Summary & Diagnostic Findings

In J95 (Jerry playtest 10 Nov), Jerry observed that with the Tactical Pistol equipped in first person on the Training Ground, facing the HQ/CIF side (photo 1: `Claude outputs/j95/1-hip-hq.png`) caused the M81 woodland camo on the forearm sleeves to appear ~5x denser and sharp (blobs ~1.5 cm), whereas facing the range (photo 2: `Claude outputs/j95/2-ads-range.png`) displayed the normal 0.42 m tile (blobs ~10 cm).

Our live WebGPU audit on Jerry's RTX 5080 confirms the root cause:

1. **The 1P Viewmodel Arm Meshes Are Clean & Invariant Across Facings (`rep/m = 2.324–2.380`, Tile `0.42–0.43 m`):**
   - At both facings (Range at `yaw = 0` and HQ at `yaw = PI`), `vm().arms.r.meshes.fore` maintains an exact world UV edge ratio of **`2.324 rep/m` (`0.430 m` tile)**, matching CL-304's `bodyCamoUV` box projection.
   - `vm().arms.r.meshes.upper` maintains **`2.380 rep/m` (`0.420 m` tile)**.
   - `vm().arms.r.meshes.cuff` maintains **`2.104 rep/m` (`0.475 m` tile)**.
   - `vm().info.active = true` and `vm().filtering = true` at both facings.

2. **The 3P Marine Body Behind the Camera Is NOT Culled by `isEyeHidden` (`liveSleeveEyeHidden = false`):**
   - When facing the range (`yaw = 0`), the player looks North (-Z), away from the 3P torso, shoulders, and back gear.
   - When facing HQ/CIF (`yaw = Math.PI`), the player turns South (+Z). Because `setEyeHide` is inactive on `live-sleeve-live` and the 3P body shoulders/torso, the 3P marine body meshes sit directly behind and through the camera origin (distance `0.22 m` to `0.58 m` from `camera.position`).

3. **Which Candidate Carries the Fine Pattern (Candidate Isolation):**
   - The fine pattern (~1.5 cm blobs, `rep/m = 36.99–145.3`, tile `0.007–0.027 m`) is carried by the **unmerged scaled child uniform parts and shadow caster proxy (`rig-skin`) on the 3P marine body**:
     - `wear:shirt` scaled child meshes under the torso (`wScale = 0.0565`, `rep/m = 36.994`, **`0.027 m` tile — 16x denser**).
     - Carried/stowed gear and accessories (`carried-m240`, `katana-habaki`, `wear:belt`, `wear:holster`) having unprojected UVs (`rep/m = 11.1–374.9`).
   - When facing South/HQ, these 3P body meshes protrude into the 1P camera near-frustum right behind the viewmodel forearms. When WebGPU draws the frame, the high-density child meshes and shadow proxy geometry clip through the 1P sleeve, creating the fine, dense camo pattern Jerry photographed in `1-hip-hq.png`.

---

## 2. Telemetry & Probe Data Summary

### 2.1 View Arms Telemetry (`camo-probe.json`)
| Parameter | Facing Range (`yaw = 0`) | Facing HQ/CIF (`yaw = PI`) | Expected (CL-304) | Status |
|---|---|---|---|---|
| `vm.info.active` | `true` | `true` | `true` | OK |
| `vm.filtering` | `true` | `true` | `true` | OK |
| `vm.arms.r.fore` visible | `true` | `true` | `true` | OK |
| `vm.arms.r.fore` `rep/m` | **`2.324 rep/m` (`0.430 m`)** | **`2.324 rep/m` (`0.430 m`)** | `~2.38 rep/m` | OK |
| `vm.arms.r.upper` `rep/m` | **`2.380 rep/m` (`0.420 m`)** | **`2.380 rep/m` (`0.420 m`)** | `~2.38 rep/m` | OK |
| `vm.arms.r.cuff` `rep/m` | **`2.104 rep/m` (`0.475 m`)** | **`2.104 rep/m` (`0.475 m`)** | `~2.38 rep/m` | OK |
| `liveSleeveEyeHidden` | `false` | `false` | `true` in 1P | **DEFECT** |

### 2.2 Near Frustum Camo Meshes (<0.8m from Camera)
- **Facing Range:** Only viewmodel meshes present within 0.8m (distance `0.458–0.590 m`). Zero extraneous body geometry.
- **Facing HQ:** Over 35 additional 3P marine body meshes penetrate within `0.224–0.712 m` of the camera, including `carried-m240` (`rep = 12.5–374.9`), `katana` (`rep = 11.1–238.1`), `wear:holster` (`rep = 13.38`), and `wear:belt` (`rep = 125.0`).

---

## 3. Recommended Fix for Claude (Uniform / Viewmodel Side)

In `game/viewmodel.js` and `index.html`:
1. Ensure `setEyeHide(true)` hides the entire 3P body upper torso, shoulders, `live-sleeve`, and `live-sleeve-live` whenever `viewmodel.info.active` is true.
2. In `studio/marine-body.js` / `studio/marine-skin.js`, ensure `rig-skin` (shadow proxy, `layers.mask = 2`) is excluded from primary camera rendering and that child meshes under scaled ancestors have their world scale baked before UV projection.
