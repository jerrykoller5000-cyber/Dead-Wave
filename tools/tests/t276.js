// t276 - CL-247 (D-87, Jerry after his friends' playtest: "The aiming system is not working well and frustrates the
// players ... No more using right click to go first person. For right click in 3rd person the camera needs to zoom
// into double the current perspective and center on the cursor instead of player. Think the way that project zomboid
// handles zooms." and "Very difficult to aim and make rounds connect with zombies in third person."). The third-person
// aim:
//  - right-click held zooms the view in 2x (the view's tan halves) about the point the cursor is on: that point stays
//    under the cursor, the view centres between him and it, the shoulder camera stays off and the pointer is not
//    locked; it keeps its offset from him as he moves; the cursor pushed to the zoomed view's edge slides it that way;
//    let go and it eases back to the usual view;
//  - the 5 key (viewFirst) is what brings the shoulder camera now (CL-249 moves it to his eyes), and right-click there
//    narrows to the Aim FOV;
//  - the cursor on open ground: the round flies at chest height over that spot. The cursor just in front of a still
//    zombie's feet: the raw ground point under it would put the round into the dirt short of it (as before CL-247);
//    the round now meets the zombie;
//  - just off a zombie (a few pixels, the cursor's ray missing it), the assist puts the round on its middle; well off,
//    it does not.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m); const info = (m) => out.push('INFO ' + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  let held = false;
  try {
    if (!T.aimZoomDbg || !T.setViewFirstDbg || !T.shotAimDbg) { ok(false, 'the CL-247 hooks are there'); return out.join('\n'); }
    await startMatch(T, 'Aim zoom');
    T.clearZombies && T.clearZombies(); T.skipGrace && T.skipGrace(); T.runDevCommand && T.runDevCommand('godmode');
    const THREE = T.THREE, cam = T.camera, canvas = T.renderer.domElement;
    const P = T.localPlayer ? T.localPlayer.position : T.player.position;
    // Open ground (t222's search: the fewest trees and rocks within 26 m, the flattest), away from the house, then made
    // flat round him, so a point on screen and its ground are one plane and nothing stands in a round's way.
    let best = null;
    for (let qx = -160; qx <= 160; qx += 20) for (let qz = -160; qz <= 160; qz += 20) {
      if (Math.hypot(qx, qz) < 30 || Math.hypot(qx, qz) > 170) continue;
      if (T.waterDepthAt && T.waterDepthAt(qx, qz) > 0) continue;
      const near = (T.trees || []).filter((t) => t.alive !== false && Math.hypot(t.x - qx, t.z - qz) < 26).length + (T.rocks || []).filter((r) => r.alive !== false && Math.hypot(r.x - qx, r.z - qz) < 26).length;
      let lo = Infinity, hi = -Infinity;
      for (let a = 0; a < 8; a++) for (const rr of [6, 14, 22]) { const h = T.sampleHeight(qx + Math.sin(a) * rr, qz + Math.cos(a) * rr); lo = Math.min(lo, h); hi = Math.max(hi, h); }
      const score = near * 2 + (hi - lo);
      if (!best || score < best.score) best = { x: qx, z: qz, score };
    }
    P.set(best.x, T.sampleHeight(best.x, best.z), best.z);
    await wait(1500);
    const y0 = T.sampleHeight(P.x, P.z), gx = T.gridIndex(P.x), gz = T.gridIndex(P.z);
    T.levelGroundRect(T.gridCentre(gx - 30), T.gridCentre(gz - 30), T.gridCentre(gx + 30), T.gridCentre(gz + 30), y0, 8);
    P.y = y0;
    T.grantAllWeapons();
    for (let i = 0; i < 16 && T.getCurrentWeapon() !== 'pistol'; i++) T.setWeapon(i);
    await wait(900);
    ok(T.getCurrentWeapon() === 'pistol', 'a pistol in hand (' + T.getCurrentWeapon() + ')');
    // The pinhole camera (the test build's Vector3.project is a stub; t222 does the same).
    const basis = () => {
      cam.updateMatrixWorld(true);
      const f = cam.getWorldDirection(new THREE.Vector3()), right = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0)).normalize();
      const up = new THREE.Vector3().crossVectors(right, f).normalize(), t = Math.tan((cam.fov || 50) * Math.PI / 360), a = cam.aspect || 1;
      return { f, right, up, t, a };
    };
    const project = (wp) => { const B = basis(), w = wp.clone().sub(cam.position), fz = w.dot(B.f); return { x: w.dot(B.right) / fz / (B.t * B.a), y: w.dot(B.up) / fz / B.t }; };
    const rayAt = (nx, ny) => { const B = basis(); return B.f.clone().addScaledVector(B.right, nx * B.t * B.a).addScaledVector(B.up, ny * B.t).normalize(); };
    const groundAt = (nx, ny, gy = y0) => { const d = rayAt(nx, ny), s = (gy - cam.position.y) / d.y; return cam.position.clone().addScaledVector(d, s); };
    const pointNdc = (nx, ny) => {
      const r = canvas.getBoundingClientRect();
      canvas.dispatchEvent(new PointerEvent('pointermove', { clientX: r.left + (nx + 1) / 2 * r.width, clientY: r.top + (1 - ny) / 2 * r.height, bubbles: true }));
    };
    const pointWorld = (wp) => { const v = project(wp); pointNdc(v.x, v.y); return v; };
    const nd = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const Z = () => T.aimZoomDbg();
    const tanRatio = () => Math.tan(cam.fov * Math.PI / 360) / Math.tan(Z().baseFov * Math.PI / 360);

    // --- The zoom.
    const C = { x: 0.35, y: -0.25 };
    pointNdc(C.x, C.y); await wait(1400); pointNdc(C.x, C.y); await wait(300);   // the follow-cursor pan settles first
    ok(Z().w === 0 && !Z().first, 'no zoom yet, third person (w ' + Z().w + ')');
    const A = groundAt(C.x, C.y), dPA = Math.hypot(A.x - P.x, A.z - P.z);
    T.setZoomHeldDbg(true); held = true;
    ok(await until(() => Z().w > 0.99, 4000), 'right-click held: the zoom comes in (w ' + Z().w.toFixed(2) + ')');
    await wait(1500);
    ok(Math.abs(tanRatio() - 0.5) < 0.03, 'it is 2x: the view\'s tan halves (' + tanRatio().toFixed(3) + ', fov ' + cam.fov.toFixed(1) + ' from ' + Z().baseFov.toFixed(1) + ')');
    const a1 = project(A);
    ok(nd(a1, C) < 0.03, 'the point the cursor was on stays under it (' + a1.x.toFixed(3) + ', ' + a1.y.toFixed(3) + ' vs ' + C.x + ', ' + C.y + ')');
    const G = groundAt(0, 0), dGA = Math.hypot(G.x - A.x, G.z - A.z), dGP = Math.hypot(G.x - P.x, G.z - P.z);
    ok(dGA < dPA * 0.8 && dGP < dPA * 0.8 && dGP > 0.5, 'the view centres between him and it (centre ' + dGA.toFixed(1) + ' m from it, ' + dGP.toFixed(1) + ' m from him; they are ' + dPA.toFixed(1) + ' m apart)');
    ok(T.otsDbg().w === 0 && !T.otsDbg().locked, 'no shoulder camera and no pointer lock (ots w ' + T.otsDbg().w + ')');
    // He moves 2 m: the point keeps its offset from him.
    const rel0 = { x: Z().relX, z: Z().relZ };
    P.x += 2; P.y = T.sampleHeight(P.x, P.z);
    await wait(1800);
    const A2 = new THREE.Vector3(A.x + 2, y0, A.z), a2 = project(A2);
    ok(Math.abs(Z().relX - rel0.x) < 1e-6 && Math.abs(Z().relZ - rel0.z) < 1e-6 && nd(a2, C) < 0.05, 'he moves 2 m and it keeps its offset from him (' + a2.x.toFixed(3) + ', ' + a2.y.toFixed(3) + ')');
    // The cursor at the zoomed view's right edge: it slides that way, along the screen's right on the ground.
    pointNdc(0.97, C.y); await wait(1500);
    const B0 = basis(), slide = { x: Z().relX - rel0.x, z: Z().relZ - rel0.z }, sl = Math.hypot(slide.x, slide.z);
    const along = sl > 0 ? (slide.x * B0.right.x + slide.z * B0.right.z) / (sl * Math.hypot(B0.right.x, B0.right.z)) : 0;
    ok(sl > 0.5 && along > 0.8, 'pushed to the edge, it slides that way (' + sl.toFixed(1) + ' m, ' + along.toFixed(2) + ' along the screen\'s right)');
    pointNdc(C.x, C.y);
    T.setZoomHeldDbg(false); held = false;
    ok(await until(() => Z().w === 0, 8000), 'let go: it eases back (w ' + Z().w + ')');
    await wait(600);
    ok(Math.abs(tanRatio() - 1) < 0.02 && Z().panX === 0 && Z().panZ === 0, 'and the usual view is back (tan ' + tanRatio().toFixed(3) + ', pan ' + Z().panX + ')');

    // --- The 5 key: the shoulder camera, and right-click there narrows it; no third-person zoom.
    T.setViewFirstDbg(true);
    ok(await until(() => T.otsDbg().w > 0.9, 6000) && Z().first, 'the 5 key brings the shoulder camera (ots w ' + T.otsDbg().w.toFixed(2) + ')');
    T.setZoomHeldDbg(true); held = true;
    ok(await until(() => Math.abs(cam.fov - T.otsDbg().fov) < 1.5, 4000) && Z().w === 0, 'right-click there narrows to the Aim FOV, not the zoom (fov ' + cam.fov.toFixed(1) + ', Aim FOV ' + T.otsDbg().fov + ', zoom w ' + Z().w + ')');
    T.setZoomHeldDbg(false); held = false;
    T.setViewFirstDbg(false);
    ok(await until(() => T.otsDbg().w === 0, 6000), 'and 5 again goes back to third person (ots w ' + T.otsDbg().w + ')');
    await wait(1200);

    // --- Where the round goes. The round from the real muzzle to the gun's aim point, stopped by the ground.
    const trace = (z, to) => {
      const M = T.getMuzzleWorld().clone(), d = (to || T.getWeaponAimDbg()).clone().sub(M);
      if (d.lengthSq() < 1e-6) return 'none';
      d.normalize();
      let far = 60;
      for (let s = 0.5; s < 60; s += 0.03) { const x = M.x + d.x * s, y = M.y + d.y * s, w = M.z + d.z * s; if (y < T.sampleHeight(x, w) - 0.02) { far = s; break; } }
      if (!z) return far < 60 ? 'ground' : 'air';
      const h = T.zombieRoundHit(z, M, M.clone().addScaledVector(d, far));
      return h ? 'zombie' : far < 60 ? 'ground' : 'miss';
    };
    const aimAgain = async (f) => { for (let i = 0; i < 4; i++) { f(); await wait(150); } };
    // Open ground.
    await aimAgain(() => pointNdc(0.1, -0.3));
    const gp = groundAt(0.1, -0.3), sa = T.shotAimDbg();
    ok(T.aimKindDbg() === 'ground' && Math.abs(sa.y - T.sampleHeight(sa.x, sa.z) - T.AIM_CHEST) < 0.02, 'the cursor on open ground: the round goes at chest height over it (' + T.aimKindDbg() + ', ' + (sa.y - T.sampleHeight(sa.x, sa.z)).toFixed(2) + ' m up)');
    // A still zombie 11 m up the screen, the cursor on the ground just in front of its feet.
    const B1 = basis(), fw = new THREE.Vector3(B1.f.x, 0, B1.f.z).normalize();
    const still = (x, zz) => { const z = T.spawnZombie(x, zz, 'shambler', true, true); if (z) { z.riseT = 0; z.hp = z.maxHp = 1e6; z.speed = z.baseSpeed = 0; } return z; };
    const zf = still(P.x + fw.x * 11, P.z + fw.z * 11);
    await wait(1200);
    if (!zf || !zf.mesh) ok(false, 'a still zombie to aim at');
    else {
      const zp = zf.mesh.position, front = new THREE.Vector3(zp.x - fw.x * 0.7, T.sampleHeight(zp.x - fw.x * 0.7, zp.z - fw.z * 0.7), zp.z - fw.z * 0.7);
      await aimAgain(() => pointWorld(front));
      const kind = T.aimKindDbg(), now = trace(zf), raw = trace(zf, T.aimTarget.clone().set(front.x, front.y, front.z));
      ok(raw === 'ground', 'before CL-247 the round went at the ground point under the cursor, into the dirt short of it (' + raw + ')');
      ok(now === 'zombie', 'now it meets the zombie (' + now + ', aim ' + kind + ')');
      // The assist: the cursor beside its middle (a point off to the screen's right of it, put on screen again each time
      // as the view slides), stepping out until the game's own pick misses the body.
      const H = zf.hitH || 1.45, mid = new THREE.Vector3(zp.x, zp.y + H * 0.56, zp.z);
      const beside = (off) => { const B = basis(), s = mid.clone().sub(cam.position).dot(B.f); return mid.clone().addScaledVector(B.right, off * s * B.t); };
      let found = null;
      for (const off of [0.02, 0.025, 0.03, 0.035, 0.04, 0.045, 0.05]) {
        await aimAgain(() => pointWorld(beside(off)));
        const k = T.aimKindDbg();
        if (k === 'zombie') continue;   // still on the body
        found = { off, k, hit: trace(zf), ad: T.aimAssistDbg() };
        break;
      }
      if (!found) info('the body covers the cursor out to 0.05 of the screen\'s half-height here; no assist case');
      else ok(found.k === 'assist' && found.hit === 'zombie', 'just off it (' + found.off + ' of the screen\'s half-height, the pick missing it) the assist puts the round on it (' + found.k + ', ' + found.hit + '; nearest ' + (found.ad.n === Infinity ? 'none' : found.ad.n.toFixed(3)) + (found.ad.blocked ? ', line blocked' : '') + ')');
      const far = (() => { const B = basis(), s = mid.clone().sub(cam.position).dot(B.f); return mid.clone().addScaledVector(B.right, 0.14 * s * B.t); })();
      await aimAgain(() => pointWorld(far));
      ok(T.aimKindDbg() !== 'assist', 'well off it (0.14), no assist (' + T.aimKindDbg() + ')');
    }
    ok(errs.length === 0, 'no page errors (' + errs.slice(0, 2).join(' | ') + ')');
  } catch (e) {
    ok(false, 't276 threw: ' + String((e && e.stack) || e).slice(0, 300));
  } finally {
    if (held) T.setZoomHeldDbg(false);
    T.setViewFirstDbg && T.setViewFirstDbg(false);
    T.clearZombies && T.clearZombies();
  }
  return out.join('\n');
})()
