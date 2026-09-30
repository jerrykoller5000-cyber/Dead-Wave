// t105 - GB-78 (P-32, D-46): the run's first guardian catch can be kicked free. Five E presses while it
// hauls him and he's loose: no scripted kill, no game over, HP down 50 (at least 1 left), the unbanked
// skulls gone, and 'cave-guardian' phase 'escape' plus 'guardian-kick-free' published. Space doesn't
// count. GB-112: a second catch in the same run can be kicked free too, but it takes 8 presses; six
// aren't enough, and Space still skips to the death (caveguard).
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (cond, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (cond()) return true; await wait(40); } return cond(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const ev = []; window.addEventListener('dw-game', ({ detail }) => { if (detail && (detail.type === 'guardian-kick-free' || (detail.type === 'cave-guardian' && detail.phase === 'escape'))) ev.push(detail); });
  const key = (code) => document.dispatchEvent(new KeyboardEvent('keydown', { code, key: code === 'KeyE' ? 'e' : ' ', bubbles: true }));
  try {
    await startMatch(T, 'KickFree');
    T.clearZombies && T.clearZombies();
    T.skipGrace && T.skipGrace();
    await until(() => T.caveGrabReady(), 15000);
    const onAxis = (c, d) => ({ x: c.x + Math.sin(c.yaw) * d, z: c.z + Math.cos(c.yaw) * d });
    const placeFront = (c, d) => { const p = onAxis(c, d); T.player.position.set(p.x, T.sampleHeight(p.x, p.z), p.z); };
    let diag = '';
    const catchAt = async (ci, warnFirst) => {
      const c = T.POI.caves[ci];
      placeFront(c, 12); await wait(100);
      const p1 = T.noteCaveMouthHit(ci);
      let p2 = null;
      if (warnFirst) {
        await until(() => { const st = T.getCavePokeState(), w = st.warning; return !!w && w.age > Math.max(st.grace || 0, st.eyesFor || 0) + 0.1; }, 15000);
        placeFront(c, 12); await wait(50); p2 = T.noteCaveMouthHit(ci);
      }
      const got = await until(() => { const s = T.getScriptedKill(); return !!s && s.drag && s.dragT > 0.6; }, 45000);
      if (!got) diag = ' [pokes ' + p1 + '/' + p2 + ' chase ' + JSON.stringify(T.getCaveChase() && { t: T.getCaveChase().t, x: T.getCaveChase().x }) + ' sk ' + JSON.stringify(T.getScriptedKill() && { kind: T.getScriptedKill().kind, drag: T.getScriptedKill().drag, dragT: T.getScriptedKill().dragT }) + ' state ' + JSON.stringify(T.getCavePokeState()).slice(0, 200) + ']';
      return T.getScriptedKill();
    };
    T.setHp(80);
    // Skulls in the bag, not banked.
    const bag = T.getSkullBag(); bag.count = 7; bag.value = 42;
    const sk = await catchAt(0, true);
    ok(!!sk && sk.kind === 'cave' && sk.drag && !sk.dragDone, 'the chase catches him and hauls him (' + (sk ? 'scene ' + !!sk.scene : 'no catch') + ')' + diag);
    if (!sk) throw new Error('no catch' + diag);
    ok(ev.some((e) => e.type === 'cave-guardian' && e.state === 'open' && e.need === 5), 'the haul says it can be kicked free (escape, open, need 5)');
    key('KeyE'); key('KeyE'); key('KeyE'); key('KeyE');
    ok(T.getScriptedKill() === sk && sk.kicks === 4, 'four presses: still hauled (' + (sk && sk.kicks) + ' kicks)');
    ok(ev.filter((e) => e.state === 'press').length === 4 && ev.filter((e) => e.state === 'press').pop().presses === 4, 'each press is published (4/5)');
    key('KeyE');
    await wait(100);
    const hp = T.getHp();
    ok(!T.getScriptedKill() && hp > 0 && !T.getCine(), 'the fifth press: free, no scripted kill, not game over');
    ok(hp >= 29.9 && hp <= 31.5, 'it cost 50 HP (80 -> ' + hp.toFixed(1) + '; the 40% regen may have ticked since)');
    ok(T.getSkullBag().count === 0 && T.getSkullBag().value === 0, 'the unbanked skulls are gone (bag ' + T.getSkullBag().count + ')');
    const kf = ev.find((e) => e.type === 'guardian-kick-free');
    ok(!!kf && kf.lostCount === 7 && kf.lostValue === 42 && typeof kf.receiptId === 'string' && ev.some((e) => e.type === 'cave-guardian' && e.state === 'free'), 'escape published: kick-free with a receipt, lost 7 skulls ($42)');
    ok(!document.body.classList.contains('cine') && T.weaponMeshes.pistol.parent.visible, 'the cine bars are gone and he has his gun back');
    const c0 = T.POI.caves[0];
    const lz = (T.player.position.x - c0.x) * Math.sin(c0.yaw) + (T.player.position.z - c0.z) * Math.cos(c0.yaw);
    ok(lz >= 1.9, 'he stands outside the lip (' + lz.toFixed(2) + ' m out)');

    // The second catch of the run (GB-112): it opens again at 8 presses; six aren't enough, and Space kills.
    await wait(300);
    T.setHp(20);
    const n0 = ev.length;
    const sk2 = await catchAt(1, false);
    ok(!!sk2 && sk2.drag, 'a second catch in the same run');
    for (let i = 0; i < 6; i++) key('KeyE');
    ok(ev.slice(n0).some((e) => e.type === 'cave-guardian' && e.state === 'open' && e.need === 8), 'the second catch can be kicked free again, at 8 presses (GB-112)');
    ok(T.getScriptedKill() === sk2 && sk2.kicks === 6 && ev.slice(n0).every((e) => e.type !== 'guardian-kick-free'), 'six presses are not enough the second time (' + (sk2 && sk2.kicks) + '/8)');
    key('Space');
    await wait(200);
    ok(T.getHp() === 0 && !!T.getCine() && T.getDeathCause() === 'caveguard', 'Space skips to the death, as before: ' + T.getDeathCause());
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message || e));
  }
  return out.join('\n');
})()
