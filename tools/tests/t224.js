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
//  - CC-347 (J151 note 8, Jerry 13 Nov: "holsters and gear hang, floaty and not properly secured"; CLAUDE DIRECTOR's OK
//    13 Nov): the low row hung under the pack, 17-25 cm behind his seat. It rides his belt at the back now (rig.lowFit, on
//    his hips): its spots are read there with the same bars (|x| <= 0.13 m, grip in, barrel upright, inside his outline,
//    air to his body along his front-back axis <= 1.5 cm, clipping <= 1.5 cm); the upper row on the pack as before.
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
    // GB-220: the body is skinned since CL-210; read his posed vertices (getVertexPosition), not the bind-pose buffer.
    const vp = (o, P, i, v) => (o.isSkinnedMesh && o.getVertexPosition ? o.getVertexPosition(i, v) : v.fromBufferAttribute(P, i)).applyMatrix4(o.matrixWorld);
    const allTris = (meshes) => { const t = []; const a = V(), b = V(), c = V(); for (const o of meshes) { const g = o.geometry, P = g && g.attributes && g.attributes.position; if (!P) continue; const idx = g.index ? g.index.array : null, n = idx ? idx.length : P.count; for (let i = 0; i + 2 < n; i += 3) { vp(o, P, idx ? idx[i] : i, a); vp(o, P, idx ? idx[i + 1] : i + 1, b); vp(o, P, idx ? idx[i + 2] : i + 2, c); t.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z); } } return new Float32Array(t); };
    const rayHit = (t, o, d, far) => { let best = Infinity; for (let i = 0; i < t.length; i += 9) { const e1x = t[i + 3] - t[i], e1y = t[i + 4] - t[i + 1], e1z = t[i + 5] - t[i + 2], e2x = t[i + 6] - t[i], e2y = t[i + 7] - t[i + 1], e2z = t[i + 8] - t[i + 2]; const px = d.y * e2z - d.z * e2y, py = d.z * e2x - d.x * e2z, pz = d.x * e2y - d.y * e2x, det = e1x * px + e1y * py + e1z * pz; if (Math.abs(det) < 1e-12) continue; const inv = 1 / det, sx = o.x - t[i], sy = o.y - t[i + 1], sz = o.z - t[i + 2], u = (sx * px + sy * py + sz * pz) * inv; if (u < 0 || u > 1) continue; const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x, v = (d.x * qx + d.y * qy + d.z * qz) * inv; if (v < 0 || u + v > 1) continue; const tt = (e2x * qx + e2y * qy + e2z * qz) * inv; if (tt > 0 && tt < far && tt < best) best = tt; } return best; };
    // CC-350 (J153 notes 20, 38, D-181): the handguns ride by station (rig.placeStation), vertical, muzzle down, the flat of the gun
    // on him, the grip back, never on its side: the base pistol on the belt at 4 o'clock on the gun hand's side ('hip+', just
    // behind the hip bone), the next at 8 o'clock ('hip-'), a third and an Uzi flat on the pack's sides ('pack+'/'pack-'). (The
    // GB-148 / CL-160 / CC-347 rows here measured the pack and small-of-the-back holsters this replaced; the seating against his
    // body and the legs and arms through them are tcc347's.)
    const SCEN = [['m4', 'ak', 'uzi', 'revolver'], ['ak', 'm4', 'revolver', 'pistol'], ['minigun', 'm4', 'uzi', 'revolver'], ['shotgun', 'aa12', 'revolver', null]];
    let seen = 0, onPack = 0;
    for (const [a, b, c, d] of SCEN) {
      T.carryDbg({ loadout: { primary: [a, b], secondary: [c, d] }, inHand: null, akimbo: false });
      marine.updateMatrixWorld(true);
      ok(rig.hip.station === 'hip+', [a, b, c, d].join('/') + ': the base pistol on the gun hand\'s hip (' + rig.hip.station + ')');
      for (const sp of [rig.hip, rig.hipPair, ...rig.holsters, ...rig.pairs]) {
        if (!sp || !sp.gun || !sp.g.visible || !sp.station) continue;
        const kind = sp.kind, side = sp.station.endsWith('+') ? 1 : -1, tag = [a, b, c, d].join('/') + ' ' + kind + ' at ' + sp.station;
        const home = sp.g.parent, P = sp.g.position;
        const gq = sp.gun.getWorldQuaternion(new THREE.Quaternion()), tq = home.getWorldQuaternion(new THREE.Quaternion()).invert();
        const grip = V(0, -1, 0).applyQuaternion(gq).applyQuaternion(tq), barrel = V(0, 0, 1).applyQuaternion(gq).applyQuaternion(tq), flat = V(1, 0, 0).applyQuaternion(gq).applyQuaternion(tq);
        if (sp.station.startsWith('hip')) {
          seen++;
          ok(P.z <= -0.07 && Math.abs(P.x) >= 0.1 && Math.abs(P.x) <= 0.22 && P.x * side > 0, tag + ': on his belt just behind the hip bone (x ' + P.x.toFixed(3) + ', z ' + P.z.toFixed(3) + ')');
          const n = V(side * rig.hipFit.n[0], 0, rig.hipFit.n[1]);
          ok(barrel.y < -0.95 && Math.abs(flat.dot(n)) > 0.9 && grip.z < -0.25, tag + ': vertical, muzzle down (' + barrel.y.toFixed(2) + '), its flat on his hip (' + Math.abs(flat.dot(n)).toFixed(2) + '), the grip back (' + grip.z.toFixed(2) + ')');
        } else if (sp.station.startsWith('pack')) {
          seen++; onPack++;
          ok(Math.abs(P.x) >= 0.13 && Math.abs(P.x) <= 0.22 && P.z <= -0.15 && P.z >= -0.32, tag + ': on the pack\'s side (x ' + P.x.toFixed(3) + ', z ' + P.z.toFixed(3) + ')');
          ok(barrel.y < -0.95 && Math.abs(flat.x) > 0.9 && grip.z < -0.9, tag + ': vertical, muzzle down (' + barrel.y.toFixed(2) + '), its flat on the pack (' + Math.abs(flat.x).toFixed(2) + '), the grip back (' + grip.z.toFixed(2) + ')');
        }
        // never on its side: whatever the station, the barrel stands upright
        ok(Math.abs(barrel.y) > 0.95, tag + ': upright, not on its side (barrel ' + barrel.y.toFixed(2) + ')');
        if (sp.station.startsWith('hip')) {   // real renderer: inside his outline at that height (<= 1 cm past it)
          const hinv = new THREE.Matrix4().copy(home.matrixWorld).invert();
          const skip = new Set([ud.weaponMount, ud.armLG, ud.armRG, ud.headG].filter(Boolean)); for (const s2 of [...rig.slings, ...rig.holsters, ...rig.pairs, rig.hip, rig.hipPair]) skip.add(s2.g);
          const body = []; marine.traverse((o) => { if (!o.isMesh || !o.visible || o.isInstancedMesh) return; for (let q = o; q; q = q.parent) { if (skip.has(q) || !q.visible) return; } body.push(o); });
          const pts = []; sp.gun.updateMatrixWorld(true); sp.gun.traverse((o) => { if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return; const pa = o.geometry.attributes.position, st = Math.max(1, Math.floor(pa.count / 400)); for (let i = 0; i < pa.count; i += st) pts.push(V(pa.getX(i), pa.getY(i), pa.getZ(i)).applyMatrix4(o.matrixWorld).applyMatrix4(hinv)); });
          const y0 = Math.min(...pts.map((p) => p.y)) - 0.02, y1 = Math.max(...pts.map((p) => p.y)) + 0.02;
          const bodyX = []; for (const o of body) { const pa = o.geometry && o.geometry.attributes.position; if (!pa) continue; for (let i = 0; i < pa.count; i += 2) { const q = vp(o, pa, i, V()).applyMatrix4(hinv); if (q.y >= y0 && q.y <= y1) bodyX.push(q.x * side); } }
          const outline = Math.max(...bodyX), far = Math.max(...pts.map((p) => p.x * side));
          realOk(far - outline <= 0.01, tag + ': inside his outline (' + ((far - outline) * 100).toFixed(1) + ' cm past it)');
        }
      }
    }
    ok(seen >= 9, 'handguns checked at their stations: ' + seen);
    ok(onPack >= 1, 'and one on the pack\'s side: ' + onPack);
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
    // GB-220 found the recorded take (assets, foleyFolder 'wheel-tick') plays once it has loaded, not the synth bank this
    // counted, so a sweep read 0 plays: the count and the level are what wheelTick asks for (AudioSys.tickDbg), whichever
    // voice plays it (CL-160).
    const plays = () => (A.tickDbg ? A.tickDbg().plays : (A.bankDbg('wheelTick') || { plays: 0 }).plays);
    { const w0 = Date.now(); while (!A.bankDbg('wheelTick') && Date.now() - w0 < 45000) await wait(200); }
    const P0 = (window.BaseAudioContext || window.AudioContext).prototype, realGain = P0.createGain; let gains = [], ac = null;
    P0.createGain = function () { const n = realGain.call(this); ac = this; gains.push(n); return n; };
    const loudness = () => (A.tickDbg ? A.tickDbg().lastV : gains.length ? gains[0].gain.value : 0);   // CL-160: the level wheelTick asked for (was: the first gain a play makes)
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
