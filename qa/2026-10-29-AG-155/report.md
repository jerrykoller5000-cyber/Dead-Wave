# AG-155: Brandt Beard Visual Score & Pixel Review (GP-19981)

- **Date**: 2026-10-29
- **Reviewer**: Antigravity (`Gemini 4 Argon (High)`)
- **Task Evaluated**: ChatGPT's `GP-19981` (`ui/marine-face.js` `buildSurvivorBeard`)
- **Hardware & Environment**: `ANGLE (NVIDIA, NVIDIA GeForce RTX 5080 (0x00002C02) Direct3D11 vs_5_0 ps_5_0, D3D11)`, native Inspector (`DWInspect`), resolution `1600×900`.
- **Inputs Compared**: `handoffs/GP-19981/before/` vs `handoffs/GP-19981/after11/` (10 matched views across noon, overcast, dusk, night, full-front, and gameplay).
- **Artifacts Generated**:
  - `qa/2026-10-29-AG-155/contact-sheet.jpg` (Full before/after visual comparison across 5 key views)
  - `qa/2026-10-29-AG-155/float-defect-zoom.jpg` (High-resolution pixel pinpoint of profile float defect)
  - `qa/2026-10-29-AG-155/metrics.json` (Structured color, triangle, and pixel coordinate metrics)
  - `qa/2026-10-29-AG-155/*-compare.jpg` (Side-by-side comparison crops for each shot)

---

## Executive Summary

ChatGPT's `after11` sculpt in `ui/marine-face.js` represents a major visual leap over the legacy beard. The flat, oversaturated orange chin wedge (`83.8%` saturation) with drawn-on lines and detached facial bars has been replaced by a sculpted, organic beard mass in muted auburn-brown (`0x765247`, `39.8%` HSV base saturation).

At standard gameplay distance (`8 m`) and full-body front view (`3.5 m`), the asset easily passes with **4.5/5**. However, a **sub-4 defect (`3.5/5`)** was identified in the **close 90° side profile (`brandt-noon-close-side.jpg`)**: the new lip-following moustache lobes (`addGrid` placed at `z = 0.174`) form an open front ribbon with no lateral/rear depth return to the face mesh (`z ≈ 0.155`), leaving a **72-pixel detached floating sliver** separated from the face by a **19-to-21 pixel daylight gap of background sky**.

---

## Scorecard (per `docs/asset-principles.md` & `docs/art-direction.md`)

| Category | Score (0–5) | Verdict | Visual Analysis |
| :--- | :---: | :---: | :--- |
| **Silhouette (Gameplay & Full)** | **4.5 / 5** | `PASS` | Reads immediately as trimmed survivor facial hair beneath the boonie hat and aviator glasses at 8 m gameplay scale and 3.5 m full view. |
| **Silhouette & Proportions (Close Front)** | **4.0 / 5** | `PASS` | 6-tier jaw surface widens chin/jaw by `+18px` to `+24px` over baseline. Natural taper up cheekbones into narrow sideburns. Lower sinusoidal tufts effectively break the circular helmet hem. |
| **Material & Color Response** | **4.5 / 5** | `PASS` | Muted auburn-brown (`0x765247`, HSV `39.8%` saturation) brings facial hair under the `45%` cap mandated by `docs/art-direction.md` §3. Zero plastic specular shine (`roughness 0.86`, `metalness 0`). Solid response across noon, overcast, dusk, and night. |
| **Geometry Efficiency & Budget** | **5.0 / 5** | `PASS` | 40,458 tris vs 40,322 before (`+136` tris total). Single unified mesh buffer; draw calls unchanged at 16. Zero impact on frame budget. |
| **Close 90° Profile Integration** | **3.5 / 5** | **`SUB-4 DEFECT`** | Moustache ribbon at `z = 0.174` stands `~1.8 cm` proud of upper lip without depth returns, producing a detached floating sliver in pure profile view. |
| **Legacy Bar Separation** | **4.5 / 5** | `PASS` | Moustache ridge at `z = 0.174` completely masks legacy `index.html` bars in front view. Redundant bars can be safely deleted by Claude without affecting `ui/marine-face.js`. |

---

## Detailed Visual Findings

### 1. Color & Saturation Verification (`docs/art-direction.md` §3)
- **Baseline (`before`)**:
  - Noon Close-Front Chin Mean RGB: `[51.7, 23.1, 10.9]` (Hue: `18.1°`, Saturation: `83.8%`, 95th-percentile: `92.3%`).
  - Read as synthetic, oversaturated orange paint that conflicted with the Military family palette.
