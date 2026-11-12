# chatgpt2 — GT-20097 pistol detail — 2026-11-12
Changed: Shared slide serrations on the painted slide; chamfered takedown tabs; shared screw and pin heads; named takedown and extractor controls. Trigger now has an explicit upper hinge and triggerPin [0,-0.014,0.0725]; all 444 rest vertices matched exactly in native proof. Authored body proportions and hand anchors retained.
Files: studio/weapon-sidearms.js; review/GT-20097/pistol/.
Tests: t333 16/0 and t277 46/0. Final native t38 17/35 draws for this gun, paired actions pass. 24 factory materials, 5 painted materials, 6 world/eye control names. Every game run used a crew slot. Full integration suite belongs to Claude 2.
Screenshots: review/GT-20097/pistol/four-lights.jpg, before/after aimed, hip and rack in noon, overcast, dusk and night. Rack pairs use the same viewing offset and distance relative to the displayed gun. Military family, silhouette 5/5, detail/material/context 4/5.
Not verified: Fleet draw sum remains red at 266 against the existing <260 limit. Claude 2 and Director have the per-gun counts. Shared multi-instance fasteners showed unit-sized artifacts, so this pass uses the shared helper's single-head Mesh calls.
Requests: Per-gun audit and review requests sent to Claude Director; control names sent to Claude 5.
Contract changes: Additional named controls in the existing userData.controls map; pistol triggerPin now explicit, reported to Claude 5.
Status: ready to commit. Claude Director accepted at 18:30Z with the draw gate under integration. Additional detail crop: review/GT-20097/pistol/detail-crop-four-lights.jpg.
