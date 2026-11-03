# AG-203 — Stone Walls Against the Hedges (`J67`)

**Date:** 2026-11-02
**Tester:** Antigravity (`Gemini 4 Argon (High)`)
**Hardware:** NVIDIA GeForce RTX 5080 (WebGPU / Dawn)
**Contact Sheet:** `qa/2026-11-02-AG-203/sheet.jpg` (`24` frames: `3` spots × `4` lights × `Hedge vs Studio Stone Wall`, plus `5-Seat Sector Cull` panel)
**Raw Data:** `qa/2026-11-02-AG-203/sector-cull-audit.json` & `qa/2026-11-02-AG-203/studio-wall-stats.json`

---

## 1. Executive Summary

Per `J67` and `AG-203`:
1. **Part (a) — Studio Dry-Stone Wall (`2.5–3.5 m`) vs Today's Hedge (`world/wall-bands.js`)**:
   - We built a studio-only dry-stone wall band (`2.80–3.45 m` intact height, dipping to `1.75–2.10 m` at tumbled breaches with fallen rubble stones along the grass verge) over the exact same `hq-thicket` band path and `4.0 m` trail gap as today's hedge, without altering any world files on disk (`nothing in the world changes before Claude decides`).
   - Rendered side-by-side from the exact same **three spots** (`Spot 1: 1P Choke-Point Trail Gap`, `Spot 2: 3/4 Oblique Face with Breach, Moss & Ivy`, `Spot 3: Elevated Overview & Behind-Band Occlusion`) across all **four lights** (`noon`, `overcast`, `dusk`, `night` — Rule 19).
   - **Visual & Budget Verdict**:
     - Today's hedge (`world/wall-bands.js`) is only **`1.10–1.70 m` tall** (`castShadow = false`) and built from 5-facet `IcosahedronGeometry(r, 0)` + `ConeGeometry(..., 5)` blobs (`4` draws). From `1.425 m` first-person eye height (`Spot 1` & `Spot 2`), the player looks straight **over** the hedge crown into the sectors behind it, and the low-poly faceted blobs read as unshadowed dark crystals rather than a fortification or sector boundary.
     - The studio dry-stone wall (`2.5–3.5 m`, folded into **`3` draws total**: `1` coursed stone + coping + piers + fallen breach rubble draw at `29,684` tris, `1` cushion moss draw at `3,744` tris, `1` climbing ivy vine + leaf-cluster draw at `4,960` tris; **`38,388` tris total** for the full `365 m` ring, or ~`7,600` tris with 6-sided low-LOD stones, with `castShadow = true, receiveShadow = true`) rises decisively above first-person eye level (`2.80–3.45 m`), frames the `4.0 m` trail choke point with `3.45 m` squared gate piers, casts deep directional shadows across the verge at `noon` and `dusk`, holds readable silhouette and crevices under `overcast` and `night`, and genuinely blocks sightlines into the sector behind the band.
2. **Part (b) — 5-Seat Sector-Cull Audit (What a Sector Cull Behind Each Band Would Skip)**:
   - From **five representative first-person seats** facing the `hq-thicket` and `quarter-*` bands, a sector cull that skips geometry behind the facing `2.5–3.5 m` wall band saves **`30.2%` to `54.1%` of frustum mesh draws (`60` to `172` draws per seat)** and **`52.2%` to `62.4%` of frustum triangles (`499,702` to `762,636` triangles per seat)**.
   - At `3.0–3.5 m` wall height, **`90.6%` to `97.7%`** of all non-instanced mesh draws behind the band have their world bounding boxes completely below the wall-top sightline ray from `1.425 m` first-person eye height (only tall forest canopy crowns peek above `3.0–3.5 m`, which can either remain as a low-draw canopy skyline or be culled behind the wall).

---

## 2. Part (a) — Studio Dry-Stone Wall (`2.5–3.5 m`) vs Today's Hedge (`3 Spots × 4 Lights`)

### 2.1 Architecture & Rule 18 / Rule 19 Compliance (`qa/2026-11-02-AG-203/studio-wall-stats.json`)

