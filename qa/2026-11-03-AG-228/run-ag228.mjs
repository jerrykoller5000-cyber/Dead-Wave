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
const OUT_DIR = path.join(ROOT, 'qa/2026-11-03-AG-228');
const OUT_DIR_231 = path.join(ROOT, 'qa/2026-11-03-AG-231');
const STILLS_DIR = path.join(OUT_DIR, 'stills');
const STILLS_DIR_231 = path.join(OUT_DIR_231, 'stills');
const OUT_DIR_223 = path.join(ROOT, 'qa/2026-11-03-AG-223');
const OUT_DIR_221 = path.join(ROOT, 'qa/2026-11-03-AG-221');
const LIB_JS_PATH = path.join(ROOT, 'tools/tests/lib.js');

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(OUT_DIR_231, { recursive: true });
fs.mkdirSync(STILLS_DIR, { recursive: true });
fs.mkdirSync(STILLS_DIR_231, { recursive: true });
fs.mkdirSync(OUT_DIR_223, { recursive: true });
fs.mkdirSync(OUT_DIR_221, { recursive: true });

async function captureShot(page, filePath) {
  const shot = await page.send('Page.captureScreenshot', {
    format: 'jpeg',
    quality: 92,
    captureBeyondViewport: false,
  });
  const buf = Buffer.from(shot.data, 'base64');
  fs.writeFileSync(filePath, buf);
  const baseName = path.basename(filePath);
  fs.writeFileSync(path.join(STILLS_DIR_231, baseName), buf);
}

