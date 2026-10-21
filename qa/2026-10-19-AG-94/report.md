# AG-94 Report — `day5` Bench (`--prof --cpu`), `CL-214` 3× Night 20 Summary, & `CL-216` Utility Truck Live Look

- **Date**: 2026-10-19
- **Agent**: Antigravity
- **Task**: `AG-94`
- **GPU**: NVIDIA GeForce RTX 5080 (`WebGPU` backend, `1280×720`, `--gfx high`)

---

## 1. `CL-214` 3× Night 20 `--gfx high --prof --cpu` Summary & `census.draws`

All three JSON lines are in `qa/2026-10-19-AG-86/prof-lines.jsonl` (lines 9–11):

| Run | `fps` | `1% low` | `worst` (ms) | `hitches` | `draws` | `triangles` | `frameMs` | `tickMs` | `outsideMs` | `gpuMs` | `r:render` | `r:matrices` | `zombies` |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **Run 1 (Median)** | **49.9** | **28.9** | **28.3** | **2** | **395** | **631,175** | **20.04** | **17.81** | **2.24** | **0.34** | **9.74** | **1.93** | **2.67** |
| Run 2 | 52.6 | 31.6 | 32.4 | 1 | 408 | 621,293 | 19.01 | 16.82 | 2.18 | 0.34 | 9.57 | 1.92 | 2.15 |
| Run 3 | 48.6 | 29.6 | 28.5 | 2 | 396 | 674,732 | 20.58 | 17.68 | 2.90 | 0.33 | 9.51 | 1.88 | 2.86 |
| *Pre-CL-214 (AG-89)* | *45.5* | *24.7* | *36.2* | *3* | *468* | *648,478* | *21.98* | *19.22* | *2.76* | *0.36* | *10.89* | *2.27* | *2.67* |

- **Median Night 20 Change**: **`45.5 → 49.9 fps` (`+4.4 fps`)**, `1% low`: `24.7 → 28.9 fps` (`+4.2 fps`), `draws`: `468 → 395` (`-73 draws`), `r:render`: `10.89 → 9.74 ms` (`-1.15 ms`), `r:matrices`: `2.27 → 1.93 ms` (`-0.34 ms`).
- **`census.draws.byGroup` (Median Run 1, `main: 396`, `shadow: 0`)**:
  - `Group>tag-wall` (`house.group`): `145`
  - `Mesh` (loose meshes): `65.5`
  - `Group>fitted-pelvis` (`marine`): `54`
  - `ground-sectors`: `39`
  - `zombie (Group>zombie-eyes)`: `34`
  - `zombie (Group>demon-fire-fist)`: `32`
  - `Group`: `10`
  - `feral-motion-echo`: `5.5`
  - `rock-batch` (`CL-214`): **`4`** (down from `147` individual rock meshes; `41` of `47` cells culled)
  - `zombie (Group>concept-surface)`: `4`
  - `Group>bird-skin`: `2`
  - `zombie-stone`: `1`
- **`census.draws.byPart` (Top 20)**:
  1. `Mesh / (unnamed)`: `65.5`
  2. `ground-sectors / (unnamed)`: `39`
  3. `Group>tag-wall / (unnamed)`: `28`
  4. `Group>tag-wall / hq-damaged-terminal`: `25`
  5. `Group>fitted-pelvis / (unnamed)`: `24`
  6. `Group>tag-wall / hq-skull-intake`: `23`
  7. `Group>tag-wall / hq-armory`: `20`
  8. `zombie (Group>zombie-eyes) / zombie-eyes`: `17`
  9. `zombie (Group>zombie-eyes) / zombie-skin`: `17`
  10. `Group>tag-wall / fob-lockdown-door`: `16`
  11. `Group>tag-wall / hq-cif`: `15`
  12. `Group / (unnamed)`: `10`
  13. `Group>tag-wall / tag-wall`: `9`
  14. `Group>fitted-pelvis / rig-skin`: `8`
  15. `Group>tag-wall / hq-alarm-cabinet`: `8`
  16. `zombie (Group>demon-fire-fist) / demon-fire-fist`: `8`
  17. `zombie (Group>demon-fire-fist) / demon-horn`: `8`
  18. `zombie (Group>demon-fire-fist) / zombie-eyes`: `8`
  19. `zombie (Group>demon-fire-fist) / zombie-skin`: `8`
  20. `feral-motion-echo / feral-motion-echo`: `5.5`

---

## 2. `day5` Benchmark (`--scenario day5 --gfx high --prof --cpu`)

Appended as line 12 of `qa/2026-10-19-AG-86/prof-lines.jsonl` (and saved in `qa/2026-10-19-AG-94/day5-bench.json`):

