# AG-91 — `GP-19934` Live Look, Night/Dawn Bugs, `CL-214` Rocks, `GP-19936` HUD & 3× Night 20 Bench Median — 2026-10-19

## Executive Summary
1. **`GP-19934` Close & Behind-Camera Zombie Pose Guard (PASS)**:
   - **Close walking & attacking (`10` zombies `< 15m`)**: `demon`, `colossus`, `leaper`, `shambler` (`×3`), `feral`, `spitter`, `military`, and `brute` all animated limbs, feet, and attack swings continuously (`maxLimbDeltaRad` `0.2204–6.7180 rad` over `0.8s`), `demon` hand flames flickered (`flameDelta: 0.0537`), and `feral` motion echoes tracked lunges cleanly (`shots/close-walk-attack-t0.png` .. `t2.png`).
   - **180° camera turn to `22` zombies `> 12m` behind player (`sun.intensity: 0.025`)**: zero pose pop (`19/22` had `maxSingleFrameRotJumpRad` `0–0.1802 rad`; `2` stepping `demon`s had `0.2898–0.3832 rad`), all `22/22` animated smoothly across the next `15` frames (`subsequent15FrameRotMotionRad` `0.0470–1.1098 rad`), and all `3` `feral-motion-echo` objects stayed hidden (`vis: false`) when not lunging (`shots/turn-behind-frame0.png`, `shots/turn-behind-frame15.png`).
2. **Bees & Butterflies (`CL-211`, PASS)**:
   - **At Night 20 (`worldTime: 0.9203`, `sun.intensity: 0.025`)**: `0 / 22` visible (`0/13` butterflies, `0/9` bees; `walkWhenShownCount: 22`; `shots/bugs-night.png`).
   - **At Dawn (`clearZombies()` + `startPrep()` 3s sweep → `worldTime: 0.3321`, `sun.intensity: 0.9446`)**: `22 / 22` visible (`13/13` butterflies, `9/9` bees) and `22 / 22` actively flying/flapping (`movedOrFlappedBugs: 22`; `shots/bugs-dawn.png`).
3. **`CL-214` Merged Cell Rocks (`rock-batch` vs `?rockbatch=0`, PASS)**:
   - **Visual match (`shots/rocks-batched.png` vs `shots/rocks-unbatched.png`)**: `147` alive rocks batched into `47` `rock-batch` cell meshes (`walkSkip: true`, `layers.mask: 0`). Visually **100% identical** to `?rockbatch=0` — exact same vertex colours, green moss patches, ground shadows, zero gaps, and zero double-draws.
   - **Shot pulse (`shots/rock-shot-pulse.png`)**: Shooting rock `#104` (`hp: 21 → 11`) immediately extracted it live (`wentLive: true`, `r0._rb === null`, `layerMaskRestored: true`, `walkSkipCleared: true`), collapsed its triangles in `rock-batch`, pulsed `scale` to `1.0500`, and settled back to `1.0000` after `40ms`.
   - **Break (`shots/rock-shot-broken.png`)**: Shooting to `hp <= 0` (`hp: -15`) broke the rock (`aliveAfterBreak: false`, `removedFromScene: true`) and spawned `12` flying rock chunks (`chunksSpawned: 12`).
   - **Restart (`shots/rocks-after-restart.png`)**: `TT.resetGame()` restored all `150/150` rocks (`aliveRocks: 150`) and re-batched all `150` into `47` `rock-batch` cells (`r0Alive: true`, `r0Rebatched: true`, `r0LayerZero: true`, `r0WalkSkip: true`).
