# Claude 7

state: active
model: Claude Opus 5.5 (claude-opus-5-5)
task: CG-5 Director's 08:22Z/08:45Z: note 46 (sniper flashlight thumb 4.6 mm, tce4) + GT-20104's last blocker (revolver index rest in its guard, tcl334b)
touching: game/viewmodel-poses.js (director's loans: VM_LIGHT.sniper entry, VM_TRIGGER.revolver entry), review/CG-5
since: 2026-11-13T08:44Z
next: —
blocked-on: —
last-report: handoffs/2026-11-13-claude7-CG-4.md

## Notes
- Cloud workflow: tar code dirs -> "_DELETE ME/claude7-tt-HHMM.tgz" (+ assets tgz), stage, untar /home/claude/tt. Harness x7/live.mjs (job files) and review/CG-1/capture.mjs (--soft --fill: a white key light, the same before/after; the perf HUD hidden). Training in SwiftShader is sometimes dim: capture waits for the Training warm and logs lights per shot.
- CG-1 root causes (13 Nov): eye-hide dropped between guns (3P arms+gun drawn in the eye ~13 frames per change of gun) and the view's upper sleeve stretched up to 2.5x. Fixed: viewmodel.js c9a86747 (Claude 5 loan), fp-arms.js 98f169e2 (Claude 1 loan), index.html st.eye (Claude 2 loan, 86684a42), tools/tests/tcg1.js (before 6/11, after 17/0).
- Leads not mine: glove camo 18% larger than sleeve (marine-hand.js CAMO_TILE in hand units x HAND_SCALE 1.18) -> Claude 1. CG-2 moved to Claude 10 (CJ-1); my untested coplanar probe is in Claude outputs/CG-1/coplanar-probe.js.
- CG-3 (13 Nov, from Claude 1's CD-13): chainsaw r (note 39) landed 05:1xZ, flamer r (54) landed 05:58Z, both for review (handoffs/2026-11-13-claude7-CG-3-*.md). Sniper (40) BLOCKED: the folded bipod (rods+collars under the forend) is where the support palm must go; asked the Director (A: modeler tucks the legs, then refit). Cloud: tools/handfit set up at /home/claude/{gs306->tt, fpshot, handfit-work, work, look/v2}; my scripts /home/claude/cg3/{iter.sh, shift.sh, posesearch.py, gaps2.py, nearpart2.py}.
- 07:12Z: CG-3 done: sniper (bipod folded forward + support hand, landed 07:1xZ), chainsaw, flamer grip all landed; flamer trigger (a) = after the playtest (move the trigger toward the grip, then VM_TRIGGER.flamer). Queue empty: standby.

## CG-4 (done 08:1xZ, for review)
- Akimbo left pistol barrel follows its own slide: viewmodel.js CE-11 block loops [gun, gun2] (info.barrel2); index.html syncDualWeaponParts calls pistolBarrelFollow(offhandMeshes.pistol). Landed ~07:29Z md5-guarded, owners (Claude 5, Claude 2) told.
- tcg4 (new) 9/3 -> 12/0; tce11, tcb333, tce10, tcl301 green; ChatGPT 2 pair-barrels.mjs PASS in my slot. Pictures review/CG-4/. Handoff handoffs/2026-11-13-claude7-CG-4.md. ChatGPT 2 asked to rerun natively.
- Cloud: originals /home/claude/cg4/*.orig.*, fixed copies *.cg4.*. Next: flamer option (a) after the playtest; standby.
- 08:4xZ: CG-3 bipod tweak landed (weapon-longarms.js 398caa2c, legs parallel ~6 mm under the barrel from a barrel-clamp hinge ahead of the fore-end cap), for review: handoffs/2026-11-13-claude7-CG-3-bipod-tweak.md.
- Backup for Claude 2's final gate from ~12:00Z (Director, only if told): recipe in crew/status/claude2.md lines ~30 (test list) and ~103 (cloud copy tar; intro *.js/*.css separately).
- 10:0xZ: CG-5 part 1 (revolver trigger index, GT-20104 last blocker) LANDED viewmodel-poses.js 703e3079, for review (handoffs/2026-11-13-claude7-CG-5-revolver.md); tcl334b 5/0, tce9/10/11 green; ChatGPT 2 FYI to rerun native.
- CG-5 part 2 (note 46 sniper light-press): diagnosed (hold flush to fore-end rail; finger-relax pushes glove ~4mm into rail at the 2-3 reach/return frames before the w-weighted arc engages). Best tuning 8.8->4mm, not <0.5. Needs a model/hold clearance OR a lead-out mechanism change. Asked the Director to defer post-playtest or land the interim arc. Cloud probes: /home/claude/cg5/, originals /home/claude/cg5/*.orig.js.
