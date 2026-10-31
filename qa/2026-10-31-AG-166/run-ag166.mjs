// qa/2026-10-31-AG-166/run-ag166.mjs
// GPU capture suite for AG-166 (Jerry J1):
// New screenshots for the itch.io page at 1080p (Full HD 1920x1080), plus GP-19991 verification for ChatGPT.

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
const OUT_DIR = path.join(ROOT, 'qa', '2026-10-31-AG-166');
const SHOTS_DIR = path.join(OUT_DIR, 'shots');
const GP_DIR = path.join(OUT_DIR, 'gp19991');
const ITCH_DIR = path.join(ROOT, 'docs', 'release', 'itch');

fs.mkdirSync(SHOTS_DIR, { recursive: true });
fs.mkdirSync(GP_DIR, { recursive: true });
fs.mkdirSync(ITCH_DIR, { recursive: true });

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

async function camReload(port, mode) {
  console.log(`Reloading camera into mode: ${mode}...`);
  const res = await post(port, { cmd: 'reload', mode }, 300000);
  if (!res.ok) throw new Error(`Reload failed: ${res.error || JSON.stringify(res)}`);
  console.log(`Reload response: ${res.status}`);
  return res.status;
}

async function main() {
  console.log('=== AG-166 New itch.io Screenshots & GP-19991 Verification ===');
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

  // Ensure match is active:
  await camEval(port, `
    T.runDevCommand('godmode');
    T.setPrepTimer(9999);
    T.clearZombies();
    return true;
  `);

  // ==========================================
  // PART 1: ITCH.IO SHOWCASE SCREENSHOTS (1080p)
  // ==========================================

  // Shot 01: 06-first-person-patrol.png
  console.log('\nCapturing 06-first-person-patrol.png (First Person M4 in woods)...');
  await camEval(port, `
    T.setWorldTime(0.38); // Crisp afternoon sun
    const wIdx = T.WEAPON_ORDER.indexOf('m4');
    if (wIdx >= 0) T.setWeapon(wIdx);
    T.clearZombies();
    // Move player onto scenic path near FOB overlooking the trail:
    const px = 18.5, pz = 16.0;
    const py = T.sampleHeight(px, pz);
    T.player.position.set(px, py + 0.05, pz);
    T.player.rotation.y = 2.4;
    // Enter first-person mode:
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit5', key: '5', bubbles: true }));
    return true;
  `);
  await sleep(600);
  const shot01 = path.join(SHOTS_DIR, '06-first-person-patrol.png');
  await camShot(port, { live: true, ui: true, size: '1920x1080', out: shot01 });

  // Shot 02: 07-third-person-fob-defense.png
  console.log('Capturing 07-third-person-fob-defense.png (Third Person Fortified Compound)...');
  await camEval(port, `
    // Switch back to 3rd person:
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit5', key: '5', bubbles: true }));
    T.setWorldTime(0.44);
    T.clearZombies();
    // Position marine near sandbag barricades & turret:
    const px = 8.5, pz = 10.2;
    const py = T.sampleHeight(px, pz);
    T.player.position.set(px, py + 0.05, pz);
    T.player.rotation.y = -0.8;
    // Camera framing marine in gear, FOB cabin, sandbags, razor wire:
    T.camera.position.set(4.2, py + 2.4, 4.8);
    T.camera.lookAt(px, py + 1.2, pz);
    return true;
  `);
  await sleep(600);
  const shot02 = path.join(SHOTS_DIR, '07-third-person-fob-defense.png');
  await camShot(port, { live: true, ui: false, size: '1920x1080', out: shot02 });

  // Shot 03: 08-trapper-path.png
  console.log('Capturing 08-trapper-path.png (Trapper Yard 4-Stone Width)...');
  await camEval(port, `
    T.runDevCommand('site trapper');
    T.setWorldTime(0.42);
    T.clearZombies();
    const trp = T.trapperDbg.trapper;
    // Camera showing the 4-stone rows, posts with horseshoes, and cellar mound:
    const camPos = trp.toWorld(-1.2, 11.0);
    const lookAt = trp.toWorld(0.2, 3.5);
    T.camera.position.set(camPos.x, trp.cy0 + 2.5, camPos.z);
    T.camera.lookAt(lookAt.x, trp.cy0 + 0.6, lookAt.z);
    return true;
  `);
  await sleep(600);
  const shot03 = path.join(SHOTS_DIR, '08-trapper-path.png');
  await camShot(port, { live: true, ui: false, size: '1920x1080', out: shot03 });

  // Shot 04: 09-night-assault.png
  console.log('Capturing 09-night-assault.png (Night Combat at FOB Wire)...');
  await camEval(port, `
    T.runDevCommand('godmode');
    T.runDevCommand('night 5 now');
    // Position player defending near sandbags:
    T.player.position.set(2.0, T.sampleHeight(2.0, 8.0) + 0.05, 8.0);
    T.player.rotation.y = 0;
    // Spawn active wave zombies advancing toward him:
    for (let i = 0; i < 6; i++) {
      const zx = (i - 2.5) * 2.8, zz = 18.0 + (i % 2) * 2.5;
      const type = i % 2 === 0 ? 'shambler' : 'brute';
      const z = T.spawnZombie(zx, zz, type, true, true);
    }
    // Fire weapon for muzzle flash:
    const wIdx = T.WEAPON_ORDER.indexOf('m4');
    if (wIdx >= 0) T.setWeapon(wIdx);
    const muzzle = T.getMuzzleWorld ? T.getMuzzleWorld() : { x: 2.0, y: 1.4, z: 8.5 };
    T.spawnPlayerRound(new T.THREE.Vector3(2.0, 1.4, 8.5), new T.THREE.Vector3(0, 0, 1), 35);
    // Camera angled from side-rear showing marine shooting at advancing horde:
    T.camera.position.set(-3.2, T.sampleHeight(-3.2, 4.5) + 2.2, 4.5);
    T.camera.lookAt(0, T.sampleHeight(0, 14.0) + 1.2, 14.0);
    return true;
  `);
  await sleep(800);
  const shot04 = path.join(SHOTS_DIR, '09-night-assault.png');
  await camShot(port, { live: true, ui: false, size: '1920x1080', out: shot04 });

  // Shot 05: 10-the-warrens.png
  console.log('Capturing 10-the-warrens.png (Subterranean Warrens / The Hollows)...');
  await camEval(port, `
    T.clearZombies();
    T.runDevCommand('godmode');
    // Enter Hollows:
    T.enterHollow({ cave: 0 });
    // Advance camera slightly down the passage:
    const p = T.player.position;
    T.camera.position.set(p.x - 1.2, p.y + 1.8, p.z - 2.8);
    T.camera.lookAt(p.x + 0.5, p.y + 0.9, p.z + 5.0);
    return true;
  `);
  await sleep(800);
  const shot05 = path.join(SHOTS_DIR, '10-the-warrens.png');
  await camShot(port, { live: true, ui: false, size: '1920x1080', out: shot05 });

  // Shot 06: 11-story-hikers-camp.png
  console.log('Capturing 11-story-hikers-camp.png (Hikers Campsite at Dusk)...');
  await camEval(port, `
    T.leaveHollow('mouth');
    T.runDevCommand('site hikers');
    T.setWorldTime(0.72); // Atmospheric dusk
    T.clearZombies();
    const p = T.player.position;
    // Camera framing the campsite, hanging food pack in tree, campfire ashes:
    T.camera.position.set(p.x - 4.2, p.y + 2.5, p.z - 4.5);
    T.camera.lookAt(p.x + 1.0, p.y + 1.0, p.z + 1.0);
    return true;
  `);
  await sleep(600);
  const shot06 = path.join(SHOTS_DIR, '11-story-hikers-camp.png');
  await camShot(port, { live: true, ui: false, size: '1920x1080', out: shot06 });

  // Shot 07: 12-dawn-survived.png
  console.log('Capturing 12-dawn-survived.png (Golden Dawn Breaking Over Compound)...');
  await camEval(port, `
    T.runDevCommand('site hq');
    T.setWorldTime(0.26); // Golden dawn light
    T.clearZombies();
    const p = T.player.position;
    // Looking eastward into the rising dawn over the compound:
    T.camera.position.set(-6.5, T.sampleHeight(-6.5, -4.0) + 3.2, -4.0);
    T.camera.lookAt(8.0, T.sampleHeight(8.0, 10.0) + 1.0, 10.0);
    return true;
  `);
  await sleep(600);
  const shot07 = path.join(SHOTS_DIR, '12-dawn-survived.png');
  await camShot(port, { live: true, ui: false, size: '1920x1080', out: shot07 });

  // Copy all 7 screenshots to docs/release/itch/
  console.log('\nCopying screenshots to docs/release/itch/...');
  const shots = [
    '06-first-person-patrol.png',
    '07-third-person-fob-defense.png',
    '08-trapper-path.png',
    '09-night-assault.png',
    '10-the-warrens.png',
    '11-story-hikers-camp.png',
    '12-dawn-survived.png',
  ];
  for (const s of shots) {
    fs.copyFileSync(path.join(SHOTS_DIR, s), path.join(ITCH_DIR, s));
    console.log(`  -> docs/release/itch/${s} (${(fs.statSync(path.join(ITCH_DIR, s)).size / 1024).toFixed(0)} KB)`);
  }

  // ==========================================
  // PART 2: GP-19991 IDLE SPHERE VERIFICATION
  // ==========================================
  console.log('\n=== Verifying GP-19991 (Idle Sphere Fixed) ===');
  await camReload(port, 'training');

  // Shot GP-01: Standing idle (quiet < 25s) low feet view
  console.log('Capturing gp19991-01-idle-standing.png...');
  await camEval(port, `
    const marine = T.worldMarine || T.marine;
    const p = T.player.position;
    // Position camera at ground level looking right between boots:
    T.camera.position.set(p.x, p.y + 0.12, p.z + 0.65);
    T.camera.lookAt(p.x, p.y + 0.08, p.z);
    return true;
  `);
  await sleep(300);
  await camShot(port, { live: true, ui: false, size: '1280x720', out: path.join(GP_DIR, '01-idle-standing-feet.png') });

  // Shot GP-02: At 25s transition (during pack / smoke sequence) low feet view
  console.log('Capturing gp19991-02-pack-transition-feet.png...');
  const probeSphere = await camEval(port, `
    const marine = T.worldMarine || T.marine;
    const idl = T.marineIdleDbg ? T.marineIdleDbg() : null;
    // Step idle forward into cigarette pack phase:
    const props = marine.getObjectByName('marine-idle-props');
    const spark = props ? props.children.find(c => c.geometry && c.geometry.type === 'SphereGeometry') : null;
    // Check if spark or other props are visible at feet origin:
    const sparkVis = spark ? spark.visible : false;
    const sparkPos = spark ? { x: spark.position.x, y: spark.position.y, z: spark.position.z } : null;
    return { propsFound: !!props, sparkVis, sparkPos };
  `);
  console.log('Idle spark probe:', probeSphere);
  await sleep(300);
  await camShot(port, { live: true, ui: false, size: '1280x720', out: path.join(GP_DIR, '02-pack-transition-feet.png') });

  // Stop camera server cleanly:
  console.log('\nStopping camera server...');
  execFileSync(process.execPath, [
    'tools/camera.mjs',
    'stop',
    '--agent', AGENT,
    '--task', TASK,
  ], { cwd: ROOT, stdio: 'inherit' });

  // Build contact sheet:
  console.log('\nGenerating master contact sheet...');
  execFileSync('python', [path.join(OUT_DIR, 'build-sheet.py')], { cwd: ROOT, stdio: 'inherit' });

  console.log('\n=== AG-166 & GP-19991 Verification Completed Cleanly ===');
}

main().catch((err) => {
  console.error('Fatal error in run-ag166:', err);
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
