// qa/2026-11-17-KR7-s24/capture-kr7-s24.mjs
// KR-7 (ak) light C landed s24 (game/viewmodel-poses.js cbdb2289): 5080 WebGPU 1P close look (AG-332 way).
// Noon: press 2 (Digit2), FULL PRESS (~0.245s): close-left shown + close-left support glove hidden,
// plus rest/eye/close-front/release context in one sheet at review/J165-landed-s24/.
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
const OUT_DIR = path.join(ROOT, 'review', 'J165-landed-s24');
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
  let mx = 0, nz = 0;
  for (let i = 0; i < img.length; i += ch * 4) {
    const m = Math.max(img[i], img[i + 1], img[i + 2]);
    if (m > mx) mx = m;
    if (m > 8) nz++;
  }
  return { w, h, mx, nz, sha1: crypto.createHash('sha1').update(img).digest('hex').slice(0, 12) };
}

const filesToHash = [
  'game/viewmodel-poses.js',
  'game/viewmodel.js',
  'studio/weapon-attachments.js',
  'index.html',
];
const actualMd5 = Object.fromEntries(filesToHash.map((f) => [f, md5File(path.join(ROOT, f))]));
assert.equal(actualMd5['game/viewmodel-poses.js'], 'cbdb2289', `Expected game/viewmodel-poses.js cbdb2289, got ${actualMd5['game/viewmodel-poses.js']}`);

const W = 1280, H = 720;
const server = await serve(ROOT, 0);
const browser = await launch({
  headless: false,
  args: [
    `--window-size=${W},${H}`,
    '--disable-features=CalculateNativeWinOcclusion',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
  ],
});

const summary = {
  at: new Date().toISOString(),
  md5: actualMd5,
  size: [W, H],
  renderer: null,
  shots: [],
  pageErrors: [],
  consoleErrors: [],
};

