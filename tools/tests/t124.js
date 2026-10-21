// t124 — CL-104 (Jerry 2026-09-29: "the marine is never grabbed in the creature's hand realistically"). Walking into a
// cave mouth: once the guardian has him, his held ankle is in its hand (the grip point inside its curled fingers),
// not beside it; and what is left of him is carried by the chest in its right hand, one hand, until the toss.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    await startMatch(T, 'Grip');
    let marine = null; T.player.traverse((o) => { if (!marine && o.userData && o.userData.ankleLG) marine = o; });
    const c = T.POI.caves[0];
    T.beginScriptedKill('cave', c);
    const grip = (hand) => { hand.updateMatrixWorld(true); return hand.userData.grip.clone().applyMatrix4(hand.matrixWorld); };
    let held = [], carried = [], hands = 0, dragPath = false;
    for (let i = 0; i < 120; i++) {
      await wait(90);
      const sk = T.getScriptedKill();
      if (!sk) break;
      if (sk.drag) { dragPath = true; break; }
      const g = sk.guardian, hs = g && g.userData.hands;
      if (!hs || hs.length < 2) continue;
      hands = hs.length;
      if (sk.t > 1.1 && sk.t < 2.4) {
        const ank = marine.userData[sk.side < 0 ? 'ankleLG' : 'ankleRG'];
        marine.updateMatrixWorld(true);
        const a = new T.THREE.Vector3(); ank.getWorldPosition(a);
        held.push(a.distanceTo(grip(hs[sk.side < 0 ? 0 : 1])));
      }
      if (sk.remains && sk.t > 4.75 && sk.t < 5.5) {
        const rm = sk.remains; rm.updateMatrixWorld(true);
        carried.push(rm.localToWorld(new T.THREE.Vector3(0, 1.2, 0)).distanceTo(grip(hs[1])));
      }
      if (sk.t > 5.6) break;
    }
    ok(!dragPath, 'the walk-in snatch played (not the chase drag)');
    ok(hands === 2 && held.length >= 5, 'sampled the hold: ' + held.length + ' frames');
    ok(held.length && Math.max(...held) < 0.12, 'his ankle in its hand while it has him: worst ' + (held.length ? Math.max(...held).toFixed(3) : '-') + ' m');
    ok(carried.length >= 3, 'sampled the carry: ' + carried.length + ' frames');
    ok(carried.length && Math.max(...carried) < 0.12, 'carried by the chest in its right hand: worst ' + (carried.length ? Math.max(...carried).toFixed(3) : '-') + ' m');
  } catch (e) {
    out.push('FAIL threw: ' + (e && (e.stack || e.message)));
  }
  return out.join('\n');
})()
