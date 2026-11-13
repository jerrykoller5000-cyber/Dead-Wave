// tcb333 - CB-331 (J151 note 2; Claude 5's CE-11 ask; ChatGPT 2's GT-20104 contract): the third-person pistol's barrel
//  follows its slide as the view's does. Slide travel s (gun units back from rest): the barrel goes back with it its
//  first 4 mm (j = min(s, .004)), then over the next 4 mm (u = clamp((s - .004) / .004)) its chamber drops 10 mm and it
//  tilts 0.05 rad (rx = base - .05 u). Through the reload's rack (to u = 1) and back home at rest.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };
  try {
    await startMatch(T, 'Barrel');
    T.clearZombies && T.clearZombies(); T.setHp(100000); T.grantAllWeapons();
    for (let i = 0; i < 16 && T.getCurrentWeapon() !== 'pistol'; i++) T.setWeapon(i);
    await until(() => T.getCurrentWeapon() === 'pistol', 3000); await wait(600);
    const gun = T.weaponMeshes.pistol, ud = gun && gun.userData, b = ud && ud.barrelAssembly;
    ok(!!(b && ud.slide && ud.baseSlidePos), 'the pistol has its slide and barrel assembly');
    const base = { x: b.position.x, y: b.position.y, z: b.position.z, rx: ud.baseBarrelRotX || 0 };
    let worst = 0, maxU = 0, n = 0;
    const check = () => {
      const s = Math.max(0, ud.baseSlidePos.z - ud.slide.position.z), j = Math.min(s, 0.004), u = Math.min(1, Math.max(0, (s - 0.004) / 0.004));
      const e = Math.max(Math.abs(b.position.x - base.x), Math.abs(b.position.y - (base.y - 0.010 * u)), Math.abs(b.position.z - (base.z - j)), Math.abs(b.rotation.x - (base.rx - 0.05 * u)));
      worst = Math.max(worst, e); maxU = Math.max(maxU, u); n++;
    };
    // the reload's rack
    T.setAmmoDbg && T.setAmmoDbg('pistol', 0);
    T.startReload();
    const t0 = Date.now();
    while (Date.now() - t0 < 6000 && (T.isReloading ? T.isReloading() : true)) { T.stepFrame(1 / 60); check(); }
    ok(n > 20 && maxU > 0.99, 'the reload racks the slide past the unlock (' + n + ' frames, u up to ' + maxU.toFixed(2) + ')');
    ok(worst < 1e-4, 'every frame the barrel is where the contract puts it for the slide (worst ' + worst.toExponential(1) + ')');
    for (let i = 0; i < 30; i++) T.stepFrame(1 / 60);
    const home = Math.max(Math.abs(b.position.y - base.y), Math.abs(b.position.z - base.z), Math.abs(b.rotation.x - base.rx));
    ok(home < 1e-4, 'and it is home with the slide after (' + home.toExponential(1) + ')');
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e.message)); }
  return out.join('\n');
})()
