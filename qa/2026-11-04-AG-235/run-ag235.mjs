import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const REPO = 'C:\\Users\\Zero\\Desktop\\Tiny Trek';
const WT = 'C:\\Users\\Zero\\.gemini\\antigravity\\brain\\53107b3e-754b-4d62-b2fd-a4a4037916bb\\scratch\\wt-ag235';
const OUT_DIR = path.join(REPO, 'qa', '2026-11-04-AG-235');
fs.mkdirSync(OUT_DIR, { recursive: true });

const logFile = path.join(OUT_DIR, 'run.log');
function log(...args) {
  const line = args.join(' ');
  console.log(line);
  fs.appendFileSync(logFile, line + '\n');
}

fs.writeFileSync(logFile, ''); // clear log

const libCode = fs.readFileSync(path.join(REPO, 'tools', 'tests', 'lib.js'), 'utf8');

function buildTestPageIn(rootDir) {
  const src = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  const map = src.match(/<script type="importmap">([\s\S]*?)<\/script>/);
  const fake = `<script type="importmap">
  {
    "imports": {
      "three": "./fakethree.mjs",
      "three/webgpu": "./fakethree.mjs",
      "three/tsl": "./faketsl.mjs",
      "three/addons/": "./addons/"
    }
  }
  </script>`;
  let out = src.replace(map[0], fake);
  out = out.replace('<head>', '<head>\n  <script>try{localStorage.clear()}catch(e){}</script>');
  out = out.replace(/(\s(?:src|href)=")(?!https?:|\/|data:|#)/g, '$1/');
  out = out.replace(/from (['"])\.\//g, 'from $1/');
  out = out.replace(/import (['"])\.\//g, 'import $1/');
  const file = path.join(rootDir, 'tools', 'tests', 'test-235.html');
  fs.writeFileSync(file, out);
  return file;
}

const diagCode = `
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (fn, ms) => {
    const t0 = performance.now();
    while (performance.now() - t0 < ms) { if (fn()) return true; await wait(40); }
    return !!fn();
  };
  const qang = (f) => {
    const q = T.camera.quaternion;
    const d = Math.abs(f.qx * q.x + f.qy * q.y + f.qz * q.z + f.qw * q.w);
    return Math.acos(Math.min(1, d)) * 2 * 180 / Math.PI;
  };
  const readExtra = () => {
    const h = T.marine && T.marine.userData && T.marine.userData.headG;
    let hx = 0, hy = 0, hz = 0, fpx = 0, fpy = 0, fpz = 0;
    if (h) {
      h.updateWorldMatrix(true, false);
      const hp = new T.THREE.Vector3(); h.getWorldPosition(hp);
      hx = hp.x; hy = hp.y; hz = hp.z;
      const fe = new T.THREE.Vector3(0, 0.205, 0.12); h.localToWorld(fe);
      fpx = fe.x; fpy = fe.y; fpz = fe.z;
    }
    const fp = T.fpDbg ? T.fpDbg() : {};
    const fl = T.flightDbg ? T.flightDbg() : {};
    const vm = T.viewmodelDbg ? T.viewmodelDbg() : null;
    return {
      hx, hy, hz, fpx, fpy, fpz,
      ads: fp.ads || 0,
      eyex: fp.eye ? fp.eye.x : 0, eyey: fp.eye ? fp.eye.y : 0, eyez: fp.eye ? fp.eye.z : 0,
      xfade: fl.xfade, xw: fl.xw,
      vmActive: !!(vm && vm.info && vm.info.active),
      vmRaise: vm && vm.info ? vm.info.raise : 0,
      marineY: T.marine ? T.marine.position.y : 0,
      torsoX: T.marine && T.marine.userData.torsoG ? T.marine.userData.torsoG.rotation.x : 0,
      torsoY: T.marine && T.marine.userData.torsoG ? T.marine.userData.torsoG.rotation.y : 0,
      torsoZ: T.marine && T.marine.userData.torsoG ? T.marine.userData.torsoG.rotation.z : 0,
      headRX: h ? h.rotation.x : 0, headRY: h ? h.rotation.y : 0, headRZ: h ? h.rotation.z : 0,
    };
  };
  let frameDiffs = [];
  let snap0 = null;
  try {
    ok(typeof T.stepFrame === 'function' && typeof T.flightClip === 'function', 'the recorder is on TT');
    const seed = T.flightDbg().seed;
    ok(seed >>> 0 === seed && Math.random() < 1, 'Math.random is the seeded generator (seed ' + seed + ')');
    await startMatch(T, 'Recorder');
    T.setViewFirstDbg(true);
    ok(await until(() => T.fpDbg().first && T.fpDbg().w === 1, 8000), 'first person settled before the clip (' + (T.fpDbg() && T.fpDbg().w) + ')');
    T.flightHold(true);
    T.flightReset();
    const dt = 1 / 30;
    const frames = 20 / dt;
    const recExtra = [];
    for (let i = 0; i < frames; i++) {
      const keys = ['KeyW'];
      let dx = 0, zoom = false;
      if (i >= 200 && i < 320) dx = 1.5;
      if (i >= 320 && i < 480) { keys.push('ShiftLeft'); zoom = true; }
      T.flightInput({ keys, dx, dy: 0, zoom });
      T.stepFrame(dt);
      recExtra.push(readExtra());
    }
    const clip = T.flightClip('walk, turn, aim, run');
    snap0 = clip.snapshots[0];
    ok(clip.frames.length === frames && clip.snapshots.length >= 1, 'the clip has ' + clip.frames.length + ' frames and ' + clip.snapshots.length + ' snapshots');
    ok(clip.rngSeed === seed && clip.settings && clip.settings.fpFov === 60, 'the clip names the seed and the field of view');
    const saved = clip.frames.map((f) => ({ px: f.px, py: f.py, pz: f.pz, cx: f.cx, cy: f.cy, cz: f.cz, qx: f.qx, qy: f.qy, qz: f.qz, qw: f.qw, dt: f.dt }));
    T.flightRestore(clip);
    let worstP = 0, worstA = 0, worstC = 0, lateC = 0, at = 0, lateAt = -1;
    for (let i = 0; i < saved.length; i++) {
      T.stepFrame(saved[i].dt);
      const f = saved[i], p = T.player.position, c = T.camera.position;
      const ex = readExtra(), rex = recExtra[i];
      const dp = Math.hypot(p.x - f.px, p.y - f.py, p.z - f.pz);
      const dc = Math.hypot(c.x - f.cx, c.y - f.cy, c.z - f.cz);
      const dcx = c.x - f.cx, dcy = c.y - f.cy, dcz = c.z - f.cz;
      const dFpEye = Math.hypot(ex.fpx - rex.fpx, ex.fpy - rex.fpy, ex.fpz - rex.fpz);
      const dfpx = ex.fpx - rex.fpx, dfpy = ex.fpy - rex.fpy, dfpz = ex.fpz - rex.fpz;
      const da = qang(f);
      if (dp > worstP) worstP = dp;
      if (da > worstA) worstA = da;
      if (dc > worstC) { worstC = dc; at = i; }
      if (i >= 16 && dc > lateC) { lateC = dc; lateAt = i; }
      if (dc > 0.0002 || i < 20 || (i >= 318 && i <= 345) || (i >= 478 && i <= 505)) {
        frameDiffs.push({
          i, dc: +dc.toFixed(6), dcx: +dcx.toFixed(6), dcy: +dcy.toFixed(6), dcz: +dcz.toFixed(6),
          dFpEye: +dFpEye.toFixed(6), dfpx: +dfpx.toFixed(6), dfpy: +dfpy.toFixed(6), dfpz: +dfpz.toFixed(6),
          dp: +dp.toFixed(6), ads: +ex.ads.toFixed(4), recAds: +rex.ads.toFixed(4),
          dMarineY: +(ex.marineY - rex.marineY).toFixed(6),
          dTorsoX: +(ex.torsoX - rex.torsoX).toFixed(6),
          dHeadRX: +(ex.headRX - rex.headRX).toFixed(6),
          xw: ex.xw, recXw: rex.xw
        });
      }
    }
    ok(worstP < 0.001, 'the player matches within 1 mm (' + worstP.toFixed(5) + ' m)');
    ok(worstA < 0.01, 'the camera direction matches within 0.01 deg (' + worstA.toFixed(4) + ')');
    ok(lateC < 0.001, 'after the eye ease the camera position matches within 1 mm (' + lateC.toFixed(4) + ' m)');
    ok(worstC < 0.02, 'the opening frames stay within 20 mm while the eye catches the head (' + worstC.toFixed(4) + ' m at frame ' + at + ')');
    ok(T.flightDbg().replaying === true, 'replay drove the frames itself');
    return { text: out.join('\\n'), worstP, worstA, worstC, at, lateC, lateAt, frameDiffs: frameDiffs.slice(0, 80), snapPose: snap0 ? snap0.pose : null };
  } catch (e) {
    ok(false, 'threw ' + (e && e.stack || e.message || e));
    return { text: out.join('\\n'), error: String(e && e.stack || e) };
  }
})()
`;

async function bootPage(page, url) {
  await page.goto(url, { timeout: 120000 });
  const ready = await page.waitFor('!!window.TT', { timeout: 120000 });
  if (!ready) throw new Error('window.TT never appeared on ' + url);
  await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 30000 });
  await page.evaluate(libCode, 30000);
}

async function captureGP20024_3P(browser, baseUrl) {
  log('--- Capturing GP-20024 3P 4-light shots ---');
  const page = await browser.newPage({ width: 1920, height: 1080 });
  let probe = null;
  try {
    await bootPage(page, `${baseUrl}/index.html?debug=1&raf=timer`);
    const setupExpr = `
    (async () => {
      const T = window.TT;
      await startMatch(T, 'GP20024');
      T.clearZombies();
      const px = 42, pz = -19.5;
      const py = T.sampleHeight(px, pz);
      T.player.position.set(px, py, pz);
      T.player.rotation.set(0, 0, 0);
      T.setAimYawDbg(0);
      T.grantAllWeapons();
      const wIdx = (T.WEAPON_ORDER || []).indexOf('minigun');
      if (wIdx >= 0) T.setWeapon(wIdx);
      else if (typeof T.equip === 'function') T.equip('minigun');
      T.setViewFirstDbg(false);

      // Settle weapon swap completely
      for (let i = 0; i < 180; i++) {
        T.stepFrame(1 / 60);
        const swapDone = (!T.getSwapDbg || T.getSwapDbg().swapT <= 0) && (!T.drawDbg || !T.drawDbg().active);
        if (swapDone && i > 45) break;
      }
      T.flightHold(true);

      const m = T.marine, u = m.userData;
      const gun = T.weaponMeshes.minigun;
      const H = T.getShoulderDbg().holds.minigun;
      T.player.updateMatrixWorld(true);
      gun.updateMatrixWorld(true);
      const V = (a) => new T.THREE.Vector3(a[0], a[1], a[2]);
      const gp = T.handsDbg.gripPoint;
      const pR = gp('R', new T.THREE.Vector3());
      const pL = gp('L', new T.THREE.Vector3());
      const peg = gun.localToWorld(V(H.fore));
      const rear = gun.localToWorld(V(H.grip));
      const elbowW = new T.THREE.Vector3(); u.elbowLG.getWorldPosition(elbowW);
      const wristW = pL.clone();
      const elbowInGun = gun.worldToLocal(elbowW.clone());
      const wristInGun = gun.worldToLocal(wristW.clone());
      return {
        hold: H,
        dR: +pR.distanceTo(rear).toFixed(4),
        dL: +pL.distanceTo(peg).toFixed(4),
        elbowInGun: [+elbowInGun.x.toFixed(3), +elbowInGun.y.toFixed(3), +elbowInGun.z.toFixed(3)],
        wristInGun: [+wristInGun.x.toFixed(3), +wristInGun.y.toFixed(3), +wristInGun.z.toFixed(3)],
        receiverLeftWallX: -0.17,
        elbowClearanceM: +((-0.17 - elbowInGun.x) * (gun.scale.x || 1)).toFixed(4),
        wristClearanceM: +((-0.17 - wristInGun.x) * (gun.scale.x || 1)).toFixed(4)
      };
    })()
    `;
    probe = await page.evaluate(setupExpr, 60000);
    log('GP-20024 3P Probe:', JSON.stringify(probe));
    fs.writeFileSync(path.join(OUT_DIR, 'gp20024-3p-telemetry.json'), JSON.stringify(probe, null, 2));

    const lights = [
      { name: 'noon', t: 0.50 },
      { name: '042', t: 0.42 },
      { name: 'dusk', t: 0.74 },
      { name: 'night', t: 0.02 },
    ];
    for (const L of lights) {
      await page.evaluate(`
        (() => {
          const T = window.TT;
          T.setWorldTime(${L.t});
          const p = T.player.position;
          T.setShotView({
            x: p.x - 1.15, y: p.y + 1.48, z: p.z + 1.05,
            tx: p.x - 0.08, ty: p.y + 1.08, tz: p.z + 0.22,
            fov: 38
          });
          T.stepFrame(0);
          return true;
        })()
      `);
      const shot = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 90, captureBeyondViewport: false });
      fs.writeFileSync(path.join(OUT_DIR, `minigun-3p-${L.name}.jpg`), Buffer.from(shot.data, 'base64'));
    }

    // Close-up view
    await page.evaluate(`
      (() => {
        const T = window.TT;
        T.setWorldTime(0.50);
        const p = T.player.position;
        T.setShotView({
          x: p.x - 0.75, y: p.y + 1.25, z: p.z + 0.55,
          tx: p.x - 0.18, ty: p.y + 1.05, tz: p.z + 0.15,
          fov: 28
        });
        T.stepFrame(0);
        return true;
      })()
    `);
    const closeShot = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 90, captureBeyondViewport: false });
    fs.writeFileSync(path.join(OUT_DIR, `minigun-3p-noon-close.jpg`), Buffer.from(closeShot.data, 'base64'));

    // Rear grip view
    await page.evaluate(`
      (() => {
        const T = window.TT;
        T.setWorldTime(0.50);
        const p = T.player.position;
        T.setShotView({
          x: p.x + 0.75, y: p.y + 1.35, z: p.z - 0.95,
          tx: p.x + 0.05, ty: p.y + 1.02, tz: p.z - 0.15,
          fov: 30
        });
        T.stepFrame(0);
        return true;
      })()
    `);
    const rearShot = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 90, captureBeyondViewport: false });
    fs.writeFileSync(path.join(OUT_DIR, `minigun-3p-reargrip.jpg`), Buffer.from(rearShot.data, 'base64'));

    // Generate contact sheets
    try {
      execFileSync('python', [path.join(OUT_DIR, 'build-3p-sheet.py')], { stdio: 'inherit' });
    } catch (e) { log('Warning: build-3p-sheet.py returned', String(e)); }

  } finally {
    try { await page.send('Page.close', {}); } catch {}
  }
  return probe;
}

