// qa/2026-11-17-AG-353/capture-ag353.mjs
// AG-353 (J168 PRIORITY): Capture the three LIVE survivors (okafor, brandt, pike) on RTX 5080 WebGPU.
// Live tree as-is (zero swaps, zero game edits). Framed like AG-341 (~85% height, plain studio ground, Noon, 1600x1600).
// Outputs: Claude outputs/J168/survivor-views/<name>/<name>-{front,3q,side,back}.png + summary.json.

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
const OUT_DIR = path.join(ROOT, 'Claude outputs', 'J168', 'survivor-views');
fs.mkdirSync(OUT_DIR, { recursive: true });

const { serve } = await import(pathToFileURL(path.join(ROOT, 'tools/serve.mjs')).href);
const { launch } = await import(pathToFileURL(path.join(ROOT, 'tools/cdp.mjs')).href);

function md5File(p) {
  return crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex');
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
  'studio/marine-body.js': md5File(path.join(ROOT, 'studio/marine-body.js')),
  'studio/marine-cloth.js': md5File(path.join(ROOT, 'studio/marine-cloth.js')),
  'studio/marine-hats.js': md5File(path.join(ROOT, 'studio/marine-hats.js')),
  'ui/marine-face.js': md5File(path.join(ROOT, 'ui/marine-face.js')),
};

