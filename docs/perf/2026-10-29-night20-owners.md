# Night 20 — Draws and Triangles by Owner (`82d75118` vs Current Build, Probe B)

Date: 2026-10-29
Agent: Antigravity (`AG-151`, follow-up to `CU-170` and `MU-2`)
Old build: `82d75118` (detached worktree outside repo, removed after run)
New build: `HEAD` (`c3cd9c86`, `feature/Phis-changes`)
Scenario: `node tools/bench.mjs --night 20 --gfx high` (Night 20 peak, push 6/6, 48 zombies)
Raw data: `qa/2026-10-29-AG-151/probe-b.json`

---

## 1. Summary of Findings

1. **Where the Night-20 HQ draw and triangle growth actually comes from**:
   - **`landmarks`** in the HQ camera frustum grew by **`+16` draws** (`3 -> 19`) and **`+6,250` triangles** (`78,202 -> 84,452`), driven by the FOB / HQ compound perimeter dressing: `landmark:fence` (`+7` draws, `+3,516` tris), `landmark:shed` (`+3` draws, `+1,160` tris), `landmark:sign` (`+2` draws, `+86` tris), `fob-tyre-ruts-1` (`+1` draw, `+504` tris), `fob-tyre-ruts-2` (`+1` draw, `+504` tris), `landmark:camp` (`+1` draw, `+360` tris), and `fob-gen-pad` (`+1` draw, `+120` tris).
   - **`houses` (`house (HQ)`)** in the HQ camera frustum grew by **`+4` to `+5` draws** (`70 -> 75` live, `71 -> 75` deterministic) and **`+3,792` to `+3,828` triangles** (`37,996 -> 41,824`), driven by `hq-duty-board` (`+3` draws, `+746` tris), `hq-radio-set` (`+2` draws, `+1,230` tris), and merged HQ cabin detail geometry (`+0` draws, `+1,852` tris).
   - Together, **`landmarks` + `houses`** in the standard HQ view add **`+20` to `+21` in-frustum draws** and **`+10,042` to `+10,078` in-frustum triangles** every frame on Night 20 — accounting for the ~`+8,500–9,000` non-zombie triangle increase that `MU-2` deduced from `CU-170`'s `+10,411` total delta.
2. **Zombies (`48` active on Night 20)**:
   - On the live GPU (after `compactZombieMesh` and `skinZombieMesh`), **every single Night-20 zombie type changed by `+0` drawn meshes** (and `+0` `skinSrc` meshes), confirming `MU-2`'s Node mesh count (`+0`).
   - Across the full 48-zombie Night-20 cohort (`9 shambler, 6 feral, 5 military, 5 leaper, 4 brute, 4 spider, 4 drowned, 3 bomber, 3 spitter, 3 demon, 2 screamer`), visible zombie meshes are `72 -> 72 (+0)` and visible zombie triangles are `250,022 -> 251,658` (**`+1,636` triangles** across all 48 bodies).
3. **Out-of-frustum world / history props (`visibleSceneMeshes`)**:
   - Outside the HQ camera frustum, **`history props`** (including `objective-props` and `trapper-path`) grew by **`+109` visible scene meshes** (`178 -> 287`) and **`+55,198` visible triangles** (`86,998 -> 142,196`), led by `trapper-path-static` (`+1` visible mesh, `+48,150` visible tris; total `10,300 -> 48,150`, `+37,850` tris), `trailhead-board` (`7 -> 66`, `+59` meshes, `+966` tris), `trapper-cellar` roof cap/doors/bar/horseshoes (`+32` visible meshes, `+4,024` tris), `dropped-helmet` (`+0` meshes, `+3,072` tris), `ranger-hiker-roster` (`+8` meshes, `+134` tris), and `hikers-camp-roster` (`+7` meshes, `+158` tris).

---

## 2. Draws and Triangles by Owner (Sorted by Change in Draws, then Triangles)

### 2A. Controlled Night-20 Peak (`detPeak`: Fixed 48-Zombie Cohort at HQ)

