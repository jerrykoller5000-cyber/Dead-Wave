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
const OUT_DIR_223 = path.join(ROOT, 'qa/2026-11-03-AG-223');
const OUT_DIR_221 = path.join(ROOT, 'qa/2026-11-03-AG-221');
const TMP_DIR = path.join(OUT_DIR_223, '_ref');
const LIB_JS_PATH = path.join(ROOT, 'tools/tests/lib.js');

fs.mkdirSync(OUT_DIR_223, { recursive: true });
fs.mkdirSync(OUT_DIR_221, { recursive: true });
fs.mkdirSync(TMP_DIR, { recursive: true });

const WEAPONS_13 = [
  { key: 'pistol', label: 'Pistol', kind: 'vm', hasStock: false },
  { key: 'revolver', label: 'Revolver', kind: 'vm', hasStock: false },
  { key: 'uzi', label: 'Wasp (Uzi)', kind: 'vm', hasStock: false },
  { key: 'm4', label: 'GW-4 (M4)', kind: 'vm', hasStock: true },
  { key: 'ak', label: 'KR-7 (AK)', kind: 'vm', hasStock: true },
  { key: 'shotgun', label: 'Shotgun', kind: 'vm', hasStock: true },
  { key: 'aa12', label: 'Breacher-12', kind: 'vm', hasStock: true },
  { key: 'sniper', label: 'Sniper', kind: 'vm', hasStock: true },
  { key: 'launcher', label: 'Launcher', kind: 'vm', hasStock: false },
  { key: 'minigun', label: 'Minigun', kind: 'vm', hasStock: false },
  { key: 'flamer', label: 'Flamer', kind: 'vm', hasStock: false },
  { key: 'chainsaw', label: 'Chainsaw', kind: 'vm', hasStock: false },
  { key: 'akimbo-pistol', label: 'Akimbo Pistols', kind: 'akimbo', base: 'pistol', hasStock: false }
];

async function captureShot(page, filePath) {
  const shot = await page.send('Page.captureScreenshot', {
    format: 'jpeg',
    quality: 92,
    captureBeyondViewport: false
  });
  fs.writeFileSync(filePath, Buffer.from(shot.data, 'base64'));
}