const SIZE = 1600;
const SURVIVORS = [
  { who: 'okafor', camp: 'trapper' },
  { who: 'brandt', camp: 'ranger' },
  { who: 'pike', camp: 'hikers' },
];
const SHOTS = [
  { id: 'front', light: 'noon', yawDeg: 0, label: 'Noon · Front' },
  { id: '3q', light: 'noon', yawDeg: 40, label: 'Noon · 3/4 Front-Left' },
  { id: 'side', light: 'noon', yawDeg: 90, label: 'Noon · Side (Left)' },
  { id: 'back', light: 'noon', yawDeg: 180, label: 'Noon · Back' },
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
  task: 'AG-353',
  at: new Date().toISOString(),
  liveOnly: true,
  size: [SIZE, SIZE],
  sourceMd5,
  renderer: null,
  survivors: {},
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

  const vp = await page.evaluate(`(() => {
    dispatchEvent(new Event('resize'));
    const c = TT.renderer.domElement, r = c.getBoundingClientRect();
    const dwi = document.getElementById('dwi'); if (dwi) dwi.classList.add('shooting');
    const perf = document.getElementById('perf'); if (perf) perf.style.visibility = 'hidden';
    const cap = document.getElementById('camRigCaption'); if (cap) cap.remove();
    c.setAttribute('data-ag353-canvas', 'true');
    if (!document.getElementById('ag353Style')) {
      const st = document.createElement('style');
      st.id = 'ag353Style';
      st.textContent = 'body *{visibility:hidden!important}canvas[data-ag353-canvas]{visibility:visible!important;position:fixed!important;left:0!important;top:0!important;width:100vw!important;height:100vh!important;z-index:2147483647!important}';
      document.head.append(st);
    }
    return {
      innerWidth, innerHeight,
      canvasW: r.width, canvasH: r.height,
      bufW: c.width, bufH: c.height,
      backend: TT.renderer?.backend?.constructor?.name || 'unknown',
    };
  })()`);
  summary.renderer = vp;
  assert.equal(vp.backend, 'WebGPUBackend', `Expected WebGPUBackend, got ${vp.backend}`);

  let lastImgHash = null;

  for (const surv of SURVIVORS) {
    const who = surv.who;
    const survDir = path.join(OUT_DIR, who);
    fs.mkdirSync(survDir, { recursive: true });

    const spawnInfo = await page.evaluate(`(async () => {
      const I = window.DWInspect, T = window.TT, H = T.inspectHost();
      H.loop(true);
      let buildError = null;
      try {
        await I.show('person.' + ${JSON.stringify(who)}, { view: false, instant: true });
      } catch (e) {
        buildError = String(e && e.message || e);
      }
      I.backdrop('studio');
      I.light('noon');
      for (const k of ['grid', 'bounds', 'axes', 'stick', 'joints', 'wire', 'labels']) I.overlay(k, false);
      I.play();
      await I.stepAsync(2);
      I.pause();
      const holder = I._ix.subject?.rig?.() || null;
      const fig = I._ix.subject?.origin?.() || null;
      const names = [];
      if (holder) holder.traverse((o) => { if (o.name) names.push(o.name); });
      const shownCount = holder ? (() => {
        let n = 0;
        holder.traverse((o) => {
          if (!(o.isMesh || o.isSkinnedMesh)) return;
          let vis = true;
          for (let p = o; p; p = p.parent) if (p.visible === false) { vis = false; break; }
          if (vis && (!o.layers || o.layers.mask !== 0)) n++;
        });
        return n;
      })() : 0;
      const hasWeaponInHand = names.some((n) => /m240/i.test(n));
      return {
        who: ${JSON.stringify(who)},
        camp: ${JSON.stringify(surv.camp)},
        buildError,
        hasRoot: !!holder,
        meshCount: shownCount,
        namedGroups: names,
        hasM240: hasWeaponInHand,
        hasBackRifle: names.includes('survivor-rifle'),
        pos: holder ? holder.position.toArray().map((x) => +x.toFixed(4)) : null,
        figOffsetY: fig ? +fig.position.y.toFixed(4) : null,
      };
    })()`);

    summary.survivors[who] = spawnInfo;
    console.log(`=== ${who} (${surv.camp}) === meshes=${spawnInfo.meshCount} backRifle=${spawnInfo.hasBackRifle} m240=${spawnInfo.hasM240} err=${spawnInfo.buildError}`);

    for (const shot of SHOTS) {
      const outName = `${who}-${shot.id}.png`;
      const outPath = path.join(survDir, outName);

      const frameData = await page.evaluate(`(async () => {
        const I = window.DWInspect, T = window.TT, THREE = T.THREE, H = T.inspectHost();
        const root = I._ix.subject?.rig?.();
        const C = I._ix.stage.center;
        const shown = (m) => { for (let n = m; n; n = n.parent) if (n.visible === false) return false; return !m.layers || m.layers.mask !== 0; };

        const pts = [];
        const box = new THREE.Box3();
        const v = new THREE.Vector3();
        root.updateMatrixWorld(true);
        root.traverse((m) => {
          if (!(m.isMesh || m.isSkinnedMesh) || !m.geometry?.attributes?.position || !shown(m)) return;
          if (m.userData?.dwiIgnore) return;
          if (m.isSkinnedMesh && m.skeleton) m.skeleton.update();
          const pos = m.geometry.attributes.position;
          for (let i = 0; i < pos.count; i++) {
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

        const min = box.min, max = box.max;
        const h = Math.max(0.15, max.y - min.y);
        const cx = (min.x + max.x) * 0.5, cz = (min.z + max.z) * 0.5;
        const targetFill = 0.85;
        const maxWidthFill = 0.90;
        const yCamOffset = min.y + h * 0.70;
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
        I.light('noon');
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
          boundsMinY: +min.y.toFixed(4),
          boundsMaxY: +max.y.toFixed(4),
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
        if (imgInfo && imgInfo.w === SIZE && imgInfo.h === SIZE && imgInfo.nz >= 500 && imgInfo.mx >= 140 && imgInfo.sha1 !== lastImgHash) break;
      }
      assert.ok(imgInfo && imgInfo.w === SIZE && imgInfo.h === SIZE, `Bad PNG size on ${outName}`);
      assert.ok(imgInfo.mx >= 140 && imgInfo.nz >= 500, `Blank/dark shot ${outName}: ${JSON.stringify(imgInfo)}`);
      assert.notEqual(imgInfo.sha1, lastImgHash, `Duplicate consecutive screenshot on ${outName}`);
      lastImgHash = imgInfo.sha1;

      const bytes = fs.statSync(outPath).size;
      assert.ok(bytes > 20000, `Screenshot ${outName} too small (${bytes} bytes)`);
      summary.shots.push({
        who,
        camp: surv.camp,
        file: `Claude outputs/J168/survivor-views/${who}/${outName}`,
        light: shot.light,
        view: shot.id,
        label: shot.label,
        bytes,
        md5: hash.slice(0, 8),
        sha1: imgInfo.sha1,
        mx: imgInfo.mx,
        ...frameData,
      });
      console.log(`  captured ${outName} fillH=${frameData.fillHeightPct}% fillW=${frameData.fillWidthPct}% h=${frameData.boundsH}m minY=${frameData.boundsMinY} md5=${hash.slice(0, 8)}`);
    }
  }

  summary.inspectorErrors = await page.evaluate('DWInspect.errors()');
  summary.pageErrors = page.errors.slice();
} finally {
  try { await browser.close(); } catch (_) {}
  try { await server.close(); } catch (_) {}
}

fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
const uniq = new Set(summary.shots.map((s) => s.sha1)).size;
console.log(`DONE AG-353: ${summary.shots.length} shots (unique=${uniq}), pageErrors=${summary.pageErrors.length}, inspectorErrors=${summary.inspectorErrors.length}`);
