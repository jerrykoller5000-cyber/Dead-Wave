// qa/2026-11-17-AG-341-roster/capture-ag341-addon.mjs
// AG-343 (AG-341 add-on + add-on 2):
//  1) Capture LIVE leaper + drowned (completing all 14 ZOMBIE_TYPES in review/AG-341/)
//  2) Re-capture LIVE screamer framed strictly on its body (excluding screamer-sonic-shield / screamer-black-vapor from bounds)
//  3) Merge cleanly into review/AG-341/summary.json (preserving all 11 other types intact) and include game/screamer-appearance.js md5.

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
const OUT_DIR = path.join(ROOT, 'review', 'AG-341');
const SUMMARY_PATH = path.join(OUT_DIR, 'summary.json');
fs.mkdirSync(OUT_DIR, { recursive: true });

const { serve } = await import(pathToFileURL(path.join(ROOT, 'tools/serve.mjs')).href);
const { launch } = await import(pathToFileURL(path.join(ROOT, 'tools/cdp.mjs')).href);

function md5File(p) {
  return crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex').slice(0, 8);
}

function listFiles(dir, pred) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isFile() && pred(name)) out.push(full);
  }
  return out.sort();
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
  'world/cave-guardian.js': md5File(path.join(ROOT, 'world/cave-guardian.js')),
  'game/screamer-appearance.js': md5File(path.join(ROOT, 'game/screamer-appearance.js')),
};
for (const f of listFiles(path.join(ROOT, 'studio'), (n) => /^zombie.*\.js$/i.test(n))) {
  sourceMd5['studio/' + path.basename(f)] = md5File(f);
}
for (const f of listFiles(path.join(ROOT, 'game'), (n) => /(zombie|motion).*\.js$/i.test(n) && !n.includes('.test.'))) {
  sourceMd5['game/' + path.basename(f)] = md5File(f);
}
for (const f of listFiles(path.join(ROOT, 'studio/inspector'), (n) => /\.js$/i.test(n))) {
  sourceMd5['studio/inspector/' + path.basename(f)] = md5File(f);
}

const SIZE = 1200;
const TYPES = ['leaper', 'drowned', 'screamer'];
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

const prevSummary = fs.existsSync(SUMMARY_PATH)
  ? JSON.parse(fs.readFileSync(SUMMARY_PATH, 'utf8'))
  : { task: 'AG-341', size: [SIZE, SIZE], sourceMd5: {}, types: {}, shots: [], pageErrors: [], inspectorErrors: [] };

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

const newTypes = {};
const newShots = [];
let rendererInfo = null;
let inspErrors = [];
let pgErrors = [];

