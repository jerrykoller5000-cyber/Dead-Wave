# mkwire.py <in index.html> <out>: CD-9 (lent): the third-person handgun hold on TP_FIT (game/tp-fit.js), on top of Claude 2's
# CD-8 interim. CRLF kept.
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8', newline='').read(); n0 = len(s)
def rep(a, b, cnt=1):
    global s
    a = a.replace('\r\n', '\n').replace('\n', '\r\n'); b = b.replace('\r\n', '\n').replace('\n', '\r\n')
    assert s.count(a) == cnt, (a[:100], s.count(a)); s = s.replace(a, b)
# 1. the table
rep("    import { VM_FIT } from './game/viewmodel-fit.js';   // CD-8: first person's fitted support hand on the pistol, for third person too",
    "    import { VM_FIT } from './game/viewmodel-fit.js';   // CD-8: first person's fitted support hand on the pistol, for third person too\n"
    "    import { TP_FIT } from './game/tp-fit.js';   // CD-9: the third-person fit of the one-handgun hold (both hands, their whole frames)")
# 2. the anchors from the fit (one handgun; the akimbo pair keeps grip)
rep("\n    // GB-130 (Jerry): the grip and support points are read off each model, not guessed",
    "\n    // CD-9 (J142d/e in third person): with one pistol or revolver in his hands the firing fist's grip point goes on TP_FIT r.p\n"
    "    // (gripFit; the akimbo pair keeps grip) and the support fist's on TP_FIT l.p (fore). Their hold points sit 3-4 cm toward the gun\n"
    "    // side (below) so the fitted arm stays inside the shoulder's table and the firing wrist under 0.75 rad at every pitch (t229).\n"
    "    for (const k of ['pistol', 'revolver']) { const F = TP_FIT[k]; if (F && F.r && F.l && F.r.p && F.l.p) { WEAPON_HOLD[k].gripFit = F.r.p.slice(); WEAPON_HOLD[k].fore = F.l.p.slice(); } }\n"
    "    // GB-130 (Jerry): the grip and support points are read off each model, not guessed")
# 3. the fits, both handguns, and the wanted frame
i = s.index("    function supportFitL() {"); j = s.index("\r\n", i)
s = s[:i] + (
    "    // CD-9: the firing and support hands on one pistol or revolver take TP_FIT's whole frame (its roll included, so the firing\r\n"
    "    // index lies along the frame) and its finger pose; the forearm's roll takes its share and the wrist the rest (holdHand).\r\n"
    "    function handgunFitR() { return HANDS.fore[currentWeapon] === 'grip' && !akimboOn() && TP_FIT[currentWeapon] && TP_FIT[currentWeapon].r && TP_FIT[currentWeapon].r.pose ? TP_FIT[currentWeapon].r : null; }\r\n"
    "    function supportFitL() { return HANDS.fore[currentWeapon] === 'grip' && !akimboOn() && TP_FIT[currentWeapon] && TP_FIT[currentWeapon].l && TP_FIT[currentWeapon].l.pose ? TP_FIT[currentWeapon].l : null; }\r\n"
    "    // The wanted world turn of a hand: the gun's world quaternion times the fit's frame (basis x, y in the gun's space); holdHand\r\n"
    "    // reads it for the hand whose elbow is _tpW.el (set just before that hand's hold, cleared after).\r\n"
    "    const _tpW = { el: null, q: new THREE.Quaternion(), m: new THREE.Matrix4(), x: new THREE.Vector3(), y: new THREE.Vector3(), z: new THREE.Vector3(), b: new THREE.Quaternion(), g: new THREE.Quaternion(), t: new THREE.Quaternion(), p: new THREE.Vector3() };\r\n"
    "    function tpWant(elbowG, F, gunQ) { if (!F || !F.basis) { _tpW.el = null; return; } const x = _tpW.x.set(F.basis.x[0], F.basis.x[1], F.basis.x[2]).normalize(), y = _tpW.y.set(F.basis.y[0], F.basis.y[1], F.basis.y[2]); y.addScaledVector(x, -y.dot(x)).normalize(); _tpW.z.crossVectors(x, y); _tpW.m.makeBasis(x, y, _tpW.z); _tpW.b.setFromRotationMatrix(_tpW.m); _tpW.q.copy(gunQ).multiply(_tpW.b); _tpW.el = elbowG; }"
) + s[j:]
rep("""    // CD-8 interim (CLAUDE DIRECTOR (c), 12 Nov): the pistol's support hand on first person's fit (VM_FIT.pistol.l: its fist's
    // channel point p and line basis.x in gun space, its pose), one pistol in his hands. The revolver and the firing hands wait
    // for a third-person fit (CD-9): first person's poses roll the firing index off the gun on the third-person arm.
""", """    // CD-8 interim (CLAUDE DIRECTOR (c), 12 Nov) became CD-9: both hands on the third-person fit (first person's poses, as they
    // were, rolled the firing index off the gun on the third-person arm).
""")
# 4. the firing fist's fingers
rep("      if (rr) { _hp.r = lerpPose(rest, HAND_POSES.fist,", "      const fitR = handgunFitR();   // CD-9: the firing fist in the fit's pose on one handgun\n      if (rr) { _hp.r = lerpPose(rest, fitR ? fitR.pose : HAND_POSES.fist,")
rep("      // CD-8 (J142d/e): on the pistol the support hand takes first person's fitted pose (VM_FIT l: the thumb forward along the",
    "      // CD-8 (J142d/e), CD-9: on the pistol and the revolver the support hand takes the fit's pose (TP_FIT l: the thumb forward along the")
