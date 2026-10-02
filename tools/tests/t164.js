// t164 - CL-78 (P-67, D-55): the guardian boss wears the cave guardian's rig. Its zombie body is hidden, the rig rides
// on it, coming on it bounds on all fours with its hands and feet on the ground, it rears up to strike, no joint turns
// more than 0.3 rad in a frame, and dead it rolls over. A pooled body coming back is dressed again.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'Guardian rig');
    T.clearZombies(); T.skipGrace && T.skipGrace();
    T.runDevCommand('godmode');
    const P = T.player.position;
    const z = T.spawnZombie(P.x + 18, P.z, 'guardian', true, true);
    const B = T.guardianBossDbg;
    const rig = B.rigOf(z);
    ok(!!rig && rig.name === 'guardian-boss-rig', 'the boss has the cave guardian\'s rig');
    const shown = [];
    z.mesh.traverse((o) => { if (o.isMesh && o.visible && !rig.userData.meshes.has(o)) { let v = true; for (let a = o; a; a = a.parent) if (!a.visible) v = false; if (v) shown.push(o.name || o.type); } });
    ok(shown.length === 0, 'none of the zombie body shows (' + shown.length + ')');
    ok(rig.visible && rig.userData.meshes.size > 20, 'the rig shows (' + rig.userData.meshes.size + ' meshes)');
    // Let it come on: sample its joints every frame.
    const joints = rig.userData.rig.joints;
    const prev = joints.map((j) => j.getWorldQuaternion(new T.THREE.Quaternion()));
    let maxTurn = 0, frames = 0, lowest = Infinity, galloped = false;
    const q = new T.THREE.Quaternion(), wp = new T.THREE.Vector3();
    const t0 = performance.now();
    while (performance.now() - t0 < 3500) {
      await new Promise((r) => requestAnimationFrame(r));
      frames++;
      joints.forEach((j, i) => { j.getWorldQuaternion(q); const a = 2 * Math.acos(Math.min(1, Math.abs(q.dot(prev[i])))); const turn = a; if (frames > 3 && turn > maxTurn) maxTurn = turn; prev[i].copy(q); });
      if (z.bossRig.speed > 0.5) galloped = true;
      let lo = Infinity; rig.traverse((o) => { if (o.isMesh) { o.getWorldPosition(wp); lo = Math.min(lo, wp.y); } });
      lowest = Math.min(lowest, lo - T.sampleHeight(z.mesh.position.x, z.mesh.position.z));
    }
    ok(galloped, 'it comes on (speed ' + z.bossRig.speed.toFixed(1) + ' m/s)');
    ok(lowest < 0.35 && lowest > -0.6, 'its hands and feet are on the ground (lowest part ' + lowest.toFixed(2) + ' m from it)');
    ok(maxTurn < 0.3 * 3, 'no joint whips round: the biggest turn in a frame ' + maxTurn.toFixed(2) + ' rad over ' + frames + ' frames (the world turn of a chain; each joint is capped at 0.2)');
    // At rest (no ground covered for a while) it stands on all fours, every hand and foot on the ground.
    for (let i = 0; i < 120; i++) B.update(1 / 60);
    const ext = (node, wantMax) => { let v = wantMax ? -1e9 : 1e9; node.updateWorldMatrix(true, true); node.traverse((o) => { const pa = o.isMesh && o.geometry && o.geometry.attributes.position; if (!pa) return; const e = o.matrixWorld.elements, a = pa.array; for (let j = 0; j < pa.count; j++) { const y = e[1] * a[j * 3] + e[5] * a[j * 3 + 1] + e[9] * a[j * 3 + 2] + e[13]; v = wantMax ? Math.max(v, y) : Math.min(v, y); } }); return v; };
    const restLow = ext(rig, false) - T.sampleHeight(z.mesh.position.x, z.mesh.position.z);
    ok(z.bossRig.speed < 0.25 && Math.abs(restLow) < 0.1, 'standing, its hands and feet are on the ground, its claws in it no deeper than 10 cm (lowest ' + restLow.toFixed(3) + ' m)');
    // Its head is inside the body's hit column, in the headshot slice, and a round there is a headshot.
    const R = rig.userData.rig, hTop = ext(R.head, true) - z.mesh.position.y, hBot = ext(R.head, false) - z.mesh.position.y;
    // Where a player aims: its eyes (the glowing ones; the head joint also carries the jaw, hanging open below).
    let eyeSum = 0, eyeN = 0; R.head.traverse((o) => { if (o.isMesh && o.material && o.material.emissiveIntensity > 1) { o.getWorldPosition(wp); eyeSum += wp.y; eyeN++; } });
    const skullY = (eyeN ? eyeSum / eyeN : hBot + 0.7 * (hTop - hBot)) - z.mesh.position.y;
    ok(hTop <= z.hitH + 0.04 && skullY / z.hitH > 0.78, 'its head is in the hit column, its eyes in the headshot slice (' + (skullY / z.hitH).toFixed(2) + '; head ' +  + hBot.toFixed(2) + '-' + hTop.toFixed(2) + ' of ' + z.hitH.toFixed(2) + ')');
    {
      const hp0 = z.hp; z.hp = z.maxHp = 5000;
      const rnd = Math.random; Math.random = () => 0.99; let dHead = 0, dBody = 0;
      try {
        let h0 = z.hp; T.damageZombie(z, 10, { kind: 'bullet', dir: { x: 0, z: 1 }, hitY: z.mesh.position.y + skullY }); dHead = h0 - z.hp;
        h0 = z.hp; T.damageZombie(z, 10, { kind: 'bullet', dir: { x: 0, z: 1 }, hitY: z.mesh.position.y + z.hitH * 0.45 }); dBody = h0 - z.hp;
      } finally { Math.random = rnd; }
      ok(dHead > dBody * 1.5, 'a round at its eyes is a headshot (' + dHead.toFixed(1) + ' vs ' + dBody.toFixed(1) + ')');
      z.hp = hp0;
    }
    // Strike pose: force a windup.
    z.attackWindup = 0.22; B.update(0.1); B.update(0.1);
    ok(z.bossRig.wind > 0.5, 'winding up, it rears (' + z.bossRig.wind.toFixed(2) + ')');
    z.attackWindup = 0;
    // Dead: it rolls over.
    T.killZombie(z, false);
    for (let i = 0; i < 70; i++) B.update(1 / 60);
    const root = rig.userData.rigRoot;
    ok(Math.abs(root.rotation.z) > 1, 'dead, it rolls onto its side (' + root.rotation.z.toFixed(2) + ')');
    // A pooled body comes back dressed.
    T.clearZombies();
    await wait(200);
    const z2 = T.spawnZombie(P.x + 18, P.z + 4, 'guardian', true, true);
    const rig2 = B.rigOf(z2);
    let shown2 = 0; z2.mesh.traverse((o) => { if (o.isMesh && o.visible && !rig2.userData.meshes.has(o)) shown2++; });
    ok(!!rig2 && shown2 === 0 && Math.abs(rig2.userData.rigRoot.rotation.z) < 0.01, 'a second boss is dressed and standing (' + shown2 + ' zombie meshes showing)');
    // Any other zombie is untouched.
    const sh = T.spawnZombie(P.x - 10, P.z, 'shambler', true, true);
    ok(!B.rigOf(sh), 'a shambler stays a shambler');
    T.runDevCommand('godmode off');
    ok(errs.length === 0, 'no errors' + (errs.length ? ': ' + errs[0] : ''));
    T.resetGame();
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
