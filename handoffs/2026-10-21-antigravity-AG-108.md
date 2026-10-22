# antigravity — AG-108 Night 20 after CL-229, after AG-107 — 2026-10-21
Changed:          Ran 3x Night-20 High `--prof` benchmarks after CL-229 (`getUniformBufferName` ordinal wrapper) and captured 7 real-GPU High-graphics visual verification screenshots across marine, trees, builds, all zombie types, Demon fire fists, Screamer vapour/shield, and bosses. Confirmed `zombie-skin` GPU pipeline compiles dropped from 20–22 (AG-107) to 0 (`pipelines.made: 2, 3, 2` total across the 3 runs), while identifying why CPU `WGSLNodeBuilder.build()` (`r:render 25-35 ms`, `freedMB: -9.7 MB`) still runs once per newly created zombie material (`skinZombieMesh` assigns a fresh `mat.emissiveNode` with unique `node.id` per zombie, missing `R._nodes.nodeBuilderCache`).
Files:            qa/2026-10-21-AG-108/run-ag108.mjs, qa/2026-10-21-AG-108/ag108-summary.json, qa/2026-10-21-AG-108/run-1.log, qa/2026-10-21-AG-108/run-2.log, qa/2026-10-21-AG-108/run-3.log, qa/2026-10-21-AG-108/01-marine-walls-turrets-trees.png, qa/2026-10-21-AG-108/01b-trees-batch.png, qa/2026-10-21-AG-108/02-zombies-walking.png, qa/2026-10-21-AG-108/03-demon-fire-fists.png, qa/2026-10-21-AG-108/04-screamer-vapour-shield.png, qa/2026-10-21-AG-108/05-bosses-colossus-guardian.png, qa/2026-10-21-AG-108/06-night20-high-horde.png
Tests:            3x `node tools/bench.mjs --night 20 --gfx high --prof` + High-graphics visual check pass via `node crew/crew.mjs slot run antigravity AG-108` (Rule 16: one game test at a time through the shared queue)
Screenshots:      qa/2026-10-21-AG-108/01-marine-walls-turrets-trees.png, qa/2026-10-21-AG-108/01b-trees-batch.png, qa/2026-10-21-AG-108/02-zombies-walking.png, qa/2026-10-21-AG-108/03-demon-fire-fists.png, qa/2026-10-21-AG-108/04-screamer-vapour-shield.png, qa/2026-10-21-AG-108/05-bosses-colossus-guardian.png, qa/2026-10-21-AG-108/06-night20-high-horde.png
Not verified:     Full `npm test` suite not run (integration job owned by Cursor/Claude per Rule 16).
Requests:         FYI sent to `claude` with AG-108 Night-20 High `--prof` numbers, visual check confirmation, and the `R._nodes.nodeBuilderCache` / `mat.emissiveNode` finding.
Contract changes: none

---

## 1. Night 20 High (`--prof`) — 3-Run Summary (After CL-229 vs AG-107 / AG-106)

All runs executed sequentially through `node crew/crew.mjs slot run antigravity AG-108` on Jerry's RTX 5080 (WebGPU, 1280×720, `--night 20 --gfx high --prof`):

| Run | FPS | 1% Low | Worst (ms) | Hitches | Frame (ms) | Tick (ms) | Outside (ms) | GPU (ms) | Draws | Tris | `pipelines.made` | `withNewShaders` | `spikeCauses` |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| **AG-106 (baseline)** | 56.2 | 33.4 | 31.0 | 0 | 17.78 | 13.73 | 4.05 | 0.25 | 256 | 714k | 46 | 41 | `{spikes:25, pipelines:20, uploads:2, gc:1, code:2}` |
| **AG-107 (after CL-227)** | 57.2 | 36.5 | 26.8 | 1 | 17.48 | 13.24 | 3.76 | 0.28 | 268 | 744k | 24 | 24 | `{spikes:21, pipelines:20, uploads:0, gc:0, code:1}` |
| **AG-108 Run 1** | 53.4 | 28.2 | 39.5 | 2 | 18.73 | 14.94 | 3.79 | 0.31 | 275 | 755k | **2** | **2** | `{spikes:29, pipelines:0, uploads:1, gc:9, code:19}` |
| **AG-108 Run 2** | 57.3 | 34.8 | 44.4 | 2 | 17.45 | 14.03 | 3.42 | 0.30 | 247 | 684k | **3** | **3** | `{spikes:25, pipelines:0, uploads:6, gc:2, code:17}` |
| **AG-108 Run 3** | 56.8 | 26.2 | 22.1 | 1 | 17.61 | 14.90 | 2.70 | 0.25 | 259 | 736k | **2** | **2** | `{spikes:27, pipelines:0, uploads:3, gc:6, code:18}` |
| **AG-108 Median** | **56.8** | **28.2** | **39.5** | **2** | **17.61** | **14.90** | **3.42** | **0.30** | **259** | **736k** | **2** | **2** | `pipelines: 0` across all 3 runs |
| **AG-108 Best (Run 2)** | **57.3** | **34.8** | **44.4** | **2** | **17.45** | **14.03** | **3.42** | **0.30** | **247** | **684k** | **3** | **3** | `{spikes:25, pipelines:0, uploads:6, gc:2, code:17}` |

