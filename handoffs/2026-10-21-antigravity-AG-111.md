# antigravity — AG-111 Night 20 after CL-236 — 2026-10-21
Changed:          Ran 3x Night-20 High `--prof` benchmarks through the game-test slot after CL-236, reading `TT.marineShadowDbg()` in the same page before and after each 30 s window, and verified the marine's dusk shadow with a stowed gun on his back, a holstered pistol on his hip, and the cigarette while smoking (`qa/2026-10-21-AG-111/`). Across all 3 Night-20 runs and the full smoking idle cycle, `TT.marineShadowDbg().builds` stayed `1` with `lastDiff: null` (zero `open-molded-holster` or `Mesh` rebuilds, zero `marine 11-14 ms` shadow-proxy spikes), improving median FPS to 59.1, median 1% low to 45.5 FPS (+4.4 FPS vs AG-110), median tick to 13.76 ms (-0.78 ms), and median hitches to 0.
Files:            qa/2026-10-21-AG-111/run-ag111.mjs, qa/2026-10-21-AG-111/ag111-summary.json, qa/2026-10-21-AG-111/run-1.json, qa/2026-10-21-AG-111/run-2.json, qa/2026-10-21-AG-111/run-3.json, qa/2026-10-21-AG-111/01-dusk-shadow-stowed-gun-holstered-pistol.png, qa/2026-10-21-AG-111/02-dusk-shadow-smoking-pack.png, qa/2026-10-21-AG-111/03-dusk-shadow-smoking-cig.png
Tests:            not run (QA benchmark and visual inspection only; no game code modified)
Screenshots:      qa/2026-10-21-AG-111/01-dusk-shadow-stowed-gun-holstered-pistol.png, qa/2026-10-21-AG-111/02-dusk-shadow-smoking-pack.png, qa/2026-10-21-AG-111/03-dusk-shadow-smoking-cig.png
Not verified:     Nothing — all 3 Night-20 High `--prof` runs, `TT.marineShadowDbg()`, and the dusk shadow checks for stowed guns, holstered pistol, and smoking cigarette were verified on the RTX 5080 through the game-test slot (Rule 16).
Requests:         FYI sent to claude with AG-111 benchmark numbers, `TT.marineShadowDbg()`, verbatim `prof.builds` and `prof.spikes`, and dusk shadow results.
Contract changes: none

---

## 1. Summary Table — Night 20 High `--prof` (30 s window, 48 zombies)

All runs executed sequentially one instance at a time through `node crew/crew.mjs slot run antigravity AG-111` (Rule 16).

| Run | FPS | 1% Low | Worst (ms) | Hitches (>33 ms) | `tickMs` | `r:render` avg / max | `m:hold` avg / max | `m:pose` avg / max | `m:idle` avg / max | `spikeCauses` | `prof.builds.made` | `TT.marineShadowDbg()` after run |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | --- |
| **run-1** | **57.4** | **36.6** | 36.0 | 1 | **13.88** | 6.37 / 27.7 | 0.47 / 1.9 | 0.46 / 1.4 | 0.21 / 2.5 | `spikes:9, pipelines:0, builds:1, uploads:0, gc:1, code:7` | **3** (`marine-shadow`:1, `feral-motion-echo`:1, `zombie-skin`:1) | `builds: 1, lastDiff: null, ms: 12.40, bones: 68, verts: 66870` |
| **run-2** | **59.1** | **47.7** | 23.8 | 0 | **13.76** | 5.99 / 26.3 | 0.52 / 2.5 | 0.50 / 4.0 | 0.21 / 3.8 | `spikes:5, pipelines:0, builds:1, uploads:0, gc:0, code:4` | **3** (`marine-shadow`:1, `feral-motion-echo`:1, `zombie-skin`:1) | `builds: 1, lastDiff: null, ms: 11.40, bones: 68, verts: 66870` |
| **run-3** | **59.4** | **45.5** | 22.9 | 0 | **13.37** | 5.86 / 25.1 | 0.48 / 1.5 | 0.47 / 17.1 | 0.20 / 1.6 | `spikes:6, pipelines:0, builds:1, uploads:0, gc:1, code:4` | **2** (`feral-motion-echo`:1, `zombie-skin`:1) | `builds: 1, lastDiff: null, ms: 9.60, bones: 68, verts: 66870` |
| **AG-111 Median** | **59.1** | **45.5** | **23.8** | **0** | **13.76** | **5.99 / 26.3** | **0.48 / 1.9** | **0.47 / 4.0** | **0.21 / 2.5** | `spikes:6, pipelines:0, builds:1, uploads:0, gc:1, code:4` | **3** | **`builds: 1, lastDiff: null`** |
| *AG-110 Median (CL-234)* | *58.0* | *41.1* | *30.1* | *1* | *14.54* | *6.48 / 27.6* | *—* | *—* | *—* | *spikes:10, pipelines:0, builds:2, uploads:0, gc:1, code:7* | *5* | *`builds: 4, lastDiff: "+ open-molded-holster x4, + Mesh x36"`* |

