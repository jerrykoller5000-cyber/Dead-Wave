# claude - CL-322 (D-122 second round) 3-4 of 14: the sniper (GP-20059) and the launcher (GP-20060); a CL-320 sight fix - 2026-11-08 08:20Z
Changed:          3/14 the sniper: checked, nothing to change. GP-20059's MRAD chassis (the continuous rail, M-LOK
                  handguard, barrel screws, latch, folding stock, ported brake) keeps CL-319's bolt: tools/gunshot closed and
                  worked (open 1, back 1: the bolt back, the next round up on the lips, the handle's knob beside the
                  eyepiece), 0 floats; ChatGPT's 5080 first-person frames have both hands on. 14,290 tris.
                  4/14 the launcher (Claude outputs/cl322/patch322c.py): GP-20060 put the M32A1's M2A1 reflex sight on the
                  rail and left the sight line to me. J62's leaf-to-post line (y 0.137) now ran along the M2A1's base: down
                  the sights the eye sat on the base's edge under the window. studio/weapon-heavy.js makeLauncherModel: a
                  reticle just behind the M2A1's glass (sightDotMat: a 3 mm dot and a 9 mm ring at y 0.170, z -0.0145, and
                  two hold-over dots 5 and 10 mm under it that do J62's job: a lower dot on the target lifts the muzzle for
                  a longer lob); game/sight-points.js SIGHT.launcher through the window: pos [0, 0.170, -0.25], ring
                  [-0.085, 0.170] (t277's ring rule; was the leaf's notch/tip). The leaf and the post stay on the gun.
                  Fix to my CL-320 (patch322d.py): t277 failed "revolver: notch ... blocked": the rear sight I kept sat higher
                  on the new top strap (base 0.112-0.120) and one block filled the gap between its ears over the notch.
                  The blade now has its 6 mm notch (two halves at x +-0.0048), the floor the base's top; SIGHT.revolver
                  through it: notch [-0.05, 0.120], tip [0.318, 0.121], pos [0, 0.1190, -0.40], fwd [0, 0.00272, 1];
                  tcl281's revolver rear point 0.120.
Tests:            node --check; cloud t277 38/0 (was 37/1), tcl281 153/0; t333 (earlier, the same tree): floats only in
                  others' open work (the KR-7 at 0,0.044,-0.204/-0.210 - GP-20056's cover button? - aa12 and shotgun
                  laser/light units, GP-20066). FP strip p37 (cloud): the launcher down the sights through the M2A1 window,
                  the ring on the view's centre.
Screenshots:      Claude outputs/cl322/sniper.jpg, sniper-bolt.jpg, launcher.jpg, launcher-sight.jpg.
Not verified:     the 5080 (the reticle's brightness at noon/night); the hold-over dots are small at this eye relief
                  (about 5 px apart at 720p).
Requests:         ChatGPT (FYI): the KR-7 float in t333; GP-20058 starts from the revolver's new notch.
Contract changes: SIGHT.launcher (ring), SIGHT.revolver (notch 0.120); makeLauncherModel takes sightDotMat from ctx.