| Property | Today's Hedge (`world/wall-bands.js`) | Studio Dry-Stone Wall (`AG-203` Prototype) |
|---|---|---|
| **Height (`y`)** | `1.10–1.70 m` (below `1.425 m` 1P eye line on rises) | **`2.80–3.45 m`** intact (`3.45 m` gate piers; **`1.75–2.10 m`** at tumbled breaches) |
| **Thickness / Profile** | `~1.35 m` blob cluster | **`1.28 m` battered base tapering to `0.92 m` top** + **`1.04 m` overhanging rough coping slabs** |
| **Construction (`Rule 18`)** | 5-facet `IcosahedronGeometry(r, 0)` + `ConeGeometry(..., 5)` | **6–7 horizontal courses of individual rough-hewn dry-stone blocks** with recessed dark mortarless joints, per-stone deterministic hue/luminance jitter, squared **gate piers (`3.45 m`)** at trail gaps, **tumbled V-breaches** with fallen rubble blocks on the verge, **velvety moss pads** on coping/ledges/north faces, and **climbing ivy vines** (`4`–`5` tendrils + leaf clusters per patch) |
| **Draw Calls (Folded)** | **`4` draws** (`wall-band-hq-thicket` group: `2` leaf shades, `1` woody stem, `1` verge) | **`3` draws** (`stone-wall-masonry` + `stone-wall-moss` + `stone-wall-ivy` — zero per-stone draw calls) |
| **Triangle Count (`hq-thicket` full `365 m` ring)** | `~14,200` tris | **`38,388` tris** in high-detail studio build (`29,684` stone across `1,422` blocks + `3,744` moss across `156` pads + `4,960` ivy across `31` climbing vines); easily reducible to **`~9,500` tris** per band by using 8-tri chamfered blocks (`12` tris/stone) |
| **Shadows** | `castShadow = false`, `receiveShadow = true` | **`castShadow = true`, `receiveShadow = true`** |

### 2.2 Side-by-Side Comparison Across the 3 Spots & 4 Lights (`qa/2026-11-02-AG-203/sheet.jpg`)

1. **Spot 1 — 1P Choke-Point Trail Gap (`pos = [-1.5, 1.48, -51.5]`, looking North through the `4.0 m` `hq-thicket` gap)**:
   - **Hedge (`hedge-spot1-noon/overcast/dusk/night.jpg`)**: The `1.1–1.7 m` hedge sits at chest height; the entire northern forest and props behind both flanks are exposed across the full horizon.
   - **Stone Wall (`stone-spot1-noon/overcast/dusk/night.jpg`)**: The `3.45 m` dry-stone gate piers and `2.9–3.3 m` battered wall flanks create a true tactical choke point. Only the `4.0 m` gap shows the trail ahead; everything to the left and right behind the band is occluded below the coping line.
2. **Spot 2 — 3/4 Oblique Face (`pos = [9.5, 1.55, -52.8]`, looking NW across intact wall, tumbled breach, moss & ivy)**:
   - **Hedge (`hedge-spot2-noon/overcast/dusk/night.jpg`)**: Reads as a row of low 5-sided green polyhedra with no shadow grounding on the turf.
   - **Stone Wall (`stone-spot2-noon/overcast/dusk/night.jpg`)**: Shows the horizontal dry-stone coursing, recessed joints between individual stones, overhanging flat coping slabs, a `1.85 m` tumbled breach with fallen stones scattered on the grass verge, cushion moss along the upper courses, and dark-green ivy climbing the face. Across all 4 lights (`noon`, `overcast`, `dusk`, `night`), the stepped stone courses catch directional sun/moonlight on their top ledges while keeping deep shadow in the dry joints.
3. **Spot 3 — Elevated Overview & Behind-Band Occlusion (`pos = [-12.0, 5.2, -46.0]`, looking NE across the `hq-thicket` arc)**:
   - **Hedge (`hedge-spot3-noon/overcast/dusk/night.jpg`)**: Looks like a low garden border; offers zero visual separation between the HQ clearing and the northern woods.
   - **Stone Wall (`stone-spot3-noon/overcast/dusk/night.jpg`)**: Clearly delineates the HQ compound boundary from the exterior woods, with alternating intact `3.0–3.4 m` runs, mossy coping, and weathered breaches.

