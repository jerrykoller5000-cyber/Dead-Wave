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
const OUT_DIR = path.join(ROOT, 'qa/2026-11-04-AG-232');
const LIB_JS_PATH = path.join(ROOT, 'tools/tests/lib.js');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function captureFile(page, filename) {
  const shot = await page.send('Page.captureScreenshot', {
    format: 'jpeg',
    quality: 92,
    captureBeyondViewport: false,
  });
  const outPath = path.join(OUT_DIR, filename);
  fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
  console.log('Saved', filename);
  return outPath;
}

async function main() {
  console.log('======================================================================================');
  console.log('=== [AG-232] GP-20022 Rebuilt Minigun & Chainsaw + CL-301 Hands + GB-275 3P Holds ===');
  console.log('======================================================================================\n');

  const server = await serve(ROOT, 0);
  const url = `${server.origin}/index.html?solid=1&debug=1&raf=timer`;
  console.log('[AG-232] Server running at:', url);

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
      const holds = T.getShoulderDbg ? T.getShoulderDbg().holds : null;
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
          chainsawWeaponSize: ws && ws.sizes ? ws.sizes.chainsaw : null,
          chainsawFactor: ws && ws.factors ? +ws.factors.chainsaw.toFixed(5) : null,
          minigunScale: T.weaponMeshes && T.weaponMeshes.minigun ? +T.weaponMeshes.minigun.scale.x.toFixed(4) : null,
          chainsawScale: T.weaponMeshes && T.weaponMeshes.chainsaw ? +T.weaponMeshes.chainsaw.scale.x.toFixed(4) : null,
          chainsawHold3P: holds ? holds.chainsaw : null,
          minigunHold3P: holds ? holds.minigun : null,
        }
      };
    })()`, 180000);

    const { seat, build } = seatAndBuild;
    console.log('[AG-232] Locked seat:', JSON.stringify(seat));
    console.log('[AG-232] Build info:', JSON.stringify(build));

    await page.evaluate(`((seat) => {
      const T = window.TT;
      const THREE = T.THREE;

      window.__ag232 = {
        seat,
        worldTime: 0.50,
        SOCKETS: {
          minigun: { grip: [0, -0.017, -0.52], support: [-0.075, 0.263, 0.16] },
          chainsaw: { grip: [0, -0.014, -0.46], support: [-0.01, 0.246, -0.035] },
        },

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
          T.setWorldTime(this.worldTime);
          if (T.weather) { T.weather.raining = false; T.weather.intensity = 0; }
          if (T.clearZombies) T.clearZombies();
        },

        equipFPAndHold(key) {
          T.setShotView(null);
          T.setViewFirstDbg(true);
          T.setZoomHeldDbg(false);
          T.setMouseFireDbg(false);
          if (T.isUnarmed && T.isUnarmed()) T.toggleHolster();
          if (T.viewmodelDbg().info.akimbo) T.toggleDualWieldDbg();
          const idx = T.WEAPON_ORDER.indexOf(key);
          for (let i = 0; i < 16 && T.getCurrentWeapon() !== key; i++) {
            T.setWeapon(idx);
            for (let k = 0; k < 10; k++) {
              this.lockPlayerPose();
              this.stepRendered(1 / 60);
            }
          }
          for (let i = 0; i < 240; i++) {
            this.lockPlayerPose();
            this.stepRendered(1 / 60);
            const vm = T.viewmodelDbg();
            const sawDone = key !== 'chainsaw' || !T.sawStartDbg || T.sawStartDbg().phase === 'done' || T.sawStartDbg().phase === 'idle';
            if (vm && vm.info.active && vm.info.key === key && !vm.info.akimbo && vm.info.raise === 1 && sawDone) break;
          }
          let holdFrames = 0;
          for (let i = 0; i < 60; i++) {
            this.lockPlayerPose();
            this.stepRendered(1 / 60);
            const vm = T.viewmodelDbg();
            if (T.getCurrentWeapon() === key && vm.info.active && vm.info.key === key && !vm.info.akimbo && vm.info.raise === 1) {
              holdFrames++;
            }
          }
          this.stepRendered(0);
          const m = this.measureFP(key);
          m.holdFrames = holdFrames;
          return m;
        },

        measureFP(key) {
          const vm = T.viewmodelDbg();
          const S = this.SOCKETS[key];
          const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
          const vpGrip = vm.viewPoint(V(S.grip), new THREE.Vector3(), 1);
          const vpSupp = vm.viewPoint(V(S.support), new THREE.Vector3(), 1);
          const wR = vm.wrists.r.p;
          const wL = vm.wrists.l.p;
          const dR = wR.distanceTo(vpGrip);
          const dL = wL.distanceTo(vpSupp);

          // Gun-local palm grip channel center (as in tcl301.js line 82)
          const sR = vm.sockets.r, LR = vm.arms.r.layout;
          const cR = new THREE.Vector3(LR.grip[0] - LR.wrist[0], LR.grip[1] - LR.wrist[1], LR.grip[2] - LR.wrist[2])
            .multiplyScalar(sR.s).applyQuaternion(sR.q).add(sR.p);
          const sL = vm.sockets.l, LL = vm.arms.l.layout;
          const cL = new THREE.Vector3(LL.grip[0] - LL.wrist[0], LL.grip[1] - LL.wrist[1], LL.grip[2] - LL.wrist[2])
            .multiplyScalar(sL.s).applyQuaternion(sL.q).add(sL.p);

          const gunLocalErrR = cR.distanceTo(V(S.grip));
          const gunLocalErrL = cL.distanceTo(V(S.support));

          const ndcGrip = vm.ndc(vpGrip);
          const ndcSupp = vm.ndc(vpSupp);
          const ndcWristR = vm.ndc(wR);
          const ndcWristL = vm.ndc(wL);
          const mz = vm.gun.src.userData.muzzleLocal || new THREE.Vector3(0, 0, 0.5);
          const vpMuzzle = vm.viewPoint(mz, new THREE.Vector3(), 1);
          const ndcMuzzle = vm.ndc(vpMuzzle);

          const ok = T.getCurrentWeapon() === key &&
            vm.info.active === true &&
            vm.info.key === key &&
            vm.info.akimbo === false &&
            vm.info.raise === 1 &&
            dR < 0.12 &&
            dL < 0.12;
          if (!ok) {
            throw new Error('FP Assertion failed for ' + key + ': ' + JSON.stringify({
              cur: T.getCurrentWeapon(),
              info: vm.info,
              dR, dL
            }));
          }

          return {
            weapon: T.getCurrentWeapon(),
            active: vm.info.active,
            key: vm.info.key,
            raise: +vm.info.raise.toFixed(4),
            wristBend: { r: +vm.info.wrist.r.toFixed(3), l: +vm.info.wrist.l.toFixed(3) },
            wristToSocketViewM: { r: +dR.toFixed(4), l: +dL.toFixed(4) },
            palmGripGunLocal: {
              r: cR.toArray().map(v => +v.toFixed(4)),
              l: cL.toArray().map(v => +v.toFixed(4)),
              errR: +gunLocalErrR.toFixed(4),
              errL: +gunLocalErrL.toFixed(4),
            },
            wristsView: {
              r: wR.toArray().map(v => +v.toFixed(4)),
              l: wL.toArray().map(v => +v.toFixed(4)),
            },
            socketsView: {
              grip: vpGrip.toArray().map(v => +v.toFixed(4)),
              support: vpSupp.toArray().map(v => +v.toFixed(4)),
            },
            ndc: {
              grip: { x: +ndcGrip.x.toFixed(3), y: +ndcGrip.y.toFixed(3) },
              support: { x: +ndcSupp.x.toFixed(3), y: +ndcSupp.y.toFixed(3) },
              wristR: { x: +ndcWristR.x.toFixed(3), y: +ndcWristR.y.toFixed(3) },
              wristL: { x: +ndcWristL.x.toFixed(3), y: +ndcWristL.y.toFixed(3) },
              muzzle: { x: +ndcMuzzle.x.toFixed(3), y: +ndcMuzzle.y.toFixed(3) },
            },
            worldTime: +T.getWorldTime().toFixed(3),
          };
        }
      };
    })(${JSON.stringify(seat)})`);

    const results = {
      generatedAt: new Date().toISOString(),
      seat,
      build,
      firstPerson: {},
      thirdPerson: {},
    };

    // =========================================================================
    // 1. FIRST PERSON: MINIGUN (Rest, 4 lights, Firing)
    // =========================================================================
    console.log('\n[AG-232] 1. First-Person Minigun (Rest, 4-light, Firing)...');
    const mgRest = await page.evaluate(`(() => {
      window.__ag232.worldTime = 0.50;
      return window.__ag232.equipFPAndHold('minigun');
    })()`);
    await captureFile(page, 'minigun-fp-rest.jpg');
    results.firstPerson.minigunRest = mgRest;

    for (const [tag, wt] of [['042', 0.42], ['dusk', 0.74], ['night', 0.02]]) {
      const m = await page.evaluate(`(() => {
        window.__ag232.worldTime = ${wt};
        for (let i = 0; i < 15; i++) {
          window.__ag232.lockPlayerPose();
          window.__ag232.stepRendered(1 / 60);
        }
        window.__ag232.stepRendered(0);
        return window.__ag232.measureFP('minigun');
      })()`);
      await captureFile(page, `minigun-fp-${tag}.jpg`);
      results.firstPerson[`minigun_${tag}`] = m;
    }

    const mgFire = await page.evaluate(`(() => {
      const T = window.TT;
      window.__ag232.worldTime = 0.50;
      for (let i = 0; i < 15; i++) {
        window.__ag232.lockPlayerPose();
        window.__ag232.stepRendered(1 / 60);
      }
      const vm = T.viewmodelDbg();
      const barrel = vm.gun.src.userData.barrelAssembly;
      const rot0 = barrel ? barrel.rotation.z : 0;
      const shots0 = vm.gun.src.userData.shots || 0;
      T.setMouseFireDbg(true);
      for (let i = 0; i < 60; i++) {
        window.__ag232.lockPlayerPose();
        window.__ag232.stepRendered(1 / 60);
      }
      window.__ag232.stepRendered(0);
      const rot1 = barrel ? barrel.rotation.z : 0;
      const shots1 = vm.gun.src.userData.shots || 0;
      const rotDelta = Math.abs(rot1 - rot0);
      if (rotDelta < 0.1 || shots1 - shots0 < 3) {
        throw new Error('Minigun fire assertion failed: rotDelta=' + rotDelta + ' dShots=' + (shots1 - shots0));
      }
      const m = window.__ag232.measureFP('minigun');
      m.barrelRotDelta = +rotDelta.toFixed(3);
      m.shotsDelta = shots1 - shots0;
      return m;
    })()`);
    await captureFile(page, 'minigun-fp-fire.jpg');
    await page.evaluate(`(() => {
      window.TT.setMouseFireDbg(false);
      for (let i = 0; i < 30; i++) {
        window.__ag232.lockPlayerPose();
        window.__ag232.stepRendered(1 / 60);
      }
    })()`);
    results.firstPerson.minigunFire = mgFire;

    // =========================================================================
    // 2. FIRST PERSON: CHAINSAW (Idle, 4 lights, Cutting)
    // =========================================================================
    console.log('\n[AG-232] 2. First-Person Chainsaw (Idle, 4-light, Cutting)...');
    const csIdle = await page.evaluate(`(() => {
      const T = window.TT;
      window.__ag232.worldTime = 0.50;
      window.__ag232.equipFPAndHold('chainsaw');
      const vm = T.viewmodelDbg();
      const teeth = vm.gun.src.userData.chainTeeth;
      const z0 = teeth && teeth[0] ? teeth[0].position.z : 0;
      for (let i = 0; i < 10; i++) {
        window.__ag232.lockPlayerPose();
        window.__ag232.stepRendered(1 / 60);
      }
      window.__ag232.stepRendered(0);
      const z1 = teeth && teeth[0] ? teeth[0].position.z : 0;
      const m = window.__ag232.measureFP('chainsaw');
      m.chainToothIdleDelta10f = +Math.abs(z1 - z0).toFixed(4);
      return m;
    })()`);
    await captureFile(page, 'chainsaw-fp-idle.jpg');
    results.firstPerson.chainsawIdle = csIdle;

    for (const [tag, wt] of [['042', 0.42], ['dusk', 0.74], ['night', 0.02]]) {
      const m = await page.evaluate(`(() => {
        window.__ag232.worldTime = ${wt};
        for (let i = 0; i < 15; i++) {
          window.__ag232.lockPlayerPose();
          window.__ag232.stepRendered(1 / 60);
        }
        window.__ag232.stepRendered(0);
        return window.__ag232.measureFP('chainsaw');
      })()`);
      await captureFile(page, `chainsaw-fp-${tag}.jpg`);
      results.firstPerson[`chainsaw_${tag}`] = m;
    }

    const csCut = await page.evaluate(`(() => {
      const T = window.TT;
      window.__ag232.worldTime = 0.50;
      for (let i = 0; i < 15; i++) {
        window.__ag232.lockPlayerPose();
        window.__ag232.stepRendered(1 / 60);
      }
      if (T.setSawHeatDbg) T.setSawHeatDbg(0);
      const vm = T.viewmodelDbg();
      const mz = vm.gun.src.userData.muzzleLocal;
      const p0 = vm.viewPoint(mz).clone();
      const teeth = vm.gun.src.userData.chainTeeth;
      const z0 = teeth && teeth[0] ? teeth[0].position.z : 0;
      T.setMouseFireDbg(true);
      for (let i = 0; i < 36; i++) {
        window.__ag232.lockPlayerPose();
        window.__ag232.stepRendered(1 / 60);
      }
      window.__ag232.stepRendered(0);
      const p1 = vm.viewPoint(mz).clone();
      const z1 = teeth && teeth[0] ? teeth[0].position.z : 0;
      const m = window.__ag232.measureFP('chainsaw');
      m.muzzleSwingDispM = +p1.distanceTo(p0).toFixed(4);
      m.chainToothCutDelta = +Math.abs(z1 - z0).toFixed(4);
      m.sawHeat = T.getSawHeat ? T.getSawHeat() : null;
      return m;
    })()`);
    await captureFile(page, 'chainsaw-fp-cut.jpg');
    await page.evaluate(`(() => {
      window.TT.setMouseFireDbg(false);
      for (let i = 0; i < 30; i++) {
        window.__ag232.lockPlayerPose();
        window.__ag232.stepRendered(1 / 60);
      }
    })()`);
    results.firstPerson.chainsawCut = csCut;

    // =========================================================================
    // 3. THIRD PERSON: CHAINSAW & MINIGUN (from Jerry's launcher)
    // =========================================================================
    console.log('\n[AG-232] 3. Third-Person Chainsaw & Minigun...');
    await page.evaluate(`(() => {
      const T = window.TT;
      const THREE = T.THREE;
      window.__ag232.equip3P = (key) => {
        window.__ag232.worldTime = 0.50;
        T.setViewFirstDbg(false);
        T.setMouseFireDbg(false);
        if (T.isUnarmed && T.isUnarmed()) T.toggleHolster();
        const idx = T.WEAPON_ORDER.indexOf(key);
        for (let i = 0; i < 16 && T.getCurrentWeapon() !== key; i++) {
          T.setWeapon(idx);
          for (let k = 0; k < 10; k++) {
            window.__ag232.lockPlayerPose();
            window.__ag232.stepRendered(1 / 60);
          }
        }
        const pinAim = () => {
          const s = window.__ag232.seat;
          T.aimTarget.set(s.x + Math.sin(s.yaw) * 10, T.sampleHeight(s.x, s.z) + 1.25, s.z + Math.cos(s.yaw) * 10);
        };
        for (let i = 0; i < 240; i++) {
          window.__ag232.lockPlayerPose();
          pinAim();
          window.__ag232.stepRendered(1 / 60);
          const swapDone = T.getSwapDbg().swapT <= 0 && !(T.drawDbg && T.drawDbg().active);
          const sawDone = key !== 'chainsaw' || !T.sawStartDbg || T.sawStartDbg().phase === 'done' || T.sawStartDbg().phase === 'idle';
          if (swapDone && sawDone && i > 60) break;
        }
        for (let i = 0; i < 60; i++) {
          window.__ag232.lockPlayerPose();
          pinAim();
          window.__ag232.stepRendered(1 / 60);
        }
      };

      window.__ag232.measure3P = (key) => {
        const V = (...a) => new THREE.Vector3(...a);
        const marine = T.getMarine ? T.getMarine() : (T.marine || window.worldMarine);
        marine.updateMatrixWorld(true);
        const gun = T.weaponMeshes[key];
        gun.updateMatrixWorld(true);
        const H = T.getShoulderDbg().holds[key];
        const HD = T.handsDbg;
        const gp = HD && HD.gripPoint;
        const hR = gp ? gp('R', V()) : marine.userData.elbowRG.localToWorld(V(-0.01, -0.26, 0.12));
        const hL = gp ? gp('L', V()) : marine.userData.elbowLG.localToWorld(V(0.02, -0.27, 0.13));

        const wGripHold = gun.localToWorld(V(...H.grip));
        const wForeHold = Array.isArray(H.fore) ? gun.localToWorld(V(...H.fore)) : null;

        const S = window.__ag232.SOCKETS[key];
        const wGripGP = gun.localToWorld(V(...S.grip));
        const wSuppGP = gun.localToWorld(V(...S.support));

        const fw = V();
        marine.getWorldDirection(fw);
        const gunCenter = gun.localToWorld(V(0, 0.08, 0.05));

        return {
          weapon: T.getCurrentWeapon(),
          viewFirst: T.fpDbg().first,
          holdTable: H,
          handWorld: {
            r: hR.toArray().map(v => +v.toFixed(4)),
            l: hL.toArray().map(v => +v.toFixed(4)),
          },
          distToHoldAnchorM: {
            r: +hR.distanceTo(wGripHold).toFixed(4),
            l: wForeHold ? +hL.distanceTo(wForeHold).toFixed(4) : null,
          },
          distToGP20022HandleCentersM: {
            r: +hR.distanceTo(wGripGP).toFixed(4),
            l: +hL.distanceTo(wSuppGP).toFixed(4),
          },
          gunCenter: gunCenter.toArray().map(v => +v.toFixed(4)),
          forward: fw.toArray().map(v => +v.toFixed(4)),
        };
      };

      window.__ag232.set3PCam = (gunCenter, fw, relRight, relUp, relFwd, fov = 36) => {
        const rx = -fw[2], rz = fw[0];
        const cx = gunCenter[0] + rx * relRight + fw[0] * relFwd;
        const cy = gunCenter[1] + relUp;
        const cz = gunCenter[2] + rz * relRight + fw[2] * relFwd;
        T.setShotView({ x: cx, y: cy, z: cz, tx: gunCenter[0], ty: gunCenter[1], tz: gunCenter[2], fov });
        for (let i = 0; i < 4; i++) window.__ag232.stepRendered(1 / 60);
        window.__ag232.stepRendered(0);
      };
    })()`);

    // 3A. Third-Person Chainsaw
    const cs3pRest = await page.evaluate(`(() => {
      window.__ag232.equip3P('chainsaw');
      const m = window.__ag232.measure3P('chainsaw');
      window.__ag232.set3PCam(m.gunCenter, m.forward, -1.10, 0.32, 0.80, 36);
      return m;
    })()`);
    await captureFile(page, 'chainsaw-3p-rest-right.jpg');

    await page.evaluate(`(() => {
      const m = window.__ag232.measure3P('chainsaw');
      window.__ag232.set3PCam(m.gunCenter, m.forward, 1.10, 0.32, 0.80, 36);
    })()`);
    await captureFile(page, 'chainsaw-3p-rest-left.jpg');

    await page.evaluate(`(() => {
      const m = window.__ag232.measure3P('chainsaw');
      window.__ag232.set3PCam(m.gunCenter, m.forward, -0.05, 1.35, 0.15, 36);
    })()`);
    await captureFile(page, 'chainsaw-3p-rest-top.jpg');

    const cs3pCut = await page.evaluate(`(() => {
      const T = window.TT;
      const s = window.__ag232.seat;
      T.setMouseFireDbg(true);
      for (let i = 0; i < 36; i++) {
        window.__ag232.lockPlayerPose();
        T.aimTarget.set(s.x + Math.sin(s.yaw) * 10, T.sampleHeight(s.x, s.z) + 1.25, s.z + Math.cos(s.yaw) * 10);
        window.__ag232.stepRendered(1 / 60);
      }
      const m = window.__ag232.measure3P('chainsaw');
      window.__ag232.set3PCam(m.gunCenter, m.forward, -1.10, 0.32, 0.80, 36);
      return m;
    })()`);
    await captureFile(page, 'chainsaw-3p-cut-right.jpg');
    await page.evaluate(`(() => {
      window.TT.setMouseFireDbg(false);
      for (let i = 0; i < 30; i++) window.__ag232.stepRendered(1 / 60);
    })()`);
    results.thirdPerson.chainsawRest = cs3pRest;
    results.thirdPerson.chainsawCut = cs3pCut;

    // 3B. Third-Person Minigun
    const mg3pRest = await page.evaluate(`(() => {
      window.__ag232.equip3P('minigun');
      const m = window.__ag232.measure3P('minigun');
      window.__ag232.set3PCam(m.gunCenter, m.forward, -1.20, 0.35, 0.85, 36);
      return m;
    })()`);
    await captureFile(page, 'minigun-3p-rest-right.jpg');

    await page.evaluate(`(() => {
      const m = window.__ag232.measure3P('minigun');
      window.__ag232.set3PCam(m.gunCenter, m.forward, 1.20, 0.35, 0.85, 36);
    })()`);
    await captureFile(page, 'minigun-3p-rest-left.jpg');

    await page.evaluate(`(() => {
      const m = window.__ag232.measure3P('minigun');
      window.__ag232.set3PCam(m.gunCenter, m.forward, -0.05, 1.40, 0.15, 36);
    })()`);
    await captureFile(page, 'minigun-3p-rest-top.jpg');

    const mg3pFire = await page.evaluate(`(() => {
      const T = window.TT;
      const s = window.__ag232.seat;
      T.setMouseFireDbg(true);
      for (let i = 0; i < 60; i++) {
        window.__ag232.lockPlayerPose();
        T.aimTarget.set(s.x + Math.sin(s.yaw) * 10, T.sampleHeight(s.x, s.z) + 1.25, s.z + Math.cos(s.yaw) * 10);
        window.__ag232.stepRendered(1 / 60);
      }
      const m = window.__ag232.measure3P('minigun');
      window.__ag232.set3PCam(m.gunCenter, m.forward, -1.20, 0.35, 0.85, 36);
      return m;
    })()`);
    await captureFile(page, 'minigun-3p-fire-right.jpg');
    await page.evaluate(`(() => {
      window.TT.setMouseFireDbg(false);
      window.TT.setShotView(null);
    })()`);
    results.thirdPerson.minigunRest = mg3pRest;
    results.thirdPerson.minigunFire = mg3pFire;

    fs.writeFileSync(path.join(OUT_DIR, 'telemetry.json'), JSON.stringify(results, null, 2));
    console.log('\n[AG-232] Saved telemetry.json');

    execSync('python qa/2026-11-04-AG-232/build-sheets.py', { cwd: ROOT, stdio: 'inherit' });
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
