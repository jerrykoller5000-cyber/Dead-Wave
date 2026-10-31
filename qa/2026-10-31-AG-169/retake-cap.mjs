// qa/2026-10-31-AG-169/retake-cap.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const ROOT = path.resolve(HERE, '..', '..');
const TESTS = path.join(ROOT, 'tools', 'tests');

const W = 1280, H = 720;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const server = await serve(ROOT, 0);
const browser = await launch({
  headless: false,
  args: ['--disable-features=CalculateNativeWinOcclusion', `--window-size=${W},${H}`]
});

try {
  const page = await browser.newPage({ width: W, height: H });
  const url = `${server.origin}/index.html?debug=1&raf=timer`;
  await page.goto(url, { timeout: 240000 });
  if (!(await page.waitFor('!!window.TT', { timeout: 300000 }))) throw new Error('no TT');
  await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  await page.evaluate(fs.readFileSync(path.join(TESTS, 'lib.js'), 'utf8'));

  await page.evaluate(`(async () => {
    const T = TT;
    await startMatch(T, 'AG169');
    T.clearZombies && T.clearZombies();
    T.setHp(1e5);
    T.setWorldTime(0.42);
    if (T.weather) { T.weather.rain = 0; T.weather.thunder = 0; }
    document.body.classList.add('test-hide-hud');
    await new Promise((r) => setTimeout(r, 400));
  })()`, 120000);

  const capGeometry = await page.evaluate(`(async () => {
    const T = TT;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    T.clearZombies && T.clearZombies();
    T.setViewFirstDbg(false);
    const gx = 0, gz = 14;
    T.player.position.set(gx, T.sampleHeight(gx, gz), gz);
    T.player.rotation.set(0, 0, 0);
    T.marine.rotation.set(0, 0, 0);
    T.setWardrobeItem('cap', { style: 'ballcapBack', camo: 'm81' });
    T.getGearOwned().helmet = false;
    T.applyGearVisibility();
    const d = T.marine.userData.dress;
    if (d && d.hats) {
      for (const k of Object.keys(d.hats)) d.hats[k].visible = (k === 'ballcapBack');
    }
    if (T.marine.userData.balaclava) T.marine.userData.balaclava.visible = true;
    if (T.toggleHolster && !T.isUnarmed()) T.toggleHolster();
    await wait(400);

    const m = T.marine;
    m.updateMatrixWorld(true);
    const marineInv = m.matrixWorld.clone().invert();
    const v = new T.THREE.Vector3();
    let capVertices = 0, maskVertices = 0;
    const capFrontMinZ = {}, maskFrontMaxZ = {};

    const capRoot = d && d.hats && d.hats.ballcapBack;
    if (capRoot) {
      capRoot.traverse((mesh) => {
        if (!mesh.isMesh || !mesh.visible) return;
        const pa = mesh.geometry && mesh.geometry.attributes && mesh.geometry.attributes.position;
        if (!pa) return;
        const mat = marineInv.clone().multiply(mesh.matrixWorld);
        for (let i = 0; i < pa.count; i++) {
          v.fromBufferAttribute(pa, i).applyMatrix4(mat);
          capVertices++;
          if (v.y >= 1.48 && v.y <= 1.56 && Math.abs(v.x) <= 0.08 && v.z >= 0.04) {
            const yKey = (Math.round(v.y * 100) / 100).toFixed(2);
            if (capFrontMinZ[yKey] == null || v.z < capFrontMinZ[yKey]) {
              capFrontMinZ[yKey] = +v.z.toFixed(4);
            }
          }
        }
      });
    }

    const maskRoot = m.userData.balaclava;
    if (maskRoot) {
      maskRoot.traverse((mesh) => {
        if (!mesh.isMesh || !mesh.visible) return;
        const pa = mesh.geometry && mesh.geometry.attributes && mesh.geometry.attributes.position;
        if (!pa) return;
        const mat = marineInv.clone().multiply(mesh.matrixWorld);
        for (let i = 0; i < pa.count; i++) {
          v.fromBufferAttribute(pa, i).applyMatrix4(mat);
          maskVertices++;
          if (v.y >= 1.48 && v.y <= 1.56 && Math.abs(v.x) <= 0.08 && v.z >= 0.04) {
            const yKey = (Math.round(v.y * 100) / 100).toFixed(2);
            if (maskFrontMaxZ[yKey] == null || v.z > maskFrontMaxZ[yKey]) {
              maskFrontMaxZ[yKey] = +v.z.toFixed(4);
            }
          }
        }
      });
    }

    const clearancesMm = {};
    for (const yKey of Object.keys(capFrontMinZ).sort()) {
      if (maskFrontMaxZ[yKey] != null) {
        clearancesMm[yKey] = +((capFrontMinZ[yKey] - maskFrontMaxZ[yKey]) * 1000).toFixed(1);
      }
    }

    return {
      capVisible: capRoot ? capRoot.visible : false,
      ballcapBackRotY: capRoot ? +capRoot.rotation.y.toFixed(3) : null,
      capVertices,
      maskVertices,
      capFrontMinZ,
      maskFrontMaxZ,
      clearancesMm
    };
  })()`, 120000);

  console.log('capGeometry:', JSON.stringify(capGeometry, null, 2));

  // Offsets relative to headG world position (headG is at y ≈ 1.23m on marine, so crown/forehead is +0.28m above headG)
  const capAngles = [
    ['front',    0,    0.30,  0.58, 0, 0.27, 0, 30],
    ['left',    -0.58, 0.30,  0.00, 0, 0.27, 0, 30],
    ['right',    0.58, 0.30,  0.00, 0, 0.27, 0, 30],
    ['back',     0,    0.30, -0.58, 0, 0.27, 0, 30],
    ['top',      0,    0.85,  0.18, 0, 0.27, 0, 30],
    ['gameplay', 0,    1.15, -2.40, 0, 0.10, 0, 50]
  ];

  await page.evaluate(`TT.setWorldTime(0.42)`);
  for (const [angName, ox, oy, oz, tx, ty, tz, fov] of capAngles) {
    await page.evaluate(`(() => {
      const T = TT;
      T.setViewFirstDbg(false);
      T.player.rotation.set(0, 0, 0);
      T.marine.rotation.set(0, 0, 0);
      T.marine.updateMatrixWorld(true);
      const hw = new T.THREE.Vector3();
      T.marine.userData.headG.getWorldPosition(hw);
      T.setShotView({
        x: hw.x + ${ox}, y: hw.y + ${oy}, z: hw.z + ${oz},
        tx: hw.x + ${tx}, ty: hw.y + ${ty}, tz: hw.z + ${tz},
        fov: ${fov}
      });
    })()`);
    await wait(350);
    await page.screenshot(path.join(HERE, `gp19988-cap-noon-${angName}.png`));
  }

  const capLights = [
    ['overcast', 'T.setWorldTime(0.42); if (T.weather) { T.weather.rain = 0.85; }'],
    ['dusk',     'if (T.weather) { T.weather.rain = 0; } T.setWorldTime(0.74);'],
    ['night',    'if (T.weather) { T.weather.rain = 0; } T.setWorldTime(0.05);']
  ];
  for (const [lightName, setupJs] of capLights) {
    await page.evaluate(`(() => {
      const T = TT;
      ${setupJs}
      T.setViewFirstDbg(false);
      T.player.rotation.set(0, 0, 0);
      T.marine.rotation.set(0, 0, 0);
      T.marine.updateMatrixWorld(true);
      const hw = new T.THREE.Vector3();
      T.marine.userData.headG.getWorldPosition(hw);
      T.setShotView({
        x: hw.x + 0.26, y: hw.y + 0.32, z: hw.z + 0.52,
        tx: hw.x, ty: hw.y + 0.27, tz: hw.z,
        fov: 30
      });
    })()`);
    await wait(450);
    await page.screenshot(path.join(HERE, `gp19988-cap-${lightName}-3q.png`));
  }

  const sumPath = path.join(HERE, 'ag169-summary.json');
  if (fs.existsSync(sumPath)) {
    const sum = JSON.parse(fs.readFileSync(sumPath, 'utf8'));
    sum.gp19988.capGeometry = capGeometry;
    fs.writeFileSync(sumPath, JSON.stringify(sum, null, 2));
  }
} finally {
  try { await browser.close(); } catch (_) {}
  try { server.close(); } catch (_) {}
}
process.exit(0);
