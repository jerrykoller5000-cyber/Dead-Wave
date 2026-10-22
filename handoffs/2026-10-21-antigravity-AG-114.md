# antigravity — AG-114 Is it the garbage collector? (CL-239) — 2026-10-21
Changed:          Ran 2x Night-20 High `--prof --gc` and 1x Night-20 High `--prof --alloc` through the game-test slot (`qa/2026-10-21-AG-114/`). Main-thread V8 GC is NOT inside any spike frame (`spikesWithGc: "0/11"` in `gc-1` and `"0/9"` in `gc-2`, `gcMs: 0` on every spike; main-thread GC is only `40.2 ms` / `39.8 ms` total = `0.02 ms/frame` across ~50–54 short ~0.7 ms `V8.GC_SCAVENGER` runs). In `--prof --alloc` (`58.8 fps`, `1% low 41.6`, `tick 13.07 ms`), total allocation is `769.6 kB/frame` (`45.3 MB/s`), led by `updateZombies` (`259.4 kB/frame`).
Files:            qa/2026-10-21-AG-114/run-ag114.mjs, qa/2026-10-21-AG-114/ag114-summary.json, qa/2026-10-21-AG-114/gc-1.json, qa/2026-10-21-AG-114/gc-2.json, qa/2026-10-21-AG-114/alloc-1.json
Tests:            not run (QA benchmark only; no game code modified)
Screenshots:      none (profiling-only task per AG-114)
Not verified:     Nothing — all 3 Night-20 High benchmark runs (`2x --prof --gc`, `1x --prof --alloc`) were verified on the RTX 5080 through the game-test slot (Rule 16).
Requests:         FYI sent to claude with AG-114 `prof.gc` and `alloc` results verbatim.
Contract changes: none

---

## 1. Summary Table — Night 20 High (`2x --prof --gc` + `1x --prof --alloc`, 30 s window, 48 zombies)

All runs executed sequentially one instance at a time through `node crew/crew.mjs slot run antigravity AG-114` (Rule 16).

| Run | Mode | FPS | 1% Low | Worst (ms) | Hitches (>50 ms) | `tickMs` | `spikeCauses` | `prof.gc` (`totalMs` / `perFrameMs` / `spikesWithGc`) | `alloc` (`kbPerFrame` / `mbPerSecond`) |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |
| **gc-1** | `--prof --gc` | **56.6** | **38.5** | 24.4 | 0 | 14.87 | `spikes:11, pipelines:0, builds:1, uploads:1, sunShadow:0, gc:0, code:9` | `synced: true, totalMs: 40.2, perFrameMs: 0.02, spikesWithGc: 0/11` | — |
| **gc-2** | `--prof --gc` | **58.9** | **42.4** | 24.4 | 0 | 13.52 | `spikes:9, pipelines:1, builds:1, uploads:0, sunShadow:0, gc:0, code:7` | `synced: true, totalMs: 39.8, perFrameMs: 0.02, spikesWithGc: 0/9` | — |
| **alloc-1** | `--prof --alloc` | **58.8** | **41.6** | 24.8 | 0 | **13.07** | `spikes:5, pipelines:0, builds:1, uploads:0, sunShadow:0, gc:0, code:4` | — | **`769.6 kB/frame`** (`45.3 MB/s`) |

### Key Takeaways
1. **Main-thread V8 GC is `0 ms` on every single spike frame (`0/11` in `gc-1`, `0/9` in `gc-2`):**
   - Over the 30 s (~1,800-frame) window, `CrRendererMain` spent only **`40.2 ms`** (`0.02 ms/frame`) in `gc-1` and **`39.8 ms`** (`0.02 ms/frame`) in `gc-2` inside V8 GC, consisting almost entirely of `50` / `54` minor `V8.GC_SCAVENGER` collections averaging **`0.74 ms` / `0.68 ms`** each, plus `5` `V8.GCDeoptMarkedAllocationSites` totaling `1.4 ms` / `1.5 ms`.
   - None of those ~0.7 ms scavenges landed in or caused any of the >25 ms spikes (`gcMs: 0` on all `11` spikes in `gc-1` and all `9` spikes in `gc-2`).
