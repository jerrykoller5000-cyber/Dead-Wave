# mktrial.py: the cloud-only trial hold (CD-9) on the current index.html: both handgun hands on TP_FIT, each its whole frame
import re, sys
D = open("/mnt/user-data/uploads/Tiny Trek/Claude outputs/CD-8-3p/cd8-3p-both-hands.diff").read()
s = open('index.orig.html', newline='').read(); n0 = len(s)
def rep(a, b, cnt=1):
    global s
    a = a.replace('\r\n', '\n').replace('\n', '\r\n'); b = b.replace('\r\n', '\n').replace('\n', '\r\n')
    assert s.count(a) == cnt, (a[:90], s.count(a)); s = s.replace(a, b)
hl = [l for l in D.split('\n')]
plus_dive = [l[1:] for l in hl if l.startswith('+') and 'else handRollR = holdDiveHand' in l][0]
minus_dive = [l[1:] for l in hl if l.startswith('-') and 'else handRollR = holdDiveHand' in l][0]
rep("        const anchor = _hv.anchor.copy(armR.position).add(off);", "        const G = !aki && H.gripFit ? H.gripFit : H.grip;   // CD-8: the firing fist's place on the gun (one handgun: the fit)\n        const anchor = _hv.anchor.copy(armR.position).add(off);")
rep("mzL.x - H.grip[0], mzL.y - H.grip[1], mzL.z - H.grip[2]", "mzL.x - G[0], mzL.y - G[1], mzL.z - G[2]")
rep("const fw = _hv.g.set(H.fore[0] - H.grip[0], H.fore[1] - H.grip[1], H.fore[2] - H.grip[2])", "const fw = _hv.g.set(H.fore[0] - G[0], H.fore[1] - G[1], H.fore[2] - G[2])")
rep("heldWallPull(gun, H, _wallHold.shoulderR, anchor, H.grip, _hq.gun, 'r', dt);", "heldWallPull(gun, H, _wallHold.shoulderR, anchor, G, _hq.gun, 'r', dt);")
rep(minus_dive, plus_dive)
rep("const grip = _hv.f.set(H.grip[0], H.grip[1], H.grip[2]).multiply(_hScale).applyQuaternion(_hq.gun);", "const grip = _hv.f.set(G[0], G[1], G[2]).multiply(_hScale).applyQuaternion(_hq.gun);")
rep("import { VM_FIT } from './game/viewmodel-fit.js';", "import { VM_FIT } from './game/viewmodel-fit.js'; import { TP_FIT } from './game/tp-fit.js';   // CD-9 cloud trial")
rep("\n    // GB-130 (Jerry): the grip and support points are read off each model, not guessed",
    "\n    for (const k of ['pistol', 'revolver']) { const F = TP_FIT[k]; if (F && F.r && F.l && F.r.p && F.l.p) { WEAPON_HOLD[k].gripFit = F.r.p.slice(); WEAPON_HOLD[k].fore = F.l.p.slice(); } }   // CD-9 trial\n    // GB-130 (Jerry): the grip and support points are read off each model, not guessed")
i = s.index("    function supportFitL() {"); j = s.index("\n", i)
s = s[:i] + """    function handgunFitR() { return HANDS.fore[currentWeapon] === 'grip' && !akimboOn() && TP_FIT[currentWeapon] && TP_FIT[currentWeapon].r && TP_FIT[currentWeapon].r.pose ? TP_FIT[currentWeapon].r : null; }   // CD-9 trial
    function supportFitL() { return HANDS.fore[currentWeapon] === 'grip' && !akimboOn() && TP_FIT[currentWeapon] && TP_FIT[currentWeapon].l && TP_FIT[currentWeapon].l.pose ? TP_FIT[currentWeapon].l : null; }
    const _tpW = { el: null, q: new THREE.Quaternion(), m: new THREE.Matrix4(), x: new THREE.Vector3(), y: new THREE.Vector3(), z: new THREE.Vector3(), b: new THREE.Quaternion(), g: new THREE.Quaternion() };
    function tpWant(elbowG, F, gunQ) { if (!F || !F.basis) { _tpW.el = null; return; } const x = _tpW.x.set(F.basis.x[0], F.basis.x[1], F.basis.x[2]).normalize(), y = _tpW.y.set(F.basis.y[0], F.basis.y[1], F.basis.y[2]); y.addScaledVector(x, -y.dot(x)).normalize(); _tpW.z.crossVectors(x, y); _tpW.m.makeBasis(x, y, _tpW.z); _tpW.b.setFromRotationMatrix(_tpW.m); _tpW.q.copy(gunQ).multiply(_tpW.b); _tpW.el = elbowG; }""" + s[j:]
