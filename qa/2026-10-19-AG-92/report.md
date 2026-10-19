# AG-92 — Four Prop Merges (`lily-pad`, `burrow`, `plot-marker`, `sato-*`) & Night 20 Census

**Date:** 2026-10-19  
**Agent:** Antigravity  
**Task:** `AG-92` (`AG-90`'s four prop merges, after `AG-94`)

---

## 1. Prop Merges & Before/After Node/Mesh Counts

All four prop families identified in `AG-90` were merged in `index.html` using `mergeParts` (or `bakeStatic` for `sato-note` where `paper` + `fold` share a `CanvasTexture` and `stone` uses a solid material), named, and frozen with `matrixAutoUpdate = false; updateMatrix()` once placed:

| Prop Family | Builder / Spawner (`index.html`) | Name | Before (Nodes / Meshes / `auto`) | After (Nodes / Meshes / `auto`) | Reduction |
| --- | --- | --- | --- | --- | --- |
| **Lily pads** (`6×`) | `makeLilyPadMesh` / `spawnOneLilyPad` | `lily-pad` | `228` / `216` / `228` (`38` / `36` each) | **`6` / `6` / `0`** (`1` / `1` / `0` each) | `-222` nodes, `-210` meshes, `-228` `auto` |
| **Burrows** (`3×` max) | `makeBurrowMesh` / `spawnBurrowAt` | `burrow` | `205` / `202` / `205` (`67–69` / `66–68` each) | **`3` / `3` / `0`** (`1` / `1` / `0` each; keeps `userData.kind`, `userData.mouthZ`) | `-202` nodes, `-199` meshes, `-205` `auto` |
| **Plot markers** (`6×`) | `ensurePlotMarkers` | `plot-marker` | `54` / `48` / `54` (`9` / `8` each) | **`6` / `6` / `0`** (`1` / `1` / `0` each) | `-48` nodes, `-42` meshes, `-54` `auto` |
| **Sato's note & props** | `buildSatoProps` / `placeSatoNote` | `sato-note`, `sato-hat`, `sato-stool`, `sato-claws`, `sato-trail` | `27` / `19` / `27` (`note: 4/3`, `hat: 4/3`, `stool: 5/4`, `claws: 13/8`, `trail: 1/1`) | **`7` / `6` / `0`** (`note: 3/2`, `hat: 1/1`, `stool: 1/1`, `claws: 1/1`, `trail: 1/1`) | `-20` nodes, `-13` meshes, `-27` `auto` |
| **Total (4 families)** | | | **`514` / `485` / `514`** | **`22` / `21` / `0`** | **`-492` nodes (`-95.7%`), `-464` meshes (`-95.7%`), `-514` `auto` (`-100%`)** |

- `disposeWildMesh` (`index.html:12423`) was also updated to exclude `burrowMergedMat` and `lilyMergedMat` from disposal when `clearWildlife()` or `removeBurrow()` runs.

---

## 2. Before-and-After Visual Verification (`qa/2026-10-19-AG-92/`)

Captured with deterministic `Math.random` seeding (`shoot-props.mjs before` / `shoot-props.mjs after`) from identical camera coordinates and angles:

- **Lily pad (`lily-pad`)**: `qa/2026-10-19-AG-92/01-lilypad-before.png` vs `qa/2026-10-19-AG-92/01-lilypad-after.png` — identical pad silhouette, notched rim, 7 radiating veins, companion pad, 4 sepals, 14 petals, and golden stamen core.
- **Burrow (`burrow`)**: `qa/2026-10-19-AG-92/02-burrow-before.png` vs `qa/2026-10-19-AG-92/02-burrow-after.png` — identical dark hole & throat, earthen rim mounds, arched roots, downhill spoil fan, clods, stones, and grass tufts.
- **Plot markers (`plot-marker`)**: `qa/2026-10-19-AG-92/03-plot-markers-before.png` vs `qa/2026-10-19-AG-92/03-plot-markers-after.png` — identical 6 grave plots south of the old graveyard, 4 wooden corner pegs + 4 string lines each.
- **Sato's props (`sato-note`, `sato-hat`, `sato-stool`, `sato-claws`)**: `qa/2026-10-19-AG-92/04-sato-props-before.png` vs `qa/2026-10-19-AG-92/04-sato-props-after.png` — identical overturned 3-legged field stool, 4 two-tone claw gouges, folded paper sketch with stone paperweight, and crown-down boonie hat.

---

## 3. Night 20 `--gfx high --prof --cpu` Benchmark & Census Comparison

Appended as line 13 of `qa/2026-10-19-AG-86/prof-lines.jsonl` (and saved to `qa/2026-10-19-AG-92/night20-bench.json`):

| Metric | Before `AG-92` (Line 11, `22:47Z`) | After `AG-92` (Line 13, `23:30Z`) | Delta |
| --- | --- | --- | --- |
| **Mean FPS** | `48.6 fps` | **`50.3 fps`** | **`+1.7 fps`** |
| **1% Low / Worst Frame** | `29.8 fps` / `32.8 ms` | **`31.6 fps` / `26.6 ms`** | **`+1.8 fps` / `-6.2 ms`** |
| **Hitches (`>33.3 ms`)** | `3` | **`2`** | **`-1`** |
| **Draw Calls (`draws`)** | `396` (`main: 396`, `shadow: 13`) | **`390` (`main: 395`, `shadow: 13`)** | **`-6`** |
| **`frameMs` / `tickMs` / `outsideMs`** | `20.56` / `17.51` / `3.05 ms` | **`19.88` / `16.81` / `3.07 ms`** | **`-0.68 ms` frame / `-0.70 ms` tick** |
| **`r:render` / `zombies` / `r:matrices`** | `9.74` / `2.70` / `1.77 ms` | **`9.23` / `2.58` / `1.74 ms`** | **`-0.51 ms` `r:render`** |
| **`gpuMs`** | `0.36 ms` | **`0.35 ms`** (`635` samples) | `-0.01 ms` |
| **Total Scene Nodes (`census.nodes`)** | `10,203` | **`9,566`** | **`-637` nodes** |
| **`matrixAutoUpdate` Nodes (`census.auto`)** | `7,535` | **`6,987`** | **`-548` `auto` nodes** |
| **Total Scene Meshes (`census.meshes`)** | `7,819` | **`7,257`** | **`-562` meshes** |
| **Shown Nodes (`census.shown`)** | `3,615` | **`3,320`** | **`-295` shown nodes** |
| **Unnamed `Group` Bucket (`count` / `nodes` / `auto` / `meshes`)** | `492` / `2,354` / `698` / `1,381` | **`477` / `2,084` / `426` / `1,135`** | **`-15` groups, `-270` nodes, `-272` `auto`, `-246` meshes** |

### Census — Top Scene Node Owners (`census.groups`)
1. `Group` (unnamed): `count: 477`, `nodes: 2,084`, `auto: 426`, `meshes: 1,135`, `culled: 18`
2. `zombie (Group>zombie-eyes)`: `count: 37`, `nodes: 1,225`, `auto: 884`, `meshes: 710`, `culled: 0`
3. `Mesh` (top-level meshes): `count: 1,159`, `nodes: 1,160`, `auto: 735`, `meshes: 1,160`, `culled: 307`
4. `Group>fitted-pelvis` (marine): `count: 1`, `nodes: 751`, `auto: 751`, `meshes: 537`
5. `butterfly`: `count: 14`, `nodes: 560`, `auto: 560`, `meshes: 518`
6. `Group>bird-skin`: `count: 10`, `nodes: 490`, `auto: 490`, `meshes: 450`
7. `Group>fish-skin`: `count: 14`, `nodes: 462`, `auto: 462`, `meshes: 434`, `culled: 14`
8. `bee`: `count: 10`, `nodes: 410`, `auto: 410`, `meshes: 380`
9. `zombie (Group>demon-fire-fist)`: `count: 8`, `nodes: 296`, `auto: 296`, `meshes: 152`
10. `Group>rabbit-skin`: `count: 3`, `nodes: 231`, `auto: 231`, `meshes: 192`
11. `bird-flock`: `count: 3`, `nodes: 224`, `auto: 224`, `meshes: 136`
12. `relay-vault`: `count: 1`, `nodes: 219`, `auto: 219`, `meshes: 206`, `culled: 1`

### Census — Draws by Owner (`census.draws.byGroup`)
- `Group>tag-wall` (HQ compound): `145` draws (`(unnamed): 28`, `hq-damaged-terminal: 25`, `hq-skull-intake: 23`, `hq-armory: 20`, `fob-lockdown-door: 16`, `hq-cif: 15`, `tag-wall: 9`, `hq-alarm-cabinet: 8`, `hq-designation: 1`)
- `Mesh` (top-level meshes): `54.5` draws
- `Group>fitted-pelvis` (player marine): `52` draws (`(unnamed): 24`, `rig-skin: 8`, `wrist: 4`, `balaclava: 3`, `live-sleeve-live: 2`, `live-trouser-leg-live: 2`, `marine-facial-features: 2`, `magazineBody: 1`, `pgb-patch: 1`, `open-molded-holster: 1`, `marine-waist-live: 1`, `live-seat-live: 1`, `chapel-glow: 1`, `medium-fade: 1`)
- `zombie (Group>zombie-eyes)`: `44` draws (`zombie-skin: 24`, `zombie-eyes: 20`)
- `ground-sectors`: `39` draws
- `zombie (Group>demon-fire-fist)`: `32` draws (`zombie-eyes: 8`, `(unnamed): 8`, `zombie-skin: 8`, `demon-fire-fists: 8`)
- `Group` (unnamed): `10` draws
- `feral-motion-echo`: `9.5` draws
- `rock-batch`: `4` draws
- `zombie (Group>concept-surface)`: `4` draws
- `spitter-acid-trail-batch`: `1` draw
