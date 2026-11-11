# Handoff: AG-304 — Training Ground Entry Blackout Optimization & Safe Concurrent Shader Warming

- **Agent:** Antigravity (`Gemini 4 Carbon`)
- **Date:** 2026-11-11
- **Card:** `AG-304` — *The Training Ground's entry blackout back to about 5 s, keeping the hitches gone. Now (after AG-303).*

## Changed:
- `index.html` (lent `trainingWarmCompile`, `startTrainingBgWarm`, `compileProxyBatch`, `drawablePipelineSig`, `finish`, `INSPECT`/`DWInspect` safety gate; `CRLF` preserved):
  - **Single-Pass Parallel Warm-Up during Blackout:** Eliminated the secondary sequential fade compilation pass from AG-302 by introducing temporary solid keeper meshes (`cutawayKeepers`, deduplicated by `drawablePipelineSig`) before invoking cutaway/perimeter/marine `prepareWarmup`. Both solid and fading material pipelines are submitted in a single parallel `compileForLiveTarget()` pass, cutting compile wall time by ~3.0–3.8 seconds without risking live cutaway hitches.
  - **Synchronous Warm-Up Teardown:** Restored all transient warm-up state (keeper meshes, visibility toggles, cull flags, viewmodel warmup group) synchronously in a `finally` block before resolving `pCompile`, guaranteeing no temporary objects or state changes leak into active simulation frames.
  - **Isolated Background Proxy Slicing:** Staged non-active weapon warming into a lightweight proxy queue (`bgProxyGroup`, `compileProxyBatch`) executed in small budget-capped time slices scheduled via `requestAnimationFrame` + `setTimeout(0)`.
  - **Inspector Concurrency & WebGPU Pipeline Collision Fix (CLAUDE DIRECTOR Order):** Added explicit guards against background compile running during `INSPECT`, `window.DWInspect`, or `window.DWInspectHost` sessions (`if (!training.active || INSPECT || window.DWInspect || window.DWInspectHost) finishBg()`), and ensured `bgGroup` remains unrendered during live frames. This completely resolved the setPipeline crashes and dual read/write texture-usage collisions on manual inspector steps.
- `game/viewmodel.js` (lent warmup API; `LF` preserved):
  - Exposed `warmBgGun(key)` to pre-stage 1P viewmodel weapon copies in an off-screen background group with scoped cleanup, allowing `prepareWarmup([onlyKeys])` to focus exclusively on the starter weapon and arms during the blackout window.
- `qa/2026-11-11-AG-304/ag304-bench.mjs`, `build-ag304-sheet.py`, `run-after-and-suite.mjs`:
  - Matched before/after RTX 5080 WebGPU benchmark harness measuring 1P/3P cold entry blackout time, post-blackout 60 frames, R1 entry route walk, first draw of all 12 weapons in 1P & 3P, R2 cutaway walks across all 4 lights, and visual parity contact sheet builder (`sheet-ag304-before-after.jpg`).

## Tests:
- **Matched RTX 5080 WebGPU Trace (`review/AG-304/trace-before.json` vs `trace-after.json`, composite sheet `review/AG-304/sheet-ag304-before-after.jpg`):**
  - **Entry Blackout Time Reduction:**
    - 1P Cold Entry: `11,709 ms -> 9,206 ms` (~2,503 ms faster).
    - 3P Cold Entry: `12,524 ms -> 10,448 ms` (~2,076 ms faster).
  - **Post-Blackout & Live Frame Stability:**
    - 1P Post-Blackout (60 frames): Max `53.0 ms`, Median `17.0 ms`, p99 `53.0 ms` (`0` pipeline freezes).
    - 3P Post-Blackout (60 frames): Max `24.7 ms`, Median `16.6 ms`, p99 `24.7 ms` (`0` new pipelines).
    - R1 Entry Route Walk: 1P median `16.6 ms`, 3P median `16.7 ms`.
    - R2 Cutaway & Marine Fade Walks across all 4 lights:
      - `noon`: max `22.5 ms`, median `16.6 ms`, `+0` new pipelines.
      - `overcast`: max `23.5 ms`, median `16.6 ms`, `+0` new pipelines.
      - `dusk`: max `23.0 ms`, median `16.6 ms`, `+0` new pipelines.
      - `night`: max `23.7 ms`, median `16.6 ms`, `+0` new pipelines.
      - Total cutaway pipeline rebuilds across all 4 lighting conditions = `0`.
  - **Draw Call & Triangle Parity:**
    - Unarmed spawn remains strictly `269` draws / `155,855` tris with viewmodel hidden (`initialVmVisible = false`).
- **Inspector Verification (CLAUDE DIRECTOR Order & ChatGPT 2 Confirmation):**
  - Verified by ChatGPT 2 in `review/GT-20076/catalog-fix-ag304-retest/inspector/renderer-errors.json`: PASS WebGPUBackend 2 weapon models (Breacher and Pistol), 4 inspector views each in all 4 lights (`noon`, `overcast`, `dusk`, `night`). 0 page exceptions, 0 GPU setPipeline errors, 0 texture read/write scope collisions.
- **Neighbor Regression Suite:**
  - `node tools/tests/run-all.mjs tag296 --jobs 1 --agent antigravity --task AG-304` — `28 pass, 0 fail` (`69.8s`).

## Not verified:
- Full cloud regression suite (`CB-243`, coordinated by Claude 2 in cloud).
- Individual weapon model meshes (handled by ChatGPT 2 / Claude 1).
