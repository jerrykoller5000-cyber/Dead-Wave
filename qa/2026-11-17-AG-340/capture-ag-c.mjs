// qa/2026-11-17-AG-340/capture-ag-c.mjs
// AG-340: 5080 WebGPU capture for CC-357 c (whole J164 package) vs LIVE, adapted from
// review/CC-357/c/capture-cc357c.mjs with identical copies, MD5 checks, poses, lights,
// cameras, and all-gear-off assertions. Uses cb349 WebGPU swapchain render + Page.screenshot.

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import zlib from 'node:zlib';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Must run inside crew game-test slot (DW_GAME_TEST_TOKEN required)');
}

const ROOT = 'C:/Users/Zero/Desktop/Tiny Trek';
const SET = process.env.CC357_SET === 'live' ? 'live' : 'c';
const OUT_NAME = SET === 'live' ? 'ag-c-live' : 'ag-c';
const OUT_DIR = path.join(ROOT, 'review', 'CC-357', OUT_NAME);
const COPIES = SET === 'live' ? {} : {
  '/studio/marine-body.js': 'review/CC-357/c/marine-body.js',
  '/ui/marine-face.js': 'review/CC-357/marine-face.js',
  '/studio/marine-hats.js': 'review/CC-357/marine-hats.js',
  '/ui/marine-kit-fit.js': 'review/GP-20151/band-ui-v1.source.js',
  '/index.html': 'review/GP-20151/band-index-v1.source.html',
};
const COPY_MD5 = SET === 'live' ? {} : {
  '/studio/marine-body.js': '0d761307',
  '/ui/marine-face.js': '0ec0cb83',
  '/studio/marine-hats.js': 'c2695acf',
  '/ui/marine-kit-fit.js': '55c01e28',
  '/index.html': '813e6f4f',
};
// the bands' copies are appends over these live files: a moved base needs a rebase first (ask Claude 3)
const BASE_MD5 = { 'index.html': '9311196f', 'ui/marine-kit-fit.js': 'c8f55495' };
const GEAR_OFF = `(() => { const g = TT.getGearOwned && TT.getGearOwned(); if (g) for (const k of Object.keys(g)) g[k] = false; })();`;
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

function pngStats(buf) {
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20), type = buf[25], ch = type === 6 ? 4 : 3, stride = w * ch, idat = [];
  for (let o = 8; o < buf.length;) { const len = buf.readUInt32BE(o), t = buf.toString('latin1', o + 4, o + 8); if (t === 'IDAT') idat.push(buf.subarray(o + 8, o + 8 + len)); if (t === 'IEND') break; o += 12 + len; }
  const raw = zlib.inflateSync(Buffer.concat(idat)), img = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) { const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1, dst = y * stride; for (let x = 0; x < stride; x++) { const a = x >= ch ? img[dst + x - ch] : 0, b = y ? img[dst - stride + x] : 0, c = x >= ch && y ? img[dst - stride + x - ch] : 0, v = raw[src + x]; let p = 0; if (f === 1) p = a; else if (f === 2) p = b; else if (f === 3) p = (a + b) >> 1; else if (f === 4) { const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c); p = pa <= pb && pa <= pc ? a : pb <= pc ? b : c; } img[dst + x] = (v + p) & 255; } }
  let mx = 0, mn = 255, nz = 0;
  for (let i = 0; i < img.length; i += ch * 4) { const m = Math.max(img[i], img[i + 1], img[i + 2]); if (m > mx) mx = m; if (m < mn) mn = m; if (m > 8) nz++; }
  return { w, h, mx, mn, nz, p0: [img[0], img[1], img[2]] };
}

const indexMd5 = md5File(path.join(ROOT, 'index.html'));
for (const [f, m] of Object.entries(BASE_MD5)) assert.equal(md5File(path.join(ROOT, f)), m, `LIVE ${f} moved since the band copies (${m}): ask Claude 3 for a rebase`);

