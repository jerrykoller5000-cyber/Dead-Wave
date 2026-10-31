# antigravity — AG-162 1.1's frames are longer outside the tick: where it goes — 2026-10-30
Changed: Diagnostic & QA investigation only (no game edits). Added Chrome CDP trace harness `qa/2026-10-31-AG-162/run.mjs`, trace analyzer `qa/2026-10-31-AG-162/analyze.mjs` / `reanalyze.mjs`, and 7 Night 20 High benchmark + 10s Chrome trace artifacts (`throwaway-new`, `old-1`, `new-1`, `old-2`, `new-2`, `new-nohud`, `new-nooverlay`).
Files: qa/2026-10-31-AG-162/ (run.mjs, analyze.mjs, reanalyze.mjs, summary.json, *.trace.json, *.trace-summary.json, *.seat.json, *.log), handoffs/2026-10-30-antigravity-AG-162.md
Tests: `node crew/crew.mjs slot run antigravity AG-162 --checks "Night 20 High 10s Chrome CDP traces: old (82d75118) vs new (1.1) x2 + new with HUD display:none" -- node qa/2026-10-31-AG-162/run.mjs` -> exit 0, 7 runs in one slot hold (throwaway-new, old-1, new-1, old-2, new-2, new-nohud, new-nooverlay).
Screenshots: none
Not verified: None; all 7 trace runs, per-frame CDP timelines (`devtools.timeline`, `disabled-by-default-devtools.timeline.frame`, `cc`, `viz`, `gpu`), and `first20s` vs `last10s` `TT.profDbg` windows were captured and verified.
Requests: Replied DONE to Claude's AG-162 request.
Contract changes: none

---

## 1. Executive Answer: Where 1.1's `outside` (`frameMs - tickMs`) Actually Goes

CU-183 observed that on Night 20 High, 1.1's `tickMs` reported by `tools/bench.mjs` was `0.5–1.0 ms` lighter than 1.0's (`12.22` and `11.83 ms` vs `12.75` and `12.81 ms`), yet `outsideMs` (`frameMs - tickMs`) grew from **`2.54` and `2.60 ms` on 1.0** to **`3.52` and `4.02 ms` on 1.1** (`+1.0` to `+1.4 ms`).

Splitting `TT.profDbg` at `t = 20s` (before vs during the 10-second Chrome trace over the final 10s of the 30s benchmark) and inspecting `CrRendererMain`, `Compositor`, `VizCompositorThread`, and `CrGpuMain` reveals **two measurement effects that account for 93%+ of that `outside` gap**, plus a **tiny `+0.070 ms/frame` real main-thread DOM/Style increase**:

1. **`tools/bench.mjs` subtracts a 30-second `tickMs` from a 10-second `frameMs` (`tools/bench.mjs:595-640`)**:
   - `bench.mjs` computes `fps` (and `frameMs = 1000 / fps`) from **only the last 10 seconds** (`tail = windows.slice(-10)`, `t = 20..30s`, when all 48 zombies have walked in from the perimeter and surround the HQ/marine at close range).
   - However, `bench.mjs` starts `TT.profDbg` at `t = 0s` and never resets it at `t = 20s`, so `tickMs` is averaged over **all 30 seconds** (`t = 0..30s`, ~1,800 frames, two-thirds of which are `t = 0..20s` while the horde is still walking in).
   - In `t = 0..20s`, 1.1's `tick` is `12.54–13.58 ms/frame` (`0.79 ms` lighter than 1.0 in pair 1 thanks to `CL-277`/`AG-153`). In `t = 20..30s`, when all 48 zombies cluster around the HQ, `tick` surges by **`+2.1 to +2.3 ms` on 1.0** (`14.37 -> 16.48 ms` and `12.52 -> 14.83 ms`) and by **`+3.0 to +4.7 ms` on 1.1** (`13.58 -> 16.55 ms` and `12.54 -> 17.24 ms`).
   - Because `bench.mjs` subtracts the 30s `tickMs` (`13.99 ms` on `new-2`) from the last-10s `frameMs` (`18.48 ms` on `new-2`), **`2.03 to 3.25 ms` of last-10s in-`tick()` work (`r:render` and `zombies`) is misattributed to `outsideMs`**.
2. **60 Hz VSync slack (`waitForFrameIdle`)**:
   - Whenever `tick + browser overhead < 16.67 ms`, `frameMs` stays clamped near the 60 Hz vblank (`16.67 ms`) and Chrome spends the remainder idle on `CrRendererMain` waiting for the next `BeginFrame` (`waitForFrameIdle`).
   - Making `tick` `0.5–1.0 ms` faster during VSync-clamped frames lowers the 30-second `tickMs` average without lowering `frameMs`, mechanically shifting `0.5–1.0 ms` out of `tickMs` and into `outsideMs = frameMs - tickMs`.
