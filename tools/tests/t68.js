// t68 - GB-36: a bought gun comes with full ammo; spare capacity and the starting spare are x1.4.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  try {
    ok(T.SPARE_CAP_MULT === 1.4, 'spare capacity multiplier is 1.4 (not double)');
    ok(typeof T.reserveCap === 'function' && !!T.RESERVE_CAP_BASE, 'reserveCap / RESERVE_CAP_BASE exported');
    await startMatch(T, 'FullAmmo');
    const R = T.getReserve();
    ok(T.START_RESERVE_45 === 50 && R['.45'] === 50, 'starting .45 spare 36 -> 50 (got ' + R['.45'] + ')');
    let capsOk = true; const bad = [];
    for (const [c, n] of Object.entries(T.RESERVE_CAP_BASE)) {
      if (T.reserveCap(c) !== Math.round(n * 1.4)) { capsOk = false; bad.push(c + ':' + T.reserveCap(c)); }
    }
    ok(capsOk, 'every calibre cap is x1.4 of the old one ' + bad.join(' '));
    ok(T.reserveCap('.45') === 168 && T.reserveCap('5.56mm') === 252 && T.reserveCap('12ga') === 154,
      'spot caps .45 168, 5.56 252, 12ga 154');

    T.addCash(5000);
    // M4: loaded magazine and a full 5.56 reserve.
    const bank0 = T.getBank();
    T.buyWeapon('m4');
    ok(T.getWeaponOwned().m4 === true, 'm4 bought');
    ok(T.getBank() === bank0 - T.WEAPON_PRICE.m4, 'charged the m4 price');
    ok(T.getAmmo().m4 === 30, 'm4 arrives with a loaded magazine (' + T.getAmmo().m4 + ')');
    ok(R['5.56mm'] === T.reserveCap('5.56mm') && R['5.56mm'] === 252, 'm4 arrives with a full 5.56 reserve (' + R['5.56mm'] + ')');

    // Buying it again does nothing: no free refill.
    R['5.56mm'] = 10;
    const bank1 = T.getBank();
    T.buyWeapon('m4');
    ok(R['5.56mm'] === 10 && T.getBank() === bank1, 'an owned gun cannot be re-bought for a refill');

    // Shared calibre: the AA-12 tops the 12ga up too.
    T.buyWeapon('shotgun');
    ok(R['12ga'] === 154, 'shotgun arrives with a full 12ga reserve (' + R['12ga'] + ')');
    R['12ga'] = 40;
    T.buyWeapon('aa12');
    ok(R['12ga'] === 154 && T.getAmmo().aa12 === 20, 'aa12 arrives full: drum 20 and 12ga back to 154');

    // Never lowers a reserve that is somehow over the cap (e.g. a restored save).
    R['7.62mm'] = 999;
    T.buyWeapon('ak');
    ok(R['7.62mm'] === 999, 'buying never lowers a reserve');

    // The extended mag still stacks x1.5 on the new cap.
    if (T.buyExtMag) {
      T.buyExtMag('m4');
      ok(T.reserveCap('5.56mm') === 252 * 1.5, 'ext mag: 5.56 cap 252 x1.5 = ' + T.reserveCap('5.56mm'));
    }
    // Chainsaw: a full tank, as before.
    T.buyWeapon('chainsaw');
    ok(T.getWeaponOwned().chainsaw === true, 'chainsaw bought (fuel path unchanged)');
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  return out.join('\n');
})()
