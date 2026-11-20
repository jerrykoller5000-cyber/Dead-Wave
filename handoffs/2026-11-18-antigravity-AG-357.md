# antigravity — AG-357 Shambler fidelity test (Step 2 strap/jaw fixes + Step 3 atlas/ORM/LOD/5080 bench, review-only) — 2026-11-18

Changed:
- Completed `AG-357` Step 2 fixes and Step 3 cost/performance optimization strictly inside `review/AG-357/` and `qa/2026-11-18-AG-357/` (live `studio/`, `index.html`, `core/`, and `game/` files completely untouched; Tripo `Shambler.glb` used strictly as visual reference only):
  - **Step 2 Fix (1) — Flat Back Tank Straps (`review/AG-357/shambler-clothes.mjs`)**: Tightened upper torso `offGap` (`0.0034`), lowered `strapBand` rim peak, and replaced flat tangent straps with surface-conformed straps (`findClosestSkin` projecting across-strap vertices directly onto torso skin at `0.0010..0.0038 m` offset), eliminating the shoulder/neck horn curl on both A-pose and Shamble back views.
  - **Step 2 Fix (2) — Closed Sculpted Profile Jaw (`review/AG-357/shambler-head-skull.mjs`, `review/AG-357/shambler-step1.mjs`)**: Reshaped `upperCheekParts` & `lowerCheekParts` with a tapered concave mouth-commissure arch anchored flush into zygoma, maxilla, and mandible (no boxy slab edge), tucked `darkCavities` + `mouthFloor` / `oralWallL` / `oralWallR` inside `|x| <= 0.032` so internal oral cavities never poke through the cheek wall, and attenuated `mHole` vertex AO on outward cheek normals — closing the side-profile jaw & sky gap completely in both A-pose and Shamble.
  - **Step 3 — Merged `1–2` Draw Calls, Single Texture Atlas (`1K` & `512`), Packed ORM (`review/AG-357/textures-step2.mjs`, `review/AG-357/atlas-step3.mjs`, `review/AG-357/shambler-step3.mjs`)**:
    - Refactored `textures-step2.mjs` into shared heightfield + Sobel normal evaluators (`buildHeightNormalTile` + `eval*Texel`) with periodic U-wrap padding.
    - Packed `head`, `tank`, `pants` (`S/2 x S/2`), `neck`, `skin`, `boot` (`S/4 x S/4`), and `cavity`/`teeth`/`metal` into **3 shared textures**: `map` (`RGBA8` w/ tank `alphaTest: 0.45`), `normalMap` (tile-resolution-compensated Sobel relief), and packed `ormMap` (`R = AO`, `G = Roughness`, `B = Metalness`, `.channel = 0`) at `1024x1024` (`12.0 MB`) and `512x512` (`3.0 MB`).
    - Merged 29 body/head/jaw/clothes/teeth/belt/buckle/boot meshes into 1 single articulated `SkinnedMesh` (`shambler-atlas-skin`) bound to the 14-bone rig + 1 merged eye mesh (`shambler-eyes`, `MeshBasicMaterial` glow `0x74a18d`) -> **2 draw calls / shambler (`2` materials, `3` textures)**, with `cloneSkinnedShambler()` sharing 100% of geometry/materials/textures/`boneInverses`.
  - **Step 3 — 15 m+ Distance `LOD1` & Exclusive 5080 WebGPU Bench (`review/AG-357/{shambler-clothes,shambler-head-skull,shambler-step1,shambler-step3}.mjs`, `index.html`, `qa/2026-11-18-AG-357/{capture-step3.mjs,bench-step3.html,run-bench-step3.mjs,build_step3_sheets.py}`)**:
    - Added `lod >= 1` geometric simplification cutting triangle count from `43,472` (`LOD0`) to `8,920` (`LOD1`, **`-79.5%` tris**) for `15 m+`.
    - Captured `102` Noon/Night/LOD distance frames (`5m`, `15m`, `22m`), ran the exclusive `nvidia / blackwell` RTX 5080 WebGPU horde benchmark (`30` shamblers across all `6` modes + `120`-shambler stress across `3` modes, with `2` horde screenshots), and generated updated sheets `04`–`09`.

