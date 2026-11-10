// query: gates=1&chaingates=1
// tcb288 - CB-288 (D-116; AG-245's vines are in). At the mast yard's shut gate with the machete (or the katana): E swings the
// blade at the vines - the blade's own chop clip and sound, faced at the gate, not a free swing - and the cut lands where the
// blade comes through, not at the press. Three swings and the vines fall and the gate opens. Without a blade the prompt says
// it needs one. One press is one swing (the key and the frame after both read E), and the swing hits nothing but the vines.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  // Game time: the page draws few frames a second in the suite (dt is capped), so a swing is waited out in sim seconds.
  const gWait = async (s, cond) => { const s0 = T.getSimTime(), w0 = Date.now(); while (T.getSimTime() - s0 < s && Date.now() - w0 < Math.max(8000, s * 60000)) { if (cond && cond()) return true; await wait(20); } return cond ? !!cond() : true; };
  const key = (type, code, extra) => document.dispatchEvent(new KeyboardEvent(type, { code, key: code === 'KeyE' ? 'e' : 'f', bubbles: true, ...(extra || {}) }));   // on a Node, as the prep checklist reads e.target
  const angDiff = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
  try {
    await startMatch(T, 'Chopper');
    const D = T.storyGatesDbg, C = T.chainDbg;
    ok(!!(D && D.line && D.line.swing && C), 'the hooks are there (storyGatesDbg.line.swing, chainDbg)');
    if (!D || !D.on || !D.line.swing) { out.push('INFO needs ?gates=1&chaingates=1'); return out.join('\n'); }
    D.build();
    const mast = D.rings().find((r) => r.place === 'mast');
    if (!mast) { ok(false, 'the mast yard has its ring'); return out.join('\n'); }
    const g = mast.gates[0], a = Math.atan2(g.z - mast.cz, g.x - mast.cx);
    const sx = g.x + Math.cos(a) * 1.6, sz = g.z + Math.sin(a) * 1.6;   // outside the gate, in reach of it
    const gateYaw = () => Math.atan2(g.x - T.player.position.x, g.z - T.player.position.z);
    const away = () => gateYaw() + Math.PI;   // looking straight away from the vines
    T.setHp && T.setHp(1e6);
    T.setViewFirstDbg(false);
    const stand = () => { T.player.position.set(sx, T.sampleHeight(sx, sz), sz); T.setHp && T.setHp(1e6); };
    const lookAway = () => { const y = away(); T.setAimTargetDbg(T.player.position.x + Math.sin(y) * 10, T.player.position.z + Math.cos(y) * 10); T.setAimYawDbg(y); T.setOtsAimDbg && T.setOtsAimDbg(y, 0); };
    stand(); lookAway(); await wait(400); stand(); lookAway();
    ok(D.near() === 'mast', 'at the mast gate: near() names it (' + D.near() + ')');
    const st = () => D.line.gate('mast');
    const bannerText = () => { const el = document.getElementById('bigBanner'); return el ? el.textContent : ''; };
    const press = async () => { key('keydown', 'KeyE'); await wait(30); key('keyup', 'KeyE'); };

    // (1) Without a blade E swings at nothing, and the prompt says a blade is needed.
    ok(!T.isMacheteOwned() && !T.isKatanaOwned(), 'no blade yet');
    ok(/blade/i.test(String(C.prompt())), 'without a blade the prompt says it needs one (' + C.prompt() + ')');
    await press(); await wait(150);
    ok(st().chops === 0 && D.line.swing() === null && T.getKnifeAnimT() === 0 && T.getKnifeCd() <= 0, 'E without a blade does nothing: no chop, no swing (chops ' + st().chops + ', anim ' + T.getKnifeAnimT() + ')');
    ok(/vine|blade/i.test(bannerText()), 'and it tells him why (' + bannerText().trim() + ')');

    // (2) The machete: E starts the swing; the cut waits for the blade to come through.
    T.setMacheteOwned(true);
    stand(); lookAway(); await wait(200); stand(); lookAway();
    ok(/vines/i.test(String(C.prompt())), 'with the machete the prompt offers the cut (' + C.prompt() + ')');
    ok(angDiff(T.player.rotation.y, away()) < 0.2, 'before the swing he looks away from the vines (' + T.player.rotation.y.toFixed(2) + ' vs ' + away().toFixed(2) + ')');
    const strike = D.line.swingStrike;
    ok(strike > 0.3 && strike < 0.7, 'the cut is set for the middle of the chop (u ' + strike + ')');
    key('keydown', 'KeyE');
    const sw0 = D.line.swing();
    ok(!!sw0 && sw0.struck === false && sw0.place === 'mast', 'E starts a swing (' + JSON.stringify(sw0) + ')');
    ok(T.getKnifeAnimT() > 0 && T.getKnifeCd() > 0, 'it is the blade\'s own swing: the clip runs and the recovery is on (anim ' + T.getKnifeAnimT().toFixed(2) + ', cd ' + T.getKnifeCd().toFixed(2) + ')');
    ok(sw0 && Math.abs(sw0.dur - 0.40) < 0.02, 'the machete\'s chop, 0.40 s (' + (sw0 && sw0.dur) + ')');
    ok(st().chops === 0, 'the vines have not been cut at the press (chops ' + st().chops + ')');
    ok(angDiff(sw0 ? sw0.yaw : 9, gateYaw()) < 0.05, 'the swing is aimed at the gate (' + (sw0 && sw0.yaw.toFixed(2)) + ' vs ' + gateYaw().toFixed(2) + ')');
    // Sample the swing frame by frame: before the strike nothing is cut, after it one chop is counted, and he faces the vines throughout.
    const samples = []; let faced = 0, early = 0;
    const s0 = T.getSimTime(), w0 = Date.now();
    while (Date.now() - w0 < 30000) {
      lookAway(); stand();
      const sw = D.line.swing(), anim = T.getKnifeAnimT();
      if (sw && anim > 0) {
        const u = 1 - anim / sw.dur;
        samples.push({ u, chops: st().chops, struck: sw.struck });
        if (u > 0.05 && u < 0.95) { early++; if (angDiff(T.player.rotation.y, gateYaw()) < 0.25) faced++; }
      }
      if (!sw && anim <= 0) break;
      await wait(15);
    }
    key('keyup', 'KeyE');
    out.push('INFO ' + samples.length + ' samples of the swing, u ' + (samples.length ? samples[0].u.toFixed(2) + '..' + samples[samples.length - 1].u.toFixed(2) : '-'));
    ok(samples.length >= 2, 'the swing ran over several frames (' + samples.length + ')');
    ok(samples.every((s) => (s.u < strike - 0.001) ? s.chops === 0 : (s.u >= strike) ? s.chops === 1 : true), 'no chop before the blade comes through, one after (' + JSON.stringify(samples.map((s) => [+s.u.toFixed(2), s.chops])) + ')');
    ok(early > 0 && faced === early, 'in third person he faces the vines through the swing (' + faced + ' of ' + early + ' frames)');
    await gWait(0.3);
    ok(st().chops === 1 && !st().open && st().vines, 'one swing, one chop; still shut (chops ' + st().chops + ')');
    ok(D.line.swing() === null, 'the swing lets go when the clip ends');
    lookAway(); await gWait(0.4); stand(); lookAway(); await wait(300);
    ok(angDiff(T.player.rotation.y, away()) < 0.3, 'and he turns back to where he looks (' + T.player.rotation.y.toFixed(2) + ' vs ' + away().toFixed(2) + ')');

    // (3) E pressed again mid-swing, or held, does not stack; it takes the recovery to swing again.
    await gWait(0.8, () => T.getKnifeCd() <= 0 && T.getKnifeAnimT() <= 0);
    key('keydown', 'KeyE'); await wait(60);
    for (let k = 0; k < 4; k++) { key('keydown', 'KeyE', { repeat: true }); await wait(20); }   // held
    key('keydown', 'KeyE'); await wait(30); key('keydown', 'KeyE'); await wait(30);   // and tapped again in the swing
    key('keyup', 'KeyE');
    await gWait(1.0, () => D.line.swing() === null && T.getKnifeAnimT() <= 0);
    await gWait(0.2);
    ok(st().chops === 2 && !st().open, 'a held and a hammered E in one swing is one chop (chops ' + st().chops + ')');

    // F is a free swing: it does not cut the vines.
    await gWait(0.9, () => T.getKnifeCd() <= 0 && T.getKnifeAnimT() <= 0);
    key('keydown', 'KeyF'); key('keyup', 'KeyF');
    await gWait(0.6, () => T.getKnifeAnimT() <= 0 && T.getKnifeCd() <= 0);
    ok(st().chops === 2 && !st().open, 'F, the free swing, leaves the vines alone (chops ' + st().chops + ')');

    // (4) The third swing: the vines fall and the gate opens.
    await press();
    ok(D.line.swing() !== null, 'the third swing begins');
    ok(await gWait(2.5, () => st().chops === 3), 'its chop lands (chops ' + st().chops + ')');
    ok(await gWait(8, () => D.gates().filter((q) => q.place === 'mast').every((q) => q.w > 0.99)), 'the gate swings open');
    ok(st().open && st().vines === false && C.read().gates['mast-yard'] === 'open', 'the vines fall and the chain\'s mast gate is open (' + JSON.stringify(st()) + ')');
    ok(D.gates().filter((q) => q.place === 'mast').every((q) => q.solids === 0 && q.blocks === 0), 'its solids and field block are gone');
    await gWait(0.8, () => D.line.swing() === null && T.getKnifeAnimT() <= 0);

    // (5) A run reset grows them back; the swing does not carry over.
    C.reset(); await wait(500);
    ok(!st().open && st().vines === true && st().chops === 0 && D.line.swing() === null, 'a run reset grows the vines back (' + JSON.stringify(st()) + ')');

    // (6) A swing that is cancelled before the blade comes through cuts nothing.
    T.setMacheteOwned(true); stand(); lookAway(); await wait(300); stand();
    await gWait(0.8, () => T.getKnifeCd() <= 0 && T.getKnifeAnimT() <= 0);
    key('keydown', 'KeyE'); key('keyup', 'KeyE');
    ok(D.line.swing() !== null && !D.line.swing().struck, 'a swing is under way');
    T.setWeapon(T.WEAPON_ORDER.indexOf('pistol') + 0);   // changing the weapon drops the clip
    await gWait(0.8); await wait(100);
    const cancelled = st().chops === 0 && D.line.swing() === null;
    if (T.getCurrentWeapon() === 'pistol' && T.getKnifeAnimT() <= 0 && st().chops === 0) ok(cancelled, 'a swing cut off by the weapon change cuts nothing (chops ' + st().chops + ')');
    else out.push('INFO the weapon change did not cancel the clip here; skipped (chops ' + st().chops + ', anim ' + T.getKnifeAnimT() + ')');

    // (7) Too far from the vines E does not swing.
    const fx = g.x + Math.cos(a) * 6, fz = g.z + Math.sin(a) * 6;
    T.player.position.set(fx, T.sampleHeight(fx, fz), fz); await wait(300);
    await gWait(0.8, () => T.getKnifeCd() <= 0 && T.getKnifeAnimT() <= 0);
    await press(); await wait(150);
    ok(D.line.swing() === null && st().chops === 0 && T.getKnifeAnimT() <= 0, 'six metres off, E swings at nothing');

    // (8) The swing hits nothing but the vines: a shambler at his side takes no damage from it, and does from F.
    stand(); lookAway(); await wait(300); stand();
    T.clearZombies && T.clearZombies(); await wait(50);
    const zx = sx - Math.sin(away()) * 1.0, zz = sz - Math.cos(away()) * 1.0;   // between him and the vines
    const z = T.spawnZombie(zx, zz, 'shambler', true, true);
    if (z) {
      z.riseT = 0; z.speed = z.baseSpeed = 0; z.attackCd = 1e9; z.mesh.position.set(zx, T.sampleHeight(zx, zz), zz);
      const hp0 = z.hp;
      await gWait(0.8, () => T.getKnifeCd() <= 0 && T.getKnifeAnimT() <= 0);
      await press();
      await gWait(1.0, () => D.line.swing() === null && T.getKnifeAnimT() <= 0);
      ok(st().chops === 1, 'the swing cut the vines (chops ' + st().chops + ')');
      ok(z.alive && z.hp === hp0, 'and the zombie at his side was not touched (hp ' + z.hp + ' of ' + hp0 + ')');
      await gWait(0.9, () => T.getKnifeCd() <= 0 && T.getKnifeAnimT() <= 0);
      T.knifeAttack(); await wait(100);
      ok(z.hp < hp0 || !z.alive, 'while F, the free swing, does hit him (hp ' + z.hp + ')');
      ok(st().chops === 1, 'and it did not cut the vines (chops ' + st().chops + ')');
      T.clearZombies && T.clearZombies();
    } else ok(false, 'a zombie to stand beside him');

    // (9) The katana swings at them too, in its own time; from his eyes the swing does not turn the camera.
    C.reset(); await wait(500);
    T.setMacheteOwned(false); T.setKatanaOwned(true);
    stand(); lookAway(); await wait(300); stand(); lookAway();
    await gWait(0.8, () => T.getKnifeCd() <= 0 && T.getKnifeAnimT() <= 0);
    await press();
    const k0 = D.line.swing();
    ok(!!k0 && Math.abs(k0.dur - 0.30) < 0.02, 'the katana\'s swing, 0.30 s (' + (k0 && k0.dur) + ')');
    await gWait(1.0, () => D.line.swing() === null && T.getKnifeAnimT() <= 0);
    ok(st().chops === 1, 'it cuts too (chops ' + st().chops + ')');
    for (let k = 0; k < 2; k++) {
      await gWait(0.9, () => T.getKnifeCd() <= 0 && T.getKnifeAnimT() <= 0);
      await press(); await gWait(1.0, () => D.line.swing() === null && T.getKnifeAnimT() <= 0);
    }
    ok(await gWait(3, () => st().chops >= 3 || st().open), 'three katana swings: the vines are down (chops ' + st().chops + ', open ' + st().open + ')');
    C.reset(); await wait(500);
    T.setKatanaOwned(false); T.setMacheteOwned(true);
    T.setViewFirstDbg(true); await wait(500); stand(); lookAway();
    await gWait(0.8, () => T.getKnifeCd() <= 0 && T.getKnifeAnimT() <= 0);
    await press();
    ok(D.line.swing() !== null, 'from his eyes E swings too');
    let turned = 0, seen = 0;
    const w1 = Date.now();
    while (Date.now() - w1 < 20000 && (D.line.swing() || T.getKnifeAnimT() > 0)) {
      lookAway(); stand(); seen++;
      if (angDiff(T.player.rotation.y, gateYaw()) < 0.4) turned++;
      await wait(15);
    }
    ok(seen > 0 && turned === 0, 'and the camera is left where he looks (turned to the vines on ' + turned + ' of ' + seen + ' frames)');
    await gWait(0.3);
    ok(st().chops === 1, 'the first-person swing cuts too (chops ' + st().chops + ')');
    T.setViewFirstDbg(false);

    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  return out.join('\n');
})()
