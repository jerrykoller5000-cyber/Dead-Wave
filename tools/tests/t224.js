// t224 - GB-148 (Jerry, 2026-10-09: "Revolver sticks out too much from pack and is not tight when holstered. Also could
// you change the weapon wheel sound to something more pleasant?").
//  - The revolver's low pack holster sits in on the pack's lower corner (|x| <= 0.13 m, z >= -0.35 m in his torso's
//    frame; it was 0.19 / -0.39), muzzle down with the grip turned in toward his spine, not out past his side. On the
//    real renderer (headless Chrome) it is also inside his outline at that height (<= 1 cm past it; it was 6 cm) and
//    snug on the pack behind it: the air along his front-back axis at most 1.5 cm (it was 8 cm), clipping at most 1.5 cm
//    (t189's ray method). The pistol's low holster is where it was.
//  - CL-160 (Jerry, 2026-10-10: "The secondary pistol when akimbo is stored it protrudes off of the player's back and does not
//    sit flush"): both the pistol and the revolver ride higher now, beside the pack against the flat of his back
//    (rig.packFit), grip in; the same checks hold for the pistol as for the revolver.
//  - The wheel's tick (the pointer crossing a gun) is soft: gunsynth's wheelTick is a dull knock over a muted click,
//    level <= 0.035 (it was 0.0548), no static layer, under 10% of its energy above 2 kHz (it was 81%), done in 50 ms.
//    It plays at most once per 50 ms however fast the pointer sweeps, and a quick run of ticks is heard softer.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const THREE = T.THREE || window.THREE;
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const tm = new THREE.Matrix4().makeRotationX(0.3), tmE = tm.elements.slice(); tm.transpose();
  const real = tm.elements[6] === tmE[9] && tm.elements[9] === tmE[6] && tmE[6] !== tmE[9];
  const realOk = (c, m) => out.push(real ? (c ? 'PASS ' : 'FAIL ') + m : 'SKIP (test-page geometry; real renderer: handoffs/2026-10-09-grokbot-GB-148/real-test.mjs) ' + m);
  try {
    await startMatch(T, 'Holster');
    T.clearZombies && T.clearZombies(); T.setHp(100000); T.grantAllWeapons();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F13', key: 'F13', bubbles: true }));
    const marine = T.getMarine(), ud = marine.userData, rig = ud.carry;
    ok(!!rig && !!rig.packFit && !!rig.packFit.revolver && !!rig.packFit.pistol, 'the rig carries the pack spots (' + JSON.stringify(rig && rig.packFit) + ')');
    const allTris = (meshes) => { const t = []; const a = V(), b = V(), c = V(); for (const o of meshes) { const g = o.geometry, P = g && g.attributes && g.attributes.position; if (!P) continue; const idx = g.index ? g.index.array : null, n = idx ? idx.length : P.count; for (let i = 0; i + 2 < n; i += 3) { a.fromBufferAttribute(P, idx ? idx[i] : i).applyMatrix4(o.matrixWorld); b.fromBufferAttribute(P, idx ? idx[i + 1] : i + 1).applyMatrix4(o.matrixWorld); c.fromBufferAttribute(P, idx ? idx[i + 2] : i + 2).applyMatrix4(o.matrixWorld); t.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z); } } return new Float32Array(t); };
    const rayHit = (t, o, d, far) => { let best = Infinity; for (let i = 0; i < t.length; i += 9) { const e1x = t[i + 3] - t[i], e1y = t[i + 4] - t[i + 1], e1z = t[i + 5] - t[i + 2], e2x = t[i + 6] - t[i], e2y = t[i + 7] - t[i + 1], e2z = t[i + 8] - t[i + 2]; const px = d.y * e2z - d.z * e2y, py = d.z * e2x - d.x * e2z, pz = d.x * e2y - d.y * e2x, det = e1x * px + e1y * py + e1z * pz; if (Math.abs(det) < 1e-12) continue; const inv = 1 / det, sx = o.x - t[i], sy = o.y - t[i + 1], sz = o.z - t[i + 2], u = (sx * px + sy * py + sz * pz) * inv; if (u < 0 || u > 1) continue; const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x, v = (d.x * qx + d.y * qy + d.z * qz) * inv; if (v < 0 || u + v > 1) continue; const tt = (e2x * qx + e2y * qy + e2z * qz) * inv; if (tt > 0 && tt < far && tt < best) best = tt; } return best; };
    const SCEN = [['m4', 'ak', 'uzi', 'revolver'], ['ak', 'm4', 'revolver', 'pistol'], ['minigun', 'm4', 'uzi', 'revolver'], ['shotgun', 'aa12', 'revolver', null]];
    let seen = 0, pistolSeen = 0;
    for (const [a, b, c, d] of SCEN) {
      T.carryDbg({ loadout: { primary: [a, b], secondary: [c, d] }, inHand: null, akimbo: false });
      marine.updateMatrixWorld(true);
      const torso = ud.torsoG, inv = new THREE.Matrix4().copy(torso.matrixWorld).invert(), tp = ud.torsoPivotY || 0.7;
      const spots = [...rig.holsters, ...rig.pairs];
      const skip = new Set([ud.weaponMount, ud.armLG, ud.armRG, ud.headG].filter(Boolean)); for (const s of [...rig.slings, ...spots, rig.hip, rig.hipPair]) skip.add(s.g);
      const body = []; marine.traverse((o) => { if (!o.isMesh || !o.visible || o.isInstancedMesh) return; for (let q = o; q; q = q.parent) { if (skip.has(q) || !q.visible) return; } body.push(o); });
      let bodyT = null;
      for (const sp of spots) {
        if (!sp.gun || !sp.g.visible) continue;
        const side = sp.g.position.x >= 0 ? 1 : -1, tag = [a, b, c, d].join('/') + ' ' + sp.kind + (side > 0 ? '+' : '-');
        const fit = rig.packFit && rig.packFit[sp.kind];
        // GB-190: since GP-19894 two handgun kinds ride in two rows (applyCarryPlan: the first +0.29 m, the second -0.02 m).
        if (!fit || ![0, 0.29, -0.02].some((row) => Math.abs(sp.g.position.y - (fit.y - tp + row)) < 1e-6)) continue;   // CL-160: the pistol rides there too
        if (sp.kind === 'pistol') pistolSeen++; else seen++;
        const P = sp.g.position;
        // GB-177: GP-19920's clearCarryPack (ui/marine-kit-fit.js) now fits the gun's nearest surface to the pack's back face
        // (z -0.345, the pack ends at -0.333), not its origin; so check that surface: on the pack, not floating behind it.
        const sb = new THREE.Box3(), sinv = new THREE.Matrix4().copy(sp.g.parent.matrixWorld).invert();
        sp.gun.traverseVisible((o) => { const pa = o.geometry && o.geometry.attributes && o.geometry.attributes.position; if (!o.isMesh || !pa) return; const sm = new THREE.Matrix4().multiplyMatrices(sinv, o.matrixWorld); for (let q = 0; q < pa.count; q++) sb.expandByPoint(V(pa.getX(q), pa.getY(q), pa.getZ(q)).applyMatrix4(sm)); });
        ok(Math.abs(P.x) <= 0.13 && sb.max.z >= -0.36 && sb.max.z <= -0.333, tag + ': in beside the pack (x ' + P.x.toFixed(3) + ', front surface z ' + sb.max.z.toFixed(3) + ', origin z ' + P.z.toFixed(3) + ')');
        // Grip = the gun's -y; muzzle = its -z or +z: the grip points in (toward his spine), the barrel down.
        const gq = sp.gun.getWorldQuaternion(new THREE.Quaternion()), tq = torso.getWorldQuaternion(new THREE.Quaternion()).invert();
        const grip = V(0, -1, 0).applyQuaternion(gq).applyQuaternion(tq), barrel = V(0, 0, 1).applyQuaternion(gq).applyQuaternion(tq);
        ok(grip.x * side < -0.9 && Math.abs(barrel.y) > 0.95, tag + ': grip turned in (' + grip.x.toFixed(2) + ' along his side-to-side), barrel upright (' + barrel.y.toFixed(2) + ')');
        // Real renderer: the outline at that height and the air to the pack in front of it.
        const pts = []; const inner = sp.gun.children[0] || sp.gun; inner.updateMatrixWorld(true);
        inner.traverse((o) => { if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return; for (let q = o; q && q !== sp.gun; q = q.parent) if (!q.visible) return; const pa = o.geometry.attributes.position, st = Math.max(1, Math.floor(pa.count / 80)); for (let i = 0; i < pa.count; i += st) pts.push(V().fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld)); });
        const loc = pts.map((p) => p.clone().applyMatrix4(inv));
        const y0 = Math.min(...loc.map((p) => p.y)) - 0.02, y1 = Math.max(...loc.map((p) => p.y)) + 0.02;
        const bodyPts = []; for (const o of body) { const pa = o.geometry && o.geometry.attributes.position; if (!pa) continue; for (let i = 0; i < pa.count; i++) { const q = V().fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld).applyMatrix4(inv); if (q.y >= y0 && q.y <= y1) bodyPts.push(q.x * side); } }
        const outline = Math.max(...bodyPts), far = Math.max(...loc.map((p) => p.x * side));
        realOk(far - outline <= 0.01, tag + ': inside his outline (' + ((far - outline) * 100).toFixed(1) + ' cm past it)');
        if (!bodyT) bodyT = allTris(body);
        const dir = V(0, 0, 1).transformDirection(torso.matrixWorld);
        let minClear = Infinity, maxPen = 0, hits = 0;
        for (const p of pts) { const g = rayHit(bodyT, p.clone().addScaledVector(dir, -0.25), dir, 0.6) - 0.25; if (g === Infinity) continue; hits++; minClear = Math.min(minClear, g); maxPen = Math.max(maxPen, -g); }
        realOk(hits >= 5 && minClear <= 0.015 && maxPen <= 0.015, tag + ': snug on the pack, air ' + (hits ? Math.max(0, minClear).toFixed(3) : '?') + ' m, clipping ' + maxPen.toFixed(3) + ' m (' + hits + ' of ' + pts.length + ' points over the pack)');
      }
    }
    ok(seen >= 6, 'revolvers on the pack checked: ' + seen);
    ok(pistolSeen >= 1, 'and pistols on the pack (CL-160): ' + pistolSeen);
    // The wheel's tick.
    const A = T.AudioSys || window.AudioSys;
    const G = await import(new URL('../../core/gunsynth.js', location.href).href);
    const D = G.FOLEY_DEFS.wheelTick, kinds = D.layers.map((L) => L.k);
    ok(D.level <= 0.035 && kinds.every((k) => k === 'knock' || k === 'clank') && !kinds.includes('static'), 'the tick is a knock and a muted click, level ' + D.level + ' (' + kinds.join(' + ') + ')');
    const SR = 48000, x = G.buildBank('wheelTick', G.defForKey('wheelTick'), SR).dry;
    let hi = 0, tot = 0, late = 0;
    for (const d of x) { const y = Float32Array.from(d); G.biquad(y, 'hp', 2000, 0.7, SR); G.biquad(y, 'hp', 2000, 0.7, SR); for (let i = 0; i < d.length; i++) { hi += y[i] * y[i]; tot += d[i] * d[i]; if (i > 0.05 * SR) late += d[i] * d[i]; } }
    ok(hi / tot < 0.1, 'soft: ' + (100 * hi / tot).toFixed(1) + '% of it above 2 kHz');
    ok(late / tot < 0.02, 'short: ' + (100 * (1 - late / tot)).toFixed(1) + '% of it in the first 50 ms');
    const plays = () => (A.bankDbg('wheelTick') || { plays: 0 }).plays;
    { const w0 = Date.now(); while (!A.bankDbg('wheelTick') && Date.now() - w0 < 45000) await wait(200); }
    const P0 = (window.BaseAudioContext || window.AudioContext).prototype, realGain = P0.createGain; let gains = [], ac = null;
    P0.createGain = function () { const n = realGain.call(this); ac = this; gains.push(n); return n; };
    const loudness = () => (gains.length ? gains[0].gain.value : 0);   // the first gain a play makes is the voice's own (the 0.08 after it is its bus)
    // Timed on the audio clock the cooldown runs on (a busy page's timers run late; the clock does not).
    const audioWait = async (s) => { const t0 = ac.currentTime, w0 = Date.now(); while (ac.currentTime - t0 < s && Date.now() - w0 < 3000) await wait(2); return ac.currentTime - t0; };
    try {
      await wait(300);
      let p0 = plays();
      for (let i = 0; i < 12; i++) A.wheelTick();
      ok(plays() - p0 === 1, 'twelve ticks at once: heard once (' + (plays() - p0) + ')');
      const clock = !!ac && (await audioWait(0.2)) > 0.1;
      const tOk = (c, m) => out.push(clock ? (c ? 'PASS ' : 'FAIL ') + m : 'SKIP (the audio clock is stopped on this page: no user gesture) ' + m);
      let g1 = 0, g2 = 0;
      for (let k = 0; clock && k < 6 && !g2; k++) {
        await audioWait(0.3); gains = []; A.wheelTick(); g1 = loudness(); const t1 = ac.currentTime;
        await audioWait(0.06); if (ac.currentTime - t1 >= 0.11) { g1 = 0; continue; }
        gains = []; A.wheelTick(); g2 = loudness();
      }
      tOk(g1 > 0 && g2 > 0 && g2 < g1 * 0.8, 'a quick run of ticks is softer (' + (g1 ? (g2 / g1).toFixed(2) : '?') + ' of a lone tick)');
      if (clock) await audioWait(0.3);
      p0 = plays(); const a0 = clock ? ac.currentTime : 0, w0 = performance.now(); while (performance.now() - w0 < 600 && (!clock || ac.currentTime - a0 < 0.5)) { A.wheelTick(); await wait(2); }
      const n = plays() - p0, dt = clock ? ac.currentTime - a0 : 0;
      tOk(n >= 2 && n <= Math.floor(dt / 0.05) + 1, 'a fast sweep: ' + n + ' ticks in ' + (dt * 1000).toFixed(0) + ' ms of audio clock (at most one per 50 ms)');
    } finally { P0.createGain = realGain; }
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'F13', key: 'F13', bubbles: true }));
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
