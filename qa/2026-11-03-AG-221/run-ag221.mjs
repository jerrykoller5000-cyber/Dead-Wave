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
const OUT_DIR = path.join(ROOT, 'qa/2026-11-03-AG-221');
const TMP_DIR = path.join(OUT_DIR, '_ref');
const LIB_JS_PATH = path.join(ROOT, 'tools/tests/lib.js');

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(TMP_DIR, { recursive: true });

const LIGHTS = [
  { key: 'noon', label: 'Noon (t=0.50)', worldTime: 0.50, rain: false, intensity: 0.0 },
  { key: 'overcast', label: 'Overcast (t=0.42)', worldTime: 0.42, rain: true, intensity: 0.85 },
  { key: 'dusk', label: 'Dusk (t=0.77)', worldTime: 0.77, rain: false, intensity: 0.0 },
  { key: 'night', label: 'Night (t=0.02)', worldTime: 0.02, rain: false, intensity: 0.0 }
];

async function captureShot(page, filePath) {
  const shot = await page.send('Page.captureScreenshot', {
    format: 'jpeg',
    quality: 93,
    captureBeyondViewport: false
  });
  fs.writeFileSync(filePath, Buffer.from(shot.data, 'base64'));
}

async function main() {
  console.log('========================================================================');
  console.log('=== [AG-221] GP-20017 J18 Minigun ADS Four-Light Score & Clearance   ===');
  console.log('========================================================================\n');

  const server = await serve(ROOT, 0);
  const url = `${server.origin}/index.html?solid=1&debug=1&raf=timer`;
  console.log('[AG-221] Server running at:', url);

  const browser = await launch({
    headless: false,
    args: ['--window-position=-2400,-2400', '--window-size=1920,1080', '--disable-features=CalculateNativeWinOcclusion']
  });

  try {
    const page = await browser.newPage({ width: 1920, height: 1080 });
    await page.goto(url, { timeout: 180000 });

    if (!(await page.waitFor('!!window.TT', { timeout: 180000 }))) {
      throw new Error('window.TT never appeared: ' + (page.errors[0] || ''));
    }

    await page.evaluate(`(() => {
      if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting();
      else if (window.DWOpening && typeof DWOpening.skip === 'function') DWOpening.skip();
    })()`);
    await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });

    const libCode = fs.readFileSync(LIB_JS_PATH, 'utf8');
    await page.evaluate(libCode);

    const seat = await page.evaluate(`(async () => {
      const T = window.TT;
      await startMatch(T, 'JERRY');
      if (T.clearZombies) T.clearZombies();
      T.setHp(1e5);
      T.grantAllWeapons();
      T.setViewFirstDbg(true);
      if (T.isUnarmed()) T.toggleHolster();
      T.setWorldTime(0.50);
      if (T.weather) { T.weather.raining = false; T.weather.intensity = 0; }
      for (let i = 0; i < 30; i++) T.stepFrame(1 / 60);
      const ots = T.otsDbg();
      return {
        x: +T.player.position.x.toFixed(4),
        y: +T.player.position.y.toFixed(4),
        z: +T.player.position.z.toFixed(4),
        yaw: +T.player.rotation.y.toFixed(6),
        otsYaw: +(ots.yaw || T.player.rotation.y).toFixed(6),
        otsPitch: +(ots.pitch || 0).toFixed(6)
      };
    })()`, 180000);

    console.log('[AG-221] Locked woods-trail seat:', JSON.stringify(seat));

    // Install helpers
    await page.evaluate(`((seat) => {
      const T = window.TT;
      const THREE = T.THREE;

      window.__ag221 = {
        seat,

        stepRendered(dt) {
          const nf = T.renderer && T.renderer._nodes && T.renderer._nodes.nodeFrame;
          if (nf && typeof nf.update === 'function') {
            nf.update();
            T.renderer.info.frame = nf.frameId;
          }
          T.stepFrame(dt);
        },

        async setupMinigunState({ worldTime, rain, intensity, ads }) {
          T.flightHold(true);
          T.setShotView(null);
          if (T.trainingDbg && T.trainingDbg.state().active) T.trainingDbg.leave();
          if (T.clearZombies) T.clearZombies();
          T.setHp(1e5);
          T.grantAllWeapons();
          T.addCash(999999);

          const gy = T.sampleHeight(seat.x, seat.z);
          T.player.position.set(seat.x, gy, seat.z);
          if (T.localPlayer && T.localPlayer.position) {
            T.localPlayer.position.set(seat.x, gy, seat.z);
          }
          T.player.rotation.y = seat.yaw;
          T.setAimYawDbg(seat.yaw);
          T.setOtsAimDbg(seat.otsYaw, 0);
          T.setVelDbg(0, 0);
          T.setMouseFireDbg(false);
          T.reloadClipDbg.hold(null);
          T.handsDbg.knifeHold(null);
          T.holdGrenadeAnim(null);
          T.setViewFirstDbg(true);
          if (T.isUnarmed()) T.toggleHolster();
          if (T.vaultDbg.flags().dualActive) T.toggleDualWieldDbg();

          const idx = T.WEAPON_ORDER.indexOf('minigun');
          T.setWeapon(idx);
          T.setAmmoDbg('minigun', 300);

          T.flightInput({ keys: [], zoom: !!ads, fire: false });
          T.setZoomHeldDbg(!!ads);

          for (let i = 0; i < 90; i++) {
            T.player.position.set(seat.x, gy, seat.z);
            if (T.localPlayer && T.localPlayer.position) T.localPlayer.position.set(seat.x, gy, seat.z);
            T.player.rotation.y = seat.yaw;
            T.setAimYawDbg(seat.yaw);
            T.setOtsAimDbg(seat.otsYaw, 0);
            T.setVelDbg(0, 0);
            T.setWorldTime(worldTime);
            if (T.weather) {
              T.weather.raining = !!rain;
              T.weather.intensity = intensity || 0;
            }
            this.stepRendered(1 / 60);
          }

          if (T.renderer && typeof T.renderer.compileAsync === 'function') {
            await T.renderer.compileAsync(T.scene, T.camera);
          }
          this.stepRendered(0);
          this.stepRendered(0);

          return this.sample();
        },

        setRefMode(mode) {
          const vm = T.viewmodelDbg && T.viewmodelDbg();
          if (!vm) return;
          if (mode === 'no-gun') {
            if (vm.gun && vm.gun.root) vm.gun.root.visible = false;
            if (vm.arms) { vm.arms.r.root.visible = true; vm.arms.l.root.visible = true; }
            vm.space.visible = true;
          } else if (mode === 'no-vm') {
            if (vm.gun && vm.gun.root) vm.gun.root.visible = true;
            if (vm.arms) { vm.arms.r.root.visible = true; vm.arms.l.root.visible = true; }
            vm.space.visible = false;
          } else {
            if (vm.gun && vm.gun.root) vm.gun.root.visible = true;
            if (vm.arms) { vm.arms.r.root.visible = true; vm.arms.l.root.visible = true; }
            vm.space.visible = true;
          }
          this.stepRendered(0);
        },

        sample() {
          const W = window.innerWidth, H = window.innerHeight;
          const vm = T.viewmodelDbg && T.viewmodelDbg();
          const fp = T.fpDbg();
          const toPx = (ndc) => ndc ? [
            +((ndc.x * 0.5 + 0.5) * W).toFixed(2),
            +((0.5 - ndc.y * 0.5) * H).toFixed(2),
            +((ndc.d ?? ndc.z ?? 0)).toFixed(4)
          ] : [0, 0, 0];

          const dotLocal = new THREE.Vector3(0, 0.330, 0.0355);
          const hoodTopLocal = new THREE.Vector3(0, 0.369, 0.01);
          const hoodBaseLocal = new THREE.Vector3(0, 0.2895, 0.01);
          const hoodLeftLocal = new THREE.Vector3(-0.0215, 0.330, 0.01);
          const hoodRightLocal = new THREE.Vector3(0.0215, 0.330, 0.01);
          const rearGripTopLocal = new THREE.Vector3(0, 0.320, -0.30);
          const muzzleLocal = new THREE.Vector3(0, 0, 1.01);

          const dotNdc = vm.ndc(vm.viewPoint(dotLocal));
          const hoodTopPx = toPx(vm.ndc(vm.viewPoint(hoodTopLocal)));
          const hoodBasePx = toPx(vm.ndc(vm.viewPoint(hoodBaseLocal)));
          const hoodLeftPx = toPx(vm.ndc(vm.viewPoint(hoodLeftLocal)));
          const hoodRightPx = toPx(vm.ndc(vm.viewPoint(hoodRightLocal)));
          const rearGripTopPx = toPx(vm.ndc(vm.viewPoint(rearGripTopLocal)));
          const muzzlePx = toPx(vm.ndc(vm.viewPoint(muzzleLocal)));

          return {
            currentWeapon: T.getCurrentWeapon(),
            firstPerson: !!(fp && fp.first && fp.w >= 0.99),
            worldTime: +T.getWorldTime().toFixed(4),
            vmActive: !!(vm && vm.info && vm.info.active),
            vmKey: vm && vm.info ? vm.info.key : null,
            vmRaise: vm && vm.info ? +vm.info.raise.toFixed(4) : 0,
            vmAds: vm && vm.info ? +vm.info.ads.toFixed(4) : 0,
            framePos: vm && vm.frame ? [+vm.frame.p.x.toFixed(4), +vm.frame.p.y.toFixed(4), +vm.frame.p.z.toFixed(4)] : null,
            dotNdc: { x: +dotNdc.x.toFixed(5), y: +dotNdc.y.toFixed(5), d: +dotNdc.d.toFixed(4) },
            dotPx: toPx(dotNdc),
            hoodWindowPx: {
              left: Math.min(hoodLeftPx[0], hoodRightPx[0]),
              right: Math.max(hoodLeftPx[0], hoodRightPx[0]),
              top: hoodTopPx[1],
              bottom: hoodBasePx[1],
              widthPx: +Math.abs(hoodRightPx[0] - hoodLeftPx[0]).toFixed(2),
              heightPx: +Math.abs(hoodBasePx[1] - hoodTopPx[1]).toFixed(2)
            },
            rearGripTopPx,
            muzzlePx,
            wristR: vm && vm.wrists && vm.wrists.r ? toPx(vm.ndc(vm.wrists.r.p)) : null,
            wristL: vm && vm.wrists && vm.wrists.l ? toPx(vm.ndc(vm.wrists.l.p)) : null
          };
        },

        auditGeometryAndClearance() {
          const src = T.weaponMeshes.minigun;
          src.updateMatrixWorld(true);
          const inv = new THREE.Matrix4().copy(src.matrixWorld).invert();
          const m = new THREE.Matrix4();
          const v = new THREE.Vector3();

          // Measure exact gun-local bounding boxes of the rear top grip (z in [-0.36, -0.20]), carry handle rubber, and J18 reflex sight parts
          let rearGripMaxY = -Infinity;
          let carryRubberMaxY = -Infinity;
          let reflexMinY = Infinity, reflexMaxY = -Infinity, reflexMinX = Infinity, reflexMaxX = -Infinity, reflexMinZ = Infinity, reflexMaxZ = -Infinity;
          let meshCount = 0;

          src.traverse((o) => {
            if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
            if (o === src.userData.laser || o === src.userData.flash) return;
            meshCount++;
            m.multiplyMatrices(inv, o.matrixWorld);
            const pa = o.geometry.attributes.position;
            let loY = Infinity, hiY = -Infinity, loZ = Infinity, hiZ = -Infinity, loX = Infinity, hiX = -Infinity;
            for (let i = 0; i < pa.count; i++) {
              v.set(pa.getX(i), pa.getY(i), pa.getZ(i)).applyMatrix4(m);
              if (v.x < loX) loX = v.x;
              if (v.x > hiX) hiX = v.x;
              if (v.y < loY) loY = v.y;
              if (v.y > hiY) hiY = v.y;
              if (v.z < loZ) loZ = v.z;
              if (v.z > hiZ) hiZ = v.z;
            }
            // Rear top grip slab spans z ~ -0.35 .. -0.21, y ~ 0.09 .. 0.32
            if (loZ < -0.24 && hiY > 0.28 && hiY < 0.325) {
              if (hiY > rearGripMaxY) rearGripMaxY = hiY;
            }
            // Carry handle rubber & ribs span y ~ 0.24 .. 0.281, z ~ -0.09 .. +0.09
            if (loZ > -0.10 && hiZ < 0.10 && hiY > 0.27 && hiY < 0.282) {
              if (hiY > carryRubberMaxY) carryRubberMaxY = hiY;
            }
            // Reflex sight components sit above y = 0.277
            if (loY >= 0.277 && loZ > -0.04 && hiZ < 0.06) {
              if (loY < reflexMinY) reflexMinY = loY;
              if (hiY > reflexMaxY) reflexMaxY = hiY;
              if (loX < reflexMinX) reflexMinX = loX;
              if (hiX > reflexMaxX) reflexMaxX = hiX;
              if (loZ < reflexMinZ) reflexMinZ = loZ;
              if (hiZ > reflexMaxZ) reflexMaxZ = hiZ;
            }
          });

          const sightLineY = 0.330;
          const clearanceOverRearGripMm = +((sightLineY - rearGripMaxY) * 1000).toFixed(2);
          const clearanceUnderHoodTopMm = +((0.361 - sightLineY) * 1000).toFixed(2);

          return {
            meshCount,
            sightDatum: { pos: [0, 0.330, -0.30], fwd: [0, 0, 1], dotCenter: [0, 0.330, 0.0355] },
            rearGripMaxY: +rearGripMaxY.toFixed(4),
            carryRubberMaxY: +carryRubberMaxY.toFixed(4),
            reflexBounds: {
              x: [+reflexMinX.toFixed(4), +reflexMaxX.toFixed(4)],
              y: [+reflexMinY.toFixed(4), +reflexMaxY.toFixed(4)],
              z: [+reflexMinZ.toFixed(4), +reflexMaxZ.toFixed(4)]
            },
            clearanceOverRearGripMm,
            clearanceUnderHoodTopMm
          };
        },

        async captureCloseups() {
          // Place a clean standalone inspection copy of weaponMeshes.minigun in noon light high in the clear sky so we can inspect Front, Left Side, 3/4, and Bore-Line clearance with zero background clutter
          T.setWorldTime(0.50);
          if (T.weather) { T.weather.raining = false; T.weather.intensity = 0; }
          const vm = T.viewmodelDbg && T.viewmodelDbg();
          if (vm && vm.root) vm.root.visible = false;

          const clone = T.weaponMeshes.minigun.clone(true);
          clone.visible = true;
          clone.traverse((o) => {
            if (o.userData) o.userData.vmEyeHide = false;
            if (o.name === 'laser' || o === clone.userData.laser) o.visible = false;
          });
          // Hide laser line children
          clone.children.forEach((c) => {
            if (c.type === 'Line' || (c.geometry && c.geometry.type === 'BufferGeometry' && c.position.z > 1.2)) {
              c.visible = false;
            }
          });

          const basePos = new THREE.Vector3(42, 18, -20);
          clone.position.copy(basePos);
          clone.rotation.set(0, 0, 0);
          clone.scale.setScalar(1);
          T.scene.add(clone);
          clone.updateMatrixWorld(true);

          if (T.renderer && typeof T.renderer.compileAsync === 'function') {
            await T.renderer.compileAsync(T.scene, T.camera);
          }

          return {
            cx: basePos.x,
            cy: basePos.y,
            cz: basePos.z
          };
        },

        setCloseupCam(camSpec) {
          const vm = T.viewmodelDbg && T.viewmodelDbg();
          if (vm && vm.root) vm.root.visible = false;
          T.setShotView(camSpec);
          this.stepRendered(0);
          if (vm && vm.root) vm.root.visible = false;
          T.renderFrame();
        }
      };
    })(${JSON.stringify(seat)})`);

    const geomAudit = await page.evaluate(`window.__ag221.auditGeometryAndClearance()`);
    console.log('[AG-221] Geometry & Clearance Audit:', JSON.stringify(geomAudit, null, 2));

    const telemetry = {
      generatedAt: new Date().toISOString(),
      seat,
      geomAudit,
      captures: {}
    };

    for (const light of LIGHTS) {
      for (const mode of ['hip', 'ads']) {
        const key = `${light.key}-${mode}`;
        console.log(`\n[AG-221] Capturing ${light.label} — ${mode.toUpperCase()}...`);
        const sample = await page.evaluate(`window.__ag221.setupMinigunState(${JSON.stringify({
          worldTime: light.worldTime,
          rain: light.rain,
          intensity: light.intensity,
          ads: mode === 'ads'
        })})`);

        if (page.errors.length > 0) {
          throw new Error(`Page error on ${key}: ${page.errors.join('; ')}`);
        }
        if (!sample.vmActive || sample.vmKey !== 'minigun' || sample.vmRaise < 0.999) {
          throw new Error(`Viewmodel assertion failed on ${key}: ${JSON.stringify(sample)}`);
        }
        if (mode === 'ads' && sample.vmAds < 0.999) {
          throw new Error(`ADS assertion failed on ${key}: vmAds=${sample.vmAds}`);
        }
        if (mode === 'hip' && sample.vmAds > 0.001) {
          throw new Error(`Hip assertion failed on ${key}: vmAds=${sample.vmAds}`);
        }

        const stillPath = path.join(OUT_DIR, `minigun-${key}.jpg`);
        await captureShot(page, stillPath);

        await page.evaluate(`window.__ag221.setRefMode('no-gun')`);
        await captureShot(page, path.join(TMP_DIR, `minigun-${key}-nogun.jpg`));

        await page.evaluate(`window.__ag221.setRefMode('no-vm')`);
        await captureShot(page, path.join(TMP_DIR, `minigun-${key}-novm.jpg`));

        await page.evaluate(`window.__ag221.setRefMode('normal')`);

        console.log(`  -> [PASS] minigun-${key}.jpg | vmAds=${sample.vmAds} | dotPx=${JSON.stringify(sample.dotPx)} | window=${sample.hoodWindowPx.widthPx}x${sample.hoodWindowPx.heightPx}px`);
        telemetry.captures[key] = sample;
      }
    }

    // Capture inspection closeups of J18 reflex sight & housing clearance (Front, Side, 3/4, Bore-line)
    console.log('\n[AG-221] Capturing J18 reflex sight & housing clearance close-ups...');
    const cPos = await page.evaluate(`window.__ag221.captureCloseups()`);

    const closeups = [
      {
        key: 'closeup-side-left',
        spec: { x: cPos.cx - 0.42, y: cPos.cy + 0.29, z: cPos.cz - 0.08, tx: cPos.cx, ty: cPos.cy + 0.27, tz: cPos.cz - 0.08, fov: 36 }
      },
      {
        key: 'closeup-front',
        spec: { x: cPos.cx + 0.02, y: cPos.cy + 0.31, z: cPos.cz + 0.42, tx: cPos.cx, ty: cPos.cy + 0.28, tz: cPos.cz - 0.05, fov: 34 }
      },
      {
        key: 'closeup-three-quarter',
        spec: { x: cPos.cx - 0.30, y: cPos.cy + 0.38, z: cPos.cz - 0.34, tx: cPos.cx, ty: cPos.cy + 0.26, tz: cPos.cz + 0.02, fov: 38 }
      },
      {
        key: 'closeup-bore-clearance',
        spec: { x: cPos.cx, y: cPos.cy + 0.330, z: cPos.cz - 0.52, tx: cPos.cx, ty: cPos.cy + 0.330, tz: cPos.cz + 0.20, fov: 28 }
      }
    ];

    for (const c of closeups) {
      await page.evaluate(`window.__ag221.setCloseupCam(${JSON.stringify(c.spec)})`);
      await captureShot(page, path.join(OUT_DIR, `${c.key}.jpg`));
      console.log(`  -> [PASS] Captured ${c.key}.jpg`);
    }

    const telemPath = path.join(OUT_DIR, 'telemetry.json');
    fs.writeFileSync(telemPath, JSON.stringify(telemetry, null, 2), 'utf8');
    console.log(`\n[AG-221] Saved telemetry to ${telemPath}`);
  } finally {
    await browser.close();
    server.close();
  }

  console.log('\n[AG-221] Building contact sheets and pixel metrics...');
  execSync('python qa/2026-11-03-AG-221/build-sheet.py', { stdio: 'inherit' });
}

main().catch((err) => {
  console.error('[AG-221] FATAL ERROR:', err);
  process.exit(1);
});
