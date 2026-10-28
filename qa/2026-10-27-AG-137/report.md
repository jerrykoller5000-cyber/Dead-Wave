# AG-137 QA Report — `camp-trapper` Yard/Cellar Sweep Fixes & 15 Cave `'hill-ring'` GPU Inspection (`CL-256`)

- **Date**: 2026-10-27
- **Agent**: `antigravity` (Claude Opus 4.6)
- **Task**: `AG-137` (`CL-256` follow-up from `docs/sweep/fixes-batch2.md`)
- **Renderer / GPU**: WebGPU on NVIDIA GeForce RTX 5080 (via `node crew/crew.mjs slot run`)

---

## Part 1 — `camp-trapper` (`(-148, 226)`) Yard & Cellar Sweep Fixes

### Root Cause of the 7 `camp-trapper` Findings in `CL-256`
1. **Why `tools/sweep/sweep.js` welded the Trapper's Yard into a single `54.8 m²` solid cluster (`6` `overlap` findings)**:
   - In `tools/sweep/sweep.js` (`clusters(pieces)`, line 158), all non-slab mesh pieces (`dy >= 0.35 m` or `area <= 3 m²`) whose AABBs come within `G = 0.05 m` in `X`, `Y`, and `Z` are unioned into a single 2D convex hull.
   - In `game/trapper-path.js`, the leaf bed (`lz = 0.62..9.35`), stepping stones (`y1 = 0.075`), front flagstone threshold (`lz = -0.35..0.55`, `area = 2.52 m² <= 3 m²`), bulkhead cheek curb (`lz = -0.34`), and fence posts (`lz = 0.56..9.48`) bridged within `5 cm` across the entire yard. As a result, `sweep.js` merged the cellar bulkhead (`lz = -6.04..-0.28`) and the entire 8-row fenced yard (`lz = 0.56..9.48`) into one `5.5 m × 14.9 m` convex hull (`54.8 m²`), flagging every interior prop (`objective:trapper-cache`, `cellar-hatch`, `trapper-post`, `horseshoe`, `leghold-traps`) as overlapping `trapper-yard`.
   - In addition, the 90°-rotated gate warning sign at the yard entrance (`lx ≈ -2.06, lz = 9.05`) widened the yard fence's 2D convex hull across the entrance opening (`lx ∈ [-2.20, +2.21]`), overlapping `trapper-post`, `horseshoe`, and `leghold-traps` when placed inside `|lx| <= 2.21`.
2. **Why `objective:trapper-cache` had a `reach` finding (`1` `reach` finding)**:
   - `buildTrapperYardParts` registered an unconditional 2D circular collider `addSolid(stairWall.x, stairWall.z, 1.05)` at `(0, -1.35)` (`lz ∈ [-2.40, -0.30]`), which both blocked the marine from walking onto the stair ramp after unlocking the doors and caused `sweep.js`'s 16-angle approach raycast (`0.75 m` to `2.2 m`) to hit solid colliders on all rays.