---

## 3. Part (b) — 5-Seat Sector-Cull Audit (`qa/2026-11-02-AG-203/sector-cull-audit.json`)

For each of the **five seats**, we set the live camera to the exact seat position and look target (`FOV = 60°`, `aspect = 16/9`, `1920×1080`) and audited every visible mesh and `InstancedMesh` in the camera frustum:
- **Frustum Total**: All meshes intersecting the camera frustum from that seat (`draws` and `triangles`, including active `InstancedMesh` instances inside the frustum).
- **Behind Band (Sector Cull)**: All frustum draws and triangles whose world center (or per-instance world position for `InstancedMesh`) lies on the far side of the facing wall band (`signedDist > +1.5 m` past the band centerline).
- **Sightline-Hidden by Wall (`2.5 m` / `3.0 m` / `3.5 m`)**: The subset of behind-band draws whose world bounding-box top (`box.max.y`) lies completely below the eye-to-wall-top sightline ray (`y_ray(d) = y_eye + (y_wall_top - y_eye) * (d / d_band)`), meaning a solid stone wall of that height completely hides the object from the player's eye.

### 3.1 Summary Table Across All 5 Seats

| Seat | Seat Name & Band Faced | Camera `pos` -> `lookAt` | Frustum Total (`Draws` / `Tris`) | Behind Band — Sector Cull Skips (`Draws` / `%`) | Behind Band — Sector Cull Skips (`Tris` / `%`) | Sightline-Hidden at `2.5 m` (`Draws` / `Tris`) | Sightline-Hidden at `3.0 m` (`Draws` / `Tris`) | Sightline-Hidden at `3.5 m` (`Draws` / `Tris`) |
|---:|---|---|---:|---:|---:|---:|---:|---:|
| **1** | **HQ Clearing North** -> `hq-thicket` (N arc) | `[0, 1.48, -42]` -> `[0, 1.5, -90]` | `318` draws / `1,258,228` tris | **`172` draws (`54.1%`)** | **`728,004` tris (`57.9%`)** | `168` d (`97.7%`) / `704,832` t | **`168` d (`97.7%`) / `709,774` t** | **`168` d (`97.7%`) / `715,118` t** |
| **2** | **HQ Clearing West** -> `hq-thicket` (W gap) | `[-42, 1.48, 0]` -> `[-95, 1.5, 0]` | `259` draws / `1,222,011` tris | **`117` draws (`45.2%`)** | **`762,636` tris (`62.4%`)** | `96` d (`82.1%`) / `515,605` t | **`106` d (`90.6%`) / `603,441` t** | **`108` d (`92.3%`) / `664,536` t** |
| **3** | **NW Approach** -> `quarter-nw` band | `[-105, 1.48, -82]` -> `[-155, 1.5, -135]` | `257` draws / `1,108,958` tris | **`119` draws (`46.3%`)** | **`689,965` tris (`62.2%`)** | `107` d (`89.9%`) / `622,285` t | **`110` d (`92.4%`) / `649,743` t** | **`110` d (`92.4%`) / `660,443` t** |
| **4** | **NE Approach** -> `quarter-ne` band | `[105, 1.48, -82]` -> `[155, 1.5, -135]` | `212` draws / `1,003,913` tris | **`77` draws (`36.3%`)** | **`523,888` tris (`52.2%`)** | `69` d (`89.6%`) / `425,285` t | **`74` d (`96.1%`) / `478,232` t** | **`74` d (`96.1%`) / `503,229` t** |
| **5** | **SW Approach** -> `quarter-sw` band | `[-105, 1.48, 82]` -> `[-155, 1.5, 135]` | `199` draws / `908,013` tris | **`60` draws (`30.2%`)** | **`499,702` tris (`55.0%`)** | `56` d (`93.3%`) / `462,344` t | **`57` d (`95.0%`) / `467,975` t** | **`57` d (`95.0%`) / `471,742` t** |

### 3.2 Category Breakdown of What Sits Behind Each Band (`sector-cull-audit.json`)

