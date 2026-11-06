// qa/2026-11-06-AG-243/run-ag243.mjs
// Task AG-243: The sights his way, as they land (GB-259)
// Daylight Redo on Jerry's PC (RTX 5080, WebGPU)
// Audits 1P ADS sight picture for:
// 1. Breacher-12 (aa12, J20)
// 2. Revolver (revolver, J13)
// 3. Grenade Launcher (launcher, J16 post GP-20033)
// Looking at marked silhouette target 20.0 m away in outdoor daylight (worldTime = 0.50)
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Use the shared game-test slot (crew.mjs slot run)');
}

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa/2026-11-06-AG-243');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function captureShot(page, filename) {
  const isJpg = filename.endsWith('.jpg') || filename.endsWith('.jpeg');
  const params = {
    format: isJpg ? 'jpeg' : 'png',
    captureBeyondViewport: false,
  };
  if (isJpg) params.quality = 95;
  const shot = await page.send('Page.captureScreenshot', params);
  const outPath = path.join(OUT_DIR, filename);
  fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
  console.log(`[AG-243] Saved screenshot: ${filename} (${shot.data.length} bytes base64)`);
  return outPath;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('\n========================================================================');
  console.log('=== [AG-243] The sights his way, as they land (GB-259)               ===');
  console.log('=== Daylight Redo on Real WebGPU Hardware (RTX 5080)                 ===');
  console.log('========================================================================\n');

  const server = await serve(ROOT, 0);
  const url = `${server.origin}/index.html?solid=1&debug=1&raf=timer`;
  console.log('[AG-243] Serving game from:', url);

  const browser = await launch({
    headless: false,
    args: [
      '--window-position=-2400,-2400',
      '--window-size=1920,1080',
      '--disable-features=CalculateNativeWinOcclusion'
    ]
  });

  try {
    const page = await browser.newPage({ width: 1920, height: 1080 });
    console.log('[AG-243] Loading game with ?solid=1&debug=1&raf=timer...');
    await page.goto(url, { timeout: 180000 });

    if (!await page.waitFor('!!window.TT', { timeout: 300000 })) {
      throw new Error('Game did not boot TT within timeout: ' + (page.errors[0] || ''));
    }

    // Dismiss intro / opening
    await page.evaluate(`(() => {
      if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting();
      else if (window.DWOpening && typeof DWOpening.skip === 'function') DWOpening.skip();
    })()`);
    await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });

    await page.evaluate(fs.readFileSync(path.join(ROOT, 'tools/tests/lib.js'), 'utf8'));

    // Start outdoor match (Jerry's launcher)
    console.log('[AG-243] Starting match via startMatch(T, "AG243")...');
    await page.evaluate(`(async () => {
      const T = window.TT;
      await startMatch(T, 'AG243');
    })()`);

    console.log('[AG-243] Match active. Configuring noon daylight and 1P mode...');
    const initEnv = await page.evaluate(`(async () => {
      const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
      if (T.clearZombies) T.clearZombies();
      T.setHp(100000);
      T.grantAllWeapons();
      T.setViewFirstDbg(true);
      for (let i = 0; i < 100 && T.fpDbg().w < 0.99; i++) await wait(100);
      if (T.isUnarmed && T.isUnarmed()) T.toggleHolster();
      if (T.setWorldTime) T.setWorldTime(0.50); // High noon daylight

      return {
        firstPerson: T.fpDbg().first,
        firstPersonW: T.fpDbg().w,
        worldTime: T.getWorldTime ? T.getWorldTime() : null,
        playerPos: { x: T.player.position.x, y: T.player.position.y, z: T.player.position.z },
        renderer: T.getRendererBackend ? T.getRendererBackend() : 'unknown'
      };
    })()`);
    console.log('[AG-243] Environment state:', initEnv);

    // Setup outdoor target plate at exactly 20.0 m distance down the aim line
    console.log('[AG-243] Spawning 20m silhouette target plate in outdoor daylight...');
    const targetInfo = await page.evaluate(`(() => {
      const T = window.TT, THREE = T.THREE || window.THREE;
      const scene = T.scene || window.scene;

      // Position player at a flat open spot in the FOB yard facing +Z
      // Standard spawn is near (42, py, -20)
      const px = 42.0;
      const pz = -20.0;
      const py = T.sampleHeight ? T.sampleHeight(px, pz) : T.player.position.y;
      T.player.position.set(px, py, pz);
      if (T.localPlayer) T.localPlayer.position.set(px, py, pz);

      // Facing straight +Z (OTS.yaw = 0, OTS.pitch = 0)
      T.setAimYawDbg(0);
      T.setOtsAimDbg(0, 0);

      // Eye height is ~1.68m
      const eyeY = py + 1.68;
      const targetDist = 20.0;
      const targetX = px;
      const targetZ = pz + targetDist;
      const targetY = eyeY; // Exact eye line level

      // Remove existing test target if any
      const existing = scene.getObjectByName('ag243-target');
      if (existing) scene.remove(existing);

      const targetGroup = new THREE.Group();
      targetGroup.name = 'ag243-target';
      targetGroup.position.set(targetX, targetY, targetZ);
      targetGroup.rotation.y = Math.PI; // Face back towards player at -Z

      // High-visibility shooting range silhouette target texture
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 768;
      const c = canvas.getContext('2d');

      // Crisp white card board
      c.fillStyle = '#f5f7fa';
      c.fillRect(0, 0, 512, 768);
      c.lineWidth = 10;
      c.strokeStyle = '#2b3035';
      c.strokeRect(5, 5, 502, 758);

      // Dark silhouette torso and head
      c.fillStyle = '#1c2127';
      // Head
      c.beginPath();
      c.arc(256, 175, 75, 0, Math.PI * 2);
      c.fill();
      // Shoulders & Torso
      c.beginPath();
      c.moveTo(110, 740);
      c.lineTo(135, 275);
      c.quadraticCurveTo(256, 230, 377, 275);
      c.lineTo(402, 740);
      c.closePath();
      c.fill();

      // Chest scoring rings centered at (256, 430)
      const cx = 256, cy = 430;
      // Ring 8 (white)
      c.strokeStyle = '#ffffff';
      c.lineWidth = 4;
      c.beginPath(); c.arc(cx, cy, 140, 0, Math.PI * 2); c.stroke();
      // Ring 9 (red)
      c.strokeStyle = '#e83020';
      c.lineWidth = 5;
      c.beginPath(); c.arc(cx, cy, 90, 0, Math.PI * 2); c.stroke();
      // Bullseye 10 (solid red)
      c.fillStyle = '#e83020';
      c.beginPath(); c.arc(cx, cy, 40, 0, Math.PI * 2); c.fill();
      // White crosshair in bullseye
      c.strokeStyle = '#ffffff';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(cx - 50, cy); c.lineTo(cx + 50, cy);
      c.moveTo(cx, cy - 50); c.lineTo(cx, cy + 50);
      c.stroke();

      // Head bullseye (red)
      c.fillStyle = '#e83020';
      c.beginPath(); c.arc(256, 175, 26, 0, Math.PI * 2); c.fill();

      // Scoring numerals
      c.font = 'bold 36px Impact, sans-serif';
      c.fillStyle = '#f5f7fa';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('10', cx, cy);
      c.fillText('X', 256, 175);

      const tex = new THREE.CanvasTexture(canvas);
      if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.4,
        metalness: 0.1,
        side: THREE.DoubleSide
      });

      // Target plate: 0.70 m wide x 1.05 m tall
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.70, 1.05), mat);
      plate.castShadow = true;
      plate.receiveShadow = true;
      targetGroup.add(plate);

      // Support post stand to the ground
      const groundY = T.sampleHeight ? T.sampleHeight(targetX, targetZ) : py;
      const postLen = targetY - groundY + 0.1;
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, postLen, 16),
        new THREE.MeshStandardMaterial({ color: 0x3a4045, roughness: 0.5, metalness: 0.6 })
      );
      post.position.set(0, -postLen / 2, 0);
      post.castShadow = true;
      targetGroup.add(post);

      scene.add(targetGroup);

      // Set sun overhead for high-noon daylight
      if (T.setWorldTime) T.setWorldTime(0.50);

      return {
        playerPos: { x: px, y: py, z: pz },
        eyePos: { x: px, y: eyeY, z: pz },
        targetPos: { x: targetX, y: targetY, z: targetZ },
        distance: targetDist,
        groundY
      };
    })()`);
    console.log('[AG-243] Target positioned:', targetInfo);

    // Guns to evaluate per AG-243:
    // 1. Breacher-12 (aa12) - J20
    // 2. Revolver (revolver) - J13, J57
    // 3. Launcher (launcher) - J16 post GP-20033
    const GUNS = [
      {
        key: 'aa12',
        name: 'Breacher-12',
        jerryNote: 'J20: Sights unusable and inaccurate. GB-259 aligned rear datum through carry-handle ring centre (y=0.168) to front post tip (y=0.168).',
        sightKind: 'carry-handle ring + hooded front post'
      },
      {
        key: 'revolver',
        name: 'Revolver',
        jerryNote: 'J13: Sights unusable: hammer in the way on aim. J57: Front sight post not visible. GP-20014 lowered idle hammer 6.3 mm under notch line.',
        sightKind: 'rear top-strap notch + blade post over idle hammer'
      },
      {
        key: 'launcher',
        name: 'Grenade Launcher',
        jerryNote: 'J16: Leaf sight notch. GP-20033 opened leaf sight channel; sight line through first notch open to front post.',
        sightKind: 'leaf sight notch + front post'
      }
    ];

    const telemetry = {
      timestamp: new Date().toISOString(),
      gpu: 'RTX 5080 (WebGPU)',
      resolution: '1920x1080',
      lighting: 'Outdoor Daylight (worldTime = 0.50 High Noon)',
      targetDistance: '20.0 m (Marked Silhouette Target Plate)',
      guns: {}
    };

    for (const g of GUNS) {
      console.log(`\n------------------------------------------------------------------------`);
      console.log(`[AG-243] Testing ${g.name} (${g.key}) in Daylight`);
      console.log(`[AG-243] Note: ${g.jerryNote}`);

      // Equip gun, wait for raise, enter ADS
      const equipState = await page.evaluate(`(async () => {
        const gunKey = '${g.key}';
        const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));

        // Ensure noon daylight
        if (T.setWorldTime) T.setWorldTime(0.50);

        // Keep player facing +Z at level pitch
        T.setAimYawDbg(0);
        T.setOtsAimDbg(0, 0);

        // Equip weapon
        const idx = T.WEAPON_ORDER.indexOf(gunKey);
        for (let i = 0; i < 20 && T.getCurrentWeapon() !== gunKey; i++) {
          T.setWeapon(idx);
          await wait(150);
        }
        T.setAmmoDbg(gunKey, 999);
        if (T.isUnarmed && T.isUnarmed()) T.toggleHolster();

        // Wait for viewmodel raise > 0.98
        for (let i = 0; i < 60; i++) {
          const vm = T.viewmodelDbg && T.viewmodelDbg();
          if (vm && vm.info.active && vm.info.key === gunKey && vm.info.raise > 0.98) break;
          await wait(100);
        }

        // Aim down sights (right mouse held)
        T.setZoomHeldDbg(true);

        // Wait for ADS >= 0.99
        for (let i = 0; i < 60; i++) {
          if (T.fpDbg().ads > 0.98) break;
          await wait(100);
        }

        await wait(600); // Settle spring animations, sway, breathing

        const vm = T.viewmodelDbg();
        return {
          weapon: T.getCurrentWeapon(),
          first: T.fpDbg().first,
          ads: +T.fpDbg().ads.toFixed(3),
          viewGun: vm ? vm.info.key : null,
          raise: vm ? +vm.info.raise.toFixed(3) : null
        };
      })()`);

      console.log(`[AG-243] ${g.name} ADS active:`, equipState);

      // Measure screen coverage and telemetry
      const gunTelem = await page.evaluate(`(() => {
        const gunKey = '${g.key}';
        const T = window.TT, THREE = T.THREE || window.THREE;
        const vm = T.viewmodelDbg();
        const camera = T.camera || window.camera;

        // Measure viewmodel screen coverage
        let minX = 1, maxX = -1, minY = 1, maxY = -1;
        let onScreenCount = 0;
        if (vm && vm.root) {
          const rootInv = () => {
            const sp = vm.space || vm.root;
            sp.updateMatrixWorld(true);
            return sp.matrixWorld.clone().invert();
          };
          const mInv = rootInv();
          vm.root.traverse(o => {
            if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
            for (let q = o; q && q !== vm.root; q = q.parent) if (!q.visible) return;
            o.updateWorldMatrix(true, false);
            const m = mInv.clone().multiply(o.matrixWorld);
            const pa = o.geometry.attributes.position;
            const step = Math.max(1, Math.floor(pa.count / 100));
            const v = new THREE.Vector3();
            for (let i = 0; i < pa.count; i += step) {
              v.set(pa.getX(i), pa.getY(i), pa.getZ(i)).applyMatrix4(m);
              const n = vm.ndc(v);
              if (n.d > 0 && Math.abs(n.x) <= 1.05 && Math.abs(n.y) <= 1.05) {
                onScreenCount++;
                minX = Math.min(minX, n.x);
                maxX = Math.max(maxX, n.x);
                minY = Math.min(minY, n.y);
                maxY = Math.max(maxY, n.y);
              }
            }
          });
        }

        const coverageArea = Math.max(0, maxX - minX) * Math.max(0, maxY - minY);
        const coveragePct = ((coverageArea / 4.0) * 100).toFixed(1);

        return {
          weapon: gunKey,
          ads: +T.fpDbg().ads.toFixed(3),
          firstPerson: T.fpDbg().first,
          gunCoveragePct: +coveragePct,
          gunBoundsNDC: { minX: +minX.toFixed(3), maxX: +maxX.toFixed(3), minY: +minY.toFixed(3), maxY: +maxY.toFixed(3) }
        };
      })()`);

      telemetry.guns[g.key] = {
        name: g.name,
        jerryNote: g.jerryNote,
        sightKind: g.sightKind,
        ...gunTelem
      };

      // Take clean 1080p in-game screenshot
      const shotName = `${g.key}-ads-20m.png`;
      await captureShot(page, shotName);

      // Release ADS before next weapon
      await page.evaluate(`(async () => {
        const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
        T.setZoomHeldDbg(false);
        for (let i = 0; i < 50; i++) {
          if (T.fpDbg().ads < 0.05) break;
          await wait(100);
        }
        await wait(300);
      })()`);
    }

    // Save telemetry.json
    fs.writeFileSync(path.join(OUT_DIR, 'telemetry.json'), JSON.stringify(telemetry, null, 2) + '\n');
    console.log(`[AG-243] Telemetry saved to: qa/2026-11-06-AG-243/telemetry.json`);

    // Build clean contact sheet (NO OVERLAY)
    console.log('[AG-243] Running build-sheets.py to assemble daylight contact sheet...');
    execSync('python qa/2026-11-06-AG-243/build-sheets.py', { cwd: ROOT, stdio: 'inherit' });

    if (page.errors && page.errors.length) {
      console.warn('[AG-243] Page errors recorded:', page.errors.slice(0, 5));
    }
    console.log('\n[AG-243] Daylight verification run finished successfully.');
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch(err => {
  console.error('[AG-243] Error during run:', err);
  process.exit(1);
});
