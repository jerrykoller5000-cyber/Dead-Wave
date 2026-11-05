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
const OUT_DIR_225 = path.join(ROOT, 'qa/2026-11-03-AG-225');
const STILLS_DIR = path.join(OUT_DIR_225, 'stills');
const OUT_DIR_223 = path.join(ROOT, 'qa/2026-11-03-AG-223');
const OUT_DIR_221 = path.join(ROOT, 'qa/2026-11-03-AG-221');
const TMP_DIR_223 = path.join(OUT_DIR_223, '_ref');
const LIB_JS_PATH = path.join(ROOT, 'tools/tests/lib.js');

fs.mkdirSync(OUT_DIR_225, { recursive: true });
fs.mkdirSync(STILLS_DIR, { recursive: true });
fs.mkdirSync(OUT_DIR_223, { recursive: true });
fs.mkdirSync(OUT_DIR_221, { recursive: true });
fs.mkdirSync(TMP_DIR_223, { recursive: true });

const LIGHTS = [
  { key: 'noon', label: 'Noon (t=0.50)', worldTime: 0.50, rain: false, intensity: 0.0 },
  { key: 'overcast', label: 'Overcast (t=0.42)', worldTime: 0.42, rain: true, intensity: 0.85 },
  { key: 'dusk', label: 'Dusk (t=0.77)', worldTime: 0.77, rain: false, intensity: 0.0 },
  { key: 'night', label: 'Night (t=0.02)', worldTime: 0.02, rain: false, intensity: 0.0 }
];

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
  console.log('======================================================================================');
  console.log('=== [AG-225] GP-20020 Final 12-Gun Hip/ADS 4-Light Gate + 13-Weapon Noon Sheet     ===');
  console.log('======================================================================================\n');

  const server = await serve(ROOT, 0);
  const url = `${server.origin}/index.html?solid=1&debug=1&raf=timer`;
  console.log('[AG-225] Server running at:', url);

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

    console.log('[AG-225] Locked AG-219 woods-trail seat:', JSON.stringify(seat));

    await page.evaluate(`((seat) => {
      const T = window.TT;
      const THREE = T.THREE;

      window.__ag225 = {
        seat,

        stepRendered(dt) {
          const nf = T.renderer && T.renderer._nodes && T.renderer._nodes.nodeFrame;
          if (nf && typeof nf.update === 'function') {
            nf.update();
            T.renderer.info.frame = nf.frameId;
          }
          T.stepFrame(dt);
        },

        lockPlayerPose(worldTime = 0.50, rain = false, intensity = 0.0) {
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
          T.setWorldTime(worldTime);
          if (T.weather) {
            T.weather.raining = !!rain;
            T.weather.intensity = intensity || 0;
          }
        },

        async equipAndHoldNoonHip(w) {
          T.flightHold(true);
          if (T.trainingDbg && T.trainingDbg.state().active) T.trainingDbg.leave();
          if (T.clearZombies) T.clearZombies();
          T.setHp(1e5);
          T.grantAllWeapons();
          T.addCash(999999);
          this.lockPlayerPose(0.50, false, 0);

          T.flightInput({ keys: [], zoom: false, fire: false });
          T.setMouseFireDbg(false);
          T.setZoomHeldDbg(false);
          T.reloadClipDbg.hold(null);
          T.handsDbg.knifeHold(null);
          T.holdGrenadeAnim(null);
          T.setViewFirstDbg(true);
          if (T.isUnarmed()) T.toggleHolster();

          // Ensure any residual ADS from previous weapon decays to 0
          for (let i = 0; i < 120; i++) {
            this.lockPlayerPose(0.50, false, 0);
            this.stepRendered(1 / 60);
            const vm = T.viewmodelDbg && T.viewmodelDbg();
            if (i >= 15 && (!vm || !vm.info || vm.info.ads <= 0.0005)) break;
          }

          let holdFull1sVerified = false;

          if (w.kind === 'vm') {
            if (T.vaultDbg.flags().dualActive) T.toggleDualWieldDbg();
            const idx = T.WEAPON_ORDER.indexOf(w.key);
            for (let attempt = 0; attempt < 6; attempt++) {
              T.setWeapon(idx);
              T.setAmmoDbg(w.key, 999);
              for (let i = 0; i < 60; i++) {
                this.lockPlayerPose(0.50, false, 0);
                this.stepRendered(1 / 60);
              }
              const vm = T.viewmodelDbg && T.viewmodelDbg();
              if (T.getCurrentWeapon() === w.key && !T.vaultDbg.flags().dualActive && vm && vm.root && vm.root.visible && vm.info.active && vm.info.key === w.key && vm.info.raise === 1 && vm.info.ads === 0) {
                break;
              }
            }

            // Continuous 1.0-second (60 frames) hold at raise === 1 and ads === 0
            holdFull1sVerified = true;
            for (let i = 0; i < 60; i++) {
              this.lockPlayerPose(0.50, false, 0);
              this.stepRendered(1 / 60);
              const vm = T.viewmodelDbg && T.viewmodelDbg();
              if (!vm || !vm.root || !vm.root.visible || !vm.info || !vm.info.active || vm.info.key !== w.key || vm.info.raise !== 1 || vm.info.ads > 0.001) {
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
              this.lockPlayerPose(0.50, false, 0);
              this.stepRendered(1 / 60);
              const vm = T.viewmodelDbg && T.viewmodelDbg();
              const vmOff = !vm || (!vm.info.active && !vm.root.visible);
              const rVis = !!(T.weaponMeshes[base] && T.weaponMeshes[base].visible);
              const lVis = !!(T.offhandMeshes && T.offhandMeshes[base] && T.offhandMeshes[base].visible);
              if (T.getCurrentWeapon() === base && T.vaultDbg.flags().dualActive && vmOff && rVis && lVis) {
                break;
              }
            }
            holdFull1sVerified = true;
            for (let i = 0; i < 60; i++) {
              this.lockPlayerPose(0.50, false, 0);
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

        async setLightAndMode(w, light, ads) {
          T.flightInput({ keys: [], zoom: !!ads, fire: false });
          T.setZoomHeldDbg(!!ads);
          const targetAds = ads ? 1 : 0;
          for (let i = 0; i < 95; i++) {
            this.lockPlayerPose(light.worldTime, light.rain, light.intensity);
            this.stepRendered(1 / 60);
            const vm = T.viewmodelDbg && T.viewmodelDbg();
            if (i >= 12 && vm && vm.info && Math.abs(vm.info.ads - targetAds) < 0.0005) {
              break;
            }
          }
          this.stepRendered(0);
          this.stepRendered(0);
          return this.sample(w);
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

          let rootVisible = false, vmActive = false, vmRaise = 0, vmKey = null, vmAds = 0;
          let muzzleNdc = null, muzzlePx = null, gripNdc = null, gripPx = null;
          let wristR = null, wristL = null, wristRNdc = null, wristLNdc = null;
          let elbowRNdc = null, elbowLNdc = null, boreAngleDeg = null;
          let upperArmR = false, upperArmL = false, stockPresent = false, stockVisible = false;
          let akimboCarry = T.akimboDbg ? +T.akimboDbg.carry().toFixed(4) : 0;
          let holdW = T.getShoulderDbg ? +T.getShoulderDbg().w.toFixed(4) : 1;
          let rightGunVisible = false, leftGunVisible = false;

          if (vm) {
            rootVisible = !!(vm.root && vm.root.visible);
            vmActive = !!(vm.info && vm.info.active);
            vmRaise = vm.info ? +vm.info.raise.toFixed(4) : 0;
            vmKey = vm.info ? vm.info.key : null;
            vmAds = vm.info ? +vm.info.ads.toFixed(4) : 0;
            if (vm.arms) {
              upperArmR = !!(vm.arms.r && vm.arms.r.upper && vm.arms.r.meshes && vm.arms.r.meshes.upper);
              upperArmL = !!(vm.arms.l && vm.arms.l.upper && vm.arms.l.meshes && vm.arms.l.meshes.upper);
              if (vm.arms.r && vm.arms.r.root) {
                const er = vm.ndc(vm.arms.r.root.position);
                elbowRNdc = { x: +er.x.toFixed(4), y: +er.y.toFixed(4) };
              }
              if (vm.arms.l && vm.arms.l.root) {
                const el = vm.ndc(vm.arms.l.root.position);
                elbowLNdc = { x: +el.x.toFixed(4), y: +el.y.toFixed(4) };
              }
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
              const gNdc = vm.ndc(vm.viewPoint(new THREE.Vector3(0, 0, 0)));
              gripNdc = { x: +gNdc.x.toFixed(4), y: +gNdc.y.toFixed(4) };
              gripPx = toPx(gNdc);
              const dxPx = muzzlePx[0] - gripPx[0];
              const dyPx = gripPx[1] - muzzlePx[1];
              boreAngleDeg = +(Math.atan2(dyPx, Math.abs(dxPx) || 1e-6) * 180 / Math.PI).toFixed(1);
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
            vmAds,
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
            gripNdc,
            gripPx,
            boreAngleDeg,
            wristRNdc,
            wristLNdc,
            wristR,
            wristL,
            elbowRNdc,
            elbowLNdc
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

    const telemetry223 = {
      generatedAt: new Date().toISOString(),
      seat,
      weapons: {}
    };

    const telemetry225 = {
      generatedAt: new Date().toISOString(),
      seat,
      guns: {}
    };

    for (const w of WEAPONS_13) {
      console.log(`\n[AG-225] Equipping & holding 1.0s at Noon Hip (raise=1, ads=0) for ${w.label} (${w.key})...`);
      const noonHipSample = await page.evaluate(`window.__ag225.equipAndHoldNoonHip(${JSON.stringify(w)})`);

      if (page.errors.length > 0) {
        throw new Error(`Page error on ${w.key}: ${page.errors.join('; ')}`);
      }
      if (!noonHipSample.firstPerson || !noonHipSample.holdFull1sVerified) {
        throw new Error(`Noon Hip hold assertion failed on ${w.key}: fp=${noonHipSample.firstPerson}, hold1s=${noonHipSample.holdFull1sVerified}`);
      }

      // Save Noon Hip still to AG-223, AG-221, and AG-225
      const stillPath223 = path.join(OUT_DIR_223, `${w.key}.jpg`);
      const stillPath221 = path.join(OUT_DIR_221, `${w.key}.jpg`);
      await captureShot(page, stillPath223);
      fs.copyFileSync(stillPath223, stillPath221);

      if (w.kind === 'vm') {
        const stillPath225NoonHip = path.join(STILLS_DIR, `${w.key}-hip-noon.jpg`);
        fs.copyFileSync(stillPath223, stillPath225NoonHip);
      }

      // Capture dt=0 no-gun and no-vm reference frames at Noon Hip for pixel counts
      await page.evaluate(`window.__ag225.setRefMode(${JSON.stringify(w)}, 'no-gun')`);
      await captureShot(page, path.join(TMP_DIR_223, `${w.key}-nogun.jpg`));

      await page.evaluate(`window.__ag225.setRefMode(${JSON.stringify(w)}, 'no-vm')`);
      await captureShot(page, path.join(TMP_DIR_223, `${w.key}-novm.jpg`));

      await page.evaluate(`window.__ag225.setRefMode(${JSON.stringify(w)}, 'normal')`);

      telemetry223.weapons[w.key] = noonHipSample;

      if (w.kind === 'vm') {
        telemetry225.guns[w.key] = {
          hip: { noon: noonHipSample },
          ads: {}
        };

        // Remaining 3 lights at Hip (overcast, dusk, night)
        for (const light of LIGHTS.slice(1)) {
          const s = await page.evaluate(`window.__ag225.setLightAndMode(${JSON.stringify(w)}, ${JSON.stringify(light)}, false)`);
          if (!s.vmActive || s.vmKey !== w.key || s.vmRaise !== 1 || s.vmAds > 0.02) {
            throw new Error(`Hip assertion failed on ${w.key} (${light.key}): raise=${s.vmRaise}, ads=${s.vmAds}`);
          }
          await captureShot(page, path.join(STILLS_DIR, `${w.key}-hip-${light.key}.jpg`));
          telemetry225.guns[w.key].hip[light.key] = s;
        }

        // All 4 lights at ADS (noon, overcast, dusk, night)
        for (const light of LIGHTS) {
          const s = await page.evaluate(`window.__ag225.setLightAndMode(${JSON.stringify(w)}, ${JSON.stringify(light)}, true)`);
          if (!s.vmActive || s.vmKey !== w.key || s.vmRaise !== 1 || s.vmAds < 0.98) {
            throw new Error(`ADS assertion failed on ${w.key} (${light.key}): raise=${s.vmRaise}, ads=${s.vmAds}`);
          }
          await captureShot(page, path.join(STILLS_DIR, `${w.key}-ads-${light.key}.jpg`));
          telemetry225.guns[w.key].ads[light.key] = s;
        }

        console.log(`  -> [PASS] ${w.key}: Hip(4 lights) + ADS(4 lights) | muzzleNDC=(${noonHipSample.muzzleNdc.x}, ${noonHipSample.muzzleNdc.y}) | wristLNDC=(${noonHipSample.wristLNdc.x}, ${noonHipSample.wristLNdc.y}) | wristRNDC=(${noonHipSample.wristRNdc.x}, ${noonHipSample.wristRNdc.y})`);
      } else {
        console.log(`  -> [PASS] ${w.key}: Noon Hip captured for AG-221/AG-223 13-weapon sheet`);
      }
    }

    fs.writeFileSync(path.join(OUT_DIR_223, 'telemetry.json'), JSON.stringify(telemetry223, null, 2), 'utf8');
    fs.writeFileSync(path.join(OUT_DIR_221, 'all-weapons-fp-telemetry.json'), JSON.stringify(telemetry223, null, 2), 'utf8');
    fs.writeFileSync(path.join(OUT_DIR_225, 'telemetry.json'), JSON.stringify(telemetry225, null, 2), 'utf8');
    console.log('\n[AG-225] Saved telemetry JSONs.');
  } finally {
    await browser.close();
    server.close();
  }

  console.log('\n[AG-225] Rebuilding AG-221/AG-223 13-weapon sheet and AG-225 4-light Hip/ADS sheets...');
  execSync('python qa/2026-11-03-AG-223/build-sheet.py', { stdio: 'inherit' });
  execSync('python qa/2026-11-03-AG-225/build-sheets.py', { stdio: 'inherit' });
}

main().catch((err) => {
  console.error('[AG-225] FATAL ERROR:', err);
  process.exit(1);
});
