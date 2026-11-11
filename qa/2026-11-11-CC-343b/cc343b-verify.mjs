// qa/2026-11-11-CC-343b/cc343b-verify.mjs
// RTX 5080 WebGPU 5-scene x 4-light Before/After verification for Claude 3's CC-343 part 1
// (Claude outputs/CC-343b/mkbatch.py recipe).
// Uses a fresh browser instance per pass (never two sequential game loads in one tab) and
// skips 'b' if all 20 verified 'b-*.png' captures are already present on disk.
// Browser kept 100% offscreen (-3800,-3800) while Jerry sleeps.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Must run inside game-test slot');
}

const ROOT = 'C:/Users/Zero/Desktop/Tiny Trek';
const { serve, listZSounds } = await import(pathToFileURL(path.join(ROOT, 'tools/serve.mjs')).href);
const { launch } = await import(pathToFileURL(path.join(ROOT, 'tools/cdp.mjs')).href);
const { defaultGameTestSlot } = await import(pathToFileURL(path.join(ROOT, 'tools/game-test-slot.mjs')).href);

const BEFORE_INDEX_PATH = path.join(ROOT, 'Claude outputs/CC-343b/index.before-cc343b.html');
const BEFORE_TURN_PATH = path.join(ROOT, 'Claude outputs/CC-343b/marine-turn.before-cc343b.js');

