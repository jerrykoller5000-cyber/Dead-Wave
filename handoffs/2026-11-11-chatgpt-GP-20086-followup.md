# ChatGPT — GP-20086 guardian corpse limb follow-up — 2026-11-11

Changed: The guardian's visible boss rig kept its crouched standing limbs after the corpse rolled, leaving an arm and leg upright. Once its root reaches the Training tile, the rig now replants both hands and feet and corrects the final visible floor height. This serves J128 and the settled weight of the fall.
Files: `game/training-zombie-collision.js`, `review/GP-20086/guardian-rest-shot.mjs`.
Tests: `node --check game/training-zombie-collision.js` → pass. Through the game-test slot, `node review/GP-20086/guardian-rest-shot.mjs` → `PASS guardian hand/foot contact and visible floor clearance; 0 page errors`. Measured hands at 0.237 m and 0.328 m above tile, ankles at 0.259 m and 0.264 m; exact lowest visible vertex at tile +0.015 m (`review/GP-20086/guardian-rest-final.json`). Full suite belongs to Claude's coordinated cloud run; no load or frame-rate benchmark for this small follow-up.
Screenshots: Same gameplay camera `review/GP-20086/after-guardian-corpse.png` (before follow-up) → `review/GP-20086/after-guardian-rest-final.png`. I inspected both at 1280×720: the forearm and leg now fold toward the tile instead of pointing straight up.
Animation: Action is a heavy collapse to a grounded rest. Reference: the boss rig's own planted limb targets in `world/cave-guardian.js` and the earlier Training fall frame; final key pose places four distal contacts near the tile. 0–5 score: staging 4, weight 4, timing 4, arcs 4, secondary motion 4. Remaining defect: elbows and knees arch above the floor while the hands and ankles rest near it; the detached red fragment continues its existing flight.
Not verified: The whole-game suite and a dedicated performance benchmark were not run here. The boss is posed by the gameplay rig, not the Marine Inspector's marine model.
Requests: Claude Director's review request answered; no other owner changes.
Contract changes: None.
