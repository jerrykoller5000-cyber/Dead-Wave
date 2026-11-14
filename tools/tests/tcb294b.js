// tcb294b - CB-294 (J133: "The cartridges must reflect their real-world counterparts on all guns. Primarily the spent
// casings."): every gun that throws a case throws its own (studio/weapon-casings.js spentCaseGeometry, GT-20075/GT-20080): the
// case's geometry with its colours in it, at its real size, not the old brass cylinder. Fired by hand: the pistol, the Uzi, the
// M4, the AK, the AA-12 and the minigun throw on the shot; the sniper on the bolt; the pump shotgun its hull on the pump.
// Checked: the newest case after a shot is that gun's (caseOf), its geometry carries vertex colours, and its length is the real
// cartridge's (within 15 %): .45 ACP 23 mm, 9 mm 19, 5.56 45, 7.62x39 39, 12 ga 70, 7.62x51 51, .338 70.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(30); } return !!f(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'CB294b');
    T.clearZombies && T.clearZombies(); T.setHp(100000); T.grantAllWeapons();
    const take = async (w) => { if (T.isUnarmed && T.isUnarmed()) T.toggleHolster(); for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf(w)); await wait(150); } await until(() => T.getSwapDbg().swapT <= 0, 3000); await wait(250); return T.getCurrentWeapon() === w; };
    const C = T.casings;
    if (!C) { ok(false, 'T.casings is there'); return out.join('\n'); }
    const length = (geo) => { geo.computeBoundingBox && geo.computeBoundingBox(); const b = geo.boundingBox; return b ? (b.max.y - b.min.y) : 0; };
    const REAL = { pistol: 0.023, uzi: 0.019, m4: 0.045, ak: 0.039, aa12: 0.070, minigun: 0.051, sniper: 0.051, shotgun: 0.070 };   // GT-20106 (J153 36, Director-approved): the sniper's spent case is the .308's 51 mm (was 70)
    for (const w of ['pistol', 'uzi', 'm4', 'ak', 'aa12', 'minigun', 'sniper', 'shotgun']) {
      if (!(await take(w))) { ok(false, w + ' in hand'); continue; }
      T.setAmmoDbg && T.setAmmoDbg(w, 10);
      const n0 = C.length, last0 = C[C.length - 1];
      T.setMouseFireDbg(true);
      const got = await until(() => C.length > 0 && C[C.length - 1] !== last0 && (w !== 'shotgun' || C[C.length - 1].mesh.userData.hullType), w === 'minigun' ? 6000 : 4000);
      T.setMouseFireDbg(false);
      const c = C[C.length - 1], m = c && c.mesh, g = m && m.geometry;
      const tag = m && (m.userData.caseOf || (m.userData.hullType ? 'shotgun' : null));
      const len = g ? length(g) * (m.scale ? m.scale.y : 1) : 0;
      ok(got && tag === w, w + ': a case of its own leaves (' + tag + ', ' + (C.length - n0) + ' new)');
      ok(!!(g && g.attributes && g.attributes.color) && !!(m.material && m.material.vertexColors), w + ': its colours are in the geometry (vertex colours)');
      ok(Math.abs(len - REAL[w]) <= REAL[w] * 0.15, w + ': ' + (len * 1000).toFixed(1) + ' mm long (the real ' + (REAL[w] * 1000).toFixed(0) + ' mm)');
      await wait(400);
    }
  } catch (e) { ok(false, 'threw: ' + (e && e.stack || e)); }
  finally { try { T.setMouseFireDbg(false); } catch (_) {} }
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  return out.join('\n');
})()
