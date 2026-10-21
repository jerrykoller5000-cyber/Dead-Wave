// t135 - CU-64 (P-111): U holsters the gun. Unarmed, nothing fires and he is 10% faster,
// and Fleet foot plus unarmed never passes ×1.30. U again draws the gun he had.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    await startMatch(T, 'Holster');
    ok(T.isUnarmed() === false, 'he starts armed');
    const base = T.getSkillEffects().speed;
    ok(Math.abs(base - 1) < 0.001, 'speed starts at ×1 (' + base + ')');
    T.toggleHolster();
    ok(T.isUnarmed() === true, 'U holsters');
    const fast = T.getSkillEffects().speed;
    ok(Math.abs(fast - 1.10) < 0.001, 'unarmed is ×1.10 (' + fast + ')');
    const ammo = T.getAmmo().pistol;
    T.setMouseFireDbg(true);
    await wait(300);
    T.setMouseFireDbg(false);
    ok(T.getAmmo().pistol === ammo, 'unarmed, the pistol does not fire');
    T.addSkillXp(T.getPlayers()[0], 'legs', 400, 'test');
    const capped = T.getSkillEffects().speed;
    ok(Math.abs(capped - 1.30) < 0.001, 'Fleet foot 5 plus unarmed caps at ×1.30 (' + capped + ')');
    T.toggleHolster();
    ok(T.isUnarmed() === false && T.getCurrentWeapon() === 'pistol', 'U draws the pistol again');
    const fleet = T.getSkillEffects().speed;
    ok(Math.abs(fleet - 1.25) < 0.001, 'armed, Fleet foot 5 is ×1.25 (' + fleet + ')');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
