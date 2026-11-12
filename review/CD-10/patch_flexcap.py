# CD-10 (lent: holdHand, the two lines above it, the CD-9 post-step call): the TP_FIT wanted frame's wrist flex capped
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8', newline='').read()
a = "    // Put the hand's grip point on anchorW with its channel (+x times sign) along channelW (world), by k (the forearm's\r\n    // roll by rollK); a as above. Returns the forearm's roll.\r\n    function holdHand("
assert s.count(a) == 1
s = s.replace(a,
  "    // CD-10 (tcc341): the fit's frame (TP_FIT) is the hand on the gun; where it would bend the wrist far (the gun swung across his\r\n"
  "    // chest), the glove's cuff came out through the sleeve's end. Past TP_FLEX the fist rolls round the grip instead (a turn about the\r\n"
  "    // hand's own x, the channel, so the grip stays in the fist): the firing wrist never toward the palm, the support within 20 deg.\r\n"
  "    const TP_FLEX = { r: [-Infinity, 0], l: [-0.35, 0.35] }, _tpc = { v: new THREE.Vector3(), q: new THREE.Quaternion(), x: new THREE.Vector3(1, 0, 0) };\r\n"
  "    function tpCapFlex(q, elbowG) { const lim = elbowG === marine.userData.elbowLG ? TP_FLEX.l : TP_FLEX.r; const d = _tpc.v.set(0, 1, 0).applyQuaternion(_tpc.q.copy(q).invert()); const flex = Math.atan2(d.z, d.y), c = Math.max(lim[0], Math.min(lim[1], flex)); if (flex !== c) q.multiply(_tpc.q.setFromAxisAngle(_tpc.x, flex - c)); }\r\n"
  + a)
b = "_wr.q.copy(elbowG.getWorldQuaternion(_wr.e).invert()).multiply(_tpW.t); } else"
assert s.count(b) == 1
s = s.replace(b, "_wr.q.copy(elbowG.getWorldQuaternion(_wr.e).invert()).multiply(_tpW.t); tpCapFlex(_wr.q, elbowG); } else")
c = "if (wr) { wr.quaternion.copy(ud.elbowRG.getWorldQuaternion(_wr.e).invert().multiply(_tpW.q)); limitWrist"
assert s.count(c) == 1
s = s.replace(c, "if (wr) { wr.quaternion.copy(ud.elbowRG.getWorldQuaternion(_wr.e).invert().multiply(_tpW.q)); tpCapFlex(wr.quaternion, ud.elbowRG); limitWrist")
open(p, 'w', encoding='utf-8', newline='').write(s); print('patched')
