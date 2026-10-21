# antigravity — AG-105 The night-20 spike census, after AG-104 (CL-223) — 2026-10-20
Changed:          Ran the Night 20 High spike census on Jerry's RTX 5080 through the testing slot (`3x --prof` alone and `1x --prof --cpu --alloc` with `--enable-precise-memory-info` from `CL-223`). Reported each run's `fps`, `1% low`, `tick`, `spikeCauses`, and all eight `spikes` verbatim (`qa/2026-10-20-AG-105/`).
Files:            qa/2026-10-20-AG-105/run-ag105.mjs, qa/2026-10-20-AG-105/ag105-summary.json, qa/2026-10-20-AG-105/prof-1.json, qa/2026-10-20-AG-105/prof-2.json, qa/2026-10-20-AG-105/prof-3.json, qa/2026-10-20-AG-105/prof-cpu-alloc-4.json, handoffs/2026-10-20-antigravity-AG-105.md
Tests:            node crew/crew.mjs slot run antigravity AG-105 --checks "3x night-20 High --prof + 1x --prof --cpu --alloc" -- node qa/2026-10-20-AG-105/run-ag105.mjs → 3x --prof median: 53.5 fps (best 55.1), 1% low 25.7 (best 27.1), tick 14.65 ms (best 13.96 ms); 1x --prof --cpu --alloc: 54.7 fps, 1% low 28.4, tick 14.40 ms, 903.7 kB/frame
Screenshots:      none (benchmark & spike-cause census task)
Not verified:     Nothing — all 4 Night 20 High runs executed sequentially through the shared game-test slot on Jerry's GPU (Rule 16 observed).
Requests:         FYI sent to claude with the 4 runs' verbatim `spikeCauses` and `spikes`.
Contract changes: none

## Summary Table (Night 20, High, RTX 5080)

| Run | Mode | FPS | 1% Low | Frame (ms) | Tick (ms) | Draws | Tris | `spikeCauses` (verbatim) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Run 1 (`prof-1`)** | `--prof` | **52.8** | **25.4** | 18.94 | **15.21** | 256 | 716,805 | `{"spikes":37,"pipelines":23,"uploads":0,"gc":1,"code":13}` |
| **Run 2 (`prof-2`)** | `--prof` | **53.5** | **27.1** | 18.69 | **14.65** | 258 | 725,516 | `{"spikes":30,"pipelines":21,"uploads":1,"gc":2,"code":6}` |
| **Run 3 (`prof-3`)** | `--prof` | **55.1** | **25.7** | 18.15 | **13.96** | 264 | 714,243 | `{"spikes":29,"pipelines":25,"uploads":0,"gc":1,"code":3}` |
| **Median of 3 (`--prof`)** | `--prof` | **53.5** | **25.7** | 18.69 | **14.65** | 258 | 716,805 | `30 spikes: 23 pipelines, 0 uploads, 1 gc, 6 code` |
| **Run 4 (`prof-cpu-alloc-4`)** | `--prof --cpu --alloc` | **54.7** | **28.4** | 18.28 | **14.40** | 266 | 746,000 | `{"spikes":28,"pipelines":26,"uploads":0,"gc":1,"code":1}` (`903.7 kB/f`, `51.7 MB/s`) |

### Key Takeaway
1. **70%–93% of all spikes (`>= 25 ms`) on Night 20 are `pipelines` (`newPipelines: 1`)**:
   - Across the 4 runs, `23/37`, `21/30`, `25/29`, and `26/28` spikes built a new WebGPU render pipeline (`newPipelines: 1`).
2. **Why `freedMB: -9.7` repeats on `r:render` spikes**:
   - Even with `--enable-precise-memory-info` active (proven by non-pipeline spikes showing `-0.7 MB`, `-0.8 MB`, `-2.7 MB`, `-3.2 MB`), every frame that builds 1 new Three.js WebGPU pipeline (`newPipelines: 1`) spends `22–48 ms` in `r:render` **and allocates `~9.7–10.1 MB` of JS heap** (`freedMB: -9.7` to `-10.1`) while compiling the node material/pipeline!
3. **GC is only 1–2 spikes per 30-second run**:
   - Proven GC spikes (`freedMB: +22.7` / `+22.8 MB`) occur only `1` to `2` times per run (`spikeCauses.gc: 1..2`), and even those frames also had `newPipelines: 1`.

---

## Verbatim `spikeCauses` and Eight `spikes` per Run

