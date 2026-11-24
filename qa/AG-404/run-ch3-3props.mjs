import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { IdleProofCamera } from '../../review/GP-20218/proof-camera.mjs';

assert(process.env.DW_GAME_TEST_TOKEN, 'Use the official crew game-test slot');

const ROOT = process.cwd();
const md5 = (p) => createHash('md5').update(fs.readFileSync(p)).digest('hex');
const sha256 = (p) => createHash('sha256').update(fs.readFileSync(p)).digest('hex');

const PINS = {
  liveIndex: { file: 'index.html', expect: '22afb368' },
  liveRazor: { file: 'game/training-perimeter.js', expect: '2b1d1690' },
  copyRazor: { file: 'review/CH-3/razor/training-perimeter.ch3r.js', expect: 'da70f7d9' },
  liveCif: { file: 'ui/cif-exterior.js', expect: '98117f1f' },
  copyCif: { file: 'review/CH-3/cif/cif-exterior.ch3c.js', expect: '2dc7d589' },
  liveGun: { file: 'game/training-containment.js', expect: 'f9e683d7' },
  copyGun: { file: 'review/CH-3/gun/training-containment.ch3g.js', expect: 'd617dd32' },
};

const verifiedPins = {};
for (const [k, { file, expect }] of Object.entries(PINS)) {
  const m = md5(file);
  assert.equal(m.slice(0, 8), expect, `MD5 mismatch ${file}: got ${m}, expected ${expect}`);
  verifiedPins[k] = { file, md5: m, sha256: sha256(file) };
}

const c19 = JSON.parse(fs.readFileSync('review/CH-3/walk/closeups/C19-razor-fence.json', 'utf8')).cam;
const c09a = JSON.parse(fs.readFileSync('review/CH-3/walk/closeups/C09a-cif-copy.json', 'utf8')).cam;
const c25 = JSON.parse(fs.readFileSync('review/CH-3/walk/closeups/C25-containment-gun.json', 'utf8')).cam;
const libSrc = fs.readFileSync('tools/tests/lib.js', 'utf8');

