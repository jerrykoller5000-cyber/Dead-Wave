// qa/2026-11-17-AG-350/check-mags-live-loop.mjs
// Verify whether carryRig.mags[0] renders visually under live renderFrame loop (H.loop(true) + I.pause() + Page.screenshot)
// in CC-357 c v2 (index.668e-c.html 26c68820) vs LIVE (668e97a3), and check pixel color at rig.mags[0] projection.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import zlib from 'node:zlib';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('DW_GAME_TEST_TOKEN required');
const ROOT = 'C:/Users/Zero/Desktop/Tiny Trek';
const OUT_DIR = path.join(ROOT, 'qa/2026-11-17-AG-350');
fs.mkdirSync(OUT_DIR, { recursive: true });

const { serve } = await import(pathToFileURL(path.join(ROOT, 'tools/serve.mjs')).href);
const { launch } = await import(pathToFileURL(path.join(ROOT, 'tools/cdp.mjs')).href);

const COPIES = {
  '/studio/marine-body.js': 'review/CC-357/c/marine-body.js',
  '/ui/marine-face.js': 'review/CC-357/marine-face.js',
  '/studio/marine-hats.js': 'review/CC-357/marine-hats.js',
  '/ui/marine-kit-fit.js': 'review/GP-20151/band-ui-v1.source.js',
  '/index.html': 'review/CC-357/c/index.668e-c.html',
};
const copyBodies = Object.fromEntries(Object.entries(COPIES).map(([u, f]) => [u, fs.readFileSync(path.join(ROOT, f))]));

function pngPixel(buf, px, py) {
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20), type = buf[25], ch = type === 6 ? 4 : 3, stride = w * ch, idat = [];
  for (let o = 8; o < buf.length;) { const len = buf.readUInt32BE(o), t = buf.toString('latin1', o + 4, o + 8); if (t === 'IDAT') idat.push(buf.subarray(o + 8, o + 8 + len)); if (t === 'IEND') break; o += 12 + len; }
  const raw = zlib.inflateSync(Buffer.concat(idat)), img = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) { const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1, dst = y * stride; for (let x = 0; x < stride; x++) { const a = x >= ch ? img[dst + x - ch] : 0, b = y ? img[dst - stride + x] : 0, c = x >= ch && y ? img[dst - stride + x - ch] : 0, v = raw[src + x]; let p = 0; if (f === 1) p = a; else if (f === 2) p = b; else if (f === 3) p = (a + b) >> 1; else if (f === 4) { const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c); p = pa <= pb && pa <= pc ? a : pb <= pc ? b : c; } img[dst + x] = (v + p) & 255; } }
  const i = (py * w + px) * ch;
  return [img[i], img[i + 1], img[i + 2]];
}

const SIZE = 1600;
const server = await serve(ROOT, 0);
const out = {};

