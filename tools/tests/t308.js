// t308 - CU-190 (Jerry's J27): a menu opened in first person lets go of the pointer, and closing it asks for the
// lock back. One pass per panel that can open from a match: the armory, the CIF, the shop, pause, settings,
// the HQ briefing, the dev console, the map and the weapon wheel. The training panel sets paused, which the
// pause pass covers.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const panels = ['shop', 'cif', 'armory', 'pause', 'settings', 'briefing', 'dev', 'map', 'wheel'];
  try {
    if (!T.openMenuDbg || !T.closeMenuDbg || !T.menuHoldsDbg || !T.setViewFirstDbg) { ok(false, 'the hooks are there'); return out.join('\n'); }
    await startMatch(T, 'Menu pointer');
    T.clearZombies && T.clearZombies(); T.skipGrace && T.skipGrace();
    T.setViewFirstDbg(true);
    ok(await until(() => T.fpDbg().first && T.fpDbg().w > 0.9, 20000), 'first person (' + (T.fpDbg().w).toFixed(2) + ')');
    for (const name of panels) {
      const opened = T.openMenuDbg(name);
      await wait(200);
      ok(opened && T.menuHoldsDbg(), name + ' holds the pointer');
      ok(document.pointerLockElement == null, name + ' is not pointer-locked');
      T.closeMenuDbg(name);
      await wait(250);
      ok(!T.menuHoldsDbg(), name + ' let go');
      ok(T.lockWantDbg() === true, name + ' asked for the lock back (' + T.lockWantDbg() + ')');
    }
    ok(errs.length === 0, 'no page errors (' + errs.slice(0, 2).join(' | ') + ')');
  } catch (e) {
    ok(false, 't308 threw: ' + String((e && e.stack) || e).slice(0, 300));
  } finally {
    if (T.closeMenuDbg) for (const name of panels) { try { T.closeMenuDbg(name); } catch (_) {} }
    T.setViewFirstDbg && T.setViewFirstDbg(false);
  }
  return out.join('\n');
})()
