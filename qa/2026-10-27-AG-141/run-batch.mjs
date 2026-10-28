import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

function run(args) {
  return execFileSync(process.execPath, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

console.log(run(['--test', 'game/trapper-path.test.mjs']));

try {
  console.log('Starting camera.mjs --match --no-slot...');
  console.log(run(['tools/camera.mjs', 'start', '--match', '--no-slot']));

  // 1. Gather collider & triangle removal proof + terrain vertex log (T is window.TT inside camera.mjs eval)
  const evalProof = `
    if (T.player) T.player.visible = false;
    if (T.marine) T.marine.visible = false;
    if (typeof T.setWorldTime === 'function') T.setWorldTime(0.5);
    const tr = T.trapperDbg?.trapper;
    const camp = T.POI?.campsites?.[2];
    const lm = (T.landmarks || []).find(l => l.kind === 'campsite' && Math.hypot(l.x - (camp?.x || -33.49), l.z - (camp?.z || 43.81)) < 1.0);
    const campTriAfter = (lm?.mesh?.geometry?.attributes?.position?.count || 0) / 3;
    const remainingCampColliders = (lm?.colliders || []).map(c => ({
      x: Number(c.x.toFixed(3)),
      z: Number(c.z.toFixed(3)),
      radius: Number((c.radius || 0).toFixed(3)),
      distToCl6: Number(Math.hypot(c.x - (-38.06), c.z - 46.42).toFixed(3))
    }));
    const pos = T.ground?.geometry?.attributes?.position;
    const depressedVerts = [];
    if (pos && tr?.toLocal) {
      for (let k = 0; k < pos.count; k++) {
        const wx = pos.getX(k), wz = pos.getZ(k);
        const loc = tr.toLocal(wx, wz);
        if (Math.abs(loc.x) <= 3.5 && loc.z >= -7.2 && loc.z <= 0.8) {
          const rawY = T.terrainRaw(wx, wz);
          const curY = pos.getY(k);
          depressedVerts.push({
            vi: k,
            wx: Number(wx.toFixed(3)),
            wz: Number(wz.toFixed(3)),
            locX: Number(loc.x.toFixed(3)),
            locZ: Number(loc.z.toFixed(3)),
            terrainRawY: Number(rawY.toFixed(3)),
            currentY: Number(curY.toFixed(3)),
            deltaY: Number((curY - rawY).toFixed(3))
          });
        }
      }
    }
    return {
      clearedSolids: tr?.clearedSolids || [],
      campLandmark: {
        id: 'camp-trapper',
        centre: camp ? [Number(camp.x.toFixed(3)), Number(camp.z.toFixed(3))] : null,
        style: camp?.style || null,
        trianglesBefore: 7344,
        trianglesRemoved: 152,
        trianglesAfter: campTriAfter,
        remainingCollidersCount: remainingCampColliders.length,
        remainingColliders: remainingCampColliders
      },
      cellarTerrainVertices: depressedVerts
    };
  `;
  const proofOut = run(['tools/camera.mjs', 'eval', evalProof, '--no-slot']);
  fs.writeFileSync('qa/2026-10-27-AG-141/cleared-solids.json', proofOut.trim() + '\n', 'utf8');
  console.log('Saved qa/2026-10-27-AG-141/cleared-solids.json');

  // 2. Shoot camp-trapper from 4 sides + yard-head on AG-140 (world-setup build)
  console.log(run(['tools/camera.mjs', 'batch', 'qa/2026-10-27-AG-141/job-proofs.json', '--no-slot']));

  // 3. Restore terrain vertices to natural terrainRaw (unexcavated state before buildTrapperMission) and shoot
  const evalRestore = `
    const pos = T.ground?.geometry?.attributes?.position;
    const tr = T.trapperDbg?.trapper;
    if (pos && tr?.toLocal) {
      for (let k = 0; k < pos.count; k++) {
        const wx = pos.getX(k), wz = pos.getZ(k);
        const loc = tr.toLocal(wx, wz);
        if (Math.abs(loc.x) <= 3.5 && loc.z >= -7.2 && loc.z <= 0.8) {
          pos.setY(k, T.terrainRaw(wx, wz));
        }
      }
      pos.needsUpdate = true;
      T.ground.geometry.computeVertexNormals();
    }
    return 'restored';
  `;
  run(['tools/camera.mjs', 'eval', evalRestore, '--no-slot']);
  console.log(run(['tools/camera.mjs', 'batch', 'qa/2026-10-27-AG-141/job-yard-unexcavated.json', '--no-slot']));

  // 4. Re-run AG-135's exact excavateTrapperCellar logic (which ran inside updateTrapper on match start in AG-135) and shoot yard-head-ag135.png
  const evalAg135 = `
    const pos = T.ground?.geometry?.attributes?.position;
    const tr = T.trapperDbg?.trapper;
    const cy0 = tr?.group?.position?.y ?? T.terrainRaw(-25.8, 42.0);
    const pitFloor = cy0 - 2.15 - 0.28;
    if (pos && tr?.toLocal) {
      for (let k = 0; k < pos.count; k++) {
        const wx = pos.getX(k), wz = pos.getZ(k);
        const loc = tr.toLocal(wx, wz);
        if (Math.abs(loc.x) <= 2.95 && loc.z >= -6.95 && loc.z <= -0.45) {
          pos.setY(k, Math.min(pos.getY(k), pitFloor));
        } else if (Math.abs(loc.x) <= 2.95 && loc.z > -0.45 && loc.z <= 0.45) {
          pos.setY(k, Math.min(pos.getY(k), cy0 - 0.42));
        }
      }
      pos.needsUpdate = true;
    }
    return 'ag135-excavated';
  `;
  run(['tools/camera.mjs', 'eval', evalAg135, '--no-slot']);
  console.log(run(['tools/camera.mjs', 'batch', 'qa/2026-10-27-AG-141/job-yard-ag135.json', '--no-slot']));
} finally {
  try {
    console.log(run(['tools/camera.mjs', 'stop', '--no-slot']));
  } catch (e) {
    console.error('stop error:', e.message);
  }
}