| Owner | Old Draws (Frustum) | New Draws (Frustum) | Δ Draws (Frustum) | Old Tris (Frustum) | New Tris (Frustum) | Δ Tris (Frustum) | Old Vis Meshes (Scene) | New Vis Meshes (Scene) | Δ Vis Meshes | Old Vis Tris (Scene) | New Vis Tris (Scene) | Δ Vis Tris |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `landmarks` | 3 | 19 | **+16** | 78,202 | 84,452 | **+6,250** | 8 | 24 | +16 | 93,314 | 98,364 | +5,050 |
| `houses` | 71 | 75 | **+4** | 38,032 | 41,824 | **+3,792** | 81 | 85 | +4 | 38,448 | 42,240 | +3,792 |
| `zombies` | 32 | 33 | **+1** | 114,404 | 119,598 | **+5,194** | 72 | 72 | 0 | 250,022 | 251,658 | +1,636 |
| `ground and water` | 17 | 17 | **0** | 214,799 | 214,799 | **0** | 94 | 94 | 0 | 225,058 | 225,058 | 0 |
| `the player and his gun` | 106 | 106 | **0** | 77,856 | 77,856 | **0** | 106 | 106 | 0 | 77,856 | 77,856 | 0 |
| `history props` | 6 | 6 | **0** | 512 | 512 | **0** | 178 | 287 | +109 | 86,998 | 142,196 | +55,198 |
| `buildables and turrets` | 7 | 7 | **0** | 308 | 308 | **0** | 7 | 7 | 0 | 308 | 308 | 0 |
| `wire` | 0 | 0 | **0** | 0 | 0 | **0** | 0 | 0 | 0 | 0 | 0 | 0 |
| `trees and foliage` | 39 | 39 | **0** | 203,191 | 203,045 | **-146** | 406 | 406 | 0 | 810,337 | 810,191 | -146 |
| `effects` | 98 | 97 | **-1** | 40,650 | 32,566 | **-8,084** | 413 | 360 | -53 | 113,404 | 105,364 | -8,040 |
| **Scene Frustum Total** | **379** | **399** | **+20** | **767,954** | **774,960** | **+7,006** | **1,365** | **1,441** | **+76** | **1,695,745** | **1,753,235** | **+57,490** |
| **`renderer.info.render` Total** | **342** | **361** | **+19** | **728,930** | **735,936** | **+7,006** | — | — | — | — | — | — |

> **Note on `effects (-1 draw, -8,084 tris)` and `zombies (+1 draw, +5,194 tris)` in `detPeak`**:
> - In `old`, 1 wild `rabbit-skin` (`1` draw, `8,072` triangles; total `3` in scene = `24,216` tris in both builds) wandered through the HQ frustum at capture time (`-8,072` tris).
> - In `new`, 1 additional `leaper` (`1` draw, `4,634` tris) on the edge of the cohort stood inside the frustum (`2 -> 3` leapers in frustum = `+4,714` tris, while the `9 shamblers`, `6 ferals`, and `5 military` in frustum contributed `+216 + 144 + 120 = +480` tris).
> - Excluding the 1 wandering rabbit (`-8,072` tris), the frustum triangle increase in `detPeak` is **`+15,078` triangles** (`+6,250` `landmarks` + `+3,792` `houses` + `+5,194` `zombies` - `146` `trees and foliage` - `12` `effects`).

### 2B. Live Wave Spawn Peak (`livePeak`: 48 Zombies Out on Push 6/6)

