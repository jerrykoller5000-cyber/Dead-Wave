// t302 - CL-259 (Jerry's N30: "The Hollows are completely broken ... the camera freaks out and clips rapidly in and out
// of the ground, nothing of the Hollows is seen, and the player pops back up through the ground when walking around";
// "How you get the Hush isn't specified"). Below, the ground off a warren's floor is where he last stood, never the
// valley's 400 m up; the rock stops him and he slides along it; the third-person camera stays in the warren's open.
// The Hush: the relay vault's first lift carries the spare board, E at the HQ's radio set wires it, and it's his from
// the next dawn; before it a cave mouth says there's no way down yet.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'Hollows');
    T.clearZombies(); T.runDevCommand('godmode');
    const P = T.player.position, W = T.warrenDbg, D = () => T.hushDbg;
    if (!W) { ok(false, 'the warren hooks are there'); return out.join('\n'); }
    const built = T.enterHollow({ theme: 'iron', cave: 0 });
    ok(!!built, 'down into the iron warren');
    const e = built.entry, floor = built.groundAt(e.x, e.z);
    // The ground in the rock: where he stood, not the valley.
    const rockX = e.x - 9;   // west of the mouth: rock
    ok(built.groundAt(rockX, e.z) == null, 'west of the mouth is rock (no cell)');
    ok(Math.abs(T.sampleHeight(rockX, e.z) - floor) < 0.01, 'the ground in the rock is his last floor (' + T.sampleHeight(rockX, e.z).toFixed(2) + ', floor ' + floor.toFixed(2) + '), not the valley 400 m up');
    // Walked into the rock: kept on the floor.
    P.set(e.x, floor, e.z); await wait(200);
    P.set(e.x - 2.9, floor, e.z + 0.5);   // into the mouth's west wall
    { const s0 = T.getSimTime(); while (T.getSimTime() - s0 < 0.5) await wait(40); }
    ok(built.groundAt(P.x, P.z) != null && Math.abs(P.y - floor) < 0.6, 'walked into the rock, he is back on the floor (' + P.x.toFixed(2) + ', ' + P.y.toFixed(2) + ', ' + P.z.toFixed(2) + ')');
    P.set(e.x, floor, e.z - 30);   // far out past every cell (south of the mouth)
    { const s0 = T.getSimTime(); while (T.getSimTime() - s0 < 0.5) await wait(40); }
    ok(P.y < floor + 2 && built.groundAt(P.x, P.z) != null, 'thrown out past every cell, he is put back on the floor, not popped up (' + P.y.toFixed(1) + ')');
    // The camera's open: in the tunnel, yes; in the rock or above the roof, no.
    const roof = W().roof(e.x, e.z);
    ok(W().open(e.x, floor + 1.6, e.z) === true, 'the mouth at eye height is open');
    ok(W().open(rockX, floor + 1.6, e.z) === false && W().open(e.x, roof + 0.5, e.z) === false, 'the rock and over the roof are not');
    // The third-person camera itself, settled at the mouth: under the roof, in the open, behind him.
    if (T.setViewFirstDbg) T.setViewFirstDbg(false);
    P.set(e.x, floor, e.z); { const s0 = T.getSimTime(); while (T.getSimTime() - s0 < 1.2) await wait(40); }
    { const c = T.camera.position;
      ok(W().open(c.x, c.y, c.z) === true && c.y < roof && Math.hypot(c.x - P.x, c.z - P.z) > 0.3, 'the third-person camera is in the warren, under the roof (' + c.x.toFixed(1) + ', ' + c.y.toFixed(1) + ', ' + c.z.toFixed(1) + '; roof ' + roof.toFixed(1) + ')'); }
    T.leaveHollow('mouth');
    ok(!T.hollowState().below, 'up again');
    // The Hush.
    T.setRelayUpDbg(null);
    T.setDay(1); T.startPrep(); await wait(200);
    ok(D().board() === 'none' && !T.getHushState().owned, 'no board: no Hush');
    const m = D().mouths().filter(Boolean).find((q) => q.theme !== 'chalk');
    P.set(m.x + Math.sin(m.yaw || 0) * 3, m.gy != null ? m.gy : P.y, m.z + Math.cos(m.yaw || 0) * 3); await wait(250);
    const pr = D().prompt();
    ok(pr && pr.key === 'hush.none' && !pr.act, 'a mouth with no Hush: no way down yet (' + (pr && pr.key) + ')');
    T.applyVaultReward({ tier: 0, label: 'Footlocker', items: [{ kind: 'cash', amount: 1 }] });
    ok(D().board() === 'carried', 'the vault\'s first lift carries the spare board (' + D().board() + ')');
    T.applyVaultReward({ tier: 0, label: 'Footlocker', items: [{ kind: 'cash', amount: 1 }] });
    ok(D().board() === 'carried', 'and only the first');
    ok(D().wire() === true && D().board() === 'wired', 'wired at the radio set');
    ok(!T.getHushState().owned, 'not his until the dawn');
    T.setDay(2); T.startPrep(); await wait(200);
    ok(T.getHushState().owned && T.getHushState().charged, 'the next dawn: the Hush, charged');
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