# 5. holdHand: the first aim and the turn from the wanted frame
rep("      const t = _wr.t.copy(g).applyQuaternion(_wr.q).negate().add(anchorW);",
    "      // CD-9: a wanted frame (tpWant) aims the wrist so that frame puts the grip point on the anchor\r\n"
    "      // (as far as the hold has come in, k * a of the way; the passes below settle it)\r\n"
    "      const t = _tpW.el === elbowG ? _wr.t.copy(g).multiply(wr.getWorldScale(_wr.c)).applyQuaternion(_tpW.t.copy(_wr.q).slerp(_tpW.q, Math.min(1, k * a))).negate().add(anchorW) : _wr.t.copy(g).applyQuaternion(_wr.q).negate().add(anchorW);")
rep("""        _wr.q.setFromUnitVectors(_wr.c.set(sign, 0, 0), d);
        const ang = 2 * Math.acos(Math.min(1, Math.abs(_wr.q.w)));
        const s = (ang > WRIST.max ? WRIST.max / ang : 1) * k * a;""",
"""        // CD-9: a wanted frame (TP_FIT) is the whole turn, k * a of the way from the forearm as the first pass leaves it and then
        // fixed in the world, so the passes close on it (limitWrist holds it inside the table)
        const want = _tpW.el === elbowG;
        if (want) { if (i === 0) _tpW.t.copy(elbowG.getWorldQuaternion(_wr.e)).slerp(_tpW.q, Math.min(1, k * a)); _wr.q.copy(elbowG.getWorldQuaternion(_wr.e).invert()).multiply(_tpW.t); } else
        _wr.q.setFromUnitVectors(_wr.c.set(sign, 0, 0), d);
        const ang = 2 * Math.acos(Math.min(1, Math.abs(_wr.q.w)));
        const s = want ? 1 : (ang > WRIST.max ? WRIST.max / ang : 1) * k * a;""")
