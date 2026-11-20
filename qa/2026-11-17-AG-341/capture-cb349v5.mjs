// qa/2026-11-17-AG-341/capture-cb349v5.mjs
// AG-341: CB-349 v5 guardian & caveguard hind soles BEFORE (live index.html 9311196f) vs AFTER (served swap
// of review/CB-349/v5/index.cb349v5.html b22ffe13 for /index.html only) on RTX 5080 WebGPU.
// Captures gallop (deepest plunge), gallop fold frame (trailing hind foot furthest back), and stand, side and low 3/4, noon.
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
const OUT_DIR = path.join(ROOT, 'review', 'CB-349', 'v5-ag');
fs.mkdirSync(OUT_DIR, { recursive: true });

function md5File(p) {
  return crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex').slice(0, 8);
}

const LIVE_INDEX = path.join(ROOT, 'index.html');
const CB349_INDEX = path.join(ROOT, 'review', 'CB-349', 'v5', 'index.cb349v5.html');
const liveMd5 = md5File(LIVE_INDEX);
const cb349Md5 = md5File(CB349_INDEX);
assert.equal(liveMd5, '9311196f', `Expected LIVE index.html 9311196f, got ${liveMd5}`);
assert.equal(cb349Md5, 'b22ffe13', `Expected review/CB-349/v5/index.cb349v5.html b22ffe13, got ${cb349Md5}`);
const cb349Buf = fs.readFileSync(CB349_INDEX);

const { serve } = await import(pathToFileURL(path.join(ROOT, 'tools/serve.mjs')).href);
const { launch } = await import(pathToFileURL(path.join(ROOT, 'tools/cdp.mjs')).href);

const W = 1280, H = 720;
const SEEDS = { guardian: 349001, caveguard: 349002 };

const server = await serve(ROOT, 0);
const LAUNCH_OPTS = {
  headless: false,
  args: [
    '--disable-features=CalculateNativeWinOcclusion',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
  ],
};

const summary = {
  at: new Date().toISOString(),
  liveIndexMd5: liveMd5,
  cb349IndexMd5: cb349Md5,
  size: [W, H],
  phases: {},
  pageErrors: { before: [], after: [] },
  inspectorErrors: { before: [], after: [] },
};

