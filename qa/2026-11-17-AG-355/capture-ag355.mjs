// qa/2026-11-17-AG-355/capture-ag355.mjs
// AG-355 (J167): Jerry-facing LANDED GP152 Leaper floor verification on RTX 5080 WebGPU (ZERO source swaps).
// Captures LIVE (index 70e5dea8, leaper-motion e2a8a04f, leaper-support 13550178) across:
//   statue (constructor), live-idle, walk, body-hit, cave-sleep, cave-getup, cave-awake,
//   crush-prone, crush-prone-getup, crush-supine, crush-supine-getup
// Uses existing GP-20152 fixtures (runtime-normal-continuous-fixture-v2.mjs, runtime-knock-continuous-fixture-v1.mjs,
// runtime-cave-fixture-v2.mjs) and unchanged C5 sampler (a9b8bb9d), framed with AG-341 camera recipe
// (1200x1200, FOV 34, yaw 0/40/90/180, camY 70% height / lookY 50%, 85% height / <=90% width, noon+night matched cameras, visible ground).

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import zlib from 'node:zlib';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
import { ZOMBIE_LIMITS, ZOMBIE_ALLOWANCES } from '../../game/zombie-limits.js';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Must run inside crew game-test slot (DW_GAME_TEST_TOKEN required)');
}

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'qa', '2026-11-17-AG-355');
const IMG_DIR = path.join(OUT_DIR, 'frames');
fs.mkdirSync(IMG_DIR, { recursive: true });

const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const md5_8 = (b) => crypto.createHash('md5').update(b).digest('hex').slice(0, 8);

const FIX_NORMAL = 'review/GP-20152/runtime-normal-continuous-fixture-v2.mjs';
const FIX_KNOCK = 'review/GP-20152/runtime-knock-continuous-fixture-v1.mjs';
const FIX_CAVE = 'review/GP-20152/runtime-cave-fixture-v2.mjs';
const SAMPLER = 'review/GP-20150/audit-original/tools/sampler.js';
const TEST_LIB = 'tools/tests/lib.js';

// Freeze live source tree on disk before launching (zero swaps; read directly from live workspace)
const frozenMap = new Map();
const CODE_EXT = /\.(html|m?js|css|glsl|wgsl)$/i;
const LIVE_DIRS = ['core', 'combat', 'game', 'studio', 'ui', 'world', 'vendor', 'tools', 'assets'];
function addDirToMap(relDir) {
  const full = path.join(ROOT, relDir);
  if (!fs.existsSync(full)) return;
  for (const ent of fs.readdirSync(full, { withFileTypes: true })) {
    const rel = relDir ? `${relDir}/${ent.name}` : ent.name;
    if (ent.isDirectory()) addDirToMap(rel);
    else if (ent.isFile() && CODE_EXT.test(ent.name)) frozenMap.set(rel, fs.readFileSync(path.join(ROOT, rel)));
  }
}
frozenMap.set('index.html', fs.readFileSync(path.join(ROOT, 'index.html')));
for (const d of LIVE_DIRS) addDirToMap(d);
for (const p of [FIX_NORMAL, FIX_KNOCK, FIX_CAVE, SAMPLER]) {
  frozenMap.set(p, fs.readFileSync(path.join(ROOT, p)));
}

// Verify landed GP152 receipts & unchanged C5 sampler
assert.equal(md5_8(frozenMap.get('index.html')), '70e5dea8', 'Expected landed index.html 70e5dea8');
assert.equal(md5_8(frozenMap.get('game/leaper-motion.js')), 'e2a8a04f', 'Expected landed game/leaper-motion.js e2a8a04f');
assert.equal(md5_8(frozenMap.get('game/leaper-support.js')), '13550178', 'Expected landed game/leaper-support.js 13550178');
assert.equal(sha256(frozenMap.get(SAMPLER)), 'a9b8bb9d3e7ddcb5cc16de8726d49231b32a6448ea14c252a22f07165b94f5a4', 'Expected unchanged C5 sampler');

