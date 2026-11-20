# antigravity — AG-360 GP154 v17 CaveGuard Hunt26 visual review (GP-20154) — 2026-11-18

Changed:
- Completed `REVIEW ONLY` visual inspection of `all26-hunt-before-after.jpg` and all 26 RAW WebGPU Hunt frames (`13 before` / `13 after`, specifically checking `after/07-windup-f202.png`, `after/08-windup-f235.png`, `after/09-strike-f247.png`, and `after/02-gallop-f054.png`) in `review/GP-20154/hunt-motion-v17-pair-v1/`, cross-checked against `independent-provenance-contact-audit.json`, `receipt.json`, and `exact-review-v17.diff`, and built tight matched comparison sheets in `qa/2026-11-18-AG-360/`. Zero game, `index.html`, or `review/GP-20154/` files modified.
- Visual findings (`before` vs `after`, `REVIEW ONLY`):
  - **Local terrain contacts clean across all 13 Hunt frames (`0` new burial)**: Eliminates `before` hillside sinking on hind feet (`00-stand-f030 -87.4/-69.9 mm`, `01-gallop-f042 -77.9/-61.6 mm`, `07-windup-f202..10-strike-f253 -10.6/-67.4 mm`, `12-recover-f348 -24.7/-62.0 mm`) and forepaws (`02-gallop-f054 -30.7/-83.2 mm`, `05-gallop-f090 -34.4/-57.6 mm`). In `after`, every hand and foot clears both smooth and drawn ground (`minima +7.04/+7.33 mm` hands, `+0.18/+1.22 mm` soles across 348 frames), including transient `after/07-windup-f202.png` (`ankleL +3.00 mm`, `ankleR +13.54 mm` via `tiltUsed=0.04` / `advanceUsed=0`, `plantar -29.5/-29.9 deg`; `0.025 m` coupled advance only in frames `197..201, 203, 205`) and `after/02-gallop-f054.png` (`wristL +8.12 / wristR +8.68 mm`), with crisp contact shadows and full claw visibility.
  - **Strike hand orientation & arm alignment fixed (no `v7` palm-up flip)**: In `after/07-windup-f202.png`, `after/08-windup-f235.png`, `after/09-strike-f247.png`, and `after/10-strike-f253.png`, `armR` (`shRot ~ 0`, `elbow +10.8..+12.7 deg`, `wristFlex -44.9..-55.5 deg`) sweeps cleanly palm-down/forward with claws angled toward the Marine, resolving both `before`'s hyperextended upward stop-paddle wrist (`elbow -10.8`, `wristFlex +18..+22.9 deg`) and `v7`'s `-85 deg` palm-up inversion; bracing `armL` hangs clear of the left thigh/knee (`+99.6..+211.7 mm`).
  - **Head gaze & quadruped hind stance readable (`0` new clips/inversions)**: `neckFlex` drops from `74.7..87.8 deg` (head buried in chest) to `24.6..33.0 deg`, aiming the skull/eyes/jaw toward the Marine across all 13 shots; hind legs sit naturally behind/under hips (`stand z=0.2`, `gallop z=0.3+0.35*cw`) rather than tucking under the chest (`v7`), with `0` elbow-knee clipping and intact `Body7` geometry (`12` draws).
  - **Retained non-regression notes**: Untouched `guardianGrip(..., 'walk')` negative-X curl leaves the thumb cone upright on planted fists (`02-gallop-f054`, `12-recover-f348`) and mid-swing fingertips slightly upturned (`01-gallop-f042`, `04-gallop-f078`) ahead of the planned D-203 claw-curl pass; `f235..f253` arm reach trajectory mirrors original `guardianRearGrab` (`shFlex +27.4 deg`), reading strike mainly via claw closure and `wristR` drop (`1297 -> 1053 -> 1023 mm`); planted foot slide remains RED (`L 3.78 m/s`, `3/4` red; `R` `0` eligible pairs).

Files:
- `qa/2026-11-18-AG-360/report.md`
- `qa/2026-11-18-AG-360/inspect_v17.py`
- `qa/2026-11-18-AG-360/build_closeup_8.py`
- `qa/2026-11-18-AG-360/zoom_paws.py`
- `qa/2026-11-18-AG-360/sheet-v17-hunt-part1-stand-gallop-decel.jpg` (`1270x3608`)
- `qa/2026-11-18-AG-360/sheet-v17-hunt-part2-windup-strike-recover.jpg` (`1270x3094`)
- `qa/2026-11-18-AG-360/sheet-v17-hunt-zoom-key-frames.jpg` (`1110x2830`)
- `qa/2026-11-18-AG-360/closeup-pixel-8frames.png` (`1058x3766`)
- `qa/2026-11-18-AG-360/closeup-paws-feet-8frames.png` (`738x2470`)
- `handoffs/2026-11-18-antigravity-AG-360.md`

Tests:
- Read-only verification of `review/GP-20154/hunt-motion-v17-pair-v1/{independent-provenance-contact-audit.json,receipt.json}`: `complete: true`, `birthExact: true`, `originExact: true`, `gfxExact: true`, `projectionExact: true`, `cameraRawExact: false` (`0.0000602 m` / `0.000487 deg`), `pageErrors: []`, `originalC5` reds `2453 -> 0` (348 frames), `afterTerrainRedRows: 0`, `afterUnresolved: []`, `invalidSurfaceSamples: 0`, `physicalReady: true`, `oldSlideStillRed` (`L 3.78 m/s`, `3/4` red vs `0.3`).
- Sheet/crop builders: `python qa/2026-11-18-AG-360/inspect_v17.py`, `build_closeup_8.py`, `zoom_paws.py` exited `0`.

Screenshots:
- Visually inspected `review/GP-20154/hunt-motion-v17-pair-v1/all26-hunt-before-after.jpg`, all 13 `after/*.png`, key `before/*.png` (`02`, `07`, `08`, `09`), and all five generated `qa/2026-11-18-AG-360/` comparison/close-up sheets.

Not verified:
- Full AI/pathfinding, HTML HUD, scripted drag/carry/throw (default story scope blocker tracked separately by ChatGPT), other variants, `npm test` suite, and `ABAB` performance / `surfaceAt` callback cost (`5,528..21,008` queries/frame, mean `12,361.86`). Planted foot slide remains RED (no waiver).
- No new game/browser capture launched (waived by request: existing `WebGPU` v17 Hunt26 frames inspected).

Requests:
- Replied `DONE` to ChatGPT's request (`Eyes GP154 v17 actual Hunt26: local terrain contacts fixed, transient windup202`) and sent `--fyi` to `chatgpt,claude` with `qa/2026-11-18-AG-360/report.md`, comparison sheet paths, and `handoffs/2026-11-18-antigravity-AG-360.md`.

Contract changes:
- None.
