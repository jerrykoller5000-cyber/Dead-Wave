// qa/2026-10-31-AG-167/run-ag167.mjs
// GPU investigation for AG-167 / CL-282 (Jerry J30):
// Find the sphere-like artifact between the marine's feet in the Training Ground and at the HQ.
// Checks 3 states (standing, walking, aiming) from 3 angles + live 3P view.
// Walks the scene to list all meshes within 0.8 m of his feet.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const AGENT = 'antigravity';
const TASK = 'AG-167';
const OUT_DIR = path.join(ROOT, 'qa', '2026-10-31-AG-167');
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

async function camReload(port, mode) {
  console.log(`Reloading camera into mode: ${mode}...`);
  const res = await post(port, { cmd: 'reload', mode }, 300000);
  if (!res.ok) throw new Error(`Reload failed: ${res.error || JSON.stringify(res)}`);
  console.log(`Reload response: ${res.status}`);
  return res.status;
}

const SCENE_WALK_PROBE = `
return (() => {
  const player = T.player;
  const marine = T.worldMarine;
  const scene = T.scene;
  const THREE = T.THREE;

  let ankleL = new THREE.Vector3();
  let ankleR = new THREE.Vector3();
  if (marine && marine.userData.ankleLG) marine.userData.ankleLG.getWorldPosition(ankleL);
  else ankleL.copy(player.position).add(new THREE.Vector3(-0.15, 0.05, 0));

  if (marine && marine.userData.ankleRG) marine.userData.ankleRG.getWorldPosition(ankleR);
  else ankleR.copy(player.position).add(new THREE.Vector3(0.15, 0.05, 0));

  const feetCenter = new THREE.Vector3().addVectors(ankleL, ankleR).multiplyScalar(0.5);

  const found = [];
  const tempV = new THREE.Vector3();
  const tempBox = new THREE.Box3();
  const maxDist = 0.8;

  scene.traverse((obj) => {
    if (!obj.isMesh && !obj.isSkinnedMesh && !obj.isInstancedMesh && !obj.isSprite && !obj.isLine && !obj.isPoints) {
      return;
    }

    const parentChain = [];
    let curr = obj.parent;
    while (curr) {
      parentChain.push(curr.name || curr.type || 'Object3D');
      curr = curr.parent;
    }

    obj.getWorldPosition(tempV);
    const distToCenter = tempV.distanceTo(feetCenter);
    const distToL = tempV.distanceTo(ankleL);
    const distToR = tempV.distanceTo(ankleR);

    let boxMinDist = Infinity;
    try {
      tempBox.setFromObject(obj);
      if (!tempBox.isEmpty()) {
        boxMinDist = tempBox.distanceToPoint(feetCenter);
      }
    } catch (_) {}

    const matchingInstances = [];
    if (obj.isInstancedMesh) {
      const mat4 = new THREE.Matrix4();
      const instPos = new THREE.Vector3();
      const count = obj.count || (obj.instanceMatrix && obj.instanceMatrix.count) || 0;
      for (let i = 0; i < count; i++) {
        obj.getMatrixAt(i, mat4);
        mat4.premultiply(obj.matrixWorld);
        instPos.setFromMatrixPosition(mat4);
        const instDist = instPos.distanceTo(feetCenter);
        if (instDist <= maxDist) {
          matchingInstances.push({
            index: i,
            worldPosition: { x: +instPos.x.toFixed(4), y: +instPos.y.toFixed(4), z: +instPos.z.toFixed(4) },
            distanceToCenter: +instDist.toFixed(4)
          });
        }
      }
    }

    const isClose = (distToCenter <= maxDist) || (boxMinDist <= maxDist) || (matchingInstances.length > 0);

    if (isClose) {
      const geo = obj.geometry;
      let geoInfo = null;
      if (geo) {
        geoInfo = {
          type: geo.type,
          vertexCount: geo.attributes?.position?.count,
          parameters: geo.parameters || null,
          boundingSphereRadius: geo.boundingSphere ? +geo.boundingSphere.radius.toFixed(4) : null
        };
      }

      const mat = obj.material;
      let matInfo = null;
      if (mat) {
        const m = Array.isArray(mat) ? mat[0] : mat;
        matInfo = {
          type: m.type,
          name: m.name || null,
          color: m.color ? '#' + m.color.getHexString() : null,
          transparent: !!m.transparent,
          opacity: m.opacity,
          visible: m.visible !== false,
          depthWrite: m.depthWrite
        };
      }

      found.push({
        name: obj.name || '(unnamed)',
        type: obj.type,
        visible: obj.visible,
        worldPosition: { x: +tempV.x.toFixed(4), y: +tempV.y.toFixed(4), z: +tempV.z.toFixed(4) },
        distToCenter: +distToCenter.toFixed(4),
        distToL: +distToL.toFixed(4),
        distToR: +distToR.toFixed(4),
        boxMinDist: Number.isFinite(boxMinDist) ? +boxMinDist.toFixed(4) : null,
        parentChain: parentChain.join(' > '),
        geometry: geoInfo,
        material: matInfo,
        isInstanced: !!obj.isInstancedMesh,
        matchingInstances: matchingInstances.length ? matchingInstances : undefined,
        renderOrder: obj.renderOrder,
        castShadow: obj.castShadow,
        receiveShadow: obj.receiveShadow,
        userDataKeys: Object.keys(obj.userData || {})
      });
    }
  });

  // Explicit check of suspects:
  const suspects = {};

  // Suspect 1: CL-280 motes
  const motesInstList = [];
  scene.traverse((o) => {
    if (o.name === 'motes-instanced') {
      motesInstList.push({
        name: o.name,
        visible: o.visible,
        count: o.count,
        parent: o.parent?.name || o.parent?.type
      });
    }
  });
  suspects.motesInstanced = motesInstList;

  // Suspect 2: CL-280 debris
  const debrisList = [];
  scene.traverse((o) => {
    if (o.name === 'debris-chunks') {
      debrisList.push({
        name: o.name,
        visible: o.visible,
        count: o.count,
        parent: o.parent?.name || o.parent?.type
      });
    }
  });
  suspects.debrisChunks = debrisList;

  // Suspect 3: Ground fire disc
  const groundFireList = [];
  scene.traverse((o) => {
    if (o.name?.includes('ground-fire') || o.geometry?.type === 'CircleGeometry' || o.geometry?.type === 'RingGeometry') {
      groundFireList.push({
        name: o.name,
        type: o.type,
        visible: o.visible,
        parent: o.parent?.name || o.parent?.type
      });
    }
  });
  suspects.groundFire = groundFireList;

  // Suspect 4: Marine shadow proxy
  if (T.marineShadowDbg) {
    const sdbg = T.marineShadowDbg(true);
    suspects.marineShadow = {
      builds: sdbg.builds,
      proxyAttached: !!sdbg.proxy,
      proxyVisible: sdbg.proxy ? sdbg.proxy.visible : false,
      proxyName: sdbg.proxy ? sdbg.proxy.name : null,
      bones: sdbg.bones,
      verts: sdbg.verts
    };
  }

  return {
    playerPos: { x: +player.position.x.toFixed(4), y: +player.position.y.toFixed(4), z: +player.position.z.toFixed(4) },
    feetCenter: { x: +feetCenter.x.toFixed(4), y: +feetCenter.y.toFixed(4), z: +feetCenter.z.toFixed(4) },
    ankleL: { x: +ankleL.x.toFixed(4), y: +ankleL.y.toFixed(4), z: +ankleL.z.toFixed(4) },
    ankleR: { x: +ankleR.x.toFixed(4), y: +ankleR.y.toFixed(4), z: +ankleR.z.toFixed(4) },
    meshCount: found.length,
    meshes: found,
    suspects
  };
})()
`;