3. **Apples-to-apples last-10s `outside` (`wallFrameMs10s - tickMs10s`) is *smaller* on 1.1 than on 1.0**:
   - Measured over the **exact same 10-second window (`20..30s`)**, `outside10s` is:
     - **1.0 (`old-1`, `old-2`)**: **`1.89 ms`** and **`1.99 ms`** (mean **`1.94 ms/frame`**)
     - **1.1 (`new-1`, `new-2`)**: **`1.40 ms`** and **`1.27 ms`** (mean **`1.34 ms/frame`**, **`-0.60 ms/frame` smaller than 1.0**)
   - Why is true last-10s `outside` `0.60 ms/frame` *smaller* on 1.1? Because 1.1's non-tick browser work on `CrRendererMain` is almost identical to 1.0 (`0.707 ms/f` vs `0.637 ms/f`, **`+0.070 ms/f`**), while 1.1's heavier last-10s `tick` (`16.90 ms` vs `15.66 ms`) eats into the 60 Hz VSync idle slack (`waitForFrameIdle` drops from **`1.25 ms/f` on 1.0** to **`0.57 ms/f` on 1.1**).

---

## 2. Window Split: `bench.mjs` (Mixed 10s/30s) vs `first20s` (`0..20s`) vs `last10s` (`20..30s`)

All data from `qa/2026-10-31-AG-162/summary.json`:

| Run | `fps` (10s) | `low` (10s) | `bench.mjs` `frame10s` | `bench.mjs` `tick30s` | `bench.mjs` **`outsideBench`** (`f10s - t30s`) | `first20s` `wallFrame` | `first20s` `tick20s` | `first20s` `outside20s` | `last10s` `wallFrame` | `last10s` `tick10s` | `last10s` **`outside10s`** (`f10s - t10s`) | `last10s` `waitForFrameIdle` | `last10s` `mainNonTickBusy` |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `throwaway-new` | 59.6 | 49.1 | 16.78 | 13.66 | **3.12** | 16.68 | 12.87 | 3.81 | 16.79 | 15.24 | **1.55** | 0.90 | 0.65 |
| `old-1` (82d75118) | 53.1 | 39.7 | 18.83 | 15.05 | **3.78** | 17.42 | 14.37 | 3.05 | 18.37 | 16.48 | **1.89** | 1.17 | 0.66 |
| `new-1` (1.1 HEAD) | 56.4 | 41.1 | 17.73 | 14.52 | **3.21** | 16.75 | 13.58 | 3.17 | 17.95 | 16.55 | **1.40** | 0.60 | 0.73 |
| `old-2` (82d75118) | 59.6 | 46.3 | 16.78 | 13.29 | **3.49** | 16.68 | 12.52 | 4.16 | 16.82 | 14.83 | **1.99** | 1.33 | 0.61 |
| `new-2` (1.1 HEAD) | 54.1 | 37.8 | 18.48 | 13.99 | **4.49** | 16.71 | 12.54 | 4.17 | 18.51 | 17.24 | **1.27** | 0.53 | 0.69 |
| `new-nohud` (`#hud` `display:none`) | 58.9 | 48.4 | 16.98 | 13.35 | **3.63** | 16.67 | 12.71 | 3.96 | 17.02 | 14.62 | **2.40** | 1.83 | 0.52 |
| `new-nooverlay` (all DOM hidden) | 58.4 | 47.3 | 17.12 | 13.90 | **3.22** | 16.69 | 13.06 | 3.63 | 17.36 | 15.59 | **1.77** | 1.18 | 0.53 |

### Where `tick10s` Surges in `20..30s` (Last 10s vs Full 30s in `PROF`)

