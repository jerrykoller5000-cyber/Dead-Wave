// t171 - GB-92 (P-97): the secret's fight. On a silenced day the rune door of a cleared warren opens (E) into the
// heart (CL-112): the guardian on its rig walks at him; the door is shut ("It's warm. It's singing.") on an ordinary
// day and "open. Somewhere." on a silenced day in a warren not cleared. Its health (the model's) takes his hits: at
// two-thirds the second phase, at a third the last, and a column comes down; the dead come up out of the source; a
// lunge that reaches him is the run's kick-free (E x5). The Hush flat: the source roars and it can't be hurt. Back up
// the tunnel he is at his warren's rune door; the next go is a fresh fight. Killed: every dead drops, he is up at the
// mouth and the run is won by the true ending.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const events = []; window.addEventListener('dw-game', (e) => { const d = e.detail || {}; if (['heart', 'quest', 'quest-door', 'guardian-kick-free', 'cave-guardian', 'hollow'].includes(d.type)) events.push(d); });
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };
  const has = (type, f) => events.some((e) => e.type === type && (!f || f(e)));
  try {
    await startMatch(T, 'Heart');
    const w0 = Date.now();
    while (T.marine.getObjectByName('insertion-harness') && Date.now() - w0 < 90000) await wait(100);
    T.clearZombies(); T.skipGrace && T.skipGrace();
    const H = T.heartDbg, D = T.belowDbg;
    ok(!!H && !!D && H.HP === 3400, 'the debug handle is there; the guardian has 3400 here (' + (H && H.HP) + ')');
    const p = T.player.position;
    // three dead topside, frozen while he is below: the ending drops them
    const top = [];
    for (let k = 0; k < 3; k++) { const z = T.spawnZombie(p.x + 18 + k * 2, p.z + 6, 'shambler', true, true); if (z) top.push(z); }
    const b = T.enterHollow({ theme: 'iron', cave: 0 });
    for (const z of T.zombies.filter((q) => q.below)) T.killZombie(z, false);
    for (const n of D.fight().nests) n.timer = 1e9;
    const d = b.doors.rune, sb = b.points.strongbox;
    // at the door, on the side away from the strongbox where we can
    const ux = d.x - sb.x, uz = d.z - sb.z, ul = Math.hypot(ux, uz) || 1;
    let at = null;
    for (const r of [0.6, 0, 1.2, -0.6, -1.2]) { const x = d.x + (ux / ul) * r, z = d.z + (uz / ul) * r; p.set(x, b.groundAt(x, z) != null ? b.groundAt(x, z) : d.y, z); if (H.near()) { at = { x, z }; break; } }
    ok(!!at, 'he can stand at the rune door with E on it (not the strongbox\'s)');
    T.setPitSilenced(false);
    ok(H.door() === 'shut' && H.press() && !H.built() && has('quest-door', (e) => e.state === 'shut'), 'an ordinary day: shut ("It\'s warm. It\'s singing.")');
    T.setPitSilenced(true);
    ok(H.door() === 'elsewhere' && H.press() && !H.built() && has('quest-door', (e) => e.state === 'elsewhere'), 'silenced, the warren not cleared: "It\'s open. Somewhere."');
    H.markCleared();
    ok(H.door() === 'open', 'cleared and silenced: open');
    document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', key: 'e', bubbles: true }));
    await wait(100);
    const hb = H.built();
    ok(!!hb && T.hollowState().below && p.y < -400, 'E at the open door: he is in the heart (y ' + p.y.toFixed(0) + ')');
    let g = H.guardian();
    ok(!!g && g.alive && g.typeKey === 'guardian' && !!g.bossRig, 'the guardian is there, on its rig');
    ok(has('heart', (e) => e.phase === 'enter') && has('quest', (e) => e.kind === 'heart' && e.entered && e.phase === 1 && e.guardianHp === 3400), "'heart' enter and the quest's heart { entered, phase 1, 3400 }");
    // It walks at him.
    const gd = () => Math.hypot(g.mesh.position.x - p.x, g.mesh.position.z - p.z);
    const d0 = gd(); await wait(1500);
    ok(gd() < d0 - 2, 'it comes at him (' + d0.toFixed(1) + ' -> ' + gd().toFixed(1) + ' m)');
    // Its health takes his hits: two-thirds, the second phase.
    g.hp -= 1200; await wait(150);
    ok(H.fight().read().hp === 2200 && H.fight().read().phase === 2 && g.alive && has('heart', (e) => e.phase === 'phase' && e.fightPhase === 2), '1200 damage: 2200 left, the second phase, its body untouched (' + H.fight().read().hp + ')');
    ok(Math.abs(H.fight().read().reach - 4.2) < 1e-6, 'its reach grows: 4.2 m');
    // The dead out of the source.
    const home = () => { const gp = hb.points.guardian; g.mesh.position.x = gp.x; g.mesh.position.z = gp.z; };   // kept off him while we watch the source
    const called = await until(() => { home(); return T.zombies.some((z) => z.heartCalled && z.alive); }, 9000);
    ok(called, 'the dead come up out of the source (' + T.zombies.filter((z) => z.heartCalled && z.alive).length + ')');
    // The last phase: a column comes down.
    g.hp -= 1200; await wait(150);
    ok(H.fight().read().phase === 3, 'a third: the last phase');
    const fell = await until(() => { home(); return hb.columns.some((c) => c.down); }, 4000);
    ok(fell && has('heart', (e) => e.phase === 'column'), 'a white column comes down');
    // A lunge that reaches him: the kick-free.
    T.setHp(100);
    for (const z of T.zombies.filter((q) => q.heartCalled)) T.killZombie(z, false);
    const caught = await until(() => { if (!H.grab()) { const q = g.mesh.position; const x = q.x + 1.6, z = q.z; if (hb.groundAt(x, z) != null) p.set(x, hb.groundAt(x, z), z); } return !!H.grab(); }, 8000);
    ok(caught && H.grab().can && H.grab().need === 5 && has('cave-guardian', (e) => e.heart && e.state === 'open'), 'its lunge takes hold: the kick-free is open, 5 presses');
    for (let i = 0; i < 5; i++) { document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', key: 'e', bubbles: true })); await wait(60); }
    ok(!H.grab() && T.getHp() === 50 && has('guardian-kick-free', (e) => e.heart), 'five E presses: free, 50 HP less (' + T.getHp() + ')');
    // The Hush flat: the source roars and it can't be hurt.
    T.stirDbg.drain(); await wait(150);
    const h0 = H.fight().read().hp; g.hp -= 500; await wait(150);
    ok(has('heart', (e) => e.phase === 'flat') && H.fight().read().hp === h0, 'the Hush flat: it cannot be hurt (' + H.fight().read().hp + ')');
    // Back up the tunnel: his warren, at the rune door; the next go is a fresh fight.
    const back = hb.exits.back; p.set(back.x, back.y, back.z); await wait(250);   // (he has walked off the tunnel's top since he came in)
    ok(!H.built() && T.hollowState().below && !!D.fight() && Math.hypot(p.x - d.x, p.z - d.z) < 4, 'up the tunnel he is back in his warren by the rune door');
    ok(!T.zombies.some((z) => z.heartGuardian || z.heartCalled), 'the heart\'s guardian and its dead are gone');
    H.hushBattery();   // a new day's charge (the test's shortcut)
    H.enter(); await wait(100);
    g = H.guardian();
    ok(!!H.built() && H.fight().read().hp === 3400 && H.fight().read().phase === 1, 'in again: it has healed, a fresh fight');
    // Killed: every dead drops, up at the mouth, the true ending.
    g.hp -= 4000;
    const over = await until(() => !T.hollowState().below, 5000);
    ok(over && has('heart', (e) => e.phase === 'dead') && has('quest', (e) => e.kind === 'ending'), "it dies: 'heart' dead, then he is up and the quest's ending goes out");
    ok(top.length === 3 && top.every((z) => !z.alive), 'the dead topside dropped where they stood');
    ok(await until(() => T.boardingDbg().won, 3000), 'the run is won');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
