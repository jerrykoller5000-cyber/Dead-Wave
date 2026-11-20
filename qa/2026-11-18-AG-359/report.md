# AG-359 — GP-20154 v7 CaveGuard `motion24` Visual Review (`REVIEW ONLY`)

- **Task ID**: `AG-359`
- **Order / Feature**: `GP-20154` (CaveGuard v7 IK/retarget + hand-floor diagnostic pair; answering ChatGPT's review request `"Eyes GP154 v7 CaveGuard actual motion24 RAW images; original joints0 and hand floor fixed; REVIEW ONLY"`)
- **Scope**: Visual inspection of all 24 RAW WebGPU frames (`12 before` / `12 after`) and `all24-before-after.jpg` in [review/GP-20154/candidate-diagnostic-pair-v7/](../../review/GP-20154/candidate-diagnostic-pair-v7/), cross-checked against [camera-source-provenance-audit.json](../../review/GP-20154/candidate-diagnostic-pair-v7/camera-source-provenance-audit.json), [original-foot-predicate-audit.json](../../review/GP-20154/candidate-diagnostic-pair-v7/original-foot-predicate-audit.json), [receipt.json](../../review/GP-20154/candidate-diagnostic-pair-v7/receipt.json), [results.json](../../review/GP-20154/candidate-diagnostic-pair-v7/results.json), and [exact-review-v7.diff](../../review/GP-20154/exact-review-v7.diff). Zero game/index/v7 files edited; no new game launch needed.

> **Review Limits**: Static paired PNGs (`before` vs `after` + 4 held native stand shots + 8 live recorded frames) do **not** validate full temporal smoothness, Hunt-camera gameplay, FPS, full restyle/art targets, claw curl, or ground-gait slide clearance (planted foot slide remains RED under both predicates; no waiver).

---

## 1. Visual Comparison Sheets Generated
- [sheet-v7-part1-stand-gallop106.jpg](sheet-v7-part1-stand-gallop106.jpg) (`1156x2892`): Side-by-side center crops for `front-noon`, `side-noon`, `back-noon`, `front-night-marine`, `motion-059-stand`, `motion-106-gallop`.
- [sheet-v7-part2-gallop-windup-strike-flinch.jpg](sheet-v7-part2-gallop-windup-strike-flinch.jpg) (`1156x2892`): Side-by-side center crops for `motion-116-gallop`, `motion-125-gallop`, `motion-135-gallop`, `motion-350-windup`, `motion-375-strike`, `motion-400-flinch`.

---

## 2. Provenance & Numerical Context Verified
- **Camera & render parity** ([camera-source-provenance-audit.json](../../review/GP-20154/candidate-diagnostic-pair-v7/camera-source-provenance-audit.json)): All 12 checked pairs `cameraExact: true`, `skinDraws: [2, 2]`, `missing: [0, 0]`, `birthExact: true`, `sameStats: [{"meshes": 3, "triangles": 12022}]` for both phases, `guardianHindFloorBytesExact: true`, `indexCRLFKept: true`. Both phases rendered on `WebGPU` (`height: 3.20236 m`, `hitH: 3.01035 m`, `pageErrors: []`).
- **Angular & hand-floor changes** ([receipt.json](../../review/GP-20154/candidate-diagnostic-pair-v7/receipt.json)):
  - `angularReds`: `before 3446` (478 live frames; `791` across 127 poses) -> `after 0` across all 478 live frames and 127 poses.
  - `minima` wrists (`live`): `before` `wristL -0.07915 m / wristR -0.04788 m` -> `after` `wristL +0.00717 m / wristR +0.00774 m` (`palmsNoWorseThanOld: true`).
  - `minima` ankles (`live`): `before` `ankleL -0.01057 m / ankleR -0.01201 m` -> `after` `ankleL -0.01048 m / ankleR -0.01044 m`.
- **Planted slide remains RED (no waiver)**:
  - Live C5 (`receipt.json`): `contactReds: 462 -> 259`, `maxPlantedSlide: ankleL 5.289 m/s, ankleR 5.393 m/s` (limit `0.3 m/s`; `before: 11.771 / 12.077 m/s`).
  - Original foot predicate ([original-foot-predicate-audit.json](../../review/GP-20154/candidate-diagnostic-pair-v7/original-foot-predicate-audit.json)): `after.feet.L` `plantedFrames: 24, soleTiltReds: 0 (max 8.2), throughReds: 0, slideReds: 12 (max 3.96 m/s)`; `after.feet.R` `plantedFrames: 23, soleTiltReds: 0 (max 8.3), throughReds: 0, slideReds: 15 (max 3.991 m/s)`; `after.bothOff`: `exceedingNamed: 0 (maxHeight 0.094, limit 0.3)`.

---

## 3. Visual Findings by Area (`before/*.png` vs `after/*.png`)

### What Improved Visually
1. **Hand floor contact in stand/idle frames** (`front-noon.png`, `side-noon.png`, `back-noon.png`, `motion-059-stand.png`, `motion-400-flinch.png`):
   - In `before/front-noon.png` and `before/side-noon.png`, knuckles/wrists dip visibly into the floor line (`wristMin` down to `-0.07915 m`).
   - In `after/front-noon.png`, `after/side-noon.png`, and `after/back-noon.png`, both palms/knuckles sit cleanly on the floor surface (`wristMin +0.00717 / +0.00774 m`) without clipping beneath the platform.
2. **Stand gaze pitch** (`front-noon.png`, `side-noon.png`, `front-night-marine.png`):
   - In `before/front-noon.png` and `before/front-night-marine.png`, the head pitches sharply downward (`neckFlex: 81.2 deg`), staring toward the floor.
   - In `after/front-noon.png`, `after/side-noon.png`, and `after/front-night-marine.png`, the combined neck+head `aimPitch` clamp keeps the gaze level forward toward the Marine and camera, improving silhouette readability in night-scale comparison.
3. **Body7 geometry & armor integrity** (`front-noon.png`, `side-noon.png`, `back-noon.png`, and all `motion-*.png`):
   - Zero torn bark strips, floating stone plates, or seam splits across all 24 shots (`3` meshes, `12,022` tris unchanged).

### Visual Regressions / Motion Issues Observed (`after`)
1. **High-severity visual defect — Windup & strike right arm/hand flips palm-up (`after/motion-350-windup.png`, `after/motion-375-strike.png`)**:
   - In `before/motion-350-windup.png` and `before/motion-375-strike.png`, the near striking arm (`armR`) reaches down-left with `shRot: +82.1 / +81.9 deg` and `elbow: -10.8 deg`, keeping the wrist oriented downward/forward with claws angled low toward the target/ground.
   - In `after/motion-350-windup.png` and `after/motion-375-strike.png`, `caveguardArmIK` bends `elbow` to `+10.8 deg` and `Math.sign(twist) * 85` lands `armR.shRot` at **`-83.9 / -85.0 deg`** (an ~166 deg axial inversion relative to `before`). With `wristFlex` still `+22.7 / +22.9 deg`, **the entire right forearm and hand roll supinated/palm-up**, so the wrist grazes low while the **4 claws curl upward toward the sky** (`handR` clearly inverted at bottom-left in both frames; also note `armL.shRot` flips `+128.5 -> -50.8 / -51.5 deg`).
2. **High-severity visual defect — Gallop swing hands curl claws-up & elbows tuck medially (`after/motion-116-gallop.png`, `after/motion-125-gallop.png`, `after/motion-135-gallop.png`)**:
   - In `after/motion-135-gallop.png`, the gallop pole (`cave ? -side : ...`, `z = 0.2`) and `caveguardArmIK` (`elbow: +35.9 / +37.8 deg`, `shRot: +85 deg`, `wristFlex: +20.1 / +14.4 deg`) leave **both swinging forepaws (`armL` on viewer-left, `armR` on viewer-bottom-right) hooked claws-up into the air**. The same upward claw curl on `handR` is visible in `after/motion-116-gallop.png` (viewer-bottom-right).
   - Across `after/motion-106-gallop.png` and `after/motion-116-gallop.png`, medial poles (`pole = -side`) pull upper arms inward (`shAbd: -5.8 .. -15.2 deg` vs `before +15.2 .. +32.9 deg`) and bow the forearms outward below the elbow. While `106-gallop` looks tighter than `before`'s very wide elbow flare, `116-gallop` pinches the elbows awkwardly tight against the knees/thighs.
3. **Moderate-to-high visual defect — Stand & gallop hind legs tucked too far forward under the torso (`after/side-noon.png`, `after/front-noon.png`, `after/motion-059-stand.png`, `after/motion-116-gallop.png`..`after/motion-135-gallop.png`)**:
   - In `guardianStand` (`exact-review-v7.diff` line 141), moving hind-foot target `z` from `-0.25` to **`+0.55`** brings both hind feet 80 cm forward under the chest (`footL/R z: -0.340..+0.267` vs `before -1.157..-0.549`). In `after/side-noon.png`, the knees protrude forward nearly level with the forearms and the pelvis cantilevers out behind all four planted contacts; in `after/front-noon.png`, both hind feet sit tightly centered directly between the hands.
   - In `guardianGallop` (`exact-review-v7.diff` lines 115-116), replacing `z = (-0.15 + 1.0 * cw) * r - 0.25 * (1 - r)` (`2.0 m` sweep) with `z = (0.65 + 0.18 * cw) * r + 0.55 * (1 - r)` shrinks total hind-stride amplitude to **`0.36 m`**, pinning both hind feet forward beneath the ribcage (`125-gallop`, `135-gallop`). Visually, the gallop loses horizontal bounding extension (`before/motion-125-gallop.png`, `before/motion-135-gallop.png`) and reads like a stiff, short-chopped trot with both hind feet cramped near the wrists (`after/motion-135-gallop.png`) and **still slides red at `5.289 / 5.393 m/s`** (`3.96 / 3.991 m/s` original predicate).

---

## 4. Verdict / Actionable Summary for ChatGPT & Director
- **Pass for static visual cleanliness on stand/head/hand-floor**: Gaze pitch (`front-night-marine.png`, `front-noon.png`), wrist/hand ground clearance (`wristMin +0.0072 / +0.0077 m`), and `Body7` geometry/stone-plate retention all hold cleanly in v7.
- **Do NOT accept v7 pose/retarget as final motion visually**:
  1. `motion-350-windup.png` / `motion-375-strike.png` roll `armR` ~166 deg (`shRot: +82 -> -84/-85 deg`) into a broken palm-up/claws-up strike hand posture.
  2. `motion-135-gallop.png` (and `116-gallop` `handR`) leave the swinging hands hooked claws-up in midair under forward-flexed `caveguardArmIK` + `+85 deg` twist clamp.
  3. Moving hind targets forward (`stand z = +0.55`, `gallop z = 0.65 + 0.18 * cw`) cramps both hind feet forward under the chest in `side-noon.png` / `motion-059-stand.png`, kills `motion-116..135-gallop` stride extension, and leaves planted slide RED (`5.289 / 5.393 m/s` live, `3.96 / 3.991 m/s` original predicate).
