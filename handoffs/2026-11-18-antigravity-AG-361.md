# antigravity — AG-361 GP154 v19 CaveGuard Hunt26 current J164 base visual review (GP-20154) — 2026-11-18

Changed:
- Completed `REVIEW ONLY` visual inspection of `review/GP-20154/hunt-motion-v19-pair-v1/all26-hunt-before-after.jpg`, key RAW WebGPU PNGs (`after/07-windup-f202.png`, `after/08-windup-f235.png`, `after/09-strike-f247.png`, `after/00-stand-f030.png`, `after/02-gallop-f054.png`, `before/07-windup-f202.png`), `independent-provenance-contact-audit.json`, `receipt.json`, `owner-look.json`, and `review/GP-20154/exact-review-v19.diff`, plus built matched comparison and `v17` vs `v19` Marine close-up sheets in `qa/2026-11-18-AG-361/`. Zero game, `index.html`, or `review/GP-20154/` files edited.
- Visual findings (`before` `live 72e` vs `after` `v19 2f23e522`, `REVIEW ONLY`):
  - **Boss trajectory & contacts identical to `AG-360` (`0` new clips/inversions/burial)**: Cross-check of all 348 `after` frames vs `v17` shows `0.0` max diff on joint readings and terrain clearances (`C5 2453 -> 0`, `wristL +7.04 mm`, `wristR +7.33 mm`, `ankleL +0.18 mm`, `ankleR +1.22 mm`, `f202 +3.00/+13.54 mm`). All 13 frames (`00-stand`..`12-recover`) keep clean terrain contact shadows, palm-down/forward strike (`07-windup-f202`, `08-windup-f235`, `09-strike-f247`, `10-strike-f253`), clear `armL` brace spacing, forward head gaze, and intact `Body7` plates/spikes.
  - **Updated `J164` `72e` Marine clean in Hunt context (`closeup-v17-vs-v19-marine-j164.png`)**: Tapered trouser legs, slimmer lower boots, tighter hip kit, and smaller head/cap read cleanly on the dirt path against the CaveGuard strike with zero new clipping, floating parts, or contrast loss.
  - **Retained pre-existing notes (non-regressions)**: Untouched `guardianGrip(..., 'walk')` upright thumb / mid-swing claw curl ahead of `D-203`, `f235..f253` reach similarity, and planted slide RED (`L 3.78 m/s`, `3/4` red; `R 0` eligible pairs).

Files:
- `qa/2026-11-18-AG-361/report.md`
- `qa/2026-11-18-AG-361/inspect_v19.py`
- `qa/2026-11-18-AG-361/sheet-v19-hunt-part1-stand-gallop-decel.jpg` (`1270x3608`)
- `qa/2026-11-18-AG-361/sheet-v19-hunt-part2-windup-strike-recover.jpg` (`1270x3094`)
- `qa/2026-11-18-AG-361/closeup-pixel-8frames.png` (`1058x3766`)
- `qa/2026-11-18-AG-361/closeup-v17-vs-v19-marine-j164.png` (`1144x1824`)
- `handoffs/2026-11-18-antigravity-AG-361.md`

Tests:
- Read-only verification of `review/GP-20154/hunt-motion-v19-pair-v1/{independent-provenance-contact-audit.json,receipt.json}` + Python parity check (`python qa/2026-11-18-AG-361/inspect_v19.py`, exited `0`): `before` `index 6d22f79e` / `world 3212699f` vs `after` `index 2f23e522` / `world 73ac9cf2`, `shape 1983bc04` BOTH, `birthExact: true`, `originExact: true`, `gfxExact: true`, `projectionExact: true`, `cameraRawExact: false` (`2.26e-7 m` / `2.41e-6 deg`), `errors: []`, `sourceErrors: []`, `originalC5 2453 -> 0`, `afterUnresolved: []`, `invalidSurfaceQueries: 0`, `v19 vs v17` `348`-frame reading/terrain diff `0.0`, `oldSlide` RED (`L 3.78 m/s`, `3/4` red).

Screenshots:
- Visually inspected `review/GP-20154/hunt-motion-v19-pair-v1/all26-hunt-before-after.jpg`, `after/07-windup-f202.png`, `after/08-windup-f235.png`, `after/09-strike-f247.png`, `after/00-stand-f030.png`, `after/02-gallop-f054.png`, `before/07-windup-f202.png`, and all four generated `qa/2026-11-18-AG-361/` sheets.

Not verified:
- Full AI/pathfinding, HTML HUD, scripted drag/carry/throw, other variants, `npm test` suite, and `ABAB` performance / `surfaceAt` callback cost (`5,528..21,008` queries/frame, mean `12,361.86`). Planted slide remains RED (no waiver).
- No new game/browser capture launched (`NO new game needed`).

Requests:
- Replied `DONE` to ChatGPT's request (`Eyes GP154 v19 current J164 base Hunt26; same boss trajectory, updated marine`) and sent `--fyi` to `chatgpt,claude` with `qa/2026-11-18-AG-361/report.md`, sheet paths, and `handoffs/2026-11-18-antigravity-AG-361.md`.

Contract changes:
- None.