const SIZE = 1600;
const POSES = [
  { id: 'pistol', label: 'Standing Idle (Pistol)', move: 'stand-armed', weapon: 'pistol', wantUnarmed: false },
  { id: 'unarmed', label: 'Standing Idle (Unarmed)', move: 'stand', weapon: 'none', wantUnarmed: true },
  { id: 'pistolaim', label: 'Pistol shouldered (aim)', move: 'aim', weapon: 'pistol', wantUnarmed: false, aim: true },
  { id: 'rifleaim', label: 'M4 shouldered (aim)', move: 'aim', weapon: 'm4', wantUnarmed: false, aim: true },
];

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
  await page.send('Page.bringToFront').catch(() => {});

  if (Object.keys(copyBodies).length > 0) {
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
        responseHeaders: [{ name: 'Content-Type', value: u.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/javascript; charset=utf-8' }],
        body: body.toString('base64'),
      }).catch((e) => page.errors.push(e.message));
    });
    await page.send('Fetch.enable', {
      patterns: Object.keys(copyBodies).map((u) => ({ urlPattern: server.origin + u + '*' })),
    });
  }

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
    const H = TT.inspectHost();
    const canvas = H.renderer.domElement;
    canvas.setAttribute('data-agc-canvas', 'true');
    const st = document.createElement('style');
    st.textContent = 'body *{visibility:hidden!important}canvas[data-agc-canvas]{visibility:visible!important;position:fixed!important;left:0!important;top:0!important;width:100vw!important;height:100vh!important;z-index:2147483647!important}';
    document.head.append(st);
    TT.resetEconomyDbg();
    ${GEAR_OFF}
    I.marine.gear('flashlight', false);
    if (TT.updateCarriedGear) TT.updateCarriedGear(0, true);
    H.loop(true);
    I.play();
    await I.stepAsync(20);
    I.pause();
    I.camera({ x: -26, y: -198.9, z: -628.8, tx: -26, ty: -199.2, tz: -631.8, fov: 34 });
    await I._ix.nextFrame();
    await I._ix.nextFrame();
    return true;
  })()`);

  let lastImgHash = null;
  for (const pose of POSES) {
    const poseInfo = await page.evaluate(`(async () => {
      const I = window.DWInspect, H = TT.inspectHost();
      H.loop(true);
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
      ${GEAR_OFF}
      I.marine.gear('flashlight', false);
      if (TT.updateCarriedGear) TT.updateCarriedGear(0, true);
      const idle = TT.marineIdleDbg ? TT.marineIdleDbg() : null;
      if (idle && idle.state) Object.assign(idle.state, { quiet: 0, phase: 'idle', time: 0, lit: false });
      I.play();
      await I.stepAsync(${pose.aim ? 90 : 45});
      if (idle && idle.state) Object.assign(idle.state, { quiet: 0, phase: 'idle', time: 0, lit: false });
      I.pause();
      const rig = TT.updateCarriedGear ? TT.updateCarriedGear(0, false) : null;
      return {
        unarmed: TT.isUnarmed(),
        weapon: TT.getCurrentWeapon ? TT.getCurrentWeapon() : null,
        gear: TT.getGearOwned ? TT.getGearOwned() : null,
        zombies: (TT.zombies || []).filter(z => z.alive).length,
        state: I.marine.state(),
        carry: rig ? {
          magsVis: rig.mags?.visible, magsCnt: rig.mags?.count,
          hipVis: rig.hip?.g?.visible, hipGunVis: rig.hip?.gun?.visible,
          idleState: idle?.state ? { phase: idle.state.phase, quiet: +idle.state.quiet.toFixed(2), time: +idle.state.time.toFixed(2) } : null
        } : null
      };
    })()`);
    assert.equal(poseInfo.unarmed, pose.wantUnarmed, `Pose ${pose.id} unarmed mismatch`);
    assert.equal(poseInfo.zombies, 0, 'Expected zero zombies');
    assert.ok(!poseInfo.gear || Object.values(poseInfo.gear).every((v) => !v), `Pose ${pose.id}: loadout not all off: ${JSON.stringify(poseInfo.gear)}`);
    summary.poses = summary.poses || {};
    summary.poses[pose.id] = poseInfo;

    for (const light of (pose.aim ? ['noon'] : LIGHTS)) {
      await page.evaluate(`(async () => {
        const I = window.DWInspect, H = TT.inspectHost();
        H.loop(true);
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
          const H = T.inspectHost();
          I.camera(m.cam);
          H.loop(false);
          I._ix.stage.frame(0, I._ix.subject.focus());
          T.setShotView(m.cam);
          H.camera.position.set(m.cam.x, m.cam.y, m.cam.z);
          H.camera.lookAt(m.cam.tx, m.cam.ty, m.cam.tz);
          H.camera.fov = m.cam.fov; H.camera.aspect = 1; H.camera.updateProjectionMatrix(); H.camera.updateMatrixWorld(true);
          H.skyDome.position.copy(H.camera.position);
          H.scene.updateMatrixWorld(true);
          H.renderer.setRenderTarget(null);
          if (H.renderer.setMRT) H.renderer.setMRT(null);
          await H.renderer.compileAsync(H.scene, H.camera);
          for (let k = 0; k < 2; k++) {
            await new Promise(requestAnimationFrame);
            const nf = H.renderer._nodes?.nodeFrame;
            if (nf?.update) { nf.update(); H.renderer.info.frame = nf.frameId; }
            H.renderer.render(H.scene, H.camera);
            const q = H.renderer.backend?.device?.queue;
            if (q) await q.onSubmittedWorkDone();
          }
          await new Promise((r) => setTimeout(r, 80));

          const actual = projectPts(T.camera);
          const camErr = Math.hypot(T.camera.position.x - m.cam.x, T.camera.position.y - m.cam.y, T.camera.position.z - m.cam.z);
          return {
            cam: m.cam,
            camErr: +camErr.toFixed(5),
            boundsH: +h.toFixed(4),
            fillHeightPct: +(actual.fill * 100).toFixed(2),
            pixelBox: { left: Math.round(actual.pxMin), right: Math.round(actual.pxMax), top: Math.round(actual.pyMin), bottom: Math.round(actual.pyMax) },
            flashlight: T.getGearOwned ? !!T.getGearOwned().laserLight : false,
          };
        })()`);

        assert.ok(frameData.camErr < 0.01, `T.camera did not apply I.camera in ${outName}: err=${frameData.camErr}`);
        if (!view.fight) assert.ok(frameData.fillHeightPct >= 82 && frameData.fillHeightPct <= 88, `Unexpected fill ${frameData.fillHeightPct}% for ${outName}`);
        assert.ok(frameData.pixelBox.top >= 40 && frameData.pixelBox.bottom <= SIZE - 40, `Vertical clip in ${outName}: ${JSON.stringify(frameData.pixelBox)}`);
        assert.ok(frameData.pixelBox.left >= 40 && frameData.pixelBox.right <= SIZE - 40, `Horizontal clip in ${outName}: ${JSON.stringify(frameData.pixelBox)}`);

        let imgInfo = null, hash = null;
        for (let tries = 0; tries < 3; tries++) {
          if (tries > 0) {
            await page.evaluate(`(async () => {
              const H = TT.inspectHost();
              for (let k = 0; k < 2; k++) {
                await new Promise(requestAnimationFrame);
                const nf = H.renderer._nodes?.nodeFrame;
                if (nf?.update) { nf.update(); H.renderer.info.frame = nf.frameId; }
                H.renderer.render(H.scene, H.camera);
                const q = H.renderer.backend?.device?.queue;
                if (q) await q.onSubmittedWorkDone();
              }
              await new Promise((r) => setTimeout(r, 100));
            })()`);
          }
          await page.screenshot(outPath);
          imgInfo = pngStats(fs.readFileSync(outPath));
          hash = md5File(outPath);
          const minMx = light === 'noon' ? 160 : 80;
          if (imgInfo.w === SIZE && imgInfo.h === SIZE && imgInfo.nz >= 500 && imgInfo.mx >= minMx && hash !== lastImgHash) break;
        }
        assert.equal(imgInfo.w, SIZE);
        assert.equal(imgInfo.h, SIZE);
        assert.ok(imgInfo.mx >= (light === 'noon' ? 160 : 80) && imgInfo.nz >= 500, `Blank/stale shot ${outName}: ${JSON.stringify(imgInfo)}`);
        assert.notEqual(hash, lastImgHash, `Duplicate consecutive frame on ${outName}`);
        lastImgHash = hash;

        const bytes = fs.statSync(outPath).size;
        assert.ok(bytes > 20000, `Screenshot ${outName} looks blank/black (${bytes} bytes)`);
        const shotMeta = {
          file: `review/CC-357/${OUT_NAME}/${outName}`,
          pose: pose.id,
          light,
          view: view.id,
          label: `${pose.label} · ${light} · ${view.label}`,
          size: [SIZE, SIZE],
          bytes,
          md5: hash,
          ...frameData,
          mx: imgInfo.mx,
          mn: imgInfo.mn,
          nz: imgInfo.nz,
          p0: imgInfo.p0,
        };
        summary.shots.push(shotMeta);
        console.log(`captured ${outName} fill=${frameData.fillHeightPct}% box=${JSON.stringify(frameData.pixelBox)} mx=${imgInfo.mx} p0=${JSON.stringify(imgInfo.p0)} md5=${hash} bytes=${bytes}`);
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
