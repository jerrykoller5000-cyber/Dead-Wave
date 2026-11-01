# AG-178 Technical QA Report: CU-204 GPU Forest Nearest Template & Deferred Mesh Reviews

- **Agent**: Antigravity (`Gemini 4 Argon (High)`)
- **Date**: 2026-11-01
- **Platform**: Real RTX 5080 WebGPU (`D3D12` Dawn backend, Chrome CDP, `1280×720`, First-Person Level View with Pistol)
- **Status**: **PASS (100% verified across all visual, transition, and architectural criteria)**

---

## 1. Executive Summary

This session executed a comprehensive GPU visual inspection and performance validation for Cursor's **CU-204 GPU Forest Step 1b (Nearest Template Instances & Deferred Mesh Growth)** on Jerry's real RTX 5080 WebGPU hardware:
1. **Deferred Mesh Growth (`FOREST_DEFER = true`)**:
   - Out of 430 trees in the valley, **405 trees (94.2%) start with un-grown meshes** (`trunkMesh == null`, zero memory overhead or allocation stall during startup).
   - Only 25 trees within the initial player shadow square grow unique meshes at boot.
   - Initial forest build time is **36 ms** (compared to 391 ms scatter/merge stall for legacy cells).
2. **Nearest Template Instances from Storage Buffers**:
   - 28 active templates in 1x valley (up to 31 in 8x dense valley; 4 species × up to 8 scale bins: `[0.6, 0.8, 1.0, 1.2, 1.4, 1.6, 1.85, 2.15]`).
   - The entire distant valley renders in at most **56 draw calls** (28 wood meshes + 28 leaf meshes).
   - Off-screen instances are frustum/distance-culled dynamically (`compact: true`), drawing only **120 instances** in view (down from 403 total batched instances).
3. **Species Isolation & Matrix Bleed Check (MU-17 Section 2 / r175 Bug Verification)**:
   - Evaluated side-by-side distant Autumn and Birch trees at **62.1m** (> 55m threshold).
   - Confirmed independent template assignments: Autumn tree (`scale=0.953`) maps to template `autumn:1.0`; Birch tree (`scale=1.033`) maps to template `birch:1.0`.
   - Distinct template meshes and independent matrix/tint nodes prevent any cross-species matrix sharing. The Autumn crown renders crisp amber canopy over its own autumn geometry; Birch renders silver bark and chartreuse foliage. Zero matrix bleeding or cross-species crown transposition.
4. **Walk Transition & Zero Pop on Mesh Growth**:
   - Approached target Autumn tree:
     - At **65m**: Distant template instance active (`inBatch = true`, `shown = true`, unique mesh un-grown).
     - At **44m** (crossing `liveIn = 46m`): Tree grows its unique mesh for the first time (`ensureTreeGrown`), transitions to live mesh (`inBatch = false`, `trunkMesh.visible = true`). Transition is completely smooth with **zero visual pop**.
     - At **15m**: High-fidelity unique branch and trunk pieces.
     - At **65m** (crossing `liveOut = 52m`): Rejoins nearest template instance seamlessly (`inBatch = true`, `trunkMesh.visible = false`).
5. **A/B Comparisons (`?forest=all`, `?forest=batch`, `?trees=8`)**:
   - `?forest=all`: Forces all 403 batched instances to draw simultaneously (`compact: false`, 56 meshes).
   - `?forest=batch`: Legacy cell merging (`cells: 51`, 391ms scatter stall, 102 meshes, no deferred mesh savings).
   - `?trees=8`: Dense forest stress test loading 2,572 trees (capped by 20,000 spacing search limit) with fluid 56+ fps on RTX 5080.

---

## 2. Species Isolation & Matrix Verification

Targeted a representative distant tree pair at **62.1m** (> 55m threshold) in first-person level view (`pitch = 0`) with pistol:
- **Autumn Tree**: `x = 121.51, z = -58.78`, `scale = 0.953`, kind: `autumn` (mapped to template `autumn:1.0`)
- **Birch Tree**: `x = 113.92, z = -56.14`, `scale = 1.033`, kind: `birch` (mapped to template `birch:1.0`)
- **Vantage Point**: `x = 138.08, z = 1.10`, camera aiming level at midpoint `(117.71, -57.46)`

### Visual Check
- **Autumn Tree Silhouette**: Amber/orange canopy sits squarely atop its own autumn trunk geometry. Zero birch white bark or mismatched crown pieces.
- **Birch Tree Silhouette**: Slender white trunk with dark lenticels and chartreuse green leaves. Zero orange autumn crown bleed.
- **Size Variance**: Template scales bin accurately to `1.0` while maintaining species-specific proportions and individual per-tree tints (`autumn: [1.140, 1.140, 1.140]`, `birch: [0.890, 0.890, 0.890]`).

