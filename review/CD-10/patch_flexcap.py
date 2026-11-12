# CD-10 (cloud A/B): the TP_FIT wanted frame's wrist flex capped (a turn about the hand's own x, the grip channel: the fist
# rolls round the grip instead): right toward the palm <= CAPR, left both ways <= CAPL. Env-free: constants in the patch.
import sys
p = sys.argv[1]; CAPR = sys.argv[2] if len(sys.argv) > 2 else '0.15'; CAPL = sys.argv[3] if len(sys.argv) > 3 else '0.35'
s = open(p, encoding='utf-8', newline='').read()
a = "    const _cd8 = { p: new THREE.Vector3(), x: new THREE.Vector3() };\r\n"
assert s.count(a) == 1
s = s.replace(a, a +
  "    // CD-10 (tcc341): the fit's frame is the hand on the gun; where it would bend the wrist far (the gun swung across his\r\n"
  "    // chest), the glove's cuff came out through the sleeve's end. Past TP_FLEX the fist rolls round the grip instead (a turn\r\n"
  "    // about the hand's own x, the channel, so the grip stays in the fist): the firing wrist toward the palm, the support both ways.\r\n"
  "    const TP_FLEX = { r: [-Infinity, " + CAPR + "], l: [-" + CAPL + ", " + CAPL + "] };\r\n"
  "    const _tpc = { v: new THREE.Vector3(), q: new THREE.Quaternion(), x: new THREE.Vector3(1, 0, 0) };\r\n"
  "    function tpCapFlex(q, elbowG) { const lim = elbowG === marine.userData.elbowLG ? TP_FLEX.l : TP_FLEX.r; const d = _tpc.v.set(0, 1, 0).applyQuaternion(_tpc.q.copy(q).invert()); const flex = Math.atan2(d.z, d.y), c = Math.max(lim[0], Math.min(lim[1], flex)); if (flex !== c) q.multiply(_tpc.q.setFromAxisAngle(_tpc.x, flex - c)); }\r\n")
b = "_wr.q.copy(elbowG.getWorldQuaternion(_wr.e).invert()).multiply(_tpW.t); } else"
assert s.count(b) == 1
s = s.replace(b, "_wr.q.copy(elbowG.getWorldQuaternion(_wr.e).invert()).multiply(_tpW.t); tpCapFlex(_wr.q, elbowG); } else")
c = "if (wr) { wr.quaternion.copy(ud.elbowRG.getWorldQuaternion(_wr.e).invert().multiply(_tpW.q)); limitWrist"
assert s.count(c) == 1
s = s.replace(c, "if (wr) { wr.quaternion.copy(ud.elbowRG.getWorldQuaternion(_wr.e).invert().multiply(_tpW.q)); tpCapFlex(wr.quaternion, ud.elbowRG); limitWrist")
open(p, 'w', encoding='utf-8', newline='').write(s); print('patched', CAPR, CAPL)
