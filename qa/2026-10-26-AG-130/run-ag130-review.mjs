import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { Engine } from '../../tools/camera.mjs';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'qa', '2026-10-26-AG-130');
fs.mkdirSync(OUT_DIR, { recursive: true });

// 1. Run the 56 focused Node unit tests
console.log('>>> Running 56 focused Screamer unit/geometry tests...');
const unitRes = spawnSync(
  process.execPath,
  [
    '--test',
    'game/screamer-behavior.test.mjs',
    'studio/zombie-concepts.test.mjs',
    'game/zombie-headshots.test.mjs',
    'studio/zombie-hit-surface.test.mjs',
    'handoffs/GP-19971/skull-clearance.test.mjs'
  ],
  { cwd: ROOT, encoding: 'utf8' }
);
fs.writeFileSync(path.join(OUT_DIR, 'unit.log'), (unitRes.stdout || '') + (unitRes.stderr || ''), 'utf8');
if (unitRes.status !== 0) {
  console.error(unitRes.stdout, unitRes.stderr);
  throw new Error(`Unit tests failed with status ${unitRes.status}`);
}
console.log('>>> 56 focused Node tests passed.');

// 2. Live GPU review in Training Ground on RTX 5080
const engine = new Engine({ training: true, warm: 'none', size: [1280, 720] });
const thumbs = [];
const telemetry = { frames: [] };