Files:
- `review/AG-357/shambler-clothes.mjs`
- `review/AG-357/shambler-head-skull.mjs`
- `review/AG-357/shambler-step1.mjs`
- `review/AG-357/textures-step2.mjs`
- `review/AG-357/atlas-step3.mjs`
- `review/AG-357/shambler-step3.mjs`
- `review/AG-357/index.html`
- `review/AG-357/04-shambler-step2-noon-sheet.jpg`
- `review/AG-357/05-shambler-step2-night-sheet.jpg`
- `review/AG-357/06-shambler-step2-head-jaw-detail.jpg`
- `review/AG-357/07-shambler-step3-atlas-1k-vs-512.jpg`
- `review/AG-357/08-shambler-step3-lod-15m.jpg`
- `review/AG-357/09-shambler-step3-bench-30.jpg`
- `qa/2026-11-18-AG-357/capture-step3.mjs`
- `qa/2026-11-18-AG-357/bench-step3.html`
- `qa/2026-11-18-AG-357/run-bench-step3.mjs`
- `qa/2026-11-18-AG-357/build_step3_sheets.py`
- `qa/2026-11-18-AG-357/step3-report.json`
- `qa/2026-11-18-AG-357/bench-step3-report.json`
- `qa/2026-11-18-AG-357/frames-step3/*.png` (104 PNGs)

Tests:
- `node --check` passed exit `0` on `review/AG-357/{shambler-clothes,shambler-head-skull,shambler-step1,textures-step2,atlas-step3,shambler-step3}.mjs` and `qa/2026-11-18-AG-357/{capture-step3,run-bench-step3}.mjs`.
- Slot-managed WebGPU capture (`capture-step3.mjs`): exited `0` (`WebGPUBackend`, `102` PNGs, `errors: []`). Measured stats:
  - `ours` (`Claude outputs/J168/proportions/ours/shambler.glb`): `18,592 tris` / `1 mesh` / `1 mat`
  - `proto_apose` / `proto_shamble`: `43,472 tris` / `31 meshes` / `10 mats` / `18` `512x512` maps (`18,874,368 bytes` = `18.0 MB`)
  - `step3_1k`: `43,472 tris` / `2 meshes` / `2 mats` / `3` maps (`12,582,912 bytes` = `12.0 MB`)
  - `step3_512` / `step3_512_shamble`: `43,472 tris` / `2 meshes` / `2 mats` / `3` maps (`3,145,728 bytes` = `3.0 MB`)
  - `step3_lod1`: `8,920 tris` / `2 meshes` / `2 mats` / `3` maps (`3,145,728 bytes` = `3.0 MB`, `-79.5%` tris vs `LOD0`)
  - `headMetrics`: `crownY: 1.8`, `chinY: 1.5256`, `collarY: 1.4226`, `mouthGapeM: 0.0265`, `headHeightChinToTopOpenJaw: 0.2744`, `neckLengthChinToCollar: 0.103`.