async function main() {
  console.log('==================================================================================');
  console.log('=== [AG-223 / AG-221] All 13 Weapons in First Person (Post-CL-293 & GP-20020) ===');
  console.log('==================================================================================\n');

  const server = await serve(ROOT, 0);
  const url = `${server.origin}/index.html?solid=1&debug=1&raf=timer`;
  console.log('[AG-223] Server running at:', url);

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

    // Start match as JERRY and lock exact AG-219 woods-trail noon seat
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

    console.log('[AG-223] Locked AG-219 woods-trail seat:', JSON.stringify(seat));

    // Install in-page equip & sample helpers
    await page.evaluate(`((seat) => {
      const T = window.TT;
      const THREE = T.THREE;

      window.__ag223 = {
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
        },

        async resetSeatAndEquip(w) {
          T.flightHold(true);
          if (T.trainingDbg && T.trainingDbg.state().active) T.trainingDbg.leave();
          if (T.clearZombies) T.clearZombies();
          T.setHp(1e5);
          T.grantAllWeapons();
          T.addCash(999999);
          T.setWorldTime(0.50);
          if (T.weather) { T.weather.raining = false; T.weather.intensity = 0; }

          this.lockPlayerPose();
          T.flightInput({ keys: [], zoom: false, fire: false });
          T.setMouseFireDbg(false);
          T.setZoomHeldDbg(false);
          T.reloadClipDbg.hold(null);
          T.handsDbg.knifeHold(null);
          T.holdGrenadeAnim(null);
          T.setViewFirstDbg(true);
          if (T.isUnarmed()) T.toggleHolster();

          let holdFull1sVerified = false;

          if (w.kind === 'vm') {
            if (T.vaultDbg.flags().dualActive) T.toggleDualWieldDbg();
            const idx = T.WEAPON_ORDER.indexOf(w.key);
            for (let attempt = 0; attempt < 6; attempt++) {
              T.setWeapon(idx);
              T.setAmmoDbg(w.key, 999);
              for (let i = 0; i < 60; i++) {
                this.lockPlayerPose();
                this.stepRendered(1 / 60);
              }
              const vm = T.viewmodelDbg && T.viewmodelDbg();
              if (T.getCurrentWeapon() === w.key && !T.vaultDbg.flags().dualActive && vm && vm.root && vm.root.visible && vm.info.active && vm.info.key === w.key && vm.info.raise === 1) {
                break;
              }
            }

            // Claude's rule: assert vm.info.key === w.key AND raise === 1 continuously for 1.0 full second (60 frames at 1/60s) before each still!
            holdFull1sVerified = true;
            for (let i = 0; i < 60; i++) {
              this.lockPlayerPose();
              this.stepRendered(1 / 60);
              const vm = T.viewmodelDbg && T.viewmodelDbg();
              if (!vm || !vm.root || !vm.root.visible || !vm.info || !vm.info.active || vm.info.key !== w.key || vm.info.raise !== 1) {
                holdFull1sVerified = false;
                break;
              }
            }
          } else if (w.kind === 'akimbo') {
            const base = w.base || 'pistol';
            const owned = T.getWeaponOwned();
            for (const k of T.WEAPON_ORDER) owned[k] = (k === base);
            T.setDualOwnedDbg(base, true);
            const idx = T.WEAPON_ORDER.indexOf(base);
            T.setWeapon(idx);
            if (!T.vaultDbg.flags().dualActive) T.toggleDualWieldDbg();
            T.setAmmoDbg(base, 999);
            if (T.updateCarriedGear) T.updateCarriedGear(0, true);
            for (let i = 0; i < 120; i++) {
              this.lockPlayerPose();
              this.stepRendered(1 / 60);
              const vm = T.viewmodelDbg && T.viewmodelDbg();
              const vmOff = !vm || (!vm.info.active && !vm.root.visible);
              const rVis = !!(T.weaponMeshes[base] && T.weaponMeshes[base].visible);
              const lVis = !!(T.offhandMeshes && T.offhandMeshes[base] && T.offhandMeshes[base].visible);
              if (T.getCurrentWeapon() === base && T.vaultDbg.flags().dualActive && vmOff && rVis && lVis) {
                break;
              }
            }
            // Hold for 1.0 full second (60 frames at 1/60s)
            holdFull1sVerified = true;
            for (let i = 0; i < 60; i++) {
              this.lockPlayerPose();
              this.stepRendered(1 / 60);
              const rVis = !!(T.weaponMeshes[base] && T.weaponMeshes[base].visible);
              const lVis = !!(T.offhandMeshes && T.offhandMeshes[base] && T.offhandMeshes[base].visible);
              if (T.getCurrentWeapon() !== base || !T.vaultDbg.flags().dualActive || !rVis || !lVis) {
                holdFull1sVerified = false;
                break;
              }
            }
          }

          if (T.renderer && typeof T.renderer.compileAsync === 'function') {
            await T.renderer.compileAsync(T.scene, T.camera);
          }
          this.stepRendered(0);
          this.stepRendered(0);

          const s = this.sample(w);
          s.holdFull1sVerified = holdFull1sVerified;
          return s;
        },

        sample(w) {
          const W = window.innerWidth, H = window.innerHeight;
          const vm = T.viewmodelDbg && T.viewmodelDbg();
          const fp = T.fpDbg();
          const dualActive = !!(T.vaultDbg && T.vaultDbg.flags().dualActive);
          const curWeapon = T.getCurrentWeapon();
          const toPx = (ndc) => ndc ? [
            +((ndc.x * 0.5 + 0.5) * W).toFixed(2),
            +((0.5 - ndc.y * 0.5) * H).toFixed(2),
            +((ndc.d ?? ndc.z ?? 0)).toFixed(4)
          ] : [0, 0, 0];

          let rootVisible = false, vmActive = false, vmRaise = 0, vmKey = null;
          let muzzleNdc = null, muzzlePx = null, gripPx = null, wristR = null, wristL = null, wristRNdc = null, wristLNdc = null;
          let upperArmR = false, upperArmL = false, stockPresent = false, stockVisible = false;
          let akimboCarry = T.akimboDbg ? +T.akimboDbg.carry().toFixed(4) : 0;
          let holdW = T.getShoulderDbg ? +T.getShoulderDbg().w.toFixed(4) : 1;
          let rightGunVisible = false, leftGunVisible = false;

          if (vm) {
            rootVisible = !!(vm.root && vm.root.visible);
            vmActive = !!(vm.info && vm.info.active);
            vmRaise = vm.info ? +vm.info.raise.toFixed(4) : 0;
            vmKey = vm.info ? vm.info.key : null;
            if (vm.arms) {
              upperArmR = !!(vm.arms.r && vm.arms.r.upper && vm.arms.r.meshes && vm.arms.r.meshes.upper);
              upperArmL = !!(vm.arms.l && vm.arms.l.upper && vm.arms.l.meshes && vm.arms.l.meshes.upper);
            }
            if (vm.gun) {
              stockPresent = !!vm.gun.stock;
              stockVisible = !!(vm.gun.stock && vm.gun.stock.visible);
            }
            if (vmActive && w.kind === 'vm') {
              const src = T.weaponMeshes[w.key];
              const mzLocal = (src && src.userData && src.userData.muzzleLocal)
                ? src.userData.muzzleLocal.clone()
                : new THREE.Vector3(0, 0.04, 0.35);
              const ndc = vm.ndc(vm.viewPoint(mzLocal));
              muzzleNdc = { x: +ndc.x.toFixed(4), y: +ndc.y.toFixed(4) };
              muzzlePx = toPx(ndc);
              gripPx = toPx(vm.ndc(vm.viewPoint(new THREE.Vector3(0, 0, 0))));
              if (vm.wrists && vm.wrists.r && vm.wrists.r.p) {
                const nr = vm.ndc(vm.wrists.r.p);
                wristRNdc = { x: +nr.x.toFixed(4), y: +nr.y.toFixed(4) };
                wristR = toPx(nr);
              }
              if (vm.wrists && vm.wrists.l && vm.wrists.l.p) {
                const nl = vm.ndc(vm.wrists.l.p);
                wristLNdc = { x: +nl.x.toFixed(4), y: +nl.y.toFixed(4) };
                wristL = toPx(nl);
              }
            }
          }

          if (w.kind === 'akimbo') {
            const base = w.base || 'pistol';
            rightGunVisible = !!(T.weaponMeshes[base] && T.weaponMeshes[base].visible);
            leftGunVisible = !!(T.offhandMeshes && T.offhandMeshes[base] && T.offhandMeshes[base].visible);
          }

          return {
            key: w.key,
            label: w.label,
            kind: w.kind,
            currentWeapon: curWeapon,
            dualActive,
            firstPerson: !!(fp && fp.first && fp.w >= 0.99),
            worldTime: +T.getWorldTime().toFixed(4),
            rootVisible,
            vmActive,
            vmRaise,
            vmKey,
            upperArmR,
            upperArmL,
            stockPresent,
            stockVisible,
            akimboCarry,
            holdW,
            rightGunVisible,
            leftGunVisible,
            muzzleNdc,
            muzzlePx,
            gripPx,
            wristRNdc,
            wristLNdc,
            wristR,
            wristL,
            camPos: [+T.camera.position.x.toFixed(4), +T.camera.position.y.toFixed(4), +T.camera.position.z.toFixed(4)],
            playerPos: [+T.player.position.x.toFixed(4), +T.player.position.y.toFixed(4), +T.player.position.z.toFixed(4)]
          };
        },

        setRefMode(w, mode) {
          const vm = T.viewmodelDbg && T.viewmodelDbg();
          if (w.kind === 'vm' && vm) {
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
          } else if (w.kind === 'akimbo') {
            const base = w.base || 'pistol';
            const rGun = T.weaponMeshes[base];
            const lGun = T.offhandMeshes && T.offhandMeshes[base];
            if (!this._savedScales) {
              this._savedScales = {
                r: rGun ? rGun.scale.clone() : null,
                l: lGun ? lGun.scale.clone() : null
              };
            }
            if (mode === 'no-gun') {
              if (rGun) rGun.scale.setScalar(0);
              if (lGun) lGun.scale.setScalar(0);
              T.marine.visible = true;
            } else if (mode === 'no-vm') {
              if (rGun && this._savedScales.r) rGun.scale.copy(this._savedScales.r);
              if (lGun && this._savedScales.l) lGun.scale.copy(this._savedScales.l);
              T.marine.visible = false;
            } else {
              if (rGun && this._savedScales.r) rGun.scale.copy(this._savedScales.r);
              if (lGun && this._savedScales.l) lGun.scale.copy(this._savedScales.l);
              T.marine.visible = true;
            }
            this.stepRendered(0);
          }
        }
      };
    })(${JSON.stringify(seat)})`);

    const telemetry = {
      generatedAt: new Date().toISOString(),
      seat,
      weapons: {}
    };

    for (const w of WEAPONS_13) {
      console.log(`\n[AG-223] Equipping & holding 1s at raise=1 for ${w.label} (${w.key})...`);
      const sample = await page.evaluate(`window.__ag223.resetSeatAndEquip(${JSON.stringify(w)})`);

      if (page.errors.length > 0) {
        throw new Error(`Page error on ${w.key}: ${page.errors.join('; ')}`);
      }
      if (!sample.firstPerson) {
        throw new Error(`First-person assertion failed on ${w.key}: firstPerson=${sample.firstPerson}`);
      }
      if (Math.abs(sample.worldTime - 0.50) > 0.01) {
        throw new Error(`Noon worldTime assertion failed on ${w.key}: worldTime=${sample.worldTime}`);
      }
      if (!sample.holdFull1sVerified) {
        throw new Error(`1-second raise=1 hold assertion failed on ${w.key}`);
      }

      if (w.kind === 'vm') {
        if (sample.currentWeapon !== w.key || sample.dualActive) {
          throw new Error(`Weapon assertion failed on ${w.key}: currentWeapon=${sample.currentWeapon}, dualActive=${sample.dualActive}`);
        }
        if (!sample.rootVisible || !sample.vmActive || sample.vmKey !== w.key || sample.vmRaise !== 1) {
          throw new Error(`Viewmodel assertion failed on ${w.key}: rootVisible=${sample.rootVisible}, vmActive=${sample.vmActive}, vmKey=${sample.vmKey}, vmRaise=${sample.vmRaise}`);
        }
        if (!sample.upperArmR || !sample.upperArmL) {
          throw new Error(`CL-293 upper-arm assertion failed on ${w.key}: upperArmR=${sample.upperArmR}, upperArmL=${sample.upperArmL}`);
        }
        if (w.hasStock && (!sample.stockPresent || !sample.stockVisible)) {
          throw new Error(`CL-293 hip-stock assertion failed on ${w.key}: stockPresent=${sample.stockPresent}, stockVisible=${sample.stockVisible}`);
        }
      } else if (w.kind === 'akimbo') {
        const base = w.base || 'pistol';
        if (sample.currentWeapon !== base || !sample.dualActive) {
          throw new Error(`Akimbo weapon assertion failed on ${w.key}: currentWeapon=${sample.currentWeapon}, dualActive=${sample.dualActive}`);
        }
        if (!sample.rightGunVisible || !sample.leftGunVisible || sample.vmActive) {
          throw new Error(`Akimbo rest assertion failed on ${w.key}: right=${sample.rightGunVisible}, left=${sample.leftGunVisible}, vmActive=${sample.vmActive}`);
        }
      }

      // 1. Capture actual 1080p still (save to both AG-223 and AG-221 folders)
      const stillPath223 = path.join(OUT_DIR_223, `${w.key}.jpg`);
      const stillPath221 = path.join(OUT_DIR_221, `${w.key}.jpg`);
      await captureShot(page, stillPath223);
      fs.copyFileSync(stillPath223, stillPath221);

      // 2. Capture exact dt=0 no-gun reference frame (arms remain, gun hidden)
      await page.evaluate(`window.__ag223.setRefMode(${JSON.stringify(w)}, 'no-gun')`);
      const noGunPath = path.join(TMP_DIR, `${w.key}-nogun.jpg`);
      await captureShot(page, noGunPath);

      // 3. Capture exact dt=0 no-vm reference frame (gun + arms hidden)
      await page.evaluate(`window.__ag223.setRefMode(${JSON.stringify(w)}, 'no-vm')`);
      const noVmPath = path.join(TMP_DIR, `${w.key}-novm.jpg`);
      await captureShot(page, noVmPath);

      // Restore normal state
      await page.evaluate(`window.__ag223.setRefMode(${JSON.stringify(w)}, 'normal')`);

      console.log(`  -> [PASS] Captured ${w.key}.jpg | vmKey=${sample.vmKey || 'akimbo'} | raise=${sample.vmRaise} | stockVis=${sample.stockVisible} | upperArms=${sample.upperArmR && sample.upperArmL}`);
      telemetry.weapons[w.key] = sample;
    }

    const telemPath223 = path.join(OUT_DIR_223, 'telemetry.json');
    const telemPath221 = path.join(OUT_DIR_221, 'all-weapons-fp-telemetry.json');
    fs.writeFileSync(telemPath223, JSON.stringify(telemetry, null, 2), 'utf8');
    fs.writeFileSync(telemPath221, JSON.stringify(telemetry, null, 2), 'utf8');
    console.log(`\n[AG-223] Saved telemetry to ${telemPath223}`);
  } finally {
    await browser.close();
    server.close();
  }

  console.log('\n[AG-223] Running pixel diff verification & contact sheet builder...');
  execSync('python qa/2026-11-03-AG-223/build-sheet.py', { stdio: 'inherit' });
}

main().catch((err) => {
  console.error('[AG-223] FATAL ERROR:', err);
  process.exit(1);
});
