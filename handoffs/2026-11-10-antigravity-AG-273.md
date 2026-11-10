# Antigravity — AG-273 J93 First-Person Kinematic & Weapon Fixes Verification on RTX 5080 (CL-326-2 & CL-327) — 2026-11-10

Changed: Verified Claude's CL-326 part 2, CL-325 part 2, CL-327, and CL-328 viewmodel kinematics and lighting fixes on Jerry's NVIDIA GeForce RTX 5080 WebGPU hardware across all 8 requested scenarios on the Training Ground:
  (1) Revolver Reload (J78):
      - Fired 4 rounds from a 6-round cylinder (leaving 2 live rounds and 4 fired casings).
      - On startReload, cylinder swings out cleanly supported by the articulated crane yoke arm (`crane.userData.len = 0.061 m`); crane pin sits squarely in the two frame ears on the frame's front-left and aims continuously at the cylinder's front hub.
      - Ejector press at `u = 0.20`: exactly the 4 spent casings slide out of the chambers and drop to the ground.
      - Palm catch at `u = 0.28`: cupped support palm moves underneath the open cylinder; the 2 live unfired rounds slide smoothly out into the palm and are carried to the ammo pouch.
      - Speedloader insertion at `u = 0.50 - 0.74`: 6-round speedloader arrives from the pouch in the support palm, seats 6 fresh rounds into the cylinder chambers, and clears. Cylinder swings shut and locks into frame at `u = 0.88`.
  (2) Launcher Reload Dynamic Trips (J80):
      - 1-round reload (`launcherReloadNeed = 1`): drum swings open and rotates by `launcherReloadFrom * PI/3` so the single empty chamber is right under the hand; exactly 1 loading trip is made by the support hand from pouch to drum, winding key turns, and drum locks shut.
      - 2-round reload (`launcherReloadNeed = 2`): exactly 2 loading trips in sequence, replacing only the 2 missing grenades.
      - 6-round reload (`launcherReloadNeed = 6`): drum opens empty; exactly 6 consecutive loading trips fill all 6 chambers.
      - Loose round in fingers (`loadRound`): grenade sits at fingertips with nose along bore, visible past the glove until pushed home into the chamber.
  (3) Breacher-12 Empty Reload (J77):
      - Drum drops and fresh drum seats into the well at `u = 0.62`.
      - Charging handle rack: `userData.work` is an independent direct-child node; at `u = 0.77` support fingers hook the charging handle knob on the left of the receiver; at `u = 0.80` handle is pulled fully rearward (11 cm stroke along slot); at `u = 0.83` handle is released, snapping forward into battery; support hand returns to forend at `u = 0.90`.
      - Zero forearm clipping through receiver; line of approach is clean from the lower left.
  (4) Flamer & Rotary Gun Reloads (J81, J83):
      - Flamer: Weapon lifts and rolls top-right (`rot: [-0.24, 0, -0.62]`), bringing the fuel tanks under the receiver out to the left of the firing hand in clear camera view. Support palm cups tank, unseats it, carries it to pouch, brings up fresh tank, and locks it onto fittings at `u = 0.74`.
      - Rotary Gun (Minigun): Weapon lifts and rolls top-left (`rot: [-0.22, 0.16, 0.62]`), lifting the ammo box on the right into clear view. Support palm uncouples box, lowers it to pouch, brings fresh box up in palm, locks it into feeder, and returns to side peg.
  (5) Chainsaw Draw & Pull-Start (J82, D-128):
      - 1st Person: On draw, firing hand leaves rear throttle, grasps starter T-handle on recoil housing, pulls cord out to peak extension (`take = 1`, `cord = 1`), cord retracts into housing, and hand returns to throttle. Left support hand stays anchored on the hoop's left upright (`support: [-0.146, 0.165, -0.108]`), elbow flared out to left without screen obstruction.
      - 3rd Person: On draw, marine's right arm reaches down and pulls starter cord up and out in front of his right shoulder (35 cm stroke), cord retracts, and saw settles into idle run.
  (6) View Swap Hand-Over (D-125, CL-328):
      - Verified on GW-4 rifle and Tactical Pistol.
      - Inward transition (5 key into 1st person): Gun enters from left side with a dip, crossing to center over 0.35 s, right firing hand rising onto grip as it arrives (`VM.swap`).
      - Outward transition (5 key out of 1st person): Gun crosses from center to left side over 0.20 s before camera settles into 3rd person.
  (7) Lasers & Lights at Night (J73-J75, J86, J87, CL-327):
      - Night mode active (`training.lightsOff = true`, `isNight = true`).
      - Akimbo dual beams: Both laser beams are drawn in first person on Akimbo Wasps and Akimbo Pistols, projecting from both the left and right weapon lenses to the crosshair aim point.
      - Fast turn zero lag: During rapid 180 px/frame turns, laser origin remains pinned to the weapon attachment window with zero frame delay (`viewmodel.boreDelta`).
      - Flashlight through reload: Spotlight cone dynamically follows the weapon barrel's roll and pitch throughout the reload cycle.
  (8) View Gun Brass Ejection Burst:
      - Automatic burst on GW-4 verified: shell casings spawn via `viewCasingPoint` at the viewmodel ejection port, ejecting outward and tumbling naturally. No brass spawns behind the camera.

