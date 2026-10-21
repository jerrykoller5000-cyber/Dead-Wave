// GB-142 probe (scratch, not a test): t98's megaswarm watch, logging every >4 m / 100 ms jump with the zombie's state.
(async () => {
  const T = window.TT; const out = [];
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const f2 = (v) => (+v).toFixed(2);
  const N = 160, WATCH_S = 20;
  const snap = (z) => { const o = {}; for (const k of Object.keys(z)) { const v = z[k]; if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string') o[k] = v; } return o; };
  try {
    await startMatch(T, 'Swarm');
    T.clearZombies && T.clearZombies(); T.skipGrace && T.skipGrace(); T.runDevCommand('godmode');
    const cx = 0, cz = 18; let river = null;
    for (let r = 20; r <= 160 && !river; r += 4) for (let a = 0; a < Math.PI * 2 && !river; a += Math.PI / 24) {
      const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r; if (T.waterDepthAt(x, z) > 1.3) river = { x, z, a, r }; }
    let stand;
    if (river) for (let r = river.r + 6; r <= river.r + 60; r += 2) { const x = cx + Math.cos(river.a) * r, z = cz + Math.sin(river.a) * r; if (T.waterDepthAt(x, z) <= 0.05) { stand = { x, z }; break; } }
    if (!stand) stand = { x: cx + 60, z: cz };
    const p = T.player.position; p.set(stand.x, T.sampleHeight(stand.x, stand.z), stand.z);
    out.push('INFO stand ' + f2(stand.x) + ',' + f2(stand.z) + ' river ' + (river ? f2(river.x) + ',' + f2(river.z) : 'none'));
    await wait(300);
    const watch = async (label) => {
      const made = T.spawnMegaswarm(N); await wait(1200);
      const last = new Map(); const t0 = performance.now(); let ticks = 0, jumps = 0;
      while (performance.now() - t0 < WATCH_S * 1000) {
        await wait(100); ticks++;
        for (const z of T.zombies) {
          if (!z.alive || !z.mesh) continue;
          const m = z.mesh, x = m.position.x, zz = m.position.z;
          const L = last.get(z), s = snap(z);
          if (L && Math.hypot(x - L.x, zz - L.z) > 4 && !(z.leapT > 0)) {
            jumps++;
            const diff = []; for (const k of Object.keys(s)) if (L.s[k] !== s[k] && !/^(_|anim|phase|walkT|t$|stepT)/.test(k)) diff.push(k + ':' + (typeof L.s[k] === 'number' ? f2(L.s[k]) : L.s[k]) + '->' + (typeof s[k] === 'number' ? f2(s[k]) : s[k]));
            out.push('JUMP ' + label + ' tick ' + ticks + ' type ' + z.type + ' idx ' + T.zombies.indexOf(z) + ' ' + f2(L.x) + ',' + f2(L.z) + ' -> ' + f2(x) + ',' + f2(zz) + ' d ' + f2(Math.hypot(x - L.x, zz - L.z))
              + ' mesh same ' + (L.mesh === m) + ' depth ' + f2(T.waterDepthAt(x, zz)) + ' toP ' + f2(Math.hypot(x - p.x, zz - p.z)) + ' body ' + (z.body ? (z.body.awake + '/' + z.body.alive) : '-'));
            out.push('   changed: ' + diff.slice(0, 40).join(' '));
            out.push('   flags: ' + ['riseT','leapT','knockT','crawling','hopping','farLod','fogHidden','climber','windowClimb','poiGuard','swim','swimming','inWater','stuckT','unstickT','flank','pounceT','lungeT','recycled','respawned'].map(k => z[k] !== undefined ? k + '=' + (typeof z[k] === 'number' ? f2(z[k]) : z[k]) : '').filter(Boolean).join(' '));
          }
          last.set(z, { x, z: zz, s, mesh: m });
        }
      }
      out.push('INFO ' + label + ': ' + made + ' spawned, ' + ticks + ' ticks, ' + jumps + ' jumps');
    };
    T.setMotionEnabledDbg(false); await watch('off'); T.clearZombies(); await wait(500);
    T.setMotionEnabledDbg(true);
    const shells = setInterval(() => { let best = null, bd = Infinity;
      for (const z of T.zombies) { if (!z.alive) continue; const d = Math.hypot(z.mesh.position.x - p.x, z.mesh.position.z - p.z); if (d < bd) { bd = d; best = z; } }
      if (best && bd < 30 && T.fireShellDbg) { const dx = best.mesh.position.x - p.x, dz = best.mesh.position.z - p.z, L = Math.hypot(dx, dz) || 1; T.fireShellDbg(p.x, p.y + 1.4, p.z, dx / L, -0.05, dz / L); } }, 3000);
    await watch('on'); clearInterval(shells);
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e.message)); }
  return out.join('\n');
})()