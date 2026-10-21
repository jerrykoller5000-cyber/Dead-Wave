# AG-88 ? CL-211's Two Cuts on Jerry's RTX 5080 (Night 20, Night 10, Megaswarm 48 & 60s Visual Look)

- **Date**: 2026-10-19
- **GPU / Renderer**: `NVIDIA GeForce RTX 5080` (`WebGPURenderer` / `Direct3D11`, non-headless via machine-wide game-test slot)
- **Raw JSON Lines**: `qa/2026-10-19-AG-86/prof-lines.jsonl` (lines 1?4 before `CL-211` cuts; lines 5?7 after `CL-211` cuts)
- **Night 20 60s Visual Shots**: `qa/2026-10-19-AG-88/shots/night20-t0s.png`, `night20-t20s.png`, `night20-t40s.png`, `night20-t60s.png`

---

## 1. Before vs After `CL-211` Cuts (`sunShadowCadence` + Single Matrix Walk)

| Scenario | Before FPS (1% Low) | After FPS (1% Low) | Before `frameMs` | After `frameMs` | Before `r:render` | After `r:render` | After `r:matrices` | Hitches (Before ? After) | `gpuMs` (Before ? After) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **Night 20** (`--gfx high`) | **32.5** (23.2) / 29.3 (20.0) | **44.8** (**32.3**) | 30.77 / 34.13 ms | **22.32 ms** (-8.45 ms) | 21.85 / 22.11 ms | **10.40 ms** (-11.45 ms) | **3.13 ms** | 8 / 12 ? **0** | 0.27 ? **0.27 ms** |
| **Night 10** (`--gfx high`) | **34.8** (26.6) | **45.4** (**32.3**) | 28.74 ms | **22.03 ms** (-6.71 ms) | 20.63 ms | **10.87 ms** (-9.76 ms) | **3.66 ms** | 1 ? **0** | 0.26 ? **0.26 ms** |
| **Megaswarm 48** (`--count 48`) | **59.0** (45.8) | **60.0** (**57.6**) | 16.95 ms (`tickMs 16.63`) | **16.67 ms** (`tickMs 12.15`, -4.48 ms) | 14.48 ms | **6.75 ms** (-7.73 ms) | **3.13 ms** | 2 ? **1** | 0.19 ? **0.18 ms** |

### DevTools CPU Profile Before vs After on Night 20 High (`cpu.total` / `cpu.self`)
- **`LightsNode.updateBefore` (`three.webgpu.js:33666`)**: **`20.60 ms/f` ? `9.30 ms/f`** (`-11.30 ms/f`)
- **`ShadowNode.updateShadow` (`three.webgpu.js:38033`)**: **`8.53 ms/f` ? `1.12 ms/f`** (`-7.41 ms/f`)
- **`updateMatrixWorld` (`three.core.js:13980`)**: **`7.13 ms/f` total (`4.34 ms/f` self) ? `3.73 ms/f` total (`2.30 ms/f` self)** (`-3.40 ms/f` total)
- **`_projectObject` (`three.webgpu.js:51838`)**: **`4.50 ms/f` total (`2.26 ms/f` self) ? `2.63 ms/f` total (`1.27 ms/f` self)** (`-1.87 ms/f` total)

---

## 2. Scene Census (`census`, Night 20 High)

