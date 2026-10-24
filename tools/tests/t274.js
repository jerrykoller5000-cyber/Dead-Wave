// t274 - GB-221 (D-87, friends' playtest 2026-10-23): killed by a cave's guardians while running from the dead, the
// dead froze. While the guardian's scripted kill plays, the dead already chasing him keep moving (in game time).
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const gwait = async (s) => { const s0 = T.getSimTime(), w0 = Date.now(); while (T.getSimTime() - s0 < s && Date.now() - w0 < 30000) await wait(30); };
  try {
    await startMatch(T, 'Chase');
    { const w0 = Date.now(); while (T.marine.getObjectByName('insertion-harness') && Date.now() - w0 < 90000) await wait(100); }
    if (T.skipPrep) T.skipPrep(); await gwait(0.5);
    T.setHp(100000); T.clearZombies && T.clearZombies();
    const c = T.POI.caves[0], P = T.player.position;
    const zs = [];
    for (let i = 0; i < 4; i++) { const a = i * 1.57; zs.push(T.spawnZombie(P.x + Math.sin(a) * 14, P.z + Math.cos(a) * 14, 'shambler', true)); }
    await gwait(1.5);
    const pos = () => zs.map((z) => ({ x: z.mesh.position.x, z: z.mesh.position.z }));
    const moved = (a, b) => Math.max(...a.map((p, i) => Math.hypot(p.x - b[i].x, p.z - b[i].z)));
    const p0 = pos(); await gwait(1); const before = moved(p0, pos());
    ok(before > 0.3, 'the dead chase him before the grab (' + before.toFixed(2) + ' m in 1 s)');
    T.beginScriptedKill('cave', c);
    ok(!!T.getScriptedKill(), 'the guardian has him');
    await gwait(0.3);
    const p1 = pos(); await gwait(1.5); const during = T.getScriptedKill() ? moved(p1, pos()) : -1;
    ok(during > 0.3, 'the dead keep moving while the guardian kills him (' + during.toFixed(2) + ' m in 1.5 s game time)');
  } catch (e) { out.push('FAIL threw: ' + (e && (e.stack || e.message))); }
  return out.join('\n');
})()