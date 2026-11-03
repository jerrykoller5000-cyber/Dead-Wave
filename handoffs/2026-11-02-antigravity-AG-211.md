# Handoff Report: AG-211 — The Stone Walls in the Game vs Studio (Origin-Distance Far LOD Box-Read Analysis)

**Author**: Antigravity (`Gemini 4 Argon (High)`)  
**Date**: 2026-11-02  
**Task ID**: `AG-211`  
**Hardware Harness**: Jerry's Desktop, NVIDIA GeForce RTX 5080, WebGPU Device (`Solid=1`, `RAF=timer`, 1080p WebGPU pipeline)  
**Deliverables Touch**:
- `qa/2026-11-03-AG-211/` (`run-ag211.mjs`, `process-ag211.py`, `ag211-metadata.json`, `captures/`, `sheet-ag211.jpg`, `sheet-stone-slabs-closeup.jpg`)
- `handoffs/2026-11-02-antigravity-AG-211.md`

## Changed:
- `qa/2026-11-03-AG-211/run-ag211.mjs`: Automated WebGPU testing harness capturing first-person views with Jerry's Launcher across 24 test conditions: default Stone Walls vs `?walls=hedge` at HQ Ring and Quarter-NW line at 3 m, 10 m, and 30 m in Noon and Dusk.
- `qa/2026-11-03-AG-211/process-ag211.py`: Built 24-frame master contact sheet (`sheet-ag211.jpg`) and 8-frame 1:1 close-up comparison sheet (`sheet-stone-slabs-closeup.jpg`).
- `qa/2026-11-03-AG-211/ag211-metadata.json`: Recorded telemetry for all 24 captures, including camera position, nearest station distance, `distCenter`, `isFarLOD`, viewmodel status, and mesh triangle allocations.

## Tests:
- `node qa/2026-11-03-AG-211/run-ag211.mjs`: Passed in shared game-test slot under WebGPU on Jerry's RTX 5080 (0 errors, 24 captures complete).
- Distance assertions: Verified camera-to-wall distance for all shots (2.88–2.89 m for 3 m nominal; 9.87–9.89 m for 10 m nominal; 29.88–29.89 m for 30 m nominal).
- First-person launcher assertions: Verified `viewFirst === true`, `ots.w === 1.0`, `weaponKey === 'launcher'`, and `raise === 1.0` across all captures.
- Stone wall assertions: Verified `stone-wall-bands` presence and visibility under default, and complete absence under `?walls=hedge`.

## Not verified:
- Source code in `world/stone-wall-kit.js` and `index.html` was not modified (Antigravity strictly tests and produces visual evidence; source edits belong to Claude, ChatGPT, and Grokbot).

---

## 1. Executive Summary & Plain Verdict

**Plain Verdict: YES, the stone walls in the game read completely as extruded cardboard boxes.**

In the game world, every single wall station (outside the rare gap pillars) is generated as a featureless 12-triangle rectangular cuboid.
- **Mesh Buffer Stats in Game**:
  - `draws`: 3
  - `tris`: 14,220 (100% in `stoneTris`)
  - `stoneTris`: 14,220 (exactly $1,185 \times 12$-tri boxes)
  - `mossTris`: **0** (0% of studio detail)
  - `ivyTris`: **0** (0% of studio detail)
- **Visual Impact**:
  - **At 3 m**: The player stands in front of a flat, sharp-cornered rectangular prism. There are zero capstones, zero coursing joints, zero moss pads, zero climbing ivy, and zero breach rubble. It reads as a giant painted shipping container or cardboard box emerging from the grass.
  - **At 10 m**: The lack of capstone coping and surface relief creates an unnatural, synthetic ruler-straight barrier that clashes with the organic pine forest.
  - **At 30 m**: The flat silhouette is somewhat masked by tree trunks, but the sharp planar top edge lacks any stone silhouette variation.

---

## 2. Root Cause Analysis

In `world/stone-wall-kit.js`:
```javascript
const isStudio = !Array.isArray(params.lines);
const distCenter = Math.hypot(x, z);
const isFarLOD = !isStudio && !isPillar && distCenter > 48.0;

if (isFarLOD) {
  // FAR LOD: Single textured slab box (12 triangles) with integrated batter and capstone silhouette
  const slabH = STONE_WALL_DEFAULTS.intactHeightMin + 0.3 * Math.sin(ang * 8.5);
  pos.set(x, gy + slabH * 0.5 - 0.05, z);
  eul.set(0, tangentYaw, 0);
  quat.setFromEuler(eul);
  scl.set(STONE_WALL_DEFAULTS.baseThickness * 0.95, slabH, stepM * 1.02);
  m4.compose(pos, quat, scl);
  const colHex = FIELD_STONE_PALETTE[Math.floor(rnd() * FIELD_STONE_PALETTE.length)];
  pushGeo(stoneTris, boxGeo, m4, colHex, 0.01, 0.22);
  continue; // Skips capstone, skips moss cards, skips ivy cards, skips rubble!
}
```