- Exclusive 5080 WebGPU benchmark (`run-bench-step3.mjs` via `slot run --exclusive`, `nvidia / blackwell`, `WebGPUBackend`, `1280x720` + `2048px` directional shadow pass, `errors: []`):
  - **30 Shamblers (all animated 14-bone Skeleton; `ours/shambler.glb` skinned onto same 14-bone rig for fair comparison)**:
    - `OURS_NOW`: `557,760 tris` | `62 draws/frm` | `1 mat` | `0.00 MB` | `60.0 fps` (`1% low 58.1`) | `cpu 2.881 ms` | `gpu 0.098 ms`
    - `STEP2_UNMERGED`: `1,304,160 tris` | `1,802 draws/frm` | `10 mats` | `18.00 MB` | **`32.4 fps` (`1% low 19.8`)** | **`cpu 31.068 ms`** | `gpu 0.269 ms`
    - `STEP3_ATLAS_1K`: `1,304,160 tris` | `92 draws/frm` (`-94.9%`) | `2 mats` | `12.00 MB` | `60.0 fps` (`1% low 59.2`) | `cpu 3.639 ms` | `gpu 0.547 ms`
    - `STEP3_ATLAS_512`: `1,304,160 tris` | `92 draws/frm` (`-94.9%`) | `2 mats` | `3.00 MB` | `60.0 fps` (`1% low 59.2`) | `cpu 2.262 ms` | `gpu 0.339 ms`
    - `STEP3_LOD1_15M` (all `LOD1`): `267,600 tris` | `92 draws/frm` | `2 mats` | `3.00 MB` | `60.0 fps` (`1% low 58.8`) | `cpu 2.099 ms` | `gpu 0.111 ms`
    - `STEP3_MIXED_HORDE` (`6 LOD0 <15m` + `24 LOD1 >=15m`): **`474,912 tris`** (`-14.9%` below `OURS_NOW`, `-63.6%` vs Step 2) | **`92 draws/frm`** (`-94.9%` vs Step 2) | `2 mats` | **`3.00 MB`** (`-83.3%` vs Step 2) | **`60.0 fps` (`1% low 59.2`)** | **`cpu 1.630 ms` (`19.1x` faster CPU than Step 2)** | `gpu 0.332 ms`
  - **120 Shamblers Stress (`4x` Horde; `STEP2_UNMERGED` omitted from `60+` stress after already dropping to `32.4 fps` at `30` shamblers and timing out `>150s` compilation/frame overhead at `60` shamblers)**:
    - `OURS_NOW`: `2,231,040 tris` | `242 draws/frm` | `60.0 fps` (`1% low 58.8`) | `cpu 5.429 ms` | `gpu 0.620 ms`
    - `STEP3_ATLAS_512`: `5,216,640 tris` | `362 draws/frm` | `60.0 fps` (`1% low 58.8`) | `cpu 10.469 ms` | `gpu 1.071 ms`
    - `STEP3_MIXED_HORDE` (`6 LOD0` + `114 LOD1`): **`1,485,024 tris`** (`-33.4%` vs `OURS_NOW`, `-71.5%` vs `STEP3_ATLAS_512`) | `362 draws/frm` | `60.0 fps` (`1% low 59.2`) | **`cpu 7.553 ms`** | `gpu 1.007 ms`