const HELPERS_JS = `(() => {
  window.__cb349 = {
    async showSeeded(typeKey, seed) {
      const I = window.DWInspect;
      I.pause();
      const origRandom = Math.random;
      let s = seed >>> 0;
      Math.random = () => {
        s = (Math.imul(1664525, s) + 1013904223) >>> 0;
        return s / 4294967296;
      };
      try {
        await I.show('zombie.' + typeKey, { mode: 'walk', instant: true });
      } finally {
        Math.random = origRandom;
      }
      I.backdrop('studio');
      I.light('noon');
      I.overlay('grid', true);
      for (const k of ['bounds', 'axes', 'stick', 'joints', 'wire', 'labels']) I.overlay(k, false);
      const dwi = document.getElementById('dwi');
      if (dwi) dwi.classList.add('shooting');
      const perf = document.getElementById('perf');
      if (perf) perf.style.visibility = 'hidden';
      const cap = document.getElementById('camRigCaption');
      if (cap) cap.remove();
      const canvas = window.TT?.renderer?.domElement;
      if (canvas && !document.getElementById('cb349CanvasStyle')) {
        canvas.setAttribute('data-cb349-canvas', 'true');
        const st = document.createElement('style');
        st.id = 'cb349CanvasStyle';
        st.textContent = 'body *{visibility:hidden!important}canvas[data-cb349-canvas]{visibility:visible!important;position:fixed!important;left:0!important;top:0!important;width:100vw!important;height:100vh!important;z-index:2147483647!important}';
        document.head.append(st);
      }
      I.pause();
      return true;
    },
    readFeet() {
      const I = window.DWInspect, T = window.TT, THREE = T.THREE;
      const z = I.zombie.get();
      if (!z || !z.mesh || !z.mesh.userData.bossRig) return null;
      const outer = z.mesh.userData.bossRig, R = outer.userData.rig, B = z.bossRig;
      outer.updateWorldMatrix(true, true);
      const fy = z.mesh.position.y;
      const wp = new THREE.Vector3(), sv = new THREE.Vector3();
      const ankPos = {};
      for (const S of ['L', 'R']) {
        const j = R['ankle' + S];
        j.getWorldPosition(wp);
        ankPos[S] = { x: wp.x, y: wp.y, z: wp.z, relCm: +((wp.y - fy) * 100).toFixed(2) };
      }
      const under = { L: new Set(), R: new Set() };
      R.ankleL.traverse((o) => under.L.add(o));
      R.ankleR.traverse((o) => under.R.add(o));
      const soleMin = { L: Infinity, R: Infinity };
      const shows = (o) => { for (let a = o; a && a !== outer; a = a.parent) if (a.visible === false) return false; return true; };
      outer.traverse((o) => {
        if (!o.isMesh || !shows(o) || !o.geometry?.attributes?.position) return;
        const g = o.geometry, pa = g.attributes.position;
        if (o.isSkinnedMesh && o.skeleton && typeof o.applyBoneTransform === 'function') {
          o.skeleton.update();
          const si = g.attributes.skinIndex, sw = g.attributes.skinWeight, bones = o.skeleton.bones;
          if (!si || !sw) return;
          for (let i = 0; i < pa.count; i++) {
            let bi = -1, bw = -1;
            for (let c = 0; c < 4; c++) {
              const w = sw.getComponent(i, c);
              if (w > bw) { bw = w; bi = si.getComponent(i, c); }
            }
            const b = bones[bi];
            const S = under.L.has(b) ? 'L' : under.R.has(b) ? 'R' : null;
            if (!S) continue;
            sv.fromBufferAttribute(pa, i);
            o.applyBoneTransform(i, sv);
            sv.applyMatrix4(o.matrixWorld);
            if (sv.y < soleMin[S]) soleMin[S] = sv.y;
          }
        } else {
          const S = under.L.has(o) ? 'L' : under.R.has(o) ? 'R' : null;
          if (!S) return;
          for (let i = 0; i < pa.count; i++) {
            sv.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld);
            if (sv.y < soleMin[S]) soleMin[S] = sv.y;
          }
        }
      });
      const soleLCm = Number.isFinite(soleMin.L) ? +((soleMin.L - fy) * 100).toFixed(2) : null;
      const soleRCm = Number.isFinite(soleMin.R) ? +((soleMin.R - fy) * 100).toFixed(2) : null;
      const pelP = new THREE.Vector3();
      R.pelvis.getWorldPosition(pelP);
      const yaw = z.mesh.rotation.y;
      const fwdX = Math.sin(yaw), fwdZ = Math.cos(yaw);
      const backL = +(((pelP.x - ankPos.L.x) * fwdX + (pelP.z - ankPos.L.z) * fwdZ) * 100).toFixed(2);
      const backR = +(((pelP.x - ankPos.R.x) * fwdX + (pelP.z - ankPos.R.z) * fwdZ) * 100).toFixed(2);
      return {
        pos: [+z.mesh.position.x.toFixed(4), +z.mesh.position.y.toFixed(4), +z.mesh.position.z.toFixed(4)],
        yaw: +yaw.toFixed(4),
        hitH: +z.hitH.toFixed(4),
        hitH0: +(B.hitH0 || z.hitH).toFixed(4),
        speed: +(B.speed || 0).toFixed(3),
        ph: +(B.ph || 0).toFixed(4),
        winding: !!(z.attackWindup > 0 || z.swingT > 0 || z.slamWind > 0 || z.chargeWind > 0),
        ankleL_cm: ankPos.L.relCm,
        ankleR_cm: ankPos.R.relCm,
        soleL_cm: soleLCm,
        soleR_cm: soleRCm,
        ankleL_back_cm: backL,
        ankleR_back_cm: backR,
        trail_back_cm: +Math.max(backL, backR).toFixed(2),
        midAnkle: [(ankPos.L.x + ankPos.R.x) * 0.5, fy, (ankPos.L.z + ankPos.R.z) * 0.5],
        pelvis: [pelP.x, pelP.y, pelP.z],
        variantH: +(z.mesh.userData.variant?.height || 1).toFixed(4),
      };
    },
    camFor(view) {
      const f = this.readFeet();
      const yaw = f.yaw;
      const fy = f.pos[1];
      // Frame the whole boss (head to hind feet) while staying low enough to see the soles on the grid floor
      const tx = f.midAnkle[0] * 0.40 + f.pelvis[0] * 0.60;
      const tz = f.midAnkle[2] * 0.40 + f.pelvis[2] * 0.60;
      if (view === 'side') {
        const az = yaw + Math.PI * 0.5;
        const dist = 5.65;
        return {
          x: tx + Math.sin(az) * dist,
          y: fy + 0.56,
          z: tz + Math.cos(az) * dist,
          tx, ty: fy + 0.94, tz, fov: 40,
        };
      }
      // low 3/4: front-left 3/4 near ground height (38 cm above floor) showing all four limbs and soles against the grid
      const az = yaw + (44 * Math.PI / 180);
      const dist = 5.85;
      return {
        x: tx + Math.sin(az) * dist,
        y: fy + 0.38,
        z: tz + Math.cos(az) * dist,
        tx, ty: fy + 0.90, tz, fov: 40,
      };
    },
  };
  return true;
})()`;