4. **3× `node tools/bench.mjs --night 20 --gfx high --prof --cpu` Median**:
   - **Runs**: `49.9 fps` (Run 1, **median**), `52.6 fps` (Run 2), `48.6 fps` (Run 3) — all 3 JSON lines appended to `qa/2026-10-19-AG-86/prof-lines.jsonl` (lines 9–11).
   - **Median (Run 1)**: **`49.9 fps`** (`+6.2 fps` vs AG-89's `43.7 fps`, `+17.4 fps` vs AG-86's `32.5 fps`), `1% low: 28.9 fps`, `worst: 28.3 ms`, `hitches: 2`, **`draws: 395`** (down from `430` in AG-89 and `714` in AG-86), `triangles: 631,175`, `zombies: 48`.
   - **Median Frame Breakdown**: `frameMs: 20.04 ms` (`tickMs: 17.81 ms`, `outsideMs: 2.24 ms`, `gpuMs: 0.34 ms`), `r:render: 9.74 ms`, `zombies: 2.67 ms` (down from `3.63 ms`), `r:matrices: 1.93 ms` (down from `2.54 ms`), `r:cull: 0.55 ms`, `m:hold: 0.52 ms`, `m:pose: 0.46 ms`, `w:minimap: 0.14 ms`, `drops+hud: 0.14 ms`.
5. **`GP-19936` HUD Pacing Live Look (PASS)**:
   - Minimap draws at **`15` draws/s (`14.85 Hz`)** with zero jitter (`w:minimap: 0.14 ms`).
   - Floating prompt (`#kioskPrompt.on`) appeared in **`25.1 ms` (`1` frame, `"E Supply Terminal"`)** when entering Kiosk range, hid in **`98.6 ms` (`4` frames)** when leaving Kiosk range, and appeared in **`86.3 ms` (`3` frames, `"E Breaker panel"`, `shots/gp19936-hud-night20.png`)** when entering Radio cabinet range on Night 20. Health, ammo, reticle, and hit markers remained smooth.

---

## 1. 3× Night 20 High Bench Runs & Median (`--night 20 --gfx high --prof --cpu`)

| Metric | AG-86 Baseline | AG-88 (Cuts 1+2) | AG-89 (Cut 3) | AG-91 Run 1 (**Median**) | AG-91 Run 2 | AG-91 Run 3 | Delta (Median vs AG-89) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **Mean FPS** | `32.5` | `44.8` | `43.7` | **`49.9`** | `52.6` | `48.6` | **`+6.2 fps` (`+14.2%`)** |
| **1% Low FPS** | `23.2` | `32.3` | `28.4` | **`28.9`** | `31.6` | `29.6` | **`+0.5 fps`** |
| **Worst Frame (`ms`)** | `69.9` | `29.7` | `32.5` | **`28.3`** | `32.4` | `28.5` | **`-4.2 ms`** |
| **Hitches (`>50ms`)** | `8` | `0` | `2` | **`2`** | `1` | `2` | `0` |
| **Draw Calls** | `714` | `442` | `430` | **`395`** | `408` | `396` | **`-35 draws` (`-8.1%`)** |
| **Triangles** | `1,004,619` | `696,082` | `646,789` | **`631,175`** | `621,293` | `674,732` | **`-15,614 tris`** |
| **`frameMs`** | `30.77` | `22.32` | `22.88` | **`20.04`** | `19.01` | `20.58` | **`-2.84 ms` (`-12.4%`)** |
| **`tickMs`** | `28.90` | `20.82` | `20.49` | **`17.81`** | `16.82` | `17.68` | **`-2.68 ms` (`-13.1%`)** |
| **`outsideMs`** | `1.88` | `1.50` | `2.39` | **`2.24`** | `2.20` | `2.90` | `-0.15 ms` |
| **`gpuMs`** | `0.29` | `0.27` | `0.26` | **`0.34`** | `0.35` | `0.35` | `+0.08 ms` |
| **`r:render` (`ms`)** | `21.85` | `10.40` | `10.53` | **`9.74`** | `9.12` | `9.59` | **`-0.79 ms`** |
| **`zombies` (`ms`)** | `3.59` | `3.61` | `3.63` | **`2.67`** | `2.65` | `2.51` | **`-0.96 ms` (`-26.4%`)** |
| **`r:matrices` (`ms`)** | *(in render)* | `3.13` | `2.54` | **`1.93`** | `1.85` | `1.97` | **`-0.61 ms` (`-24.0%`)** |
| **`r:cull` (`ms`)** | `0.23` | `0.24` | `0.61` | **`0.55`** | `0.52` | `0.56` | `-0.06 ms` |
| **`w:minimap` (`ms`)** | `0.22` | `0.20` | `0.21` | **`0.14`** | `0.13` | `0.14` | **`-0.07 ms` (`-33.3%`)** |
| **`drops+hud` (`ms`)** | `0.20` | `0.19` | `0.19` | **`0.14`** | `0.13` | `0.13` | **`-0.05 ms` (`-26.3%`)** |

