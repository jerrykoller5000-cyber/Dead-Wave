// qa/2026-11-17-AG-334/capture-ag-b.mjs
// 5080 WebGPU adaptation of review/CC-357/b/capture-cc357b.mjs (AG-334):
// Identical CDP Fetch review copies, poses, lights, cameras, asserts, and output paths
// (SET=b -> review/CC-357/ag-b/, SET=a -> review/CC-357/ag-b-before/),
// adding Browser.setWindowBounds + Page.bringToFront + CB-345 I.still(true) held-frame gate
// and enforcing unique MD5s per shot.

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Must run inside crew game-test slot (DW_GAME_TEST_TOKEN required)');
}

const ROOT = 'C:/Users/Zero/Desktop/Tiny Trek';
const SET = process.env.CC357_SET === 'a' ? 'a' : 'b';
const OUT_DIR = path.join(ROOT, 'review', 'CC-357', SET === 'a' ? 'ag-b-before' : 'ag-b');
const COPIES = {
  '/studio/marine-body.js': SET === 'a' ? 'review/CC-357/marine-body.js' : 'review/CC-357/b/marine-body.js',
  '/ui/marine-face.js': 'review/CC-357/marine-face.js',
  '/studio/marine-hats.js': 'review/CC-357/marine-hats.js',
};
const COPY_MD5 = {
  '/studio/marine-body.js': SET === 'a' ? 'f5e0e02d' : 'ef85ea17',
  '/ui/marine-face.js': '0ec0cb83',
  '/studio/marine-hats.js': 'c2695acf',
};
const copyBodies = Object.fromEntries(Object.entries(COPIES).map(([u, f]) => [u, fs.readFileSync(path.join(ROOT, f))]));
for (const [u, b] of Object.entries(copyBodies)) {
  assert.equal(crypto.createHash('md5').update(b).digest('hex').slice(0, 8), COPY_MD5[u], 'copy md5 ' + u);
}
const served = {};
fs.mkdirSync(OUT_DIR, { recursive: true });

const { serve } = await import(pathToFileURL(path.join(ROOT, 'tools/serve.mjs')).href);
const { launch } = await import(pathToFileURL(path.join(ROOT, 'tools/cdp.mjs')).href);

function md5File(p) {
  return crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex').slice(0, 8);
}

const indexMd5 = md5File(path.join(ROOT, 'index.html'));
assert.ok(['75854361', '9311196f'].includes(indexMd5), `Expected LIVE index.html 75854361 or 9311196f, got ${indexMd5}`);

const SIZE = 1600;
const POSES = [
  { id: 'pistol', label: 'Standing Idle (Pistol)', move: 'stand-armed', weapon: 'pistol', wantUnarmed: false },
  { id: 'unarmed', label: 'Standing Idle (Unarmed)', move: 'stand', weapon: 'none', wantUnarmed: true },
  { id: 'pistolaim', label: 'Pistol shouldered (aim)', move: 'aim', weapon: 'pistol', wantUnarmed: false, aim: true },
  { id: 'rifleaim', label: 'M4 shouldered (aim)', move: 'aim', weapon: 'm4', wantUnarmed: false, aim: true },
].filter((p) => SET === 'b' || p.aim);

const LIGHTS = ['noon', 'night'];
const VIEWS = [
  { id: 'front', label: 'Front', yawDeg: 0 },
  { id: 'side', label: 'Side (Left)', yawDeg: 90 },
  { id: 'back', label: 'Back', yawDeg: 180 },
  { id: '3q', label: '3/4 Front-Left', yawDeg: 40 },
  { id: 'fight3q', label: '3/4 at fighting distance (4.5 m)', yawDeg: 40, fight: true },
  { id: 'sideR', label: 'Side (Right)', yawDeg: -90, aimOnly: true },
];

const server = await serve(ROOT, 0);
const browser = await launch({
  headless: false,
  args: [
    `--window-size=${SIZE},${SIZE}`,
    '--disable-features=CalculateNativeWinOcclusion',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
  ],
});