async function runT298Diag(browser, baseUrl, rootDir, mode = 'real') {
  let url;
  if (mode === 'test') {
    buildTestPageIn(rootDir);
    url = `${baseUrl}/tools/tests/test-235.html?debug=1&raf=timer&r=${Date.now()}`;
  } else {
    url = `${baseUrl}/index.html?debug=1&raf=timer&r=${Date.now()}`;
  }
  const page = await browser.newPage({ width: 1280, height: 720 });
  try {
    await bootPage(page, url);
    return await page.evaluate(diagCode, 180000);
  } finally {
    try { await page.send('Page.close', {}); } catch {}
  }
}

function gitWt(args) {
  return execFileSync('git', args, { cwd: WT, encoding: 'utf8' });
}

const srvRepo = await serve(REPO, 0);
const srvWt = await serve(WT, 0);
const browser = await launch({ headless: false });

const results = {};
const saveResults = () => {
  try { fs.writeFileSync(path.join(OUT_DIR, 'bisect-results.json'), JSON.stringify(results, null, 2)); } catch {}
};

try {
  // 1. GP-20024 3P 4-light shots + telemetry on WORKING_TREE
  results.gp20024_3p = await captureGP20024_3P(browser, srvRepo.origin);
  saveResults();

  // 2. Run t298 on WORKING_TREE (real and test page)
  log('--- Running t298 on WORKING_TREE (real) ---');
  results.wt_real = await runT298Diag(browser, srvRepo.origin, REPO, 'real');
  log('WORKING_TREE (real): lateC =', results.wt_real.lateC, 'lateAt =', results.wt_real.lateAt, 'worstC =', results.wt_real.worstC, 'at =', results.wt_real.at);
  saveResults();

  log('--- Running t298 on WORKING_TREE (test) ---');
  results.wt_test = await runT298Diag(browser, srvRepo.origin, REPO, 'test');
  log('WORKING_TREE (test): lateC =', results.wt_test.lateC, 'lateAt =', results.wt_test.lateAt, 'worstC =', results.wt_test.worstC, 'at =', results.wt_test.at);
  saveResults();

  // 3. Run t298 on 5adede46 in worktree (real and test page)
  gitWt(['checkout', '5adede46', '--', 'index.html', 'game', 'studio', 'core', 'world']);
  log('--- Running t298 on 5adede46 (real) ---');
  results.c5adede46_real = await runT298Diag(browser, srvWt.origin, WT, 'real');
  log('5adede46 (real): lateC =', results.c5adede46_real.lateC, 'lateAt =', results.c5adede46_real.lateAt, 'worstC =', results.c5adede46_real.worstC, 'at =', results.c5adede46_real.at);
  saveResults();

  log('--- Running t298 on 5adede46 (test) ---');
  results.c5adede46_test = await runT298Diag(browser, srvWt.origin, WT, 'test');
  log('5adede46 (test): lateC =', results.c5adede46_test.lateC, 'lateAt =', results.c5adede46_test.lateAt, 'worstC =', results.c5adede46_test.worstC, 'at =', results.c5adede46_test.at);
  saveResults();

  // 4. Check if 5adede46 is already red! If so, test f645ba77 in worktree!
  if (results.c5adede46_real.lateC >= 0.001 || results.c5adede46_test.lateC >= 0.001) {
    log('--- 5adede46 is ALSO red! Testing f645ba77 code files in worktree ---');
    gitWt(['checkout', 'f645ba77', '--', 'index.html', 'game', 'studio', 'core', 'world']);
    results.cf645ba77_real = await runT298Diag(browser, srvWt.origin, WT, 'real');
    log('f645ba77 (real): lateC =', results.cf645ba77_real.lateC, 'lateAt =', results.cf645ba77_real.lateAt, 'worstC =', results.cf645ba77_real.worstC, 'at =', results.cf645ba77_real.at);
    saveResults();
    results.cf645ba77_test = await runT298Diag(browser, srvWt.origin, WT, 'test');
    log('f645ba77 (test): lateC =', results.cf645ba77_test.lateC, 'lateAt =', results.cf645ba77_test.lateAt, 'worstC =', results.cf645ba77_test.worstC, 'at =', results.cf645ba77_test.at);
    saveResults();

    gitWt(['checkout', '5adede46', '--', 'index.html', 'game', 'studio', 'core', 'world']);
    gitWt(['checkout', 'f645ba77', '--', 'index.html']);
    results.c5adede46_with_f645_index_real = await runT298Diag(browser, srvWt.origin, WT, 'real');
    log('5adede46 + f645ba77 index.html (real): lateC =', results.c5adede46_with_f645_index_real.lateC);
    saveResults();

    gitWt(['checkout', '5adede46', '--', 'index.html']);
    let idx = fs.readFileSync(path.join(WT, 'index.html'), 'utf8');
    const cl293Target = `      const k = 1 - Math.exp(-FP_BOB_RATE * (1 - 0.75 * fpAdsW) * dt);
      // (ChatGPT: a 4 cm deadband could be crossed by the run's own bob; it's his posture changing that follows fast now.
      //  Restored 2026-11-03: this edit of 14:00Z was lost when a whole-file restore of index.html put back an older copy.)
      const postureMoving = Math.abs((POSE.crouch || 0) - fpCrouchWas) > 0.0015 || diveFlatW > 0.01; fpCrouchWas = POSE.crouch || 0;
      const ky = postureMoving ? 1 - Math.exp(-FP_BOB_RATE * dt) : 1 - Math.exp(-FP_BOB_RATE * (1 - 0.9 * fpAdsW) * dt);
      _fpOff.x += (ox - _fpOff.x) * k; _fpOff.y += (oy - _fpOff.y) * ky; _fpOff.z += (oz - _fpOff.z) * k;`;
    const cl293Revert = `      const k = 1 - Math.exp(-FP_BOB_RATE * dt);
      _fpOff.x += (ox - _fpOff.x) * k; _fpOff.y += (oy - _fpOff.y) * k; _fpOff.z += (oz - _fpOff.z) * k;`;
    const idxNorm = idx.replace(/\r\n/g, '\n');
    if (idxNorm.includes(cl293Target)) {
      fs.writeFileSync(path.join(WT, 'index.html'), idxNorm.replace(cl293Target, cl293Revert));
      results.c5adede46_revert_cl293_real = await runT298Diag(browser, srvWt.origin, WT, 'real');
      log('5adede46 with CL-293 firstPersonEye reverted (real): lateC =', results.c5adede46_revert_cl293_real.lateC, 'lateAt =', results.c5adede46_revert_cl293_real.lateAt);
      saveResults();
      results.c5adede46_revert_cl293_test = await runT298Diag(browser, srvWt.origin, WT, 'test');
      log('5adede46 with CL-293 firstPersonEye reverted (test): lateC =', results.c5adede46_revert_cl293_test.lateC, 'lateAt =', results.c5adede46_revert_cl293_test.lateAt);
      saveResults();
    }

    const wtFiles = ['index.html', 'game/viewmodel.js', 'game/viewmodel-poses.js', 'studio/motion.js', 'studio/weapon-heavy.js', 'studio/weapon-longarms.js', 'studio/weapon-sidearms.js', 'game/wall-cull.js'];
    for (const f of wtFiles) {
      fs.copyFileSync(path.join(REPO, f), path.join(WT, f));
    }
    const wtIdxNorm = fs.readFileSync(path.join(WT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
    if (wtIdxNorm.includes(cl293Target)) {
      fs.writeFileSync(path.join(WT, 'index.html'), wtIdxNorm.replace(cl293Target, cl293Revert));
      results.wt_revert_cl293_real = await runT298Diag(browser, srvWt.origin, WT, 'real');
      log('WORKING_TREE with CL-293 firstPersonEye reverted (real): lateC =', results.wt_revert_cl293_real.lateC, 'lateAt =', results.wt_revert_cl293_real.lateAt);
      saveResults();
      results.wt_revert_cl293_test = await runT298Diag(browser, srvWt.origin, WT, 'test');
      log('WORKING_TREE with CL-293 firstPersonEye reverted (test): lateC =', results.wt_revert_cl293_test.lateC, 'lateAt =', results.wt_revert_cl293_test.lateAt);
      saveResults();
    }
  } else {
    log('--- 5adede46 is GREEN! Testing one changed file at a time from WORKING_TREE ---');
    const wtFiles = ['index.html', 'game/viewmodel.js', 'game/viewmodel-poses.js', 'studio/motion.js', 'studio/weapon-heavy.js', 'studio/weapon-longarms.js', 'studio/weapon-sidearms.js', 'game/wall-cull.js'];
    results.byFile = {};
    for (const f of wtFiles) {
      gitWt(['checkout', '5adede46', '--', ...wtFiles]);
      fs.copyFileSync(path.join(REPO, f), path.join(WT, f));
      const rReal = await runT298Diag(browser, srvWt.origin, WT, 'real');
      const rTest = await runT298Diag(browser, srvWt.origin, WT, 'test');
      results.byFile[f] = { realLateC: rReal.lateC, realLateAt: rReal.lateAt, testLateC: rTest.lateC, testLateAt: rTest.lateAt };
      log(`File ${f}: (real) lateC=${rReal.lateC} at=${rReal.lateAt} | (test) lateC=${rTest.lateC} at=${rTest.lateAt}`);
      saveResults();
    }
  }
} catch (err) {
  log('ERROR in run-ag235:', String(err && err.stack || err));
  results.fatalError = String(err && err.stack || err);
  saveResults();
} finally {
  try { fs.unlinkSync(path.join(REPO, 'tools', 'tests', 'test-235.html')); } catch {}
  try { fs.unlinkSync(path.join(WT, 'tools', 'tests', 'test-235.html')); } catch {}
  await browser.close();
  await srvRepo.close();
  await srvWt.close();
}

fs.writeFileSync(path.join(OUT_DIR, 'bisect-results.json'), JSON.stringify(results, null, 2));
log('Saved results to qa/2026-11-04-AG-235/bisect-results.json');
