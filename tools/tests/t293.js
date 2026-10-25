// t293 - CL-260 (Jerry, 2026-10-25: "The cursor cross-hairs need to contract upon zoom not get further apart."). Aiming
// steadies the gun: right-click tightens the cone the next round is thrown in (AIM_SPREAD_MUL), so the reticle's ticks
// close on screen while the view magnifies, in third person (the 2x zoom) and in first person (down the sights).
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  let held = false;
  try {
    await startMatch(T, 'Reticle');
    T.clearZombies && T.clearZombies(); T.runDevCommand('godmode'); T.grantAllWeapons();
    // The shotgun: its cone is wide enough that the ticks sit well off their 7 px floor.
    for (let i = 0; i < 16 && T.getCurrentWeapon() !== 'shotgun'; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf('shotgun')); await wait(150); }
    ok(T.getCurrentWeapon() === 'shotgun', 'a shotgun');
    const ret = document.getElementById('reticle');
    const sp = () => parseFloat(getComputedStyle(ret).getPropertyValue('--sp')) || parseFloat(ret.style.getPropertyValue('--sp')) || 0;
    const settle = async () => { let last = -1; for (let i = 0; i < 40; i++) { await wait(150); const v = sp(); if (Math.abs(v - last) < 0.3) return v; last = v; } return sp(); };
    // Third person: the cursor on the canvas, then the zoom.
    const canvas = T.renderer ? T.renderer.domElement : document.querySelector('canvas');
    const r = canvas.getBoundingClientRect();
    canvas.dispatchEvent(new PointerEvent('pointermove', { clientX: r.left + r.width * 0.6, clientY: r.top + r.height * 0.4, bubbles: true }));
    await wait(800);
    const hip3 = await settle();
    T.setZoomHeldDbg(true); held = true;
    ok(await until(() => T.aimZoomDbg().w > 0.99, 6000), 'third person: the zoom comes in');
    const zoom3 = await settle();
    ok(hip3 > 0 && zoom3 < hip3, 'third person: the ticks close on the zoom (' + hip3.toFixed(1) + ' -> ' + zoom3.toFixed(1) + ' px)');
    T.setZoomHeldDbg(false); held = false;
    await until(() => T.aimZoomDbg().w < 0.01, 6000);
    // First person: down the sights.
    T.setViewFirstDbg(true);
    await until(() => T.fpDbg().w > 0.95, 12000);
    const hip1 = await settle();
    T.setZoomHeldDbg(true); held = true;
    ok(await until(() => T.fpDbg().ads > 0.99, 9000), 'first person: down the sights');
    const ads1 = await settle();
    ok(hip1 > 0 && ads1 < hip1, 'first person: the ticks close down the sights (' + hip1.toFixed(1) + ' -> ' + ads1.toFixed(1) + ' px)');
    T.setZoomHeldDbg(false); held = false;
    T.setViewFirstDbg(false);
    T.runDevCommand('godmode off');
    ok(errs.length === 0, 'no errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  if (held) T.setZoomHeldDbg(false);
  return out.join('\n');
})()