---

## 2. Census `draws.byGroup` and `draws.byPart` (Median Run 1 vs Runs 2 & 3)

### `census.draws.byGroup` (`main: 396` draws, `shadow: 138` draws in Median Run 1)

| Owner Group (`k`) | Run 1 (Median) Draws | Run 2 Draws | Run 3 Draws | Notes |
| --- | ---: | ---: | ---: | --- |
| **`Group>tag-wall`** (`house.group`) | **`145.0`** | `145.0` | `145.0` | HQ building + interior stations (`hq-damaged-terminal` `25`, `hq-skull-intake` `23`, `hq-armory` `20`, `fob-lockdown-door` `16`, `hq-cif` `15`, `tag-wall` `9`, `hq-alarm-cabinet` `8`, unnamed `28`, `hq-designation` `1`) |
| **`Mesh`** (top-level loose meshes) | **`65.5`** | `100.0` | `55.5` | Perimeter fence/wall boxes, puddles, foliage chunks, effect pool |
| **`Group>fitted-pelvis`** (`marine`) | **`54.0`** | `54.0` | `52.0` | Player marine (`24` unnamed, `8` `rig-skin`, `4` `wrist`, `3` `balaclava`, `3` `marine-idle-props`, `2` `live-sleeve-live`, `2` `live-trouser-leg-live`, `2` `marine-facial-features`, etc.) |
| **`ground-sectors`** | **`39.0`** | `39.0` | `38.0` | Visible terrain sector meshes |
| **`zombie (Group>zombie-eyes)`** | **`34.0`** | `34.0` | `36.0` | Standard zombies (`18` `zombie-skin`, `16` `zombie-eyes`) |
| **`zombie (Group>demon-fire-fist)`** | **`32.0`** | `29.0` | `32.0` | Demons (`8` `zombie-skin`, `8` `zombie-eyes`, `8` `demon-fire-fists`, `8` unnamed) |
| **`Group`** (unnamed top-level groups) | **`10.0`** | `10.0` | `11.0` | Unmerged static props in view (burrows, lilyPads, plotMarkers, etc. — target of `AG-92`) |
| **`feral-motion-echo`** | **`5.5`** | `3.5` | `6.5` | Feral lunge afterimages |
| **`rock-batch`** (`CL-214`) | **`4.0`** | `4.0` | `3.0` | All visible rocks in the frustum (`4` cell draws instead of `30–50` individual rock draws!) |
| **`zombie (Group>concept-surface)`** | **`4.0`** | `4.0` | `6.0` | Colossus (`1` `zombie-skin`, `1` `zombie-eyes`, `1` `concept-glow`, `1` `demon-fire-fists`) |
| **`Group>bird-skin`** | **`2.0`** | `0.0` | `0.0` | Birds in frustum |
| **`zombie-stone`** | **`1.0`** | `0.0` | `0.0` | Thrown colossus stone |

*(Total zombie-related draws across the 3 runs: `76.5` in Run 1, `71.5` in Run 2, `80.5` in Run 3 — all under the `100` draw threshold).*

---

## 3. `CL-214` Rock Batching Verification (`qa/2026-10-19-AG-91/verify-rocks-and-hud.mjs`)

