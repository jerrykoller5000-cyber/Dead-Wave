// GB-156 (Grokbot): the mortar and the Watchman MG crewed, on the real renderer (headless Chrome, real three), on a manual
// 60 fps clock. Mount (joint jumps per frame), the mortar's load and shot (where the round is), traversing each through
// +-70 degrees and back (planted-foot slip), dismount; close shots, frame strips and a top-view footprint plot.
//   node handoffs/2026-10-09-grokbot-GB-156/crew-probe.mjs <outDir> [mortar,m240] [noshots]
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const { serve } = await import(new URL('file:///' + path.join(ROOT, 'tools', 'serve.mjs').replace(/\\/g, '/')));
const { launch } = await import(new URL('file:///' + path.join(ROOT, 'tools', 'cdp.mjs').replace(/\\/g, '/')));
const outDir = path.resolve(process.argv[2] || path.join(HERE, 'shots'));
const only = (process.argv[3] || 'mortar,m240').split(',').filter(Boolean);
const shots = process.argv[4] !== 'noshots';
const wait = (page, ms) => page.evaluate(`new Promise((r) => setTimeout(r, ${ms}))`);
const server = await serve(ROOT, 0);
const browser = await launch({ headless: true });
let code = 0;
const report = {};
try {
  fs.mkdirSync(outDir, { recursive: true });
  const page = await browser.newPage({ width: 960, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 180000 });
  await page.waitFor('!!window.DWOpening', { timeout: 120000 });
  for (let i = 0; i < 2; i++) {
    await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); })()`);
    await wait(page, 300);
  }
  if (!await page.waitFor('!!window.TT', { timeout: 400000 })) throw new Error('window.TT never appeared');
  await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });
  await page.evaluate(`(() => { const n = document.getElementById('playerName'); if (n) n.value = 'Crew'; document.getElementById('modeHunt').click(); })()`);
  await page.waitFor(`TT.getPhase() === 'prep'`, { timeout: 120000 });
  await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 180000 });
  await wait(page, 1500);
  // Manual clock, the HUD hidden, the ground levelled and cleared round him.
  await page.evaluate(`(() => {
    const T = TT, THREE = T.THREE;
    const real = performance.now.bind(performance);
    window.__ft = real(); window.__q = [];
    performance.now = () => window.__ft;
    window.requestAnimationFrame = (cb) => { window.__q.push(cb); return window.__q.length; };
    window.cancelAnimationFrame = () => {};
    window.__aim = null;
    window.__step = (n = 1) => { for (let i = 0; i < n; i++) { if (window.__aim) T.aimTarget.set(...window.__aim); window.__ft += 1000 / 60; const q = window.__q; window.__q = []; for (const cb of q) cb(window.__ft); if (window.__aim) T.aimTarget.set(...window.__aim); } };
    const c = [...document.querySelectorAll('canvas')].sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0];
    const keep = new Set(); for (let el = c; el && el !== document.body; el = el.parentElement) keep.add(el);
    for (const ch of document.body.children) if (!keep.has(ch)) ch.style.setProperty('display', 'none', 'important');
    T.clearZombies && T.clearZombies(); T.setHp && T.setHp(100000);
    T.unlockAllBuilds && T.unlockAllBuilds(); T.addCash && T.addCash(100000);
    for (const t of T.trees) { t.alive = false; t.stump = false; if (t.mesh) t.mesh.visible = false; if (t.group) t.group.visible = false; }
    for (const r of T.rocks) { r.alive = false; if (r.mesh) r.mesh.visible = false; }
    const p = T.player.position;
    const gx0 = T.gridIndex(p.x), gz0 = T.gridIndex(p.z);
    T.levelGroundRect(T.gridCentre(gx0 - 10), T.gridCentre(gz0 - 10), T.gridCentre(gx0 + 10), T.gridCentre(gz0 + 10), T.sampleHeight(p.x, p.z), 6);
    window.__home = { x: p.x, z: p.z, gx: gx0, gz: gz0 };
  })()`);
  await page.evaluate(`__step(30)`);
  // Page helpers: one frame's sample, and the metrics over a run.
  await page.evaluate(`(() => {
    const T = TT, THREE = T.THREE, V = () => new THREE.Vector3();
    const m = T.getMarine(), u = m.userData;
    const joints = { ankleL: u.ankleLG, ankleR: u.ankleRG, kneeL: u.kneeLG, kneeR: u.kneeRG, wristL: u.elbowLG?.userData.wrist, wristR: u.elbowRG?.userData.wrist, head: u.headG, hips: u.lowerBody };
    window.__sample = () => {
      m.updateMatrixWorld(true);
      const s = {};
      for (const [k, o] of Object.entries(joints)) if (o) s[k] = o.getWorldPosition(V()).toArray();
      for (const k of ['ankleL', 'ankleR']) if (s[k]) s[k + 'G'] = T.sampleHeight(s[k][0], s[k][2]);
      const r = window.__roundDbg ? window.__roundDbg() : null; if (r) s.round = r;
      const cd = T.crewDbg ? T.crewDbg() : null; if (cd) { const f = (cd.mortar.feet || cd.m240.feet); if (f) { s.reach = f.map((x) => x.reach !== false); s.anchors = f.map((x) => [+x.x.toFixed(3), +x.z.toFixed(3), x.planted ? 1 : 0]); } s.cw = +cd.mortar.w.toFixed(3); }
      s.ww = +(T.watchmanDbg().weight || 0).toFixed(3); s.lbYaw = +u.lowerBody.rotation.y.toFixed(3); s.mpos = m.position.toArray().map((v) => +v.toFixed(3));
      s.player = T.player.position.toArray(); s.yaw = T.player.rotation.y;
      return s;
    };
    window.__roundDbg = () => { const d = T.crewDbg && T.crewDbg().mortar; if (!d) return null;
      return { state: d.phase + (d.roundIn ? '*' : '') + (d.dropping ? 'v' : ''), visible: !!(d.round && d.round.visible), pos: d.round ? d.round.position.toArray() : null, muzzle: d.muzzle.toArray(), w: d.w }; };
    window.__run = (n, each) => { const out = []; for (let i = 0; i < n; i++) { if (each) each(i); __step(1); out.push(__sample()); } return out; };
  })()`);
  const metrics = (frames) => {
    // Pops: the biggest jump any tracked joint makes in one frame (cm), and the biggest jump over the frames either side
    // (a pop is a jump much bigger than its neighbours).
    const ks = ['ankleL', 'ankleR', 'kneeL', 'kneeR', 'wristL', 'wristR', 'head', 'hips'];
    let jump = 0, jumpK = '', pop = 0, at = -1;
    for (const k of ks) {
      const d = [];
      for (let i = 1; i < frames.length; i++) { const a = frames[i - 1][k], b = frames[i][k]; if (a && b) d.push(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])); }
      for (let i = 0; i < d.length; i++) {
        if (d[i] > jump) { jump = d[i]; jumpK = k; at = i + 1; }
        const nb = Math.max(d[i - 1] ?? 0, d[i + 1] ?? 0, 0.004);
        pop = Math.max(pop, d[i] - 2.5 * nb);
      }
    }
    return { jumpCm: +(jump * 100).toFixed(2), jumpJoint: jumpK, jumpFrame: at, popCm: +(Math.max(0, pop) * 100).toFixed(2) };
  };
  const slip = (frames) => {
    const res = {};
    for (const k of ['ankleL', 'ankleR']) {
      const h = frames.map((f) => f[k][1] - f[k + 'G']);
      const lo = Math.min(...h);
      let start = null, worst = 0, skate = 0, steps = 0, planted = 0, was = false;
      for (let i = 0; i < frames.length; i++) {
        const isP = h[i] - lo < 0.015;
        if (isP) {
          planted++;
          if (!was) { start = frames[i][k]; if (i > 0) steps++; }
          else { const a = frames[i - 1][k], b = frames[i][k]; skate += Math.hypot(b[0] - a[0], b[2] - a[2]); }
          worst = Math.max(worst, Math.hypot(frames[i][k][0] - start[0], frames[i][k][2] - start[2]));
        }
        was = isP;
      }
      res[k] = { maxSlipCm: +(worst * 100).toFixed(1), skateCm: +(skate * 100).toFixed(1), steps, plantedFrames: planted, frames: frames.length };
    }
    return res;
  };
  const shot = async (name, view) => {
    if (!shots) return;
    await page.evaluate(`(() => { TT.setShotView(${JSON.stringify(view)}); __step(1); })()`);
    await wait(page, 150);
    const file = path.join(outDir, name + '.png');
    await page.screenshot(file); console.log('shot', path.relative(ROOT, file));
  };
  const plot = async (name, frames, center) => {
    // Top view of the ankles' paths (planted frames dark, swinging light), the gun's pivot as a cross.
    const url = await page.evaluate(`(() => {
      const F = ${JSON.stringify(frames.map((f) => ({ L: f.ankleL, R: f.ankleR, LG: f.ankleLG, RG: f.ankleRG, p: f.player })))}, C = ${JSON.stringify(center)};
      const cv = document.createElement('canvas'); cv.width = 640; cv.height = 640; const g = cv.getContext('2d');
      g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, 640, 640);
      const S = 640 / 3.2, X = (x) => 320 + (x - C.x) * S, Y = (z) => 320 - (z - C.z) * S;
      g.strokeStyle = '#ccc'; for (let i = -1.5; i <= 1.5; i += 0.5) { g.beginPath(); g.moveTo(X(C.x + i), 0); g.lineTo(X(C.x + i), 640); g.stroke(); g.beginPath(); g.moveTo(0, Y(C.z + i)); g.lineTo(640, Y(C.z + i)); g.stroke(); }
      g.strokeStyle = '#000'; g.lineWidth = 2; g.beginPath(); g.moveTo(X(C.x) - 8, Y(C.z)); g.lineTo(X(C.x) + 8, Y(C.z)); g.moveTo(X(C.x), Y(C.z) - 8); g.lineTo(X(C.x), Y(C.z) + 8); g.stroke();
      for (const [k, col, lite] of [['L', '#1f4fbf', '#9db4ea'], ['R', '#c0392b', '#efa59c']]) {
        const h = F.map((f) => f[k][1] - f[k + 'G']), lo = Math.min(...h);
        for (let i = 1; i < F.length; i++) { const pl = h[i] - lo < 0.015; g.strokeStyle = pl ? col : lite; g.lineWidth = pl ? 5 : 1.5; g.beginPath(); g.moveTo(X(F[i - 1][k][0]), Y(F[i - 1][k][2])); g.lineTo(X(F[i][k][0]), Y(F[i][k][2])); g.stroke(); }
        g.fillStyle = col; for (let i = 0; i < F.length; i += 6) { const pl = h[i] - lo < 0.015; if (pl) g.fillRect(X(F[i][k][0]) - 2, Y(F[i][k][2]) - 2, 4, 4); }
      }
      g.strokeStyle = '#555'; g.lineWidth = 1; g.setLineDash([4, 4]); g.beginPath(); F.forEach((f, i) => i ? g.lineTo(X(f.p[0]), Y(f.p[2])) : g.moveTo(X(f.p[0]), Y(f.p[2]))); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#000'; g.font = '16px sans-serif'; g.fillText(${JSON.stringify(name)} + '  (grid 0.5 m; thick = planted, thin = stepping; dashed = body)', 10, 22);
      g.fillText('blue = left ankle, red = right ankle, + = gun pivot', 10, 44);
      return cv.toDataURL('image/png'); })()`);
    const file = path.join(outDir, name + '.png');
    fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64')); console.log('plot', path.relative(ROOT, file));
  };

  for (const kind of only) {
    // The gun 3 m out in front of where he stands, pointing away (+z); he walks up beside it and mounts.
    const setup = await page.evaluate(`(() => {
      const T = TT, H = __home;
      for (const b of [...T.builds]) if (b.type === 'mortar' || b.type === 'm240') T.removeBuild(b);
      const gx = H.gx + (${JSON.stringify(kind)} === 'mortar' ? 2 : -2), gz = H.gz + 2;
      const b = T.placeBuildAt(${JSON.stringify(kind)}, gx, gz) || T.spawnBuild(${JSON.stringify(kind)}, T.gridCentre(gx), T.gridCentre(gz));
      b.mesh.rotation.y = 0; if (b.watchman) b.watchman = null;
      T.getReserve()['60mm'] = 20; if (b.type === 'm240') b.belt = 200;
      const p = T.player.position; p.x = b.x + 1.2; p.z = b.z - 1.6; p.y = T.sampleHeight(p.x, p.z);
      window.__gun = b;
      window.__aim = [b.x, T.sampleHeight(b.x, b.z + 18), b.z + 18];
      return { x: b.x, z: b.z, y: b.mesh.position.y };
    })()`);
    await page.evaluate(`__step(40)`);
    // Anything standing within 5 m of the gun that is not him, the gun or the ground is hidden for the shots.
    await page.evaluate(`(() => { const T = TT, THREE = T.THREE, b = __gun, m = T.getMarine();
      const keep = new Set(); for (const o of [m, b.mesh, T.player]) o.traverse((x) => keep.add(x));
      const box = new THREE.Box3(new THREE.Vector3(b.x - 5, -1e3, b.z - 5), new THREE.Vector3(b.x + 5, 1e3, b.z + 5)), bb = new THREE.Box3(), sz = new THREE.Vector3();
      let n = 0; T.scene.traverse((o) => { if (!o.isMesh || keep.has(o) || !o.visible) return; bb.setFromObject(o); bb.getSize(sz);
        if (Math.max(sz.x, sz.z) > 25) return; if (bb.intersectsBox(box)) { o.visible = false; n++; } });
      return n; })()`);
    const C = { x: setup.x, z: setup.z };
    const v34 = { x: C.x + 3.0, y: setup.y + 1.9, z: C.z + 2.2, tx: C.x + 0.3, ty: setup.y + 0.6, tz: C.z - 0.5, fov: 40 };
    const side = { x: C.x + 1.9, y: setup.y + 1.45, z: C.z + 1.5, tx: C.x + 0.25, ty: setup.y + 0.85, tz: C.z - 0.1, fov: 34 };
    const top = { x: C.x + 0.01, y: setup.y + 6, z: C.z - 0.7, tx: C.x, ty: setup.y, tz: C.z - 0.7, fov: 30 };
    if (shots) await shot(`${kind}-0-approach`, v34);
    // Mount: 1.5 s, frames recorded; strip shots at 0, 0.15, 0.3, 0.5, 0.8, 1.2 s.
    const mountF = [await page.evaluate(`__sample()`)];
    const mounted = await page.evaluate(`TT.mountMortar(__gun)`);
    const marks = [0, 9, 18, 30, 48, 72];
    for (let i = 0; i < 90; i++) {
      if (shots && marks.includes(i)) { await page.evaluate(`TT.setShotView(${JSON.stringify(v34)})`); const f = path.join(outDir, `${kind}-mount-${String(i).padStart(2, '0')}.png`); await page.screenshot(f); }
      mountF.push(...await page.evaluate(`__run(1)`));
    }
    report[kind] = { mounted, mount: metrics(mountF) };
    if (process.env.DIAG) fs.writeFileSync(path.join(outDir, kind + '-mount-series.json'), JSON.stringify(mountF.slice(0, 40)));
    if (shots) { await shot(`${kind}-1-mounted-34`, v34); await shot(`${kind}-1-mounted-side`, side); }
    if (kind === 'mortar') {
      // Let any load finish (the round in his hand, ready), then fire and watch the round and the hand.
      await page.evaluate(`__step(150)`);
      if (shots) await shot('mortar-2-ready', side);
      const shellsBefore = await page.evaluate(`TT.getReserve()['60mm']`);
      await page.evaluate(`TT.fireMortar()`);
      const shellsAfter = await page.evaluate(`TT.getReserve()['60mm']`);
      const loadF = [];
      const lmarks = [0, 4, 8, 20, 35, 50, 62, 75, 95];
      for (let i = 0; i < 150; i++) {
        if (shots && lmarks.includes(i)) { await page.evaluate(`TT.setShotView(${JSON.stringify(side)})`); const f = path.join(outDir, `mortar-load-${String(i).padStart(3, '0')}.png`); await page.screenshot(f); }
        loadF.push(...await page.evaluate(`__run(1)`));
      }
      report.mortar.fired = shellsBefore - shellsAfter;
      report.mortar.round = loadF.filter((f, i) => i % 5 === 0).map((f, i) => f.round ? `${i * 5}:${f.round.state}${f.round.visible ? '' : '(hidden)'}` : `${i * 5}:-`).join(' ');
      report.mortar.load = metrics(loadF);
    }
    // Traverse: the aim swings round the gun to -70 deg over 1.5 s, to +70 over 3 s, back to 0 over 1.5 s.
    const trav = await page.evaluate(`(() => { const T = TT, b = __gun, R = 18, a0 = 0;
      const ang = (i) => i < 90 ? -1.22 * i / 90 : i < 270 ? -1.22 + 2.44 * (i - 90) / 180 : 1.22 - 1.22 * (i - 270) / 90;
      return __run(360, (i) => { const a = a0 + ang(i); window.__aim = [b.x + Math.sin(a) * R, T.sampleHeight(b.x + Math.sin(a) * R, b.z + Math.cos(a) * R), b.z + Math.cos(a) * R]; }); })()`);
    report[kind].traverse = slip(trav);
    report[kind].traverse.outOfReachFrames = trav.filter((f) => f.reach && f.reach.includes(false)).length;
    report[kind].traverseYaw = [Math.min(...trav.map((f) => f.yaw)), Math.max(...trav.map((f) => f.yaw))].map((v) => +v.toFixed(2));
    await plot(`${kind}-3-footprints-top`, trav, C);
    if (shots) {
      // A top-view strip while traversing: the same sweep again, a shot every 0.75 s.
      for (let k = 0; k < 6; k++) {
        await page.evaluate(`(() => { const T = TT, b = __gun, R = 18; for (let i = 0; i < 45; i++) { const j = ${k} * 45 + i, a = j < 90 ? -1.22 * j / 90 : -1.22 + 2.44 * (j - 90) / 180; window.__aim = [b.x + Math.sin(a) * R, 0, b.z + Math.cos(a) * R]; window.__aim[1] = T.sampleHeight(window.__aim[0], window.__aim[2]); __step(1); } })()`);
        await page.evaluate(`TT.setShotView(${JSON.stringify(top)})`); const f = path.join(outDir, `${kind}-4-traverse-top-${k}.png`); await page.evaluate(`__step(1)`); await page.screenshot(f);
      }
      await page.evaluate(`(() => { const b = __gun; window.__aim = [b.x, TT.sampleHeight(b.x, b.z + 18), b.z + 18]; __step(90); })()`);
    }
    // Dismount: 1 s.
    await page.evaluate(`TT.dismountMortar()`);
    const dF = await page.evaluate(`__run(60)`);
    report[kind].dismount = metrics(dF);
    if (process.env.DIAG) fs.writeFileSync(path.join(outDir, kind + '-dismount-series.json'), JSON.stringify(dF.slice(0, 30)));
    if (shots) await shot(`${kind}-5-dismounted`, v34);
    await page.evaluate(`TT.setShotView(null)`);
  }
  console.log(JSON.stringify(report, null, 1));
  fs.writeFileSync(path.join(outDir, 'measure.json'), JSON.stringify(report, null, 1));
  const errs = (page.errors || []).slice(0, 8); if (errs.length) console.log('page errors:\n  ' + errs.map((e) => e.split('\n')[0]).join('\n  '));
} catch (e) { console.error('FAILED', e && e.stack || e); code = 1; }
await browser.close?.(); server.close?.();
process.exit(code);