| Sub-phase (ms/frame) | `old-1` (30s -> 10s) | `new-1` (30s -> 10s) | `old-2` (30s -> 10s) | `new-2` (30s -> 10s) | `new-nohud` (30s -> 10s) | `new-nooverlay` (30s -> 10s) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `tick` | 15.05 -> **16.48** (+1.43) | 14.52 -> **16.55** (+2.03) | 13.29 -> **14.83** (+1.54) | 13.99 -> **17.24** (+3.25) | 13.35 -> **14.62** (+1.27) | 13.90 -> **15.59** (+1.69) |
| `r:render` | 6.83 -> **7.57** (+0.74) | 6.66 -> **7.46** (+0.80) | 6.01 -> **6.67** (+0.66) | 6.24 -> **7.56** (+1.32) | 5.79 -> **6.04** (+0.25) | 6.13 -> **6.55** (+0.42) |
| `zombies` | 2.68 -> **2.84** (+0.16) | 2.64 -> **3.39** (+0.75) | 2.38 -> **2.98** (+0.60) | 2.71 -> **4.19** (+1.48) | 2.53 -> **3.41** (+0.88) | 2.70 -> **3.88** (+1.18) |
| `combat` | 1.88 -> **2.14** (+0.26) | 1.87 -> **1.92** (+0.05) | 1.82 -> **1.93** (+0.11) | 1.79 -> **1.89** (+0.10) | 1.80 -> **1.92** (+0.12) | 1.85 -> **1.90** (+0.05) |
| `proj` | 0.90 -> **0.88** (-0.02) | 0.96 -> **1.16** (+0.20) | 0.77 -> **0.75** (-0.02) | 0.94 -> **1.12** (+0.18) | 0.94 -> **0.98** (+0.04) | 0.93 -> **1.00** (+0.07) |
| `hud` | 1.07 -> **1.11** (+0.04) | 0.85 -> **0.90** (+0.05) | 0.85 -> **0.88** (+0.03) | 0.83 -> **0.89** (+0.06) | 0.81 -> **0.81** (0.00) | 0.82 -> **0.81** (-0.01) |
| `draws` / `tris` | 260 / 731k | 287 / 754k | 269 / 722k | 291 / 771k | 276 / 748k | 275 / 724k |

Notice that in 1.1 (`new-1`, `new-2`), `draws` are `+22 to +27` higher (`287–291` vs `260–269`) and `tris` are `+23k to +49k` higher (`754k–771k` vs `722k–731k`) than 1.0, and `zombies` + `r:render` surge harder in the last 10 seconds when all 48 zombies reach the yard.

---

## 3. Chrome CDP Trace Breakdown (Per Rendered Frame, Last 10s)

Categories traced: `devtools.timeline`, `disabled-by-default-devtools.timeline.frame`, `cc`, `viz`, `gpu`.
Note: Each browser animation frame executes **3 `FireAnimationFrame` callbacks** on `CrRendererMain`:
1. The main game `tick()` (`~14.6–17.3 ms/frame`)
2. `ui/objectives-runtime.js:36` `poll()` (1.1 only; in 1.0 there is a lightweight rAF helper)
3. `tools/bench.mjs:465` `tickGpu()` (`~0.11–0.14 ms/frame` combined for the non-game-tick rAF callbacks)

All values below are normalized per **rendered game frame** (`551–606` frames per 10s trace):

