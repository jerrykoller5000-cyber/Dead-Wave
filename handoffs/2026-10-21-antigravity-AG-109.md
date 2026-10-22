# antigravity — AG-109 Night 20 after CL-232, after AG-108 — 2026-10-21
Changed:          Ran `node tools/realtest.mjs t270 --all` (5/5 pass), 3x Night-20 High `--prof` benchmarks after CL-232 (shared zombie glow graph + `prof.builds` journal), and captured close-up Night-20 screenshots of zombie eye glow and Demon embers/fire-fist glow. Confirmed `zombie-skin` node builds dropped to `1` per run (`spikeCauses.builds: 1` across all 3 runs), total spikes dropped from 25–29 (`AG-108`) to `10` (Runs 2 & 3), `hitches` dropped to `0` across all 3 runs, and 1% low rose to `39.7 fps` median / `40.9 fps` best (`56.4 fps` median / `58.6 fps` best mean FPS).
Files:            qa/2026-10-21-AG-109/run-ag109.mjs, qa/2026-10-21-AG-109/ag109-summary.json, qa/2026-10-21-AG-109/t270.log, qa/2026-10-21-AG-109/run-1.log, qa/2026-10-21-AG-109/run-2.log, qa/2026-10-21-AG-109/run-3.log, qa/2026-10-21-AG-109/01-night-zombies-eyes-glow.png, qa/2026-10-21-AG-109/02-night-demon-embers-glow.png
Tests:            `node tools/realtest.mjs t270 --all` → 5 pass, 0 fail (real renderer); 3x `node tools/bench.mjs --night 20 --gfx high --prof` via `node crew/crew.mjs slot run antigravity AG-109` (Rule 16: one game test at a time through the shared queue)
Screenshots:      qa/2026-10-21-AG-109/01-night-zombies-eyes-glow.png, qa/2026-10-21-AG-109/02-night-demon-embers-glow.png
Not verified:     Full `npm test` suite not run (integration job owned by Cursor/Claude per Rule 16).
Requests:         FYI sent to `claude` with AG-109 Night-20 High `--prof` results, verbatim `prof.builds`, `t270` 5/5 pass, and night glow verification.
Contract changes: none

---

## 1. `t270` Real-Renderer Check (`qa/2026-10-21-AG-109/t270.log`)

Command: `node tools/realtest.mjs t270 --all` (via `slot run`)
```text
ok    t270      5 pass   0 fail  15.3s  (real renderer)
    PASS every zombie skeleton is 32 or 64 bones (32 x22)
    PASS at most two skeleton sizes over ten kinds, two each (1)
    PASS no vertex is weighted to the padding, and a posed vertex is finite
    PASS one shared glow graph for every glowing body, each reading its own levels (1 graphs)
    PASS no page errors
1 checks: 5 pass, 0 fail (real renderer)
```

---

## 2. Night 20 High (`--prof`) — 3-Run Summary (After CL-232 vs AG-108 / AG-107 / AG-106)

All runs executed sequentially through `node crew/crew.mjs slot run antigravity AG-109` on Jerry's RTX 5080 (WebGPU, 1280×720, `--night 20 --gfx high --prof`):

| Run | FPS | 1% Low | Worst (ms) | Hitches | Frame (ms) | Tick (ms) | Outside (ms) | GPU (ms) | Draws | Tris | `builds.made` (`zombie-skin`) | `pipelines.made` | `spikeCauses` |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| **AG-106 (baseline)** | 56.2 | 33.4 | 31.0 | 0 | 17.78 | 13.73 | 4.05 | 0.25 | 256 | 714k | n/a | 46 | `{spikes:25, pipelines:20, uploads:2, gc:1, code:2}` |
| **AG-107 (after CL-227)** | 57.2 | 36.5 | 26.8 | 1 | 17.48 | 13.24 | 3.76 | 0.28 | 268 | 744k | n/a | 24 | `{spikes:21, pipelines:20, uploads:0, gc:0, code:1}` |
| **AG-108 (after CL-229, med)** | 56.8 | 28.2 | 39.5 | 2 | 17.61 | 14.90 | 3.42 | 0.30 | 259 | 736k | n/a (~18) | 2 | `{spikes:27, pipelines:0, uploads:3, gc:6, code:18}` |
| **AG-109 Run 1** | 54.2 | 28.7 | 29.3 | **0** | 18.45 | 15.85 | 2.60 | 0.30 | 246 | 679k | **5** (`1`) | **4** | `{spikes:18, pipelines:0, builds:1, uploads:0, gc:2, code:15}` |
| **AG-109 Run 2** | 56.4 | **39.7** | 24.4 | **0** | 17.73 | 14.14 | 3.59 | 0.30 | 266 | 746k | **4** (`1`) | **3** | `{spikes:10, pipelines:0, builds:1, uploads:1, gc:1, code:7}` |
| **AG-109 Run 3** | **58.6** | **40.9** | 22.7 | **0** | 17.06 | **13.33** | 3.74 | 0.30 | 262 | 709k | **6** (`1`) | **5** | `{spikes:10, pipelines:1, builds:1, uploads:0, gc:2, code:6}` |
| **AG-109 Median** | **56.4** | **39.7** | **24.4** | **0** | **17.73** | **14.14** | **3.59** | **0.30** | **262** | **709k** | **5** (`1`) | **4** | `builds: 1`, `hitches: 0` across all 3 runs |
| **AG-109 Best (Run 3)** | **58.6** | **40.9** | **22.7** | **0** | **17.06** | **13.33** | **3.74** | **0.30** | **262** | **709k** | **6** (`1`) | **5** | `{spikes:10, pipelines:1, builds:1, uploads:0, gc:2, code:6}` |

