// t267 - GB-197 (D-82, docs/specs/day-missions.md section 5): the fuel depot, carry it home. Hold E at the depot's pump
// fills a jerrycan; carried, he is slowed (0.62, as with the mortar) and cannot fire; only fire or acid sets it off;
// it leaks a trail and the smell calls the dead; E puts it down and picks it up; E at the HQ's generator pours it and
// the depot's own claim pays. The site stays locked until then.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(40); } return !!f(); };
  const key = (type) => document.dispatchEvent(new KeyboardEvent(type, { code: 'KeyE', key: 'e', bubbles: true }));
  const tap = async () => { key('keydown'); await wait(80); key('keyup'); await wait(120); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String((e.error && e.error.stack) || e.message).slice(0, 400)));
  const F = T.fuelDbg, R = () => F.run(), P = T.player.position;
  const heard = []; window.addEventListener('dw-ui', (e) => { if (e.detail && e.detail.type === 'fuel-depot') heard.push(e.detail.kind); });
  try {
    await startMatch(T, 'FuelDepot');
    T.clearZombies(); T.setHp(100000); T.runDevCommand('godmode');
    T.runDevCommand('site fuel');
    await until(() => !!F.props(), 4000);
    const pr = F.props();
    ok(!!pr && R().phase === 'at-pump', 'the pump and the can are at the depot (' + R().phase + ')');
    ok(F.reach() && F.reach().blockedBy === 'locked', 'the depot is locked until the fuel is home (' + (F.reach() && F.reach().blockedBy) + ')');
    await wait(150);
    ok(/fill/i.test(F.prompt() || ''), 'at the pump: "' + F.prompt() + '"');
    // GB-199: the gun's visibility is set in the marine's pose pass; where the page does not run it (the test page's
    // three stand-in leaves the gun hidden from the start), the hide is checked by realtest t267 instead.
    const gunDriven = F.gunShown() === true;
    if (!gunDriven) out.push('INFO the gun is not shown before the can on this page (pose pass not run): gun checks left to realtest t267');
    // Hold E: it fills over 3 s; a short hold does not.
    key('keydown'); await wait(700); key('keyup'); await wait(100);
    ok(R().phase === 'at-pump' && R().fill > 0.3 && R().fill < 3, 'a short hold puts some in (' + R().fill.toFixed(2) + ' s of 3)');
    key('keydown'); const full = await until(() => R().phase === 'carried', 15000); key('keyup'); await wait(100);
    ok(full, 'held on, the can fills and he takes it (' + R().phase + ')');
    ok(F.slow() === 0.62 && F.fireBlocked(), 'carried: slowed to 0.62 and hands full (no firing)');
    if (gunDriven) await until(() => F.gunShown() === false, 3000); if (gunDriven) ok(F.gunShown() === false, 'GB-199: his gun is put away while he carries the can');
    // Only fire and acid set it off.
    T.damagePlayer(1, 'shambler'); T.damagePlayer(1, 'bullet'); await wait(250);
    ok(R().phase === 'carried', 'a bite or a stray round does nothing (' + R().phase + ')');
    T.damagePlayer(1, 'acid'); await wait(250);
    ok(R().phase === 'at-pump' && R().booms === 1 && R().fill === 0, "a spitter's acid sets it off; a fresh can waits at the pump (" + R().phase + ', booms ' + R().booms + ')');
    await until(() => F.pools() === 0, 30000);   // the blast leaves a burning pool (5 s): a new can carried through it would go up too
    // A burning body against the can sets it off too.
    T.runDevCommand('site fuel carry'); await wait(200);
    ok(R().phase === 'carried', "'site fuel carry': filled (" + R().phase + ', booms ' + R().booms + ', last ' + F.lastBoom() + ')');
    T.clearZombies();
    const zb = T.spawnZombie(P.x + 0.6, P.z + 0.3, 'shambler', true, true);
    if (zb) T.igniteZombie(zb, 4);
    await until(() => R().phase !== 'carried', 2000);
    ok(R().phase === 'at-pump' && R().booms === 1 && /^(burning|fire)$/.test(F.lastBoom()), 'a burning zombie against him sets it off (' + R().phase + ', ' + F.lastBoom() + ')');
    T.clearZombies(); await until(() => F.pools() === 0, 30000);
    // The leak and the smell.
    T.runDevCommand('site fuel carry'); await wait(200);
    const d0 = F.drips(), x0 = P.x;
    for (let i = 0; i < 20; i++) { P.x = x0 + i * 0.6; await wait(50); }
    ok(F.drips() - d0 >= 4, 'it leaks: ' + (F.drips() - d0) + ' drips over 12 m');
    T.clearZombies();
    const ev = F.carry(15, 0); await wait(100);
    const called = T.zombies.filter((z) => z.alive && z.fuelCalled).length;
    ok(ev.some((e) => e.kind === 'smell-call') && called >= 1, 'the smell calls the dead: ' + called + ' came');
    T.clearZombies();
    // Down and up again; dropping never sets it off.
    const b0 = R().booms; await tap();
    ok(R().phase === 'down' && R().booms === b0, 'E puts it down, and it does not go up (' + R().phase + ')');
    ok(F.slow() === 1 && !F.fireBlocked(), 'down: full speed, hands free');
    if (gunDriven) await until(() => F.gunShown() === true, 3000); if (gunDriven) ok(F.gunShown() === true, 'GB-199: down, the gun is back in his hand');
    const cp = F.can(); P.set(cp.x + 0.8, P.y, cp.z); await wait(150);
    ok(/pick/i.test(F.prompt() || ''), 'by the can: "' + F.prompt() + '"');
    await tap();
    ok(R().phase === 'carried', 'E picks it up (' + R().phase + ')');
    // Home: E at the generator pours it, and the depot pays.
    T.runDevCommand('site fuel hq'); await wait(200);
    const g = F.props().gen; P.set(g.x + 1.4, T.sampleHeight(g.x + 1.4, g.z) + 0.05, g.z); await wait(200);
    ok(/pour/i.test(F.prompt() || ''), 'at the generator: "' + F.prompt() + '"');
    await tap(); await wait(400);
    ok(R().done && R().phase === 'poured', 'E pours it into the generator (' + R().phase + ')');
    await until(() => F.site() === 'claimed' || F.site() === 'ready-to-claim', 3000);
    ok(F.site() === 'claimed' || F.site() === 'ready-to-claim', "the depot's claim pays its fuel (" + F.site() + ', ' + JSON.stringify(F.reach()) + ')');
    ok(F.reach() && F.reach().blockedBy !== 'locked', 'the depot is unlocked (' + (F.reach() && F.reach().blockedBy) + ')');
    const b1 = R().booms; T.damagePlayer(1, 'fire'); ok(R().done && R().booms === b1, 'poured, nothing more can go up');
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ').replace(/\n/g, ' <- ') : ''));
  } catch (e) { ok(false, 'threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})();