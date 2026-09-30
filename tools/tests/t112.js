// t112 - GB-103 (P-117, D-62): the horde fights the defences. A turret that fires on a zombie draws it and its pack
// (within 6 m) onto the turret within 2 s, and it walks there instead of at the marine; one further off is left
// alone. Brutes and demons always, and one in four of the other wave spawns, are defence seekers that go for the
// nearest turret first; bombers, spiders and screamers never are. A zombie that came for the defences hits builds
// 1.5x harder. One that makes no headway on its turret for 5 s gives it up for 10 s.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (cond, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (cond()) return true; await wait(40); } return cond(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'Defences');
    T.clearZombies(); T.skipGrace && T.skipGrace(); T.runDevCommand('godmode');
    T.unlockAllBuilds && T.unlockAllBuilds();
    const P = T.player.position;
    const lt = T.placeBuildAt('light', T.gridIndex(P.x) + 5, T.gridIndex(P.z));
    ok(!!lt && lt.range > 0, 'a light turret is up' + (lt ? ' at ' + Math.hypot(lt.x - P.x, lt.z - P.z).toFixed(1) + ' m' : ''));
    lt.hp = lt.maxHp = 5000;
    const hold = (z) => { z.riseT = 0; z.speed = z.baseSpeed = 0; z.hp = z.maxHp = 1e6; return z; };
    // Target 7 m from the turret, off to its side (so the way to the turret and the way to the marine differ);
    // a packmate 2.5 m from it; one 16 m off.
    const ux = (lt.x - P.x), uz = (lt.z - P.z), ul = Math.hypot(ux, uz) || 1;
    const fx = ux / ul, fz = uz / ul, sx = -fz, sz = fx;
    const tgt = hold(T.spawnZombie(lt.x + sx * 7, lt.z + sz * 7, 'shambler', true, true));
    const mate = hold(T.spawnZombie(lt.x + sx * 7 + fx * 2.5, lt.z + sz * 7 + fz * 2.5, 'shambler', true, true));
    const far = hold(T.spawnZombie(lt.x + sx * 7 + fx * 16, lt.z + sz * 7 + fz * 16, 'shambler', true, true));
    const t0 = performance.now();
    const drawn = await until(() => tgt.threatB === lt || mate.threatB === lt, 2000);
    ok(drawn && (performance.now() - t0) < 2100, 'the turret fires and draws its target within 2 s (' + ((performance.now() - t0) / 1000).toFixed(2) + ' s)');
    ok(tgt.threatB === lt && mate.threatB === lt && tgt.threatT > 0 && mate.threatT > 0, 'its pack comes too: target ' + (tgt.threatB === lt) + ', packmate 2.5 m off ' + (mate.threatB === lt));
    ok(!far.threatB && T.defenceTargetOf(far, 0) == null, 'a zombie 16 m off is not drawn');
    // It walks to the turret, not the marine.
    tgt.speed = tgt.baseSpeed = 3.2;
    const a0 = { x: tgt.mesh.position.x, z: tgt.mesh.position.z };
    await wait(900);
    const mvx = tgt.mesh.position.x - a0.x, mvz = tgt.mesh.position.z - a0.z, ml = Math.hypot(mvx, mvz) || 1;
    const toT = [(lt.x - a0.x), (lt.z - a0.z)], tl = Math.hypot(toT[0], toT[1]) || 1;
    const toP = [(P.x - a0.x), (P.z - a0.z)], pl = Math.hypot(toP[0], toP[1]) || 1;
    const dT = (mvx * toT[0] + mvz * toT[1]) / ml / tl, dP = (mvx * toP[0] + mvz * toP[1]) / ml / pl;
    ok(ml > 0.5 && dT > 0.9 && dT > dP + 0.2, 'the drawn zombie heads for the turret (moved ' + ml.toFixed(2) + ' m, cos to turret ' + dT.toFixed(2) + ', to marine ' + dP.toFixed(2) + ')');
    // A defence-minded zombie hits the turret 1.5x harder.
    const hp0 = lt.hp; let drop = 0, dmgAt = 0;
    const hit = await until(() => { if (tgt._pendingAttack) dmgAt = tgt._pendingAttack.dmg; if (lt.hp < hp0) { drop = hp0 - lt.hp; return true; } return false; }, 5000);
    // The blow as the swing was wound up (a plain blow), and what the turret lost.
    const base = dmgAt || Math.max(2, Math.round(tgt.damage * (tgt.meleeMult || 1)));
    ok(hit && T.defenceMinded(tgt) && drop === Math.round(base * T.DEF_BUILD_MUL), 'its blow on the turret is 1.5x: ' + drop + ' (a plain blow ' + base + ', damage ' + tgt.damage + ')');
    T.clearZombies();
    // One that makes no headway on the turret for 5 s (held in place, not fighting) gives it up and goes back to the marine.
    const stuck = hold(T.spawnZombie(lt.x + fx * 14, lt.z + fz * 14, 'shambler', true, true));
    T.drawToDefence(stuck, lt);
    const first = T.defenceTargetOf(stuck, 0.016);
    let last = first; for (let i = 0; i < 6; i++) last = T.defenceTargetOf(stuck, 1);
    ok(first === lt && last == null && stuck.defGiveUpT > 0 && !T.defenceMinded(stuck), 'held 6 s without headway it gives the turret up (for ' + (stuck.defGiveUpT || 0).toFixed(1) + ' s more)');
    T.clearZombies();
    // Seekers: brutes and demons always; one in four of the rest; never bombers, spiders or screamers.
    const mk = (k, i) => hold(T.spawnZombie(P.x + 30 + i, P.z + 30, k, true, true));
    const br = mk('brute', 0), dm = mk('demon', 2);
    const bm = mk('bomber', 4), sp = mk('spider', 6), sc = mk('screamer', 8);
    const sh = []; for (let i = 0; i < 12; i++) sh.push(mk(i % 2 ? 'feral' : 'shambler', 10 + i));
    [br, dm, bm, sp, sc].forEach((z) => T.markDefenceSeeker(z));
    const nSeek = sh.map((z) => T.markDefenceSeeker(z)).filter(Boolean).length;
    ok(br.defSeek && dm.defSeek, 'brutes and demons are defence seekers');
    ok(!bm.defSeek && !sp.defSeek && !sc.defSeek, 'bombers, spiders and screamers are not');
    ok(nSeek === 3, 'a quarter of the rest are: ' + nSeek + ' of 12');
    // A seeker 30-odd m out goes for the turret; a plain one keeps the marine.
    const seeker = sh.find((z) => z.defSeek), plain = sh.find((z) => !z.defSeek);
    ok(T.defenceTargetOf(seeker, 0.016) === lt && T.defenceTargetOf(br, 0.016) === lt, 'a seeker (and the brute) picks the turret first');
    ok(T.defenceTargetOf(plain, 0.016) == null, 'a plain one has no defence target (goes for the marine)');
    T.clearZombies();
    T.removeBuild(lt, true);
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message || e));
  }
  return out.join('\n');
})()
