# antigravity — AG-113 What the 3-second spikes make (CL-238) — 2026-10-21
Changed:          Ran 2x Night-20 High `--prof` benchmarks through the game-test slot with CL-238's `renderObjects` journal (`qa/2026-10-21-AG-113/`). Across both 30 s (~1810-frame) runs, `renderObjects` made only `177` (`0.10/frame`) and `220` (`0.12/frame`) render objects total, the scene's 9-light list never changed after frame 1/8, and every ~3-second (179–180 frame) spike made `newRenderObjects: 0` (the only spike with `newRenderObjects > 0` in either run was the single `zombie-skin` node-build frame with `newRenderObjects: 1`).
Files:            qa/2026-10-21-AG-113/run-ag113.mjs, qa/2026-10-21-AG-113/ag113-summary.json, qa/2026-10-21-AG-113/run-1.json, qa/2026-10-21-AG-113/run-2.json
Tests:            not run (QA benchmark only; no game code modified)
Screenshots:      none (profiling-only task per AG-113)
Not verified:     Nothing — both Night-20 High `--prof` runs with `renderObjects` were verified on the RTX 5080 through the game-test slot (Rule 16).
Requests:         FYI sent to claude with AG-113 `renderObjects` and `spikes` verbatim.
Contract changes: none

---

## 1. Summary Table — Night 20 High `--prof` with `CL-238` `renderObjects` Journal (30 s window, 48 zombies)

All runs executed sequentially one instance at a time through `node crew/crew.mjs slot run antigravity AG-113` (Rule 16).

| Run | FPS | 1% Low | Worst (ms) | Hitches (>33 ms) | `tickMs` | `r:render` avg / max | `spikeCauses` | `renderObjects.made` (`perFrame`) | `newRenderObjects` on `code` spikes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: |
| **run-1** | **59.3** | **46.1** | 23.1 | 0 | **13.10** | 5.84 / 34.3 | `spikes:2, pipelines:0, builds:1, uploads:0, sunShadow:0, gc:1, code:0` | **177** (`0.10`) | **0** (0 `code` spikes in run-1!) |
| **run-2** | **59.7** | **41.6** | 25.9 | 0 | **13.53** | 6.12 / 24.7 | `spikes:7, pipelines:0, builds:1, uploads:0, sunShadow:0, gc:0, code:6` | **220** (`0.12`) | **0** on all 6 `code` spikes (`316, 495, 674, 854, 1303, 1573`) |

### Key Findings
1. **No spike made hundreds of `RenderObject`s, and no light entered or left the scene's light list:**
   - Every ~3-second spike (`316, 495, 674, 854` in `run-2`, spaced by `179, 179, 180` frames = `3.00 s` at `59.7 fps`) had **`newRenderObjects: 0`**, **`newBuilds: 0`**, **`newPipelines: 0`**, and **`sunShadow: 0`**.
   - Tracking `lightsNode.getLights()` inside `createRenderObject` confirmed the scene's 9-light list (`HemisphereLight`, 2 `DirectionalLight`s, `AmbientLight`, `SpotLight`, `light-pool-0..3`) stayed constant for the entire 30 s window in both runs.
   - In `run-1` (`59.3 fps`, `1% low 46.1`, `tick 13.10 ms`), there were **zero** `code` spikes (`spikeCauses.code: 0`, only 2 spikes total in 1811 frames: one GC at frame 1182 and one `zombie-skin` build at frame 1204).
2. **What the `177` / `220` total `renderObjects` over 30 s actually are:**
   - `Mesh < Scene | MeshBasicMaterial | scene`: `122` (run-1) / `157` (run-2), spread 1–2 at a time across early frames (`8, 16, 24, 80...`) as pooled particle/effect meshes draw for the first time.
   - `zombie-skin < Group < Scene | NodeMaterial | ortho`: `24` (run-1 at frames `781, 1681`) / `27` (run-2 at frames `784, 1684`), when the two 900-frame timed `sunShadow` redraws draw newly spawned zombies into the ortho shadow map (~12–14 render objects per redraw; neither frame spiked).
   - `zombie-skin < Group < Scene | MeshStandardNodeMaterial | scene`: `20` (run-1) / `23` (run-2), 1 at a time as newly spawned zombies enter the view.
3. **Why the `179–180` frame (`3.00 s` wall-clock) spikes in `run-2` (`316, 495, 674, 854`) happen when they occur:**
   - On those frames (`316, 495, 674, 854`), *every* phase in the tick stretches simultaneously by ~2x–3x (`r:render 13.8–15.3 ms` vs `6.1 ms` avg, `zombies 3.6–7.5 ms` vs `2.4 ms` avg, `r:matrices 3.7–5.1 ms` vs `1.7 ms` avg, `m:hold 2.2–3.1 ms` vs `0.7 ms` avg), rather than one subsystem doing extra work. Note also that the benchmark harness polls `page.evaluate(SAMPLE)` every `1500 ms` (`2 × 1500 ms = 3000 ms = 179.1 frames` at `59.7 fps`).