function pngStats(buf) {
  if (buf.readUInt32BE(12) !== 0x49484452) return null;
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20), depth = buf[24], type = buf[25], inter = buf[28];
  if (depth !== 8 || (type !== 2 && type !== 6) || inter !== 0) return null;
  const ch = type === 6 ? 4 : 3, stride = w * ch, idat = [];
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
  let max = 0, nz = 0;
  for (let i = 0; i < img.length; i += ch * 4) {
    const m = Math.max(img[i], img[i + 1], img[i + 2]);
    if (m > max) max = m;
    if (m > 8) nz++;
  }
  return { max, nz, hash: crypto.createHash('sha1').update(img).digest('hex') };
}

let _lastImgHash = null;

async function captureHeldScreenshot(page, cam, outPath) {
  let buf = null, px = null;
  for (let tries = 0; tries < 3; tries++) {
    await page.send('Page.bringToFront').catch(() => {});
    await page.evaluate(`(async () => {
      const I = window.DWInspect, T = window.TT, H = T.inspectHost();
      I.pause();
      I.camera(${JSON.stringify(cam)});
      H.loop(false);
      I._ix.stage.frame(0, I._ix.subject.focus());
      T.setShotView(${JSON.stringify(cam)});
      H.camera.position.set(${cam.x}, ${cam.y}, ${cam.z});
      H.camera.lookAt(${cam.tx}, ${cam.ty}, ${cam.tz});
      if (H.camera.fov !== ${cam.fov}) H.camera.fov = ${cam.fov};
      H.camera.aspect = ${W} / ${H};
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
      await new Promise((r) => setTimeout(r, 80));
      return true;
    })()`, 180000);
    await page.screenshot(outPath);
    await page.evaluate(`TT.inspectHost().loop(true)`).catch(() => {});
    buf = fs.readFileSync(outPath);
    px = pngStats(buf);
    if (px && px.max >= 20 && px.nz >= 2000 && px.hash !== _lastImgHash) break;
    await new Promise((r) => setTimeout(r, 120));
  }
  assert.ok(px && px.max >= 20 && px.nz >= 2000, `Black/blank screenshot ${outPath}: ${JSON.stringify(px)}`);
  assert.notEqual(px.hash, _lastImgHash, `Stale/identical screenshot ${outPath}: hash=${px.hash}`);
  _lastImgHash = px.hash;
  const bytes = buf.length;
  assert.ok(bytes > 20000, `Suspiciously small screenshot ${outPath} (${bytes} bytes)`);
  return { file: path.relative(ROOT, outPath).replace(/\\/g, '/'), bytes, md5: md5File(outPath), maxRgb: px.max, nzSample: px.nz, pxHash: px.hash.slice(0, 12) };
}

function summarizeScan(rows) {
  const valid = rows.filter((r) => r.speed > 2.5 && !r.winding);
  const src = valid.length ? valid : rows;
  const anks = src.flatMap((r) => [r.ankleL_cm, r.ankleR_cm]).sort((a, b) => a - b);
  const soles = src.flatMap((r) => [r.soleL_cm, r.soleR_cm]).filter((v) => v != null).sort((a, b) => a - b);
  return {
    samples: rows.length,
    gallopSamples: valid.length,
    ankleMinCm: anks[0],
    ankleMedianCm: anks[anks.length >> 1],
    ankleMaxCm: anks[anks.length - 1],
    soleMinCm: soles[0],
    soleMedianCm: soles[soles.length >> 1],
    soleMaxCm: soles[soles.length - 1],
  };
}

