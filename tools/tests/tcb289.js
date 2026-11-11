// tcb289 - CB-289 (Jerry, 10 Nov: "Setting limits for extension in the arms would prevent impossible movements"; J127,
// D-139, rule 25). Third person: every gun, in the worst holds (standing, crouched, sprinting, aimed down the sights, and
// through a reload), both arms sampled frame by frame and read against core/body-limits.js:
// - each wrist inside the table (75 deg toward the palm, 70 back, 20 toward the thumb, 35 toward the little finger, an
//   ellipse between), the forearm's roll and the wrist's turn about the forearm together within 85 deg;
// - each elbow between straight and 150 deg, never backwards;
// - the one named exception (BODY_EXCEPTIONS 'support-foregrip', up to 60 deg past the table) only for the support hand on
//   a vertical foregrip or the pump (the shotgun, the launcher, the flamer, the minigun), never through a reload; every
//   other hand and gun gets the table as it is.
// The angles are read here from the rig itself (the wrist's quaternion, the elbow's, the forearm's roll), not from the
// game's own record, so the check does not lean on the code it checks. The worst three are printed as INFO.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const info = (m) => out.push('INFO ' + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(40); } return !!f(); };
  const key = (code, down) => document.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, key: code, bubbles: true }));
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const deg = (r) => (r * 180 / Math.PI).toFixed(1);
  try {
    const BL = await import('/core/body-limits.js');
    const { ARM_LIMITS, BODY_EXCEPTIONS, wristInside } = BL;
    ok(BODY_EXCEPTIONS.length === 1 && BODY_EXCEPTIONS[0].id === 'support-foregrip', 'the limits table names one exception, support-foregrip (' + BODY_EXCEPTIONS.map((e) => e.id).join(', ') + ')');
    await startMatch(T, 'CB289');
    T.clearZombies && T.clearZombies(); T.setHp(100000); T.grantAllWeapons();
    const M = T.getMarine(), ud = M.userData;
    const FOREGRIP = new Set(['shotgun', 'launcher', 'flamer', 'minigun']);
    const take = async (w) => { if (T.isUnarmed && T.isUnarmed()) T.toggleHolster(); for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf(w)); await wait(120); } await until(() => T.getSwapDbg().swapT <= 0, 3000); await wait(350); return T.getCurrentWeapon() === w; };
    const V = (x, y, z) => new (T.THREE || window.THREE).Vector3(x, y, z);
    // the elbow's bend: the forearm's line (elbow to wrist) against the upper arm's -y; forward positive, backwards negative
    const elbowBend = (e) => { const w = e.userData.wrist; const v = (w ? w.position.clone().normalize() : V(0, -1, 0)).applyQuaternion(e.quaternion); return Math.atan2(Math.hypot(v.x, v.z) * (v.z < -1e-6 ? -1 : 1), -v.y); };
    const worst = [], bad = [], exUsed = new Set();
    let samples = 0;
    const sample = (gun, stance) => {
      const roll = T.handsDbg.roll(), reloadingNow = T.isReloading && T.isReloading();
      for (const [k, e, side, r] of [['right', ud.elbowRG, 1, roll.r], ['left', ud.elbowLG, -1, roll.l]]) {
        const wr = e.userData.wrist; if (!wr) continue;
        const ex = k === 'left' && FOREGRIP.has(gun) && !reloadingNow ? 'support-foregrip' : null;
        const a = wristInside(wr.quaternion, side, -(r || 0), ex, 0.02);
        const plain = wristInside(wr.quaternion, side, -(r || 0), null, 0.02);
        if (!plain.ok) exUsed.add(gun + ' ' + k);
        const bend = elbowBend(e);
        samples++;
        const tag = gun + ' ' + stance + ' ' + k;
        worst.push({ tag, over: a.over, twist: a.twist - (r || 0), flex: a.flex, dev: a.dev, bend });
        if (!a.ok && T.armLimitsDbg && bad.length < 3) { const g = T.armLimitsDbg()[k === 'left' ? 'l' : 'r']; info(tag + ': the game\'s last hold ' + JSON.stringify(g && g.last)); }
        if (!a.ok) bad.push(tag + ': wrist flex ' + deg(a.flex) + ' dev ' + deg(a.dev) + ' twist+roll ' + deg(a.twist - (r || 0)) + ' (ellipse ' + a.over.toFixed(2) + (ex ? ', with the exception' : '') + ')');
        if (bend < -0.02 || bend > ARM_LIMITS.elbow[1] + 0.02) bad.push(tag + ': elbow ' + deg(bend) + ' deg');
      }
    };
    const heldBy = [];   // where the game's limits held the pose most (for the before/after pictures)
    const hitsNow = () => { if (!T.armLimitsDbg) return 0; const h = T.armLimitsDbg().hits; return h.wrist + h.elbow; };
    const watch = async (gun, stance, ms) => { const h0 = hitsNow(); const t0 = Date.now(); while (Date.now() - t0 < ms) { sample(gun, stance); await wait(90); } heldBy.push({ tag: gun + ' ' + stance, n: hitsNow() - h0 }); };
    const guns = T.WEAPON_ORDER.filter((w) => w !== 'mortar');
    let held = 0;
    for (const gun of guns) {
      if (!(await take(gun))) { info(gun + ': not in hand, skipped'); continue; }
      held++;
      await watch(gun, 'standing', 500);
      key('KeyC', true); await wait(500); await watch(gun, 'crouched', 500); key('KeyC', false); await wait(300);
      key('ShiftLeft', true); key('KeyW', true); await wait(500); await watch(gun, 'sprinting', 500); key('KeyW', false); key('ShiftLeft', false); await wait(400);
      T.setZoomHeldDbg && T.setZoomHeldDbg(true); await wait(500); await watch(gun, 'aimed', 500); T.setZoomHeldDbg && T.setZoomHeldDbg(false); await wait(300);
      if (T.startReload && gun !== 'chainsaw') {
        T.setAmmoDbg && T.setAmmoDbg(gun, 0);
        T.startReload();
        await wait(120);   // a frame or two: the first pose of the reload, not the last of the hold
        const t0 = Date.now();
        while (Date.now() - t0 < 6000 && T.isReloading && T.isReloading()) { sample(gun, 'reload'); await wait(90); }
        await wait(200);
      }
    }
    ok(held >= 10, held + ' guns held and driven through five holds (' + samples + ' arm samples)');
    ok(!bad.length, 'every wrist and elbow inside the table' + (bad.length ? ': ' + bad.length + ' outside, first ' + bad.slice(0, 8).join(' | ') : ''));
    const outside = [...exUsed];
    ok(outside.every((t) => /left$/.test(t) && FOREGRIP.has(t.split(' ')[0])), 'past the plain table only the support hand on a foregrip or the pump (' + (outside.join(', ') || 'none') + ')');
    worst.sort((a, b) => b.over - a.over);
    for (const w of worst.slice(0, 3)) info('worst wrist: ' + w.tag + ' ellipse ' + w.over.toFixed(2) + ' (flex ' + deg(w.flex) + ', dev ' + deg(w.dev) + ', twist+roll ' + deg(w.twist) + ')');
    worst.sort((a, b) => Math.abs(b.twist) - Math.abs(a.twist));
    info('most forearm turn: ' + worst[0].tag + ' ' + deg(worst[0].twist) + ' deg');
    worst.sort((a, b) => b.bend - a.bend);
    info('most elbow bend: ' + worst[0].tag + ' ' + deg(worst[0].bend) + ' deg');
    heldBy.sort((a, b) => b.n - a.n); if (T.armLimitsDbg) info('held most: ' + heldBy.slice(0, 6).map((h) => h.tag + ' ' + h.n).join(', '));
    if (T.armLimitsDbg) { const d = T.armLimitsDbg(); info('the game held the wrist ' + d.hits.wrist + ' times and the elbow ' + d.hits.elbow + ' times (' + d.hits.elbowStraight + ' past straight, ' + d.hits.elbowFold + ' past 150 deg)'); }
  } catch (e) { ok(false, 'threw: ' + (e && e.stack || e)); }
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  return out.join('\n');
})()