const watchedKeys = [
  'index.html', 'game/leaper-motion.js', 'game/leaper-support.js', 'game/zombie-limits.js',
  'studio/zombie.js', 'studio/zombie-concepts.js', 'studio/zombie-detail.js',
  FIX_NORMAL, FIX_KNOCK, FIX_CAVE, SAMPLER, TEST_LIB,
];
const initialHashes = Object.fromEntries(watchedKeys.map((k) => [k, { md5: md5_8(frozenMap.get(k)), sha256: sha256(frozenMap.get(k)) }]));

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

function violations(m) {
  if (!m?.reading) return [];
  const bad = [];
  for (const group of ['armL', 'armR', 'legL', 'legR']) {
    for (const [k, v] of Object.entries(m.reading[group] || {})) {
      const r = ZOMBIE_LIMITS[k];
      if (r && (!Number.isFinite(v) || v < r[0] || v > r[1])) bad.push({ group, k, v, range: r });
    }
  }
  for (const [k, v] of Object.entries(m.reading)) {
    const r = ZOMBIE_ALLOWANCES.leaper[k]?.range || ZOMBIE_LIMITS[k];
    if (r && (!Number.isFinite(v) || v < r[0] || v > r[1])) bad.push({ k, v, range: r });
  }
  return bad;
}

const SIZE = 1200;
const YAWS = [
  { id: 'front', yawDeg: 0, label: 'Front (0°)' },
  { id: '3q', yawDeg: 40, label: '3/4 Front-Left (40°)' },
  { id: 'side', yawDeg: 90, label: 'Side Left (90°)' },
  { id: 'back', yawDeg: 180, label: 'Back (180°)' },
];
const LIGHTS = ['noon', 'night'];