| Owner | Old Draws (Frustum) | New Draws (Frustum) | Δ Draws (Frustum) | Old Tris (Frustum) | New Tris (Frustum) | Δ Tris (Frustum) | Old Vis Meshes (Scene) | New Vis Meshes (Scene) | Δ Vis Meshes | Old Vis Tris (Scene) | New Vis Tris (Scene) | Δ Vis Tris |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `landmarks` | 3 | 19 | **+16** | 78,202 | 84,452 | **+6,250** | 8 | 24 | +16 | 93,314 | 98,364 | +5,050 |
| `houses` | 70 | 75 | **+5** | 37,996 | 41,824 | **+3,828** | 80 | 85 | +5 | 38,412 | 42,240 | +3,828 |
| `ground and water` | 17 | 17 | **0** | 214,799 | 214,799 | **0** | 94 | 94 | 0 | 225,058 | 225,058 | 0 |
| `the player and his gun` | 106 | 106 | **0** | 77,856 | 77,856 | **0** | 106 | 106 | 0 | 77,856 | 77,856 | 0 |
| `history props` | 6 | 6 | **0** | 512 | 512 | **0** | 178 | 287 | +109 | 86,998 | 142,196 | +55,198 |
| `buildables and turrets` | 7 | 7 | **0** | 308 | 308 | **0** | 7 | 7 | 0 | 308 | 308 | 0 |
| `wire` | 0 | 0 | **0** | 0 | 0 | **0** | 0 | 0 | 0 | 0 | 0 | 0 |
| `trees and foliage` | 39 | 39 | **0** | 203,191 | 203,045 | **-146** | 406 | 406 | 0 | 810,337 | 810,191 | -146 |
| `zombies` | 13 | 12 | **-1** | 11,248 | 6,240 | **-5,008** | 91 | 96 | +5 | 237,596 | 269,616 | +32,020 |
| `effects` | 14 | 10 | **-4** | 43,146 | 32,022 | **-11,124** | 205 | 165 | -40 | 111,212 | 103,380 | -7,832 |
| **Scene Frustum Total** | **275** | **291** | **+16** | **667,258** | **661,058** | **-6,200** | **1,175** | **1,270** | **+95** | **1,681,091** | **1,769,209** | **+88,118** |
| **`renderer.info.render` Total** | **237** | **253** | **+16** | **628,234** | **622,034** | **-6,200** | — | — | — | — | — | — |

### 2C. Reconciliation with `renderer.info.render`

Across all four captures (`old.livePeak`, `new.livePeak`, `old.detPeak`, `new.detPeak`), the difference between the Scene Frustum Walk sum and `renderer.info.render` is **constant at exactly `39,024` triangles (`37–38` draws)**:
- `old.livePeak`: `667,258 - 628,234 = 39,024` tris (`275 - 237 = 38` draws)
- `new.livePeak`: `661,058 - 622,034 = 39,024` tris (`291 - 253 = 38` draws)
- `old.detPeak`: `767,954 - 728,930 = 39,024` tris (`379 - 342 = 37` draws)
- `new.detPeak`: `774,960 - 735,936 = 39,024` tris (`399 - 361 = 38` draws)

Those `39,024` triangles are:
1. **`marine-shadow-proxy`** (`1` mesh, `22,290` triangles): `visible === true` and inside the frustum, but built with `skinMergeGroup(..., { shadowOnly: true })` so `skin.layers.test(camera.layers)` returns `false` for `TT.camera` (it draws only in `sun.shadow.camera`, which is deep-throttled on Night 20).
2. **Idle `InstancedMesh` / particle effect holders** (`bloodDropMesh` = `7,800` tris, `bloodDecalMesh` = `3,600` tris, plus `35–36` pooled effect sphere/tetrahedron meshes = `5,335` tris, minus `1` post-processing fullscreen pass triangle = `-1` tri): `22,290 + 7,800 + 3,600 + 5,335 - 1 = 39,024` triangles.

---

## 3. Named Children One Level Down (Every Active or Changed Child Group)

Sorted by change in in-frustum draws (`Δ Draws`), then change in in-frustum triangles (`Δ Tris`), then change in visible scene triangles (`Δ Vis Tris`):