async function openInspectorPage(browser, { swapCb349 }) {
  const page = await browser.newPage({ width: W, height: H });
  await page.setViewport(W, H);
  await page.send('Page.bringToFront').catch(() => {});

  let indexSwappedCount = 0;
  if (swapCb349) {
    page.conn.onEvent((msg) => {
      if (msg.sessionId !== page.sessionId || msg.method !== 'Fetch.requestPaused') return;
      const { requestId, request } = msg.params;
      const u = new URL(request.url).pathname;
      if (u === '/index.html') {
        indexSwappedCount++;
        page.send('Fetch.fulfillRequest', {
          requestId,
          responseCode: 200,
          responseHeaders: [
            { name: 'Content-Type', value: 'text/html; charset=utf-8' },
            { name: 'Cache-Control', value: 'no-store' },
          ],
          body: cb349Buf.toString('base64'),
        }).catch((e) => page.errors.push(e.message));
      } else {
        page.send('Fetch.continueRequest', { requestId }).catch(() => {});
      }
    });
    await page.send('Fetch.enable', { patterns: [{ urlPattern: `${server.origin}/index.html*` }] });
  }

  await page.goto(`${server.origin}/index.html?inspect&raf=timer`, { timeout: 240000 });
  const ok = await page.waitFor('(window.DWInspect && window.DWInspect.ready) || !!window.DWInspectError', { timeout: 300000 });
  const initErr = await page.evaluate('window.DWInspectError || null');
  if (!ok || initErr) throw new Error('Inspector boot failed: ' + (initErr || page.errors[0] || 'timeout'));

  if (swapCb349) {
    assert.equal(indexSwappedCount, 1, `Expected /index.html served swap count === 1, got ${indexSwappedCount}`);
  }
  const hasCb349 = await page.evaluate(`Array.from(document.scripts).some((s) => s.textContent.includes('guardianHindKeep'))`);
  assert.equal(hasCb349, !!swapCb349, `Expected guardianHindKeep=${!!swapCb349}, got ${hasCb349}`);
  const backend = await page.evaluate(`TT.renderer?.backend?.constructor?.name || 'unknown'`);
  assert.equal(backend, 'WebGPUBackend', `Expected WebGPUBackend, got ${backend}`);
  await page.evaluate(`dispatchEvent(new Event('resize'))`);
  await page.evaluate(HELPERS_JS);
  return { page, backend, indexSwappedCount, hasCb349 };
}

