// t342 - CD-21 (Jerry D-236, 21 Nov: "Unarmed shows arms above head. Should not be able to see arms or hands at all in
// unarmed."). First person, unarmed: nothing of his arms, sleeves, gloves or hands is in the eye's pass at any look angle
// (straight up, up, level, down, straight down), standing, walking, crouched: every visible mesh of his body's arms (and
// their cloth and skin splits) is out of the eye (the view's eye-hide set, game/viewmodel.js), and the view draws nothing
// (no view gun, no view hands). Drawing a gun again brings the view gun and its arms back; third person hides nothing.
// budget: 240
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'Unarmed');
    T.clearZombies && T.clearZombies(); T.setHp && T.setHp(100000); T.grantAllWeapons && T.grantAllWeapons();
    const vm = () => T.viewmodelDbg();
    const m = T.getMarine(), ud = m.userData;
    const vis = (o) => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
    const armMeshes = () => { const s = []; for (const a of [ud.armLG, ud.armRG]) if (a) a.traverse((o) => { if ((o.isMesh || o.isSkinnedMesh) && vis(o) && !(o.userData && o.userData.isLaser)) s.push(o); }); return s; };
    const viewDrawn = () => { const V = vm(); if (!V || !V.root || !vis(V.root)) return []; const s = []; V.root.traverse((o) => { if (o.isMesh && vis(o)) s.push(o.name || o.parent && o.parent.name || '?'); }); return s; };
    const step = (n) => { for (let i = 0; i < n; i++) T.stepFrame(1 / 60); };
    T.flightHold(true);
    T.setViewFirstDbg(true);
    // start from a gun in hand (the view built), then put it away: the case Jerry hit (Training, the GW-4 holstered)
    if (T.isUnarmed && T.isUnarmed()) T.toggleHolster();
    for (let i = 0; i < 16 && T.getCurrentWeapon() !== 'm4'; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf('m4')); step(10); }
    step(120);
    ok(vm() && vm().info.active, 'armed: the view is up (' + (vm() && vm().info.key) + ')');
    const armedHidden = armMeshes().filter((o) => !vm().isEyeHidden(o)).length;
    ok(armedHidden === 0, 'armed: his body arms are out of the eye (' + armedHidden + ' in it)');
    T.setUnarmedDbg(true); step(150);
    ok(T.isUnarmed(), 'unarmed');
    const pitches = [1.5, 0.8, 0, -0.8, -1.5];
    for (const [how, keys] of [['standing', []], ['walking', ['KeyW']], ['crouched', ['KeyC']]]) {
      for (const k of keys) window.dispatchEvent(new KeyboardEvent('keydown', { code: k, key: k.slice(3).toLowerCase(), bubbles: true }));
      for (const p of pitches) {
        T.setOtsAimDbg(0, p); step(30);
        const inEye = armMeshes().filter((o) => !vm().isEyeHidden(o)).map((o) => o.name || '?');
        const drawn = viewDrawn();
        ok(inEye.length === 0 && drawn.length === 0, how + ', pitch ' + p + ': nothing of the arms in the eye (body ' + inEye.length + (inEye.length ? ': ' + inEye.slice(0, 4).join(',') : '') + '; view ' + drawn.length + (drawn.length ? ': ' + drawn.slice(0, 4).join(',') : '') + ')');
      }
      for (const k of keys) window.dispatchEvent(new KeyboardEvent('keyup', { code: k, key: k.slice(3).toLowerCase(), bubbles: true }));
    }
    T.setOtsAimDbg(0, 0);
    // draw again: the view gun comes back with its arms, the body's arms stay out of the eye
    T.setUnarmedDbg(false); step(150);
    ok(vm().info.active && viewDrawn().length > 0, 'drawn again: the view gun and its arms are back (' + viewDrawn().length + ' parts)');
    ok(armMeshes().filter((o) => !vm().isEyeHidden(o)).length === 0, 'drawn again: his body arms stay out of the eye');
    // third person: nothing is hidden from the eye
    T.setUnarmedDbg(true); T.setViewFirstDbg(false); step(150);
    ok(armMeshes().filter((o) => vm().isEyeHidden(o)).length === 0, 'third person, unarmed: his arms are drawn (none hidden)');
    T.setUnarmedDbg(false); step(60);
    ok(armMeshes().filter((o) => vm().isEyeHidden(o)).length === 0, 'third person, armed: his arms are drawn (none hidden)');
    T.setViewFirstDbg(true); T.flightHold(false);
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