### Key Takeaways & Root Cause of Remaining `code` Spikes
1. **`zombie-skin` GPU pipeline creation is now 0:**
   - `CL-229` (`WGSLNodeBuilder.prototype.getUniformBufferName` ordinal `dwBuf0, dwBuf1, ...` wrapper) reduced `zombie-skin` pipeline compilations in `R._pipelines` from **20–22** (`AG-107`) to **0** in all three runs!
   - Total `pipelines.made` during Night 20 push 6/6 is now just **2–3** (`marine-shadow` `n=1..2` and `feral-motion-echo` `n=1`), and `spikeCauses.pipelines` is **0** in all 3 runs.
2. **Why `spikeCauses.code` (`17..19`) and `r:render 25–35 ms` / `freedMB: -9.7 MB` still occur on each new zombie body:**
   - Look at the `spikes` array in all 3 runs: ~18 frames still show `r:render 25–35 ms` and `freedMB: -9.7..-10.1 MB` with `newPipelines: 0` (the exact same CPU time and JS heap allocation signature as the old `newPipelines: 1` spikes in `AG-107`).
   - **Why:** In Three.js WebGPU (`Nodes.getForRender(renderObject)`), before `PipelineManager` checks `programs.vertex.get(stageVertex.code)`, `Nodes.getForRender` checks `this.nodeBuilderCache.get(nodeBuilderCacheKey)`.
   - `getCacheKeyForRender(renderObject)` hashes `[sceneData.customCacheKey, lightsNode.getCacheKey(), renderObject.getMaterialCacheKey()]`, and `Material.customProgramCacheKey()` hashes every node reference on the material (`getNodeList(material)` -> `node.id`).
   - Because `skinZombieMesh()` (`index.html`) assigns a fresh per-zombie `mat.emissiveNode = TSL.attribute('aEmissive', 'vec3').mul(TSL.reference('_emissiveIntensity', 'float', mat))` to each zombie's cloned `MeshStandardNodeMaterial`, every newly created zombie body has a unique `emissiveNode.id` -> unique `renderObject.getMaterialCacheKey()` -> **misses `R._nodes.nodeBuilderCache`**!
   - When `nodeBuilderCache` misses, Three.js runs `new WGSLNodeBuilder(object, renderer).build()` on the CPU (~25–35 ms in `r:render` and ~9.7 MB of temporary AST/TSL node allocations), and only *at the end* of `WGSLNodeBuilder.build()` does the resulting WGSL string (`dwBuf0`) hit `R._pipelines.programs.vertex` (so `newPipelines` is `0`, saving the Dawn GPU pipeline creation, while the ~28 ms JS `WGSLNodeBuilder.build()` + 9.7 MB allocation still happens!).
   - **How to eliminate the CPU `WGSLNodeBuilder.build()` spike too:** Either share a single static `emissiveNode` (or share the `MeshStandardNodeMaterial` across zombies of the same glow state / drive `_emissiveIntensity` via an object/bone/instance uniform or vertex attribute without `TSL.reference(..., mat)` creating a per-material node), or warm/share `nodeBuilderState` in `R._nodes.nodeBuilderCache`.

---

## 2. Verbatim `prof.pipelines` & `prof.spikes`

