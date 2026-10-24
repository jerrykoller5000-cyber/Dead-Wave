// GB-226 scratch: every wanderer trail, from several starts, in game time: does an unaware colossus walk it, and where does it stick.
(async () => {
  const T = window.TT; const out = [];
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const gwait = async (s) => { const s0 = T.getSimTime(), w0 = Date.now(); while (T.getSimTime() - s0 < s && Date.now() - w0 < s * 4000) await wait(50); };
  try {
    await startMatch(T, 'Wanderer');
    T.runDevCommand('godmode');
    const hqx = -5.9, hqz = -2.2; const home = () => T.player.position.set(hqx, T.sampleHeight(hqx, hqz), hqz);
    T.setDay(8); T.startPrep(); home(); await wait(1500);
    const trails = T.wandererTrails();
    out.push('LOG trails ' + trails.length + ' ' + JSON.stringify(trails.map((t, k) => ({ k, line: t.index, n: t.pts.length, len: +t.len.toFixed(1), p0: [t.pts[0].x, t.pts[0].z].map((v) => +v.toFixed(1)) }))));
    for (let k = 0; k < trails.length; k++) {
      const t = trails[k];
      for (const st of [0, (t.pts.length / 2) | 0, t.pts.length - 1]) for (const dir of [1]) {
        T.clearZombies(); home();
        const seq = [(k + 0.5) / trails.length, (st + 0.5) / t.pts.length, dir > 0 ? 0.1 : 0.9]; let q = 0;
        const post = T.spawnWanderer(9, () => seq[q++] ?? 0.5);
        const g = T.zombies.find((z) => z.alive && z.poiGuard === post);
        if (!g) { out.push('LOG k' + k + ' s' + st + ' no colossus'); continue; }
        const w = post.wanderer; let walked = 0, lx = g.mesh.position.x, lz = g.mesh.position.z;
        const s0 = T.getSimTime();
        for (let n = 0; n < 20; n++) { await gwait(0.5); home(); walked += Math.hypot(g.mesh.position.x - lx, g.mesh.position.z - lz); lx = g.mesh.position.x; lz = g.mesh.position.z; }
        const tg = w.pts[w.i];
        out.push('LOG k' + k + ' line' + t.index + ' start' + st + ' dir' + dir + ' walked ' + walked.toFixed(1) + ' m in ' + (T.getSimTime() - s0).toFixed(1) + ' s game, speed ' + g.speed + ', i ' + w.i + '/' + w.pts.length + ' repaths ' + w.repaths + ' pos ' + [lx, lz].map((v) => v.toFixed(1)) + ' -> target ' + [tg.x, tg.z].map((v) => v.toFixed(1)) + ' (' + Math.hypot(tg.x - lx, tg.z - lz).toFixed(1) + ' m)' + (g.poiAwake ? ' AWAKE ' + g.poiWake : ''));
      }
    }
    T.clearZombies();
  } catch (e) { out.push('FAIL threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();