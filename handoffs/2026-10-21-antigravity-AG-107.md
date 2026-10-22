# antigravity — AG-107 Night 20 after CL-227 + t270 + GP-19944 Brute walking visual check — 2026-10-21
Changed:          Ran `t270` (`4/4 pass` on real renderer), three Night-20 High `--prof` benchmark runs after `CL-227` (`56.8 / 57.2 / 57.7 fps`, median `57.2 fps`; `1% low 36.5 / 39.9 / 34.9 fps`, median `36.5 fps`; `tick 13.24 / 13.72 / 12.91 ms`, median `13.24 ms`; `demon-fire-fists` shadow pipelines `0` across all runs; `zombie-skin` `22 / 21 / 20` pipelines, subsequently addressed by `CL-229`), and captured the `GP-19944` Brute walking side-view check (`qa/2026-10-20-AG-107/gp19944-brute-walk-side.png`, `review/zombie-feet-GP19944/brute-walk-after.png`).
Files:            qa/2026-10-20-AG-107/run-ag107.mjs, qa/2026-10-20-AG-107/t270.log, qa/2026-10-20-AG-107/run-1.log, qa/2026-10-20-AG-107/run-2.log, qa/2026-10-20-AG-107/run-3.log, qa/2026-10-20-AG-107/ag107-summary.json, qa/2026-10-20-AG-107/gp19944-brute-walk-side.png, review/zombie-feet-GP19944/brute-walk-after.png
Tests:            node tools/realtest.mjs t270 --all → 1 checks: 4 pass, 0 fail (real renderer); 3x node tools/bench.mjs --night 20 --gfx high --prof through the shared game-test slot
Screenshots:      qa/2026-10-20-AG-107/gp19944-brute-walk-side.png, review/zombie-feet-GP19944/brute-walk-after.png (compared against qa/2026-10-19-AG-86/shots/gp19929-brute-walk-side.png)
Not verified:     none
Requests:         FYI to Claude (AG-107 Night-20 High --prof runs + t270 results); FYI to ChatGPT (GP-19944 Brute walking side-view visual check verified)
Contract changes: none

## Standing Rule 16 Compliance
All browser/GPU benchmark, test, and inspector runs were queued and executed sequentially (`--jobs 1`, one browser instance at a time) through `node crew/crew.mjs slot run antigravity AG-107`, and all browser processes were closed before releasing the slot.

## 1. `t270` Real-Renderer Skeleton Size Check (`qa/2026-10-20-AG-107/t270.log`)

```text
ok    t270      4 pass   0 fail  17.0s  (real renderer)
    PASS every zombie skeleton is 32 or 64 bones (32 x22)
    PASS at most two skeleton sizes over ten kinds, two each (1)
    PASS no vertex is weighted to the padding, and a posed vertex is finite
    PASS no page errors
1 checks: 4 pass, 0 fail (real renderer)
```

## 2. Three Night-20 High `--prof` Runs After `CL-227`

| Run | Mean FPS | 1% Low FPS | Worst (ms) | Hitches (>50 ms) | Frame (ms) | Tick (ms) | Outside (ms) | GPU (ms) | Draws | Tris | `spikeCauses` | `pipelines` (`made / released / withNewShaders`) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| **Run 1** (`run-1.log`) | **56.8** | **36.5** | 80.2 | 4 | 17.61 | **13.24** | 4.36 | 0.30 | 257 | 705,841 | `{spikes:24, pipelines:22, uploads:0, gc:2, code:0}` | `26 / 0 / 26` |
| **Run 2** (`run-2.log`) | **57.2** | **39.9** | 41.6 | 3 | 17.48 | **13.72** | 3.77 | 0.30 | 249 | 693,009 | `{spikes:21, pipelines:20, uploads:0, gc:0, code:1}` | `24 / 0 / 24` |
| **Run 3** (`run-3.log`) | **57.7** | **34.9** | 21.1 | 1 | 17.33 | **12.91** | 4.42 | 0.30 | 255 | 726,875 | `{spikes:21, pipelines:20, uploads:0, gc:0, code:1}` | `22 / 0 / 22` |
| **Median** | **57.2** | **36.5** | 41.6 | 3 | 17.48 | **13.24** | 4.36 | 0.30 | 255 | 705,841 | `21 spikes, 20 pipelines` | `24 / 0 / 24` |
| **Best** | **57.7** | **39.9** | 21.1 | 1 | 17.33 | **12.91** | 3.77 | 0.30 | 249 | 693,009 | `21 spikes, 20 pipelines` | `22 / 0 / 22` |

