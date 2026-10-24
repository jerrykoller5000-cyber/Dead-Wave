// t275 - AG-119 (D-87): Coldwater's church shell has wall solids (sill height under windows, front door and aisle to
// the cross open). He stops at all four walls from outside and inside, rounds pass through a window above the sill and
// stop below it, he walks in through the door to the cross and receives the blessing, and a zombie walks in through the door.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(40); } return !!f(); };
  const key = (code, k, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, key: k, bubbles: true }));
  try {
    await startMatch(T, 'Chapel');
    T.clearZombies && T.clearZombies();
    T.skipGrace && T.skipGrace();
    const church = await (async () => { let c = null; const t0 = Date.now(); while (!c && Date.now() - t0 < 8000) { c = T.scene.getObjectByName('coldwater-church'); if (!c) await wait(50); } return c; })();
    ok(!!church && Array.isArray(church.userData.solids) && church.userData.solids.length >= 60,
      'church shell defines userData.solids (' + (church && church.userData.solids ? church.userData.solids.length : 0) + ')');
    if (!church || !church.userData.solids) return out.join('\n');
    church.updateMatrixWorld(true);
    const nearSolids = T.worldSolids.filter((s) => Math.hypot(s.x - church.position.x, s.z - church.position.z) < 7);
    ok(nearSolids.length >= church.userData.solids.length,
      'church wall solids registered in worldSolids (' + nearSolids.length + ')');

    for (const t of T.trees) if (Math.hypot(t.x - church.position.x, t.z - church.position.z) < 14) t.alive = false;
    for (const r of T.rocks) if (Math.hypot(r.x - church.position.x, r.z - church.position.z) < 14) r.alive = false;

    const toWorld = (lx, lz) => church.localToWorld(new T.THREE.Vector3(lx, 0, lz));
    const toLocal = (v) => church.worldToLocal(v.clone());

    // Align movement yaw with church.rotation.y: KeyW=+z, KeyS=-z, KeyA=+x, KeyD=-x.
    const waitSim = async (sec, maxMs = 8000, stepFn) => {
      const s0 = T.getSimTime ? T.getSimTime() : 0, t0 = Date.now();
      while (Date.now() - t0 < maxMs) {
        if (stepFn && stepFn()) return true;
        if (T.getSimTime && T.getSimTime() - s0 >= sec) return true;
        await wait(30);
      }
      return false;
    };
    T.rotateCamera(church.rotation.y);
    await waitSim(0.9, 6000);

    const walkKey = async (lx0, lz0, code, k, simSec, stopIf) => {
      const p0 = toWorld(lx0, lz0);
      T.player.position.set(p0.x, T.sampleHeight(p0.x, p0.z), p0.z);
      T.setVelDbg && T.setVelDbg(0, 0);
      await waitSim(0.05, 1000);
      T.player.position.set(p0.x, T.sampleHeight(p0.x, p0.z), p0.z);
      T.setVelDbg && T.setVelDbg(0, 0);
      key(code, k, true);
      await waitSim(simSec, 8000, () => {
        T.clearZombies && T.clearZombies();
        return stopIf ? stopIf(toLocal(T.player.position)) : false;
      });
      key(code, k, false);
      T.setVelDbg && T.setVelDbg(0, 0);
      await waitSim(0.05, 1000);
      return toLocal(T.player.position);
    };

    // 1. All four walls stop him from outside and from inside.
    const lwOut = await walkKey(-4.3, 0, 'KeyA', 'a', 0.65);
    ok(lwOut.x < -3.3 && lwOut.x > -4.15, 'left wall stops him from outside (x=' + lwOut.x.toFixed(2) + ', z=' + lwOut.z.toFixed(2) + ')');
    const lwIn = await walkKey(-1.7, 0, 'KeyD', 'd', 0.65);
    ok(lwIn.x > -2.7 && lwIn.x < -1.85, 'left wall stops him from inside (x=' + lwIn.x.toFixed(2) + ', z=' + lwIn.z.toFixed(2) + ')');

    const rwOut = await walkKey(4.3, 0, 'KeyD', 'd', 0.65);
    ok(rwOut.x > 3.3 && rwOut.x < 4.15, 'right wall stops him from outside (x=' + rwOut.x.toFixed(2) + ', z=' + rwOut.z.toFixed(2) + ')');
    const rwIn = await walkKey(1.7, 0, 'KeyA', 'a', 0.65);
    ok(rwIn.x < 2.7 && rwIn.x > 1.85, 'right wall stops him from inside (x=' + rwIn.x.toFixed(2) + ', z=' + rwIn.z.toFixed(2) + ')');

    const bwOut = await walkKey(0, -6.3, 'KeyW', 'w', 0.65);
    ok(bwOut.z < -5.3 && bwOut.z > -6.15, 'back wall stops him from outside (x=' + bwOut.x.toFixed(2) + ', z=' + bwOut.z.toFixed(2) + ')');
    const bwIn = await walkKey(0, -3.7, 'KeyS', 's', 0.65);
    ok(bwIn.z > -4.7 && bwIn.z < -3.85, 'back wall stops him from inside (x=' + bwIn.x.toFixed(2) + ', z=' + bwIn.z.toFixed(2) + ')');

    const fwOut = await walkKey(-2.0, 6.2, 'KeyS', 's', 0.65);
    ok(fwOut.z > 5.3 && fwOut.z < 6.05, 'front wall stops him from outside (x=' + fwOut.x.toFixed(2) + ', z=' + fwOut.z.toFixed(2) + ')');
    const fwIn = await walkKey(2.0, 3.8, 'KeyW', 'w', 0.65);
    ok(fwIn.z < 4.7 && fwIn.z > 3.95, 'front wall stops him from inside (x=' + fwIn.x.toFixed(2) + ', z=' + fwIn.z.toFixed(2) + ')');

    // 2. Under a window (x = -3, z = 0), solid is sill height (1.2 m): round above sill passes through, round below sill stops.
    const wOut = toWorld(-4.2, 0), wWall = toWorld(-3.0, 0), wIn = toWorld(0, 0);
    const rlen = Math.hypot(wIn.x - wOut.x, wIn.z - wOut.z) || 1;
    const rdx = (wIn.x - wOut.x) / rlen, rdz = (wIn.z - wOut.z) / rlen;
    const wGy = T.sampleHeight(wWall.x, wWall.z);
    const hiRound = T.fireRoundDbg(wOut.x, wGy + 1.85, wOut.z, rdx, 0, rdz, 20, 45, 0);
    for (let k = 0; k < 6; k++) T.stepProjectilesDbg(0.016);
    const hiLocalX = toLocal(hiRound.pos).x;
    ok(T.projectiles.includes(hiRound) && hiLocalX > -1.0, 'round above the window sill passes through the window (x=' + hiLocalX.toFixed(2) + ')');
    const loRound = T.fireRoundDbg(wOut.x, wGy + 0.65, wOut.z, rdx, 0, rdz, 20, 45, 0);
    for (let k = 0; k < 6; k++) T.stepProjectilesDbg(0.016);
    const loLocalX = toLocal(loRound.pos).x;
    ok(!T.projectiles.includes(loRound) && loLocalX < -2.2, 'round below the window sill hits the wall under the window (x=' + loLocalX.toFixed(2) + ')');

    // 3. He walks in through the front door down the aisle to the cross and receives the blessing.
    const crossPos = await walkKey(0, 6.3, 'KeyS', 's', 3.2, (lp) => lp.z < -2.0);
    ok(Math.abs(crossPos.x) <= 1.15 && crossPos.z >= -3.55 && crossPos.z <= -1.35,
      'he walks in through the door down the aisle to the cross (x=' + crossPos.x.toFixed(2) + ', z=' + crossPos.z.toFixed(2) + ')');
    T.setHp(40);
    key('KeyC', 'c', true);
    await waitSim(0.25, 4000);
    const glow = T.scene.getObjectByName('chapel-glow');
    ok(T.getHp() > 40 && glow && glow.material.opacity > 0.15,
      'crouching at the cross triggers the chapel blessing (hp=' + T.getHp() + ', glow=' + (glow ? glow.material.opacity.toFixed(2) : 'none') + ')');
    key('KeyC', 'c', false);
    await waitSim(0.08, 1000);

    // 4. A zombie outside the front doorway walks in through the door.
    const pInside = toWorld(0, 1.2), zStart = toWorld(0, 6.4);
    T.player.position.set(pInside.x, T.sampleHeight(pInside.x, pInside.z), pInside.z);
    T.setHp(T.getMaxHp());
    T.clearZombies && T.clearZombies();
    const z = T.spawnZombie(zStart.x, zStart.z, 'shambler', true, true);
    T.updateFlowField && T.updateFlowField(0, true);
    await waitSim(4.5, 10000, () => {
      if (!z || !z.alive) return false;
      const lz = toLocal(z.mesh.position);
      return lz.z < 4.3 && Math.abs(lz.x) < 1.2;
    });
    const lzEnd = z ? toLocal(z.mesh.position) : { x: 99, z: 99 };
    const zEntered = !!(z && z.alive && lzEnd.z < 4.3 && Math.abs(lzEnd.x) < 1.2);
    ok(zEntered, 'a zombie walks in through the front door (x=' + lzEnd.x.toFixed(2) + ', z=' + lzEnd.z.toFixed(2) + ')');
    T.clearZombies && T.clearZombies();
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  for (const [code, k] of [['KeyW', 'w'], ['KeyS', 's'], ['KeyA', 'a'], ['KeyD', 'd'], ['KeyC', 'c']]) {
    try { window.dispatchEvent(new KeyboardEvent('keyup', { code, key: k, bubbles: true })); } catch (_) {}
  }
  return out.join('\n');
})()