const INPAGE_RENDERER = `
(() => {
  if (window.__AG355) return;
  const T = TT.THREE;
  const scene = new T.Scene();
  const hemi = new T.HemisphereLight(0xe3efff, 0x45483c, 2.1);
  const sun = new T.DirectionalLight(0xfff2df, 3.0);
  const lamp = new T.SpotLight(0xe1e9ff, 80, 18, 0.7, 0.5, 2);
  scene.add(hemi, sun, sun.target, lamp, lamp.target);
  const floor = new T.Mesh(
    new T.PlaneGeometry(50, 50),
    new T.MeshStandardMaterial({ color: 0x434a45, roughness: 1.0 })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const grid = new T.GridHelper(8, 40, 0x9aaba4, 0x5b6862);
  scene.add(grid);

  function prepCanvas() {
    const H = TT.inspectHost();
    H.renderer.setSize(${SIZE}, ${SIZE}, false);
    const c = H.renderer.domElement;
    c.setAttribute('data-ag355-canvas', 'true');
    if (!document.getElementById('ag355Style')) {
      const st = document.createElement('style');
      st.id = 'ag355Style';
      st.textContent = 'body *{visibility:hidden!important}canvas[data-ag355-canvas]{visibility:visible!important;position:fixed!important;left:0!important;top:0!important;width:100vw!important;height:100vh!important;z-index:2147483647!important}';
      document.head.append(st);
    }
  }

  function sync(g) {
    g.updateMatrixWorld(true);
    g.traverse((o) => { if (o.isSkinnedMesh && o.skeleton) o.skeleton.update(); });
  }
  function shown(o) {
    if (o.layers && !(o.layers.mask & 1)) return false;
    for (let p = o; p; p = p.parent) if (p.visible === false) return false;
    return true;
  }

  function collectPts(g) {
    sync(g);
    const pts = [];
    const box = new T.Box3();
    const v = new T.Vector3();
    g.traverse((m) => {
      if (!(m.isMesh || m.isSkinnedMesh) || !m.geometry?.attributes?.position || !shown(m)) return;
      if (m.userData?.dwiIgnore) return;
      const pos = m.geometry.attributes.position;
      const idx = m.geometry.index?.array;
      const start = m.geometry.drawRange?.start || 0;
      const end = Math.min(idx ? idx.length : pos.count, start + (m.geometry.drawRange?.count ?? Infinity));
      for (let k = start; k < end; k++) {
        const i = idx ? idx[k] : k;
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
  }

  function solveAG341Cams(g, ground) {
    const { box, pts } = collectPts(g);
    if (!pts.length) throw new Error('No visible vertices for AG341 framing');
    const min = box.min, max = box.max;
    const h = Math.max(0.15, max.y - min.y);
    const cx = (min.x + max.x) * 0.5, cz = (min.z + max.z) * 0.5;
    const targetFill = 0.85, maxWidthFill = 0.90, fov = 34;
    const halfTan = Math.tan((fov * Math.PI / 180) * 0.5);
    const testCam = new T.PerspectiveCamera(fov, 1, 0.01, 150);

    const projectPts = (camObj) => {
      camObj.updateMatrixWorld(true);
      let pyMin = Infinity, pyMax = -Infinity, pxMin = Infinity, pxMax = -Infinity;
      for (const p of pts) {
        const q = p.clone().project(camObj);
        const px = (q.x + 1) * ${SIZE} * 0.5, py = (1 - q.y) * ${SIZE} * 0.5;
        if (px < pxMin) pxMin = px; if (px > pxMax) pxMax = px;
        if (py < pyMin) pyMin = py; if (py > pyMax) pyMax = py;
      }
      return { pyMin, pyMax, pxMin, pxMax, hFill: (pyMax - pyMin) / ${SIZE}, wFill: (pxMax - pxMin) / ${SIZE} };
    };

    const cams = {};
    for (const yw of ${JSON.stringify(YAWS)}) {
      const yaw = (g.rotation?.y || 0) + (yw.yawDeg * Math.PI / 180);
      const baseCamY = min.y + h * 0.70;
      let yLook = min.y + h * 0.50;
      let dist = Math.max(h, max.x - min.x, max.z - min.z) / targetFill / (2 * halfTan);
      const solveCam = (d, ty) => {
        const cam = {
          x: cx + Math.sin(yaw) * d,
          y: Math.max(ground + 0.08, baseCamY + (ty - (min.y + h * 0.50))),
          z: cz + Math.cos(yaw) * d,
          tx: cx, ty, tz: cz, fov,
        };
        testCam.fov = fov; testCam.aspect = 1; testCam.updateProjectionMatrix();
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
      cams[yw.id] = {
        cam: m.cam,
        boundsH: +h.toFixed(4),
        boundsMinY: +min.y.toFixed(4),
        floorGapMm: +((min.y - ground) * 1000).toFixed(3),
        fillHeightPct: +(m.hFill * 100).toFixed(2),
        fillWidthPct: +(m.wFill * 100).toFixed(2),
      };
    }
    return cams;
  }

  async function renderShot(g, ground, cam, light) {
    prepCanvas();
    const H = TT.inspectHost(), R = H.renderer;
    const camera = new T.PerspectiveCamera(cam.fov, 1, 0.01, 150);
    camera.position.set(cam.x, cam.y, cam.z);
    camera.lookAt(cam.tx, cam.ty, cam.tz);
    camera.updateMatrixWorld(true);

    floor.position.set(g.position.x, ground - 0.001, g.position.z);
    grid.position.set(g.position.x, ground + 0.001, g.position.z);

    if (light === 'noon') {
      scene.background = new T.Color(0x4b535b);
      hemi.intensity = 2.1; hemi.color.setHex(0xe3efff);
      sun.intensity = 3.0; sun.color.setHex(0xfff2df);
      sun.position.set(cam.tx - 3, cam.ty + 6, cam.tz + 4);
      sun.target.position.set(cam.tx, cam.ty, cam.tz);
      lamp.intensity = 0;
    } else {
      scene.background = new T.Color(0x0d121a);
      hemi.intensity = 0.12; hemi.color.setHex(0x73879b);
      sun.intensity = 0;
      const d2 = (cam.x - cam.tx) ** 2 + (cam.y - cam.ty) ** 2 + (cam.z - cam.tz) ** 2;
      lamp.intensity = Math.min(80, Math.max(10, 80 * (d2 / 17.64)));
      lamp.position.copy(camera.position);
      lamp.target.position.set(cam.tx, cam.ty, cam.tz);
    }

    const parent = g.parent;
    scene.add(g);
    let draws = 0;
    try {
      scene.updateMatrixWorld(true);
      sync(g);
      R.setRenderTarget(null);
      R.setMRT?.(null);
      await R.compileAsync(scene, camera);
      const B = R.backend, oldDraw = B.draw;
      B.draw = function (o, ...args) {
        for (let p = o.object; p; p = p.parent) if (p === g) draws++;
        return oldDraw.call(this, o, ...args);
      };
      try {
        for (let k = 0; k < 2; k++) {
          await new Promise(requestAnimationFrame);
          const nf = R._nodes?.nodeFrame;
          if (nf?.update) { nf.update(); R.info.frame = nf.frameId; }
          R.render(scene, camera);
          const q = B.device?.queue;
          if (q) await q.onSubmittedWorkDone();
        }
      } finally {
        B.draw = oldDraw;
      }
      await new Promise((r) => setTimeout(r, 40));
    } finally {
      if (parent) parent.add(g);
      sync(g);
    }
    return { draws };
  }

  window.__AG355 = { prepCanvas, solveAG341Cams, renderShot, collectPts };
})();
`;

