// tcb330 - CB-327 (J151 note 1, Jerry 13 Nov: "3D Camera for 3rd Person is practically useless right now. It gets stuck on
//  things and does not behave anything like it did previously."): in the Training Ground the overhead third-person eye
//  (~12 m out, 8.3 up and 8.7 back) was pulled in by the camera collision (game/training-camera-collision.js) at every
//  wall behind him: the hangar's 24 m walls and the rooms' 6 m ones, the columns on them, the perimeter fence and the
//  firing line's wire, all of which the eye sees through from above (the walls are planes facing into their room; the
//  cutaway and the perimeter fade the rest). 28% of standing spots x 8 headings caught, 18% pulled under half.
//  Now: the overhead eye passes what it sees through (a wall from behind, what the cutaway/perimeter fade, the firing
//  line); props, stations and the Armory still stop it; the fades follow where the eye wants to be.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };
  const D = T.trainingDbg;
  try {
    if (!D) { ok(false, 'the hooks are there'); return out.join('\n'); }
    if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting();
    const nameEl = document.getElementById('playerName'); if (nameEl) nameEl.value = 'Trainee';
    document.getElementById('modeTraining').click();
    ok(await until(() => D.state().active, 20000), 'the Training Ground is up');
    T.setViewFirstDbg(false);
    const tr = D.state(), tg = tr.tg, TR = D.TRAINING, O = TR.ORIGIN, P = T.player.position, C = T.camera.position;
    P.set(O.x - 26, O.y, O.z + 8);
    ok(await until(() => !tr.warming && Math.hypot(C.x - P.x, C.z - P.z) < 12, 20000), 'third person, the camera follows him');
    ok(!!tr.cameraCollision, 'the Training camera collision is up');

    // 1. Every standing spot (1.25 m grid in both rooms) x 8 headings, the fades settled as in play.
    const BACK = 8.7, UP = 8.3;
    const blocked = (x, z) => tg.solids.some((s) => !s.floor && !s.ceiling && s.target == null && s.minY < O.y + 1.8 && s.maxY > O.y + 0.25 &&
      x > s.minX - 0.35 && x < s.maxX + 0.35 && z > s.minZ - 0.35 && z < s.maxZ + 0.35);
    const spots = [];
    for (const r of [TR.RANGE, TR.BUILD]) for (let x = r.minX + 0.75; x <= r.maxX - 0.75; x += 1.25) for (let z = r.minZ + 0.75; z <= r.maxZ - 0.75; z += 1.25)
      if (!blocked(O.x + x, O.z + z)) spots.push([O.x + x, O.z + z]);
    const pullAt = (x, z, a) => {
      const head = { x, y: O.y + 1.6, z }, focus = { x, y: O.y, z };
      const ideal = { x: x - Math.sin(a) * BACK, y: head.y + UP, z: z - Math.cos(a) * BACK };
      for (let i = 0; i < 3; i++) { tg.cutaway?.update?.(ideal, focus, 0.25); tr.perimeter?.update?.(ideal, focus, 0.25); }
      const eye = { ...ideal }, hit = tr.cameraCollision.pull(head, eye);
      return { hit, frac: Math.hypot(eye.x - x, eye.y - head.y, eye.z - z) / Math.hypot(BACK, UP) };
    };
    let n = 0, caught = 0, hard = 0; const by = {};
    for (const [x, z] of spots) for (let k = 0; k < 8; k++) {
      const r = pullAt(x, z, k * Math.PI / 4); n++;
      if (r.frac < 0.999) caught++;
      if (r.frac < 0.5) { hard++; const b = r.hit?.box || {}; const key = b.name || (b.wall ? 'wall' : b.column ? 'column' : b.perimeterFence ? 'perimeter' : b.firingFence || b.firingFrame ? 'firing line' : b.infirmaryFence ? 'infirmary fence' : b.backstop ? 'backstop' : 'prop'); by[key] = (by[key] || 0) + 1; }
    }
    ok(spots.length > 900, 'standing spots ' + spots.length);
    ok(hard / n < 0.05, 'the eye is pulled under half its distance at ' + (100 * hard / n).toFixed(1) + '% of ' + n + ' spots x headings (under 5%; was 18.4%) ' + JSON.stringify(by));
    ok(!by.wall && !by.column && !by['firing line'], 'no wall, column or firing-line wire pulls the overhead eye in (' + (by.wall || 0) + ', ' + (by.column || 0) + ', ' + (by['firing line'] || 0) + ')');
    ok(caught / n < 0.06, 'caught at all: ' + (100 * caught / n).toFixed(1) + '% (was 28.3%)');

    // 2. What he can't see through still stops it: the Armory and a station.
    const arm = tr.cameraCollision.boxes.find((b) => b.name === 'armory');
    if (arm) {
      const cx = (arm.minX + arm.maxX) / 2, cz = (arm.minZ + arm.maxZ) / 2;
      // stand 1 m off its widest face, the eye straight back through it
      const alongX = arm.maxX - arm.minX > arm.maxZ - arm.minZ;
      const px = alongX ? cx : (Math.abs(arm.minX - O.x - TR.BUILD.minX) > Math.abs(arm.maxX - O.x - TR.BUILD.maxX) ? arm.minX - 1.2 : arm.maxX + 1.2);
      const pz = alongX ? (Math.abs(arm.minZ - O.z - TR.BUILD.minZ) > Math.abs(arm.maxZ - O.z - TR.BUILD.maxZ) ? arm.minZ - 1.2 : arm.maxZ + 1.2) : cz;
      const a = Math.atan2(px - cx, pz - cz);   // facing away from it: the eye goes back over it
      const head = { x: px, y: O.y + 1.6, z: pz }, eye = { x: px - Math.sin(a) * 3, y: O.y + 2.2, z: pz - Math.cos(a) * 3 };
      const hit = tr.cameraCollision.pull(head, eye);
      ok(hit && hit.box === arm, 'a low eye behind the Armory still stops at it (' + (hit ? hit.box.name || 'other' : 'no hit') + ')');
    } else ok(false, 'the Armory box is there');
    const st = Object.values(tg.stations || {}).find((s) => s && s.front && Number.isFinite(s.x));
    const sb = (tr.stationCollision?.boxes || [])[0];
    if (sb) {
      const cx = (sb.minX + sb.maxX) / 2, cz = (sb.minZ + sb.maxZ) / 2, cy = (sb.minY + sb.maxY) / 2;
      const head = { x: cx + 2, y: cy, z: cz }, eye = { x: cx - 2, y: cy, z: cz };
      const hit = tr.cameraCollision.pull(head, eye);
      ok(!!hit, 'a station box still stops the eye (' + (sb.name || 'station') + ')');
    } else ok(!!st, 'a station is there');

    // 3. Rounds and the laser still stop at the walls (only the camera's query sees through them).
    const wall = tg.solids.find((s) => s.wall && s.surface);
    ok(!!wall && tg.solids.includes(wall), 'the walls are still solids for rounds');

    // 4. In play: walk along the range's back wall and down the shared wall, the camera behind him over the wall. No frame
    //    pulls it in by more than a metre, and it stays out (the fades follow where the eye wants to be).
    const R = TR.RANGE;
    const path = [[R.minX + 1.2, R.minZ + 1.2], [R.maxX - 1.2, R.minZ + 1.2], [R.maxX - 1.2, R.minZ + 8], [R.minX + 1.2, R.minZ + 8], [R.minX + 1.2, R.minZ + 1.2]];
    P.set(O.x + path[0][0], O.y, O.z + path[0][1]);
    for (let i = 0; i < 90; i++) T.stepFrame(1 / 60);
    // which solid pulled the eye in on each frame (the page's own calls, wrapped)
    const orig = tr.cameraCollision.pull; let lastHit = null;
    tr.cameraCollision.pull = (a, b) => { const h = orig(a, b); if (h) lastHit = h; return h; };
    const seeThrough = (b) => !!b && (b.wall || b.column || b.perimeterFence || b.firingFence || b.firingFrame);
    let prev = null, snaps = 0, wallPulls = 0, minD = 99, frames = 0; const snapBy = {};
    for (let s = 1; s < path.length; s++) {
      const [x0, z0] = path[s - 1], [x1, z1] = path[s], L = Math.hypot(x1 - x0, z1 - z0), m = Math.ceil(L / 0.1);
      for (let i = 1; i <= m; i++) {
        P.set(O.x + x0 + (x1 - x0) * i / m, O.y, O.z + z0 + (z1 - z0) * i / m);
        lastHit = null; T.stepFrame(1 / 60); frames++;
        const d = Math.hypot(C.x - P.x, C.y - (P.y + 1.6), C.z - P.z);
        const hb = lastHit && lastHit.box;
        if (seeThrough(hb)) wallPulls++;
        if (prev != null && prev - d > 1) { snaps++; const k = hb ? (hb.name || (hb.wall ? 'wall' : hb.column ? 'column' : hb.perimeterFence ? 'perimeter' : hb.firingFence || hb.firingFrame ? 'firing line' : 'prop')) : 'none'; snapBy[k] = (snapBy[k] || 0) + 1; }
        minD = Math.min(minD, d); prev = d;
      }
    }
    tr.cameraCollision.pull = orig;
    ok(wallPulls === 0, 'walking the range\'s back and shared walls (' + frames + ' frames): no wall, column or wire fence pulls the eye (' + wallPulls + ' frames)');
    ok(snaps - (snapBy.prop || 0) === 0, 'no frame pulls the eye in by a metre or more except at a prop on the wall (' + JSON.stringify(snapBy) + ', nearest ' + minD.toFixed(2) + ' m)');
    ok(!errs.length, 'no page errors (' + errs.slice(0, 2).join(' | ') + ')');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})()
