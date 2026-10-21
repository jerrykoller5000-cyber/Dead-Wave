# AG-85 — Fresh Close-Ups of Fixed Hats (`studio/marine-hats.js`) & GPU Frame-Time Numbers (`tools/bench.mjs`)

- **Date**: 2026-10-18
- **GPU / Renderer**: `NVIDIA GeForce RTX 5080` (`Direct3D11` / WebGPU, non-headless via machine-wide game-test slot)
- **Contact Sheets**:
  - `qa/2026-10-18-AG-85/shots/hats-closeup-sheet.jpg` (8 fresh close-ups + macro shots)
  - `qa/2026-10-18-AG-85/shots/hats-before-after-sheet.jpg` (5×2 Before `AG-81` vs After `AG-85` comparison)

---

## 1. Fresh Hat Close-Ups & Verification (`studio/marine-hats.js`)

All three geometry defects reported in `AG-81` are confirmed fixed in the Marine Inspector (`index.html?inspect`):

| Hat / Detail | Before (`AG-81`) | After (`AG-85`) | Screenshot Evidence |
| --- | --- | --- | --- |
| **Boonie side grommets** (`z = ±0.05`, `y = 1.552`) | Used `z = 0` crown half-width `w`, leaving the side eyelets floating **4–6 mm** off the narrowed crown with visible daylight gap (`qa/2026-10-18-AG-81/shots/hat-boonie.png`). | Computes `c` and `x = w * Math.sqrt(Math.max(0, 1 - c * c))` on `ringAt(boonieRings, 1.552)` at `z = ±0.05`; both brass/ink eyelets sit flush against the crown slope with zero daylight gap. | `qa/2026-10-18-AG-85/shots/hat-boonie.png`, `qa/2026-10-18-AG-85/shots/hat-boonie-grommets-macro.png` |
| **Ballcap 6-panel seam tubes** (`ballcap` & `ballcapBack`) | 6-point `CatmullRomCurve3` spline bowed outside the linear loft segments between `y = 1.52` and `y = 1.575`, floating proud of the dome silhouette (`qa/2026-10-18-AG-81/shots/hat-ballcap-back-front.png`). | Subdivides each straight loft segment into 4 linear steps (`rows[r].clone().lerp(rows[r + 1], k / 4)`) with `'centripetal'` parameterization; all 6 seam tubes hug the faceted dome cleanly with zero gap. | `qa/2026-10-18-AG-85/shots/hat-ballcap.png`, `qa/2026-10-18-AG-85/shots/hat-ballcap-seams-macro.png` |
| **Ballcap rear adjustment strap** (`y = 1.525`) | Straight `rmesh` box (`0.056 m` wide) stood proud at its left/right corners off the curved rear dome (`qa/2026-10-18-AG-81/shots/hat-ballcap-back-front.png`). | Replaced with a 9-point curved `CatmullRomCurve3` `TubeGeometry` (`strap.scale.set(1, 3, 1)`) following `ringAt(ballRings, 1.525)` around the back arc. | `qa/2026-10-18-AG-85/shots/hat-ballcap-back-front.png`, `qa/2026-10-18-AG-85/shots/hat-ballcap-back-rear.png` |
| **8-point utility cover** (`cover`) | Clean octagonal crown, band seam, drooped bill, front emblem (`qa/2026-10-18-AG-81/shots/hat-cover.png`). | Unchanged and clean (`87,862` tris with full Training Ground loadout). | `qa/2026-10-18-AG-85/shots/hat-cover.png` |

---

## 2. GPU Frame-Time Numbers on Jerry's RTX 5080 (`tools/bench.mjs`)

### Summary (Pre- vs Post-`CL-210` / `AG-84`)
1. **Draw-call reduction from `CL-210` (`studio/marine-skin.js`) & `AG-84` (`build.sandbag:2`)**: Full-match last-push draw calls across **Nights 5, 10, 14, 18, and 20** (`--gfx high`) dropped from **`549–640` draws** (`AG-82`) to **`476–602` draws** (`AG-85`, saving **32 to 120 draw calls** per frame, e.g., Night 18 `596 → 476`, Night 10 `634 → 531`, Night 20 `617 → 546`), and on `--gfx max` Night 20 dropped from **`572` to `524` draws**.
2. **Frame rate on Jerry's RTX 5080**:
   - **In-match `megaswarm` (`count: 48` + 16–17 daytime prep spawns = 65/64 zombies, 10 s)**: **`23.7 fps` mean / `20.3 fps` 1% low** on `--gfx high` (`730` draws, `1,730,823` tris, `65` zombies) and **`25.5 fps` mean / `21.5 fps` 1% low** on `--gfx max` (`760` draws, `1,718,017` tris, `64` zombies). *(Note: `qa/2026-10-18-AG-85/run-bench-and-gp.mjs` invoked `TT.startPrep(); TT.spawnMegaswarm(48)` inside the active match after Night 20, which spawned 16–17 daytime/POI zombies on top of the 48 megaswarm zombies; in `AG-82`, standalone `tools/bench.mjs --count 48` ran on the title screen before `startMatch` with 48 shamblers at `52.3`/`54.1 fps`, `342`/`334` draws, `507.6k` tris.)*
   - **Full-match last pushes (48 mixed zombies, Nights 5, 10, 14, 18, 20, 10 s)**: **`31.9–34.7 fps` mean** (`25.9–28.7 fps` 1% low, `0–1` hitches > 50 ms, `476–602` draws, `735k–989k` tris) on `--gfx high`, and **`31.2 fps` mean** *(vs `32.7` in `AG-82`)* on Night 20 `--gfx max` (`524` draws, `831k` tris).

