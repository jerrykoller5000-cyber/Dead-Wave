// tcl293 - CL-293 round 1 (Claude; docs/specs/fps-pass.md, Jerry's J55: "With the pistol equipped, the hands and gun
// almost vibrate when running or walking. There is no real fps sway or motion to the arms"). The view gun is stepped by
// hand at 60 frames a second (one synchronous run, so the page's own frame rate doesn't matter): a walk and a sprint on
// his stride's cycle, the same without the cycle (its own clock), and a quick turn of the view and a stop.
// - The bob is the stride's: under 5 % of its motion above 6 Hz walking and sprinting (stage 1's ran at 3.7-22 Hz).
// - The sprint lowers the gun and tips it down (AG-202 r1: not turned into the middle); down the sights it doesn't.
// - A turn: the gun lags it and comes home within 0.45 s of the stop, overshooting by under 15 %.
// - J59: the flamer's stream (st.stream) leans the gun back steadily, with nothing above 6 Hz, and lets it go after.
// - A shot turns the drawn view up a little and springs home in ~0.3 s; the camera that aims is never turned.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const info = (m) => out.push('INFO ' + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(40); } return !!f(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'CL293');
    T.clearZombies && T.clearZombies(); T.setHp(100000); T.grantAllWeapons();
    const THREE = T.THREE || window.THREE;
    const take = async (w) => { if (T.isUnarmed && T.isUnarmed()) T.toggleHolster(); for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf(w)); await wait(150); } return T.getCurrentWeapon() === w; };
    if (!T.viewmodelDbg || !T.setViewFirstDbg) { ok(false, 'the CL-281 hooks are there'); return out.join('\n'); }
    ok(await take('pistol'), 'a pistol in hand');
    T.setViewFirstDbg(true);
    const VM = () => T.viewmodelDbg();
    ok(await until(() => VM() && VM().info.active && VM().info.raise > 0.99, 20000), 'first person: the view gun is up');
    const vm = VM(); if (!vm || !vm.gun) { ok(false, 'a view gun'); return out.join('\n'); }
    await wait(500);
    const cam = T.camera, G = vm.frame, dt = 1 / 60;
    const fwd = new THREE.Vector3(); cam.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
    const base = Object.assign({}, T.vmStateDbg ? T.vmStateDbg() : {}, { want: true, weapon: 'pistol', ads: 0, vy: 0, grounded: true, reloadU: null, settled: false });
    const q0 = cam.quaternion.clone();
    const yawOf = (q) => new THREE.Euler().setFromQuaternion(q, 'YXZ').y;
    const wrapA = (v) => { while (v > Math.PI) v -= 2 * Math.PI; while (v < -Math.PI) v += 2 * Math.PI; return v; };
    // run frames synchronously; f(i) gives the state's changes; returns the gun's place (x, y) per frame
    const run = (n, f) => { const xs = [], ys = [], yaws = []; for (let i = 0; i < n; i++) { const st = Object.assign({}, base, f(i)); vm.update(dt, st); xs.push(G.p.x); ys.push(G.p.y); yaws.push(yawOf(G.q)); } return { xs, ys, yaws }; };
    // the share of a signal's motion (detrended) above f Hz, by a plain DFT
    const highShare = (sig, fHz) => {
      const n = sig.length, m = sig.reduce((a, b) => a + b, 0) / n; let tot = 0, hi = 0;
      for (let k = 1; k <= n / 2; k++) { let re = 0, im = 0; for (let i = 0; i < n; i++) { const w = 2 * Math.PI * k * i / n; re += (sig[i] - m) * Math.cos(w); im -= (sig[i] - m) * Math.sin(w); } const e = re * re + im * im; tot += e; if (k / (n * dt) > fHz) hi += e; }
      return tot > 0 ? hi / tot : 0;
    };
    const peakHz = (sig) => { const n = sig.length, m = sig.reduce((a, b) => a + b, 0) / n; let best = 0, bk = 0; for (let k = 1; k <= n / 2; k++) { let re = 0, im = 0; for (let i = 0; i < n; i++) { const w = 2 * Math.PI * k * i / n; re += (sig[i] - m) * Math.cos(w); im -= (sig[i] - m) * Math.sin(w); } const e = re * re + im * im; if (e > best) { best = e; bk = k; } } return bk / (n * dt); };
    const span = (sig) => Math.max(...sig) - Math.min(...sig);
    run(90, () => ({ vx: 0, vz: 0 }));   // settle standing
    const restY = G.p.y, restYaw = yawOf(G.q), restQ = G.q.clone();
    // a gait: speed, cadence (index.html: 9.5 walking, 14 running, rad/s of walkPhase), run weight, sprint, with or without the phase
    const gait = (speed, cad, runW, sprint, withPhase) => { let ph = 0; return (i) => { ph = (ph + dt * cad) % (Math.PI * 2); return { vx: fwd.x * speed, vz: fwd.z * speed, phase: withPhase ? ph : null, run: withPhase ? runW : null, sprint: withPhase ? sprint : null }; }; };
    // CL-325 (J73: the run "a slightly exaggerated walk motion"): a gun with its own jog (VM_POSES[key].sprint / runBob,
    // the handguns) runs with the walk's bob runBob times over and the gun up, not lowered and turned down (AG-202 r1's carry,
    // which the long guns keep)
    const VPm = await import('/game/viewmodel-poses.js'), PP = VPm.VM_POSES.pistol, JOG = !!PP.sprint, RB = PP.runBob || 1;
    let walkSpan = null;
    for (const [name, speed, cad, rw, spr, wp] of [['walk', 7.4, 9.5, 0, false, true], ['sprint', 11.8, 14, 1, true, true], ['walk, own clock', 7.4, 9.5, 0, false, false], ['sprint, own clock', 11.8, 14, 1, true, false]]) {
      const g = gait(speed, cad, rw, spr, wp); run(60, g);   // into it
      const r = run(360, g);
      const hx = highShare(r.xs, 6), hy = highShare(r.ys, 6);
      info(name + ': across ' + (span(r.xs) * 100).toFixed(2) + ' cm at ' + peakHz(r.xs).toFixed(2) + ' Hz, up/down ' + (span(r.ys) * 100).toFixed(2) + ' cm at ' + peakHz(r.ys).toFixed(2) + ' Hz; above 6 Hz ' + (hx * 100).toFixed(1) + ' % / ' + (hy * 100).toFixed(1) + ' %');
      ok(hx < 0.05 && hy < 0.05, name + ': no vibration, the bob is the stride\'s (above 6 Hz: ' + (hx * 100).toFixed(1) + ' % across, ' + (hy * 100).toFixed(1) + ' % up/down)');
      const cap = spr && JOG ? 0.06 * RB : 0.06;
      ok(span(r.xs) > 0.008 && span(r.xs) < cap, name + ': it moves, side to side ' + (span(r.xs) * 100).toFixed(1) + ' cm (0.8-' + (cap * 100).toFixed(1) + ')');
      if (name === 'walk') walkSpan = span(r.xs);
      if (spr && wp && JOG) { const dq = new THREE.Quaternion().copy(restQ).invert().multiply(G.q), ang = 2 * Math.acos(Math.min(1, Math.abs(dq.w)));
        ok(G.p.y > restY - 0.04 && G.p.y < restY && ang < 0.25 && Math.abs(wrapA(yawOf(G.q) - restYaw)) < 0.2 && walkSpan && span(r.xs) > 1.3 * walkSpan, 'the run is a jog: the gun a little lower, up and level, not into the middle, its bob bigger than the walk\'s (' + ((G.p.y - restY) * 100).toFixed(1) + ' cm, turned ' + ang.toFixed(2) + ' rad, yaw ' + wrapA(yawOf(G.q) - restYaw).toFixed(2) + ', across ' + (span(r.xs) / (walkSpan || 1)).toFixed(2) + 'x the walk)'); }
      else if (spr && wp) { const dq = new THREE.Quaternion().copy(restQ).invert().multiply(G.q), ang = 2 * Math.acos(Math.min(1, Math.abs(dq.w)));   // AG-202 r1: lowered and canted down, not turned into the middle
        ok(G.p.y < restY - 0.025 && ang > 0.4 && Math.abs(wrapA(yawOf(G.q) - restYaw)) < 0.2, 'the sprint lowers the gun and tips it down, not into the middle (' + ((G.p.y - restY) * 100).toFixed(1) + ' cm, turned ' + ang.toFixed(2) + ' rad, yaw ' + wrapA(yawOf(G.q) - restYaw).toFixed(2) + ')'); }
      run(60, () => ({ vx: 0, vz: 0 }));
    }
    // down the sights in a sprint: no sprint pose
    run(40, () => ({ vx: 0, vz: 0, ads: 1 })); const adsY = G.p.y;
    { const g = gait(11.8, 14, 1, true, true); run(60, (i) => Object.assign(g(i), { ads: 1 })); }
    ok(Math.abs(G.p.y - adsY) < 0.012, 'aimed, the sprint pose stays out (' + ((G.p.y - adsY) * 100).toFixed(1) + ' cm)');
    run(90, () => ({ vx: 0, vz: 0 }));
    // a turn: 4 rad/s for 0.25 s, then still
    const yawRate = 4, axis = new THREE.Vector3(0, 1, 0), dq = new THREE.Quaternion().setFromAxisAngle(axis, yawRate * dt);
    const devs = [];
    for (let i = 0; i < 15 + 60; i++) {
      if (i < 15) cam.quaternion.premultiply(dq);
      vm.update(dt, Object.assign({}, base, { vx: 0, vz: 0 }));
      devs.push(wrapA(yawOf(G.q) - restYaw));
    }
    cam.quaternion.copy(q0);
    const peak = devs.reduce((m, v) => (Math.abs(v) > Math.abs(m) ? v : m), 0);
    const after = devs.slice(15);
    const over = Math.max(0, ...after.map((v) => -Math.sign(peak) * v)) / Math.max(1e-6, Math.abs(peak));
    let settle = after.length; for (let i = after.length - 1; i >= 0; i--) { if (Math.abs(after[i]) > 0.05 * Math.abs(peak)) { settle = i + 1; break; } if (i === 0) settle = 0; }
    info('the turn: the gun lags it by ' + (Math.abs(peak) * 57.3).toFixed(1) + ' degrees, home ' + (settle * dt).toFixed(2) + ' s after the stop, overshoot ' + (over * 100).toFixed(0) + ' %');
    ok(Math.abs(peak) > 0.02, 'a turn moves the gun (' + (Math.abs(peak) * 57.3).toFixed(1) + ' degrees)');
    ok(settle * dt <= 0.45 && over < 0.15, 'and it comes home within 0.45 s, overshoot under 15 % (' + (settle * dt).toFixed(2) + ' s, ' + (over * 100).toFixed(0) + ' %)');
    // J59: a stream (the flamer held) leans the gun back steadily, no buzz
    run(60, () => ({ vx: 0, vz: 0 })); const z0 = G.p.z;
    const sr = run(120, () => ({ vx: 0, vz: 0, stream: true }));
    // a buzz shows as frame-to-frame acceleration: the old flamer's 12.5 Hz shake of a millimetre is ~1.7 mm a frame squared;
    // a smooth lean and a slow sway stay well under 0.3 mm
    const acc = (sig) => { let m = 0; for (let i = 2; i < sig.length; i++) m = Math.max(m, Math.abs(sig[i] - 2 * sig[i - 1] + sig[i - 2])); return m; };
    const back = G.p.z - z0, hx = acc(sr.xs), hz = acc(sr.ys);
    info('the stream: the gun back ' + (back * 100).toFixed(1) + ' cm; the most a frame accelerates ' + (hx * 1000).toFixed(2) + ' / ' + (hz * 1000).toFixed(2) + ' mm');
    ok(Math.abs(back) > 0.02 && hx < 0.0003 && hz < 0.0003, 'the flamer\'s stream pushes the gun back, smooth (' + (back * 100).toFixed(1) + ' cm; frame-to-frame acceleration at most ' + (Math.max(hx, hz) * 1000).toFixed(2) + ' mm, under 0.3)');
    run(60, () => ({ vx: 0, vz: 0 }));
    ok(Math.abs(G.p.z - z0) < 0.006, 'and it comes back when the stream stops (' + ((G.p.z - z0) * 100).toFixed(1) + ' cm)');
    // The camera's share of a shot (the pass's Fire line): the view turns up a little, peaks in under 0.1 s and is home by
    // 0.35 s; it is on the camera only while drawing, so the aim doesn't move; a full-auto string climbs a little and lets go.
    if (typeof vm.cameraPunch === 'function') {
      const P = T.VM_POSES ? T.VM_POSES.pistol : null;
      const shoot = () => { vm.gun.src.userData.shots = (vm.gun.src.userData.shots | 0) + 1; };
      run(30, () => ({ vx: 0, vz: 0 }));
      const qa = cam.quaternion.clone(), aimA = cam.getWorldDirection(new THREE.Vector3());
      shoot(); const ps = []; for (let i = 0; i < 40; i++) { vm.update(dt, Object.assign({}, base, { vx: 0, vz: 0 })); ps.push(vm.cameraPunch().p); }
      const peak = Math.max(...ps), at = ps.indexOf(peak) * dt, end = ps[ps.length - 1] /* 0.67 s */, at35 = ps[21];
      info('one pistol shot: the view up ' + (peak * 180 / Math.PI).toFixed(2) + ' deg at ' + (at * 1000).toFixed(0) + ' ms; ' + (at35 / peak * 100).toFixed(0) + ' % left at 0.35 s');
      ok(peak > 0.002 && peak < 0.02 && at > 0.02 && at < 0.11, 'a shot turns the view up a little, peaking in under 0.1 s (' + (peak * 180 / Math.PI).toFixed(2) + ' deg at ' + (at * 1000).toFixed(0) + ' ms)');
      ok(Math.abs(at35) < peak * 0.15 && Math.abs(end) < peak * 0.05, 'and it is home by 0.35 s (' + (at35 / peak * 100).toFixed(0) + ' % left), no overshoot worth the name');
      ok(cam.quaternion.angleTo(qa) < 1e-6 && cam.getWorldDirection(new THREE.Vector3()).angleTo(aimA) < 1e-6, 'the camera itself (what aims) is untouched between draws');
      await wait(400);   // a few real frames: the page draws with the turn on and takes it off
      shoot(); await wait(60);
      ok(T.camera.getWorldDirection(new THREE.Vector3()).angleTo(aimA) < 0.02, 'after real frames the aim is where it was (' + (T.camera.getWorldDirection(new THREE.Vector3()).angleTo(aimA) * 180 / Math.PI).toFixed(3) + ' deg)');
      run(60, () => ({ vx: 0, vz: 0 }));
      const auto = []; for (let i = 0; i < 66; i++) { if (i % 6 === 0 && i < 48) shoot(); vm.update(dt, Object.assign({}, base, { vx: 0, vz: 0 })); auto.push(vm.cameraPunch().p); }
      const hold = auto.slice(24, 48).reduce((a, b) => a + b, 0) / 24, after = auto[auto.length - 1];
      ok(hold > peak * 0.3 && Math.max(...auto) <= 0.0301 && Math.abs(after) < hold * 0.5, 'eight shots at 10 a second hold a small climb (' + (hold * 180 / Math.PI).toFixed(2) + ' deg) under the cap and let it go (' + (after * 180 / Math.PI).toFixed(2) + ' deg 0.3 s after)');
    } else ok(false, 'viewmodel.cameraPunch is there');
    // AG-219 (ChatGPT's find): into the Training Ground in first person, the view gun's root must not be left frozen in the valley
    if (T.trainingDbg && T.trainingDbg.enter) {
      const root = vm.root; T.trainingDbg.enter();
      const inTG = await until(() => { const t = T.trainingDbg.state(); return !!(t && t.active && t.hidWorld); }, 20000);
      ok(inTG, 'he is in the Training Ground with the valley hidden');
      await wait(1500);
      ok(!Object.prototype.hasOwnProperty.call(root, 'updateMatrixWorld'), 'in the Training Ground the view gun is not hidden with the valley (its matrix still follows his eye)');
    }
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