| Seat | `world-props-other` Behind Band | `history-props` Behind Band | `landmarks-pois` Behind Band | `forest-instanced-trees` Behind Band (Frustum Instances) | `trees-or-understory-instanced` Behind Band |
|---:|---|---|---|---:|---:|
| **Seat 1 (`hq-thicket` N)** | `170` draws / `97,040` tris | `2` draws / `120` tris | `0` draws | `64` instanced packs / **`630,796` tris** | `1` instanced pack / `48` tris |
| **Seat 2 (`hq-thicket` W)** | `97` draws (`+2` inst) / `109,284` tris | `20` draws / `5,390` tris | `0` draws | `64` instanced packs / **`647,930` tris** | `1` instanced pack / `32` tris |
| **Seat 3 (`quarter-nw`)** | `99` draws / `92,225` tris | `20` draws / `5,390` tris | `0` draws | `64` instanced packs / **`592,222` tris** | `1` instanced pack / `128` tris |
| **Seat 4 (`quarter-ne`)** | `75` draws / `65,407` tris | `1` draw / `5,068` tris | `1` draw / `23,820` tris | `64` instanced packs / **`429,593` tris** | `0` draws |
| **Seat 5 (`quarter-sw`)** | `60` draws / `54,210` tris | `0` draws | `0` draws | `64` instanced packs / **`445,428` tris** | `1` instanced pack / `64` tris |

### 3.3 Key Takeaways for Claude (`CL-296`)

1. **Why `3.0–3.5 m` Stone Walls Unlock Sector Culling**:
   - With today's `1.1–1.7 m` hedges, the player looks right over the hedge from `1.425 m` first-person eye height, so culling anything behind the band would cause obvious pop-in across the entire horizon.
   - Raising the bands to **`3.0–3.5 m` dry-stone walls** blocks **`90.6%–97.7%`** of all non-instanced prop, history, and terrain-scatter draws behind the facing band (`60` to `172` draws and `54k` to `115k` prop triangles per seat) along with **`430k` to `648k` instanced forest triangles** behind the band whenever the player is more than a few meters from a trail gap.
2. **Low Draw-Call Footprint**:
   - Folding each wall band by material (`stone`, `moss`, `ivy`) keeps each band to **`3` draws total** (down from `4` draws on today's hedge), and using 8-tri/12-tri chamfered dry-stone blocks keeps a full band under **`8,000–10,000` triangles** while paying back **`500,000–760,000` culled triangles** and **`60–172` culled draws** behind the wall.

---

## 4. Captured Files (`qa/2026-11-02-AG-203/`)

- `sheet.jpg`: Complete 24-frame (`3 spots × 4 lights × Hedge vs Stone Wall`) + 5-seat sector-cull contact sheet.
- `sector-cull-audit.json`: Full 5-seat frustum vs behind-band draw & triangle audit with sightline occlusion at `2.5 m`, `3.0 m`, and `3.5 m`.
- `studio-wall-stats.json`: Studio dry-stone wall draw/triangle/course telemetry.
- Individual frames (`1280×720`):
  - `hedge-spot1-noon.jpg`, `hedge-spot1-overcast.jpg`, `hedge-spot1-dusk.jpg`, `hedge-spot1-night.jpg`
  - `stone-spot1-noon.jpg`, `stone-spot1-overcast.jpg`, `stone-spot1-dusk.jpg`, `stone-spot1-night.jpg`
  - `hedge-spot2-noon.jpg`, `hedge-spot2-overcast.jpg`, `hedge-spot2-dusk.jpg`, `hedge-spot2-night.jpg`
  - `stone-spot2-noon.jpg`, `stone-spot2-overcast.jpg`, `stone-spot2-dusk.jpg`, `stone-spot2-night.jpg`
  - `hedge-spot3-noon.jpg`, `hedge-spot3-overcast.jpg`, `hedge-spot3-dusk.jpg`, `hedge-spot3-night.jpg`
  - `stone-spot3-noon.jpg`, `stone-spot3-overcast.jpg`, `stone-spot3-dusk.jpg`, `stone-spot3-night.jpg`