| Owner / Top-Level Group -> Named Child | Old Draws | New Draws | Δ Draws | Old Tris | New Tris | Δ Tris | Old Vis Meshes | New Vis Meshes | Δ Vis Meshes | Old Vis Tris | New Vis Tris | Δ Vis Tris |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `landmarks / landmark:fence -> fence` | 1 | 8 | **+7** | 96 | 3,612 | **+3,516** | 2 | 9 | +7 | 288 | 3,804 | +3,516 |
| `landmarks / landmark:shed -> shed` | 0 | 3 | **+3** | 0 | 1,160 | **+1,160** | 1 | 4 | +3 | 1,540 | 2,700 | +1,160 |
| `houses / house (HQ) -> hq-duty-board` | 0 | 3 | **+3** | 0 | 746 | **+746** | 0 | 3 | +3 | 0 | 746 | +746 |
| `houses / house (HQ) -> hq-radio-set` | 0 | 2 | **+2** | 0 | 1,230 | **+1,230** | 0 | 2 | +2 | 0 | 1,230 | +1,230 |
| `landmarks / landmark:sign -> sign` | 0 | 2 | **+2** | 0 | 86 | **+86** | 0 | 2 | +2 | 0 | 86 | +86 |
| `zombies / zombie:leaper -> zombie-skin` | 2 | 3 | **+1** | 9,188 | 13,902 | **+4,714** | 5 | 5 | 0 | 22,970 | 23,170 | +200 |
| `landmarks / fob-pads -> fob-tyre-ruts-1` | 0 | 1 | **+1** | 0 | 504 | **+504** | 0 | 1 | +1 | 0 | 504 | +504 |
| `landmarks / fob-pads -> fob-tyre-ruts-2` | 0 | 1 | **+1** | 0 | 504 | **+504** | 0 | 1 | +1 | 0 | 504 | +504 |
| `landmarks / landmark:camp -> camp` | 0 | 1 | **+1** | 0 | 360 | **+360** | 0 | 1 | +1 | 0 | 360 | +360 |
| `landmarks / fob-pads -> fob-gen-pad` | 0 | 1 | **+1** | 0 | 120 | **+120** | 0 | 1 | +1 | 0 | 120 | +120 |
| `effects / Mesh -> TetrahedronGeometry:MeshStandardMaterial` | 55 | 56 | **+1** | 220 | 224 | **+4** | 80 | 80 | 0 | 320 | 320 | 0 |
| `houses / house (HQ) -> Mesh` | 10 | 10 | **0** | 16,730 | 18,582 | **+1,852** | 20 | 20 | 0 | 17,146 | 18,998 | +1,852 |
| `zombies / zombie:shambler -> zombie-skin` | 9 | 9 | **0** | 45,072 | 45,288 | **+216** | 9 | 9 | 0 | 45,072 | 45,288 | +216 |
| `zombies / zombie:feral -> zombie-skin` | 6 | 6 | **0** | 28,680 | 28,824 | **+144** | 6 | 6 | 0 | 28,680 | 28,824 | +144 |
| `zombies / zombie:military -> zombie-skin` | 10 | 10 | **0** | 29,760 | 29,880 | **+120** | 10 | 10 | 0 | 29,760 | 29,880 | +120 |
| `history props / trapper-path -> trapper-path-static` | 0 | 0 | **0** | 0 | 0 | **0** | 0 | 1 | +1 | 0 | 48,150 | +48,150 |
| `landmarks / landmark:mast -> mast-skeleton` | 0 | 0 | **0** | 0 | 0 | **0** | 0 | 1 | +1 | 0 | 4,884 | +4,884 |
| `history props / history-props -> dropped-helmet` | 0 | 0 | **0** | 0 | 0 | **0** | 2 | 2 | 0 | 192 | 3,264 | +3,072 |
| `history props / trapper-path -> trapper-horseshoe` | 0 | 0 | **0** | 0 | 0 | **0** | 0 | 8 | +8 | 0 | 1,696 | +1,696 |
| `effects / bird-flock -> flock-bird` | 0 | 0 | **0** | 0 | 0 | **0** | 136 | 102 | -34 | 1,632 | 3,060 | +1,428 |
| `history props / trapper-path -> trapper-cellar-roof-cap` | 0 | 0 | **0** | 0 | 0 | **0** | 0 | 21 | +21 | 0 | 1,096 | +1,096 |
| `history props / history-props -> trailhead-board` | 0 | 0 | **0** | 0 | 0 | **0** | 7 | 66 | +59 | 54 | 1,020 | +966 |
| `zombies / zombie:bomber -> bomber` (gut/veins) | 0 | 0 | **0** | 0 | 0 | **0** | 3 | 3 | 0 | 864 | 1,584 | +720 |
| `history props / trapper-path -> trapper-cellar-door-left` | 0 | 0 | **0** | 0 | 0 | **0** | 0 | 1 | +1 | 0 | 592 | +592 |
| `history props / trapper-path -> trapper-cellar-door-right` | 0 | 0 | **0** | 0 | 0 | **0** | 0 | 1 | +1 | 0 | 592 | +592 |
| `history props / insulated-boots -> rubber-boot` | 0 | 0 | **0** | 0 | 0 | **0** | 2 | 2 | 0 | 2,472 | 2,960 | +488 |
| `zombies / zombie:bomber -> zombie-skin` | 0 | 0 | **0** | 0 | 0 | **0** | 3 | 3 | 0 | 16,080 | 16,512 | +432 |
| `zombies / zombie:brute -> zombie-skin` | 0 | 0 | **0** | 0 | 0 | **0** | 4 | 4 | 0 | 23,584 | 23,776 | +192 |
| `history props / history-props -> hikers-camp-roster` | 0 | 0 | **0** | 0 | 0 | **0** | 0 | 7 | +7 | 0 | 158 | +158 |
| `history props / history-props -> ranger-hiker-roster` | 0 | 0 | **0** | 0 | 0 | **0** | 0 | 8 | +8 | 0 | 134 | +134 |
| `zombies / zombie:drowned -> zombie-skin` | 0 | 0 | **0** | 0 | 0 | **0** | 4 | 4 | 0 | 22,736 | 22,832 | +96 |
| `history props / trapper-path -> trapper-cellar-door-bar` | 0 | 0 | **0** | 0 | 0 | **0** | 0 | 1 | +1 | 0 | 48 | +48 |
| `history props / objective-props -> site:objective:radio-repair` | 0 | 0 | **0** | 0 | 0 | **0** | 3 | 7 | +4 | 940 | 988 | +48 |
| `zombies / zombie:bomber -> bomber-branching-veins` | 0 | 0 | **0** | 0 | 0 | **0** | 3 | 3 | 0 | 864 | 888 | +24 |
| `ground and water / ground-sectors` | 16 | 16 | **0** | 189,129 | 189,129 | **0** | 18 | 18 | 0 | 196,864 | 196,864 | 0 |
| `trees and foliage / tree-batch -> tree-batch-leaf` | 9 | 9 | **0** | 92,320 | 92,320 | **0** | 64 | 64 | 0 | 444,192 | 444,192 | 0 |
| `the player and his gun / player -> marine` | 89 | 89 | **0** | 50,274 | 50,274 | **0** | 89 | 89 | 0 | 50,274 | 50,274 | 0 |
| `landmarks / boundary-wall (mortar core & coping)` | 1 | 1 | **0** | 42,512 | 42,512 | **0** | 1 | 1 | 0 | 42,512 | 42,512 | 0 |
| `landmarks / boundary-wall (stone courses)` | 1 | 1 | **0** | 35,594 | 35,594 | **0** | 1 | 1 | 0 | 35,594 | 35,594 | 0 |
| `trees and foliage / tree-batch -> tree-batch-wood` | 9 | 9 | **0** | 28,362 | 28,362 | **0** | 64 | 64 | 0 | 172,568 | 172,568 | 0 |
| `ground and water / streamGroup (river & stream)` | 1 | 1 | **0** | 25,670 | 25,670 | **0** | 76 | 76 | 0 | 28,194 | 28,194 | 0 |
| `the player and his gun / player -> marine-shadow-proxy` | 1 | 1 | **0** | 22,290 | 22,290 | **0** | 1 | 1 | 0 | 22,290 | 22,290 | 0 |
| `effects / Group -> BufferGeometry:MeshStandardMaterial` | 1 | 1 | **0** | 16,080 | 16,080 | **0** | 1 | 1 | 0 | 16,080 | 16,080 | 0 |
| `houses / house (HQ) -> hq-cif` | 4 | 4 | **0** | 11,800 | 11,800 | **0** | 4 | 4 | 0 | 11,800 | 11,800 | 0 |
| `effects / instanced:SphereGeometry -> SphereGeometry` | 1 | 1 | **0** | 7,800 | 7,800 | **0** | 1 | 1 | 0 | 7,800 | 7,800 | 0 |
| `houses / house (HQ) -> hq-armory` | 19 | 19 | **0** | 6,268 | 6,268 | **0** | 19 | 19 | 0 | 6,268 | 6,268 | 0 |
| `the player and his gun / player -> weapon:pistol` | 16 | 16 | **0** | 5,292 | 5,292 | **0** | 16 | 16 | 0 | 5,292 | 5,292 | 0 |
| `effects / instanced:CircleGeometry -> CircleGeometry` | 1 | 1 | **0** | 3,600 | 3,600 | **0** | 1 | 1 | 0 | 3,600 | 3,600 | 0 |
| `effects / Mesh -> BufferGeometry:MeshStandardMaterial` | 1 | 1 | **0** | 2,446 | 2,446 | **0** | 1 | 1 | 0 | 2,446 | 2,446 | 0 |
| `houses / house (HQ) -> hq-skull-intake` | 13 | 13 | **0** | 2,204 | 2,204 | **0** | 13 | 13 | 0 | 2,204 | 2,204 | 0 |
| `effects / Mesh -> SphereGeometry:MeshBasicNodeMaterial` | 1 | 1 | **0** | 1,840 | 1,840 | **0** | 1 | 1 | 0 | 1,840 | 1,840 | 0 |
| `zombies / zombie:demon -> demon-fire-fists` | 3 | 3 | **0** | 1,560 | 1,560 | **0** | 3 | 3 | 0 | 1,560 | 1,560 | 0 |
| `houses / house (HQ) -> hq-alarm-cabinet` | 5 | 5 | **0** | 714 | 714 | **0** | 5 | 5 | 0 | 714 | 714 | 0 |
| `trees and foliage / rock-batch -> rock-batch:-1,-1` | 1 | 1 | **0** | 576 | 576 | **0** | 1 | 1 | 0 | 576 | 576 | 0 |
| `trees and foliage / rock-batch -> rock-batch:-1,0` | 1 | 1 | **0** | 560 | 560 | **0** | 1 | 1 | 0 | 560 | 560 | 0 |
| `history props / fuel-depot -> hq-generator` | 6 | 6 | **0** | 512 | 512 | **0** | 6 | 6 | 0 | 512 | 512 | 0 |
| `trees and foliage / rock-batch -> rock-batch:1,0` | 1 | 1 | **0** | 500 | 500 | **0** | 1 | 1 | 0 | 500 | 500 | 0 |
| `buildables and turrets / kiosk` | 7 | 7 | **0** | 308 | 308 | **0** | 7 | 7 | 0 | 308 | 308 | 0 |
| `houses / house (HQ) -> Group` | 16 | 16 | **0** | 264 | 264 | **0** | 16 | 16 | 0 | 264 | 264 | 0 |
| `trees and foliage / tree-individual -> tree` | 1 | 1 | **0** | 255 | 255 | **0** | 1 | 1 | 0 | 255 | 255 | 0 |
| `trees and foliage / rock-batch -> rock-batch:0,0` | 1 | 1 | **0** | 224 | 224 | **0** | 1 | 1 | 0 | 224 | 224 | 0 |
| `zombies / zombie:screamer -> screamer-black-vapor` | 2 | 2 | **0** | 144 | 144 | **0** | 2 | 2 | 0 | 144 | 144 | 0 |
| `houses / house (HQ) -> fob-lockdown-door` | 1 | 1 | **0** | 12 | 12 | **0** | 1 | 1 | 0 | 12 | 12 | 0 |
| `houses / house (HQ) -> hq-designation` | 1 | 1 | **0** | 2 | 2 | **0** | 1 | 1 | 0 | 2 | 2 | 0 |
| `zombies / zombie:screamer -> zombie-skin` | 0 | 0 | **0** | 0 | 0 | **0** | 2 | 2 | 0 | 11,056 | 10,968 | -88 |
| `effects / burrow` | 0 | 0 | **0** | 0 | 0 | **0** | 2 | 2 | 0 | 7,668 | 7,516 | -152 |
| `zombies / zombie:spitter -> zombie-skin` | 0 | 0 | **0** | 0 | 0 | **0** | 3 | 3 | 0 | 15,276 | 14,856 | -420 |
| `history props / history-props -> cellar-hatch` | 0 | 0 | **0** | 0 | 0 | **0** | 2 | 0 | -2 | 1,840 | 0 | -1,840 |
| `landmarks / landmark:campsite -> campsite` | 0 | 0 | **0** | 0 | 0 | **0** | 2 | 1 | -1 | 10,632 | 4,548 | -6,084 |
| `effects / bird-skin` | 0 | 0 | **0** | 0 | 0 | **0** | 26 | 20 | -6 | 39,468 | 30,360 | -9,108 |
| `trees and foliage / foliage-chunks -> foliage-chunk` | 16 | 16 | **0** | 80,394 | 80,248 | **-146** | 81 | 81 | 0 | 189,054 | 188,908 | -146 |
| `effects / Mesh -> SphereGeometry:MeshBasicMaterial` | 37 | 36 | **-1** | 592 | 576 | **-16** | 136 | 123 | -13 | 2,176 | 1,968 | -208 |
| `houses / house (HQ) -> hq-damaged-terminal` | 2 | 1 | **-1** | 38 | 2 | **-36** | 2 | 1 | -1 | 38 | 2 | -36 |
| `effects / rabbit-skin` | 1 | 0 | **-1** | 8,072 | 0 | **-8,072** | 3 | 3 | 0 | 24,216 | 24,216 | 0 |

