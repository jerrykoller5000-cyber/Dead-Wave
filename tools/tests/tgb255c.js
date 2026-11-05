(async () => {
  const T = window.TT; const out = []; const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    await startMatch(T, 'Idle');
    T.setHp(100000);
    T.clearZombies && T.clearZombies();
    const px = 18, pz = 18;
    T.player.position.set(px, T.sampleHeight(px, pz), pz);
    T.restartGraceDbg(); await wait(300); T.skipGrace();
    for (let run = 0; run < 10; run++) {
      const facing = run % 2 === 1;
      T.clearZombies && T.clearZombies(); await wait(200);
      T.player.position.set(px, T.sampleHeight(px, pz), pz);
      const w = T.spawnZombie(px + 25, pz, 'shambler', true, true);
      const yaw0 = w.mesh.rotation.y;
      if (facing) w.mesh.rotation.y = Math.atan2(px - (px + 25), 0);
      const wp1 = w.walkPhase || 0, g0 = T.getSimTime(), w0 = Date.now(); let n = 0;
      while (T.getSimTime() - g0 < 1.2 && Date.now() - w0 < 30000) { await wait(30); n++; }
      out.push('run ' + run + (facing ? ' FACING' : ' default') + ' yaw0 ' + yaw0.toFixed(2) + ' gain ' + ((w.walkPhase || 0) - wp1).toFixed(2) + ' game ' + (T.getSimTime() - g0).toFixed(2) + ' wall ' + ((Date.now() - w0) / 1000).toFixed(2) + ' idle ' + (w.idle ? w.idle.amt.toFixed(2) : 0));
    }
  } catch (e) { out.push('threw ' + (e && e.stack || e.message)); }
  return out.join('\n');
})()