rep("if (rr) { _hp.r = lerpPose(rest, HAND_POSES.fist,", "const fitR = handgunFitR(); if (rr) { _hp.r = lerpPose(rest, fitR ? fitR.pose : HAND_POSES.fist,")
rep("""        _wr.q.setFromUnitVectors(_wr.c.set(sign, 0, 0), d);
        const ang = 2 * Math.acos(Math.min(1, Math.abs(_wr.q.w)));
        const s = (ang > WRIST.max ? WRIST.max / ang : 1) * k * a;""",
"""        const want = _tpW.el === elbowG;   // CD-9 trial: the fit's whole frame on the forearm as it is now
        if (want) _wr.q.copy(elbowG.getWorldQuaternion(_wr.e).invert()).multiply(_tpW.q); else
        _wr.q.setFromUnitVectors(_wr.c.set(sign, 0, 0), d);
        const ang = 2 * Math.acos(Math.min(1, Math.abs(_wr.q.w)));
        const s = (want ? 1 : ang > WRIST.max ? WRIST.max / ang : 1) * k * a;""")
rep("        else handRollR = holdDiveHand(armR, ud.elbowRG, _HAND_R, anchor, (G !== H.grip && handgunFitR()",
    "        else { tpWant(ud.elbowRG, G !== H.grip ? handgunFitR() : null, _hq.gun); handRollR = holdDiveHand(armR, ud.elbowRG, _HAND_R, anchor, (G !== H.grip && handgunFitR()")
i = s.index("tpWant(ud.elbowRG"); j = s.index("\r\n", i); s = s[:j] + "\r\n        if (_tpW.el === ud.elbowRG) { /* CD-9 trial: the right shoulder held inside the table now (holdFreeShoulders would turn it after the gun and the support hand are placed), then the wanted frame again on the forearm as it is, and the gun from where the hand is */ holdFreeShoulders0(); ud.elbowRG.updateMatrixWorld(true); const wr = wristOf(ud.elbowRG); if (wr) { wr.quaternion.copy(ud.elbowRG.getWorldQuaternion(_wr.e).invert().multiply(_tpW.q)); limitWrist(ud.elbowRG, wr, handRollR); wr.updateMatrixWorld(true); const _a0 = ud.torsoG.worldToLocal(anchor.clone()); fistPointW(ud.elbowRG, _HAND_R, 1, anchor); (window.__tpdbg = window.__tpdbg || {}).shift = ud.torsoG.worldToLocal(anchor.clone()).sub(_a0).toArray(); } }\r\n        _tpW.el = null; { ud.elbowRG.updateMatrixWorld(true); const t = (window.__tpdbg = window.__tpdbg || {}); t.elRHold = Array.from(ud.elbowRG.matrixWorld.elements); t.nR = (t.nR || 0) + 1; t.lastRdt = dt; } }" + s[j:]
rep("\n        handRollL = holdHand(armL, ud.elbowLG, _HAND_L, fore, chL, sgL, poleL, holdWL * k, aL, holdWL * k * handRollLW);",
    "\n        tpWant(ud.elbowLG, wrapG ? supportFitL() : null, gun.getWorldQuaternion(_tpW.g)); handRollL = holdHand(armL, ud.elbowLG, _HAND_L, fore, chL, sgL, poleL, holdWL * k, aL, holdWL * k * handRollLW); _tpW.el = null;")
rep("      const t = _wr.t.copy(g).applyQuaternion(_wr.q).negate().add(anchorW);",
    "      const t = _tpW.el === elbowG ? _wr.t.copy(g).multiply(wr.getWorldScale(_wr.c)).applyQuaternion(_tpW.q).negate().add(anchorW) : _wr.t.copy(g).applyQuaternion(_wr.q).negate().add(anchorW);   // CD-9 trial: the first aim from the wanted frame")
rep("""      wr.updateMatrixWorld(true);
      if (elbowG === marine.userData.elbowRG) { wristTurnR = turn; wristNeedR = need; gripAR = a; }""",
"""      wr.updateMatrixWorld(true);
      if (_tpW.el === elbowG) { const gw = wr.localToWorld(_wr.c.copy(g)); (window.__tpdbg = window.__tpdbg || {})[elbowG === marine.userData.elbowRG ? 'r' : 'l'] = { anchor: anchorW.toArray(), k, a, miss: gw.distanceTo(anchorW), turn, need }; }   // CD-9 trial debug
      if (elbowG === marine.userData.elbowRG) { wristTurnR = turn; wristNeedR = need; gripAR = a; }""")