try {
  for (const setName of ['c2', 'live']) {
    const browser = await launch({
      headless: false,
      args: [
        `--window-size=${SIZE},${SIZE}`,
        '--disable-features=CalculateNativeWinOcclusion',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
      ],
    });
    try {
      const page = await browser.newPage({ width: SIZE, height: SIZE });
      await page.setViewport(SIZE, SIZE);
      await page.send('Page.bringToFront').catch(() => {});
      if (setName === 'c2') {
        page.conn.onEvent((msg) => {
          if (msg.sessionId !== page.sessionId || msg.method !== 'Fetch.requestPaused') return;
          const { requestId, request } = msg.params;
          const u = new URL(request.url).pathname;
          const body = copyBodies[u];
          if (!body) { page.send('Fetch.continueRequest', { requestId }).catch(() => {}); return; }
          page.send('Fetch.fulfillRequest', {
            requestId, responseCode: 200,
            responseHeaders: [{ name: 'Content-Type', value: u.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/javascript; charset=utf-8' }],
            body: body.toString('base64'),
          }).catch(() => {});
        });
        await page.send('Fetch.enable', { patterns: Object.keys(copyBodies).map((u) => ({ urlPattern: server.origin + u + '*' })) });
      }
      await page.goto(`${server.origin}/index.html?inspect&raf=timer`, { timeout: 240000 });
      await page.waitFor('(window.DWInspect && window.DWInspect.ready) || !!window.DWInspectError', { timeout: 300000 });
      await page.evaluate(`dispatchEvent(new Event('resize'))`);

      const info = await page.evaluate(`(async () => {
        const I = window.DWInspect, T = window.TT, THREE = T.THREE, H = T.inspectHost();
        await I.show('marine');
        I.backdrop('studio'); I.light('noon');
        for (const k of ['grid','bounds','axes','stick','joints','wire','labels']) I.overlay(k, false);
        const canvas = H.renderer.domElement;
        canvas.setAttribute('data-agc-canvas', 'true');
        const st = document.createElement('style');
        st.textContent = 'body *{visibility:hidden!important}canvas[data-agc-canvas]{visibility:visible!important;position:fixed!important;left:0!important;top:0!important;width:100vw!important;height:100vh!important;z-index:2147483647!important}';
        document.head.append(st);

        TT.resetEconomyDbg();
        const g = TT.getGearOwned && TT.getGearOwned(); if (g) for (const k of Object.keys(g)) g[k] = false;
        I.marine.gear('flashlight', false);
        if (TT.updateCarriedGear) TT.updateCarriedGear(0, true);

        await I.marine.play('stand-armed'); I.marine.weapon('pistol');
        I.play(); await I.stepAsync(45);
        await I.marine.play('stand'); I.marine.weapon('none');
        if (g) for (const k of Object.keys(g)) g[k] = false;
        I.marine.gear('flashlight', false);
        if (TT.updateCarriedGear) TT.updateCarriedGear(0, true);
        const idle = TT.marineIdleDbg ? TT.marineIdleDbg() : null;
        if (idle && idle.state) Object.assign(idle.state, { quiet: 0, phase: 'idle', time: 0, lit: false });
        I.play(); await I.stepAsync(45);
        if (idle && idle.state) Object.assign(idle.state, { quiet: 0, phase: 'idle', time: 0, lit: false });
        I.pause();

        const P = T.player; P.updateMatrixWorld(true);
        const box = new THREE.Box3(), v = new THREE.Vector3();
        P.traverse(m => {
          if (!(m.isMesh || m.isSkinnedMesh) || !m.geometry?.attributes?.position) return;
          for (let n = m; n; n = n.parent) if (n.visible === false) return;
          if (m.layers && m.layers.mask === 0) return;
          if (m.userData?.dwiIgnore) return;
          if (m.isSkinnedMesh) m.skeleton.update();
          const pos = m.geometry.attributes.position;
          for (let i = 0; i < pos.count; i++) {
            if (m.isSkinnedMesh) m.getVertexPosition(i, v); else v.fromBufferAttribute(pos, i);
            v.applyMatrix4(m.matrixWorld);
            if (Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z)) box.expandByPoint(v);
          }
        });
        const min = box.min, max = box.max, h = max.y - min.y;
        const cx = (min.x + max.x) * 0.5, cz = (min.z + max.z) * 0.5;
        const dist = (h / 0.85) / (2 * Math.tan((34 * Math.PI / 180) * 0.5));
        const cam = { x: cx, y: min.y + h * 0.70, z: cz + dist, tx: cx, ty: min.y + h * 0.50, tz: cz, fov: 34 };
        I.camera(cam);
        for (let f = 0; f < 5; f++) {
          await new Promise(requestAnimationFrame);
          const q = H.renderer.backend?.device?.queue; if (q) await q.onSubmittedWorkDone();
        }
        await new Promise(r => setTimeout(r, 80));

        const rig = T.updateCarriedGear ? T.updateCarriedGear(0, false) : null;
        const mm = rig?.mags;
        let magInfo = null;
        if (mm) {
          const m4 = new THREE.Matrix4(), wm = new THREE.Matrix4();
          mm.getMatrixAt(0, m4); wm.multiplyMatrices(mm.matrixWorld, m4);
          const wp = new THREE.Vector3().setFromMatrixPosition(wm);
          const sp = wp.clone().project(T.camera);
          const px = Math.round((sp.x + 1) * ${SIZE} * 0.5), py = Math.round((1 - sp.y) * ${SIZE} * 0.5);
          magInfo = { vis: mm.visible, count: mm.count, marineLocal: wp.clone().sub(P.position).toArray().map(n => +n.toFixed(4)), px: [px, py] };
        }
        return { cam, magInfo };
      })()`, 180000);

      const pLoop = path.join(OUT_DIR, `loop-${setName}-front.png`);
      await page.screenshot(pLoop);
      const buf = fs.readFileSync(pLoop);
      const [mx, my] = info.magInfo ? info.magInfo.px : [699, 853];
      out[setName] = {
        ...info,
        loopRgbAtMagPx: pngPixel(buf, mx, my),
        loopRgbAt686_850: pngPixel(buf, 686, 850),
        file: pLoop,
      };
    } finally {
      await browser.close().catch(() => {});
    }
  }
} finally {
  await server.close().catch(() => {});
}

fs.writeFileSync(path.join(OUT_DIR, 'mags-loop-check.json'), JSON.stringify(out, null, 2));
console.log('MAGS LOOP CHECK:', JSON.stringify(out, null, 2));
