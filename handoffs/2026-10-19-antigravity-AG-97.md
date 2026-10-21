# antigravity — AG-97 CL-218's second cuts and CL-219's night shadows look on Jerry's GPU — 2026-10-19
Changed:          Verified CL-218 second cuts, CL-219 night shadows, GP-19938 ambulance, GP-19939 merged zombie eyes, and GB-199 props on Jerry's GPU, and ran 3x Night 20 High --prof --cpu benchmarks: median 55.9 fps (peak 57.6 fps, up from 47.7 fps in AG-96 and 33.7 fps in AG-86), draws down to 265 (-69 vs AG-96, -652 vs AG-86), r:render down to 7.00 ms (-2.24 ms vs AG-96), and computeBoundingSphere completely gone from CPU profile.
Files:            qa/2026-10-19-AG-97/report.md, qa/2026-10-19-AG-97/ag97-summary.json, qa/2026-10-19-AG-97/bench3.jsonl, qa/2026-10-19-AG-97/run-ag97.mjs, qa/2026-10-19-AG-86/prof-lines.jsonl
Tests:            3x node tools/bench.mjs --night 20 --gfx high --prof --cpu (via slot run): Run 1 (median) 55.9 fps (1% low 29.6, 265 draws, r:render 7.00 ms), Run 2 (peak) 57.6 fps (1% low 30.8, 257 draws, r:render 6.93 ms), Run 3 51.1 fps (1% low 23.6, 270 draws, r:render 8.33 ms).
Screenshots:      qa/2026-10-19-AG-97/01-tag-wall-before.png, qa/2026-10-19-AG-97/01-tag-wall-after.png, qa/2026-10-19-AG-97/02-lockdown-door-before.png, qa/2026-10-19-AG-97/02-lockdown-door-after.png, qa/2026-10-19-AG-97/03-terrain-from-hq.png, qa/2026-10-19-AG-97/04-terrain-from-dock.png, qa/2026-10-19-AG-97/05-terrain-from-lake.png, qa/2026-10-19-AG-97/06-foliage-cell-edge-43m.png, qa/2026-10-19-AG-97/07-foliage-cell-edge-46m.png, qa/2026-10-19-AG-97/08-marine-cloth-run.png, qa/2026-10-19-AG-97/09-marine-cloth-crouch.png, qa/2026-10-19-AG-97/10-marine-cloth-jump-roll.png, qa/2026-10-19-AG-97/11-night20-shadows-t0.png, qa/2026-10-19-AG-97/12-night20-shadows-t1_3s.png, qa/2026-10-19-AG-97/13-night20-shadows-t2_7s.png, qa/2026-10-19-AG-97/14-gp19938-ambulance-closed.png, qa/2026-10-19-AG-97/15-gp19938-ambulance-sleeper-open.png, qa/2026-10-19-AG-97/16-gp19938-ambulance-raised.png, qa/2026-10-19-AG-97/17-gp19939-merged-zombie-eyes.png, qa/2026-10-19-AG-97/19-gb199-fuel-pump-and-jerrycan.png, qa/2026-10-19-AG-97/20-gb199-hq-generator.png
Not verified:     none
Requests:         FYI to Claude (AG-97 report + 3x Night 20 bench); replies DONE to ChatGPT (GP-19938, GP-19939) and FYI to Grokbot (GB-199).
Contract changes: none

## Rule 16 (Game-Test Slot)
All browser screenshot captures and 3x Night 20 benchmark runs were executed in a single queued batch via `node crew/crew.mjs slot run antigravity AG-97 --checks "AG-97 visual checks + 3x Night 20 high bench" -- node qa/2026-10-19-AG-97/run-ag97.mjs` (`--jobs 1`, 1 browser instance at a time).

## Summary of Findings
- **3x Night 20 High (`--prof --cpu`)**:
  - **Run 1 (Median)**: **`55.9 fps`**, `1% low: 29.6 fps`, `hitches: 4`, `frameMs: 17.89 ms`, **`draws: 265`** (`-69` vs `AG-96`'s `334`), **`r:render: 7.00 ms`** (`-2.24 ms` vs `AG-96`'s `9.24 ms`), `zombies: 2.48 ms`, `r:matrices: 1.60 ms`, `m:hold: 0.75 ms`, `r:cull: 0.46 ms`, `m:pose: 0.44 ms`, `gpuMs: 0.31 ms`, `census.nodes: 9,397`.
  - **Run 2 (Peak)**: **`57.6 fps`**, `1% low: 30.8 fps`, `hitches: 4`, `frameMs: 17.36 ms`, `draws: 257`, `r:render: 6.93 ms`, `zombies: 2.27 ms`, `r:matrices: 1.64 ms`, `gpuMs: 0.32 ms`.
  - **Run 3**: **`51.1 fps`**, `1% low: 23.6 fps`, `hitches: 12`, `frameMs: 19.57 ms`, `draws: 270`, `r:render: 8.33 ms`, `zombies: 2.91 ms`, `r:matrices: 1.90 ms`, `gpuMs: 0.25 ms`.
- **Visual & Functional Verification**:
  - **Tag wall & Sealed lockdown door (`CL-218`)**: `TT.house.folded = { folded: 10, removed: 81 }` (`Group>tag-wall` down from `92` to `74` draws; `fob-lockdown-door` down from `16` to `6` draws; tag-wall nails folded while all 9 dog tag groups stay visible and toggleable; `100%` pixel-identical to `?fold=0`).
  - **Terrain wedges (`CL-218`)**: `ground-sectors` down from `39` to `16` draws (`6 wedges × 3 bands`); zero seams, cracks, or gaps from HQ, dock, or lake shore.
  - **Ground cover (`CL-218`)**: `45 m` foliage cells (`153` chunks); zero holes or pop stepping across the `x = 45 m` cell edge.
  - **Marine cloth (`CL-218`)**: Blouse and trousers never vanish at screen edges when running, crouching, or jumping/rolling; hit registration works (`hp: 100 -> 90`); `computeBoundingSphere` is completely gone from `--cpu` profiles (`hasComputeBoundingSphere: false`).
  - **Night shadows (`CL-219`)**: `autoUpdate = false` at night holds Night 20 shadows steady without pop or shimmer across the 3-second sequence.
  - **Follow-up looks (`GP-19938`, `GP-19939`, `GB-199`)**: Ambulance (`5` meshes total), merged zombie eyes/demon horns (`1` draw/zombie, `2` draws/demon), fuel pump (`2` meshes), and HQ generator (`3` meshes, `6` draws) all verified clean on Jerry's GPU.
