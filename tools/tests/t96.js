// t96 - GB-59 (CU-42 brought back): the fog cull. A zombie past the fog's far edge (+8 m) along the camera's view
// axis is not drawn (mesh.visible false); one inside it is, and so is one off to the side whose range is past the
// fog but whose depth is not (three fogs by depth). Hidden, it still walks. It shows again 4 m back inside the line
// (and not before: no flicker on the line), when killed (its corpse), and when the switch is off. Never hidden: the
// guardian, anything mid-attack (and for 2 s after), a spitter holding its firing line. By day (far 640) nothing
// at 90 m is hidden.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const f1 = (v) => (+v).toFixed(1);
  const errs = []; window.addEventListener('error', (e) => errs.push(String((e.error && e.error.stack) || e.message || e.error).slice(0, 600)));
  try {
    await startMatch(T, 'Fog');
    T.clearZombies && T.clearZombies(); T.skipGrace && T.skipGrace(); T.runDevCommand('godmode');
    T.setWorldTime(0); await wait(300);
    const C = T.fogCullDbg();
    const F = C.far;   // fog far + the margin
    ok(C.on && Math.abs(F - (T.scene.fog.far + 8)) < 1e-6 && F < 100, 'night: the cull line is the fog\'s far edge + 8 m (' + f1(T.scene.fog.far) + ' + 8)');
    const V = T.THREE.Vector3;
    const fwd = new V(); T.camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
    const side = new V(-fwd.z, 0, fwd.x);
    const place = (z, ahead, lat) => {
      const c = T.camera.position;
      const x = c.x + fwd.x * ahead + side.x * lat, zz = c.z + fwd.z * ahead + side.z * lat;
      z.mesh.position.set(x, T.sampleHeight(x, zz), zz);
    };
    // Put z at a view depth (a few passes: the ground rises and falls under it).
    const placeDepth = (z, depth, lat = 0) => {
      let ahead = depth; place(z, ahead, lat);
      for (let i = 0; i < 4; i++) { ahead += depth - T.fogCullDepthDbg(z); place(z, ahead, lat); }
      return T.fogCullDepthDbg(z);
    };
    const spawn = (type = 'shambler') => T.spawnZombie(T.player.position.x + 3, T.player.position.z + 3, type, true, true);
    const shown = (z) => z.mesh.visible && !z.fogHidden;
    const hidden = (z) => !z.mesh.visible && z.fogHidden;

    // (1) Near, inside, past, and off to the side.
    const zNear = spawn(), zIn = spawn(), zFar = spawn(), zSide = spawn();
    const dNear = placeDepth(zNear, 20), dIn = placeDepth(zIn, F - 14), dFar = placeDepth(zFar, F + 18), dSide = placeDepth(zSide, F - 25, 70);
    await wait(250);
    const rSide = Math.hypot(zSide.mesh.position.x - T.camera.position.x, zSide.mesh.position.z - T.camera.position.z);
    ok(shown(zNear) && shown(zIn), 'inside the fog: drawn (depths ' + f1(dNear) + ', ' + f1(dIn) + ' m)');
    ok(hidden(zFar), 'past the far edge + 8 m: not drawn (depth ' + f1(dFar) + ' m, line ' + f1(F) + ')');
    ok(rSide > F && shown(zSide), 'off to the side, ' + f1(rSide) + ' m away but ' + f1(T.fogCullDepthDbg(zSide)) + ' m deep: drawn');
    ok(T.fogCullDbg().hidden === 1, 'one hidden (' + T.fogCullDbg().hidden + ')');

    // (2) Hidden, it still walks.
    const p0 = zFar.mesh.position.clone(); await wait(1500);
    const moved = zFar.mesh.position.distanceTo(p0);
    ok(zFar.alive && hidden(zFar) && moved > 0.5, 'hidden, it still walks (' + f1(moved) + ' m in 1.5 s)');

    // (3) Back over the line: 2 m inside it stays hidden (no flicker); 6 m inside, drawn again.
    placeDepth(zFar, F - 2); await wait(200);
    ok(hidden(zFar), '2 m back inside the line: still hidden (it shows at 4 m)');
    placeDepth(zFar, F - 6); await wait(200);
    ok(shown(zFar), '6 m back inside: drawn again');
    placeDepth(zIn, F + 2); await wait(200);
    ok(hidden(zIn), 'and 2 m past the line from inside: hidden');

    // (4) Never hidden: the guardian, anything attacking (and 2 s after), a spitter with its line.
    const zG = spawn(), zA = spawn(), zS = spawn('spider');
    zG.guardianPlanned = true;
    placeDepth(zG, F + 18, -8); placeDepth(zA, F + 18, 8); placeDepth(zS, F + 18, 16);
    zA.attackWindup = 0.2; zS.lineClear = true; zS.lineT = 0.45;
    await wait(300);
    ok(shown(zG), 'the guardian, far past the line: drawn');
    ok(shown(zA), 'mid-attack, far past the line: drawn');
    ok(shown(zS), 'a spitter that has just checked its line: drawn');
    zA.attackWindup = 0; zA.swingT = 0; zA._pendingAttack = null;
    await wait(700);
    const aStill = shown(zA);
    await wait(2200);
    ok(aStill && hidden(zA), 'after the attack it stays drawn a moment, then goes (2 s)');
    ok(hidden(zS), 'the spitter too, once it stops checking a line (out of its hold range)');

    // (5) Killed while hidden: its corpse is drawn.
    placeDepth(zNear, F + 18, -16); await wait(250);
    const wasHidden = hidden(zNear), body = zNear.mesh;
    T.killZombie(zNear, false); await wait(100);
    ok(wasHidden && body.visible, 'killed while hidden: the corpse is drawn');

    // (6) The switch (for measuring): off, all drawn; on, hidden again.
    placeDepth(zIn, F + 18); placeDepth(zA, F + 18, 8); await wait(250);   // they walk in meanwhile
    T.setFogCullDbg(false); await wait(250);
    ok(shown(zIn) && shown(zA) && T.fogCullDbg().hidden === 0, 'switch off: every zombie drawn');
    T.setFogCullDbg(true); await wait(250);
    ok(hidden(zIn) && hidden(zA), 'switch on: hidden again');

    // (7) By day the fog is 640 m: nothing at 90 m is hidden.
    T.setWorldTime(0.5); await wait(400);
    ok(T.fogCullDbg().far > 600 && shown(zIn) && shown(zA), 'by day (line ' + f1(T.fogCullDbg().far) + ' m): drawn again');
    T.setWorldTime(0);

    ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e.message)); }
  return out.join('\n');
})()