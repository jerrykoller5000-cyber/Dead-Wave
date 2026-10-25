// t295 - CL-256 batch 2 (the sweep's findings against docs/world-design.md):
//  - rule 8: no camp's tent stands on its trail (the hikers' camp turns so its trail comes in through its open ground);
//  - the graveyard's open grave is solid (he walks round it, not across the hole and through its splintered boards);
//  - the graveyard's iron railing stops him either side of the gate; the gate between the pillars stays open.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    const P = T.POI, solids = T.worldSolids || [], dist = T.rabbitDbg && T.rabbitDbg.distToPath;
    ok(typeof dist === 'function', 'the trail distance is there');
    const solidAt = (x, z, r = 0.2) => solids.some((s) => Math.hypot(s.x - x, s.z - z) < s.radius + r);
    // Camps: the two tents of each layout (assets/world/campsites.js, local frame), turned by the camp's yaw.
    const TENTS = { ranger: [[-2.8, -3, 1.6]], hikers: [[-3, -2, 1.3], [2.3, -3.4, 1.2]] };
    const camps = (T.landmarks || []).filter((l) => l.kind === 'campsite');
    ok(camps.length >= 3, camps.length + ' camps');
    for (const lm of camps) {
      const tents = TENTS[lm.campStyle]; if (!tents) continue;
      const y = lm.campYaw || 0, c = Math.cos(y), s = Math.sin(y);
      for (const [lx, lz, r] of tents) {
        const wx = lm.x + c * lx + s * lz, wz = lm.z - s * lx + c * lz, d = dist(wx, wz);
        ok(d > 0.85 + r * 0.6, lm.campStyle + '\'s tent at (' + wx.toFixed(1) + ', ' + wz.toFixed(1) + ') is off the trail (' + d.toFixed(2) + ' m from its edge line)');
      }
    }
    // The graveyard: its gate is 6.2 m south of its centre; the railing runs 0.65-4.15 m out from each pillar (1.2 m).
    const g = P.graveyard;
    ok(!!g, 'the graveyard');
    if (g) {
      ok(solidAt(g.x + 3.0, g.z - 6.2) && solidAt(g.x - 3.0, g.z - 6.2), 'its railing is solid either side');
      ok(!solids.some((s) => Math.hypot(s.x - g.x, s.z - (g.z - 6.2)) < s.radius + 0.42), 'the gate between the pillars is open');
      // The open grave (history props, 'open-grave').
      let og = null; T.scene.traverse((o) => { if (!og && o.name && /open-grave/.test(o.name)) og = o; });
      ok(!!og, 'the open grave is there');
      if (og) { const p = og.getWorldPosition(new T.THREE.Vector3()); ok(solidAt(p.x, p.z, 0.1), 'and solid: he walks round it'); }
    }
    ok(errs.length === 0, 'no errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
