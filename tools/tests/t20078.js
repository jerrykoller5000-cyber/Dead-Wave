// GU-9. These use the ordinary Hunt input handlers, HQ roof, ladder and camera.
(async () => {
  const T = window.TT, out = [];
  const check = (ok, message) => out.push((ok ? 'PASS ' : 'FAIL ') + message);
  const key = (code, down) => document.body.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', {
    code, bubbles: true, cancelable: true
  }));
  const step = n => { for (let i = 0; i < n; i++) T.stepFrame(1 / 60); };
  try {
    await startMatch(T, 'Player movement');
    T.clearZombies(); T.setHp(100000); T.flightHold(true);
    const host = T.inspectHostDbg(), p = T.player.position, ladder = T.hqLadderAt();
    host.placePlayer(ladder.x - .5, ladder.z);
    p.set(ladder.x, ladder.y, ladder.z);
    key('KeyW', true); step(15); key('KeyW', false);
    const attached = T.lightningDbg.ladderNow()?.key, before = T.jumpFeelDbg().launches;
    key('Space', true); step(11); key('Space', false);
    check(!!attached && T.lightningDbg.ladderNow()?.key === attached && T.jumpFeelDbg().launches === before,
      'pressing Space on the occupied HQ ladder keeps the player attached');
    T.stepHqLadder(1, 4);
    p.set(ladder.x + 1.1, ladder.roof, ladder.z + 1.5); T.setVelDbg(0, 0); step(6);
    const roofY = p.y;
    key('KeyD', true);
    let air = 0, maxDrop = 0, landed = false;
    for (let i = 0; i < 180; i++) {
      const y = p.y; step(1);
      maxDrop = Math.max(maxDrop, y - p.y);
      if (!T.jumpFeelDbg().grounded) air++;
      else if (p.y < roofY - 2) { landed = true; break; }
    }
    key('KeyD', false); step(30);
    check(landed && air >= 20 && maxDrop < .5, 'the player falls off the roof and lands (' +
      air + ' airborne frames, largest drop ' + maxDrop.toFixed(3) + ' m/frame)');
    const launchCount = T.jumpFeelDbg().launches, floorY = p.y;
    key('Space', true); key('Space', false);
    let peak = floorY;
    for (let i = 0; i < 90; i++) { step(1); peak = Math.max(peak, p.y); }
    check(T.jumpFeelDbg().launches === launchCount + 1 && peak > floorY + .35 && T.jumpFeelDbg().grounded,
      'a tap entirely between frames launches once and lands (' + (peak - floorY).toFixed(3) + ' m)');
    T.setViewFirstDbg(true); step(120);
    const eye = T.camera.position.clone();
    T.setViewFirstDbg(false); step(1);
    const firstFrame = eye.distanceTo(T.camera.position);
    check(firstFrame < .2, 'the first departing camera frame starts at eye level (' + firstFrame.toFixed(3) + ' m)');
    step(120);
    // Sample the actual low outsole vertices. A perfectly timed clip may still hover above the floor.
    const G = T.THREE, rig = T.getMarine().userData;
    const boots = [rig.ankleLG, rig.ankleRG].map(ankle => {
      ankle.updateWorldMatrix(true, true);
      const inv = ankle.matrixWorld.clone().invert(), v = new G.Vector3(), all = [];
      ankle.traverse(mesh => {
        if (!mesh.isMesh || mesh.isSkinnedMesh) return;
        const transform = new G.Matrix4().multiplyMatrices(inv, mesh.matrixWorld), points = mesh.geometry.attributes.position;
        for (let i = 0; i < points.count; i++) all.push(v.fromBufferAttribute(points, i).applyMatrix4(transform).clone());
      });
      const bottom = all.reduce((lo, a) => Math.min(lo, a.y), Infinity);
      return { ankle, points: all.filter(a => a.y < bottom + .006), contacts: 0 };
    });
    const level = T.sampleHeight(18,18), right = new G.Vector3(), tmp = new G.Vector3();
    T.levelGroundRect(8,5,28,32,level,5);
    host.placePlayer(18,12,0); p.y = level; T.setVelDbg(0,0);
    T.pinAimDbg(() => { T.aimTarget.set(p.x, p.y+1.3, p.z+12); T.setAimYawDbg(0); });
    step(18); key('KeyW',true); key('ShiftLeft',true); step(32);
    let flight = 0;
    for (let i = 0; i < 60; i++) {
      step(1); T.player.updateMatrixWorld(true);
      let supports = 0;
      for (const boot of boots) {
        const sole = boot.points.reduce((lo, v) => Math.min(lo, tmp.copy(v).applyMatrix4(boot.ankle.matrixWorld).y), Infinity);
        if (Math.abs(sole - level) <= .015) { boot.contacts++; supports++; }
      }
      if (!supports) flight++;
    }
    check(boots.every(b => b.contacts >= 2) && flight > 0, 'each sprinting boot supports the body, with flight between steps (' +
      boots.map(b => b.contacts).join('/') + ' contact frames and ' + flight + ' airborne)');
    key('KeyW',false); key('ShiftLeft',false); step(30);
    host.placePlayer(18,16,0); p.y = level; T.setVelDbg(0,0); step(18);
    right.set(1,0,0).applyQuaternion(T.player.quaternion);
    const separation = () => rig.ankleRG.getWorldPosition(new G.Vector3()).sub(rig.ankleLG.getWorldPosition(tmp)).dot(right);
    const order = Math.sign(separation());
    key('KeyA',true); step(28);
    let crossings = 0;
    for (let i = 0; i < 65; i++) { step(1); if (separation()*order < 0) crossings++; }
    check(order !== 0 && crossings === 0, 'the boots stay on their own sides through a sidestep (' + crossings + ' crossed frames)');
  } catch (e) {
    check(false, 'threw: ' + (e.stack || e));
  } finally {
    for (const code of ['Space', 'KeyD', 'KeyW', 'KeyA', 'ShiftLeft']) key(code, false);
    T.pinAimDbg(null);
    T.setViewFirstDbg(false);
    T.flightHold(false);
  }
  return out.join('\n');
})()