try {
  const tOpen0 = Date.now();
  await engine.open();
  telemetry.loadSec = engine.loadSec;
  telemetry.wallOpenSec = +((Date.now() - tOpen0) / 1000).toFixed(2);
  telemetry.renderer = engine.renderer;

  // Set up Training Ground zombie room
  await engine.page.evaluate(`(() => {
    const T = window.TT;
    const r = T.trainingDbg.tg().zombieRoom;
    T.runDevCommand('godmode');
    T.skipGrace();
    T.clearZombies();
    T.flightHold(true);
    T.setShotView(null);
    T.player.position.set((r.minX + r.maxX) / 2, T.trainingDbg.tg().floorY, (r.minZ + r.maxZ) / 2 - 4);
    T.player.rotation.y = 0;
    T.getGearOwned().flashlight = true;
    T.applyGearVisibility();
    for (const code of ['Digit4', 'Digit2']) {
      document.dispatchEvent(new KeyboardEvent('keydown', { code, key: code.at(-1), bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keyup', { code, key: code.at(-1), bubbles: true }));
    }
    if (!T.trainingDbg.lights().on) T.trainingDbg.toggleLights();
    for (let i = 0; i < 60; i++) T.stepFrame(1 / 60);
    const z = T.spawnZombie(T.player.position.x, T.player.position.z + 3.8, 'screamer', true, true);
    z.trainingZ = true;
    z.riseT = 0;
    z.screamCd = 999;
    z.speed = z.baseSpeed = 0;
    z.hp = z.maxHp = 100000;
    z.mesh.rotation.y = Math.PI;
  })()`);

  // Capture sequence:
  // Row 1: Lit room, close 3rd-person three-quarter view (drift, scream peak, exposed flinch, recovery drift)
  // Row 2: Lit room, 1st-person view from marine's eyes (drift, scream peak, exposed flinch, recovery drift)
  // Row 3: Dark room + flashlight, 1st-person view (drift, scream start, scream peak, exposed flinch)
  const captures = [
    // Row 1: Close 3rd-person (lit room)
    { id: 'tp-lit-drift', row: 1, label: '3P Lit: Drift (arms trailing)', lightsOn: true, firstPerson: false, camDist: 2.6, camYaw: 28, camPitch: 10, screamT: 0, exposedT: 0, steps: 45 },
    { id: 'tp-lit-scream', row: 1, label: '3P Lit: Scream 1.2s (arms wide)', lightsOn: true, firstPerson: false, camDist: 2.6, camYaw: 28, camPitch: 10, screamT: 0.6, exposedT: 0, steps: 35 },
    { id: 'tp-lit-exposed', row: 1, label: '3P Lit: Exposed 2.4s (hands at ears)', lightsOn: true, firstPerson: false, camDist: 2.6, camYaw: 28, camPitch: 10, screamT: 0, exposedT: 1.8, steps: 35 },
    { id: 'tp-lit-recover', row: 1, label: '3P Lit: Recovery -> Drift', lightsOn: true, firstPerson: false, camDist: 2.6, camYaw: 28, camPitch: 10, screamT: 0, exposedT: 0, steps: 50 },

    // Row 2: 1st-person (lit room, 3.6 m combat distance)
    { id: 'fp-lit-drift', row: 2, label: '1P Lit (3.6m): Drift + Shield', lightsOn: true, firstPerson: true, zDist: 3.6, screamT: 0, exposedT: 0, steps: 40 },
    { id: 'fp-lit-scream', row: 2, label: '1P Lit (3.6m): Scream Peak', lightsOn: true, firstPerson: true, zDist: 3.6, screamT: 0.55, exposedT: 0, steps: 35 },
    { id: 'fp-lit-exposed', row: 2, label: '1P Lit (3.6m): Exposed Window', lightsOn: true, firstPerson: true, zDist: 3.6, screamT: 0, exposedT: 1.7, steps: 35 },
    { id: 'fp-lit-recover', row: 2, label: '1P Lit (3.6m): Recovery Drift', lightsOn: true, firstPerson: true, zDist: 3.6, screamT: 0, exposedT: 0, steps: 45 },

    // Row 3: 1st-person (dark room + player flashlight, 3.6 m & 2.6 m)
    { id: 'fp-dark-drift', row: 3, label: '1P Night Flashlight (3.6m): Drift', lightsOn: false, firstPerson: true, zDist: 3.6, screamT: 0, exposedT: 0, steps: 40 },
    { id: 'fp-dark-scream', row: 3, label: '1P Night Flashlight (3.6m): Scream', lightsOn: false, firstPerson: true, zDist: 3.6, screamT: 0.55, exposedT: 0, steps: 35 },
    { id: 'fp-dark-exposed', row: 3, label: '1P Night Flashlight (3.6m): Exposed', lightsOn: false, firstPerson: true, zDist: 3.6, screamT: 0, exposedT: 1.7, steps: 35 },
    { id: 'fp-dark-close', row: 3, label: '1P Night Flashlight (2.4m): Face Close', lightsOn: false, firstPerson: true, zDist: 2.4, screamT: 0.55, exposedT: 0, steps: 25 }
  ];

  for (const cap of captures) {
    const res = await engine.page.evaluate(`(async () => {
      const T = window.TT;
      const B = await import('/game/screamer-behavior.js');
      const r = T.trainingDbg.tg().zombieRoom;
      if (T.trainingDbg.lights().on !== ${cap.lightsOn}) T.trainingDbg.toggleLights();
      T.setViewFirstDbg(${cap.firstPerson});
      const z = T.zombies.find((q) => q.alive && q.typeKey === 'screamer');
      z.speed = z.baseSpeed = 0;
      z.screamCd = 999;
      const zDist = ${cap.zDist || 3.8};
      z.mesh.position.set(T.player.position.x, T.trainingDbg.tg().floorY, T.player.position.z + zDist);
      z.mesh.rotation.y = Math.PI;
      for (let f = 0; f < ${cap.steps}; f++) {
        z.screamT = ${cap.screamT};
        z.sonicOpenT = ${cap.exposedT};
        z.screamCd = 999;
        T.stepFrame(1 / 60);
      }
      if (${!cap.firstPerson}) {
        const zp = z.mesh.position;
        const yaw = (${cap.camYaw || 28}) * Math.PI / 180;
        const pitch = (${cap.camPitch || 10}) * Math.PI / 180;
        const dist = ${cap.camDist || 2.6};
        const tx = zp.x, ty = zp.y + 1.18, tz = zp.z;
        T.setShotView({
          x: tx - Math.sin(yaw) * Math.cos(pitch) * dist,
          y: ty + Math.sin(pitch) * dist,
          z: tz - Math.cos(yaw) * Math.cos(pitch) * dist,
          tx, ty, tz, fov: 36
        });
      } else {
        T.setShotView(null);
      }
      for (let f = 0; f < 4; f++) {
        z.screamT = ${cap.screamT};
        z.sonicOpenT = ${cap.exposedT};
        T.stepFrame(1 / 60);
      }
      z.mesh.updateMatrixWorld(true);
      const u = z.mesh.userData;
      const headCenter = u.head.localToWorld(z.mesh.position.clone().set(0, 0.025 * z.scale, 0));
      const start = T.player.position.clone(); start.y += 1.5;
      const end = headCenter.clone().sub(start).normalize().multiplyScalar(0.5).add(headCenter);
      const hit = T.zombieRoundHit(z, start, end);
      const src = T.renderer.domElement;
      const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
      c.getContext('2d').drawImage(src, 0, 0);
      const th = document.createElement('canvas'); th.width = 480; th.height = 270;
      th.getContext('2d').drawImage(c, 0, 0, 480, 270);
      return {
        png: c.toDataURL('image/png').split(',')[1],
        thumb: th.toDataURL('image/jpeg', 0.9).split(',')[1],
        meta: {
          id: ${JSON.stringify(cap.id)},
          label: ${JSON.stringify(cap.label)},
          screamerState: B.screamerState(z),
          armLRot: u.armLG.rotation.toArray().slice(0, 3).map((v) => +v.toFixed(4)),
          armRRot: u.armRG.rotation.toArray().slice(0, 3).map((v) => +v.toFixed(4)),
          headHit: !!(hit && hit.headHit),
          renders: T.renderer.info.render
        }
      };
    })()`);
    fs.writeFileSync(path.join(OUT_DIR, `${cap.id}.png`), Buffer.from(res.png, 'base64'));
    thumbs.push({ data: res.thumb, label: cap.label, row: cap.row });
    telemetry.frames.push(res.meta);
  }

  // 3. Measure 180-frame step timing + 420-frame continuous arm/torso/skull clearance sweep
  const sweep = await engine.page.evaluate(`(async () => {
    const T = window.TT;
    const B = await import('/game/screamer-behavior.js');
    const z = T.zombies.find((q) => q.alive && q.typeKey === 'screamer');
    const u = z.mesh.userData;
    B.restoreScreamerPose(z);
    B.resetScreamer(z);
    z.bob = 0;
    let minSide = Infinity, bodyIntersections = 0, skullIntersections = 0, vertexSamples = 0;
    const pt = z.mesh.position.clone(), headPt = z.mesh.position.clone(), scale = z.scale || 1;
    const t0 = performance.now();
    for (let f = 0; f < 420; f++) {
      B.restoreScreamerPose(z);
      const time = f / 60;
      z.screamT = (time >= 1.0 && time < 2.2) ? (2.2 - time) : 0;
      z.sonicOpenT = (time >= 2.2 && time < 4.6) ? (4.6 - time) : 0;
      B.applyScreamerPose(z, 1 / 60);
      z.mesh.updateMatrixWorld(true);
      const torsoInv = u.torso.matrixWorld.clone().invert();
      const headInv = u.head.matrixWorld.clone().invert();
      for (const [arm, sign] of [[u.armLG, -1], [u.armRG, 1]]) {
        arm.traverse((o) => {
          if (!o.isMesh || o.isSkinnedMesh) return;
          const p = o.geometry.attributes.position;
          const mTorso = torsoInv.clone().multiply(o.matrixWorld);
          const mHead = headInv.clone().multiply(o.matrixWorld);
          for (let i = 0; i < p.count; i++) {
            pt.fromBufferAttribute(p, i).applyMatrix4(mTorso);
            vertexSamples++;
            minSide = Math.min(minSide, pt.x * sign);
            if (Math.abs(pt.x) < 0.18 * scale && Math.abs(pt.z) < 0.11 * scale && pt.y > 0.02 * scale && pt.y < 0.34 * scale) {
              bodyIntersections++;
            }
            headPt.fromBufferAttribute(p, i).applyMatrix4(mHead);
            const nx = headPt.x / (0.105 * scale), ny = (headPt.y - 0.02 * scale) / (0.135 * scale), nz = headPt.z / (0.115 * scale);
            if (nx * nx + ny * ny + nz * nz < 0.92) {
              skullIntersections++;
            }
          }
        });
      }
    }
    const sweepMs = +(performance.now() - t0).toFixed(2);

    // Measure 120 live frames of full game stepFrame in first-person with Screamer active
    T.setShotView(null);
    T.setViewFirstDbg(true);
    const frameTimes = [];
    for (let i = 0; i < 120; i++) {
      const f0 = performance.now();
      z.screamT = (i >= 30 && i < 70) ? 0.6 : 0;
      z.sonicOpenT = (i >= 70 && i < 110) ? 1.7 : 0;
      T.stepFrame(1 / 60);
      frameTimes.push(performance.now() - f0);
    }
    frameTimes.sort((a, b) => a - b);
    const avgMs = +(frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length).toFixed(2);
    const p99Ms = +frameTimes[Math.floor(frameTimes.length * 0.99)].toFixed(2);
    return {
      minSideM: +minSide.toFixed(5),
      bodyIntersections,
      skullIntersections,
      vertexSamples,
      sweepMs,
      liveStepAvgMs: avgMs,
      liveStepP99Ms: p99Ms
    };
  })()`);
  telemetry.sweep = sweep;
  telemetry.pageErrors = engine.page.errors;

  await engine.sheet(thumbs, { cols: 4, tile: 480, sheetFile: path.join(OUT_DIR, 'ag130-screamer-review-sheet.jpg') }, []);
  fs.writeFileSync(path.join(OUT_DIR, 'ag130-telemetry.json'), JSON.stringify(telemetry, null, 2));
  console.log('>>> AG-130 telemetry:', JSON.stringify(telemetry, null, 2));
} finally {
  await engine.close();
}

// 4. Run real-renderer Screamer/skinning tests t270, t108, t119 with --jobs 1
console.log('>>> Running t270, t108, t119...');
const testRes = spawnSync(
  process.execPath,
  ['tools/tests/run-all.mjs', 't270', 't108', 't119', '--agent', 'antigravity', '--task', 'AG-130', '--jobs', '1'],
  { cwd: ROOT, stdio: 'inherit', env: process.env }
);
if (testRes.status !== 0) {
  throw new Error(`t270/t108/t119 failed with status ${testRes.status}`);
}