| Trace Metric (ms / rendered frame) | `old-1` | `new-1` | `old-2` | `new-2` | Mean `old` | Mean `new` | **Delta (`new - old`)** | `new-nohud` (`#hud` hidden) | `new-nooverlay` (all DOM hidden) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Rendered frames in 10s window | 555 | 569 | 606 | 551 | 580.5 | 560.0 | -20.5 | 595 | 587 |
| Trace `wallFrameMs` | 18.370 | 17.950 | 16.820 | 18.510 | 17.595 | 18.230 | **+0.635** | 17.020 | 17.360 |
| `CrRendererMain` `FireAnimationFrame` (game `tick`) | 16.540 | 16.618 | 14.877 | 17.291 | 15.709 | 16.955 | **+1.246** | 14.677 | 15.654 |
| `CrRendererMain` `FireAnimationFrame` (other rAFs: `poll` + `tickGpu`) | 0.126 | 0.135 | 0.114 | 0.138 | 0.120 | 0.137 | **+0.017** | 0.110 | 0.112 |
| `CrRendererMain` busy outside rAF (`mainOutRafBusy`) | 0.535 | 0.590 | 0.498 | 0.550 | 0.517 | 0.570 | **+0.053** | 0.406 | 0.417 |
| **Total `CrRendererMain` non-`tick` busy** (`otherRafs + mainOutRafBusy`) | **0.661** | **0.725** | **0.612** | **0.688** | **0.637** | **0.707** | **+0.070** | **0.516** | **0.529** |
| — `UpdateLayoutTree` / Style (total) | 0.253 | 0.292 | 0.235 | 0.272 | 0.244 | 0.282 | **+0.038** | 0.204 | 0.214 |
| — `UpdateLayoutTree` / Style (inside rAF, forced recalc) | 0.151 | 0.203 | 0.130 | 0.213 | 0.141 | 0.208 | **+0.067** | 0.104 | 0.130 |
| — `UpdateLayoutTree` / Style (post-rAF pipeline) | 0.102 | 0.089 | 0.105 | 0.059 | 0.104 | 0.074 | **-0.030** | 0.100 | 0.084 |
| — `Layout` (total) | 0.008 | 0.010 | 0.008 | 0.008 | 0.008 | 0.009 | **+0.001** | 0.000 | 0.000 |
| — `PrePaint` (total) | 0.053 | 0.053 | 0.047 | 0.054 | 0.050 | 0.054 | **+0.004** | 0.039 | 0.038 |
| — `Layerize` (total) | 0.003 | 0.024 | 0.003 | 0.004 | 0.003 | 0.014 | **+0.011** | 0.002 | 0.002 |
| — `Paint` (total) | 0.003 | 0.004 | 0.003 | 0.004 | 0.003 | 0.004 | **+0.001** | 0.000 | 0.000 |
| — `CompositeLayers` / `Commit` | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.000 |
| — **Blink Render Pipeline Sum** (`Style+Layout+PrePaint+Layerize+Paint+Commit`) | **0.320** | **0.383** | **0.296** | **0.342** | **0.308** | **0.363** | **+0.055** | **0.245** | **0.254** |
| — `Animation` | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | **0.000** | 0.000 | 0.000 |
| — `GC` on `CrRendererMain` (total / in-rAF / out-rAF) | 0.084 (0.066/0.018) | 0.063 (0.048/0.014) | 0.031 (0.009/0.022) | 0.068 (0.062/0.006) | 0.058 | 0.066 | **+0.008** | 0.057 (0.052/0.005) | 0.032 (0.029/0.003) |
| **Wait for the frame** (`waitForFrameIdle` on `CrRendererMain`) | **1.169** | **0.607** | **1.331** | **0.531** | **1.250** | **0.569** | **-0.681** | **1.827** | **1.177** |
| Renderer `Compositor` thread (`cc`) busy | 0.612 | 0.617 | 0.573 | 0.592 | 0.593 | 0.605 | **+0.012** | 0.466 | 0.556 |
| Display `VizCompositorThread` (`viz`) busy | 0.726 | 0.688 | 0.715 | 0.697 | 0.721 | 0.693 | **-0.028** | 0.367 | 0.364 |
| GPU Process `CrGpuMain` (`gpu`) busy | 8.128 | 8.207 | 7.472 | 8.210 | 7.800 | 8.209 | **+0.409** | 7.001 | 7.081 |

---

## 4. What in 1.1 Each Trace Difference Points To

Checking every candidate from `AG-162`, `GP-19984`, and `MU-9` against the Chrome traces:

### 1. CRT Terminal CSS (`ui/supply-terminal.css`, `ui/wave-preview.css`, `ui/story-playback.css`), Filters, and Animations
- **Trace cost during Night 20 combat: `0.000 ms/frame`.**
- Why: All three CRT terminal surfaces (`#shop` / `#ordersCard` / `#cif` / story playback) are hidden (`display:none` or closed) during Night 20 combat.
- `Animation` events on `CrRendererMain` are `0.000 ms/frame` in all 7 runs (`document.getAnimations()` returned `0` active animations in `old-1`, `new-1`, `old-2`, `new-nohud`, `new-nooverlay`, and only 2 initial banner transitions in `new-2`).
- `TT.pictureDbg()` confirmed `{"brightness":1,"vibrancy":1,"fpFov":60,"exposure":1,"graded":false,"pictureOnly":false}` — at default `1.0` sliders, CU-159's vibrancy/brightness post-processing pass is completely bypassed (`postProcessing === null` on High).

### 2. Reticle `animate()` (`index.html:47823`)
- **Trace cost during Night 20 bench: `0.000 ms/frame`.**
- Why: `element.animate()` on the reticle only triggers when the player fires and lands a hit (`pulseHitMarker`). In the Night 20 benchmark, the player does not fire rounds, and this code path is unchanged from 1.0.

### 3. Per-Frame / 10 Hz DOM Writes (`ui/objectives-runtime.js:36` + FP Prompt DOM in `index.html:32842-32920`)
- **Trace cost: `+0.070 ms/frame` total on `CrRendererMain` (`+0.017 ms/f` in `otherRafs`, `+0.038 ms/f` in `UpdateLayoutTree`, `+0.011 ms/f` in `Layerize`).**
- Specifically:
  - `ui/objectives-runtime.js:36` registers a separate `requestAnimationFrame(poll)` loop that runs every frame and executes `refresh()` at 10 Hz (`every 100 ms`), reading `innerText` on `#nightBanner` / `#subBanner` / `#actLabel` / `#Wave` / `#buildMenu` / `#skipBtn` (`offsetParent !== null`, which forces synchronous `UpdateLayoutTree` inside rAF when dirty) and writing `textContent` / `style.display`.
  - In `index.html:32842-32920` (`updateFpNote` / `#placePrompt`), 1.1 updates FP prompt DOM state inside `tick()`, which contributes to in-rAF `UpdateLayoutTree` rising from `0.141 ms/f` (1.0) to `0.208 ms/f` (1.1) (`+0.067 ms/f`), partially offset by post-rAF `UpdateLayoutTree` dropping by `-0.030 ms/f` (`+0.038 ms/f` net).
  - While real and visible in the trace, **`+0.070 ms/frame` is only 0.4% of a 60 Hz frame** (`~42 ms` over the entire 10-second trace).