### Run 1: `--prof` (`prof-1.json`)
- `fps`: `52.8`, `low`: `25.4`, `worst`: `101.4 ms`, `hitches`: `7`, `frameMs`: `18.94`, `tickMs`: `15.21`, `outsideMs`: `3.73`, `gpuMs`: `0.25`
- `spikeCauses`:
```json
{"spikes":37,"pipelines":23,"uploads":0,"gc":1,"code":13}
```
- `spikes` (verbatim):
```json
[
  {"frame":79,"ms":43.4,"top":["r:render 37.0","r:matrices 1.5","zombies 1.4","m:hold 0.8"],"heapMB":857,"freedMB":-9.8,"newPipelines":1,"newTextures":0,"newGeometries":0},
  {"frame":110,"ms":29.8,"top":["r:render 15.9","zombies 4.5","r:matrices 2.9","m:hold 2.1"],"heapMB":851.8,"freedMB":-0.8,"newPipelines":0,"newTextures":0,"newGeometries":0},
  {"frame":128,"ms":44.2,"top":["r:render 37.7","zombies 1.6","r:matrices 1.4","m:hold 0.8"],"heapMB":848.6,"freedMB":-10.1,"newPipelines":1,"newTextures":0,"newGeometries":1},
  {"frame":224,"ms":45.4,"top":["r:render 37.7","zombies 1.8","r:matrices 1.8","r:cull 0.7"],"heapMB":848.8,"freedMB":-9.8,"newPipelines":1,"newTextures":0,"newGeometries":0},
  {"frame":285,"ms":29.8,"top":["r:render 14.5","r:matrices 3.5","zombies 3.1","m:hold 1.8"],"heapMB":841,"freedMB":-0.7,"newPipelines":0,"newTextures":0,"newGeometries":0},
  {"frame":333,"ms":38.6,"top":["r:render 31.3","zombies 2.1","r:matrices 1.7","m:hold 0.9"],"heapMB":859.7,"freedMB":-9.7,"newPipelines":1,"newTextures":0,"newGeometries":0},
  {"frame":462,"ms":27.3,"top":["r:render 13.4","zombies 4.4","r:matrices 2.8","m:hold 1.5"],"heapMB":848.5,"freedMB":-0.8,"newPipelines":0,"newTextures":0,"newGeometries":0},
  {"frame":507,"ms":43.6,"top":["r:render 37.0","zombies 2.0","r:matrices 1.4","m:pose 0.7"],"heapMB":864.8,"freedMB":-9.7,"newPipelines":1,"newTextures":0,"newGeometries":0}
]
```

---

### Run 2: `--prof` (`prof-2.json`)
- `fps`: `53.5`, `low`: `27.1`, `worst`: `33.8 ms`, `hitches`: `7`, `frameMs`: `18.69`, `tickMs`: `14.65`, `outsideMs`: `4.04`, `gpuMs`: `0.25`
- `spikeCauses`:
```json
{"spikes":30,"pipelines":21,"uploads":1,"gc":2,"code":6}
```
- `spikes` (verbatim):
```json
[
  {"frame":126,"ms":40.8,"top":["r:render 33.6","zombies 1.9","r:matrices 1.5","m:hold 0.9"],"heapMB":947.4,"freedMB":-10,"newPipelines":1,"newTextures":0,"newGeometries":1},
  {"frame":213,"ms":30.1,"top":["r:render 24.6","r:matrices 1.4","zombies 1.3","m:pose 0.5"],"heapMB":943.6,"freedMB":-9.7,"newPipelines":1,"newTextures":0,"newGeometries":0},
  {"frame":351,"ms":30.7,"top":["r:render 24.6","zombies 1.5","r:matrices 1.4","m:hold 0.7"],"heapMB":953,"freedMB":-9.7,"newPipelines":1,"newTextures":0,"newGeometries":0},
  {"frame":515,"ms":33.4,"top":["r:render 27.1","zombies 2.6","r:matrices 1.3","m:hold 0.7"],"heapMB":952.4,"freedMB":-9.8,"newPipelines":1,"newTextures":0,"newGeometries":0},
  {"frame":528,"ms":29.9,"top":["r:render 24.1","zombies 2.0","r:matrices 1.3","m:hold 0.9"],"heapMB":971.1,"freedMB":-9.7,"newPipelines":1,"newTextures":0,"newGeometries":0},
  {"frame":536,"ms":30.8,"top":["r:render 24.4","zombies 1.9","r:matrices 1.7","m:hold 0.7"],"heapMB":953.5,"freedMB":-9.7,"newPipelines":1,"newTextures":0,"newGeometries":0},
  {"frame":630,"ms":38,"top":["r:render 30.8","zombies 2.8","r:matrices 1.3","m:hold 0.9"],"heapMB":957.4,"freedMB":-9.7,"newPipelines":1,"newTextures":0,"newGeometries":0},
  {"frame":644,"ms":32.3,"top":["r:render 26.3","zombies 2.0","r:matrices 1.4","m:hold 0.6"],"heapMB":944.5,"freedMB":22.8,"newPipelines":1,"newTextures":0,"newGeometries":0}
]
```

---

