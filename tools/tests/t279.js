// t279 - CL-249 (D-87, Jerry after his friends' playtest: "We are going to assign a button that switches the player from 3rd
// person to 1st ... No more using right click to go first person." His answers: a true first person from his eyes, and
// right-click there aims down the sights). With the 5 key:
//  - the camera is at his eyes (his head's eye point, within a few cm), his head is hidden, the crosshair in the middle,
//    and the mouse turns the view;
//  - right-click: the eye goes onto the held gun's sight line (game/sight-points.js, GB-222) and looks along it, and the
//    view narrows to the Aim FOV; the sniper's narrows to its scope, behind the scope's glass;
//  - 5 again (or the run ending) puts him back in third person with his head on.
// CL-252: the eases back get 12 s (a slow 2-core box took more than 6 s of real time at the test page's frame rate).
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  let held = false;
  try {
    if (!T.fpDbg || !T.setViewFirstDbg) { ok(false, 'the CL-249 hooks are there'); return out.join('\n'); }
    await startMatch(T, 'First person');
    T.clearZombies && T.clearZombies(); T.skipGrace && T.skipGrace();
    const THREE = T.THREE, cam = T.camera;
    const arm = async (w) => { T.grantAllWeapons(); for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) T.setWeapon(i); await wait(300); return T.getCurrentWeapon() === w; };
    ok(await arm('m4'), 'an m4 in hand');
    const F = () => T.fpDbg(), head = () => T.getMarine().userData.headG;
    const eyePoint = () => { const h = head(); h.updateWorldMatrix(true, false); return h.localToWorld(new THREE.Vector3(0, 0.205, 0.12)); };
    ok(!F().first && head().visible, 'third person to start, his head on');

    T.setViewFirstDbg(true);
    ok(await until(() => F().w > 0.95, 12000), 'the 5 key: first person (w ' + F().w.toFixed(2) + ')');
    await wait(900);
    const d0 = cam.position.distanceTo(eyePoint());
    ok(d0 < 0.12, 'the camera is at his eyes (' + d0.toFixed(3) + ' m from his head\'s eye point)');
    ok(F().headHidden && !head().visible, 'his head is hidden');
    const o = T.otsDbg(), dir = cam.getWorldDirection(new THREE.Vector3());
    const want = new THREE.Vector3(Math.sin(o.yaw) * Math.cos(o.pitch), Math.sin(o.pitch), Math.cos(o.yaw) * Math.cos(o.pitch));
    ok(dir.angleTo(want) < 0.05, 'it looks where he looks (' + (dir.angleTo(want) * 180 / Math.PI).toFixed(1) + ' deg off)');
    { const h0 = Math.atan2(dir.x, dir.z); T.otsLook(-200, 0); await wait(700); const d1 = cam.getWorldDirection(new THREE.Vector3()), h1 = Math.atan2(d1.x, d1.z);
      ok(Math.abs(h1 - h0) > 0.2, 'the mouse turns the view (' + h0.toFixed(2) + ' -> ' + h1.toFixed(2) + ')'); }

    // Right-click: down the m4's sights.
    T.setZoomHeldDbg(true); held = true;
    ok(await until(() => F().ads > 0.99, 9000), 'right-click: down the sights (ads ' + F().ads.toFixed(2) + ')');
    await wait(400);
    const s = F().sight;
    if (!s) ok(false, 'the m4 has a sight line');
    else {
      const along = cam.position.clone().sub(s.pos), off = along.clone().sub(s.fwd.clone().multiplyScalar(along.dot(s.fwd))).length();
      const ang = cam.getWorldDirection(new THREE.Vector3()).angleTo(s.fwd) * 180 / Math.PI;
      ok(off < 0.02 && ang < 2, 'the eye on the sight line, looking along it (' + off.toFixed(3) + ' m off it, ' + ang.toFixed(1) + ' deg)');
    }
    ok(Math.abs(cam.fov - T.otsDbg().fov) < 1.5, 'the view narrows to the Aim FOV (' + cam.fov.toFixed(1) + ', Aim FOV ' + T.otsDbg().fov + ')');
    T.setZoomHeldDbg(false); held = false;
    ok(await until(() => F().ads < 0.02, 12000), 'let go: back to his eyes (ads ' + F().ads.toFixed(2) + ')');

    // The sniper: its scope.
    if (await arm('sniper')) {
      ok(await until(() => F().w > 0.99, 4000), 'with the sniper, still first person');
      T.setZoomHeldDbg(true); held = true;
      ok(await until(() => F().ads > 0.99, 9000), 'right-click with the sniper: into the scope');
      await wait(400);
      const glass = +(document.getElementById('scopeOverlay') ? getComputedStyle(document.getElementById('scopeOverlay')).opacity : 1);
      ok(cam.fov < 30 && F().w > 0.99, 'the scope\'s narrow view, still at his eyes, not the third-person scope (fov ' + cam.fov.toFixed(1) + ')');
      ok(glass > 0.9, 'behind the scope\'s glass (overlay ' + glass + ')');
      T.setZoomHeldDbg(false); held = false;
      await until(() => F().ads === 0, 5000);
    } else ok(false, 'a sniper in hand');

    T.setViewFirstDbg(false);
    ok(await until(() => F().w === 0, 12000) && head().visible && !F().headHidden, '5 again: third person, his head back');
    ok(errs.length === 0, 'no page errors (' + errs.slice(0, 2).join(' | ') + ')');
  } catch (e) {
    ok(false, 't279 threw: ' + String((e && e.stack) || e).slice(0, 300));
  } finally {
    if (held) T.setZoomHeldDbg(false);
    T.setViewFirstDbg && T.setViewFirstDbg(false);
  }
  return out.join('\n');
})()
