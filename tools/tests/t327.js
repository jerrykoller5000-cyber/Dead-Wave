// t327 - CU-228 (Jerry's J56, again after CU-190). In the Training Ground, in first person, a menu
// used to keep the pointer locked. Pause returns before updateOts, and that was the only place
// the lock was released, so the kiosk, the armory, the medical CIF, the HQ panel and the range
// console never let go. Each one has to hold the pointer, keep releasing it while it is up, and
// ask for the lock back when it closes. The build wheel and the weapon wheel do not pause.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };
  const D = T.trainingDbg;
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const held = async (name, open, close) => {
    const n = T.panelPointerDbg();
    const opened = open();
    await wait(400);
    ok(opened !== false && T.menuHoldsDbg(), name + ' holds the pointer');
    ok(T.panelPointerDbg() > n, name + ' still releases the pointer while it is up (' + (T.panelPointerDbg() - n) + ' frames)');
    ok(document.pointerLockElement == null, name + ' is not pointer-locked');
    close();
    await wait(250);
    ok(!T.menuHoldsDbg(), name + ' let go');
    ok(T.lockWantDbg() === true, name + ' asked for the lock back (' + T.lockWantDbg() + ')');
  };
  try {
    if (!T.panelPointerDbg || !T.menuHoldsDbg || !T.openMenuDbg || !D || !D.openPanel) { ok(false, 'the hooks are there'); return out.join('\n'); }
    if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting();
    const nameEl = document.getElementById('playerName'); if (nameEl) nameEl.value = 'Trainee';
    document.getElementById('modeTraining').click();
    ok(await until(() => D.state().active, 20000), 'the Training Ground is up');
    T.setViewFirstDbg(true);
    ok(await until(() => T.fpDbg().first && T.fpDbg().w > 0.9, 20000), 'first person (' + (T.fpDbg().w || 0).toFixed(2) + ')');
    await held('the kiosk', () => T.openMenuDbg('shop'), () => T.closeMenuDbg('shop'));
    await held('the medical room', () => T.openMenuDbg('cif'), () => T.closeMenuDbg('cif'));
    await held('the armory', () => T.openMenuDbg('armory'), () => T.closeMenuDbg('armory'));
    await held('the HQ panel', () => D.openPanel(), () => D.panel().close());
    await held('the range console', () => { T.rangeDbg.open(); return T.rangeDbg.read ? true : true; }, () => T.rangeDbg.exit());
    await held('pause', () => T.openMenuDbg('pause'), () => T.closeMenuDbg('pause'));
    await held('the build wheel', () => {
      const b = D.tg().build, x = ((b.minGX + b.maxGX) / 2) * b.grid + b.offset, z = ((b.minGZ + b.maxGZ) / 2) * b.grid + b.offset;
      T.player.position.set(x, D.tg().floorY, z);
      return T.openWheel('build') && T.getWheelState().kind === 'build';
    }, () => T.closeWheelDbg());
    await held('the weapon wheel', () => T.openMenuDbg('wheel'), () => T.closeMenuDbg('wheel'));
    ok(errs.length === 0, 'no page errors (' + errs.slice(0, 2).join(' | ') + ')');
  } catch (e) {
    ok(false, 't327 threw: ' + String((e && e.stack) || e).slice(0, 400));
  } finally {
    try { T.closeMenuDbg && T.closeMenuDbg('shop'); T.closeMenuDbg && T.closeMenuDbg('cif'); T.closeMenuDbg && T.closeMenuDbg('armory'); T.closeMenuDbg && T.closeMenuDbg('pause'); T.closeMenuDbg && T.closeMenuDbg('wheel'); } catch (_) {}
    try { if (D && D.panel && D.panel()) D.panel().close(); } catch (_) {}
    try { if (T.rangeDbg && T.rangeDbg.exit) T.rangeDbg.exit(); } catch (_) {}
    try { if (T.closeWheelDbg) T.closeWheelDbg(); } catch (_) {}
    try { T.setViewFirstDbg && T.setViewFirstDbg(false); } catch (_) {}
  }
  return out.join('\n');
})()
