# claude - CL-307 the knife and the grenade in first person (D-119, Jerry 7 Nov: "from how you throw grenades, use the knife") - 2026-11-07
Changed:          Before: a knife swing dropped the view gun and the body's left arm (he is left-handed) swept past the eye as a
                  dark blob (fpshot p9-kg); a grenade throw showed nothing at all in the view (the gun stood still while the arc
                  drew and the grenade flew). Now the view does both itself:
                  1) The blade (VM_BLADES: knife thrust 0.22 s, machete chop 0.40 s, katana cut 0.30 s): the gun is put away
                     below the view (and hidden), the firing hand comes up with a copy of his knife group (whichever of the
                     three shows) on a path of gun-like frames in view space (yaw/pitch/roll plus a swing about the view's
                     depth axis, which the chop needs: turned from up to down through pitch alone the blade points away from
                     the eye and vanishes behind the fist), the support hand out of the view, the gun back up after (0.14 s).
                     Filmed (fpshot p16-kn): raised at the top right with the blade straight up, swept across with its flat
                     to the eye, the follow-through at the lower centre with the forearm from the right (not a log across
                     the view), back. The knife's thrust path is authored, not yet filmed (the cloud save owns a machete).
                  2) The grenade (VM_GRENADE, on index.html GRENADE_ANIM's phases and times, passed as st.grenade): the
                     support hand leaves the gun to the pouch (the grenade in the fist from inHand), up to cocked beside the
                     head while G is held (a breathing bob), the whip forward on the release, the open hand's follow-through,
                     back to the gun; the gun stays up in the firing hand. Filmed (fpshot p16-gr): reads; the cocked fist was
                     30 cm from the eye (a corner-sized fist), moved to 42 cm.
                  3) The sniper's bolt handle back on the gun's left (+x; patch306k) so it reads on the RIGHT in first person:
                     the view mirrors his left-handed hold (D-75), so GB-146's -x (Jerry, 9 Oct, for the old unmirrored eye)
                     read on the left again. The firing hand's grab, the lift's side and the brass follow boltSide.
Files:            game/viewmodel.js (bladeFrame, grenadeFrame, the copies, the side-aware bolt grab), game/viewmodel-poses.js
                  (VM_BLADES, VM_GRENADE, sniper boltKnob), index.html (st.blade, st.grenade, ctx.blade/grenade, st.want
                  through a swing; CASING_WEAPONS.sniper side), studio/weapon-longarms.js (the bolt's side BS).
                  Scripts: Claude outputs/cl306/patch306k.py, cl307/patch307a..f.py.
Tests:            node --check all; tcl281 running in the cloud after the lot (148/0 after CL-306 b-g); strips p11-p16.
Not verified:     the 5080 (AG's four-light set for the knife/grenade: beats u .3/.55/.8 of the swing; the throw's cocked,
                  whip and follow); the knife's thrust and the katana's cut (only the machete filmed); the mortar, ladders,
                  building and the empty hands (still the body's arms; next).
Requests:         AG: a review set for the blade (hip, each of the three) and the grenade (cocked/whip/follow) after the next
                  checkpoint. Grokbot: nothing. Jerry: the bolt's side (see the daily update).
Contract changes: st.blade { kind, u } and st.grenade { phase, t } (index.html -> viewmodel.update); ctx.blade(), ctx.grenade();
                  info.blade; handPlace 'blade' | 'grenade'; gun.userData.boltSide read by the view.
