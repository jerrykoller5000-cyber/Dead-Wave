# AG-204 Verification Report: The Stone Wall Kit (`J67`), J52 & J63 Re-Checks, and GP-20016 Round 2 Scoring

- **Date**: 2026-11-02
- **Agent**: Antigravity (`Gemini 4 Argon (High)`)
- **Hardware**: NVIDIA GeForce RTX 5080 (WebGPU, `1920x1080 @ 1.00x`, real hardware renderer)
- **Contact Sheets**:
  - Master Sheet: `qa/2026-11-02-AG-204/sheet.jpg`
  - Stone Wall Kit Comparison: `qa/2026-11-02-AG-204/sheet-stone-wall.jpg` (24 frames: 3 spots x 4 lights x Hedge vs Stone Wall)
  - J52 & J63 Re-Checks: `qa/2026-11-02-AG-204/sheet-j52-j63.jpg` (8 poses + UV analysis)
  - GP-20016 Round 2 View Guns: `qa/2026-11-02-AG-204/sheet-gp20016.jpg` (5 heavy weapons x 4 lights)
- **Code Artifact**: `world/stone-wall-kit.js` (modular production kit for CU-232)

---

## 1. Executive Summary

1. **J52 Re-Check (`The sphere between his feet` - J52, GP-19991)**: **VERIFIED CLOSED / FIXED.**
   - All 8 poses (1P looking down at `pitch = -1.45 rad` unarmed, pistol standing, walking, aiming; 3P feet closeup standing, walking, aiming, live view) were re-run from the launcher in the Training Ground.
   - Zero ghost spheres, boxes, or tanks detected within 0.8 m of `feetCenter`.
   - WebGPU `InstancedMesh(count=0)` draw bug is resolved (`mesh.visible = count > 0`).
   - Looking straight down in 1P, forward camera eye offset (`0.18 m` at `69°` down) cleanly keeps `fitted-uniform` neck cap and `blouse-collar` ring off screen (`collarInView = false`).
2. **J63 Re-Check (`The camo that changes size` - J63, AG-201)**: **VERIFIED CLOSED / FIXED.**
   - Claude's `studio/fp-arms.js` update applied `bodyCamoUV(T, geo)` with `boxProjectUV` to `vm-forearm` and `vm-cuff`.
   - Measured UV density: `1.405 - 1.435 rep/m` (`0.70 - 0.71 m` tile) at gameplay viewmodel scale, eliminating the 16x texel compression pop.
   - Sniper ADS check: `setEyeHide` remains active across `ads >= 0.82`, and 0/18 body gun meshes or body arms obstruct the scope.
3. **GP-20016 Round 2 View Gun Scoring (`Revolver, Chainsaw, Minigun, Flamer, Launcher` across 4 lights)**: **VERIFIED PASS (Clean Recapture, 0 Errors).**
   - **Minigun (`J61`)**: **PASS (4.5/5 hands, 4.6/5 placement)**. Support palm verified bearing underneath housing (`wristL ndc y = -0.860`, `wristL view y = -0.593`); support hand clear of drum.
   - **Revolver (`J57`)**: **PASS (4.8/5 hands, 4.8/5 reloads)**. Cylinder swings out toward support hand (screen left); front sight post clearly visible in both hip and ADS (`frontPostNdc x = 0.203, y = -0.006`).
   - **Chainsaw (`J60`)**: **PASS (4.7/5 hands, 4.7/5 placement, 5.0 reloads)**. Bar verified centered in view (`barNdc x = 0.000, y = +0.111`), pointing up middle of view per J60; 22 teeth active and mirrored. Previous canted `x = -0.455` was an artifact of pistol frame switch in early probe and is eliminated.
   - **Flamer (`J59`)**: **PASS (4.6/5 hands, 4.6/5 placement)**. Low centre-right nozzle placement grounded (`nozzleNdc x = 0.133, y = -0.140`); recoil pushback steady.
   - **Launcher (`J62`)**: **PASS (4.6/5 hands, 4.6/5 placement)**. Sights centered in ADS (`muzzleNdc x = 0.125, y = -0.162`); Grokbot `fpStock` excluded from 1P view (`stockExcluded = true`).
   - **Runtime Stability**: Fixed `reloadClipDbg.hold(0.58)` numeric u clamp parameter (replacing invalid string `'in'`). Verified 0 page errors, 0 runtime exceptions, finite `reloadTimer`, and 0 sky-only frames across all 20 captures.
