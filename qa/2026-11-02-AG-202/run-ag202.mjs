import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_DIR = path.resolve(ROOT, 'qa/2026-11-02-AG-202');
const STILLS_DIR = path.join(OUT_DIR, 'stills');
const FRAMES_DIR = path.join(OUT_DIR, 'frames');
fs.mkdirSync(STILLS_DIR, { recursive: true });
fs.mkdirSync(FRAMES_DIR, { recursive: true });

const WEAPONS = [
  { key: 'pistol', label: 'Pistol', kind: 'vm' },
  { key: 'revolver', label: 'Revolver', kind: 'vm' },
  { key: 'uzi', label: 'Wasp (Uzi)', kind: 'vm' },
  { key: 'm4', label: 'GW-4 (M4)', kind: 'vm' },
  { key: 'ak', label: 'AK', kind: 'vm' },
  { key: 'shotgun', label: 'Shotgun', kind: 'vm' },
  { key: 'aa12', label: 'Breacher-12', kind: 'vm' },
  { key: 'sniper', label: 'Sniper', kind: 'vm' },
  { key: 'launcher', label: 'Launcher', kind: 'vm' },
  { key: 'minigun', label: 'Minigun', kind: 'vm' },
  { key: 'flamer', label: 'Flamer', kind: 'vm' },
  { key: 'chainsaw', label: 'Chainsaw', kind: 'vm' },
  { key: 'akimbo-pistol', label: 'Akimbo Pistols', kind: 'akimbo', base: 'pistol' },
  { key: 'akimbo-uzi', label: 'Akimbo Wasps', kind: 'akimbo', base: 'uzi' },
  { key: 'medpen', label: 'MedPen', kind: 'medpen' },
  { key: 'knife', label: 'Knife', kind: 'blade' },
  { key: 'machete', label: 'Machete', kind: 'blade' },
  { key: 'katana', label: 'Katana', kind: 'blade' },
  { key: 'grenade', label: 'Grenade', kind: 'grenade' }
];

const STILL_NAMES = ['hip', 'ads', 'sprint', 'fire-peak', 'reload-out', 'reload-in', 'reload-home'];
const STRIP_NAMES = ['walk', 'run', 'strafe', 'flick90', 'burst', 'jump'];