- **Totals**: **`9,768` nodes** (**`7,208` with `matrixAutoUpdate = true`** recomposing each frame), **`7,429` meshes** (**`3,548` shown**, **`2,209` cast shadows**), `0` bones, **`1,832` top-level** children.
- **Top Groups**:
  1. `Group` (`585` instances): **`6,757` nodes** (**`4,640` auto**, `4,660` meshes)
  2. `Mesh` (`1,163` instances): **`1,165` nodes** (**`740` auto**, `1,165` meshes)
  3. `butterfly` (`11` instances): **`440` nodes** (**`440` auto**, `407` meshes)
  4. `bee` (`7` instances): **`287` nodes** (**`287` auto**, `266` meshes)
  5. `bird-flock` (`3` instances): **`224` nodes** (**`224` auto**, `136` meshes)
  6. `relay-vault` (`1` instance): **`219` nodes** (**`219` auto**, `206` meshes)
  7. `history-props` (`1` instance): **`178` nodes** (**`178` auto**, `147` meshes)
  8. `2` (`2` instances): **`144` nodes** (**`144` auto**, `142` meshes)
  9. `killer-rabbit` (`1` instance): **`85` nodes** (**`85` auto**, `76` meshes)
  10. `rabbit-mound` (`1` instance): **`74` nodes** (**`74` auto**, `71` meshes)
  11. `ground-sectors` (`1` instance): **`61` nodes** (**`61` auto**, `60` meshes)
  12. `objectiveProps` (`1` instance): **`36` nodes** (**`36` auto**, `28` meshes)
  13. `holy-reliquary` (`1` instance): **`20` nodes** (**`20` auto**, `18` meshes)
  14. `feral-motion-echo` (`18` instances): **`18` nodes** (`0` auto, `18` meshes)
  15. `PointLight` (`11` instances): **`11` nodes** (`11` auto, `0` meshes)

---

## 3. Night 20 60-Second Visual Inspection (`sunShadowCadence` & Motion)

- **Screenshots**: `qa/2026-10-19-AG-88/shots/night20-t0s.png`, `night20-t20s.png`, `night20-t40s.png`, `night20-t60s.png`
- **Shadows**: **PASS** ? Updating the moon/sun shadow map every 4th frame at night (`sunShadowCadence`) produces zero visible shadow jumping, popping, or stale shadow artifacts.
- **Motion / Matrix Sync**: **PASS** ? With `renderer.scene.matrixWorldAutoUpdate = false` and the single `r:matrices` walk per frame, all 48 zombies, demon fire fists, glowing eyes, limbs, and world animations continue moving smoothly (`z.mesh.position` matches `z.mesh.matrixWorld` translation on all sampled entities across the 60 s run).

---

## 4. Appended Raw JSON Lines (`qa/2026-10-19-AG-86/prof-lines.jsonl` Lines 5?7)