---

## 2. Verbatim `renderObjects`, `spikeCauses`, and `prof.spikes` per Run

### Run 1 (`fps: 59.3`, `low: 46.1`, `tickMs: 13.10`, `worst: 23.1`, `hitches: 0`)

#### `spikeCauses`
```json
{
  "spikes": 2,
  "pipelines": 0,
  "builds": 1,
  "uploads": 0,
  "sunShadow": 0,
  "gc": 1,
  "code": 0
}
```

#### `renderObjects` (verbatim)
```json
{
  "made": 177,
  "perFrame": 0.1,
  "top": [
    {
      "k": "Mesh < Scene | MeshBasicMaterial | scene",
      "n": 122,
      "frames": [
        8,
        16,
        24,
        80,
        88,
        160
      ]
    },
    {
      "k": "zombie-skin < Group < Scene | NodeMaterial | ortho",
      "n": 24,
      "frames": [
        781,
        1681
      ]
    },
    {
      "k": "zombie-skin < Group < Scene | MeshStandardNodeMaterial | scene",
      "n": 20,
      "frames": [
        85,
        201,
        255,
        564,
        673,
        686
      ]
    },
    {
      "k": "feral-motion-echo < Scene | MeshBasicMaterial | scene",
      "n": 6,
      "frames": [
        882,
        884,
        886,
        913,
        917,
        921
      ]
    },
    {
      "k": "Mesh < zombie-fireball < Scene | MeshBasicMaterial | scene",
      "n": 2,
      "frames": [
        1384,
        1385
      ]
    },
    {
      "k": "zombie-skin < Group < Scene | MeshStandardMaterial | scene",
      "n": 2,
      "frames": [
        1538,
        1577
      ]
    },
    {
      "k": "marine-shadow < Group < Group | NodeMaterial | ortho",
      "n": 1,
      "frames": [
        781
      ]
    }
  ],
  "spikes": [
    {
      "frame": 1182,
      "n": 0,
      "top": []
    },
    {
      "frame": 1204,
      "n": 1,
      "top": [
        "1 zombie-skin < Group < Scene | MeshStandardNodeMaterial | scene"
      ]
    }
  ]
}
```

#### `prof.spikes` (all 2 recorded spikes verbatim — only 2 spikes >25 ms occurred in Run 1)
```json
[
  {
    "frame": 1182,
    "ms": 33.7,
    "top": [
      "r:render 22.7",
      "zq:loop 2.6",
      "r:matrices 2.6",
      "m:hold 1.1"
    ],
    "heapMB": 820.8,
    "freedMB": 38.6,
    "newPipelines": 0,
    "newTextures": 0,
    "newGeometries": 0,
    "newBuilds": 0,
    "sunShadow": 0,
    "newRenderObjects": 0
  },
  {
    "frame": 1204,
    "ms": 41.5,
    "top": [
      "r:render 34.3",
      "r:matrices 1.9",
      "zq:loop 1.8",
      "zq:abilities 0.6"
    ],
    "heapMB": 852.8,
    "freedMB": -10.1,
    "newPipelines": 0,
    "newTextures": 0,
    "newGeometries": 1,
    "newBuilds": 1,
    "sunShadow": 0,
    "newRenderObjects": 1
  }
]
```

---

### Run 2 (`fps: 59.7`, `low: 41.6`, `tickMs: 13.53`, `worst: 25.9`, `hitches: 0`)

#### `spikeCauses`
```json
{
  "spikes": 7,
  "pipelines": 0,
  "builds": 1,
  "uploads": 0,
  "sunShadow": 0,
  "gc": 0,
  "code": 6
}
```

