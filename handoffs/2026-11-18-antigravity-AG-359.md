# antigravity — AG-359 GP154 v7 CaveGuard motion24 visual review (GP-20154) — 2026-11-18

Changed:
- Completed `REVIEW ONLY` visual inspection of all 24 RAW WebGPU paired PNGs (`12 before` / `12 after`) plus `all24-before-after.jpg` in `review/GP-20154/candidate-diagnostic-pair-v7/`, built two matched comparison sheets in `qa/2026-11-18-AG-359/`, and cross-checked findings against `receipt.json`, `results.json`, `camera-source-provenance-audit.json`, `original-foot-predicate-audit.json`, and `review/GP-20154/exact-review-v7.diff`. No production files, `index.html`, tests, or `review/GP-20154/` files were modified.
- Concrete visual findings (`before/*.png` vs `after/*.png`):
  - **Stand hand-floor clearance & head gaze improved**: In `after/front-noon.png`, `after/side-noon.png`, and `after/back-noon.png`, both wrists/palms sit cleanly on the ground surface without dipping under the floor plane (live `minima` `wristL: -0.07915 -> +0.00717 m`, `wristR: -0.04788 -> +0.00774 m`). In `after/front-noon.png`, `after/side-noon.png`, and `after/front-night-marine.png`, the head pitches level forward toward the Marine/camera (`aimPitch` clamp) instead of staring down at the floor (`before` `neckFlex: 81.2 deg`). `Body7` geometry and stone/bark/root parts (`3` meshes, `12,022` tris exact) show no seam splits or detached plates.
  - **Windup & strike right arm/hand rolls palm-up (HIGH)**: In `after/motion-350-windup.png` and `after/motion-375-strike.png`, `caveguardArmIK` + `guardianSupport` bends `elbow` forward (`-10.8 -> +10.8 deg`) and flips `armR.shRot` from `+82.1 / +81.9 deg` (`before`) to `-83.9 / -85.0 deg` (~166 deg axial flip), while `armL.shRot` flips `+128.5 -> -50.8 / -51.5 deg`. With `wristFlex` still `+22.7 / +22.9 deg`, the right forearm/hand rolls palm-up/supinated so `handR` claws hook skyward at bottom-left instead of striking downward/inward.
  - **Gallop forelimbs hook claws-up & tuck elbows medially (HIGH)**: In `after/motion-135-gallop.png` (and `armR` in `after/motion-116-gallop.png`), medial gallop poles (`pole = -side`) and forward-bent elbows (`elbow: +35.9 / +37.8 deg`, `shRot: +85 deg`, `wristFlex: +20.1 / +14.4 deg`) leave both swinging forepaws curled claws-up in midair, while `after/motion-106-gallop.png` and `after/motion-116-gallop.png` pull shoulders inward (`shAbd: -5.8 .. -15.2 deg` vs `before +15.2 .. +32.9 deg`) and pinch elbows close to the knees.
  - **Stand & gallop hind legs tucked too far forward under torso (MODERATE-HIGH)**: Moving hind targets forward in `guardianStand` (`z: -0.25 -> +0.55`) pulls hind feet `80 cm` forward beneath the chest in `after/side-noon.png`, `after/front-noon.png`, and `after/motion-059-stand.png` (`footL/R z: -0.340..+0.267` vs `before -1.157..-0.549`), folding knees level with the forearms while the pelvis cantilevers out behind all four contacts. In `guardianGallop`, `z = (0.65 + 0.18 * cw) * r + 0.55 * (1 - r)` compresses hind stride amplitude from `2.00 m` down to `0.36 m` (`after/motion-116-gallop.png`, `after/motion-125-gallop.png`, `after/motion-135-gallop.png`), losing horizontal bounding extension while planted slide remains RED (`5.289 / 5.393 m/s` live C5; `3.96 / 3.991 m/s` original foot predicate).

Files:
- `qa/2026-11-18-AG-359/report.md`
- `qa/2026-11-18-AG-359/build_review_sheet.py`
- `qa/2026-11-18-AG-359/sheet-v7-part1-stand-gallop106.jpg` (`1156x2892`)
- `qa/2026-11-18-AG-359/sheet-v7-part2-gallop-windup-strike-flinch.jpg` (`1156x2892`)
- `handoffs/2026-11-18-antigravity-AG-359.md`

Tests:
- Read-only inspection + verification of existing v7 diagnostic outputs (`review/GP-20154/candidate-diagnostic-pair-v7/{camera-source-provenance-audit.json,original-foot-predicate-audit.json,receipt.json,results.json}`): `complete: true`, `diagnosticCompleted: true`, `anatomyGreen: true`, `guardianPoseExact: true`, `cameraExact: true` on all `12` pairs (`skinDraws: [2, 2]`, `missing: [0, 0]`, `birthExact: true`, `sameStats: {meshes: 3, triangles: 12022}`), `pageErrors: []`, `angularReds: 3446 -> 0` (478 live frames), `contactReds: 462 -> 259` (`oldSlideStillRed: true`, `success: false`).
- Comparison sheet builder: `python qa/2026-11-18-AG-359/build_review_sheet.py` exited `0`.

Screenshots:
- Visually inspected all 24 RAW WebGPU PNGs (`review/GP-20154/candidate-diagnostic-pair-v7/{before,after}/{front-noon,side-noon,back-noon,front-night-marine,motion-059-stand,motion-106-gallop,motion-116-gallop,motion-125-gallop,motion-135-gallop,motion-350-windup,motion-375-strike,motion-400-flinch}.png`), `review/GP-20154/candidate-diagnostic-pair-v7/all24-before-after.jpg`, and both generated center-crop sheets (`qa/2026-11-18-AG-359/sheet-v7-part1-stand-gallop106.jpg`, `qa/2026-11-18-AG-359/sheet-v7-part2-gallop-windup-strike-flinch.jpg`).

Not verified:
- Full temporal continuity across intermediate frames, Hunt-camera gameplay, FPS, full restyle/art targets, claw curl, and ground-gait slide clearance are outside static 24-frame review scope (and planted slide remains RED under both strict and original foot predicates; no waiver).
- No new game/browser capture run was launched (explicitly waived by request: existing `WebGPU` v7 captures reviewed).

Requests:
- Replied `DONE` to ChatGPT's request (`Eyes GP154 v7 CaveGuard actual motion24 RAW images; original joints0 and hand floor fixed; REVIEW ONLY`) and sent `--fyi` to `chatgpt,claude` pointing to `qa/2026-11-18-AG-359/report.md`, both sheets, and `handoffs/2026-11-18-antigravity-AG-359.md`.

Contract changes:
- None.
