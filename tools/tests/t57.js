(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  try {
    ok(typeof T.caliberOf === 'function' && T.caliberOf('pistol') === '.45', 'pistol calibre is .45');
    ok(T.caliberOf('uzi') === '9mm', 'uzi calibre stays 9mm');
    ok(!!T.AMMO_PACK['.45'] && T.AMMO_PACK['.45'].n === 36 && T.AMMO_PACK['.45'].cost === 8, '.45 pack 36/$8 (GP-41 cut it from $12)');
    ok(!!T.AMMO_PACK['9mm'], '9mm pack still present');
    const res = T.getReserve();
    ok((res['.45'] | 0) === 50, 'starting .45 reserve is 50 (GB-36: 36 x1.4)');
    ok((res['9mm'] | 0) === 0, 'starting 9mm reserve is 0 (no Uzi yet)');
    if (T.addCash) T.addCash(100);
    const before = res['.45'] | 0;
    const bought = T.buyAmmo && T.buyAmmo('.45');
    ok(bought === true, 'buyAmmo(.45) succeeds');
    ok((T.getReserve()['.45'] | 0) === before + 36, '.45 reserve grew by one pack');
    if (T.listOwnedAmmoPackChoices) {
      const choices = T.listOwnedAmmoPackChoices();
      ok(choices.some((c) => c.caliber === '.45' || c.id === 'ammo:.45'), 'listOwnedAmmoPackChoices includes .45');
      ok(!choices.some((c) => c.caliber === '9mm' || c.id === 'ammo:9mm'), '9mm absent until Uzi owned');
    } else ok(true, 'listOwnedAmmoPackChoices not exported (skip)');
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  return out.join('\n');
})()