# 6. the firing hand: G, the pole, the wanted frame, the shoulder held before the gun is placed
rep("        const anchor = _hv.anchor.copy(armR.position).add(off);", "        const G = !aki && H.gripFit ? H.gripFit : H.grip;   // CD-9: the firing fist's place on the gun (one handgun: TP_FIT)\n        const anchor = _hv.anchor.copy(armR.position).add(off);")
rep("mzL.x - H.grip[0], mzL.y - H.grip[1], mzL.z - H.grip[2]", "mzL.x - G[0], mzL.y - G[1], mzL.z - G[2]")
rep("const fw = _hv.g.set(H.fore[0] - H.grip[0], H.fore[1] - H.grip[1], H.fore[2] - H.grip[2])", "const fw = _hv.g.set(H.fore[0] - G[0], H.fore[1] - G[1], H.fore[2] - G[2])")
rep("heldWallPull(gun, H, _wallHold.shoulderR, anchor, H.grip, _hq.gun, 'r', dt);", "heldWallPull(gun, H, _wallHold.shoulderR, anchor, G, _hq.gun, 'r', dt);")
rep("        else handRollR = holdDiveHand(armR, ud.elbowRG, _HAND_R, anchor, gripDownDir(_rl.w).applyQuaternion(_hq.gun), 1, poleR, k, 1);   // CL-188: akimbo, the elbow in   // CL-122, CU-100; GB-151: a mirrored fist's index is at +x",
    "        else {\n"
    "          const FR = G !== H.grip ? handgunFitR() : null;\n"
    "          tpWant(ud.elbowRG, FR, _hq.gun);\n"
    "          handRollR = holdDiveHand(armR, ud.elbowRG, _HAND_R, anchor, (FR ? _cd8.x.set(-FR.basis.x[0], -FR.basis.x[1], -FR.basis.x[2]) : gripDownDir(_rl.w)).applyQuaternion(_hq.gun), 1, poleR, k, 1);\n"
    "          if (FR) {\n"
    "            // CD-9: holdFreeShoulders (last in the frame) would turn this shoulder back inside the table after the gun and the\n"
    "            // support hand are placed, and the gun rides the forearm: hold it now, put the fit's frame back on the forearm as it\n"
    "            // is, and place the gun from where the hand is.\n"
    "            holdFreeShoulders(); ud.elbowRG.updateMatrixWorld(true);\n"
    "            const wr = wristOf(ud.elbowRG);\n"
    "            if (wr) { wr.quaternion.copy(ud.elbowRG.getWorldQuaternion(_wr.e).invert().multiply(_tpW.q)); limitWrist(ud.elbowRG, wr, handRollR); wr.updateMatrixWorld(true); fistPointW(ud.elbowRG, _HAND_R, 1, anchor); }\n"
    "          }\n"
    "          _tpW.el = null;\n"
    "        }   // CL-188: akimbo, the elbow in   // CL-122, CU-100; GB-151: a mirrored fist's index is at +x")
rep("const grip = _hv.f.set(H.grip[0], H.grip[1], H.grip[2]).multiply(_hScale).applyQuaternion(_hq.gun);", "const grip = _hv.f.set(G[0], G[1], G[2]).multiply(_hScale).applyQuaternion(_hq.gun);")
# 7. the support hand
rep("\n        handRollL = holdHand(armL, ud.elbowLG, _HAND_L, fore, chL, sgL, poleL, holdWL * k, aL, holdWL * k * handRollLW);",
    "\n        tpWant(ud.elbowLG, wrapG ? supportFitL() : null, gun.getWorldQuaternion(_tpW.g));   // CD-9: the support hand on its whole frame\n"
    "        handRollL = holdHand(armL, ud.elbowLG, _HAND_L, fore, chL, sgL, poleL, holdWL * k, aL, holdWL * k * handRollLW);\n"
    "        _tpW.el = null;")
# 8. the hold points (CD-9 scan: the fitted firing hand's arm stays inside the shoulder's table and the wrist under 0.75 rad
#    at every pitch): 3-4 cm toward the gun side
rep("      pistol:   { twist: 0.1, hold: [-0.32, -0.08, 0.4],", "      pistol:   { twist: 0.1, hold: [-0.29, -0.08, 0.4],")
rep("      revolver: { twist: 0.1, hold: [-0.32, -0.08, 0.4],", "      revolver: { twist: 0.1, hold: [-0.28, -0.08, 0.4],")
open(dst, 'w', encoding='utf-8', newline='').write(s); print('wired', len(s) - n0)