try {
  const page = await browser.newPage({ width: SIZE, height: SIZE });
  await page.setViewport(SIZE, SIZE);
  await page.send('Page.bringToFront').catch(() => {});

  const url = `${server.origin}/index.html?inspect&raf=timer`;
  await page.goto(url, { timeout: 240000 });
  const ok = await page.waitFor('(window.DWInspect && window.DWInspect.ready) || !!window.DWInspectError', { timeout: 300000 });
  const initErr = await page.evaluate('window.DWInspectError || null');
  if (!ok || initErr) throw new Error('Inspector failed to boot: ' + (initErr || page.errors[0] || 'timeout'));

  rendererInfo = await page.evaluate(`(() => {
    dispatchEvent(new Event('resize'));
    const c = TT.renderer.domElement, r = c.getBoundingClientRect();
    const dwi = document.getElementById('dwi'); if (dwi) dwi.classList.add('shooting');
    const perf = document.getElementById('perf'); if (perf) perf.style.visibility = 'hidden';
    const cap = document.getElementById('camRigCaption'); if (cap) cap.remove();
    c.setAttribute('data-ag341-canvas', 'true');
    if (!document.getElementById('ag341Style')) {
      const st = document.createElement('style');
      st.id = 'ag341Style';
      st.textContent = 'body *{visibility:hidden!important}canvas[data-ag341-canvas]{visibility:visible!important;position:fixed!important;left:0!important;top:0!important;width:100vw!important;height:100vh!important;z-index:2147483647!important}';
      document.head.append(st);
    }
    return {
      innerWidth, innerHeight,
      canvasW: r.width, canvasH: r.height,
      bufW: c.width, bufH: c.height,
      backend: TT.renderer?.backend?.constructor?.name || 'unknown',
    };
  })()`);
  assert.equal(rendererInfo.backend, 'WebGPUBackend', `Expected WebGPUBackend, got ${rendererInfo.backend}`);

  let lastImgHash = null;

  for (const typeKey of TYPES) {
    const typeDir = path.join(OUT_DIR, typeKey);
    fs.mkdirSync(typeDir, { recursive: true });

    const spawnInfo = await page.evaluate(`(async () => {
      const I = window.DWInspect, T = window.TT, H = T.inspectHost();
      H.loop(true);
      let buildError = null;
      try {
        await I.show('zombie.' + ${JSON.stringify(typeKey)}, { mode: 'statue', instant: true });
      } catch (e) {
        buildError = String(e && e.message || e);
      }
      I.backdrop('studio');
      I.light('noon');
      for (const k of ['grid', 'bounds', 'axes', 'stick', 'joints', 'wire', 'labels']) I.overlay(k, false);
      I.play();
      await I.stepAsync(2);
      I.pause();
      const root = I._ix.subject?.rig?.() || null;
      return {
        typeKey: ${JSON.stringify(typeKey)},
        mode: 'statue',
        buildError,
        settledStand: true,
        hasRoot: !!root,
        bodyFramed: ${typeKey === 'screamer'},
        meshCount: root ? (() => { let n = 0; root.traverse((o) => { if (o.isMesh && o.visible) n++; }); return n; })() : 0,
        variant: root?.userData?.variant || null,
        pos: root ? root.position.toArray().map((x) => +x.toFixed(3)) : null,
      };
    })()`);

    newTypes[typeKey] = spawnInfo;
    console.log(`=== ${typeKey} === mode=${spawnInfo.mode} meshes=${spawnInfo.meshCount} bodyFramed=${spawnInfo.bodyFramed} err=${spawnInfo.buildError}`);

    for (const shot of SHOTS) {
      const outName = `${typeKey}-${shot.light}-${shot.id}.png`;
      const outPath = path.join(typeDir, outName);

      const frameData = await page.evaluate(`(async () => {
        const I = window.DWInspect, T = window.TT, THREE = T.THREE, H = T.inspectHost();
        const root = I._ix.subject?.rig?.();
        const C = I._ix.stage.center;
        const shown = (m) => { for (let n = m; n; n = n.parent) if (n.visible === false) return false; return !m.layers || m.layers.mask !== 0; };

        const collectPts = (headOnly) => {
          const pts = [];
          const box = new THREE.Box3();
          const v = new THREE.Vector3();
          if (!root) {
            box.setFromCenterAndSize(new THREE.Vector3(C.x, C.y + 0.9, C.z), new THREE.Vector3(1, 1.8, 1));
            pts.push(box.min.clone(), box.max.clone());
            return { box, pts };
          }
          root.updateMatrixWorld(true);
          const headGrp = root.userData?.bossRig?.userData?.rig?.head || root.userData?.head || null;
          const underHead = new Set();
          if (headOnly && headGrp) headGrp.traverse((o) => underHead.add(o));

          root.traverse((m) => {
            if (!(m.isMesh || m.isSkinnedMesh) || !m.geometry?.attributes?.position || !shown(m)) return;
            if (m.userData?.dwiIgnore) return;
            // AG-341 add-on 2: exclude screamer VFX hull/smoke rings so the camera frames her actual body
            if (m.name === 'screamer-sonic-shield' || m.name === 'screamer-black-vapor' || m.material?.transparent) return;
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
          if (!pts.length) {
            box.setFromCenterAndSize(new THREE.Vector3(C.x, C.y + 0.9, C.z), new THREE.Vector3(0.6, 1.8, 0.6));
            pts.push(box.min.clone(), box.max.clone());
          }
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
      newShots.push({
        type: typeKey,
        file: `review/AG-341/${typeKey}/${outName}`,
        light: shot.light,
        view: shot.id,
        label: shot.label,
        bytes,
        md5: hash,
        sha1: imgInfo.sha1,
        mx: imgInfo.mx,
        ...frameData,
      });
      console.log(`  captured ${outName} boundsH=${frameData.boundsH}m fillH=${frameData.fillHeightPct}% fillW=${frameData.fillWidthPct}% mx=${imgInfo.mx} md5=${hash}`);
    }
  }

  inspErrors = await page.evaluate('DWInspect.errors()');
  pgErrors = page.errors.slice();
} finally {
  try { await browser.close(); } catch (_) {}
  try { await server.close(); } catch (_) {}
}

// Merge cleanly into summary.json (all 14 ZOMBIE_TYPES, with body-framed screamer replacing ring-widened screamer)
const replacedSet = new Set(TYPES);
const mergedShots = [...(prevSummary.shots || []).filter((s) => !replacedSet.has(s.type)), ...newShots];
const mergedTypes = { ...(prevSummary.types || {}), ...newTypes };
const mergedSummary = {
  ...prevSummary,
  addonAt: new Date().toISOString(),
  liveOnly: true,
  size: [SIZE, SIZE],
  sourceMd5: { ...(prevSummary.sourceMd5 || {}), ...sourceMd5 },
  renderer: rendererInfo,
  types: mergedTypes,
  shots: mergedShots,
  addonPageErrors: pgErrors,
  addonInspectorErrors: inspErrors,
};
fs.writeFileSync(SUMMARY_PATH, JSON.stringify(mergedSummary, null, 2));
const uniq = new Set(newShots.map((s) => s.sha1)).size;
console.log(`DONE AG-343 addon: ${newShots.length} shots (unique=${uniq}), totalTypes=${Object.keys(mergedTypes).length}, totalShots=${mergedShots.length}, pageErrors=${pgErrors.length}, inspectorErrors=${inspErrors.length}`);
