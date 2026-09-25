// t83 - GB-57 (D-37, D-38): the day's bounties, the combat side. From night 2 each prep posts
// guards at one POI (two from night 8): never the POI nearest the HQ, never one of yesterday's,
// not the dock; 3-4 guards early, up to 6-8 with a specialist later. bounty-posted when placed,
// bounty-done on that post's poi-cleared with the D-38 reward into the skull bag (still to be
// banked), and at the alarm an open bounty just ends: its guards go and join nobody.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (cond, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (cond()) return true; await wait(50); } return cond(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const ev = []; window.addEventListener('dw-game', (e) => { const d = e.detail; if (d && /^(bounty-|poi-cleared|skull-pickup|alarm-started)/.test(d.type)) ev.push(d); });
  const of = (type) => ev.filter((e) => e.type === type);
  try {
    ok(['getBounties', 'spawnBounties', 'expireBounties', 'bountyRewardFor', 'bountyGuardTypes'].every((k) => typeof T[k] === 'function'), 'GB-57 hooks exported');
    // D-38's bands, one number each.
    const bands = [[1, 0], [2, 25], [3, 25], [4, 60], [7, 60], [8, 150], [13, 150], [14, 300], [20, 300], [26, 300]];
    const bad = bands.filter(([d, v]) => T.bountyRewardFor(d) !== v);
    ok(bad.length === 0, 'rewards per D-38: 2-3 = 25, 4-7 = 60, 8-13 = 150, 14 and up = 300' + (bad.length ? ' (bad ' + JSON.stringify(bad) + ')' : ''));
    // Guards sized to the night.
    const sizes = (d) => { let lo = 99, hi = 0; const spec = new Set(); for (let k = 0; k < 300; k++) { const t = T.bountyGuardTypes(d); lo = Math.min(lo, t.length); hi = Math.max(hi, t.length); t.filter((x) => x !== 'shambler').forEach((x) => spec.add(x)); if (t.filter((x) => x !== 'shambler').length > 1) spec.add('TWO'); } return { lo, hi, spec: [...spec].sort().join('/') || '-' }; };
    const s2 = sizes(2), s5 = sizes(5), s9 = sizes(9), s16 = sizes(16);
    ok(s2.lo === 3 && s2.hi === 4 && s2.spec === '-', 'nights 2-3: 3-4 shamblers (' + JSON.stringify(s2) + ')');
    ok(s5.lo === 4 && s5.hi === 5 && s5.spec === '-', 'nights 4-7: 4-5 shamblers (' + JSON.stringify(s5) + ')');
    ok(s9.lo === 5 && s9.hi === 6 && s9.spec === 'brute', 'nights 8-13: 5-6 with a brute (' + JSON.stringify(s9) + ')');
    ok(s16.lo === 6 && s16.hi === 8 && s16.spec === 'brute/demon', 'night 14 on: 6-8 with a brute or a demon (' + JSON.stringify(s16) + ')');

    await startMatch(T, 'Bounties');
    T.runDevCommand('godmode');
    const hqx = -5.9, hqz = -2.2;
    const home = () => T.player.position.set(hqx, T.sampleHeight(hqx, hqz), hqz);
    home();
    await wait(600);
    ok(T.getDay() === 1 && T.getBounties().length === 0 && of('bounty-posted').length === 0, 'no bounty on day 1');
    const near = T.nearestHqPoi(); const nearKey = near.kind + ':' + near.index;
    const key = (b) => b.kind + ':' + b.index;
    const guardsOf = (b) => T.zombies.filter((z) => z.alive && z.poiGuard && z.poiGuard.kind === b.kind && z.poiGuard.index === b.index && z.poiGuard.bounty);
    const seqDone = () => until(() => !T.bountyDbg().seq, 30000);
    const prep = async (nightBefore) => {
      await seqDone();
      T.clearZombies(); home(); const n0 = of('bounty-posted').length;
      T.setDay(nightBefore); T.startPrep();
      await until(() => of('bounty-posted').length > n0 && T.getBounties().length && T.getBounties().every((b) => guardsOf(b).length === b.guards), 6000);
      return T.getBounties();
    };

    // Night 2.
    let b = await prep(1);
    const b0 = b[0];
    const pe = of('bounty-posted').slice(-1)[0];
    ok(T.getDay() === 2 && b.length === 1 && b0.day === 2 && b0.reward === 25 && b0.state === 'open', 'night 2: one bounty, 25 skulls, open (' + JSON.stringify(b.map((x) => [key(x), x.reward, x.state, x.day])) + ')');
    ok(!!pe && pe.kind === b0.kind && pe.index === b0.index && pe.reward === 25 && pe.guards === b0.guards && pe.day === 2 && pe.runId != null && typeof pe.labelKey === 'string' && pe.labelKey === b0.labelKey, 'bounty-posted {kind, index, reward, guards} with day, runId and labelKey (' + JSON.stringify(pe && { k: pe.kind, i: pe.index, r: pe.reward, g: pe.guards, d: pe.day, l: pe.labelKey }) + ')');
    ok(key(b0) !== nearKey && b0.kind !== 'dock', 'not the POI nearest the HQ (' + nearKey + ') and not the dock: ' + key(b0) + ' at ' + b0.dist.toFixed(0) + ' m');
    const g0 = guardsOf(b0);
    ok(g0.length >= 3 && g0.length <= 4 && g0.length === b0.guards && b0.alive === g0.length && g0.every((z) => z.typeKey === 'shambler' && !z.poiAwake && Math.hypot(z.mesh.position.x - b0.x, z.mesh.position.z - b0.z) < 6), g0.length + ' shamblers asleep at the post');
    const p0 = g0.map((z) => ({ x: z.mesh.position.x, z: z.mesh.position.z }));
    await wait(1500);
    const moved = Math.max(...g0.map((z, k) => Math.hypot(z.mesh.position.x - p0[k].x, z.mesh.position.z - p0[k].z)));
    ok(g0.every((z) => z.alive && !z.poiAwake) && moved < 0.3 && T.getPhase() === 'prep', 'they hold while he is at the HQ (moved ' + moved.toFixed(2) + ' m)');
    // Clear it: poi-cleared, then bounty-done, and the reward goes into the bag.
    const bag0 = { ...T.getSkullBag() }, bank0 = T.getBank ? T.getBank() : null;
    const c0 = of('poi-cleared').length, d0 = of('bounty-done').length;
    for (const z of g0) T.damageZombie(z, 99999, { kind: 'bullet' });
    await until(() => of('bounty-done').length > d0, 1500);
    const bag1 = T.getSkullBag();
    const done = of('bounty-done').slice(d0);
    const ci = ev.indexOf(of('poi-cleared').slice(c0)[0]), di = ev.indexOf(done[0]);
    ok(of('poi-cleared').length === c0 + 1 && done.length === 1 && ci >= 0 && ci < di, 'one poi-cleared, then one bounty-done (' + (of('poi-cleared').length - c0) + ', ' + done.length + ')');
    ok(done.length === 1 && done[0].kind === b0.kind && done[0].index === b0.index && done[0].reward === 25 && done[0].day === 2, 'bounty-done {kind, index, reward} for ' + key(b0) + ' (' + JSON.stringify(done[0] && { k: done[0].kind, i: done[0].index, r: done[0].reward }) + ')');
    ok(bag1.count - bag0.count === 1 && bag1.value - bag0.value === 25, 'the reward is one skull worth 25 in the bag (bag ' + bag0.count + '/' + bag0.value + ' -> ' + bag1.count + '/' + bag1.value + ')');
    ok(bank0 == null || T.getBank() === bank0, 'not Cash yet: it still has to be banked (bank ' + bank0 + ' -> ' + (T.getBank ? T.getBank() : '?') + ')');
    ok(T.getBounties()[0].state === 'done' && T.getBounties()[0].alive === 0, 'the board snapshot says done');
    const sp = of('skull-pickup').filter((e) => e.bounty).slice(-1)[0];
    ok(!!sp && sp.count === 1 && sp.value === 25 && sp.carriedCount === bag1.count && sp.carriedValue === bag1.value, 'the bag growing is a skull-pickup {count 1, value 25, bounty: true} like any pickup (' + JSON.stringify(sp && { c: sp.count, v: sp.value, cc: sp.carriedCount, cv: sp.carriedValue }) + ')');

    // Never yesterday's post, never the nearest, never the dock (night 3, eight days running).
    let prev = key(b0); const seen = []; let repeat = 0, nearHit = 0, dock = 0;
    for (let k = 0; k < 8; k++) {
      const bb = await prep(2);
      if (!bb.length) { seen.push('none'); continue; }
      const kk = key(bb[0]); seen.push(kk);
      if (kk === prev) repeat++; if (kk === nearKey) nearHit++; if (bb[0].kind === 'dock') dock++;
      prev = kk;
    }
    ok(repeat === 0 && nearHit === 0 && dock === 0 && !seen.includes('none'), 'eight preps: never yesterday\'s post, never the nearest, never the dock (' + seen.join(' ') + ')');
    ok(new Set(seen).size >= 3, 'the posts move round (' + new Set(seen).size + ' different)');

    // Night 8: two posts, apart, 150 each, 5-6 guards with a brute. Each post wakes on its own.
    b = await prep(7);
    const gA = b[0] ? guardsOf(b[0]) : [], gB = b[1] ? guardsOf(b[1]) : [];
    ok(b.length === 2 && b.every((x) => x.reward === 150 && x.day === 8) && Math.hypot(b[0].x - b[1].x, b[0].z - b[1].z) >= 25, 'night 8: two bounties of 150, ' + (b.length === 2 ? Math.hypot(b[0].x - b[1].x, b[0].z - b[1].z).toFixed(0) : '?') + ' m apart (' + b.map(key).join(', ') + ')');
    ok([gA, gB].every((g) => g.length >= 5 && g.length <= 6 && g.filter((z) => z.typeKey === 'brute').length === 1 && g.filter((z) => z.typeKey !== 'brute').every((z) => z.typeKey === 'shambler')), 'each 5-6 guards with one brute (' + [gA, gB].map((g) => g.map((z) => z.typeKey[0]).join('')).join(' | ') + ')');
    if (b.length === 2) {
      const ax = b[0].x + 12, az = b[0].z;
      T.player.position.set(ax, T.sampleHeight(ax, az), az);
      const wokeA = await until(() => gA.every((z) => z.poiAwake), 3000);
      ok(wokeA && gB.every((z) => !z.poiAwake), 'within 18 m of one post only that post wakes (A ' + gA.filter((z) => z.poiAwake).length + '/' + gA.length + ', B ' + gB.filter((z) => z.poiAwake).length + '/' + gB.length + ')');
      // The alarm with both open, one post awake and on him: both end, every guard goes, no reward.
      home();
      const bagA = { ...T.getSkullBag() }, e0 = of('bounty-expired').length, dn0 = of('bounty-done').length, pc0 = of('poi-cleared').length;
      const al0 = of('alarm-started').length;
      T.hqStartWave();
      await until(() => of('alarm-started').length > al0, 2000);
      await wait(50);
      const exp = of('bounty-expired').slice(e0);
      ok(exp.length === 2 && exp.every((e) => e.reason === 'alarm' && e.reward === 150) && b.every((x) => exp.some((e) => e.kind === x.kind && e.index === x.index)), 'the alarm ends both: two bounty-expired {kind, index, reward, reason: alarm} (' + exp.length + ')');
      ok(guardsOf(b[0]).length === 0 && guardsOf(b[1]).length === 0 && T.zombies.filter((z) => z.alive && z.poiGuard).length === 0, 'their guards go, awake or asleep (' + T.zombies.filter((z) => z.alive && z.poiGuard).length + ' left)');
      ok(of('bounty-done').length === dn0 && of('poi-cleared').length === pc0 && T.getSkullBag().value === bagA.value, 'no reward and no clear for an ended bounty');
      ok(T.getBounties().every((x) => x.state === 'expired'), 'the board snapshot says expired');
      const inWave = await until(() => T.getPhase() === 'wave', 25000);
      await wait(200);
      const wp = T.getWavePreview();
      ok(inWave && wp && T.getWaveDirectorState().waveTotal === wp.total, 'the wave is the plan\'s own total (' + T.getWaveDirectorState().waveTotal + ' of ' + (wp && wp.total) + ')');
    }

    // Night 14: 300, 6-8 guards with a brute or a demon.
    b = await prep(13);
    const g14 = b.map(guardsOf);
    ok(b.length === 2 && b.every((x) => x.reward === 300) && g14.every((g) => g.length >= 6 && g.length <= 8 && g.filter((z) => z.typeKey !== 'shambler').length === 1 && g.some((z) => z.typeKey === 'brute' || z.typeKey === 'demon')), 'night 14: 300 each, 6-8 guards with a brute or a demon (' + g14.map((g) => g.map((z) => z.typeKey[0]).join('')).join(' | ') + ')');

    // Next Night straight away (the alarm under way before prep has placed anything): nothing is posted.
    await seqDone();
    T.clearZombies(); home();
    const n0 = of('bounty-posted').length;
    T.setDay(4); T.startPrep(); T.hqStartWave();
    await wait(1500);
    ok(of('bounty-posted').length === n0 && T.getBounties().length === 0 && T.zombies.filter((z) => z.alive && z.poiGuard).length === 0, 'the alarm straight after prep: no bounty is posted (' + (of('bounty-posted').length - n0) + ')');
    ok(errs.length === 0, 'no page errors (' + errs.slice(0, 2).join(' | ').slice(0, 160) + ')');
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  return out.join('\n');
})()
