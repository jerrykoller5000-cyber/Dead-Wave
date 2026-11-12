// tcb318 - CB-318 (GT-20080, ChatGPT 2's ask): the live top round stays out of the extended magazine's stretch.
//  For the pistol and the Wasp (uzi) with a round showing: fitting the extended magazine leaves the top round where it was
//  (its place and size in the gun within 0.1 mm, still under the outer magazine), while the magazine's body grows;
//  taking it off leaves the round there too.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    await startMatch(T, 'CB318');
    T.clearZombies && T.clearZombies(); T.setHp(100000); T.grantAllWeapons(); T.addCash(100000);
    const THREE = T.THREE, V = THREE.Vector3;
    for (const w of ['pistol', 'uzi']) {
      const gun = T.weaponMeshes[w], ud = gun.userData, top = ud.magazineTopRound, mag = ud.mag;
      if (!top || !mag) { ok(false, w + ': has magazineTopRound and mag'); continue; }
      ud.setMagazineRounds && ud.setMagazineRounds.call(ud, 5);
      const where = () => {   // the round's place and scale in the gun's own space
        gun.updateMatrixWorld(true);
        const m = new THREE.Matrix4().copy(gun.matrixWorld).invert().multiply(top.matrixWorld), p = new V(), q = new THREE.Quaternion(), s = new V();
        m.decompose(p, q, s); return { p, s };
      };
      const magLen = () => { gun.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(mag); return b.max.y - b.min.y; };
      const before = where(), len0 = magLen();
      T.buyExtMag(w); const fitted = T.fitWeaponMod(w, 'ext'); await wait(50);
      ok(fitted, w + ': the extended magazine fitted');
      const on = where(), len1 = magLen();
      out.push('INFO ' + w + ': round in the gun off ' + before.p.toArray().map((v) => v.toFixed(4)) + ' scale ' + before.s.toArray().map((v) => v.toFixed(3)) + ' | on ' + on.p.toArray().map((v) => v.toFixed(4)) + ' scale ' + on.s.toArray().map((v) => v.toFixed(3)) + ' | parent ' + (top.parent && (top.parent.name || top.parent.type)));
      let under = false; for (let o = top.parent; o; o = o.parent) if (o === mag) under = true;
      ok(len1 > len0 * 1.2, w + ': the magazine grows (' + len0.toFixed(3) + ' -> ' + len1.toFixed(3) + ' m tall)');
      ok(on.p.distanceTo(before.p) < 1e-4 && Math.abs(on.s.x - before.s.x) < 1e-6 && Math.abs(on.s.y - before.s.y) < 1e-6, w + ': the top round stays put, its size unchanged (moved ' + (on.p.distanceTo(before.p) * 1000).toFixed(2) + ' mm, scale y ' + before.s.y.toFixed(4) + ' -> ' + on.s.y.toFixed(4) + ')');
      ok(under && top.visible, w + ': the round still under the outer magazine, showing');
      T.fitWeaponMod(w, null); await wait(50);
      const off = where();
      ok(off.p.distanceTo(before.p) < 1e-4 && Math.abs(off.s.y - before.s.y) < 1e-6, w + ': and with it taken off (moved ' + (off.p.distanceTo(before.p) * 1000).toFixed(2) + ' mm)');
    }
  } catch (e) { ok(false, 'threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
