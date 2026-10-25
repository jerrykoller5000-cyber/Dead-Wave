// t162 - CL-92 (P-122, D-63): lightning in storms. A shower brings five strikes. With the odds forced: a strike on
// the marine takes 70 (100 HP leaves 30; at 60 HP it ends the run as 'lightning'); under godmode, nothing; in the
// insulated boots, nothing, and his boots turn yellow. A strike into a tree sets it burning; a strike among the dead
// kills those round it. CL-178: the boots are on the feet of a skeleton on a platform high up the radio mast; he takes
// them by reaching them (from the ground he can't); CL-264: and yanking them off with E. Up the mast a strike kills him outright, unless he has the boots.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'Lightning');
    T.clearZombies(); T.skipGrace && T.skipGrace();
    const L = T.lightningDbg, S = L.state();
    // Five strikes a storm, natural odds.
    L.odds({ tree: 0, dead: 0, marine: 0 });
    T.runDevCommand('shower'); L.update(0);
    const n0 = S.strikes.length;
    ok(S.queue.length === 5, 'a shower brings ' + S.queue.length + ' strikes');
    for (let i = 0; i < 100 && S.queue.length; i++) L.update(1);
    ok(S.strikes.length - n0 === 5 && S.strikes.slice(n0).every((r) => r.target === 'open'), 'all five fall, off in the trees (' + (S.strikes.length - n0) + ')');
    ok(!!T.scene.getObjectByName('lightning-bolt'), 'the bolt is drawn');
    // On the marine.
    T.setArmor(0); T.setHp(100);
    const r1 = L.strike('marine');
    ok(r1.target === 'marine' && T.getHp() === 30, 'a strike on him at 100 HP leaves ' + T.getHp());
    T.setHp(100); T.runDevCommand('godmode');
    L.strike('marine');
    ok(T.getHp() === 100, 'under godmode: nothing (' + T.getHp() + ')');
    T.runDevCommand('godmode off');
    // The boots.
    const boots = L.boots();
    ok(!!boots && boots.visible && boots.name === 'insulated-boots', 'the boots wait by the mast');
    const mast = T.POI.mast;
    ok(!!mast && Math.hypot(boots.position.x - mast.x, boots.position.z - mast.z) < 3.2, 'at the mast (' + Math.hypot(boots.position.x - mast.x, boots.position.z - mast.z).toFixed(1) + ' m)');
    ok(boots.position.y - mast.gy > 10 && !!L.mast().perch, 'high up it, on the skeleton (' + (boots.position.y - mast.gy).toFixed(1) + ' m)');
    T.player.position.set(boots.position.x, mast.gy + 0.2, boots.position.z);
    L.update(0.016);
    ok(!L.worn() && boots.visible, 'from the ground under them, out of reach');
    T.player.position.set(boots.position.x, boots.position.y, boots.position.z);
    L.update(0.016);
    // CL-264 (Jerry's N16): within reach he yanks them off with E, a pull at a time (t294 has the rest).
    ok(!L.worn() && L.yankState().inReach, 'within reach: they are still on him until he yanks');
    for (let i = 0; i < 9 && !L.worn(); i++) { L.yank(); L.update(0.3); }
    ok(L.worn() && !boots.visible, 'yanked off, he wears them');
    const w = L.marine() ? L.marine().userData.wardrobe : null;
    const yellow = !w || w.boots.mats.filter((m) => m.userData.dress === 'colour').every((m) => m.color.getHex() === L.BOOTS_HEX);
    ok(yellow, 'his boots are yellow rubber now');
    T.setHp(100);
    const r2 = L.strike('marine');
    ok(r2.saved && T.getHp() === 100, 'in the boots a strike does nothing (' + T.getHp() + ')');
    // A tree.
    const r3 = L.strike('tree');
    ok(r3.target === 'tree' && r3.tree >= 0, 'a strike into a tree near him');
    // The dead.
    T.clearZombies();
    const P = T.player.position;
    for (let i = 0; i < 4; i++) T.spawnZombie(P.x + 20 + i * 0.8, P.z, 'shambler', true, true);
    const far = T.spawnZombie(P.x + 40, P.z, 'shambler', true, true);
    const r4 = L.strike('dead');
    ok(r4.target === 'dead' && r4.killed === 4, 'a strike among the dead kills the ' + r4.killed + ' round it');
    ok(far && far.alive, 'the one 20 m off lives');
    // Off the boots: at 60 HP it ends the run as lightning.
    L.reset();
    ok(!L.worn() && boots.visible, 'a new run: the boots are back at the mast');
    T.clearZombies(); T.setArmor(0); T.setHp(60);
    L.strike('marine');
    ok(T.getHp() === 0 && T.getDeathCause() === 'lightning', 'at 60 HP it kills him: ' + T.getDeathCause());
    // CL-178: up the mast. In the boots, nothing; without them, a full-health, full-armour marine dies and lets go.
    L.odds(null); T.resetGame();
    await startMatch(T, 'Mast');
    T.clearZombies(); L.reset();
    L.wear(); L.climbMast(8); T.setArmor(100); T.setHp(100);
    const m1 = L.strike('mast');
    ok(m1.mast && m1.saved && T.getHp() === 100 && L.mast().climb.on, 'up the mast in the boots: nothing (' + T.getHp() + ')');
    L.leaveMast(); L.reset(); L.climbMast(8); T.setArmor(100); T.setHp(100);
    const m2 = L.strike('mast');
    ok(m2.mast && T.getHp() === 0 && T.getDeathCause() === 'lightning' && !L.mast().climb.on, 'up the mast without them: dead, and off the ladder (' + T.getHp() + ')');
    ok(errs.length === 0, 'no errors' + (errs.length ? ': ' + errs[0] : ''));
    L.odds(null);
    T.resetGame();
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
