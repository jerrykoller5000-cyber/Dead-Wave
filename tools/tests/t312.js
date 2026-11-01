// t312 - CU-199: a small prop stops drawing past its distance, and comes back inside it.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  let pin = null;
  const stand = async (x, z, lookx, lookz) => {
    if (pin) clearInterval(pin);
    const put = () => {
      const y = T.sampleHeight(x, z);
      T.player.position.set(x, (y == null || !Number.isFinite(y) ? 2 : y) + 0.3, z);
      if (T.setOtsAimDbg) T.setOtsAimDbg(Math.atan2(lookx - x, lookz - z), 0);
    };
    put();
    pin = setInterval(put, 2);
    await wait(450);
  };
  try {
    await startMatch(T, 'PropCull');
    T.clearZombies && T.clearZombies();
    if (T.runDevCommand) T.runDevCommand('godmode');
    let brass = null;
    const t0 = Date.now();
    while (!brass && Date.now() - t0 < 8000) { brass = T.scene.getObjectByName('brass'); if (!brass) await wait(50); }
    ok(!!brass && brass.userData.maxDist === 28, 'spent brass draws out to 28 m (' + (brass && brass.userData.maxDist) + ')');
    let board = null;
    T.scene.traverse((o) => { if (!board && o.name && o.name.indexOf('survey-board:') === 0) board = o; });
    ok(!!board && board.userData.maxDist === 55, 'a survey board draws out to 55 m (' + (board && board.name) + ')');
    const helm = T.scene.getObjectByName('dropped-helmet');
    ok(!helm || helm.userData.maxDist === 55, 'the dropped helmet draws out to 55 m (' + (helm && helm.userData.maxDist) + ')');
    if (brass) {
      const bx = brass.position.x, bz = brass.position.z;
      await stand(bx + 40, bz, bx, bz);
      const far = brass.userData._cull;
      ok(!!far && far.byDist === true && brass.visible === false, 'forty metres off, the brass is put away (byDist ' + (far && far.byDist) + ', visible ' + brass.visible + ')');
      await stand(bx + 8, bz, bx, bz);
      const near = brass.userData._cull;
      ok(brass.visible === true && !(near && near.byDist), 'eight metres off, the brass is back (byDist ' + (near && near.byDist) + ', visible ' + brass.visible + ')');
    }
    const hs = T.scene.getObjectByName('trapper-horseshoe');
    ok(!!hs, 'a horseshoe is nailed in the trapper yard');
    if (hs) {
      hs.updateWorldMatrix(true, false);
      const e = hs.matrixWorld.elements, wx = e[12], wz = e[14];
      await stand(wx + 80, wz, wx, wz);
      ok(hs.visible === false, 'that horseshoe is put away at 80 m');
      await stand(wx + 3, wz, wx, wz);
      ok(hs.visible === true, 'that horseshoe is back at 3 m');
    }
  } catch (e) {
    ok(false, 't312 threw: ' + String((e && e.stack) || e).slice(0, 400));
  } finally { if (pin) clearInterval(pin); }
  return out.join('\n');
})()