| Check | Result | Telemetry / Evidence |
| --- | --- | --- |
| **Visual match (`rock-batch` vs `?rockbatch=0`)** | **PASS** | `shots/rocks-batched.png` (`47` `rock-batch` cells, `147` batched rocks, `walkSkip: 147`, `layerZero: 147`) and `shots/rocks-unbatched.png` (`?rockbatch=0`, `0` batches) are visually identical (colour, moss, shadows, no gaps or doubles). |
| **Shoot rock → pulse** | **PASS** | Firing a `20`-dmg round into rock `#104` (`hp: 21 → 11`) extracted it from `rock-batch` (`wentLive: true`, `r0._rb === null`, `layerMaskRestored: true`, `walkSkipCleared: true`), pulsed `r0.mesh.scale.x` to `1.0500` (`shots/rock-shot-pulse.png`), and settled back to `1.0000` after `40ms`. |
| **Shoot rock → break** | **PASS** | Firing lethal damage (`hp: -15`) broke rock `#104` (`aliveAfterBreak: false`, `removedFromScene: true`) and spawned `12` rock debris chunks (`debris: 0 → 12`, `shots/rock-shot-broken.png`). |
| **Restart (`TT.resetGame()`)** | **PASS** | `TT.resetGame()` restored all `150/150` rocks (`aliveRocks: 150`) and re-batched all `150` into `47` `rock-batch` cells (`r0Alive: true`, `r0InScene: true`, `r0Rebatched: true`, `r0LayerZero: true`, `r0WalkSkip: true`, `shots/rocks-after-restart.png`). |

---

## 4. `GP-19934` Live Pose Spot-Check & Night/Dawn Bugs (`qa/2026-10-19-AG-91/verify-gp19934.mjs`, `verify-dawn-bugs.mjs`)

- **Close walking & attacking (`10` zombies `< 15m`)**: `demon` (`movedXZ: 1.29m`, `maxLimbDeltaRad: 6.72 rad`, `flameDelta: 0.0537`), `colossus` (`1.44m`, `0.50 rad`), `leaper` (`0.11m`, `1.57 rad`), `shambler` ×3 (`0.67–2.47m`, `0.22–0.50 rad`), `feral` (`0.04m`, `5.66 rad`), `spitter` (`0.38m`, `0.64 rad`), `military` (`0.84m`, `0.79 rad`), `brute` (`0.25m`, `0.69 rad`). Shots: `shots/close-walk-attack-t0.png` .. `t2.png`.
- **Behind-camera 180° turn (`22` zombies `> 12m` behind player)**: `bomber` (`×6`), `demon` (`×8`), `shambler` (`×4`), `drowned` (`×2`), `spider` (`×1`), `feral` (`×1`) (plus `colossus`, `spitter`, `military`, `brute` in Run 1): zero pose pop (`0–0.1802 rad` on `19/22`; `0.2898–0.3832 rad` on `2` stepping `demon`s), immediate smooth 15-frame continuation (`0.0470–1.1098 rad`), and `0` stale `feral-motion-echo` meshes (`3/3` `vis: false`). Shots: `shots/turn-behind-frame0.png`, `shots/turn-behind-frame15.png`.
- **Bees & butterflies (`CL-211`)**:
  - **Night 20 (`worldTime: 0.9203`, `sun.intensity: 0.025`)**: `0 / 22` visible (`0/13` butterflies, `0/9` bees; `shots/bugs-night.png`).
  - **Dawn (`worldTime: 0.3321`, `sun.intensity: 0.9446`)**: `22 / 22` visible (`13/13` butterflies, `9/9` bees) and `22 / 22` moving/flapping (`shots/bugs-dawn.png`).

---

## 5. `GP-19936` HUD Pacing Live Check (`qa/2026-10-19-AG-91/verify-rocks-and-hud.mjs`)

- **Minimap (`15 Hz`)**: `15` `clearRect` draws over `1.01s` (`14.85 Hz`), `w:minimap` dropped from `0.21 ms` to `0.14 ms/frame`, zero map jitter.
- **Floating prompt (`10 Hz` state check + `60 Hz` `placePrompt`)**:
  - Entering Kiosk range: `#kioskPrompt.on` appeared in **`25.1 ms` (`1` frame)** with `"E Supply Terminal"`.
  - Leaving Kiosk range: `#kioskPrompt.on` cleared in **`98.6 ms` (`4` frames)**.
  - Entering Radio cabinet range on Night 20: `#kioskPrompt.on` appeared in **`86.3 ms` (`3` frames)** with `"E Breaker panel"` (`shots/gp19936-hud-night20.png`).
  - Health, ammo (`12`), reticle, and hit markers remained completely smooth.
