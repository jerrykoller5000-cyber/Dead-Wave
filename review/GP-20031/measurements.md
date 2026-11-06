# GP-20031 live camo UV measurements

Measured 2026-11-06 on the game renderer (ANGLE / NVIDIA RTX 5080) through `tools/camera.mjs` in the shared game-test slot. For each furniture triangle, transform its vertices by the mesh's `matrixWorld`, divide each UV edge length by its world-space edge length, take the largest ratio of the triangle's three edges, then report the median across triangles. The target from `core/geometry.js` is `1 / CAMO_TILE = 1 / 0.42 = 2.380952` repeats/m. The max-edge statistic avoids the projection plane's ignored axis; it matches the earlier AG-201 median within its reported precision.

| Gun | AG-201 before held/view (rep/m) | After held body (rep/m) | After viewmodel (rep/m) | After rack (rep/m) | Triangles |
| --- | ---: | ---: | ---: | ---: | ---: |
| M4 | 3.513–3.525 | 2.38095227 | 2.38095227 | 2.38095228 | 612 |
| AK | 3.448–3.469 | 2.38095221 | 2.38095221 | 2.38095223 | 1176 |
| Shotgun | 2.989–3.000 | 2.38095231 | 2.38095231 | 2.38095232 | 1396 |
| Minigun | 2.531–2.706 held; 4.802–5.134 stowed | 2.38094873 | — | — | 812 |

The minigun's slung copy measured **2.38094560 repeats/m** after compensating both the `0.62` wrap and `0.85` mount scales. The fitted M4 sling measured **2.38095227 repeats/m** without any extra UV change. A first attempt that compensated only `0.62` yielded **2.80111833 repeats/m** stowed; that result led to the final `0.62 × 0.85` correction.

The viewmodel rows used the live game's `viewmodel.update` API through the normal raise sequence, then measured `vm:furniture:<gun>` meshes. The rack rows used the live armory rack after applying Multicam and refreshing it, then measured its `furniture:<gun>` meshes.

Visual after captures are in this directory: `{m4,ak,shotgun}-first-noon.png` from the live first-person camera, `{m4,ak,shotgun}-third-detail-noon.png` from a close side view of the live marine, `rack-furniture-{noon,dusk,night}.png` inside the HQ rack, and `m4-first-{dusk,night,overcast}.png`. The latter `overcast` image was made in rain at noon; its sky remains bright, so it is not evidence of a fully overcast light. For camera reproduction, the match's long idle causes the marine's smoking pose to hide the gun. Reset `T.marineIdleDbg()` and set its `state.quiet` far below zero before the shot, then step the frame after equipping and dressing the gun. The camera's isolated `weapon:*` target resets the outfit and does not show the live Multicam choice.

Targeted regression check after the final edit, run with `node crew/crew.mjs slot run chatgpt GP-20031 --checks "final targeted camo furniture t146" -- node tools/realtest.mjs t146`:

```text
GRANT chatgpt GP-20031: starting one game-test command
ok    t146     43 pass   0 fail  26.2s  (real renderer)
1 checks: 43 pass, 0 fail (real renderer)
```