async function main() {
  console.log('======================================================================================');
  console.log('=== [AG-231 / AG-228] CL-301 Akimbo Pairs (Reload & Aim Verified), Minigun & Saw   ===');
  console.log('======================================================================================\n');

  const server = await serve(ROOT, 0);
  const url = `${server.origin}/index.html?solid=1&debug=1&raf=timer`;
  console.log('[AG-231] Server running at:', url);

  const browser = await launch({
    headless: false,
    args: ['--window-position=-2400,-2400', '--window-size=1920,1080', '--disable-features=CalculateNativeWinOcclusion'],
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

    const seatAndBuild = await page.evaluate(`(async () => {
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
      const ws = T.getWeaponSizeDbg ? T.getWeaponSizeDbg() : null;
      const uziMesh = T.weaponMeshes && T.weaponMeshes.uzi;
      let uziUnscaledZ = null;
      if (uziMesh) {
        const THREE = T.THREE;
        const savedScale = uziMesh.scale.clone();
        const savedPos = uziMesh.position.clone();
        const savedQuat = uziMesh.quaternion.clone();
        uziMesh.position.set(0, 0, 0);
        uziMesh.quaternion.identity();
        uziMesh.scale.set(1, 1, 1);
        uziMesh.updateMatrixWorld(true);
        const box = new THREE.Box3();
        uziMesh.traverse((o) => {
          if (!o.isMesh || !o.visible || !o.geometry) return;
          if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
          const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
          box.union(b);
        });
        uziUnscaledZ = {
          minZ: +box.min.z.toFixed(5),
          maxZ: +box.max.z.toFixed(5),
          lenZ: +(box.max.z - box.min.z).toFixed(5),
        };
        uziMesh.position.copy(savedPos);
        uziMesh.quaternion.copy(savedQuat);
        uziMesh.scale.copy(savedScale);
        uziMesh.updateMatrixWorld(true);
      }
      return {
        seat: {
          x: +T.player.position.x.toFixed(4),
          y: +T.player.position.y.toFixed(4),
          z: +T.player.position.z.toFixed(4),
          yaw: +T.player.rotation.y.toFixed(6),
          otsYaw: +(ots.yaw || T.player.rotation.y).toFixed(6),
          otsPitch: +(ots.pitch || 0).toFixed(6)
        },
        build: {
          uziWeaponSize: ws && ws.sizes ? ws.sizes.uzi : null,
          uziSizeFactor: ws && ws.factors ? +ws.factors.uzi.toFixed(5) : null,
          uziUnscaledZ,
          chainsawWeaponSize: ws && ws.sizes ? ws.sizes.chainsaw : null,
        }
      };
    })()`, 180000);

    const { seat, build } = seatAndBuild;
    console.log('[AG-231] Locked AG-219 woods-trail seat:', JSON.stringify(seat));
    console.log('[AG-231] Build info (GP-20023 Uzi):', JSON.stringify(build));

    await page.evaluate(`((seat) => {
      const T = window.TT;
      const THREE = T.THREE;

      window.__ag228 = {
        seat,

        stepRendered(dt) {
          const nf = T.renderer && T.renderer._nodes && T.renderer._nodes.nodeFrame;
          if (nf && typeof nf.update === 'function') {
            nf.update();
            T.renderer.info.frame = nf.frameId;
          }
          T.stepFrame(dt);
        },

        lockPlayerPose() {
          if (T.marineIdleDbg && T.marineIdleDbg()) T.marineIdleDbg().reset();
          const gy = T.sampleHeight(seat.x, seat.z);
          T.player.position.set(seat.x, gy, seat.z);
          if (T.localPlayer && T.localPlayer.position) {
            T.localPlayer.position.set(seat.x, gy, seat.z);
          }
          T.player.rotation.y = seat.yaw;
          T.setAimYawDbg(seat.yaw);
          T.setOtsAimDbg(seat.otsYaw, 0);
          T.setVelDbg(0, 0);
          T.setWorldTime(0.50);
          if (T.weather) { T.weather.raining = false; T.weather.intensity = 0; }
          if (T.clearZombies) T.clearZombies();
        },

        sample(key) {
          const W = window.innerWidth, H = window.innerHeight;
          const vm = T.viewmodelDbg && T.viewmodelDbg();
          const fp = T.fpDbg();
          const vFlags = T.vaultDbg ? T.vaultDbg.flags() : {};
          const curWeapon = T.getCurrentWeapon();
          const toPx = (ndc) => ndc ? [
            +((ndc.x * 0.5 + 0.5) * W).toFixed(2),
            +((0.5 - ndc.y * 0.5) * H).toFixed(2),
            +((ndc.d ?? ndc.z ?? 0)).toFixed(4)
          ] : [0, 0, 0];

          const srcR = T.weaponMeshes[key];
          const srcL = T.offhandMeshes && T.offhandMeshes[key];
          const mzLocal = (srcR && srcR.userData && srcR.userData.muzzleLocal)
            ? srcR.userData.muzzleLocal.clone()
            : new THREE.Vector3(0, 0.04, 0.45);
          const hold = T.WEAPON_HOLD && T.WEAPON_HOLD[key];
          const grLocal = (hold && hold.grip)
            ? new THREE.Vector3(hold.grip[0], hold.grip[1], hold.grip[2])
            : new THREE.Vector3(0, -0.05, 0);

          let vmActive = false, vmKey = null, vmRaise = 0, vmAkimbo = false, vmAds = 0, vmReloadU = null, handPlace = null;
          let muzzleRNdc = null, muzzleLNdc = null, gripRNdc = null, gripLNdc = null;
          let wristRNdc = null, wristLNdc = null, elbowRNdc = null, elbowLNdc = null;
          let wristRView = null, wristLView = null;
          let slideRZ = null, slideLZ = null;
          let barrelSpinRotZ = null;

          if (vm && vm.info) {
            vmActive = !!vm.info.active;
            vmKey = vm.info.key;
            vmRaise = +((vm.info.raise || 0).toFixed(4));
            vmAkimbo = !!vm.info.akimbo;
            vmAds = +((vm.info.ads || 0).toFixed(4));
            vmReloadU = vm.info.reloadU != null ? +vm.info.reloadU.toFixed(4) : null;
            handPlace = vm.info.handPlace || null;

            if (vmActive) {
              const mr = vm.ndc(vm.viewPoint(mzLocal, new THREE.Vector3(), 1));
              muzzleRNdc = { x: +mr.x.toFixed(4), y: +mr.y.toFixed(4), d: +mr.d.toFixed(4), px: toPx(mr) };
              const gr = vm.ndc(vm.viewPoint(grLocal, new THREE.Vector3(), 1));
              gripRNdc = { x: +gr.x.toFixed(4), y: +gr.y.toFixed(4), d: +gr.d.toFixed(4), px: toPx(gr) };

              if (vmAkimbo && vm.gun2) {
                const ml = vm.ndc(vm.viewPoint(mzLocal, new THREE.Vector3(), 2));
                muzzleLNdc = { x: +ml.x.toFixed(4), y: +ml.y.toFixed(4), d: +ml.d.toFixed(4), px: toPx(ml) };
                const gl = vm.ndc(vm.viewPoint(grLocal, new THREE.Vector3(), 2));
                gripLNdc = { x: +gl.x.toFixed(4), y: +gl.y.toFixed(4), d: +gl.d.toFixed(4), px: toPx(gl) };
              }
            }
            if (vm.wrists && vm.wrists.r && vm.wrists.l) {
              const wr = vm.ndc(vm.wrists.r.p);
              const wl = vm.ndc(vm.wrists.l.p);
              wristRNdc = { x: +wr.x.toFixed(4), y: +wr.y.toFixed(4), d: +wr.d.toFixed(4), px: toPx(wr) };
              wristLNdc = { x: +wl.x.toFixed(4), y: +wl.y.toFixed(4), d: +wl.d.toFixed(4), px: toPx(wl) };
              wristRView = [+vm.wrists.r.p.x.toFixed(4), +vm.wrists.r.p.y.toFixed(4), +vm.wrists.r.p.z.toFixed(4)];
              wristLView = [+vm.wrists.l.p.x.toFixed(4), +vm.wrists.l.p.y.toFixed(4), +vm.wrists.l.p.z.toFixed(4)];
            }
            if (vm.arms && vm.arms.r && vm.arms.l) {
              const er = vm.ndc(vm.arms.r.root.position);
              const el = vm.ndc(vm.arms.l.root.position);
              elbowRNdc = { x: +er.x.toFixed(4), y: +er.y.toFixed(4), d: +er.d.toFixed(4) };
              elbowLNdc = { x: +el.x.toFixed(4), y: +el.y.toFixed(4), d: +el.d.toFixed(4) };
            }
            if (vm.gun) {
              const actR = vm.gun.slide || vm.gun.work;
              if (actR) slideRZ = +actR.position.z.toFixed(5);
            }
            if (vm.gun2) {
              const actL = vm.gun2.slide || vm.gun2.work;
              if (actL) slideLZ = +actL.position.z.toFixed(5);
            }
          }

          if (srcR && srcR.userData && srcR.userData.barrelAssembly) {
            barrelSpinRotZ = +srcR.userData.barrelAssembly.rotation.z.toFixed(4);
          }

          return {
            currentWeapon: curWeapon,
            firstPerson: !!(fp && fp.first),
            dualActive: !!vFlags.dualActive,
            vmActive,
            vmKey,
            vmRaise,
            vmAkimbo,
            vmAds,
            vmReloadU,
            handPlace,
            shotsR: srcR && srcR.userData ? (srcR.userData.shots | 0) : 0,
            shotsL: srcL && srcL.userData ? (srcL.userData.shots | 0) : 0,
            slideRZ,
            slideLZ,
            barrelSpinRotZ,
            sawState: key === 'chainsaw' && T.sawCutDbg ? { ...T.sawCutDbg(), startPhase: T.sawStartDbg ? T.sawStartDbg().phase : null } : null,
            muzzleRNdc,
            muzzleLNdc,
            gripRNdc,
            gripLNdc,
            wristRNdc,
            wristLNdc,
            wristRView,
            wristLView,
            elbowRNdc,
            elbowLNdc
          };
        },

        equipPairAndHold(key) {
          this.lockPlayerPose();
          T.setViewFirstDbg(true);
          if (T.isUnarmed()) T.toggleHolster();
          T.setZoomHeldDbg(false);
          T.setMouseFireDbg(false);
          T.reloadClipDbg.hold(null);
          T.setDualOwnedDbg(key, true);
          T.setWeapon(T.WEAPON_ORDER.indexOf(key));
          const maxMag = (T.magazinesDbg && T.magazinesDbg(key)) ? T.magazinesDbg(key).size : 15;
          T.setMagazinesDbg(key, maxMag, [maxMag, maxMag, maxMag, maxMag], maxMag);

          for (let i = 0; i < 6; i++) {
            this.lockPlayerPose();
            this.stepRendered(1 / 60);
          }
          if (!T.vaultDbg.flags().dualActive) {
            T.toggleDualWieldDbg();
          }
          for (let i = 0; i < 95; i++) {
            this.lockPlayerPose();
            this.stepRendered(1 / 60);
            const vm = T.viewmodelDbg && T.viewmodelDbg();
            if (i >= 20 && vm && vm.info && vm.info.active && vm.info.key === key && vm.info.akimbo && vm.info.raise === 1) {
              break;
            }
          }
          let holdFrames = 0;
          for (let i = 0; i < 60; i++) {
            this.lockPlayerPose();
            this.stepRendered(1 / 60);
            const vm = T.viewmodelDbg && T.viewmodelDbg();
            if (vm && vm.info && vm.info.active && vm.info.key === key && vm.info.akimbo && vm.info.raise === 1) {
              holdFrames++;
            }
          }
          this.stepRendered(0);
          const s = this.sample(key);
          s.holdFrames = holdFrames;
          return s;
        },

        firePairHand(key, wantSide) {
          T.setMouseFireDbg(false);
          T.setZoomHeldDbg(false);
          const maxMag = (T.magazinesDbg && T.magazinesDbg(key)) ? T.magazinesDbg(key).size : 15;
          T.setMagazinesDbg(key, maxMag, [maxMag, maxMag, maxMag, maxMag], maxMag);
          for (let i = 0; i < 30; i++) {
            this.lockPlayerPose();
            this.stepRendered(1 / 60);
          }

          for (let attempt = 0; attempt < 4; attempt++) {
            const before = this.sample(key);
            T.setMouseFireDbg(true);
            this.lockPlayerPose();
            this.stepRendered(1 / 60);
            T.setMouseFireDbg(false);
            const after1 = this.sample(key);
            const rFired = after1.shotsR > before.shotsR;
            const lFired = after1.shotsL > before.shotsL;

            if ((wantSide === 'r' && rFired) || (wantSide === 'l' && lFired)) {
              this.lockPlayerPose();
              this.stepRendered(1 / 60);
              this.stepRendered(0);
              const res = this.sample(key);
              res.firedSide = wantSide;
              res.deltaShotsR = res.shotsR - before.shotsR;
              res.deltaShotsL = res.shotsL - before.shotsL;
              return res;
            }
            for (let k = 0; k < 24; k++) {
              this.lockPlayerPose();
              this.stepRendered(1 / 60);
            }
          }
          throw new Error('Failed to fire desired side ' + wantSide + ' on ' + key);
        },

        startPairReloadToDip(key) {
          T.setMouseFireDbg(false);
          T.setZoomHeldDbg(false);
          T.reloadClipDbg.hold(null);
          const maxMag = (T.magazinesDbg && T.magazinesDbg(key)) ? T.magazinesDbg(key).size : 15;
          T.setMagazinesDbg(key, 1, [maxMag, maxMag, maxMag, maxMag], 1);
          T.setAmmoDbg(key, 2);
          for (let i = 0; i < 20; i++) {
            this.lockPlayerPose();
            this.stepRendered(1 / 60);
          }
          T.startReload();
          // Step real reload frames until viewmodelDbg().info.reloadU is in [0.42, 0.50] (inside 0.35-0.55)
          for (let i = 0; i < 160; i++) {
            this.lockPlayerPose();
            this.stepRendered(1 / 60);
            const vm = T.viewmodelDbg && T.viewmodelDbg();
            const u = vm && vm.info ? vm.info.reloadU : null;
            if (u != null && u >= 0.42 && u <= 0.50) {
              break;
            }
          }
          // Render this exact frame without advancing reloadTimer!
          this.stepRendered(0);
          return this.sample(key);
        },

        finishReload() {
          T.reloadClipDbg.hold(null);
          for (let i = 0; i < 160; i++) {
            this.lockPlayerPose();
            this.stepRendered(1 / 60);
            if (!T.isReloading()) break;
          }
          for (let i = 0; i < 25; i++) {
            this.lockPlayerPose();
            this.stepRendered(1 / 60);
          }
        },

        startPairAim(key) {
          T.setMouseFireDbg(false);
          T.setZoomHeldDbg(true);
          for (let i = 0; i < 95; i++) {
            this.lockPlayerPose();
            this.stepRendered(1 / 60);
            const vm = T.viewmodelDbg && T.viewmodelDbg();
            if (i >= 15 && vm && vm.info && vm.info.ads >= 0.999) break;
          }
          // Keep zoomHeld = true while taking the screenshot!
          this.stepRendered(0);
          return this.sample(key);
        },

        finishAim() {
          T.setZoomHeldDbg(false);
          for (let i = 0; i < 80; i++) {
            this.lockPlayerPose();
            this.stepRendered(1 / 60);
            const vm = T.viewmodelDbg && T.viewmodelDbg();
            if (vm && vm.info && vm.info.ads <= 0.001) break;
          }
        },

        equipSingleAndHold(key) {
          this.lockPlayerPose();
          T.setViewFirstDbg(true);
          if (T.isUnarmed()) T.toggleHolster();
          T.setZoomHeldDbg(false);
          T.setMouseFireDbg(false);
          T.reloadClipDbg.hold(null);
          if (T.vaultDbg.flags().dualActive) {
            T.toggleDualWieldDbg();
          }
          T.setWeapon(T.WEAPON_ORDER.indexOf(key));
          if (key === 'chainsaw' && T.setSawHeatDbg) {
            T.setSawHeatDbg(0);
          }
          for (let i = 0; i < 110; i++) {
            this.lockPlayerPose();
            this.stepRendered(1 / 60);
            const vm = T.viewmodelDbg && T.viewmodelDbg();
            const sawReady = key !== 'chainsaw' || (T.sawStartDbg && T.sawStartDbg().phase === 'ready');
            if (i >= 25 && vm && vm.info && vm.info.active && vm.info.key === key && !vm.info.akimbo && vm.info.raise === 1 && sawReady) {
              break;
            }
          }
          let holdFrames = 0;
          for (let i = 0; i < 60; i++) {
            this.lockPlayerPose();
            this.stepRendered(1 / 60);
            const vm = T.viewmodelDbg && T.viewmodelDbg();
            if (vm && vm.info && vm.info.active && vm.info.key === key && !vm.info.akimbo && vm.info.raise === 1) {
              holdFrames++;
            }
          }
          this.stepRendered(0);
          const s = this.sample(key);
          s.holdFrames = holdFrames;
          return s;
        },

        startFireMinigun() {
          const before = this.sample('minigun');
          T.setMouseFireDbg(true);
          for (let i = 0; i < 48; i++) {
            this.lockPlayerPose();
            this.stepRendered(1 / 60);
          }
          this.stepRendered(0);
          const s = this.sample('minigun');
          s.deltaShotsR = s.shotsR - before.shotsR;
          return s;
        },

        stopFire() {
          T.setMouseFireDbg(false);
          for (let i = 0; i < 30; i++) {
            this.lockPlayerPose();
            this.stepRendered(1 / 60);
          }
        },

        startCutChainsaw() {
          if (T.setSawHeatDbg) T.setSawHeatDbg(0);
          T.setMouseFireDbg(true);
          for (let i = 0; i < 36; i++) {
            this.lockPlayerPose();
            this.stepRendered(1 / 60);
          }
          this.stepRendered(0);
          return this.sample('chainsaw');
        }
      };
    })(${JSON.stringify(seat)})`);

    const telemetry = {
      generatedAt: new Date().toISOString(),
      seat,
      build,
      pairs: {},
      minigun: {},
      chainsaw: {},
    };

    function assertState(s, expectedKey, expectedAkimbo, label) {
      if (page.errors.length > 0) {
        throw new Error(`Page error during ${label}: ${page.errors.join('; ')}`);
      }
      if (
        !s.firstPerson ||
        s.currentWeapon !== expectedKey ||
        !s.vmActive ||
        s.vmKey !== expectedKey ||
        s.vmAkimbo !== expectedAkimbo ||
        s.vmRaise !== 1
      ) {
        throw new Error(
          `Assertion failed on ${label}: weapon=${s.currentWeapon}, vmActive=${s.vmActive}, vmKey=${s.vmKey}, vmAkimbo=${s.vmAkimbo} (want ${expectedAkimbo}), vmRaise=${s.vmRaise}`
        );
      }
    }

    for (const key of ['pistol', 'uzi', 'revolver']) {
      console.log(`\n[AG-231] Testing Akimbo Pair: ${key}...`);
      telemetry.pairs[key] = {};

      // 1. Rest
      const sRest = await page.evaluate(`window.__ag228.equipPairAndHold(${JSON.stringify(key)})`);
      assertState(sRest, key, true, `${key}-pair-rest`);
      if (sRest.holdFrames !== 60 || sRest.handPlace !== 'pair') {
        throw new Error(`Pair rest hold failed on ${key}: holdFrames=${sRest.holdFrames}, handPlace=${sRest.handPlace}`);
      }
      const restPath = path.join(STILLS_DIR, `${key}-pair-rest.jpg`);
      await captureShot(page, restPath);
      if (key === 'pistol') {
        fs.copyFileSync(restPath, path.join(OUT_DIR_223, 'akimbo-pistol.jpg'));
        fs.copyFileSync(restPath, path.join(OUT_DIR_221, 'akimbo-pistol.jpg'));
      }
      telemetry.pairs[key].rest = sRest;

      // 2. Fire Right Hand
      const sFireR = await page.evaluate(`window.__ag228.firePairHand(${JSON.stringify(key)}, 'r')`);
      assertState(sFireR, key, true, `${key}-pair-fire-r`);
      if (sFireR.deltaShotsR < 1 || sFireR.deltaShotsL !== 0) {
        throw new Error(`Right-hand fire assertion failed on ${key}: dR=${sFireR.deltaShotsR}, dL=${sFireR.deltaShotsL}`);
      }
      await captureShot(page, path.join(STILLS_DIR, `${key}-pair-fire-r.jpg`));
      telemetry.pairs[key].fireR = sFireR;

      // 3. Fire Left Hand
      const sFireL = await page.evaluate(`window.__ag228.firePairHand(${JSON.stringify(key)}, 'l')`);
      assertState(sFireL, key, true, `${key}-pair-fire-l`);
      if (sFireL.deltaShotsL < 1 || sFireL.deltaShotsR !== 0) {
        throw new Error(`Left-hand fire assertion failed on ${key}: dR=${sFireR.deltaShotsR}, dL=${sFireL.deltaShotsL}`);
      }
      await captureShot(page, path.join(STILLS_DIR, `${key}-pair-fire-l.jpg`));
      telemetry.pairs[key].fireL = sFireL;

      // 4. Reload (real reload stepped to u in [0.35, 0.55], screenshot taken BEFORE finishing reload!)
      const sReload = await page.evaluate(`window.__ag228.startPairReloadToDip(${JSON.stringify(key)})`);
      assertState(sReload, key, true, `${key}-pair-reload`);
      if (sReload.vmReloadU == null || sReload.vmReloadU < 0.35 || sReload.vmReloadU > 0.55) {
        throw new Error(`Reload hold assertion failed on ${key}: reloadU=${sReload.vmReloadU} (want 0.35..0.55)`);
      }
      const reloadDipR = sRest.gripRNdc.y - sReload.gripRNdc.y;
      const reloadDipL = sRest.gripLNdc.y - sReload.gripLNdc.y;
      if (reloadDipR <= 0.15 || reloadDipL <= 0.15) {
        throw new Error(
          `Reload grip NDC movement failed on ${key}: restGripY=${sRest.gripRNdc.y}, reloadGripY=${sReload.gripRNdc.y}, dipR=${reloadDipR.toFixed(4)}, dipL=${reloadDipL.toFixed(4)} (want > 0.15)`
        );
      }
      sReload.gripDipNdcR = +reloadDipR.toFixed(4);
      sReload.gripDipNdcL = +reloadDipL.toFixed(4);
      await captureShot(page, path.join(STILLS_DIR, `${key}-pair-reload.jpg`));
      await page.evaluate(`window.__ag228.finishReload()`);
      telemetry.pairs[key].reload = sReload;

      // 5. Right-click (aim, screenshot taken WHILE zoomHeld = true and ads > 0.95!)
      const sAim = await page.evaluate(`window.__ag228.startPairAim(${JSON.stringify(key)})`);
      assertState(sAim, key, true, `${key}-pair-aim`);
      if (sAim.vmAds <= 0.95) {
        throw new Error(`Right-click aim assertion failed on ${key}: ads=${sAim.vmAds} (want > 0.95)`);
      }
      const aimInR = sRest.gripRNdc.x - sAim.gripRNdc.x;
      const aimInL = sAim.gripLNdc.x - sRest.gripLNdc.x;
      const aimUpR = sAim.gripRNdc.y - sRest.gripRNdc.y;
      const aimUpL = sAim.gripLNdc.y - sRest.gripLNdc.y;
      if (aimInR <= 0.015 || aimInL <= 0.015 || aimUpR <= 0.03 || aimUpL <= 0.03) {
        throw new Error(
          `Right-click grip NDC movement failed on ${key}: aimInR=${aimInR.toFixed(4)}, aimInL=${aimInL.toFixed(4)}, aimUpR=${aimUpR.toFixed(4)}, aimUpL=${aimUpL.toFixed(4)}`
        );
      }
      sAim.gripInNdcR = +aimInR.toFixed(4);
      sAim.gripInNdcL = +aimInL.toFixed(4);
      sAim.gripUpNdcR = +aimUpR.toFixed(4);
      sAim.gripUpNdcL = +aimUpL.toFixed(4);
      await captureShot(page, path.join(STILLS_DIR, `${key}-pair-aim.jpg`));
      await page.evaluate(`window.__ag228.finishAim()`);
      telemetry.pairs[key].aim = sAim;

      console.log(
        `  -> [PASS] ${key} pair:\n` +
        `     rest:   gripR=(${sRest.gripRNdc.x}, ${sRest.gripRNdc.y}) gripL=(${sRest.gripLNdc.x}, ${sRest.gripLNdc.y}) muzzleR=(${sRest.muzzleRNdc.x}, ${sRest.muzzleRNdc.y})\n` +
        `     fireR:  dShotsR=${sFireR.deltaShotsR} gripR=(${sFireR.gripRNdc.x}, ${sFireR.gripRNdc.y}) slideRZ=${sFireR.slideRZ}\n` +
        `     fireL:  dShotsL=${sFireL.deltaShotsL} gripL=(${sFireL.gripLNdc.x}, ${sFireL.gripLNdc.y}) slideLZ=${sFireL.slideLZ}\n` +
        `     reload: u=${sReload.vmReloadU} gripR=(${sReload.gripRNdc.x}, ${sReload.gripRNdc.y}) dip=-${sReload.gripDipNdcR} NDC\n` +
        `     aim:    ads=${sAim.vmAds} gripR=(${sAim.gripRNdc.x}, ${sAim.gripRNdc.y}) dIn=-${sAim.gripInNdcR} dUp=+${sAim.gripUpNdcR} NDC`
      );
    }

    // Minigun at rest and firing
    console.log('\n[AG-231] Testing Minigun (rest & firing)...');
    const sMiniRest = await page.evaluate(`window.__ag228.equipSingleAndHold('minigun')`);
    assertState(sMiniRest, 'minigun', false, 'minigun-rest');
    const miniRestPath = path.join(STILLS_DIR, 'minigun-rest.jpg');
    await captureShot(page, miniRestPath);
    fs.copyFileSync(miniRestPath, path.join(OUT_DIR_223, 'minigun.jpg'));
    fs.copyFileSync(miniRestPath, path.join(OUT_DIR_221, 'minigun.jpg'));
    telemetry.minigun.rest = sMiniRest;

    const sMiniFire = await page.evaluate(`window.__ag228.startFireMinigun()`);
    assertState(sMiniFire, 'minigun', false, 'minigun-fire');
    if (sMiniFire.deltaShotsR < 3) {
      throw new Error(`Minigun fire assertion failed: deltaShotsR=${sMiniFire.deltaShotsR}`);
    }
    await captureShot(page, path.join(STILLS_DIR, 'minigun-fire.jpg'));
    await page.evaluate(`window.__ag228.stopFire()`);
    telemetry.minigun.fire = sMiniFire;
    console.log(
      `  -> [PASS] minigun: rest muzzle=(${sMiniRest.muzzleRNdc.x}, ${sMiniRest.muzzleRNdc.y}) wristR=(${sMiniRest.wristRNdc.x}, ${sMiniRest.wristRNdc.y}) | fire shots=${sMiniFire.deltaShotsR}`
    );

    // Chainsaw idle and cutting
    console.log('\n[AG-231] Testing Chainsaw (idle & cutting)...');
    const sSawIdle = await page.evaluate(`window.__ag228.equipSingleAndHold('chainsaw')`);
    assertState(sSawIdle, 'chainsaw', false, 'chainsaw-idle');
    const sawIdlePath = path.join(STILLS_DIR, 'chainsaw-idle.jpg');
    await captureShot(page, sawIdlePath);
    fs.copyFileSync(sawIdlePath, path.join(OUT_DIR_223, 'chainsaw.jpg'));
    fs.copyFileSync(sawIdlePath, path.join(OUT_DIR_221, 'chainsaw.jpg'));
    telemetry.chainsaw.idle = sSawIdle;

    const sSawCut = await page.evaluate(`window.__ag228.startCutChainsaw()`);
    assertState(sSawCut, 'chainsaw', false, 'chainsaw-cut');
    if (!sSawCut.sawState || sSawCut.sawState.heat <= sSawIdle.sawState.heat) {
      throw new Error(`Chainsaw cutting assertion failed: sawState=${JSON.stringify(sSawCut.sawState)}`);
    }
    await captureShot(page, path.join(STILLS_DIR, 'chainsaw-cut.jpg'));
    await page.evaluate(`window.__ag228.stopFire()`);
    telemetry.chainsaw.cut = sSawCut;
    console.log(
      `  -> [PASS] chainsaw: idle muzzle=(${sSawIdle.muzzleRNdc.x}, ${sSawIdle.muzzleRNdc.y}) | cut muzzle=(${sSawCut.muzzleRNdc.x}, ${sSawCut.muzzleRNdc.y}) heat=${sSawCut.sawState.heat.toFixed(3)}`
    );

    // Also update single-gun uzi for AG-221/AG-223 sheet (GP-20023 stockless Uzi with WEAPON_SIZE.uzi.len = 0.660)
    const sUziSingle = await page.evaluate(`window.__ag228.equipSingleAndHold('uzi')`);
    assertState(sUziSingle, 'uzi', false, 'uzi-single');
    const uziSinglePath = path.join(OUT_DIR_223, 'uzi.jpg');
    await captureShot(page, uziSinglePath);
    fs.copyFileSync(uziSinglePath, path.join(OUT_DIR_221, 'uzi.jpg'));

    fs.writeFileSync(path.join(OUT_DIR, 'telemetry.json'), JSON.stringify(telemetry, null, 2), 'utf8');
    fs.writeFileSync(path.join(OUT_DIR_231, 'telemetry.json'), JSON.stringify(telemetry, null, 2), 'utf8');
    console.log('\n[AG-231] Saved telemetry.json to qa/2026-11-03-AG-228/ and qa/2026-11-03-AG-231/');
  } finally {
    await browser.close();
    server.close();
  }

  console.log('\n[AG-231] Building AG-228 / AG-231 contact sheets and refreshing AG-221/all-weapons-fp.jpg...');
  execSync('python qa/2026-11-03-AG-228/build-sheets.py', { stdio: 'inherit' });
}

main().catch((err) => {
  console.error('[AG-231] FATAL ERROR:', err);
  process.exit(1);
});
