// qa/2026-11-17-AG-340/pick-dark-square.mjs
// Raycast & identify the dark square at (686, 850) on right thigh front in unarmed stand (SET=c vs SET=live).
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import zlib from 'node:zlib';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('DW_GAME_TEST_TOKEN required');
const ROOT = 'C:/Users/Zero/Desktop/Tiny Trek';
const { serve } = await import(pathToFileURL(path.join(ROOT, 'tools/serve.mjs')).href);
const { launch } = await import(pathToFileURL(path.join(ROOT, 'tools/cdp.mjs')).href);

const COPIES = {
  '/studio/marine-body.js': 'review/CC-357/c/marine-body.js',
  '/ui/marine-face.js': 'review/CC-357/marine-face.js',
  '/studio/marine-hats.js': 'review/CC-357/marine-hats.js',
  '/ui/marine-kit-fit.js': 'review/GP-20151/band-ui-v1.source.js',
  '/index.html': 'review/GP-20151/band-index-v1.source.html',
};
const COPY_MD5 = {
  '/studio/marine-body.js': '0d761307',
  '/ui/marine-face.js': '0ec0cb83',
  '/studio/marine-hats.js': 'c2695acf',
  '/ui/marine-kit-fit.js': '55c01e28',
  '/index.html': '813e6f4f',
};
const copyBodies = Object.fromEntries(Object.entries(COPIES).map(([u, f]) => [u, fs.readFileSync(path.join(ROOT, f))]));
for (const [u, b] of Object.entries(copyBodies)) {
  assert.equal(crypto.createHash('md5').update(b).digest('hex').slice(0, 8), COPY_MD5[u], 'copy md5 ' + u);
}

function pngPixel(buf, px, py) {
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20), type = buf[25], ch = type === 6 ? 4 : 3, stride = w * ch, idat = [];
  for (let o = 8; o < buf.length;) { const len = buf.readUInt32BE(o), t = buf.toString('latin1', o + 4, o + 8); if (t === 'IDAT') idat.push(buf.subarray(o + 8, o + 8 + len)); if (t === 'IEND') break; o += 12 + len; }
  const raw = zlib.inflateSync(Buffer.concat(idat)), img = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) { const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1, dst = y * stride; for (let x = 0; x < stride; x++) { const a = x >= ch ? img[dst + x - ch] : 0, b = y ? img[dst - stride + x] : 0, c = x >= ch && y ? img[dst - stride + x - ch] : 0, v = raw[src + x]; let p = 0; if (f === 1) p = a; else if (f === 2) p = b; else if (f === 3) p = (a + b) >> 1; else if (f === 4) { const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c); p = pa <= pb && pa <= pc ? a : pb <= pc ? b : c; } img[dst + x] = (v + p) & 255; } }
  const i = (py * w + px) * ch;
  return [img[i], img[i + 1], img[i + 2]];
}

