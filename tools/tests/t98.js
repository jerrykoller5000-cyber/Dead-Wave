// t98 - The megaswarm as the benchmark for hordes (Jerry, 2026-09-27). A horde of shamblers spawned by the
// `megaswarm` dev command walks at the player across a river. Watched every 100 ms for 20 s, with the Ragdoll
// setting off (the default) and then on with a shell into the front of it: nobody vanishes while inside the
// fog (hidden by the fog cull, GB-59, while nearer than the fog's far edge), nobody sinks under the ground or
// floats above it on dry land, nobody's limbs are frozen while it is near (the far LOD left in a pooled mesh),
// nobody jumps more than 4 m in a tick, nobody stands still for 8 s while it is alive and has a way to go, and
// no NaN anywhere. The frame cost with the horde up is reported, not asserted (this runs headless).
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const f2 = (v) => (+v).toFixed(2);
  const errs = []; window.addEventListener('error', (e) => errs.push(String((e.error && e.error.stack) || e.message || e.error).slice(0, 600)));
  const N = 160, WATCH_S = 20;
  try {
    await startMatch(T, 'Swarm');
    T.clearZombies && T.clearZombies(); T.skipGrace && T.skipGrace(); T.runDevCommand('godmode');
    // The swarm spawns round (0, 18). Find a river within reach of it: the nearest point with deep water,
    // then a stand for the player on the far side of it, so the horde has to cross.
    const cx = 0, cz = 18;
    let river = null;
    for (let r = 20; r <= 160 && !river; r += 4) {
      for (let a = 0; a < Math.PI * 2 && !river; a += Math.PI / 24) {
        const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
        if (T.waterDepthAt(x, z) > 1.3) river = { x, z, a, r };
      }
    }
    ok(!!river, 'a river within 160 m of the swarm' + (river ? ' (' + f2(river.r) + ' m away)' : ''));
    let stand;
    if (river) {
      // Walk on from the river along the same bearing until the water is behind us and the ground is dry.
      for (let r = river.r + 6; r <= river.r + 60; r += 2) {
        const x = cx + Math.cos(river.a) * r, z = cz + Math.sin(river.a) * r;
        if (T.waterDepthAt(x, z) <= 0.05) { stand = { x, z }; break; }
      }
    }
    if (!stand) stand = { x: cx + 60, z: cz };
    const p = T.player.position;
    p.set(stand.x, T.sampleHeight(stand.x, stand.z), stand.z);
    await wait(300);

    const watch = async (label) => {
      const made = T.spawnMegaswarm(N);
      await wait(1200);   // everyone up out of the ground (noRise, but let a frame or two run)
      const last = new Map(), still = new Map();
      const bad = { vanished: 0, sunk: 0, floated: 0, frozen: 0, jumped: 0, stuck: 0, nan: 0, bodyStuck: 0 };
      const sample = { n: 0, ms: 0, worst: 0, alive: 0 };
      const t0 = performance.now();
      let ticks = 0;
      while (performance.now() - t0 < WATCH_S * 1000) {
        await wait(100); ticks++;
        const fog = T.getSceneFog ? T.getSceneFog() : null;
        const cam = T.camera.position;
        const pf = T.perfSnapshot();
        sample.n++; sample.ms += pf.fps ? 1000 / pf.fps : 0; sample.worst = Math.max(sample.worst, pf.worst || 0);
        let alive = 0;
        for (const z of T.zombies) {
          if (!z.alive || !z.mesh) continue;
          alive++;
          const m = z.mesh, x = m.position.x, y = m.position.y, zz = m.position.z;
          if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(zz)) { bad.nan++; continue; }
          const g = T.sampleHeight(x, zz), depth = T.waterDepthAt(x, zz);
          const camD = Math.hypot(x - cam.x, zz - cam.z);
          const lastP = last.get(z);
          if (lastP && Math.hypot(x - lastP.x, zz - lastP.z) > 4 && !(z.leapT > 0)) bad.jumped++;
          last.set(z, { x, z: zz });
          if (depth < 0.3 && !(z.riseT > 0) && y < g - 0.6) bad.sunk++;
          if (depth < 0.05 && !(z.riseT > 0) && !(z.leapT > 0) && !z.climber && !z.windowClimb && y > T.entityGroundY(x, zz, y + 1) + 1.0) bad.floated++;
          if (camD < 35 && z.mesh.userData.legLG && z.mesh.userData.legLG.matrixAutoUpdate === false) bad.frozen++;
          if (fog && !m.visible && !z.fogHidden) bad.vanished++;
          if (fog && !m.visible && z.fogHidden) {
            // hidden by the cull: it must be past the fog's far edge along the view axis
            const fwd = fog.fwd;
            const d = (x - cam.x) * fwd.x + (y - cam.y) * fwd.y + (zz - cam.z) * fwd.z;
            if (d < fog.far - 2) bad.vanished++;
          }
          // Stuck: no progress for 8 s while it still has 3 m or more to the player.
          const toP = Math.hypot(x - p.x, zz - p.z);
          const s = still.get(z) || { x, z: zz, t: 0 };
          if (Math.hypot(x - s.x, zz - s.z) > 0.3) { s.x = x; s.z = zz; s.t = 0; } else s.t += 0.1;
          still.set(z, s);
          if (s.t > 8 && toP > 3 && !(z.attackWindup > 0) && !(z.swingT > 0) && !(z.knockT > 0) && !(z.body && z.body.awake) && !z.poiGuard) { bad.stuck++; s.t = 0; }
          if (z.body && z.body.awake && z.body.alive) { z._awakeT = (z._awakeT || 0) + 0.1; if (z._awakeT > 9) { bad.bodyStuck++; z._awakeT = 0; } } else z._awakeT = 0;
        }
        sample.alive = alive;
      }
      const avg = sample.n ? sample.ms / sample.n : 0;
      out.push('INFO ' + label + ': ' + made + ' spawned, ' + sample.alive + ' alive at the end, ' + ticks + ' ticks, frame ' + f2(avg) + ' ms avg / ' + f2(sample.worst) + ' ms worst (headless)');
      ok(bad.nan === 0, label + ': no NaN positions (' + bad.nan + ')');
      ok(bad.vanished === 0, label + ': nobody hidden while inside the fog (' + bad.vanished + ' sightings)');
      ok(bad.sunk === 0, label + ': nobody under the ground on dry land (' + bad.sunk + ' sightings)');
      ok(bad.floated === 0, label + ': nobody floating over dry land (' + bad.floated + ' sightings)');
      ok(bad.frozen === 0, label + ': no frozen limbs within 35 m (' + bad.frozen + ' sightings)');
      ok(bad.jumped === 0, label + ': nobody jumps more than 4 m in 100 ms (' + bad.jumped + ')');
      ok(bad.stuck === 0, label + ': nobody stands still for 8 s with a way to go (' + bad.stuck + ')');
      ok(bad.bodyStuck === 0, label + ': no live body awake for 9 s (' + bad.bodyStuck + ')');
      return bad;
    };

    // (1) Ragdoll off, the default.
    T.setMotionEnabledDbg(false);
    await watch('ragdoll off');
    // Kill them all where they stand and let the pool take the meshes back; then the same horde again from
    // the pool (frozen limbs and corpse poses left in a pooled mesh show up here).
    T.clearZombies(); await wait(500);

    // (2) Ragdoll on: the same, with a shell into the front of the horde every 3 s.
    T.setMotionEnabledDbg(true);
    const shells = setInterval(() => {
      let best = null, bd = Infinity;
      for (const z of T.zombies) { if (!z.alive) continue; const d = Math.hypot(z.mesh.position.x - p.x, z.mesh.position.z - p.z); if (d < bd) { bd = d; best = z; } }
      if (best && bd < 30 && T.fireShellDbg) { const dx = best.mesh.position.x - p.x, dz = best.mesh.position.z - p.z, L = Math.hypot(dx, dz) || 1; T.fireShellDbg(p.x, p.y + 1.4, p.z, dx / L, -0.05, dz / L); }
    }, 3000);
    await watch('ragdoll on');
    clearInterval(shells);
    T.setMotionEnabledDbg(false);
    T.clearZombies(); await wait(300);

    // (3) The pool: spawn once more after all those deaths; nothing comes back frozen or posed.
    const again = T.spawnMegaswarm(60);
    await wait(800);
    let frozen = 0, posed = 0;
    for (const z of T.zombies) {
      if (!z.alive || !z.mesh) continue;
      const ud = z.mesh.userData;
      if (!z.farLod) for (const j of [ud.hips, ud.torso, ud.legLG, ud.legRG, ud.armLG, ud.armRG, ud.head]) if (j && j.matrixAutoUpdate === false) { frozen++; break; }
      if (ud.hips && (Math.abs(ud.hips.position.x) > 0.05 || Math.abs(ud.hips.position.z) > 0.05)) posed++;
    }
    ok(again > 0 && frozen === 0, 'pooled meshes come back with live limbs (' + frozen + ' of ' + again + ' frozen while near)');
    ok(posed === 0, 'pooled meshes come back with their hips over their feet (' + posed + ' off)');
    ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e.message)); }
  return out.join('\n');
})()