---

## 4. Per-Zombie-Type Meshes and Triangles (In-Game vs `MU-2` Node Table)

Measured in the live browser via `TT.spawnZombie(px, pz + 8, typeKey)` after `compactZombieMesh`, `skinZombieMesh`, `attachZombieAbilityVisuals`, and `attachScreamerAppearance`:

| Zombie Type | Old Drawn Meshes | New Drawn Meshes | Δ Drawn Meshes | Old Drawn Tris | New Drawn Tris | Δ Drawn Tris (Live) | `MU-2` Δ Tris (Node) | Old `skinSrc` Meshes | New `skinSrc` Meshes | Δ `skinSrc` Meshes |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `bomber` | 3 | 3 | **0** | 5,936 | 6,328 | **+392** | +384 | 16 | 16 | 0 |
| `colossus` | 3 | 3 | **0** | 6,800 | 6,976 | **+176** | +176 | 16 | 16 | 0 |
| `brute` | 1 | 1 | **0** | 5,896 | 5,944 | **+48** | +48 | 18 | 18 | 0 |
| `leaper` | 1 | 1 | **0** | 4,594 | 4,634 | **+40** | +24 | 12 | 12 | 0 |
| `shambler` | 1 | 1 | **0** | 5,008 | 5,032 | **+24** | +24 | 14 | 14 | 0 |
| `feral` | 1 | 1 | **0** | 4,780 | 4,804 | **+24** | +24 | 14 | 14 | 0 |
| `military` | 2 | 2 | **0** | 5,952 | 5,976 | **+24** | +24 | 28 | 28 | 0 |
| `drowned` | 1 | 1 | **0** | 5,684 | 5,708 | **+24** | +24 | 14 | 14 | 0 |
| `spider` | 1 | 1 | **0** | 3,794 | 3,794 | **0** | 0 | 15 | 15 | 0 |
| `demon` | 2 | 2 | **0** | 5,672 | 5,672 | **0** | 0 | 16 | 16 | 0 |
| `guardian` | 5 | 5 | **0** | 9,016 | 9,016 | **0** | — | 58 | 58 | 0 |
| `caveguard` | 3 | 3 | **0** | 11,878 | 11,878 | **0** | — | 56 | 56 | 0 |
| `screamer` | 1 | 1 | **0** | 5,528 | 5,484 | **-44** | -44 | 16 | 16 | 0 |
| `spitter` | 3 | 3 | **0** | 5,228 | 5,088 | **-140** | -140 | 17 | 17 | 0 |