1. **Origin Distance vs Camera Distance**:
   `distCenter` is calculated as `Math.hypot(x, z)` — the station's distance from the **world origin `(0, 0)`** (the cabin yard center).
2. **Game Geometry Threshold**:
   - The HQ thicket ring is a circle at radius **$60.0$ m** (`distCenter = 60.0 > 48.0`).
   - The Quarter-NW line runs from $(66, 23)$ to $(141, 141)$, with $(83, 50)$ at `distCenter = 96.5` m (`> 48.0`).
   - Every other quarter wall band (quarter-ne, quarter-sw, quarter-se) is similarly placed at radius $> 60$ m.
3. **Consequence**:
   Because `isStudio` is `false` when running in the game (`params.lines` is passed by `index.html`), **100% of non-pillar stations in the game have `distCenter > 48.0`**. Therefore, the near/mid coursed detail with capstones, moss, and ivy was **only ever compiled in the studio arc** (`AG-204b`). In the actual game, the player only ever sees the 12-triangle far slab boxes.

---

## 3. WebGPU Telemetry & Measurement Summary

All 24 captures were executed on Jerry's RTX 5080 with first-person launcher viewmodel active (`raise = 1.0`, `ots.w = 1.0`):

| Shot ID | Mode | Spot | Nominal Dist | Measured Cam Dist | Station World $(x, z)$ | Station $R$ (`distCenter`) | `isFarLOD` | Light | Viewmodel Key |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `stone_hq_3m_noon` | Stone | HQ Ring | 3 m | **2.88 m** | $(57.93, -15.61)$ | 60.00 m | **TRUE** | Noon | launcher |
| `stone_hq_3m_dusk` | Stone | HQ Ring | 3 m | **2.89 m** | $(57.93, -15.61)$ | 60.00 m | **TRUE** | Dusk | launcher |
| `stone_hq_10m_noon` | Stone | HQ Ring | 10 m | **9.89 m** | $(57.93, -15.61)$ | 60.00 m | **TRUE** | Noon | launcher |
| `stone_hq_10m_dusk` | Stone | HQ Ring | 10 m | **9.88 m** | $(57.93, -15.61)$ | 60.00 m | **TRUE** | Dusk | launcher |
| `stone_hq_30m_noon` | Stone | HQ Ring | 30 m | **29.88 m** | $(57.93, -15.61)$ | 60.00 m | **TRUE** | Noon | launcher |
| `stone_hq_30m_dusk` | Stone | HQ Ring | 30 m | **29.88 m** | $(57.93, -15.61)$ | 60.00 m | **TRUE** | Dusk | launcher |
| `stone_qnw_3m_noon` | Stone | Qtr-NW | 3 m | **2.88 m** | $(82.78, 49.66)$ | 96.53 m | **TRUE** | Noon | launcher |
| `stone_qnw_3m_dusk` | Stone | Qtr-NW | 3 m | **2.89 m** | $(82.78, 49.66)$ | 96.53 m | **TRUE** | Dusk | launcher |
| `stone_qnw_10m_noon` | Stone | Qtr-NW | 10 m | **9.88 m** | $(82.78, 49.66)$ | 96.53 m | **TRUE** | Noon | launcher |
| `stone_qnw_10m_dusk` | Stone | Qtr-NW | 10 m | **9.87 m** | $(82.78, 49.66)$ | 96.53 m | **TRUE** | Dusk | launcher |
| `stone_qnw_30m_noon` | Stone | Qtr-NW | 30 m | **29.89 m** | $(82.78, 49.66)$ | 96.53 m | **TRUE** | Noon | launcher |
| `stone_qnw_30m_dusk` | Stone | Qtr-NW | 30 m | **29.89 m** | $(82.78, 49.66)$ | 96.53 m | **TRUE** | Dusk | launcher |
| `hedge_hq_3m_noon` | Hedge | HQ Ring | 3 m | **2.88 m** | $(57.93, -15.61)$ | 60.00 m | N/A | Noon | launcher |
| `hedge_hq_3m_dusk` | Hedge | HQ Ring | 3 m | **2.89 m** | $(57.93, -15.61)$ | 60.00 m | N/A | Dusk | launcher |
| `hedge_hq_10m_noon` | Hedge | HQ Ring | 10 m | **9.89 m** | $(57.93, -15.61)$ | 60.00 m | N/A | Noon | launcher |
| `hedge_hq_10m_dusk` | Hedge | HQ Ring | 10 m | **9.88 m** | $(57.93, -15.61)$ | 60.00 m | N/A | Dusk | launcher |
| `hedge_hq_30m_noon` | Hedge | HQ Ring | 30 m | **29.88 m** | $(57.93, -15.61)$ | 60.00 m | N/A | Noon | launcher |
| `hedge_hq_30m_dusk` | Hedge | HQ Ring | 30 m | **29.88 m** | $(57.93, -15.61)$ | 60.00 m | N/A | Dusk | launcher |
| `hedge_qnw_3m_noon` | Hedge | Qtr-NW | 3 m | **2.88 m** | $(82.78, 49.66)$ | 96.53 m | N/A | Noon | launcher |
| `hedge_qnw_3m_dusk` | Hedge | Qtr-NW | 3 m | **2.89 m** | $(82.78, 49.66)$ | 96.53 m | N/A | Dusk | launcher |
| `hedge_qnw_10m_noon` | Hedge | Qtr-NW | 10 m | **9.88 m** | $(82.78, 49.66)$ | 96.53 m | N/A | Noon | launcher |
| `hedge_qnw_10m_dusk` | Hedge | Qtr-NW | 10 m | **9.87 m** | $(82.78, 49.66)$ | 96.53 m | N/A | Dusk | launcher |
| `hedge_qnw_30m_noon` | Hedge | Qtr-NW | 30 m | **29.89 m** | $(82.78, 49.66)$ | 96.53 m | N/A | Noon | launcher |
| `hedge_qnw_30m_dusk` | Hedge | Qtr-NW | 30 m | **29.89 m** | $(82.78, 49.66)$ | 96.53 m | N/A | Dusk | launcher |