const OUT_REV = path.join(ROOT, 'review/CC-343b');
const OUT_SHOTS = path.join(OUT_REV, 'shots');
const OUT_QA = path.join(ROOT, 'qa/2026-11-11-CC-343b/shots');
const OUT_CLAUDE = path.join(ROOT, 'Claude outputs/CC-343b/pics');
fs.mkdirSync(OUT_SHOTS, { recursive: true });
fs.mkdirSync(OUT_QA, { recursive: true });
fs.mkdirSync(OUT_CLAUDE, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function writeSafe(p, buf) {
  const tmp = `${p}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, buf);
  fs.renameSync(tmp, p);
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
  '.opus': 'audio/ogg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

function startBeforeServer(baseDir) {
  const base = path.resolve(baseDir);
  const server = http.createServer((req, res) => {
    let pathname, requestUrl;
    try {
      requestUrl = new URL(req.url, 'http://127.0.0.1');
      pathname = decodeURIComponent(requestUrl.pathname);
    } catch {
      res.writeHead(400).end('bad url');
      return;
    }
    if (pathname === '/__zsounds') {
      const body = JSON.stringify({ root: 'z-sounds', files: listZSounds(base) });
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }).end(body);
      return;
    }
    if (pathname.endsWith('/')) pathname += 'index.html';

    const serveFile = () => {
      let file;
      if (pathname === '/index.html') file = BEFORE_INDEX_PATH;
      else if (pathname === '/studio/marine-turn.js') file = BEFORE_TURN_PATH;
      else {
        file = path.resolve(base, '.' + pathname);
        if (file !== base && !file.startsWith(base + path.sep)) {
          res.writeHead(403).end('forbidden');
          return;
        }
      }
      fs.stat(file, (err, stat) => {
        if (res.destroyed) return;
        if (err || !stat.isFile()) {
          res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found: ' + pathname);
          return;
        }
        let start = 0, end = stat.size - 1, status = 200;
        const range = req.method === 'GET' ? req.headers.range : null;
        if (range) {
          const m = /^bytes=(\d*)-(\d*)$/i.exec(String(range).trim());
          let valid = !!m && (m[1] !== '' || m[2] !== '') && stat.size > 0;
          if (valid && m[1] === '') {
            const suffix = Number(m[2]); valid = Number.isSafeInteger(suffix) && suffix > 0;
            if (valid) start = Math.max(0, stat.size - suffix);
          } else if (valid) {
            start = Number(m[1]); end = m[2] === '' ? end : Number(m[2]);
            valid = Number.isSafeInteger(start) && Number.isSafeInteger(end) && start <= end && start < stat.size;
            if (valid) end = Math.min(end, stat.size - 1);
          }
          if (!valid) {
            res.writeHead(416, { 'Content-Range': 'bytes */' + stat.size, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store', 'Content-Length': 0 }).end();
            return;
          }
          status = 206;
        }
        const headers = {
          'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
          'Content-Length': Math.max(0, end - start + 1),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'no-store'
        };
        if (status === 206) headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
        res.writeHead(status, headers);
        if (req.method === 'HEAD' || !stat.size) { res.end(); return; }
        const stream = fs.createReadStream(file, { start, end, highWaterMark: 64 * 1024 });
        stream.on('error', (e) => res.destroy(e));
        res.on('close', () => stream.destroy());
        stream.pipe(res);
      });
    };

    if (req.method === 'GET' && pathname === '/index.html') {
      const token = requestUrl.searchParams.get('__gameTestToken');
      defaultGameTestSlot.assertHeld(token).then(
        () => serveFile(),
        (err) => {
          if (!res.destroyed) {
            res.writeHead(423, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' })
              .end(`${err.message}\n`);
          }
        }
      );
      return;
    }
    serveFile();
  });

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const actual = server.address().port;
      resolve({
        port: actual,
        origin: `http://127.0.0.1:${actual}`,
        close: () => new Promise((done) => {
          let settled = false;
          const finish = () => { if (!settled) { settled = true; done(); } };
          if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
          server.close(finish);
          setTimeout(finish, 300);
        })
      });
    });
  });
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
  ['stairs-crouched', "aim = 0; place(d.x, d.z - 0.1); step(10); key('KeyC', true); step(40);"],
  ['stairs-standing', "aim = 0; place(d.x, d.z - 0.1); step(45);"],
  ['stairs-down',     "aim = Math.PI; place(d.x, d.z + 0.4); step(45);"],
  ['stairs-walking',  "aim = 0; place(d.x, d.z - 0.1); const px = p.x, pz = p.z; window.__ccPin = setInterval(() => { p.x = px; p.z = pz; }, 2); key('KeyW', true); for (let i = 0; i < 20; i++) { p.x = px; p.z = pz; step(1); }"],
  ['deck-edge',       "aim = 0; const fd = C.floor.deck; place(fd.x - 0.95, fd.z); step(45);"]
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
  if (n) n.value = 'CC343';
  document.getElementById('modeHunt').click();
  for (let i = 0; i < 120 && !(T.getPhase && T.getPhase() === 'prep'); i++) await wait(200);
  for (let i = 0; i < 600 && document.body.classList.contains('deploying'); i++) await wait(100);
  await wait(400);
  return T.getPhase && T.getPhase();
})()`;

function haveExistingPass(tag, summary) {
  for (const [sceneName] of SCENES) {
    for (const [lightName] of LIGHTS) {
      const fn = `${tag}-${sceneName}-${lightName}.png`;
      const p = path.join(OUT_SHOTS, fn);
      if (!fs.existsSync(p) || fs.statSync(p).size <= 15000) return false;
    }
  }
  for (const [sceneName] of SCENES) {
    for (const [lightName] of LIGHTS) {
      const fn = `${tag}-${sceneName}-${lightName}.png`;
      const p = path.join(OUT_SHOTS, fn);
      summary.shots[`${tag}-${sceneName}-${lightName}`] = {
        file: `review/CC-343b/shots/${fn}`,
        bytes: fs.statSync(p).size
      };
    }
  }
  return true;
}

async function runIsolatedPass(origin, tag, summary) {
  console.log(`Launching fresh offscreen browser for ${tag} pass...`);
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
    page.on?.('console', (msg) => {
      const txt = typeof msg?.text === 'function' ? msg.text() : String(msg || '');
      if (/validation|dawn.*error|pipeline.*error/i.test(txt)) summary.gpuWarnings.push(txt);
    });
    page.on?.('pageerror', (err) => {
      summary.pageErrors.push(String(err?.message || err));
    });

    await page.setViewport(960, 720);
    await sleep(200);
    await moveOffscreen(page);
    await page.goto(`${origin}/index.html?debug=1&raf=timer`, { timeout: 240000 });
    await moveOffscreen(page);
    await page.waitFor('!!window.DWOpening || !!window.TT', { timeout: 120000 });
    for (let i = 0; i < 2; i++) {
      await page.evaluate(`(() => { if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting(); else { const b = document.getElementById('openingSkip'); if (b) b.click(); } return true; })()`);
      await sleep(300);
    }
    assert(await page.waitFor('!!window.TT', { timeout: 240000 }));
    await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
    await sleep(500);

    const phase = await page.evaluate(MATCH_BOOT, 300000);
    assert.equal(phase, 'prep', `Expected prep phase in ${tag}, got ${phase}`);
    await moveOffscreen(page);

    await page.evaluate(`import('/tools/camera-rig.js').then((m) => { window.CamRig = m.install(); return true; })`);
    if (!summary.backend) {
      summary.backend = await page.evaluate('window.TT?.renderer?.backend?.constructor?.name || CamRig.renderer()');
    }

    for (const [sceneName, sceneCode] of SCENES) {
      for (const [lightName, timeArg, rainArg] of LIGHTS) {
        const pre = SETUP_TEMPLATE.replace(/__RAIN__/g, rainArg) + sceneCode + '\nT.flightHold(false);';
        const req = {
          target: 'player',
          yaw: 65,
          pitch: 18,
          dist: 2.7,
          lookY: -0.5,
          size: [960, 720],
          aspect: 960 / 720,
          time: timeArg,
          pre,
          caption: ''
        };
        const aimRes = await page.evaluate(`CamRig.aim(${JSON.stringify(req)})`, 120000);
        const fn = `${tag}-${sceneName}-${lightName}.png`;
        const absRev = path.join(OUT_SHOTS, fn);
        await page.screenshot(absRev);
        const buf = fs.readFileSync(absRev);
        assert(buf.length > 15000, `Screenshot ${fn} too small (${buf.length})`);
        writeSafe(path.join(OUT_QA, fn), buf);
        writeSafe(path.join(OUT_CLAUDE, fn), buf);

        if (lightName === 'noon') {
          const poseInfo = await page.evaluate(`(() => {
            const T = window.TT, P = T.player;
            const m = P.children && P.children.find((c) => c.userData && c.userData.turn) || P.getObjectByProperty?.('type', 'Group');
            let ud = null;
            P.traverse((o) => { if (!ud && o.userData && (o.userData.feet || o.userData.turn)) ud = o.userData; });
            return {
              playerPos: [+P.position.x.toFixed(3), +P.position.y.toFixed(3), +P.position.z.toFixed(3)],
              feet: ud?.feet ? { lift: +(ud.feet.lift || 0).toFixed(3), f0: ud.feet[0] == null ? null : +ud.feet[0].toFixed(3), f1: ud.feet[1] == null ? null : +ud.feet[1].toFixed(3) } : null,
              turn: ud?.turn ? { active: !!ud.turn.active, feet: ud.turn.feet?.map((v) => +v.toFixed(3)) } : null
            };
          })()`);
          summary.poses[`${tag}:${sceneName}`] = { cam: aimRes.cam, ...poseInfo };
        }
        summary.shots[`${tag}-${sceneName}-${lightName}`] = { file: `review/CC-343b/shots/${fn}`, bytes: buf.length };
      }
      console.log(`Captured ${tag} :: ${sceneName} (4 lights)`);
    }

    await page.close().catch(() => {});
  } finally {
    await browser.close().catch(() => {});
  }
}

async function main() {
  const summary = {
    card: 'CC-343b',
    capturedAt: new Date().toISOString(),
    backend: null,
    poses: {},
    shots: {},
    pageErrors: [],
    gpuWarnings: []
  };

  const serverB = await startBeforeServer(ROOT);
  try {
    await runIsolatedPass(serverB.origin, 'b', summary);
  } finally {
    await serverB.close();
  }

  const serverA = await serve(ROOT, 0);
  try {
    await runIsolatedPass(serverA.origin, 'a', summary);
  } finally {
    await serverA.close();
  }

  assert.equal(summary.pageErrors.length, 0, `Page errors: ${summary.pageErrors.join('; ')}`);
  assert.equal(summary.gpuWarnings.length, 0, `GPU warnings: ${summary.gpuWarnings.join('; ')}`);

  const sumBuf = Buffer.from(JSON.stringify(summary, null, 2), 'utf8');
  writeSafe(path.join(OUT_REV, 'cc343b-summary.json'), sumBuf);
  console.log(JSON.stringify({
    ok: true,
    backend: summary.backend,
    shotCount: Object.keys(summary.shots).length,
    pageErrors: summary.pageErrors.length
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
