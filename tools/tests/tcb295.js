// tcb295 - CB-295 (CE-2, Claude 5): updateViewmodel hands the view three more fields for the trigger finger and the selector.
// - st.fireHeld: true while the trigger is held on the gun in hand (a full-auto gun's finger stays back while it runs),
//   false once it is let go.
// - st.fireMode: what the selector shows: 'auto' on the M4 from the start (GB-127), 'semi' after X, 'auto' again after X;
//   the pistol 'semi' without its sear; null on a gun with no selector (the shotgun, the Uzi).
// - st.selector: the GB-167 flick's state, the same object (read only): its count goes up on each X, its mode follows.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(40); } return !!f(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'CB295');
    T.clearZombies && T.clearZombies(); T.setHp(100000); T.grantAllWeapons();
    const take = async (w) => { if (T.isUnarmed && T.isUnarmed()) T.toggleHolster(); for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf(w)); await wait(150); } await until(() => T.getSwapDbg().swapT <= 0, 3000); await wait(200); return T.getCurrentWeapon() === w; };
    if (!T.vmStateDbg || !T.setViewFirstDbg || !T.toggleFireMode) { ok(false, 'the hooks are there (vmStateDbg, setViewFirstDbg, toggleFireMode)'); return out.join('\n'); }
    const S = () => T.vmStateDbg();
    ok(await take('m4'), 'the M4 in hand');
    T.setViewFirstDbg(true);
    ok(await until(() => T.viewmodelDbg() && T.viewmodelDbg().info && T.viewmodelDbg().info.active, 20000), 'first person: the view gun is up');
    await wait(300);
    ok(S().fireMode === 'auto', 'the M4 starts on auto (st.fireMode ' + S().fireMode + ')');
    ok(S().fireHeld === false, 'trigger not held: st.fireHeld false (' + S().fireHeld + ')');
    T.setAmmoDbg && T.setAmmoDbg('m4', 30);
    T.setMouseFireDbg(true);
    const held = await until(() => S().fireHeld === true, 3000);
    ok(held, 'trigger held on the M4: st.fireHeld true');
    await wait(250);
    ok(S().fireHeld === true, 'it stays true while the auto runs');
    T.setMouseFireDbg(false);
    ok(await until(() => S().fireHeld === false, 3000), 'let go: st.fireHeld false again');
    const sel = S().selector;
    ok(!!sel && typeof sel.count === 'number', 'st.selector is the flick state (count ' + (sel && sel.count) + ')');
    const c0 = sel ? sel.count : 0;
    T.toggleFireMode(); await wait(200);
    ok(S().fireMode === 'semi', 'X: st.fireMode semi (' + S().fireMode + ')');
    ok(S().selector && S().selector.count === c0 + 1 && S().selector.mode === 'semi', 'the flick counted it (count ' + (S().selector && S().selector.count) + ', mode ' + (S().selector && S().selector.mode) + ')');
    ok(S().selector === sel, 'st.selector is the same object (read only, not a copy)');
    T.toggleFireMode(); await wait(200);
    ok(S().fireMode === 'auto' && S().selector.count === c0 + 2, 'X again: auto (' + S().fireMode + ', count ' + S().selector.count + ')');
    ok(await take('pistol'), 'the pistol in hand');
    ok(S().fireMode === 'semi', 'the pistol without its sear shows semi (' + S().fireMode + ')');
    ok(await take('shotgun'), 'the shotgun in hand');
    ok(S().fireMode === null, 'the shotgun has no selector: st.fireMode null (' + S().fireMode + ')');
    ok(await take('uzi'), 'the Uzi in hand');
    ok(S().fireMode === null, 'the Uzi has no selector: st.fireMode null (' + S().fireMode + ')');
    T.setMouseFireDbg(true);
    ok(await until(() => S().fireHeld === true, 3000), 'the Uzi held: st.fireHeld true');
    T.setMouseFireDbg(false);
    ok(await until(() => S().fireHeld === false, 3000), 'the Uzi let go: false');
  } catch (e) { ok(false, 'threw: ' + (e && e.stack || e)); }
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  return out.join('\n');
})()
