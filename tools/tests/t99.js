// t99 - Leading the megaswarm round the map (Jerry, 2026-09-27: "the entire remaining horde teleports
// somewhere when leading them around the terrain; you can still hear them but not see them; under the map?").
// The player is moved along a loop round the island (the lake and its pit, the river, the caves, the
// hills), 25 m every 2.5 s, with 120 shamblers following, Ragdoll off. Every 100 ms every zombie is
// checked: under the ground (y below sampleHeight - 1 where the water is shallow), high over it, a jump
// of more than 4 m in a tick, NaN, and hidden while nearer than the fog. Where something goes wrong the
// first ten sightings are listed with the place, so the map spot can be looked at.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const f1 = (v) => (+v).toFixed(1);
  const errs = []; window.addEventListener('error', (e) => errs.push(String((e.error && e.error.stack) || e.message || e.error).slice(0, 600)));
  try {
    await startMatch(T, 'Lead');
    T.clearZombies && T.clearZombies(); T.skipGrace && T.skipGrace(); T.runDevCommand('godmode');
    T.setMotionEnabledDbg(false);
    const p = T.player.position;
    const lake = T.LAKE || { x: -138, z: -104 };
    // The loop: out from spawn, along the river side, round the lake (over its pit), back through the hills.
    const route = [];
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 10) route.push({ x: Math.cos(a) * 70, z: 18 + Math.sin(a) * 70 });
    route.push({ x: lake.x + 40, z: lake.z }, { x: lake.x + 10, z: lake.z + 5 }, { x: lake.x - 20, z: lake.z }, { x: lake.x, z: lake.z + 45 }, { x: -60, z: -20 }, { x: 0, z: 18 });
    p.set(0, T.sampleHeight(0, 18), 18);
    await wait(300);
    const made = T.spawnMegaswarm(120);
    await wait(800);
    const last = new Map();
    const bad = { under: 0, over: 0, jump: 0, nan: 0, hidden: 0 };
    const where = [];
    const note = (kind, z, extra) => { if (where.length < 10) where.push(kind + ' at (' + f1(z.mesh.position.x) + ', ' + f1(z.mesh.position.y) + ', ' + f1(z.mesh.position.z) + ') ' + extra); };
    let leg = 0, legT = 0, ticks = 0;
    p.set(route[0].x, T.sampleHeight(route[0].x, route[0].z), route[0].z);
    const t0 = performance.now();
    while (leg < route.length) {
      await wait(100); ticks++; legT += 0.1;
      if (legT >= 2.5) { legT = 0; leg++; if (leg < route.length) { const w = route[leg]; p.set(w.x, T.sampleHeight(w.x, w.z), w.z); } }
      const fog = T.getSceneFog ? T.getSceneFog() : null, cam = T.camera.position;
      for (const z of T.zombies) {
        if (!z.alive || !z.mesh) continue;
        const m = z.mesh, x = m.position.x, y = m.position.y, zz = m.position.z;
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(zz)) { bad.nan++; note('NaN', z, ''); continue; }
        const g = T.sampleHeight(x, zz), depth = T.waterDepthAt(x, zz);
        const lp = last.get(z);
        if (lp && Math.hypot(x - lp.x, zz - lp.z) > 4 && !(z.leapT > 0)) { bad.jump++; note('jump', z, 'from (' + f1(lp.x) + ', ' + f1(lp.z) + ') leg ' + leg); }
        last.set(z, { x, z: zz });
        if (depth < 0.3 && !(z.riseT > 0) && y < g - 1) { bad.under++; note('under', z, 'ground ' + f1(g) + ' leg ' + leg); }
        if (depth < 0.05 && !(z.riseT > 0) && !(z.leapT > 0) && !z.climber && y > T.entityGroundY(x, zz, y + 1) + 1.2) { bad.over++; note('over', z, 'ground ' + f1(g) + ' leg ' + leg); }
        if (fog && !m.visible) {
          const d = (x - cam.x) * fog.fwd.x + (y - cam.y) * fog.fwd.y + (zz - cam.z) * fog.fwd.z;
          if (!z.fogHidden || d < fog.far - 2) { bad.hidden++; note('hidden', z, 'depth ' + f1(d) + ' of fog far ' + f1(fog.far) + ' leg ' + leg); }
        }
      }
    }
    let alive = 0; for (const z of T.zombies) if (z.alive) alive++;
    out.push('INFO ' + made + ' spawned, ' + alive + ' alive after ' + f1((performance.now() - t0) / 1000) + ' s and ' + route.length + ' legs (' + ticks + ' ticks)');
    for (const w of where) out.push('INFO ' + w);
    ok(bad.nan === 0, 'no NaN (' + bad.nan + ')');
    ok(bad.jump === 0, 'nobody jumps more than 4 m in a tick (' + bad.jump + ')');
    ok(bad.under === 0, 'nobody under the ground (' + bad.under + ' sightings)');
    ok(bad.over === 0, 'nobody high over the ground (' + bad.over + ' sightings)');
    ok(bad.hidden === 0, 'nobody hidden inside the fog (' + bad.hidden + ' sightings)');
    ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e.message)); }
  return out.join('\n');
})()