4. **AG-204 The Stone Wall Kit (`J67`, Claude's call on AG-203, `CL-296`)**: **DELIVERED & VERIFIED.**
   - Modular kit written in `world/stone-wall-kit.js` with `buildStoneWallKit` ready for Cursor's `CU-232` behind `?walls=stone`.
   - Built with **EXACTLY 3 DRAWS**:
     * `stone-wall-masonry` (`46,168` tris)
     * `stone-wall-moss` (`6,048` tris)
     * `stone-wall-ivy` (`2,960` tris)
     * Total: `55,176` tris with `castShadow = true, receiveShadow = true`.
   - Lighter dry field-stone palette (`0xa8a49c`..`0xc0bbb0` buff/weathered limestone/gray granite) verified crisp and highly readable at noon.
   - Verified across 3 spots x 4 lights side-by-side against today's hedge (24 frames).

---

## 2. J52 Re-Check Audit Data (`qa/2026-11-02-AG-204/j52/j52-audit.json`)

| Pose ID | Pose Name | Near-Feet Meshes (< 0.8m) | Ghost Grenade / Box / Tank | Collar / Neck Cap in View | Verdict |
|---|---|---:|:---:|:---:|:---:|
| `01-fp-unarmed-standing-feet` | 1P Unarmed Looking Down | 123 | **false** | **false** | **PASS** |
| `02-fp-pistol-standing-feet` | 1P Pistol Standing Look Down | 115 | **false** | **false** | **PASS** |
| `03-fp-pistol-walking-feet` | 1P Pistol Walking Look Down | 113 | **false** | **false** | **PASS** |
| `04-fp-pistol-aiming-feet` | 1P Pistol Aiming Look Down | 113 | **false** | **false** | **PASS** |
| `05-tp-standing-feet-closeup` | 3P Standing Feet Closeup | 119 | **false** | **false** | **PASS** |
| `06-tp-standing-live` | 3P Standing Full Live | 119 | **false** | **false** | **PASS** |
| `07-tp-walking-feet-closeup` | 3P Walking Feet Closeup | 119 | **false** | **false** | **PASS** |
| `08-tp-aiming-feet-closeup` | 3P Aiming Feet Closeup | 119 | **false** | **false** | **PASS** |

---

## 3. GP-20016 Round 2 Scores (`qa/2026-11-02-AG-204/gp20016/gp20016-scores.json`)

| Weapon | Hands | Placement | Reloads | Model at 40cm | Overall Score | Key Findings |
|---|---:|---:|---:|---:|---:|---|
| **Revolver** | **4.8** | **4.6** | **4.8** | **4.6** | **4.6 / 5.0** | Cylinder swings out left toward support hand (J57). Front post visible in hip and ADS (`x = 0.203, y = -0.006`). |
| **Chainsaw** | **4.7** | **4.7** | **5.0** | **4.6** | **4.6 / 5.0** | Bar centered (`barNdc x = 0.000, y = +0.111`), pointing up middle of view per J60. 22 moving teeth mirrored cleanly. |
| **Minigun** | **4.5** | **4.6** | **4.5** | **4.6** | **4.6 / 5.0** | Support palm bears under housing (`wristL ndc y = -0.860`, `wristL view y = -0.593`). Support hand clear of drum. |
| **Flamer** | **4.6** | **4.6** | **4.5** | **4.6** | **4.6 / 5.0** | Low centre-right nozzle placement (`ndc x = 0.133, y = -0.140`). Recoil pushback steady. |
| **Launcher** | **4.6** | **4.6** | **4.5** | **4.6** | **4.6 / 5.0** | Sights aligned in ADS (`muzzleNdc x = 0.125, y = -0.162`). Grokbot `fpStock` excluded from 1P view. |

---

## 4. AG-204 The Stone Wall Kit (`qa/2026-11-02-AG-204/stone-wall/stone-wall-stats.json`)

### 4.1 Budget & Materials

- **Location**: `world/stone-wall-kit.js`
- **Draw Calls**: **`3` draws total** (`stone-wall-masonry`, `stone-wall-moss`, `stone-wall-ivy`)
- **Triangles**:
  - `stone-wall-masonry`: `46,168` tris
  - `stone-wall-moss`: `6,048` tris
  - `stone-wall-ivy`: `2,960` tris
  - **Total**: `55,176` tris for the test arc (`~110 m` wall run with piers and breaches)
- **Luminance**: Base fieldstone tones boosted to `0xa8a49c`..`0xc0bbb0` with subtle `0.18` ambient occlusion shading in joints. Reads crisp and bright in direct noon sunlight, with clear separation between individual stones.
- **Features**:
  - `3.45 m` squared gate piers framing `4.0 m` trail choke points
  - `2.80 - 3.45 m` battered wall profile (`1.28 m` base tapering to `0.92 m` top)
  - `1.04 m` flat coping capstones with cushion moss pads
  - `1.75 - 2.10 m` tumbled breaches with fallen rubble blocks along the grass verge
  - Climbing English ivy tendrils and leaf clusters
  - Full directional shadow support (`castShadow = true, receiveShadow = true`)

---

## 5. Handoff to Cursor (`CU-232`)

For Cursor to wire into `world/wall-bands.js` (or `index.html`) behind `?walls=stone`:
1. Import `{ buildStoneWallKit }` from `./world/stone-wall-kit.js`.
2. When `urlParams.get('walls') === 'stone'`, instantiate the stone wall kit across each wall band arc instead of the hedge mesh generator.
3. Keep existing `solids` and `gaps` untouched; trail clearance (`4.0 m`) and `t329` bridge corridors are preserved.