### Run 1 (`qa/2026-10-21-AG-108/run-1.log`)
```json
{
  "fps": 53.4,
  "low": 28.2,
  "worst": 39.5,
  "hitches": 2,
  "draws": 275,
  "triangles": 754777,
  "frameMs": 18.73,
  "tickMs": 14.94,
  "outsideMs": 3.79,
  "gpuMs": 0.31,
  "spikeCauses": { "spikes": 29, "pipelines": 0, "uploads": 1, "gc": 9, "code": 19 },
  "pipelines": {
    "made": 2,
    "released": 0,
    "withNewShaders": 2,
    "top": [
      {
        "k": "marine-shadow < Group < Group < Group | NodeMaterial:ShadowMaterial | opaque side0 zw | OrthographicCamera",
        "n": 1,
        "newShaders": 1,
        "frames": [28]
      },
      {
        "k": "feral-motion-echo < Scene | MeshBasicMaterial | transparent side0 no-zw | scene",
        "n": 1,
        "newShaders": 1,
        "frames": [486]
      }
    ],
    "first": [
      {
        "frame": 28,
        "obj": "marine-shadow < Group < Group < Group",
        "kind": "SkinnedMesh",
        "mat": "NodeMaterial:ShadowMaterial",
        "state": "opaque side0 zw",
        "cam": "OrthographicCamera",
        "newShaders": "v"
      },
      {
        "frame": 486,
        "obj": "feral-motion-echo < Scene",
        "kind": "SkinnedMesh",
        "mat": "MeshBasicMaterial",
        "state": "transparent side0 no-zw",
        "cam": "scene",
        "newShaders": "vf"
      }
    ]
  },
  "spikes": [
    { "frame": 48, "ms": 35.2, "top": ["r:render 28.1", "zombies 2.0", "r:matrices 1.5", "m:hold 0.7"], "heapMB": 839.2, "freedMB": -9.8, "newPipelines": 0, "newTextures": 0, "newGeometries": 0 },
    { "frame": 226, "ms": 35.5, "top": ["r:render 28.3", "zombies 2.3", "r:matrices 1.3", "m:hold 0.7"], "heapMB": 851.3, "freedMB": -9.8, "newPipelines": 0, "newTextures": 0, "newGeometries": 0 },
    { "frame": 248, "ms": 40.5, "top": ["r:render 33.7", "zombies 2.0", "r:matrices 1.5", "m:hold 0.7"], "heapMB": 849.2, "freedMB": -10, "newPipelines": 0, "newTextures": 0, "newGeometries": 1 },
    { "frame": 309, "ms": 33.4, "top": ["r:render 26.6", "zombies 2.2", "r:matrices 1.2", "m:hold 0.8"], "heapMB": 851.2, "freedMB": -9.7, "newPipelines": 0, "newTextures": 0, "newGeometries": 0 },
    { "frame": 406, "ms": 33.4, "top": ["r:render 25.5", "zombies 2.8", "r:matrices 1.5", "m:hold 0.7"], "heapMB": 852.8, "freedMB": -9.7, "newPipelines": 0, "newTextures": 0, "newGeometries": 0 },
    { "frame": 514, "ms": 46.4, "top": ["r:render 39.9", "zombies 2.6", "r:matrices 1.5", "m:hold 0.6"], "heapMB": 834.4, "freedMB": 22.3, "newPipelines": 0, "newTextures": 0, "newGeometries": 0 },
    { "frame": 571, "ms": 38.3, "top": ["r:render 29.0", "zombies 4.1", "r:matrices 1.4", "m:hold 1.2"], "heapMB": 859.5, "freedMB": -9.9, "newPipelines": 0, "newTextures": 0, "newGeometries": 0 },
    { "frame": 604, "ms": 32.4, "top": ["r:render 24.2", "zombies 4.1", "r:matrices 1.2", "m:hold 0.8"], "heapMB": 866.7, "freedMB": -9.7, "newPipelines": 0, "newTextures": 0, "newGeometries": 0 }
  ]
}
```

