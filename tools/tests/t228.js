// t228 - CU-100 (Jerry, 2026-10-09: "Player hand placements for weapons are not accurate. They need to be in the right
// spots for all weapons at all times."). The hold aimed the hand point (the face of the curled fingers) at each grip,
// so every grip and forend lay along the front of the fist; with no wrist, the support fist could not turn onto a
// forend the forearm comes to end-on.
//  - Each forearm has a wrist holding the hand (the glove and the bare hand), at rest exactly where the hand was built,
//    and a grip point (the middle of the fist's channel) inside the glove.
//  - Nothing else that takes a hand inherits the hold's wrist: holstered, with the knife out and through a reload the
//    support wrist is at rest; every pose starts with both at rest.
//  - (The real renderer; SKIP on the test page, whose arm IK is inert.) For every gun, standing and walking: the
//    firing hand's grip point on the grip anchor (1 cm), the support hand's on its anchor or, on a long gun whose
//    forend is out of reach, on the forend's line (1.5 cm) no more than WRIST.slideMax back; its wrist within
//    WRIST.max; and its fist along the forend (either way; up a vertical foregrip) within 45 degrees.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const simWait = async (s) => { const t0 = T.getSimTime(), w0 = Date.now(); while (T.getSimTime() - t0 < s && Date.now() - w0 < 20000) await wait(30); };   // GB-191: game time (the suite page runs slow)
  const THREE = T.THREE || window.THREE;
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const tm = new THREE.Matrix4().makeRotationX(0.3), tmE = tm.elements.slice(); tm.transpose();
  const ikWorks = tm.elements[6] === tmE[9] && tm.elements[9] === tmE[6] && tmE[6] !== tmE[9];
  const handOk = (c, m) => out.push(ikWorks ? (c ? 'PASS ' : 'FAIL ') + m : 'SKIP (test-page arm IK inert) ' + m);
  const isRest = (q) => Math.abs(q.w) > 1 - 1e-9;
  let aimer = null;
  const key = (code, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, key: code, bubbles: true }));
  try {
    // --- the wrist, on a fresh marine
    const fresh = T.makeMarine(), fu = fresh.userData;
    for (const [side, elbow] of [['gun', fu.elbowRG], ['support', fu.elbowLG]]) {
      const wr = elbow.userData.wrist;
      ok(!!wr && wr.parent === elbow, side + ' hand: its forearm has a wrist');
      if (!wr) continue;
      const parts = wr.children.filter((c) => c.isGroup);
      ok(parts.length >= 2 && parts.every((p) => p.position.clone().add(wr.position).length() < 1e-9), side + ' hand: the glove and the bare hand hang on it, built where they were (' + parts.length + ' parts)');
      ok(isRest(wr.quaternion), side + ' hand: at rest the wrist does not turn the hand');
      fresh.updateMatrixWorld(true);
      const inv = new THREE.Matrix4().copy(elbow.matrixWorld).invert(), box = new THREE.Box3(), v = V();
      wr.traverse((o) => { if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return; let shown = true; for (let p = o; p && p !== wr; p = p.parent) if (!p.visible) shown = false; if (!shown) return;
        const P = o.geometry.attributes.position; for (let i = 0; i < P.count; i++) box.expandByPoint(v.fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld).applyMatrix4(inv)); });
      const g = wr.userData.grip;
      ok(!!g && !box.isEmpty() && box.containsPoint(g), side + ' hand: its grip point is inside the fist (' + (g ? g.toArray().map((x) => x.toFixed(3)).join(', ') : '?') + ')');
    }
    const D = T.handsDbg;
    ok(!!(D && D.WRIST && D.gripPoint && D.wrist && D.HANDS.reachL < 0.565), 'TT.handsDbg has the wrist (max ' + (D && D.WRIST && D.WRIST.max) + ' rad) and the support reach to the fist (' + (D && D.HANDS.reachL) + ' m)');

    // --- in a match
    await startMatch(T, 'Grips');
    T.clearZombies && T.clearZombies(); T.setHp(100000); T.grantAllWeapons();
    const pin = () => { const p = T.player.position; T.aimTarget.set(p.x, T.sampleHeight(p.x, p.z) + 1.25, p.z + 10); };
    aimer = T.pinAimDbg ? (T.pinAimDbg(() => { pin(); if (T.setAimYawDbg) T.setAimYawDbg(0); }), null) : setInterval(pin, 5); pin();   /* CB-335: aim pinned in the frame (TT.pinAimDbg), his facing held at the no-cursor 0 deg, so a real cursor over the window cannot turn him */
    const busy = setInterval(() => document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'F24', key: 'F24', bubbles: true })), 200);
    const ud = (T.marine || T.getMarine()).userData, wrR = ud.elbowRG.userData.wrist, wrL = ud.elbowLG.userData.wrist;
    const take = async (w) => {
      for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) T.setWeapon(i);
      await wait(300);
      await new Promise((r) => { const t0 = Date.now(); const f = () => (T.getCurrentWeapon() === w && !T.drawDbg().active) || Date.now() - t0 > 6000 ? r() : setTimeout(f, 50); f(); });
      await wait(1500);
      return T.getCurrentWeapon() === w;
    };
    const HOLDS = T.getShoulderDbg().holds, H = D.HANDS;
    const CH = { up: V(0, 1, 0), across: V(-1, 0, 0) };
    for (const w of ['pistol', 'revolver', 'uzi', 'm4', 'ak', 'aa12', 'shotgun', 'sniper', 'launcher', 'flamer', 'chainsaw']) {
      if (!(await take(w))) { ok(false, w + ': in hand'); continue; }
      const h = HOLDS[w], gun = T.weaponMeshes[w], kind = H.fore[w];
      for (const [how, keys] of [['standing', []], ['walking', ['KeyW']]]) {
        for (const k of keys) key(k, true);
        await wait(700);
        let R = 0, L = 0, back = 0, turn = 0, along = 0;
        for (let i = 0; i < 12; i++) {
          await wait(40);
          T.getMarine().updateMatrixWorld(true);
          R = Math.max(R, D.gripPoint('R', V()).distanceTo(gun.localToWorld(V(...(h.gripFit || h.grip)))));   // CD-9 (--review, CLAUDE DIRECTOR OK 14:20Z): one handgun, the third-person fit's grip (TP_FIT r.p)
          const fl = h.fore === 'pump' ? gun.userData.pump.position.clone().add(V(0, h.pumpDy, 0)) : V(...h.fore);
          if (!kind) fl.y -= gun.userData.cu100Drop || 0;   // the fist closes round the forend's (the pump's) lower edge
          const fw = gun.localToWorld(fl), rel = D.gripPoint('L', V()).sub(fw);
          const c = (CH[kind] || V(0, 0, 1)).clone().transformDirection(gun.matrixWorld), a = rel.dot(c);
          const slides = h.sh && Array.isArray(h.fore) && !kind && a < 0;
          L = Math.max(L, slides ? rel.clone().addScaledVector(c, -a).length() : rel.length()); if (slides) back = Math.max(back, -a);
          turn = Math.max(turn, D.wrist().l);
          if (wrL && kind !== 'grip' && kind !== 'across') { const x = V(1, 0, 0).applyQuaternion(wrL.getWorldQuaternion(new THREE.Quaternion())), d = Math.acos(Math.min(1, Math.abs(x.dot(c)))) * 180 / Math.PI; along = Math.max(along, kind === 'up' ? Math.acos(Math.max(-1, Math.min(1, -x.dot(c)))) * 180 / Math.PI : d); }   // GB-220: GB-152's fingered hands carry the index edge on -x (holdHand negates the sign); close-up qa/2026-10-23-GB-220/before/hold-close-launcher-L-front.png
        }
        for (const k of keys) key(k, false);
        handOk(R < 0.01, w + ' ' + how + ': the firing hand closes on the grip (' + (R * 100).toFixed(1) + ' cm)');
        const Lbar = w === 'chainsaw' ? 0.019 : 0.015;   // GB-223: the saw's front bar as drawn, 1.6 cm + 3 mm (close-up qa/2026-10-23-GB-220/before/hold-close-chainsaw-L-top.png)
        handOk(L < Lbar && back <= D.WRIST.slideMax + 0.005, w + ' ' + how + ': the support hand on its anchor' + (back ? ' or back along the forend (' + (back * 100).toFixed(1) + ' cm back)' : '') + ' (' + (L * 100).toFixed(1) + ' cm)');
        handOk(turn <= D.WRIST.max + 1e-6, w + ' ' + how + ': the support wrist within its turn (' + (turn * 57.3).toFixed(0) + ' deg)');
        if (wrL && kind !== 'grip' && kind !== 'across') handOk(along < 45, w + ' ' + how + ': the support fist along its ' + (kind === 'up' ? 'foregrip' : 'forend') + ' (' + along.toFixed(0) + ' deg)');
        await wait(300);
      }
    }
    // --- the wrist lets go for everything else
    if (await take('m4')) {
      if (T.setMagazinesDbg) T.setMagazinesDbg('m4', 3, [30, 30]);   // a reload with no fuller magazine is refused (GB-137)
      T.startReload(); await wait(100); T.reloadClipDbg.hold(0.45); await simWait(0.5);
      ok(T.isReloading(), 'm4: the reload runs');
      // CE-12 part 2a (Claude 5, 15 Nov; --review): in third person the support hand carries the magazine from the pouch to
      // the well, closed on it (t218 checks the ride in the palm beat by beat). Mid-carry (u .45) it is off the forend and on
      // the magazine: closed (gripA > 0.9), its grip point at least 5 cm from the forend's anchor, the magazine's foot (the
      // middle of its bottom face) within 2 cm of the grip point or the magazine touching the glove (t218's measures). Outside a reload the wrist is at rest (the knife and
      // holstered rows below; every hold above starts from rest).
      { const g = T.weaponMeshes.m4, mag = g.userData.mag, hm4 = HOLDS.m4; g.updateMatrixWorld(true);
        let foot = null;
        if (mag) { mag.updateMatrixWorld(true); const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9], inv = new THREE.Matrix4().copy(mag.matrixWorld).invert(), v = V();
          mag.traverse((o) => { const pa = o.isMesh && o.geometry && o.geometry.attributes && o.geometry.attributes.position; if (!pa) return; const mm = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
            for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i).applyMatrix4(mm); const a = [v.x, v.y, v.z]; for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], a[k]); hi[k] = Math.max(hi[k], a[k]); } } });
          foot = mag.localToWorld(V((lo[0] + hi[0]) / 2, lo[1], (lo[2] + hi[2]) / 2)); }
        const gl = D.gripPoint('L', V()), fore = g.localToWorld(Array.isArray(hm4.fore) ? V(...hm4.fore) : V(...hm4.grip));
        const dF = gl.distanceTo(fore), dM = foot ? foot.distanceTo(gl) : 9;
        // t218's own measure (CE-12 part 2 (a), Director 16:30Z): or the magazine touching the support glove, its gap to the
        // magazine's true shape under 2 mm (copied from t218 unchanged)
      const hullOf = (mag, ia) => {
        mag.updateMatrixWorld(true);
        const inv = new THREE.Matrix4().copy(mag.matrixWorld).invert(), v = V(), pts = [], iu = (ia + 1) % 3, iv = (ia + 2) % 3;
        let lo = Infinity, hi = -Infinity;
        mag.traverse((o) => { const pa = o.isMesh && o.visible && o.geometry && o.geometry.attributes && o.geometry.attributes.position; if (!pa) return;
          const mm = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
          for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i).applyMatrix4(mm); const a = [v.x, v.y, v.z]; lo = Math.min(lo, a[ia]); hi = Math.max(hi, a[ia]); pts.push([a[iu], a[iv]]); } });
        pts.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
        const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), L = [], U = [];
        for (const p of pts) { while (L.length >= 2 && cr(L[L.length - 2], L[L.length - 1], p) <= 0) L.pop(); L.push(p); }
        for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (U.length >= 2 && cr(U[U.length - 2], U[U.length - 1], p) <= 0) U.pop(); U.push(p); }
        const P = L.slice(0, -1).concat(U.slice(0, -1));
        const E = P.map((p, i) => { const q = P[(i + 1) % P.length], dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1; return { x: p[0], y: p[1], dx: dx / l, dy: dy / l, l }; });
        return { ia, iu, iv, mid: (lo + hi) / 2, half: (hi - lo) / 2, E };
      };
      const hulls = new Map();
      const gloveGap = (w, mag) => {   // metres: the support glove's nearest vertex to the magazine (0 if it is in it)
        const wr = ud.elbowLG.userData.wrist, rig = wr && wr.userData.hand; if (!rig || !rig.skins) return Infinity;
        let sk = null; for (const k of rig.skins) if (shown(k.mesh) && (!sk || k.n > sk.n)) sk = k; if (!sk) return Infinity;
        if (!hulls.has(mag)) hulls.set(mag, hullOf(mag, w === 'aa12' ? 2 : 0));
        const H = hulls.get(mag); sk.mesh.updateMatrixWorld(true); mag.updateMatrixWorld(true);
        const M = new THREE.Matrix4().copy(mag.matrixWorld).invert().multiply(sk.mesh.matrixWorld), pa = sk.mesh.geometry.attributes.position.array, v = V();
        let best = Infinity;
        for (let i = 0; i < sk.n; i++) {
          v.set(pa[i * 3], pa[i * 3 + 1], pa[i * 3 + 2]).applyMatrix4(M); const a = [v.x, v.y, v.z], u = a[H.iu], q = a[H.iv];
          let dp = -Infinity;   // + outside the hull's polygon (its distance, signed per edge)
          for (const e of H.E) dp = Math.max(dp, -(e.dx * (q - e.y) - e.dy * (u - e.x)));
          const da = Math.abs(a[H.ia] - H.mid) - H.half, d = Math.hypot(Math.max(dp, 0), Math.max(da, 0));
          if (d < best) best = d;
        }
        return best * mag.getWorldScale(V()).x;
      };
      const shown = (o) => { for (let q = o; q; q = q.parent) { if (!q.visible) return false; if (q === T.scene) break; } return true; };
        const gG = mag ? gloveGap('m4', mag) : Infinity;
        ok(D.gripA().l > 0.9 && dF > 0.05 && (dM < 0.02 || gG < 0.002), 'through a reload (u .45) the support hand is off the forend and closed on the magazine (grip ' + D.gripA().l.toFixed(2) + ', ' + (dF * 100).toFixed(1) + ' cm from the forend; the magazine foot ' + (dM * 100).toFixed(1) + ' cm from the grip point, glove gap ' + (gG * 1000).toFixed(1) + ' mm)'); }
      T.reloadClipDbg.hold(null); await simWait(2.5);
      D.knifeHold(0.5); await simWait(0.4);
      ok(D.gripA().l < 0.05 && isRest(wrL.quaternion), 'with the knife out the support wrist is at rest');
      D.knifeHold(null); await simWait(0.6);
      T.toggleHolster(); await simWait(1.5);
      // GB-170 (Jerry: the palms turned forward): empty hands hang palm-in, turned at the wrist (poseHands: x 0.05, y +-1.15
      // by the relax). Holstered, each wrist is at rest or in that hang, mirrored, and nothing of the hold's turn.
      const hangOf = (q, sg) => { const e = new THREE.Euler().setFromQuaternion(q); return isRest(q) || (Math.abs(e.z) < 0.01 && e.y * sg >= 0 && Math.abs(e.x - 0.05 / 1.15 * Math.abs(e.y)) < 0.01 && Math.abs(e.y) <= 1.15 + 0.01); };
      const yR = new THREE.Euler().setFromQuaternion(wrR.quaternion).y, yL = new THREE.Euler().setFromQuaternion(wrL.quaternion).y;
      ok(hangOf(wrR.quaternion, -1) && hangOf(wrL.quaternion, 1) && Math.abs(yR + yL) < 0.01, 'holstered, both wrists are at rest or in the GB-170 hang (y ' + yR.toFixed(2) + ', ' + yL.toFixed(2) + ')');
      T.toggleHolster(); await simWait(1.2);
    } else ok(false, 'm4: in hand for the reload');
    clearInterval(busy);
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  if (T.pinAimDbg) T.pinAimDbg(null); if (aimer) clearInterval(aimer);
  return out.join('\n');
})()