2. **Exact wall-clock (`t0`) periodicity on the `code` spikes:**
   - With `CL-239`'s `t0`/`t1` (`performance.now()` ms) on each spike:
     - In `gc-1`, the `code` spikes start at `t0 = 31644.1, 37639.0 (+5994.9), 40644.0 (+3005.0), 46643.9 (+5999.9), 49640.3 (+2996.4)` ms (`31644.1 + k × 3000.0 ms`).
     - In `gc-2`, the `code` spikes start at `t0 = 33228.0, 35228.1 (+2000.1), 41228.1 (+6000.0), 44228.2 (+3000.1), 50228.0 (+5999.8)` ms.
3. **Allocation profile (`--prof --alloc`):**
   - `769.6 kB/frame` (`45.3 MB/s` across `1810` frames; down from `AG-103`'s `~922 kB/frame`).
   - Top self allocator remains `updateZombies index.html:52784` (`259.4 kB/frame`, 33.7% of total), followed by Three.js WebGPU render-list/node-cache helpers (`getDynamicCacheKey` `27.0 kB`, `DataMap.get` `25.1 kB`, `draw` `21.2 kB`, `getNodeChildren` `21.2 kB`, `RenderObjects.get` `19.3 kB`, `getCacheKey$1` `15.6 kB`, `update` `12.8 kB`) and `trace zombie-ability-collision.js:39` (`24.1 kB/frame`) + `propsNear index.html:50207` (`18.0 kB/frame`).

---

## 2. Verbatim `prof.gc`, `spikeCauses`, and `prof.spikes` for `--prof --gc` Runs

### Run 1: `gc-1` (`fps: 56.6`, `low: 38.5`, `tickMs: 14.87`, `worst: 24.4`, `hitches: 0`)

#### `spikeCauses`
```json
{
  "spikes": 11,
  "pipelines": 0,
  "builds": 1,
  "uploads": 1,
  "sunShadow": 0,
  "gc": 0,
  "code": 9
}
```

#### `prof.gc` (verbatim)
```json
{
  "synced": true,
  "mainThread": "CrRendererMain",
  "events": 3259,
  "totalMs": 40.2,
  "perFrameMs": 0.02,
  "byName": {
    "V8.GC_HEAP_EXTERNAL_PROLOGUE": {
      "n": 50,
      "ms": 1.2
    },
    "V8.GC_HEAP_PROLOGUE": {
      "n": 50,
      "ms": 0.1
    },
    "V8.GC_TIME_TO_SAFEPOINT": {
      "n": 49,
      "ms": 0.2
    },
    "V8.GC_SCAVENGER": {
      "n": 50,
      "ms": 37
    },
    "V8.GC_HEAP_PROLOGUE_SAFEPOINT": {
      "n": 49,
      "ms": 0.1
    },
    "V8.GC_SCAVENGER_SCAVENGE": {
      "n": 50,
      "ms": 35.7
    },
    "V8.GC_SCAVENGER_SCAVENGE_WEAK_GLOBAL_HANDLES_IDENTIFY": {
      "n": 50,
      "ms": 6.1
    },
    "V8.GC_SCAVENGER_TRACED_HANDLES_COMPUTE_WEAKNESS_PARALLEL": {
      "n": 50,
      "ms": 4.7
    },
    "V8.GC_SCAVENGER_SCAVENGE_COLLECT_OLD_TO_NEW_PAGES": {
      "n": 50,
      "ms": 4.2
    },
    "V8.GC_SCAVENGER_SCAVENGE_PARALLEL_PHASE": {
      "n": 50,
      "ms": 12.4
    },
    "Parallel scavenge started": {
      "n": 48,
      "ms": 0.1
    },
    "V8.GC_SCAVENGER_SCAVENGE_ROOTS": {
      "n": 50,
      "ms": 3.4
    },
    "V8.GC_SCAVENGER_SCAVENGE_WEAK_GLOBAL_HANDLES_PROCESS": {
      "n": 50,
      "ms": 3.2
    },
    "V8.GC_SCAVENGER_TRACED_HANDLES_RESET_PARALLEL": {
      "n": 50,
      "ms": 2.3
    },
    "V8.GC_SCAVENGER_SCAVENGE_FINALIZE": {
      "n": 50,
      "ms": 2
    },
    "V8.GC_SCAVENGER_SCAVENGE_RESTORE_AND_QUARANTINE_PINNED": {
      "n": 50,
      "ms": 0.3
    },
    "V8.GC_SCAVENGER_FREE_REMEMBERED_SET": {
      "n": 50,
      "ms": 1.3
    },
    "V8.GC_SCAVENGER_SWEEP_ARRAY_BUFFERS": {
      "n": 50,
      "ms": 0.2
    },
    "V8.GC_SCAVENGER_RESIZE_NEW_SPACE": {
      "n": 50,
      "ms": 0.1
    },
    "V8.GC_HEAP_EPILOGUE_SAFEPOINT": {
      "n": 50,
      "ms": 0.1
    },
    "V8.GC_HEAP_EPILOGUE": {
      "n": 50,
      "ms": 0.2
    },
    "V8.GC_HEAP_DUMP_STATISTICS": {
      "n": 47,
      "ms": 0
    },
    "V8.GC_HEAP_EXTERNAL_EPILOGUE": {
      "n": 50,
      "ms": 0.1
    },
    "V8.GC_SCAVENGER_SCAVENGE_PARALLEL": {
      "n": 39,
      "ms": 2.9
    },
    "V8.GCDeoptMarkedAllocationSites": {
      "n": 5,
      "ms": 1.4
    }
  },
  "spikesWithGc": "0/11",
  "spikes": [
    {
      "frame": 197,
      "ms": 26.1,
      "wallMs": 27.6,
      "gcMs": 0,
      "names": {}
    },
    {
      "frame": 554,
      "ms": 27.2,
      "wallMs": 29.1,
      "gcMs": 0,
      "names": {}
    },
    {
      "frame": 555,
      "ms": 26.2,
      "wallMs": 27.7,
      "gcMs": 0,
      "names": {}
    },
    {
      "frame": 563,
      "ms": 29.1,
      "wallMs": 29.8,
      "gcMs": 0,
      "names": {}
    },
    {
      "frame": 727,
      "ms": 28.7,
      "wallMs": 30.9,
      "gcMs": 0,
      "names": {}
    },
    {
      "frame": 1079,
      "ms": 35.4,
      "wallMs": 37.2,
      "gcMs": 0,
      "names": {}
    },
    {
      "frame": 1211,
      "ms": 48.7,
      "wallMs": 49.6,
      "gcMs": 0,
      "names": {}
    },
    {
      "frame": 1251,
      "ms": 29.8,
      "wallMs": 31.2,
      "gcMs": 0,
      "names": {}
    },
    {
      "frame": 1429,
      "ms": 35.2,
      "wallMs": 36.1,
      "gcMs": 0,
      "names": {}
    },
    {
      "frame": 1760,
      "ms": 39.2,
      "wallMs": 40,
      "gcMs": 0,
      "names": {}
    },
    {
      "frame": 1761,
      "ms": 25.4,
      "wallMs": 26.5,
      "gcMs": 0,
      "names": {}
    }
  ]
}
```

#### `prof.spikes` (first 8 spikes verbatim)
```json
[
  {
    "frame": 197,
    "ms": 26.1,
    "top": [
      "r:render 14.7",
      "r:matrices 3.5",
      "zombies 1.5",
      "r:cull 1.2"
    ],
    "heapMB": 894.1,
    "freedMB": -0.7,
    "newPipelines": 0,
    "newTextures": 0,
    "newGeometries": 0,
    "newBuilds": 0,
    "sunShadow": 0,
    "newRenderObjects": 0,
    "t0": 31644.1,
    "t1": 31671.7
  },
  {
    "frame": 554,
    "ms": 27.2,
    "top": [
      "r:render 17.6",
      "zombies 2.7",
      "r:matrices 2.7",
      "r:cull 0.8"
    ],
    "heapMB": 901.9,
    "freedMB": -1.1,
    "newPipelines": 0,
    "newTextures": 0,
    "newGeometries": 1,
    "newBuilds": 0,
    "sunShadow": 0,
    "newRenderObjects": 1,
    "t0": 37639,
    "t1": 37668.1
  },
  {
    "frame": 555,
    "ms": 26.2,
    "top": [
      "r:render 9.1",
      "zombies 4.5",
      "r:matrices 3.9",
      "r:cull 1.8"
    ],
    "heapMB": 902.8,
    "freedMB": -0.9,
    "newPipelines": 0,
    "newTextures": 0,
    "newGeometries": 0,
    "newBuilds": 0,
    "sunShadow": 0,
    "newRenderObjects": 0,
    "t0": 37668.1,
    "t1": 37695.8
  },
  {
    "frame": 563,
    "ms": 29.1,
    "top": [
      "zombies 13.8",
      "r:render 8.6",
      "r:matrices 2.7",
      "r:cull 0.8"
    ],
    "heapMB": 915.3,
    "freedMB": -6.2,
    "newPipelines": 0,
    "newTextures": 0,
    "newGeometries": 0,
    "newBuilds": 0,
    "sunShadow": 0,
    "newRenderObjects": 0,
    "t0": 37847.3,
    "t1": 37877.1
  },
  {
    "frame": 727,
    "ms": 28.7,
    "top": [
      "r:render 13.9",
      "zombies 5.7",
      "r:matrices 3.5",
      "r:cull 1.4"
    ],
    "heapMB": 912.4,
    "freedMB": -1,
    "newPipelines": 0,
    "newTextures": 0,
    "newGeometries": 0,
    "newBuilds": 0,
    "sunShadow": 0,
    "newRenderObjects": 0,
    "t0": 40644,
    "t1": 40674.9
  },
  {
    "frame": 1079,
    "ms": 35.4,
    "top": [
      "r:render 17.4",
      "zombies 5.8",
      "r:matrices 4.4",
      "r:lightPool 3.0"
    ],
    "heapMB": 911.8,
    "freedMB": -1.1,
    "newPipelines": 0,
    "newTextures": 0,
    "newGeometries": 0,
    "newBuilds": 0,
    "sunShadow": 0,
    "newRenderObjects": 0,
    "t0": 46643.9,
    "t1": 46681.1
  },
  {
    "frame": 1211,
    "ms": 48.7,
    "top": [
      "r:render 40.3",
      "zombies 3.2",
      "r:matrices 1.9",
      "r:cull 0.7"
    ],
    "heapMB": 949.8,
    "freedMB": -10.3,
    "newPipelines": 0,
    "newTextures": 0,
    "newGeometries": 1,
    "newBuilds": 1,
    "sunShadow": 0,
    "newRenderObjects": 7,
    "t0": 48919.1,
    "t1": 48968.7
  },
  {
    "frame": 1251,
    "ms": 29.8,
    "top": [
      "r:render 17.3",
      "r:matrices 5.4",
      "zombies 4.2",
      "m:hold 0.7"
    ],
    "heapMB": 928.1,
    "freedMB": -1,
    "newPipelines": 0,
    "newTextures": 0,
    "newGeometries": 0,
    "newBuilds": 0,
    "sunShadow": 0,
    "newRenderObjects": 0,
    "t0": 49640.3,
    "t1": 49671.5
  }
]
```

---

### Run 2: `gc-2` (`fps: 58.9`, `low: 42.4`, `tickMs: 13.52`, `worst: 24.4`, `hitches: 0`)

#### `spikeCauses`
```json
{
  "spikes": 9,
  "pipelines": 1,
  "builds": 1,
  "uploads": 0,
  "sunShadow": 0,
  "gc": 0,
  "code": 7
}
```

#### `prof.gc` (verbatim)
```json
{
  "synced": true,
  "mainThread": "CrRendererMain",
  "events": 3521,
  "totalMs": 39.8,
  "perFrameMs": 0.02,
  "byName": {
    "V8.GC_HEAP_EXTERNAL_PROLOGUE": {
      "n": 54,
      "ms": 1.2
    },
    "V8.GC_HEAP_PROLOGUE": {
      "n": 52,
      "ms": 0.1
    },
    "V8.GC_TIME_TO_SAFEPOINT": {
      "n": 49,
      "ms": 0.1
    },
    "V8.GC_SCAVENGER": {
      "n": 54,
      "ms": 36.6
    },
    "V8.GC_HEAP_PROLOGUE_SAFEPOINT": {
      "n": 52,
      "ms": 0.1
    },
    "V8.GC_SCAVENGER_SCAVENGE": {
      "n": 54,
      "ms": 35.4
    },
    "V8.GC_SCAVENGER_SCAVENGE_WEAK_GLOBAL_HANDLES_IDENTIFY": {
      "n": 54,
      "ms": 5.8
    },
    "V8.GC_SCAVENGER_TRACED_HANDLES_COMPUTE_WEAKNESS_PARALLEL": {
      "n": 54,
      "ms": 4.6
    },
    "V8.GC_SCAVENGER_SCAVENGE_COLLECT_OLD_TO_NEW_PAGES": {
      "n": 54,
      "ms": 4.2
    },
    "V8.GC_SCAVENGER_SCAVENGE_PARALLEL_PHASE": {
      "n": 54,
      "ms": 11.8
    },
    "Parallel scavenge started": {
      "n": 50,
      "ms": 0.1
    },
    "V8.GC_SCAVENGER_SCAVENGE_ROOTS": {
      "n": 54,
      "ms": 3.5
    },
    "V8.GC_SCAVENGER_SCAVENGE_WEAK_GLOBAL_HANDLES_PROCESS": {
      "n": 54,
      "ms": 3.5
    },
    "V8.GC_SCAVENGER_TRACED_HANDLES_RESET_PARALLEL": {
      "n": 54,
      "ms": 2.6
    },
    "V8.GC_SCAVENGER_SCAVENGE_FINALIZE": {
      "n": 54,
      "ms": 2.1
    },
    "V8.GC_SCAVENGER_SCAVENGE_RESTORE_AND_QUARANTINE_PINNED": {
      "n": 54,
      "ms": 0.5
    },
    "V8.GC_SCAVENGER_FREE_REMEMBERED_SET": {
      "n": 54,
      "ms": 1.4
    },
    "V8.GC_SCAVENGER_SWEEP_ARRAY_BUFFERS": {
      "n": 54,
      "ms": 0.2
    },
    "V8.GC_SCAVENGER_RESIZE_NEW_SPACE": {
      "n": 54,
      "ms": 0.1
    },
    "V8.GC_HEAP_EPILOGUE_SAFEPOINT": {
      "n": 54,
      "ms": 0.1
    },
    "V8.GC_HEAP_EPILOGUE": {
      "n": 54,
      "ms": 0.2
    },
    "V8.GC_HEAP_DUMP_STATISTICS": {
      "n": 48,
      "ms": 0.1
    },
    "V8.GC_HEAP_EXTERNAL_EPILOGUE": {
      "n": 54,
      "ms": 0.1
    },
    "V8.GC_SCAVENGER_SCAVENGE_PARALLEL": {
      "n": 35,
      "ms": 2.3
    },
    "V8.GCDeoptMarkedAllocationSites": {
      "n": 5,
      "ms": 1.5
    }
  },
  "spikesWithGc": "0/9",
  "spikes": [
    {
      "frame": 339,
      "ms": 26.2,
      "wallMs": 27.5,
      "gcMs": 0,
      "names": {}
    },
    {
      "frame": 459,
      "ms": 26.2,
      "wallMs": 27.5,
      "gcMs": 0,
      "names": {}
    },
    {
      "frame": 782,
      "ms": 25.3,
      "wallMs": 26,
      "gcMs": 0,
      "names": {}
    },
    {
      "frame": 818,
      "ms": 26.1,
      "wallMs": 27.2,
      "gcMs": 0,
      "names": {}
    },
    {
      "frame": 998,
      "ms": 25.8,
      "wallMs": 27.2,
      "gcMs": 0,
      "names": {}
    },
    {
      "frame": 1338,
      "ms": 36.2,
      "wallMs": 36.8,
      "gcMs": 0,
      "names": {}
    },
    {
      "frame": 1357,
      "ms": 31,
      "wallMs": 32.2,
      "gcMs": 0,
      "names": {}
    },
    {
      "frame": 1395,
      "ms": 27.1,
      "wallMs": 27.8,
      "gcMs": 0,
      "names": {}
    },
    {
      "frame": 1533,
      "ms": 32.2,
      "wallMs": 33.1,
      "gcMs": 0,
      "names": {}
    }
  ]
}
```

#### `prof.spikes` (first 8 spikes verbatim)
```json
[
  {
    "frame": 339,
    "ms": 26.2,
    "top": [
      "r:render 15.2",
      "r:matrices 2.5",
      "zombies 1.8",
      "w:minimap 1.3"
    ],
    "heapMB": 879.1,
    "freedMB": -0.8,
    "newPipelines": 0,
    "newTextures": 0,
    "newGeometries": 0,
    "newBuilds": 0,
    "sunShadow": 0,
    "newRenderObjects": 0,
    "t0": 33228,
    "t1": 33255.5
  },
  {
    "frame": 459,
    "ms": 26.2,
    "top": [
      "r:render 13.7",
      "r:matrices 3.8",
      "zombies 2.0",
      "w:minimap 1.1"
    ],
    "heapMB": 882.3,
    "freedMB": -0.7,
    "newPipelines": 0,
    "newTextures": 0,
    "newGeometries": 0,
    "newBuilds": 0,
    "sunShadow": 0,
    "newRenderObjects": 0,
    "t0": 35228.1,
    "t1": 35255.6
  },
  {
    "frame": 782,
    "ms": 25.3,
    "top": [
      "r:render 14.4",
      "zombies 5.0",
      "r:matrices 1.9",
      "r:cull 0.7"
    ],
    "heapMB": 879.4,
    "freedMB": -2.6,
    "newPipelines": 1,
    "newTextures": 0,
    "newGeometries": 2,
    "newBuilds": 1,
    "sunShadow": 1,
    "newRenderObjects": 6,
    "t0": 40628,
    "t1": 40654
  },
  {
    "frame": 818,
    "ms": 26.1,
    "top": [
      "r:render 14.0",
      "r:matrices 3.8",
      "zombies 1.7",
      "r:cull 1.3"
    ],
    "heapMB": 878.9,
    "freedMB": -0.7,
    "newPipelines": 0,
    "newTextures": 0,
    "newGeometries": 0,
    "newBuilds": 0,
    "sunShadow": 0,
    "newRenderObjects": 0,
    "t0": 41228.1,
    "t1": 41255.3
  },
  {
    "frame": 998,
    "ms": 25.8,
    "top": [
      "r:render 14.5",
      "r:matrices 3.9",
      "zombies 1.6",
      "r:cull 1.5"
    ],
    "heapMB": 880.1,
    "freedMB": -0.7,
    "newPipelines": 0,
    "newTextures": 0,
    "newGeometries": 0,
    "newBuilds": 0,
    "sunShadow": 0,
    "newRenderObjects": 0,
    "t0": 44228.2,
    "t1": 44255.4
  },
  {
    "frame": 1338,
    "ms": 36.2,
    "top": [
      "r:render 27.6",
      "zombies 3.0",
      "r:matrices 1.7",
      "r:cull 0.7"
    ],
    "heapMB": 911.3,
    "freedMB": -10.1,
    "newPipelines": 0,
    "newTextures": 0,
    "newGeometries": 1,
    "newBuilds": 1,
    "sunShadow": 0,
    "newRenderObjects": 1,
    "t0": 49894.7,
    "t1": 49931.5
  },
  {
    "frame": 1357,
    "ms": 31,
    "top": [
      "r:render 14.9",
      "zombies 5.0",
      "r:matrices 4.1",
      "r:cull 1.2"
    ],
    "heapMB": 905.7,
    "freedMB": -0.9,
    "newPipelines": 0,
    "newTextures": 0,
    "newGeometries": 0,
    "newBuilds": 0,
    "sunShadow": 0,
    "newRenderObjects": 0,
    "t0": 50228,
    "t1": 50260.2
  },
  {
    "frame": 1395,
    "ms": 27.1,
    "top": [
      "zombies 14.1",
      "r:render 6.6",
      "r:matrices 2.0",
      "m:hold 1.0"
    ],
    "heapMB": 928.5,
    "freedMB": -6.3,
    "newPipelines": 0,
    "newTextures": 0,
    "newGeometries": 0,
    "newBuilds": 0,
    "sunShadow": 0,
    "newRenderObjects": 0,
    "t0": 50880.5,
    "t1": 50908.3
  }
]
```

---

## 3. `--prof --alloc` Run (`alloc-1`: `fps: 58.8`, `low: 41.6`, `tickMs: 13.07`, `worst: 24.8`, `hitches: 0`)

- **Frames:** `1810`
- **Allocation Rate:** **`769.6 kB/frame`** (`45.3 MB/s`)
- **`spikeCauses`:** `{"spikes":5,"pipelines":0,"builds":1,"uploads":0,"sunShadow":0,"gc":0,"code":4}`

### Top 15 Allocation Sites by Self (`alloc.self`, verbatim)
```json
[
  {
    "k": "updateZombies index.html:52784",
    "kb": 259.4
  },
  {
    "k": "getDynamicCacheKey three.webgpu.js:25827",
    "kb": 27
  },
  {
    "k": "get three.webgpu.js:2954",
    "kb": 25.1
  },
  {
    "k": "trace zombie-ability-collision.js:39",
    "kb": 24.1
  },
  {
    "k": "draw three.webgpu.js:69261",
    "kb": 21.2
  },
  {
    "k": "getNodeChildren three.webgpu.js:622",
    "kb": 21.2
  },
  {
    "k": "get three.webgpu.js:25966",
    "kb": 19.3
  },
  {
    "k": "propsNear index.html:50207",
    "kb": 18
  },
  {
    "k": "abs :0",
    "kb": 17.6
  },
  {
    "k": "getCacheKey$1 three.webgpu.js:592",
    "kb": 15.6
  },
  {
    "k": "update three.webgpu.js:12257",
    "kb": 12.8
  },
  {
    "k": "sampleClip clip.js:119",
    "kb": 10.9
  },
  {
    "k": "_projectObject three.webgpu.js:51838",
    "kb": 8.9
  },
  {
    "k": "next :0",
    "kb": 8.6
  },
  {
    "k": "(anonymous) objectives.js:139",
    "kb": 8.2
  }
]
```

### Top 15 Allocation Stacks (`alloc.stacks`, verbatim)
```json
[
  {
    "k": "updateZombies index.html:52784 < tick index.html:56154 < update three.webgpu.js:24889",
    "kb": 259.4
  },
  {
    "k": "getDynamicCacheKey three.webgpu.js:25827 < get three.webgpu.js:25966 < _renderObjectDirect three.webgpu.js:52172",
    "kb": 27
  },
  {
    "k": "draw three.webgpu.js:69261 < _renderObjectDirect three.webgpu.js:52172 < renderObject three.webgpu.js:52063",
    "kb": 21.2
  },
  {
    "k": "get three.webgpu.js:25966 < _renderObjectDirect three.webgpu.js:52172 < renderObject three.webgpu.js:52063",
    "kb": 19.3
  },
  {
    "k": "propsNear index.html:50207 < resolveStaticProps index.html:50240 < updateZombies index.html:52784",
    "kb": 18
  },
  {
    "k": "getNodeChildren three.webgpu.js:622 < getCacheKey$1 three.webgpu.js:592 < getCacheKey$1 three.webgpu.js:592",
    "kb": 16.9
  },
  {
    "k": "abs :0 < updateZombies index.html:52784 < tick index.html:56154",
    "kb": 16.2
  },
  {
    "k": "trace zombie-ability-collision.js:39 < lineClear zombie-ability-collision.js:140 < updateActor zombie-ability-runtime.js:157",
    "kb": 14.9
  },
  {
    "k": "get three.webgpu.js:2954 < getCacheKey$1 three.webgpu.js:592 < getCacheKey$1 three.webgpu.js:592",
    "kb": 13.7
  },
  {
    "k": "update three.webgpu.js:12257 < updateForRender three.webgpu.js:47136 < _renderObjectDirect three.webgpu.js:52172",
    "kb": 12.8
  },
  {
    "k": "sampleClip clip.js:119 < marineGait index.html:19262 < applyShamblerMotion shambler-motion.js:56",
    "kb": 10.9
  },
  {
    "k": "trace zombie-ability-collision.js:39 < updateShots zombie-ability-runtime.js:200 < update zombie-ability-runtime.js:241",
    "kb": 9.2
  },
  {
    "k": "updateTreeBatchesInner index.html:17382 < updateTreeBatches index.html:17374 < updateWorldAnimations index.html:56004",
    "kb": 7.8
  },
  {
    "k": "trackZombieMotion index.html:45005 < tick index.html:56154 < update three.webgpu.js:24889",
    "kb": 7.5
  },
  {
    "k": "getCacheKey$1 three.webgpu.js:592 < getCacheKey$1 three.webgpu.js:592 < getCacheKey three.webgpu.js:1342",
    "kb": 7
  }
]
```
