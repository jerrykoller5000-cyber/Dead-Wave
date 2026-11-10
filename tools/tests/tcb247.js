// tcb247 - CB-247 (J124, Jerry's 10 Nov playtest: "Some props are still fading in first person. Such as the range
//  computer."): the Training Ground's range console (a steel cabinet on the range wall) fades to 6% when the view crosses
//  its wall, a third-person camera's feature. In first person the eye is the camera and the plane's 0.6 m margin caught
//  it whenever he stepped up to use it (it went at 0.30-0.55 m from its mount). CL-324 (J90) took the room's wall cutaway
//  and the fence out of first person; this is the third fade. In first person the console stays solid at every distance;
//  in third person the console's fade still gets the real camera.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };
  const D = T.trainingDbg;
  try {
    if (!D || !T.rangeDbg) { ok(false, 'the hooks are there'); return out.join('\n'); }
    if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting();
    const nameEl = document.getElementById('playerName'); if (nameEl) nameEl.value = 'Trainee';
    document.getElementById('modeTraining').click();
    ok(await until(() => D.state().active, 20000), 'the Training Ground is up');
    const tg = D.tg(), st = tg.stations.rangeConsole;
    ok(!!st && !!T.rangeDbg.feature(), 'the range console and its feature are up');
    const grp = tg.group.getObjectByName('training-range-console');
    const mats = new Set(); grp && grp.traverse((o) => { if (o.isMesh && o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => mats.add(m)); });
    ok(mats.size > 0, 'the console has its materials (' + mats.size + ')');
    const opac = () => Math.min(...[...mats].map((m) => m.opacity));
    const nx = Math.sin(st.yaw), nz = Math.cos(st.yaw);

    // First person, the eye at set distances from the console's mount: the cabinet stays solid.
    T.setViewFirstDbg(true);
    ok(await until(() => T.fpDbg().first && T.fpDbg().w > 0.9, 20000), 'first person (' + (T.fpDbg().w || 0).toFixed(2) + ')');
    for (const d of [0.30, 0.45, 0.55, 0.70, 1.00, 1.35, 2.00]) {
      T.player.position.set(st.x + nx * d, st.y, st.z + nz * d);
      await wait(700);
      ok(opac() >= 0.999, 'first person, ' + d.toFixed(2) + ' m from the console: solid (opacity ' + opac().toFixed(2) + ')');
    }
    if (typeof T.rangeDbg.eye === 'function') {
      const e = T.rangeDbg.eye(), p = T.player.position;
      ok(Math.hypot(e.x - p.x, e.z - p.z) > 50, 'first person: the console\'s fade is given a camera far out on its front side (' + Math.hypot(e.x - p.x, e.z - p.z).toFixed(0) + ' m)');
      // Third person: the real camera, unchanged.
      T.setViewFirstDbg(false); await wait(1500);
      const e3 = T.rangeDbg.eye(), c = T.camera.position;
      ok(e3.x === c.x && e3.y === c.y && e3.z === c.z, 'third person: the console\'s fade still gets the real camera (' + c.x.toFixed(1) + ', ' + c.y.toFixed(1) + ', ' + c.z.toFixed(1) + ')');
    } else ok(false, 'the hook T.rangeDbg.eye is there');
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  } finally {
    try { T.setViewFirstDbg && T.setViewFirstDbg(false); } catch (_) {}
  }
  return out.join('\n');
})()