- **After11 (`after11`)**:
  - Base Material Hex: `0x765247` (`RGB: [118, 82, 71]`, Hue: `14°`, Saturation: `39.8%`, Value: `46.3%`).
  - Noon Close-Front Chin Mean RGB: `[47.1, 29.4, 24.6]` (Hue: `12.4°`, Saturation: `48.8%`, 95th-percentile: `61.9%` with lighting bounce).
  - Overcast Close-Front Chin Mean RGB: `[53.2, 36.1, 31.2]` (Hue: `13.2°`, Saturation: `41.6%`, 95th-percentile: `44.4%`).
  - **Verdict**: Fully satisfies the `≤ 45%` base saturation rule for natural surfaces. Auburn hue harmonizes with Brandt's olive drab uniform and woodland camo boonie hat.

### 2. Silhouette & Construction
- **Cross-Sectional Mass**:
  - `y = 620` (lower lip / jawline): Beard width expanded from `340px` to `358px` (`+18px`).
  - `y = 660` (jaw / chin core): Beard width expanded from `302px` to `326px` (`+24px`).
  - `y = 700` (chin base): Beard width expanded from `231px` to `242px` (`+11px`).
  - `y = 730` (ragged hem): Width `211px` with organic sinusoidal edge displacements (`±2.8 mm`).
- **Jaw Mandible Wrap**:
  - In `noon-close-side.jpg`, the jaw surface wraps cleanly from chin back toward the ears (`x = 495..686, y = 560..720`).
  - No clipping into the neck or colliders; no gaps along the lower mandibular boundary.

---

## Sub-4 Defect: Moustache Profile Float (`qa/2026-10-29-AG-155/float-defect-zoom.jpg`)

- **View**: `brandt-noon-close-side.jpg` (and matching `overcast`/`dusk` close-side profile shots).
- **Exact Coordinates**:
  - Floating sliver: `x = 492..495, y = 577..602` (`72` pixels).
  - Background daylight gap: `x = 496..514, y = 577..602` (`19` pixels wide across `26` rows).
  - Face profile skin surface: `x = 515..531, y = 577..602`.
- **Root Cause in `ui/marine-face.js`**:
  - Lines 217–227:
    ```javascript
    for (const side of [-1, 1]) addGrid(2, 10, (u, v) => {
      const x = side < 0 ? -.063 + .059 * u : .004 + .059 * u;
      const p = (Math.abs(x) - .004) / .059;
      const tip = 1 - sstep(.45, 1, p);
      const lower = 1.350 + .0015 * (1 - p), upper = lower + (.018 - .007 * p) * tip;
      const y = lower + (upper - lower) * v;
      const z = .174 - .007 * p * p + .0015 * Math.sin(Math.PI * v);
      return [x, y, z];
    });
    ```
  - The moustache lobes are generated as an open 2D parametric ribbon hovering at `z = 0.174`. The actual upper lip and face skin behind it are situated at `z ≈ 0.153..0.155`.
  - In pure 90° orthographic side profile, because there are no side return caps or rear connection triangles bridging `z = 0.174` back to `z = 0.155`, the camera looks directly between the floating moustache ribbon and the face, revealing background sky.

---

## Distinction from Legacy `index.html` Bars

- In `index.html` lines 42440–42443:
  ```javascript
  for (const sx of [-1, 1]) {
    const moustache = face(.038, .011, .011, d.mats.hair, sx * .023, 1.36, .155);
    moustache.rotation.z = -sx * .16;
  }
  ```
- These legacy bars reside at `z = 0.155` with the old bright orange hair material (`d.mats.hair`).
- In front view, the new fitted moustache ridge at `z = 0.174` completely covers them (zero pixels with saturation `> 60%` in the lip area).
- Claude can safely delete these two lines from `index.html`; doing so will not create any hole in the new beard helper.

---

## Actionable Fix for ChatGPT

To bring Close Profile Integration from `3.5/5` to `4.5/5`:
1. Add a rear/lateral return wall in `addGrid` (or taper `z` from `0.174` at the anterior center back to `0.155` at the outer edges and lower lip boundary).
2. Alternatively, generate a 3D box/wedge loft for each moustache lobe that terminates flush against the underlying head mesh (`z ≈ 0.153`), eliminating the 19px daylight gap.