### Key Takeaways
- **Shared zombie glow graph (`CL-232`) eliminated the per-zombie `WGSLNodeBuilder.build()` cascade:**
  - `zombie-skin` node builds (`prof.builds`) dropped to **`1`** per run (just a single build across the entire Night 20 push 6/6, and `0` `zombie-skin` pipelines in `prof.pipelines`).
  - `spikeCauses.builds` is **`1`** in all three runs, and the repeated `r:render 25–35 ms` + `freedMB: -9.7 MB` per-zombie spikes from `AG-108` are gone.
  - Total spikes per run dropped from `25..29` (`AG-108`) to **`10`** in Runs 2 & 3 (`18` in Run 1), `hitches` dropped from `1..2` to **`0`** in all 3 runs, and the **1% low jumped to `39.7 fps` median / `40.9 fps` best** (with mean FPS reaching **`58.6 fps`** and tick down to **`13.33 ms`** in Run 3).

---

## 3. Verbatim `prof.builds`, `prof.pipelines.made`, `spikeCauses`, and `prof.spikes`

### Run 1 (`qa/2026-10-21-AG-109/run-1.log`)
- `fps`: `54.2`, `low`: `28.7`, `worst`: `29.3 ms`, `hitches`: `0`, `tickMs`: `15.85`
- `spikeCauses`: `{"spikes":18,"pipelines":0,"builds":1,"uploads":0,"gc":2,"code":15}`
- `prof.pipelines.made`: `4`
- `prof.builds` (verbatim):
```json
{
  "made": 5,
  "top": [
    {
      "k": "marine-shadow < Group < Group < Group | SkinnedMesh | MeshBasicMaterial",
      "n": 3,
      "frames": [
        25,
        1525,
        1675
      ]
    },
    {
      "k": "feral-motion-echo < Scene | SkinnedMesh | MeshBasicMaterial",
      "n": 1,
      "frames": [
        548
      ]
    },
    {
      "k": "zombie-skin < Group < Scene | SkinnedMesh | MeshStandardNodeMaterial",
      "n": 1,
      "frames": [
        1240
      ]
    }
  ]
}
```
- `prof.spikes` (verbatim):
```json
[
  { "frame": 43, "ms": 32.3, "top": ["r:render 14.4", "r:matrices 4.6", "zombies 3.6", "m:hold 2.2"], "heapMB": 887.1, "freedMB": -0.8, "newPipelines": 0, "newTextures": 0, "newGeometries": 0, "newBuilds": 0 },
  { "frame": 222, "ms": 28.0, "top": ["r:render 9.6", "zombies 5.0", "r:matrices 4.6", "m:hold 2.2"], "heapMB": 918.9, "freedMB": -0.8, "newPipelines": 0, "newTextures": 0, "newGeometries": 0, "newBuilds": 0 },
  { "frame": 341, "ms": 27.6, "top": ["r:render 11.0", "zombies 4.7", "r:matrices 4.4", "m:hold 2.2"], "heapMB": 908.5, "freedMB": -0.7, "newPipelines": 0, "newTextures": 0, "newGeometries": 0, "newBuilds": 0 },
  { "frame": 398, "ms": 34.0, "top": ["r:render 14.8", "zombies 5.1", "r:matrices 4.3", "m:hold 2.3"], "heapMB": 919.2, "freedMB": -0.7, "newPipelines": 0, "newTextures": 0, "newGeometries": 0, "newBuilds": 0 },
  { "frame": 464, "ms": 30.6, "top": ["r:render 23.1", "zombies 2.0", "r:matrices 1.7", "m:hold 1.1"], "heapMB": 869.2, "freedMB": 32.3, "newPipelines": 0, "newTextures": 0, "newGeometries": 0, "newBuilds": 0 },
  { "frame": 753, "ms": 25.1, "top": ["r:render 8.0", "zombies 6.0", "r:matrices 3.9", "m:hold 2.2"], "heapMB": 840.6, "freedMB": -0.7, "newPipelines": 0, "newTextures": 0, "newGeometries": 0, "newBuilds": 0 },
  { "frame": 870, "ms": 31.3, "top": ["r:render 16.7", "zombies 4.0", "r:matrices 3.9", "r:cull 1.1"], "heapMB": 838.4, "freedMB": -0.7, "newPipelines": 0, "newTextures": 0, "newGeometries": 0, "newBuilds": 0 },
  { "frame": 928, "ms": 31.0, "top": ["r:render 8.9", "zombies 8.4", "r:matrices 4.1", "m:hold 2.2"], "heapMB": 845.7, "freedMB": -0.7, "newPipelines": 0, "newTextures": 0, "newGeometries": 0, "newBuilds": 0 }
]
```

