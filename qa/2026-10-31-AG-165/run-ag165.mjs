// qa/2026-10-31-AG-165/run-ag165.mjs
// GPU verification for AG-165 (Jerry J45):
// The trapper's path, sealed and wider (4 stones wide, 32 stones total, sealed cellar back-half).

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const AGENT = 'antigravity';
const TASK = 'AG-165';
const OUT_DIR = path.join(ROOT, 'qa', '2026-10-31-AG-165');
const SHOTS_DIR = path.join(OUT_DIR, 'shots');

fs.mkdirSync(SHOTS_DIR, { recursive: true });

function cameraSessionFiles(root = ROOT) {
  const normalized = process.platform === 'win32' ? path.resolve(root).toLowerCase() : path.resolve(root);
  const key = crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 16);
  return {
    session: path.join(os.tmpdir(), 'dead-wave-camera-' + key + '.json'),
    log: path.join(os.tmpdir(), 'dead-wave-camera-' + key + '.log'),
  };
}

const { session: SESSION_FILE } = cameraSessionFiles();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getSession() {
  try {
    const data = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
    if (path.resolve(data.root).toLowerCase() !== ROOT.toLowerCase()) return null;
    return data;
  } catch {
    return null;
  }
}

function post(port, body, timeout = 180000) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        method: 'POST',
        path: '/',
        headers: { 'content-type': 'application/json' },
        timeout,
      },
      (res) => {
        let d = '';
        res.on('data', (c) => { d += c; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(d));
          } catch (e) {
            reject(new Error(`Failed to parse response: ${d.slice(0, 200)}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy(new Error(`Request timed out after ${timeout / 1000}s`));
    });
    req.end(JSON.stringify(body));
  });
}

async function camEval(port, code, timeout = 120000) {
  const res = await post(port, { cmd: 'eval', code }, timeout);
  if (!res.ok) throw new Error(`Eval failed: ${res.error}`);
  return res.value;
}

async function camShot(port, options) {
  const res = await post(port, { cmd: 'shot', ...options });
  if (!res.ok) throw new Error(`Shot failed: ${res.error || JSON.stringify(res)}`);
  return res.shots?.[0];
}

async function main() {
  console.log('=== AG-165 Trapper\'s Path Wider & Sealed Back-Half Suite ===');
  console.log(`Root: ${ROOT}`);
  console.log(`Out:  ${OUT_DIR}`);

  // 1. Ensure camera is started in --match mode:
  let session = await getSession();
  if (!session) {
    console.log('Starting camera server with --match...');
    execFileSync(process.execPath, [
      'tools/camera.mjs',
      'start',
      '--match',
      '--agent', AGENT,
      '--task', TASK,
    ], { cwd: ROOT, stdio: 'inherit' });

    session = await getSession();
    if (!session) throw new Error('Failed to start camera session');
  }

  const port = session.port;
  console.log(`Camera connected on port ${port} (${session.mode}, ${session.renderer})`);

  // 2. Run t268 test inside the match:
  console.log('\nLoading tools/tests/lib.js in browser...');
  const libCode = fs.readFileSync(path.join(ROOT, 'tools', 'tests', 'lib.js'), 'utf8');
  await camEval(port, libCode);

  console.log('Running tools/tests/t268.js in browser...');
  const t268Code = fs.readFileSync(path.join(ROOT, 'tools', 'tests', 't268.js'), 'utf8');
  const t268Result = await camEval(port, 'return await (' + t268Code + ');', 180000);
  console.log('--- t268 Output ---');
  console.log(t268Result);
  console.log('-------------------');
  fs.writeFileSync(path.join(OUT_DIR, 't268-output.txt'), String(t268Result), 'utf8');

  if (!t268Result || String(t268Result).includes('FAIL')) {
    throw new Error('t268 test failed! Check t268-output.txt');
  }
  console.log('t268: ALL ASSERTIONS PASSED!\n');

  // 3. Set lighting and clear zombies for crisp visual shots:
  await camEval(port, `
    T.setWorldTime(0.42); // afternoon sun
    T.clearZombies();
    T.runDevCommand('godmode');
    T.setPrepTimer(9999);
    return true;
  `);

  // Shot 01: Trapper gate entrance looking along the 4-stone rows
  console.log('Capturing 01-trapper-gate.png...');
  await camEval(port, `
    T.runDevCommand('site trapper');
    T.clearZombies();
    const trp = T.trapperDbg.trapper;
    const p = T.player.position;
    const camPos = trp.toWorld(0, 11.2);
    const lookAt = trp.toWorld(0, 4.0);
    T.camera.position.set(camPos.x, trp.cy0 + 2.1, camPos.z);
    T.camera.lookAt(lookAt.x, trp.cy0 + 0.8, lookAt.z);
    return true;
  `);
  await sleep(300);
  await camShot(port, {
    live: true,
    ui: false,
    size: '1280x720',
    out: path.join(SHOTS_DIR, '01-trapper-gate.png'),
  });

  // Shot 02: Overhead view showing 4 stones across all 8 rows (32 stones total)
  console.log('Capturing 02-trapper-overhead-rows.png...');
  await camEval(port, `
    const trp = T.trapperDbg.trapper;
    const camPos = trp.toWorld(0, 10.5);
    const lookAt = trp.toWorld(0, 4.5);
    T.camera.position.set(camPos.x, trp.cy0 + 6.2, camPos.z);
    T.camera.lookAt(lookAt.x, trp.cy0 + 0.1, lookAt.z);
    return true;
  `);
  await sleep(300);
  await camShot(port, {
    live: true,
    ui: false,
    size: '1280x720',
    out: path.join(SHOTS_DIR, '02-trapper-overhead-rows.png'),
  });

  // Shot 03: Cellar back half sealed enclosure (continuous fence, posts, brambles, colliders)
  console.log('Capturing 03-cellar-back-sealed.png...');
  await camEval(port, `
    const trp = T.trapperDbg.trapper;
    // Stand behind the cellar mound looking +Z:
    const camPos = trp.toWorld(3.2, -7.8);
    const lookAt = trp.toWorld(0, -3.2);
    T.camera.position.set(camPos.x, trp.cy0 + 2.8, camPos.z);
    T.camera.lookAt(lookAt.x, trp.cy0 + 0.6, lookAt.z);
    return true;
  `);
  await sleep(300);
  await camShot(port, {
    live: true,
    ui: false,
    size: '1280x720',
    out: path.join(SHOTS_DIR, '03-cellar-back-sealed.png'),
  });

  // Shot 04: Rear clipping blocked (player in woods behind cellar stopped by perimeter fence colliders)
  console.log('Capturing 04-rear-clipping-blocked.png...');
  await camEval(port, `
    const trp = T.trapperDbg.trapper;
    // Place player right outside the rear perimeter fence attempting to walk towards cellar doors:
    const pW = trp.toWorld(0, -6.1);
    const pY = T.sampleHeight(pW.x, pW.z);
    T.player.position.set(pW.x, pY + 0.05, pW.z);
    // Camera looking across player and the fence boundary:
    const camPos = trp.toWorld(-2.8, -7.2);
    T.camera.position.set(camPos.x, trp.cy0 + 2.0, camPos.z);
    T.camera.lookAt(pW.x, pY + 0.9, pW.z);
    return true;
  `);
  await sleep(300);
  await camShot(port, {
    live: true,
    ui: false,
    size: '1280x720',
    out: path.join(SHOTS_DIR, '04-rear-clipping-blocked.png'),
  });

  // Shot 05: Cellar bulkhead doors unlocked and folded open
  console.log('Capturing 05-cellar-doors-open.png...');
  await camEval(port, `
    T.runDevCommand('site trapper unlock');
    const trp = T.trapperDbg.trapper;
    // Camera near Row 7 looking down at the opened cellar doors:
    const camPos = trp.toWorld(0, 2.8);
    const lookAt = trp.toWorld(0, -1.0);
    T.camera.position.set(camPos.x, trp.cy0 + 1.8, camPos.z);
    T.camera.lookAt(lookAt.x, trp.cy0 - 0.4, lookAt.z);
    return true;
  `);
  await sleep(300);
  await camShot(port, {
    live: true,
    ui: false,
    size: '1280x720',
    out: path.join(SHOTS_DIR, '05-cellar-doors-open.png'),
  });

  // Shot 06: Inside the iron-lined subterranean cellar
  console.log('Capturing 06-inside-cellar.png...');
  await camEval(port, `
    T.runDevCommand('site trapper cellar');
    const trp = T.trapperDbg.trapper;
    const cs = trp.cellarSpot;
    // Camera inside the cellar room looking at shelves/bunk:
    const camPos = trp.toWorld(0.8, -2.6);
    const lookAt = trp.toWorld(-1.0, -4.2);
    T.camera.position.set(camPos.x, cs.y + 1.4, camPos.z);
    T.camera.lookAt(lookAt.x, cs.y + 0.8, lookAt.z);
    return true;
  `);
  await sleep(300);
  await camShot(port, {
    live: true,
    ui: false,
    size: '1280x720',
    out: path.join(SHOTS_DIR, '06-inside-cellar.png'),
  });

  // 4. Stop camera server:
  console.log('\nStopping camera server...');
  execFileSync(process.execPath, [
    'tools/camera.mjs',
    'stop',
    '--agent', AGENT,
    '--task', TASK,
  ], { cwd: ROOT, stdio: 'inherit' });

  // 5. Build contact sheet:
  console.log('\nBuilding contact sheet with Python...');
  execFileSync('python', [path.join(OUT_DIR, 'build-sheet.py')], { cwd: ROOT, stdio: 'inherit' });

  console.log('\n=== AG-165 GPU Verification Complete ===');
}

main().catch((err) => {
  console.error('Fatal error in run-ag165:', err);
  try {
    execFileSync(process.execPath, [
      'tools/camera.mjs',
      'stop',
      '--agent', AGENT,
      '--task', TASK,
    ], { cwd: ROOT, stdio: 'inherit' });
  } catch {}
  process.exit(1);
});
