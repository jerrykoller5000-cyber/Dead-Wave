// t254 - GB-170 (Jerry, 2026-10-14): the relaxed hang. Arms straight down, palms against the outer thigh (the palm
// faces the leg, the back of the hand faces out), thumbs forward. In the CIF preview and in the empty-handed idle,
// on both hands, measured in the figure's own space (it faces +z):
//  - the palm normal (wrist +z, the side the fingers curl to) points toward the body midline (-x for the hand at +x);
//  - the thumb tip sits forward (+z) of the palm centre, more forward than sideways.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const THREE = T.THREE, f3 = (v) => v.toFixed(2);
  const check = (fig, label) => {
    fig.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(fig.matrixWorld).invert();
    const toBody = (p) => p.clone().applyMatrix4(inv);
    for (const key of ['wristLG', 'wristRG']) {
      const el = fig.userData[key.replace('wrist', 'elbow')]; let w = fig.userData[key]; if (!(w && w.userData.hand) && el) el.traverse((o) => { if (!(w && w.userData.hand) && o.userData.handRoot) w = o; }); const h = w && w.userData.hand;
      if (!w || !h) { ok(false, label + ' ' + key + ': no hand rig (' + !!fig.userData[key] + ',' + !!el + ')'); continue; }
      const at = toBody(w.getWorldPosition(new THREE.Vector3()));
      // hand space is the elbow's: a point goes into the wrist's frame less the wrist's position (as the grip does)
      const hp = (n) => h.point(n, new THREE.Vector3()).sub(w.position);
      const pc = hp('palm'), o = toBody(w.localToWorld(pc.clone())), n = toBody(w.localToWorld(pc.clone().add(new THREE.Vector3(0, 0, 0.05)))).sub(o).normalize();
      const tt = toBody(w.localToWorld(hp('thumbTip').clone())).sub(o);
      const med = -Math.sign(at.x);
      ok(n.x * med > 0.7, label + ' ' + key + ' (x ' + f3(at.x) + '): palm faces the thigh, normal ' + f3(n.x) + ',' + f3(n.y) + ',' + f3(n.z));
      ok(tt.z > 0.01 && tt.z > Math.abs(tt.x), label + ' ' + key + ': thumb forward, tip-palm ' + tt.x.toFixed(3) + ',' + tt.z.toFixed(3));
    }
  };
  await startMatch(T, 'RelaxHang'); T.clearZombies(); T.setHp(100000);
  if (!T.isUnarmed()) T.toggleHolster();
  T.openCIF(); const t0 = Date.now(); while (!T.cifDressDbg().preview && Date.now() - t0 < 8000) await wait(40); await wait(600);
  const fig = T.cifDressDbg().preview;
  if (fig) check(fig, 'CIF'); else ok(false, 'CIF preview figure');
  T.closeCIF && T.closeCIF();
  { const s0 = T.getSimTime(), w0 = Date.now(); while (T.getSimTime() - s0 < 1.9 && Date.now() - w0 < 15000) await wait(40); }
  let me = null; T.scene.traverse((o) => { if (!me && o.userData && o.userData.elbowRG && o.userData.weaponMount && o !== fig) me = o; });
  if (me) check(me, 'idle'); else ok(false, 'player figure found');
  return out.join('\n');
})()