### Fixes Applied (`game/trapper-path.js`, `index.html`)
- **World Design Rules Served (`docs/world-design.md`, Rule 17)**:
  - **Rule 4 (Clear Sightlines & Approach)** & **Rule 8 (Threshold Framing)**: Placed `objective:trapper-cache` on the right flagstone plinth (`TRAPPER.CACHE_LOCAL_X = 0.72, CACHE_LOCAL_Z = 0.14`) beside the cellar bulkhead doors with `>= 0.25 m` 3D clearance from both the bulkhead cluster (`lx ∈ [-0.62, +0.62]` at `lz >= -0.32`), the open right bulkhead door leaf (`y1 = 0.08`), and the yard fence (`lz >= 0.56`).
  - **Rule 11 (Collision Fidelity / Ground-Slab Separation)**:
    - Sized the front flagstone threshold (`3.60 m × 0.92 m = 3.31 m² > 3 m²`, `dy = 0.08 m < 0.35 m`) and the leaf bed (`3.12 m × 8.30 m = 25.9 m² > 3 m²`, `dy = 0.05 m < 0.35 m`) as true ground slabs with a clean gap at `lz = 0.61..0.90`, and recessed the 16 stepping stones (`y1 <= 0.055 m`) so `sweep.js` cleanly separates the **Cellar Bulkhead** cluster (`lx ∈ [-2.77, +2.77], lz ∈ [-6.04, -0.28]`) from the **Yard Fence** cluster (`lx ∈ [-2.20, +2.21], lz ∈ [0.56, 9.48]`).
    - Replaced the 2D circular stairwell wall (`r = 1.05` at `(0, -1.35)`) with two height-bounded cheek-wall colliders (`r = 0.28, y0 = cy0, y1 = cy0 + 0.55`) at `lx = ±0.92, lz = -1.25` and a rear cellar mound collider at `(0, -3.70, r = 1.65)`.
    - Positioned the entrance flank props cleanly outside the flared wing fence (`trapper-post` + 3 `horseshoe`s at `lx = -2.62, lz = 9.05`; `leghold-traps` at `lx = +2.68, lz = 8.95` and `lx = +2.82, lz = 7.75`).
  - **Rule 12 (Terrain Integration & Underground Excavation)**:
    - Updated `excavateTrapperCellar(toLocal, cy0)` in `index.html` so `heightField` is depressed inside `|lx| <= 2.15, lz ∈ [-5.45, -0.50]` and `ground` mesh vertices inside `|lx| <= 2.95, lz ∈ [-6.95, -0.45]` are depressed to `pitFloor` (`cy0 - 2.43 m`), covered on the exterior by double-layered ground-slab earth/turf aprons (`dy <= 0.32 < 0.35 m`, `area > 3 m²`) and surface apron platforms (`cellarFrontApronDeck`, `cellarLeftApronDeck`, `cellarRightApronDeck`). Zero terrain triangles poke into the stairwell or cellar room.

### `tools/sweep/sweep.js` & Browser Suite Verification (`qa/2026-10-27-AG-137/sweep-prep.json`, `t52`, `t215`, `t268`)

