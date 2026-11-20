# antigravity — AG-317 The 5080 look of the play build — 2026-11-16
Changed:          Look-only RTX 5080 WebGPU inspection of the play build (`High`, fresh `#modeHunt` run, Nights 1 & 2 crowds, 4 lights, 90 validated 1280×720 PNGs + 7 contact sheets in `review/AG-317/`; zero game code modified).
Files:            review/AG-317/sheet-0-nights1-2-crowd-4lights.jpg, review/AG-317/sheet-a1-shambler-rebuild.jpg, review/AG-317/sheet-a2-brute-and-vertex-colours.jpg, review/AG-317/sheet-b-chainsaw-grip-and-rev.jpg, review/AG-317/sheet-c-rotary-light-press.jpg, review/AG-317/sheet-d-3p-shambler-aim-20shots.jpg, review/AG-317/sheet-e-night2-crowd-fps.jpg, review/AG-317/summary.json, review/AG-317/shots/*.png (90 files)
Tests:            not run (look-only 5080 inspection + exclusive Night 2 rAF FPS benchmark via `crew.mjs slot run`; Rule 16 observed: 1 browser instance per lease, `--exclusive` for FPS)
Screenshots:      review/AG-317/sheet-0-nights1-2-crowd-4lights.jpg, review/AG-317/sheet-a1-shambler-rebuild.jpg, review/AG-317/sheet-a2-brute-and-vertex-colours.jpg, review/AG-317/sheet-b-chainsaw-grip-and-rev.jpg, review/AG-317/sheet-c-rotary-light-press.jpg, review/AG-317/sheet-d-3p-shambler-aim-20shots.jpg, review/AG-317/sheet-e-night2-crowd-fps.jpg (and all 90 full frames in review/AG-317/shots/)
Not verified:     Full `npm test` suite (cloud gate)
Requests:         Sent `AG-317 sheet: the play build on the 5080` to `claude`
Contract changes: none

---

## Verdict & What Jerry Would Hit in Tonight's Playtest (Top Priority)

**Verdict:** Playable, zero page/WebGPU errors (`0` runtime pipeline stalls during Night 2 waves), and the new shambler, feral (`a8b02705e`), brute (`v20`), and rotary light press all read cleanly across all four lights. **Three things Jerry can notice or hit during his playtest:**

1. **1P Night 2 Crowd FPS on `High` (`25.1 fps` median, `10.3 fps` 1% low — vs `39.4 fps` in 3P):**
   - Looking level across the yard at the Night 2 crowd (`31` zombies) in **1P** puts the forest horizon (`150 m` foliage + `2048` sun shadow) behind the crowd: draws rise from `260` (`1.04M` tris) in 3P to **`613` (`2.71M` tris)** in 1P (`r:render` avg `21.3 ms`), pulling 1P median down to **`25.1 fps`** (`sheet-e-night2-crowd-fps.jpg`). Both 1P and 3P also had `2` minor V8 GC hitches right at `100.6–105.5 ms` (`~21–24 MB` heap freed, `0` new pipelines).
2. **Known High-3P Aim Miss (`8/20` misses overall — mostly `7/10` between the shambler's knees from behind):**
   - Head skims are largely solved by the crown fit (**`9/10` hit**, only `1/10` missed at the top `4 mm` crown apex where the upward muzzle-to-hit ray grazed over the skull).
   - **Shooting low from behind (`7/10` missed into ground):** when the high-3P cursor lands in the gap between the shambler's knees/shins/thighs (`x ± 0..7 cm`), `rayPickZombie` misses both leg colliders and `aimKind: 'assist'` places `aimTarget` near ground centerline `(zX, gy, zZ)` between his parted ankles — sending the bullet cleanly between his legs into the dirt `~4.5 m` ahead (`sheet-d-3p-shambler-aim-20shots.jpg`). Center head/torso controls hit `4/4`.
3. **Chainsaw Throttle & Index Curl Visibility in Live 1P (`FOV 48`) and 3P (`sheet-b-chainsaw-grip-and-rev.jpg`):**
   - On the **1P `viewmodel` rig** (verified via lifted `info.tune` inspection in `saw-1p-grip-inspect-{idle,rev}-noon.png`), the fist wraps the slimmed `38 mm` rear grip, the index pad sits on the yellow throttle at idle (`0 rad`), and revving turns the throttle back **`0.35 rad`** with the index finger curling cleanly with it (zero clipping).
   - However, at the default **1P gameplay camera** (`VIEW_FOV.chainsaw = 48`, `hip.at = [0.33, -0.37, -0.60]`), the entire rear handle, right fist, and yellow throttle sit **below the bottom-right viewport edge** (only the front-hoop left hand, cowling, bar, shake, and two-stroke smoke show). In **3P** (`saw-3p-close-{idle,rev}-noon.png`), the world saw's yellow throttle is static and the firing hand is a closed fist behind the trigger.

---

## What I Looked At (By Item)

- **Fresh Run & Nights 1–2 Crowd in 4 Lights (`review/AG-317/sheet-0-nights1-2-crowd-4lights.jpg`):**
  - Booted at `High` (`scale 1`, `MSAA`, `bloom`, `shadow 2048`, `foliage 150`, grade `1.05/1.15`), fresh `#modeHunt` airborne insertion (`11.6 s` deploy), Night 1 (`15` shamblers) and Night 2 (`15` shamblers + `4` rebuilt ferals in initial ring; `31` in full push) in 3P and 1P across `noon`, `overcast`, `dusk`, `night`. Crowd contact spacing (`ZP2 stage 1`) forms a clean ring with zero body-in-body overlap.
- **(a) Rebuilt Shambler, Brute (`v20`), and Zombie Vertex Colours at 3, 8, 20 m (`sheet-a1-shambler-rebuild.jpg`, `sheet-a2-brute-and-vertex-colours.jpg`):**
  - **Shambler (`18,560` tris, `1` skinned draw):** gaunt rounded skull, scalp-to-bone patch, deep glowing eyes in sunken sockets, wet tongue clearly visible on the open gape floor (`shambler-close-head-front-noon.png`), **all 3 white molars standing clearly in the `+x` torn cheek hollow** (`shambler-close-cheek-left-molars-noon.png`), recessed `-x` neck bite, and **rounded work-boot rocker soles** sitting `+8.53 mm` clear of terrain standing and mid-stride (`shambler-close-boots-{rocker,stride}-noon.png`, zero ground sink).
  - **Brute rebuild (`15,638` tris, `1` skinned draw):** low scarred skull sunk into thick neck/traps under heavy brow, deep glowing eyes readable at 3/8/20 m day & night, torn jaw with rooted broken upper/lower teeth (`brute-close-head-jaw-{noon,night}.png`), continuous muscular arms/legs with veins and skin splits, and strapped rear metal backplate (`brute-close-back-armor-noon.png`).
  - **Zombie vertex colours at 3 / 8 / 20 m:** `zombie-skin` carries `vertexColors: true` on all merged rigs; the **brute** exhibits smooth per-vertex bruised/mottled skin gradients (`30` distinct sampled RGB values across joints, harness, and upper-arm tears) that read clearly at `3 m` and `8 m` and blend naturally into silhouette at `20 m`; the **shambler** currently carries `5` flat part-batched vertex colors (ready for smooth skin paint).
- **(b) Chainsaw Grip, Index on Throttle & Rev (`sheet-b-chainsaw-grip-and-rev.jpg`):**
  - Checked in 1P and 3P across `noon`, `overcast`, `dusk`, `night`, plus lifted 1P rear-grip inspection (`saw-1p-grip-inspect-{idle,rev}-noon.png`) and 0.95 m 3P hand close-ups (`saw-3p-close-{idle,rev}-{noon,dusk}.png`). Engine shake (`0.4` idle -> `1.0` rev) and blue-grey exhaust puffs read cleanly in both views; see visibility note #3 above.
- **(c) Rotary Gun (`minigun`) 1P Light Press Under the Gun (`sheet-c-rotary-light-press.jpg`):**
  - 6-frame filmstrip (`t = 0.00, 0.08, 0.15, 0.23, 0.36, 0.52 s`) + 4-light peak press (`t = 0.235 s`). Pressing `2` slides the support hand down off the left vertical fore-grip, routes it cleanly **under** the drum and receiver (zero pass through carry handle or drum, sight picture completely clear), presses the right-side switch with the index fingertip pad at `t = 0.225 s` (`Light ON` tactical HUD + flashlight cone active on target at dusk/night), and returns cleanly to the fore-grip by `0.51 s`.
- **(d) High-3P Shambler Aim Check (`sheet-d-3p-shambler-aim-20shots.jpg`):**
  - 20 single rested `pistol` shots from the standard high-3P camera at `8.0 m` (`10` skimming rounded head rim/crown/temple + `10` aimed at/between knees from behind) + `4` center controls.
- **(e) Night 2 Crowd FPS (`sheet-e-night2-crowd-fps.jpg`):**
  - Measured in `--exclusive` game-test slot on genuine `requestAnimationFrame` (no `raf=timer`) at `1280×720` `High` WebGPU.

---

## Numbers

- **Build hashes verified during look:** `index.html` `759804a8`, `studio/zombie-humanoids.js` `350e4694` (`a8b02705e` feral + shambler), `studio/zombie-brute.js` `7e4e2fa3`, `game/viewmodel.js` `578eac51`, `game/viewmodel-poses.js` `0271df61`.
- **Captures:** `90` PNGs (`1280×720`), `0` blank frames, `0` duplicate SHAs, `0` page errors. Distinct 4-light mean pixel luminance confirmed (e.g. Night 2 crowd 3P: `noon 65.44`, `overcast 45.77`, `dusk 33.69`, `night 24.55`).
- **Rotary 1P light press (`minigun`):** `lp.at = 0.195 s`, `lp.total = 0.510 s`; peak contact at `0.225 s`, index pad-to-switch gap **`0.10 mm`**, switch travel **`1.00 / 1.00 mm`**.
- **Chainsaw 1P throttle:** `triggerRotX` **`0.0000 -> 0.3500 rad`**, `throttleLockRotX = 0.1200 rad`, `vmTriggerPull` `0 -> 1`.
- **High-3P 20-shot aim check (`pistol`, `8 m`):**
  - Total: **`12 / 20` hits, `8 / 20` misses (`7` into ground, `1` over top crown)**; controls **`4 / 4` hits**.
  - Head rim skim: **`9 / 10` hits, `1 / 10` miss** (`head-crown-top` at `headMaxY - 4 mm`, `aimKind: 'zombie'`, skimmed over skull).
  - Between knees from behind: **`3 / 10` hits, `7 / 10` misses into ground** (`x = 0, ±4 cm` at `y = 0.28..0.68 m` all missed via `aimKind: 'assist'` centerline ankle snap; `x = ±7..12 cm` hit leg colliders).
- **Night 2 Crowd FPS (`High`, RTX 5080 WebGPU, `--exclusive`):**
  - **3P Night 2 Crowd (`31` alive: `27` shambler, `4` feral; `24.05 s`, `862` frames):** median **`39.4 fps`** (`25.40 ms`), 1% low **`14.0 fps`** (`71.68 ms`), worst **`105.5 ms`** (`260` draws, `1,038,396` tris, `0` new pipelines). **Hitches > 100 ms (`2`):**
    1. `105.5 ms` at `t = 2.19 s` (frame `83`, `30` alive, right after pistol kill/corpse creation on frame `82`: `r:render 17.2 ms, m:hold 5.5 ms, zombies 3.8 ms`, GPU queue/compositor wait outside JS tick).
    2. `100.6 ms` at `t = 15.82 s` (frame `581`, `25` alive: **V8 GC freed `20.73 MB`**, `r:render 13.4 ms, zombies 5.0 ms`).
  - **1P Night 2 Crowd (`31` alive; `19.24 s`, `434` frames):** median **`25.1 fps`** (`39.85 ms`), 1% low **`10.3 fps`** (`97.04 ms`), worst **`105.0 ms`** (`613` draws, `2,706,062` tris, `0` new pipelines; `r:render` avg `21.33 ms`, `aim+climb` avg `3.86 ms`, `r:matrices` avg `3.64 ms`). **Hitches > 100 ms (`2`):**
    1. `101.2 ms` at `t = 2.41 s` (frame `44`, `29` alive, pistol kill + `corpseDelta: 1` + **V8 GC freed `21.95 MB`**, `r:render 49.8 ms`).
    2. `105.0 ms` at `t = 15.38 s` (frame `329`, `27` alive: **V8 GC freed `23.98 MB`**, `r:render 39.1 ms, r:matrices 7.8 ms, viewmodel 7.3 ms`).
  - **3P Night 2 Cap-48 Stress (`48` alive: `41` shambler, `7` feral; `12.8 s`, `516` frames):** median **`40.3 fps`** (`24.8 ms`), 1% low **`14.2 fps`** (`70.4 ms`), worst **`90.7 ms`** (`268` draws, `1,527,460` tris, **`0` hitches > 100 ms**, `0` new pipelines).

---

## Not Verified
- Full `npm test` regression suite (run in Claude 2 / Director cloud).
- Smooth per-vertex painted skin on the shambler (not enabled yet in `52513082e`/`a8b02705e`; only the brute carries smooth painted vertex skin so far).
