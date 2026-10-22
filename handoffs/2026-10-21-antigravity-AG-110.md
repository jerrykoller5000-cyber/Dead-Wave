# antigravity — AG-110 Night 20 after CL-234 — 2026-10-21
Changed:          Ran 3x Night-20 High `--prof` benchmarks after CL-234, reading `TT.marineShadowDbg()` (`builds`, `lastDiff`, `ms`, `bones`, `verts`) in the same page after each 30 s sample, and captured dusk shadow screenshots (`worldTime = 0.68`) with stowed guns on the marine's back and during his `pack` and `smoking` idles. Traced why `marine-shadow` still rebuilt 1–2 times during the 30 s bench (`builds: 2, 2, 3`): (1) `carryGunCopy` (`index.html:21273`) sets `g.userData.proxySkip = true`, but line `21294` overwrites `g.userData = { carryKind: kind }`, wiping `proxySkip` off every stowed gun copy; (2) `fitCarryHolster` (`ui/marine-kit-fit.js:46-56`) replaces `spot.shell` (`open-molded-holster`) when the pistol moves between in-hand (`shell-fit:pistol`) and holstered (`hip:pistol`); (3) `marine-idle-props` (`studio/marine-idle.js:42-56`) has `proxySkip: true` (`idleProxySkip: true`), but its `cig`/`pack`/`lighter` meshes have `castShadow: false` (`cigCastShadow: false`).
Files:            qa/2026-10-21-AG-110/run-ag110.mjs, qa/2026-10-21-AG-110/ag110-summary.json, qa/2026-10-21-AG-110/run-1.json, qa/2026-10-21-AG-110/run-2.json, qa/2026-10-21-AG-110/run-3.json, qa/2026-10-21-AG-110/01-dusk-shadow-stowed-gun.png, qa/2026-10-21-AG-110/02-dusk-shadow-smoking-pack.png, qa/2026-10-21-AG-110/03-dusk-shadow-smoking-cig.png
Tests:            3x Night-20 High `--prof` + `TT.marineShadowDbg()` + dusk shadow visual & scene-graph inspection via `node crew/crew.mjs slot run antigravity AG-110` (Rule 16: one game test at a time through the shared queue)
Screenshots:      qa/2026-10-21-AG-110/01-dusk-shadow-stowed-gun.png, qa/2026-10-21-AG-110/02-dusk-shadow-smoking-pack.png, qa/2026-10-21-AG-110/03-dusk-shadow-smoking-cig.png
Not verified:     Full `npm test` suite not run (integration job owned by Cursor/Claude per Rule 16).
Requests:         FYI sent to `claude` with AG-110 Night-20 High `--prof` numbers, `TT.marineShadowDbg()` output, and the 3 exact root causes (`index.html:21294` wiping `g.userData.proxySkip`, `open-molded-holster` replacement in `fitCarryHolster`, and `castShadow: false` on `marine-idle-props` meshes).
Contract changes: none

---

## 1. Night 20 High (`--prof`) + `TT.marineShadowDbg()` — 3-Run Summary (After CL-234)

All runs executed sequentially through `node crew/crew.mjs slot run antigravity AG-110` on Jerry's RTX 5080 (WebGPU, 1280×720, `--night 20 --gfx high --prof`), reading `TT.marineShadowDbg()` in the same page before and after the 30 s measurement window:

| Run | FPS | 1% Low | Worst (ms) | Hitches | Frame (ms) | Tick (ms) | Outside (ms) | GPU (ms) | `builds.made` (`marine-shadow`) | `pipelines.made` | `spikeCauses` | `TT.marineShadowDbg()` after run |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| **AG-109 (after CL-232, med)** | 56.4 | 39.7 | 24.4 | 0 | 17.73 | 14.14 | 3.59 | 0.30 | 5 (`3`) | 4 | `{spikes:10, pipelines:0, builds:1, uploads:1, gc:1, code:7}` | n/a (`marine-shadow` built 3× in 30 s) |
| **AG-110 Run 1** | 56.2 | 32.8 | 31.1 | 1 | 17.79 | 15.04 | 2.75 | 0.31 | **4** (`2`) | **3** | `{spikes:15, pipelines:0, builds:1, uploads:0, gc:1, code:13}` | `builds: 2`, `lastDiff: {added: 6×"Mesh" + "open-molded-holster", gone: ["open-molded-holster"]}` |
| **AG-110 Run 2** | 52.4 | 34.1 | 24.9 | **0** | 19.08 | 15.77 | 3.32 | 0.32 | **3** (`1`) | **2** | `{spikes:19, pipelines:1, builds:1, uploads:2, gc:2, code:13}` | `builds: 2`, `lastDiff: {added: ["open-molded-holster"], gone: ["open-molded-holster"]}` |
| **AG-110 Run 3** | **57.0** | **37.5** | 26.8 | **0** | **17.54** | 15.11 | 2.43 | 0.30 | **4** (`2`) | **3** | `{spikes:7, pipelines:0, builds:1, uploads:0, gc:1, code:5}` | `builds: 3`, `lastDiff: {added: ["open-molded-holster"], gone: 6×"Mesh" + "open-molded-holster"}` |
| **AG-110 Median** | **56.2** | **34.1** | **26.8** | **0** | **17.79** | **15.11** | **2.75** | **0.31** | **4** (`2`) | **3** | `spikes: 15` (best **`7`** in Run 3) | `builds: 2` (`1` before window + `1` during smoking idle) |
| **AG-110 Best (Run 3)** | **57.0** | **37.5** | **26.8** | **0** | **17.54** | **15.11** | **2.43** | **0.30** | **4** (`2`) | **3** | **`{spikes:7, pipelines:0, builds:1, uploads:0, gc:1, code:5}`** | `builds: 3` |

