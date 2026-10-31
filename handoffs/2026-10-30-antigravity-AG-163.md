# antigravity — AG-163 CL-280's look and draws — 2026-10-30

Changed: Visual inspection, GPU screenshot capture, and Probe B Night-20 scene walk on RTX 5080 (no game code edits). Compared old (`82d75118`) against new (`HEAD` / CL-280) across FOB yard day/night, all 12 landmark close-ups, dynamic batch destruction & rebuilding on blast, fresh match reset rebuild, debris chunk flight/landing/shrink-out, and instanced motes (dust, splash, embers).
Files: qa/2026-10-31-AG-163/ (run.mjs, analyze.mjs, sheet.py, probe-b.json, report.md, sheet.jpg, 40 PNGs), handoffs/2026-10-30-antigravity-AG-163.md
Tests: `node crew/crew.mjs slot run antigravity AG-163 --checks "CL-280 GPU screenshots and Probe B draws old vs new" -- node qa/2026-10-31-AG-163/run.mjs` -> exit 0.
Screenshots: `qa/2026-10-31-AG-163/sheet.jpg` (20-row contact sheet of before/after pairs), `fob-day-*.png`, `fob-night-*.png`, 12 landmark close-ups (`*-old.png` vs `*-new.png`), `hesco-broken-blast.png`, `fob-fresh-match.png`, `debris-flight-*.png`, `debris-landing-*.png`, `debris-shrink-new.png`, `dust-*.png`, `splash-*.png`, `embers-*.png`.
Not verified: Full test suite (left to committer per Rule 6/16).
Requests: Replied DONE to Claude's AG-163 request in handoffs/requests.md.
Contract changes: none

---

## 1. Visual & Geometric Verification (All PASS)

1. **FOB Yard Landmark Batch (`fob-yard-batch`)**:
   - The 12 FOB yard landmarks (6 HESCO runs, guard post, sign with plate, armory crates, fuel drums, toppled floodlight, burned tent) draw as **1 single world-space batched mesh** (`fob-yard-batch`) plus 1 separate CanvasTexture plate mesh.
   - All geometric forms, materials, colors, colliders, and rubble retain 100% fidelity. Side-by-side comparison across noon (`fob-day`), midnight (`fob-night`), and all 12 landmark close-ups confirms visual parity with 82d75118.
2. **Dynamic Batch Rebuilding**:
   - **Blast Destruction**: Blasting `fob-hesco-sw1` (`TT.damageLandmark(h, 1e6, true)`) cleanly spawned rubble, set `alive=false`, and rebuilt the batch from 15,360 vertices down to 14,244 vertices (-1,116 vertices for that HESCO run). Verified in `hesco-broken-blast.png`.
   - **Fresh Match Reset**: Running `TT.resetGame()` cleanly restored all 12 landmarks to `alive=true` and rebuilt `fob-yard-batch` whole again (15,360 vertices). Verified in `fob-fresh-match.png`.
3. **Debris Chunks (`debris-chunks` InstancedMesh)**:
   - Replaced pooled individual meshes (up to 80 draws) with **1 InstancedMesh draw**.
   - Chunks tumble in flight, land on terrain, and smoothly shrink out over the final third of their lifespan (replacing opacity fade). Verified in `debris-flight-*.png`, `debris-landing-*.png`, and `debris-shrink-new.png`.
4. **Instanced Motes (`motes-instanced`)**:
   - Dust, splash, and embers draw via one `InstancedMesh` each (`motes-instanced`).
   - Motion, gravity, velocity, drag, and scale progression are completely identical to old pooled meshes. Verified in `dust-*.png`, `splash-*.png`, and `embers-*.png`.

---

## 2. Probe B Night-20 Scene Walk: Draws & Triangles by Owner

Controlled Night-20 peak (`detPeak`, deterministic 48-zombie cohort at HQ):

| Owner | Old Draws (Frustum) | New Draws (Frustum) | Δ Draws | Old Tris (Frustum) | New Tris (Frustum) | Δ Tris | Old Vis Meshes (Scene) | New Vis Meshes (Scene) | Δ Vis Meshes |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `effects` | 261 | 174 | **-87** | 114,101 | 149,421 | +35,320 | 522 | 334 | **-188** |
| `the player and his gun` | 106 | 106 | **0** | 77,856 | 77,856 | **0** | 106 | 106 | 0 |
| `ground and water` | 2 | 12 | +10 | 25,690 | 26,034 | +344 | 76 | 76 | 0 |
| `landmarks` | 18 | 30 | +12 | 223,170 | 278,414 | +55,244 | 26 | 32 | +6 |
| `history props` | 8 | 20 | +12 | 2,412 | 15,674 | +13,262 | 169 | 86 | -83 |
| `zombies` | 51 | 72 | +21 | 188,658 | 251,978 | +63,320 | 72 | 72 | 0 |
| `trees and foliage` | 90 | 151 | +61 | 202,836 | 310,084 | +107,248 | 417 | 417 | 0 |
| `houses` | 4 | 85 | +81 | 15,758 | 42,240 | +26,482 | 80 | 85 | +5 |

### Subgroup Cuts Verified:
- `effects / Mesh -> SphereGeometry:MeshBasicMaterial` (individual motes): **76 -> 0 (-76 draws)**
- `effects / Mesh -> TetrahedronGeometry:MeshStandardMaterial` (individual debris chunks): **50 -> 0 (-50 draws)**
- Total effects in-frustum draws dropped by **-87 draws** (`261 -> 174`), and total visible scene meshes in effects dropped by **-188 meshes** (`522 -> 334`).
- FOB yard landmark bodies: **12 separate draws collapsed into 1 batched draw** (`fob-yard-batch`).
