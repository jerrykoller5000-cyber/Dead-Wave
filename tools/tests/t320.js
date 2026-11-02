// t320 - CU-211: the dead walk through the HQ ring's gaps. One shambler at a
// time, from outside each gap and from halfway between two gaps, with him in
// the clearing. Then a short night 20, and the same walk with him past the ring.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const hypot = Math.hypot;
  const wall0 = Date.now();
  const budget = () => Date.now() - wall0 < 165000;
  try {
    await startMatch(T, 'RingWalk');
    T.clearZombies();
    T.runDevCommand('godmode');
    if (T.skipGrace) T.skipGrace();
    const hx = T.house.group.position.x, hz = T.house.group.position.z;
    const put = (x, z) => T.player.position.set(x, T.sampleHeight(x, z), z);
    put(hx, hz + 6);
    ok(!!(T.wallBandsDbg && T.wallBandsDbg.on), 'the ring is on');

    const step = 2 * Math.PI / 180;
    const samples = [];
    for (let a = 0; a < Math.PI * 2 - 1e-9; a += step) {
      samples.push({ a, open: !T.wallBandsDbg.blocked(hx + Math.cos(a) * 60, hz + Math.sin(a) * 60, 0.45) });
    }
    const runs = [];
    let cur = null;
    for (let i = 0; i < samples.length; i++) {
      if (samples[i].open) { if (!cur) cur = { i0: i, i1: i }; else cur.i1 = i; }
      else if (cur) { runs.push(cur); cur = null; }
    }
    if (cur) runs.push(cur);
    if (runs.length > 1 && samples[0].open && samples[samples.length - 1].open) {
      const last = runs.pop();
      runs[0].i0 = last.i0 - samples.length;
    }
    const gaps = runs.map((r) => {
      const mid = (r.i0 + r.i1) / 2;
      const a = ((mid % samples.length) + samples.length) % samples.length * step;
      return { a, span: (r.i1 - r.i0 + 1) * step };
    }).filter((g) => g.span >= step * 1.5);
    ok(gaps.length >= 2 && gaps.length <= 16, 'the ring has gaps (' + gaps.length + ')');

    const spots = [];
    for (let i = 0; i < gaps.length; i++) {
      spots.push({ kind: 'gap', a: gaps[i].a });
      const nxt = gaps[(i + 1) % gaps.length].a;
      let d = nxt - gaps[i].a; if (d <= 0) d += Math.PI * 2;
      spots.push({ kind: 'between', a: gaps[i].a + d * 0.5 });
    }

    function dry(a) {
      for (const r of [84, 94, 74]) {
        for (const da of [0, 0.15, -0.15, 0.3, -0.3]) {
          const x = hx + Math.cos(a + da) * r, z = hz + Math.sin(a + da) * r;
          if (T.waterDepthAt(x, z) > 0.3) continue;
          if (T.terrainSlope(x, z) > 0.62) continue;
          return { x, z };
        }
      }
      return null;
    }

    async function walkTo(spot, goal, wallMs) {
      T.clearZombies();
      const z = T.spawnZombie(spot.x, spot.z, 'shambler', true, true);
      if (!z) return { fail: 'no spawn' };
      const t0 = T.getSimTime();
      const w0 = Date.now();
      let stuckFor = 0, prevT = t0;
      const hist = [{ t: t0, x: spot.x, z: spot.z }];
      let clipped = false, arrived = false, viaGap = false, wasOut = true;
      while (T.getSimTime() - t0 < 80 && Date.now() - w0 < (wallMs || 28000)) {
        await wait(80);
        if (!z.alive) return { fail: 'died', stuckFor, clipped };
        const p = z.mesh.position;
        const now = T.getSimTime();
        const dt = Math.min(0.35, now - prevT);
        const r = hypot(p.x - hx, p.z - hz);
        hist.push({ t: now, x: p.x, z: p.z });
        while (hist.length > 1 && now - hist[0].t > 1.2) hist.shift();
        if (T.wallBandsDbg.blocked(p.x, p.z, 0.05)) clipped = true;
        const ang = Math.atan2(p.z - hz, p.x - hx);
        const against = Math.abs(r - 60) < 4.5 && T.wallBandsDbg.blocked(hx + Math.cos(ang) * 60, hz + Math.sin(ang) * 60, 0.45);
        const window = now - hist[0].t;
        const slid = hypot(p.x - hist[0].x, p.z - hist[0].z);
        if (against && window >= 1.0 && slid < 0.35) stuckFor += dt;
        else if (!against || slid >= 0.35) stuckFor = 0;
        if (wasOut && r < 58) { viaGap = !T.wallBandsDbg.blocked(hx + Math.cos(ang) * 60, hz + Math.sin(ang) * 60, 0.45); wasOut = false; }
        if (goal(p)) { arrived = true; break; }
        if (stuckFor > 3) break;
        prevT = now;
      }
      const p = z.mesh.position;
      return { arrived, viaGap, clipped, stuckFor, r: hypot(p.x - hx, p.z - hz), secs: T.getSimTime() - t0 };
    }

    async function walkGroup(group, goal) {
      T.clearZombies();
      const men = [];
      for (const s of group) {
        const spot = dry(s.a);
        if (!spot) { ok(false, s.kind + ' had no dry ground'); continue; }
        const z = T.spawnZombie(spot.x, spot.z, 'shambler', true, true);
        if (!z) { ok(false, s.kind + ' did not spawn'); continue; }
        // CU-220, Claude: the clock follows the arc to the nearest gap plus the way in, at his speed, times 1.5.
        let nearest = Math.PI;
        for (const g of gaps) { let d = Math.abs(g.a - s.a); if (d > Math.PI) d = Math.PI * 2 - d; if (d < nearest) nearest = d; }
        const speed = (z.speed > 0.5 && z.speed) || (z.baseSpeed > 0.5 && z.baseSpeed) || 3.67;
        const spawnR = hypot(spot.x - hx, spot.z - hz);
        const allow = Math.max(50, 1.5 * (60 * nearest + Math.max(0, spawnR - 54)) / speed);
        men.push({ s, z, stuckFor: 0, clipped: false, arrived: false, viaGap: false, wasOut: true, hist: [{ t: T.getSimTime(), x: spot.x, z: spot.z }], prevT: T.getSimTime(), allow, travel: 0 });
      }
      const t0 = T.getSimTime();
      const w0 = Date.now();
      const longest = men.reduce((n, m) => Math.max(n, m.allow), 20);
      // CU-220: allow is game time. This page does about 0.85 s of game per wall
      // second (34 s of game inside a 40 s wall), so a flat 40 s wall cut a 50 s
      // walk off early. Cover the allowance, and stop before the runner's 180 s kill.
      const wantWall = Math.ceil(longest / 0.85 * 1000) + 2000;
      const wallMs = Math.max(8000, Math.min(wantWall, 168000 - (Date.now() - wall0)));
      while (men.some((m) => !m.arrived && m.stuckFor <= 3 && m.z.alive && T.getSimTime() - t0 < m.allow) && Date.now() - w0 < wallMs) {
        await wait(80);
        const now = T.getSimTime();
        for (const m of men) {
          if (m.arrived || !m.z.alive || m.stuckFor > 3 || now - t0 >= m.allow) continue;
          const p = m.z.mesh.position;
          const dt = Math.min(0.35, now - m.prevT);
          const prev = m.hist[m.hist.length - 1];
          m.travel += hypot(p.x - prev.x, p.z - prev.z);
          const r = hypot(p.x - hx, p.z - hz);
          m.hist.push({ t: now, x: p.x, z: p.z });
          while (m.hist.length > 1 && now - m.hist[0].t > 1.2) m.hist.shift();
          if (T.wallBandsDbg.blocked(p.x, p.z, 0.05)) m.clipped = true;
          const ang = Math.atan2(p.z - hz, p.x - hx);
          const against = Math.abs(r - 60) < 4.5 && T.wallBandsDbg.blocked(hx + Math.cos(ang) * 60, hz + Math.sin(ang) * 60, 0.45);
          const window = now - m.hist[0].t;
          const slid = hypot(p.x - m.hist[0].x, p.z - m.hist[0].z);
          if (against && window >= 1.0 && slid < 0.35) m.stuckFor += dt;
          else if (!against || slid >= 0.35) m.stuckFor = 0;
          if (m.wasOut && r < 58) { m.viaGap = !T.wallBandsDbg.blocked(hx + Math.cos(ang) * 60, hz + Math.sin(ang) * 60, 0.45); m.wasOut = false; }
          if (goal(p)) m.arrived = true;
          m.prevT = now;
          m.r = r;
          m.secs = now - t0;
        }
      }
      for (const m of men) {
        const deg = (m.s.a * 180 / Math.PI).toFixed(0);
        let nearest = Math.PI;
        for (const g of gaps) { let d = Math.abs(g.a - m.s.a); if (d > Math.PI) d = Math.PI * 2 - d; if (d < nearest) nearest = d; }
        ok(m.arrived && m.viaGap && !m.clipped && m.stuckFor <= 3,
          m.s.kind + ' ' + deg + '° inside through a gap in ' + (m.secs || 0).toFixed(0) + 's (r ' + (m.r || 0).toFixed(0) + ', walked ' + (m.travel || 0).toFixed(0) + 'm, stuck ' + m.stuckFor.toFixed(1) + 's, clip ' + m.clipped + ', nearest gap ' + (nearest * 180 / Math.PI).toFixed(0) + ' deg)');
      }
      return men.length;
    }

    const gapSpots = spots.filter((s) => s.kind === 'gap');
    const betweenSpots = spots.filter((s) => s.kind === 'between');
    const walked = await walkGroup(gapSpots, (p) => hypot(p.x - hx, p.z - hz) < 54)
      + await walkGroup(betweenSpots, (p) => hypot(p.x - hx, p.z - hz) < 54);
    ok(walked >= gaps.length, 'walked a gap and a between-gap for each opening (' + walked + '/' + (gaps.length * 2) + ')');

    if (budget() && Date.now() - wall0 < 140000) {
      put(hx, hz + 6);
      const jumped = T.devJumpToNight(20, true);
      ok(jumped !== false, 'night 20 started');
      T.runDevCommand('godmode');
      const t0 = T.getSimTime();
      const w0 = Date.now();
      let firstIn = null, clipped = 0, stuckN = 0;
      const stuckFor = new Map();
      const hist = new Map();
      while (T.getSimTime() - t0 < 35 && Date.now() - w0 < 40000 && Date.now() - wall0 < 168000 && firstIn == null) {
        await wait(120);
        const now = T.getSimTime();
        for (const z of T.zombies || []) {
          if (!z.alive || !z.mesh) continue;
          const p = z.mesh.position;
          const r = hypot(p.x - hx, p.z - hz);
          const id = z.mesh.uuid || z;
          const h = hist.get(id) || [];
          h.push({ t: now, x: p.x, z: p.z });
          while (h.length > 1 && now - h[0].t > 1.2) h.shift();
          hist.set(id, h);
          if (T.wallBandsDbg.blocked(p.x, p.z, 0.05)) clipped++;
          const ang = Math.atan2(p.z - hz, p.x - hx);
          const against = Math.abs(r - 60) < 4.5 && T.wallBandsDbg.blocked(hx + Math.cos(ang) * 60, hz + Math.sin(ang) * 60, 0.45);
          const window = now - h[0].t;
          const slid = hypot(p.x - h[0].x, p.z - h[0].z);
          let acc = stuckFor.get(id) || 0;
          const dt = h.length > 1 ? Math.min(0.4, now - h[h.length - 2].t) : 0;
          if (against && window >= 1.0 && slid < 0.35) acc += dt; else if (!against || slid >= 0.35) acc = 0;
          if (acc > 3 && (stuckFor.get(id) || 0) <= 3) stuckN++;
          stuckFor.set(id, acc);
          if (r < 52 && firstIn == null) firstIn = now - t0;
        }
      }
      const horde = (T.zombies || []).filter((z) => z.alive && z.hz);
      ok(firstIn != null, 'a night body reached the clearing (' + (firstIn == null ? 'none in 40s' : firstIn.toFixed(0) + 's') + ')');
      ok(clipped === 0, 'no night body stood in the thicket (' + clipped + ')');
      ok(stuckN === 0, 'no night body stuck at the ring (' + stuckN + ')');
      ok(horde.length > 0, 'the horde took its slots (' + horde.length + ')');
    }

    if (budget()) {
      const px = hx, pz = hz + 78;
      if (T.waterDepthAt(px, pz) > 0.3) ok(false, 'the woods post is underwater');
      else {
        put(px, pz);
        T.clearZombies();
        const far = dry(Math.PI);
        const farCap = Math.min(55000, 172000 - (Date.now() - wall0));
        if (!far) ok(false, 'past the ring, no dry ground on the far side');
        else if (farCap >= 12000) {
          const w = await walkTo(far, (p) => hypot(p.x - px, p.z - pz) < 14, farCap);
          ok(!!(w && w.arrived && !w.clipped && w.stuckFor <= 3),
            'past the ring, a shambler from the far side reached him' + (w ? ' (r ' + w.r.toFixed(0) + ', stuck ' + w.stuckFor.toFixed(1) + 's)' : ''));
        }
      }
    }
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