### Line 5: `node tools/bench.mjs --night 20 --gfx high --prof --cpu` (Post-CL-211)
```json
{"scenario":"night","seconds":30,"fps":44.8,"low":32.3,"worst":29.7,"hitches":0,"draws":442,"triangles":696082,"zombies":48,"gfx":"high","windows":10,"night":20,"push":5,"pushes":6,"last":true,"prof":{"frames":1416,"frameMs":22.32,"tickMs":20.82,"outsideMs":1.5,"top":[{"k":"r:render","avg":10.4,"max":37.3},{"k":"zombies","avg":3.61,"max":9.4},{"k":"r:matrices","avg":3.13,"max":6.4},{"k":"r:cull","avg":0.5,"max":1.4},{"k":"m:hold","avg":0.47,"max":2.1},{"k":"m:pose","avg":0.45,"max":1.4},{"k":"drops+hud","avg":0.41,"max":4.1},{"k":"w:stairs+roof+birds+bugs+wildlife","avg":0.26,"max":1},{"k":"w:minimap","avg":0.25,"max":3.1},{"k":"hud+audio","avg":0.18,"max":0.7},{"k":"m:idle","avg":0.18,"max":1.4},{"k":"w:treeFall+leaves+batches","avg":0.11,"max":0.9}],"spikes":[],"gpuMs":0.27,"gpuSamples":472},"cpu":{"frames":1416,"sampledMs":21.85,"idleMs":0.12,"self":[{"k":"updateMatrixWorld three.core.js:13980","ms":2.3},{"k":"_projectObject three.webgpu.js:51838","ms":1.27},{"k":"tick index.html:54533","ms":0.85},{"k":"multiplyMatrices three.core.js:11564","ms":0.81},{"k":"updateZombies index.html:51171","ms":0.79},{"k":"writeBuffer :0","ms":0.74},{"k":"_renderObjectDirect three.webgpu.js:52172","ms":0.58},{"k":"intersectsObject three.core.js:26138","ms":0.49},{"k":"setFromBufferAttribute three.core.js:9297","ms":0.48},{"k":"bend marine-cloth.js:52","ms":0.47},{"k":"compose three.core.js:12023","ms":0.47},{"k":"updateWorldMatrix three.core.js:14027","ms":0.46},{"k":"update three.webgpu.js:52680","ms":0.41},{"k":"updateForRender three.webgpu.js:47136","ms":0.37},{"k":"bend marine-waist.js:37","ms":0.32},{"k":"setVertexBuffer :0","ms":0.3},{"k":"sceneCull index.html:2035","ms":0.28},{"k":"updateMatrix three.core.js:13961","ms":0.26},{"k":"renderObject three.webgpu.js:52063","ms":0.26},{"k":"draw three.webgpu.js:69261","ms":0.25},{"k":"setFromEuler three.core.js:7324","ms":0.25},{"k":"set three.webgpu.js:3038","ms":0.24},{"k":"update three.webgpu.js:12257","ms":0.22},{"k":"renderFrame index.html:2097","ms":0.22},{"k":"needsRenderUpdate three.webgpu.js:69532","ms":0.21}],"total":[{"k":"update three.webgpu.js:24889","ms":20.62},{"k":"tick index.html:54533","ms":20.55},{"k":"renderFrame index.html:2097","ms":14.01},{"k":"render three.webgpu.js:70584","ms":10.28},{"k":"_renderScene three.webgpu.js:50526","ms":10.27},{"k":"_renderObjects three.webgpu.js:52037","ms":10.18},{"k":"renderObject three.webgpu.js:52063","ms":10.18},{"k":"_renderObjectDirect three.webgpu.js:52172","ms":10.17},{"k":"updateBefore three.webgpu.js:47077","ms":10.12},{"k":"updateBeforeNode three.webgpu.js:45393","ms":10.12},{"k":"updateBefore three.webgpu.js:33666","ms":9.3},{"k":"updateMatrixWorld three.core.js:13980","ms":3.73},{"k":"_projectObject three.webgpu.js:51838","ms":2.63},{"k":"updateZombies index.html:51171","ms":2.25},{"k":"updateForRender three.webgpu.js:27591","ms":1.44},{"k":"_update three.webgpu.js:27644","ms":1.21},{"k":"updateShadow three.webgpu.js:38033","ms":1.12},{"k":"updateBefore three.webgpu.js:38151","ms":1.12},{"k":"_updateBindings three.webgpu.js:27602","ms":0.99},{"k":"updateForRender three.webgpu.js:47136","ms":0.98},{"k":"draw three.webgpu.js:69261","ms":0.95},{"k":"_renderTransparents three.webgpu.js:51987","ms":0.83},{"k":"updateWorldAnimations index.html:54383","ms":0.82},{"k":"multiplyMatrices three.core.js:11564","ms":0.81},{"k":"updateBefore BloomNode.js:287","ms":0.81},{"k":"(anonymous) three.webgpu.js:38054","ms":0.78},{"k":"writeBuffer :0","ms":0.74},{"k":"updateMatrix three.core.js:13961","ms":0.73},{"k":"computeBoundingSphere three.core.js:19123","ms":0.6},{"k":"updateForRender three.webgpu.js:26429","ms":0.59}]},"census":{"nodes":9768,"auto":7208,"meshes":7429,"shown":3548,"casters":2209,"bones":0,"top":1832,"groups":[{"k":"Group","count":585,"nodes":6757,"auto":4640,"meshes":4660,"bones":0},{"k":"Mesh","count":1163,"nodes":1165,"auto":740,"meshes":1165,"bones":0},{"k":"butterfly","count":11,"nodes":440,"auto":440,"meshes":407,"bones":0},{"k":"bee","count":7,"nodes":287,"auto":287,"meshes":266,"bones":0},{"k":"bird-flock","count":3,"nodes":224,"auto":224,"meshes":136,"bones":0},{"k":"relay-vault","count":1,"nodes":219,"auto":219,"meshes":206,"bones":0},{"k":"history-props","count":1,"nodes":178,"auto":178,"meshes":147,"bones":0},{"k":"2","count":2,"nodes":144,"auto":144,"meshes":142,"bones":0},{"k":"killer-rabbit","count":1,"nodes":85,"auto":85,"meshes":76,"bones":0},{"k":"rabbit-mound","count":1,"nodes":74,"auto":74,"meshes":71,"bones":0},{"k":"ground-sectors","count":1,"nodes":61,"auto":61,"meshes":60,"bones":0},{"k":"objectiveProps","count":1,"nodes":36,"auto":36,"meshes":28,"bones":0},{"k":"holy-reliquary","count":1,"nodes":20,"auto":20,"meshes":18,"bones":0},{"k":"feral-motion-echo","count":18,"nodes":18,"auto":0,"meshes":18,"bones":0},{"k":"PointLight","count":11,"nodes":11,"auto":11,"meshes":0,"bones":0},{"k":"first-standing-stone","count":3,"nodes":10,"auto":10,"meshes":7,"bones":0},{"k":"frag-grenade","count":1,"nodes":9,"auto":9,"meshes":7,"bones":0},{"k":"first-ring-stone","count":1,"nodes":5,"auto":5,"meshes":4,"bones":0},{"k":"insulated-boots","count":1,"nodes":3,"auto":3,"meshes":2,"bones":0},{"k":"zombie-fireball","count":1,"nodes":3,"auto":3,"meshes":2,"bones":0},{"k":"DirectionalLight","count":2,"nodes":2,"auto":2,"meshes":0,"bones":0},{"k":"Object3D","count":2,"nodes":2,"auto":2,"meshes":0,"bones":0},{"k":"laser-impact","count":2,"nodes":2,"auto":2,"meshes":2,"bones":0},{"k":"zombie-stone","count":1,"nodes":2,"auto":2,"meshes":1,"bones":0},{"k":"HemisphereLight","count":1,"nodes":1,"auto":1,"meshes":0,"bones":0}]}}
```

