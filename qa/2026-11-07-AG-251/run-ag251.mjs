// qa/2026-11-07-AG-251/run-ag251.mjs
// Task AG-251: The first-person look of every gun, his way (D-118). After AG-250.
// Real WebGPU hardware captures on Jerry's PC (RTX 5080)
// Audits 15 weapon configurations (12 single + 3 pairs) in first person
// both at the hip and aimed (ADS) in daylight noon with complete telemetry.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Use the shared game-test slot (crew.mjs slot run)');
}

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa/2026-11-07-AG-251');
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
  console.log(`[AG-251] Saved screenshot: ${filename} (${shot.data.length} bytes base64)`);
  return outPath;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function evalCode(page, fn, ...args) {
  const expr = `(${fn.toString()})(${args.map(a => JSON.stringify(a)).join(', ')})`;
  return page.evaluate(expr, 120000);
}

const WEAPONS = [
  { id: '01', key: 'pistol', name: 'Pistol', full: 'Pistol (M9)', isPair: false },
  { id: '02', key: 'revolver', name: 'Revolver', full: 'Revolver (.44 Magnum)', isPair: false },
  { id: '03', key: 'uzi', name: 'Wasp SMG', full: 'Wasp SMG', isPair: false },
  { id: '04', key: 'm4', name: 'GW-4 Carbine', full: 'GW-4 Carbine (M4)', isPair: false },
  { id: '05', key: 'ak', name: 'KR-7 Rifle', full: 'KR-7 Rifle (AK-47)', isPair: false },
  { id: '06', key: 'shotgun', name: 'Shotgun', full: 'Shotgun (Remington 870)', isPair: false },
  { id: '07', key: 'aa12', name: 'Breacher-12', full: 'Breacher-12 (AA-12)', isPair: false },
  { id: '08', key: 'sniper', name: 'Sniper Rifle', full: 'Sniper Rifle', isPair: false },
  { id: '09', key: 'launcher', name: 'Grenade Launcher', full: 'Grenade Launcher', isPair: false },
  { id: '10', key: 'flamer', name: 'Flamethrower', full: 'Flamethrower', isPair: false },
  { id: '11', key: 'chainsaw', name: 'Chainsaw', full: 'Chainsaw', isPair: false },
  { id: '12', key: 'minigun', name: 'Rotary Gun', full: 'Rotary Gun (Minigun)', isPair: false },
  { id: '13', key: 'pistol', name: 'Pistol Pair', full: 'Pistol Pair (Akimbo)', isPair: true },
  { id: '14', key: 'uzi', name: 'Wasp Pair', full: 'Wasp Pair (Akimbo)', isPair: true },
  { id: '15', key: 'revolver', name: 'Revolver Pair', full: 'Revolver Pair (Akimbo)', isPair: true }
];

