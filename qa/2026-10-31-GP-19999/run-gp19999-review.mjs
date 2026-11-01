import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(ROOT, 'qa', '2026-10-31-GP-19999');
const AG169_OUT = path.resolve(ROOT, 'qa', '2026-10-31-AG-169');
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(AG169_OUT, { recursive: true });

const W = 1280, H = 720;
const server = await serve(ROOT, 0);
const browser = await launch({ headless: false, args: ['--window-size=' + W + ',' + H] });
const lib = fs.readFileSync(path.join(ROOT, 'tools', 'tests', 'lib.js'), 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const summary = {
  timestamp: new Date().toISOString(),
  diagnostics: null,
  cullAndKillChecks: null,
  gameplayDraws: null,
  bruteRetake: []
};

try {
  const page = await browser.newPage({ width: W, height: H });
  console.log('=== Loading Tiny Trek on real RTX 5080 WebGPU renderer ===');
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 300000 });
  if (!(await page.waitFor('!!window.TT', { timeout: 600000 }))) throw new Error('no TT');
  await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  await page.evaluate(lib);

  await page.evaluate(`(async () => {
    const T = TT;
    await startMatch(T, 'VM');
    T.clearZombies && T.clearZombies();
    T.setHp(1e5);
    T.setWorldTime(0.42);
    if (T.weather) { T.weather.raining = false; T.weather.intensity = 0; }
    T.setViewFirstDbg(true);
    await new Promise((r) => setTimeout(r, 2500));
    return 1;
  })()`, 600000);

  // =========================================================================
  // 1. Gameplay First-Person Views in 4 Lights + Draw Census
  // =========================================================================
  console.log('=== 1. Capturing Gameplay First-Person Views (4 Lights) ===');
  const lights = [
    ['noon',     'if (T.weather) { T.weather.raining = false; T.weather.intensity = 0; } T.setWorldTime(0.42);'],
    ['overcast', 'T.setWorldTime(0.42); if (T.weather) { T.weather.raining = true; T.weather.intensity = 0.85; }'],
    ['dusk',     'if (T.weather) { T.weather.raining = false; T.weather.intensity = 0; } T.setWorldTime(0.74);'],
    ['night',    'if (T.weather) { T.weather.raining = false; T.weather.intensity = 0; } T.setWorldTime(0.05);']
  ];

  summary.gameplayDraws = {};
  for (const [lightName, setupJs] of lights) {
    const info = await page.evaluate(`(async () => {
      const T = TT;
      ${setupJs}
      T.player.position.set(0, T.sampleHeight(0, 12), 12);
      if (T.setOtsAimDbg) T.setOtsAimDbg(0.35, 0.08);
      await new Promise((r) => setTimeout(r, 600));
      const names = [
        'bee-body-instanced', 'bee-wings-instanced',
        'butterfly-body-instanced', 'butterfly-wings-instanced',
        'bird-flock-body-instanced', 'bird-flock-wings-instanced'
      ];
      const batches = {};
      for (const n of names) {
        const m = T.scene.children.find(c => c.name === n);
        batches[n] = m ? { count: m.count, visible: m.visible, maxCount: m.instanceMatrix.count } : null;
      }
      const rInfo = (T.renderer.info && T.renderer.info.render) || {};
      return {
        drawCalls: rInfo.drawCalls ?? rInfo.calls ?? 0,
        triangles: rInfo.triangles ?? 0,
        batches
      };
    })()`, 120000);
    summary.gameplayDraws[lightName] = info;
    await page.screenshot(path.join(OUT, `gameplay-fp-${lightName}.png`));
  }

  // Restore clear noon and let bugs reappear
  await page.evaluate(`(async () => {
    const T = TT;
    if (T.weather) { T.weather.raining = false; T.weather.intensity = 0; }
    T.setWorldTime(0.42);
    await new Promise((r) => setTimeout(r, 800));
  })()`, 120000);

  // =========================================================================
  // 2. Deep Diagnostics of the 6 Instanced Meshes + Rain/Night Cull + Kill Check
  // =========================================================================
  console.log('=== 2. Running Deep Diagnostics & Cull/Kill Checks ===');
  summary.diagnostics = await page.evaluate(`(() => {
    const T = TT;
    const names = [
      'bee-body-instanced', 'bee-wings-instanced',
      'butterfly-body-instanced', 'butterfly-wings-instanced',
      'bird-flock-body-instanced', 'bird-flock-wings-instanced'
    ];
    const out = {};
    const m4 = new T.THREE.Matrix4();
    const pos = new T.THREE.Vector3();
    const quat = new T.THREE.Quaternion();
    const scl = new T.THREE.Vector3();

    for (const n of names) {
      const mesh = T.scene.children.find(c => c.name === n);
      if (!mesh) { out[n] = null; continue; }
      const instances = [];
      const flapAttr = mesh.geometry.attributes.wingFlap;
      const tintAttr = mesh.geometry.attributes.wingTint;
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, m4);
        m4.decompose(pos, quat, scl);
        instances.push({
          i,
          pos: [+pos.x.toFixed(3), +pos.y.toFixed(3), +pos.z.toFixed(3)],
          scale: +scl.x.toFixed(3),
          flap: flapAttr ? +flapAttr.getX(i).toFixed(4) : null,
          tint: tintAttr ? [+tintAttr.getX(i).toFixed(3), +tintAttr.getY(i).toFixed(3), +tintAttr.getZ(i).toFixed(3)] : null
        });
      }
      const colAttr = mesh.geometry.attributes.color;
      const tintableAttr = mesh.geometry.attributes.wingTintable;
      const sideAttr = mesh.geometry.attributes.wingSide;
      const hingeAttr = mesh.geometry.attributes.wingHinge;
      let tintableVerts = 0, nonTintableVerts = 0;
      let sampleVerts = [];
      if (colAttr) {
        for (let v = 0; v < colAttr.count; v++) {
          const tb = tintableAttr ? tintableAttr.getX(v) : 0;
          if (tb > 0.5) tintableVerts++; else nonTintableVerts++;
        }
        for (const v of [0, Math.floor(colAttr.count / 2), colAttr.count - 1]) {
          sampleVerts.push({
            v,
            rgba: [+colAttr.getX(v).toFixed(3), +colAttr.getY(v).toFixed(3), +colAttr.getZ(v).toFixed(3), +colAttr.getW(v).toFixed(3)],
            tintable: tintableAttr ? tintableAttr.getX(v) : null,
            side: sideAttr ? sideAttr.getX(v) : null,
            hinge: hingeAttr ? [+hingeAttr.getX(v).toFixed(4), +hingeAttr.getY(v).toFixed(4)] : null
          });
        }
      }
      out[n] = {
        count: mesh.count,
        maxCount: mesh.instanceMatrix.count,
        vertexCount: mesh.geometry.attributes.position.count,
        transparent: mesh.material.transparent,
        depthWrite: mesh.material.depthWrite,
        tintableVerts,
        nonTintableVerts,
        sampleVerts,
        instances
      };
    }
    return out;
  })()`);

  summary.cullAndKillChecks = await page.evaluate(`(async () => {
    const T = TT;
    const beeBody = T.scene.children.find(c => c.name === 'bee-body-instanced');
    const beeWing = T.scene.children.find(c => c.name === 'bee-wings-instanced');
    const butBody = T.scene.children.find(c => c.name === 'butterfly-body-instanced');
    const butWing = T.scene.children.find(c => c.name === 'butterfly-wings-instanced');
    const m4 = new T.THREE.Matrix4();
    const pos = new T.THREE.Vector3();

    const noonBeforeKill = {
      beeBody: beeBody.count,
      beeWing: beeWing.count,
      butBody: butBody.count,
      butWing: butWing.count
    };

    // Shoot butterfly instance 0 via fireRoundDbg + stepProjectilesDbg
    let afterKillBut = null;
    if (butBody.count > 0) {
      butBody.getMatrixAt(0, m4);
      pos.setFromMatrixPosition(m4);
      T.fireRoundDbg(pos.x, pos.y, pos.z - 0.5, 0, 0, 1, 50, 40, 0);
      T.stepProjectilesDbg(0.02);
      afterKillBut = {
        butBodyCount: butBody.count,
        butWingCount: butWing.count,
        decrementedImmediately: butBody.count === noonBeforeKill.butBody - 1 && butWing.count === noonBeforeKill.butWing - 1
      };
    }

    // Shoot bee instance 0 via fireRoundDbg + stepProjectilesDbg
    let afterKillBee = null;
    if (beeBody.count > 0) {
      beeBody.getMatrixAt(0, m4);
      pos.setFromMatrixPosition(m4);
      T.fireRoundDbg(pos.x, pos.y, pos.z - 0.5, 0, 0, 1, 50, 40, 0);
      T.stepProjectilesDbg(0.02);
      afterKillBee = {
        beeBodyCount: beeBody.count,
        beeWingCount: beeWing.count,
        decrementedImmediately: beeBody.count === noonBeforeKill.beeBody - 1 && beeWing.count === noonBeforeKill.beeWing - 1
      };
    }

    // Rain cull check
    if (T.weather) { T.weather.raining = true; T.weather.intensity = 0.85; }
    await new Promise((r) => setTimeout(r, 400));
    const rainCounts = {
      beeBody: beeBody.count,
      beeWing: beeWing.count,
      butBody: butBody.count,
      butWing: butWing.count
    };

    // Night cull check
    if (T.weather) { T.weather.raining = false; T.weather.intensity = 0; }
    T.setWorldTime(0.05);
    await new Promise((r) => setTimeout(r, 400));
    const nightCounts = {
      beeBody: beeBody.count,
      beeWing: beeWing.count,
      butBody: butBody.count,
      butWing: butWing.count
    };

    // Restore noon & let bugs unhide
    T.setWorldTime(0.42);
    await new Promise((r) => setTimeout(r, 500));
    return { noonBeforeKill, afterKillBut, afterKillBee, rainCounts, nightCounts };
  })()`, 120000);

  // =========================================================================
  // 3. Stop Animation Loop for Exact Frozen Close-Ups & Controlled Diagnostic Shots
  // =========================================================================
  console.log('=== 3. Capturing Frozen Live & Controlled Close-Up Shots ===');
  await page.evaluate(`(() => {
    const T = TT;
    T.setViewFirstDbg(false);
    T.inspectHost().loop(false);
  })()`);

  const renderAtCam = async (cx, cy, cz, tx, ty, tz, fov = 28) => {
    await page.evaluate(`(() => {
      const T = TT;
      T.camera.position.set(${cx}, ${cy}, ${cz});
      T.camera.fov = ${fov};
      T.camera.lookAt(${tx}, ${ty}, ${tz});
      T.camera.updateProjectionMatrix();
      T.camera.updateMatrixWorld(true);
      T.inspectHost().render();
    })()`);
    await wait(120);
  };

  // 3A. Frozen LIVE close-ups of butterfly[0], bee[0], and bird-flock[0] right where gameplay placed them!
  const livePos = await page.evaluate(`(() => {
    const T = TT;
    const m4 = new T.THREE.Matrix4();
    const getPos = (name) => {
      const mesh = T.scene.children.find(c => c.name === name);
      if (!mesh || mesh.count === 0) return null;
      mesh.getMatrixAt(0, m4);
      const p = new T.THREE.Vector3().setFromMatrixPosition(m4);
      return { x: p.x, y: p.y, z: p.z, count: mesh.count };
    };
    return {
      butterfly: getPos('butterfly-body-instanced'),
      bee: getPos('bee-body-instanced'),
      flock: getPos('bird-flock-body-instanced')
    };
  })()`);
  summary.livePositions = livePos;

  if (livePos.butterfly) {
    const p = livePos.butterfly;
    await renderAtCam(p.x + 0.12, p.y + 0.42, p.z + 0.32, p.x, p.y, p.z, 28);
    await page.screenshot(path.join(OUT, 'live-butterfly-close-noon.png'));
  }
  if (livePos.bee) {
    const p = livePos.bee;
    await renderAtCam(p.x + 0.10, p.y + 0.22, p.z + 0.24, p.x, p.y, p.z, 25);
    await page.screenshot(path.join(OUT, 'live-bee-close-noon.png'));
  }
  if (livePos.flock) {
    const p = livePos.flock;
    await renderAtCam(p.x + 1.2, p.y + 1.4, p.z + 4.5, p.x, p.y, p.z, 35);
    await page.screenshot(path.join(OUT, 'live-flock-close-noon.png'));
  }

  // 3B. Controlled 2-instance test near origin (x = -0.18 vs x = +0.18, flap = 0.0 vs flap = 0.35)
  await page.evaluate(`(() => {
    const T = TT;
    const bBody = T.scene.children.find(c => c.name === 'butterfly-body-instanced');
    const bWing = T.scene.children.find(c => c.name === 'butterfly-wings-instanced');
    const dummy = new T.THREE.Object3D();
    const gh = T.sampleHeight(0, 10);

    // Instance 0 at x = -0.18, flap = 0.0, bright orange tint (0xff7a1a)
    dummy.position.set(-0.18, gh + 1.5, 10);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(1.0);
    dummy.updateMatrixWorld(true);
    bBody.setMatrixAt(0, dummy.matrixWorld);
    bWing.setMatrixAt(0, dummy.matrixWorld);
    bWing.geometry.attributes.wingFlap.setX(0, 0.0);
    bWing.geometry.attributes.wingTint.setXYZ(0, 1.0, 0.48, 0.10);

    // Instance 1 at x = +0.18, flap = 0.35, bright cyan-blue tint (0x38b6ff)
    dummy.position.set(0.18, gh + 1.5, 10);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(1.0);
    dummy.updateMatrixWorld(true);
    bBody.setMatrixAt(1, dummy.matrixWorld);
    bWing.setMatrixAt(1, dummy.matrixWorld);
    bWing.geometry.attributes.wingFlap.setX(1, 0.35);
    bWing.geometry.attributes.wingTint.setXYZ(1, 0.22, 0.71, 1.0);

    bBody.count = bWing.count = 2;
    bBody.instanceMatrix.needsUpdate = true;
    bWing.instanceMatrix.needsUpdate = true;
    bWing.geometry.attributes.wingFlap.needsUpdate = true;
    bWing.geometry.attributes.wingTint.needsUpdate = true;

    const gh0 = gh + 1.5;
    T.camera.position.set(0, gh0 + 0.55, 10.55);
    T.camera.fov = 32;
    T.camera.lookAt(0, gh0, 10);
    T.camera.updateProjectionMatrix();
    T.camera.updateMatrixWorld(true);
    T.inspectHost().render();
  })()`);
  await wait(150);
  await page.screenshot(path.join(OUT, 'diag-butterfly-two-instances-near-origin.png'));

  // 3C. Controlled 2-instance test at x = 25 (away from x=0!) with flap = 0.0 vs flap = 0.45
  await page.evaluate(`(() => {
    const T = TT;
    const bBody = T.scene.children.find(c => c.name === 'butterfly-body-instanced');
    const bWing = T.scene.children.find(c => c.name === 'butterfly-wings-instanced');
    const dummy = new T.THREE.Object3D();
    const gh = T.sampleHeight(25, 10);

    dummy.position.set(24.82, gh + 1.5, 10);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(1.0);
    dummy.updateMatrixWorld(true);
    bBody.setMatrixAt(0, dummy.matrixWorld);
    bWing.setMatrixAt(0, dummy.matrixWorld);
    bWing.geometry.attributes.wingFlap.setX(0, 0.0);
    bWing.geometry.attributes.wingTint.setXYZ(0, 1.0, 0.48, 0.10);

    dummy.position.set(25.18, gh + 1.5, 10);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(1.0);
    dummy.updateMatrixWorld(true);
    bBody.setMatrixAt(1, dummy.matrixWorld);
    bWing.setMatrixAt(1, dummy.matrixWorld);
    bWing.geometry.attributes.wingFlap.setX(1, 0.45);
    bWing.geometry.attributes.wingTint.setXYZ(1, 0.22, 0.71, 1.0);

    bBody.count = bWing.count = 2;
    bBody.instanceMatrix.needsUpdate = true;
    bWing.instanceMatrix.needsUpdate = true;
    bWing.geometry.attributes.wingFlap.needsUpdate = true;
    bWing.geometry.attributes.wingTint.needsUpdate = true;

    const gh0 = gh + 1.5;
    T.camera.position.set(25, gh0 + 0.55, 10.55);
    T.camera.fov = 32;
    T.camera.lookAt(25, gh0, 10);
    T.camera.updateProjectionMatrix();
    T.camera.updateMatrixWorld(true);
    T.inspectHost().render();
  })()`);
  await wait(150);
  await page.screenshot(path.join(OUT, 'diag-butterfly-two-instances-at-x25.png'));

  // 3D. Controlled 2-instance Bee test at x = 25 (flap = 0.0 vs flap = 0.5)
  await page.evaluate(`(() => {
    const T = TT;
    const bBody = T.scene.children.find(c => c.name === 'butterfly-body-instanced');
    const bWing = T.scene.children.find(c => c.name === 'butterfly-wings-instanced');
    bBody.count = bWing.count = 0;

    const beeBody = T.scene.children.find(c => c.name === 'bee-body-instanced');
    const beeWing = T.scene.children.find(c => c.name === 'bee-wings-instanced');
    const dummy = new T.THREE.Object3D();
    const gh = T.sampleHeight(25, 10);

    dummy.position.set(24.9, gh + 1.5, 10);
    dummy.rotation.set(0, 0.55, 0);
    dummy.scale.setScalar(1.0);
    dummy.updateMatrixWorld(true);
    beeBody.setMatrixAt(0, dummy.matrixWorld);
    beeWing.setMatrixAt(0, dummy.matrixWorld);
    beeWing.geometry.attributes.wingFlap.setX(0, 0.0);
    beeWing.geometry.attributes.wingTint.setXYZ(0, 1, 1, 1);

    dummy.position.set(25.1, gh + 1.5, 10);
    dummy.rotation.set(0, 0.55, 0);
    dummy.scale.setScalar(1.0);
    dummy.updateMatrixWorld(true);
    beeBody.setMatrixAt(1, dummy.matrixWorld);
    beeWing.setMatrixAt(1, dummy.matrixWorld);
    beeWing.geometry.attributes.wingFlap.setX(1, 0.5);
    beeWing.geometry.attributes.wingTint.setXYZ(1, 1, 1, 1);

    beeBody.count = beeWing.count = 2;
    beeBody.instanceMatrix.needsUpdate = true;
    beeWing.instanceMatrix.needsUpdate = true;
    beeWing.geometry.attributes.wingFlap.needsUpdate = true;
    beeWing.geometry.attributes.wingTint.needsUpdate = true;

    const gh0 = gh + 1.5;
    T.camera.position.set(25.0, gh0 + 0.25, 10.35);
    T.camera.fov = 28;
    T.camera.lookAt(25.0, gh0, 10);
    T.camera.updateProjectionMatrix();
    T.camera.updateMatrixWorld(true);
    T.inspectHost().render();
  })()`);
  await wait(150);
  await page.screenshot(path.join(OUT, 'diag-bee-two-instances-at-x25.png'));

  // 3E. Close-up 4-light shots for Butterfly, Bee, and Bird Flock
  for (const [lightName, setupJs] of lights) {
    // Butterfly
    await page.evaluate(`(() => {
      const T = TT;
      ${setupJs}
      const beeBody = T.scene.children.find(c => c.name === 'bee-body-instanced');
      const beeWing = T.scene.children.find(c => c.name === 'bee-wings-instanced');
      beeBody.count = beeWing.count = 0;

      const bBody = T.scene.children.find(c => c.name === 'butterfly-body-instanced');
      const bWing = T.scene.children.find(c => c.name === 'butterfly-wings-instanced');
      const dummy = new T.THREE.Object3D();
      const gh = T.sampleHeight(0, 10);
      dummy.position.set(0, gh + 1.5, 10);
      dummy.rotation.set(0, 0.4, 0);
      dummy.scale.setScalar(1.0);
      dummy.updateMatrixWorld(true);
      bBody.setMatrixAt(0, dummy.matrixWorld);
      bWing.setMatrixAt(0, dummy.matrixWorld);
      bWing.geometry.attributes.wingFlap.setX(0, 0.0);
      bWing.geometry.attributes.wingTint.setXYZ(0, 1.0, 0.48, 0.10);
      bBody.count = bWing.count = 1;
      bBody.instanceMatrix.needsUpdate = true;
      bWing.instanceMatrix.needsUpdate = true;
      bWing.geometry.attributes.wingFlap.needsUpdate = true;
      bWing.geometry.attributes.wingTint.needsUpdate = true;

      T.camera.position.set(0.12, gh + 1.92, 10.32);
      T.camera.fov = 28;
      T.camera.lookAt(0, gh + 1.5, 10);
      T.camera.updateProjectionMatrix();
      T.camera.updateMatrixWorld(true);
      T.inspectHost().render();
    })()`);
    await wait(150);
    await page.screenshot(path.join(OUT, `butterfly-close-${lightName}.png`));

    // Bee
    await page.evaluate(`(() => {
      const T = TT;
      ${setupJs}
      const bBody = T.scene.children.find(c => c.name === 'butterfly-body-instanced');
      const bWing = T.scene.children.find(c => c.name === 'butterfly-wings-instanced');
      bBody.count = bWing.count = 0;

      const beeBody = T.scene.children.find(c => c.name === 'bee-body-instanced');
      const beeWing = T.scene.children.find(c => c.name === 'bee-wings-instanced');
      const dummy = new T.THREE.Object3D();
      const gh = T.sampleHeight(0, 10);
      dummy.position.set(0, gh + 1.5, 10);
      dummy.rotation.set(0, 0.55, 0);
      dummy.scale.setScalar(1.0);
      dummy.updateMatrixWorld(true);
      beeBody.setMatrixAt(0, dummy.matrixWorld);
      beeWing.setMatrixAt(0, dummy.matrixWorld);
      beeWing.geometry.attributes.wingFlap.setX(0, 0.0);
      beeWing.geometry.attributes.wingTint.setXYZ(0, 1, 1, 1);
      beeBody.count = beeWing.count = 1;
      beeBody.instanceMatrix.needsUpdate = true;
      beeWing.instanceMatrix.needsUpdate = true;
      beeWing.geometry.attributes.wingFlap.needsUpdate = true;
      beeWing.geometry.attributes.wingTint.needsUpdate = true;

      T.camera.position.set(0.14, gh + 1.66, 10.22);
      T.camera.fov = 25;
      T.camera.lookAt(0, gh + 1.5, 10);
      T.camera.updateProjectionMatrix();
      T.camera.updateMatrixWorld(true);
      T.inspectHost().render();
    })()`);
    await wait(150);
    await page.screenshot(path.join(OUT, `bee-close-${lightName}.png`));

    // Flock
    await page.evaluate(`(() => {
      const T = TT;
      ${setupJs}
      const fBody = T.scene.children.find(c => c.name === 'bird-flock-body-instanced');
      const m = new T.THREE.Matrix4();
      fBody.getMatrixAt(0, m);
      const p = new T.THREE.Vector3().setFromMatrixPosition(m);
      T.camera.position.set(p.x + 1.2, p.y + 1.4, p.z + 4.5);
      T.camera.fov = 35;
      T.camera.lookAt(p.x, p.y, p.z);
      T.camera.updateProjectionMatrix();
      T.camera.updateMatrixWorld(true);
      T.inspectHost().render();
    })()`);
    await wait(150);
    await page.screenshot(path.join(OUT, `flock-close-${lightName}.png`));
  }

  // =========================================================================
  // 4. Retake GP-19988 Part B (brute.json v3 6-frame filmstrip WITH body.apply())
  // =========================================================================
  console.log('=== 4. Retaking brute.json v3 6-frame filmstrip WITH body.apply() ===');
  const bruteBeats = [
    ['1-down-palms',   0.02],
    ['2-knee-under',   0.35],
    ['3-two-arm-push', 0.55],
    ['4-hip-rise',     0.70],
    ['5-head-lag',     0.86],
    ['6-recovered',    1.00]
  ];
  await page.evaluate(`(async () => {
    const T = TT;
    if (T.weather) { T.weather.raining = false; T.weather.intensity = 0; }
    T.setWorldTime(0.42);
    T.clearZombies && T.clearZombies();
    const { rigs } = await import('/studio/rigs.js');
    const ModStudio = await import('/studio/index.js');
    const bruteJson = await (await fetch('/studio/motion/zombie/brute.json')).json();
    const preset = ModStudio.loadMotion(bruteJson);
    const px = 0, pz = 14, py = T.sampleHeight(px, pz);
    const z = T.spawnZombie(px, pz, 'brute', true, true);
    z.hp = 999999; z.riseT = 0;
    z.mesh.position.set(px, py, pz);
    z.mesh.rotation.set(0, 0, 0);
    const inst = rigs.get('zombie').create({ group: z.mesh });
    const body = ModStudio.createBody(inst, preset, { ground: (x, zz) => py });
    body.follow();
    body.hit({ point: 'pelvis', dir: [0, 0.3, -1], power: 30, kind: 'blast' });
    let elapsed = 0;
    while (body.state !== 'getup' && elapsed < 5.0) {
      body.follow();
      body.update(1 / 60);
      body.apply();
      elapsed += 1 / 60;
    }
    window.__agBrute = { z, inst, body, preset, py, px, pz, getupStartElapsed: +elapsed.toFixed(3) };
    const idx = T.zombies.indexOf(z);
    if (idx >= 0) T.zombies.splice(idx, 1);
    T.camera.position.set(px + 2.8, py + 1.55, pz + 2.4);
    T.camera.fov = 44;
    T.camera.lookAt(px, py + 0.85, pz);
    T.camera.updateProjectionMatrix();
    T.camera.updateMatrixWorld(true);
    return 1;
  })()`, 120000);

  let curU = 0;
  const brutePaths = [];
  for (const [beatName, targetU] of bruteBeats) {
    const beatInfo = await page.evaluate(`(() => {
      const T = TT;
      const B = window.__agBrute;
      const getupDur = B.preset.getup.time || 1.4;
      const dtNeed = Math.max(0, (${targetU} - ${curU}) * getupDur);
      const steps = Math.max(1, Math.round(dtNeed * 60));
      const dt = dtNeed / steps;
      for (let i = 0; i < steps; i++) {
        B.body.follow();
        B.body.update(dt);
        B.body.apply();
      }
      B.z.mesh.updateMatrixWorld(true);
      T.inspectHost().render();
      const pts = typeof B.body.points === 'function' ? B.body.points() : B.body.points;
      const mapPt = (p) => p ? +(p[1] - B.py).toFixed(3) : null;
      return {
        beat: '${beatName}',
        targetU: ${targetU},
        state: B.body.state,
        pelvisY: mapPt(pts.pelvis),
        waistY: mapPt(pts.waist),
        chestY: mapPt(pts.chest),
        headY: mapPt(pts.head),
        handLY: mapPt(pts.handL),
        handRY: mapPt(pts.handR),
        kneeLY: mapPt(pts.kneeL),
        kneeRY: mapPt(pts.kneeR)
      };
    })()`);
    curU = targetU;
    summary.bruteRetake.push(beatInfo);
    const outPath = path.join(AG169_OUT, `gp19988-brute-getup-applied-${beatName}.png`);
    await wait(150);
    await page.screenshot(outPath);
    brutePaths.push(outPath);
  }

  // Stitch helper using browser canvas
  const stitchGrid = async (shotPaths, labels, cols, rows, outFile) => {
    const b64List = shotPaths.map(p => fs.readFileSync(p).toString('base64'));
    const b64Out = await page.evaluate(`(async () => {
      const b64s = ${JSON.stringify(b64List)};
      const labels = ${JSON.stringify(labels)};
      const cols = ${cols}, rows = ${rows};
      const cellW = 640, cellH = 360, labelH = 26;
      const c = document.createElement('canvas');
      c.width = cols * cellW;
      c.height = rows * (cellH + labelH);
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#101216';
      ctx.fillRect(0, 0, c.width, c.height);
      const loadImg = (src) => new Promise((res, rej) => {
        const im = new Image();
        im.onload = () => res(im);
        im.onerror = rej;
        im.src = src;
      });
      for (let i = 0; i < b64s.length; i++) {
        const im = await loadImg('data:image/png;base64,' + b64s[i]);
        const col = i % cols, row = Math.floor(i / cols);
        const x = col * cellW, y = row * (cellH + labelH);
        ctx.drawImage(im, x, y, cellW, cellH);
        ctx.fillStyle = '#181c22';
        ctx.fillRect(x, y + cellH, cellW, labelH);
        ctx.fillStyle = '#e8ecf2';
        ctx.font = 'bold 14px Consolas, monospace';
        ctx.fillText(labels[i] || '', x + 10, y + cellH + 18);
      }
      return c.toDataURL('image/png').replace(/^data:image\\/png;base64,/, '');
    })()`, 60000);
    fs.writeFileSync(outFile, Buffer.from(b64Out, 'base64'));
  };

  await stitchGrid(
    brutePaths,
    bruteBeats.map(([name, u]) => `${name} (u=${u})`),
    3, 2,
    path.join(AG169_OUT, 'gp19988-brute-getup-applied-sheet.png')
  );

  const gpShots = [
    path.join(OUT, 'diag-butterfly-two-instances-near-origin.png'),
    path.join(OUT, 'diag-butterfly-two-instances-at-x25.png'),
    path.join(OUT, 'diag-bee-two-instances-at-x25.png'),
    path.join(OUT, 'butterfly-close-noon.png'),
    path.join(OUT, 'bee-close-noon.png'),
    path.join(OUT, 'flock-close-noon.png'),
    path.join(OUT, 'gameplay-fp-noon.png'),
    path.join(OUT, 'gameplay-fp-dusk.png'),
    path.join(OUT, 'gameplay-fp-night.png')
  ];
  const gpLabels = [
    'Butterfly 2-inst @ x=0 (flap 0 vs 0.35)',
    'Butterfly 2-inst @ x=25 (flap 0 vs 0.45)',
    'Bee 2-inst @ x=25 (flap 0 vs 0.50)',
    'Butterfly close noon (foreBorder overdraw)',
    'Bee close noon',
    'Flock close noon (8 birds stacked)',
    'Gameplay FP noon',
    'Gameplay FP dusk',
    'Gameplay FP night'
  ];
  await stitchGrid(gpShots, gpLabels, 3, 3, path.join(OUT, 'gp19999-review-sheet.png'));

  fs.writeFileSync(path.join(OUT, 'gp19999-summary.json'), JSON.stringify(summary, null, 2));
  console.log('=== Done! Saved gp19999-summary.json and gp19999-review-sheet.png ===');
} finally {
  try { await browser.close(); } catch (_) {}
  try { server.close(); } catch (_) {}
}