async function runSessionProbe(port, locPrefix) {
  console.log(`\n======================================================`);
  console.log(`Starting Probe for Location: ${locPrefix.toUpperCase()}`);
  console.log(`======================================================`);

  // Force third person
  await camEval(port, `
    T.setViewFirstDbg(false);
    T.setZoomHeldDbg(false);
    if (T.setHp) T.setHp(100000);
    if (T.clearZombies) T.clearZombies();
    return 1;
  `);

  const results = {};

  const stances = [
    { key: 'standing', label: 'Standing (Idle)' },
    { key: 'walking', label: 'Walking' },
    { key: 'aiming', label: 'Aiming (ADS)' },
  ];

  for (const stance of stances) {
    console.log(`\n--- Stance: ${stance.label} [${locPrefix}-${stance.key}] ---`);

    // Setup stance state
    if (stance.key === 'standing') {
      await camEval(port, `
        window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
        T.setZoomHeldDbg(false);
        T.setViewFirstDbg(false);
        return 1;
      `);
      await sleep(300);
    } else if (stance.key === 'walking') {
      await camEval(port, `
        T.setZoomHeldDbg(false);
        T.setViewFirstDbg(false);
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
        return 1;
      `);
      await sleep(500); // let walk animation settle
    } else if (stance.key === 'aiming') {
      await camEval(port, `
        window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
        T.setZoomHeldDbg(true);
        T.setViewFirstDbg(false);
        return 1;
      `);
      await sleep(500); // let aim ADS transition settle
    }

    // Run Scene Walk Probe at this frame
    console.log(`Running scene walk within 0.8 m of feet...`);
    const probe = await camEval(port, SCENE_WALK_PROBE);
    results[stance.key] = probe;
    console.log(`Found ${probe.meshCount} meshes near feet (feetCenter: [${probe.feetCenter.x}, ${probe.feetCenter.y}, ${probe.feetCenter.z}])`);

    // Log mesh details
    for (const m of probe.meshes) {
      console.log(`  - [${m.type}] "${m.name}" dist: ${m.distToCenter}m (boxMin: ${m.boxMinDist}m), vis: ${m.visible}, geo: ${m.geometry?.type}, mat: ${m.material?.type} ${m.material?.color || ''}, inst: ${m.isInstanced}`);
      if (m.matchingInstances) {
        console.log(`    -> ${m.matchingInstances.length} instances within 0.8m! First: idx ${m.matchingInstances[0].index} at dist ${m.matchingInstances[0].distanceToCenter}m`);
      }
    }

    // Capture shots from 3 angles + live view
    // 1. Calculate camera angles from current feetCenter and facing yaw
    const camCalc = await camEval(port, `
      return (() => {
        const player = T.player;
        const marine = T.worldMarine;
        const THREE = T.THREE;
        let ankleL = new THREE.Vector3();
        let ankleR = new THREE.Vector3();
        if (marine && marine.userData.ankleLG) marine.userData.ankleLG.getWorldPosition(ankleL);
        else ankleL.copy(player.position).add(new THREE.Vector3(-0.15, 0.05, 0));
        if (marine && marine.userData.ankleRG) marine.userData.ankleRG.getWorldPosition(ankleR);
        else ankleR.copy(player.position).add(new THREE.Vector3(0.15, 0.05, 0));
        const center = new THREE.Vector3().addVectors(ankleL, ankleR).multiplyScalar(0.5);

        const yaw = player.rotation.y;
        const dirX = Math.sin(yaw), dirZ = Math.cos(yaw);
        const rightX = Math.cos(yaw), rightZ = -Math.sin(yaw);

        const tx = center.x, ty = center.y + 0.12, tz = center.z;

        return {
          tx, ty, tz,
          front: { x: tx + dirX * 1.4, y: ty + 0.35, z: tz + dirZ * 1.4, tx, ty, tz, fov: 35 },
          side:  { x: tx + rightX * 1.4, y: ty + 0.35, z: tz + rightZ * 1.4, tx, ty, tz, fov: 35 },
          rear3: { x: tx - dirX * 1.8 + rightX * 0.6, y: ty + 1.1, z: tz - dirZ * 1.8 + rightZ * 0.6, tx, ty, tz, fov: 40 }
        };
      })()
    `);

    const shotConfigs = [
      { view: 'front', cam: camCalc.front, live: false },
      { view: 'side',  cam: camCalc.side,  live: false },
      { view: 'rear3', cam: camCalc.rear3, live: false },
      { view: 'live',  live: true },
    ];

    for (const sc of shotConfigs) {
      const shotFile = path.join(SHOTS_DIR, `${locPrefix}-${stance.key}-${sc.view}.png`);
      console.log(`Capturing shot: ${path.basename(shotFile)}...`);

      const shotReq = {
        out: shotFile,
        size: '1280x720',
      };
      if (sc.live) {
        shotReq.live = true;
      } else {
        shotReq.cam = sc.cam;
      }

      await camShot(port, shotReq);
      console.log(`  Saved: ${shotFile} (${fs.statSync(shotFile).size} bytes)`);
    }

    // Clean up stance
    if (stance.key === 'walking') {
      await camEval(port, `window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' })); return 1;`);
      await sleep(200);
    } else if (stance.key === 'aiming') {
      await camEval(port, `T.setZoomHeldDbg(false); return 1;`);
      await sleep(200);
    }
  }

  // Release camera view back to default
  await camEval(port, `T.setShotView(null); return 1;`);
  return results;
}

