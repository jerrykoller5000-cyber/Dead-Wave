// t222 - CU-96 (Jerry): the aiming system. The cursor is put, through the real pointer and the real camera, on a still
// zombie's head, chest or legs (the head where its model's head really is), the game turns that into its aim, and the
// round is traced from the real muzzle along that aim against the zombie's hit column, as the bullets are: what it
// lands on is what that aim earns. Pointing at a head lands in the head slice (a headshot), at the chest in the body,
// at the legs low. A zombie running across in front of him, the cursor kept on it, is met by the round (the aim leads
// it by its pace; not the launcher's). The reticle: a ring when the cursor is on a head, ticks at the spread's size,
// and an X when a round of his lands (gold on a headshot).
// Measured before CU-96 with this check's own cases: pointing at a head was a headshot 17 times in 64 (a hunched kind's
// head missed the column and the round went into the ground), and a runner crossing at 3-6 m/s was hit 7 times in 36.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m); const info = (m) => out.push('INFO ' + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  // GB-192: the real renderer (tools/realtest.mjs) or the test page, whose fake three has a no-op transpose.
  const real = (() => { const m = new window.TT.THREE.Matrix4().makeRotationX(0.3), e = m.elements.slice(); m.transpose(); return m.elements[6] === e[9] && m.elements[9] === e[6] && e[6] !== e[9]; })();
  // A fresh zombie is still settling (its rise, its turn toward him) for a moment: the cursor waits for it, as a player would.
  const SETTLE = real ? 1500 : 150;
  try {
    await startMatch(T, 'Aim');
    T.clearZombies(); T.skipGrace && T.skipGrace(); T.runDevCommand('godmode');
    const THREE = T.THREE, cam = T.camera, canvas = T.renderer.domElement;
    const P = T.localPlayer ? T.localPlayer.position : T.player.position;
    // Open, level ground: the fewest trees and rocks within 26 m and the flattest spot of a coarse search.
    let best = null;
    for (let gx = -160; gx <= 160; gx += 20) for (let gz = -160; gz <= 160; gz += 20) {
      if (Math.hypot(gx, gz) < 30 || Math.hypot(gx, gz) > 170) continue;
      if (T.waterDepthAt && T.waterDepthAt(gx, gz) > 0) continue;
      const near = (T.trees || []).filter((t) => t.alive !== false && Math.hypot(t.x - gx, t.z - gz) < 26).length + (T.rocks || []).filter((r) => r.alive !== false && Math.hypot(r.x - gx, r.z - gz) < 26).length;
      let lo = Infinity, hi = -Infinity;
      for (let a = 0; a < 8; a++) for (const rr of [6, 14, 22]) { const h = T.sampleHeight(gx + Math.sin(a) * rr, gz + Math.cos(a) * rr); lo = Math.min(lo, h); hi = Math.max(hi, h); }
      const score = near * 2 + (hi - lo);
      if (!best || score < best.score) best = { x: gx, z: gz, score };
    }
    P.set(best.x, T.sampleHeight(best.x, best.z), best.z);
    await wait(1500);
    const HEAD = { brute: 0.74, feral: 0.70, leaper: 0.55, spider: 0.60 }, headLine = (k) => HEAD[k] != null ? HEAD[k] : 0.78;
    // Where a world point is on screen, as a pinhole camera (the test build's Vector3.project is a stub; its Raycaster
    // casts with this same model, and the real one agrees for a camera with no roll).
    const project = (wp) => {
      const f = cam.getWorldDirection(new THREE.Vector3()), right = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0)).normalize();
      const up = new THREE.Vector3().crossVectors(right, f).normalize(), w = wp.clone().sub(cam.position);
      const t = Math.tan((cam.fov || 50) * Math.PI / 360), fz = w.dot(f);
      return { x: w.dot(right) / fz / (t * (cam.aspect || 1)), y: w.dot(up) / fz / t };
    };
    const pointOnce = (wp) => {
      cam.updateMatrixWorld(true);
      const v = project(wp), r = canvas.getBoundingClientRect();
      canvas.dispatchEvent(new PointerEvent('pointermove', { clientX: r.left + (v.x + 1) / 2 * r.width, clientY: r.top + (1 - v.y) / 2 * r.height, bubbles: true }));
    };
    const pointAt = async (wp) => { for (let i = 0; i < 3; i++) { pointOnce(wp); await wait(110); } };   // the view slides toward the cursor: aim again
    const headCentre = (z) => {
      // CL-222: the same head the game tests (game/zombie-headshots.js headRoot/headSurface): on the real renderer a skinned
      // zombie's head meshes are hidden sources (userData.skinSrc) the skinned body draws, so "visible" alone found none.
      const u = z.mesh.userData, h = (u.bossRig && u.bossRig.userData && u.bossRig.userData.rig && u.bossRig.userData.rig.head) || u.head; if (!h) return null;
      z.mesh.updateMatrixWorld(true);
      const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
      h.traverse((m) => {
        if (!m.isMesh || m.isSkinnedMesh || m.isInstancedMesh || m.userData.stump || !(m.userData.skinSrc || m.visible !== false)) return;
        for (let n = m.parent; n && n !== h; n = n.parent) if (n.visible === false || n.userData._skinCollapsed) return;
        const pa = m.geometry && m.geometry.attributes && m.geometry.attributes.position; if (!pa) return;
        const e = m.matrixWorld.elements, arr = pa.array, st = pa.itemSize || 3;
        for (let i = 0; i < pa.count; i++) {
          const x = arr[i * st], y = arr[i * st + 1], w = arr[i * st + 2];
          const v = [e[0] * x + e[4] * y + e[8] * w + e[12], e[1] * x + e[5] * y + e[9] * w + e[13], e[2] * x + e[6] * y + e[10] * w + e[14]];
          for (let k = 0; k < 3; k++) { if (v[k] < lo[k]) lo[k] = v[k]; if (v[k] > hi[k]) hi[k] = v[k]; }
        }
      });
      return Number.isFinite(lo[0]) ? new THREE.Vector3((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2) : null;
    };
    // The round, from the real muzzle along the aim, through the game's own hit test (zombieRoundHit: the model's
    // surfaces since GP-19885, a headshot only where confirmedHead would count one), stopped by the ground on the way.
    const trace = (z) => {
      const M = T.getMuzzleWorld().clone(), d = T.aimTarget.clone().sub(M);
      if (d.lengthSq() < 1e-6) return { res: 'none' };
      d.normalize();
      let far = 70;
      for (let s = 0.5; s < 70; s += 0.03) { const x = M.x + d.x * s, y = M.y + d.y * s, w = M.z + d.z * s; if (y < T.sampleHeight(x, w) - 0.02) { far = s; break; } }
      const E = M.clone().addScaledVector(d, far), h = T.zombieRoundHit(z, M, E);
      if (!h) return { res: far < 70 ? 'ground' : 'miss' };
      const head = !!h.headHit && (z.typeKey !== 'military' || h.militaryHit?.zone === 'face') && (z.typeKey !== 'brute' || h.bruteHit?.part === 'head');
      const f = (h.point.y - z.mesh.position.y) / (z.hitH || 1.45);
      return { res: head ? 'head' : f < 0.4 ? 'legs' : 'body', f };
    };
    // GB-193: the legs are pointed at on the zombie's own leg, not the column's middle (since GP-19885 the pick is the
    // model's surface, and from the front the middle is the gap between the legs): across its width near 0.2 x hitH,
    // the point nearest the middle whose camera ray meets this zombie low (under 0.4 of its height) through the game's hit test.
    const legPoint = (z) => {
      const zp = z.mesh.position, H = z.hitH || 1.45, cp = cam.position;
      const fw = new THREE.Vector3(zp.x - cp.x, 0, zp.z - cp.z).normalize(), right = new THREE.Vector3(-fw.z, 0, fw.x);
      z.mesh.updateMatrixWorld(true);
      for (const fy of [0.2, 0.15, 0.25, 0.3]) for (const off of [0, 0.05, -0.05, 0.09, -0.09, 0.13, -0.13, 0.18, -0.18, 0.24, -0.24, 0.3, -0.3]) {
        const p = new THREE.Vector3(zp.x, zp.y + H * fy, zp.z).addScaledVector(right, off), dir = p.clone().sub(cp), L = dir.length();
        const h = T.zombieRoundHit(z, cp.clone(), cp.clone().addScaledVector(dir.normalize(), L + 3));
        if (h && (h.point.y - zp.y) / H < 0.4) return p;
      }
      return new THREE.Vector3(zp.x, zp.y + H * 0.2, zp.z);
    };
    // GB-195: a head the camera can see. From some sides a kind's own gear covers the middle of its head (the colossus's
    // stone carrier, seen from its side: the camera's ray meets the stones 1.1 m short of the head and the reticle does
    // not ring). The cursor goes on the visible head nearest its middle: points over the head's box whose camera ray the
    // game's hit test calls a headshot. None visible: that side is not a head case (an INFO line).
    // GB-195 (Claude's call (c)): the colossus keeps its stones; where its own gear stands between the camera and its head
    // (the camera's ray to the head's middle meets this zombie, not as a headshot, half a metre or more short of it), that
    // side is not a head case.
    const headCovered = (z) => {
      const c = headCentre(z); if (!c) return false;
      const cp = cam.position, d = c.clone().sub(cp), L = d.length(), r = T.zombieRoundHit(z, cp.clone(), cp.clone().addScaledVector(d.normalize(), L + 3));
      return !!r && !r.headHit && r.t * (L + 3) < L - 0.5;
    };
    const headPoint = (z) => {
      const c = headCentre(z); if (!c || headCovered(z)) return null;
      const h = z.mesh.userData.head, cp = cam.position, inv = new THREE.Matrix4().copy(h.matrixWorld);
      const fw = c.clone().sub(cp).setY(0).normalize(), right = new THREE.Vector3(-fw.z, 0, fw.x);
      const seen = (p) => { const d = p.clone().sub(cp), L = d.length(), r = T.zombieRoundHit(z, cp.clone(), cp.clone().addScaledVector(d.normalize(), L + 3)); return !!r && r.headHit && (z.typeKey !== 'military' || r.militaryHit?.zone === 'face') && (z.typeKey !== 'brute' || r.bruteHit?.part === 'head'); };
      for (const dy of [0, 0.06, -0.06, 0.12, -0.12, 0.18]) for (const dx of [0, 0.08, -0.08, 0.16, -0.16, 0.24, -0.24]) { const p = c.clone().addScaledVector(right, dx); p.y += dy; if (seen(p)) return p; }
      return null;
    };
    const still = (type, x, zz) => { const z = T.spawnZombie(x, zz, type, true, true); if (z) { z.riseT = 0; z.hp = z.maxHp = 1e6; z.speed = z.baseSpeed = 0; } return z; };
    const fmt = (o) => Object.entries(o).map(([r, n]) => r + ' ' + n).join(', ') || '-';
    // --- Still zombies: head, chest, legs, from three sides at two distances.
    const TYPES = ['shambler', 'feral', 'brute', 'spider', 'leaper', 'colossus'];
    const BEAR = [0, 90, -135], DIST = [6, 14];
    const tally = { head: {}, chest: {}, legs: {} }, chestHumanoid = {};
    for (const type of TYPES) {
      const row = { head: {}, chest: {}, legs: {} };
      for (const b of BEAR) for (const dist of DIST) {
        T.clearZombies();
        const a = b * Math.PI / 180, z = still(type, P.x + Math.sin(a) * dist, P.z + Math.cos(a) * dist);
        if (!z) continue;
        await wait(SETTLE);
        if (!z.mesh || !z.alive) { info(type + ' at ' + b + ' deg ' + dist + ' m: gone before the cursor reached it (no case)'); continue; }
        const zp = z.mesh.position, H = z.hitH || 1.45;
        const hp = headPoint(z); if (!hp && headCentre(z)) info(type + ' at ' + b + ' deg ' + dist + ' m: its head is ' + (headCovered(z) ? 'covered by its own gear' : 'hidden') + ' from the camera here (no head case)');
        const pts = { head: hp, chest: new THREE.Vector3(zp.x, zp.y + H * 0.56, zp.z), legs: legPoint(z) };
        for (const k of ['head', 'chest', 'legs']) {
          if (!pts[k] || (k === 'legs' && (type === 'spider' || type === 'leaper'))) continue;
          await pointAt(pts[k]);
          const r = trace(z).res;
          row[k][r] = (row[k][r] || 0) + 1; tally[k][r] = (tally[k][r] || 0) + 1;
          // GB-224: the spider counts with the leaper: its drawn head sits 0.62 m ahead of its middle at 0.82 H, so from the camera's
          // height the ray to the 0.56 H chest point meets the head first, 0.45-0.82 m short (qa/2026-10-23-GB-224/t222-spider-chest-*.png).
          if (k === 'chest' && type !== 'leaper' && type !== 'spider') chestHumanoid[r] = (chestHumanoid[r] || 0) + 1;
        }
      }
      info(type.padEnd(9) + ' head: ' + fmt(row.head) + ' | chest: ' + fmt(row.chest) + ' | legs: ' + fmt(row.legs));
    }
    const n = (o, r) => o[r] || 0, tot = (o) => Object.values(o).reduce((s, v) => s + v, 0);
    // GB-208: the real renderer's bars are set from GB-206/207's runs on the game's own models (heads 32-33/34, legs
    // 16-19/24, strays 2-4, runners 16/16), with room for the run-to-run spread. A stray is a round a player would see
    // miss, so 4 is the most we accept for 1.0 (the brute's low rounds are on the 1.x list). The test page's fake models
    // can't reach them; there the same checks are a floor for the plumbing (heads 80 %, legs 65 %, strays 8, 3 m/s runners 5/8).
    ok(tot(tally.head) > 30 && n(tally.head, 'head') >= tot(tally.head) * (real ? 0.9 : 0.8), 'pointing at a head is a headshot: ' + n(tally.head, 'head') + '/' + tot(tally.head) + ' (bar ' + (real ? '90' : '80') + ' %; was 17/64)');
    // CL-228: on the test page the fake spider and leaper read a chest round as a head (GB-208: body 22-23/30, the extra
    // rounds all heads), which this check allows by its own wording; there the bar is 70 % and one miss. The real
    // renderer keeps 80 % and none (body 24/30 in both GB-208 runs).
    ok(n(chestHumanoid, 'body') >= tot(chestHumanoid) * (real ? 0.8 : 0.7) && !chestHumanoid.ground && n(chestHumanoid, 'miss') <= (real ? 0 : 1), 'pointing at a chest lands in the body: ' + fmt(chestHumanoid) + ' (bar ' + (real ? '80 %, no miss' : '70 %, one miss') + '; a head only where the head covers the chest from up here)');
    ok(n(tally.legs, 'legs') >= tot(tally.legs) * (real ? 0.6 : 0.65), 'pointing at the legs lands low: ' + n(tally.legs, 'legs') + '/' + tot(tally.legs) + ' (bar ' + (real ? '60' : '65') + ' %)');
    const stray = ['head', 'chest', 'legs'].reduce((s, k) => s + n(tally[k], 'ground') + n(tally[k], 'miss'), 0);
    ok(stray <= (real ? 4 : 8), 'no round aimed at a body goes into the ground or past it (' + stray + '; bar ' + (real ? 4 : 8) + ')');
    // --- The reticle while it is on them: the ring on a head, not on a chest.
    T.clearZombies();
    const zr = still('shambler', P.x, P.z + 9); await wait(SETTLE + 50);
    const ret = document.getElementById('reticle');
    await pointAt(headCentre(zr)); await wait(120);
    const onHead = ret.classList.contains('los-head') && ret.classList.contains('los-clear');
    const zp = zr.mesh.position;
    await pointAt(new THREE.Vector3(zp.x, zp.y + zr.hitH * 0.5, zp.z)); await wait(120);
    // GB-208: a check on the real renderer only; the test page's fake models make the head pick flaky (red with no aim change).
    (real ? ok : (c, m) => info(m + (c ? '' : ' (would fail; INFO on the test page)')))(onHead && ret.classList.contains('los-clear') && !ret.classList.contains('los-head'), 'the reticle rings a head lined up, and not a chest (' + onHead + ', ' + ret.className + ')');
    // A round of his into that head flashes the gold X.
    const marks = []; const rx = ret.querySelector('.rx'); const realAnimate = rx.animate.bind(rx);
    rx.animate = (k, o) => { marks.push(rx.style.color); return realAnimate(k, o); };
    // GB-249 (Claude's ruling (a), 2026-10-30): an arm in front of the face takes the round (white X = body). The gold-X round goes on a frame where the line
    // from the muzzle along the aim reaches the head: the shambler's anim steps on game time (cap 3 s) until it does; none clear is a FAIL, never an empty pass.
    let xClear = false, xBlocked = 0; { const s0 = T.getSimTime(), w0 = Date.now(); while (T.getSimTime() - s0 <= 3 && Date.now() - w0 < 60000) { await pointAt(headCentre(zr)); await wait(60); const M0 = T.getMuzzleWorld().clone(), d0 = T.aimTarget.clone().sub(M0), L0 = d0.length() + 3, h0 = T.zombieRoundHit(zr, M0.clone(), M0.clone().addScaledVector(d0.normalize(), L0)); if (h0 && h0.headHit) { xClear = true; break; } xBlocked++; } }
    info('the gold-X round: ' + xBlocked + ' aim(s) blocked before a clear line to the head' + (xClear ? '' : ', none clear in 3 s of game time'));
    if (!xClear) ok(false, 'a clear line from the muzzle to the shambler\'s head within 3 s of game time (' + xBlocked + ' blocked)');
    const M = T.getMuzzleWorld().clone(), dir = T.aimTarget.clone().sub(M).normalize();
    T.fireRoundDbg(M.x, M.y, M.z, dir.x, dir.y, dir.z, 20, 90, 0);
    for (let i = 0; i < 20 && !marks.length; i++) { T.stepProjectilesDbg(0.016); }
    rx.animate = realAnimate;
    ok(marks.length === 1 && /255, 210, 74|ffd24a/i.test(marks[0]), 'his round into the head flashes the gold X on the reticle (' + marks.join(' | ') + ')');
    // Spread ticks at the cone's size: the shotgun's pattern opens them far wider than the pistol's point.
    const sp = () => parseFloat(getComputedStyle(ret).getPropertyValue('--sp')) || 0;
    const arm = async (gun) => { if (!T.getWeaponOwned()[gun]) T.grantAllWeapons(); T.setWeapon(T.WEAPON_ORDER.indexOf(gun)); await wait(600); await pointAt(new THREE.Vector3(zp.x, zp.y + 1, zp.z)); await wait(300); return sp(); };
    const spPistol = await arm('pistol'), spShotgun = await arm('shotgun');
    ok(spPistol >= 6 && spShotgun > spPistol * 2.5 && !ret.classList.contains('no-spread'), 'the ticks show the spread: pistol ' + spPistol.toFixed(1) + ' px, shotgun ' + spShotgun.toFixed(1) + ' px');
    // --- A zombie running across in front of him, the cursor kept on its chest. The round is flown at the gun's speed
    // against the body as it keeps running: does pointing at it hit it?
    const ST = T.WEAPON_STATS || {};
    const crossing = async (gun, dist, speed, side) => {
      T.clearZombies();
      if (T.getCurrentWeapon() !== gun) { if (!T.getWeaponOwned()[gun]) T.grantAllWeapons(); T.setWeapon(T.WEAPON_ORDER.indexOf(gun)); await wait(500); }
      const z = still('shambler', P.x - side * 6, P.z + dist);
      if (!z) return { res: 'none' };
      const vx = side * speed;
      // GB-193: it runs on game time, a step each frame, as the game's own zombies do (trackZombieMotion times its pace on
      // simTime to lead it; steps between frames read as jumps and are thrown out).
      let alive = true, last = T.getSimTime();
      (async () => { while (alive) { const now = T.getSimTime(), dt = Math.min(0.25, now - last); last = now; z.mesh.position.x += vx * dt; z.x = z.mesh.position.x; z.mesh.position.y = T.sampleHeight(z.mesh.position.x, z.mesh.position.z); await new Promise((r) => requestAnimationFrame(() => r())); } })();
      const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
      for (let i = 0; i < 14; i++) { const q = z.mesh.position; pointOnce(new THREE.Vector3(q.x, q.y + (z.hitH || 1.7) * 0.56, q.z)); await wait(40); }
      { const q = z.mesh.position; pointOnce(new THREE.Vector3(q.x, q.y + (z.hitH || 1.7) * 0.56, q.z)); await frame(); }   // fired on the next frame after the cursor last moved
      { const q = z.mesh.position; pointOnce(new THREE.Vector3(q.x, q.y + (z.hitH || 1.7) * 0.56, q.z)); await frame(); }   // GB-206: re-point on the frame it fires (the view slides toward the cursor)
      const Mu = T.getMuzzleWorld().clone(), d = T.aimTarget.clone().sub(Mu).normalize(), z0 = z.mesh.position.clone(), lead = T.aimTarget.x - z0.x;
      alive = false;
      const spd = (ST[gun] && ST[gun].speed) || 75;
      // GB-193: through the game's hit test, as the still ones: the zombie held where it was when he fired and the round's
      // path taken relative to it (it runs on at vx), the ground checked along the round's real path up to the hit.
      await wait(40); z.mesh.position.copy(z0); z.mesh.updateMatrixWorld(true);
      const rel = d.clone().multiplyScalar(spd).sub(new THREE.Vector3(vx, 0, 0)), TT = 1.5;
      const h = T.zombieRoundHit(z, Mu.clone(), Mu.clone().addScaledVector(rel, TT)), tHit = h ? h.t * TT : TT;
      const tf = Math.hypot(z0.x - Mu.x, z0.z - Mu.z) / spd;
      const res = (() => { if (!h) return 'miss'; for (let t = 0; t < tHit; t += 0.002) { const q = spd * t, bx = Mu.x + d.x * q, by = Mu.y + d.y * q, bz = Mu.z + d.z * q; if (q > 0.5 && by < T.sampleHeight(bx, bz) - 0.02) return 'ground'; } return h ? 'hit' : 'miss'; })();   // GB-206: a miss is a miss (the scan along a missed round used to find a hill far behind and print "ground")
      info(gun + ' ' + dist + ' m ' + speed + ' m/s ' + (side > 0 ? '+' : '-') + ': ' + res + ', lead ' + lead.toFixed(2) + ' m (pace x flight ' + (vx * tf).toFixed(2) + ')' + (h ? ' at ' + ((h.point.y - z0.y) / (z.hitH || 1.7)).toFixed(2) + ' of its height' : ''));
      return { res, lead };
    };
    const cross = {}, cross3 = {}, cross6 = {};
    for (const gun of ['pistol', 'm4']) for (const dist of [8, 18]) for (const speed of [3, 6]) for (const side of [1, -1]) {
      const r = (await crossing(gun, dist, speed, side)).res;
      cross[r] = (cross[r] || 0) + 1;
      const cs = speed === 3 ? cross3 : cross6; cs[r] = (cs[r] || 0) + 1;
    }
    if (real) ok(n(cross, 'hit') >= 14, 'a runner crossing in front of him at 3-6 m/s, the cursor on it, is hit: ' + fmt(cross) + ' (bar 14/16; was 7/36)');
    else {
      ok(n(cross3, 'hit') >= 5, 'a runner crossing in front of him at 3 m/s, the cursor on it, is hit: ' + fmt(cross3) + ' (bar 5/8; the plumbing floor)');
      info('the 6 m/s runners on the test page: ' + fmt(cross6) + ' (not a bar: the fake models; 1.x, CL FYI)');
    }
    const lz = await crossing('launcher', 12, 6, 1);
    ok(Math.abs(lz.lead) < 0.6, 'the launcher is not led (it lobs): ' + lz.lead.toFixed(2) + ' m off the body');
    T.clearZombies();
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})()
