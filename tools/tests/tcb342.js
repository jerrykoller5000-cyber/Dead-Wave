// tcb342 - CD-24 D (Jerry D-240 #2, Director GO; Claude 2): a trigger press made in the last 0.15 s of a reload was dropped
// (ChatGPT GP-20239 and GP-20252, natively: M4, KR-7, Wasp, Breacher, pistol, revolver and sniper lost a tap 108-145 ms before
// ready; the player had to press again). Now it is kept for that reload and fired once on the first update the gun can fire.
// Unchanged: a press earlier in the reload is not kept (tcb341's reload case), a press kept for a reload that is cancelled
// (another gun) or a focus loss never fires, the pump's press still stops its reload, the revolver still needs its pull (J118).
// Real canvas mouse events, real frames (TT.stepFrame), Training, 1P and 3P.
// budget: 420
(async () => {
  const T = window.TT, out = [], ok = (v, s) => out.push((v ? 'PASS ' : 'FAIL ') + s);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms = 30000) => { const t = performance.now(); while (performance.now() - t < ms) { if (f()) return true; await wait(40); } return !!f(); };
  const canvas = T.renderer.domElement, dt = 1 / 60;
  const frames = (n, step = dt) => { for (let i = 0; i < n; i++) T.stepFrame(step); };
  const ammo = (w) => T.getAmmo()[w];
  const mouse = (type, buttons) => {
    const b = canvas.getBoundingClientRect();
    canvas.dispatchEvent(new MouseEvent(type, { button: 0, buttons, clientX: b.left + b.width / 2, clientY: b.top + b.height / 2, bubbles: true, cancelable: true }));
  };
  const down = () => mouse('mousedown', 1), up = () => mouse('mouseup', 0), click = () => { down(); up(); };
  const key = (code, k) => { for (const type of ['keydown', 'keyup']) document.dispatchEvent(new KeyboardEvent(type, { code, key: k, bubbles: true, cancelable: true })); };
  const left = () => T.getReloadDbg().timer;
  const ready = (w) => {
    up();
    if (T.isUnarmed()) { T.toggleHolster(); frames(30); }   // Training starts him holstered; drawing gives back the holstered gun
    for (let i = 0; i < 4 && T.getCurrentWeapon() !== w; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf(w)); frames(20); }
    if (!T.setMagazinesDbg(w, 2, [99, 99, 99])) T.setAmmoDbg(w, 2);
    frames(40);
    for (let i = 0; i < 120 && (T.isReloading() || T.getSwapDbg().fireCooldown > 0 || T.getSwapDbg().swapT > 0); i++) frames(1);
    if (T.getCurrentWeapon() !== w || T.isReloading() || T.getSwapDbg().fireCooldown > 0)
      throw Error('not ready for ' + w + ' ' + JSON.stringify({ owned: T.getWeaponOwned()[w], vault: T.vaultDbg?.flags?.(), cur: T.getCurrentWeapon(), reloading: T.isReloading(), unarmed: T.isUnarmed(), ammo: ammo(w), ...T.getSwapDbg(), reload: T.getReloadDbg() }));
  };
  // R, then frames until the reload has `at` s left (or less); returns the rounds in the gun at that moment.
  const reloadTo = (w, at) => {
    key('KeyR', 'r'); frames(1);
    if (!T.isReloading()) throw Error(w + ' did not start its reload');
    for (let i = 0; i < 600 && T.isReloading() && left() > at; i++) frames(1);
    if (!T.isReloading()) throw Error(w + ' reload ended before ' + at + ' s left');
    return ammo(w);
  };
  const finish = () => { for (let i = 0; i < 600 && T.isReloading(); i++) frames(1); };
  try {
    if (window.DWOpening?.dismissForTesting) DWOpening.dismissForTesting();
    const name = document.getElementById('playerName'); if (name) name.value = 'CD-24';
    if (!T.trainingDbg.state().active) document.getElementById('modeTraining').click();
    ok(await until(() => T.trainingDbg.state().active), 'Training Ground opened');
    ok(await until(() => !document.getElementById('trainingBlackout')?.classList.contains('on'), 20000), 'entry blackout cleared');
    T.flightHold(true);
    T.grantAllWeapons();
    frames(30);
    for (const first of [true, false]) {
      T.setViewFirstDbg(first);
      const view = first ? '1P' : '3P';
      for (const w of first ? ['m4', 'ak', 'uzi', 'aa12', 'pistol', 'sniper'] : ['m4', 'pistol']) {
        // Earlier in the reload (0.4 s before ready): not kept, as before. Its loaded count is the gun's full count.
        ready(w);
        reloadTo(w, 0.4);
        click(); finish();
        const full = ammo(w); frames(40);
        ok(ammo(w) === full, view + ' ' + w + ': a tap 0.4 s before ready is not kept (loaded ' + full + ', after ' + ammo(w) + ')');
        // The bug: a tap 0.12 s before ready (inside the 0.15 s window). Fired once, on the update the reload ends.
        ready(w);
        reloadTo(w, 0.12);
        click();
        const kept = T.isReloading();
        finish(); frames(40);
        ok(kept && ammo(w) === full - 1, view + ' ' + w + ': a tap 0.12 s before ready fires once as the gun comes ready (full ' + full + ', after ' + ammo(w) + ')');
      }
    }
    T.setViewFirstDbg(true);
    // A kept tap dies with its reload: another gun in the window, then back.
    ready('m4');
    reloadTo('m4', 0.12); click();
    T.setWeapon(T.WEAPON_ORDER.indexOf('pistol')); frames(30);
    const pa = ammo('pistol'); frames(30);
    T.setWeapon(T.WEAPON_ORDER.indexOf('m4')); frames(60);
    ok(ammo('pistol') === pa && !T.isReloading(), 'a weapon change in the window drops the kept tap (pistol ' + pa + ' -> ' + ammo('pistol') + ')');
    // Focus loss drops it.
    ready('ak');
    reloadTo('ak', 0.12); click(); window.dispatchEvent(new Event('blur')); finish();
    const fa = ammo('ak'); frames(40);
    ok(ammo('ak') === fa, 'focus loss drops the kept tap (loaded ' + fa + ', after ' + ammo('ak') + ')');
    // Held through the end of the reload on a semi gun (the sniper): one shot as it comes ready (it was none: no new edge).
    ready('sniper'); reloadTo('sniper', 0.4); click(); finish(); const sFull = ammo('sniper');
    ready('sniper'); reloadTo('sniper', 0.12); down(); finish(); frames(60); up(); frames(10);
    ok(ammo('sniper') === sFull - 1, 'sniper: a press held through the end of the reload fires once (full ' + sFull + ', after ' + ammo('sniper') + ')');
    // The revolver still needs its pull (J118): a quick tap in the window, nothing; unchanged.
    ready('revolver');
    T.setMagazinesDbg('revolver', 2, [6, 6]); frames(20);
    reloadTo('revolver', 0.12); click(); finish();
    const ra = ammo('revolver'); frames(40);
    ok(ammo('revolver') === ra, 'revolver: a quick tap in the window still fires nothing (J118 pull) (loaded ' + ra + ', after ' + ammo('revolver') + ')');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  finally { try { up(); T.flightHold(false); } catch (e) {} }
  return out.join('\n');
})();
