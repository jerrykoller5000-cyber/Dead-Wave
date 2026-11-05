import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const REPO = 'C:\\Users\\Zero\\Desktop\\Tiny Trek';
const WT = 'C:\\Users\\Zero\\.gemini\\antigravity\\brain\\53107b3e-754b-4d62-b2fd-a4a4037916bb\\scratch\\wt-ag235';
const OUT_DIR = path.join(REPO, 'qa', '2026-11-04-AG-235');
fs.mkdirSync(OUT_DIR, { recursive: true });

const logFile = path.join(OUT_DIR, 'bisect-verify.log');
fs.writeFileSync(logFile, '');
function log(...args) {
  const line = args.join(' ');
  console.log(line);
  fs.appendFileSync(logFile, line + '\n');
}

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

function makeDiagCode({ clearZombiesBeforeClip = false } = {}) {
  return `
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
    const m = T.marine, u = m ? m.userData : {};
    const h = u.headG, tr = u.torsoG, lb = u.lowerBody;
    let fpx = 0, fpy = 0, fpz = 0;
    if (h) {
      h.updateWorldMatrix(true, false);
      const fe = new T.THREE.Vector3(0, 0.205, 0.12); h.localToWorld(fe);
      fpx = fe.x; fpy = fe.y; fpz = fe.z;
    }
    const P = T.gaitDbg && T.gaitDbg.pose ? T.gaitDbg.pose() : {};
    const sh = T.getShoulderDbg ? T.getShoulderDbg() : {};
    const ots = T.otsDbg ? T.otsDbg() : {};
    const as = T.aimSafetyDbg ? T.aimSafetyDbg() : {};
    return {
      fpx, fpy, fpz,
      px: T.player.position.x, py: T.player.position.y, pz: T.player.position.z,
      pRotY: T.player.rotation.y,
      aimYaw: as.yaw != null ? as.yaw : T.player.rotation.y,
      otsYaw: ots.yaw != null ? ots.yaw : 0,
      aimKind: T.aimKindDbg ? T.aimKindDbg() : null,
      aimTx: T.aimTarget ? +T.aimTarget.x.toFixed(4) : 0,
      aimTz: T.aimTarget ? +T.aimTarget.z.toFixed(4) : 0,
      mPos: m ? [m.position.x, m.position.y, m.position.z] : [0,0,0],
      mRot: m ? [m.rotation.x, m.rotation.y, m.rotation.z] : [0,0,0],
      lbPos: lb ? [lb.position.x, lb.position.y, lb.position.z] : [0,0,0],
      lbRot: lb ? [lb.rotation.x, lb.rotation.y, lb.rotation.z] : [0,0,0],
      trPos: tr ? [tr.position.x, tr.position.y, tr.position.z] : [0,0,0],
      trRot: tr ? [tr.rotation.x, tr.rotation.y, tr.rotation.z] : [0,0,0],
      hdRot: h ? [h.rotation.x, h.rotation.y, h.rotation.z] : [0,0,0],
      lowerYaw: P.lowerYaw || 0,
      pelvisYaw: P.pelvisYaw || 0,
      chestYaw: P.chestYaw || 0,
      holdTwist: P.holdTwist || 0,
      leanSide: P.leanSide || 0,
      holdW: sh.holdW || 0,
      turnActive: !!(u.turn && u.turn.active),
      turnYaw: u.turn ? u.turn.yaw : 0,
      phase: T.smoothDbg && T.smoothDbg.phase ? T.smoothDbg.phase() : 0
    };
  };
  let frameDiffs = [];
  try {
    ok(typeof T.stepFrame === 'function' && typeof T.flightClip === 'function', 'the recorder is on TT');
    const seed = T.flightDbg().seed;
    ok(seed >>> 0 === seed && Math.random() < 1, 'Math.random is the seeded generator (seed ' + seed + ')');
    await startMatch(T, 'Recorder');
    T.setViewFirstDbg(true);
    ok(await until(() => T.fpDbg().first && T.fpDbg().w === 1, 8000), 'first person settled before the clip (' + (T.fpDbg() && T.fpDbg().w) + ')');
    ${clearZombiesBeforeClip ? 'if (typeof T.clearZombies === "function") T.clearZombies();' : ''}
    const zCountBefore = T.zombies ? T.zombies.filter((z) => z.alive).length : -1;
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
    const snapZCount = clip.snapshots && clip.snapshots[0] && clip.snapshots[0].zombies ? clip.snapshots[0].zombies.length : 0;
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
      const dFpEye = Math.hypot(ex.fpx - rex.fpx, ex.fpy - rex.fpy, ex.fpz - rex.fpz);
      const da = qang(f);
      if (dp > worstP) worstP = dp;
      if (da > worstA) worstA = da;
      if (dc > worstC) { worstC = dc; at = i; }
      if (i >= 16 && dc > lateC) { lateC = dc; lateAt = i; }
      if (dc > 0.0005 || i < 5 || (i >= 135 && i <= 195)) {
        const diffVec = (a, b) => a.map((v, k) => +(v - b[k]).toFixed(6));
        frameDiffs.push({
          i, pz: +p.z.toFixed(2),
          dc: +dc.toFixed(6), dFpEye: +dFpEye.toFixed(6),
          dfp: [+(ex.fpx - rex.fpx).toFixed(6), +(ex.fpy - rex.fpy).toFixed(6), +(ex.fpz - rex.fpz).toFixed(6)],
          recAimKind: rex.aimKind, repAimKind: ex.aimKind,
          recAimYaw: +rex.aimYaw.toFixed(6), repAimYaw: +ex.aimYaw.toFixed(6),
          dAimYaw: +(ex.aimYaw - rex.aimYaw).toFixed(6),
          recAimT: [rex.aimTx, rex.aimTz], repAimT: [ex.aimTx, ex.aimTz],
          dpRotY: +(ex.pRotY - rex.pRotY).toFixed(6),
          dmRot: diffVec(ex.mRot, rex.mRot),
          dlbRot: diffVec(ex.lbRot, rex.lbRot),
          dtrRot: diffVec(ex.trRot, rex.trRot),
          dhdRot: diffVec(ex.hdRot, rex.hdRot),
          dLowerYaw: +(ex.lowerYaw - rex.lowerYaw).toFixed(6),
          recTurn: rex.turnActive, repTurn: ex.turnActive,
          dTurnYaw: +(ex.turnYaw - rex.turnYaw).toFixed(6)
        });
      }
    }
    ok(worstP < 0.001, 'the player matches within 1 mm (' + worstP.toFixed(5) + ' m)');
    ok(worstA < 0.01, 'the camera direction matches within 0.01 deg (' + worstA.toFixed(4) + ')');
    ok(lateC < 0.001, 'after the eye ease the camera position matches within 1 mm (' + lateC.toFixed(4) + ' m)');
    ok(worstC < 0.02, 'the opening frames stay within 20 mm while the eye catches the head (' + worstC.toFixed(4) + ' m at frame ' + at + ')');
    ok(T.flightDbg().replaying === true, 'replay drove the frames itself');
    return { text: out.join('\\n'), worstP, worstA, worstC, at, lateC, lateAt, zCountBefore, snapZCount, frameDiffs };
  } catch (e) {
    ok(false, 'threw ' + (e && e.stack || e.message || e));
    return { text: out.join('\\n'), error: String(e && e.stack || e) };
  }
})()
`;
}

