Changed:
- Completed `AG-223` (`AG-221: every weapon again, after the arms and stocks change; fix the labels` requested by Claude in `handoffs/requests.md`):
  1. Re-shot all 13 weapons in first person at hip rest from `startMatch(T, 'JERRY')` on RTX 5080 WebGPU at `1080p` noon (`worldTime = 0.50`) on the `AG-219` woods-trail seat (`[42.0, -7.5468, -20.0]`).
  2. Enforced Claude's capture rule on every weapon: after switching and reaching `vm.info.key === w.key && vm.info.raise === 1`, stepped a full **`1.0 s` (`60` frames at `1/60 s`)** while asserting on *every single frame* that `vm.info.active === true`, `vm.info.key === w.key`, and `vm.info.raise === 1` (`holdFull1sVerified: true`), and called `marineIdleDbg().reset()` each frame so the 20-second cigarette-pack idle never triggers on later weapons.
  3. Verified all `CL-293` (~17:30Z) and `GP-20020` changes in frame and telemetry (`qa/2026-11-03-AG-221/all-weapons-fp.jpg` & `qa/2026-11-03-AG-223/telemetry.json`):
     - **Full-girth arms + upper arm (`studio/fp-arms.js`, `game/viewmodel.js`):** `SLIM = 1.0`, `upperArmR = true`, `upperArmL = true` turning at the elbow toward `VM_SHOULDER` across all 12 viewmodel guns.
     - **Elbows below wrists (`elbowRel`):** `pistol` and `revolver` forearms enter cleanly from the bottom corners without inverted side-flared elbows; long-gun support forearms rise steeply from the bottom.
     - **Hip stocks (`vm.gun.stock.visible === true`):** Visible in the lower-right corner on all 6 stocked long guns (`m4`, `ak`, `shotgun`, `aa12`, `sniper`, `launcher`).
     - **GP-20020 hip placements (`game/viewmodel-poses.js`):** Verified `m4` (`muzzle NDC [+0.2104, -0.1562]`), `ak` (`muzzle NDC [+0.2050, -0.1363]`), and `shotgun` (`muzzle NDC [+0.2163, -0.1180]`).
     - **Per-weapon pixel counts (`gunPixels / gunAndHandPixels`):** `pistol` `36,012 / 197,604`, `revolver` `64,232 / 170,263`, `uzi` `98,851 / 197,666`, `m4` `124,323 / 232,696`, `ak` `138,452 / 230,182`, `shotgun` `135,377 / 210,947`, `aa12` `189,458 / 273,061`, `sniper` `127,604 / 184,783`, `launcher` `183,020 / 267,629`, `minigun` `173,618 / 218,095`, `flamer` `147,368 / 306,310`, `chainsaw` `138,774 / 238,742`, `akimbo-pistol` `31,478 / 33,168`.

Files:
- `qa/2026-11-03-AG-221/all-weapons-fp.jpg`
- `qa/2026-11-03-AG-221/all-weapons-fp-telemetry.json`
- `qa/2026-11-03-AG-221/pistol.jpg`
- `qa/2026-11-03-AG-221/revolver.jpg`
- `qa/2026-11-03-AG-221/uzi.jpg`
- `qa/2026-11-03-AG-221/m4.jpg`
- `qa/2026-11-03-AG-221/ak.jpg`
- `qa/2026-11-03-AG-221/shotgun.jpg`
- `qa/2026-11-03-AG-221/aa12.jpg`
- `qa/2026-11-03-AG-221/sniper.jpg`
- `qa/2026-11-03-AG-221/launcher.jpg`
- `qa/2026-11-03-AG-221/minigun.jpg`
- `qa/2026-11-03-AG-221/flamer.jpg`
- `qa/2026-11-03-AG-221/chainsaw.jpg`
- `qa/2026-11-03-AG-221/akimbo-pistol.jpg`
- `qa/2026-11-03-AG-223/all-weapons-fp.jpg`
- `qa/2026-11-03-AG-223/telemetry.json`
- `qa/2026-11-03-AG-223/report.md`
- `qa/2026-11-03-AG-223/run-ag223.mjs`
- `qa/2026-11-03-AG-223/build-sheet.py`
- `handoffs/2026-11-03-antigravity-AG-223.md`

Tests:
- `node crew/crew.mjs slot run antigravity AG-223 -- node qa/2026-11-03-AG-223/run-ag223.mjs` (PASS — 13/13 weapons verified for 1.0s at `raise=1`, `gunPixels` 31,478..189,458)

Screenshots:
- `qa/2026-11-03-AG-221/all-weapons-fp.jpg`
- `qa/2026-11-03-AG-223/all-weapons-fp.jpg`

Not verified:
- None.

Requests:
- None.

Contract changes:
- None.
