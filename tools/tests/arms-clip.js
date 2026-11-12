// CB-290 (J126 rule 3, Jerry 10 Nov, D-138: "No part of the players' arms or legs may clip through any game object"), the arms'
// half, for tcb290 and tcb290b (each a few guns, for the suite's time limit). In the Training Ground, a solid set in front of him
// (a wall, a door, a crate, a station: GP-20100's walk-check boxes, pushed into the Training Ground's solids, which the hold's
// wall probe reads) and he stands, crouches, walks and sprints up to it with each gun; every case fails on any vertex of the
// held gun inside the solid (1 mm in) or either arm (shoulder to elbow to wrist, 4.5 cm round) reaching into it. The legs and
// feet (stairs, ramps, props) are Claude 3's tcc343b.
export async function armsClip(T, weapons, ok, out) {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms = 30000) => { const t = performance.now(); while (performance.now() - t < ms) { if (f()) return true; await wait(40); } return !!f(); };
  if (window.DWOpening?.dismissForTesting) DWOpening.dismissForTesting();
  const name = document.getElementById('playerName'); if (name) name.value = 'CB-290';
  if (!T.trainingDbg.state().active) document.getElementById('modeTraining').click();
  ok(await until(() => T.trainingDbg.state().active && T.getPhase() === 'prep', 60000), 'the Training Ground is open');
  await until(() => !document.getElementById('trainingBlackout')?.classList.contains('on'), 30000);
  const tg = T.trainingDbg.tg(), y = tg.floorY, V = T.THREE.Vector3;
  T.grantAllWeapons(); T.setUnarmedDbg && T.setUnarmedDbg(false); T.setViewFirstDbg && T.setViewFirstDbg(false);
  T.flightHold(true);
  const BOX = {
    wall: { minX: -1, maxX: 1, minY: y, maxY: y + 2.2, minZ: -640.42, maxZ: -640.32 },
    door: { minX: -0.38, maxX: 0.38, minY: y, maxY: y + 2.2, minZ: -640.42, maxZ: -640.32 },
    crate: { minX: -0.6, maxX: 0.6, minY: y, maxY: y + 1.55, minZ: -640.42, maxZ: -640.03 },
    station: { minX: -1.1, maxX: 1.1, minY: y, maxY: y + 1.7, minZ: -640.42, maxZ: -640.05 },
  };
  const CASES = [
    { kind: 'wall', stance: 'still', z: -640.9 }, { kind: 'wall', stance: 'crouch', z: -640.9 },
    { kind: 'wall', stance: 'walk', z: -641.15 }, { kind: 'wall', stance: 'sprint', z: -641.15 },
    { kind: 'door', stance: 'still', z: -640.9 }, { kind: 'crate', stance: 'still', z: -640.9 },
    { kind: 'crate', stance: 'crouch', z: -640.9 }, { kind: 'station', stance: 'still', z: -640.9 },
  ];
  let box = null;
  const setBox = (kind) => { if (box) { const i = tg.solids.indexOf(box); if (i >= 0) tg.solids.splice(i, 1); } box = { ...BOX[kind] }; tg.solids.push(box); };
  const step = (n) => { for (let i = 0; i < n; i++) T.stepFrame(1 / 30); };
  const inBox = (v, r) => v.x > box.minX - r && v.x < box.maxX + r && v.y > box.minY - r && v.y < box.maxY + r && v.z > box.minZ - r && v.z < box.maxZ + r;
  const sample = () => {
    const g = T.weaponMeshes[T.getCurrentWeapon()], m = T.getMarine(), u = m.userData, v = new V();
    g.updateMatrixWorld(true); m.updateMatrixWorld(true);
    let gun = 0, arm = 0, worst = '';
    g.traverse((o) => {
      if (!o.isMesh || !o.geometry?.attributes?.position || o === g.userData.flash || o === g.userData.laser || /flash|laser|beam/i.test(o.name || '')) return;
      for (let a = o; a && a !== g; a = a.parent) if (!a.visible) return;
      const P = o.geometry.attributes.position;
      for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld); if (inBox(v, -0.001)) { gun++; worst = worst || (o.name || 'gun part'); } }
    });
    for (const side of ['R', 'L']) {
      const a = u['arm' + side + 'G'], e = u['elbow' + side + 'G'], w = e && e.getObjectByName('wrist');
      const pts = [a, e, w].filter(Boolean).map((o) => o.getWorldPosition(new V()));
      for (let j = 0; j < pts.length - 1; j++) for (let n = 0; n <= 16; n++) if (inBox(pts[j].clone().lerp(pts[j + 1], n / 16), 0.045)) { arm++; worst = worst || (side === 'R' ? 'right' : 'left') + (j ? ' forearm' : ' upper arm'); }
    }
    return { gun, arm, worst };
  };
  try {
    for (const w of weapons) {
      T.player.position.set(0, y, -642); T.setVelDbg(0, 0); T.flightInput({ keys: [] });
      T.setWeapon(T.WEAPON_ORDER.indexOf(w)); step(30);
      ok(T.getCurrentWeapon() === w, w + ': in hand');
      const bad = [];
      for (const s of CASES) {
        setBox(s.kind); T.setVelDbg(0, 0);
        T.player.position.set(0, y, s.z); T.player.rotation.y = 0; T.setOtsAimDbg(0, 0);
        T.flightInput({ keys: s.stance === 'crouch' ? ['KeyC'] : [] }); step(12);
        T.player.position.set(0, y, s.z); step(2);
        if (s.stance === 'walk' || s.stance === 'sprint') { T.flightInput({ keys: s.stance === 'sprint' ? ['KeyW', 'ShiftLeft'] : ['KeyW'] }); step(s.stance === 'sprint' ? 2 : 3); T.flightInput({ keys: [] }); }
        const r = sample();
        if (r.gun || r.arm) bad.push(s.kind + ' ' + s.stance + ': ' + (r.gun ? r.gun + ' gun vertices' : '') + (r.gun && r.arm ? ', ' : '') + (r.arm ? r.arm + ' arm points' : '') + ' in (' + r.worst + ')');
      }
      ok(!bad.length, w + ': the gun and both arms stay out of the wall, the door, the crate and the station, still, crouched, walking and sprinting up to them (' + (bad.length ? bad.join('; ') : CASES.length + ' cases clear') + ')');
    }
  } finally {
    if (box) { const i = tg.solids.indexOf(box); if (i >= 0) tg.solids.splice(i, 1); }
    T.flightInput({ keys: [] }); T.flightHold(false);
  }
}
