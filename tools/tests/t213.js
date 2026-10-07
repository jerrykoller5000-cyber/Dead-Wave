// t213 - CL-131 (from GB-138): the Watchman MG, carried and fired.
//  - Manned, the gun tips with the aim on its own hinge (the tripod stays put): up at a high mark, down at a low one,
//    held at the cradle's limits; the barrel lies on the line to the mark and the round still leaves its muzzle.
//  - Each round throws a spent case (down) and a link (out to the right), and is heard as the Watchman ('m240'), not the AK.
//  - Shouldered (T) it is the Watchman on his right shoulder, legs folded under the barrel, muzzle forward and up; not the
//    mortar. Set down, nothing is left on him.
//  - Brandt's roof M240 tips down at a mark on the ground.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(30); } return !!f(); };
  const f2 = (v) => (+v).toFixed(2), deg = (r) => (r * 180 / Math.PI).toFixed(1);
  const THREE = T.THREE || window.THREE;
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'Watchman2');
    T.clearZombies && T.clearZombies(); T.setHp(100000); T.unlockAllBuilds();
    const V = T.m240VisDbg;
    ok(typeof V === 'function', 'TT.m240VisDbg is exported');
    const p = T.player.position;
    const hc = T.house && T.house.group ? T.house.group.position : { x: p.x - 1, z: p.z };
    let ux = p.x - hc.x, uz = p.z - hc.z; { const l = Math.hypot(ux, uz); if (l < 0.5) { ux = 1; uz = 0; } else { ux /= l; uz /= l; } }
    const half = (T.house && T.house.half) || 6, S = { x: hc.x + ux * (half + 12), z: hc.z + uz * (half + 12) };
    p.set(S.x, T.sampleHeight(S.x, S.z), S.z);
    await wait(150);
    const gun = T.spawnBuild('m240', S.x + ux * 1.2, S.z + uz * 1.2);
    const elev = gun && gun.mesh.userData.elev;
    ok(!!elev && elev.children.length > 3 && !!gun.mesh.userData.barrel && elev.getObjectById(gun.mesh.userData.barrel.id), 'the gun sits on its own hinge (userData.elev holds the barrel)');
    ok(T.mountMortar(gun) === true, 'manned');
    const yaw = gun.mesh.rotation.y, gx = gun.mesh.position.x, gz = gun.mesh.position.z, gy = gun.mesh.position.y;
    const fwd = () => new THREE.Vector3(0, 0, 1).transformDirection(elev.matrixWorld);
    const aimAt = async (h) => {   // a mark 10 m out along its bearing, h m above the ground there
      const tx = gx + Math.sin(yaw) * 10, tz = gz + Math.cos(yaw) * 10, ty = T.sampleHeight(tx, tz) + h;
      for (let i = 0; i < 40; i++) { T.aimPointDbg(tx, ty, tz); await wait(30); }
      gun.mesh.updateMatrixWorld(true);
      const mz = T.m240MuzzleWorld(gun.mesh, new THREE.Vector3());
      const to = new THREE.Vector3(tx - mz.x, ty - mz.y, tz - mz.z).normalize();
      return { pitch: -elev.rotation.x, err: Math.acos(Math.max(-1, Math.min(1, fwd().dot(to)))), mz, t: new THREE.Vector3(tx, ty, tz) };
    };
    const up = await aimAt(4.5);
    ok(up.pitch > 0.2 && up.err < 0.05, 'aimed up at a mark 10 m out and 4.5 m up, the barrel tips up onto it (' + deg(up.pitch) + ' deg up, ' + deg(up.err) + ' deg off)');
    const lvl = await aimAt(1.0);
    ok(Math.abs(lvl.pitch) < 0.12 && lvl.err < 0.05, 'at a chest-high mark it is about level (' + deg(lvl.pitch) + ' deg, ' + deg(lvl.err) + ' deg off)');
    const high = await aimAt(30);
    ok(Math.abs(high.pitch - V().ELEV[1]) < 0.02, 'straight up it stops at the cradle\'s limit (' + deg(high.pitch) + ' deg)');
    const low = await aimAt(-8);
    ok(Math.abs(low.pitch - V().ELEV[0]) < 0.02, 'into the ground it stops at its lower limit (' + deg(low.pitch) + ' deg)');
    ok(gun.mesh.rotation.x === 0 && gun.mesh.rotation.z === 0 && elev.rotation.y === 0 && elev.rotation.z === 0, 'only the gun tips: the tripod stays level and the hinge only elevates');
    // Firing at the high mark: the round leaves the tipped muzzle and climbs.
    const up2 = await aimAt(4.5);
    const before = new Set(); T.scene.traverse((o) => { if (o.isMesh && o.visible) before.add(o); });
    const sp0 = { ...V().spent }, sc0 = { ...(T.AudioSys || window.AudioSys).shotCount };
    T.fireMortar();
    let fresh = null; T.scene.traverse((o) => { if (!fresh && o.isMesh && o.visible && !before.has(o) && o.position.distanceTo(up2.mz) < 0.1) fresh = o; });
    ok(!!fresh, 'a round starts at the tipped muzzle (' + f2(up2.mz.y - gy) + ' m up)');
    const A = T.AudioSys || window.AudioSys;
    ok((A.shotCount.m240 | 0) === (sc0.m240 | 0) + 1 && (A.shotCount.ak | 0) === (sc0.ak | 0), 'it is heard as the Watchman, not the AK (m240 ' + (A.shotCount.m240 | 0) + ', ak ' + (A.shotCount.ak | 0) + ')');
    ok(V().spent.brass === sp0.brass + 1 && V().spent.links === sp0.links + 1, 'one case and one link per round');
    // Where they go: the case down, the link out to the gun's right (their first velocity).
    const right = new THREE.Vector3(1, 0, 0).transformDirection(elev.matrixWorld);
    const CL = V().casingsList, brass = CL[CL.length - 2], link = CL[CL.length - 1];
    ok(!!brass && brass.vy < -0.5, 'the case drops out of the receiver (' + (brass ? f2(brass.vy) : '-') + ' m/s down)');
    { const c = brass && brass.mesh.material.color; ok(!!c && c.r >= c.g && c.g >= c.b && c.g / c.r > 0.7 && c.b / c.r < 0.45, 'the case is brass-coloured (' + (c ? c.getHexString() : '-') + ')'); }
    ok(!!link && link.vx * right.x + link.vy * right.y + link.vz * right.z > 1, 'the link flies out to its right (' + (link ? f2(link.vx * right.x + link.vy * right.y + link.vz * right.z) : '-') + ' m/s)');
    // A burst: 20 rounds, 20 cases and 20 links.
    const sp1 = { ...V().spent };
    for (let i = 0; i < 20; i++) { T.fireMortar(); await wait(100); }
    const n = V().spent.brass - sp1.brass;
    ok(n >= 15 && V().spent.links - sp1.links === n, 'a burst: ' + n + ' cases and ' + (V().spent.links - sp1.links) + ' links');
    // Shouldered: the Watchman on his right shoulder, not the mortar.
    T.shoulderMortar();
    await wait(300);
    ok(V().carried === true && V().carriedMortar === false, 'shouldered, it is the Watchman he carries, not the mortar');
    const cg = V().carriedGun, ud = (T.marine || window.worldMarine).userData;
    cg.updateMatrixWorld(true);
    const sh = ud.armRG.getWorldPosition(new THREE.Vector3()), at = cg.getWorldPosition(new THREE.Vector3());
    ok(at.distanceTo(sh) < 0.3, 'its receiver rests on his right shoulder (' + f2(at.distanceTo(sh)) + ' m from the joint)');
    const cf = new THREE.Vector3(0, 0, 1).transformDirection(cg.matrixWorld), pf = new THREE.Vector3(Math.sin(T.player.rotation.y), 0, Math.cos(T.player.rotation.y));
    ok(cf.dot(pf) > 0.75 && cf.y > 0.2, 'muzzle forward and up (along his facing ' + f2(cf.dot(pf)) + ', up ' + f2(cf.y) + ')');
    const box = new THREE.Box3(), inv = new THREE.Matrix4().copy(cg.userData.gun.matrixWorld).invert(), v = new THREE.Vector3();
    cg.userData.gun.traverse((o) => { if (!o.isMesh || !o.geometry.attributes.position) return; const pa = o.geometry.attributes.position, m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld); for (let i = 0; i < pa.count; i++) box.expandByPoint(v.fromBufferAttribute(pa, i).applyMatrix4(m)); });
    const sz = box.getSize(new THREE.Vector3());
    ok(sz.x < 0.4 && sz.y < 0.45 && sz.z > 1.1, 'its legs are folded under the barrel (' + f2(sz.x) + ' wide, ' + f2(sz.y) + ' high, ' + f2(sz.z) + ' long)');
    // Set down: nothing left on him.
    const fwdP = { x: p.x + pf.x * 2.5, z: p.z + pf.z * 2.5 };
    V().setDown(fwdP.x, fwdP.z);
    await wait(150);
    ok(!T.getMortarCarried() && V().carried === false && V().carriedMortar === false, 'set down, nothing is left on his shoulder');
    // Brandt's gun tips down at a mark on the ground.
    T.clearZombies && T.clearZombies(); T.runDevCommand('godmode');
    const RD = T.roofDbg, L = T.hqLadderAt();
    T.setDay(3); T.startPrep(); await wait(100); RD.takeIn('ranger'); T.startPrep(); await wait(100);
    const bg = T.brandtGunDbg();
    if (!bg) ok(false, 'Brandt is on the roof with his M240');
    else {
      const cx = L.x + 5.15, cz = L.z;
      const zb = T.spawnZombie(cx + 9, cz + 2, 'shambler', true, true); zb.riseT = 0; zb.hp = zb.maxHp = 1e6; zb.speed = zb.baseSpeed = 0;
      T.player.position.set(-5.9, T.sampleHeight(-5.9, -2.2), -2.2);
      T.hqStartWave();
      await until(() => T.brandtGunDbg().shots >= 2, 20000);
      const e = bg.gun.userData.elev;
      ok(!!e && e.rotation.x > 0.05, 'Brandt\'s M240 tips down at a dead man below the roof (' + (e ? deg(e.rotation.x) : '-') + ' deg down, ' + T.brandtGunDbg().shots + ' rounds)');
    }
    T.runDevCommand('godmode off');
    ok(errs.length === 0, 'no errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
