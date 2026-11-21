Completed **AH-2** normal-player WebGPU vs WebGL Training reproduction (`qa/2026-11-21-AH-2.md`, `qa/AH-2/results.json`).

### 1. Normal Play Verdict (Visible foreground Chrome, natural opening video -> Title -> `TRAINING GROUND`)
- **Fresh-profile WebGPU (`3x`):** **0/3 froze** when the RTX 5080 was unloaded (`86.8%–87.2%` 3D pixel diff after walking + `1P` toggle; `qa/AH-2/webgpu-run1-a-spawn.png` -> `webgpu-run1-b-after-move-1p.png` .. `run3`), because `trainingWarmCompile()` Stage 1 finished in **~13.7s** (~`16.7s` total blackout including ~3s room build), **1.3s under** the `15.0s` fallback timer.
- **Intermittent Normal-Play WebGPU Freeze (`1/2` in initial `task-312` normal batch):** `webgpu-run2` (`index.html?solid=1`, zero `?debug`, zero `dismissForTesting()`) took >`15.0s` in Stage 1 (`66.6s` total run) and **DID FREEZE** (`0.024%` 3D pixel diff) on `warmFrame('training-staged')` (`qa/AH-2/webgpu-over15s-frozen-staged-frame.png`).
- **Fresh-profile WebGL (`3x`):** **0/3 froze** (`86.6%–87.3%` 3D pixel diff; `qa/AH-2/webgl-run1-a-spawn.png` .. `run3`).

### 2. Your Two Requested Ready-Frame Values
1. **`Boolean(window.DWOpening && window.DWOpening.active)`:** **`false`** on **every** ready Training run (`openingPhase: "menu"`, `openingHidden: true`, `flightHold: false`, `training.warming: false`) — **including on the frozen normal WebGPU run**. So `tick()` is not returning at `_titleReleased && window.DWOpening?.active` (`index.html:70817`).
2. **`TT.renderer._animation._animationLoop`:**
   - Non-null `function` (`name: "tick"`), entered **`20/20` RAFs** (`renderer.render = 300`, `backend.draw = 6080–6100`, `draws = 304–305` on working runs; `gpuScopedValidationErr = null`).
   - On frozen runs (`AH-1` `#1`, ChatGPT `GP-20164`, and `AH-2` `task-312` `webgpu-run2`), `tick()` **still runs every RAF past `renderFrame()`** (`fps 60` in `#perf`, HUD reticles/prompts live), while **`renderer.render` is called `0` times**.

### 3. Exact Root Cause Found in `index.html` (`trainingWarmCompile`, lines `68757–68760` & `69142–69223`)
When Stage 1 (`compileForLiveTarget()` + `warmFrame('training-staged')` at `69146` + `onSubmittedWorkDone()` at `69147`) takes **>= `15,000 ms`**:
1. `setTimeout(finish, 15000)` (`69223`) runs `finish()` (`68757`), setting **`done = true`** while `origPPRender` is still `null`, re-enabling `setAnimationLoop(tick)`, and lifting `#trainingBlackout`.
2. Moments later, Stage 1 finishes its `finally` cleanup and **executes lines `69189–69191` without checking `if (!done)`**:
   `origPPRender = postProcessing.render; postProcessing.render = () => {};`
3. Immediately at **line `69196`**: `if (done || !training.active) { finish(); return; }` — `finish()` hits `if (done) return;` at **line `68758` before `restorePPRender()` at `68760`**, and line `69196` returns **before `restorePPRender()` at `69197`**.
4. `postProcessing.render` stays `() => {}` permanently, leaving `warmFrame('training-staged')` frozen on screen at `0 draws`. Calling `restorePPRender()` before `if (done) return;` in `finish()` and guarding line `69189` with `if (!done && postProcessing && !origPPRender)` closes the race completely.