async function bootPage(page, url) {
  await page.goto(url, { timeout: 120000 });
  const ready = await page.waitFor('!!window.TT', { timeout: 120000 });
  if (!ready) throw new Error('window.TT never appeared on ' + url);
  await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 30000 });
  await page.evaluate(libCode, 30000);
}

async function runT298Diag(browser, baseUrl, rootDir, mode = 'real', opts = {}) {
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
    return await page.evaluate(makeDiagCode(opts), 180000);
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
  try { fs.writeFileSync(path.join(OUT_DIR, 'bisect-verify.json'), JSON.stringify(results, null, 2)); } catch {}
};

try {
  // 1. WORKING_TREE (real & test) with aimYaw / aimKind / aimTarget logging
  log('--- 1. WORKING_TREE (real & test) ---');
  results.wt_real = await runT298Diag(browser, srvRepo.origin, REPO, 'real');
  log('WORKING_TREE (real): lateC =', results.wt_real.lateC, 'lateAt =', results.wt_real.lateAt, 'worstC =', results.wt_real.worstC, 'at =', results.wt_real.at, 'zCountBefore =', results.wt_real.zCountBefore, 'snapZCount =', results.wt_real.snapZCount);
  saveResults();

  results.wt_test = await runT298Diag(browser, srvRepo.origin, REPO, 'test');
  log('WORKING_TREE (test): lateC =', results.wt_test.lateC, 'lateAt =', results.wt_test.lateAt, 'worstC =', results.wt_test.worstC, 'at =', results.wt_test.at, 'zCountBefore =', results.wt_test.zCountBefore, 'snapZCount =', results.wt_test.snapZCount);
  saveResults();

  // 2. Counterfactual A: WORKING_TREE with T.clearZombies() before flightReset
  log('--- 2. Counterfactual A: WORKING_TREE + clearZombies before clip ---');
  results.wt_clearZombies_real = await runT298Diag(browser, srvRepo.origin, REPO, 'real', { clearZombiesBeforeClip: true });
  log('WT + clearZombies (real): lateC =', results.wt_clearZombies_real.lateC, 'lateAt =', results.wt_clearZombies_real.lateAt, 'worstC =', results.wt_clearZombies_real.worstC, 'at =', results.wt_clearZombies_real.at);
  saveResults();

  results.wt_clearZombies_test = await runT298Diag(browser, srvRepo.origin, REPO, 'test', { clearZombiesBeforeClip: true });
  log('WT + clearZombies (test): lateC =', results.wt_clearZombies_test.lateC, 'lateAt =', results.wt_clearZombies_test.lateAt, 'worstC =', results.wt_clearZombies_test.worstC, 'at =', results.wt_clearZombies_test.at);
  saveResults();

  // 3. Counterfactual B: WORKING_TREE in wt-ag235 with aimYaw = OTS.yaw when _otsCentre && viewFirst && fpOffSet
  log('--- 3. Counterfactual B: WORKING_TREE + aimYaw = OTS.yaw in first person ---');
  for (const rel of ['index.html', 'game', 'studio', 'core', 'world']) {
    fs.cpSync(path.join(REPO, rel), path.join(WT, rel), { recursive: true, force: true });
  }
  let wtIdx = fs.readFileSync(path.join(WT, 'index.html'), 'utf8');
  wtIdx = wtIdx.replace(
    'aimYaw = Math.atan2(dx, dz);',
    'aimYaw = (_otsCentre && viewFirst && fpOffSet) ? OTS.yaw : Math.atan2(dx, dz);'
  );
  fs.writeFileSync(path.join(WT, 'index.html'), wtIdx);

  results.wt_fpAimYaw_real = await runT298Diag(browser, srvWt.origin, WT, 'real');
  log('WT + fpAimYaw=OTS.yaw (real): lateC =', results.wt_fpAimYaw_real.lateC, 'lateAt =', results.wt_fpAimYaw_real.lateAt, 'worstC =', results.wt_fpAimYaw_real.worstC, 'at =', results.wt_fpAimYaw_real.at);
  saveResults();

  results.wt_fpAimYaw_test = await runT298Diag(browser, srvWt.origin, WT, 'test');
  log('WT + fpAimYaw=OTS.yaw (test): lateC =', results.wt_fpAimYaw_test.lateC, 'lateAt =', results.wt_fpAimYaw_test.lateAt, 'worstC =', results.wt_fpAimYaw_test.worstC, 'at =', results.wt_fpAimYaw_test.at);
  saveResults();

  // 4. 5adede46 + WORKING_TREE index.html only (isolating post-5adede46 index.html changes: CL-301, GB-272, GB-255)
  log('--- 4. 5adede46 + WORKING_TREE index.html ---');
  gitWt(['checkout', '5adede46', '--', 'index.html', 'game', 'studio', 'core', 'world']);
  fs.copyFileSync(path.join(REPO, 'game', 'viewmodel-poses.js'), path.join(WT, 'game', 'viewmodel-poses.js'));
  fs.copyFileSync(path.join(REPO, 'index.html'), path.join(WT, 'index.html'));
  results.c5adede46_plus_wt_index_real = await runT298Diag(browser, srvWt.origin, WT, 'real');
  log('5adede46 + WT index.html (real): lateC =', results.c5adede46_plus_wt_index_real.lateC, 'lateAt =', results.c5adede46_plus_wt_index_real.lateAt, 'worstC =', results.c5adede46_plus_wt_index_real.worstC);
  saveResults();

  results.c5adede46_plus_wt_index_test = await runT298Diag(browser, srvWt.origin, WT, 'test');
  log('5adede46 + WT index.html (test): lateC =', results.c5adede46_plus_wt_index_test.lateC, 'lateAt =', results.c5adede46_plus_wt_index_test.lateAt, 'worstC =', results.c5adede46_plus_wt_index_test.worstC);
  saveResults();

  // 5. Commit history bisection: e10ed377 vs 2d9ab0b2 vs 5abd7576
  for (const sha of ['e10ed377', '2d9ab0b2', '5abd7576']) {
    log(`--- 5. Commit ${sha} ---`);
    gitWt(['checkout', sha, '--', 'index.html', 'game', 'studio', 'core', 'world']);
    results[`c_${sha}_real`] = await runT298Diag(browser, srvWt.origin, WT, 'real');
    log(`${sha} (real): lateC =`, results[`c_${sha}_real`].lateC, 'lateAt =', results[`c_${sha}_real`].lateAt, 'worstC =', results[`c_${sha}_real`].worstC, 'zCountBefore =', results[`c_${sha}_real`].zCountBefore);
    saveResults();

    results[`c_${sha}_test`] = await runT298Diag(browser, srvWt.origin, WT, 'test');
    log(`${sha} (test): lateC =`, results[`c_${sha}_test`].lateC, 'lateAt =', results[`c_${sha}_test`].lateAt, 'worstC =', results[`c_${sha}_test`].worstC, 'zCountBefore =', results[`c_${sha}_test`].zCountBefore);
    saveResults();
  }

} catch (err) {
  log('ERROR in run-bisect:', String(err && err.stack || err));
  results.fatalError = String(err && err.stack || err);
  saveResults();
} finally {
  try { fs.unlinkSync(path.join(REPO, 'tools', 'tests', 'test-235.html')); } catch {}
  try { fs.unlinkSync(path.join(WT, 'tools', 'tests', 'test-235.html')); } catch {}
  await browser.close();
  await srvRepo.close();
  await srvWt.close();
}