### Run 2 (`qa/2026-10-21-AG-108/run-2.log`)
```json
{
  "fps": 57.3,
  "low": 34.8,
  "worst": 44.4,
  "hitches": 2,
  "draws": 247,
  "triangles": 683828,
  "frameMs": 17.45,
  "tickMs": 14.03,
  "outsideMs": 3.42,
  "gpuMs": 0.3,
  "spikeCauses": { "spikes": 25, "pipelines": 0, "uploads": 6, "gc": 2, "code": 17 },
  "pipelines": {
    "made": 3,
    "released": 0,
    "withNewShaders": 3,
    "top": [
      {
        "k": "marine-shadow < Group < Group < Group | NodeMaterial:ShadowMaterial | opaque side0 zw | OrthographicCamera",
        "n": 2,
        "newShaders": 2,
        "frames": [29, 1679]
      },
      {
        "k": "feral-motion-echo < Scene | MeshBasicMaterial | transparent side0 no-zw | scene",
        "n": 1,
        "newShaders": 1,
        "frames": [605]
      }
    ],
    "first": [
      {
        "frame": 29,
        "obj": "marine-shadow < Group < Group < Group",
        "kind": "SkinnedMesh",
        "mat": "NodeMaterial:ShadowMaterial",
        "state": "opaque side0 zw",
        "cam": "OrthographicCamera",
        "newShaders": "v"
      },
      {
        "frame": 605,
        "obj": "feral-motion-echo < Scene",
        "kind": "SkinnedMesh",
        "mat": "MeshBasicMaterial",
        "state": "transparent side0 no-zw",
        "cam": "scene",
        "newShaders": "vf"
      },
      {
        "frame": 1679,
        "obj": "marine-shadow < Group < Group < Group",
        "kind": "SkinnedMesh",
        "mat": "NodeMaterial:ShadowMaterial",
        "state": "opaque side0 zw",
        "cam": "OrthographicCamera",
        "newShaders": "v"
      }
    ]
  },
  "spikes": [
    { "frame": 45, "ms": 43.1, "top": ["r:render 35.1", "zombies 2.2", "r:matrices 1.6", "m:hold 0.9"], "heapMB": 911.6, "freedMB": -10.1, "newPipelines": 0, "newTextures": 0, "newGeometries": 1 },
    { "frame": 158, "ms": 32.8, "top": ["r:render 25.8", "zombies 2.0", "r:matrices 1.5", "m:hold 0.8"], "heapMB": 916.8, "freedMB": -9.7, "newPipelines": 0, "newTextures": 0, "newGeometries": 0 },
    { "frame": 215, "ms": 31.7, "top": ["r:render 25.2", "zombies 1.6", "r:matrices 1.1", "m:hold 0.7"], "heapMB": 911.7, "freedMB": -9.7, "newPipelines": 0, "newTextures": 0, "newGeometries": 0 },
    { "frame": 256, "ms": 31.9, "top": ["r:render 26.0", "zombies 1.9", "r:matrices 1.2", "m:hold 0.6"], "heapMB": 899.4, "freedMB": -9.8, "newPipelines": 0, "newTextures": 0, "newGeometries": 0 },
    { "frame": 360, "ms": 34.7, "top": ["r:render 27.3", "zombies 2.3", "r:matrices 1.4", "m:hold 0.9"], "heapMB": 903.9, "freedMB": -9.7, "newPipelines": 0, "newTextures": 0, "newGeometries": 0 },
    { "frame": 458, "ms": 29.3, "top": ["r:render 22.9", "zombies 2.1", "r:matrices 1.1", "m:hold 0.8"], "heapMB": 904.5, "freedMB": -9.9, "newPipelines": 0, "newTextures": 0, "newGeometries": 1 },
    { "frame": 726, "ms": 38.4, "top": ["r:render 31.9", "zombies 2.0", "r:matrices 1.3", "m:hold 0.6"], "heapMB": 924.6, "freedMB": -9.8, "newPipelines": 0, "newTextures": 0, "newGeometries": 0 },
    { "frame": 1188, "ms": 32.5, "top": ["r:render 25.1", "zombies 3.0", "r:matrices 1.5", "m:hold 0.6"], "heapMB": 934.7, "freedMB": -9.7, "newPipelines": 0, "newTextures": 0, "newGeometries": 0 }
  ]
}
```

