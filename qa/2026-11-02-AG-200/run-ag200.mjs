// qa/2026-11-02-AG-200/run-ag200.mjs
// GPU audit for AG-200 / J52 (Jerry: "In training ground there appears to be a sphere or a ball in-between player's feet. It is some sort of artifact.")
// Tests from his launcher (index.html?solid=1), Training Ground, 1P and 3P, standing, walking, aiming.
// Traverses Three.js scene to list every mesh within 0.8 m of his feet.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_DIR = path.resolve(ROOT, 'qa/2026-11-02-AG-200');
const SHOTS_DIR = path.join(OUT_DIR, 'shots');
fs.mkdirSync(SHOTS_DIR, { recursive: true });

async function main() {
  const server = await serve(ROOT, 0);
  const url = `${server.origin}/index.html?solid=1&debug=1&raf=timer`;
  console.log('[AG-200] Booting real browser from Jerry\'s launcher on:', url);

  const browser = await launch({
    headless: false,
    args: ['--window-position=-2400,-2400', '--window-size=1920,1080']
  });

  try {
    const page = await browser.newPage({ width: 1920, height: 1080 });
    await page.goto(url, { timeout: 120000 });
    if (!(await page.waitFor('!!window.TT', { timeout: 180000 }))) {
      throw new Error('no TT: ' + (page.errors[0] || ''));
    }
    await page.evaluate(`(() => {
      if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting();
      else if (window.DWOpening && typeof DWOpening.skip === 'function') DWOpening.skip();
    })()`);
    await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });

    const lib = fs.readFileSync(path.join(ROOT, 'tools', 'tests', 'lib.js'), 'utf8');
    await page.evaluate(lib);

    // Start match and enter Training Ground
    await page.evaluate(`(async () => {
      const T = window.TT;
      await startMatch(T, 'JERRY');
      T.clearZombies && T.clearZombies();
      T.setHp(1e5);
      T.grantAllWeapons();
      T.trainingDbg.enter();
      for (let i = 0; i < 40; i++) T.stepFrame(1 / 60);
      return 1;
    })()`, 180000);

    // Install scene walk probe helper
    await page.evaluate(`(() => {
      const T = window.TT;
      const THREE = T.THREE;

      window.__ag200 = {
        scanFeetMeshes(maxDist = 0.8) {
          const player = T.player;
          const marine = T.worldMarine;
          const scene = T.scene;

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
                    worldPosition: [+instPos.x.toFixed(4), +instPos.y.toFixed(4), +instPos.z.toFixed(4)],
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
                worldPosition: [+tempV.x.toFixed(4), +tempV.y.toFixed(4), +tempV.z.toFixed(4)],
                distToCenter: +distToCenter.toFixed(4),
                distToL: +distToL.toFixed(4),
                distToR: +distToR.toFixed(4),
                boxMinDist: Number.isFinite(boxMinDist) ? +boxMinDist.toFixed(4) : null,
                parentChain: parentChain.join(' > '),
                geometry: geoInfo,
                material: matInfo,
                isInstanced: !!obj.isInstancedMesh,
                matchingInstances: matchingInstances.length ? matchingInstances : undefined,
                renderOrder: obj.renderOrder
              });
            }
          });

          // Check specific suspects
          const suspects = {};

          // 1. Marine idle props (spark, lighter, pack, cig)
          const idleProps = [];
          scene.traverse((o) => {
            if (o.name && (o.name.includes('idle') || o.name.includes('spark') || o.name.includes('lighter') || o.name.includes('cigarette'))) {
              idleProps.push({
                name: o.name,
                visible: o.visible,
                parent: o.parent?.name || o.parent?.type,
                type: o.type,
                geo: o.geometry?.type,
                pos: o.position ? [+o.position.x.toFixed(4), +o.position.y.toFixed(4), +o.position.z.toFixed(4)] : null
              });
            }
          });
          suspects.idleProps = idleProps;

          // 2. Motes instanced
          const motes = [];
          scene.traverse((o) => {
            if (o.name === 'motes-instanced') {
              motes.push({ name: o.name, visible: o.visible, count: o.count, parent: o.parent?.name || o.parent?.type });
            }
          });
          suspects.motesInstanced = motes;

          // 3. Debris chunks
          const debris = [];
          scene.traverse((o) => {
            if (o.name === 'debris-chunks') {
              debris.push({ name: o.name, visible: o.visible, count: o.count, parent: o.parent?.name || o.parent?.type });
            }
          });
          suspects.debrisChunks = debris;

          // 4. Rig grenades instanced mesh
          const rigGrenades = [];
          scene.traverse((o) => {
            if (o.name && o.name.includes('grenade')) {
              rigGrenades.push({
                name: o.name,
                type: o.type,
                visible: o.visible,
                count: o.count,
                parent: o.parent?.name || o.parent?.type,
                pos: o.position ? [+o.position.x.toFixed(4), +o.position.y.toFixed(4), +o.position.z.toFixed(4)] : null
              });
            }
          });
          suspects.rigGrenades = rigGrenades;

          return {
            playerPos: [+player.position.x.toFixed(4), +player.position.y.toFixed(4), +player.position.z.toFixed(4)],
            feetCenter: [+feetCenter.x.toFixed(4), +feetCenter.y.toFixed(4), +feetCenter.z.toFixed(4)],
            ankleL: [+ankleL.x.toFixed(4), +ankleL.y.toFixed(4), +ankleL.z.toFixed(4)],
            ankleR: [+ankleR.x.toFixed(4), +ankleR.y.toFixed(4), +ankleR.z.toFixed(4)],
            meshCount: found.length,
            meshes: found,
            suspects
          };
        },

        setupPose(view, stance) {
          T.flightHold(false);
          if (T.isUnarmed()) T.toggleHolster();
          T.setViewFirstDbg(view === '1p');
          T.setZoomHeldDbg(stance === 'aiming');

          if (stance === 'standing') {
            T.flightInput({ keys: [], zoom: false, fire: false });
            T.setVelDbg(0, 0);
          } else if (stance === 'walking') {
            T.flightInput({ keys: ['KeyW'], zoom: false, fire: false });
          } else if (stance === 'aiming') {
            T.flightInput({ keys: [], zoom: true, fire: false });
          }

          // Step frames to settle animation
          for (let i = 0; i < 45; i++) T.stepFrame(1 / 60);
          if (view === '1p') {
            for (let i = 0; i < 60; i++) {
              if (T.fpDbg().first && T.fpDbg().w >= 0.99) break;
              T.stepFrame(1 / 60);
            }
          }
          return 1;
        },

        setCameraInspection(mode) {
          const P = T.player.position;
          if (mode === 'feet-low-front') {
            T.camera.position.set(P.x, P.y + 0.22, P.z + 0.75);
            T.camera.lookAt(P.x, P.y + 0.05, P.z);
          } else if (mode === 'feet-low-side') {
            T.camera.position.set(P.x + 0.75, P.y + 0.22, P.z);
            T.camera.lookAt(P.x, P.y + 0.05, P.z);
          } else if (mode === 'feet-rear-down') {
            T.camera.position.set(P.x, P.y + 1.10, P.z - 0.70);
            T.camera.lookAt(P.x, P.y + 0.05, P.z);
          }
          T.camera.updateMatrixWorld(true);
          T.stepFrame(0);
        }
      };
      return 1;
    })()`);

    const report = {
      auditedAt: new Date().toISOString(),
      views: {},
      sphereMeshesFound: []
    };

    const views = ['3p', '1p'];
    const stances = ['standing', 'walking', 'aiming'];
    const angles = ['player-view', 'feet-low-front', 'feet-low-side', 'feet-rear-down'];

    for (const view of views) {
      report.views[view] = {};
      for (const stance of stances) {
        console.log(`[AG-200] Auditing view=${view} stance=${stance}...`);
        await page.evaluate(`window.__ag200.setupPose(${JSON.stringify(view)}, ${JSON.stringify(stance)})`);

        // Scan scene graph
        const scan = await page.evaluate(`window.__ag200.scanFeetMeshes(0.8)`);
        report.views[view][stance] = scan;

        // Check for sphere geometries
        for (const m of scan.meshes) {
          const isSphere = m.geometry?.type === 'SphereGeometry' || m.geometry?.type === 'IcosahedronGeometry';
          if (isSphere) {
            report.sphereMeshesFound.push({
              view,
              stance,
              name: m.name,
              parentChain: m.parentChain,
              geometry: m.geometry,
              material: m.material,
              visible: m.visible,
              worldPosition: m.worldPosition,
              distToCenter: m.distToCenter
            });
            console.log(`[AG-200] !!! SPHERE DETECTED: name="${m.name}" parent="${m.parentChain}" dist=${m.distToCenter}m geo=${JSON.stringify(m.geometry)} mat=${JSON.stringify(m.material)}`);
          }
        }

        // Capture screenshots for player view and feet inspection angles
        for (const angle of angles) {
          if (angle !== 'player-view') {
            await page.evaluate(`window.__ag200.setCameraInspection(${JSON.stringify(angle)})`);
          } else {
            // Restore normal player camera view
            await page.evaluate(`window.__ag200.setupPose(${JSON.stringify(view)}, ${JSON.stringify(stance)})`);
          }

          const shot = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
          const shotName = `${view}-${stance}-${angle}.png`;
          fs.writeFileSync(path.join(SHOTS_DIR, shotName), Buffer.from(shot.data, 'base64'));
        }
      }
    }

    fs.writeFileSync(path.join(OUT_DIR, 'probe.json'), JSON.stringify(report, null, 2), 'utf8');
    console.log('[AG-200] Audit complete. Saved probe.json and screenshots.');
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((err) => {
  console.error('[AG-200] Fatal error:', err);
  process.exit(1);
});
