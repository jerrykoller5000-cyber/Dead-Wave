(async () => {
  const T = window.TT; const out = []; const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    await startMatch(T, 'SpitLine');
    const w0 = Date.now();
    while (T.marine.getObjectByName('insertion-harness') && Date.now() - w0 < 90000) await wait(100);
    T.clearZombies(); T.runDevCommand('godmode'); T.skipGrace && T.skipGrace();
    const H = T.house; const hx = H.group.position.x, hz = H.group.position.z, hh = H.half;
    const post = { x: hx - hh - 0.9, z: hz - 2.2 }, p = T.player.position;
    out.push('house ' + hx.toFixed(1) + ',' + hz.toFixed(1) + ' half ' + hh + ' post ' + post.x.toFixed(1) + ',' + post.z.toFixed(1));
    for (let run = 0; run < 8; run++) {
      p.set(post.x, T.sampleHeight(post.x, post.z), post.z);
      const x = hx + hh + 2, z = hz - 1;
      const zz = T.spawnZombie(x, z, 'spitter', true, true);
      zz.mesh.position.set(x, T.sampleHeight(x, z), z);
      const t0 = T.getSimTime(), wall0 = Date.now(); let nextS = 0; const path = []; let maxD = 0, minD = 1e9, d = 0, sim0 = null;
      const info0 = 'flankSide ' + zz.flankSide + ' tactics ' + zz.tactics + ' hzSlot ' + zz.hzSlot;
      let fr0 = T.getFrames ? T.getFrames() : null;
      while (T.getSimTime() - t0 < 14 && zz.alive && Date.now() - wall0 < 90000) {
        await wait(50);
        p.set(post.x, T.sampleHeight(post.x, post.z), post.z);
        const q = zz.mesh.position; d = Math.hypot(q.x - p.x, q.z - p.z); maxD = Math.max(maxD, d); minD = Math.min(minD, d);
        const g = T.getSimTime() - t0;
        if (g >= nextS) { nextS += 1; path.push(g.toFixed(1) + ':' + (q.x - hx).toFixed(1) + ',' + (q.z - hz).toFixed(1)); }
      }
      out.push('run ' + run + ' wall ' + ((Date.now() - wall0) / 1000).toFixed(1) + 's end ' + d.toFixed(1) + ' max ' + maxD.toFixed(1) + ' min ' + minD.toFixed(1) + ' | ' + info0 + ' -> hzSlot ' + zz.hzSlot + ' hzOpen ' + zz.hzOpen + ' | ' + path.join(' '));
      T.clearZombies(); await wait(200);
    }
  } catch (e) { out.push('threw ' + (e && e.stack || e.message)); }
  return out.join('\n');
})()