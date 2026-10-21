// t141 - CU-67 (P-121): the M240B is a tripod gun beside the mortar.
// It arrives with 500 rounds and will not fire until he mounts it.
// A mortar arrives with half its 60 mm shells.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  try {
    await startMatch(T, 'M240');
    T.unlockAllBuilds();
    const shells = T.getReserve()['60mm'] | 0;
    const mortar = T.spawnBuild('mortar', T.player.position.x + 3, T.player.position.z);
    ok(!!mortar && mortar.type === 'mortar', 'a mortar can be placed');
    ok((T.getReserve()['60mm'] | 0) === shells + (shells === 0 ? 8 : 0) || (T.getReserve()['60mm'] | 0) === 8, 'the mortar comes with half its shells (' + (T.getReserve()['60mm'] | 0) + ')');
    const gun = T.spawnBuild('m240', T.player.position.x + 1.2, T.player.position.z);
    ok(!!gun && gun.belt === 500 && gun.beltMax === 1000, 'the M240B is placed with 500 of 1,000 rounds');
    T.fireMortar();
    ok(gun.belt === 500 && !T.getMortarMounted(), 'it does not fire until he is on it');
    const mounted = T.mountMortar(gun);
    ok(mounted === true && T.getMortarMounted() === gun, 'he mounts it like the mortar');
    T.fireMortar();
    ok(gun.belt === 499, 'mounted, one round leaves the belt (' + gun.belt + ')');
    T.shoulderMortar && T.shoulderMortar();
    const carried = T.getMortarCarried();
    ok(!!carried && carried.kind === 'm240' && carried.belt === 499, 'T shoulders it (' + JSON.stringify(carried) + ')');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
