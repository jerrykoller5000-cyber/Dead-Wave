// tce9 - CE-9 (Claude 5; Jerry's J149, D-177: "safeties, selectors, charging handles and bolt catches as separate moving
// parts the hands can work"): the first-person gun's controls show its state and the reload works them. Every row of
// VM_CONTROLS (game/viewmodel-poses.js) on every gun in hand at the eye:
// - names a control the gun's view copy has (its userData.controls), and never a part the gun's own action moves (the
//   view's work, its pump, the launcher's drum latch);
// - ready rows (a safety off, a grip safety squeezed, a switch armed): the part off its rest by the row's travel with the
//   gun up, and back on its rest as the gun goes down (a weapon change half way);
// - reload rows: on their rest before the reload, off it by the row's travel held in their beat (TT.reloadClipDbg.hold),
//   back on it after the beat; empty-only rows not moved in a reload with rounds left;
// - the selector follows the fire mode (X) on the guns that have one, eased, and comes back;
// - nothing else on the gun moved by the rows: every other control on its rest (the source's own transform).
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const info = (m) => out.push('INFO ' + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(40); } return !!f(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    if (!T.reloadClipDbg || !T.viewmodelDbg || !T.setViewFirstDbg || !T.stepFrame || !T.setAmmoDbg || !T.startReload) { ok(false, 'the hooks are there (reloadClipDbg, viewmodelDbg, setViewFirstDbg, stepFrame, setAmmoDbg, startReload)'); return out.join('\n'); }
    await startMatch(T, 'CE9');
    T.clearZombies && T.clearZombies(); T.setHp(1e6); T.grantAllWeapons();
    const { VM_CONTROLS, VM_POSES, VM_RELOADS } = await import(new URL('/game/viewmodel-poses.js', location.origin).href);
    const G = T.THREE || window.THREE;
    const take = async (w) => { if (T.isUnarmed && T.isUnarmed()) T.toggleHolster(); for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf(w)); await wait(150); } await until(() => !T.getSwapDbg || T.getSwapDbg().swapT <= 0, 3000); await wait(200); return T.getCurrentWeapon() === w; };
    const up = (key) => { for (let i = 0; i < 300; i++) { T.stepFrame(1 / 30); const v = T.viewmodelDbg(); if (v && v.info.active && v.info.key === key && v.info.raise > 0.999) break; } for (let i = 0; i < 20; i++) T.stepFrame(1 / 30); const v = T.viewmodelDbg(); return !!(v && v.info.key === key && v.info.raise > 0.999); };
    T.setViewFirstDbg(true);
    const _q = new G.Quaternion();
    // how far the view copy's part is off the source part (its rest: the source's own transform, mirrored each frame)
    const off = (V, part) => {
      const src = [...V.gun.pairs].find(([, o]) => o === part)?.[0];
      if (!src) return null;
      _q.copy(src.quaternion).invert().multiply(part.quaternion);
      return { ang: 2 * Math.acos(Math.min(1, Math.abs(_q.w))), d: part.position.distanceTo(src.position) };
    };
    // the travel the row asks for: an angle (turn) or a distance (slide; a turn about a pivot off the origin moves it too)
    const moved = (o, R, k = 1) => (R.turn != null ? Math.abs(o.ang - Math.abs(R.turn) * k) < 0.02 : Math.abs(o.d - Math.abs(R.slide) * k) < 0.0004 && o.ang < 1e-3);
    const atRest = (o) => o.ang < 1e-3 && o.d < 1e-5;
    const beatMid = (b) => (b[1] + b[2]) / 2;
    const tacticalU = (key, u) => { const R0 = VM_RELOADS[VM_POSES[key].reload]; return R0 && R0.rack && !R0.tacticalRack && R0.mag ? u / Math.min(0.9, (R0.mag.seat || 0.6) + 0.1) : u; };
    for (const key of Object.keys(VM_CONTROLS)) {
      const rows = VM_CONTROLS[key];
      if (!(await take(key)) || !up(key)) { ok(false, key + ': in hand and up at the eye'); continue; }
      const V = T.viewmodelDbg(), g = V.gun, names = (g.src.userData.controls || {});
      for (const name of Object.keys(rows)) {
        const part = g.ctrls[name];
        ok(!!part && !!names[name], key + '.' + name + ': a control on the gun (userData.controls ' + (names[name] || 'missing') + ')');
        ok(!part || (part !== g.work && part !== g.pump && part !== g.latch), key + '.' + name + ': not a part the gun\'s own action moves');
      }
      const others = Object.keys(g.ctrls).filter((n) => !rows[n] && n !== 'trigger' && n !== 'hammer' && n !== 'lightSwitch' && g.ctrls[n] !== g.work && g.ctrls[n] !== g.pump && g.ctrls[n] !== g.latch);
      const restOthers = () => others.filter((n) => { const o = off(V, g.ctrls[n]); return o && !atRest(o); });
      // ready rows with the gun up; the rest at rest
      for (const [name, R] of Object.entries(rows)) {
        if (!g.ctrls[name] || R.turns) continue;
        const o = off(V, g.ctrls[name]);
        if (R.ready) ok(o && moved(o, R), key + '.' + name + ': with the gun up off its rest by its travel (' + (o ? (R.turn != null ? o.ang.toFixed(3) + ' rad of ' + R.turn : (o.d * 1000).toFixed(2) + ' mm of ' + (R.slide * 1000).toFixed(1)) : '?') + ')');
        else if (!R.fire) ok(o && atRest(o), key + '.' + name + ': on its rest outside the reload');
      }
      ok(restOthers().length === 0, key + ': the controls with no row stay on their rest (' + restOthers().join(',') + ')');
      // the selector follows X
      if (rows.selector && rows.selector.turns && g.ctrls.selector && T.toggleFireMode) {
        const before = V.info.controls && V.info.controls.selector, m = T.toggleFireMode();
        for (let i = 0; i < 20; i++) T.stepFrame(1 / 30);
        const after = V.info.controls && V.info.controls.selector, o = off(V, g.ctrls.selector), want = rows.selector.turns[m];
        ok(m && want != null && Math.abs(after - want) < 1e-3 && o && Math.abs(o.ang - Math.abs(want)) < 0.02, key + '.selector: X to ' + m + ' turns it to ' + want + ' (was ' + (before != null ? before.toFixed(3) : '?') + ', now ' + (after != null ? after.toFixed(3) : '?') + ', ' + (o ? o.ang.toFixed(3) : '?') + ' rad off the model)');
        T.toggleFireMode(); for (let i = 0; i < 20; i++) T.stepFrame(1 / 30);
        ok(Math.abs((V.info.controls.selector || 0) - (before || 0)) < 1e-3, key + '.selector: back with X');
      }
      // reload rows: empty reload, each beat held at its middle and after it
      const rl = Object.entries(rows).filter(([n, R]) => R.reload && g.ctrls[n]);
      if (rl.length && VM_POSES[key].reload) {
        T.setAmmoDbg(key, 0); T.startReload();
        try {
          for (const [name, R] of rl) {
            const list = Array.isArray(R.reload[0]) ? R.reload : [R.reload];
            for (const b of list) {
              T.reloadClipDbg.hold(beatMid(b)); for (let j = 0; j < 4; j++) T.stepFrame(1 / 60);
              const o = off(V, g.ctrls[name]);
              ok(o && moved(o, R), key + '.' + name + ': held at ' + beatMid(b).toFixed(3) + ' of the empty reload off its rest by its travel (' + (o ? (R.turn != null ? o.ang.toFixed(3) + ' rad' : (o.d * 1000).toFixed(2) + ' mm') : '?') + ')');
              const after = Math.min(0.999, b[3] + 0.01);
              if (!list.some((c) => after >= c[0] && after <= c[3])) {
                T.reloadClipDbg.hold(after); for (let j = 0; j < 4; j++) T.stepFrame(1 / 60);
                const o2 = off(V, g.ctrls[name]);
                ok(o2 && (R.ready ? moved(o2, R) : atRest(o2)), key + '.' + name + ': back on its rest after its beat (' + after.toFixed(3) + ')');
              }
            }
          }
        } finally { T.reloadClipDbg.hold(null); }
        for (let i = 0; i < 400 && T.getReloadDbg().timer > 0; i++) T.stepFrame(1 / 30);
        // empty-only rows sit still in a reload with rounds left
        const em = rl.filter(([, R]) => R.empty);
        if (em.length) {
          T.setAmmoDbg(key, 3); T.startReload();
          try {
            for (const [name, R] of em) {
              const u = tacticalU(key, beatMid(R.reload)); if (u > 1) { ok(true, key + '.' + name + ': its beat is past the end of a reload with rounds left'); continue; }
              T.reloadClipDbg.hold(u); for (let j = 0; j < 4; j++) T.stepFrame(1 / 60);
              const o = off(V, g.ctrls[name]);
              ok(o && atRest(o), key + '.' + name + ': not worked in a reload with rounds left (' + (o ? (o.d * 1000).toFixed(2) + ' mm' : '?') + ')');
            }
          } finally { T.reloadClipDbg.hold(null); }
          for (let i = 0; i < 400 && T.getReloadDbg().timer > 0; i++) T.stepFrame(1 / 30);
        }
      }
      // ready rows go back to their rest as the gun goes down (a change to another gun, half way)
      const rd = Object.entries(rows).filter(([n, R]) => R.ready && g.ctrls[n]);
      if (rd.length) {
        const other = key === 'pistol' ? 'm4' : 'pistol';
        T.setWeapon(T.WEAPON_ORDER.indexOf(other));
        let lowK = null;
        for (let i = 0; i < 120; i++) { T.stepFrame(1 / 60); const v = T.viewmodelDbg(); if (v.info.key !== key) break; if (v.info.raise < 0.3) { lowK = v.info.raise; break; } }
        if (lowK != null) for (const [name, R] of rd) { const o = off(V, g.ctrls[name]); ok(o && (R.turn != null ? o.ang < Math.abs(R.turn) * 0.5 : o.d < Math.abs(R.slide) * 0.5), key + '.' + name + ': going back on safe as the gun goes down (raise ' + lowK.toFixed(2) + ')'); }
        else info(key + ': the gun went down too fast to see it half way');
        T.setAmmoDbg(key, 999);
      }
    }
    ok(errs.length === 0, 'no page errors (' + errs.slice(0, 2).join(' | ') + ')');
  } catch (e) { ok(false, 'threw: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' / ') : e)); }
  return out.join('\n');
})();
