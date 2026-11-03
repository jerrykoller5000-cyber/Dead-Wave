# antigravity — AG-204c GP-20016 clean view gun recapture and scoring — 2026-11-02

Changed:
- Resolved GP-20016 reload API parameter and runtime exception in `qa/2026-11-02-AG-204/run-ag204.mjs`:
  - Replaced string argument `'in'` with numeric `0.58` in `T.reloadClipDbg.hold(0.58)` per `index.html` `_clamp01` numeric contract, preventing `NaN` poisoning of `reloadTimer`, `reloadMountOff`, and viewmodel matrices.
  - Added clean release `T.reloadClipDbg.hold(null)` and async settling loop with `isFinite(T.getReloadDbg().timer)` assertion after every reload shot.
- Installed Comprehensive Error and Viewport Integrity Checks:
  - Installed page-level listeners for `error` and `unhandledrejection` via CDP `Page.addScriptToEvaluateOnNewDocument`.
  - Added `assertNoErrors(contextName)` after each weapon switch, hip capture, ADS capture, reload setup, and reload release.
  - Added `assertValidView(contextName)` asserting camera pitch is eye-level, not looking at the sky (`camDirY <= 0.85`), and first-person weight `fpW >= 0.99`.
- Verified Geometric Measurements & Scores in `qa/2026-11-02-AG-204/gp20016/gp20016-scores.json`:
  - **Chainsaw (`J60`)**: **PASS (Hands 4.7/5, Placement 4.7/5, Reloads 5.0/5)**. Verified bar centered in screen (`barNdc x = 0.000, y = +0.111`), bar pointing up the middle of the view per J60; 22 teeth active and mirrored (`teethMirrored = true`). Previous canted `x = -0.455` defect was an artifact of pistol frame switch in early probe and is eliminated.
  - **Minigun (`J61`)**: **PASS (Hands 4.5/5, Placement 4.6/5, Reloads 4.5/5)**. Support palm verified bearing underneath housing (`wristL ndc y = -0.860`, `wristL view y = -0.593` vs housing); support hand clear of drum.
  - **Revolver (`J57`)**: **PASS (Hands 4.8/5, Placement 4.6/5, Reloads 4.8/5)**. Cylinder swings out left toward support hand with crane; front sight post clearly visible in hip and ADS (`frontPostNdc x = 0.203, y = -0.006`).
  - **Flamer (`J59`)**: **PASS (Hands 4.6/5, Placement 4.6/5, Reloads 4.5/5)**. Low centre-right nozzle placement grounded (`nozzleNdc x = 0.133, y = -0.140`); recoil pushback steady.
  - **Launcher (`J62`)**: **PASS (Hands 4.6/5, Placement 4.6/5, Reloads 4.5/5)**. Sights aligned in ADS (`muzzleNdc x = 0.125, y = -0.162`); Grokbot `fpStock` confirmed excluded from 1P view (`stockExcluded = true`).
- Rebuilt contact sheets via `build-sheets.py`:
  - `qa/2026-11-02-AG-204/sheet-gp20016.jpg`
  - `qa/2026-11-02-AG-204/sheet.jpg`
- Verified 0 page errors, 0 runtime exceptions, 0 NaN timers, and 0 sky-only frames across all 20 weapon/light frames.

Files:
- `qa/2026-11-02-AG-204/run-ag204.mjs`
- `qa/2026-11-02-AG-204/report.md`
- `qa/2026-11-02-AG-204/gp20016/gp20016-scores.json`
- `qa/2026-11-02-AG-204/sheet-gp20016.jpg`
- `qa/2026-11-02-AG-204/sheet.jpg`
- `handoffs/2026-11-02-antigravity-AG-204c.md`

Tests:
- Real WebGPU runner on Jerry's RTX 5080 PC under `crew.mjs slot run antigravity AG-204`:
  - `run-ag204.mjs --gp` exited 0.
  - All 5 weapons x 4 lights x (Hip, ADS, Reload) verified with strict key assertions and error assertions.
  - Contact sheet rebuilt cleanly.

Screenshots:
- `qa/2026-11-02-AG-204/sheet-gp20016.jpg`
- `qa/2026-11-02-AG-204/sheet.jpg`

Requests:
- To `chatgpt`: Recaptured all 5 guns in 4 lights with numeric `reloadClipDbg.hold(0.58)` and error/view assertions. Zero runtime exceptions, zero NaN reload timers, zero sky frames. Chainsaw verified centered (`x = 0.000, y = +0.111`), minigun support palm under housing (`ndc y = -0.860`), revolver cylinder swings left with front post visible. Updated `gp20016-scores.json` and `sheet-gp20016.jpg`.
- To `claude`: AG-204c clean recapture complete; all GP-20016 scores verified green.

Contract changes:
- None.
