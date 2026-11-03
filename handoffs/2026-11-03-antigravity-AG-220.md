Changed:
- Captured all 13 weapons in first person at hip rest from Jerry's launcher (`startMatch(T, 'JERRY')`) on real hardware WebGPU (`NVIDIA GeForce RTX 5080`, `1920×1080`, `worldTime = 0.50` / 12:00 noon) on the `AG-219` woods-trail seat (`[42.0, -7.5468, -20.0]`): `pistol`, `revolver`, `uzi`, `m4`, `ak`, `shotgun`, `aa12`, `sniper`, `launcher`, `minigun`, `flamer`, `chainsaw`, and `akimbo-pistol`.
- Built the 4-across labelled contact sheet at `qa/2026-11-03-AG-220/all-weapons-fp.jpg` (`2640×1764`) alongside all 13 `1080p` single stills (`qa/2026-11-03-AG-220/<key>.jpg`), `telemetry.json`, and `report.md`.
- Identified and resolved two capture/harness traps and one in-game first-person akimbo defect:
  1. `T.setWorldTime(t)` (`index.html:64220`) takes a `0..1` day fraction (`0.50` = noon; passing `12` wraps `12 % 1 = 0` = midnight).
  2. With `flightHold(true)`, `T.stepFrame(dt)` must pair with `renderer._nodes.nodeFrame.update()` + `await renderer.compileAsync(scene, camera)` so `postProcessing.render()` runs a fresh scene pass with compiled viewmodel pipelines instead of re-presenting the previous weapon's cached post-processing target.
  3. On `akimbo-pistol` (#13), `index.html:51097` (`!akimboOn()`) disables `viewmodel.js` and falls back to the 3P marine rig, where `index.html:52391` lifts `weaponMeshes.pistol` (`armRG`, left side of screen) by `FP_LIFT * OTS.w` (`+0.20 m`) into the bottom-left (`43,835` px), while `index.html:52516` (`offhandMeshes.pistol` on `armLG`, right side of screen) omits `if (viewFirst && OTS.w > 0) offL.y += FP_LIFT * OTS.w`, leaving the right-hand akimbo pistol 20 cm below the bottom of the 1080p frame at stationary hip rest.

Files:
- `qa/2026-11-03-AG-220/all-weapons-fp.jpg`
- `qa/2026-11-03-AG-220/pistol.jpg`
- `qa/2026-11-03-AG-220/revolver.jpg`
- `qa/2026-11-03-AG-220/uzi.jpg`
- `qa/2026-11-03-AG-220/m4.jpg`
- `qa/2026-11-03-AG-220/ak.jpg`
- `qa/2026-11-03-AG-220/shotgun.jpg`
- `qa/2026-11-03-AG-220/aa12.jpg`
- `qa/2026-11-03-AG-220/sniper.jpg`
- `qa/2026-11-03-AG-220/launcher.jpg`
- `qa/2026-11-03-AG-220/minigun.jpg`
- `qa/2026-11-03-AG-220/flamer.jpg`
- `qa/2026-11-03-AG-220/chainsaw.jpg`
- `qa/2026-11-03-AG-220/akimbo-pistol.jpg`
- `qa/2026-11-03-AG-220/telemetry.json`
- `qa/2026-11-03-AG-220/report.md`
- `qa/2026-11-03-AG-220/run-ag220.mjs`
- `qa/2026-11-03-AG-220/build-sheet.py`
- `handoffs/2026-11-03-antigravity-AG-220.md`

Tests:
- `node crew/crew.mjs slot run antigravity AG-220 --checks "Every weapon in first person from his launcher (13 weapons, 1080p, noon woods-trail seat)" -- node qa/2026-11-03-AG-220/run-ag220.mjs` (13/13 weapons passed all weapon, viewmodel/akimbo, noon `worldTime=0.50`, and exact `dt=0` reference-diff pixel assertions; 0 page errors).

Screenshots:
- `qa/2026-11-03-AG-220/all-weapons-fp.jpg` (visually inspected 4-across contact sheet of all 13 weapons)
- `qa/2026-11-03-AG-220/pistol.jpg` (`gunPx=33,483`, `totalPx=243,207`)
- `qa/2026-11-03-AG-220/revolver.jpg` (`gunPx=69,707`, `totalPx=231,610`)
- `qa/2026-11-03-AG-220/uzi.jpg` (`gunPx=98,284`, `totalPx=236,955`)
- `qa/2026-11-03-AG-220/m4.jpg` (`gunPx=132,194`, `totalPx=299,779`)
- `qa/2026-11-03-AG-220/ak.jpg` (`gunPx=137,220`, `totalPx=307,299`)
- `qa/2026-11-03-AG-220/shotgun.jpg` (`gunPx=170,210`, `totalPx=284,661`)
- `qa/2026-11-03-AG-220/aa12.jpg` (`gunPx=220,228`, `totalPx=379,169`)
- `qa/2026-11-03-AG-220/sniper.jpg` (`gunPx=111,293`, `totalPx=240,311`)
- `qa/2026-11-03-AG-220/launcher.jpg` (`gunPx=132,030`, `totalPx=234,421`)
- `qa/2026-11-03-AG-220/minigun.jpg` (`gunPx=174,380`, `totalPx=216,432`)
- `qa/2026-11-03-AG-220/flamer.jpg` (`gunPx=148,986`, `totalPx=301,460`)
- `qa/2026-11-03-AG-220/chainsaw.jpg` (`gunPx=140,927`, `totalPx=206,160`)
- `qa/2026-11-03-AG-220/akimbo-pistol.jpg` (`gunPx=43,835`, `totalPx=48,883`)

Not verified:
- ADS / reload / firing states (this pass is stationary first-person hip at rest per `AG-220`).

Requests:
- None.

Contract changes:
- None.
