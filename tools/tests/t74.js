// t74 - GB-43 (D-32): day 1, two or three shamblers guard the POI nearest the HQ. They hold
// their post until the marine comes close, one is hurt, or the alarm sounds. Normal kills and
// normal skulls. Only on day 1.
// (Written as t72 in GB-43; Claude's CL-45 sky test took that number at the same time, so it lives here, GB-47.)
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (cond, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (cond()) return true; await wait(50); } return cond(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const cleared = []; window.addEventListener('dw-game', (e) => { if (e.detail && e.detail.type === 'poi-cleared') cleared.push(e.detail); });   // GP-38
  try {
    ok(typeof T.getPoiGuards === 'function' && typeof T.spawnPoiGuards === 'function', 'GB-43 hooks exported');
    await startMatch(T, 'PoiGuards');
    T.runDevCommand('godmode');
    const P = T.POI;
    const cands = [];
    const add = (kind, arr) => (arr || []).forEach((p, i) => { if (p) cands.push({ kind, i, d: Math.hypot(p.x, p.z) }); });
    add('campsite', P.campsites); add('cabin', P.cabins); add('shed', P.sheds); add('wreck', P.wrecks);
    add('tower', [P.tower]); add('graveyard', [P.graveyard]); add('mast', [P.mast]); add('dock', [P.dock]);
    cands.sort((a, b) => a.d - b.d);
    const g = T.getPoiGuards();
    const post = g.post;
    ok(!!post && post.kind === cands[0].kind && post.index === cands[0].i, 'post is the POI nearest the HQ: ' + (post && (post.kind + ' #' + post.index + ' at ' + post.dist.toFixed(0) + ' m')));
    const gz = () => T.getPoiGuards().zombies.filter((z) => z.alive);
    const n = gz().length;
    ok(n >= 2 && n <= 3, 'two or three guards (' + n + '; spawned ' + (post && post.n) + ', zombies ' + T.zombies.length + ', phase ' + T.getPhase() + ', day ' + T.getDay() + ')');
    ok(gz().every((z) => z.typeKey === 'shambler' && Math.hypot(z.mesh.position.x - post.x, z.mesh.position.z - post.z) < 5.5), 'shamblers standing at the post');
    // The marine at the HQ: they hold.
    const hqx = -5.9, hqz = -2.2;
    T.player.position.set(hqx, T.sampleHeight(hqx, hqz), hqz);
    const p0 = gz().map((z) => ({ x: z.mesh.position.x, z: z.mesh.position.z }));
    await wait(2500);
    const moved = Math.max(...gz().map((z, k) => Math.hypot(z.mesh.position.x - p0[k].x, z.mesh.position.z - p0[k].z)));
    ok(gz().every((z) => !z.poiAwake) && moved < 0.3, 'they hold the post while he is away (moved ' + moved.toFixed(2) + ' m)');
    ok(T.getPhase() === 'prep', 'still prep');
    // He comes: they wake and come for him.
    const ax = post.x + 12, az = post.z;
    T.player.position.set(ax, T.sampleHeight(ax, az), az);
    const r0 = gz().map((z) => z.mesh.rotation.y);
    const woke = await until(() => gz().every((z) => z.poiAwake), 3000);
    const dbg = ' err[' + errs.slice(0, 2).join(' | ').slice(0, 160) + '] rotΔ ' + gz().map((z, k) => (z.mesh.rotation.y - r0[k]).toFixed(4)).join('/') + ' paused ' + (T.isPaused ? T.isPaused() : '?') + ' sk ' + !!T.getScriptedKill() + ' over ' + (T.isGameOver ? T.isGameOver() : '?') + ' zl ' + T.zombies.length;
    ok(woke, 'within 18 m they wake (' + gz().map((z) => z.poiWake).join(',') + ')' + (woke ? '' : dbg));
    ok(errs.length === 0, 'no page errors while guards stand (' + errs.slice(0, 1).join('').slice(0, 80) + ')');
    const d0 = Math.min(...gz().map((z) => Math.hypot(z.mesh.position.x - ax, z.mesh.position.z - az)));
    await wait(1200);
    const d1 = Math.min(...gz().map((z) => Math.hypot(z.mesh.position.x - T.player.position.x, z.mesh.position.z - T.player.position.z)));
    ok(d1 < d0 - 1, 'and come for him (' + d0.toFixed(1) + ' -> ' + d1.toFixed(1) + ' m)');
    // Normal kills, normal skulls (day 1: one each).
    const skulls = () => T.cashDrops.filter((c) => c.skull && !c.taken).length;
    const s0 = skulls(), bag0 = T.getSkullBag().count, k0 = gz().length;
    for (const z of gz()) T.damageZombie(z, 9999, { kind: 'bullet' });
    await wait(150);
    ok(gz().length === 0, 'killed');
    ok(skulls() + (T.getSkullBag().count - bag0) - s0 === k0, 'a skull each (' + k0 + ')');
    // GP-38: the last one down clears the site, once, under the same identity as poi-guards.
    ok(cleared.length === 1 && cleared[0].kind === post.kind && cleared[0].index === post.index && typeof cleared[0].labelKey === 'string', 'one poi-cleared for ' + post.kind + ' #' + post.index + ' (' + cleared.length + ', ' + (cleared[0] && cleared[0].labelKey) + ')');
    // Hurt one from afar: they all wake.
    T.player.position.set(hqx, T.sampleHeight(hqx, hqz), hqz);
    T.spawnPoiGuards();
    await wait(200);
    const g2 = gz();
    ok(g2.length >= 2 && g2.every((z) => !z.poiAwake), 'a fresh set holds');
    T.damageZombie(g2[0], 3, { kind: 'bullet' });
    const woke2 = await until(() => gz().every((z) => z.poiAwake), 2000);
    ok(woke2, 'one shot from afar wakes them all (' + gz().map((z) => z.poiWake).join(',') + ')');
    // The alarm: guards still at their post go back into the dark (the wave is the briefing's 15);
    // ones already fighting stay in it.
    T.clearZombies && T.clearZombies();
    T.spawnPoiGuards();
    await wait(200);
    const awake1 = gz()[0];
    awake1.poiAwake = true; awake1.poiWake = 'test';
    const sleepers = gz().length - 1;
    T.player.position.set(hqx, T.sampleHeight(hqx, hqz), hqz);
    T.hqStartWave();
    const inWave = await until(() => T.getPhase() === 'wave', 20000);
    await wait(100);
    ok(inWave && sleepers >= 1 && gz().length === 1 && gz()[0] === awake1, 'the alarm retires the ' + sleepers + ' still at the post; the one fighting stays (' + gz().length + ')');
    ok(T.getWaveDirectorState().waveTotal === 15, 'the wave is still 15');
    ok(cleared.length === 1, 'retiring guards on the alarm (and clearing them) is not a clear (' + cleared.length + ')');
    // Only on day 1.
    T.clearZombies && T.clearZombies();
    T.setDay(1); T.startPrep();
    await wait(200);
    ok(T.getDay() === 2 && gz().length === 0, 'no guards on day 2');
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  return out.join('\n');
})()
