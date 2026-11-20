// qa/2026-11-17-AG-341-roster/capture-leaper-live.mjs
// AG-347: Re-shoot LIVE leaper in DWInspect mode='live' (runs index.html update -> applyLeaperMotion paw solve
// onto the floor, unlike statue mode) on landed index.html, saving to review/AG-341/leaper-live/ + sheet.
// Zero game code edits. Must run via crew game-test slot (DW_GAME_TEST_TOKEN).

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
const OUT_DIR = path.join(ROOT, 'review', 'AG-341', 'leaper-live');
fs.mkdirSync(OUT_DIR, { recursive: true });

const { serve } = await import(pathToFileURL(path.join(ROOT, 'tools/serve.mjs')).href);
const { launch } = await import(pathToFileURL(path.join(ROOT, 'tools/cdp.mjs')).href);

function md5File(p) {
  return crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex').slice(0, 8);
}

function pngStats(buf) {
  if (buf.readUInt32BE(12) !== 0x49484452) return null;
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20), type = buf[25], ch = type === 6 ? 4 : 3, stride = w * ch, idat = [];
  for (let o = 8; o < buf.length;) {
    const len = buf.readUInt32BE(o), t = buf.toString('latin1', o + 4, o + 8);
    if (t === 'IDAT') idat.push(buf.subarray(o + 8, o + 8 + len));
    if (t === 'IEND') break;
    o += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat)), img = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1, dst = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? img[dst + x - ch] : 0, b = y ? img[dst - stride + x] : 0, c = x >= ch && y ? img[dst - stride + x - ch] : 0, v = raw[src + x];
      let p = 0;
      if (f === 1) p = a; else if (f === 2) p = b; else if (f === 3) p = (a + b) >> 1;
      else if (f === 4) { const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c); p = pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      img[dst + x] = (v + p) & 255;
    }
  }
  let mx = 0, mn = 255, nz = 0;
  for (let i = 0; i < img.length; i += ch * 4) {
    const m = Math.max(img[i], img[i + 1], img[i + 2]);
    if (m > mx) mx = m;
    if (m < mn) mn = m;
    if (m > 8) nz++;
  }
  return { w, h, mx, mn, nz, sha1: crypto.createHash('sha1').update(img).digest('hex').slice(0, 12) };
}

const sourceMd5 = {
  'index.html': md5File(path.join(ROOT, 'index.html')),
  'game/leaper-motion.js': md5File(path.join(ROOT, 'game/leaper-motion.js')),
  'studio/zombie-concepts.js': md5File(path.join(ROOT, 'studio/zombie-concepts.js')),
  'studio/zombie-humanoids.js': md5File(path.join(ROOT, 'studio/zombie-humanoids.js')),
  'studio/zombie.js': md5File(path.join(ROOT, 'studio/zombie.js')),
  'studio/inspector/subjects.js': md5File(path.join(ROOT, 'studio/inspector/subjects.js')),
};

const SIZE = 1200;
const SHOTS = [
  { id: 'front', light: 'noon', yawDeg: 0, label: 'Noon · Front' },
  { id: '3q', light: 'noon', yawDeg: 40, label: 'Noon · 3/4 Front-Left' },
  { id: 'side', light: 'noon', yawDeg: 90, label: 'Noon · Side (Left)' },
  { id: 'back', light: 'noon', yawDeg: 180, label: 'Noon · Back' },
  { id: 'head', light: 'noon', yawDeg: 22, label: 'Noon · Head Close-Up', isHead: true },
  { id: 'front', light: 'night', yawDeg: 0, label: 'Night · Front' },
  { id: '3q', light: 'night', yawDeg: 40, label: 'Night · 3/4 Front-Left' },
  { id: 'side', light: 'night', yawDeg: 90, label: 'Night · Side (Left)' },
  { id: 'back', light: 'night', yawDeg: 180, label: 'Night · Back' },
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
  task: 'AG-347',
  type: 'leaper',
  mode: 'live',
  at: new Date().toISOString(),
  size: [SIZE, SIZE],
  sourceMd5,
  renderer: null,
  spawn: null,
  shots: [],
  pageErrors: [],
  inspectorErrors: [],
};

