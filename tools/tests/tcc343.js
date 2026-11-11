// tcc343 - CC-343 (AG-288 find 1): in first person his body turns with the view. 0.4 m from the range console (or
//  against a wall), the aim ray lands inside AIM_PERSONAL_SPACE.facingRadius (0.75 m from his feet), and the third
//  person's "don't spin on a point at your own feet" guard kept his old facing while the first-person view turned:
//  the eye looked back over his own shirt and pack, half the screen blocked at -37 degrees. From his eyes the body
//  faces where the view faces. The check: at the console, against a wall and on open floor, the view turned from
//  behind him and pitched -37 and -60 degrees: his facing follows the view (within 6 degrees), and no vertex of his
//  back half (behind his chest's plane: the pack, the back of the shirt and the guns on his back) is in the view.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const deg = (r) => r * 180 / Math.PI;
  const D = T.trainingDbg;
  try {
    if (!D || !T.setOtsAimDbg || !T.fpDbg) { ok(false, 'the hooks are there'); return out.join('\n'); }
    if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting();
    const nameEl = document.getElementById('playerName'); if (nameEl) nameEl.value = 'Trainee';
    document.getElementById('modeTraining').click();
    ok(await until(() => D.state().active, 20000), 'the Training Ground is up');
    const tg = D.tg(), st = tg.stations.rangeConsole;
    ok(!!st, 'the range console is there');
    T.setViewFirstDbg(true);
    ok(await until(() => T.fpDbg().first && T.fpDbg().w > 0.9, 20000), 'first person (' + (T.fpDbg().w || 0).toFixed(2) + ')');
    const THREE = T.THREE || window.THREE;
    const V = THREE ? new THREE.Vector3() : null, L = THREE ? new THREE.Vector3() : null;
    // His back half in the view: every visible mesh under the player, every 3rd vertex (skinned meshes posed).
    // (The test page's three is a stand-in with real maths and a stubbed renderer, so the view's frustum is worked here from
    // the camera's position, direction and field of view.)
    const backInView = () => {
      const cam = T.camera, P = T.player; cam.updateMatrixWorld(true); P.updateMatrixWorld(true);
      const inv = new THREE.Matrix4().copy(P.matrixWorld).invert();
      const f = new THREE.Vector3(), r = new THREE.Vector3(), u = new THREE.Vector3(), c = new THREE.Vector3(), d = new THREE.Vector3();
      cam.getWorldDirection(f); cam.getWorldPosition(c);
      r.set(f.z, 0, -f.x).normalize().multiplyScalar(-1);   // his right (f x up)
      u.copy(r).cross(f).normalize();
      const tv = Math.tan((cam.fov || 60) * Math.PI / 360), th = tv * (cam.aspect || 16 / 9), near = cam.near || 0.05;
      let n = 0, total = 0; const names = new Map();
      P.traverseVisible((o) => {
        if (!o.isMesh || !o.geometry || !o.geometry.attributes || !o.geometry.attributes.position) return;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        if (!mats.some((m) => m && m.visible !== false && (typeof m.opacity !== 'number' || m.opacity > 0.05))) return;
        const pos = o.geometry.attributes.position, cnt = pos.count | 0;
        for (let i = 0; i < cnt; i += 3) {
          if (o.isSkinnedMesh && typeof o.getVertexPosition === 'function') o.getVertexPosition(i, V); else V.fromBufferAttribute(pos, i);
          o.localToWorld(V);
          L.copy(V).applyMatrix4(inv);
          if (!(L.z < -0.06) || L.y < 0.25) continue;   // his front half, and his feet
          total++;
          d.copy(V).sub(c);
          const z = d.dot(f), x = d.dot(r), y = d.dot(u);
          if (z > near && Math.abs(x) < z * th && Math.abs(y) < z * tv) { n++; const k = o.name || o.parent && o.parent.name || '?'; names.set(k, (names.get(k) || 0) + 1); }
        }
      });
      return { n, total, names: [...names.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map((e) => e[0] + ':' + e[1]).join(' ') };
    };
    const nx = Math.sin(st.yaw), nz = Math.cos(st.yaw);   // the console's front normal (into the room)
    const tx = Math.cos(st.yaw), tz = -Math.sin(st.yaw);  // along its wall
    const intoWall = Math.atan2(-nx, -nz);
    const places = [
      { name: 'at the range console (0.4 m)', x: st.x + nx * 0.4, z: st.z + nz * 0.4, yaw: intoWall },
      { name: 'against the wall (0.35 m, 1.6 m along it)', x: st.x + nx * 0.35 + tx * 1.6, z: st.z + nz * 0.35 + tz * 1.6, yaw: intoWall },
      { name: 'on open floor (4 m out)', x: st.x + nx * 4, z: st.z + nz * 4, yaw: intoWall },
    ];
    for (const pl of places) {
      for (const [pd, flick] of [[-37, false], [-60, false], [-37, true]]) {
        // He stands facing away; the view turns round to the wall in steps (a mouse turn) or at once (a flick), then holds.
        const away = pl.yaw + Math.PI, how = flick ? ', a flick' : '';
        T.player.position.set(pl.x, st.y, pl.z);
        if (T.setAimYawDbg) T.setAimYawDbg(away);
        T.player.rotation.y = away;
        T.setOtsAimDbg(away, pd * Math.PI / 180);
        await wait(400);
        if (!flick) for (let s = 1; s <= 8; s++) { T.player.position.set(pl.x, st.y, pl.z); T.setOtsAimDbg(away + Math.PI * s / 8, pd * Math.PI / 180); await wait(60); }
        T.setOtsAimDbg(pl.yaw, pd * Math.PI / 180);
        for (let s = 0; s < 12; s++) { T.player.position.set(pl.x, st.y, pl.z); await wait(80); }
        const ots = T.otsDbg(), body = T.player.rotation.y, dy = deg(Math.abs(wrap(body - ots.yaw)));
        const bi = backInView();
        out.push('INFO ' + pl.name + ', pitched ' + pd + how + ': off ' + dy.toFixed(1) + ' deg; back half in view ' + bi.n + '/' + bi.total + (bi.n ? ' (' + bi.names + ')' : ''));
        ok(dy < 6, pl.name + ', pitched ' + pd + how + ': his body faces the view (off by ' + dy.toFixed(1) + ' deg)');
        ok(bi.total > 50 && bi.n === 0, pl.name + ', pitched ' + pd + how + ': nothing of his back half in the view (' + bi.n + ' of ' + bi.total + ' sampled vertices' + (bi.n ? ': ' + bi.names : '') + ')');
      }
    }
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  } finally {
    try { T.setViewFirstDbg && T.setViewFirstDbg(false); } catch (_) {}
  }
  return out.join('\n');
})()