### Run 2 (`qa/2026-10-21-AG-109/run-2.log`)
- `fps`: `56.4`, `low`: `39.7`, `worst`: `24.4 ms`, `hitches`: `0`, `tickMs`: `14.14`
- `spikeCauses`: `{"spikes":10,"pipelines":0,"builds":1,"uploads":1,"gc":1,"code":7}`
- `prof.pipelines.made`: `3`
- `prof.builds` (verbatim):
```json
{
  "made": 4,
  "top": [
    {
      "k": "marine-shadow < Group < Group < Group | SkinnedMesh | MeshBasicMaterial",
      "n": 2,
      "frames": [
        26,
        1676
      ]
    },
    {
      "k": "feral-motion-echo < Scene | SkinnedMesh | MeshBasicMaterial",
      "n": 1,
      "frames": [
        509
      ]
    },
    {
      "k": "zombie-skin < Group < Scene | SkinnedMesh | MeshStandardNodeMaterial",
      "n": 1,
      "frames": [
        1038
      ]
    }
  ]
}
```
- `prof.spikes` (verbatim):
```json
[
  { "frame": 1038, "ms": 38.0, "top": ["r:render 30.4", "zombies 3.2", "r:matrices 1.3", "m:hold 0.9"], "heapMB": 833.5, "freedMB": -10.3, "newPipelines": 0, "newTextures": 0, "newGeometries": 1, "newBuilds": 1 },
  { "frame": 1293, "ms": 25.2, "top": ["r:render 8.6", "m:hold2+arms 5.8", "zombies 3.1", "m:idle 2.2"], "heapMB": 842.2, "freedMB": -6.5, "newPipelines": 0, "newTextures": 0, "newGeometries": 0, "newBuilds": 0 },
  { "frame": 1419, "ms": 35.4, "top": ["r:render 26.0", "zombies 4.0", "r:matrices 1.5", "w:minimap 0.7"], "heapMB": 825.9, "freedMB": 25.5, "newPipelines": 0, "newTextures": 0, "newGeometries": 0, "newBuilds": 0 },
  { "frame": 1567, "ms": 35.2, "top": ["r:render 20.2", "r:matrices 6.0", "zombies 3.7", "r:cull 1.5"], "heapMB": 846.0, "freedMB": -1.1, "newPipelines": 0, "newTextures": 0, "newGeometries": 0, "newBuilds": 0 },
  { "frame": 1568, "ms": 26.3, "top": ["r:render 9.1", "zombies 5.5", "m:idle 4.4", "m:pose 1.8"], "heapMB": 847.3, "freedMB": -1.3, "newPipelines": 0, "newTextures": 0, "newGeometries": 1, "newBuilds": 0 },
  { "frame": 1595, "ms": 31.5, "top": ["marine 14.5", "r:render 8.3", "zombies 3.4", "r:matrices 1.9"], "heapMB": 850.2, "freedMB": -12.1, "newPipelines": 0, "newTextures": 0, "newGeometries": -1, "newBuilds": 0 },
  { "frame": 1617, "ms": 25.9, "top": ["r:render 16.7", "zombies 3.9", "r:matrices 2.0", "m:idle 0.7"], "heapMB": 836.6, "freedMB": -1.0, "newPipelines": 0, "newTextures": 0, "newGeometries": 0, "newBuilds": 0 },
  { "frame": 1618, "ms": 33.4, "top": ["zombies 10.1", "r:render 10.1", "m:idle 4.1", "r:matrices 2.3"], "heapMB": 837.6, "freedMB": -0.9, "newPipelines": 0, "newTextures": 0, "newGeometries": 0, "newBuilds": 0 }
]
```

