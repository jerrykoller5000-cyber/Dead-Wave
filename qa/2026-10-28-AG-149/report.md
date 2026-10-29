# AG-149 — Trapper Frame, Watchtower Trail, and Six Cave Mouths on the GPU + Trapper Triangle Cut Removal — 2026-10-28

- **Agent**: Antigravity (`Gemini 3.1 Pro`)
- **Task**: `AG-149` (`CL-256`)

---

## 1. Visual Scores by Eye (`docs/world-design.md` & `docs/asset-principles.md`)

| Place / Asset | Silhouette | Construction | Readability | Integration | Mean | Verdict & Notes |
| --- | :---: | :---: | :---: | :---: | :---: | --- |
| **Trapper Curing Frame** (`review/sweep/trapper-frame/from-fire.png`, `close.png`, `from-cache.png` + night) | **4.5/5** | **5.0/5** | **5.0/5** | **4.5/5** | **4.75/5** | **PASS** — Frame stands flush against the cabin's side wall with its hide facing the fire (`from-fire.png`, `close.png`); the cache stand (`from-cache.png`) is completely clear. |
| **Watchtower Trail Spur** (`review/sweep/tower-trail/above.png`, `coming-in.png`, `round.png`, `ladder-side.png` + night) | **4.5/5** | **5.0/5** | **5.0/5** | **4.5/5** | **4.75/5** | **PASS** — Trail arcs cleanly around the watchtower's outside flank (`4.5 m` off) and ends directly at the foot of the ladder instead of running under the tower legs. |
| **East Cave Mouth (`cave-4-cheek`)** (`review/sweep/cave-4-cheek/gpu-cave4-oblique.png`, `gpu-cave4-side-close.png` + night) | **4.5/5** | **4.5/5** | **5.0/5** | **5.0/5** | **4.75/5** | **PASS** — The leaf clump inside the dark mouth is gone, and the sawtooth shading down the `+x` cheek is resolved by the outward triangle winding fix. |
| **All Six Cave Mouths (`cave-mouths.json`)** (`review/sweep/cave-mouths/sheet.jpg` vs `AG-146`) | **4.5/5** | **4.5/5** | **5.0/5** | **5.0/5** | **4.75/5** | **PASS** — All 6 cave arches (`cave-1`..`cave-6`) shade evenly across their rock cheeks at noon and night with zero inverted/back-lit triangles, while keeping the `1.5 m` lit throat and deep black interior. |

---

## 2. Code Change & Real-Renderer Verification (`game/trapper-path.js`)

- **Change**: Removed the `AG-140/141` landmark mesh triangle cut from `game/trapper-path.js` (lines `1086–1109`) while preserving the `worldSolids`, `s.landmark.colliders`, and `s.landmark.spawnColliders` clearing and the `trapper.clearedSolids` diagnostic log.
- **Real-Renderer Suite Checks (`node tools/realtest.mjs t167 t268 t215 --all`)**:
  - `t167`: **`20 pass, 0 fail`** (`14.9 s`)
  - `t268`: **`25 pass, 0 fail`** (`28.5 s`)
  - `t215`: **`4 pass, 0 fail`** (`32.5 s`)
  - **Total**: **`49 pass, 0 fail (real renderer)`**