### Run 3 (`qa/2026-10-21-AG-108/run-3.log`)
```json
{
  "fps": 56.8,
  "low": 26.2,
  "worst": 22.1,
  "hitches": 1,
  "draws": 259,
  "triangles": 735797,
  "frameMs": 17.61,
  "tickMs": 14.9,
  "outsideMs": 2.7,
  "gpuMs": 0.25,
  "spikeCauses": { "spikes": 27, "pipelines": 0, "uploads": 3, "gc": 6, "code": 18 },
  "pipelines": {
    "made": 2,
    "released": 0,
    "withNewShaders": 2,
    "top": [
      {
        "k": "marine-shadow < Group < Group < Group | NodeMaterial:ShadowMaterial | opaque side0 zw | OrthographicCamera",
        "n": 1,
        "newShaders": 1,
        "frames": [23]
      },
      {
        "k": "feral-motion-echo < Scene | MeshBasicMaterial | transparent side0 no-zw | scene",
        "n": 1,
        "newShaders": 1,
        "frames": [552]
      }
    ],
    "first": [
      {
        "frame": 23,
        "obj": "marine-shadow < Group < Group < Group",
        "kind": "SkinnedMesh",
        "mat": "NodeMaterial:ShadowMaterial",
        "state": "opaque side0 zw",
        "cam": "OrthographicCamera",
        "newShaders": "v"
      },
      {
        "frame": 552,
        "obj": "feral-motion-echo < Scene",
        "kind": "SkinnedMesh",
        "mat": "MeshBasicMaterial",
        "state": "transparent side0 no-zw",
        "cam": "scene",
        "newShaders": "vf"
      }
    ]
  },
  "spikes": [
    { "frame": 68, "ms": 35.1, "top": ["r:render 29.5", "zombies 1.0", "r:matrices 1.0", "m:hold 0.9"], "heapMB": 898.1, "freedMB": -9.5, "newPipelines": 0, "newTextures": 0, "newGeometries": 0 },
    { "frame": 196, "ms": 31.9, "top": ["r:render 26.0", "r:matrices 1.4", "zombies 1.3", "r:cull 0.6"], "heapMB": 918.5, "freedMB": -9.7, "newPipelines": 0, "newTextures": 0, "newGeometries": 0 },
    { "frame": 239, "ms": 45.1, "top": ["r:render 35.4", "zombies 4.4", "r:matrices 1.5", "m:hold 0.7"], "heapMB": 897.4, "freedMB": -9.7, "newPipelines": 0, "newTextures": 0, "newGeometries": 0 },
    { "frame": 372, "ms": 40.7, "top": ["r:render 35.6", "r:matrices 1.2", "zombies 1.2", "m:hold 0.7"], "heapMB": 922.9, "freedMB": -9.7, "newPipelines": 0, "newTextures": 0, "newGeometries": 0 },
    { "frame": 383, "ms": 44.8, "top": ["r:render 36.8", "zombies 2.6", "r:matrices 1.6", "m:hold 1.1"], "heapMB": 907.7, "freedMB": -9.8, "newPipelines": 0, "newTextures": 0, "newGeometries": 0 },
    { "frame": 506, "ms": 30.0, "top": ["r:render 23.8", "zombies 1.6", "r:matrices 1.4", "m:pose 0.5"], "heapMB": 904.0, "freedMB": -10.1, "newPipelines": 0, "newTextures": 0, "newGeometries": 1 },
    { "frame": 584, "ms": 47.5, "top": ["r:render 40.3", "zombies 2.3", "r:matrices 1.9", "m:hold 0.6"], "heapMB": 921.1, "freedMB": -9.9, "newPipelines": 0, "newTextures": 0, "newGeometries": 1 },
    { "frame": 645, "ms": 42.5, "top": ["r:render 35.8", "zombies 2.4", "r:matrices 1.6", "m:hold 0.5"], "heapMB": 921.9, "freedMB": -9.8, "newPipelines": 0, "newTextures": 0, "newGeometries": 0 }
  ]
}
```

---

## 3. High-Graphics Visual Verification After CL-229 (`dwBuf0, dwBuf1, ...`)

Verified every skinned, instanced, and custom-node mesh on High graphics (`WebGPU`, `1280x720`) with zero WebGPU or console errors (`errs: []`):
- **`qa/2026-10-21-AG-108/01-marine-walls-turrets-trees.png`**: Marine (`SkinnedMesh`), HQ building, built walls, barricade, M240 watchman, light turret, flame turret, and heavy turret all render with proper materials, shadows, and lighting.
- **`qa/2026-10-21-AG-108/01b-trees-batch.png`**: `tree-batch` instanced trees (`InstancedMesh` canopies + trunks + shadows) near the perimeter render cleanly.
- **`qa/2026-10-21-AG-108/02-zombies-walking.png`**: All 9 standard/special zombie kinds (`shambler`, `feral`, `drowned`, `military`, `brute`, `spitter`, `bomber`, `leaper`, `spider`) walking around the marine with `zombie-skin` `SkinnedMesh` deformation, emissive eyes/pustules, and ground shadows intact.
- **`qa/2026-10-21-AG-108/03-demon-fire-fists.png`**: Two Demons walking with `demon-fire-fists` (`InstancedMesh`, `count: 2`, `castShadow: false`) rendering flames and embers cleanly on both fists.
- **`qa/2026-10-21-AG-108/04-screamer-vapour-shield.png`**: Two Screamers with `screamer-sonic-shield` (`visible: true`) and `screamer-black-vapor` (`visible: true, count: 36`) + chest fire rendering cleanly.
- **`qa/2026-10-21-AG-108/05-bosses-colossus-guardian.png`**: Both bosses (`colossus` and `guardian` with boulder rack and shoulder cannon) walking side by side next to the marine at 61 fps.
- **`qa/2026-10-21-AG-108/06-night20-high-horde.png`**: Live Night 20 push 6/6 (`zombs: 48`, `errs: []`).
