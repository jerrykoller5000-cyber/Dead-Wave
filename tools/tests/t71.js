// t71 - GB-42 (GP-A1, GB-A3): day-1 skulls you can see and keep. Every day-1 kill drops a skull
// (no 8-value pooling), skulls don't expire while the wave is on, and at the finisher the ones
// still on the ground fly to the marine and go into his bag. Day 2 still pools.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (cond, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (cond()) return true; await wait(50); } return cond(); };
  try {
    ok(typeof T.awardCash === 'function' && typeof T.getSkullRecall === 'function', 'GB-42 hooks exported');
    await startMatch(T, 'SkullKeep');
    T.runDevCommand('godmode');
    const hqx = -5.9, hqz = -2.2;
    T.player.position.set(hqx, T.sampleHeight(hqx, hqz), hqz);
    const skulls = () => T.cashDrops.filter((c) => c.skull && !c.taken);
    // GP-33 ledger (GB-42 amend): fractions carry. Eight quick kills: four at x1 and four at the
    // x1.25 streak pay 1+1+1+1+1.25*4 = 9 skull value (Math.round paid 8).
    ok(typeof T.getSkullLedger === 'function' && T.getSkullLedger().remainder() === 0, 'a new run starts with no carried fraction');
    {
      const before = new Set(skulls());
      const lz = [];
      for (let k = 0; k < 8; k++) lz.push(T.spawnZombie(30 + k * 1.5, 30, 'shambler', true, true));
      for (const z of lz) if (z) T.damageZombie(z, 9999, { kind: 'bullet' });
      await wait(50);
      const got = skulls().filter((c) => !before.has(c));
      const sum = got.reduce((a, c) => a + c.value, 0);
      ok(got.length === 8 && sum === 9, 'streak fractions carry: 8 kills pay ' + sum + ' in ' + got.length + ' skulls (want 9)');
      ok(Math.abs(T.getSkullLedger().remainder()) < 1e-9, 'nothing left over (' + T.getSkullLedger().remainder() + ')');
    }
    await wait(2800);   // let the streak lapse before the wave
    // GB-43's POI guards are not part of the wave (GB-47): wait until they are at their post,
    // kill them first (their skulls join the recall), and leave any stray one out of the count.
    await until(() => T.getPoiGuards().zombies.length > 0, 8000);
    const guards = T.zombies.filter((z) => z.alive && z.poiGuard);
    for (const z of guards) T.damageZombie(z, 9999, { kind: 'bullet' });
    await wait(100);
    ok(guards.length >= 2 && !T.zombies.some((z) => z.alive && !z.dying && z.poiGuard), 'the ' + guards.length + ' POI guards are down before the wave');
    const bag0 = T.getSkullBag().count;
    const sk0 = skulls().length;
    T.hqStartWave();
    // Kill each body as it comes (far from the marine), but leave one alive once the plan is out.
    let killed = 0, firstKillSkull = null;
    const t0 = Date.now();
    while (Date.now() - t0 < 40000) {
      const st = T.getWaveDirectorState();
      const alive = T.zombies.filter((z) => z.alive && !z.dying && !z.poiGuard);
      const keep = st.waveSpawned >= st.waveTotal ? 1 : 0;
      for (let k = 0; k < alive.length - keep; k++) {
        T.damageZombie(alive[k], 9999, { kind: 'bullet' });
        killed++;
        if (killed === 1) firstKillSkull = skulls().length - sk0;
      }
      if (st.waveSpawned >= st.waveTotal && T.zombies.filter((z) => z.alive && !z.dying).length === 1) break;
      await wait(60);
    }
    ok(firstKillSkull === 1, 'the first kill drops a skull (' + firstKillSkull + ')');
    const onGround = skulls().length - sk0;
    ok(killed === 14 && onGround === 14, '14 kills, 14 skulls on the ground (' + killed + '/' + onGround + ')');
    // Wind their clocks past CASH_LIFE: while the wave is on they hold.
    for (const c of skulls()) c.age = 45;
    await wait(500);
    ok(skulls().length - sk0 === 14, 'none expire while the wave is on (' + (skulls().length - sk0) + ')');
    ok(skulls().every((c) => c.age <= 18.01), 'their clocks hold (max age ' + Math.max(...skulls().map((c) => c.age)).toFixed(1) + ')');
    ok(T.getSkullBag().count === bag0, 'nothing bagged yet (he stayed at the HQ)');
    // The last kill: the finisher calls them in.
    const last = T.zombies.find((z) => z.alive && !z.dying);
    T.damageZombie(last, 9999, { kind: 'bullet' });
    ok(!!T.getWaveFinisher(), 'the finisher started');
    ok(T.getSkullRecall() > performance.now() - 50, 'skull recall armed');
    await wait(200);
    ok(skulls().length === 0 || skulls().every((c) => c.fly), 'every loose skull is flying to him');
    const allIn = await until(() => skulls().length === 0, 20000);
    const left = skulls(), pp = T.player.position;
    ok(allIn, (allIn ? '' : '[' + left.slice(0, 3).map((c) => (c.fly ? 'F' : 'g') + Math.hypot(c.mesh.position.x - pp.x, c.mesh.position.z - pp.z).toFixed(0) + '/' + c.value).join(' ') + ' ph ' + T.getPhase() + ' fin ' + !!T.getWaveFinisher() + ' cine ' + !!(T.getCine && T.getCine()) + '] ') + 'all of them reached him (' + left.length + ' left)');
    ok(T.getSkullBag().count - bag0 === 15 + sk0, 'bag +15 wave skulls, one per kill, plus ' + sk0 + ' already down (' + (T.getSkullBag().count - bag0) + ')');
    // Day 2 still pools small rewards (scope is day 1).
    await until(() => T.getPhase() === 'prep', 15000);
    T.clearZombies && T.clearZombies();
    T.setDay(1); T.startPrep();
    await wait(100);
    const before = skulls().length;
    T.awardCash(40, 40, 1, 'shambler');
    ok(T.getDay() === 2 && skulls().length === before, 'day 2: a 1-value kill still pools (no skull)');
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  return out.join('\n');
})()
