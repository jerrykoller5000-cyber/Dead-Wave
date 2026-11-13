// tch1b - CH-1 (Claude 8; Jerry's J151 playtest, 13 Nov 2026, note 10: "Floating random red dot off to left of screen
// using shotgun", screenshot 02: a red-dot optic hanging in the air left of the first-person view). In first person his
// own guns on him (slung on his back, in the chest holsters, the pack's second-gun holsters) are out of the eye's pass,
// as his arms and the gun in his hand are, and stay out of it when a copy is re-made: a camo or laser change at the
// workbench (a copy with the same number of parts) and an optic fitted to a slung gun are hidden at once, not after the
// node count catches up.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };
  const D = T.trainingDbg;
  try {
    if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting();
    const nameEl = document.getElementById('playerName'); if (nameEl) nameEl.value = 'Trainee';
    document.getElementById('modeTraining').click();
    ok(await until(() => D.state().active, 20000), 'the Training Ground is up');
    await wait(2000);
    T.grantAllWeapons(); T.setUnarmedDbg && T.setUnarmedDbg(false);
    for (let i = 0; i < 16 && T.getCurrentWeapon() !== 'shotgun'; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf('shotgun')); await wait(150); }
    T.opticDbg.grant('shotgun', 'rmr'); T.opticDbg.fit('shotgun', 'rmr');
    T.setViewFirstDbg(true);
    const vm = () => T.viewmodelDbg();
    ok(await until(() => vm() && vm().info.active && vm().filtering, 20000), 'first person with the pump gun and its RMR');
    const vis = (o) => { for (let x = o; x; x = x.parent) if (x.visible === false) return false; return true; };
    const drawn = () => {
      const r = T.getMarine().userData.carry, res = { n: 0, shown: 0, where: {} };
      if (!r) return res;
      for (const [name, list] of [['sling', r.slings], ['holster', r.holsters], ['pair', r.pairs]]) for (const s of list) {
        if (!s || !s.g) continue;
        s.g.traverse((o) => { if (o.isMesh && vis(o) && o !== s.shell && !o.userData.fittedHolster) {   /* the guns; a holster's leather shell is gear, worn like the vest */ res.n++; if (!vm().isEyeHidden(o)) { res.shown++; const k = name + ':' + (s.kind || '-'); res.where[k] = (res.where[k] || 0) + 1; if (res.shown <= 3) res.where['#' + res.shown] = (o.name || '?') + '<' + (o.parent && o.parent.name) + '<' + (o.parent && o.parent.parent && o.parent.parent.name) + ' ' + (o.isInstancedMesh ? 'inst ' : '') + (o.userData.vmEyeHide === undefined ? 'never' : o.userData.vmEyeHide); } } });
      }
      return res;
    };
    const say = (r) => r.shown + ' of ' + r.n + ' drawn' + (r.shown ? ' ' + JSON.stringify(r.where) : '');
    T.updateCarriedGear(0, true);
    // The rounds in a holstered revolver's cylinder come and go with its node count (MU-11's 15-frame count): give the
    // page (a few frames a second here) time for it; the pair holsters were never hidden at all.
    await until(() => drawn().shown === 0, 9000);
    const slung = T.carryDbg().slung.filter(Boolean);
    let r = drawn();
    ok(r.n > 20 && r.shown === 0, 'his slung and holstered guns (and the pack\'s pair holsters) are out of the eye (' + say(r) + ')');
    // A re-made copy with as many parts: a camo on the first slung gun, then its laser off and on.
    const k0 = slung[0], k1 = slung[1] || slung[0];
    T.armoryFinishDbg.paint(k0, 'm81'); T.updateCarriedGear(0, true); await wait(250);
    r = drawn(); ok(r.shown === 0, 'a camo on the slung ' + k0 + ': still out of the eye at once (' + say(r) + ')');
    T.armoryDbg.fit(k1, 'laserLight', false); T.updateCarriedGear(0, true); await wait(250);
    r = drawn(); ok(r.shown === 0, 'its laser off on the slung ' + k1 + ': still out of the eye (' + say(r) + ')');
    T.armoryDbg.fit(k1, 'laserLight', true); T.updateCarriedGear(0, true); await wait(250);
    r = drawn(); ok(r.shown === 0, 'and on again (' + say(r) + ')');
    // An optic on a slung gun.
    T.opticDbg.grant(k0, 'rmr'); const fitted = T.opticDbg.fit(k0, 'rmr'); T.updateCarriedGear(0, true); await wait(250);
    r = drawn(); ok(fitted && r.shown === 0, 'an RMR fitted to the slung ' + k0 + ' is out of the eye at once (' + say(r) + ')');
    await wait(2500);
    r = drawn(); ok(r.shown === 0, 'and stays out (' + say(r) + ')');
    // The gun in his hand: a camo change keeps it out of the eye too.
    T.armoryFinishDbg.paint('shotgun', 'ucp'); await wait(250);
    let n = 0, shown = 0; T.weaponMeshes.shotgun.traverse((o) => { if (o.isMesh && vis(o)) { n++; if (!vm().isEyeHidden(o)) shown++; } });
    ok(n > 10 && shown === 0, 'a camo on the gun in his hand: his body\'s copy stays out of the eye (' + shown + ' of ' + n + ' drawn)');
    ok(errs.length === 0, 'no page errors (' + errs.slice(0, 2).join(' | ') + ')');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})()