try {
  const page = await browser.newPage({ width: SIZE, height: SIZE });
  await page.setViewport(SIZE, SIZE);
  await page.send('Page.bringToFront').catch(() => {});

  const url = `${server.origin}/index.html?inspect&raf=timer`;
  await page.goto(url, { timeout: 240000 });
  const ok = await page.waitFor('(window.DWInspect && window.DWInspect.ready) || !!window.DWInspectError', { timeout: 300000 });
  const initErr = await page.evaluate('window.DWInspectError || null');
  if (!ok || initErr) throw new Error('Inspector failed to boot: ' + (initErr || page.errors[0] || 'timeout'));

  summary.renderer = await page.evaluate(`(() => {
    dispatchEvent(new Event('resize'));
    const c = TT.renderer.domElement, r = c.getBoundingClientRect();
    const dwi = document.getElementById('dwi'); if (dwi) dwi.classList.add('shooting');
    const perf = document.getElementById('perf'); if (perf) perf.style.visibility = 'hidden';
    const cap = document.getElementById('camRigCaption'); if (cap) cap.remove();
    c.setAttribute('data-ag347-canvas', 'true');
    if (!document.getElementById('ag347Style')) {
      const st = document.createElement('style');
      st.id = 'ag347Style';
      st.textContent = 'body *{visibility:hidden!important}canvas[data-ag347-canvas]{visibility:visible!important;position:fixed!important;left:0!important;top:0!important;width:100vw!important;height:100vh!important;z-index:2147483647!important}';
      document.head.append(st);
    }
    return {
      innerWidth, innerHeight,
      canvasW: r.width, canvasH: r.height,
      bufW: c.width, bufH: c.height,
      backend: TT.renderer?.backend?.constructor?.name || 'unknown',
    };
  })()`);
  assert.equal(summary.renderer.backend, 'WebGPUBackend', `Expected WebGPUBackend, got ${summary.renderer.backend}`);

  // Spawn leaper in mode='live' so index.html tick runs applyLeaperMotion paw solve onto the studio floor.
  // Keep marine at default subjects.js live position, step 3 frames (or until paused settled crouch) so paws plant cleanly.
  summary.spawn = await page.evaluate(`(async () => {
    const I = window.DWInspect, T = window.TT, THREE = T.THREE;
    I.backdrop('studio');
    I.light('noon');
    for (const k of ['grid', 'bounds', 'axes', 'stick', 'joints', 'wire', 'labels']) I.overlay(k, false);
    await I.show('zombie.leaper', { mode: 'live', instant: true });
    I.play();
    await I.stepAsync(3);
    I.pause();
    const z = I.zombie.get();
    const root = I._ix.subject?.rig?.() || z?.mesh || null;
    const C = I._ix.stage.center;
    const box = new THREE.Box3();
    const v = new THREE.Vector3();
    let meshCount = 0;
    if (root) {
      root.updateMatrixWorld(true);
      root.traverse((m) => {
        if (!(m.isMesh || m.isSkinnedMesh) || !m.visible || !m.geometry?.attributes?.position) return;
        meshCount++;
        if (m.isSkinnedMesh && m.skeleton) m.skeleton.update();
        const pos = m.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          if (m.isSkinnedMesh && typeof m.getVertexPosition === 'function') m.getVertexPosition(i, v);
          else v.fromBufferAttribute(pos, i);
          v.applyMatrix4(m.matrixWorld);
          if (Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z)) box.expandByPoint(v);
        }
      });
    }
    const u = root?.userData || {};
    const wp = new THREE.Vector3();
    const jointFloorCm = {};
    for (const [k, obj] of [
      ['hips', u.hips],
      ['armL', u.armLG], ['elbowL', u.armLG?.userData?.elbowG],
      ['legL', u.legLG], ['shinL', u.legLG?.userData?.shinG],
    ]) {
      if (obj) { obj.getWorldPosition(wp); jointFloorCm[k] = +((wp.y - C.y) * 100).toFixed(2); }
    }
    return {
      mode: 'live',
      hasZ: !!z,
      hasRoot: !!root,
      alive: !!(z?.alive),
      meshCount,
      leapT: z?.leapT ?? null,
      pos: root ? root.position.toArray().map((x) => +x.toFixed(4)) : null,
      yaw: root ? +root.rotation.y.toFixed(4) : null,
      floorY: +C.y.toFixed(4),
      boxMinY: +box.min.y.toFixed(4),
      boxMaxY: +box.max.y.toFixed(4),
      floorGapCm: +((box.min.y - C.y) * 100).toFixed(2),
      boundsH: +(box.max.y - box.min.y).toFixed(4),
      castShadow: (() => { let cs = 0; root?.traverse((m) => { if (m.isMesh && m.visible && m.castShadow) cs++; }); return cs; })(),
      jointFloorCm,
      variant: u.variant || null,
    };
  })()`);

  console.log('LIVE LEAPER SPAWN:', JSON.stringify(summary.spawn));
  assert.equal(summary.spawn.hasZ, true, 'Expected live zombie object');
  assert.equal(summary.spawn.alive, true, 'Expected alive live leaper');

  let lastImgHash = null;
  for (const shot of SHOTS) {
    const outName = `leaper-live-${shot.light}-${shot.id}.png`;
    const outPath = path.join(OUT_DIR, outName);

    const frameData = await page.evaluate(`(async () => {
      const I = window.DWInspect, T = window.TT, THREE = T.THREE, H = T.inspectHost();
      const root = I._ix.subject?.rig?.();
      const C = I._ix.stage.center;
      const shown = (m) => { for (let n = m; n; n = n.parent) if (n.visible === false) return false; return !m.layers || m.layers.mask !== 0; };

      const collectPts = (headOnly) => {
        const pts = [];
        const box = new THREE.Box3();
        const v = new THREE.Vector3();
        root.updateMatrixWorld(true);
        const headGrp = root.userData?.head || null;
        const underHead = new Set();
        if (headOnly && headGrp) headGrp.traverse((o) => underHead.add(o));
        root.traverse((m) => {
          if (!(m.isMesh || m.isSkinnedMesh) || !m.geometry?.attributes?.position || !shown(m)) return;
          if (m.userData?.dwiIgnore) return;
          if (m.isSkinnedMesh && m.skeleton) m.skeleton.update();
          const pos = m.geometry.attributes.position;
          const si = m.isSkinnedMesh ? m.geometry.attributes.skinIndex : null;
          const sw = m.isSkinnedMesh ? m.geometry.attributes.skinWeight : null;
          const bones = m.isSkinnedMesh ? m.skeleton?.bones : null;
          if (headOnly && headGrp && !m.isSkinnedMesh && !underHead.has(m)) return;
          for (let i = 0; i < pos.count; i++) {
            if (headOnly && headGrp && m.isSkinnedMesh && si && sw && bones) {
              let bi = -1, bw = -1;
              for (let c = 0; c < 4; c++) {
                const w = sw.getComponent(i, c);
                if (w > bw) { bw = w; bi = si.getComponent(i, c); }
              }
              if (!underHead.has(bones[bi])) continue;
            }
            if (m.isSkinnedMesh && typeof m.getVertexPosition === 'function') m.getVertexPosition(i, v);
            else v.fromBufferAttribute(pos, i);
            v.applyMatrix4(m.matrixWorld);
            if (Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z)) {
              box.expandByPoint(v);
              pts.push(v.clone());
            }
          }
        });
        return { box, pts };
      };

      let { box, pts } = collectPts(${!!shot.isHead});
      if (${!!shot.isHead} && (box.max.y - box.min.y < 0.05 || box.max.x - box.min.x < 0.05)) {
        ({ box, pts } = collectPts(false));
      }

      const min = box.min, max = box.max;
      const h = Math.max(0.15, max.y - min.y);
      const cx = (min.x + max.x) * 0.5, cz = (min.z + max.z) * 0.5;
      const targetFill = ${shot.isHead ? 0.62 : 0.85};
      const maxWidthFill = ${shot.isHead ? 0.72 : 0.90};
      const yCamOffset = ${shot.isHead ? 'min.y + h * 0.60' : 'min.y + h * 0.70'};
      let yLook = min.y + h * 0.50;
      const yaw = (root?.rotation?.y || 0) + (${shot.yawDeg} * Math.PI / 180);
      const fov = 34;
      const halfTan = Math.tan((fov * Math.PI / 180) * 0.5);
      let dist = Math.max(h, max.x - min.x, max.z - min.z) / targetFill / (2 * halfTan);

      const projectPts = (camObj) => {
        camObj.updateMatrixWorld(true);
        let pyMin = Infinity, pyMax = -Infinity, pxMin = Infinity, pxMax = -Infinity;
        for (const p of pts) {
          const q = p.clone().project(camObj);
          const px = (q.x + 1) * ${SIZE} * 0.5, py = (1 - q.y) * ${SIZE} * 0.5;
          if (px < pxMin) pxMin = px; if (px > pxMax) pxMax = px;
          if (py < pyMin) pyMin = py; if (py > pyMax) pyMax = py;
        }
        return {
          pyMin, pyMax, pxMin, pxMax,
          hFill: (pyMax - pyMin) / ${SIZE},
          wFill: (pxMax - pxMin) / ${SIZE},
        };
      };

      const testCam = T.camera.clone();
      const solveCam = (d, ty) => {
        const cam = {
          x: cx + Math.sin(yaw) * d,
          y: yCamOffset + (ty - (min.y + h * 0.50)),
          z: cz + Math.cos(yaw) * d,
          tx: cx, ty, tz: cz, fov,
        };
        testCam.fov = fov;
        testCam.aspect = 1;
        testCam.updateProjectionMatrix();
        testCam.position.set(cam.x, cam.y, cam.z);
        testCam.lookAt(cam.tx, cam.ty, cam.tz);
        return { cam, ...projectPts(testCam) };
      };

      let m = solveCam(dist, yLook);
      for (let iter = 0; iter < 6; iter++) {
        const scaleFactor = Math.max(m.hFill / targetFill, m.wFill / maxWidthFill);
        if (Number.isFinite(scaleFactor) && scaleFactor > 0.15) dist *= scaleFactor;
        const midNorm = ((m.pyMin + m.pyMax) * 0.5) / ${SIZE};
        yLook += (0.50 - midNorm) * h * targetFill;
        m = solveCam(dist, yLook);
        if (Math.abs(scaleFactor - 1) < 0.004 && Math.abs(midNorm - 0.50) < 0.005) break;
      }

      I.pause();
      I.light(${JSON.stringify(shot.light)});
      I.camera(m.cam);
      H.loop(false);
      I._ix.stage.frame(0, I._ix.subject.focus());
      T.setShotView(m.cam);
      H.camera.position.set(m.cam.x, m.cam.y, m.cam.z);
      H.camera.lookAt(m.cam.tx, m.cam.ty, m.cam.tz);
      H.camera.fov = m.cam.fov;
      H.camera.aspect = 1;
      H.camera.updateProjectionMatrix();
      H.camera.updateMatrixWorld(true);
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
      await new Promise((r) => setTimeout(r, 60));

      const actual = projectPts(T.camera);
      return {
        cam: m.cam,
        boundsH: +h.toFixed(4),
        floorGapCm: +((min.y - C.y) * 100).toFixed(2),
        fillHeightPct: +(actual.hFill * 100).toFixed(2),
        fillWidthPct: +(actual.wFill * 100).toFixed(2),
        pixelBox: {
          left: Math.round(actual.pxMin), right: Math.round(actual.pxMax),
          top: Math.round(actual.pyMin), bottom: Math.round(actual.pyMax),
        },
      };
    })()`, 180000);

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
          await new Promise((r) => setTimeout(r, 90));
        })()`);
      }
      await page.screenshot(outPath);
      imgInfo = pngStats(fs.readFileSync(outPath));
      hash = md5File(outPath);
      const minMx = shot.light === 'noon' ? 140 : 60;
      if (imgInfo && imgInfo.w === SIZE && imgInfo.h === SIZE && imgInfo.nz >= 500 && imgInfo.mx >= minMx && imgInfo.sha1 !== lastImgHash) break;
    }
    assert.ok(imgInfo && imgInfo.w === SIZE && imgInfo.h === SIZE, `Bad PNG size on ${outName}`);
    assert.ok(imgInfo.mx >= (shot.light === 'noon' ? 140 : 60) && imgInfo.nz >= 500, `Blank/dark shot ${outName}: ${JSON.stringify(imgInfo)}`);
    assert.notEqual(imgInfo.sha1, lastImgHash, `Duplicate consecutive screenshot on ${outName}`);
    lastImgHash = imgInfo.sha1;

    const bytes = fs.statSync(outPath).size;
    assert.ok(bytes > 15000, `Screenshot ${outName} too small (${bytes} bytes)`);
    summary.shots.push({
      file: `review/AG-341/leaper-live/${outName}`,
      light: shot.light,
      view: shot.id,
      label: shot.label,
      bytes,
      md5: hash,
      sha1: imgInfo.sha1,
      mx: imgInfo.mx,
      ...frameData,
    });
    console.log(`  captured ${outName} boundsH=${frameData.boundsH}m floorGap=${frameData.floorGapCm}cm fillH=${frameData.fillHeightPct}% mx=${imgInfo.mx} md5=${hash}`);
  }

  summary.inspectorErrors = await page.evaluate('DWInspect.errors()');
  summary.pageErrors = page.errors.slice();
} finally {
  try { await browser.close(); } catch (_) {}
  try { await server.close(); } catch (_) {}
}

fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
const uniq = new Set(summary.shots.map((s) => s.sha1)).size;
console.log(`DONE AG-347 live leaper: ${summary.shots.length}/9 shots (unique=${uniq}), pageErrors=${summary.pageErrors.length}, inspectorErrors=${summary.inspectorErrors.length}`);
