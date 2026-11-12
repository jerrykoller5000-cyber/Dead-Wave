# CD-10 (tcc341): the TP_FIT hold's turn about the forearm goes onto the forearm (pronation along it: the sleeve's cuff turns
# with the glove's), the wrist keeps the swing (the bend). Patches index.html in place (holdHand's wanted frame and the right
# hand's frame put back after holdFreeShoulders); refuses if any text moved.
import sys
p = sys.argv[1]; s = open(p, 'rb').read().decode('utf-8'); NL = '\r\n' if '\r\n' in s[:5000] else '\n'
def rep(old, new):
    global s
    old = old.replace('\n', NL); new = new.replace('\n', NL)
    if s.count(old) != 1: sys.exit('not found once: ' + old[:80])
    s = s.replace(old, new)
rep("t: new THREE.Quaternion(), p: new THREE.Vector3() };\n",
    "t: new THREE.Quaternion(), p: new THREE.Vector3(), tw: new THREE.Quaternion(), pq: new THREE.Quaternion(), ax: new THREE.Vector3() };\n"
    "    // CD-10 (tcc341: the glove's cuff rolled 66 deg inside the sleeve's): a wanted frame's turn about the forearm's line (elbow\n"
    "    // space, toward the wrist) is pronation: it goes on the forearm (elbowG), so the sleeve's cuff turns with the glove; q (the\n"
    "    // wrist's turn in the elbow's space, changed in place) keeps the rest, the bend. The wrist sits on that line, so it stays put.\n"
    "    // Returns the forearm's added roll (rollForearm's sense), to be counted with the table's twist.\n"
    "    function tpPronate(elbowG, wr, q) {\n"
    "      const ax = _tpW.ax.copy(wr.position).normalize(), d = q.x * ax.x + q.y * ax.y + q.z * ax.z;\n"
    "      const tw = _tpW.tw.set(ax.x * d, ax.y * d, ax.z * d, q.w); if (tw.lengthSq() < 1e-12) return 0;\n"
    "      tw.normalize(); elbowG.quaternion.multiply(tw); elbowG.updateMatrixWorld(true); q.premultiply(tw.invert());\n"
    "      const th = 2 * Math.atan2(-(tw.x * ax.x + tw.y * ax.y + tw.z * ax.z), tw.w);   // the twist's angle (tw is its inverse now)\n"
    "      return th > Math.PI ? th - 2 * Math.PI : th < -Math.PI ? th + 2 * Math.PI : th;\n"
    "    }\n")
rep("_wr.q.copy(elbowG.getWorldQuaternion(_wr.e).invert()).multiply(_tpW.t); } else\n",
    "_wr.q.copy(elbowG.getWorldQuaternion(_wr.e).invert()).multiply(_tpW.t); roll += tpPronate(elbowG, wr, _wr.q); } else   // CD-10\n")
rep("if (wr) { wr.quaternion.copy(ud.elbowRG.getWorldQuaternion(_wr.e).invert().multiply(_tpW.q)); limitWrist(ud.elbowRG, wr, handRollR);",
    "if (wr) { _tpW.pq.copy(ud.elbowRG.getWorldQuaternion(_wr.e).invert().multiply(_tpW.q)); handRollR += tpPronate(ud.elbowRG, wr, _tpW.pq); wr.quaternion.copy(_tpW.pq); limitWrist(ud.elbowRG, wr, handRollR);   /* CD-10 */")
open(p, 'wb').write(s.encode('utf-8')); print('patched', p, repr(NL))