async function main() {
  const server = await serve(ROOT, 0);
  const url = `${server.origin}/index.html?solid=1&debug=1&raf=timer`;
  console.log('[AG-202] Launching real WebGPU browser on:', url);

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
      for (let i = 0; i < 30; i++) T.stepFrame(1 / 60);
      return 1;
    })()`, 180000);

    // Install in-page helpers for equipping, stepping, hull checking, and trace sampling
    await page.evaluate(`(() => {
      const T = window.TT;
      const THREE = T.THREE;

      const stripCanvas = document.createElement('canvas');
      stripCanvas.width = 480;
      stripCanvas.height = 270;
      const stripCtx = stripCanvas.getContext('2d', { willReadFrequently: true });

      window.__ag202 = {
        stripCanvas,
        stripCtx,
        fastCanvasOk: null,

        captureFastFrame() {
          try {
            stripCtx.drawImage(T.renderer.domElement, 0, 0, 480, 270);
            if (this.fastCanvasOk === null) {
              const px = stripCtx.getImageData(240, 135, 1, 1).data;
              const px2 = stripCtx.getImageData(120, 200, 1, 1).data;
              this.fastCanvasOk = (px[0] + px[1] + px[2] + px2[0] + px2[1] + px2[2]) > 0;
            }
            if (this.fastCanvasOk) {
              return stripCanvas.toDataURL('image/jpeg', 0.80).split(',')[1];
            }
          } catch (_) {
            this.fastCanvasOk = false;
          }
          return null;
        },

        resetAllState() {
          T.flightHold(true);
          T.grantAllWeapons();
          T.addCash(999999);
          T.setGrenadesDbg(10);
          while (T.getMedkits() < 3) T.buyMedkit();
          T.setViewFirstDbg(true);
          T.reloadClipDbg.hold(null);
          T.handsDbg.knifeHold(null);
          T.holdGrenadeAnim(null);
          T.flightInput({ keys: [], zoom: false, fire: false });
          T.setMouseFireDbg(false);
          T.setZoomHeldDbg(false);
          T.setVelDbg(0, 0);
          T.setMacheteOwned(false);
          T.setKatanaOwned(false);
          if (T.isUnarmed()) T.toggleHolster();
          if (T.vaultDbg.flags().dualActive) T.toggleDualWieldDbg();
        },

        placePlayer(seat, forMotion = false) {
          if (seat === 'tg') {
            if (!T.trainingDbg.state().active) T.trainingDbg.enter();
            const tg = T.trainingDbg.tg();
            if (forMotion) {
              T.player.position.set(tg.origin.x - 26, tg.floorY, tg.origin.z - 8);
              T.player.rotation.y = 0;
              T.setAimYawDbg(0);
              T.setOtsAimDbg(0, 0);
            } else {
              T.player.position.set(tg.spawn.x, tg.floorY, tg.spawn.z);
              T.player.rotation.y = tg.spawn.yaw;
              T.setAimYawDbg(tg.spawn.yaw);
              T.setOtsAimDbg(tg.spawn.yaw, 0);
            }
            T.setVelDbg(0, 0);
          } else {
            if (T.trainingDbg.state().active) T.trainingDbg.leave();
            T.clearZombies();
            T.setWorldTime(0.50);
            if (T.weather) { T.weather.raining = false; T.weather.intensity = 0; }
            let tx = 26, tz = -15, tyaw = -1.25;
            if (T.PATHS && T.PATHS[0] && T.PATHS[0].length > 6) {
              const p0 = T.PATHS[0][4], p1 = T.PATHS[0][5];
              if (p0 && p1) {
                tx = p0.x; tz = p0.z;
                tyaw = Math.atan2(p1.x - p0.x, p1.z - p0.z);
              }
            }
            const gy = T.sampleHeight(tx, tz);
            T.player.position.set(tx, gy, tz);
            T.player.rotation.y = tyaw;
            T.setAimYawDbg(tyaw);
            T.setOtsAimDbg(tyaw, 0);
            T.setVelDbg(0, 0);
          }
        },

        equipWeapon(wSpec) {
          this.resetAllState();
          const k = wSpec.key;
          if (wSpec.kind === 'vm' || wSpec.kind === 'heavy') {
            if (T.isUnarmed()) T.toggleHolster();
            if (T.vaultDbg.flags().dualActive) T.toggleDualWieldDbg();
            T.setWeapon(T.WEAPON_ORDER.indexOf(k));
            T.setAmmoDbg(k, 999);
          } else if (wSpec.kind === 'akimbo') {
            const base = wSpec.base;
            if (T.isUnarmed()) T.toggleHolster();
            T.setDualOwnedDbg(base, true);
            T.setWeapon(T.WEAPON_ORDER.indexOf(base));
            if (!T.vaultDbg.flags().dualActive) T.toggleDualWieldDbg();
            T.setAmmoDbg(base, 999);
          } else if (wSpec.kind === 'blade') {
            if (T.isUnarmed()) T.toggleHolster();
            if (T.vaultDbg.flags().dualActive) T.toggleDualWieldDbg();
            T.setWeapon(T.WEAPON_ORDER.indexOf('pistol'));
            T.setMacheteOwned(k === 'machete');
            T.setKatanaOwned(k === 'katana');
          } else if (wSpec.kind === 'medpen' || wSpec.kind === 'grenade') {
            if (T.isUnarmed()) T.toggleHolster();
            if (T.vaultDbg.flags().dualActive) T.toggleDualWieldDbg();
            T.setWeapon(T.WEAPON_ORDER.indexOf('pistol'));
          }
          for (let i = 0; i < 90; i++) {
            T.stepFrame(1 / 60);
            if (T.fpDbg().first && T.fpDbg().w >= 0.99) break;
          }
          const baseW = wSpec.base || (wSpec.kind === 'vm' || wSpec.kind === 'heavy' ? wSpec.key : null);
          if (baseW) {
            for (let i = 0; i < 60; i++) {
              const vm = T.viewmodelDbg && T.viewmodelDbg();
              if (vm && vm.showing && vm.showing(baseW)) break;
              T.stepFrame(1 / 60);
            }
          }
        },

        sampleTrace(wSpec) {
          const W = window.innerWidth, H = window.innerHeight;
          const vm = T.viewmodelDbg && T.viewmodelDbg();
          const baseW = wSpec.base || (wSpec.kind === 'vm' || wSpec.kind === 'heavy' ? wSpec.key : 'pistol');
          const vmActive = !!(vm && vm.info && vm.info.active && vm.showing(baseW));
          const toPx = (ndc) => ndc ? [
            +((ndc.x * 0.5 + 0.5) * W).toFixed(2),
            +((0.5 - ndc.y * 0.5) * H).toFixed(2),
            +((ndc.d ?? ndc.z ?? 0)).toFixed(4)
          ] : [0, 0, 0];
          const projWorld = (v) => {
            if (!v) return [0, 0, 0];
            const c = v.clone().project(T.camera);
            return [
              +((c.x * 0.5 + 0.5) * W).toFixed(2),
              +((0.5 - c.y * 0.5) * H).toFixed(2),
              +c.z.toFixed(4)
            ];
          };

          let muzzlePx = [0, 0, 0], wristRPx = [0, 0, 0], wristLPx = [0, 0, 0];
          let insideHullVerts = 0, testedVerts = 0;

          if (vmActive) {
            const src = T.weaponMeshes[baseW];
            const mzLocal = (src && src.userData && src.userData.muzzleLocal)
              ? src.userData.muzzleLocal.clone()
              : new THREE.Vector3(0, 0.04, 0.35);
            const mzView = vm.viewPoint(mzLocal);
            muzzlePx = toPx(vm.ndc(mzView));
            wristRPx = toPx(vm.ndc(vm.wrists.r.p));
            wristLPx = toPx(vm.ndc(vm.wrists.l.p));

            if (vm.gun && vm.gun.root && vm.arms) {
              vm.root.updateMatrixWorld(true);
              const boxes = [];
              vm.gun.root.traverse((m) => {
                if (!m.isMesh || !m.visible || !m.geometry) return;
                if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
                const bb = m.geometry.boundingBox;
                const sz = new THREE.Vector3(); bb.getSize(sz);
                if (sz.x < 0.012 || sz.y < 0.012 || sz.z < 0.025) return;
                boxes.push({ bb, inv: new THREE.Matrix4().copy(m.matrixWorld).invert() });
              });
              const v = new THREE.Vector3(), p = new THREE.Vector3();
              const margin = 0.006;
              for (const side of ['r', 'l']) {
                const arm = vm.arms[side]?.root;
                if (!arm || !arm.visible) continue;
                arm.traverse((hm) => {
                  if (!hm.isMesh || !hm.visible || hm.name === 'vm-forearm') return;
                  const pos = hm.geometry?.attributes?.position;
                  if (!pos) return;
                  for (let i = 0; i < pos.count; i += 3) {
                    testedVerts++;
                    v.fromBufferAttribute(pos, i).applyMatrix4(hm.matrixWorld);
                    for (let b = 0; b < boxes.length; b++) {
                      const bx = boxes[b];
                      p.copy(v).applyMatrix4(bx.inv);
                      if (
                        p.x > bx.bb.min.x + margin && p.x < bx.bb.max.x - margin &&
                        p.y > bx.bb.min.y + margin && p.y < bx.bb.max.y - margin &&
                        p.z > bx.bb.min.z + margin && p.z < bx.bb.max.z - margin
                      ) {
                        insideHullVerts++;
                        break;
                      }
                    }
                  }
                });
              }
            }
          } else {
            T.marine.updateMatrixWorld(true);
            const ud = T.marine.userData;
            const wrR = ud.elbowRG?.userData?.wrist, wrL = ud.elbowLG?.userData?.wrist;
            if (wrR) wristRPx = projWorld(wrR.getWorldPosition(new THREE.Vector3()));
            if (wrL) wristLPx = projWorld(wrL.getWorldPosition(new THREE.Vector3()));

            if (wSpec.kind === 'blade') {
              const km = T.knifeMesh && T.knifeMesh();
              if (km) {
                km.updateMatrixWorld(true);
                muzzlePx = projWorld(km.localToWorld(new THREE.Vector3(0, 0, 0.25)));
              }
            } else if (wSpec.kind === 'grenade') {
              const ga = T.grenadeAnimDbg && T.grenadeAnimDbg();
              if (ga && ga.hand) {
                ga.hand.updateMatrixWorld(true);
                muzzlePx = projWorld(ga.hand.getWorldPosition(new THREE.Vector3()));
              }
            } else if (wSpec.kind === 'medpen') {
              if (T.medPenHand) {
                T.medPenHand.updateMatrixWorld(true);
                muzzlePx = projWorld(T.medPenHand.getWorldPosition(new THREE.Vector3()));
              }
            } else {
              const mzW = T.getMuzzleWorld && T.getMuzzleWorld();
              if (mzW) muzzlePx = projWorld(mzW);
            }

            const gunMesh = T.weaponMeshes[baseW];
            if (gunMesh && gunMesh.visible) {
              gunMesh.updateMatrixWorld(true);
              const boxes = [];
              gunMesh.traverse((m) => {
                if (!m.isMesh || !m.visible || !m.geometry) return;
                if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
                const bb = m.geometry.boundingBox;
                const sz = new THREE.Vector3(); bb.getSize(sz);
                if (sz.x < 0.015 || sz.y < 0.015 || sz.z < 0.03) return;
                boxes.push({ bb, inv: new THREE.Matrix4().copy(m.matrixWorld).invert() });
              });
              const v = new THREE.Vector3(), p = new THREE.Vector3();
              const margin = 0.008;
              for (const wr of [wrR, wrL]) {
                if (!wr) continue;
                wr.traverse((hm) => {
                  if (!hm.isMesh || !hm.visible) return;
                  const pos = hm.geometry?.attributes?.position;
                  if (!pos) return;
                  for (let i = 0; i < pos.count; i += 3) {
                    testedVerts++;
                    v.fromBufferAttribute(pos, i).applyMatrix4(hm.matrixWorld);
                    for (let b = 0; b < boxes.length; b++) {
                      const bx = boxes[b];
                      p.copy(v).applyMatrix4(bx.inv);
                      if (
                        p.x > bx.bb.min.x + margin && p.x < bx.bb.max.x - margin &&
                        p.y > bx.bb.min.y + margin && p.y < bx.bb.max.y - margin &&
                        p.z > bx.bb.min.z + margin && p.z < bx.bb.max.z - margin
                      ) {
                        insideHullVerts++;
                        break;
                      }
                    }
                  }
                });
              }
            }
          }

          const eul = vmActive && vm.frame && vm.frame.q ? new THREE.Euler().setFromQuaternion(vm.frame.q, 'YXZ') : null;
          return {
            muzzle: muzzlePx,
            wristR: wristRPx,
            wristL: wristLPx,
            vmActive,
            insideHullVerts,
            testedVerts,
            camFov: +T.camera.fov.toFixed(2),
            camPos: [+T.camera.position.x.toFixed(4), +T.camera.position.y.toFixed(4), +T.camera.position.z.toFixed(4)],
            otsYaw: +T.otsDbg().yaw.toFixed(4),
            otsPitch: +T.otsDbg().pitch.toFixed(4),
            vmPos: vmActive && vm.frame && vm.frame.p ? [+vm.frame.p.x.toFixed(5), +vm.frame.p.y.toFixed(5), +vm.frame.p.z.toFixed(5)] : null,
            vmRot: eul ? [+eul.x.toFixed(5), +eul.y.toFixed(5), +eul.z.toFixed(5)] : null,
            vmKick: null
          };
        },

        poseStill(wSpec, stillName, seat) {
          this.placePlayer(seat, stillName === 'sprint');
          this.equipWeapon(wSpec);
          const k = wSpec.key;

          if (stillName === 'hip') {
            for (let i = 0; i < 10; i++) T.stepFrame(1 / 60);
          } else if (stillName === 'ads') {
            if (wSpec.kind === 'medpen') {
              T.setHp(30);
              T.useMedkit();
              for (let i = 0; i < 8; i++) T.stepFrame(1 / 60);
            } else if (wSpec.kind === 'grenade') {
              T.holdGrenadeAnim('cocked', 0.30);
              for (let i = 0; i < 5; i++) T.stepFrame(1 / 60);
            } else if (wSpec.kind === 'blade') {
              T.setZoomHeldDbg(true);
              for (let i = 0; i < 20; i++) T.stepFrame(1 / 60);
              T.handsDbg.knifeHold(0.35);
              T.stepFrame(1 / 60);
            } else {
              T.setZoomHeldDbg(true);
              for (let i = 0; i < 35; i++) T.stepFrame(1 / 60);
            }
          } else if (stillName === 'sprint') {
            T.flightInput({ keys: ['KeyW', 'ShiftLeft'], zoom: false, fire: false });
            for (let i = 0; i < 36; i++) T.stepFrame(1 / 60);
          } else if (stillName === 'fire-peak') {
            if (wSpec.kind === 'blade') {
              T.handsDbg.knifeHold(0.50);
              T.stepFrame(1 / 60);
            } else if (wSpec.kind === 'medpen') {
              T.setHp(30);
              T.useMedkit();
              for (let i = 0; i < 22; i++) T.stepFrame(1 / 60);
            } else if (wSpec.kind === 'grenade') {
              T.holdGrenadeAnim('throw', 0.04);
              for (let i = 0; i < 4; i++) T.stepFrame(1 / 60);
            } else if (k === 'minigun') {
              T.flightInput({ keys: [], zoom: false, fire: true });
              T.setMouseFireDbg(true);
              for (let i = 0; i < 45; i++) T.stepFrame(1 / 60);
            } else if (k === 'chainsaw') {
              T.flightInput({ keys: [], zoom: false, fire: true });
              T.setMouseFireDbg(true);
              for (let i = 0; i < 65; i++) T.stepFrame(1 / 60);
            } else if (k === 'flamer') {
              T.flightInput({ keys: [], zoom: false, fire: true });
              T.setMouseFireDbg(true);
              for (let i = 0; i < 30; i++) T.stepFrame(1 / 60);
            } else {
              T.flightInput({ keys: [], zoom: false, fire: true });
              T.setMouseFireDbg(true);
              T.stepFrame(1 / 60);
              T.stepFrame(1 / 60);
              T.flightInput({ keys: [], zoom: false, fire: false });
              T.setMouseFireDbg(false);
            }
          } else if (stillName.startsWith('reload-')) {
            const sub = stillName.slice(7);
            if (wSpec.kind === 'blade') {
              const u = sub === 'out' ? 0.20 : sub === 'in' ? 0.50 : 0.80;
              T.handsDbg.knifeHold(u);
              T.stepFrame(1 / 60);
            } else if (wSpec.kind === 'medpen') {
              if (!T.isUnarmed()) T.toggleHolster();
              for (let i = 0; i < 15; i++) T.stepFrame(1 / 60);
              T.setHp(30);
              T.useMedkit();
              const steps = sub === 'out' ? 12 : sub === 'in' ? 22 : 36;
              for (let i = 0; i < steps; i++) T.stepFrame(1 / 60);
            } else if (wSpec.kind === 'grenade') {
              if (!T.isUnarmed()) T.toggleHolster();
              for (let i = 0; i < 15; i++) T.stepFrame(1 / 60);
              if (sub === 'out') T.holdGrenadeAnim('grab', 0.05);
              else if (sub === 'in') T.holdGrenadeAnim('raise', 0.09);
              else T.holdGrenadeAnim('throw', 0.05);
              for (let i = 0; i < 3; i++) T.stepFrame(1 / 60);
            } else if (k === 'chainsaw') {
              T.flightInput({ keys: [], zoom: false, fire: true });
              T.setMouseFireDbg(true);
              const steps = sub === 'out' ? 8 : sub === 'in' ? 20 : 35;
              for (let i = 0; i < steps; i++) T.stepFrame(1 / 60);
              T.flightInput({ keys: [], zoom: false, fire: false });
              T.setMouseFireDbg(false);
            } else {
              const base = wSpec.base || k;
              const uMap = {
                revolver: { out: 0.20, in: 0.58, home: 0.86 },
                shotgun:  { out: 0.25, in: 0.52, home: 0.82 },
                sniper:   { out: 0.22, in: 0.56, home: 0.85 },
                default:  { out: 0.22, in: 0.56, home: 0.84 }
              };
              const u = (uMap[base] || uMap.default)[sub];
              T.setAmmoDbg(base, 1);
              T.startReload();
              T.reloadClipDbg.hold(u);
              for (let i = 0; i < 6; i++) T.stepFrame(1 / 60);
            }
          }
          for (let i = 0; i < 40; i++) {
            if (T.fpDbg().first && T.fpDbg().w >= 0.99) break;
            T.stepFrame(1 / 60);
          }
          if (T.fpDbg().w < 0.90) {
            throw new Error('poseStill failed: weapon=' + wSpec.key + ' still=' + stillName + ' fp.w=' + T.fpDbg().w);
          }
          return this.sampleTrace(wSpec);
        },

        runStrip(wSpec, stripName, captureImages) {
          const forMotion = (stripName === 'walk' || stripName === 'run' || stripName === 'strafe' || stripName === 'jump');
          this.placePlayer('tg', forMotion);
          this.equipWeapon(wSpec);
          for (let i = 0; i < 40; i++) {
            if (T.fpDbg().first && T.fpDbg().w >= 0.99) break;
            T.stepFrame(1 / 60);
          }
          if (T.fpDbg().w < 0.90) {
            throw new Error('runStrip failed: weapon=' + wSpec.key + ' strip=' + stripName + ' fp.w=' + T.fpDbg().w);
          }

          if (stripName === 'burst' && wSpec.key === 'chainsaw') {
            T.flightInput({ keys: [], zoom: false, fire: true });
            T.setMouseFireDbg(true);
            for (let i = 0; i < 48; i++) T.stepFrame(1 / 60);
            T.flightInput({ keys: [], zoom: false, fire: false });
            T.setMouseFireDbg(false);
          }

          const frames = [];
          const images = [];
          const dt = 1 / 30;
          const totalFrames = 90;

          for (let f = 0; f < totalFrames; f++) {
            const t = f * dt;
            if (stripName === 'walk') {
              T.flightInput({ keys: ['KeyW'], zoom: false, fire: false });
            } else if (stripName === 'run') {
              T.flightInput({ keys: ['KeyW', 'ShiftLeft'], zoom: false, fire: false });
            } else if (stripName === 'strafe') {
              T.flightInput({ keys: [f < 45 ? 'KeyA' : 'KeyD'], zoom: false, fire: false });
            } else if (stripName === 'flick90') {
              T.flightInput({ keys: [], zoom: false, fire: false });
              if (f >= 5 && f < 9) {
                const yawNow = T.otsDbg().yaw + (Math.PI / 2) / 4;
                T.setOtsAimDbg(yawNow, 0);
                T.setAimYawDbg(yawNow);
              }
            } else if (stripName === 'burst') {
              const burstDur = wSpec.key === 'flamer' ? 3.0 : 1.0;
              const firing = t < burstDur;
              if (wSpec.kind === 'blade') {
                if (f === 2 || f === 35 || f === 65) { T.setKnifeCd(0); T.knifeAttack(); }
              } else if (wSpec.kind === 'medpen') {
                if (f === 2) { T.setHp(30); T.useMedkit(); }
                if (f === 40) { if (!T.isUnarmed()) T.toggleHolster(); T.setHp(30); T.useMedkit(); }
              } else if (wSpec.kind === 'grenade') {
                if (f === 2) T.startGrenadeCharge();
                if (f === 20) T.releaseGrenadeCharge();
                if (f === 45) { if (!T.isUnarmed()) T.toggleHolster(); T.setGrenadesDbg(5); }
                if (f === 48) T.startGrenadeCharge();
                if (f === 66) T.releaseGrenadeCharge();
              } else {
                const isSemi = ['pistol', 'revolver', 'shotgun', 'sniper', 'launcher', 'akimbo-pistol'].includes(wSpec.key);
                const fireOn = isSemi ? (firing && (f % 6 === 0)) : firing;
                T.flightInput({ keys: [], zoom: false, fire: fireOn });
                T.setMouseFireDbg(fireOn);
              }
            } else if (stripName === 'jump') {
              if (f === 5) {
                T.flightInput({ keys: ['Space'], zoom: false, fire: false });
                T.airDbg.jumpNow();
              } else {
                T.flightInput({ keys: [], zoom: false, fire: false });
              }
            }

            T.stepFrame(1 / 60);
            T.stepFrame(1 / 60);

            const sample = this.sampleTrace(wSpec);
            sample.f = f;
            sample.t = +t.toFixed(4);
            frames.push(sample);

            if (captureImages) {
              const b64 = this.captureFastFrame();
              if (b64) images.push({ f, b64 });
            }
          }

          this.resetAllState();
          return { frames, images, fastCanvasOk: this.fastCanvasOk };
        }
      };
      return 1;
    })()`);

    const allTraces = {
      generatedAt: new Date().toISOString(),
      stills: {},
      strips: {},
      res1440pCheck: {}
    };

    for (const [resKey, vp] of [['1080p', { width: 1920, height: 1080 }], ['1440p', { width: 2560, height: 1440 }]]) {
      await page.setViewport(vp.width, vp.height, 1);
      await page.evaluate(`(() => { window.dispatchEvent(new Event('resize')); window.TT.stepFrame(1 / 60); return 1; })()`);

      for (const seat of ['tg', 'woods']) {
        const seatDir = path.join(STILLS_DIR, `${seat}-${resKey}`);
        fs.mkdirSync(seatDir, { recursive: true });
        console.log(`[AG-202] Capturing stills for seat=${seat} res=${resKey}...`);

        for (const wSpec of WEAPONS) {
          const stillsToRun = (resKey === '1440p' && seat === 'woods')
            ? ['hip', 'ads', 'sprint', 'fire-peak']
            : STILL_NAMES;

          for (const stName of stillsToRun) {
            const trace = await page.evaluate(
              `window.__ag202.poseStill(${JSON.stringify(wSpec)}, ${JSON.stringify(stName)}, ${JSON.stringify(seat)})`
            );
            const id = `${seat}-${resKey}-${wSpec.key}-${stName}`;
            allTraces.stills[id] = trace;

            const shot = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 84, captureBeyondViewport: false });
            fs.writeFileSync(path.join(seatDir, `${wSpec.key}-${stName}.jpg`), Buffer.from(shot.data, 'base64'));
          }
        }
      }

      const weaponsForStrips = resKey === '1080p'
        ? WEAPONS
        : WEAPONS.filter((w) => ['pistol', 'revolver', 'm4', 'flamer', 'minigun', 'chainsaw'].includes(w.key));

      console.log(`[AG-202] Running 3s @ 30fps strips (${weaponsForStrips.length} weapons) at ${resKey}...`);
      for (const wSpec of weaponsForStrips) {
        const wFrameDir = path.join(FRAMES_DIR, `${wSpec.key}-${resKey}`);
        if (resKey === '1080p') fs.mkdirSync(wFrameDir, { recursive: true });
        let lastFastCanvasOk = null;

        for (const stripName of STRIP_NAMES) {
          const stripResult = await page.evaluate(
            `window.__ag202.runStrip(${JSON.stringify(wSpec)}, ${JSON.stringify(stripName)}, ${resKey === '1080p'})`
          );
          lastFastCanvasOk = stripResult?.fastCanvasOk;

          if (resKey === '1080p') {
            allTraces.strips[`${wSpec.key}-${stripName}`] = stripResult.frames;
            if (stripResult.images.length > 0) {
              for (const img of stripResult.images) {
                fs.writeFileSync(
                  path.join(wFrameDir, `${stripName}-${String(img.f).padStart(3, '0')}.jpg`),
                  Buffer.from(img.b64, 'base64')
                );
              }
            } else {
              // Fallback if WebGPU canvas drawImage was blank: capture 15 frames across the 3s strip via CDP
              await page.evaluate(`(() => {
                const T = window.TT, H = window.__ag202;
                const wSpec = ${JSON.stringify(wSpec)}, stripName = ${JSON.stringify(stripName)};
                const forMotion = (stripName === 'walk' || stripName === 'run' || stripName === 'strafe' || stripName === 'jump');
                H.placePlayer('tg', forMotion);
                H.equipWeapon(wSpec);
                if (stripName === 'burst' && wSpec.key === 'chainsaw') {
                  T.flightInput({ keys: [], zoom: false, fire: true });
                  T.setMouseFireDbg(true);
                  for (let i = 0; i < 48; i++) T.stepFrame(1 / 60);
                  T.flightInput({ keys: [], zoom: false, fire: false });
                  T.setMouseFireDbg(false);
                }
                return 1;
              })()`);

              for (let f = 0; f < 90; f++) {
                await page.evaluate(`(() => {
                  const T = window.TT, f = ${f}, t = f / 30;
                  const wSpec = ${JSON.stringify(wSpec)}, stripName = ${JSON.stringify(stripName)};
                  if (stripName === 'walk') T.flightInput({ keys: ['KeyW'], zoom: false, fire: false });
                  else if (stripName === 'run') T.flightInput({ keys: ['KeyW', 'ShiftLeft'], zoom: false, fire: false });
                  else if (stripName === 'strafe') T.flightInput({ keys: [f < 45 ? 'KeyA' : 'KeyD'], zoom: false, fire: false });
                  else if (stripName === 'flick90') {
                    T.flightInput({ keys: [], zoom: false, fire: false });
                    if (f >= 5 && f < 9) {
                      const yawNow = T.otsDbg().yaw + (Math.PI / 2) / 4;
                      T.setOtsAimDbg(yawNow, 0);
                      T.setAimYawDbg(yawNow);
                    }
                  } else if (stripName === 'burst') {
                    const burstDur = wSpec.key === 'flamer' ? 3.0 : 1.0;
                    const firing = t < burstDur;
                    if (wSpec.kind === 'blade') {
                      if (f === 2 || f === 35 || f === 65) { T.setKnifeCd(0); T.knifeAttack(); }
                    } else if (wSpec.kind === 'medpen') {
                      if (f === 2) { T.setHp(30); T.useMedkit(); }
                      if (f === 40) { if (!T.isUnarmed()) T.toggleHolster(); T.setHp(30); T.useMedkit(); }
                    } else if (wSpec.kind === 'grenade') {
                      if (f === 2) T.startGrenadeCharge();
                      if (f === 20) T.releaseGrenadeCharge();
                      if (f === 45) { if (!T.isUnarmed()) T.toggleHolster(); T.setGrenadesDbg(5); }
                      if (f === 48) T.startGrenadeCharge();
                      if (f === 66) T.releaseGrenadeCharge();
                    } else {
                      const isSemi = ['pistol', 'revolver', 'shotgun', 'sniper', 'launcher', 'akimbo-pistol'].includes(wSpec.key);
                      const fireOn = isSemi ? (firing && (f % 6 === 0)) : firing;
                      T.flightInput({ keys: [], zoom: false, fire: fireOn });
                      T.setMouseFireDbg(fireOn);
                    }
                  } else if (stripName === 'jump') {
                    if (f === 5) { T.flightInput({ keys: ['Space'], zoom: false, fire: false }); T.airDbg.jumpNow(); }
                    else T.flightInput({ keys: [], zoom: false, fire: false });
                  }
                  T.stepFrame(1 / 60);
                  T.stepFrame(1 / 60);
                  return 1;
                })()`);

                if (f % 6 === 0 || f === 89) {
                  const shot = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 72, captureBeyondViewport: false });
                  fs.writeFileSync(
                    path.join(wFrameDir, `${stripName}-${String(f).padStart(3, '0')}.jpg`),
                    Buffer.from(shot.data, 'base64')
                  );
                }
              }
            }
          } else {
            allTraces.res1440pCheck[`${wSpec.key}-${stripName}`] = stripResult.frames;
          }
        }
        console.log(`[AG-202] Completed strips for ${wSpec.key} (${resKey}) [fastCanvas=${lastFastCanvasOk}]`);
      }
    }

    fs.writeFileSync(path.join(OUT_DIR, 'traces.json'), JSON.stringify(allTraces, null, 2));
    console.log('[AG-202] Saved traces.json successfully.');
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((err) => {
  console.error('[AG-202] Fatal error:', err);
  process.exit(1);
});