- **`fps`**: **`59.5 fps`**
- **`1% low`**: **`43.6 fps`**
- **`worst`**: **`23.2 ms`** (`hitches: 1`)
- **`draws`**: **`324`** (`census.draws`: `main: 314`, `shadow: 13`)
- **`triangles`**: **`548,620`** (`zombies: 48`, `gfx: "high"`)
- **`prof`**:
  - `frameMs`: `16.81 ms`, `tickMs`: `14.99 ms`, `outsideMs`: `1.82 ms`, `gpuMs`: **`0.32 ms`** (`791` samples)
  - Top sections: `r:render: 8.80 ms` (`max: 16.2`), `r:matrices: 1.63 ms` (`max: 4.1`), `zombies: 1.18 ms` (`max: 11.5`), `m:hold: 0.83 ms`, `r:cull: 0.44 ms`, `m:pose: 0.42 ms`, `w:stairs+roof+birds+bugs+wildlife: 0.24 ms`, `drops+hud: 0.17 ms`, `w:treeFall+leaves+batches: 0.13 ms`, `hud+audio: 0.13 ms`, `tree+deck coll: 0.13 ms`, `w:minimap: 0.12 ms`.
- **`cpu` (Top Total)**:
  - `renderFrame`: `10.91 ms` (`render`: `8.73 ms`, `updateSceneMatrices`: `1.51 ms`, `sceneCull`: `0.26 ms`, `syncRigSkins`: `0.08 ms`)
  - `updateShadow`: `1.04 ms` (full daytime sun shadows active every frame)
  - `updateZombies`: `0.87 ms`
  - `holdWeapon`: `0.82 ms`

---

## 3. `CL-216` Utility Truck Day Mission (`t263` + Live Visual Look)

### 3.1 Automated Suite Check (`t263`)
Ran `node tools/tests/run-all.mjs t263 --agent antigravity --task AG-94` through the slot:
```text
check-players: 298 player.position reads, all in the allowed places
ok    t263    17 pass   0 fail  48.7s

1 checks: 17 pass, 0 fail
```

### 3.2 Live In-Game Visual & Telemetry Verification (`qa/2026-10-19-AG-94/verify-truck.mjs`)
- **Step 1 — At the Utility Truck Before Cutters (`~ site truck`)**:
  - `D.truck.built: true`, `locked: true`, `stage: "chained"`, `chainVisible: true`, `chainNodes: 1` (merged vertex-coloured mesh `truck-chain`), `reachBlockedBy: "locked"`.
  - Floating HUD prompt over the marine (`01-truck-chained-gameplay.png`): **`"CHAINED SHUT."`** (`D.prompt() === "Chained shut."`).
  - Close-up inspection (`02-truck-chained-closeup.png`): The steel link chain runs cleanly across the top lid and down both faces of the salvage toolbox with the brass padlock and shackle on the front (`+Z`) face.
- **Step 2 — At the Bolt Cutters by the Iron Cave Mouth (`~ site truck cutters`)**:
  - `cuttersVisible: true`, `cuttersNodes: 1` (merged vertex-coloured mesh `bolt-cutters`), `cuttersMatrixAutoUpdate: false`, `pos: (-160.66, 0.68, 86.82)`, `D.prompt(): "E — Take the bolt cutters"`.
  - Close-up inspection (`04-iron-cave-cutters-closeup.png`): The bolt cutters sit on the ground outside the cut iron bars of the mine mouth (`steel` jaws/shafts, red grips, dark pivot bolt), well clear of the cave mouth grab zone.
  - **Visual HUD Prompt Finding at the Cave Mouth (`03-iron-cave-cutters-gameplay.png`)**:
    - While `D.prompt()` (`truckPromptText()`) returns `"E — Take the bolt cutters"`, the floating HUD prompt (`#kioskPrompt`) in `updateKioskPrompt` (`index.html:28317` vs `28322`) evaluates `hushPrompt()` at line `28317` *before* `truckPromptText()` at line `28322`. Because the cutters sit `2.4 m` in front of the iron cave mouth, `hushPrompt()` wins and displays **`"THE HUSH IS FLAT. TOMORROW."`** over the marine instead of **`"E — Take the bolt cutters"`**! (Pressing `E` still takes the cutters immediately because the `keydown` listener at `27662` runs in capture phase, and the `"BOLT CUTTERS"` banner appears.) Moving `truckPromptText()` ahead of `hushPrompt()` (or checking `!truckPromptText()` before `hushPrompt()`) will let `"E — Take the bolt cutters"` show at the cave mouth.
- **Step 3 — Cutting the Chain (`05-truck-cutting-chain.png`)**:
  - After taking the cutters (`cuttersTaken: true`) and returning to `site truck`, `D.prompt()` reads `"Hold E — Cut the chain"`.
  - Holding `E` partway (`progress: 0.51`) updates the floating HUD prompt live to **`"CUTTING THE CHAIN… 51%"`** (`05-truck-cutting-chain.png`), and releasing `E` preserves progress (`0.51`).
- **Step 4 — Chain Cut, Alarm & Called Dead (`06-truck-cut-alarm-and-dead.png`)**:
  - Holding `E` to completion sets `stage: "alarm"` (`alarmRemainingS: 19.2`), hides the chain (`chainVisible: false`), unlocks the cache (`locked: false`, `reachBlockedBy: null`), and opens the normal `"Salvage the utility truck"` supply choice UI + **`"[E] TAKE SUPPLIES"`** floating prompt (`06-truck-cut-alarm-and-dead.png`).
  - `3` `z.truckCalled` zombies (`shambler`) spawned immediately on open ground at `39.0m`, `39.3m`, and `47.0m` (`remainingToCall: 3` of `6` for Day 1), visible approaching the truck in `06-truck-cut-alarm-and-dead.png`.
  - `0` page errors.