#### `renderObjects` (verbatim)
```json
{
  "made": 220,
  "perFrame": 0.12,
  "top": [
    {
      "k": "Mesh < Scene | MeshBasicMaterial | scene",
      "n": 157,
      "frames": [
        2,
        10,
        18,
        26,
        42,
        50
      ]
    },
    {
      "k": "zombie-skin < Group < Scene | NodeMaterial | ortho",
      "n": 27,
      "frames": [
        784,
        1684
      ]
    },
    {
      "k": "zombie-skin < Group < Scene | MeshStandardNodeMaterial | scene",
      "n": 23,
      "frames": [
        1,
        44,
        156,
        347,
        565,
        633
      ]
    },
    {
      "k": "feral-motion-echo < Scene | MeshBasicMaterial | scene",
      "n": 6,
      "frames": [
        596,
        600,
        604,
        720,
        724,
        728
      ]
    },
    {
      "k": "zombie-skin < Group < Scene | MeshStandardMaterial | scene",
      "n": 4,
      "frames": [
        1485,
        1500,
        1567,
        1595
      ]
    },
    {
      "k": "Mesh < zombie-fireball < Scene | MeshBasicMaterial | scene",
      "n": 2,
      "frames": [
        1256,
        1257
      ]
    },
    {
      "k": "marine-shadow < Group < Group | NodeMaterial | ortho",
      "n": 1,
      "frames": [
        784
      ]
    }
  ],
  "spikes": [
    {
      "frame": 316,
      "n": 0,
      "top": []
    },
    {
      "frame": 495,
      "n": 0,
      "top": []
    },
    {
      "frame": 674,
      "n": 0,
      "top": []
    },
    {
      "frame": 854,
      "n": 0,
      "top": []
    },
    {
      "frame": 1259,
      "n": 1,
      "top": [
        "1 zombie-skin < Group < Scene | MeshStandardNodeMaterial | scene"
      ]
    },
    {
      "frame": 1303,
      "n": 0,
      "top": []
    },
    {
      "frame": 1573,
      "n": 0,
      "top": []
    }
  ]
}
```

#### `prof.spikes` (all 7 recorded spikes verbatim — only 7 spikes >25 ms occurred in Run 2)
```json
[
  {
    "frame": 316,
    "ms": 34.9,
    "top": [
      "r:render 13.8",
      "zombies 7.5",
      "r:matrices 5.1",
      "m:hold 3.1"
    ],
    "heapMB": 887.2,
    "freedMB": -0.8,
    "newPipelines": 0,
    "newTextures": 0,
    "newGeometries": 0,
    "newBuilds": 0,
    "sunShadow": 0,
    "newRenderObjects": 0
  },
  {
    "frame": 495,
    "ms": 25.9,
    "top": [
      "r:render 7.7",
      "r:matrices 4.3",
      "zombies 3.7",
      "m:hold 2.4"
    ],
    "heapMB": 909.2,
    "freedMB": -0.7,
    "newPipelines": 0,
    "newTextures": 0,
    "newGeometries": 0,
    "newBuilds": 0,
    "sunShadow": 0,
    "newRenderObjects": 0
  },
  {
    "frame": 674,
    "ms": 27.9,
    "top": [
      "r:render 15.3",
      "r:matrices 3.7",
      "zombies 3.6",
      "w:minimap 1.1"
    ],
    "heapMB": 916,
    "freedMB": -0.8,
    "newPipelines": 0,
    "newTextures": 0,
    "newGeometries": 0,
    "newBuilds": 0,
    "sunShadow": 0,
    "newRenderObjects": 0
  },
  {
    "frame": 854,
    "ms": 30.6,
    "top": [
      "r:render 14.3",
      "zombies 4.9",
      "r:matrices 4.1",
      "m:hold 2.2"
    ],
    "heapMB": 908.2,
    "freedMB": -0.7,
    "newPipelines": 0,
    "newTextures": 0,
    "newGeometries": 0,
    "newBuilds": 0,
    "sunShadow": 0,
    "newRenderObjects": 0
  },
  {
    "frame": 1259,
    "ms": 31.5,
    "top": [
      "r:render 24.7",
      "zombies 2.0",
      "r:matrices 1.6",
      "m:hold 0.7"
    ],
    "heapMB": 943.3,
    "freedMB": -10,
    "newPipelines": 0,
    "newTextures": 0,
    "newGeometries": 1,
    "newBuilds": 1,
    "sunShadow": 0,
    "newRenderObjects": 1
  },
  {
    "frame": 1303,
    "ms": 26.9,
    "top": [
      "zombies 15.7",
      "r:render 5.6",
      "r:matrices 1.8",
      "m:hold 1.1"
    ],
    "heapMB": 935.1,
    "freedMB": -6,
    "newPipelines": 0,
    "newTextures": 0,
    "newGeometries": 0,
    "newBuilds": 0,
    "sunShadow": 0,
    "newRenderObjects": 0
  },
  {
    "frame": 1573,
    "ms": 28.3,
    "top": [
      "zombies 13.1",
      "r:render 7.5",
      "r:matrices 2.1",
      "m:hold 1.9"
    ],
    "heapMB": 948.9,
    "freedMB": -1,
    "newPipelines": 0,
    "newTextures": 0,
    "newGeometries": 0,
    "newBuilds": 0,
    "sunShadow": 0,
    "newRenderObjects": 0
  }
]
```
