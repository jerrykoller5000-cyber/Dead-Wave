// qa/2026-11-11-CC-343c/cc343c-verify.mjs
// RTX 5080 WebGPU 5-scene x 4-light + deck-edge-crouched verification for Claude 3's CC-343 part 2
// Uses 18:50 review/CC-343b/shots/a-*.png (part 1) as BEFORE and captures live part 2 as AFTER.
// Strictly offscreen (-3800,-3800), single browser instance inside game-test slot.

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Must run inside game-test slot');
}

const ROOT = 'C:/Users/Zero/Desktop/Tiny Trek';
const { serve } = await import(pathToFileURL(path.join(ROOT, 'tools/serve.mjs')).href);
const { launch } = await import(pathToFileURL(path.join(ROOT, 'tools/cdp.mjs')).href);

const BEFORE_DIR = path.join(ROOT, 'review/CC-343b/shots');
const OUT_REV = path.join(ROOT, 'review/CC-343c');
const OUT_SHOTS = path.join(OUT_REV, 'shots');
const OUT_QA = path.join(ROOT, 'qa/2026-11-11-CC-343c/shots');
const OUT_CLAUDE = path.join(ROOT, 'Claude outputs/CC-343c/pics');
fs.mkdirSync(OUT_SHOTS, { recursive: true });
fs.mkdirSync(OUT_QA, { recursive: true });
fs.mkdirSync(OUT_CLAUDE, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function writeSafe(p, buf) {
  const tmp = `${p}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, buf);
  fs.renameSync(tmp, p);
}

async function moveOffscreen(page) {
  try {
    const win = await page.send('Browser.getWindowForTarget', {});
    if (win && win.windowId != null) {
      await page.send('Browser.setWindowBounds', {
        windowId: win.windowId,
        bounds: { left: -3800, top: -3800, width: 960, height: 720, windowState: 'normal' }
      });
    }
  } catch (_) {}
}

const SETUP_TEMPLATE = `
const key = (code, down) => document.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, key: code, bubbles: true }));
T.flightHold(true);
const P = T.player, p = P.position;
if (window.__ccPin) { clearInterval(window.__ccPin); window.__ccPin = null; }
for (const k of ['KeyW', 'KeyC', 'ShiftLeft']) key(k, false);
if (!window.__cc) {
  T.clearZombies && T.clearZombies(); T.setHp && T.setHp(1e6);
  const SX = 18, SZ = 18, G0 = T.sampleHeight(SX, SZ);
  T.levelGroundRect(SX - 14, SZ - 14, SX + 14, SZ + 14, G0, 6);
  const gx = Math.round((SX - 6) / 2), gz = Math.round((SZ - 6) / 2);
  const stairs = T.placeBuildAt('stairs', gx, gz, 0), floor = T.placeBuildAt('floor', gx - 3, gz + 3, 0);
  p.set(SX, G0 + 3, SZ);
  for (let i = 0; i < 15; i++) T.stepFrame(1 / 30);
  window.__cc = { stairs, floor, SX, SZ, G0 };
}
const C = window.__cc, d = C.stairs.deck;
let aim = 0;
const step = (n) => { for (let i = 0; i < n; i++) { T.aimPointDbg(p.x + Math.sin(aim) * 6, p.y + 1.3, p.z + Math.cos(aim) * 6); T.setAimYawDbg(aim); T.stepFrame(1 / 30); } };
const place = (x, z) => { p.set(x, T.entityGroundY(x, z, p.y + 3), z); };
const W = T.weather; if (W) { W.raining = __RAIN__; if (__RAIN__) { W.rainTimeLeft = 9999; W.intensity = 1; } else { W.intensity = 0; } }
step(3);
`;

const SCENES = [
  ['stairs-crouched',    -0.50, "aim = 0; place(d.x, d.z - 0.1); step(10); key('KeyC', true); step(40);"],
  ['stairs-standing',    -0.50, "aim = 0; place(d.x, d.z - 0.1); step(45);"],
  ['stairs-down',        -0.50, "aim = Math.PI; place(d.x, d.z + 0.4); step(45);"],
  ['stairs-walking',     -0.50, "aim = 0; place(d.x, d.z - 0.1); const px = p.x, pz = p.z; window.__ccPin = setInterval(() => { p.x = px; p.z = pz; }, 2); key('KeyW', true); for (let i = 0; i < 20; i++) { p.x = px; p.z = pz; step(1); }"],
  ['deck-edge',          -0.50, "aim = 0; const fd = C.floor.deck; place(fd.x - 0.95, fd.z); step(45);"],
  ['deck-edge-crouched', -0.75, "aim = -Math.PI / 2; const fd = C.floor.deck; place(fd.x - 0.95, fd.z); step(10); key('KeyC', true); step(40);"]
];

const LIGHTS = [
  ['noon',     'noon',  'false'],
  ['overcast', 'day',   'true'],
  ['dusk',     'dusk',  'false'],
  ['night',    'night', 'false']
];

const MATCH_BOOT = `(async () => {
  const T = window.TT;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const n = document.getElementById('playerName');
  if (n) n.value = 'CC343c';
  document.getElementById('modeHunt').click();
  for (let i = 0; i < 120 && !(T.getPhase && T.getPhase() === 'prep'); i++) await wait(200);
  for (let i = 0; i < 600 && document.body.classList.contains('deploying'); i++) await wait(100);
  await wait(400);
  return T.getPhase && T.getPhase();
})()`;

async function main() {
  const summary = {
    card: 'CC-343c',
    capturedAt: new Date().toISOString(),
    backend: null,
    poses: {},
    shots: {},
    pageErrors: [],
    gpuWarnings: []
  };

  // Copy 18:50 part-1 AFTER shots as BEFORE ('b-*') into review/CC-343c/shots/
  for (const [sceneName] of SCENES.slice(0, 5)) {
    for (const [lightName] of LIGHTS) {
      const src = path.join(BEFORE_DIR, `a-${sceneName}-${lightName}.png`);
      assert(fs.existsSync(src), `Missing part-1 shot: ${src}`);
      const buf = fs.readFileSync(src);
      const bFn = `b-${sceneName}-${lightName}.png`;
      writeSafe(path.join(OUT_SHOTS, bFn), buf);
      writeSafe(path.join(OUT_QA, bFn), buf);
      summary.shots[`b-${sceneName}-${lightName}`] = {
        file: `review/CC-343c/shots/${bFn}`,
        bytes: buf.length,
        sha: crypto.createHash('sha1').update(buf).digest('hex').slice(0, 12)
      };
    }
  }

  const server = await serve(ROOT, 0);
  const browser = await launch({
    headless: false,
    args: [
      '--window-position=-3800,-3800',
      '--window-size=960,720',
      '--disable-features=CalculateNativeWinOcclusion',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding'
    ]
  });

  try {
    const page = await browser.newPage({ width: 960, height: 720 });
    await page.setViewport(960, 720);
    await sleep(200);
    await moveOffscreen(page);
    await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 240000 });
    await moveOffscreen(page);
    await page.waitFor('!!window.DWOpening || !!window.TT', { timeout: 120000 });
    for (let i = 0; i < 2; i++) {
      await page.evaluate(`(() => { if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting(); else { const b = document.getElementById('openingSkip'); if (b) b.click(); } return true; })()`);
      await sleep(300);
    }
    assert(await page.waitFor('!!window.TT', { timeout: 240000 }));
    await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
    await sleep(400);

    const phase = await page.evaluate(MATCH_BOOT, 300000);
    assert.equal(phase, 'prep', `Expected prep phase, got ${phase}`);
    await moveOffscreen(page);

    await page.evaluate(`import('/tools/camera-rig.js').then((m) => { window.CamRig = m.install(); return true; })`);
    summary.backend = await page.evaluate('window.TT?.renderer?.backend?.constructor?.name || CamRig.renderer()');

    for (const [sceneName, lookY, sceneCode] of SCENES) {
      const shas = new Set();
      for (const [lightName, timeArg, rainArg] of LIGHTS) {
        const pre = SETUP_TEMPLATE.replace(/__RAIN__/g, rainArg) + sceneCode + '\nT.flightHold(false);';
        const req = {
          target: 'player',
          yaw: 65,
          pitch: 18,
          dist: 2.7,
          lookY,
          size: [960, 720],
          aspect: 960 / 720,
          time: timeArg,
          pre,
          caption: ''
        };
        const aimRes = await page.evaluate(`CamRig.aim(${JSON.stringify(req)})`, 120000);
        await sleep(100);
        const fn = `a-${sceneName}-${lightName}.png`;
        const absRev = path.join(OUT_SHOTS, fn);
        await page.screenshot(absRev);
        const buf = fs.readFileSync(absRev);
        assert(buf.length > 15000, `Screenshot ${fn} too small (${buf.length})`);
        writeSafe(path.join(OUT_QA, fn), buf);
        writeSafe(path.join(OUT_CLAUDE, fn), buf);
        const sha = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 12);
        shas.add(sha);

        if (lightName === 'noon') {
          const poseInfo = await page.evaluate(`(() => {
            const T = window.TT, P = T.player;
            let ud = null;
            P.traverse((o) => { if (!ud && o.userData && (o.userData.feet || o.userData.turn)) ud = o.userData; });
            const bootInfo = (() => {
              const m = T.marine;
              if (!m) return null;
              m.updateMatrixWorld(true);
              const vL = new T.THREE.Vector3(), vR = new T.THREE.Vector3(), vHip = new T.THREE.Vector3();
              m.userData?.ankleLG?.getWorldPosition(vL);
              m.userData?.ankleRG?.getWorldPosition(vR);
              m.userData?.hipsG?.getWorldPosition(vHip);
              return {
                hipsWorld: vHip.toArray().map((x) => +x.toFixed(3)),
                ankleLWorld: vL.toArray().map((x) => +x.toFixed(3)),
                ankleRWorld: vR.toArray().map((x) => +x.toFixed(3)),
                deckY: window.__cc?.floor?.deck?.y == null ? null : +window.__cc.floor.deck.y.toFixed(3)
              };
            })();
            return {
              playerPos: [+P.position.x.toFixed(3), +P.position.y.toFixed(3), +P.position.z.toFixed(3)],
              feet: ud?.feet ? { lift: +(ud.feet.lift || 0).toFixed(3), f0: ud.feet[0] == null ? null : +ud.feet[0].toFixed(3), f1: ud.feet[1] == null ? null : +ud.feet[1].toFixed(3) } : null,
              boots: bootInfo
            };
          })()`);
          summary.poses[`a:${sceneName}`] = { cam: aimRes.cam, ...poseInfo };
        }
        summary.shots[`a-${sceneName}-${lightName}`] = { file: `review/CC-343c/shots/${fn}`, bytes: buf.length, sha };
      }
      assert.equal(shas.size, 4, `Expected 4 distinct light frames for ${sceneName}, got ${shas.size}`);
      console.log(`Captured a :: ${sceneName} (4 distinct lights)`);
    }

    summary.pageErrors = page.errors.slice();
    await page.close().catch(() => {});
  } finally {
    await browser.close().catch(() => {});
    await server.close();
  }

  assert.equal(summary.pageErrors.length, 0, `Page errors: ${summary.pageErrors.join('; ')}`);
  const sumBuf = Buffer.from(JSON.stringify(summary, null, 2) + '\n', 'utf8');
  writeSafe(path.join(OUT_REV, 'cc343c-summary.json'), sumBuf);
  writeSafe(path.join(ROOT, 'qa/2026-11-11-CC-343c/cc343c-summary.json'), sumBuf);
  console.log(`CC-343c complete: ${Object.keys(summary.shots).length} total shots, 0 page errors.`);
}

await main();