---

## 2. What `TT.marineShadowDbg()` & Dusk Checks Revealed (3 Root Causes)

1. **Why the stowed pistol's 6 folded `Mesh`es still appeared in `lastDiff` (`index.html:21273` vs `21294`):**
   - In `carryGunCopy(kind)` (`index.html`):
     - Line `21273` sets: `g.userData.proxySkip = true;   // CL-234: casts its own shadow, out of the marine's shadow proxy`
     - Line `21294` then assigns: `g.userData = { carryKind: kind };` — **overwriting `g.userData` and wiping out `proxySkip: true`!**
   - In our dusk scene-graph inspection (`shot1Info.carryCopies`), every single `carryGunCopy` on the marine reported `proxySkip: false`.
   - Fix: Change `index.html:21294` to `g.userData = { carryKind: kind, proxySkip: true };` (or set `proxySkip = true` on the carry mount groups `rig.slings[i].g`, `rig.holsters[i].g`, `rig.pairs[i].g`, `rig.hip.g`, `rig.hipPair.g`).

2. **Why `"open-molded-holster"` appeared in both `lastDiff.added` and `lastDiff.gone` (`ui/marine-kit-fit.js:46-56`):**
   - When the marine enters or leaves the smoking idle (`weaponMount.visible = false`), his pistol moves between his hand (`rig.hip.gun = null`, where `fitCarriedGuns` -> `station` temporarily attaches `shell-fit:pistol+...` to fit the empty holster) and his hip holster (`rig.hip.gun = copy`).
   - In `fitCarryHolster` (`ui/marine-kit-fit.js:44-56`), `key = [spot.kind, cx, cy, rx, ry, mouth, end].join(':')` differs slightly in floating-point precision between the temporary `shell-fit` copy and the mounted `hip` copy, so `fitCarryHolster` disposes `spot.shell` and creates a brand-new `new T.Mesh(geo, material)` named `'open-molded-holster'` without `proxySkip: true`.
   - Even in Run 2 (where the 6 `Mesh`es didn't diff), `lastDiff` was `{"added":["open-molded-holster"],"gone":["open-molded-holster"]}`!
   - Fix: Either mark the carry mount groups (`rig.hip.g`, `rig.hipPair.g`, `rig.holsters[i].g`, `rig.pairs[i].g`, `rig.slings[i].g`) with `userData.proxySkip = true` (which skips both the stowed guns and their holster shells in one place), or set `shell.userData.proxySkip = true` in `fitCarryHolster`.

3. **Why `marine-idle-props` (`cig`, `pack`, `lighter`) had `cigCastShadow: false` (`studio/marine-idle.js:41-56`):**
   - `CL-234` properly marked `marine-idle-props` with `userData.proxySkip = true` (`idleProxySkip: true` in `shot2Info`), so the cigarette, pack, and lighter no longer cause a `marine-shadow` proxy rebuild!
   - However, in `studio/marine-idle.js` (`lines 41-56`), the `cig`, `pack`, and `lighter` meshes are created with default `castShadow = false` (`idleCasters: 0`, `cigCastShadow: false`). Previously they only cast a shadow because `skinMergeGroup` merged them into `marine-shadow`.
   - Similarly, on `carryGunCopy`, `pistol`, `m4`, and `uzi` stowed copies had `casters: 4` (`castShadow: true`), whereas `minigun` and `revolver` stowed copies had `casters: 0` (`castShadow: false` on their folded meshes).
   - Fix: Traverse `idleProps` at `index.html:19372` (and `g` in `carryGunCopy` at `index.html:21295`) and set `if (o.isMesh) o.castShadow = true;` so both the smoking props and every stowed weapon cast their own shadows now that they are excluded from `marine-shadow`.

---

## 3. Verbatim `TT.marineShadowDbg()`, `prof.builds`, `spikeCauses`, and `prof.spikes`

### Run 1 (`qa/2026-10-21-AG-110/run-1.json`)
- `fps`: `56.2`, `low`: `32.8`, `worst`: `31.1 ms`, `hitches`: `1`, `tickMs`: `15.04`
- `marineShadowBefore`: `{"builds":1,"lastDiff":null,"ms":10,"bones":69,"verts":67050}`
- `marineShadowAfter` (`TT.marineShadowDbg()`):
```json
{
  "builds": 2,
  "lastDiff": {
    "added": [
      "Mesh",
      "Mesh",
      "Mesh",
      "Mesh",
      "Mesh",
      "Mesh",
      "open-molded-holster"
    ],
    "gone": [
      "open-molded-holster"
    ]
  },
  "ms": 11.199999999254942,
  "bones": 75,
  "verts": 82746
}
```
- `spikeCauses`: `{"spikes":15,"pipelines":0,"builds":1,"uploads":0,"gc":1,"code":13}`
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
        1376
      ]
    },
    {
      "k": "feral-motion-echo < Scene | SkinnedMesh | MeshBasicMaterial",
      "n": 1,
      "frames": [
        489
      ]
    },
    {
      "k": "zombie-skin < Group < Scene | SkinnedMesh | MeshStandardNodeMaterial",
      "n": 1,
      "frames": [
        1217
      ]
    }
  ]
}
```
- `prof.spikes` (verbatim):
```json
[
  { "frame": 18, "ms": 35.0, "top": ["r:render 20.7", "r:matrices 4.2", "zombies 3.3", "r:cull 1.6"], "heapMB": 906.6, "freedMB": -0.8, "newPipelines": 0, "newTextures": 0, "newGeometries": 0, "newBuilds": 0 },
  { "frame": 137, "ms": 28.4, "top": ["r:render 14.9", "zombies 4.9", "r:matrices 4.0", "r:cull 0.8"], "heapMB": 881.9, "freedMB": -0.8, "newPipelines": 0, "newTextures": 0, "newGeometries": 0, "newBuilds": 0 },
  { "frame": 600, "ms": 33.7, "top": ["r:render 25.8", "zombies 2.9", "r:matrices 1.5", "m:hold 0.6"], "heapMB": 808.5, "freedMB": 97.8, "newPipelines": 0, "newTextures": 0, "newGeometries": 0, "newBuilds": 0 },
  { "frame": 668, "ms": 30.1, "top": ["r:render 14.4", "zombies 6.8", "r:matrices 3.4", "r:cull 1.5"], "heapMB": 834.9, "freedMB": -0.7, "newPipelines": 0, "newTextures": 0, "newGeometries": 0, "newBuilds": 0 },
  { "frame": 669, "ms": 28.4, "top": ["r:render 8.2", "zombies 7.6", "m:hold 2.4", "r:matrices 2.4"], "heapMB": 835.6, "freedMB": -0.8, "newPipelines": 0, "newTextures": 0, "newGeometries": 0, "newBuilds": 0 },
  { "frame": 846, "ms": 37.9, "top": ["r:render 20.0", "zombies 6.6", "r:matrices 5.0", "r:cull 1.4"], "heapMB": 815.5, "freedMB": -0.7, "newPipelines": 0, "newTextures": 0, "newGeometries": 0, "newBuilds": 0 },
  { "frame": 1023, "ms": 33.8, "top": ["r:render 16.7", "zombies 7.0", "r:matrices 4.2", "r:cull 1.1"], "heapMB": 832.8, "freedMB": -0.7, "newPipelines": 0, "newTextures": 0, "newGeometries": 0, "newBuilds": 0 },
  { "frame": 1217, "ms": 43.7, "top": ["r:render 35.2", "zombies 4.3", "r:matrices 1.3", "m:hold 0.7"], "heapMB": 837.7, "freedMB": -9.8, "newPipelines": 0, "newTextures": 0, "newGeometries": 0, "newBuilds": 1 }
]
```

### Run 2 (`qa/2026-10-21-AG-110/run-2.json`)
- `fps`: `52.4`, `low`: `34.1`, `worst`: `24.9 ms`, `hitches`: `0`, `tickMs`: `15.77`
- `marineShadowBefore`: `{"builds":1,"lastDiff":null,"ms":9.300000000745058,"bones":69,"verts":67050}`
- `marineShadowAfter` (`TT.marineShadowDbg()`):
```json
{
  "builds": 2,
  "lastDiff": {
    "added": [
      "open-molded-holster"
    ],
    "gone": [
      "open-molded-holster"
    ]
  },
  "ms": 11.800000000745058,
  "bones": 69,
  "verts": 67050
}
```
- `spikeCauses`: `{"spikes":19,"pipelines":1,"builds":1,"uploads":2,"gc":2,"code":13}`
- `prof.pipelines.made`: `2`
- `prof.builds` (verbatim):
```json
{
  "made": 3,
  "top": [
    {
      "k": "marine-shadow < Group < Group < Group | SkinnedMesh | MeshBasicMaterial",
      "n": 1,
      "frames": [
        31
      ]
    },
    {
      "k": "feral-motion-echo < Scene | SkinnedMesh | MeshBasicMaterial",
      "n": 1,
      "frames": [
        448
      ]
    },
    {
      "k": "zombie-skin < Group < Scene | SkinnedMesh | MeshStandardNodeMaterial",
      "n": 1,
      "frames": [
        1212
      ]
    }
  ]
}
```
- `prof.spikes` (verbatim):
```json
[
  { "frame": 151, "ms": 29.5, "top": ["r:render 15.1", "r:matrices 4.1", "zombies 4.1", "w:minimap 1.3"], "heapMB": 896.8, "freedMB": -0.8, "newPipelines": 0, "newTextures": 0, "newGeometries": 0, "newBuilds": 0 },
  { "frame": 330, "ms": 32.3, "top": ["r:render 16.0", "r:matrices 4.3", "zombies 3.6", "w:minimap 1.3"], "heapMB": 924.2, "freedMB": -0.8, "newPipelines": 0, "newTextures": 0, "newGeometries": 0, "newBuilds": 0 },
  { "frame": 331, "ms": 26.1, "top": ["r:render 14.9", "r:matrices 2.7", "zombies 2.5", "m:hold 1.3"], "heapMB": 925.1, "freedMB": -0.8, "newPipelines": 0, "newTextures": 0, "newGeometries": 0, "newBuilds": 0 },
  { "frame": 448, "ms": 25.8, "top": ["r:render 15.0", "r:matrices 3.8", "zombies 2.4", "r:cull 0.9"], "heapMB": 927.4, "freedMB": -2.4, "newPipelines": 1, "newTextures": 0, "newGeometries": 1, "newBuilds": 1 },
  { "frame": 506, "ms": 40.0, "top": ["r:render 14.9", "zombies 7.6", "r:matrices 3.9", "w:minimap 3.0"], "heapMB": 912.2, "freedMB": -1.4, "newPipelines": 0, "newTextures": 0, "newGeometries": 0, "newBuilds": 0 },
  { "frame": 562, "ms": 37.2, "top": ["r:render 20.6", "zombies 4.9", "r:matrices 4.8", "m:hold 1.2"], "heapMB": 919.6, "freedMB": -0.7, "newPipelines": 0, "newTextures": 0, "newGeometries": 0, "newBuilds": 0 },
  { "frame": 676, "ms": 34.8, "top": ["r:render 15.7", "zombies 5.6", "r:matrices 4.6", "m:pose 1.7"], "heapMB": 918.9, "freedMB": -0.8, "newPipelines": 0, "newTextures": 0, "newGeometries": 0, "newBuilds": 0 },
  { "frame": 1212, "ms": 42.8, "top": ["r:render 32.6", "zombies 4.0", "r:matrices 1.9", "m:hold 1.8"], "heapMB": 931.5, "freedMB": 23.1, "newPipelines": 0, "newTextures": 0, "newGeometries": 0, "newBuilds": 1 }
]
```

### Run 3 (`qa/2026-10-21-AG-110/run-3.json`)
- `fps`: `57.0`, `low`: `37.5`, `worst`: `26.8 ms`, `hitches`: `0`, `tickMs`: `15.11`
- `marineShadowBefore`: `{"builds":1,"lastDiff":null,"ms":11.399999998509884,"bones":69,"verts":67050}`
- `marineShadowAfter` (`TT.marineShadowDbg()`):
```json
{
  "builds": 3,
  "lastDiff": {
    "added": [
      "open-molded-holster"
    ],
    "gone": [
      "Mesh",
      "Mesh",
      "Mesh",
      "Mesh",
      "Mesh",
      "Mesh",
      "open-molded-holster"
    ]
  },
  "ms": 4.899999998509884,
  "bones": 69,
  "verts": 67050
}
```
- `spikeCauses`: `{"spikes":7,"pipelines":0,"builds":1,"uploads":0,"gc":1,"code":5}`
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
        24,
        1524
      ]
    },
    {
      "k": "feral-motion-echo < Scene | SkinnedMesh | MeshBasicMaterial",
      "n": 1,
      "frames": [
        763
      ]
    },
    {
      "k": "zombie-skin < Group < Scene | SkinnedMesh | MeshStandardNodeMaterial",
      "n": 1,
      "frames": [
        1186
      ]
    }
  ]
}
```
- `prof.spikes` (verbatim — only 7 spikes in the entire 30 s run!):
```json
[
  { "frame": 1186, "ms": 41.1, "top": ["r:render 34.3", "zombies 2.9", "r:matrices 1.4", "m:hold 0.5"], "heapMB": 941.1, "freedMB": -10.0, "newPipelines": 0, "newTextures": 0, "newGeometries": 0, "newBuilds": 1 },
  { "frame": 1381, "ms": 28.2, "top": ["marine 12.7", "r:render 7.6", "zombies 3.3", "r:matrices 1.7"], "heapMB": 931.0, "freedMB": 21.3, "newPipelines": 0, "newTextures": 0, "newGeometries": -1, "newBuilds": 0 },
  { "frame": 1447, "ms": 31.9, "top": ["zombies 16.0", "r:render 7.2", "m:hold2+arms 3.3", "r:matrices 2.0"], "heapMB": 950.3, "freedMB": -9.9, "newPipelines": 0, "newTextures": 0, "newGeometries": 0, "newBuilds": 0 },
  { "frame": 1654, "ms": 25.1, "top": ["r:render 8.9", "zombies 7.1", "r:matrices 2.8", "r:lightPool 1.7"], "heapMB": 982.1, "freedMB": -1.0, "newPipelines": 0, "newTextures": 0, "newGeometries": 0, "newBuilds": 0 },
  { "frame": 1718, "ms": 25.8, "top": ["r:render 10.1", "zombies 8.1", "r:matrices 3.0", "m:hold 1.0"], "heapMB": 980.7, "freedMB": -0.9, "newPipelines": 0, "newTextures": 0, "newGeometries": 0, "newBuilds": 0 },
  { "frame": 1750, "ms": 27.2, "top": ["r:render 12.7", "zombies 4.7", "r:matrices 3.4", "hud+audio 1.0"], "heapMB": 978.4, "freedMB": -0.9, "newPipelines": 0, "newTextures": 0, "newGeometries": 0, "newBuilds": 0 },
  { "frame": 1759, "ms": 26.7, "top": ["r:render 9.2", "zombies 7.8", "r:matrices 3.4", "w:stairs+roof+birds+bugs+wildlife 1.0"], "heapMB": 986.8, "freedMB": -0.9, "newPipelines": 0, "newTextures": 0, "newGeometries": 0, "newBuilds": 0 }
]
```

