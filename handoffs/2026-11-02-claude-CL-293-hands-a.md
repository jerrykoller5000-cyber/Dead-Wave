# claude — CL-293 round 1, part 2a: the arms and the wrists (J54, AG-202) — 2026-11-02
Changed:          The view's sleeve runs 0.42 m past the elbow (and the rolled sleeve gets its roll and sleeve above the elbow), so no forearm ends in mid-air; the pistol's elbows follow each hand's own line (elbowFollow), so the wrists stay nearly straight and the forearms come in from the lower sides; live tuning hooks for the hands; the camo at the body's density (J63, earlier today).
Files:            studio/fp-arms.js (UPPER rings, the rolled sleeve, bodyCamoUV), game/viewmodel.js (elbowFollow, info.tune + retune(), VM_SOCKETS gripRot/supportRot), game/viewmodel-poses.js (pistol.elbowFollow [0.55, 0.25])
Tests:            cloud: tcl281 140/0 (the near plane, the elbows off the eye line, every gun's raise), tcl293 15/0.
Screenshots:      cloud WebGL looks (renderer=webgl, the stand-in for his GPU): base against the follow rule at two drops; the 0.25 m drop reads best (forearms from the lower sides, wrists straight).
Not verified:     On his RTX from his seat: AG's round-1 sheet. The pistol's support hand itself (the palm on the grip's side, the fingers over the strong hand's, the thumb forward) is part 2b: the body's hold puts the support wrist 16 cm out from the grip; the tuning hooks are for that.
Requests:         AG: the pistol (and the long guns, for the sleeve) from his seat when part 2b lands.
Contract changes: VM_POSES entries may carry elbowFollow: [length, drop]; VM_SOCKETS entries may carry gripRot / supportRot ([x, y, z] radians, YXZ, gun space, on top of the hold's turn). viewmodel.retune() re-reads the hands; viewmodel.info.tune[key] = { r: { p, r }, l: { p, r }, elbows } tries them live.

## What the look showed
From the eye the pistol's two forearms came up from the bottom corners and each wrist bent ~45-50 degrees in toward the gun (the hands' own line points out to the sides; the elbows sat 0.75 m below the eye). With the elbows on each hand's own line, the forearms come in from the sides and the wrists read straight; dropped 0.25 m at 0.55 m along, they come from the lower sides, which is how a close pistol hold looks. ChatGPT can put elbowFollow on the revolver (Jerry: the same hand issue) once AG has looked at the pistol.

## Part 2b: the pistol's support hand (same day)
The body's hold put the support fist 16 cm out from the grip, beside it. VM_SOCKETS.pistol.support = [-0.012, -0.10, -0.02]
(gun space, the fist's grip channel) brings it in onto the grip's front, its fingers over the strong hand's. On the cloud
look, from -0.03 in, -0.012 is where the fingers wrap the front without coming through the far side (0 came through;
a tilt toward thumbs-forward read no better at this size). Claude outputs/cl293/support-hand.png (the four tries) and
elbows-follow.png (part 2a). tcl281 140/0 on the cloud with it. A supportPose (the thumb forward) is wired but not set:
at the cloud's resolution the thumb doesn't read; AG's sheet from his seat decides it.
