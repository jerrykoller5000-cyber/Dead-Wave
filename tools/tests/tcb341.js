// tcb341 - CB-374 (Jerry D-237 #8, rank 1 of GP-20220's plan; fix by ChatGPT GP-20221, landed by Claude 2): a quick semi tap
// on the pistol or the M4 was lost when the button went down AND up between two game updates (the release cleared the press
// before tryFire saw it: 0 of 8 fired natively). Now a ready press is kept until the next update and fired there once,
// through the normal firing path, with every gate checked again. Nothing else changes: a press during the cooldown is not
// queued, a held press still fires once, auto still sprays while held and stops on release, the revolver still needs its
// pull, and a kept press is dropped on focus loss, pause, the map, holstering, a weapon change, the fire selector, reload
// and an empty magazine. Real canvas mouse events, real frames (TT.stepFrame), Training, 3P and 1P.
(async () => {
  const T = window.TT, out = [], ok = (v, s) => out.push((v ? 'PASS ' : 'FAIL ') + s);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms = 30000) => { const t = performance.now(); while (performance.now() - t < ms) { if (f()) return true; await wait(40); } return !!f(); };
  const canvas = T.renderer.domElement, dt = 1 / 60;
  const frames = (n, step = dt) => { for (let i = 0; i < n; i++) T.stepFrame(step); };
  const ammo = (w) => T.getAmmo()[w];
  const lastShot = () => T.heardShotDbg().lastShotNoise?.t ?? null;
  const mouse = (type, buttons) => {
    const b = canvas.getBoundingClientRect();
    const e = new MouseEvent(type, { button: 0, buttons, clientX: b.left + b.width / 2, clientY: b.top + b.height / 2, bubbles: true, cancelable: true });
    canvas.dispatchEvent(e);
    return e.defaultPrevented;
  };
  const down = () => mouse('mousedown', 1), up = () => mouse('mouseup', 0);
  const click = () => { const r = down(); up(); return r; };
  const key = (code, k) => { for (const type of ['keydown', 'keyup']) document.dispatchEvent(new KeyboardEvent(type, { code, key: k, bubbles: true, cancelable: true })); };
  const ready = (w, semi = true) => {
    up();
    if (T.getCurrentWeapon() !== w) T.setWeapon(T.WEAPON_ORDER.indexOf(w));
    if (T.isUnarmed()) T.toggleHolster();
    if (w === 'm4') {
      const hud = document.getElementById('ammoDetail'), re = semi ? /SEMI/ : /AUTO/;
      if (!re.test(hud.textContent)) T.toggleFireMode();
      if (!re.test(hud.textContent)) throw Error('M4 would not go to ' + (semi ? 'SEMI' : 'AUTO'));
    }
    T.setMagazinesDbg(w, w === 'revolver' ? 6 : 10, [w === 'm4' ? 30 : 12]);
    frames(36);
    if (T.getCurrentWeapon() !== w || T.isReloading() || T.vaultDbg.flags().blocked || T.getSwapDbg().fireCooldown > 0) throw Error('not ready for ' + w);
  };
  const cancelled = (w, label, action, afterDown = true) => {
    ready(w);
    const before = ammo(w), noise = lastShot();
    if (afterDown) { click(); action(); } else action();
    frames(3);
    ok(ammo(w) === before && lastShot() === noise, label + ' (rounds ' + before + ' -> ' + ammo(w) + ')');
  };
  try {
    if (window.DWOpening?.dismissForTesting) DWOpening.dismissForTesting();
    const name = document.getElementById('playerName'); if (name) name.value = 'CB-374';
    if (!T.trainingDbg.state().active) document.getElementById('modeTraining').click();
    ok(await until(() => T.trainingDbg.state().active), 'Training Ground opened');
    ok(await until(() => !document.getElementById('trainingBlackout')?.classList.contains('on'), 20000), 'entry blackout cleared');
    T.flightHold(true);
    T.grantAllWeapons();
    for (const first of [false, true]) {
      T.setViewFirstDbg(first);
      if (T.fpDbg().first !== first) throw Error('viewpoint not set');
      const view = first ? '1P' : '3P';
      for (const w of ['pistol', 'm4']) {
        const label = view + ' ' + w;
        // The bug: down and up before the next update.
        ready(w);
        let a = ammo(w);
        const handled = click(), released = !T.vaultDbg.flags().mouseFireHeld, immediate = ammo(w);
        frames(1); const next = ammo(w); frames(26);
        ok(handled && released && immediate === a && next === a - 1 && ammo(w) === next,
          label + ': a tap that goes down and up between two updates fires once on the next update (in handler ' + (a - immediate) + ', next ' + (a - next) + ', after ' + (a - ammo(w)) + ')');
        // The same tap with one long frame (a hitch) after it: still one shot, not two.
        ready(w);
        a = ammo(w);
        click(); frames(1, 0.25); frames(20);
        ok(a - ammo(w) === 1, label + ': a tap followed by a 250 ms frame fires once (' + (a - ammo(w)) + ')');
        // Held press (t133's case, through the real canvas): once, however long it is held.
        ready(w);
        a = ammo(w);
        down(); down(); frames(26); up(); frames(1);
        ok(a - ammo(w) === 1, label + ': a held press fires once (' + (a - ammo(w)) + ')');
        // A tap during the cooldown is not kept for later (that is a separate decision).
        ready(w);
        a = ammo(w);
        down(); frames(1); up(); frames(1);
        const cd = T.getSwapDbg().fireCooldown;
        click(); frames(26);
        ok(cd > 0 && a - ammo(w) === 1, label + ': a tap during the cooldown is not queued (cooldown ' + cd.toFixed(3) + ', shots ' + (a - ammo(w)) + ')');
      }
    }
    T.setViewFirstDbg(false);
    cancelled('pistol', 'focus loss drops a kept tap', () => window.dispatchEvent(new Event('blur')));
    cancelled('pistol', 'pause and resume drop a kept tap', () => { key('Escape', 'Escape'); key('Escape', 'Escape'); });
    cancelled('pistol', 'a tap while paused is not kept', () => { key('Escape', 'Escape'); click(); key('Escape', 'Escape'); }, false);
    cancelled('pistol', 'opening and closing the map drop a kept tap', () => { key('Tab', 'Tab'); key('Tab', 'Tab'); });
    cancelled('pistol', 'holster and draw again drop a kept tap', () => { key('Digit4', '4'); key('Digit4', '4'); });
    cancelled('pistol', 'a weapon change and back drop a kept tap', () => { T.setWeapon(T.WEAPON_ORDER.indexOf('m4')); T.setWeapon(T.WEAPON_ORDER.indexOf('pistol')); });
    cancelled('m4', 'the fire selector there and back drops a kept tap', () => { key('KeyX', 'x'); key('KeyX', 'x'); });
    ready('pistol');
    const r0 = ammo('pistol'), rShot = lastShot();
    click(); key('KeyR', 'r');
    const started = T.isReloading();
    click(); frames(104);
    ok(started && !T.isReloading() && ammo('pistol') > r0 && lastShot() === rShot, 'reload drops a kept tap and a tap during it (reload ' + started + ', loaded ' + ammo('pistol') + ')');
    ready('pistol');
    T.setMagazinesDbg('pistol', 0, []);
    click();
    T.setMagazinesDbg('pistol', 10, [12]);
    frames(3);
    ok(ammo('pistol') === 10, 'a tap on an empty gun is not fired later when rounds arrive (' + ammo('pistol') + ')');
    ready('m4', false);
    const au0 = ammo('m4');
    click(); frames(1);
    const au1 = ammo('m4');
    down(); frames(24); up();
    const au2 = ammo('m4');
    frames(24);
    ok(au0 === au1 && au1 - au2 >= 3 && ammo('m4') === au2, 'auto is unchanged: a tap between updates fires nothing, held sprays, release stops (' + (au0 - au1) + ', ' + (au1 - au2) + ', ' + (au2 - ammo('m4')) + ')');
    ready('revolver');
    const rv0 = ammo('revolver');
    click(); frames(1);
    down(); frames(3); up(); frames(12);
    const rv1 = ammo('revolver');
    down(); frames(8); up(); frames(1);
    ok(rv1 === rv0 && rv0 - ammo('revolver') === 1, 'the revolver still needs its full pull (' + (rv0 - rv1) + ', ' + (rv1 - ammo('revolver')) + ')');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  finally { try { up(); T.flightHold(false); } catch (e) {} }
  return out.join('\n');
})();