### Progression Across Recent Night-20 High `--prof` Benchmarks

| Task | Change | Median FPS | Median 1% Low | Median Worst | Median Hitches | Median `tickMs` | `marineShadowDbg().builds` |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| **AG-107** | CL-227 (`getRenderCacheKey` diagnostic) | 56.1 | 19.7 | 99.6 ms | 5 | 14.55 ms | — |
| **AG-108** | CL-229 (deterministic WGSL node buffer names) | 58.6 | 32.7 | 49.0 ms | 2 | 13.78 ms | — |
| **AG-109** | CL-232 (effect-light pool pre-warm) | 58.3 | 39.7 | 31.8 ms | 0 | 14.37 ms | — |
| **AG-110** | CL-234 (initial carry/idle `proxySkip`) | 58.0 | 41.1 | 30.1 ms | 1 | 14.54 ms | 4 |
| **AG-111** | **CL-236 (carry/holster `proxySkip` + `castShadow`)** | **59.1** | **45.5** | **23.8 ms** | **0** | **13.76 ms** | **1** |

---

## 2. Verbatim `TT.marineShadowDbg()`, `prof.builds`, and `prof.spikes` per Run

### Run 1 (`fps: 57.4`, `low: 36.6`, `tickMs: 13.88`, `spikeCauses: {"spikes":9,"pipelines":0,"builds":1,"uploads":0,"gc":1,"code":7}`)

#### `TT.marineShadowDbg()`
```json
{
  "before": { "builds": 1, "lastDiff": null, "ms": 12.399999998509884, "bones": 68, "verts": 66870 },
  "after":  { "builds": 1, "lastDiff": null, "ms": 12.399999998509884, "bones": 68, "verts": 66870 }
}
```

#### `prof.builds`
```json
{
  "made": 3,
  "top": [
    {
      "k": "marine-shadow < Group < Group < Group | SkinnedMesh | MeshBasicMaterial",
      "n": 1,
      "frames": [
        26
      ]
    },
    {
      "k": "feral-motion-echo < Scene | SkinnedMesh | MeshBasicMaterial",
      "n": 1,
      "frames": [
        524
      ]
    },
    {
      "k": "zombie-skin < Group < Scene | SkinnedMesh | MeshStandardNodeMaterial",
      "n": 1,
      "frames": [
        1221
      ]
    }
  ]
}
```

