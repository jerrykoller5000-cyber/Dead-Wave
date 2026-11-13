// tce11 - CE-11 (J151 note 2, Jerry 13 Nov: "The pistol chamber on reload doesn't look real: it clips through the gun instead
// of opening like a real pistol's. The chamber and barrel on reload need to look more realistic"). Claude 5. ChatGPT 2's
// GT-20104 pistol (a hollow slide over a barrel on its rear chamber datum) driven at the eye, frames stepped by hand:
// - a shot: the view's barrel goes back with the slide its first 4 gun mm, then unlocks: its chamber 10 mm down and 0.05 rad
//   turned at full unlock, and comes home locked with the slide;
// - an empty reload: the slide is locked back from the start (by its 0.07 travel), the support hand pulls it a little further
//   off the stop and lets it go home; the barrel stays unlocked while the slide is back;
// - a reload with rounds left: the slide at rest until the rack, one rack, as before.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };
  const st = (n, dt = 1 / 30) => { for (let i = 0; i < n; i++) T.stepFrame(dt); };
  let held = false;
  try {
    if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting();
    const nameEl = document.getElementById('playerName'); if (nameEl) nameEl.value = 'Trainee';
    document.getElementById('modeTraining').click();
    ok(await until(() => T.trainingDbg.state().active, 20000), 'the Training Ground is up');
    T.runDevCommand && T.runDevCommand('godmode'); T.grantAllWeapons(); T.setUnarmedDbg && T.setUnarmedDbg(false);
    T.setViewFirstDbg(true); ok(await until(() => T.fpDbg().first && T.fpDbg().w > 0.9, 20000), 'first person');
    T.flightHold(true); held = true;
    for (let i = 0; i < 20 && T.getCurrentWeapon() !== 'pistol'; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf('pistol')); st(5); }
    st(40); ok(T.getCurrentWeapon() === 'pistol', 'the pistol in hand');
    const V = T.viewmodelDbg(), g = V.gun, br = g && g.barrel, bb = g && g.barrelBase;
    ok(!!br && !!bb && !!g.work, 'the view has the pistol\'s barrel and its slide');
    if (!br || !bb || !g.work) return out.join('\n');
    const slide = () => g.workBase.z - g.work.position.z, mm = (x) => (x * 1000).toFixed(1);
    const pose = () => ({ s: slide(), dz: bb.z - br.position.z, dy: bb.y - br.position.y, rx: br.rotation.x - bb.rx });
    // a shot
    T.setAmmoDbg('pistol', 10); st(5);
    const r0 = pose();
    ok(Math.abs(r0.s) < 1e-4 && Math.abs(r0.dz) < 1e-5 && Math.abs(r0.dy) < 1e-5 && Math.abs(r0.rx) < 1e-5, 'at rest: slide home, barrel locked at its datum');
    T.setMouseFireDbg(true); T.stepFrame(1 / 120); T.setMouseFireDbg(false);
    let peak = { s: 0 }, bad = 0, n = 0;
    for (let i = 0; i < 40; i++) { T.stepFrame(1 / 120); const p = pose(); n++; if (p.s > peak.s) peak = p;
      const j = Math.min(Math.max(p.s, 0), 0.004), u = Math.min(1, Math.max(0, (p.s - 0.004) / 0.004));
      if (Math.abs(p.dz - j) > 1e-5 || Math.abs(p.dy - 0.010 * u) > 1e-5 || Math.abs(p.rx + 0.05 * u) > 1e-5) bad++; }
    out.push('INFO the shot: slide back ' + mm(peak.s) + ' gun mm; the barrel back ' + mm(peak.dz) + ', down ' + mm(peak.dy) + ', turned ' + peak.rx.toFixed(3) + ' rad');
    ok(peak.s > 0.03 && Math.abs(peak.dz - 0.004) < 1e-5 && Math.abs(peak.dy - 0.010) < 1e-5 && Math.abs(peak.rx + 0.05) < 1e-5, 'a shot: the barrel goes back 4 gun mm with the slide, then unlocks: 10 mm down, 0.05 rad');
    ok(bad === 0, 'every frame of the shot the barrel follows its slide (' + bad + ' of ' + n + ' off)');
    st(20); const r1 = pose();
    ok(Math.abs(r1.s) < 1e-4 && Math.abs(r1.dz) < 1e-5 && Math.abs(r1.rx) < 1e-5, 'and home, locked');
    // an empty reload
    T.setAmmoDbg('pistol', 0); st(2); T.startReload(); st(1);
    const at = (u) => { T.reloadClipDbg.hold(u); for (let i = 0; i < 3; i++) T.stepFrame(1 / 60); return pose(); };
    const e = [0.05, 0.3, 0.6, 0.7, 0.8, 0.88, 0.95, 0.99].map((u) => [u, at(u)]);
    out.push('INFO empty reload (u: slide gun mm / barrel down mm): ' + e.map(([u, p]) => u + ':' + mm(p.s) + '/' + mm(p.dy)).join(' '));
    ok(e.filter(([u]) => u <= 0.7).every(([, p]) => Math.abs(p.s - 0.07) < 0.001 && Math.abs(p.dy - 0.010) < 1e-5), 'empty: the slide locked back by its travel from the start, the barrel unlocked');
    ok(e.find(([u]) => u === 0.8)[1].s > 0.072, 'empty: the hand pulls it further off the stop (' + mm(e.find(([u]) => u === 0.8)[1].s) + ' mm)');
    ok(e.find(([u]) => u === 0.95)[1].s < 0.001 && Math.abs(e.find(([u]) => u === 0.95)[1].dy) < 1e-5, 'empty: then home, the barrel locked');
    T.reloadClipDbg.hold(null); st(60);
    // a reload with rounds left
    T.setAmmoDbg('pistol', 5); st(2); T.startReload(); st(1);
    const tac = [0.3, 0.6, 0.8, 0.95].map((u) => [u, at(u)]);
    out.push('INFO tactical reload: ' + tac.map(([u, p]) => u + ':' + mm(p.s)).join(' '));
    ok(tac[0][1].s < 1e-4 && tac[1][1].s < 1e-4 && tac[2][1].s > 0.06 && tac[3][1].s < 0.001, 'rounds left: the slide at rest until the rack, one rack, home');
    T.reloadClipDbg.hold(null); st(60);
    ok(errs.length === 0, 'no page errors (' + errs.slice(0, 2).join(' | ') + ')');
  } catch (e) { ok(false, 'threw: ' + (e && e.stack || e)); }
  finally { try { if (held) T.flightHold(false); T.reloadClipDbg && T.reloadClipDbg.hold(null); } catch (_) {} }
  return out.join('\n');
})()
