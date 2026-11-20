# AG-361 — GP-20154 v19 CaveGuard `Hunt26` Current J164 Base Visual Review (`REVIEW ONLY`)

- **Task ID**: `AG-361`
- **Order / Feature**: `GP-20154` (CaveGuard v19 rebased onto landed `J164` `72e543b4` six-file Marine base, answering ChatGPT's request `"Eyes GP154 v19 current J164 base Hunt26; same boss trajectory, updated marine"`)
- **Scope**: Read-only visual inspection of [all26-hunt-before-after.jpg](../../review/GP-20154/hunt-motion-v19-pair-v1/all26-hunt-before-after.jpg), RAW frames (`after/07-windup-f202.png`, `after/08-windup-f235.png`, `after/09-strike-f247.png`, `after/00-stand-f030.png`, `after/02-gallop-f054.png`, `before/07-windup-f202.png`), [independent-provenance-contact-audit.json](../../review/GP-20154/hunt-motion-v19-pair-v1/independent-provenance-contact-audit.json), [receipt.json](../../review/GP-20154/hunt-motion-v19-pair-v1/receipt.json), [owner-look.json](../../review/GP-20154/hunt-motion-v19-pair-v1/owner-look.json), and [exact-review-v19.diff](../../review/GP-20154/exact-review-v19.diff). Zero game/review source files edited; no new game/browser launched (`NO new game needed`).

> **Review Limits**: Fixed-seed 348-frame (`60 Hz`) Hunt recipe with immutable `GP-20153` shape `1983bc04` and current `J164` `72e543b4` six-file Marine in both `before` and `after`. Does **not** validate full AI/pathfinding, HTML HUD, scripted drag/carry/throw, other variants, `npm test`, or `ABAB` performance (`surfaceAt` `5,528..21,008` queries/frame, mean `12,361.86`). Original planted-foot slide remains RED under the retained predicate (no waiver).

---

## 1. Visual Comparison Sheets Generated
- [sheet-v19-hunt-part1-stand-gallop-decel.jpg](sheet-v19-hunt-part1-stand-gallop-decel.jpg) (`1270x3608`): Tight matched `before` (`live 72e`) vs `after` (`v19 2f23`) crops for `00-stand-f030` through `06-decelerate-f190`.
- [sheet-v19-hunt-part2-windup-strike-recover.jpg](sheet-v19-hunt-part2-windup-strike-recover.jpg) (`1270x3094`): Tight matched `before` vs `after` crops for `07-windup-f202` through `12-recover-f348` (including `08-windup-f235` and `09-strike-f247`).
- [closeup-pixel-8frames.png](closeup-pixel-8frames.png) (`1058x3766`): Pixel-exact (`NEAREST`) 8-frame inspection across `00`, `01`, `02`, `04`, `07`, `08`, `09`, `12`.
- [closeup-v17-vs-v19-marine-j164.png](closeup-v17-vs-v19-marine-j164.png) (`1144x1824`): Side-by-side `v17` (pre-J164 Marine) vs `v19` (landed `J164` `72e` Marine) across `00-stand-f030`, `07-windup-f202`, `08-windup-f235`, `09-strike-f247`.

---

## 2. Provenance & Numerical Context Verified
- **Served sources & camera parity** ([independent-provenance-contact-audit.json](../../review/GP-20154/hunt-motion-v19-pair-v1/independent-provenance-contact-audit.json)):
  - `before`: `index.html` `6d22f79e...` (`72e543b4`), `world/cave-guardian.js` `3212699f...`, shape `1983bc04...`.
  - `after`: `index.html` `2f23e522...` (rebased `boss` ctor profile + terrain hook), `world/cave-guardian.js` `73ac9cf2...`, shape `1983bc04...`.
  - `birthExact: true`, `originExact: true`, `gfxExact: true`, `projectionExact: true`, `cameraRawExact: false` (delta `0.000000226 m` / `0.00000241 deg`), `errors: []`, `sourceErrors: []`.
- **Trajectory & contact parity vs `v17`**:
  - Direct comparison of all 348 `after` frames (`receipt.json` vs `v17` `receipt.json`): `max reading diff = 0.0`, `max terrain diff = 0.0` (`bossTrajectoryExactToV18: readingsExact=true, terrainExact=true, supportExact=true`).
  - `originalC5`: `2453 -> 0` across 348 frames (`afterAngularReds: 0`).
  - Terrain minima (`before -> after`): `wristL -42.38 -> +7.04 mm`, `wristR -83.71 -> +7.33 mm`, `ankleL -105.04 -> +0.18 mm`, `ankleR -92.40 -> +1.22 mm`, `afterUnresolved: []`, `invalidSurfaceQueries: 0`.
  - Key requested shots: `07-windup-f202` (`wL +99.57, wR +786.05, aL +3.00, aR +13.54 mm`), `08-windup-f235` (`wL +209.81, wR +1297.02, aL +3.00, aR +3.00 mm`), `09-strike-f247` (`wL +211.43, wR +1052.78, aL +3.00, aR +3.00 mm`).
- **Planted slide remains RED (no waiver)**: `L 5.45 m/s (21/27) -> 3.78 m/s (3/4 red)` vs `0.3 m/s` bar; `R 4.90 m/s (9/17) -> null (0 eligible consecutive pairs)`.

---

## 3. Visual Findings in Current `J164` (`72e`) Context
1. **Boss trajectory, contacts, and readability match `AG-360` (`0` new clips/inversions)**:
   - Every CaveGuard frame (`00..12`) reproduces `v17` cleanly: ground contacts hold on slope grass across `stand`, `gallop`, `decelerate`, `windup f202`, `strike`, `flinch`, and `recover`; `armR` sweeps palm-down/forward in `07-windup-f202`, `08-windup-f235`, `09-strike-f247`, and `10-strike-f253` without `before`'s upward stop-paddle bend or `v7`'s palm-up flip; `armL` hangs clear of the left leg; head gaze aims forward toward the Marine; `Body7` plates/spikes/moss remain intact.
2. **Updated `J164` `72e` Marine readable in Hunt context (`closeup-v17-vs-v19-marine-j164.png`)**:
   - Comparing `v17` vs `v19` at the player position, the landed `J164` Marine visibly shows the tapered trouser legs, slimmer lower boots, tighter hip pouches, and slightly smaller head/cap without any new overlap, detachment, weapon-aim clipping, or contrast/readability loss against the dirt path or grass, and clear spacing remains between the boss's extended right claws (`07-windup-f202`, `08-windup-f235`, `09-strike-f247`) and the player.
3. **Retained pre-existing notes (unchanged from `AG-360`, not regressions)**:
   - Untouched `guardianGrip(..., 'walk')` still leaves an upright thumb cone on planted fists (`02-gallop-f054`, `12-recover-f348`) and slightly upturned mid-swing fingertips (`01-gallop-f042`, `04-gallop-f078`) ahead of the `D-203` claw-curl step; `08..10` forward reach retains the original `guardianRearGrab` arm path; planted slide remains RED (`L 3.78 m/s`, `3/4` red; `R 0` eligible pairs).

---

## 4. Verdict for ChatGPT & CLAUDE DIRECTOR
- **PASS for `GP-20154 v19` current `J164` (`72e`) Hunt26 eye check (`REVIEW ONLY`)**: Zero new clipping, axial inversion, burial, or readability regressions in the current `72e` context; CaveGuard readings and terrain contacts match `v17` (`0.0` diff across all 348 frames) alongside the updated `J164` Marine.
- **Explicit non-waivers**: Planted slide remains RED (`3.78 m/s`), `D-203` claw curl/restyle remains separate, and original gates (`38/0` reported separately), `ABAB` performance batch, and full integration remain separate.
