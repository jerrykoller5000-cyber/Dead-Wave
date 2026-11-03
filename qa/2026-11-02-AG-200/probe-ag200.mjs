import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_DIR = path.resolve(ROOT, 'qa/2026-11-02-AG-200');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function run() {
  const server = await serve(ROOT, 0);
  // Load index.html?solid=1&raf=timer with tt_perf_hud=1 in localStorage so we match Play Dead-Wave.bat's URL (?solid=1) while exposing window.TT
  const url = `${server.origin}/index.html?solid=1&raf=timer`;
  console.log('[AG-200] Launching real WebGPU browser on:', url);

  const browser = await launch({
    headless: false,
    args: ['--window-position=-2400,-2400', '--window-size=1920,1080'],
  });

  try {
    const page = await browser.newPage({ width: 1920, height: 1080 });
    await page.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `try { localStorage.setItem('tt_perf_hud', '1'); } catch (_) {}`,
    });
    await page.goto(url, { timeout: 120000 });
    if (!(await page.waitFor('!!window.TT', { timeout: 180000 }))) {
      throw new Error('no TT: ' + (page.errors[0] || ''));
    }
    await page.evaluate(`(() => {
      if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting();
      else if (window.DWOpening && typeof DWOpening.skip === 'function') DWOpening.skip();
    })()`);
    await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });

    const summary = {};

    // Start Training Ground from the launcher's exact entry point (startTraining)
    summary.enterState = await page.evaluate(`(async () => {
      const nameEl = document.getElementById('playerName');
      if (nameEl) nameEl.value = 'Jerry';
      const T = window.TT;
      if (typeof T.trainingDbg.start === 'function') await T.trainingDbg.start();
      if (!T.trainingDbg.state().active) T.trainingDbg.enter();
      T.flightHold(true);
      for (let i = 0; i < 45; i++) T.stepFrame(1 / 60);
      return {
        trainingActive: T.trainingDbg.state().active,
        pos: { x: +T.player.position.x.toFixed(3), y: +T.player.position.y.toFixed(3), z: +T.player.position.z.toFixed(3) },
        unarmed: T.isUnarmed(),
        weapon: T.getCurrentWeapon(),
        viewFirst: T.fpDbg().first,
      };
    })()`, 180000);

    // Install helper in page for comprehensive mesh + vertex + instanced + sphere audit
    await page.evaluate(`(() => {
      window.__ag200Audit = function (poseName) {
        const T = window.TT;
        const THREE = T.THREE;
        const scene = T.scene;
        const camera = T.camera;
        const player = T.player;
        const marine = T.marine;

        scene.updateMatrixWorld(true);
        camera.updateMatrixWorld(true);

        const feetCenter = new THREE.Vector3(player.position.x, player.position.y + 0.05, player.position.z);

        const v = new THREE.Vector3();
        const v2 = new THREE.Vector3();
        const m4 = new THREE.Matrix4();

        const parentChainOf = (o) => {
          const chain = [];
          for (let p = o.parent; p; p = p.parent) {
            chain.push(p.name || p.type);
          }
          return chain.join(' > ');
        };

        const isVisibleChain = (o) => {
          for (let p = o; p; p = p.parent) {
            if (p.visible === false) return false;
          }
          return true;
        };

        const matSummary = (m) => {
          if (!m) return 'none';
          if (Array.isArray(m)) return m.map(matSummary).join('|');
          const col = m.color && typeof m.color.getHexString === 'function' ? '#' + m.color.getHexString() : '';
          const em = m.emissive && typeof m.emissive.getHexString === 'function' && m.emissive.getHex() !== 0 ? ' em:#' + m.emissive.getHexString() : '';
          const op = m.transparent ? ' alpha:' + m.opacity : '';
          return (m.name || m.type) + ' (' + m.type + col + em + op + ')';
        };

        const geoSummary = (g) => {
          if (!g) return 'none';
          const count = g.attributes && g.attributes.position ? g.attributes.position.count : 0;
          const p = g.parameters ? JSON.stringify(g.parameters) : '';
          return g.type + ' (verts:' + count + (p ? ' ' + p : '') + ')';
        };

        const nearFeetMeshes = [];
        const instancedZeroCountDrawn = [];
        const sphereLikeVisible = [];

        scene.traverse((o) => {
          if (!(o.isMesh || o.isSkinnedMesh || o.isInstancedMesh || o.isPoints || o.isLine || o.isSprite)) return;

          const visChain = isVisibleChain(o);
          const layerOk = (o.layers.mask & camera.layers.mask) !== 0;
          const vmHidden = Boolean(o.userData && o.userData.vmEyeHide && T.viewmodelDbg && T.viewmodelDbg() && T.viewmodelDbg().info.active);
          const drawnInMain = visChain && layerOk && !vmHidden && (!o.material || o.material.visible !== false);

          o.getWorldPosition(v);
          const distOrigin = v.distanceTo(feetCenter);

          let minDistVert = Infinity;
          let closestInstIdx = -1;
          let closestInstScale = null;
          const closestVert = new THREE.Vector3();
          const box = new THREE.Box3();

          const posAttr = o.geometry && o.geometry.attributes && o.geometry.attributes.position;
          if (o.isInstancedMesh && posAttr) {
            const effectiveDraws = o.count > 1 ? o.count : 1;
            for (let instIdx = 0; instIdx < Math.min(effectiveDraws, 500); instIdx++) {
              o.getMatrixAt(instIdx, m4);
              m4.premultiply(o.matrixWorld);
              const instOrigin = new THREE.Vector3().setFromMatrixPosition(m4);
              const sx = new THREE.Vector3().setFromMatrixColumn(m4, 0).length();
              const sy = new THREE.Vector3().setFromMatrixColumn(m4, 1).length();
              const sz = new THREE.Vector3().setFromMatrixColumn(m4, 2).length();
              const dInst = instOrigin.distanceTo(feetCenter);
              if (dInst < minDistVert && (sx > 1e-6 || sy > 1e-6 || sz > 1e-6 || instIdx === 0)) {
                minDistVert = dInst;
                closestVert.copy(instOrigin);
                closestInstIdx = instIdx;
                closestInstScale = { x: +sx.toFixed(4), y: +sy.toFixed(4), z: +sz.toFixed(4) };
              }
              if (instIdx === 0 && o.count === 0 && drawnInMain) {
                if (sx > 1e-5 && sy > 1e-5 && sz > 1e-5) {
                  instancedZeroCountDrawn.push({
                    name: o.name || '(unnamed)',
                    parentChain: parentChainOf(o),
                    geometry: geoSummary(o.geometry),
                    material: matSummary(o.material),
                    count: o.count,
                    inst0Pos: { x: +instOrigin.x.toFixed(4), y: +instOrigin.y.toFixed(4), z: +instOrigin.z.toFixed(4) },
                    inst0Scale: { x: +sx.toFixed(4), y: +sy.toFixed(4), z: +sz.toFixed(4) },
                    distToFeet: +dInst.toFixed(4),
                  });
                }
              }
            }
          } else if (o.isSkinnedMesh && posAttr && o.skeleton) {
            const siAttr = o.geometry.attributes.skinIndex;
            const swAttr = o.geometry.attributes.skinWeight;
            const bones = o.skeleton.bones;
            const inverses = o.skeleton.boneInverses;
            const boneMats = bones.map((b, idx) => {
              const bm = new THREE.Matrix4();
              if (b && inverses[idx]) {
                bm.multiplyMatrices(b.matrixWorld, inverses[idx]);
                bm.multiply(o.bindMatrix);
              }
              return bm;
            });
            const step = Math.max(1, Math.floor(posAttr.count / 600));
            for (let i = 0; i < posAttr.count; i += step) {
              v2.fromBufferAttribute(posAttr, i);
              if (siAttr && swAttr) {
                const bIdx = siAttr.getX(i);
                const bw = swAttr.getX(i);
                if (bw > 0 && boneMats[bIdx]) {
                  v2.applyMatrix4(boneMats[bIdx]);
                } else {
                  v2.applyMatrix4(o.matrixWorld);
                }
              } else {
                v2.applyMatrix4(o.matrixWorld);
              }
              box.expandByPoint(v2);
              const d = v2.distanceTo(feetCenter);
              if (d < minDistVert) {
                minDistVert = d;
                closestVert.copy(v2);
              }
            }
          } else if (posAttr) {
            const step = Math.max(1, Math.floor(posAttr.count / 400));
            for (let i = 0; i < posAttr.count; i += step) {
              v2.fromBufferAttribute(posAttr, i).applyMatrix4(o.matrixWorld);
              box.expandByPoint(v2);
              const d = v2.distanceTo(feetCenter);
              if (d < minDistVert) {
                minDistVert = d;
                closestVert.copy(v2);
              }
            }
          }

          const distBox = !box.isEmpty() ? box.distanceToPoint(feetCenter) : minDistVert;
          const minDist = Math.min(distOrigin, distBox, minDistVert);

          if (minDist <= 0.8) {
            nearFeetMeshes.push({
              name: o.name || '(unnamed)',
              type: o.type,
              parentChain: parentChainOf(o),
              geometry: geoSummary(o.geometry),
              material: matSummary(o.material),
              instanced: o.isInstancedMesh ? 'yes (count=' + o.count + ', effectiveDraw=' + (o.count > 1 ? o.count : 1) + (closestInstIdx >= 0 ? ', closestIdx=' + closestInstIdx + ', scale=' + JSON.stringify(closestInstScale) : '') + ')' : 'no',
              visibleProperty: o.visible,
              visibleChain: visChain,
              layersMask: o.layers.mask,
              vmEyeHide: Boolean(o.userData && o.userData.vmEyeHide),
              drawnInMainPass: drawnInMain,
              distOrigin: +distOrigin.toFixed(4),
              distActualVerts: Number.isFinite(minDistVert) ? +minDistVert.toFixed(4) : null,
              distBox: Number.isFinite(distBox) ? +distBox.toFixed(4) : null,
              worldOrigin: { x: +v.x.toFixed(4), y: +v.y.toFixed(4), z: +v.z.toFixed(4) },
              closestVert: Number.isFinite(minDistVert) ? { x: +closestVert.x.toFixed(4), y: +closestVert.y.toFixed(4), z: +closestVert.z.toFixed(4) } : null,
              userDataKeys: Object.keys(o.userData || {}),
            });
          }

          const gType = o.geometry ? o.geometry.type : '';
          if (drawnInMain && (/Sphere|Icosahedron|Dodecahedron|Octahedron|Circle|Ring|Torus/i.test(gType) || minDist <= 0.5)) {
            if (minDist <= 3.0) {
              const targetPt = Number.isFinite(minDistVert) ? closestVert : v;
              const ndc = targetPt.clone().project(camera);
              sphereLikeVisible.push({
                name: o.name || '(unnamed)',
                type: o.type,
                parentChain: parentChainOf(o),
                geometry: geoSummary(o.geometry),
                material: matSummary(o.material),
                instanced: o.isInstancedMesh ? 'yes (count=' + o.count + ')' : 'no',
                distToFeet: +minDist.toFixed(4),
                closestVert: { x: +targetPt.x.toFixed(4), y: +targetPt.y.toFixed(4), z: +targetPt.z.toFixed(4) },
                ndc: { x: +ndc.x.toFixed(3), y: +ndc.y.toFixed(3), z: +ndc.z.toFixed(3) },
              });
            }
          }
        });

        const rigSourcesNearFeet = [];
        if (marine && marine.userData && marine.userData.rigSkin) {
          for (const src of marine.userData.rigSkin.sources) {
            const o = src.o;
            const posAttr = o.geometry && o.geometry.attributes && o.geometry.attributes.position;
            if (!posAttr) continue;
            let minD = Infinity;
            const cV = new THREE.Vector3();
            const box = new THREE.Box3();
            for (let i = 0; i < posAttr.count; i += Math.max(1, Math.floor(posAttr.count / 100))) {
              v2.fromBufferAttribute(posAttr, i).applyMatrix4(o.matrixWorld);
              box.expandByPoint(v2);
              const d = v2.distanceTo(feetCenter);
              if (d < minD) { minD = d; cV.copy(v2); }
            }
            const sz = new THREE.Vector3();
            box.getSize(sz);
            if (minD <= 0.8) {
              rigSourcesNearFeet.push({
                name: o.name || '(unnamed)',
                parentName: o.parent ? (o.parent.name || o.parent.type) : '',
                parentChain: parentChainOf(o),
                baked: src.baked,
                handedBack: marine.userData.rigSkin.out.has(o),
                split: src.split,
                shown: Boolean(src.state[0]),
                geometry: geoSummary(o.geometry),
                material: matSummary(o.material),
                distVerts: +minD.toFixed(4),
                closestVert: { x: +cV.x.toFixed(4), y: +cV.y.toFixed(4), z: +cV.z.toFixed(4) },
                boxSize: { x: +sz.x.toFixed(4), y: +sz.y.toFixed(4), z: +sz.z.toFixed(4) },
              });
            }
          }
        }

        nearFeetMeshes.sort((a, b) => (a.distActualVerts ?? a.distOrigin) - (b.distActualVerts ?? b.distOrigin));
        rigSourcesNearFeet.sort((a, b) => a.distVerts - b.distVerts);

        return {
          poseName,
          feetCenter: { x: +feetCenter.x.toFixed(4), y: +feetCenter.y.toFixed(4), z: +feetCenter.z.toFixed(4) },
          cameraPos: { x: +camera.position.x.toFixed(4), y: +camera.position.y.toFixed(4), z: +camera.position.z.toFixed(4) },
          fpDbg: T.fpDbg(),
          vmActive: Boolean(T.viewmodelDbg && T.viewmodelDbg() && T.viewmodelDbg().info.active),
          nearFeetCount: nearFeetMeshes.length,
          drawnNearFeetCount: nearFeetMeshes.filter((m) => m.drawnInMainPass).length,
          nearFeetMeshes,
          instancedZeroCountDrawn,
          sphereLikeVisible,
          rigSourcesNearFeet,
        };
      };
      return 1;
    })()`);

    async function capturePose(name, expr) {
      const data = await page.evaluate(expr);
      const shot = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 90, captureBeyondViewport: false });
      fs.writeFileSync(path.join(OUT_DIR, `${name}.jpg`), Buffer.from(shot.data, 'base64'));
      return data;
    }

    summary.poses = {};

    // 1. First Person - Unarmed (initial spawn in Training Ground) - Standing looking down at feet
    summary.poses.fp_unarmed_standing_feet = await capturePose('fp-unarmed-standing-feet', `(() => {
      const T = window.TT;
      T.setShotView(null);
      T.setViewFirstDbg(true);
      T.setOtsAimDbg(0, -1.45);
      T.flightInput({ keys: [], zoom: false, fire: false });
      for (let i = 0; i < 45; i++) T.stepFrame(1 / 60);
      return window.__ag200Audit('fp-unarmed-standing-feet');
    })()`);

    // 2. First Person - Pistol Drawn (press U) - Standing looking down at feet
    summary.poses.fp_pistol_standing_feet = await capturePose('fp-pistol-standing-feet', `(() => {
      const T = window.TT;
      if (T.isUnarmed()) T.toggleHolster();
      T.setWeapon(0);
      T.setViewFirstDbg(true);
      T.setOtsAimDbg(0, -1.45);
      T.flightInput({ keys: [], zoom: false, fire: false });
      for (let i = 0; i < 60; i++) T.stepFrame(1 / 60);
      return window.__ag200Audit('fp-pistol-standing-feet');
    })()`);

    // 3. First Person - Pistol Drawn - Walking looking down at feet
    summary.poses.fp_pistol_walking_feet = await capturePose('fp-pistol-walking-feet', `(() => {
      const T = window.TT;
      T.setViewFirstDbg(true);
      T.setOtsAimDbg(0, -1.35);
      T.flightInput({ keys: ['KeyW'], zoom: false, fire: false });
      for (let i = 0; i < 35; i++) T.stepFrame(1 / 60);
      const res = window.__ag200Audit('fp-pistol-walking-feet');
      T.flightInput({ keys: [], zoom: false, fire: false });
      return res;
    })()`);

    // 4. First Person - Pistol Drawn - Aiming (ADS) looking down at feet
    summary.poses.fp_pistol_aiming_feet = await capturePose('fp-pistol-aiming-feet', `(() => {
      const T = window.TT;
      T.setViewFirstDbg(true);
      T.setOtsAimDbg(0, -1.35);
      T.setZoomHeldDbg(true);
      T.flightInput({ keys: [], zoom: true, fire: false });
      for (let i = 0; i < 35; i++) T.stepFrame(1 / 60);
      const res = window.__ag200Audit('fp-pistol-aiming-feet');
      T.setZoomHeldDbg(false);
      return res;
    })()`);

    // 5. Third Person - Standing (low front close-up of feet)
    summary.poses.tp_standing_feet_closeup = await capturePose('tp-standing-feet-closeup', `(() => {
      const T = window.TT;
      T.setViewFirstDbg(false);
      T.setZoomHeldDbg(false);
      T.flightInput({ keys: [], zoom: false, fire: false });
      for (let i = 0; i < 45; i++) T.stepFrame(1 / 60);
      const p = T.player.position;
      T.setShotView({ x: p.x + 0.15, y: p.y + 0.38, z: p.z + 1.45, tx: p.x, ty: p.y + 0.15, tz: p.z, fov: 40 });
      T.stepFrame(1 / 60);
      return window.__ag200Audit('tp-standing-feet-closeup');
    })()`);

    // 6. Third Person - Live 3P Standing
    summary.poses.tp_standing_live = await capturePose('tp-standing-live', `(() => {
      const T = window.TT;
      T.setShotView(null);
      T.setViewFirstDbg(false);
      T.flightInput({ keys: [], zoom: false, fire: false });
      for (let i = 0; i < 20; i++) T.stepFrame(1 / 60);
      return window.__ag200Audit('tp-standing-live');
    })()`);

    // 7. Third Person - Walking (low front close-up of feet)
    summary.poses.tp_walking_feet_closeup = await capturePose('tp-walking-feet-closeup', `(() => {
      const T = window.TT;
      T.setShotView(null);
      T.setViewFirstDbg(false);
      T.flightInput({ keys: ['KeyW'], zoom: false, fire: false });
      for (let i = 0; i < 30; i++) T.stepFrame(1 / 60);
      const p = T.player.position;
      T.setShotView({ x: p.x + 0.15, y: p.y + 0.38, z: p.z + 1.45, tx: p.x, ty: p.y + 0.15, tz: p.z, fov: 40 });
      T.stepFrame(1 / 60);
      const res = window.__ag200Audit('tp-walking-feet-closeup');
      T.flightInput({ keys: [], zoom: false, fire: false });
      T.setShotView(null);
      return res;
    })()`);

    // 8. Third Person - Aiming (low front close-up)
    summary.poses.tp_aiming_feet_closeup = await capturePose('tp-aiming-feet-closeup', `(() => {
      const T = window.TT;
      T.setShotView(null);
      T.setViewFirstDbg(false);
      T.setZoomHeldDbg(true);
      T.flightInput({ keys: [], zoom: true, fire: false });
      for (let i = 0; i < 30; i++) T.stepFrame(1 / 60);
      const p = T.player.position;
      T.setShotView({ x: p.x + 0.15, y: p.y + 0.38, z: p.z + 1.45, tx: p.x, ty: p.y + 0.15, tz: p.z, fov: 40 });
      T.stepFrame(1 / 60);
      const res = window.__ag200Audit('tp-aiming-feet-closeup');
      T.setZoomHeldDbg(false);
      T.setShotView(null);
      return res;
    })()`);

    fs.writeFileSync(path.join(OUT_DIR, 'probe-summary.json'), JSON.stringify(summary, null, 2));
    console.log('[AG-200] Probe complete.');

    const extraPath = path.join(OUT_DIR, 'run-extra-batches.mjs');
    if (fs.existsSync(extraPath)) {
      try {
        console.log('[AG-200] Running batched follow-up checks in same slot session...');
        const extraMod = await import('./run-extra-batches.mjs');
        if (typeof extraMod.runExtraBatches === 'function') {
          await extraMod.runExtraBatches({ page, browser, server, ROOT });
        }
      } catch (extraErr) {
        console.error('[AG-200] Extra batch error (non-fatal to AG-200):', extraErr);
      }
    }
  } finally {
    await browser.close().catch(() => {});
    await server.close().catch(() => {});
  }
}

run().catch((err) => {
  console.error('[AG-200] Fatal error:', err);
  process.exit(1);
});
