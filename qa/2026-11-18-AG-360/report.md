# AG-360 — GP-20154 v17 CaveGuard `Hunt26` Visual Review (`REVIEW ONLY`)

- **Task ID**: `AG-360`
- **Order / Feature**: `GP-20154` (CaveGuard v17 local-terrain support + coupled limb IK in actual normal Hunt camera; answering ChatGPT's request `"Eyes GP154 v17 actual Hunt26: local terrain contacts fixed, transient windup202"`)
- **Scope**: Read-only visual inspection of [all26-hunt-before-after.jpg](../../review/GP-20154/hunt-motion-v17-pair-v1/all26-hunt-before-after.jpg) and all 26 RAW WebGPU PNGs (`13 before` / `13 after` across `stand`, `gallop`, `decelerate`, `windup`, `strike`, `flinch`, `recover`, including `after/07-windup-f202.png`, `after/08-windup-f235.png`, `after/09-strike-f247.png`, and `after/02-gallop-f054.png`), cross-checked against [independent-provenance-contact-audit.json](../../review/GP-20154/hunt-motion-v17-pair-v1/independent-provenance-contact-audit.json), [receipt.json](../../review/GP-20154/hunt-motion-v17-pair-v1/receipt.json), and [exact-review-v17.diff](../../review/GP-20154/exact-review-v17.diff). Zero game/review source files edited; no new browser/game launch run (`"No new game needed"`).

> **Review Limits**: Fixed-seed 348-frame (`60 Hz`) Hunt recipe with `GP-20153` shape `1983bc04` (`12` actor draws). Does **not** validate HTML HUD, full AI/pathfinding, scripted drag/carry/throw (note ChatGPT's separate default-story scope blocker), other variants, `npm test`, or `ABAB` performance / `surfaceAt` callback cost (`5,528..21,008` queries/frame, mean `12,361.86`). Planted foot slide remains RED under the original predicate (no waiver).

---

## 1. Visual Comparison Sheets Generated
- [sheet-v17-hunt-part1-stand-gallop-decel.jpg](sheet-v17-hunt-part1-stand-gallop-decel.jpg) (`1270x3608`): Tight matched `before` vs `after` crops for `00-stand-f030` through `06-decelerate-f190` with per-frame `C5` red counts and terrain clearances.
- [sheet-v17-hunt-part2-windup-strike-recover.jpg](sheet-v17-hunt-part2-windup-strike-recover.jpg) (`1270x3094`): Tight matched `before` vs `after` crops for `07-windup-f202` through `12-recover-f348` (including `08-windup-f235` and `09-strike-f247`).
- [sheet-v17-hunt-zoom-key-frames.jpg](sheet-v17-hunt-zoom-key-frames.jpg) (`1110x2830`): High-magnification `before` vs `after` comparison for `00-stand-f030`, `02-gallop-f054`, `07-windup-f202`, `08-windup-f235`, `09-strike-f247`, and `12-recover-f348`.
- [closeup-pixel-8frames.png](closeup-pixel-8frames.png) (`1058x3766`) & [closeup-paws-feet-8frames.png](closeup-paws-feet-8frames.png) (`738x2470`): Pixel-exact (`NEAREST`) limb, paw, claw, foot, and head inspection crops.

---

## 2. Provenance & Numerical Context Verified
- **Served sources & camera parity** ([independent-provenance-contact-audit.json](../../review/GP-20154/hunt-motion-v17-pair-v1/independent-provenance-contact-audit.json)):
  - `before`: `index.html` `d408ca79...`, `world/cave-guardian.js` `3212699f...`, shape `1983bc04...`.
  - `after`: `index.html` `1e185477...` (1 added CRLF line), `world/cave-guardian.js` `9172b8e8...`, shape `1983bc04...` (identical).
  - `birthExact: true`, `originExact: true`, `gfxExact: true`, `projectionExact: true`, `cameraRawExact: false` (delta `0.0000602 m` / `0.000487 deg`), `pageErrors: []`, `errors: []`.
- **Original `C5` & terrain clearances across all 348 frames** ([receipt.json](../../review/GP-20154/hunt-motion-v17-pair-v1/receipt.json)):
  - `originalC5` angular reds: `2453 -> 0` (`afterAngularReds: 0`).
  - Terrain vertex minima vs BOTH smooth & drawn ground: `before` `wristL -42.38 mm, wristR -83.71 mm, ankleL -105.04 mm, ankleR -92.40 mm` -> `after` `wristL +7.04 mm, wristR +7.33 mm, ankleL +0.18 mm, ankleR +1.22 mm`, `afterTerrainRedRows: 0`, `afterUnresolved: []`, `invalidSurfaceSamples: 0`.
  - Coupled sole horizontal advance (`<= 10 cm` budget): used only `0.025 m` (`2.5 cm`) on `footR` in frames `197..201, 203, 205`; frame `202` cleared via `tiltUsed = 0.04` (`+13.54 mm`, `advanceUsed = 0`, `legR.plantar = -29.9 deg` inside `[-30, 50]`). Largest single-frame joint delta across all 348 frames is `15.9 deg` at the `decelerate -> windup` transition (`f=191`), with smooth continuity around `f197..205`.
- **Planted slide remains RED (no waiver)**: `L: 5.45 m/s (21/27 red) -> 3.78 m/s (3/4 red)` vs `0.3 m/s` bar; `R: 4.90 m/s (9/17 red) -> null (0 eligible consecutive pairs)`.

---

## 3. Visual Findings by Phase (`before` vs `after`)

### What Improved Visually (No NEW Regressions Found)
1. **Local terrain contacts across all 13 Hunt frames (`00-stand-f030`, `02-gallop-f054`, `07-windup-f202`, `12-recover-f348`)**:
   - **Stand (`00-stand-f030.png`)**: In `before`, both hind feet sink `-87.4 / -69.9 mm` into the grass and `wristR` clips `-2.5 mm`. In `after`, both hands (`+8.81 / +8.83 mm`) and both hind feet (`+3.00 / +3.00 mm`) rest cleanly on the slope with grounded contact shadows and full claw visibility.
   - **Gallop (`01-gallop-f042.png`..`05-gallop-f090.png`)**: In `before/02-gallop-f054.png` (and `05-gallop-f090.png`), the foreground right forepaw plunges `-83.15 mm` (`-57.59 mm`) into the hillside (`wristL -30.67 / -34.38 mm`), while `01-gallop-f042` and `04-gallop-f078` bury the hind feet (`-77.9 / -61.6 mm` and `-13.2 / -45.7 mm`). In `after/02-gallop-f054.png`, both forepaws plant cleanly on top of the grass (`+8.12 / +8.68 mm`) with zero wrist/forearm burial; across all five gallop frames (`01..05`), all four limbs stay clear above the terrain (`>= +2.92 mm`).
   - **Transient windup `f202` (`07-windup-f202.png`) & `windup`/`strike` (`08-windup-f235.png`, `09-strike-f247.png`, `10-strike-f253.png`)**: In `before`, `footR` sinks `-67.1..-67.4 mm` (`footL -10.6 mm`) into the slope. In `after/07-windup-f202.png`, both hind feet sit cleanly on the grass (`ankleL +3.00 mm`, `ankleR +13.54 mm`, all three claws and rear dewclaw visible above turf), and remain cleanly planted at `+3.00 / +3.00 mm` in `08-windup-f235`, `09-strike-f247`, and `10-strike-f253`.
   - **Flinch & Recover (`11-flinch-f288.png`, `12-recover-f348.png`)**: Eliminates `before` `-53.9 / -62.0 mm` right-foot burial (`after: +9.21 / +3.00 mm`) and `recover` right-wrist clip (`-4.98 -> +8.87 mm`).
2. **Strike arm orientation & elbow alignment (`07-windup-f202`, `08-windup-f235`, `09-strike-f247`, `10-strike-f253`)**:
   - In `before`, `armR` hyperextends (`elbow -10.8 deg`) with `shRot +80..+85.3 deg` and `wristFlex +18.0..+22.9 deg`, bending the hand awkwardly straight upward like a flat vertical stop-paddle (`before/07-windup-f202.png`, `08-windup-f235.png`).
   - Unlike `v7` (`AG-359`, where `shRot -85` flipped `handR` palm-up with claws pointing skyward), `after` keeps `shRot ~ 0 deg` and `elbow +10.8..+12.7 deg`, aiming `handR` palm-down/forward (`wristFlex -44.9..-55.5 deg`) with fingers and claws sweeping down-forward toward the Marine (`after/07-windup-f202.png`, `08-windup-f235.png`, `09-strike-f247.png`, `10-strike-f253.png`).
   - Brace arm `armL` hangs cleanly beside/in front of the left leg (`+99.6..+211.7 mm` above ground) with clear air gap from the thigh/knee.
3. **Head gaze & quadruped hind stance (`00..12`)**:
   - `neckFlex` drops from `74.7..87.8 deg` (skull buried staring at the ground in `before`) to `24.6..33.0 deg` across all 13 `after` frames, keeping the brow, glowing eyes, and fanged jaw visibly aimed toward the Marine.
   - Hind legs stay cleanly behind/under the hips (`stand z=0.2`, `gallop z=0.3+0.35*cw`, coupled pelvis crawl) rather than tucking under the ribcage as in `v7`, with `0` elbow-to-knee clipping and intact `Body7` stone plates, spine spikes, and moss (`12` draws, `0` seam splits).

### Pre-Existing / Deferred Notes (Not New v17 Regressions)
1. **Untouched `guardianGrip(..., 'walk')` thumb & mid-swing finger tips (`01-gallop-f042`, `02-gallop-f054`, `04-gallop-f078`, `12-recover-f348`)**:
   - Because `guardianGrip` in `'walk'` mode rotates `fingers` by `-1.35 * amt` (`tip -1.5 * amt`) and `thumb` by `-0.6 * amt` (`tip -0.9 * amt`) in `-X`, when `shRot = 0` and the hand is flat (`wristFlex -2.4..-40.5 deg`), the **thumb cone stands vertically upward on top/front of planted fists** (`after/02-gallop-f054.png`, `12-recover-f348.png`) and **mid-swing fingertips flare slightly up-forward at `air > 0` (`amt = 0.35`)** (`after/01-gallop-f042.png`, `04-gallop-f078.png`). This is pre-existing `guardianGrip` behavior (`D-203` explicit claw-curl step still pending), not a `v17` inversion or clipping regression.
2. **Windup-to-strike forward reach similarity (`08-windup-f235` -> `09-strike-f247` -> `10-strike-f253`)**:
   - `armR` remains extended toward the Marine across `f235..f253` (`shFlex +27.4 deg`, `elbow +10.8 deg`), with strike progression carried primarily by finger/claw closure and wrist height drop (`wristR +1297 -> +1053 -> +1023 mm`). This inherits the original `guardianRearGrab` reach profile (`before` `shFlex +20.9..+21.0 deg`), while cleanly fixing the `before` upward paddle wrist.
3. **Planted foot slide remains RED**: `L 3.78 m/s (3/4 red)` vs `0.3 m/s` bar (`R` `0` eligible pairs).

---

## 4. Verdict for ChatGPT & CLAUDE DIRECTOR
- **PASS for `GP-20154 v17` actual Hunt26 visual eye check (`REVIEW ONLY`)**: Local terrain contacts are visually clean across all 13 captured Hunt frames (`stand`, `gallop`, `decelerate`, transient `windup f202`, `strike`, `flinch`, `recover`) with **zero new clipping, axial inversion, ground burial, or silhouette regressions**. Resolves `v7`'s palm-up strike flip, upward-curled swing arm inversion, and cramped hind stance.
- **Explicit non-waivers**: Planted slide remains RED (`3.78 m/s`), `guardianGrip` walk thumb/claw curl awaits the D-203 claw-curl pass, and default-story caller scope, `npm test`, and `ABAB` `surfaceAt` performance cost remain open separately.
