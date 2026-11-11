// tcc343b - CC-343 (CB-290's legs half; J126 rule 3, standing): no part of his legs through anything, nothing floating.
//  Third person, on the ground, a deck's edge, a slope (up, down and across), the build stairs (standing on them facing
//  up and down, crouched, walking up and down), against a wall, a fuel drum and sandbags, in every stance (standing armed
//  with a rifle and a pistol, unarmed, crouched, walking, running, crouch-walking): every frame sampled, each boot's
//  sole (8 points over its outsole, from the boot's own mesh) against what is really under it (the terrain, and the
//  build meshes themselves, raycast: a stair's tread, not its collision ramp) and each knee against what is near.
//  Fails on:
//   - a sole point inside what is under it by more than 5 mm (a toe or heel in a tread, the ground or a deck);
//   - standing still: a foot whose sole is more than 1 cm over what is under it, or not flat on it (heel or toe more
//     than 1 cm up) - a crouched rear foot set on its ball (heel up, the ball down) is the crouch's stance, not a float;
//     a part of the sole out past a step's edge (over a lower tread) does not count as floating;
//   - walking and crouch-walking: a frame with neither foot on the ground (1 cm);
//   - a knee (its cap: 6 cm round the joint) or a toe inside a wall, a drum or sandbags.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };
  const key = (code, down) => document.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, key: code, bubbles: true }));
  const mm = (v) => (v * 1000).toFixed(1);
  // The game is held and stepped here at 1/30 s (the aim and any pin set before each step), so the numbers do not
  // depend on how fast the test machine draws.
  let aimDir = 0, aimOn = false, pinXZ = null, P = null, p = null;
  const step = (n = 1) => { for (let i = 0; i < n; i++) {
    if (pinXZ) { p.x = pinXZ[0]; p.z = pinXZ[1]; }
    if (aimOn) { T.aimPointDbg(p.x + Math.sin(aimDir) * 6, p.y + 1.3, p.z + Math.cos(aimDir) * 6); T.setAimYawDbg(aimDir); }   // no pointer on the canvas: the aim stays where it is put
    T.stepFrame(1 / 30);
  } };
  try {
    await startMatch(T, 'Legs');
    T.clearZombies && T.clearZombies(); T.setHp(100000);
    const THREE = T.THREE, V = THREE.Vector3, ud = T.marine.userData; P = T.player; p = P.position;
    T.flightHold(true);
    const tStep = performance.now(); step(10); out.push('INFO a step takes ' + ((performance.now() - tStep) / 10).toFixed(0) + ' ms');
    const down = new V(0, -1, 0), ray = new THREE.Raycaster();
    // The outsole from the boot's own meshes, in the ankle's space (the lowest box under each ankle), inset 1 cm.
    const soleOf = (an) => {
      P.updateMatrixWorld(true);
      const inv = new THREE.Matrix4().copy(an.matrixWorld).invert(), b = new THREE.Box3(), all = new THREE.Box3();
      an.traverse((o) => { if (!o.isMesh || !o.geometry) return; o.geometry.computeBoundingBox(); b.copy(o.geometry.boundingBox).applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)); all.union(b); });
      const pts = [];
      for (const x of [all.min.x + 0.01, all.max.x - 0.01]) for (const f of [0, 0.36, 0.68, 1]) pts.push(new V(x, all.min.y, all.min.z + 0.01 + (all.max.z - all.min.z - 0.02) * f));
      return { pts, box: all.clone() };
    };
    const SOLE = { L: soleOf(ud.ankleLG), R: soleOf(ud.ankleRG) };
    out.push('INFO the outsole (ankle space): y ' + mm(SOLE.L.box.min.y) + ' mm, heel ' + mm(SOLE.L.box.min.z) + ' toe ' + mm(SOLE.L.box.max.z) + ' mm');
    let site = null;   // { builds: [b], solids: [...] } for the scenario
    // What is really under (x, z) at or below yRef + 0.5: the terrain, the build meshes raycast from above, the other decks.
    const o3 = new V();
    const surfaceAt = (x, z, yRef) => {
      let s = T.sampleHeight(x, z);
      for (const b of (site && site.builds) || []) {
        if (!b || !b.mesh) continue;
        ray.set(o3.set(x, yRef + 0.5, z), down); ray.far = 3;
        const h = ray.intersectObject(b.mesh, true);
        if (h.length && h[0].point.y > s) s = h[0].point.y;
      }
      return s;
    };
    // A point inside a wall, a drum, sandbags (the game's own push-out, with a 6 cm ball), by how much.
    const inside = (x, y, z, r) => {
      let worst = 0;
      for (const b of (site && site.blockers) || []) {
        if (!b || !b.mesh || !T.pushOutOfBuild) continue;
        const q = T.pushOutOfBuild(b, x, z, r, true, y - 0.05);
        const d = Math.hypot(q.x - x, q.z - z);
        if (d > worst) worst = d;
      }
      return worst;
    };
    const W = new V();
    const sample = () => {
      P.updateMatrixWorld(true);
      const r = {};
      for (const s of ['L', 'R']) {
        const an = ud['ankle' + s + 'G'], kn = ud['knee' + s + 'G'];
        const pts = SOLE[s].pts.map((q) => an.localToWorld(q.clone()));
        const g = pts.map((w) => w.y - surfaceAt(w.x, w.z, an.getWorldPosition(W).y));
        const surf = pts.map((w, i) => w.y - g[i]);
        const minG = Math.min(...g);
        // The support: the surface under the lowest point; points over a lower surface (past a step's edge) are overhang.
        const iMin = g.indexOf(minG), sup = surf[iMin];
        const onSup = g.filter((v, i) => surf[i] > sup - 0.03);
        const heelUp = Math.max(g[0], g[4]) - Math.min(g[3], g[7]);   // heel points minus toe points
        const kw = kn.getWorldPosition(new V());
        const toe = an.localToWorld(new V(0, SOLE[s].box.min.y + 0.04, SOLE[s].box.max.z));
        r[s] = { pen: -minG, gap: minG, flat: Math.max(...onSup) - minG, heelUp,
          knee: inside(kw.x, kw.y, kw.z, 0.06), toe: inside(toe.x, toe.y, toe.z, 0.02) };
      }
      return r;
    };
    const results = [];
    // One scenario: set it up, let it settle, sample `ms` of frames, judge.
    const run = async (name, { still = true, walk = false, crouchRear = false, ms = 670, settle = 670, pre = null, post = null } = {}) => {
      if (pre) await pre();
      step(Math.round(settle / 1000 * 30));
      const W0 = { pen: 0, gap: 0, flat: 0, knee: 0, toe: 0, noFoot: 0, frames: 0 };
      for (let i = 0, n = Math.round(ms / 1000 * 30); i < n; i++) {
        step(1);
        const r = sample(); W0.frames++;
        for (const s of ['L', 'R']) {
          const f = r[s];
          W0.pen = Math.max(W0.pen, f.pen);
          W0.knee = Math.max(W0.knee, f.knee); W0.toe = Math.max(W0.toe, f.toe);
          if (still) {
            W0.gap = Math.max(W0.gap, f.gap);
            // A crouched rear foot on its ball: the heel is up on purpose; the ball points must be down.
            const ball = crouchRear && s === 'R' && f.heelUp > 0.02;
            if (!ball) W0.flat = Math.max(W0.flat, f.flat);
          }
        }
        if (walk) W0.noFoot = Math.max(W0.noFoot, Math.min(r.L.gap, r.R.gap));
      }
      if (post) await post();
      results.push({ name, ...W0 });
      const face = wrap(P.rotation.y - aimDir);
      const bad = [];
      if (W0.pen > 0.005) bad.push('a sole ' + mm(W0.pen) + ' mm into what is under it');
      if (still && W0.gap > 0.01) bad.push('a foot ' + mm(W0.gap) + ' mm over what is under it');
      if (still && W0.flat > 0.01) bad.push('a sole not flat (' + mm(W0.flat) + ' mm)');
      if (walk && W0.noFoot > 0.01) bad.push('no foot on the ground (' + mm(W0.noFoot) + ' mm)');
      if (W0.knee > 0.005) bad.push('a knee ' + mm(W0.knee) + ' mm into what is near');
      if (W0.toe > 0.005) bad.push('a toe ' + mm(W0.toe) + ' mm into what is near');
      ok(!bad.length && W0.frames > 3, name + ': ' + (bad.length ? bad.join('; ') : 'the soles on what is under them, the knees clear') +
        ' (in ' + mm(W0.pen) + ', over ' + mm(W0.gap) + ', flat ' + mm(W0.flat) + ', knee ' + mm(W0.knee) + ' mm; ' + W0.frames + ' frames; facing ' + (face * 180 / Math.PI).toFixed(0) + ' deg off)');
    };
    // Aim: a point 6 m along a heading, at chest height, held every few ms (the mouse aim would move it).
    // He faces the aim point (held here: with no pointer on the canvas the mouse aim leaves it be), and W walks the way the
    // camera looks: both turned.
    const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
    const camYaw = () => { const d = T.camera.getWorldDirection(new V()); return Math.atan2(d.x, d.z); };
    const aimAt = (yaw) => { aimDir = yaw; aimOn = true; T.rotateCamera(wrap(yaw - camYaw())); for (let i = 0; i < 90 && Math.abs(wrap(camYaw() - yaw)) > 0.03; i++) step(1); };
    const pinAt = (x, z) => { pinXZ = x == null ? null : [x, z]; };
    const place = (x, z) => { pinAt(null); p.set(x, T.entityGroundY(x, z, p.y + 3), z); };
    const crouch = async (on) => { key('KeyC', on); step(on ? 24 : 20); };
    const armed = async (on) => { if (T.isUnarmed() === on) { T.toggleHolster(); for (let i = 0; i < 200 && T.drawDbg().active; i++) step(1); step(15); } };

    // --- The site: level ground, then a slope to one side ---
    const SX = 18, SZ = 18, G0 = T.sampleHeight(SX, SZ);
    T.levelGroundRect(SX - 14, SZ - 14, SX + 14, SZ + 14, G0, 6);
    T.levelGroundRect(SX + 8, SZ - 14, SX + 14, SZ + 14, G0 + 1.4, 5);   // a bank: 1.4 m up over 5 m, its steepest ~22 deg
    const gx = Math.round((SX - 6) / 2), gz = Math.round((SZ - 6) / 2);
    const stairs = T.placeBuildAt('stairs', gx, gz, 0);
    const floor = T.placeBuildAt('floor', gx - 3, gz + 3, 0);
    const wall = T.placeBuildAt('wall', gx - 4, gz - 3, 0);
    const drum = T.placeBuildAt('barrel', gx + 2, gz - 4, 0);
    const bags = T.placeBuildAt('sandbag', gx - 1, gz - 5, 0);
    ok(!!stairs && !!stairs.deck, 'the stairs are built (rise ' + (stairs && stairs.rise) + ' m)');
    const builds = [stairs, floor, wall, drum, bags].filter(Boolean);
    site = { builds: [stairs, floor].filter(Boolean), blockers: [wall, drum, bags].filter(Boolean) };
    await armed(true);
    aimAt(0);

    // Flat ground, every stance.
    const FX = SX, FZ = SZ + 6;
    await run('flat, standing, rifle', { pre: async () => place(FX, FZ) });
    await run('flat, crouched, rifle', { crouchRear: true, pre: async () => { place(FX, FZ); await crouch(true); }, post: () => crouch(false) });
    await run('flat, walking, rifle', { still: false, walk: true, pre: async () => { place(FX, FZ); pinAt(FX, FZ); key('KeyW', true); }, post: async () => { key('KeyW', false); pinAt(null); } });
    await run('flat, running, rifle', { still: false, pre: async () => { place(FX, FZ); pinAt(FX, FZ); key('ShiftLeft', true); key('KeyW', true); }, post: async () => { key('KeyW', false); key('ShiftLeft', false); pinAt(null); } });
    await run('flat, crouch-walking, rifle', { still: false, walk: true, pre: async () => { place(FX, FZ); await crouch(true); pinAt(FX, FZ); key('KeyW', true); }, post: async () => { key('KeyW', false); pinAt(null); await crouch(false); } });

    // The bank: facing up it, down it and across it.
    const BX = SX + 10.5, BZ = SZ + 6;
    for (const [dir, yaw] of [['up', Math.PI / 2], ['down', -Math.PI / 2], ['across', 0]]) {
      await run('slope ' + dir + ', standing', { pre: async () => { aimAt(yaw); place(BX, BZ); } });
      await run('slope ' + dir + ', crouched', { crouchRear: true, pre: async () => { place(BX, BZ); await crouch(true); }, post: () => crouch(false) });
    }
    aimAt(0);

    // The stairs (they climb towards +z from the cell's -z side): standing on them at a quarter, a half and three
    // quarters, facing up and down; crouched; walked up and down.
    if (stairs && stairs.deck) {
      const d = stairs.deck, cx = d.x, cz = d.z;
      for (const t of [0.2, 0.45, 0.7]) {
        const z = cz - 1 + 2 * t;
        await run('stairs ' + t + ', standing, facing up', { pre: async () => { aimAt(0); place(cx, z); } });
        await run('stairs ' + t + ', standing, facing down', { pre: async () => { aimAt(Math.PI); place(cx, z); } });
        await run('stairs ' + t + ', crouched, facing up', { crouchRear: true, pre: async () => { aimAt(0); place(cx, z); await crouch(true); }, post: () => crouch(false) });
      }
      await run('stairs, walking up', { still: false, walk: true, settle: 100, ms: 1500, pre: async () => { aimAt(0); place(cx, cz - 1.6); key('KeyW', true); }, post: async () => key('KeyW', false) });
      await run('stairs, walking down', { still: false, walk: true, settle: 100, ms: 1500, pre: async () => { aimAt(Math.PI); place(cx, cz + 0.85); key('KeyW', true); }, post: async () => key('KeyW', false) });
      await run('stairs, crouch-walking up', { still: false, walk: true, settle: 400, ms: 1500, pre: async () => { aimAt(0); place(cx, cz - 1.6); await crouch(true); key('KeyW', true); }, post: async () => { key('KeyW', false); await crouch(false); } });
    }
    // A deck's edge (the ground floor's boards): standing with one foot off it, both ways.
    if (floor && floor.deck) {
      const d = floor.deck;
      await run('deck edge, standing, facing off', { pre: async () => { aimAt(-Math.PI / 2); place(d.x - 0.95, d.z); } });
      await run('deck edge, standing, side on', { pre: async () => { aimAt(0); place(d.x - 0.95, d.z); } });
      await run('deck edge, crouched, facing off', { crouchRear: true, pre: async () => { aimAt(-Math.PI / 2); place(d.x - 0.95, d.z); await crouch(true); }, post: () => crouch(false) });
    }
    // Up against what is near: walked into it, then still and crouched.
    for (const [nm, b] of [['a wall', wall], ['a fuel drum', drum], ['sandbags', bags]]) {
      if (!b) continue;
      const into = async (cr) => {
        const yaw = Math.atan2(b.x - (b.x), (b.z) - (b.z - 3));
        aimAt(0); place(b.x, b.z - 2.2);
        if (cr) await crouch(true);
        key('KeyW', true); step(40); key('KeyW', false);
      };
      await run(nm + ', walked into, standing', { pre: () => into(false) });
      await run(nm + ', walked into, crouched', { crouchRear: true, pre: () => into(true), post: () => crouch(false) });
    }
    // The other holds: a pistol, and unarmed.
    {
      const w0 = T.getCurrentWeapon();
      for (let i = 0; i < 16 && T.getCurrentWeapon() !== 'pistol'; i++) { T.setWeapon(i); step(2); }
      step(40);
      if (T.getCurrentWeapon() === 'pistol') await run('flat, standing, pistol', { pre: async () => { aimAt(0); place(FX, FZ); } });
      else out.push('INFO no pistol to hand (' + T.getCurrentWeapon() + ')');
      for (let i = 0; i < 16 && T.getCurrentWeapon() !== w0; i++) { T.setWeapon(i); step(2); }
      step(40);
    }
    await armed(false);
    await run('flat, standing, unarmed', { pre: async () => { aimAt(0); place(FX, FZ); } });
    await run('flat, crouched, unarmed', { crouchRear: true, pre: async () => { place(FX, FZ); await crouch(true); }, post: () => crouch(false) });
    await run('stairs 0.45, standing, unarmed', { pre: async () => { if (stairs && stairs.deck) place(stairs.deck.x, stairs.deck.z - 0.1); } });
    await armed(true);
    aimOn = false; pinAt(null);
    // The worst five, for the pictures.
    const score = (r) => Math.max(r.pen, r.gap, r.flat, r.noFoot, r.knee * 2, r.toe * 2);
    const worst = results.slice().sort((a, b) => score(b) - score(a)).slice(0, 5);
    out.push('INFO worst five: ' + worst.map((r) => r.name + ' ' + mm(score(r)) + ' mm').join(' | '));
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  try { T.flightHold(false); } catch (_) {}
  return out.join('\n');
})()
