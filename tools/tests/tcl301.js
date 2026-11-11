// tcl301 - CL-301 (Jerry, 3 Nov: the akimbo pair in first person was "one big pistol at the bottom left and no hands";
// "Right hand is sticking through minigun"). With a pair the view gun is two guns, the off hand's in the left hand,
// the right hand's hold mirrored across the view (game/viewmodel.js, VM.akimbo). Stepped by hand at 60 frames a second
// in one synchronous run (as tcl293), so the page's own frames don't interleave.
// - Two view guns, one each side of the view, mirrored; each hand on its own gun; the forearms come up from below.
// - Each gun kicks on its own shots only; the view's share of a shot (CL-293) for both.
// - The reload dips both guns and brings them back; the forearms never come at the eye (the giant sleeves, cloud look).
// - The left gun's muzzle in the world is left of the eye (its laser leaves from there); the off hand's own gun is out
//   of the eye's pass; back to one gun drops the second copy.
// - The minigun's right hand grips its rear grip (it was in the old top grip's trigger guard; GP-20022 rebuilt the handles).
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const info = (m) => out.push('INFO ' + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(40); } return !!f(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'CL301');
    T.clearZombies && T.clearZombies(); T.setHp(100000); T.grantAllWeapons();
    const THREE = T.THREE || window.THREE;
    const take = async (w) => { if (T.isUnarmed && T.isUnarmed()) T.toggleHolster(); for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf(w)); await wait(150); } return T.getCurrentWeapon() === w; };
    if (!T.viewmodelDbg || !T.setViewFirstDbg || !T.setDualOwnedDbg || !T.toggleDualWieldDbg) { ok(false, 'the CL-281 and dual hooks are there'); return out.join('\n'); }
    const VM = () => T.viewmodelDbg();
    ok(await take('pistol'), 'a pistol in hand');
    T.setViewFirstDbg(true);
    T.setDualOwnedDbg('pistol', true);
    const armory = T.armoryDbg.ui().armory;
    if (!armory.has('pistol:second')) armory.buy({ id: 'pistol:second', kind: 'pistol', loaded: null }, { store: true });
    const pairTaken = armory.take('pistol:second', 'secondary', 0);
    ok(pairTaken.ok && armory.loadout().secondary.includes('pistol:second'), 'the pistol pair is carried in an Armory secondary slot');
    for (let i = 0; i < 3 && !(VM() && VM().info.akimbo); i++) { T.toggleDualWieldDbg(); await until(() => VM() && VM().info.akimbo, 3000); }
    ok(await until(() => VM() && VM().info.active && VM().info.akimbo && VM().info.raise > 0.99, 20000), 'first person with the pair: the view guns are up (akimbo ' + (VM() && VM().info.akimbo) + ')');
    const vm = VM();
    if (!vm || !vm.gun || !vm.gun2) { ok(false, 'two view guns'); return out.join('\n'); }
    ok(vm.gun2.src !== vm.gun.src && vm.gun2.key === 'pistol', 'two view guns: the right hand\'s and the off hand\'s own copy');
    const G = vm.frame, G2 = vm.frame2, dt = 1 / 60;
    const base = Object.assign({}, T.vmStateDbg ? T.vmStateDbg() : {}, { want: true, weapon: 'pistol', akimbo: true, ads: 0, vx: 0, vz: 0, vy: 0, grounded: true, reloadU: null, settled: false, sprint: false, phase: null, run: 0, stream: false });
    const step = (n, extra) => { for (let i = 0; i < n; i++) vm.update(dt, Object.assign({}, base, extra || {})); };
    step(90);
    ok(Math.abs(G.p.x + G2.p.x) < 0.002 && Math.abs(G.p.y - G2.p.y) < 0.002 && Math.abs(G.p.z - G2.p.z) < 0.002, 'the left gun the right one\'s mirror (' + [G.p.x, G.p.y, G.p.z].map((v) => v.toFixed(3)) + ' / ' + [G2.p.x, G2.p.y, G2.p.z].map((v) => v.toFixed(3)) + ')');
    const n1 = vm.ndc(G.p), n2 = vm.ndc(G2.p);
    ok(n1.x > 0.2 && n2.x < -0.2 && n1.y < -0.1 && n1.y > -0.8, 'one each side of the view, low (ndc ' + n1.x.toFixed(2) + ', ' + n1.y.toFixed(2) + ' and ' + n2.x.toFixed(2) + ')');
    const W = vm.wrists, grip = new THREE.Vector3(0, -0.066, -0.016);   // WEAPON_HOLD.pistol.grip, the gun's own space
    const g1 = vm.viewPoint(grip, new THREE.Vector3(), 1), g2 = vm.viewPoint(new THREE.Vector3(-grip.x, grip.y, grip.z), new THREE.Vector3(), 2);
    const d1 = W.r.p.distanceTo(g1), d2 = W.l.p.distanceTo(g2);
    info('G ' + [G.p.x, G.p.y, G.p.z, G.s].map((v) => v.toFixed(3)) + ' grip ' + [g1.x, g1.y, g1.z].map((v) => v.toFixed(3)) + ' WR ' + [W.r.p.x, W.r.p.y, W.r.p.z].map((v) => v.toFixed(3)) + ' sock ' + vm.sockets.r.p.toArray().map((v) => v.toFixed(3)) + ' s ' + vm.sockets.r.s.toFixed(3));
    ok(d1 < 0.12 && d2 < 0.12 && Math.abs(d1 - d2) < 0.02 && Math.abs(W.r.p.x + W.l.p.x) < 0.03, 'each hand on its own gun\'s grip (wrists ' + d1.toFixed(3) + ', ' + d2.toFixed(3) + ' m from the grips), mirrored');
    ok(vm.info.handPlace === 'pair' && vm.info.wrist.r <= 0.871 && vm.info.wrist.l <= 0.871, 'the left hand holds its gun (' + vm.info.handPlace + '), wrists within their bend (' + vm.info.wrist.r.toFixed(2) + ', ' + vm.info.wrist.l.toFixed(2) + ')');
    // the forearms: from the wrist toward the elbow is the arm root's +y (the root is at the elbow)
    const fore = (a) => new THREE.Vector3(0, 1, 0).applyQuaternion(a.root.quaternion);
    const fr = fore(vm.arms.r), fl = fore(vm.arms.l);
    info('forearm r ' + [fr.x, fr.y, fr.z].map((v) => v.toFixed(2)) + ' l ' + [fl.x, fl.y, fl.z].map((v) => v.toFixed(2)) + ', elbows z ' + vm.arms.r.root.position.z.toFixed(3) + ', ' + vm.arms.l.root.position.z.toFixed(3));
    // CL-325 (J73: the palms "parallel with arms"): the forearms run back toward him in line with the hands, a little below
    // them (was: up steeply from below, y < -0.35, the 3 Nov answer to "out flat to the sides", which the next check keeps)
    ok(fr.z > 0.75 && fl.z > 0.75 && fr.y < -0.1 && fl.y < -0.1, 'the forearms run back toward him, below the hands (back ' + fr.z.toFixed(2) + ', ' + fl.z.toFixed(2) + '; down ' + fr.y.toFixed(2) + ', ' + fl.y.toFixed(2) + ')');
    ok(Math.abs(fr.x) < 0.75 && Math.abs(fl.x) < 0.75, 'not out flat to the sides (across ' + fr.x.toFixed(2) + ', ' + fl.x.toFixed(2) + ')');
    // each gun its own kick
    const kickOf = (src) => { const a1 = G.p.clone(), a2 = G2.p.clone(); src.userData.shots = (src.userData.shots | 0) + 1; step(4); return [G.p.distanceTo(a1), G2.p.distanceTo(a2)]; };
    step(60);
    const kL = kickOf(vm.gun2.src); step(60);
    const kR = kickOf(vm.gun.src); step(60);
    ok(kL[1] > 0.004 && kL[0] < 0.0015, 'a left shot kicks the left gun only (' + kL.map((v) => (v * 100).toFixed(2)).join(', ') + ' cm)');
    ok(kR[0] > 0.004 && kR[1] < 0.0015, 'a right shot kicks the right gun only (' + kR.map((v) => (v * 100).toFixed(2)).join(', ') + ' cm)');
    { vm.gun2.src.userData.shots = (vm.gun2.src.userData.shots | 0) + 1; step(4); const pu = vm.cameraPunch(); ok(pu.p > 0, 'a left shot turns the drawn view up too (' + pu.p.toFixed(4) + ' rad)'); step(60); }
    // the reload: both dip and come back, the forearms never at the eye
    // CL-306: the pair reloads one gun at a time (the right first, then the left); CL-325 checks that in place of CL-301's
    // both-together mirror (each gun dips in its own half while the other holds still)
    const y0 = G.p.y, y20 = G2.p.y; let low = 0, elbowZ = -9, rA = 0, lA = 0, rB = 0, lB = 0;
    for (let i = 0; i <= 60; i++) {
      vm.update(dt, Object.assign({}, base, { reloadU: i / 60 }));
      low = Math.max(low, y0 - G.p.y);
      if (i <= 27) { rA = Math.max(rA, y0 - G.p.y); lA = Math.max(lA, Math.abs(y20 - G2.p.y)); }
      if (i >= 31) { lB = Math.max(lB, y20 - G2.p.y); rB = Math.max(rB, Math.abs(y0 - G.p.y)); }
      elbowZ = Math.max(elbowZ, vm.arms.r.root.position.z, vm.arms.l.root.position.z);
    }
    step(60);
    ok(low > 0.08 && Math.abs(G.p.y - y0) < 0.01, 'the reload dips both guns ' + (low * 100).toFixed(1) + ' cm and brings them back (' + ((G.p.y - y0) * 100).toFixed(2) + ' cm off)');
    ok(rA > 0.08 && lA < 0.01 && lB > 0.08 && rB < 0.01, 'one gun at a time: the right dips ' + (rA * 100).toFixed(1) + ' cm while the left holds (' + (lA * 100).toFixed(2) + '), then the left ' + (lB * 100).toFixed(1) + ' cm while the right holds (' + (rB * 100).toFixed(2) + ')');
    ok(elbowZ < -0.06, 'the elbows stay well ahead of the eye through the reload (nearest ' + elbowZ.toFixed(3) + ' m)');
    // the left gun's muzzle in the world: left of the eye
    { const m = new THREE.Vector3(); const got = vm.muzzleWorld(m, 2); const cam = T.camera; cam.updateMatrixWorld(); const local = got ? m.clone().applyMatrix4(cam.matrixWorld.clone().invert()) : null;
      ok(!!got && local.x < -0.05 && local.z < 0, 'the left muzzle is left of the eye in the world (' + (local ? [local.x, local.y, local.z].map((v) => v.toFixed(2)) : 'none') + ')'); }
    { let mesh = null; vm.gun2.src.traverse((o) => { if (!mesh && o.isMesh) mesh = o; }); ok(!!mesh && vm.isEyeHidden(mesh), 'the off hand\'s own gun is out of the eye\'s pass'); }
    // back to one gun
    T.toggleDualWieldDbg();
    ok(await until(() => VM().info.active && !VM().info.akimbo && !VM().gun2 && VM().info.raise > 0.99, 8000), 'back to one gun: one view gun (' + VM().info.akimbo + ')');
    // the minigun's right hand: its grip point in the top grip's middle
    ok(await take('minigun'), 'the minigun in hand');
    ok(await until(() => VM().info.active && VM().info.key === 'minigun' && VM().info.raise > 0.99, 20000), 'its view gun is up');
    { const v = VM(), s = v.sockets.r, L = v.arms.r.layout;
      const c = new THREE.Vector3(L.grip[0] - L.wrist[0], L.grip[1] - L.wrist[1], L.grip[2] - L.wrist[2]).multiplyScalar(s.s).applyQuaternion(s.q).add(s.p);
      // GP-20022 rebuilt the gun to Jerry's refs: the firing hand on the rear grip behind the housing (ChatGPT's centre (0, -0.017, -0.52));
      // GP-20063 scaled the gun 0.70 and CL-322 the grip with it: (0, -0.0119, -0.364)
      ok(Math.abs(c.x) < 0.02 && Math.abs(c.y + 0.0119) < 0.02 && Math.abs(c.z + 0.364) < 0.02, 'the minigun\'s right hand grips its rear grip (' + [c.x, c.y, c.z].map((x) => x.toFixed(3)) + '; the grip\'s centre 0, -0.012, -0.364)'); }
    ok(errs.length === 0, 'no page errors (' + errs.slice(0, 2).join(' | ') + ')');
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
