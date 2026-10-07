// t193 - CL-120 (Jerry, through Antigravity): the crouch keeps his boots on the ground on a slope too.
//  Crouched on a hillside, facing up it, down it and across it: each boot's sole sits on the ground under that boot
//  (not sunk into the hill, not standing on air), still and crouch-walking. Standing and walking on it too: before
//  CL-120 the body stood on the lowest ground within 0.3 m and the boots were about 0.1 m into a 15 degree hill.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const key = (code, down) => document.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, key: code, bubbles: true }));
  const f3 = (v) => (+v).toFixed(3);
  try {
    await startMatch(T, 'Slope');
    T.clearZombies && T.clearZombies(); T.setHp(100000);
    const p = T.player.position, V = T.THREE.Vector3, ud = T.marine.userData;
    // A dry, open hillside: the steepest spot in a ring round the HQ whose slope is 12-22 degrees and steady over 1.5 m.
    let best = null;
    for (let r = 25; r <= 90 && !best; r += 5) for (let a = 0; a < 64; a++) {
      const x = Math.cos(a / 64 * Math.PI * 2) * r, z = Math.sin(a / 64 * Math.PI * 2) * r;
      if (T.waterDepthAt(x, z) > 0) continue;
      const e = 0.75, gx = (T.sampleHeight(x + e, z) - T.sampleHeight(x - e, z)) / (2 * e), gz = (T.sampleHeight(x, z + e) - T.sampleHeight(x, z - e)) / (2 * e);
      const s = Math.hypot(gx, gz), deg = Math.atan(s) * 180 / Math.PI;
      if (deg < 12 || deg > 22) continue;
      const gx2 = (T.sampleHeight(x + 2 * e, z) - T.sampleHeight(x - 2 * e, z)) / (4 * e), gz2 = (T.sampleHeight(x, z + 2 * e) - T.sampleHeight(x, z - 2 * e)) / (4 * e);
      if (Math.hypot(gx2 - gx, gz2 - gz) > 0.06) continue;
      best = { x, z, deg, ux: gx / s, uz: gz / s };
      if (best) break;
    }
    ok(!!best, 'found a hillside (' + (best ? best.deg.toFixed(1) + ' deg at ' + best.x.toFixed(0) + ',' + best.z.toFixed(0) : 'none') + ')');
    if (!best) return out.join('\n');
    const soles = () => {
      T.player.updateMatrixWorld(true);
      const r = {};
      for (const s of ['L', 'R']) {
        const an = ud['ankle' + s + 'G'];
        // The sole's lowest point against the ground right under that point.
        let lo = Infinity, gap = 0;
        an.traverse((o) => {
          if (!o.isMesh || !o.geometry || !o.geometry.attributes.position || !o.visible) return;
          const pos = o.geometry.attributes.position, v = new V();
          for (let i = 0; i < pos.count; i += Math.max(1, Math.floor(pos.count / 400))) {
            v.fromBufferAttribute(pos, i); o.localToWorld(v);
            const d = v.y - T.sampleHeight(v.x, v.z);
            if (d < lo) lo = d;
          }
        });
        r[s] = lo;
      }
      return r;
    };
    const faces = [['up the hill', best.ux, best.uz], ['down the hill', -best.ux, -best.uz], ['across it', -best.uz, best.ux]];
    // Standing on level ground first: how high his hips stand over the ground (both legs as they are on the flat).
    const hipOver = () => { T.player.updateMatrixWorld(true); const h = [ud.legLG, ud.legRG].map((g) => g.getWorldPosition(new V()));
      return Math.min(...h.map((w) => w.y - T.sampleHeight(w.x, w.z))); };
    { const fx = 18, fz = 18; T.levelGroundRect(fx - 4, fz - 4, fx + 4, fz + 4, T.sampleHeight(fx, fz), 3); p.set(fx, T.sampleHeight(fx, fz), fz); T.setAimTargetDbg(fx, fz + 8); }
    await wait(1200);
    const flatHip = hipOver();
    let flatWalk = Infinity;
    { key('KeyW', true); await wait(250); const t0 = Date.now();
      while (Date.now() - t0 < 1000) { const l = soles(); flatWalk = Math.min(flatWalk, l.L, l.R); await wait(20); }
      key('KeyW', false); await wait(400); }
    out.push('INFO on the flat, walking, the lowest sole is ' + f3(flatWalk) + ' m');
    // Calibrate: standing still on the slope, and crouched on level ground.
    p.set(best.x, T.sampleHeight(best.x, best.z), best.z); T.setAimTargetDbg(best.x + best.ux * 8, best.z + best.uz * 8);
    await wait(1200);
    { const s0 = soles(); for (const s of ['L', 'R']) ok(s0[s] > -0.04 && s0[s] < 0.06, 'standing on the hill: ' + s + ' sole on the ground under it (' + f3(s0[s]) + ' m)'); }
    { const h = hipOver(); ok(Math.abs(h - flatHip) < 0.04, 'and he stands up on it, not half crouched: hips ' + f3(h) + ' m over the lower ground (' + f3(flatHip) + ' on the flat)'); }
    // Walking on it for real (not pinned: a pinned walk is posed where the step took him, then put back, so on a hill
    // its feet are measured over the wrong ground). Two directions, a second each, from the same spot.
    for (const [name, ax, az] of [['one way', best.ux, best.uz], ['the other', -best.uz, best.ux]]) {
      p.set(best.x, T.sampleHeight(best.x, best.z), best.z); T.setAimTargetDbg(best.x + ax * 8, best.z + az * 8);
      await wait(500);
      key('KeyW', true);
      await wait(250);
      let low = Infinity, n = 0;
      const t0 = Date.now();
      while (Date.now() - t0 < 1000) { const l = soles(); low = Math.min(low, l.L, l.R); n++; await wait(20); }
      key('KeyW', false);
      const deg = Math.atan(Math.hypot((T.sampleHeight(p.x + 0.75, p.z) - T.sampleHeight(p.x - 0.75, p.z)) / 1.5, (T.sampleHeight(p.x, p.z + 0.75) - T.sampleHeight(p.x, p.z - 0.75)) / 1.5)) * 180 / Math.PI;
      // A slow test page steps him up to 0.4 m a frame, so the eased ground under his feet trails a little: floating is
      // allowed a few cm more than on the flat; sinking (what Jerry saw) is not.
      ok(low > -0.05 && low < flatWalk + 0.07, 'walking on the hill (' + name + ', ' + deg.toFixed(0) + ' deg where he ended): no sole sinks into it, nor floats (lowest ' + f3(low) + ' m over ' + n + ' looks; ' + f3(flatWalk) + ' on the flat)');
      await wait(400);
    }
    for (const [name, fx, fz] of faces) {
      p.set(best.x, T.sampleHeight(best.x, best.z), best.z);
      T.setAimTargetDbg(best.x + fx * 8, best.z + fz * 8);
      key('KeyC', true);
      await wait(1600);
      const st = soles();
      for (const s of ['L', 'R']) ok(st[s] > -0.04 && st[s] < 0.05, 'crouched ' + name + ': ' + s + ' sole on the ground under it (' + f3(st[s]) + ' m)');
      // Crouch-walk on the spot (pinned), facing the same way.
      key('KeyW', true);
      const pin = setInterval(() => { p.x = best.x; p.z = best.z; }, 2);
      await wait(700);
      let low = Infinity, planted = -Infinity;
      for (let i = 0; i < 40; i++) { const l = soles(); low = Math.min(low, l.L, l.R); planted = Math.max(planted, Math.min(l.L, l.R)); await wait(25); }
      key('KeyW', false); clearInterval(pin);
      ok(low > -0.05, 'crouch-walking ' + name + ': no sole sinks into the hill (lowest ' + f3(low) + ' m)');
      ok(planted < 0.05, 'and one foot is always down (worst ' + f3(planted) + ' m)');
      key('KeyC', false);
      await wait(500);
    }
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
