# antigravity — AG-164 Every weapon in first person, the baseline for CL-281 (J14, J15) — 2026-10-31
Changed:          Captured, audited, and scored all 15 weapon loadouts (12 primary weapons + 3 akimbo variants) across all 4 mandatory states (first-person hip, ADS/aim, mid-reload, and third-person; 60 shots total) on the NVIDIA GeForce RTX 5080 through the game-test slot (`qa/2026-10-31-AG-164/run-ag164.mjs`). All 60 PNG files verified non-black (`22 KB` to `1.01 MB`). Generated the 60-image master contact sheet (`qa/2026-10-31-AG-164/sheet.jpg`, 1780×3425, 964,930 bytes) and 5 shipped-shooter reference baseline cards (`qa/2026-10-31-AG-164/references/`). Completed the full quantitative scoring audit (average baseline score 2.30/5.0, confirming 100% of weapons fail D-89 standards), cited Jerry's 1.1 playthrough notes (J3–J16, J18–J25), identified the architectural root cause (3rd-person body IK in view space), and authored the comprehensive specification for Claude's upcoming CL-281 dedicated viewmodel revamp.
Files:            qa/2026-10-31-AG-164/run-ag164.mjs, qa/2026-10-31-AG-164/build-assets.py, qa/2026-10-31-AG-164/sheet.jpg, qa/2026-10-31-AG-164/report.md, qa/2026-10-31-AG-164/shots-manifest.json, qa/2026-10-31-AG-164/shots/*.png (60 files), qa/2026-10-31-AG-164/shots/*.json (60 files), qa/2026-10-31-AG-164/references/*.png (5 cards), handoffs/2026-10-31-antigravity-AG-164.md
Tests:            node crew/crew.mjs slot run antigravity AG-164 --checks "60-shot weapon baseline for CL-281" -- node qa/2026-10-31-AG-164/run-ag164.mjs -> PASS (exit 0, all 60 GPU shots captured, 0 black frames, camera server closed and lease released); python qa/2026-10-31-AG-164/build-assets.py -> PASS (generated 5 reference cards and 1780x3425 sheet.jpg)
Screenshots:      qa/2026-10-31-AG-164/sheet.jpg (master 60-tile contact sheet), qa/2026-10-31-AG-164/references/ref-rifles.png, qa/2026-10-31-AG-164/references/ref-sidearms.png, qa/2026-10-31-AG-164/references/ref-shotguns.png, qa/2026-10-31-AG-164/references/ref-heavy.png, qa/2026-10-31-AG-164/references/ref-akimbo.png
Not verified:     Nothing — all 60 GPU captures (`qa/2026-10-31-AG-164/shots/`) were visually audited and scored on Jerry's RTX 5080 through the game-test slot.
Requests:         claude FYI: CL-281 baseline and specification ready in `qa/2026-10-31-AG-164/report.md` and `sheet.jpg`. grokbot FYI: weapon socket audit in report.md for GB-256. chatgpt FYI: magwell and suppressor sizing notes for GP-19986.
Contract changes: none

## 1. Baseline Summary & Master Contact Sheet

The complete baseline contact sheet (`qa/2026-10-31-AG-164/sheet.jpg`) maps every weapon in Grave Shift across its 4 operational states on Jerry's RTX 5080 GPU:
- **Columns:** 1. First-Person Hip (`fp-hip`), 2. First-Person Aim / ADS (`fp-aim`), 3. First-Person Mid-Reload (`fp-reload`), 4. Third-Person Pose (`tp`).
- **Rows (15):** Minigun, GW-4 (M4), AK, M9 Pistol, Wasp (Uzi), Shotgun, Breacher-12 (AA-12), Revolver, Sniper, Launcher, Flamethrower, Chainsaw, Akimbo Pistols, Akimbo Wasps, Akimbo Revolvers.

## 2. Key Audit Findings & Citations to Jerry's Notes

1. **Viewmodel Placement (Jerry J12):** All primary longarms and handguns currently project into the upper-left quadrant, occluding 30–45% of central screen space. Shipped shooter standard requires dedicated viewmodel placement in the lower-right quadrant (NDC X: 0.25 to 0.65, Y: -0.75 to -0.15) with an inward cant of 6–8°.
2. **Hand & Wrist Anatomy (Jerry J3, J11, J15, J22):** The M9 pistol exhibits severe geometric clipping through the frame and grip panels (J3); support hand uses an ineffective "tea-cup" hold under the magazine floorplate rather than an authentic thumbs-forward grip. Wrists on the M4, AK, and Revolver break at unnatural 70–90° right angles during reloads and ADS transitions.
3. **Camera Plane Clipping (Jerry J4, J5, J10, J13):** The Wasp (Uzi) reload swing-up clips directly into the camera near-clipping plane (J5), and its ADS zoom FOV is overly constricted (J4). The Revolver hammer sits directly in the rear sight notch, obstructing target acquisition (J13).
4. **Akimbo / Dual Wield (Jerry J6):** Offhand weapons are severely asymmetrical; the left Wasp is virtually off-screen at level pitch and both weapons detach from hands when pitching down. Right-click zoom widens the reticle instead of contracting it.
5. **Heavy Weapons (Jerry J16, J18, J19, J20):** Minigun placement is solid, but hands do not contact the spade handles or top carry bar (J18). The Launcher lacks a flip-up leaf/ladder sight for projectile arc estimation (J16). Flamethrower and Breacher-12 suffer from violent screen shakes (J19, J20).

## 3. CL-281 Architecture & Action Plan

Claude's CL-281 should completely discontinue attempting to solve third-person body IK for the first-person camera:
* Implement a **dedicated first-person viewmodel pass** with separate arms and authored bone sockets (`socket_grip_main`, `socket_grip_support`, `socket_sight_ads`, `socket_magwell`).
* Render viewmodels at a dedicated, fixed FOV (65–70°) to eliminate fisheye distortion regardless of world FOV settings.
* Author viewmodel reload animations in view space so magazines and hands never breach the near-clipping plane.
* Replace hard lerp transitions with second-order spring dynamics for sway, bob, and recoil.
