// t170 - GB-108 (P-139): the stir. Below, in the iron warren with its dead put down: his shots fill the meter (the
// rifle 3.5 a shot, the pistol by its smaller radius); full, ten seconds of warning; in a bolt-hole's circle he is out
// at the mouth and the Hush is spent for the day; caught in the open, the run's kick-free (E, as topside) leaves him
// below with 50 HP less, no bag and the meter at 50; caught again, the cave death ends the run as 'caveguard'.
// A flat Hush makes it climb on its own.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const events = []; window.addEventListener('dw-game', (e) => { const d = e.detail || {}; if (d.type === 'hollow-stir' || d.type === 'guardian-kick-free' || d.type === 'hollow' || d.type === 'cave-guardian') events.push(d); });
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };
  try {
    await startMatch(T, 'Stir');
    const w0 = Date.now();
    while (T.marine.getObjectByName('insertion-harness') && Date.now() - w0 < 90000) await wait(100);
    T.clearZombies(); T.skipGrace && T.skipGrace();
    const S = T.stirDbg, D = T.belowDbg;
    ok(!!S && !!D, 'the debug handles are there');
    const down = () => {
      const b = T.enterHollow({ theme: 'iron', cave: 0 });
      for (const z of T.zombies.filter((q) => q.below)) T.killZombie(z, false);   // quiet: his own noise only
      for (const n of D.fight().nests) n.timer = 1e9;
      return b;
    };
    const p = T.player.position;
    const stand = (b, x, z) => p.set(x, b.groundAt(x, z), z);
    // an open spot in a chamber of the Galleries: not the Deep (the mine crew would come), not a bolt-hole, not the mouth
    const openSpot = (b) => {
      const g = b.group.position, nav = D.nav();
      const open = (x, z) => { const a = Math.floor((x - nav.ox) / nav.cell), c = Math.floor((z - nav.oz) / nav.cell); return a >= 0 && c >= 0 && a < nav.w && c < nav.h && !!nav.walkable[c * nav.w + a]; };
      for (const c of b.cells) {
        if (c.kind !== 'chamber' || c.depth !== 1 || c.id === b.plan.mouthCell) continue;
        const x = g.x + c.i * 6 + 3, z = g.z + c.j * 6 + 3;
        if (open(x, z) && b.exits.boltHoles.every((h) => Math.hypot(h.x - x, h.z - z) > (h.r || 1.5) + 1)) return { x, z };
      }
      return null;
    };
    let b = down();
    let o = openSpot(b);
    ok(!!o, 'an open spot in the Galleries');
    stand(b, o.x, o.z);
    await wait(200);
    ok(S.state().stir === 0 && S.state().phase === 'calm', 'down, the meter starts at 0');
    D.heard('m4'); await wait(150);
    const one = S.state().stir;
    ok(Math.abs(one - 3.5) < 0.15, 'one rifle shot: 3.5 (' + one + ')');
    D.heard('pistol'); await wait(150);
    ok(Math.abs(S.state().stir - one - 3.5 * 35 / 45) < 0.15, 'a pistol shot: 3.5 x 35/45 (' + (S.state().stir - one).toFixed(2) + ')');
    // (1) fill it with rifle shots; ten seconds of warning, then out through a bolt-hole.
    for (let i = 0; i < 30 && S.state().phase === 'calm'; i++) { D.heard('m4'); await wait(120); stand(b, o.x, o.z); }
    ok(S.state().phase === 'warning' && events.some((e) => e.type === 'hollow-stir' && e.phase === 'warning'), 'about 30 rifle shots close together fill it: the warning (' + S.state().left + ' s)');
    const tw = Date.now();
    const bolt = b.exits.boltHoles[b.exits.boltHoles.length - 1];
    stand(b, bolt.x, bolt.z);
    ok(S.safe() === 'bolt', 'in the bolt-hole\'s circle he is safe');
    const outAt = await until(() => !T.hollowState().below, 13000);
    const waited = (Date.now() - tw) / 1000;
    ok(outAt && waited > 8.5 && waited < 12, 'after the ten seconds he is out at the mouth, not grabbed (' + waited.toFixed(1) + ' s)');
    ok(events.some((e) => e.type === 'hollow-stir' && e.phase === 'out') && events.some((e) => e.type === 'hollow' && e.phase === 'leave' && e.how === 'bolt'), "the stir's 'out', and the leave by the bolt-hole");
    ok(T.getHushState().charged === false && !T.getHushState().below, 'and the Hush is spent for the day');
    // (2) caught in the open, the run's kick-free: E as topside.
    T.setHp(100);
    b = down(); o = openSpot(b); stand(b, o.x, o.z);
    for (let i = 0; i < 40 && S.state().phase === 'calm'; i++) { D.heard('m4'); await wait(100); stand(b, o.x, o.z); }
    const caught = await until(() => !!S.grab(), 12500);
    ok(caught && T.hollowState().below, 'in the open, the guardian comes through the rock and takes hold');
    const g = S.grab();
    ok(!!g && !!g.g && g.g.typeKey === 'guardian' && Math.hypot(g.g.mesh.position.x - p.x, g.g.mesh.position.z - p.z) < 6.5, 'its body is there, out of the nearest rock (' + (g && g.g ? Math.hypot(g.g.mesh.position.x - p.x, g.g.mesh.position.z - p.z).toFixed(1) : '-') + ' m)');
    ok(g && g.can && g.need === 5 && events.some((e) => e.type === 'cave-guardian' && e.phase === 'escape' && e.state === 'open' && e.below), 'the kick-free is open: 5 presses (the UI\'s "Kick free! (E)")');
    for (let i = 0; i < 5; i++) { document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', key: 'e', bubbles: true })); await wait(60); }
    ok(!S.grab() && T.hollowState().below && T.getHp() === 50, 'five E presses: free, still below, 50 HP less (' + T.getHp() + ')');
    ok((T.getSkullBag().count | 0) === 0 && Math.abs(S.state().stir - 50) < 1.5 && S.state().phase === 'calm', 'no bag, and the meter at 50 (' + S.state().stir + ')');
    ok(events.some((e) => e.type === 'guardian-kick-free' && e.below), 'the kick-free event goes out');
    // A flat Hush: the quiet no longer settles it, and it climbs 1.5 a second on its own.
    S.drain();
    const f0 = S.state().stir; await wait(2000); stand(b, o.x, o.z);
    const climbed = S.state().stir - f0;
    ok(climbed > 2.2 && climbed < 4.2, 'the Hush flat: it climbs on its own (' + climbed.toFixed(1) + ' in 2 s)');
    // (3) caught again: no kick-free left, the cave death.
    for (let i = 0; i < 40 && S.state().phase === 'calm'; i++) { D.heard('m4'); await wait(100); stand(b, o.x, o.z); }
    const again = await until(() => !!S.grab(), 12500);
    ok(again && S.grab() && !S.grab().can, 'caught a second time, there is no kick-free left');
    for (let i = 0; i < 6; i++) { document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', key: 'e', bubbles: true })); await wait(60); }
    ok(!!S.grab(), 'and E does nothing');
    const dead = await until(() => T.hushDbg.over(), 6000);
    ok(dead && T.getDeathCause() === 'caveguard' && !T.hollowState().below, 'it takes him: the run ends as caveguard (' + T.getDeathCause() + ')');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