// Helper: create a temp mirror directory of the repo with ONE file replaced (zero edits in live repo!)
function withTempMirror(relTarget, copySource, fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ag404-ch3-'));
  const targetTop = relTarget.split('/')[0];
  try {
    for (const ent of fs.readdirSync(ROOT, { withFileTypes: true })) {
      if (ent.name === '.git' || ent.name === '_DELETE ME' || ent.name === 'qa' || ent.name === 'review' || ent.name === 'handoffs' || ent.name === 'crew') continue;
      const src = path.join(ROOT, ent.name);
      const dst = path.join(tmp, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === targetTop) {
          fs.mkdirSync(dst, { recursive: true });
          for (const sub of fs.readdirSync(src, { withFileTypes: true })) {
            const sSub = path.join(src, sub.name);
            const dSub = path.join(dst, sub.name);
            const relSub = `${ent.name}/${sub.name}`;
            if (relSub === relTarget) {
              fs.copyFileSync(path.resolve(ROOT, copySource), dSub);
            } else if (sub.isDirectory()) {
              fs.symlinkSync(sSub, dSub, 'junction');
            } else {
              fs.copyFileSync(sSub, dSub);
            }
          }
        } else {
          fs.symlinkSync(src, dst, 'junction');
        }
      } else {
        fs.copyFileSync(src, dst);
      }
    }
    return fn(tmp);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function runNodeTest(cwd, testFile) {
  try {
    const out = execFileSync(process.execPath, ['--test', testFile], { cwd, encoding: 'utf8', timeout: 60000 });
    return { ok: true, output: out.trim() };
  } catch (e) {
    return { ok: false, output: ((e.stdout || '') + '\n' + (e.stderr || '')).trim() };
  }
}

async function runT336(files) {
  const camera = new IdleProofCamera({ onscreen: true, size: '1600x900', warm: 'none', files });
  try {
    await camera.open();
    const p = camera.page;
    assert.equal(await p.evaluate('TT.getRendererBackend()'), 'WebGPU');
    await p.evaluate(libSrc);
    const out = await p.evaluate(fs.readFileSync('tools/tests/t336.js', 'utf8'), 450000);
    const lines = String(out).split('\n');
    return {
      pass: lines.filter((l) => l.startsWith('PASS ')).length,
      fail: lines.filter((l) => l.startsWith('FAIL ')),
      errors: p.errors,
    };
  } finally {
    await camera.close();
  }
}

// =========================================================================
// 1. CH-3 #4 RAZOR COIL + FENCE POSTS
// =========================================================================
const RAZOR_OUT = 'review/CH-3/razor/native';
fs.mkdirSync(RAZOR_OUT, { recursive: true });

async function captureRazor(side, files) {
  const dir = `${RAZOR_OUT}/${side}`;
  fs.mkdirSync(dir, { recursive: true });
  const camera = new IdleProofCamera({ onscreen: true, training: true, size: '1920x1080', warm: 'none', files });
  try {
    await camera.open();
    const p = camera.page;
    assert.equal(await p.evaluate('TT.getRendererBackend()'), 'WebGPU');
    await p.evaluate('CamRig.ui(false); TT.clearZombies(); TT.flightHold(true); TT.stepFrame(1/60);');

    const stats = await p.evaluate(`(() => {
      const tg = TT.trainingDbg.tg();
      const root = tg.group.getObjectByName('training-razor-perimeter');
      const sides = {};
      if (root) {
        for (const ch of root.children) {
          let meshes = 0, tris = 0;
          ch.traverse((o) => { if (o.isMesh && o.visible) { meshes++; tris += (o.geometry.index?.count || o.geometry.attributes.position.count) / 3; } });
          sides[ch.name] = { meshes, tris: Math.round(tris) };
        }
      }
      return sides;
    })()`);

    // Exact cameras: C19, fence 3/4 from 4m, one post top close
    const cams = [
      ['c19', c19],
      ['fence-3q-4m', { x: -13.1, y: -197.7, z: -639.0, tx: -10.0, ty: -197.7, tz: -635.5, fov: 56 }],
      ['post-top-close', { x: -11.05, y: -197.45, z: -636.65, tx: -10.0, ty: -197.65, tz: -635.85, fov: 46 }],
    ];
    const shots = {};
    for (const lamps of [true, false]) {
      const ltag = lamps ? 'on' : 'off';
      await p.evaluate(`TT.trainingDbg.tg().setLights(${lamps}); TT.stepFrame(0);`);
      for (const [name, cam] of cams) {
        await p.evaluate(`TT.setShotView(${JSON.stringify(cam)}); TT.stepFrame(0);`);
        await new Promise((r) => setTimeout(r, 80));
        await p.evaluate('TT.stepFrame(0);');
        await new Promise((r) => setTimeout(r, 60));
        const f = `${dir}/${name}-${ltag}.png`;
        await p.screenshot(f);
        shots[`${name}-${ltag}`] = f;
      }
    }
    assert.deepEqual(p.errors, []);
    return { side, stats, shots };
  } finally {
    await camera.close();
  }
}

const razorRes = {
  liveMd5: verifiedPins.liveRazor.md5,
  copyMd5: verifiedPins.copyRazor.md5,
  before: await captureRazor('before', undefined),
  after: await captureRazor('after', { '/game/training-perimeter.js': PINS.copyRazor.file }),
  nodeTestBefore: runNodeTest(ROOT, 'game/training-perimeter.test.mjs'),
  nodeTestAfter: withTempMirror('game/training-perimeter.js', PINS.copyRazor.file, (tmp) => runNodeTest(tmp, 'game/training-perimeter.test.mjs')),
  t336Before: await runT336(undefined),
  t336After: await runT336({ '/game/training-perimeter.js': PINS.copyRazor.file }),
};
fs.writeFileSync(`${RAZOR_OUT}/summary.json`, JSON.stringify(razorRes, null, 2) + '\n');
console.log('CH3_RAZOR_DONE', JSON.stringify({
  beforeSides: razorRes.before.stats,
  afterSides: razorRes.after.stats,
  nodeBefore: razorRes.nodeTestBefore.ok,
  nodeAfter: razorRes.nodeTestAfter.ok,
  t336Before: `${razorRes.t336Before.pass}/${razorRes.t336Before.fail.length}`,
  t336After: `${razorRes.t336After.pass}/${razorRes.t336After.fail.length}`,
}));

// =========================================================================
// 2. CH-3 #5 PART 1: CIF LIGHT BAR + BACK BOARD
// =========================================================================
const CIF_OUT = 'review/CH-3/cif/native';
fs.mkdirSync(CIF_OUT, { recursive: true });

async function captureCif(side, files) {
  const dir = `${CIF_OUT}/${side}`;
  fs.mkdirSync(dir, { recursive: true });
  const shots = {};
  let hqStats = null;

  // 2A) HQ CIF: front (day), looking up at light (day), night lockdown (red strip!)
  {
    const camera = new IdleProofCamera({ onscreen: true, size: '1920x1080', warm: 'none', files });
    try {
      await camera.open();
      const p = camera.page;
      assert.equal(await p.evaluate('TT.getRendererBackend()'), 'WebGPU');
      await p.evaluate(libSrc);
      await p.evaluate("startMatch(TT,'CH-3 CIF HQ').then(()=>TT.getPhase())", 180000);
      await p.evaluate('CamRig.ui(false); TT.clearZombies(); TT.flightHold(true); TT.setWorldTime(0.45); TT.stepFrame(1/60);');

      hqStats = await p.evaluate(`(() => {
        const h = TT.house.group, g = h.getObjectByName('hq-cif');
        let houseMeshes = 0, houseTris = 0, cifMeshes = 0, cifTris = 0;
        h.traverse((o) => { if (o.isMesh && o.visible) { houseMeshes++; houseTris += (o.geometry.index?.count || o.geometry.attributes.position.count) / 3; } });
        if (g) g.traverse((o) => { if (o.isMesh && o.visible) { cifMeshes++; cifTris += (o.geometry.index?.count || o.geometry.attributes.position.count) / 3; } });
        return { houseMeshes, houseTris: Math.round(houseTris), cifMeshes, cifTris: Math.round(cifTris), bayHex: TT.house.bayLampMat.emissive.getHexString() };
      })()`);

      // Front day
      await p.evaluate(`(() => {
        const b = TT.house.group.getObjectByName('hq-cif').getWorldPosition(new TT.THREE.Vector3());
        TT.setShotView({ x: b.x + 2.8, y: b.y + 1.85, z: b.z, tx: b.x, ty: b.y + 1.75, tz: b.z, fov: 56 });
        TT.stepFrame(0);
      })()`);
      await new Promise((r) => setTimeout(r, 80));
      await p.evaluate('TT.stepFrame(0);');
      await new Promise((r) => setTimeout(r, 60));
      await p.screenshot(`${dir}/hq-front-day.png`);
      shots.hqFrontDay = `${dir}/hq-front-day.png`;

      // Looking up at the light bar (day)
      await p.evaluate(`(() => {
        const b = TT.house.group.getObjectByName('hq-cif').getWorldPosition(new TT.THREE.Vector3());
        TT.setShotView({ x: b.x + 1.45, y: b.y + 1.45, z: b.z - 0.35, tx: b.x - 0.1, ty: b.y + 2.32, tz: b.z, fov: 50 });
        TT.stepFrame(0);
      })()`);
      await new Promise((r) => setTimeout(r, 80));
      await p.evaluate('TT.stepFrame(0);');
      await new Promise((r) => setTimeout(r, 60));
      await p.screenshot(`${dir}/hq-lookup-day.png`);
      shots.hqLookupDay = `${dir}/hq-lookup-day.png`;

      // Night lockdown (strip turns red!)
      const lockState = await p.evaluate(`(() => {
        TT.flightHold(false);
        TT.beginWave();
        TT.clearZombies();
        TT.setWorldTime(0.0);
        TT.flightHold(true);
        for (let i = 0; i < 6; i++) TT.stepFrame(1/60);
        const b = TT.house.group.getObjectByName('hq-cif').getWorldPosition(new TT.THREE.Vector3());
        TT.setShotView({ x: b.x + 1.65, y: b.y + 1.50, z: b.z - 0.30, tx: b.x - 0.05, ty: b.y + 2.25, tz: b.z, fov: 52 });
        TT.stepFrame(0);
        return { lockdown: TT.nightLockdown(), bayHex: TT.house.bayLampMat.emissive.getHexString() };
      })()`);
      hqStats.lockdown = lockState;
      await new Promise((r) => setTimeout(r, 80));
      await p.evaluate('TT.stepFrame(0);');
      await new Promise((r) => setTimeout(r, 60));
      await p.screenshot(`${dir}/hq-lockdown-night.png`);
      shots.hqLockdownNight = `${dir}/hq-lockdown-night.png`;

      assert.deepEqual(p.errors, []);
    } finally {
      await camera.close();
    }
  }

  // 2B) Training CIF copy (C09a + looking up at light, lamps OFF)
  {
    const camera = new IdleProofCamera({ onscreen: true, training: true, size: '1920x1080', warm: 'none', files });
    try {
      await camera.open();
      const p = camera.page;
      assert.equal(await p.evaluate('TT.getRendererBackend()'), 'WebGPU');
      await p.evaluate('CamRig.ui(false); TT.clearZombies(); TT.flightHold(true); TT.trainingDbg.tg().setLights(false); TT.stepFrame(0);');

      await p.evaluate(`TT.setShotView(${JSON.stringify(c09a)}); TT.stepFrame(0);`);
      await new Promise((r) => setTimeout(r, 80));
      await p.evaluate('TT.stepFrame(0);');
      await new Promise((r) => setTimeout(r, 60));
      await p.screenshot(`${dir}/train-c09a-off.png`);
      shots.trainC09aOff = `${dir}/train-c09a-off.png`;

      // Looking up at the Training CIF light bar (lamps off)
      await p.evaluate(`TT.setShotView({ x: 6.45, y: -198.65, z: -650.55, tx: 8.05, ty: -197.72, tz: -650.2, fov: 50 }); TT.stepFrame(0);`);
      await new Promise((r) => setTimeout(r, 80));
      await p.evaluate('TT.stepFrame(0);');
      await new Promise((r) => setTimeout(r, 60));
      await p.screenshot(`${dir}/train-lookup-off.png`);
      shots.trainLookupOff = `${dir}/train-lookup-off.png`;

      assert.deepEqual(p.errors, []);
    } finally {
      await camera.close();
    }
  }

  return { side, hqStats, shots };
}

// Run unchanged ui/cif-exterior.browser.mjs gate (--before on live, then without --before on temp mirror copy)
const cifGateOut = path.resolve(ROOT, CIF_OUT, 'browser-gate');
fs.mkdirSync(cifGateOut, { recursive: true });
function runCifGate(cwd, args) {
  try {
    const out = execFileSync(process.execPath, ['ui/cif-exterior.browser.mjs', ...args], {
      cwd,
      env: { ...process.env, CIF_SHOT_OUT: cifGateOut },
      encoding: 'utf8',
      timeout: 150000,
    });
    return { ok: true, output: out.trim() };
  } catch (e) {
    return { ok: false, output: ((e.stdout || '') + '\n' + (e.stderr || '')).trim() };
  }
}

const cifRes = {
  liveMd5: verifiedPins.liveCif.md5,
  copyMd5: verifiedPins.copyCif.md5,
  before: await captureCif('before', undefined),
  after: await captureCif('after', { '/ui/cif-exterior.js': PINS.copyCif.file }),
  gateBefore: runCifGate(ROOT, ['--before']),
  gateAfter: withTempMirror('ui/cif-exterior.js', PINS.copyCif.file, (tmp) => runCifGate(tmp, [])),
};
fs.writeFileSync(`${CIF_OUT}/summary.json`, JSON.stringify(cifRes, null, 2) + '\n');
console.log('CH3_CIF_DONE', JSON.stringify({
  hqBefore: cifRes.before.hqStats,
  hqAfter: cifRes.after.hqStats,
  gateBefore: cifRes.gateBefore.ok,
  gateAfter: cifRes.gateAfter.ok,
}));

// =========================================================================
// 3. CH-3 #5 PART 2: CONTAINMENT GUN WALL BRACKET
// =========================================================================
const GUN_OUT = 'review/CH-3/gun/native';
fs.mkdirSync(GUN_OUT, { recursive: true });

async function captureGun(side, files) {
  const dir = `${GUN_OUT}/${side}`;
  fs.mkdirSync(dir, { recursive: true });
  const camera = new IdleProofCamera({ onscreen: true, training: true, size: '1920x1080', warm: 'none', files });
  try {
    await camera.open();
    const p = camera.page;
    assert.equal(await p.evaluate('TT.getRendererBackend()'), 'WebGPU');
    await p.evaluate('CamRig.ui(false); TT.clearZombies(); TT.flightHold(true); TT.stepFrame(1/60);');

    const stats = await p.evaluate(`(() => {
      const c = TT.trainingDbg.state().containment;
      let meshes = 0, tris = 0;
      if (c && c.group) c.group.traverse((o) => { if (o.isMesh && o.visible) { meshes++; tris += (o.geometry.index?.count || o.geometry.attributes.position.count) / 3; } });
      return { found: !!(c && c.group), meshes, tris: Math.round(tris) };
    })()`);

    const cams = [
      ['c25', c25],
      ['bracket-close', { x: -41.35, y: -194.65, z: -633.15, tx: -43.2, ty: -194.4, tz: -632.0, fov: 46 }],
    ];
    const shots = {};
    for (const lamps of [true, false]) {
      const ltag = lamps ? 'on' : 'off';
      await p.evaluate(`TT.trainingDbg.tg().setLights(${lamps}); TT.stepFrame(0);`);
      for (const [name, cam] of cams) {
        await p.evaluate(`TT.setShotView(${JSON.stringify(cam)}); TT.stepFrame(0);`);
        await new Promise((r) => setTimeout(r, 80));
        await p.evaluate('TT.stepFrame(0);');
        await new Promise((r) => setTimeout(r, 60));
        const f = `${dir}/${name}-${ltag}.png`;
        await p.screenshot(f);
        shots[`${name}-${ltag}`] = f;
      }
    }

    // Firing shots (containment start, lamps ON and OFF)
    for (const lamps of [true, false]) {
      const ltag = lamps ? 'on' : 'off';
      const fireInfo = await p.evaluate(`(async () => {
        const D = TT.trainingDbg, tg = D.tg();
        D.clear();
        tg.setLights(${lamps});
        TT.flightHold(false);
        D.deployNow('shambler', 4);
        const w0 = performance.now();
        while (performance.now() - w0 < 15000) {
          if (TT.zombies.filter((z) => z.alive && z.trainingZ && z.mesh && z.mesh.visible).length >= 2) break;
          await new Promise((r) => setTimeout(r, 80));
        }
        TT.flightHold(true);
        TT.setShotView(${JSON.stringify(c25)});
        const c = D.state().containment;
        const started = c.start();
        let firedFrame = -1;
        for (let i = 0; i < 120; i++) {
          TT.stepFrame(1 / 60);
          if (c.read().shots > 0) { firedFrame = i; break; }
        }
        return { started, firedFrame, read: c.read() };
      })()`, 60000);
      await p.evaluate('TT.stepFrame(0);');
      await new Promise((r) => setTimeout(r, 80));
      await p.evaluate('TT.stepFrame(0);');
      await new Promise((r) => setTimeout(r, 60));
      const f = `${dir}/firing-${ltag}.png`;
      await p.screenshot(f);
      shots[`firing-${ltag}`] = { file: f, fireInfo };
    }

    assert.deepEqual(p.errors, []);
    return { side, stats, shots };
  } finally {
    await camera.close();
  }
}

const gunRes = {
  liveMd5: verifiedPins.liveGun.md5,
  copyMd5: verifiedPins.copyGun.md5,
  before: await captureGun('before', undefined),
  after: await captureGun('after', { '/game/training-containment.js': PINS.copyGun.file }),
  nodeTestBefore: runNodeTest(ROOT, 'game/training-containment.test.mjs'),
  nodeTestAfter: withTempMirror('game/training-containment.js', PINS.copyGun.file, (tmp) => runNodeTest(tmp, 'game/training-containment.test.mjs')),
  t336Before: razorRes.t336Before,
  t336After: await runT336({ '/game/training-containment.js': PINS.copyGun.file }),
};
fs.writeFileSync(`${GUN_OUT}/summary.json`, JSON.stringify(gunRes, null, 2) + '\n');
console.log('CH3_GUN_DONE', JSON.stringify({
  beforeStats: gunRes.before.stats,
  afterStats: gunRes.after.stats,
  nodeBefore: gunRes.nodeTestBefore.ok,
  nodeAfter: gunRes.nodeTestAfter.ok,
  t336After: `${gunRes.t336After.pass}/${gunRes.t336After.fail.length}`,
}));
