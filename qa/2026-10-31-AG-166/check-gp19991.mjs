// qa/2026-10-31-AG-166/check-gp19991.mjs
// Verification of ChatGPT's GP-19991 fix:
// Idle props (cig, pack, lighter, spark) start hidden; spark sphere no longer appears at marine's feet; spark appears on lighter tip during smoke.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const AGENT = 'antigravity';
const TASK = 'AG-166';
const GP_DIR = path.join(ROOT, 'qa', '2026-10-31-AG-166', 'gp19991');
fs.mkdirSync(GP_DIR, { recursive: true });

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
  console.log('=== GP-19991 Idle Sphere Fix Verification ===');
  console.log(`Root: ${ROOT}`);
  console.log(`GP Out: ${GP_DIR}`);

  // 1. Start camera in --training mode:
  let session = await getSession();
  if (!session) {
    console.log('Starting camera in --training mode...');
    execFileSync(process.execPath, [
      'tools/camera.mjs',
      'start',
      '--training',
      '--agent', AGENT,
      '--task', TASK,
    ], { cwd: ROOT, stdio: 'inherit' });

    session = await getSession();
    if (!session) throw new Error('Failed to start camera session');
  }

  const port = session.port;
  console.log(`Camera connected on port ${port} (${session.mode}, ${session.renderer})`);

  // 2. Audit initial state:
  const audit0 = await camEval(port, `
    const marine = T.worldMarine || T.marine;
    const props = marine.getObjectByName('marine-idle-props');
    if (!props) return { error: 'marine-idle-props not found' };
    const cig = props.children.find(c => c.name === 'cigarette' || (c.children && c.children.length > 0));
    const spark = props.children.find(c => c.geometry && c.geometry.type === 'SphereGeometry');
    const lighter = props.children.find(c => c.geometry && c.geometry.type === 'BoxGeometry' && c.geometry.parameters.height === 0.05);
    return {
      rootVis: props.visible,
      sparkVis: spark ? spark.visible : null,
      lighterVis: lighter ? lighter.visible : null,
      sparkPos: spark ? { x: spark.position.x, y: spark.position.y, z: spark.position.z } : null
    };
  `);
  console.log('Initial Idle Props Audit:', audit0);

  // 3. Low feet view: standing idle
  console.log('Capturing 01-idle-standing-feet.png...');
  await camEval(port, `
    const p = T.player.position;
    T.camera.position.set(p.x, p.y + 0.12, p.z + 0.65);
    T.camera.lookAt(p.x, p.y + 0.08, p.z);
    return true;
  `);
  await sleep(300);
  await camShot(port, { live: true, ui: false, size: '1280x720', out: path.join(GP_DIR, '01-idle-standing-feet.png') });

  // 4. Low feet view: at 25s pack transition
  console.log('Capturing 02-pack-transition-feet.png...');
  const audit25 = await camEval(port, `
    const marine = T.worldMarine || T.marine;
    const idl = T.marineIdleDbg ? T.marineIdleDbg() : null;
    if (idl) {
      idl.quiet = 25.5; // Trigger pack phase
      idl.step(0.016);
    }
    const props = marine.getObjectByName('marine-idle-props');
    const spark = props ? props.children.find(c => c.geometry && c.geometry.type === 'SphereGeometry') : null;
    return {
      propsVis: props ? props.visible : null,
      sparkVis: spark ? spark.visible : null,
    };
  `);
  console.log('Pack transition audit:', audit25);
  await sleep(300);
  await camShot(port, { live: true, ui: false, size: '1280x720', out: path.join(GP_DIR, '02-pack-transition-feet.png') });

  // 5. Chest view: during lighting (t = 3.5s)
  console.log('Capturing 03-lighter-spark.png...');
  await camEval(port, `
    const p = T.player.position;
    T.camera.position.set(p.x - 0.25, p.y + 1.45, p.z + 0.55);
    T.camera.lookAt(p.x, p.y + 1.35, p.z);
    return true;
  `);
  await sleep(300);
  await camShot(port, { live: true, ui: false, size: '1280x720', out: path.join(GP_DIR, '03-lighter-spark.png') });

  // 6. Stop camera cleanly:
  console.log('\nStopping camera...');
  execFileSync(process.execPath, [
    'tools/camera.mjs',
    'stop',
    '--agent', AGENT,
    '--task', TASK,
  ], { cwd: ROOT, stdio: 'inherit' });

  // Save audit log:
  const auditSummary = { audit0, audit25, timestamp: new Date().toISOString() };
  fs.writeFileSync(path.join(GP_DIR, 'audit.json'), JSON.stringify(auditSummary, null, 2));
  console.log('\n=== GP-19991 Verification Complete ===');
}

main().catch((err) => {
  console.error('Fatal error in check-gp19991:', err);
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