try {
  const page = await browser.newPage({ width: W, height: H });
  await page.setViewport(W, H);
  try {
    const { windowId } = await page.send('Browser.getWindowForTarget', {});
    await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'normal' } });
    await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: 80, top: 80, width: W + 24, height: H + 90 } });
    await page.send('Page.bringToFront');
  } catch (_) {}

  await page.goto(`${server.origin}/index.html?debug=1`, { timeout: 240000 });
  assert(await page.waitFor('!!window.DWOpening', { timeout: 120000 }));
  await page.evaluate('window.DWOpening?.dismissForTesting?.()');
  assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state === "ready" && !window.DWOpening?.active', { timeout: 180000 }));

  await page.evaluate(`(async () => {
    const n = document.getElementById('playerName');
    if (n) n.value = 'KR7S24';
    const b = document.getElementById('modeTraining');
    if (b) b.click();
    return true;
  })()`);
  assert(await page.waitFor(`window.TT.trainingDbg?.state().active && !document.getElementById('trainingBlackout')?.classList.contains('on')`, { timeout: 240000 }));

  const bootInfo = await page.evaluate(`(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const css = document.createElement('style');
    css.textContent = 'body > :not(canvas):not(script):not(style):not(#view){visibility:hidden!important} #menu,#title,#hud,#crosshair{display:none!important;visibility:hidden!important}';
    document.head.append(css);

    const T = window.TT, Hh = T.inspectHost();
    const { LIGHTS } = await import('/studio/inspector/stage.js');
    window.__LIGHTS = LIGHTS;
    window.eyeLight = 'noon';
    window.__H = Hh;
    window.__held = false;
    window.__fc = null;
    window.__eyeCam = null;

    T.setViewFirstDbg(true);
    try { await T.trainingDbg?.state?.().warmPromise; } catch (_) {}
    try { await T.trainingDbg?.state?.().bgWarmPromise; } catch (_) {}
    T.grantAllWeapons();
    T.modsOwnAllDbg && T.modsOwnAllDbg();
    if (T.isUnarmed && T.isUnarmed()) T.toggleHolster();
    const idx = T.WEAPON_ORDER.indexOf('ak');
    for (let k = 0; k < 40 && T.getCurrentWeapon() !== 'ak'; k++) { T.setWeapon(idx); await wait(100); }
    if (T.isUnarmed && T.isUnarmed()) T.toggleHolster();
    T.setOtsAimDbg(3.14, -0.1);
    T.flightHold(true);

    for (let k = 0; k < 240; k++) {
      T.stepFrame(1 / 60);
      if ((k & 3) === 0) await wait(10);
      const v = T.viewmodelDbg();
      const ots = T.otsDbg?.();
      if (v && v.info && v.info.active && v.info.key === 'ak' && v.info.raise > 0.999 && ots && ots.w > 0.99) break;
    }

    let fitRet = null;
    for (let k = 0; k < 60; k++) {
      if (T.armoryDbg?.mods('ak')?.some((m) => m.id === 'laserLight')) {
        fitRet = T.armoryDbg.fit('ak', 'laserLight', true);
      }
      T.stepFrame(1 / 60);
      await wait(20);
      const v = T.viewmodelDbg();
      const sVis = !!(v?.gun?.src?.userData?.laserLightUnit?.visible);
      const rVis = !!(v?.gun?.root?.getObjectByName?.('laserLightUnit')?.visible);
      const lt = v?.lightPressTimes?.('ak');
      if (sVis && rVis && lt && v?.info?.active && v?.root?.visible) break;
    }

    Hh.attach({
      held: () => !!window.__held,
      scale: (dt) => dt,
      frame: () => {
        const L = window.__LIGHTS[window.eyeLight] || window.__LIGHTS.noon;
        const p = T.player.position;
        const dir = new Hh.THREE.Vector3(...L.dir).normalize();
        Hh.sun.position.copy(p).addScaledVector(dir, 85);
        Hh.sun.target.position.copy(p);
        Hh.sun.target.updateMatrixWorld();
        Hh.sun.color.setHex(L.sunColor);
        Hh.sun.intensity = L.sun;
        Hh.hemi.color.setHex(L.skyColor);
        Hh.hemi.groundColor.setHex(L.ground);
        Hh.hemi.intensity = L.sky;
        Hh.ambientFill.intensity = L.fill;
        Hh.moon.intensity = 0;
      }
    });

    const V = T.viewmodelDbg();
    if (!V.__origPlaceAG) {
      V.__origPlaceAG = V.place;
      V.__agCalls = 0;
      V.place = function () {
        V.__agCalls++;
        const cam = Hh.camera;
        if (window.__eyeCam) {
          cam.position.copy(window.__eyeCam.pos);
          cam.quaternion.copy(window.__eyeCam.quat);
          cam.up.copy(window.__eyeCam.up);
          if (cam.near !== window.__eyeCam.near) { cam.near = window.__eyeCam.near; cam.updateProjectionMatrix(); }
          cam.updateMatrixWorld(true);
        }
        V.__origPlaceAG();
        const fc = window.__fc;
        V.__agLast = { fc: !!fc, rootVis: V.root.visible, camPre: cam.position.toArray().map(n => +n.toFixed(3)) };
        if (!fc) return;
        const THREE = Hh.THREE;
        V.root.updateMatrixWorld(true);
        const tgt = new THREE.Vector3(...fc.at).applyMatrix4(V.gun.root.matrixWorld);
        const q = V.root.quaternion.clone();
        const o = new THREE.Vector3(...fc.off).applyQuaternion(q);
        cam.position.copy(tgt).add(o);
        cam.up.copy(new THREE.Vector3(...(fc.up || [0, 1, 0])).applyQuaternion(q));
        cam.lookAt(tgt);
        if (cam.near > 0.02) { cam.near = 0.02; cam.updateProjectionMatrix(); }
        cam.updateMatrixWorld(true);
        V.__agLast.camPost = cam.position.toArray().map(n => +n.toFixed(3));
        V.__agLast.tgt = tgt.toArray().map(n => +n.toFixed(3));
      };
    }

    const c = T.renderer.domElement, r = c.getBoundingClientRect();
    const vm = T.viewmodelDbg();
    const rootUnit = vm?.gun?.root?.getObjectByName?.('laserLightUnit') || null;
    const srcUnit = vm?.gun?.src?.userData?.laserLightUnit || null;
    return {
      backend: T.renderer?.backend?.constructor?.name || 'unknown',
      canvas: [r.width, r.height, c.width, c.height],
      gun: vm?.info?.key || null,
      active: !!(vm?.info?.active),
      rootVisible: !!(vm?.root?.visible),
      raise: vm?.info?.raise,
      ots: T.otsDbg?.() || null,
      hostState: Hh.state?.() || null,
      gearLight: !!(T.getGearOwned?.()?.laserLight),
      lightTimes: vm?.lightPressTimes?.('ak') || null,
      fitRet,
      fitted: !!(rootUnit?.visible || srcUnit?.visible),
      lightRow: vm?.info?.light ?? null,
    };
  })()`);
  summary.renderer = bootInfo;
  console.log('BOOT:', JSON.stringify(bootInfo));
  assert.equal(bootInfo.gun, 'ak', 'Expected ak equipped');
  assert.equal(bootInfo.active, true, 'Expected viewmodel active in 1P: ' + JSON.stringify(bootInfo));
  assert.equal(bootInfo.rootVisible, true, 'Expected viewmodel.root visible: ' + JSON.stringify(bootInfo));
  assert.ok(bootInfo.ots && bootInfo.ots.w > 0.99, 'Expected OTS settled (w > 0.99): ' + JSON.stringify(bootInfo));
  assert.equal(bootInfo.hostState?.paused, false, 'Expected unpaused: ' + JSON.stringify(bootInfo));
  assert.ok(bootInfo.lightTimes, 'Expected lightPressTimes("ak") ready: ' + JSON.stringify(bootInfo));
  assert.equal(bootInfo.fitted, true, 'Expected KR-7 light fitted: ' + JSON.stringify(bootInfo));

  const CLOSE_LEFT = { at: [-0.03, -0.03, 0.40], off: [-0.20, 0.03, 0.0], up: [0, 1, 0] };
  const CLOSE_FRONT = { at: [-0.03, -0.03, 0.40], off: [-0.10, 0.06, -0.17], up: [0, 1, 0] };

  let lastSha1 = null;
  async function snapFrozen(name, camMode, fcObj, phaseName, hideHand = false) {
    const info = await page.evaluate(`(() => {
      const T = window.TT, Hh = window.__H, V = T.viewmodelDbg();
      const cam = Hh.camera;
      if (!window.__eyeCam) {
        window.__eyeCam = { pos: cam.position.clone(), quat: cam.quaternion.clone(), up: cam.up.clone(), near: cam.near };
      }
      if (${hideHand}) {
        for (const m of Object.values(V.arms.l.meshes)) if (m && m.visible) { m.visible = false; m.userData.__hidAG = 1; }
      } else {
        for (const m of Object.values(V.arms.l.meshes)) if (m && m.userData.__hidAG) { m.visible = true; m.userData.__hidAG = 0; }
      }
      window.__fc = ${fcObj ? JSON.stringify(fcObj) : 'null'};
      window.__held = true;
      Hh.loop(false);
      T.flightHold(true);
      const sw = V.gun?.ctrls?.lightSwitch;
      const ls = V.gun?.src?.userData?.lightSwitch;
      const rest = sw?.userData?.restPosition || sw?.userData?.vmLightRest || null;
      return {
        lightState: V.info?.light ? { ...V.info.light } : null,
        handPlace: V.info?.handPlace || null,
        swPos: sw ? sw.position.toArray().map((x) => +x.toFixed(6)) : null,
        swRest: rest ? rest.map((x) => +x.toFixed(6)) : null,
        lsTravel: ls ? ls.travel : null,
      };
    })()`);
    const outName = `${name}.png`;
    const outPath = path.join(OUT_DIR, outName);

    let shotData = await page.evaluate(`(async () => {
      const Hh = window.__H, T = window.TT;
      const applyLighting = () => {
        const L = window.__LIGHTS.noon;
        const p = T.player.position;
        const dir = new Hh.THREE.Vector3(...L.dir).normalize();
        Hh.sun.position.copy(p).addScaledVector(dir, 85);
        Hh.sun.target.position.copy(p);
        Hh.sun.target.updateMatrixWorld();
        Hh.sun.color.setHex(L.sunColor);
        Hh.sun.intensity = L.sun;
        Hh.hemi.color.setHex(L.skyColor);
        Hh.hemi.groundColor.setHex(L.ground);
        Hh.hemi.intensity = L.sky;
        Hh.ambientFill.intensity = L.fill;
        Hh.moon.intensity = 0;
        Hh.skyDome.position.copy(Hh.camera.position);
      };
      const scanCanvas = (cap) => {
        const g = cap.getContext('2d', { alpha: false, willReadFrequently: true });
        const px = g.getImageData(0, 0, cap.width, cap.height).data;
        let mx = 0, nz = 0;
        for (let i = 0; i < px.length; i += 4) {
          const m = Math.max(px[i], px[i + 1], px[i + 2]);
          if (m > mx) mx = m;
          if (m > 8) nz++;
        }
        return { mx, nz };
      };
      applyLighting();
      const preCalls = T.viewmodelDbg()?.__agCalls || 0;
      let camInRaf = null, rafUrl = null, rafShaCheck = null;
      // Render inside requestAnimationFrame + copy via drawImage in the SAME WebGPU task so swapchain never reads stale!
      const rafRes = await new Promise((resolve) => requestAnimationFrame(async () => {
        applyLighting();
        Hh.render();
        camInRaf = Hh.camera.position.toArray().map(n => +n.toFixed(3));
        const src = Hh.renderer.domElement;
        const cap = window.__agCap || (window.__agCap = document.createElement('canvas'));
        cap.width = src.width; cap.height = src.height;
        const gx = cap.getContext('2d', { alpha: false, willReadFrequently: true });
        gx.fillStyle = '#000'; gx.fillRect(0, 0, cap.width, cap.height);
        gx.drawImage(src, 0, 0);
        const s = scanCanvas(cap);
        if (s.mx >= 9 && s.nz >= 10000) {
          resolve({ method: 'drawImage-raf', url: cap.toDataURL('image/png'), mx: s.mx, nz: s.nz, camInRaf, calls: (T.viewmodelDbg()?.__agCalls || 0) - preCalls, agLast: T.viewmodelDbg()?.__agLast || null });
          return;
        }
        try { await Hh.renderer.backend?.device?.queue?.onSubmittedWorkDone?.(); } catch (_) {}
        const durl = Hh.renderer.domElement.toDataURL('image/png');
        const im = new Image();
        await new Promise((r, e) => { im.onload = r; im.onerror = e; im.src = durl; });
        cap.width = im.width; cap.height = im.height;
        gx.fillStyle = '#000'; gx.fillRect(0, 0, cap.width, cap.height);
        gx.drawImage(im, 0, 0);
        const s2 = scanCanvas(cap);
        resolve({ method: s2.mx >= 9 && s2.nz >= 10000 ? 'toDataURL' : 'cdp', url: s2.mx >= 9 && s2.nz >= 10000 ? durl : null, mx: s2.mx, nz: s2.nz, camInRaf, calls: (T.viewmodelDbg()?.__agCalls || 0) - preCalls, agLast: T.viewmodelDbg()?.__agLast || null });
      }));
      if (rafRes.method !== 'cdp') return rafRes;
      Hh.loop(true);
      for (let i = 0; i < 3; i++) await new Promise((r) => requestAnimationFrame(r));
      await new Promise((r) => setTimeout(r, 80));
      return rafRes;
    })()`);

    let st = null;
    if (shotData.method !== 'cdp' && shotData.url) {
      fs.writeFileSync(outPath, Buffer.from(shotData.url.split(',')[1], 'base64'));
      st = pngStats(fs.readFileSync(outPath));
    } else {
      await page.send('Page.bringToFront');
      await page.screenshot(outPath);
      await page.evaluate(`window.__H.loop(false)`).catch(() => {});
      st = pngStats(fs.readFileSync(outPath));
      assert.ok(st && st.mx >= 9 && st.nz >= 10000, `Black CDP screenshot ${outName}: ${JSON.stringify(st)}`);
      shotData = { ...shotData, mx: st.mx, nz: st.nz };
    }

    const bytes = fs.statSync(outPath).size;
    const hash = md5File(outPath);
    console.log(`captured ${outName} [${shotData.method}] md5=${hash} sha1=${st.sha1} mx=${shotData.mx} calls=${shotData.calls} cam=${JSON.stringify(shotData.camInRaf)} ag=${JSON.stringify(shotData.agLast)} light=${JSON.stringify(info.lightState)} sw=${JSON.stringify(info.swPos)}`);
    assert.ok(bytes > 20000, `Screenshot ${outName} too small (${bytes})`);
    assert.notEqual(st.sha1, lastSha1, `Duplicate consecutive screenshot at ${outName}`);
    lastSha1 = st.sha1;
    summary.shots.push({
      file: `review/J165-landed-s24/${outName}`,
      name,
      camera: camMode,
      light: 'noon',
      phase: phaseName,
      hideHand,
      method: shotData.method,
      bytes,
      md5: hash,
      sha1: st.sha1,
      mx: shotData.mx,
      nz: shotData.nz,
      ...info,
    });
  }

  // Noon baseline setup
  await page.evaluate(`(async () => {
    const T = window.TT;
    window.__held = false;
    window.__fc = null;
    window.__eyeCam = null;
    window.eyeLight = 'noon';
    T.setWorldTime(0.5);
    if (T.toggleFlashlightDbg()) T.toggleFlashlightDbg();
    T.flightHold(true);
    T.setOtsAimDbg(3.14, -0.1);
    for (let i = 0; i < 6; i++) T.stepFrame(1 / 60);
    const cam = window.__H.camera;
    window.__eyeCam = { pos: cam.position.clone(), quat: cam.quaternion.clone(), up: cam.up.clone(), near: cam.near };
    return true;
  })()`);

  // 1. REST close left (context before pressing 2)
  await snapFrozen('kr7-s24-close-left-rest-noon', 'close-left', CLOSE_LEFT, 'rest', false);

  // 2. Press 2 (real Digit2) and step 49 * 0.005s = 0.245s -> FULL PRESS
  const pressLight = await page.evaluate(`(() => {
    const T = window.TT;
    window.__held = false;
    window.__fc = null;
    const cam = window.__H.camera;
    if (window.__eyeCam) {
      cam.position.copy(window.__eyeCam.pos);
      cam.quaternion.copy(window.__eyeCam.quat);
      cam.up.copy(window.__eyeCam.up);
      cam.near = window.__eyeCam.near;
      cam.updateProjectionMatrix();
      cam.updateMatrixWorld(true);
    }
    for (const m of Object.values(T.viewmodelDbg().arms.l.meshes)) if (m && m.userData.__hidAG) { m.visible = true; m.userData.__hidAG = 0; }
    window.__eyeCam = null;
    T.flightHold(true);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit2', key: '2', bubbles: true }));
    for (let i = 0; i < 49; i++) T.stepFrame(0.005);
    window.__eyeCam = { pos: cam.position.clone(), quat: cam.quaternion.clone(), up: cam.up.clone(), near: cam.near };
    return T.viewmodelDbg()?.info?.light || null;
  })()`);
  console.log('PRESS_LIGHT:', JSON.stringify(pressLight));
  assert.ok(pressLight && pressLight.press > 0.95, `Expected full press lightState, got ${JSON.stringify(pressLight)}`);

  await snapFrozen('kr7-s24-close-left-press-noon', 'close-left', CLOSE_LEFT, 'press', false);
  await snapFrozen('kr7-s24-close-left-press-nohand-noon', 'close-left-nohand', CLOSE_LEFT, 'press-nohand', true);
  await snapFrozen('kr7-s24-close-front-press-noon', 'close-front', CLOSE_FRONT, 'press', false);
  await snapFrozen('kr7-s24-eye-press-noon', 'eye', null, 'press', false);

  // 3. Step +41 * 0.005s = 0.450s -> RELEASE context
  await page.evaluate(`(() => {
    const T = window.TT;
    window.__held = false;
    window.__fc = null;
    const cam = window.__H.camera;
    if (window.__eyeCam) {
      cam.position.copy(window.__eyeCam.pos);
      cam.quaternion.copy(window.__eyeCam.quat);
      cam.up.copy(window.__eyeCam.up);
      cam.near = window.__eyeCam.near;
      cam.updateProjectionMatrix();
      cam.updateMatrixWorld(true);
    }
    for (const m of Object.values(T.viewmodelDbg().arms.l.meshes)) if (m && m.userData.__hidAG) { m.visible = true; m.userData.__hidAG = 0; }
    window.__eyeCam = null;
    T.flightHold(true);
    for (let i = 0; i < 41; i++) T.stepFrame(0.005);
    window.__eyeCam = { pos: cam.position.clone(), quat: cam.quaternion.clone(), up: cam.up.clone(), near: cam.near };
    return T.viewmodelDbg()?.info?.light || null;
  })()`);
  await snapFrozen('kr7-s24-close-left-release-noon', 'close-left', CLOSE_LEFT, 'release', false);

  summary.pageErrors = page.errors.slice();
  summary.consoleErrors = page.console.filter((c) => c.type === 'error');
} finally {
  try { await browser.close(); } catch (_) {}
  try { await server.close(); } catch (_) {}
}

fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(`DONE KR-7 s24: ${summary.shots.length} shots, pageErrors=${summary.pageErrors.length}, consoleErrors=${summary.consoleErrors.length}`);