---

## 4. Dusk Shadow Visual Check (`worldTime = 0.68`, Stowed Guns + Smoking Idle)

- **`qa/2026-10-21-AG-110/01-dusk-shadow-stowed-gun.png`**: Marine standing in the sunlit clearing at `(5, 18)` at dusk (`worldTime = 0.68`) with `slung: ["minigun", "m4"]`, `holstered: ["uzi", "revolver"]`, and pistol in hand. The marine's shadow is cast forward-right onto the grass (`shadowDbg: { builds: 1, lastDiff: null, bones: 144, verts: 236994 }` because `carryGunCopy` line `21294` wiped `proxySkip`, so the stowed weapons were merged into `marine-shadow`).
- **`qa/2026-10-21-AG-110/02-dusk-shadow-smoking-pack.png`**: Marine in `phase: "pack"` (`t = 3.58 s`) lighting his cigarette (`idleProxySkip: true`, `shadowDbg.builds: 1`).
- **`qa/2026-10-21-AG-110/03-dusk-shadow-smoking-cig.png`**: Marine in `phase: "smoking"` (`t = 2.66 s`, `lit: true`) exhaling smoke with the cigarette at his lips (`cigVisible: true`, `cigCastShadow: false`, `shadowDbg.builds: 2` triggered by the stowed pistol's 6 `Mesh`es and 4 `open-molded-holster` replacements).