#### `prof.spikes` (all 8 recorded spikes verbatim)
```json
[
  {
    "frame": 88,
    "ms": 25.8,
    "top": [
      "r:render 14.7",
      "r:matrices 3.3",
      "zombies 2.0",
      "r:cull 0.9"
    ],
    "heapMB": 927.4,
    "freedMB": -0.8,
    "newPipelines": 0,
    "newTextures": 0,
    "newGeometries": 0,
    "newBuilds": 0
  },
  {
    "frame": 1160,
    "ms": 31.4,
    "top": [
      "r:render 16.2",
      "zombies 6.1",
      "r:matrices 3.8",
      "r:cull 1.3"
    ],
    "heapMB": 839.7,
    "freedMB": -1,
    "newPipelines": 0,
    "newTextures": 0,
    "newGeometries": 0,
    "newBuilds": 0
  },
  {
    "frame": 1217,
    "ms": 31.1,
    "top": [
      "r:render 15.3",
      "zombies 8.2",
      "r:matrices 3.3",
      "r:cull 0.9"
    ],
    "heapMB": 839.7,
    "freedMB": -0.9,
    "newPipelines": 0,
    "newTextures": 0,
    "newGeometries": 0,
    "newBuilds": 0
  },
  {
    "frame": 1221,
    "ms": 34.5,
    "top": [
      "r:render 27.7",
      "zombies 3.0",
      "r:matrices 1.3",
      "m:pose 0.4"
    ],
    "heapMB": 852.9,
    "freedMB": -9.9,
    "newPipelines": 0,
    "newTextures": 0,
    "newGeometries": 0,
    "newBuilds": 1
  },
  {
    "frame": 1332,
    "ms": 38.3,
    "top": [
      "r:render 18.3",
      "zombies 10.0",
      "r:matrices 4.9",
      "m:idle 1.0"
    ],
    "heapMB": 874.9,
    "freedMB": -1,
    "newPipelines": 0,
    "newTextures": 0,
    "newGeometries": 0,
    "newBuilds": 0
  },
  {
    "frame": 1333,
    "ms": 26.9,
    "top": [
      "r:render 11.7",
      "zombies 6.4",
      "r:matrices 3.2",
      "w:minimap 1.2"
    ],
    "heapMB": 876,
    "freedMB": -1.2,
    "newPipelines": 0,
    "newTextures": 0,
    "newGeometries": 0,
    "newBuilds": 0
  },
  {
    "frame": 1500,
    "ms": 29.8,
    "top": [
      "r:render 16.2",
      "zombies 6.4",
      "r:matrices 2.9",
      "r:cull 0.8"
    ],
    "heapMB": 859.6,
    "freedMB": -0.8,
    "newPipelines": 0,
    "newTextures": 0,
    "newGeometries": 0,
    "newBuilds": 0
  },
  {
    "frame": 1678,
    "ms": 33.9,
    "top": [
      "r:render 16.9",
      "zombies 8.4",
      "r:matrices 3.8",
      "r:cull 0.8"
    ],
    "heapMB": 862.2,
    "freedMB": -0.9,
    "newPipelines": 0,
    "newTextures": 0,
    "newGeometries": 0,
    "newBuilds": 0
  }
]
```

---

### Run 2 (`fps: 59.1`, `low: 47.7`, `tickMs: 13.76`, `spikeCauses: {"spikes":5,"pipelines":0,"builds":1,"uploads":0,"gc":0,"code":4}`)

#### `TT.marineShadowDbg()`
```json
{
  "before": { "builds": 1, "lastDiff": null, "ms": 11.399999998509884, "bones": 68, "verts": 66870 },
  "after":  { "builds": 1, "lastDiff": null, "ms": 11.399999998509884, "bones": 68, "verts": 66870 }
}
```

#### `prof.builds`
```json
{
  "made": 3,
  "top": [
    {
      "k": "marine-shadow < Group < Group < Group | SkinnedMesh | MeshBasicMaterial",
      "n": 1,
      "frames": [
        33
      ]
    },
    {
      "k": "feral-motion-echo < Scene | SkinnedMesh | MeshBasicMaterial",
      "n": 1,
      "frames": [
        589
      ]
    },
    {
      "k": "zombie-skin < Group < Scene | SkinnedMesh | MeshStandardNodeMaterial",
      "n": 1,
      "frames": [
        1085
      ]
    }
  ]
}
```

