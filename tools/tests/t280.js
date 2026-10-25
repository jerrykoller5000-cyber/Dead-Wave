// t280 - CL-250 (GB-223, Grokbot's first-person review of CL-249 as the guns' owner): from his eyes at the hip only a
// muzzle tip showed at the bottom edge, and down the uzi's sights his support fist filled the upper view. With the 5 key:
//  - at the hip he carries the gun up at the ready (a shouldered gun FP_READY of the way to its aimed seat, the others
//    FP_LIFT higher), so the muzzle is well above where the plain carry puts it; third person is unchanged;
//  - down the uzi's sights his support arm is out of the view, and back when he lets go.
// CL-260 part 2: the ready is now the ready and the hip carry (FP_HIP, FP_HIP_HAND) together, against the plain carry.
// CL-252: the page keeps its own colours under the browser's forced colours (GB-225: the scope's glass went missing).
// CL-260 part 2: first person's way in gets 20 s (the gun now in view at the hip is more for the 2-core box's
// software renderer to draw; it came in at w 0.93 at 12 s).
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  let held = false, def = null;
  try {
    if (!T.fpTuneDbg || !T.fpDbg) { ok(false, 'the CL-250 hooks are there'); return out.join('\n'); }
    def = T.fpTuneDbg();
    // CL-252 (GB-225): forced colours would turn the scope's glass (CSS gradients) into nothing; the page opts out.
    ok(getComputedStyle(document.documentElement).forcedColorAdjust === 'none' && getComputedStyle(document.getElementById('scopeOverlay')).forcedColorAdjust === 'none', 'the page keeps its own colours under forced colours (the scope\'s glass with them)');
    await startMatch(T, 'Ready');
    T.clearZombies && T.clearZombies(); T.skipGrace && T.skipGrace();
    const arm = async (w) => { T.grantAllWeapons(); for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) T.setWeapon(i); await wait(300); return T.getCurrentWeapon() === w; };
    const F = () => T.fpDbg(), armL = () => T.getMarine().userData.armLG;
    // How much higher the ready puts the muzzle: ready, plain carry, ready again (the idle sway and a settling gun drift;
    // the two ready reads around the plain one take that out), each read an average of a few frames.
    const muzY = async () => { let s = 0; for (let i = 0; i < 6; i++) { s += T.getMuzzleWorld().y; await wait(60); } return s / 6; };
    const lift = async () => {
      T.fpTuneDbg(def); await wait(700); const a1 = await muzY();
      T.fpTuneDbg({ ready: 0, lift: 0, hip: { x: 0, y: 0, z: 0 }, hipHand: { x: 0, y: 0, z: 0 } }); await wait(700); const b = await muzY();   // CL-260 part 2: the plain carry is without the hip carry too
      T.fpTuneDbg(def); await wait(700); const a2 = await muzY();
      return (a1 + a2) / 2 - b;
    };

    // Third person: the tuning does nothing there.
    if (await arm('m4')) {
      await wait(1200);
      T.fpTuneDbg({ ready: 0.9, lift: 0.3 }); await wait(300);
      const ads3 = T.getShoulderDbg().rawAds;
      T.fpTuneDbg(def);
      ok(ads3 < 0.01, 'in third person the ready is not used: the hold is the plain carry (its aim weight ' + ads3.toFixed(3) + ')');
    } else ok(false, 'an m4 in hand');

    T.setViewFirstDbg(true);
    ok(await until(() => F().w > 0.95, 20000), 'the 5 key: first person');
    for (const g of ['m4', 'pistol']) {
      if (!(await arm(g))) { ok(false, 'a ' + g + ' in hand'); continue; }
      await wait(1200);
      const d = await lift();
      if (g === 'm4') ok(T.getShoulderDbg().rawAds > 0.6, 'the m4 at the ready: its aim weight ' + T.getShoulderDbg().rawAds.toFixed(2) + ' (FP_READY ' + def.ready + ')');
      ok(d > 0.04, 'at the hip in first person the ' + g + ' is up at the ready (muzzle ' + d.toFixed(3) + ' m higher)');
    }

    if (await arm('uzi')) {
      ok(armL().visible && !F().armHidden, 'the uzi at the hip: his support arm is there');
      T.setZoomHeldDbg(true); held = true;
      ok(await until(() => F().ads > 0.99, 14000), 'right-click: down the uzi\'s sights');   // CL-260 part 2: 14 s, as CL-252's eases (the 2-core box)
      await wait(200);
      ok(F().armHidden && !armL().visible, 'down the uzi\'s sights his support arm is out of the view');
      T.setZoomHeldDbg(false); held = false;
      ok(await until(() => !F().armHidden && armL().visible, 6000), 'let go: his arm is back');
    } else ok(false, 'an uzi in hand');

    if (await arm('m4')) {
      T.setZoomHeldDbg(true); held = true;
      await until(() => F().ads > 0.99, 9000); await wait(200);
      ok(!F().armHidden && armL().visible, 'down the m4\'s sights his support arm stays (its hand is under the handguard)');
      T.setZoomHeldDbg(false); held = false;
    }

    T.setViewFirstDbg(false);
    ok(await until(() => F().w === 0, 12000) && armL().visible, '5 again: third person, both arms on');
    ok(errs.length === 0, 'no page errors (' + errs.slice(0, 2).join(' | ') + ')');
  } catch (e) {
    ok(false, 't280 threw: ' + String((e && e.stack) || e).slice(0, 300));
  } finally {
    if (held) T.setZoomHeldDbg(false);
    if (def && T.fpTuneDbg) T.fpTuneDbg(def);
    T.setViewFirstDbg && T.setViewFirstDbg(false);
  }
  return out.join('\n');
})()