let browser = null;
try {
  // === PHASE 1: BEFORE (live index.html 9311196f) ===
  const beforeRefs = {};
  {
    _lastImgHash = null;
    browser = await launch(LAUNCH_OPTS);
    const { page, backend, hasCb349 } = await openInspectorPage(browser, { swapCb349: false });
    const phaseOut = { backend, hasCb349, types: {} };
    try {
      for (const typeKey of ['guardian', 'caveguard']) {
        const seed = SEEDS[typeKey];
        // 1) Gallop scan to find deepest floor plunge while coming on at speed
        await page.evaluate(`window.__cb349.showSeeded(${JSON.stringify(typeKey)}, ${seed})`);
        await page.evaluate(`DWInspect.stepAsync(45)`, 120000);
        const scan = [];
        for (let i = 0; i < 90; i++) {
          const st = await page.evaluate(`(async () => { await DWInspect.stepAsync(1); return window.__cb349.readFeet(); })()`, 60000);
          scan.push({ idx: i + 1, ...st });
        }
        const candidates = scan.filter((r) => r.speed > 2.5 && !r.winding);
        assert.ok(candidates.length > 0, `No gallop candidates found for before ${typeKey}`);
        const byPlunge = candidates.slice().sort((a, b) => Math.min(a.ankleL_cm, a.ankleR_cm) - Math.min(b.ankleL_cm, b.ankleR_cm));
        const bestIdx = byPlunge[0].idx;
        const byTrail = candidates.slice().sort((a, b) => b.trail_back_cm - a.trail_back_cm);
        const foldIdx = byTrail[0].idx;

        // 2) Re-show deterministically and step to exact bestIdx for Gallop shots
        await page.evaluate(`window.__cb349.showSeeded(${JSON.stringify(typeKey)}, ${seed})`);
        await page.evaluate(`DWInspect.stepAsync(${45 + bestIdx})`, 180000);
        const gallopInfo = await page.evaluate(`window.__cb349.readFeet()`);
        const gallopCams = await page.evaluate(`({ side: window.__cb349.camFor('side'), low3q: window.__cb349.camFor('low3q') })`);
        const gallopSide = await captureHeldScreenshot(page, gallopCams.side, path.join(OUT_DIR, `before-${typeKey}-gallop-side.png`));
        const gallopLow3q = await captureHeldScreenshot(page, gallopCams.low3q, path.join(OUT_DIR, `before-${typeKey}-gallop-low3q.png`));

        // 3) Re-show deterministically and step to exact foldIdx (trailing hind foot furthest back)
        await page.evaluate(`window.__cb349.showSeeded(${JSON.stringify(typeKey)}, ${seed})`);
        await page.evaluate(`DWInspect.stepAsync(${45 + foldIdx})`, 180000);
        const foldInfo = await page.evaluate(`window.__cb349.readFeet()`);
        const foldCams = await page.evaluate(`({ side: window.__cb349.camFor('side'), low3q: window.__cb349.camFor('low3q') })`);
        const foldSide = await captureHeldScreenshot(page, foldCams.side, path.join(OUT_DIR, `before-${typeKey}-fold-side.png`));
        const foldLow3q = await captureHeldScreenshot(page, foldCams.low3q, path.join(OUT_DIR, `before-${typeKey}-fold-low3q.png`));

        // 4) Transition to Stand (stop forward drive via B.update(1/60) x 150)
        const standInfo = await page.evaluate(`(() => {
          const z = DWInspect.zombie.get();
          z.attackWindup = 0; z.swingT = 0; z.slamWind = 0; z.chargeWind = 0; z.hitReact = 0;
          for (let i = 0; i < 150; i++) TT.guardianBossDbg.update(1 / 60);
          return window.__cb349.readFeet();
        })()`);
        assert.ok(standInfo.speed < 0.25, `Before ${typeKey} did not settle to stand (speed=${standInfo.speed})`);
        const standCams = await page.evaluate(`({ side: window.__cb349.camFor('side'), low3q: window.__cb349.camFor('low3q') })`);
        const standSide = await captureHeldScreenshot(page, standCams.side, path.join(OUT_DIR, `before-${typeKey}-stand-side.png`));
        const standLow3q = await captureHeldScreenshot(page, standCams.low3q, path.join(OUT_DIR, `before-${typeKey}-stand-low3q.png`));

        beforeRefs[typeKey] = { seed, bestIdx, foldIdx, gallopCams, foldCams, standCams };
        phaseOut.types[typeKey] = {
          seed,
          bestIdx,
          foldIdx,
          gallopScanSummary: summarizeScan(scan),
          gallopFrame: gallopInfo,
          gallopCams,
          gallopShots: { side: gallopSide, low3q: gallopLow3q },
          foldFrame: foldInfo,
          foldCams,
          foldShots: { side: foldSide, low3q: foldLow3q },
          standFrame: standInfo,
          standCams,
          standShots: { side: standSide, low3q: standLow3q },
        };
        console.log(`BEFORE ${typeKey}: scan=${JSON.stringify(phaseOut.types[typeKey].gallopScanSummary)} bestIdx=${bestIdx} foldIdx=${foldIdx} (trail=${foldInfo.trail_back_cm}cm) gallopAnk=[${gallopInfo.ankleL_cm},${gallopInfo.ankleR_cm}] sole=[${gallopInfo.soleL_cm},${gallopInfo.soleR_cm}] foldAnk=[${foldInfo.ankleL_cm},${foldInfo.ankleR_cm}] foldSole=[${foldInfo.soleL_cm},${foldInfo.soleR_cm}] standSole=[${standInfo.soleL_cm},${standInfo.soleR_cm}]`);
      }
      summary.inspectorErrors.before = await page.evaluate('DWInspect.errors()');
      summary.pageErrors.before = page.errors.slice();
      summary.phases.before = phaseOut;
    } finally {
      await browser.close();
      browser = null;
    }
  }

  // === PHASE 2: AFTER (review/CB-349/v5/index.cb349v5.html b22ffe13 via served swap in fresh browser) ===
  {
    _lastImgHash = null;
    browser = await launch(LAUNCH_OPTS);
    const { page, backend, indexSwappedCount, hasCb349 } = await openInspectorPage(browser, { swapCb349: true });
    const phaseOut = { backend, indexSwappedCount, hasCb349, types: {} };
    try {
      for (const typeKey of ['guardian', 'caveguard']) {
        const ref = beforeRefs[typeKey];
        // 1) Same 90-frame gallop scan for apples-to-apples stats
        await page.evaluate(`window.__cb349.showSeeded(${JSON.stringify(typeKey)}, ${ref.seed})`);
        await page.evaluate(`DWInspect.stepAsync(45)`, 120000);
        const scan = [];
        for (let i = 0; i < 90; i++) {
          const st = await page.evaluate(`(async () => { await DWInspect.stepAsync(1); return window.__cb349.readFeet(); })()`, 60000);
          scan.push({ idx: i + 1, ...st });
        }

        // 2) Re-show deterministically and step to EXACT same bestIdx as BEFORE
        await page.evaluate(`window.__cb349.showSeeded(${JSON.stringify(typeKey)}, ${ref.seed})`);
        await page.evaluate(`DWInspect.stepAsync(${45 + ref.bestIdx})`, 180000);
        const gallopInfo = await page.evaluate(`window.__cb349.readFeet()`);
        const gallopSide = await captureHeldScreenshot(page, ref.gallopCams.side, path.join(OUT_DIR, `after-${typeKey}-gallop-side.png`));
        const gallopLow3q = await captureHeldScreenshot(page, ref.gallopCams.low3q, path.join(OUT_DIR, `after-${typeKey}-gallop-low3q.png`));

        // 3) Re-show deterministically and step to EXACT same foldIdx as BEFORE
        await page.evaluate(`window.__cb349.showSeeded(${JSON.stringify(typeKey)}, ${ref.seed})`);
        await page.evaluate(`DWInspect.stepAsync(${45 + ref.foldIdx})`, 180000);
        const foldInfo = await page.evaluate(`window.__cb349.readFeet()`);
        const foldSide = await captureHeldScreenshot(page, ref.foldCams.side, path.join(OUT_DIR, `after-${typeKey}-fold-side.png`));
        const foldLow3q = await captureHeldScreenshot(page, ref.foldCams.low3q, path.join(OUT_DIR, `after-${typeKey}-fold-low3q.png`));

        // 4) Transition to Stand identically
        const standInfo = await page.evaluate(`(() => {
          const z = DWInspect.zombie.get();
          z.attackWindup = 0; z.swingT = 0; z.slamWind = 0; z.chargeWind = 0; z.hitReact = 0;
          for (let i = 0; i < 150; i++) TT.guardianBossDbg.update(1 / 60);
          return window.__cb349.readFeet();
        })()`);
        assert.ok(standInfo.speed < 0.25, `After ${typeKey} did not settle to stand (speed=${standInfo.speed})`);
        const standSide = await captureHeldScreenshot(page, ref.standCams.side, path.join(OUT_DIR, `after-${typeKey}-stand-side.png`));
        const standLow3q = await captureHeldScreenshot(page, ref.standCams.low3q, path.join(OUT_DIR, `after-${typeKey}-stand-low3q.png`));

        phaseOut.types[typeKey] = {
          seed: ref.seed,
          bestIdx: ref.bestIdx,
          foldIdx: ref.foldIdx,
          gallopScanSummary: summarizeScan(scan),
          gallopFrame: gallopInfo,
          gallopCams: ref.gallopCams,
          gallopShots: { side: gallopSide, low3q: gallopLow3q },
          foldFrame: foldInfo,
          foldCams: ref.foldCams,
          foldShots: { side: foldSide, low3q: foldLow3q },
          standFrame: standInfo,
          standCams: ref.standCams,
          standShots: { side: standSide, low3q: standLow3q },
        };
        console.log(`AFTER  ${typeKey}: scan=${JSON.stringify(phaseOut.types[typeKey].gallopScanSummary)} bestIdx=${ref.bestIdx} foldIdx=${ref.foldIdx} (trail=${foldInfo.trail_back_cm}cm) gallopAnk=[${gallopInfo.ankleL_cm},${gallopInfo.ankleR_cm}] sole=[${gallopInfo.soleL_cm},${gallopInfo.soleR_cm}] foldAnk=[${foldInfo.ankleL_cm},${foldInfo.ankleR_cm}] foldSole=[${foldInfo.soleL_cm},${foldInfo.soleR_cm}] standSole=[${standInfo.soleL_cm},${standInfo.soleR_cm}]`);
      }
      summary.inspectorErrors.after = await page.evaluate('DWInspect.errors()');
      summary.pageErrors.after = page.errors.slice();
      summary.phases.after = phaseOut;
    } finally {
      await browser.close();
      browser = null;
    }
  }
} finally {
  try { await browser?.close(); } catch (_) {}
  try { await server.close(); } catch (_) {}
}

// Re-verify live index.html was never touched
assert.equal(md5File(LIVE_INDEX), '9311196f', 'LIVE index.html hash changed!');
assert.equal(md5File(CB349_INDEX), 'b22ffe13', 'index.cb349v5.html hash changed!');
fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(`DONE: pageErrors=${summary.pageErrors.before.length}/${summary.pageErrors.after.length}, inspectorErrors=${summary.inspectorErrors.before.length}/${summary.inspectorErrors.after.length}`);