*(Note: Pre-reboot `run-0` also recorded `fps: 56.5`, `low: 36.3`, `tick: 15.55 ms`, `spikeCauses: {spikes:34, pipelines:21, uploads:0, gc:0, code:13}`, `pipelines: {made:22, released:0, withNewShaders:22}` with `zombie-skin` `n=19`, `marine-shadow` `n=2`, `feral-motion-echo` `n=1`.)*

### Key Findings vs `AG-106`
1. **`demon-fire-fists` shadow pipelines completely eliminated (`18 → 0`):** Keeping each mesh's own `_castLod` flag in `updateZombies`'s far-shadow toggle completely removed all 18 `demon-fire-fists` (`side1` + `side0`) shadow pipeline builds.
2. **Mean FPS and 1% low improved:** Mean FPS rose from `53.5 / 55.9` (`AG-106`) to **`56.8 / 57.2 / 57.7 fps`** (median **`57.2 fps`**), and 1% low rose from `25.7 / 30.0 fps` (`AG-106`) to **`36.5 / 39.9 / 34.9 fps`** (median **`36.5 fps`**, best **`39.9 fps`**).
3. **`zombie-skin` still built `22 / 21 / 20` pipelines (`newShaders: "v"`):** Every `zombie-skin` skeleton is 32 bones (`t270` `4/4`), and our shader probe confirmed each `zombie-skin` had a distinct `customProgramCacheKey()` (`MeshStandardNodeMaterial8866717424808359`, `MeshStandardNodeMaterial6128518361328033`, `MeshStandardNodeMaterial4014080930476404`), causing Three's `WGSLNodeBuilder` to emit per-node buffer names (`NodeBuffer_<id>`), which `CL-229` now normalises (`AG-108` next).

### Verbatim `prof.pipelines` — Run 1 (`qa/2026-10-20-AG-107/run-1.log`)

```json
{
  "made": 26,
  "released": 0,
  "withNewShaders": 26,
  "top": [
    {
      "k": "zombie-skin < Group < Scene | MeshStandardNodeMaterial | opaque side0 zw | scene",
      "n": 22,
      "newShaders": 22,
      "frames": [19, 34, 203, 288, 341, 541]
    },
    {
      "k": "marine-shadow < Group < Group < Group | NodeMaterial:ShadowMaterial | opaque side0 zw | OrthographicCamera",
      "n": 3,
      "newShaders": 3,
      "frames": [31, 1531, 1681]
    },
    {
      "k": "feral-motion-echo < Scene | MeshBasicMaterial | transparent side0 no-zw | scene",
      "n": 1,
      "newShaders": 1,
      "frames": [512]
    }
  ],
  "first": [
    {"frame": 19, "obj": "zombie-skin < Group < Scene", "kind": "SkinnedMesh", "mat": "MeshStandardNodeMaterial", "state": "opaque side0 zw", "cam": "scene", "newShaders": "v"},
    {"frame": 31, "obj": "marine-shadow < Group < Group < Group", "kind": "SkinnedMesh", "mat": "NodeMaterial:ShadowMaterial", "state": "opaque side0 zw", "cam": "OrthographicCamera", "newShaders": "v"},
    {"frame": 34, "obj": "zombie-skin < Group < Scene", "kind": "SkinnedMesh", "mat": "MeshStandardNodeMaterial", "state": "opaque side0 zw", "cam": "scene", "newShaders": "v"},
    {"frame": 203, "obj": "zombie-skin < Group < Scene", "kind": "SkinnedMesh", "mat": "MeshStandardNodeMaterial", "state": "opaque side0 zw", "cam": "scene", "newShaders": "v"},
    {"frame": 288, "obj": "zombie-skin < Group < Scene", "kind": "SkinnedMesh", "mat": "MeshStandardNodeMaterial", "state": "opaque side0 zw", "cam": "scene", "newShaders": "v"},
    {"frame": 341, "obj": "zombie-skin < Group < Scene", "kind": "SkinnedMesh", "mat": "MeshStandardNodeMaterial", "state": "opaque side0 zw", "cam": "scene", "newShaders": "v"},
    {"frame": 512, "obj": "feral-motion-echo < Scene", "kind": "SkinnedMesh", "mat": "MeshBasicMaterial", "state": "transparent side0 no-zw", "cam": "scene", "newShaders": "vf"},
    {"frame": 541, "obj": "zombie-skin < Group < Scene", "kind": "SkinnedMesh", "mat": "MeshStandardNodeMaterial", "state": "opaque side0 zw", "cam": "scene", "newShaders": "v"},
    {"frame": 583, "obj": "zombie-skin < Group < Scene", "kind": "SkinnedMesh", "mat": "MeshStandardNodeMaterial", "state": "opaque side0 zw", "cam": "scene", "newShaders": "v"},
    {"frame": 627, "obj": "zombie-skin < Group < Scene", "kind": "SkinnedMesh", "mat": "MeshStandardNodeMaterial", "state": "opaque side0 zw", "cam": "scene", "newShaders": "v"},
    {"frame": 676, "obj": "zombie-skin < Group < Scene", "kind": "SkinnedMesh", "mat": "MeshStandardNodeMaterial", "state": "opaque side0 zw", "cam": "scene", "newShaders": "v"},
    {"frame": 1015, "obj": "zombie-skin < Group < Scene", "kind": "SkinnedMesh", "mat": "MeshStandardNodeMaterial", "state": "opaque side0 zw", "cam": "scene", "newShaders": "v"}
  ]
}
```