const backend = await serve(ROOT, 0);
let proxy, browser;
const serverErrors = [];
const servedHashes = {};

proxy = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://local').pathname).slice(1) || 'index.html';
  if (p.includes('..')) { res.writeHead(403).end(); return; }
  const b = frozenMap.get(p);
  if (b) {
    servedHashes[p] = sha256(b);
    const ct = p.endsWith('.html') ? 'text/html; charset=utf-8'
      : p.endsWith('.json') ? 'application/json'
      : p.endsWith('.css') ? 'text/css'
      : 'text/javascript; charset=utf-8';
    res.writeHead(200, { 'Content-Type': ct, 'Cache-Control': 'no-store' }).end(b);
    return;
  }
  if (CODE_EXT.test(p)) {
    serverErrors.push('Unfrozen code request: ' + p);
    res.writeHead(500).end();
    return;
  }
  const q = http.request(new URL(req.url, backend.origin), { headers: req.headers }, (r) => {
    res.writeHead(r.statusCode, r.headers);
    r.pipe(res);
  });
  q.on('error', (e) => { serverErrors.push(String(e)); res.writeHead(500).end(); });
  req.pipe(q);
});

await new Promise((r) => proxy.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${proxy.address().port}`;

const summary = {
  task: 'AG-355',
  at: new Date().toISOString(),
  liveOnly: true,
  size: [SIZE, SIZE],
  initialHashes,
  renderer: null,
  states: {},
  shots: [],
  pageErrors: [],
  serverErrors: [],
};

let lastImgSha1 = null;

async function shootState(page, stateKey, stateTitle, getterExpr, metricsObj) {
  const cams = await page.evaluate(`(() => {
    const { g, ground } = (${getterExpr})();
    return window.__AG355.solveAG341Cams(g, ground);
  })()`, 180000);

  summary.states[stateKey] = {
    title: stateTitle,
    ...metricsObj,
    floorGapMmByCams: cams.front.floorGapMm,
    boundsH: cams.front.boundsH,
  };

  for (const light of LIGHTS) {
    for (const yw of YAWS) {
      const cam = cams[yw.id].cam;
      const outName = `${stateKey}-${light}-${yw.id}.png`;
      const outPath = path.join(IMG_DIR, outName);

      const renderRes = await page.evaluate(`(async () => {
        const { g, ground } = (${getterExpr})();
        return await window.__AG355.renderShot(g, ground, ${JSON.stringify(cam)}, ${JSON.stringify(light)});
      })()`, 180000);
      assert.ok(renderRes.draws > 0, `No draws for ${outName}`);

      let info = null;
      for (let tries = 0; tries < 3; tries++) {
        if (tries > 0) {
          await page.evaluate(`(async () => {
            const { g, ground } = (${getterExpr})();
            return await window.__AG355.renderShot(g, ground, ${JSON.stringify(cam)}, ${JSON.stringify(light)});
          })()`, 180000);
        }
        await page.screenshot(outPath);
        info = pngStats(fs.readFileSync(outPath));
        if (info && info.w === SIZE && info.h === SIZE && info.nz >= 500 && info.mx >= 60 && info.sha1 !== lastImgSha1) break;
      }
      assert.ok(info && info.w === SIZE && info.h === SIZE, `Bad size on ${outName}`);
      assert.ok(info.mx >= 60 && info.nz >= 500, `Dark/blank shot ${outName}: ${JSON.stringify(info)}`);
      assert.notEqual(info.sha1, lastImgSha1, `Duplicate shot ${outName}`);
      lastImgSha1 = info.sha1;

      summary.shots.push({
        state: stateKey,
        title: stateTitle,
        light,
        view: yw.id,
        label: `${light === 'noon' ? 'Noon' : 'Night'} · ${yw.label}`,
        file: `qa/2026-11-17-AG-355/frames/${outName}`,
        md5: md5_8(fs.readFileSync(outPath)),
        sha1: info.sha1,
        mx: info.mx,
        cam,
        boundsH: cams[yw.id].boundsH,
        floorGapMm: cams[yw.id].floorGapMm,
        fillHeightPct: cams[yw.id].fillHeightPct,
        fillWidthPct: cams[yw.id].fillWidthPct,
        minBodyGapMm: metricsObj.minBodyGap != null ? +(metricsObj.minBodyGap * 1000).toFixed(3) : cams[yw.id].floorGapMm,
        coreGapMm: metricsObj.coreGap != null ? +(metricsObj.coreGap * 1000).toFixed(3) : null,
        supportsMm: metricsObj.supports ? Object.fromEntries(Object.entries(metricsObj.supports).map(([k, v]) => [k, +(v * 1000).toFixed(3)])) : null,
        violations: metricsObj.violations ?? [],
      });
    }
  }
  console.log(`=== ${stateKey} === minBodyGap=${(metricsObj.minBodyGap != null ? (metricsObj.minBodyGap * 1000).toFixed(3) : cams.front.floorGapMm)}mm coreGap=${metricsObj.coreGap != null ? (metricsObj.coreGap * 1000).toFixed(3) : 'n/a'}mm boundsH=${cams.front.boundsH}m v=${(metricsObj.violations || []).length}`);
}

try {
  browser = await launch({
    headless: false,
    args: [
      `--window-size=${SIZE},${SIZE}`,
      '--disable-features=CalculateNativeWinOcclusion',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
    ],
  });

  // --- PHASE 1: Inspector states (statue, normal idle/walk/body-hit, crush prone/supine + getup) ---
  {
    const page = await browser.newPage({ width: SIZE, height: SIZE });
    await page.setViewport(SIZE, SIZE);
    await page.send('Page.bringToFront').catch(() => {});
    await page.goto(`${origin}/index.html?inspect=marine.fresh&gp152states=1&raf=timer`, { timeout: 300000 });
    assert(await page.waitFor('window.DWInspect?.ready', { timeout: 180000 }));
    await page.evaluate(frozenMap.get(SAMPLER).toString('utf8'));
    await page.evaluate(INPAGE_RENDERER);

    summary.renderer = await page.evaluate(`(() => {
      window.__AG355.prepCanvas();
      return {
        backend: TT.getRendererBackend(),
        width: TT.renderer.domElement.width,
        height: TT.renderer.domElement.height,
      };
    })()`);
    assert.match(summary.renderer.backend, /WebGPU/i);

    // 1) Statue / Constructor
    const statueInfo = await page.evaluate(`(async () => {
      const H = TT.inspectHost(), T = TT.THREE;
      H.loop(true);
      await DWInspect.show('zombie.leaper', { mode: 'statue', instant: true });
      DWInspect.pause(); H.loop(false);
      const g = DWInspect._ix.subject.rig();
      const ground = H.floorAt(g.position.x, g.position.z);
      const { box } = window.__AG355.collectPts(g);
      return {
        ground,
        minBodyGap: box.min.y - ground,
        baseHipsY: g.userData?.baseHipsY ?? null,
        footLift: g.userData?.footLift ?? null,
      };
    })()`, 180000);
    await shootState(
      page,
      'statue',
      'Statue / Constructor (pre-motion)',
      `() => ({ g: DWInspect._ix.subject.rig(), ground: TT.inspectHost().floorAt(DWInspect._ix.subject.rig().position.x, DWInspect._ix.subject.rig().position.z) })`,
      { ...statueInfo, violations: [] }
    );

    // 2) Normal fixture (live-idle, walk, body-hit)
    const setupNormal = await page.evaluate(`(async () => {
      const f = await import('/${FIX_NORMAL}');
      const res = await f.setup();
      window.__AG355.prepCanvas();
      window.__agFixNormal = f;
      return res;
    })()`, 180000);

    // live-idle (12 fixed steps)
    const idleM = await page.evaluate(`(async () => {
      const f = window.__agFixNormal;
      f.beginNormal('idle');
      let m;
      for (let i = 0; i < 12; i++) m = f.fixedStep();
      return m;
    })()`, 180000);
    await shootState(
      page,
      'live-idle',
      'Live Idle (post-applyLeaperMotion)',
      `() => ({ g: DWInspect.zombie.get().mesh, ground: window.__agFixNormal.measure().ground })`,
      { ...idleM, violations: violations(idleM) }
    );

    // walk (30 fixed steps -> step 29 mid-stride)
    const walkM = await page.evaluate(`(async () => {
      const f = window.__agFixNormal;
      f.beginNormal('walk');
      let m;
      for (let i = 0; i < 30; i++) m = f.fixedStep();
      return m;
    })()`, 180000);
    await shootState(
      page,
      'walk',
      'Live Walk (step 30 mid-stride)',
      `() => ({ g: DWInspect.zombie.get().mesh, ground: window.__agFixNormal.measure().ground })`,
      { ...walkM, violations: violations(walkM) }
    );

    // public body-hit (18 fixed steps -> step 17)
    const hitM = await page.evaluate(`(async () => {
      const f = window.__agFixNormal;
      f.beginNormal('hit');
      let m;
      for (let i = 0; i < 18; i++) m = f.fixedStep();
      return m;
    })()`, 180000);
    await shootState(
      page,
      'body-hit',
      'Public Body Hit (hit step 18)',
      `() => ({ g: DWInspect.zombie.get().mesh, ground: window.__agFixNormal.measure().ground })`,
      { ...hitM, violations: violations(hitM) }
    );

    // 3) Knock / Crush fixture (forward prone + get-up, back supine + get-up)
    await page.evaluate(`(async () => {
      TT.flightHold(false);
      const f = await import('/${FIX_KNOCK}');
      const res = await f.setup();
      window.__AG355.prepCanvas();
      window.__agFixKnock = f;
      return res;
    })()`, 180000);

    // Forward crush -> lying prone (step 60)
    const proneM = await page.evaluate(`(async () => {
      const f = window.__agFixKnock;
      f.beginKnock(1);
      let m;
      for (let i = 0; i <= 60; i++) m = f.knockStep();
      return m;
    })()`, 180000);
    await shootState(
      page,
      'crush-prone',
      'Public Crush Forward · Prone (step 60)',
      `() => ({ g: DWInspect.zombie.get().mesh, ground: window.__agFixKnock.measure().ground })`,
      { ...proneM, violations: violations(proneM) }
    );

    // Forward crush -> get-up rising (step 110)
    const proneGetupM = await page.evaluate(`(async () => {
      const f = window.__agFixKnock;
      let m;
      for (let i = 61; i <= 110; i++) m = f.knockStep();
      return m;
    })()`, 180000);
    await shootState(
      page,
      'crush-prone-getup',
      'Public Crush Forward · Get-Up (step 110)',
      `() => ({ g: DWInspect.zombie.get().mesh, ground: window.__agFixKnock.measure().ground })`,
      { ...proneGetupM, violations: violations(proneGetupM) }
    );

    // Back crush -> lying supine (step 60)
    const supineM = await page.evaluate(`(async () => {
      const f = window.__agFixKnock;
      f.beginKnock(-1);
      let m;
      for (let i = 0; i <= 60; i++) m = f.knockStep();
      return m;
    })()`, 180000);
    await shootState(
      page,
      'crush-supine',
      'Public Crush Back · Supine (step 60)',
      `() => ({ g: DWInspect.zombie.get().mesh, ground: window.__agFixKnock.measure().ground })`,
      { ...supineM, violations: violations(supineM) }
    );

    // Back crush -> get-up rising (step 110)
    const supineGetupM = await page.evaluate(`(async () => {
      const f = window.__agFixKnock;
      let m;
      for (let i = 61; i <= 110; i++) m = f.knockStep();
      return m;
    })()`, 180000);
    await shootState(
      page,
      'crush-supine-getup',
      'Public Crush Back · Get-Up (step 110)',
      `() => ({ g: DWInspect.zombie.get().mesh, ground: window.__agFixKnock.measure().ground })`,
      { ...supineGetupM, violations: violations(supineGetupM) }
    );

    summary.pageErrors.push(...page.errors);
    await page.close();
  }

  // --- PHASE 2: Actual ROOT cave warren sleep + public noise wake getup ---
  {
    const page = await browser.newPage({ width: SIZE, height: SIZE });
    await page.setViewport(SIZE, SIZE);
    await page.send('Page.bringToFront').catch(() => {});
    await page.goto(`${origin}/index.html?debug=1&gp152cave=1&raf=timer`, { timeout: 300000 });
    assert(await page.waitFor('window.TT?.inspectHost', { timeout: 180000 }));
    await page.evaluate('window.DWOpening?.dismissForTesting?.()');
    await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 30000 });
    await page.evaluate(frozenMap.get(TEST_LIB).toString('utf8'));
    await page.evaluate('(()=>{window.__GP152PriorInspect=window.DWInspect;window.__GP152Clock={gameTime:TT.getSimTime()};window.DWInspect={_ix:{T:{},THREE:TT.THREE,clock:window.__GP152Clock}};})()');
    await page.evaluate(frozenMap.get(SAMPLER).toString('utf8'));
    await page.evaluate('window.DWInspect=window.__GP152PriorInspect');
    await page.evaluate(INPAGE_RENDERER);

    const caveSetup = await page.evaluate(`(async () => {
      const f = await import('/${FIX_CAVE}');
      const res = await f.setupCave();
      window.__AG355.prepCanvas();
      window.__agFixCave = f;
      window.__agCaveActor = () => {
        const m = f.measure();
        const z = TT.zombies.find((q) => q.mesh && q.mesh.uuid === m.uuid);
        return { g: z.mesh, ground: m.ground };
      };
      return res;
    })()`, 180000);

    await shootState(
      page,
      'cave-sleep',
      'Actual ROOT Cave Sleep',
      `window.__agCaveActor`,
      { ...caveSetup.spawn, violations: violations(caveSetup.spawn) }
    );

    const caveGetupM = await page.evaluate(`(async () => {
      const f = window.__agFixCave;
      f.wakeCave();
      let m;
      for (let i = 0; i <= 30; i++) m = f.externalStep();
      return m;
    })()`, 180000);
    await shootState(
      page,
      'cave-getup',
      'Cave Noise Wake · Get-Up (step 30)',
      `window.__agCaveActor`,
      { ...caveGetupM, violations: violations(caveGetupM) }
    );

    const caveAwakeM = await page.evaluate(`(async () => {
      const f = window.__agFixCave;
      let m;
      for (let i = 31; i <= 60; i++) m = f.externalStep();
      return m;
    })()`, 180000);
    await shootState(
      page,
      'cave-awake',
      'Cave Noise Wake · Awake (step 60)',
      `window.__agCaveActor`,
      { ...caveAwakeM, violations: violations(caveAwakeM) }
    );

    summary.pageErrors.push(...page.errors);
    await page.close();
  }
} finally {
  try { await browser?.close(); } catch (_) {}
  try { await new Promise((r) => proxy.close(r)); } catch (_) {}
  try { await backend?.close(); } catch (_) {}
}

// Verify zero source drift on disk
const drift = watchedKeys.filter((k) => sha256(fs.readFileSync(path.join(ROOT, k))) !== initialHashes[k].sha256);
assert.deepEqual(drift, [], `Source drift detected: ${drift.join(', ')}`);
assert.deepEqual(serverErrors, [], `Server errors: ${serverErrors.join('; ')}`);
assert.deepEqual(summary.pageErrors, [], `Page errors: ${summary.pageErrors.join('; ')}`);

summary.serverErrors = serverErrors;
summary.servedHashes = servedHashes;
fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
const uniq = new Set(summary.shots.map((s) => s.sha1)).size;
console.log(`DONE AG-355: ${summary.shots.length} shots (unique=${uniq}), pageErrors=0, drift=0`);
