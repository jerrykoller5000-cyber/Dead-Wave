// GB-151 probe (page side): manual 60 fps clock, his aim pinned straight ahead, and where each hand sits on the
// pistol / revolver, in the gun's own axes (metres: x = the gun's right, y = up, z = toward the muzzle).
(() => {
  const T = window.TT, THREE = T.THREE;
  const m = T.getMarine(), ud = m.userData;
  if (!window.__ft) {
    const real = performance.now.bind(performance);
    window.__ft = real(); window.__q = [];
    performance.now = () => window.__ft;
    window.requestAnimationFrame = (cb) => { window.__q.push(cb); return window.__q.length; };
    window.cancelAnimationFrame = () => {};
  }
  const S = window.__S;
  const p = T.localPlayer ? T.localPlayer.position : T.player.position;
  window.__aimPitch = 0;
  const pinAim = () => { p.x = S.x; p.z = S.z; T.aimTarget.set(S.x, S.y + 1.25 + Math.tan(window.__aimPitch) * 30, S.z + 30); T.setAimYawDbg(0); };
  window.__step = (n = 1) => { for (let i = 0; i < n; i++) { pinAim(); window.__ft += 1000 / 60; const q = window.__q; window.__q = []; for (const cb of q) cb(window.__ft); } };
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  // Points on each hand (elbow space at rest, from studio/marine-body.js), through the wrist as it is turned now.
  const HP = (side) => { const ox = side < 0 ? .02 : -.01, gz = side < 0 ? .08 : .07;
    return { palm: V(ox, -.253, gz - .003), knuckles: V(ox, -.278, gz + .029), index: V(ox + side * -.031, -.278, gz + .029), little: V(ox + side * .029, -.278, gz + .029),
      thumbBase: V(ox - side * .041, -.244, gz + .014), thumbTip: V(ox - side * .034, -.262, gz + .04) }; };
  const handPts = (elbowG, side) => {
    const wr = elbowG.userData.wrist; wr.updateMatrixWorld(true); const o = {};
    // GB-151 draws the hands mirrored about their middle line (x = the wrist's x) with a pistol or revolver.
    const mir = wr.children.length && wr.children[0].scale.x < 0;
    const rig = wr.userData.hand;
    if (rig) {   // GB-152: the fingered hand's own points, current pose
      const names = { palm: 'palm', knuckles: 'middleBase', index: 'indexBase', little: 'littleBase', thumbBase: 'thumbBase', thumbTip: 'thumbTip', indexTip: 'indexTip' };
      for (const [k, n] of Object.entries(names)) o[k] = wr.localToWorld(rig.point(n, V()).sub(wr.position));
    } else for (const [k, v] of Object.entries(HP(side))) { const q = v.clone(); if (mir) q.x = 2 * wr.position.x - q.x; o[k] = wr.localToWorld(q.sub(wr.position)); }
    o.mirrored = mir;
    o.wrist = wr.getWorldPosition(V()); o.elbow = elbowG.getWorldPosition(V());
    return o;
  };
  window.__gripMeasure = () => {
    m.updateMatrixWorld(true);
    const w = T.getCurrentWeapon(), gun = T.weaponMeshes[w], H = T.getShoulderDbg().holds[w];
    gun.updateMatrixWorld(true);
    const gq = gun.getWorldQuaternion(new THREE.Quaternion()), inv = gq.clone().invert();
    const anchor = gun.localToWorld(V(...H.grip));
    const loc = (v) => v.clone().sub(anchor).applyQuaternion(inv);
    const r3 = (v) => v.toArray().map((x) => +x.toFixed(3));
    const R = handPts(ud.elbowRG, 1), L = handPts(ud.elbowLG, -1);
    const out = { weapon: w };
    for (const [n, P] of [['R', R], ['L', L]]) { out[n] = {}; for (const [k, v] of Object.entries(P)) out[n][k] = v && v.isVector3 ? r3(loc(v)) : v; }
    const fwd = V(0, 0, 1).applyQuaternion(gq);
    const deg = (a, b) => +(Math.acos(Math.max(-1, Math.min(1, a.clone().normalize().dot(b.clone().normalize())))) * 57.2958).toFixed(1);
    out.forearmR_vs_barrel = deg(R.wrist.clone().sub(R.elbow), fwd);
    out.forearmL_vs_barrel = deg(L.wrist.clone().sub(L.elbow), fwd);
    const bend = (e) => +(new THREE.Quaternion().copy(e.quaternion).angleTo(new THREE.Quaternion()) * 57.2958).toFixed(1);
    out.elbowBendR = bend(ud.elbowRG); out.elbowBendL = bend(ud.elbowLG);
    out.thumbsGap = +R.thumbTip.distanceTo(L.thumbTip).toFixed(3);
    out.palmL_to_fingersR = +L.palm.distanceTo(R.knuckles).toFixed(3);
    out.palmGap = +L.palm.distanceTo(R.palm).toFixed(3);
    const shR = ud.armRG.getWorldPosition(V()), shL = ud.armLG.getWorldPosition(V());
    out.reachR = +shR.distanceTo(R.wrist).toFixed(3); out.reachL = +shL.distanceTo(L.wrist).toFixed(3);
    out.wristTurn = T.handsDbg.wrist(); out.gripA = T.handsDbg.gripA();
    const gL = T.handsDbg.gripPoint('L', V()), gR = T.handsDbg.gripPoint('R', V());
    out.gripPointR = r3(loc(gR)); out.gripPointL = r3(loc(gL));
    out.foreAnchor = r3(loc(gun.localToWorld(V(...H.fore))));
    out.gripInTorso = r3(ud.torsoG.worldToLocal(anchor.clone()));
    { // where the hold alone puts the grip (no slide), torso space, and how far the old (pre-GB-151) cup anchor was from the support shoulder
      const shW = ud.armRG.getWorldPosition(V()); const aT = T.aimTarget;
      const pitch = Math.max(-0.75, Math.min(0.6, Math.atan2(aT.y - shW.y, Math.max(0.5, Math.hypot(aT.x - shW.x, aT.z - shW.z)))));
      const o = V(H.hold[0], H.hold[1], H.hold[2]).applyAxisAngle(V(1, 0, 0), -pitch * 0.7);
      out.holdInTorso = r3(ud.armRG.position.clone().add(o));
      const OLD = { pistol: [-0.137, -0.112, 0.007], revolver: [-0.12, -0.11, -0.02] }[w];
      if (OLD) out.oldForeFromShoulderL = +gun.localToWorld(V(...OLD)).distanceTo(shL).toFixed(3);
    }
    out.foreFromShoulderL = +gun.localToWorld(V(...H.fore)).distanceTo(shL).toFixed(3);
    return out;
  };
  // Visible meshes and triangles: the whole marine, and his two hands (under the wrists).
  window.__marineStats = () => {
    const vis = (o, stop) => { for (let x = o; x && x !== stop; x = x.parent) if (!x.visible) return false; return true; };
    const tri = (o) => { const g = o.geometry; return g ? (g.index ? g.index.count : g.attributes.position.count) / 3 : 0; };
    let mm = 0, mt = 0, hm = 0, ht = 0;
    m.traverse((o) => { if (!o.isMesh || !vis(o, null)) return; mm++; mt += tri(o); });
    for (const e of [ud.elbowRG, ud.elbowLG]) e.userData.wrist.traverse((o) => { if (!o.isMesh || !vis(o, null)) return; hm++; ht += tri(o); });
    return { marineMeshes: mm, marineTris: Math.round(mt), handMeshes: hm, handTris: Math.round(ht) };
  };
  // A camera on a hand (R or L): off = metres in the marine's torso axes from the hand's grip point.
  window.__handView = (side, off, fov = 18) => {
    m.updateMatrixWorld(true);
    const e = side === 'L' ? ud.elbowLG : ud.elbowRG, wr = e.userData.wrist;
    const a = wr.localToWorld(wr.userData.grip.clone().sub(wr.position));
    const q = ud.torsoG.getWorldQuaternion(new THREE.Quaternion());
    const c = V(...off).applyQuaternion(q).add(a);
    T.setShotView({ x: c.x, y: c.y, z: c.z, tx: a.x, ty: a.y, tz: a.z, fov });
  };
  // A camera in the gun's frame: off = metres (gun axes) from the grip anchor, looking at the anchor.
  window.__gunView = (off, fov = 22) => {
    const w = T.getCurrentWeapon(), gun = T.weaponMeshes[w], H = T.getShoulderDbg().holds[w];
    m.updateMatrixWorld(true);
    const gq = gun.getWorldQuaternion(new THREE.Quaternion());
    const a = gun.localToWorld(V(...H.grip)).add(V(0, 0.01, 0.02).applyQuaternion(gq));
    const c = V(...off).applyQuaternion(gq).add(a);
    T.setShotView({ x: c.x, y: c.y, z: c.z, tx: a.x, ty: a.y, tz: a.z, fov });
  };
})();