### Verbatim `prof.pipelines` — Run 2 (`qa/2026-10-20-AG-107/run-2.log`)

```json
{
  "made": 24,
  "released": 0,
  "withNewShaders": 24,
  "top": [
    {
      "k": "zombie-skin < Group < Scene | MeshStandardNodeMaterial | opaque side0 zw | scene",
      "n": 21,
      "newShaders": 21,
      "frames": [134, 228, 334, 468, 556, 605]
    },
    {
      "k": "marine-shadow < Group < Group < Group | NodeMaterial:ShadowMaterial | opaque side0 zw | OrthographicCamera",
      "n": 2,
      "newShaders": 2,
      "frames": [30, 1680]
    },
    {
      "k": "feral-motion-echo < Scene | MeshBasicMaterial | transparent side0 no-zw | scene",
      "n": 1,
      "newShaders": 1,
      "frames": [503]
    }
  ],
  "first": [
    {"frame": 30, "obj": "marine-shadow < Group < Group < Group", "kind": "SkinnedMesh", "mat": "NodeMaterial:ShadowMaterial", "state": "opaque side0 zw", "cam": "OrthographicCamera", "newShaders": "v"},
    {"frame": 134, "obj": "zombie-skin < Group < Scene", "kind": "SkinnedMesh", "mat": "MeshStandardNodeMaterial", "state": "opaque side0 zw", "cam": "scene", "newShaders": "v"},
    {"frame": 228, "obj": "zombie-skin < Group < Scene", "kind": "SkinnedMesh", "mat": "MeshStandardNodeMaterial", "state": "opaque side0 zw", "cam": "scene", "newShaders": "v"},
    {"frame": 334, "obj": "zombie-skin < Group < Scene", "kind": "SkinnedMesh", "mat": "MeshStandardNodeMaterial", "state": "opaque side0 zw", "cam": "scene", "newShaders": "v"},
    {"frame": 468, "obj": "zombie-skin < Group < Scene", "kind": "SkinnedMesh", "mat": "MeshStandardNodeMaterial", "state": "opaque side0 zw", "cam": "scene", "newShaders": "v"},
    {"frame": 503, "obj": "feral-motion-echo < Scene", "kind": "SkinnedMesh", "mat": "MeshBasicMaterial", "state": "transparent side0 no-zw", "cam": "scene", "newShaders": "vf"},
    {"frame": 556, "obj": "zombie-skin < Group < Scene", "kind": "SkinnedMesh", "mat": "MeshStandardNodeMaterial", "state": "opaque side0 zw", "cam": "scene", "newShaders": "v"},
    {"frame": 605, "obj": "zombie-skin < Group < Scene", "kind": "SkinnedMesh", "mat": "MeshStandardNodeMaterial", "state": "opaque side0 zw", "cam": "scene", "newShaders": "v"},
    {"frame": 708, "obj": "zombie-skin < Group < Scene", "kind": "SkinnedMesh", "mat": "MeshStandardNodeMaterial", "state": "opaque side0 zw", "cam": "scene", "newShaders": "v"},
    {"frame": 717, "obj": "zombie-skin < Group < Scene", "kind": "SkinnedMesh", "mat": "MeshStandardNodeMaterial", "state": "opaque side0 zw", "cam": "scene", "newShaders": "v"},
    {"frame": 1508, "obj": "zombie-skin < Group < Scene", "kind": "SkinnedMesh", "mat": "MeshStandardNodeMaterial", "state": "opaque side0 zw", "cam": "scene", "newShaders": "v"},
    {"frame": 1561, "obj": "zombie-skin < Group < Scene", "kind": "SkinnedMesh", "mat": "MeshStandardNodeMaterial", "state": "opaque side0 zw", "cam": "scene", "newShaders": "v"}
  ]
}
```

### Verbatim `prof.pipelines` — Run 3 (`qa/2026-10-20-AG-107/run-3.log`)