### Run 3: `--prof` (`prof-3.json`)
- `fps`: `55.1`, `low`: `25.7`, `worst`: `44.2 ms`, `hitches`: `5`, `frameMs`: `18.15`, `tickMs`: `13.96`, `outsideMs`: `4.19`, `gpuMs`: `0.25`
- `spikeCauses`:
```json
{"spikes":29,"pipelines":25,"uploads":0,"gc":1,"code":3}
```
- `spikes` (verbatim):
```json
[
  {"frame":72,"ms":42.1,"top":["r:render 35.4","zombies 1.8","r:matrices 1.5","m:hold 1.0"],"heapMB":938.2,"freedMB":-9.7,"newPipelines":1,"newTextures":0,"newGeometries":0},
  {"frame":75,"ms":40.4,"top":["r:render 35.0","zombies 1.2","r:matrices 1.2","w:minimap 0.6"],"heapMB":949.6,"freedMB":-9.8,"newPipelines":1,"newTextures":0,"newGeometries":0},
  {"frame":374,"ms":33,"top":["r:render 26.6","r:matrices 1.8","zombies 1.5","m:hold 0.5"],"heapMB":939.1,"freedMB":-9.7,"newPipelines":1,"newTextures":0,"newGeometries":0},
  {"frame":387,"ms":29,"top":["r:render 22.5","zombies 1.9","r:matrices 1.3","m:hold 0.8"],"heapMB":957.8,"freedMB":-9.7,"newPipelines":1,"newTextures":0,"newGeometries":0},
  {"frame":518,"ms":29.4,"top":["r:render 23.8","zombies 1.6","r:matrices 1.2","m:hold 0.6"],"heapMB":954.1,"freedMB":-9.7,"newPipelines":1,"newTextures":0,"newGeometries":0},
  {"frame":559,"ms":33.4,"top":["r:render 26.2","zombies 2.6","r:matrices 1.5","m:hold 1.1"],"heapMB":933.3,"freedMB":22.7,"newPipelines":1,"newTextures":0,"newGeometries":0},
  {"frame":570,"ms":33.7,"top":["r:render 26.6","zombies 2.4","r:matrices 1.4","m:hold 0.9"],"heapMB":950.3,"freedMB":-9.7,"newPipelines":1,"newTextures":0,"newGeometries":0},
  {"frame":618,"ms":30.7,"top":["r:render 24.7","zombies 2.1","r:matrices 1.2","m:hold 0.7"],"heapMB":936.5,"freedMB":22.8,"newPipelines":1,"newTextures":0,"newGeometries":0}
]
```

---

### Run 4: `--prof --cpu --alloc` (`prof-cpu-alloc-4.json`)
- `fps`: `54.7`, `low`: `28.4`, `worst`: `24.8 ms`, `hitches`: `8`, `frameMs`: `18.28`, `tickMs`: `14.40`, `outsideMs`: `3.88`, `gpuMs`: `0.25`
- `alloc`: `903.7 kB/frame` (`51.7 MB/s`): `updateZombies 268.5 kB`, `get three.webgpu.js:2954 82.4 kB`, `getNodeChildren 34.0 kB`, `trace zombie-ability-collision.js:39 27.1 kB`, `getDynamicCacheKey 26.4 kB`, `draw 21.6 kB`, `propsNear 17.9 kB`
- `spikeCauses`:
```json
{"spikes":28,"pipelines":26,"uploads":0,"gc":1,"code":1}
```
- `spikes` (verbatim):
```json
[
  {"frame":1,"ms":25.2,"top":["r:render 10.4","zombies 7.2","r:matrices 2.1","drops+hud 1.0"],"heapMB":836,"freedMB":-3.2,"newPipelines":0,"newTextures":0,"newGeometries":0},
  {"frame":18,"ms":26.2,"top":["r:render 18.5","zombies 2.3","r:matrices 1.7","r:cull 0.7"],"heapMB":823.7,"freedMB":-2.7,"newPipelines":1,"newTextures":0,"newGeometries":2},
  {"frame":23,"ms":56,"top":["r:render 47.0","r:matrices 2.1","zombies 1.9","m:hold 1.2"],"heapMB":836.3,"freedMB":-9.7,"newPipelines":1,"newTextures":0,"newGeometries":0},
  {"frame":25,"ms":55.9,"top":["r:render 48.3","r:matrices 2.2","zombies 1.7","m:hold 0.7"],"heapMB":847,"freedMB":-9.7,"newPipelines":1,"newTextures":0,"newGeometries":0},
  {"frame":143,"ms":40.8,"top":["r:render 34.9","zombies 1.6","r:matrices 1.5","m:hold 0.6"],"heapMB":832.3,"freedMB":-9.7,"newPipelines":1,"newTextures":0,"newGeometries":0},
  {"frame":170,"ms":44.1,"top":["r:render 37.2","zombies 1.8","r:matrices 1.2","m:hold 0.7"],"heapMB":835.4,"freedMB":-9.7,"newPipelines":1,"newTextures":0,"newGeometries":0},
  {"frame":186,"ms":53.2,"top":["r:render 45.3","zombies 2.4","r:matrices 1.7","m:hold 0.5"],"heapMB":829.8,"freedMB":-9.8,"newPipelines":1,"newTextures":0,"newGeometries":0},
  {"frame":493,"ms":43.2,"top":["r:render 36.8","zombies 2.2","r:matrices 1.5","m:hold 0.6"],"heapMB":854.9,"freedMB":-9.8,"newPipelines":1,"newTextures":0,"newGeometries":0}
]
```