async function main() {
  console.log('\n========================================================================');
  console.log('=== [AG-251] The first-person look of every gun, his way (D-118)     ===');
  console.log('=== Real WebGPU Hardware (RTX 5080)                                  ===');
  console.log('========================================================================\n');

  const server = await serve(ROOT, 0);
  const url = `${server.origin}/index.html?solid=1&debug=1&raf=timer`;
  console.log('[AG-251] Serving game from:', url);

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

    console.log('[AG-251] Loading game with ?solid=1&debug=1&raf=timer...');
    await page.goto(url, { timeout: 180000 });

    if (!(await page.waitFor('!!window.TT', { timeout: 300000 }))) {
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
    console.log('[AG-251] Starting match via startMatch(T, "AG251")...');
    await page.evaluate(`(async () => {
      const T = window.TT;
      await startMatch(T, 'AG251');
    })()`);

    console.log('[AG-251] Match active. Configuring noon daylight and 1P mode...');
    const initEnv = await evalCode(page, async () => {
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
    });
    console.log('[AG-251] Environment initialized:', initEnv);

    // Setup outdoor target plate at exactly 20.0 m distance down the aim line
    console.log('[AG-251] Setting player in FOB yard facing +Z with 20m silhouette target plate...');
    const targetInfo = await evalCode(page, () => {
      const T = window.TT, THREE = T.THREE || window.THREE;
      const scene = T.scene || window.scene;

      const px = 42.0;
      const pz = -20.0;
      const py = T.sampleHeight ? T.sampleHeight(px, pz) : T.player.position.y;
      T.player.position.set(px, py, pz);
      if (T.localPlayer) T.localPlayer.position.set(px, py, pz);

      T.setAimYawDbg(0);
      T.setOtsAimDbg(0, 0);

      const eyeY = py + 1.68;
      const targetDist = 20.0;
      const targetX = px;
      const targetZ = pz + targetDist;
      const targetY = eyeY;

      const existing = scene.getObjectByName('ag251-target');
      if (existing) scene.remove(existing);

      const targetGroup = new THREE.Group();
      targetGroup.name = 'ag251-target';
      targetGroup.position.set(targetX, targetY, targetZ);
      targetGroup.rotation.y = Math.PI;

      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 768;
      const c = canvas.getContext('2d');

      c.fillStyle = '#f5f7fa';
      c.fillRect(0, 0, 512, 768);
      c.lineWidth = 10;
      c.strokeStyle = '#2b3035';
      c.strokeRect(5, 5, 502, 758);

      c.fillStyle = '#1c2127';
      c.beginPath();
      c.arc(256, 175, 75, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.moveTo(110, 740);
      c.lineTo(135, 275);
      c.quadraticCurveTo(256, 230, 377, 275);
      c.lineTo(402, 740);
      c.closePath();
      c.fill();

      const cx = 256, cy = 430;
      c.strokeStyle = '#ffffff'; c.lineWidth = 4;
      c.beginPath(); c.arc(cx, cy, 140, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = '#e83020'; c.lineWidth = 5;
      c.beginPath(); c.arc(cx, cy, 90, 0, Math.PI * 2); c.stroke();
      c.fillStyle = '#e83020';
      c.beginPath(); c.arc(cx, cy, 40, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#ffffff'; c.lineWidth = 3;
      c.beginPath();
      c.moveTo(cx - 50, cy); c.lineTo(cx + 50, cy);
      c.moveTo(cx, cy - 50); c.lineTo(cx, cy + 50);
      c.stroke();
      c.fillStyle = '#e83020';
      c.beginPath(); c.arc(256, 175, 26, 0, Math.PI * 2); c.fill();

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

      const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.70, 1.05), mat);
      plate.castShadow = true;
      plate.receiveShadow = true;
      targetGroup.add(plate);

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
      if (T.setWorldTime) T.setWorldTime(0.50);

      return {
        playerPos: { x: px, y: py, z: pz },
        eyePos: { x: px, y: eyeY, z: pz },
        targetPos: { x: targetX, y: targetY, z: targetZ },
        distance: targetDist
      };
    });
    console.log('[AG-251] 20m Target setup complete:', targetInfo);

    const telemetry = {
      timestamp: new Date().toISOString(),
      task: 'AG-251',
      decision: 'D-118',
      gpu: 'NVIDIA RTX 5080 (WebGPU Hardware)',
      resolution: '1920x1080',
      lighting: 'Outdoor High Noon Daylight (worldTime = 0.50)',
      targetDistance: '20.0 m (Marked Silhouette Target Plate)',
      guns: {}
    };

    for (const w of WEAPONS) {
      console.log(`\n------------------------------------------------------------------------`);
      console.log(`[AG-251] Testing ${w.id}: ${w.full} (key: ${w.key}, isPair: ${w.isPair})`);

      // 1. Equip weapon
      const equipRes = await evalCode(page, async (g) => {
        const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
        if (T.setWorldTime) T.setWorldTime(0.50);
        T.setAimYawDbg(0);
        T.setOtsAimDbg(0, 0);

        const baseKey = g.key;
        const isPair = !!g.isPair;

        if (isPair) {
          T.setDualOwnedDbg(baseKey, true);
          const idx = T.WEAPON_ORDER.indexOf(baseKey);
          for (let i = 0; i < 20 && T.getCurrentWeapon() !== baseKey; i++) {
            T.setWeapon(idx);
            await wait(100);
          }
          if (T.akimboOn && !T.akimboOn()) {
            T.toggleDualWieldDbg();
            await wait(200);
          }
        } else {
          if (T.akimboOn && T.akimboOn()) {
            T.toggleDualWieldDbg();
            await wait(200);
          }
          const idx = T.WEAPON_ORDER.indexOf(baseKey);
          for (let i = 0; i < 20 && T.getCurrentWeapon() !== baseKey; i++) {
            T.setWeapon(idx);
            await wait(100);
          }
        }

        T.setAmmoDbg(baseKey, 999);
        if (T.isUnarmed && T.isUnarmed()) T.toggleHolster();

        // Wait for raise
        for (let i = 0; i < 60; i++) {
          const vm = T.viewmodelDbg && T.viewmodelDbg();
          if (vm && vm.info.active && vm.info.key === baseKey && vm.info.raise > 0.98) {
            if (!isPair || vm.info.akimbo) break;
          }
          await wait(100);
        }
        await wait(300);

        return {
          weapon: T.getCurrentWeapon(),
          akimbo: T.akimboOn ? T.akimboOn() : false
        };
      }, w);
      console.log(`[AG-251] ${w.name} equipped:`, equipRes);

      // 2. Telemetry function
      const getTelemetry = async (stateName) => {
        return await evalCode(page, (args) => {
          const T = window.TT, THREE = T.THREE || window.THREE;
          const camera = T.camera || window.camera;
          const vm = T.viewmodelDbg ? T.viewmodelDbg() : null;

          const toScreen = (v3) => {
            if (!v3) return null;
            const p = v3.clone().project(camera);
            return {
              x: +((p.x * 0.5 + 0.5) * 1920).toFixed(1),
              y: +((-p.y * 0.5 + 0.5) * 1080).toFixed(1),
              inFrustum: p.x >= -1 && p.x <= 1 && p.y >= -1 && p.y <= 1 && p.z >= 0 && p.z <= 1
            };
          };

          // Find stock meshes and inspect if in frame
          const stockMeshes = [];
          let stockInFrame = false;
          let stockBounds = null;

          if (vm && vm.gun && vm.gun.src) {
            vm.gun.src.traverse((child) => {
              if (child.isMesh) {
                const n = (child.name || '').toLowerCase();
                const isStock = n.includes('stock') || n.includes('butt') || n.includes('buffer') || n.includes('recoil-pad');
                if (isStock) {
                  stockMeshes.push(child.name);
                  if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
                  const bb = child.geometry.boundingBox;
                  if (bb) {
                    const corners = [
                      new THREE.Vector3(bb.min.x, bb.min.y, bb.min.z),
                      new THREE.Vector3(bb.max.x, bb.min.y, bb.min.z),
                      new THREE.Vector3(bb.min.x, bb.max.y, bb.min.z),
                      new THREE.Vector3(bb.max.x, bb.max.y, bb.min.z),
                      new THREE.Vector3(bb.min.x, bb.min.y, bb.max.z),
                      new THREE.Vector3(bb.max.x, bb.min.y, bb.max.z),
                      new THREE.Vector3(bb.min.x, bb.max.y, bb.max.z),
                      new THREE.Vector3(bb.max.x, bb.max.y, bb.max.z)
                    ];
                    for (const c of corners) {
                      const worldP = c.clone().applyMatrix4(child.matrixWorld);
                      const sc = toScreen(worldP);
                      if (sc && sc.inFrustum) {
                        stockInFrame = true;
                        if (!stockBounds) stockBounds = { minX: sc.x, maxX: sc.x, minY: sc.y, maxY: sc.y };
                        else {
                          stockBounds.minX = Math.min(stockBounds.minX, sc.x);
                          stockBounds.maxX = Math.max(stockBounds.maxX, sc.x);
                          stockBounds.minY = Math.min(stockBounds.minY, sc.y);
                          stockBounds.maxY = Math.max(stockBounds.maxY, sc.y);
                        }
                      }
                    }
                  }
                }
              }
            });
          }

          // Gun overall screen bounding box
          let gunScreenBounds = null;
          if (vm && vm.gun && vm.gun.src) {
            const tempBox = new THREE.Box3().setFromObject(vm.gun.src);
            const corners = [
              new THREE.Vector3(tempBox.min.x, tempBox.min.y, tempBox.min.z),
              new THREE.Vector3(tempBox.max.x, tempBox.min.y, tempBox.min.z),
              new THREE.Vector3(tempBox.min.x, tempBox.max.y, tempBox.min.z),
              new THREE.Vector3(tempBox.max.x, tempBox.max.y, tempBox.min.z),
              new THREE.Vector3(tempBox.min.x, tempBox.min.y, tempBox.max.z),
              new THREE.Vector3(tempBox.max.x, tempBox.min.y, tempBox.max.z),
              new THREE.Vector3(tempBox.min.x, tempBox.max.y, tempBox.max.z),
              new THREE.Vector3(tempBox.max.x, tempBox.max.y, tempBox.max.z)
            ];
            for (const c of corners) {
              const sc = toScreen(c);
              if (sc && sc.inFrustum) {
                if (!gunScreenBounds) gunScreenBounds = { minX: sc.x, maxX: sc.x, minY: sc.y, maxY: sc.y };
                else {
                  gunScreenBounds.minX = Math.min(gunScreenBounds.minX, sc.x);
                  gunScreenBounds.maxX = Math.max(gunScreenBounds.maxX, sc.x);
                  gunScreenBounds.minY = Math.min(gunScreenBounds.minY, sc.y);
                  gunScreenBounds.maxY = Math.max(gunScreenBounds.maxY, sc.y);
                }
              }
            }
          }

          const fp = T.fpDbg();
          const vmInfo = vm ? vm.info : {};

          return {
            weapon: T.getCurrentWeapon(),
            state: args.stateName,
            isPair: args.isPair,
            firstPerson: fp.first,
            ads: +fp.ads.toFixed(3),
            vmActive: vmInfo.active,
            vmKey: vmInfo.key,
            vmRaise: vmInfo.raise != null ? +vmInfo.raise.toFixed(3) : null,
            akimbo: vmInfo.akimbo,
            handPlace: vmInfo.handPlace,
            stockMeshes,
            stockInFrame,
            stockBounds,
            gunScreenBounds
          };
        }, { stateName, isPair: w.isPair });
      };

      // 3. CAPTURE HIP
      console.log(`[AG-251] Posing ${w.name} at HIP...`);
      await evalCode(page, async () => {
        const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
        T.setZoomHeldDbg(false);
        for (let i = 0; i < 60; i++) {
          if (T.fpDbg().ads < 0.02) break;
          await wait(50);
        }
        await wait(500); // Settle spring animations & sway
      });

      const hipTelem = await getTelemetry('hip');
      const hipFile = `${w.id}-${w.key}${w.isPair ? '-pair' : ''}-hip.jpg`;
      await captureShot(page, hipFile);
      console.log(`[AG-251] ${w.name} Hip captured:`, {
        ads: hipTelem.ads,
        stockInFrame: hipTelem.stockInFrame,
        handPlace: hipTelem.handPlace
      });

      // 4. CAPTURE AIMED (ADS)
      console.log(`[AG-251] Posing ${w.name} at AIMED (ADS)...`);
      await evalCode(page, async () => {
        const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
        T.setZoomHeldDbg(true);
        for (let i = 0; i < 60; i++) {
          if (T.fpDbg().ads > 0.98) break;
          await wait(50);
        }
        await wait(600); // Settle ADS springs & breath sway
      });

      const adsTelem = await getTelemetry('aimed');
      const adsFile = `${w.id}-${w.key}${w.isPair ? '-pair' : ''}-aimed.jpg`;
      await captureShot(page, adsFile);
      console.log(`[AG-251] ${w.name} Aimed captured:`, {
        ads: adsTelem.ads,
        stockInFrame: adsTelem.stockInFrame,
        handPlace: adsTelem.handPlace
      });

      telemetry.guns[`${w.id}_${w.key}${w.isPair ? '_pair' : ''}`] = {
        id: w.id,
        key: w.key,
        name: w.name,
        full: w.full,
        isPair: w.isPair,
        hip: {
          file: hipFile,
          telem: hipTelem
        },
        aimed: {
          file: adsFile,
          telem: adsTelem
        }
      };

      // Reset zoom
      await evalCode(page, async () => {
        const T = window.TT;
        T.setZoomHeldDbg(false);
      });
      await wait(200);
    }

    const telemPath = path.join(OUT_DIR, 'telemetry.json');
    fs.writeFileSync(telemPath, JSON.stringify(telemetry, null, 2));
    console.log(`\n[AG-251] Full telemetry saved to: ${telemPath}`);

  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error('[AG-251] Fatal error:', err);
  process.exit(1);
});