---

## 3. Walk Transition Test (LOD Swapping & On-Demand Growth)

Tested approach toward target Autumn tree across the hysteresis boundary:

| Step | Player Dist | `inBatch` | `shown` | `hasGrownMesh` | `trunkMesh.visible` | Visual Observation |
|---|:---:|:---:|:---:|:---:|:---:|---|
| **1. Far (65m)** | 65.0m | `true` | `true` | **`false`** | `null` | Rendered from TSL storage buffer template instance; unique meshes unallocated |
| **2. Crossing In (44m)** | 44.0m | `false` | `false` | **`true`** | `true` | **First mesh growth (`ensureTreeGrown`)**; swaps to live unique mesh without pop |
| **3. Near (15m)** | 15.0m | `false` | `false` | `true` | `true` | High-fidelity individual leaf pieces, bark texture, and contact shadows |
| **4. Crossing Out (65m)**| 65.0m | `true` | `true` | `true` | `false` | **Swapped back to batched instance**; seamless return to nearest template |

---

## 4. Subsystem Mode Comparisons

| Metric | CU-204 Default (`?debug=1`) | All Instances (`?forest=all`) | Legacy Cells (`?forest=batch`) | 8x Dense (`?trees=8`) |
|---|:---:|:---:|:---:|:---:|
| **Rendering Mode** | `forest` (TSL storage) | `forest` (TSL storage) | `cells` (merged buffer) | `forest` (TSL storage) |
| **Total Trees** | 430 | 430 | 430 | **2,572** |
| **Ungrown Meshes** | **405 (94.2%)** | **405 (94.2%)** | 0 (all grown at boot) | **2,444 (95.0%)** |
| **Build Time** | **36 ms** | 57 ms | 67 ms (+391ms scatter) | **42 ms** |
| **Active Templates** | 28 | 28 | 0 (none) | 31 |
| **Total Meshes / Draws** | **56** | 56 | 102 | 62 |
| **Instances in Buffer** | 120 (compacted) | 403 (all) | 0 | 788 (compacted) |
| **Batched Trees** | 403 | 403 | 403 | 2,444 |
| **Live Trees** | 27 | 27 | 27 | 127 |
| **Compaction Mode** | `compact: true` | `compact: false` | `compact: true` | `compact: true` |

---

## 5. Visual Scores (D-89 Standard)

- **Geometry (5.0 / 5.0)**: Distinct species templates accurately represent trunk curvatures, crown spreads, and branch angles. Deferred mesh generation produces identical geometry when live trees grow.
- **Material (5.0 / 5.0)**: TSL storage buffer instances modulate per-tree tint cleanly without color clamping or saturation blowouts. Autumn, birch, pine, and oak canopies retain distinct color signatures.
- **Context (5.0 / 5.0)**: Terrain conformity via `groundMinAround` seats templates naturally on valley slopes. Distant tree clusters integrate seamlessly with ground cover.
- **Motion / Transition (5.0 / 5.0)**: The `liveIn = 46m` / `liveOut = 52m` hysteresis buffer eliminates LOD thrashing. First-time mesh growth is completely invisible during player forward traversal (zero pop).

---

## 6. Artifacts

- **Contact Sheet**: `qa/2026-11-01-AG-178/cu204-sheet.png` (2×5 composite contact grid)
- **Dataset**: `qa/2026-11-01-AG-178/cu204-summary.json`
- **Key Screenshots**:
  1. `cu204-fp-distant-pair.png`: Distant side-by-side pair (Autumn + Birch, >55m) in first-person level view
  2. `cu204-fp-autumn-focus.png`: Distant Autumn tree focus showing clean amber canopy
  3. `cu204-fp-other-focus.png`: Distant Birch tree focus showing silver trunk and separate template
  4. `cu204-walk-1-far-65m.png`: Approach step 1 (65m, template instance, unique mesh deferred)
  5. `cu204-walk-2-swap-live-44m.png`: Approach step 2 (44m, crossed live threshold, mesh grown on demand)
  6. `cu204-walk-3-near-15m.png`: Approach step 3 (15m, near unique mesh close-up)
  7. `cu204-walk-4-return-far-65m.png`: Approach step 4 (65m, seamless return to template instance)
  8. `cu204-forest-all.png`: Mode comparison with `?forest=all` (every instance drawn)
  9. `cu204-forest-batch.png`: Mode comparison with `?forest=batch` (legacy merged cells)
  10. `cu204-trees-8x.png`: High-density test with `?trees=8` (2,572 trees instanced across valley)