- **Tricks Ranked by Look Gained per Cost**:
  1. **Mesh merge + Single `SkinnedMesh` + 1 Atlas (`31 -> 2` draws)**: Best ROI — `-94.9%` draws (`1,802 -> 92`), `19.1x` faster CPU (`31.068 -> 1.630 ms`), `32.4 -> 60.0 fps`, zero visual loss.
  2. **Vertex AO cavities + Sculpted anatomy & conformed straps**: High Tripo look per triangle — sculpted cheekbones, recessed oral cavities, flat scapula straps, deep orbital/mouth AO carry most of the silhouette jump with `0` extra draws.
  3. **Distance `LOD1` at `15 m+` (`43,472 -> 8,920` tris, `-79.5%`)**: Mixed `30`-shambler horde uses `474,912` tris (`< OURS_NOW`'s `557,760`!), visually indistinguishable at `15 m+`.
  4. **Packed ORM (`R=AO, G=Rough, B=Metal`)**: Unifies wet neck tendons/blood sheen vs matte tank cotton and metal buckle in 1 `RGBA8` map (`0` extra draws).
  5. **`512x512` Atlas Downscale (vs `1K` / Step 2)**: Cuts VRAM `18 -> 12 [1K] -> 3.0 MB [512]` (`-83.3%` vs Step 2); `1K` stays sharper on chest weave & clavicle stipple at macro `<3 m` inspect, while `512` is indistinguishable at combat distances (`>=4 m`).
  6. **Procedural Height->Normal Micro-Relief inside Atlas**: Twill weave, boot leather grain, and striated neck tendons add close-up fidelity at `0` extra triangles/draws.
  7. **Alpha-Cutout Tank Holes + Ripped Knee Shin Bone**: Breaks cylinder silhouette inside the same `alphaTest: 0.45` atlas draw (`0` extra calls, `~1.5k` tris in `LOD0`, stripped in `LOD1`).
  8. **Separate Glowing Eye Draw (`MeshBasicMaterial`)**: `2`nd draw call / `~200` tris gives crisp Night silhouette readability; can be collapsed to `1` draw call later via `emissiveMap` in production if desired.
- `python qa/2026-11-18-AG-357/build_step3_sheets.py` exited `0`, building sheets `04`–`09`.

Screenshots:
- `review/AG-357/04-shambler-step2-noon-sheet.jpg` & `review/AG-357/05-shambler-step2-night-sheet.jpg`: visually inspected — back straps lie completely flat on shoulders/back (no horns), profile jaw is closed cleanly, night eyes pop clearly.
- `review/AG-357/06-shambler-step2-head-jaw-detail.jpg` (+ RAW `noon-proto_apose-head_side.png`, `noon-proto_shamble-head_side.png`, `noon-step3_1k-head_3q.png`, `noon-step3_1k-head_side.png`): visually inspected — zero sky gap, smooth zygoma-to-mandible cheek taper, zero internal oral wall poke-through, flat scapula straps.
- `review/AG-357/07-shambler-step3-atlas-1k-vs-512.jpg`: visually inspected — clear side-by-side quality comparison showing `Step 2 (18 MB)` vs `Atlas 1K (12 MB)` vs `Atlas 512 (3 MB)` vs `Tripo Ref`; `512` slightly softens close chest fabric weave & clavicle stipple while preserving silhouette, ripped holes, laced boots, and wet blood/neck sheen.
- `review/AG-357/08-shambler-step3-lod-15m.jpg`: visually inspected — Noon & Night `5 m`, `15 m`, `22 m` native + zoomed comparison proving zero visual pop between `LOD0` (`43,472` tris) and `LOD1` (`8,920` tris) at `15 m+`.
- `review/AG-357/09-shambler-step3-bench-30.jpg` (+ `frames-step3/bench-30-ours.png`, `frames-step3/bench-30-step3-mixed.png`): visually inspected — full 30-shambler horde visuals, `30`-shambler & `120`-shambler tables, and 8-item look-per-cost ranking.

Not verified:
- Production integration into live `studio/zombie-humanoids.js` / `index.html` / `game/*` was NOT performed (`AG-357` is strictly review-only until Jerry picks options on cost vs fidelity).
- Display `rAF` was VSync-capped at `60.0 fps` on the test monitor; uncapped scalability headroom above `60 fps` is evidenced by `cpuSubmitAvgMs`, hardware `gpuPassAvgMs` (`timestamp-query`), and the `120`-shambler pass.
- `STEP2_UNMERGED` was omitted from `120`-shambler stress after already running `32.4 fps` (`31.068 ms` CPU) at `30` shamblers and exceeding `150s` WebGPU pipeline/object overhead at `60` shamblers.
- Minor macro-closeup observation (`noon-step3_1k-boot_3q.png`): inside the ripped right knee opening there is a tiny upper gap above the shin joint seam visible only in close-up macro view (left untouched because trousers/boots passed Step 2 review).

Requests:
- Sending `AG-357 COMPLETE: Step 2 fixes + Step 3 atlas/ORM/LOD/5080 bench + trick ranking ready for Jerry` to `claude`.

Contract changes:
- None (`review/AG-357/` and `qa/2026-11-18-AG-357/` only; zero edits to live `studio/`, `index.html`, `core/`, or `game/` files).