### 4. Texture / Geometry Uploads (`newTextures`, `newGeometries`)
- **Trace & `TT.renderDbg()` cost in last 10s: `0` new textures and `0` new geometries** across all 7 runs.

### 5. What Hiding `#hud` (`new-nohud`) and All Non-Canvas DOM (`new-nooverlay`) Does
- Setting `#hud` to `display:none` (`new-nohud`) reduces:
  - **Main-thread Blink pipeline (`Style + Layout + PrePaint + Layerize + Paint`)** from `0.363 ms/frame` to **`0.245 ms/frame`** (`-0.118 ms/frame`; `Layout` and `Paint` drop to `0.000 ms/frame`).
  - **Display compositor (`VizCompositorThread`)** from `0.693 ms/frame` to **`0.367 ms/frame`** (`-0.326 ms/frame`; `DirectRenderer::DrawFrame` drops from `0.41 ms/f` to `0.11 ms/f` because Viz no longer composites `.glass` `backdrop-filter: blur(6px)` HUD cards and the `#minimap` 2D canvas over the WebGPU canvas).
  - **GPU Process (`CrGpuMain`)** from `8.21 ms/frame` to **`7.00 ms/frame`** (`-1.21 ms/frame`, partly from skipping HUD backdrop-filter blur/minimap composition and partly from slightly lower draw count `276` vs `289` in that wave roll).
- **Crucially**, `.glass` `backdrop-filter: blur(6px)` and `#minimap` are **baseline 1.0 + 1.1 costs, not a 1.1 regression**: `VizCompositorThread` was `0.721 ms/frame` in 1.0 vs `0.693 ms/frame` in 1.1.
- And why did `bench.mjs`'s `outsideBench` stay at `3.63 ms` in `new-nohud` (`fps 58.9, low 48.4`) and `3.22 ms` in `new-nooverlay` (`fps 58.4, low 47.3`)? Because with faster frames (58.9 fps = `16.98 ms` wall frame vs `14.62 ms` `tick10s`), Chrome spent **`1.83 ms/frame` (`new-nohud`) and `1.18 ms/frame` (`new-nooverlay`) in `waitForFrameIdle`** waiting for the 60 Hz vblank!

---

## 5. Recommendations

1. **Fix `outsideMs` window mismatch in `tools/bench.mjs` (`line 595-640`)**:
   - Either snapshot `TT.profDbg()` at `t = 20s` (when the 10-second `fps` tail window begins) and compute `tickMs10s` over the exact same `20..30s` window as `frameMs`, or report both `tick30s` and `tick10s` so late-wave `tick()` surges (`20..30s`) are never folded into `outsideMs = frameMs10s - tickMs30s`.
2. **Focus 1.1 Night 20 frame-time work on the last-10s in-`tick()` surge (`CU-184`'s scope)**:
   - On 1.1, `tick` during the final 10 seconds (`20..30s`, when all 48 zombies surround the HQ/marine) is `16.55–17.24 ms/frame` (`r:render` `7.46–7.56 ms`, `zombies` `3.39–4.19 ms`, `287–291` draws, `754k–771k` tris) vs `14.83–16.48 ms/frame` on 1.0 (`260–269` draws, `722k–731k` tris). That `+1.24 ms/frame` in-tick late-wave delta is what pushes 1.1 over the `16.67 ms` 60 Hz budget in the final 10 seconds, not work outside the tick.
3. **Optional low-hanging DOM hygiene (`~0.07 ms/frame` main thread, `~0.33 ms/frame` Viz + GPU)**:
   - In `ui/objectives-runtime.js`, avoid registering a second permanent `requestAnimationFrame` loop (`setInterval(refresh, 100)` or calling it from the existing HUD throttle in `tick()`, and replacing `el.offsetParent !== null` / `el.innerText` with `hidden`/`textContent` checks) to eliminate the `+0.067 ms/frame` forced in-rAF `UpdateLayoutTree`.