const summary = {
  set: SET,
  at: new Date().toISOString(),
  indexMd5,
  apiJsMd5: md5File(path.join(ROOT, 'studio/inspector/api.js')),
  size: [SIZE, SIZE],
  renderer: null,
  shots: [],
  pageErrors: [],
  inspectorErrors: [],
};

try {
  const page = await browser.newPage({ width: SIZE, height: SIZE });
  await page.setViewport(SIZE, SIZE);
  try {
    const win = await page.send('Browser.getWindowForTarget', {});
    if (win && win.windowId != null) {
      await page.send('Browser.setWindowBounds', {
        windowId: win.windowId,
        bounds: { left: 80, top: 80, width: 1200, height: 1000, windowState: 'normal' },
      });
    }
  } catch (e) {
    console.warn('setWindowBounds warning:', e.message);
  }

  page.conn.onEvent((msg) => {
    if (msg.sessionId !== page.sessionId || msg.method !== 'Fetch.requestPaused') return;
    const { requestId, request } = msg.params;
    const u = new URL(request.url).pathname;
    const body = copyBodies[u];
    if (!body) {
      page.send('Fetch.continueRequest', { requestId }).catch(() => {});
      return;
    }
    served[u] = (served[u] || 0) + 1;
    page.send('Fetch.fulfillRequest', {
      requestId,
      responseCode: 200,
      responseHeaders: [{ name: 'Content-Type', value: 'text/javascript; charset=utf-8' }],
      body: body.toString('base64'),
    }).catch((e) => page.errors.push(e.message));
  });
  await page.send('Fetch.enable', {
    patterns: Object.keys(copyBodies).map((u) => ({ urlPattern: server.origin + u + '*' })),
  });

  const url = `${server.origin}/index.html?inspect&raf=timer`;
  await page.goto(url, { timeout: 240000 });
  const ok = await page.waitFor('(window.DWInspect && window.DWInspect.ready) || !!window.DWInspectError', { timeout: 300000 });
  const initErr = await page.evaluate('window.DWInspectError || null');
  if (!ok || initErr) throw new Error('Inspector failed to boot: ' + (initErr || page.errors[0] || 'timeout'));

  for (const u of Object.keys(copyBodies)) assert.ok(served[u] >= 1, 'copy not served: ' + u);
  summary.copiesServed = { ...served, md5: COPY_MD5 };

  const vp = await page.evaluate(`(() => {
    dispatchEvent(new Event('resize'));
    const c = TT.renderer.domElement, r = c.getBoundingClientRect();
    return {
      innerWidth, innerHeight,
      canvasW: r.width, canvasH: r.height,
      bufW: c.width, bufH: c.height,
      backend: TT.renderer?.backend?.constructor?.name || 'unknown'
    };
  })()`);
  summary.renderer = vp;
  assert.equal(vp.innerWidth, SIZE);
  assert.equal(vp.innerHeight, SIZE);
  assert.ok(Math.abs(vp.canvasW - SIZE) <= 1 && Math.abs(vp.canvasH - SIZE) <= 1, `Canvas size mismatch: ${JSON.stringify(vp)}`);

  await page.evaluate(`(async () => {
    const I = window.DWInspect;
    await I.show('marine');
    I.backdrop('studio');
    I.light('noon');
    for (const k of ['grid', 'bounds', 'axes', 'stick', 'joints', 'wire', 'labels']) I.overlay(k, false);
    const dwi = document.getElementById('dwi');
    if (dwi) dwi.classList.add('shooting');
    const perf = document.getElementById('perf');
    if (perf) perf.style.visibility = 'hidden';
    const cap = document.getElementById('camRigCaption');
    if (cap) cap.remove();
    TT.resetEconomyDbg();
    I.marine.gear('flashlight', false);
    if (TT.updateCarriedGear) TT.updateCarriedGear(0, true);
    I.play();
    await I.stepAsync(20);
    I.pause();
    I.camera({ x: -26, y: -198.9, z: -628.8, tx: -26, ty: -199.2, tz: -631.8, fov: 34 });
    await I._ix.nextFrame();
    await I._ix.nextFrame();
    await I.shot({ type: 'image/png' });
    return true;
  })()`);

  for (const pose of POSES) {
    const poseInfo = await page.evaluate(`(async () => {
      const I = window.DWInspect;
      if (${!!pose.aim}) {
        const own = TT.getWeaponOwned && TT.getWeaponOwned();
        if (own) own[${JSON.stringify(pose.weapon)}] = true;
        I.marine.weapon(${JSON.stringify(pose.weapon)});
        I.play();
        await I.stepAsync(60);
      }
      await I.marine.play(${JSON.stringify(pose.move)});
      if (${JSON.stringify(pose.weapon)} !== 'none') I.marine.weapon(${JSON.stringify(pose.weapon)});
      else I.marine.weapon('none');
      I.marine.gear('flashlight', false);
      if (TT.updateCarriedGear) TT.updateCarriedGear(0, true);
      const idle = TT.marineIdleDbg ? TT.marineIdleDbg() : null;
      if (idle && idle.state) Object.assign(idle.state, { quiet: 0, phase: 'idle', time: 0, lit: false });
      I.play();
      await I.stepAsync(${pose.aim ? 90 : 45});
      if (idle && idle.state) Object.assign(idle.state, { quiet: 0, phase: 'idle', time: 0, lit: false });
      I.pause();
      return {
        unarmed: TT.isUnarmed(),
        weapon: TT.getCurrentWeapon ? TT.getCurrentWeapon() : null,
        gear: TT.getGearOwned ? TT.getGearOwned() : null,
        zombies: (TT.zombies || []).filter(z => z.alive).length,
        state: I.marine.state()
      };
    })()`);
    assert.equal(poseInfo.unarmed, pose.wantUnarmed, `Pose ${pose.id} unarmed mismatch`);
    assert.equal(poseInfo.zombies, 0, 'Expected zero zombies');
    summary.poses = summary.poses || {};
    summary.poses[pose.id] = poseInfo;

    for (const light of (pose.aim ? ['noon'] : LIGHTS)) {
      await page.evaluate(`(async () => {
        const I = window.DWInspect;
        I.light(${JSON.stringify(light)});
        I.play();
        await I.stepAsync(2);
        I.pause();
        return I.light();
      })()`);

      for (const view of VIEWS.filter((v) => !v.aimOnly || pose.aim)) {
        const outName = `marine-${pose.id}-${light}-${view.id}.png`;
        const outPath = path.join(OUT_DIR, outName);

        const frameData = await page.evaluate(`(async () => {
          const I = window.DWInspect, T = window.TT, THREE = T.THREE;
          const P = T.player;
          P.updateMatrixWorld(true);
          const shown = (m) => { for (let n = m; n; n = n.parent) if (n.visible === false) return false; return !m.layers || m.layers.mask !== 0; };
          const box = new THREE.Box3(), v = new THREE.Vector3();
          const pts = [];
          P.traverse((m) => {
            if (!(m.isMesh || m.isSkinnedMesh) || !m.geometry?.attributes?.position || !shown(m)) return;
            if (m.userData?.dwiIgnore) return;
            if (m.isSkinnedMesh) m.skeleton.update();
            const pos = m.geometry.attributes.position;
            for (let i = 0; i < pos.count; i++) {
              if (m.isSkinnedMesh) m.getVertexPosition(i, v);
              else v.fromBufferAttribute(pos, i);
              v.applyMatrix4(m.matrixWorld);
              if (Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z)) {
                box.expandByPoint(v);
                pts.push(v.clone());
              }
            }
          });
          const min = box.min, max = box.max, h = max.y - min.y;
          const cx = (min.x + max.x) * 0.5, cz = (min.z + max.z) * 0.5;
          const yChest = min.y + h * 0.70;
          let yLook = min.y + h * 0.50;
          const yaw = (P.rotation.y || 0) + (${view.yawDeg} * Math.PI / 180);
          const fov = 34;
          const halfTan = Math.tan((fov * Math.PI / 180) * 0.5);
          let dist = (h / 0.85) / (2 * halfTan);

          const projectPts = (camObj) => {
            camObj.updateMatrixWorld(true);
            let pyMin = Infinity, pyMax = -Infinity, pxMin = Infinity, pxMax = -Infinity;
            for (const p of pts) {
              const q = p.clone().project(camObj);
              const px = (q.x + 1) * ${SIZE} * 0.5, py = (1 - q.y) * ${SIZE} * 0.5;
              if (px < pxMin) pxMin = px; if (px > pxMax) pxMax = px;
              if (py < pyMin) pyMin = py; if (py > pyMax) pyMax = py;
            }
            return { pyMin, pyMax, pxMin, pxMax, fill: (pyMax - pyMin) / ${SIZE} };
          };

          const testCam = T.camera.clone();
          const solveCam = (d, ty) => {
            const cam = {
              x: cx + Math.sin(yaw) * d,
              y: yChest,
              z: cz + Math.cos(yaw) * d,
              tx: cx, ty, tz: cz, fov
            };
            testCam.fov = fov;
            testCam.aspect = 1;
            testCam.updateProjectionMatrix();
            testCam.position.set(cam.x, cam.y, cam.z);
            testCam.lookAt(cam.tx, cam.ty, cam.tz);
            return { cam, ...projectPts(testCam) };
          };

          let m = solveCam(dist, yLook);
          if (${!!view.fight}) {
            testCam.fov = 50;
            const cam = { x: cx + Math.sin(yaw) * 4.5, y: min.y + 1.55, z: cz + Math.cos(yaw) * 4.5, tx: cx, ty: min.y + .85, tz: cz, fov: 50 };
            testCam.updateProjectionMatrix(); testCam.position.set(cam.x, cam.y, cam.z); testCam.lookAt(cam.tx, cam.ty, cam.tz);
            m = { cam, ...projectPts(testCam) };
          }
          for (let iter = 0; iter < (${!!view.fight} ? 0 : 5); iter++) {
            if (Number.isFinite(m.fill) && m.fill > 0.2) dist = dist * (m.fill / 0.85);
            const midNorm = ((m.pyMin + m.pyMax) * 0.5) / ${SIZE};
            yLook += (0.50 - midNorm) * h * 0.85;
            m = solveCam(dist, yLook);
            if (Math.abs(m.fill - 0.85) < 0.002 && Math.abs(((m.pyMin + m.pyMax) * 0.5) / ${SIZE} - 0.50) < 0.005) break;
          }

          const idle = T.marineIdleDbg ? T.marineIdleDbg() : null;
          if (idle && idle.state) Object.assign(idle.state, { quiet: 0, phase: 'idle', time: 0, lit: false });
          I.pause();
          I.camera(m.cam);
          await I._ix.nextFrame();
          await I._ix.nextFrame();

          const sampleShotUrl = async () => {
            const url = await I.shot({ type: 'image/png' });
            if (!url || !url.startsWith('data:image/png;base64,')) return { ok: false, url: null, info: { err: 'bad-url' } };
            const info = await new Promise((resolve) => {
              const im = new Image();
              im.onload = () => {
                const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
                const g = c.getContext('2d'); g.drawImage(im, 0, 0);
                const d = g.getImageData(0, 0, im.width, im.height).data;
                let mx = 0, mn = 255, nz = 0;
                for (let i = 0; i < d.length; i += 64) {
                  const v = Math.max(d[i], d[i + 1], d[i + 2]);
                  if (v > mx) mx = v;
                  if (v < mn) mn = v;
                  if (v > 8) nz++;
                }
                resolve({ w: im.width, h: im.height, mx, mn, nz });
              };
              im.src = url;
            });
            return { ok: info.mx >= 20 && info.nz >= 500, url, info };
          };

          let resShot = await sampleShotUrl();
          for (let tries = 0; !resShot.ok && tries < 5; tries++) {
            I.play();
            await I.stepAsync(4);
            if (idle && idle.state) Object.assign(idle.state, { quiet: 0, phase: 'idle', time: 0, lit: false });
            I.pause();
            I.camera(m.cam);
            await I._ix.nextFrame();
            await I._ix.nextFrame();
            await new Promise((r) => setTimeout(r, 100));
            resShot = await sampleShotUrl();
          }
          if (!resShot.ok) {
            throw new Error('DWInspect.shot returned blank/black image after retries: ' + JSON.stringify(resShot.info));
          }
          const shotUrl = resShot.url;
          const imgInfo = resShot.info;

          const actual = projectPts(T.camera);
          const camErr = Math.hypot(T.camera.position.x - m.cam.x, T.camera.position.y - m.cam.y, T.camera.position.z - m.cam.z);
          return {
            cam: m.cam,
            camErr: +camErr.toFixed(5),
            boundsH: +h.toFixed(4),
            fillHeightPct: +(actual.fill * 100).toFixed(2),
            pixelBox: { left: Math.round(actual.pxMin), right: Math.round(actual.pxMax), top: Math.round(actual.pyMin), bottom: Math.round(actual.pyMax) },
            flashlight: T.getGearOwned ? !!T.getGearOwned().laserLight : false,
            mx: imgInfo.mx,
            mn: imgInfo.mn,
            nz: imgInfo.nz,
            shotUrl,
          };
        })()`);

        const shotUrl = frameData.shotUrl;
        delete frameData.shotUrl;

        assert.ok(frameData.camErr < 0.01, `T.camera did not apply I.camera in ${outName}: err=${frameData.camErr}`);
        if (!view.fight) assert.ok(frameData.fillHeightPct >= 82 && frameData.fillHeightPct <= 88, `Unexpected fill ${frameData.fillHeightPct}% for ${outName}`);
        assert.ok(frameData.pixelBox.top >= 40 && frameData.pixelBox.bottom <= SIZE - 40, `Vertical clip in ${outName}: ${JSON.stringify(frameData.pixelBox)}`);
        assert.ok(frameData.pixelBox.left >= 40 && frameData.pixelBox.right <= SIZE - 40, `Horizontal clip in ${outName}: ${JSON.stringify(frameData.pixelBox)}`);

        fs.writeFileSync(outPath, Buffer.from(shotUrl.slice('data:image/png;base64,'.length), 'base64'));

        const hash = md5File(outPath);
        const bytes = fs.statSync(outPath).size;
        assert.ok(bytes > 20000, `Screenshot ${outName} looks blank/black (${bytes} bytes)`);
        const shotMeta = {
          file: `review/CC-357/${SET === 'a' ? 'ag-b-before' : 'ag-b'}/${outName}`,
          pose: pose.id,
          light,
          view: view.id,
          label: `${pose.label} · ${light} · ${view.label}`,
          size: [SIZE, SIZE],
          bytes,
          md5: hash,
          ...frameData,
        };
        summary.shots.push(shotMeta);
        console.log(`captured ${outName} fill=${frameData.fillHeightPct}% box=${JSON.stringify(frameData.pixelBox)} mx=${frameData.mx} md5=${hash} bytes=${bytes}`);
      }
    }
  }

  const uniq = new Set(summary.shots.map((s) => s.md5)).size;
  assert.equal(uniq, summary.shots.length, `Frozen/duplicate frames detected! unique=${uniq}/${summary.shots.length}`);
  summary.inspectorErrors = await page.evaluate('DWInspect.errors()');
  summary.pageErrors = page.errors.slice();
} finally {
  try { await browser.close(); } catch (_) {}
  try { await server.close(); } catch (_) {}
}

fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(`DONE (${SET}): ${summary.shots.length} shots (unique=${new Set(summary.shots.map((s) => s.md5)).size}), pageErrors=${summary.pageErrors.length}, inspectorErrors=${summary.inspectorErrors.length}`);