### Line 6: `node tools/bench.mjs --night 10 --gfx high --prof` (Post-CL-211)
```json
{"scenario":"night","seconds":30,"fps":45.4,"low":32.3,"worst":31,"hitches":0,"draws":415,"triangles":590477,"zombies":48,"gfx":"high","windows":10,"night":10,"push":3,"pushes":4,"last":true,"prof":{"frames":1382,"frameMs":22.03,"tickMs":21.4,"outsideMs":0.63,"top":[{"k":"r:render","avg":10.87,"max":30.6},{"k":"r:matrices","avg":3.66,"max":7.2},{"k":"zombies","avg":2.88,"max":9.7},{"k":"m:hold","avg":0.55,"max":2},{"k":"m:pose","avg":0.51,"max":2.2},{"k":"r:cull","avg":0.47,"max":1.7},{"k":"drops+hud","avg":0.43,"max":1.9},{"k":"w:stairs+roof+birds+bugs+wildlife","avg":0.36,"max":1.3},{"k":"w:minimap","avg":0.27,"max":1.7},{"k":"m:idle","avg":0.21,"max":1.3},{"k":"tree+deck coll","avg":0.16,"max":0.8},{"k":"hud+audio","avg":0.13,"max":0.8}],"spikes":[],"gpuMs":0.26,"gpuSamples":462}}
```

### Line 7: `node tools/bench.mjs --count 48 --prof` (Post-CL-211 Megaswarm)
```json
{"scenario":"megaswarm","seconds":30,"fps":60,"low":57.6,"worst":16.9,"hitches":1,"draws":218,"triangles":513225,"zombies":48,"gfx":"high","windows":10,"prof":{"frames":1813,"frameMs":16.67,"tickMs":12.15,"outsideMs":4.52,"top":[{"k":"r:render","avg":6.75,"max":16.6},{"k":"r:matrices","avg":3.13,"max":6.7},{"k":"jump+guns","avg":0.74,"max":2.8},{"k":"w:stairs+roof+birds+bugs+wildlife","avg":0.35,"max":1.2},{"k":"w:minimap","avg":0.21,"max":1.3},{"k":"drops+hud","avg":0.15,"max":0.5},{"k":"w:treeFall+leaves+batches","avg":0.14,"max":0.5},{"k":"r:rigSkin","avg":0.12,"max":0.5},{"k":"w:treeFade+sway","avg":0.12,"max":0.5},{"k":"hud+audio","avg":0.11,"max":1},{"k":"daynight","avg":0.09,"max":0.4},{"k":"w:wind","avg":0.04,"max":0.4}],"spikes":[],"gpuMs":0.18,"gpuSamples":1385},"count":48}
```
