// tgb271 - GB-271 temporary probe (moves to qa/2026-11-02-GB-271/ when done): t74's wake, frame by frame.
(async () => {
  const T = window.TT; const out = [];
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (cond, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (cond()) return true; await wait(50); } return cond(); };
  try {
    await startMatch(T, 'PoiGuards');
    T.runDevCommand('godmode');
    const post = T.getPoiGuards().post;
    const gz = () => T.getPoiGuards().zombies.filter((z) => z.alive);
    const hqx = -5.9, hqz = -2.2;
    T.player.position.set(hqx, T.sampleHeight(hqx, hqz), hqz);
    await wait(2500);
    const ax = post.x + 12, az = post.z;
    T.player.position.set(ax, T.sampleHeight(ax, az), az);
    await until(() => gz().every((z) => z.poiAwake), 3000);
    const keys = (z) => Object.keys(z).filter((k) => { const v = z[k]; return typeof v === 'number' || typeof v === 'boolean'; });
    const snap = (z) => { const o = {}; for (const k of keys(z)) o[k] = z[k]; return o; };
    const zs = gz(); const s0 = zs.map(snap);
    out.push('INFO post ' + post.kind + ' #' + post.index + ' guards ' + zs.length + ' phase ' + T.getPhase() + ' grace? ' + (T.zombieGraceActive ? T.zombieGraceActive() : '?'));
    const t0 = T.getSimTime(), w0 = Date.now();
    while (T.getSimTime() - t0 < 1.6 && Date.now() - w0 < 20000) {
      const line = zs.map((z, k) => { const d = Math.hypot(z.mesh.position.x - T.player.position.x, z.mesh.position.z - T.player.position.z); return 'g' + k + ' d' + d.toFixed(2) + ' L' + (+(z.poiLungeT || 0)).toFixed(2) + ' s' + z.hzSlot + ' r' + (z.rising ? 1 : 0) + ' a' + (+(z.attackWindup || 0)).toFixed(2); }).join(' | ');
      out.push('INFO t' + (T.getSimTime() - t0).toFixed(2) + ' ' + line);
      await wait(30);
    }
    zs.forEach((z, k) => { const a = s0[k], b = snap(z); const ch = Object.keys(b).filter((kk) => a[kk] !== b[kk]).map((kk) => kk + ':' + (typeof a[kk] === 'number' ? (+a[kk]).toFixed(2) : a[kk]) + '>' + (typeof b[kk] === 'number' ? (+b[kk]).toFixed(2) : b[kk])); out.push('INFO g' + k + ' type ' + z.typeKey + ' speed ' + z.speed + ' changed: ' + ch.join(' ')); out.push('INFO g' + k + ' start: ' + Object.keys(a).map((kk) => kk + '=' + (typeof a[kk] === 'number' ? (+a[kk]).toFixed(2) : a[kk])).join(' ')); });
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e.message)); }
  return out.join('\n');
})()