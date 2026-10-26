# antigravity — AG-127 GPU looks: CL-264 boots yank, CL-260 part 2 FP hip & run-aim, CL-256 batch 2 sweep, and CL-261 unarmed run/blades/mast climb — 2026-10-25
Changed:          Ran full RTX 5080 GPU visual & quantitative verification for Claude's CL-264 (boots yank & skeleton fall), CL-260 part 2 (first-person hip carry, sprint-ADS sight lock, reticle zoom contraction, and 0.21m windy spell leaves), CL-256 batch 2 (hikers' camp turn off trail, graveyard railing & open grave colliders, and cave-1/3/4/6 hill-ring stop slopes), and CL-261 part 1 (CMU-referenced unarmed run, machete chop & knife stab torso twist/lean, and mast ladder climb). All 6 new/updated tests (`t291`, `t293`, `t294`, `t295`, `t296`, `t297`) passed (`62 pass, 0 fail`).
Files:            qa/2026-10-25-AG-127/*, review/sweep/camp-hikers/*, review/sweep/graveyard/*, handoffs/2026-10-25-antigravity-AG-127.md
Tests:            node tools/tests/run-all.mjs t291 t293 t294 t295 t296 t297 --agent antigravity --task AG-127 --jobs 1 → 6 checks: 62 pass, 0 fail (t291: 13/0, t293: 6/0, t294: 19/0, t295: 11/0, t296: 9/0, t297: 4/0); new tests: none
Screenshots:      qa/2026-10-25-AG-127/cl264-boots-yank-sheet.jpg, qa/2026-10-25-AG-127/cl260-fp-sheet.jpg, qa/2026-10-25-AG-127/cl256-camp-hikers-sheet.jpg, qa/2026-10-25-AG-127/cl256-graveyard-sheet.jpg, qa/2026-10-25-AG-127/cl256-hill-rings-sheet.jpg, qa/2026-10-25-AG-127/cl261-moves-sheet.jpg, review/sweep/camp-hikers/sheet.jpg, review/sweep/graveyard/sheet.jpg
Not verified:     Full npm test suite not run (per Rule 16, only targeted checks t291..t297 run in the slot).
Requests:         Replied DONE to both Claude GPU review requests in handoffs/requests.md.
Contract changes: none

---

## 1. CL-264 — The Boots Yank (`qa/2026-10-25-AG-127/cl264-boots-yank-sheet.jpg`)

- **Ladder Top & Prompt (`cl264-1-perch-prompt.png`, `cl264-2-perch-closeup.png`):**
  - `TT.lightningDbg.climbMast(99)` places the marine at the top of the mast ladder with `inReach: true`, `need: 5` (rolled 5–7), and `#kioskPrompt` displaying `"E — Yank the boots"`.
- **Pull Jerk (`cl264-3-pull-jerk.png`):**
  - On each `E` press, the skeleton jerks outward/downward over the platform edge (`maxPosShift: 6.30 cm`, `maxRotX: -9.02°` / `-0.16 rad`, `maxRotZ: ±2.82°`) and the yellow rubber boots move with his feet (`maxBootsShift: 8.62 cm`), settling back cleanly in `0.24 s`. At 60 fps on the RTX 5080, `BOOTS_YANK.jerkS = 0.24 s` and `-0.16 rad` lean read crisply as a physical tug.
- **Last Pull, 12 m Tumble & Faceplant (`cl264-4-last-pull-tip.png`, `cl264-5-falling.png`, `cl264-6-faceplant-side.png`, `cl264-7-faceplant-gameplay.png`):**
  - On the 5th pull, the boots come off (`bootsVisible: false`, `worn: true`, `"INSULATED BOOTS"` banner shown), the skeleton tips forward over the platform edge (`tipS = 0.7 s`), turns over during the 12 m fall (`spin = 2.4`, `out = 1.1 m/s`), and faceplants at the mast's foot (`3.16 m` from mast center, `box.min.y - gy = +1.0 cm`, `rotX = -1.78 rad / -102.0°` with his seat in the air and dust puff).

---

## 2. CL-260 Part 2 — First-Person Hip Carry, Sprint-ADS Sight Lock & Windy Leaves (`qa/2026-10-25-AG-127/cl260-fp-sheet.jpg`)

- **First-Person Hip Carry (`cl260-hip-{m4,ak,pistol,shotgun,sniper,revolver,uzi}.png`):**
  - **Long guns (`m4`, `ak`, `shotgun`, `sniper`):** Carried at a high ready (`FP_HIP`: 22 cm up, 15 cm forward, 10 cm in) coming up from the lower-left with the right support glove on the handguard clearly in view.
  - **Handguns (`pistol`, `revolver`):** Carried with `FP_HIP_HAND` (`8 cm` up, `2 cm` back) and clamped inside arm reach (`FP_HAND_REACH`), showing the two-hand grip at the bottom of the frame both at the hip (`cl260-hip-pistol.png`) and aimed (`cl260-ads-pistol.png`).
  - **Uzi (`cl260-hip-uzi.png`):** Shows its top sights and muzzle at the bottom-left edge (as noted in `CL-260 part 2` for follow-up).
- **First-Person Running Down the Sights at 60 fps (`cl260-run-aim-{m4,ak,pistol}.png`):**
  - The gun seat now receives the same frame's `firstPersonSightSteady` shift (`holdWeapon(0)`), locking the sights onto the camera's sight line while sprinting (`KeyW + ShiftLeft`) with right-click held:
    - **M4:** median sight-to-view gap **`0.036 cm` (`0.36 mm`)** across 60 frames (`camHeightWobble: 0.87 cm`).
    - **AK:** median sight-to-view gap **`0.034 cm` (`0.34 mm`)** across 60 frames (`camHeightWobble: 0.28 cm`, `camPitchWobble: 0.010°`).
    - **Pistol:** median sight-to-view gap **`0.356 cm` (`3.56 mm`)** across 60 frames (`camHeightWobble: 0.56 cm`, `camPitchWobble: 0.009°`).
- **Windy Spell Leaves (`cl260-windy-leaves.png`):**
  - The `0.21 m` camera-facing leaves (`88` leaves in 1 instanced draw, `gale = 0.90`) are now clearly legible in third person.

---

## 3. CL-256 Batch 2 — Hikers' Camp, Graveyard & Cave Hill-Rings (`qa/2026-10-25-AG-127/cl256-*.jpg`)

- **Hikers' Camp (`review/sweep/camp-hikers/sheet.jpg`, `qa/2026-10-25-AG-127/cl256-camp-hikers-sheet.jpg`):**
  - Turned to `campYaw = 39.2°` (`(-1.98, -81.68)`): the trail now enters cleanly through the open ground between the tents straight to the campfire, with no tent on the trail (`t295` `11/0`).
- **Graveyard Gate & Open Grave (`review/sweep/graveyard/sheet.jpg`, `qa/2026-10-25-AG-127/cl256-graveyard-sheet.jpg`, `cl256-graveyard-gate-and-open-grave.png`):**
  - The iron railing posts on both sides of the gate and the open grave (`(-103.05, -0.69, 92.48)`) are solid while the gate between the pillars stays open (`t295` `11/0`).
- **Cave Hill-Rings (`qa/2026-10-25-AG-127/cl256-hill-rings-sheet.jpg`):**
  - Walked the marine up to the gentlest `c.hillSolids` (`DH = 0.9 m`) stop point on `cave-1` (`root`), `cave-3` (`iron`), `cave-4` (`wet`), and `cave-6` (`chalk`):
    - **`cave-1` (`(162.43, 7.43, 78.36)`):** `dh = 3.99 m`, boots on ground (`0.0 cm`), steep hill flank (`18.7°–40.3°`) — reads naturally as an unclimbable hill face.
    - **`cave-3` (`(-165.55, 3.46, 81.91)`):** `dh = 3.67 m`, boots on ground (`0.0 cm`), steep hill flank (`39.1°–41.9°`) — reads naturally.
    - **`cave-4` (`(-184.45, 5.22, 3.87)`):** `dh = 2.44 m`, boots on ground (`0.0 cm`), gentler turf shoulder behind the side boulder (`+16.9°` over `1.5 m`, `+2.8°` over `3.0 m`) — stops him on a visible slope by the boulder, though gentler than `cave-1`/`3`.
    - **`cave-6` (`(168.57, 3.68, -90.57)`):** `dh = 6.49 m`, boots on ground (`0.0 cm`), steep chalk mound flank (`14.6°`) — reads naturally.

---

## 4. CL-261 Part 1 — Unarmed Run, Blades & Mast Climb (`qa/2026-10-25-AG-127/cl261-moves-sheet.jpg`)

- **Unarmed Run (`cl261-unarmed-run-side-{0..3}.png`, `cl261-unarmed-run-front-{0..3}.png`):**
  - Upper arms drive well behind the back (`+36.1°` back vs `-1.9°` to `-11.9°` forward), elbows stay bent `83.9°–111.9°` (more bent on the forward swing), hands pass close by the hips and angle slightly inward toward the middle without flaring, and the chest counter-rotates `±11.1°–12.8°` (`t296` `9/0`).
- **Machete Chop & Knife Stab (`cl261-machete-{front,right}-{0..3}.png`, `cl261-knife-{front,right}-{0..3}.png`):**
  - **Machete (`heavy`):** Chest winds `+25.8°` to `+30.4°` (`u = 0.22..0.36`) with `+8.1°` forward lean, then turns through the chop to `-25.8°` (`u = 0.62`).
  - **Knife (`light`):** Chest winds `+8.6°` (`u = 0.14`) and drives the left shoulder forward (`-10.3°` to `-17.2°` yaw with `+8.0°` forward lean at `u = 0.30..0.42`). Confirms Claude's note that part 2's extra hand-path reach and step-in will complete the stab's forward extension.
- **Mast Ladder Climb (`cl261-mast-climb-side-{0..4}.png`, `cl261-mast-climb-gameplay.png`):**
  - **On ladder line:** `0.00 cm` off the ladder line at all 5 heights (`1.2 m`, `2.4 m`, `3.0 m`, `3.2 m`, `4.8 m`) — the tree canopy push is completely gone.
  - **Boots on rungs:** Feet come together cleanly on a single rung (`rungs 3/3` at `1.2 m`, `6/6` at `2.4 m`, `8/8` at `3.2 m`, `12/12` at `4.8 m`, sole error `-0.38 cm`) and step cleanly between rungs (`rungs 7/8` at `3.0 m`, sole error `-0.21 / +0.51 cm`).
  - **Real Three.js GPU fists on rungs:** On real Three.js (`solveArmIK` with real `Matrix4.transpose()`), both gripping fists sit within **`+0.30 cm` to `+1.53 cm`** of their rungs across all 5 heights (`t297` `4/0`).

---

## 5. Rule 16 Game-Test Slot Record

- All GPU captures and test runs (`t291`, `t293`, `t294`, `t295`, `t296`, `t297`) were executed sequentially through `node crew/crew.mjs slot run antigravity AG-127`, which closed its browser cleanly and released the shared slot upon completion.