Files: `tools/ag-review-runner-ag273.mjs`, `tools/build-ag273-sheets.py`, `review/CL-326/*`, `qa/AG-273/*`, `handoffs/2026-11-10-antigravity-AG-273.md`.
Tests: Executed `tools/ag-review-runner-ag273.mjs` through shared game-test slot (`node crew/crew.mjs slot run antigravity AG-273 ...`) on RTX 5080 WebGPU hardware -> exit code 0, 0 WebGPU errors, 0 Three.js exceptions. Built 9 contact sheets via Python PIL -> exit code 0.
Screenshots:
  - Master Composite: `review/CL-326/cl326-cl327-master-review-sheet.jpg` (mirrored `qa/AG-273/cl326-cl327-master-review-sheet.jpg`)
  - Strip 1 (Revolver Reload): `review/CL-326/strip-01-revolver-reload.jpg`
  - Strip 2 (Launcher Reload): `review/CL-326/strip-02-launcher-reload.jpg`
  - Strip 3 (Breacher Empty Reload): `review/CL-326/strip-03-breacher-empty-reload.jpg`
  - Strip 4 (Heavy Weapons Reloads): `review/CL-326/strip-04-heavies-reloads.jpg`
  - Strip 5 (Chainsaw Draw & Pull-Start): `review/CL-326/strip-05-chainsaw-draw-pullstart.jpg`
  - Strip 6 (View Swap Hand-Over): `review/CL-326/strip-06-view-swap-handover.jpg`
  - Strip 7 (Lasers & Lights at Night): `review/CL-326/strip-07-lasers-lights-night.jpg`
  - Strip 8 (Brass Ejection Burst): `review/CL-326/strip-08-brass-burst.jpg`
  - 64 raw 1080p capture frames in `review/CL-326/` and `qa/AG-273/`
Not verified: Live multiplayer network latency.
Requests: Claude answered with DONE. Contact strips and master composite delivered to review/CL-326/ and qa/AG-273/.
Contract changes: none.
Family: First-Person Kinematics, Weapons & Lighting Verification. Scores (0-5): Precision 5/5, Evidence 5/5, Revolver True Counts 5/5, Launcher Dynamic Trips 5/5, Breacher Charging Handle 5/5, Heavy Weapons Roll 5/5, Chainsaw Pull 5/5, View Hand-Over 5/5, Lasers/Lights 5/5, Brass Origin 5/5.
Rule 16: Executed under single-instance WebGPU allocation through shared game-test slot under token validation.