#### `prof.spikes` (all 5 recorded spikes verbatim — only 5 spikes >25 ms occurred in Run 2)
```json
[
  {
    "frame": 900,
    "ms": 33.3,
    "top": [
      "r:render 17.9",
      "r:matrices 6.1",
      "zombies 4.2",
      "r:cull 1.7"
    ],
    "heapMB": 915.7,
    "freedMB": -0.7,
    "newPipelines": 0,
    "newTextures": 0,
    "newGeometries": 0,
    "newBuilds": 0
  },
  {
    "frame": 1079,
    "ms": 30.4,
    "top": [
      "r:render 12.1",
      "zombies 6.1",
      "r:matrices 4.5",
      "m:hold 1.8"
    ],
    "heapMB": 930.4,
    "freedMB": -0.7,
    "newPipelines": 0,
    "newTextures": 0,
    "newGeometries": 0,
    "newBuilds": 0
  },
  {
    "frame": 1085,
    "ms": 34.1,
    "top": [
      "r:render 26.3",
      "zombies 2.8",
      "r:matrices 1.6",
      "m:hold 0.5"
    ],
    "heapMB": 916,
    "freedMB": -9.8,
    "newPipelines": 0,
    "newTextures": 0,
    "newGeometries": 0,
    "newBuilds": 1
  },
  {
    "frame": 1781,
    "ms": 35.8,
    "top": [
      "r:render 21.1",
      "r:matrices 5.2",
      "zombies 4.9",
      "m:idle 0.8"
    ],
    "heapMB": 957.8,
    "freedMB": -1.1,
    "newPipelines": 0,
    "newTextures": 0,
    "newGeometries": 0,
    "newBuilds": 0
  },
  {
    "frame": 1782,
    "ms": 33.4,
    "top": [
      "zombies 9.2",
      "r:render 8.5",
      "m:idle 3.8",
      "r:matrices 3.1"
    ],
    "heapMB": 959,
    "freedMB": -1.1,
    "newPipelines": 0,
    "newTextures": 0,
    "newGeometries": 0,
    "newBuilds": 0
  }
]
```

---

### Run 3 (`fps: 59.4`, `low: 45.5`, `tickMs: 13.37`, `spikeCauses: {"spikes":6,"pipelines":0,"builds":1,"uploads":0,"gc":1,"code":4}`)

#### `TT.marineShadowDbg()`
```json
{
  "before": { "builds": 1, "lastDiff": null, "ms": 9.600000001490116, "bones": 68, "verts": 66870 },
  "after":  { "builds": 1, "lastDiff": null, "ms": 9.600000001490116, "bones": 68, "verts": 66870 }
}
```

#### `prof.builds`
```json
{
  "made": 2,
  "top": [
    {
      "k": "feral-motion-echo < Scene | SkinnedMesh | MeshBasicMaterial",
      "n": 1,
      "frames": [
        433
      ]
    },
    {
      "k": "zombie-skin < Group < Scene | SkinnedMesh | MeshStandardNodeMaterial",
      "n": 1,
      "frames": [
        1371
      ]
    }
  ]
}
```