### Post-`CL-210` / `AG-84` Benchmark Table (`qa/2026-10-18-AG-85/bench-lines.jsonl` + `AG-82` comparison)

| Scenario | Preset | Mean FPS (`AG-85`) | 1% Low (`AG-85`) | Worst Frame (ms) | Hitches (>50ms) | Draws (`AG-82` → `AG-85`) | Triangles (`AG-85`) | Zombies |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **Night 5** (push 3/3) | `high` | **33.2** *(35.0)* | **28.0** *(29.5)* | 34.2 | 0 | `634 →` **602** (-32) | 766,419 | 48 |
| **Night 10** (push 4/4) | `high` | **34.5** *(34.9)* | **28.4** *(27.9)* | 33.4 | 0 | `634 →` **531** (-103) | 736,009 | 48 |
| **Night 14** (push 5/5) | `high` | **31.9** *(33.6)* | **25.9** *(27.7)* | 37.9 | 1 | `640 →` **564** (-76) | 989,207 | 48 |
| **Night 18** (push 5/5) | `high` | **34.7** *(34.0)* | **28.7** *(28.6)* | 33.6 | 0 | `596 →` **476** (-120) | 735,041 | 48 |
| **Night 20** (push 6/6) | `high` | **33.2** *(33.5)* | **26.1** *(27.6)* | 38.5 | 1 | `617 →` **546** (-71) | 848,907 | 48 |
| **Megaswarm 48** (in-match) | `high` | **23.7** *(52.3 title)* | **20.3** *(38.5)* | 50.2 | 7 | `342 →` **730** | 1,730,823 | 65 |
| **Night 20** (push 6/6) | `max` | **31.2** *(32.7)* | **22.4** *(26.2)* | 48.1 | 2 | `572 →` **524** (-48) | 831,075 | 48 |
| **Megaswarm 48** (in-match) | `max` | **25.5** *(54.1 title)* | **21.5** *(40.6)* | 42.3 | 2 | `334 →` **760** | 1,718,017 | 64 |

### Raw JSON Lines (`qa/2026-10-18-AG-85/bench-lines.jsonl`)
```json
{"scenario":"night","seconds":10,"fps":33.2,"low":28,"worst":34.2,"hitches":0,"draws":602,"triangles":766419,"zombies":48,"gfx":"high","windows":9,"night":5,"push":2,"pushes":3,"last":true}
{"scenario":"night","seconds":10,"fps":34.5,"low":28.4,"worst":33.4,"hitches":0,"draws":531,"triangles":736009,"zombies":48,"gfx":"high","windows":9,"night":10,"push":3,"pushes":4,"last":true}
{"scenario":"night","seconds":10,"fps":31.9,"low":25.9,"worst":37.9,"hitches":1,"draws":564,"triangles":989207,"zombies":48,"gfx":"high","windows":9,"night":14,"push":4,"pushes":5,"last":true}
{"scenario":"night","seconds":10,"fps":34.7,"low":28.7,"worst":33.6,"hitches":0,"draws":476,"triangles":735041,"zombies":48,"gfx":"high","windows":9,"night":18,"push":4,"pushes":5,"last":true}
{"scenario":"night","seconds":10,"fps":33.2,"low":26.1,"worst":38.5,"hitches":1,"draws":546,"triangles":848907,"zombies":48,"gfx":"high","windows":9,"night":20,"push":5,"pushes":6,"last":true}
{"scenario":"megaswarm","seconds":10,"fps":23.7,"low":20.3,"worst":50.2,"hitches":7,"draws":730,"triangles":1730823,"zombies":65,"gfx":"high","windows":9,"count":48}
{"scenario":"night","seconds":10,"fps":31.2,"low":22.4,"worst":48.1,"hitches":2,"draws":524,"triangles":831075,"zombies":48,"gfx":"max","windows":9,"night":20,"push":5,"pushes":6,"last":true}
{"scenario":"megaswarm","seconds":10,"fps":25.5,"low":21.5,"worst":42.3,"hitches":2,"draws":760,"triangles":1718017,"zombies":64,"gfx":"max","windows":9,"count":48}
```
