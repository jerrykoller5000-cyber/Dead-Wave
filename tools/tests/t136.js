// t136 - GB-84 (P-48): one mod per gun. The extended mag (x1.5 rounds, reload x1.25) or, on the M4, AK, Uzi and
// minigun, a heavy barrel (half the climb, a 0.45 s draw that holds fire, double the movement term of the cone).
// Owned mods switch free and fitting one un-fits the other. The AK reloads in 2.0 s bare and 2.5 s with the mag;
// the barrel's climb is at most 55% of bare. The barrel reports mod:heavy:<w>.
// Taking the ext mag off never loses a round: what the smaller cap can't hold goes back to the reserve (over its cap).
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const buys = []; window.addEventListener('dw-game', ({ detail }) => { if (detail && detail.type === 'purchase-delivered') buys.push(detail); });
  const f2 = (x) => (Math.round(x * 1000) / 1000).toFixed(3);
  const realRandom = Math.random;
  try {
    await startMatch(T, 'Mods');
    T.clearZombies(); T.skipGrace && T.skipGrace(); T.runDevCommand('godmode');
    T.setDay(10);
    T.grantAllWeapons(); T.addCash(100000);
    const W = T.WEAPON_ORDER;
    const toGun = (w) => { T.setWeapon(W.indexOf(w)); return T.getCurrentWeapon() === w; };
    ok(typeof T.weaponMods === 'function' && typeof T.buyHeavyBarrel === 'function' && typeof T.fitWeaponMod === 'function', 'weaponMods, buyHeavyBarrel and fitWeaponMod are exported');
    ok(Object.keys(T.HEAVY_BARREL_PRICE).sort().join(',') === 'ak,m4,minigun,uzi', 'heavy barrel on the M4, AK, Uzi and minigun only (' + Object.keys(T.HEAVY_BARREL_PRICE).join(',') + ')');
    const m0 = T.weaponMods('ak');
    ok(m0.fitted === null && !m0.ext && !m0.heavy && m0.canExt && m0.canHeavy, 'a bare AK: nothing fitted, nothing owned, both on offer');
    ok(T.weaponMods('shotgun').canHeavy === false && T.weaponMods('shotgun').canExt === true, 'the shotgun takes the ext mag, not a barrel');

    // Reload: 2.0 s bare, 2.5 s with the ext mag.
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const reloadTime = async () => {
      T.setAmmoDbg('ak', 5); T.startReload();
      const r = T.getReloadDbg(); const busy = T.isReloading();
      const t0 = performance.now();
      while (T.isReloading() && performance.now() - t0 < 6000) await wait(50);   // let it finish so the next starts clean
      return { t: r.timer, busy, w: r.weapon };
    };
    ok(toGun('ak'), 'AK in hand');
    const bare = await reloadTime();
    ok(bare.busy && bare.w === 'ak' && Math.abs(bare.t - 2.0) < 1e-6, 'bare AK reload ' + f2(bare.t) + ' s (2.0)');
    const cash0 = T.getBank();
    T.buyExtMag('ak');
    ok(T.weaponMods('ak').fitted === null && T.weaponMods('ak').ext, 'CL-113: bought at the kiosk, not fitted');
    T.armoryDbg.fit('ak', 'ext', true);   // CL-113: the Armory fits it
    const m1 = T.weaponMods('ak');
    ok(m1.fitted === 'ext' && m1.ext && T.getBank() < cash0, 'ext mag bought and fitted');
    toGun('pistol'); toGun('ak');
    const withMag = await reloadTime();
    ok(withMag.busy && Math.abs(withMag.t - 2.5) < 1e-6, 'AK with the ext mag reloads in ' + f2(withMag.t) + ' s (2.5)');
    ok(T.getReserve()['7.62mm'] >= 0 && T.reserveCap('7.62mm') === T.RESERVE_CAP['7.62mm'] * 1.5, 'ext mag: 7.62 cap x1.5 (' + T.reserveCap('7.62mm') + ')');

    // The heavy barrel: bought, fitted, un-fits the mag; the mag goes back to 30 rounds. Full up first (45 loaded and
    // every 45-round spare), more than the 30-round mags can hold under the cap: not one round is lost (Claude,
    // 2026-09-29); what the cap can't hold stays carried over it.
    T.grantAllWeapons(); toGun('ak');
    const rounds0 = T.getAmmo().ak + T.getReserve()['7.62mm'];
    ok(T.getAmmo().ak === 45 && rounds0 > 30 + T.RESERVE_CAP['7.62mm'], 'full up with the ext mag: ' + T.getAmmo().ak + ' loaded, ' + rounds0 + ' rounds in all (more than 30 + the base cap ' + T.RESERVE_CAP['7.62mm'] + ')');
    const cash1 = T.getBank(); const nb = buys.length;
    T.buyHeavyBarrel('ak');
    T.armoryDbg.fit('ak', 'heavy', true);   // CL-113
    const m2 = T.weaponMods('ak');
    ok(m2.fitted === 'heavy' && m2.heavy && m2.ext, 'heavy barrel bought and fitted; the ext mag stays owned (' + JSON.stringify(m2) + ')');
    const heavyBuy = buys.slice(nb).find((b) => b.itemId === 'mod:heavy:ak');
    ok(!!heavyBuy && heavyBuy.cashSpent === cash1 - T.getBank() && heavyBuy.cashSpent > 0, 'purchase-delivered mod:heavy:ak for $' + (heavyBuy && heavyBuy.cashSpent));
    ok(T.getAmmo().ak === 30, 'fitting the barrel un-fits the mag: loaded ' + T.getAmmo().ak + ' (30)');
    const rounds1 = T.getAmmo().ak + T.getReserve()['7.62mm'];
    ok(rounds1 === rounds0, 'taking the ext mag off loses no rounds (' + rounds0 + ' -> ' + rounds1 + ')');
    ok(T.getReserve()['7.62mm'] === rounds0 - 30 && T.getReserve()['7.62mm'] > T.RESERVE_CAP['7.62mm'], 'the rounds over the smaller cap go back to the reserve: ' + T.getReserve()['7.62mm'] + ' (base cap ' + T.RESERVE_CAP['7.62mm'] + ')');
    T.fitWeaponMod('ak', 'ext');
    const rounds2 = T.getAmmo().ak + T.getReserve()['7.62mm'];
    ok(rounds2 === rounds0 && T.getAmmo().ak === 30, 'the mag back on: still ' + rounds2 + ' rounds, the loaded mag keeps its 30');
    T.fitWeaponMod('ak', 'heavy');
    ok(T.getAmmo().ak + T.getReserve()['7.62mm'] === rounds0, 'and off again: still ' + (T.getAmmo().ak + T.getReserve()['7.62mm']));
    ok(T.reserveCap('7.62mm') === T.RESERVE_CAP['7.62mm'], 'the 7.62 cap is back to base (' + T.reserveCap('7.62mm') + ')');
    const bareAgain = await reloadTime();
    ok(Math.abs(bareAgain.t - 2.0) < 1e-6, 'with the barrel the AK reloads in ' + f2(bareAgain.t) + ' s again');

    // Climb: at most 55% of bare.
    const cBare = T.recoilClimb('m4', 9);
    T.buyHeavyBarrel('m4');
    T.armoryDbg.fit('m4', 'heavy', true);   // CL-113
    const cHeavy = T.recoilClimb('m4', 9);
    ok(cBare > 0 && cHeavy <= cBare * 0.55, 'M4 climb after 9 rounds: ' + f2(cHeavy) + ' vs bare ' + f2(cBare) + ' (<= 55%)');
    const akHeavy = T.recoilClimb('ak', 9); T.fitWeaponMod('ak', null); const akBare = T.recoilClimb('ak', 9); T.fitWeaponMod('ak', 'heavy');
    ok(akHeavy <= akBare * 0.55, 'AK climb ' + f2(akHeavy) + ' vs bare ' + f2(akBare));

    // In the fired shot itself: no random cone (Math.random -> 0), heat 9, the vertical offset.
    const shotClimb = () => {
      const a = T.getAimDirDbg();
      T.setVelDbg(0, 0); T.setSprayDbg(9, 9);
      Math.random = () => 0;
      const d = T.aimDirWithSpreadDbg(0);
      Math.random = realRandom;
      // up = (a x Y) x a, normalised
      let rx = a.y * 0 - a.z * 1, rz = a.x * 1 - a.y * 0; const rl = Math.hypot(rx, rz) || 1; rx /= rl; rz /= rl;
      const ux = 0 * a.z - rz * a.y, uy = rz * a.x - rx * a.z, uz = rx * a.y - 0 * a.x;
      return Math.asin(Math.max(-1, Math.min(1, d.x * ux + d.y * uy + d.z * uz)));
    };
    toGun('ak');
    const sHeavy = shotClimb(); T.fitWeaponMod('ak', null); const sBare = shotClimb(); T.fitWeaponMod('ak', 'heavy');
    ok(sBare > 0.01 && sHeavy <= sBare * 0.55, 'a fired AK round climbs ' + f2(sHeavy) + ' rad with the barrel vs ' + f2(sBare) + ' bare');

    // Movement: the moving term of the cone doubles. Math.random -> ~1 puts the round on the cone's edge.
    const coneAt = (vx) => {
      const a = T.getAimDirDbg();
      T.setSprayDbg(0, 0); T.setVelDbg(vx, 0);
      Math.random = () => 0.999999;
      const d = T.aimDirWithSpreadDbg(0.02);
      Math.random = realRandom; T.setVelDbg(0, 0);
      return Math.acos(Math.max(-1, Math.min(1, d.x * a.x + d.y * a.y + d.z * a.z)));
    };
    const hStill = coneAt(0), hMove = coneAt(10);
    T.fitWeaponMod('ak', null);
    const bStill = coneAt(0), bMove = coneAt(10);
    T.fitWeaponMod('ak', 'heavy');
    const bTerm = bMove / bStill - 1, hTerm = hMove / hStill - 1;
    ok(Math.abs(hStill - bStill) < 1e-6, 'standing still, the barrel does not widen the cone (' + f2(hStill) + ' vs ' + f2(bStill) + ')');
    ok(bTerm > 0.3 && Math.abs(hTerm - 2 * bTerm) < 0.02, 'running, the movement term doubles: +' + (bTerm * 100).toFixed(0) + '% bare, +' + (hTerm * 100).toFixed(0) + '% with the barrel');

    // The swap: 0.45 s with the barrel, fire held till it's up; bare guns unchanged.
    toGun('pistol');
    const sw0 = T.getSwapDbg();
    ok(Math.abs(sw0.swapDur - 0.28) < 1e-6 && sw0.fireCooldown === 0, 'drawing the bare pistol: 0.28 s dip, fire free (' + JSON.stringify(sw0) + ')');
    toGun('ak');
    const sw1 = T.getSwapDbg();
    ok(Math.abs(sw1.swapDur - 0.45) < 1e-6 && Math.abs(sw1.swapT - 0.45) < 1e-6 && Math.abs(sw1.fireCooldown - 0.45) < 1e-6, 'drawing the heavy AK: 0.45 s, no shot until it is up (' + JSON.stringify(sw1) + ')');

    // The switch is free, both ways, and only for owned mods.
    const cash2 = T.getBank(); const nb2 = buys.length;
    T.buyExtMag('ak');
    ok(T.weaponMods('ak').fitted === 'heavy' && T.getBank() === cash2 && buys.length === nb2, 'the kiosk will not sell the owned ext mag twice (CL-113: and does not fit it)');
    T.fitWeaponMod('ak', 'ext');   // CL-113: the swap happens at the Armory's workbench
    ok(T.weaponMods('ak').fitted === 'ext' && T.getBank() === cash2 && buys.length === nb2, 'refitting the owned ext mag is free and reports no purchase');
    toGun('pistol'); toGun('ak');
    ok(Math.abs(T.getSwapDbg().swapDur - 0.28) < 1e-6 && T.getSwapDbg().fireCooldown === 0, 'with the mag back on, the AK draws at the normal speed');
    ok(T.recoilClimb('ak', 9) === akBare, 'and climbs as bare');
    T.fitWeaponMod('ak', 'heavy');
    ok(T.weaponMods('ak').fitted === 'heavy' && T.getBank() === cash2, 'back to the barrel, free');
    ok(T.fitWeaponMod('uzi', 'heavy') === false && T.weaponMods('uzi').fitted === null, 'an unbought barrel will not fit');
    ok(T.fitWeaponMod('shotgun', 'heavy') === false, 'no barrel for the shotgun');

    // A new run clears the mods.
    T.resetEconomyDbg();
    ok(T.weaponMods('ak').fitted === null && !T.weaponMods('ak').heavy && !T.weaponMods('ak').ext, 'a reset clears owned and fitted mods');
    ok(errs.length === 0, 'no page errors (' + errs.slice(0, 2).join(' | ') + ')');
  } catch (e) {
    Math.random = realRandom;
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  return out.join('\n');
})()
