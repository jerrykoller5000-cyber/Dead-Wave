// tools/ag-review-runner-ag274.mjs - Antigravity diagnostic review runner for AG-274 / J95
// Investigating Jerry's note J95: The camo that changes size again (M81 5x denser facing HQ vs Range)
// Executed on Jerry's RTX 5080 WebGPU hardware through shared test slot queue.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Use the shared game-test slot: node crew/crew.mjs slot run antigravity AG-275 ...');
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT_DIR_QA274 = path.join(ROOT, 'qa/AG-274');
const OUT_DIR_QA275 = path.join(ROOT, 'qa/AG-275');
fs.mkdirSync(OUT_DIR_QA274, { recursive: true });
fs.mkdirSync(OUT_DIR_QA275, { recursive: true });

function writeFileSyncWithRetry(filePath, data, retries = 20, delay = 250) {
  for (let i = 0; i < retries; i++) {
    try {
      fs.writeFileSync(filePath, data);
      return;
    } catch (e) {
      if (i === retries - 1) throw e;
      try { fs.unlinkSync(filePath); } catch (_) {}
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delay);
    }
  }
}

async function captureShot(page, filename) {
  const isJpg = filename.endsWith('.jpg') || filename.endsWith('.jpeg');
  const params = {
    format: isJpg ? 'jpeg' : 'png',
    captureBeyondViewport: false,
  };
  if (isJpg) params.quality = 95;
  const shot = await page.send('Page.captureScreenshot', params);
  const buf = Buffer.from(shot.data, 'base64');

  const p274 = path.join(OUT_DIR_QA274, filename);
  writeFileSyncWithRetry(p274, buf);

  const p275 = path.join(OUT_DIR_QA275, filename);
  writeFileSyncWithRetry(p275, buf);

  console.log(`[AG-274] Captured: ${filename} (${shot.data.length} bytes)`);
  return p274;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('\n========================================================================');
  console.log('=== [AG-274] J95 Camo Pop Diagnostic on RTX 5080 WebGPU               ===');
  console.log('=== Facing Range vs Facing HQ/CIF (M81 5x Density Investigation)     ===');
  console.log('========================================================================\n');

  const server = await serve(ROOT, 0);
  const url = `${server.origin}/index.html?solid=1&debug=1`;
  console.log('[AG-274] Serving game from:', url);

  const browser = await launch({
    headless: false,
    args: [
      '--window-position=-2400,-2400',
      '--window-size=1920,1080',
      '--disable-features=CalculateNativeWinOcclusion',
    ],
  });

  try {
    const page = await browser.newPage({ width: 1920, height: 1080 });
    try {
      const { windowId } = await page.send('Browser.getWindowForTarget', {});
      await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: -4000, top: -4000 } });
    } catch { /* keep existing bounds */ }

    console.log('[AG-274] Navigating to game...');
    await page.goto(url, { timeout: 180000 });
    if (!(await page.waitFor('!!window.TT', { timeout: 180000 }))) {
      throw new Error('window.TT never appeared: ' + (page.errors[0] || ''));
    }

    // Dismiss intro / opening
    await page.evaluate(`(() => {
      if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting();
      else if (window.DWOpening && typeof DWOpening.skip === 'function') DWOpening.skip();
    })()`);
    await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });

    // Enter Training Ground as JERRY
    console.log('[AG-274] Entering Training Ground as JERRY...');
    await page.evaluate(`(() => {
      const nameEl = document.getElementById('playerName');
      if (nameEl) nameEl.value = 'JERRY';
      const btn = document.getElementById('modeTraining');
      if (btn) btn.click();
      else if (window.TT && window.TT.enterTraining) window.TT.enterTraining();
    })()`);

    if (!(await page.waitFor('window.TT && window.TT.trainingDbg && window.TT.trainingDbg.state().active', { timeout: 30000 }))) {
      throw new Error('Training Ground failed to become active');
    }
    await wait(2000);
    console.log('[AG-274] Training Ground active.');

    // Inject probe and setup
    await page.evaluate(`(() => {
      const T = window.TT;
      T.setHp(100000);
      T.grantAllWeapons();
      T.setWeapon(T.WEAPON_ORDER.indexOf('pistol'));
      if (T.isUnarmed()) T.toggleHolster();
      T.setViewFirstDbg(true);
      T.setZoomHeldDbg(false);
      T.setCamo('m81');
      T.setWorldTime(0.42);

      window.__probe = {
        setFacing(yaw, pitch = 0) {
          T.player.rotation.y = yaw;
          T.setAimYawDbg(yaw);
          T.setOtsAimDbg(yaw, pitch);
          T.stepFrame(0.016);
        },
        auditNearMeshes() {
          const camPos = new T.THREE.Vector3();
          T.camera.getWorldPosition(camPos);
          const results = [];

          const checkMesh = (o) => {
            if (!o.isMesh) return;
            const wPos = new T.THREE.Vector3();
            o.getWorldPosition(wPos);
            const dist = camPos.distanceTo(wPos);
            if (dist > 1.2) return; // Within 1.2m of camera

            const mat = o.material;
            const hasCamo = mat?.map?.uuid === T.camoTex?.uuid || mat?.name?.includes('uniform') || mat?.name?.includes('shirt') || o.name?.includes('sleeve') || o.name?.includes('arm') || o.name?.includes('cuff');

            // Measure repeats per meter
            let medU = 0, medV = 0, medUV = 0;
            const geo = o.geometry;
            const pos = geo?.attributes?.position;
            const uv = geo?.attributes?.uv;

            if (pos && uv && pos.count > 2) {
              const uvsR = [];
              const wScale = new T.THREE.Vector3();
              o.getWorldScale(wScale);
              const count = Math.min(pos.count - 2, 60);
              for (let i = 0; i < count; i += 3) {
                const dx = (pos.getX(i+1) - pos.getX(i)) * wScale.x;
                const dy = (pos.getY(i+1) - pos.getY(i)) * wScale.y;
                const dz = (pos.getZ(i+1) - pos.getZ(i)) * wScale.z;
                const dw = Math.hypot(dx, dy, dz);
                const du = Math.abs(uv.getX(i+1) - uv.getX(i));
                const dv = Math.abs(uv.getY(i+1) - uv.getY(i));
                const duv = Math.hypot(du, dv);
                if (dw > 0.001) uvsR.push(duv / dw);
              }
              if (uvsR.length) {
                uvsR.sort((a,b) => a - b);
                medUV = uvsR[Math.floor(uvsR.length / 2)];
              }
            }

            // Parent chain
            const parents = [];
            let p = o.parent;
            while (p) {
              parents.push(p.name || p.type);
              p = p.parent;
            }

            results.push({
              name: o.name || '(unnamed)',
              type: o.type,
              dist: +dist.toFixed(3),
              visible: o.visible,
              parentVisible: o.parent ? o.parent.visible : true,
              layersMask: o.layers.mask,
              worldScale: { x: +o.scale.x.toFixed(4), y: +o.scale.y.toFixed(4), z: +o.scale.z.toFixed(4) },
              repPerM: +medUV.toFixed(3),
              tileMeters: medUV > 0 ? +(1 / medUV).toFixed(3) : 0,
              matName: mat?.name || '(no mat)',
              matUuid: mat?.uuid,
              texUuid: mat?.map?.uuid,
              texMatrix: mat?.map?.matrix ? [...mat.map.matrix.elements] : null,
              receiveShadow: o.receiveShadow,
              castShadow: o.castShadow,
              parentChain: parents.join(' > ')
            });
          };

          T.scene.traverse(checkMesh);
          if (T.viewmodelDbg && T.viewmodelDbg()?.root) {
            T.viewmodelDbg().root.traverse(checkMesh);
          }
          return results;
        },
        getViewArmsState() {
          const vm = T.viewmodelDbg();
          const arms = vm?.arms;
          const info = vm?.info;
          return {
            vmActive: !!info?.active,
            vmFiltering: vm?.filtering,
            armsR: {
              foreVisible: !!arms?.r?.meshes?.fore?.visible,
              cuffVisible: !!arms?.r?.meshes?.cuff?.visible,
              upperVisible: !!arms?.r?.meshes?.upper?.visible,
              foreMatUuid: arms?.r?.meshes?.fore?.material?.uuid,
              foreMapUuid: arms?.r?.meshes?.fore?.material?.map?.uuid
            },
            armsL: {
              foreVisible: !!arms?.l?.meshes?.fore?.visible,
              cuffVisible: !!arms?.l?.meshes?.cuff?.visible,
              upperVisible: !!arms?.l?.meshes?.upper?.visible
            },
            liveSleeveEyeHidden: !!T.player?.userData?.liveSleeveHidden
          };
        }
      };
    })()`);
    await wait(400);

    const auditData = {
      timestamp: new Date().toISOString(),
      gpu: 'NVIDIA GeForce RTX 5080 (WebGPU)',
      facingRange: {},
      facingHQ: {},
      turnProgression: [],
      candidateIsolation: {}
    };

    // =========================================================================
    // PART A: FACING RANGE (yaw = 0) vs FACING HQ/CIF (yaw = PI)
    // =========================================================================
    console.log('\n--- Part A: Facing Range (yaw = 0) ---');
    await page.evaluate(`window.__probe.setFacing(0, 0)`);
    await wait(300);
    await captureShot(page, '01-facing-range-hip.png');
    auditData.facingRange.hipMeshes = await page.evaluate(`window.__probe.auditNearMeshes()`);
    auditData.facingRange.hipArms = await page.evaluate(`window.__probe.getViewArmsState()`);

    await page.evaluate(`window.TT.setZoomHeldDbg(true)`);
    await wait(300);
    await captureShot(page, '02-facing-range-ads.png');
    auditData.facingRange.adsMeshes = await page.evaluate(`window.__probe.auditNearMeshes()`);
    auditData.facingRange.adsArms = await page.evaluate(`window.__probe.getViewArmsState()`);
    await page.evaluate(`window.TT.setZoomHeldDbg(false)`);
    await wait(200);

    console.log('\n--- Part A: Facing HQ/CIF (yaw = PI) ---');
    await page.evaluate(`window.__probe.setFacing(Math.PI, 0)`);
    await wait(300);
    await captureShot(page, '03-facing-hq-hip.png');
    auditData.facingHQ.hipMeshes = await page.evaluate(`window.__probe.auditNearMeshes()`);
    auditData.facingHQ.hipArms = await page.evaluate(`window.__probe.getViewArmsState()`);

    await page.evaluate(`window.TT.setZoomHeldDbg(true)`);
    await wait(300);
    await captureShot(page, '04-facing-hq-ads.png');
    auditData.facingHQ.adsMeshes = await page.evaluate(`window.__probe.auditNearMeshes()`);
    auditData.facingHQ.adsArms = await page.evaluate(`window.__probe.getViewArmsState()`);
    await page.evaluate(`window.TT.setZoomHeldDbg(false)`);
    await wait(200);

    // =========================================================================
    // PART B: SLOW TURN PROGRESSION (yaw 0 to PI)
    // =========================================================================
    console.log('\n--- Part B: Turn Progression Between Range and HQ ---');
    const YAWS = [
      { rad: 0, label: '0deg-range' },
      { rad: Math.PI * 0.25, label: '45deg' },
      { rad: Math.PI * 0.50, label: '90deg-east' },
      { rad: Math.PI * 0.75, label: '135deg' },
      { rad: Math.PI, label: '180deg-hq' }
    ];

    for (let i = 0; i < YAWS.length; i++) {
      const y = YAWS[i];
      await page.evaluate(`((yaw) => window.__probe.setFacing(yaw, 0))(${y.rad})`);
      await wait(150);
      await captureShot(page, `turn-hip-${i}-${y.label}.png`);

      await page.evaluate(`window.TT.setZoomHeldDbg(true)`);
      await wait(150);
      await captureShot(page, `turn-ads-${i}-${y.label}.png`);
      await page.evaluate(`window.TT.setZoomHeldDbg(false)`);
      await wait(100);

      const probeAtAngle = await page.evaluate(`window.__probe.auditNearMeshes()`);
      auditData.turnProgression.push({ angle: y.label, rad: y.rad, probe: probeAtAngle });
    }

    // =========================================================================
    // PART C: CANDIDATE HIDING ISOLATION PASS (At yaw = PI where fine pattern shows)
    // =========================================================================
    console.log('\n--- Part C: Candidate Hiding Isolation Pass (Facing HQ) ---');
    await page.evaluate(`window.__probe.setFacing(Math.PI, 0)`);
    await wait(200);

    // Baseline facing HQ
    await captureShot(page, 'iso-00-baseline-facing-hq.png');

    // Candidate 1: Hide 3P live-sleeve
    console.log('[AG-274] Candidate 1: Hiding 3P live-sleeve...');
    await page.evaluate(`(() => {
      window.TT.player.traverse(o => {
        if (o.name === 'live-sleeve') o.visible = false;
      });
      window.TT.stepFrame(0.016);
    })()`);
    await wait(150);
    await captureShot(page, 'iso-01-hide-live-sleeve.png');
    auditData.candidateIsolation.hideLiveSleeve = await page.evaluate(`window.__probe.auditNearMeshes()`);

    // Restore live-sleeve, Candidate 2: Hide live-sleeve-live
    console.log('[AG-274] Candidate 2: Hiding live-sleeve-live...');
    await page.evaluate(`(() => {
      window.TT.player.traverse(o => {
        if (o.name === 'live-sleeve') o.visible = true;
        if (o.name === 'live-sleeve-live') o.visible = false;
      });
      window.TT.stepFrame(0.016);
    })()`);
    await wait(150);
    await captureShot(page, 'iso-02-hide-live-sleeve-live.png');
    auditData.candidateIsolation.hideLiveSleeveLive = await page.evaluate(`window.__probe.auditNearMeshes()`);

    // Restore live-sleeve-live, Candidate 3: Hide rig-skin shadow proxy
    console.log('[AG-274] Candidate 3: Hiding rig-skin shadow proxy...');
    await page.evaluate(`(() => {
      window.TT.player.traverse(o => {
        if (o.name === 'live-sleeve-live') o.visible = true;
        if (o.name === 'rig-skin' || o.userData?.isRigSkin) o.visible = false;
      });
      const proxy = window.TT.marineShadowDbg ? window.TT.marineShadowDbg().proxy : null;
      if (proxy) proxy.visible = false;
      window.TT.stepFrame(0.016);
    })()`);
    await wait(150);
    await captureShot(page, 'iso-03-hide-rig-skin.png');
    auditData.candidateIsolation.hideRigSkin = await page.evaluate(`window.__probe.auditNearMeshes()`);

    // Candidate 4: Hide 1P viewmodel forearms (vm-forearm)
    console.log('[AG-274] Candidate 4: Hiding 1P vm-forearm...');
    await page.evaluate(`(() => {
      const vm = window.TT.viewmodelDbg();
      if (vm && vm.arms) {
        if (vm.arms.r?.meshes?.fore) vm.arms.r.meshes.fore.visible = false;
        if (vm.arms.l?.meshes?.fore) vm.arms.l.meshes.fore.visible = false;
      }
      window.TT.stepFrame(0.016);
    })()`);
    await wait(150);
    await captureShot(page, 'iso-04-hide-vm-forearm.png');
    auditData.candidateIsolation.hideVmForearm = await page.evaluate(`window.__probe.auditNearMeshes()`);

    // Restore all
    await page.evaluate(`(() => {
      window.TT.player.traverse(o => { o.visible = true; });
      const vm = window.TT.viewmodelDbg();
      if (vm && vm.arms) {
        if (vm.arms.r?.meshes?.fore) vm.arms.r.meshes.fore.visible = true;
        if (vm.arms.l?.meshes?.fore) vm.arms.l.meshes.fore.visible = true;
      }
      const proxy = window.TT.marineShadowDbg ? window.TT.marineShadowDbg().proxy : null;
      if (proxy) proxy.visible = true;
      window.TT.stepFrame(0.016);
    })()`);
    await wait(200);

    // Export JSON audit data
    const jsonStr = JSON.stringify(auditData, null, 2);
    writeFileSyncWithRetry(path.join(OUT_DIR_QA274, 'camo-probe.json'), jsonStr);
    writeFileSyncWithRetry(path.join(OUT_DIR_QA275, 'camo-probe.json'), jsonStr);
    console.log('[AG-274] Exported camo-probe.json');

    // Build contact sheets via Python
    console.log('\n[AG-274] Building diagnostic contact sheet via Python...');
    execFileSync('python', ['tools/build-ag274-sheets.py'], { cwd: ROOT, stdio: 'inherit' });
    console.log('[AG-274] Contact sheet complete.');

  } finally {
    await browser.close().catch(() => {});
    await server.close().catch(() => {});
  }
}

main().catch((err) => {
  console.error('[AG-274 ERROR]', err);
  process.exit(1);
});