```json
{
  "made": 22,
  "released": 0,
  "withNewShaders": 22,
  "top": [
    {
      "k": "zombie-skin < Group < Scene | MeshStandardNodeMaterial | opaque side0 zw | scene",
      "n": 20,
      "newShaders": 20,
      "frames": [22, 49, 280, 322, 347, 489]
    },
    {
      "k": "marine-shadow < Group < Group < Group | NodeMaterial:ShadowMaterial | opaque side0 zw | OrthographicCamera",
      "n": 1,
      "newShaders": 1,
      "frames": [32]
    },
    {
      "k": "feral-motion-echo < Scene | MeshBasicMaterial | transparent side0 no-zw | scene",
      "n": 1,
      "newShaders": 1,
      "frames": [431]
    }
  ],
  "first": [
    {"frame": 22, "obj": "zombie-skin < Group < Scene", "kind": "SkinnedMesh", "mat": "MeshStandardNodeMaterial", "state": "opaque side0 zw", "cam": "scene", "newShaders": "v"},
    {"frame": 32, "obj": "marine-shadow < Group < Group < Group", "kind": "SkinnedMesh", "mat": "NodeMaterial:ShadowMaterial", "state": "opaque side0 zw", "cam": "OrthographicCamera", "newShaders": "v"},
    {"frame": 49, "obj": "zombie-skin < Group < Scene", "kind": "SkinnedMesh", "mat": "MeshStandardNodeMaterial", "state": "opaque side0 zw", "cam": "scene", "newShaders": "v"},
    {"frame": 280, "obj": "zombie-skin < Group < Scene", "kind": "SkinnedMesh", "mat": "MeshStandardNodeMaterial", "state": "opaque side0 zw", "cam": "scene", "newShaders": "v"},
    {"frame": 322, "obj": "zombie-skin < Group < Scene", "kind": "SkinnedMesh", "mat": "MeshStandardNodeMaterial", "state": "opaque side0 zw", "cam": "scene", "newShaders": "v"},
    {"frame": 347, "obj": "zombie-skin < Group < Scene", "kind": "SkinnedMesh", "mat": "MeshStandardNodeMaterial", "state": "opaque side0 zw", "cam": "scene", "newShaders": "v"},
    {"frame": 431, "obj": "feral-motion-echo < Scene", "kind": "SkinnedMesh", "mat": "MeshBasicMaterial", "state": "transparent side0 no-zw", "cam": "scene", "newShaders": "vf"},
    {"frame": 489, "obj": "zombie-skin < Group < Scene", "kind": "SkinnedMesh", "mat": "MeshStandardNodeMaterial", "state": "opaque side0 zw", "cam": "scene", "newShaders": "v"},
    {"frame": 538, "obj": "zombie-skin < Group < Scene", "kind": "SkinnedMesh", "mat": "MeshStandardNodeMaterial", "state": "opaque side0 zw", "cam": "scene", "newShaders": "v"},
    {"frame": 875, "obj": "zombie-skin < Group < Scene", "kind": "SkinnedMesh", "mat": "MeshStandardNodeMaterial", "state": "opaque side0 zw", "cam": "scene", "newShaders": "v"},
    {"frame": 1272, "obj": "zombie-skin < Group < Scene", "kind": "SkinnedMesh", "mat": "MeshStandardNodeMaterial", "state": "opaque side0 zw", "cam": "scene", "newShaders": "v"},
    {"frame": 1273, "obj": "zombie-skin < Group < Scene", "kind": "SkinnedMesh", "mat": "MeshStandardNodeMaterial", "state": "opaque side0 zw", "cam": "scene", "newShaders": "v"}
  ]
}
```

## 3. `GP-19944` Brute Walking Side-View Visual Check (`qa/2026-10-20-AG-107/gp19944-brute-walk-side.png`)

- **Setup:** Opened `index.html?inspect` on the real GPU (`WebGPURenderer`), ran `DWInspect.show('zombie.brute', { mode: 'walk', view: 'side', instant: true })` with `grid` overlay on, stepped `1.2 s` of game time, framed at `{ yaw: 90, pitch: 4, margin: 1.15 }`, and saved `qa/2026-10-20-AG-107/gp19944-brute-walk-side.png` (and `review/zombie-feet-GP19944/brute-walk-after.png`).
- **Comparison against `qa/2026-10-19-AG-86/shots/gp19929-brute-walk-side.png`:** The +1 cm walking hip trim lifts the Brute's planted left sole so it rests cleanly on the ground grid without dipping below the floor plane, and without introducing any visible float/gap. Model budget remains `1 mesh, 1 drawable, 5,896 tris, 1 material`.
