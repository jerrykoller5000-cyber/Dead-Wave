// qa/2026-10-31-AG-164/run-ag164.mjs
// Baseline GPU capture for CL-281 (J14, J15):
// Every weapon at the hip, aimed, mid-reload in first person (akimbo too) and third person.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const AGENT = 'antigravity';
const TASK = 'AG-164';
const OUT_DIR = path.join(ROOT, 'qa', '2026-10-31-AG-164');
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

function post(port, body, timeout = 120000) {
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

async function camEval(port, code) {
  const res = await post(port, { cmd: 'eval', code });
  if (!res.ok) throw new Error(`Eval failed: ${res.error}`);
  return res.value;
}

async function camShot(port, options) {
  const res = await post(port, { cmd: 'shot', ...options });
  if (!res.ok) throw new Error(`Shot failed: ${res.error || JSON.stringify(res)}`);
  return res.shots?.[0];
}

const BASE_WEAPONS = [
  { id: 'minigun', name: 'Minigun', label: 'Minigun' },
  { id: 'm4', name: 'GW-4 Carbine', label: 'GW-4 / M4' },
  { id: 'ak', name: 'AK Assault Rifle', label: 'AK-47' },
  { id: 'pistol', name: 'M9 Service Pistol', label: 'Pistol' },
  { id: 'uzi', name: 'Wasp SMG', label: 'Wasp / Uzi' },
  { id: 'shotgun', name: 'Pump Shotgun', label: 'Shotgun' },
  { id: 'aa12', name: 'Breacher-12 Shotgun', label: 'Breacher-12 / AA-12' },
  { id: 'revolver', name: 'Magnum Revolver', label: 'Revolver' },
  { id: 'sniper', name: 'Sniper Rifle', label: 'Sniper' },
  { id: 'launcher', name: 'Grenade Launcher', label: 'Launcher' },
  { id: 'flamer', name: 'Flamethrower', label: 'Flamethrower' },
  { id: 'chainsaw', name: 'Chainsaw', label: 'Chainsaw' },
];

const AKIMBO_WEAPONS = [
  { id: 'pistol', name: 'Akimbo Pistols', label: 'Pistol Akimbo', key: 'pistol-akimbo' },
  { id: 'uzi', name: 'Akimbo Wasp SMGs', label: 'Wasp Akimbo', key: 'uzi-akimbo' },
  { id: 'revolver', name: 'Akimbo Revolvers', label: 'Revolver Akimbo', key: 'revolver-akimbo' },
];

async function main() {
  console.log('=== AG-164 First Person Weapon Baseline Suite ===');
  console.log(`Working directory: ${ROOT}`);
  console.log(`Shots destination: ${SHOTS_DIR}`);

  // 1. Start the camera if not already up
  let session = await getSession();
  if (!session) {
    console.log('Launching camera in --match mode...');
    execFileSync(process.execPath, [
      'tools/camera.mjs',
      'start',
      '--match',
      '--agent', AGENT,
      '--task', TASK,
    ], { cwd: ROOT, stdio: 'inherit' });

    session = await getSession();
    if (!session) throw new Error('Camera failed to start session');
  }

  const port = session.port;
  console.log(`Camera active on port ${port} (${session.mode}, ${session.renderer})`);

  // 2. Initialize match state
  console.log('Setting up game state for clean weapon captures...');
  await camEval(port, `
    T.grantAllWeapons();
    T.setHp(100000);
    if (T.clearZombies) T.clearZombies();
    if (T.setWorldTime) T.setWorldTime(0.5);
    if (T.isUnarmed && T.isUnarmed()) T.toggleHolster();
    if (T.setFirstPersonFov) T.setFirstPersonFov(65);
    T.reloadClipDbg.hold(null);
    T.setZoomHeldDbg(false);
    T.setViewFirstDbg(false);
    if (T.akimboDbg && T.akimboDbg.carry() >= 0.5) T.toggleDualWieldDbg();
    return 1;
  `);

  await sleep(500);

  const manifest = [];

  // 3. Process base weapons
  for (const weapon of BASE_WEAPONS) {
    const w = weapon.id;
    console.log(`\n--- Capturing Base Weapon: ${weapon.name} (${w}) ---`);

    // Ensure single weapon, armed, akimbo off
    await camEval(port, `
      if (T.akimboDbg && T.akimboDbg.carry() >= 0.5) T.toggleDualWieldDbg();
      T.setWeapon(T.WEAPON_ORDER.indexOf('${w}'));
      T.reloadClipDbg.hold(null);
      T.setZoomHeldDbg(false);
      return 1;
    `);
    await sleep(250);

    // (A) First Person Hip
    console.log(`  [1/4] ${w} FP Hip`);
    await camEval(port, `
      if (T.setShotView) T.setShotView(null);
      T.setViewFirstDbg(true);
      T.setZoomHeldDbg(false);
      T.reloadClipDbg.hold(null);
      return 1;
    `);
    await sleep(350);
    const fpHipPath = `qa/2026-10-31-AG-164/shots/${w}-fp-hip.png`;
    await camShot(port, {
      live: true,
      caption: `${weapon.label} - FP Hip`,
      out: fpHipPath,
    });
    manifest.push({ weapon: w, name: weapon.name, type: 'base', state: 'fp-hip', file: fpHipPath });

    // (B) First Person Aim (ADS)
    console.log(`  [2/4] ${w} FP Aim (ADS)`);
    await camEval(port, `
      if (T.setShotView) T.setShotView(null);
      T.setViewFirstDbg(true);
      T.setZoomHeldDbg(true);
      T.reloadClipDbg.hold(null);
      const t0 = Date.now();
      while (T.fpDbg().ads < 0.98 && Date.now() - t0 < 2500) {
        await wait(50);
      }
      return T.fpDbg().ads;
    `);
    await sleep(250);
    const fpAimPath = `qa/2026-10-31-AG-164/shots/${w}-fp-aim.png`;
    await camShot(port, {
      live: true,
      caption: `${weapon.label} - FP Aim (ADS)`,
      out: fpAimPath,
    });
    manifest.push({ weapon: w, name: weapon.name, type: 'base', state: 'fp-aim', file: fpAimPath });

    // (C) First Person Mid-Reload
    console.log(`  [3/4] ${w} FP Mid-Reload`);
    await camEval(port, `
      if (T.setShotView) T.setShotView(null);
      T.setViewFirstDbg(true);
      T.setZoomHeldDbg(false);
      T.setAmmoDbg('${w}', 0);
      try { T.startReload(); } catch(e){}
      try { T.reloadClipDbg.hold(0.5); } catch(e){}
      return 1;
    `);
    await sleep(300);
    const fpReloadPath = `qa/2026-10-31-AG-164/shots/${w}-fp-reload.png`;
    await camShot(port, {
      live: true,
      caption: `${weapon.label} - FP Mid-Reload`,
      out: fpReloadPath,
    });
    manifest.push({ weapon: w, name: weapon.name, type: 'base', state: 'fp-reload', file: fpReloadPath });

    // Reset reload hold before TP
    await camEval(port, `
      T.reloadClipDbg.hold(null);
      return 1;
    `);

    // (D) Third Person
    console.log(`  [4/4] ${w} Third Person`);
    await camEval(port, `
      T.setViewFirstDbg(false);
      T.setZoomHeldDbg(false);
      return 1;
    `);
    await sleep(300);
    const tpPath = `qa/2026-10-31-AG-164/shots/${w}-tp.png`;
    await camShot(port, {
      target: 'player',
      yaw: 55,
      dist: 2.6,
      caption: `${weapon.label} - Third Person`,
      out: tpPath,
    });
    manifest.push({ weapon: w, name: weapon.name, type: 'base', state: 'tp', file: tpPath });
  }

  // 4. Process akimbo weapons
  for (const akimbo of AKIMBO_WEAPONS) {
    const w = akimbo.id;
    const k = akimbo.key;
    console.log(`\n--- Capturing Akimbo Weapon: ${akimbo.name} (${k}) ---`);

    await camEval(port, `
      T.setWeapon(T.WEAPON_ORDER.indexOf('${w}'));
      T.setDualOwnedDbg('${w}', true);
      if (T.akimboDbg.carry() < 0.5) T.toggleDualWieldDbg();
      T.reloadClipDbg.hold(null);
      T.setZoomHeldDbg(false);
      return 1;
    `);
    await sleep(250);

    // (A) Akimbo FP Hip
    console.log(`  [1/4] ${k} FP Hip`);
    await camEval(port, `
      if (T.setShotView) T.setShotView(null);
      T.setViewFirstDbg(true);
      T.setZoomHeldDbg(false);
      T.reloadClipDbg.hold(null);
      return 1;
    `);
    await sleep(350);
    const fpHipPath = `qa/2026-10-31-AG-164/shots/${k}-fp-hip.png`;
    await camShot(port, {
      live: true,
      caption: `${akimbo.label} - FP Hip`,
      out: fpHipPath,
    });
    manifest.push({ weapon: k, name: akimbo.name, type: 'akimbo', state: 'fp-hip', file: fpHipPath });

    // (B) Akimbo FP Aim
    console.log(`  [2/4] ${k} FP Aim`);
    await camEval(port, `
      if (T.setShotView) T.setShotView(null);
      T.setViewFirstDbg(true);
      T.setZoomHeldDbg(true);
      T.reloadClipDbg.hold(null);
      await wait(400);
      return 1;
    `);
    await sleep(200);
    const fpAimPath = `qa/2026-10-31-AG-164/shots/${k}-fp-aim.png`;
    await camShot(port, {
      live: true,
      caption: `${akimbo.label} - FP Aim`,
      out: fpAimPath,
    });
    manifest.push({ weapon: k, name: akimbo.name, type: 'akimbo', state: 'fp-aim', file: fpAimPath });

    // (C) Akimbo FP Mid-Reload
    console.log(`  [3/4] ${k} FP Mid-Reload`);
    await camEval(port, `
      if (T.setShotView) T.setShotView(null);
      T.setViewFirstDbg(true);
      T.setZoomHeldDbg(false);
      T.setAmmoDbg('${w}', 0);
      try { T.startReload(); } catch(e){}
      try { T.reloadClipDbg.hold(0.5); } catch(e){}
      return 1;
    `);
    await sleep(300);
    const fpReloadPath = `qa/2026-10-31-AG-164/shots/${k}-fp-reload.png`;
    await camShot(port, {
      live: true,
      caption: `${akimbo.label} - FP Mid-Reload`,
      out: fpReloadPath,
    });
    manifest.push({ weapon: k, name: akimbo.name, type: 'akimbo', state: 'fp-reload', file: fpReloadPath });

    // Reset reload hold before TP
    await camEval(port, `
      T.reloadClipDbg.hold(null);
      return 1;
    `);

    // (D) Akimbo Third Person
    console.log(`  [4/4] ${k} Third Person`);
    await camEval(port, `
      T.setViewFirstDbg(false);
      T.setZoomHeldDbg(false);
      return 1;
    `);
    await sleep(300);
    const tpPath = `qa/2026-10-31-AG-164/shots/${k}-tp.png`;
    await camShot(port, {
      target: 'player',
      yaw: 55,
      dist: 2.6,
      caption: `${akimbo.label} - Third Person`,
      out: tpPath,
    });
    manifest.push({ weapon: k, name: akimbo.name, type: 'akimbo', state: 'tp', file: tpPath });

    // Turn akimbo back off
    await camEval(port, `
      if (T.akimboDbg && T.akimboDbg.carry() >= 0.5) T.toggleDualWieldDbg();
      return 1;
    `);
  }

  // 5. Save manifest
  const manifestPath = path.join(OUT_DIR, 'shots-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\nManifest written to ${manifestPath} (${manifest.length} captures)`);

  // 6. Stop camera cleanly
  console.log('Shutting down camera and releasing test slot...');
  execFileSync(process.execPath, [
    'tools/camera.mjs',
    'stop',
    '--agent', AGENT,
    '--task', TASK,
  ], { cwd: ROOT, stdio: 'inherit' });

  console.log('=== All 60 Weapon State Captures Completed Cleanly ===');
}

main().catch((err) => {
  console.error('Fatal error in run-ag164:', err);
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