### Run 3 (`qa/2026-10-21-AG-109/run-3.log`)
- `fps`: `58.6`, `low`: `40.9`, `worst`: `22.7 ms`, `hitches`: `0`, `tickMs`: `13.33`
- `spikeCauses`: `{"spikes":10,"pipelines":1,"builds":1,"uploads":0,"gc":2,"code":6}`
- `prof.pipelines.made`: `5`
- `prof.builds` (verbatim):
```json
{
  "made": 6,
  "top": [
    {
      "k": "marine-shadow < Group < Group < Group | SkinnedMesh | MeshBasicMaterial",
      "n": 3,
      "frames": [
        28,
        1528,
        1678
      ]
    },
    {
      "k": "feral-motion-echo < Scene | SkinnedMesh | MeshBasicMaterial",
      "n": 1,
      "frames": [
        571
      ]
    },
    {
      "k": "zombie-skin < Group < Scene | SkinnedMesh | MeshStandardNodeMaterial",
      "n": 1,
      "frames": [
        1444
      ]
    },
    {
      "k": "Mesh < Group < Scene | Mesh | MeshBasicMaterial",
      "n": 1,
      "frames": [
        1646
      ]
    }
  ]
}
```
- `prof.spikes` (verbatim):
```json
[
  { "frame": 951, "ms": 29.4, "top": ["r:render 17.5", "r:matrices 4.9", "zombies 2.1", "r:cull 1.4"], "heapMB": 923.0, "freedMB": -0.7, "newPipelines": 0, "newTextures": 0, "newGeometries": 0, "newBuilds": 0 },
  { "frame": 1130, "ms": 29.7, "top": ["r:render 12.9", "zombies 5.1", "r:matrices 3.9", "m:hold 1.5"], "heapMB": 900.8, "freedMB": -0.7, "newPipelines": 0, "newTextures": 0, "newGeometries": 0, "newBuilds": 0 },
  { "frame": 1444, "ms": 31.0, "top": ["r:render 24.6", "zombies 2.2", "r:matrices 1.3", "m:idle 0.8"], "heapMB": 925.3, "freedMB": -10.2, "newPipelines": 0, "newTextures": 0, "newGeometries": 0, "newBuilds": 1 },
  { "frame": 1454, "ms": 27.6, "top": ["marine 11.3", "r:render 7.9", "zombies 2.9", "r:matrices 2.0"], "heapMB": 945.0, "freedMB": -11.5, "newPipelines": 0, "newTextures": 0, "newGeometries": -1, "newBuilds": 0 },
  { "frame": 1612, "ms": 27.1, "top": ["zombies 14.7", "r:render 8.0", "r:matrices 1.6", "m:hold 0.8"], "heapMB": 955.4, "freedMB": -10.4, "newPipelines": 0, "newTextures": 0, "newGeometries": 0, "newBuilds": 0 },
  { "frame": 1660, "ms": 30.3, "top": ["r:render 16.0", "zombies 8.3", "r:matrices 2.1", "m:hold 0.6"], "heapMB": 946.6, "freedMB": 31.8, "newPipelines": 0, "newTextures": 0, "newGeometries": 0, "newBuilds": 0 },
  { "frame": 1661, "ms": 37.6, "top": ["r:render 13.5", "zombies 13.4", "r:matrices 3.0", "m:hold 1.8"], "heapMB": 948.3, "freedMB": -1.7, "newPipelines": 0, "newTextures": 0, "newGeometries": 0, "newBuilds": 0 },
  { "frame": 1678, "ms": 29.4, "top": ["r:render 21.3", "zombies 3.1", "r:matrices 1.8", "m:hold 0.5"], "heapMB": 968.8, "freedMB": -3.4, "newPipelines": 1, "newTextures": 0, "newGeometries": 4, "newBuilds": 1 }
]
```

---

## 4. Close Look at Zombies & Demon Embers at Night (`CL-232`)

- **`qa/2026-10-21-AG-109/01-night-zombies-eyes-glow.png`**: Close-up at Night 20 showing `screamer`, `bomber`, `spitter`, `brute`, `military`, `drowned`, `feral`, and `shambler` side by side. Each zombie's shared glow graph (`aEmissive` + per-body uniform level) renders its distinct eye/face/body glow cleanly (`screamer` pink eyes & tongue, `bomber` & `spitter` yellow-green eyes & ooze, `brute` orange-red eyes, `drowned` cyan-blue eyes, `shambler`/`feral`/`military` yellow-green eyes).
- **`qa/2026-10-21-AG-109/02-night-demon-embers-glow.png`**: Close-up at Night 20 of two Demons showing glowing orange-yellow embers floating around their bodies and glowing fire fists (`demon-fire-fists`, `visible: true, count: 2, castShadow: false`) with zero console/page errors (`errs: []`).
