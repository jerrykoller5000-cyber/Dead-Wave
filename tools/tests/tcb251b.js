// tcb251b - CB-251 (J121: "wherever the real spinning blade hits, that is where it actually cuts"), the Training Ground's
//  half: the saw used to knock a plate down from 3.1 m away on the aim (a cone from his chest, world/training-target-hits.js
//  trainingMeleeHits); its cut is now the chain (combat/saw-blade.js trainingBladeHits). A plate 2.4 m out stands; the same
//  plate with the nose through it goes down. tcb251 has the zombies, in both views.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };
  const D = T.trainingDbg;
  try {
    if (!D || !T.sawDbg) { ok(false, 'the hooks are there'); return out.join('\n'); }
    if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting();
    const nameEl = document.getElementById('playerName'); if (nameEl) nameEl.value = 'Trainee';
    document.getElementById('modeTraining').click();
    ok(await until(() => D.state().active, 20000), 'the Training Ground is up');
    await wait(2500);
    T.grantAllWeapons && T.grantAllWeapons();
    const W = T.WEAPON_ORDER;
    T.setWeapon(W.indexOf('chainsaw')); await until(() => T.getCurrentWeapon() === 'chainsaw', 3000); await wait(1200);
    T.setUnarmedDbg(false); await wait(800);   // the Training Ground starts him with his hands empty
    ok(T.getCurrentWeapon() === 'chainsaw' && !T.isUnarmed(), 'the chainsaw in hand');
    const tg = D.tg(), plate = tg.targets[0], box = plate.box;
    ok(plate.state === 'up', 'lane 1\'s plate is up');
    const face = box.minZ, cx = (box.minX + box.maxX) / 2, floor = tg.origin.y;
    // Third person: the bar follows the cursor, so the cursor goes a few metres past the plate (level bar, not pointed at the floor).
    const stand = (z) => { T.player.position.set(cx, floor, z); T.setHp && T.setHp(1e6); T.setAimYawDbg(0); if (T.setAimTargetDbg) T.setAimTargetDbg(cx, face + 6); };
    T.setViewFirstDbg(false);
    // The marine follows a teleport over a few frames (the page draws few in the suite): give it time, then read the saw.
    const settle = async (z) => { stand(z); await wait(700); stand(z); await wait(500); stand(z); };
    // 2.4 m out on the aim, level with the plate: the old cone's reach (3.1 m), a metre past the nose.
    await settle(face - 2.4);
    T.sawDbg.tick();
    ok(plate.state === 'up', '2.4 m from the plate the saw leaves it standing (' + plate.state + ')');

    // Walk up: the nose through the plate.
    let z = face - 0.7;
    for (let i = 0; i < 3; i++) {
      await settle(z);
      const bb = T.sawDbg.blade(), nz = Math.max(bb.az, bb.bz);
      z += (face + 0.04 - nz);
    }
    await settle(z);
    const b = T.sawDbg.blade(), noseZ = Math.max(b.az, b.bz);
    ok(Math.abs(noseZ - (face + 0.04)) < 0.12, 'the nose is just through the plate (' + (noseZ - face).toFixed(2) + ' m past its face)');
    const hits0 = D.state().hits | 0;
    T.sawDbg.tick();
    ok(plate.state !== 'up', 'with the nose through it the saw knocks the plate down (' + plate.state + ')');
    ok((D.state().hits | 0) === hits0 + 1, 'and the hit is counted (' + hits0 + ' -> ' + (D.state().hits | 0) + ')');
    try { T.setViewFirstDbg(false); } catch (_) {}
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  return out.join('\n');
})()