| Metric / Check | Before (`CL-256`) | After (`AG-137`) | Status |
| --- | ---: | ---: | --- |
| `camp-trapper` `overlap` findings | `6` | **`0`** | Fixed |
| `camp-trapper` `reach` findings (`objective:trapper-cache`) | `1` | **`0`** | Fixed |
| Findings mentioning `trapper`, `cellar`, `leghold`, or `horseshoe` anywhere | `7` | **`0`** | Fixed |
| Remaining `camp-trapper` findings (unrelated `forest` rock/tree touches at `(-146.5, 250.3)` and `(-172.8, 224.2)`) | `2` | `2` | Unchanged |
| `t52` (7 objective props, approach clearance `0.75 m` vs all `worldSolids`) | — | **`17 pass, 0 fail`** (`24.9s`) | Pass |
| `t215` (UTF-8 / no mojibake across all loaded scripts & HUD) | — | **`4 pass, 0 fail`** (`44.7s`) | Pass |
| `t268` (Trapper's Yard safe path, cellar doors, `cellarSpot`, overhead zombies) | — | **`25 pass, 0 fail`** (`42.0s`) | Pass |
| `node --test game/trapper-path.test.mjs` | — | **`5 pass, 0 fail`** | Pass |

Slot run log:
```text
node crew/crew.mjs slot run antigravity AG-137 --checks "t268 t52 t215" -- node tools/tests/run-all.mjs t268 t52 t215 --agent antigravity --task AG-137 --jobs 1 --all-fails
GRANT antigravity AG-137: starting one game-test command
check-players: 308 player.position reads, all in the allowed places
ok    t52     17 pass   0 fail  24.9s
ok    t215     4 pass   0 fail  44.7s
ok    t268    25 pass   0 fail  42.0s

3 checks: 46 pass, 0 fail
```

### `camp-trapper` Screenshots (4 Lights + Gameplay Angles)
- Noon: `qa/2026-10-27-AG-137/trapper-yard-noon.png`
- Overcast: `qa/2026-10-27-AG-137/trapper-yard-overcast.png`
- Dusk: `qa/2026-10-27-AG-137/trapper-yard-dusk.png`
- Night: `qa/2026-10-27-AG-137/trapper-yard-night.png`
- Bulkhead shut + cache plinth (3P): `qa/2026-10-27-AG-137/trapper-bulkhead-shut-3p.png`
- Bulkhead open + stairwell descent (3P): `qa/2026-10-27-AG-137/trapper-bulkhead-open-3p.png`
- Entrance wing fence + post/horseshoes/traps (3P): `qa/2026-10-27-AG-137/trapper-gate-props-3p.png`
- Underground iron-lined cellar interior (`-2.15 m`, 1P): `qa/2026-10-27-AG-137/trapper-cellar-interior-1p.png`

---

## Part 2 — GPU Inspection of the 15 `'hill-ring'` Cave Foot Solids (`CL-256`)

### How the Cave Hill Ring & `sweep.js` Flag Work
- **Game generation (`index.html:7884-7899`)**: Each cave `c` scans a `2 m` grid over `[-26..+26]²` around `(c.x, c.z)` and collects cells (`g.dh >= DH`, where `DH = 0.9 m` above the natural terrain `rawH`) whose 4-neighbor minimum `g2.dh < DH` (the `0.9 m` contour ring, outside the mouth exclusion wedge). Each ring cell becomes a solid circle `(s.x, s.z, r = 1.8 m)` in `c.hillSolids` and `worldSolids`.
- **`sweep.js` check (`tools/sweep/sweep.js:306-317`)**: For each `s` in `c.hillSolids`, `sweep.js` measures the maximum rise along 8 compass rays at `d = 2.3 m` (`s.r + 0.5 m`):
  $$\text{rise}_{2.3\text{m}} = \max_{k=0..7}\bigl(\text{heightField}(s.x + 2.3\cos\theta_k,\, s.z + 2.3\sin\theta_k) - \text{heightField}(s.x, s.z)\bigr)$$
  If $\text{rise}_{2.3\text{m}} \le 1.2\text{ m}$ (equivalent to a mean slope $\le 27.5^\circ$ over $2.3\text{ m}$), `sweep.js` emits a `'hill-ring'` finding.

### Full 15-Point Measurement & GPU Visual Inspection Table (`qa/2026-10-27-AG-137/hill-rings-report.json`)

| # | Cave (Theme) | Solid `(x, z)` | Dist to Cave | `g2.dh` (`>=0.9`) | `rise2.3m` (`<=1.2`) | Steepest Local Slope (`grad`) | Radial Inward Slope (`+2m`) | Where It Sits Visually (3P & 1P Screenshots) | Verdict |
|---:|---|---|---:|---:|---:|---:|---:|---|---|
| **01** | `cave-1` (`rock`) | `(130, -212)` | `15.6 m` | `0.93 m` | `1.14 m` | **`25.6°`** | `24.1°` | Left flank of `cave-1` hill (`hill-ring-01-cave-1-3p.png`, `-1p.png`) — boots right on the rising green hill slope | **Fine as-is** (just `6 cm` under `1.20 m` cutoff) |
| **02** | `cave-1` (`rock`) | `(132, -210)` | `15.6 m` | `0.97 m` | `1.06 m` | **`21.6°`** | `20.2°` | Left-front flank of `cave-1` hill (`hill-ring-02-cave-1-3p.png`, `-1p.png`) — visibly rising hillside | **Fine as-is** (`21.6°` hillside) |
| **03** | `cave-1` (`rock`) | `(138, -206)` | `15.2 m` | `1.00 m` | `1.19 m` | **`26.1°`** | `-1.5°` (mouth dip) | Left mouth cheek boulder of `cave-1` (`hill-ring-03-cave-1-3p.png`, `-1p.png`) — right against cheek rock | **Fine as-is** (`1 cm` under `1.20 m` cutoff; mouth apron dip skews radial ray) |
| **04** | `cave-1` (`rock`) | `(148, -210)` | `14.1 m` | `1.07 m` | `0.90 m` | **`21.1°`** | `-20.0°` (mouth dip) | Right mouth cheek boulder of `cave-1` (`hill-ring-04-cave-1-3p.png`, `-1p.png`) — right at mouth boulder & sign | **Fine as-is** (cheek boulder + mouth depression) |
| **05** | `cave-3` (`iron`) | `(-152, 48)` | `14.1 m` | `1.01 m` | `1.18 m` | **`26.5°`** | `23.0°` | Left flank of `cave-3` hill (`hill-ring-05-cave-3-3p.png`, `-1p.png`) — steep hillside (`26.5°`) | **Fine as-is** (`2 cm` under `1.20 m` cutoff) |
| **06** | `cave-3` (`iron`, `wild:-150,50`) | `(-150, 48)` | `14.9 m` | `1.05 m` | `1.18 m` | **`28.2°`** | `26.5°` | Left-front flank of `cave-3` hill (`hill-ring-06-cave-3-3p.png`, `-1p.png`) — steep hillside (`28.2°`) | **Fine as-is** (`2 cm` under `1.20 m` cutoff; lands in `wild:-150,50` cell) |
| **07** | `cave-3` (`iron`) | `(-146, 44)` | `17.1 m` | `0.95 m` | `0.97 m` | **`24.2°`** | `-8.0°` (mouth dip) | Left mouth cheek boulder & pack cache at `cave-3` (`hill-ring-07-cave-3-3p.png`, `-1p.png`) | **Fine as-is** (guards left cheek of timber mine portal) |
| **08** | `cave-3` (`iron`) | `(-146, 30)` | `16.5 m` | `0.98 m` | `0.83 m` | **`16.6°`** | `-13.5°` (mouth dip) | Right mouth cheek boulder & warning sign at `cave-3` (`hill-ring-08-cave-3-3p.png`, `-1p.png`) | **Fine as-is** (right in front of cheek boulder + sign) |
| **09** | `cave-3` (`iron`) | `(-146, 32)` | `16.1 m` | `1.04 m` | `0.95 m` | **`20.3°`** | `-18.9°` (mouth dip) | Right mouth cheek boulder at `cave-3` (`hill-ring-09-cave-3-3p.png`, `-1p.png`) | **Fine as-is** (guards right cheek of timber mine portal) |
| **10** | `cave-3` (`iron`) | `(-144, 24)` | `21.6 m` | `0.93 m` | `0.90 m` | **`19.7°`** | `17.9°` | Outer right boulder toe of `cave-3` hill (`hill-ring-10-cave-3-3p.png`, `-1p.png`) — right at side boulder | **Fine as-is** (`19.7°` slope + flank boulder) |
| **11** | `cave-4` (`wet`) | `(-202, -32)` | `11.8 m` | `1.23 m` | `0.62 m` | **`14.9°`** | `-14.8°` (mouth dip) | Right mouth cheek of `cave-4` (`hill-ring-11-cave-4-3p.png`, `-1p.png`) — on rising cheek crest | **Fine as-is** (mouth apron dip makes radial ray negative while cheek rises `15°`) |
| **12** | `cave-4` (`wet`) | `(-204, -30)` | `12.0 m` | `1.09 m` | `0.85 m` | **`18.0°`** | `-9.1°` (mouth dip) | Right mouth cheek of `cave-4` (`hill-ring-12-cave-4-3p.png`, `-1p.png`) — right beside mouth shrub/cheek | **Fine as-is** (guards right mouth cheek) |
| **13** | `cave-4` (`wet`) | `(-196, -18)` | `14.2 m` | `0.99 m` | `1.02 m` | **`11.7°`** | `33.9°` (`+3.55 m` at `6m`) | North/back-right foot of `cave-4` (`hill-ring-13-cave-4-3p.png`, `-1p.png`) — at the base crease of the `34°` hill | **Borderline (~`1.5 m` toe-out)**; visually still at the hill's foot crease |
| **14** | `cave-4` (`wet`) | `(-200, -14)` | `14.9 m` | `1.25 m` | `0.87 m` | **`16.1°`** | `32.9°` (`+3.81 m` at `6m`) | North/back-right foot of `cave-4` (`hill-ring-14-cave-4-3p.png`, `-1p.png`) — at the base crease of the `33°` hill | **Borderline (~`1.5 m` toe-out)**; visually still at the hill's foot crease |
| **15** | `cave-6` (`clock`) | `(206, 204)` | `14.1 m` | `1.13 m` | `1.17 m` | **`26.7°`** | `-1.1°` (mouth dip) | Right cheek boulder & tree flank at `cave-6` (`hill-ring-15-cave-6-3p.png`, `-1p.png`) | **Fine as-is** (`3 cm` under `1.20 m` cutoff; `26.7°` cheek slope) |

### Summary Verdict & Recommendation for Claude / Cursor (`CL-256`)
1. **Why 13 of the 15 points are false alarms in `sweep.js`**:
   - **5 flank points (`#01, #02` at `cave-1`; `#05, #06, #10` at `cave-3`)** sit on visibly steep hillsides (`19.7°–28.2°`, `rise2.3m = 0.90–1.18 m`) that just barely miss `sweep.js`'s `1.20 m` (`27.5°`) cutoff by `2–30 cm`.
   - **8 mouth-cheek points (`#03, #04` at `cave-1`; `#07, #08, #09` at `cave-3`; `#11, #12` at `cave-4`; `#15` at `cave-6`)** sit right where the cave hill's left/right cheek meets the sunken cave-mouth apron. Because the mouth apron depresses `heightField` inward toward `(c.x, c.z)`, the 8-ray max rise over `2.3 m` is capped (`0.62–1.19 m`) even though the cheek wall and mouth boulders rise right in front of the marine. Removing or pulling those back would let the player walk into the side cheeks of the cave portal.
2. **What happens at the 2 borderline points (`#13` and `#14` on `cave-4`)**:
   - On `cave-4`'s north/back-right foot (`(-196, -18)` and `(-200, -14)`), the hill mound's outer blend creates a `~1.5 m` apron where `g2.dh` is already `0.99–1.25 m` above `rawH` while the local slope is `11.7°–16.1°`, right before the hill pitches up to `33°–34°` (`+3.55..+3.81 m`). In both 3P (`hill-ring-13-cave-4-3p.png`, `hill-ring-14-cave-4-3p.png`) and 1P (`-1p.png`), the marine stops right at the visible base crease of the hill mound, so it still reads visually as the foot of the hill rather than flat open ground.
3. **Why changing `DH` globally in `index.html:7886` is not enough on its own (`dhSensitivity` from `hill-rings-report.json`)**:
   - `DH = 0.90` (current): `150` total ring solids across all 6 caves, `15` with `rise2.3m <= 1.2 m`, max adjacent gap `2.83 m`.
   - `DH = 1.10`: `144` solids, `13` with `rise2.3m <= 1.2 m`, max gap `2.83 m`.
   - `DH = 1.25`: `141` solids, `12` with `rise2.3m <= 1.2 m`, max gap `2.83 m`.
   - `DH = 1.40`: `136` solids, `10` with `rise2.3m <= 1.2 m`, max gap `2.83 m`.
   - **Recommendation**: Keep `DH = 0.9` in `index.html:7886` (since 13/15 points are genuine `15°–28°` mouth cheeks and hill flanks, and the remaining 2 at `cave-4` stop right at the visible hill toe crease), **or** adjust `sweep.js:317` so `hill-ring` only flags solids where `rise < 0.80` **and** the solid is not within `4 m` of the cave mouth cheek wedge (`dot > 6`).

---

## Rule 19 Assessment (`docs/art-direction.md`, `docs/asset-principles.md`)

- **Family**: Family 2 — **The Built World / Improvised Survivor Fortification** (Okafor's Trapper Yard & Iron-Lined Cellar Bulkhead).
- **4-Light & Context Passes Inspected**:
  - `trapper-yard-noon.png`, `trapper-yard-overcast.png`, `trapper-yard-dusk.png`, `trapper-yard-night.png`
  - `trapper-bulkhead-shut-3p.png`, `trapper-bulkhead-open-3p.png`, `trapper-gate-props-3p.png`, `trapper-cellar-interior-1p.png`

| Category | Score (0–5) | Notes |
| --- | :---: | --- |
| **Silhouette & Readability** | **5 / 5** | Distinct two-part silhouette from gameplay camera: flared split-rail yard fence leading through the 8-row leaf bed to the sloped timber-and-iron cellar bulkhead mound (`trapper-yard-noon.png`). |
| **Materials & Surface Response** | **5 / 5** | Rough split-rail cedar, rusted iron straps/horseshoes, damp autumn leaf litter, and stone bulkhead threshold read cleanly across noon, overcast, dusk, and night (`trapper-yard-dusk.png`, `trapper-yard-night.png`). |
| **Scale & Proportion** | **5 / 5** | Bulkhead doors, right-hand cache plinth (`lx = +0.72, lz = +0.14`), `1.8 m` entrance gate, and `-2.15 m` cellar room match marine eye height (`1.65 m`) in both 3P and 1P (`trapper-bulkhead-open-3p.png`, `trapper-cellar-interior-1p.png`). |
| **World & Terrain Integration** | **5 / 5** | Zero terrain triangles poking into the stairwell or underground cellar; ground-slab turf aprons blend the cellar mound seamlessly into the campsite terrain with `0` `sweep.js` overlap or reach findings. |
