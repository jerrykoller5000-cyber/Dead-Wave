// t196 - GB-94 follow-up (Jerry, 2026-10-05 8:27 PM; written as t194, moved here after CL-84 part 2 took t194): "1. Rarer on 1, progressively more common up the higher the night.
// 2. Smaller amount that ducks, more that have the stronger stagger. 3. Get rid of zombies dropping med pens 4. Buff the
// knife a little and decrease the effective range and cone of hit of the machete significantly. Machete should still be
// twice as strong as knife." Then 9:18 PM: "lets do 69 on machete" - that replaces the exact 2x (69 = about 2.65x the
// knife's 26); the machete's reach and cone stay as cut. The shares themselves are pinned in game/horde.test.mjs; this checks the game uses them.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const H = T.hordeDbg;
  const gameWait = async (s) => { const s0 = T.getSimTime(), c0 = Date.now(); while (T.getSimTime() - s0 < s && Date.now() - c0 < 20000) await wait(16); };
  try {
    // (4) The blades.
    const B = T.BLADE_STATS;
    ok(B.knife.dmg === 26 && B.knife.reach === 2.4 && B.knife.arc === 0.4 && B.knife.cd === 0.55 && B.knife.maxHits === 2, 'knife: 22 -> 26 damage (+18%), the rest as before ' + JSON.stringify(B.knife));
    ok(B.machete.dmg === 69, 'machete damage 69 (Jerry 9:18 PM, in place of exactly 2x the knife): ' + B.machete.dmg + ' = x' + (B.machete.dmg / B.knife.dmg).toFixed(2) + ' the knife\'s ' + B.knife.dmg);
    ok(B.machete.reach === 2.45 && B.machete.reach <= 3.8 * 0.65, 'machete reach 3.8 -> ' + B.machete.reach + ' m (' + Math.round((1 - B.machete.reach / 3.8) * 100) + '% less)');
    const half = (c) => Math.acos(c) * 180 / Math.PI, ratio = half(B.machete.arc) / half(-0.05);
    ok(B.machete.arc === 0.69 && ratio > 0.45 && ratio < 0.55, 'machete cone half-angle ' + half(-0.05).toFixed(0) + ' -> ' + half(B.machete.arc).toFixed(0) + ' degrees (x' + ratio.toFixed(2) + ')');
    ok(B.machete.cd === 0.5 && B.machete.maxHits === 3, 'machete recovery and max hits as before');

    await startMatch(T, 'Followup');
    const w0 = Date.now();
    while (T.marine.getObjectByName('insertion-harness') && Date.now() - w0 < 90000) await wait(100);
    T.clearZombies(); T.skipGrace && T.skipGrace();
    T.setHp(1e6);
    const px = 10, pz = 10;
    const hold = () => { T.player.position.set(px, T.sampleHeight(px, pz), pz); T.setHp(1e6); };
    hold(); await wait(150); hold();
    const swingAt = async (dist, angDeg, machete) => {
      T.clearZombies(); await wait(40);
      T.setMacheteOwned(!!machete);
      const a = angDeg * Math.PI / 180, x = px + Math.sin(a) * dist, zq = pz + Math.cos(a) * dist;
      const z = T.spawnZombie(x, zq, 'shambler', true, true);
      z.riseT = 0; z.speed = z.baseSpeed = 0; z.hp = z.maxHp = 1000;
      z.mesh.position.set(x, T.sampleHeight(x, zq), zq);
      hold(); T.setAimYawDbg(0); T.setKnifeCd(0); T.knifeAttack(); await wait(30);
      return 1000 - z.hp;
    };
    const wk = T.WEAKNESS.shambler.blade;
    const mHit = await swingAt(2.0, 0, true);
    ok(Math.abs(mHit - 69 * wk) < 0.6, 'machete on a shambler at 2 m: ' + mHit.toFixed(1) + ' (69 x Blade ' + wk + ')');
    const kHit = await swingAt(2.0, 0, false);
    ok(Math.abs(kHit - 26 * wk) < 0.6 && Math.abs(mHit * 26 - kHit * 69) < 26, 'knife there: ' + kHit.toFixed(1) + ' (26 x ' + wk + '), 26/69 of the machete');
    const mFar = await swingAt(3.2, 0, true);
    ok(mFar === 0, 'machete no longer reaches 3.2 m (it did at 3.8 + its radius): ' + mFar.toFixed(1));
    const mWide = await swingAt(1.8, 60, true), kWide = await swingAt(1.8, 60, false), mNarrow = await swingAt(1.8, 35, true);
    ok(mWide === 0 && kWide > 0 && mNarrow > 0, 'machete cone: misses 60 degrees off (the knife still hits there: ' + kWide.toFixed(1) + '), hits 35 degrees off (' + mNarrow.toFixed(1) + ')');
    T.setMacheteOwned(false);
    T.clearZombies(); await wait(50);

    // (3) No MedPen from the dead: thirty brutes (12% each before) and ten militaries, all killed for pay.
    const m0 = T.getMedDropCount();
    for (let k = 0; k < 40; k++) {
      const z = T.spawnZombie(px + 30 + (k % 8) * 2, pz + 30 + ((k / 8) | 0) * 2, k < 30 ? 'brute' : 'military', true, true);
      if (z) T.killZombie(z, true, { kind: 'bullet', dir: { x: 0, z: 1 } });
    }
    await wait(200);
    ok(T.getMedDropCount() === m0, 'forty kills, no MedPen on the ground (' + m0 + ' -> ' + T.getMedDropCount() + ')');
    T.clearZombies(); await wait(100);

    // (1) The night it walks on sets the sprinters' share.
    ok(Math.abs(H.sprintShare(1) - 0.03) < 1e-9 && Math.abs(H.sprintShare(20) - 0.19) < 1e-9, 'sprinters: 3% on night 1, 19% on night 20');
    const zn = T.spawnZombie(px + 40, pz + 40, 'shambler', true, true); H.join(zn, 20);
    const zd = T.spawnZombie(px + 42, pz + 40, 'shambler', true, true); H.join(zd);
    ok(zn.paceNight === 20 && zd.paceNight === Math.max(1, T.getDay() | 0), 'a body rolls its pace for its night (' + zn.paceNight + '; tonight ' + zd.paceNight + ')');
    T.clearZombies(); await wait(50);

    // (2) Stagger: a hit slows it and shoves it back along the shot. Fixed pace, so the numbers are the hit's.
    const comer = (react) => {
      const x = px, zq = pz + 12;
      const z = T.spawnZombie(x, zq, 'shambler', true, true);
      z.riseT = 0; H.join(z); z.hzReact = react; z.speed = z.baseSpeed = 3.6; z.hp = z.maxHp = 1e6;
      z.mesh.position.set(x, T.sampleHeight(x, zq), zq);
      return z;
    };
    const d = (z) => Math.hypot(z.mesh.position.x - px, z.mesh.position.z - pz);
    const s = comer('stagger');
    hold(); await gameWait(0.3); hold();
    const d0 = d(s);
    T.damageZombie(s, 5, { kind: 'bullet', dir: { x: (s.mesh.position.x - px) / d0, z: (s.mesh.position.z - pz) / d0 } });
    const t0 = s.hzStaggerT, cd0 = s.hzStaggerCd;
    T.damageZombie(s, 5, { kind: 'bullet', dir: { x: 0, z: 1 } });
    ok(t0 > 0.35 && cd0 > 0.85 && s.hzStaggerT === t0, 'a hit staggers it (' + t0.toFixed(2) + ' s), and a second hit at once does not restart it');
    hold(); await gameWait(0.4); hold();
    const d1 = d(s);
    ok(d1 > d0 - 0.4, 'staggered, it does not close in: ' + d0.toFixed(2) + ' -> ' + d1.toFixed(2) + ' m in 0.4 s (unstaggered it walks 1.4 m)');
    hold(); await gameWait(0.5); hold();
    ok(d(s) < d1 - 0.3, 'and then it comes on again (' + d1.toFixed(2) + ' -> ' + d(s).toFixed(2) + ' m)');
    T.clearZombies(); await wait(50);
    const k = comer('duck');
    hold(); await gameWait(0.2); hold();
    T.damageZombie(k, 5, { kind: 'bullet', dir: { x: 0, z: 1 } });
    ok(k.hzRecoilT > 0 && !(k.hzStaggerT > 0), 'one that ducks ducks instead (' + k.hzRecoilT.toFixed(2) + ' s), no stagger');
    const br = T.spawnZombie(px + 20, pz + 20, 'brute', true, true); H.join(br);
    T.damageZombie(br, 5, { kind: 'bullet', dir: { x: 0, z: 1 } });
    ok(br.hzReact === null && !(br.hzStaggerT > 0) && !(br.hzRecoilT > 0), 'a brute neither ducks nor staggers');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  try { T.clearZombies(); T.setMacheteOwned(false); } catch (_) {}
  return out.join('\n');
})();