const PICK_JS = `(async (opts) => {
  const I = window.DWInspect, T = window.TT, THREE = T.THREE, H = T.inspectHost();
  const px = 686, py = 850, S = 1600;
  const ndc = new THREE.Vector2((px / S) * 2 - 1, -(py / S) * 2 + 1);

  const chainOf = (o) => {
    const names = [];
    for (let n = o; n; n = n.parent) {
      names.push((n.name || n.type || '?') + (n.isInstancedMesh ? '[inst:' + n.count + ']' : n.isSkinnedMesh ? '[skin]' : ''));
      if (n === T.player) break;
    }
    return names;
  };
  const matName = (m) => !m ? null : Array.isArray(m) ? m.map(x => x?.name || x?.color?.getHexString?.() || '?') : (m.name || ('color#' + (m.color?.getHexString?.() || '?')));
  const checkSources = (skinMesh, hitPt) => {
    const ud = skinMesh?.userData;
    const sources = ud?.rig?.sources || ud?.sources || T.player?.userData?.rig?.sources || T.marine?.userData?.rigSkin?.sources || null;
    if (!sources) return { rigSkin: !!ud?.rigSkin, hasSources: false };
    const matched = [];
    const box = new THREE.Box3(), v = new THREE.Vector3();
    for (let i = 0; i < sources.length; i++) {
      const src = sources[i];
      const obj = src?.mesh || src?.obj || src?.o || src;
      if (!obj || !obj.isObject3D) continue;
      obj.updateWorldMatrix(true, false);
      box.setFromObject(obj);
      const dist = box.distanceToPoint(hitPt);
      if (box.containsPoint(hitPt) || dist < 0.025) {
        matched.push({ idx: i, name: obj.name || '', mat: matName(obj.material), dist: +dist.toFixed(4), boxMin: box.min.toArray().map(n => +n.toFixed(3)), boxMax: box.max.toArray().map(n => +n.toFixed(3)) });
      }
    }
    return { rigSkin: !!ud?.rigSkin, totalSources: sources.length, matched };
  };

  const renderDirect = async () => {
    H.loop(false);
    I._ix.stage.frame(0, I._ix.subject.focus());
    T.setShotView(opts.cam);
    H.camera.position.set(opts.cam.x, opts.cam.y, opts.cam.z);
    H.camera.lookAt(opts.cam.tx, opts.cam.ty, opts.cam.tz);
    H.camera.fov = opts.cam.fov; H.camera.aspect = 1; H.camera.updateProjectionMatrix(); H.camera.updateMatrixWorld(true);
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
      const q = H.renderer.backend?.device?.queue; if (q) await q.onSubmittedWorkDone();
    }
    await new Promise((r) => setTimeout(r, 80));
  };

  const renderHost = async () => {
    H.loop(false);
    I._ix.stage.frame(0, I._ix.subject.focus());
    T.setShotView(opts.cam);
    H.camera.position.set(opts.cam.x, opts.cam.y, opts.cam.z);
    H.camera.lookAt(opts.cam.tx, opts.cam.ty, opts.cam.tz);
    H.camera.fov = opts.cam.fov; H.camera.aspect = 1; H.camera.updateProjectionMatrix(); H.camera.updateMatrixWorld(true);
    H.skyDome.position.copy(H.camera.position);
    await new Promise(requestAnimationFrame);
    H.render();
    const q = H.renderer.backend?.device?.queue; if (q) await q.onSubmittedWorkDone();
    await new Promise((r) => setTimeout(r, 80));
  };

  const tryIshot = async () => {
    const p = I.shot({ type: 'image/png' });
    const t = new Promise((r) => setTimeout(() => r('TIMEOUT'), 8000));
    const res = await Promise.race([p, t]);
    if (res === 'TIMEOUT') return { timeout: true };
    if (!res || !res.startsWith('data:image/png;base64,')) return { urlOk: false };
    const rgb = await new Promise((resolve) => {
      const im = new Image();
      im.onload = () => {
        const c = document.createElement('canvas'); c.width = S; c.height = S;
        const g = c.getContext('2d'); g.drawImage(im, 0, 0);
        const p0 = g.getImageData(px, py, 1, 1).data;
        const pTop = g.getImageData(0, 0, 1, 1).data;
        resolve({ centerRgb: [p0[0], p0[1], p0[2]], cornerRgb: [pTop[0], pTop[1], pTop[2]] });
      };
      im.src = res;
    });
    return { urlOk: true, ...rgb };
  };

  const projectBox = (obj) => {
    const b = new THREE.Box3().setFromObject(obj), v = new THREE.Vector3();
    if (!Number.isFinite(b.min.x)) return null;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const dx of [b.min.x, b.max.x]) for (const dy of [b.min.y, b.max.y]) for (const dz of [b.min.z, b.max.z]) {
      v.set(dx, dy, dz).project(T.camera);
      const sx = (v.x + 1) * S * 0.5, sy = (1 - v.y) * S * 0.5;
      x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
    }
    return { px: [Math.round(x0), Math.round(x1)], py: [Math.round(y0), Math.round(y1)] };
  };

  const doPick = (tag) => {
    T.player.updateMatrixWorld(true);
    T.camera.updateMatrixWorld(true);
    const runRay = (allLayers) => {
      const rc = new THREE.Raycaster();
      if (allLayers) rc.layers.enableAll();
      rc.setFromCamera(ndc, T.camera);
      return rc.intersectObject(T.scene, true).slice(0, 8).map((h) => ({
        dist: +h.distance.toFixed(4),
        point: h.point.toArray().map(n => +n.toFixed(4)),
        layersMask: h.object.layers?.mask,
        instanceId: h.instanceId ?? null,
        meshName: h.object.name || '(unnamed)',
        matName: matName(h.object.material),
        matHex: h.object.material?.color?.getHexString?.() || null,
        chain: chainOf(h.object),
        rigSkin: !!h.object.userData?.rigSkin,
        udKeys: Object.keys(h.object.userData || {}),
        srcCheck: h.object.userData?.rigSkin ? checkSources(h.object, h.point) : null,
      }));
    };
    const instList = [];
    T.player.traverse((o) => {
      if (!o.isInstancedMesh) return;
      let vis = true; for (let n = o; n; n = n.parent) if (n.visible === false) vis = false;
      const wbs = [];
      for (let i = 0; i < Math.min(o.count || 1, 6); i++) {
        const m4 = new THREE.Matrix4(), wm = new THREE.Matrix4();
        o.getMatrixAt(i, m4); wm.multiplyMatrices(o.matrixWorld, m4);
        const p = new THREE.Vector3().setFromMatrixPosition(wm);
        const sp = p.clone().project(T.camera);
        wbs.push({ i, w: p.toArray().map(n => +n.toFixed(3)), px: [Math.round((sp.x + 1) * S * 0.5), Math.round((1 - sp.y) * S * 0.5)] });
      }
      instList.push({ name: o.name || '', mat: matName(o.material), vis, ownVis: o.visible, count: o.count, layersMask: o.layers?.mask, chain: chainOf(o), instances: wbs });
    });
    const nearbyMeshes = [];
    const mpos = new THREE.Vector3();
    T.player.traverse((o) => {
      if (!(o.isMesh || o.isSkinnedMesh) || o.isInstancedMesh) return;
      let vis = true; for (let n = o; n; n = n.parent) if (n.visible === false) vis = false;
      if (!vis) return;
      const pb = projectBox(o);
      if (!pb) return;
      if (pb.px[1] >= 650 && pb.px[0] <= 730 && pb.py[1] >= 810 && pb.py[0] <= 890) {
        o.getWorldPosition(mpos);
        nearbyMeshes.push({ name: o.name || '(unnamed)', mat: matName(o.material), layersMask: o.layers?.mask, rigSkin: !!o.userData?.rigSkin, pxBox: pb, chain: chainOf(o) });
      }
    });
    return { tag, hitsLayer0: runRay(false), hitsAllLayers: runRay(true), instList, nearbyMeshes, rigSkinInfo: T.rigSkinDbg?.info?.(T.marine) || null };
  };

  await I.show('marine'); I.backdrop('studio'); I.light('noon');
  for (const k of ['grid','bounds','axes','stick','joints','wire','labels']) I.overlay(k, false);
  const dwi = document.getElementById('dwi'); if (dwi) dwi.classList.add('shooting');
  const perf = document.getElementById('perf'); if (perf) perf.style.visibility = 'hidden';
  const cap = document.getElementById('camRigCaption'); if (cap) cap.remove();
  const canvas = H.renderer.domElement;
  canvas.setAttribute('data-agc-canvas', 'true');
  const st = document.createElement('style');
  st.textContent = 'body *{visibility:hidden!important}canvas[data-agc-canvas]{visibility:visible!important;position:fixed!important;left:0!important;top:0!important;width:100vw!important;height:100vh!important;z-index:2147483647!important}';
  document.head.append(st);

  TT.resetEconomyDbg();
  const g = TT.getGearOwned && TT.getGearOwned(); if (g) for (const k of Object.keys(g)) g[k] = false;
  I.marine.gear('flashlight', false);
  if (TT.updateCarriedGear) TT.updateCarriedGear(0, true);
  H.loop(true); I.play(); await I.stepAsync(20); I.pause();

  const out = {};
  // Pose A: pistol -> Pose B: unarmed (exact capture-ag-c.mjs order)
  await I.marine.play('stand-armed'); I.marine.weapon('pistol');
  if (g) for (const k of Object.keys(g)) g[k] = false; I.marine.gear('flashlight', false);
  if (TT.updateCarriedGear) TT.updateCarriedGear(0, true);
  H.loop(true); I.play(); await I.stepAsync(45); I.pause();
  I.camera(opts.cam);
  await renderHost();
  out.pistol_pick = doPick('pistol');

  H.loop(true);
  await I.marine.play('stand'); I.marine.weapon('none');
  if (g) for (const k of Object.keys(g)) g[k] = false; I.marine.gear('flashlight', false);
  if (TT.updateCarriedGear) TT.updateCarriedGear(0, true);
  const idle = TT.marineIdleDbg ? TT.marineIdleDbg() : null;
  if (idle && idle.state) Object.assign(idle.state, { quiet: 0, phase: 'idle', time: 0, lit: false });
  I.play(); await I.stepAsync(45);
  if (idle && idle.state) Object.assign(idle.state, { quiet: 0, phase: 'idle', time: 0, lit: false });
  I.camera(opts.cam);
  await new Promise(requestAnimationFrame);
  await new Promise(requestAnimationFrame);
  I.pause();
  out.ishot_before_direct = await tryIshot();
  out.unarmed_loop_state = { cam: T.camera.position.toArray().map(n=>+n.toFixed(3)), magsCount: TT.updateCarriedGear?.(0,false)?.mags?.count, magsVis: TT.updateCarriedGear?.(0,false)?.mags?.visible };

  // Check 1: direct render (capture-ag-c.mjs way)
  await renderDirect();
  out.unarmed_direct_pick = doPick('unarmed_direct');
  window.__PICK_STEP = 'direct';
  return out;
})`;