#### `prof.spikes` (all 6 recorded spikes verbatim — only 6 spikes >25 ms occurred in Run 3)
```json
[
  {
    "frame": 744,
    "ms": 34.6,
    "top": [
      "m:pose 17.1",
      "r:render 8.0",
      "zombies 4.4",
      "r:matrices 2.0"
    ],
    "heapMB": 871,
    "freedMB": 31,
    "newPipelines": 0,
    "newTextures": 0,
    "newGeometries": 0,
    "newBuilds": 0
  },
  {
    "frame": 925,
    "ms": 27.1,
    "top": [
      "r:render 15.0",
      "r:matrices 3.8",
      "zombies 3.3",
      "r:cull 0.9"
    ],
    "heapMB": 832.8,
    "freedMB": -0.7,
    "newPipelines": 0,
    "newTextures": 0,
    "newGeometries": 0,
    "newBuilds": 0
  },
  {
    "frame": 1105,
    "ms": 28.8,
    "top": [
      "r:render 15.8",
      "r:matrices 4.8",
      "zombies 2.8",
      "r:cull 1.3"
    ],
    "heapMB": 837.6,
    "freedMB": -0.7,
    "newPipelines": 0,
    "newTextures": 0,
    "newGeometries": 0,
    "newBuilds": 0
  },
  {
    "frame": 1371,
    "ms": 31.5,
    "top": [
      "r:render 25.1",
      "zombies 2.2",
      "r:matrices 1.4",
      "m:idle 0.7"
    ],
    "heapMB": 842.9,
    "freedMB": -9.9,
    "newPipelines": 0,
    "newTextures": 0,
    "newGeometries": 0,
    "newBuilds": 1
  },
  {
    "frame": 1645,
    "ms": 35.9,
    "top": [
      "r:render 17.6",
      "zombies 8.3",
      "r:matrices 4.6",
      "m:idle 1.1"
    ],
    "heapMB": 859,
    "freedMB": -0.9,
    "newPipelines": 0,
    "newTextures": 0,
    "newGeometries": 0,
    "newBuilds": 0
  },
  {
    "frame": 1817,
    "ms": 32.9,
    "top": [
      "r:render 12.9",
      "zombies 8.0",
      "r:matrices 4.7",
      "m:idle 1.6"
    ],
    "heapMB": 877.3,
    "freedMB": -1,
    "newPipelines": 0,
    "newTextures": 0,
    "newGeometries": 0,
    "newBuilds": 0
  }
]
```

---

## 3. Dusk Shadow Look (`worldTime = 0.68`, High Preset)

Verified both visually (`01-dusk-shadow-stowed-gun-holstered-pistol.png`, `02-dusk-shadow-smoking-pack.png`, `03-dusk-shadow-smoking-cig.png`) and via scene-graph inspection in `qa/2026-10-21-AG-111/ag111-summary.json`:

1. **Stowed gun on his back (`slung`) and holstered pistol (`hip` + `holstered`):**
   - With `grantAllWeapons()` and `'m4'` equipped (`01-dusk-shadow-stowed-gun-holstered-pistol.png`), the marine carries `slung: ["minigun", null]`, `holstered: ["uzi", "revolver"]`, and `hip: "pistol"`.
   - Every carry copy has `userData.proxySkip === true` and `castShadow === true` on its visible opaque meshes (`pistol`: 9 casters, `minigun`: 12 casters, `uzi`: 11 casters, `revolver`: 3 casters).
   - Comparing `AG-110/01-dusk-shadow-stowed-gun.png` against `AG-111/01-dusk-shadow-stowed-gun-holstered-pistol.png` and `02-dusk-shadow-smoking-pack.png`, the slung minigun barrel and slung M4 barrel now clearly project their silhouettes onto the ground on either side of the marine's torso shadow, while `TT.marineShadowDbg()` stays at `builds: 1, lastDiff: null`.
2. **Smoking idle (`'pack'` and `'smoking'` phases):**
   - Stepping `marineIdle` into `'pack'` (`02-dusk-shadow-smoking-pack.png`) stows the active rifle on his back (`slung: ["minigun", "m4"]`, `hip: "pistol"`) and brings out the cigarette pack, lighter, and unlit cigarette (`idleProxySkip: true`, `idleCasters: 6`).
   - Stepping `marineIdle` into `'smoking'` (`03-dusk-shadow-smoking-cig.png`, `lit: true`) shows the lit cigarette in his right hand with rising smoke and `cigVisible: true, cigCastShadow: true, cigCasterMeshes: 2` (paper + filter casting shadows; ember excluded).
   - Throughout the entire weapon stow/unstow and smoking cycle, `TT.marineShadowDbg()` remained `{ builds: 1, lastDiff: null, bones: 99, verts: 90762 }`.