rep("""    function holdFreeShoulders() {
      if (gameOver) return;
      const ud = marine.userData;""", """    function holdFreeShoulders() { const _u = marine.userData, _q0 = [_u.armRG.quaternion.clone(), _u.armLG.quaternion.clone(), _u.elbowRG.quaternion.clone(), _u.elbowLG.quaternion.clone()]; const _sa = (arm, side) => { const u = new THREE.Vector3(0, -IK_UPPER, 0).applyQuaternion(arm.quaternion), h = new THREE.Vector3(1, 0, 0).applyQuaternion(arm.quaternion); const a = shoulderAngles([u.x, u.y, u.z], [h.x, h.y, h.z], side); return { a, past: shoulderPast(a) }; }; const _sb = _sa(_u.armRG, 1); holdFreeShoulders0(); (window.__tpdbg = window.__tpdbg || {}).shR = { before: _sb, after: _sa(_u.armRG, 1) }; (window.__tpdbg = window.__tpdbg || {}).fs = [_u.armRG, _u.armLG, _u.elbowRG, _u.elbowLG].map((o, i) => { const a = o.quaternion, b = _q0[i]; return +(2 * Math.acos(Math.min(1, Math.abs(a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w))) * 57.3).toFixed(3); }); }   // CD-9 trial debug
    function holdFreeShoulders0() {
      if (gameOver) return;
      const ud = marine.userData;""")
rep("""      poseDiveBrace();
    }
    // GP-188: keep the saw fixed""", """      poseDiveBrace();
      { gun.updateMatrixWorld(true); const t = (window.__tpdbg = window.__tpdbg || {}); t.gunEnd = Array.from(gun.matrixWorld.elements); ud.elbowRG.updateMatrixWorld(true); t.elREnd = Array.from(ud.elbowRG.matrixWorld.elements); t.mountEnd = weaponMount ? Array.from(weaponMount.matrix.elements) : null; t.frameEnd = (t.frameEnd || 0) + 1; t.nREnd = t.nR; const w = wristOf(ud.elbowRG); if (w) { w.updateMatrixWorld(true); t.wrREnd = Array.from(w.matrixWorld.elements); } }   // CD-9 trial debug
    }
    // GP-188: keep the saw fixed""")
for nm in ['knifeArm();   // CL-122', 'updateMarineDraw(dt);   // CL-90 part 2', 'grenadeArm();   // CU-97', 'marineIdle.pose(dt);', 'updateWatchmanExperiencePose(dt);   // GP-174', 'ladderHands();   // CL-180', 'vaultHands();   // GP-19900', 'holdFreeShoulders();   // CB-291: last']:
    a = '        ' + nm
    assert s.count(a) >= 1, nm
    i = s.index(a); j = s.index('\r\n', i)
    tag = nm.split('(')[0].split('.')[-1]
    s = s[:j] + " { const _g = getActiveGun && getActiveGun(); if (_g) { _g.updateMatrixWorld(true); ((window.__tpdbg = window.__tpdbg || {}).steps = window.__tpdbg.steps || {})['%s'] = _g.getWorldPosition(new THREE.Vector3()).toArray(); } }" % tag + s[j:]
PR = lambda tag: "{ const _t = (window.__tpdbg = window.__tpdbg || {}); _t.pr = _t.pr || {}; _t.pr['%s'] = ud.elbowRG.quaternion.toArray(); } " % tag
for tag, a in (('a', "      if(vault) { offhandMount.visible=false;return; }"), ('b', "      holdWL += (wantL - holdWL) * _lerpK(16, dt);\r\n      if (holdWL < 0.01) return;"), ('c', "      if (magInHand) {"), ('d', "      poseDiveBrace();\r\n      { gun.update")):
    assert s.count(a) == 1, (tag, s.count(a)); s = s.replace(a, "      " + PR(tag) + a.lstrip(' '), 1)
s = s.replace("t.elRHold = Array.from(ud.elbowRG.matrixWorld.elements);", "t.elRHold = Array.from(ud.elbowRG.matrixWorld.elements); t.qRHold = ud.elbowRG.quaternion.toArray();", 1)
open('index.trial.html', 'w', newline='').write(s); print('trial ok', len(s) - n0)