const POST_HOST_JS = `(async (opts) => {
  const I = window.DWInspect, T = window.TT, H = T.inspectHost();
  H.loop(false);
  I._ix.stage.frame(0, I._ix.subject.focus());
  T.setShotView(opts.cam);
  H.camera.position.set(opts.cam.x, opts.cam.y, opts.cam.z);
  H.camera.lookAt(opts.cam.tx, opts.cam.ty, opts.cam.tz);
  H.camera.fov = opts.cam.fov; H.camera.aspect = 1; H.camera.updateProjectionMatrix(); H.camera.updateMatrixWorld(true);
  H.skyDome.position.copy(H.camera.position);
  await new Promise(requestAnimationFrame);
  H.render();
  const q = H.renderer.backend?.device?.queue; if (q) await q.onSubmittedWorkDone();
  await new Promise((r) => setTimeout(r, 80));
  return { rendered: 'host.render', mags: T.updateCarriedGear ? { vis: T.updateCarriedGear(0, false).mags?.visible, cnt: T.updateCarriedGear(0, false).mags?.count } : null };
})`;

const CAM = { x: -26.00465902691971, y: -198.95370024272847, z: -628.9802927735714, tx: -26.00465902691971, ty: -199.25702463864093, tz: -632.0571606885139, fov: 34 };
const server = await serve(ROOT, 0);
const result = {};
for (const setName of ['c', 'live']) {
  const browser = await launch({ headless: false, args: ['--window-size=1600,1600', '--disable-features=CalculateNativeWinOcclusion', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
  try {
    const page = await browser.newPage({ width: 1600, height: 1600 });
    await page.setViewport(1600, 1600);
    await page.send('Page.bringToFront').catch(() => {});
    if (setName === 'c') {
      page.conn.onEvent((msg) => {
        if (msg.sessionId !== page.sessionId || msg.method !== 'Fetch.requestPaused') return;
        const { requestId, request } = msg.params;
        const u = new URL(request.url).pathname;
        const body = copyBodies[u];
        if (!body) { page.send('Fetch.continueRequest', { requestId }).catch(() => {}); return; }
        page.send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: u.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/javascript; charset=utf-8' }], body: body.toString('base64') }).catch(() => {});
      });
      await page.send('Fetch.enable', { patterns: Object.keys(copyBodies).map((u) => ({ urlPattern: server.origin + u + '*' })) });
    }
    await page.goto(`${server.origin}/index.html?inspect&raf=timer`, { timeout: 240000 });
    await page.waitFor('(window.DWInspect && window.DWInspect.ready) || !!window.DWInspectError', { timeout: 300000 });
    await page.evaluate(`dispatchEvent(new Event('resize'))`);
    const res = await page.evaluate(`(${PICK_JS})(${JSON.stringify({ cam: CAM })})`, 180000);
    const pDirect = path.join(ROOT, `qa/2026-11-17-AG-340/pick-${setName}-unarmed-direct.png`);
    await page.screenshot(pDirect);
    res.directRgb686_850 = pngPixel(fs.readFileSync(pDirect), 686, 850);

    res.hostRenderInfo = await page.evaluate(`(${POST_HOST_JS})(${JSON.stringify({ cam: CAM })})`, 60000);
    const pHost = path.join(ROOT, `qa/2026-11-17-AG-340/pick-${setName}-unarmed-hrender.png`);
    await page.screenshot(pHost);
    res.hostRgb686_850 = pngPixel(fs.readFileSync(pHost), 686, 850);
    result[setName] = res;
  } finally {
    await browser.close().catch(() => {});
  }
}
await server.close().catch(() => {});
fs.writeFileSync(path.join(ROOT, 'qa/2026-11-17-AG-340/pick-result.json'), JSON.stringify(result, null, 2));
console.log('PICK RESULT WRITTEN. Summary:');
for (const k of ['c', 'live']) {
  const r = result[k];
  console.log(k, 'directRgb:', r.directRgb686_850, 'hostRgb:', r.hostRgb686_850, 'hits0:', JSON.stringify(r.unarmed_direct_pick.hitsLayer0.slice(0, 3)), 'instList:', JSON.stringify(r.unarmed_direct_pick.instList));
}