async function main() {
  console.log('=== AG-167 The Sphere Between His Feet Suite ===');
  console.log(`Root: ${ROOT}`);
  console.log(`Destination: ${OUT_DIR}`);

  // 1. Start camera in --training mode
  let session = await getSession();
  if (!session) {
    console.log('Starting camera server with --training...');
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

  // Ensure we are in training mode
  if (session.mode !== 'training') {
    await camReload(port, 'training');
  }

  // 2. Run Training Ground Probes
  const tgResults = await runSessionProbe(port, 'tg');
  const tgJsonPath = path.join(OUT_DIR, 'probe-training.json');
  fs.writeFileSync(tgJsonPath, JSON.stringify(tgResults, null, 2));
  console.log(`Saved Training Ground probe results to: ${tgJsonPath}`);

  // 3. Switch to Match (FOB HQ) mode
  console.log('\nSwitching to Match (HQ) mode...');
  await camReload(port, 'match');

  // Let match deploy and land at HQ
  await sleep(1000);

  // 4. Run HQ Probes
  const hqResults = await runSessionProbe(port, 'hq');
  const hqJsonPath = path.join(OUT_DIR, 'probe-hq.json');
  fs.writeFileSync(hqJsonPath, JSON.stringify(hqResults, null, 2));
  console.log(`Saved HQ probe results to: ${hqJsonPath}`);

  // 5. Save Master Summary
  const summary = {
    task: 'AG-167',
    date: new Date().toISOString(),
    training: tgResults,
    hq: hqResults,
  };
  const summaryPath = path.join(OUT_DIR, 'probe-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`Saved Master Summary to: ${summaryPath}`);

  // 6. Stop camera cleanly
  console.log('\nShutting down camera server...');
  execFileSync(process.execPath, [
    'tools/camera.mjs',
    'stop',
    '--agent', AGENT,
    '--task', TASK,
  ], { cwd: ROOT, stdio: 'inherit' });

  // 7. Generate Contact Sheet
  console.log('\nGenerating contact sheet with Python...');
  execFileSync('python', [path.join(OUT_DIR, 'build-sheet.py')], { cwd: ROOT, stdio: 'inherit' });

  console.log('\n=== AG-167 GPU Probe Completed Cleanly ===');
}

main().catch((err) => {
  console.error('Fatal error in run-ag167:', err);
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