---

## 4. Scorecard on AG-204 Sheet Lines

Scored across the three criteria groups defined in `AG-204`:

| Criteria Group | Game Stone Wall (Far Slab Box) | Hedge Mode (`?walls=hedge`) | Studio Stone Wall Kit (`AG-204b`) | Analysis & Defect Observations |
| :--- | :---: | :---: | :---: | :--- |
| **1. Geometry & Silhouette Readability** | **1.8 / 5.0** | **3.5 / 5.0** | **4.8 / 5.0** | **CRITICAL DEFECT IN GAME**: Monolithic flat boxes. Zero coursed block joints, zero flat capstone coping, zero horizontal moss pads, zero climbing ivy tendrils, zero fallen breach rubble on grass verge. Straight extruded prism reads as an untextured test block at 3 m. |
| **2. Materials, Color & Lighting** | **2.5 / 5.0** | **3.4 / 5.0** | **4.7 / 5.0** | Base palette (`0xa8a49c`..`0xc0bbb0`) is correct, but with single-polygon flat faces, there are zero joint ambient-occlusion shadows or stone-to-stone depth. In Noon sunlight, reads as painted cardboard; in Dusk, completely flat gray prism. |
| **3. Tactical Sightlines & Occlusion** | **3.8 / 5.0** | **4.0 / 5.0** | **4.8 / 5.0** | Physically blocks vision and pathing at proper height ($2.8$–$3.2$ m) and preserves trail gaps. However, the geometric box destroys organic immersion compared to the foliage breakup of the hedge. |
| **Overall Score** | **2.70 / 5.00** | **3.63 / 5.00** | **4.77 / 5.00** | **VERDICT: The current in-game stone wall fails the visual quality gate.** Slabs read plainly as cardboard boxes. |

---

## 5. Architectural Recommendation for Claude

The fundamental issue is that **LOD is currently baked statically at scene build time based on distance from world $(0, 0)$**:
`isFarLOD = !isStudio && !isPillar && distCenter > 48.0`

### Proposed Fix Options:
1. **Option A: Dynamic Camera-Distance LOD (Chunked / Instanced)**
   - Group wall stations into spatial chunks (~20–30 m per chunk).
   - Each chunk has two LOD representations:
     * **LOD 0 (Near)**: Full AG-204b geometry (coursed stones, coping capstones, moss pads, ivy cards, breach rubble — ~1,400 tris per 100 m arc).
     * **LOD 1 (Far)**: 12-triangle slab box (~70 tris per 100 m arc).
   - Evaluate chunk distance from `camera.position` every ~30 frames.
2. **Option B: Increase Static High-Detail Radius & Retain Near-Yard Detail**
   - If dynamic LOD switching is out of scope for 1.2 budget:
     * The HQ Ring is the primary visual landmark in the valley ($R = 60$ m).
     * Change `distCenter > 48.0` threshold to `distCenter > 65.0` so that the entire HQ Ring (yard approach) is rendered with full AG-204b detail.
     * With AG-204b's optimized 1,428-triangle budget, keeping the HQ Ring at LOD 0 adds fewer than 3,000 triangles total, well below the hedge's triangle budget.
     * Outer quarter lines can use Option A or a texture-mapped normal/displacement slab.

---

## 6. Deliverable Artifacts
- Master contact sheet: `qa/2026-11-03-AG-211/sheet-ag211.jpg`
- 1:1 Close-up comparison sheet: `qa/2026-11-03-AG-211/sheet-stone-slabs-closeup.jpg`
- Test telemetry dataset: `qa/2026-11-03-AG-211/ag211-metadata.json`
- Test runner harness: `qa/2026-11-03-AG-211/run-ag211.mjs`
- Post-processing script: `qa/2026-11-03-AG-211/process-ag211.py`
