import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_DIR = path.resolve(ROOT, 'qa/2026-11-02-AG-202/round1');
const STILLS_DIR = path.join(OUT_DIR, 'stills');
const FRAMES_DIR = path.join(OUT_DIR, 'frames');
fs.mkdirSync(STILLS_DIR, { recursive: true });
fs.mkdirSync(FRAMES_DIR, { recursive: true });

const WEAPONS = [
  { key: 'pistol', label: 'Pistol', kind: 'vm' },
  { key: 'revolver', label: 'Revolver', kind: 'vm' },
  { key: 'm4', label: 'GW-4 (M4)', kind: 'vm' }
];

const STILL_NAMES = ['hip', 'ads', 'sprint', 'fire-peak', 'reload-out', 'reload-in', 'reload-home'];
const STRIP_NAMES = ['walk', 'run', 'strafe', 'flick90', 'burst', 'jump'];

async function main() {
  const server = await serve(ROOT, 0);
  const url = `${server.origin}/index.html?solid=1&debug=1&raf=timer`;
  console.log('[AG-202-R1] Launching real WebGPU browser on:', url);

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

    // Enter match and Training Ground
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

    // Inject helpers
    await page.evaluate(`(() => {
      const T = window.TT;
      const THREE = T.THREE;

      const stripCanvas = document.createElement('canvas');
      stripCanvas.width = 480;
      stripCanvas.height = 270;
      const stripCtx = stripCanvas.getContext('2d', { willReadFrequently: true });

      const raycaster = new THREE.Raycaster();
      const rayDir = new THREE.Vector3(0, 1, 0);

      window.__ag202r1 = {
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
              return stripCanvas.toDataURL('image/jpeg', 0.82).split(',')[1];
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
          T.setViewFirstDbg(true);
          T.reloadClipDbg.hold(null);
          T.flightInput({ keys: [], zoom: false, fire: false });
          T.setMouseFireDbg(false);
          T.setZoomHeldDbg(false);
          T.setVelDbg(0, 0);
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
                tx = (p0.x !== undefined ? p0.x : p0[0]);
                tz = (p0.z !== undefined ? p0.z : p0[1]);
                const px1 = (p1.x !== undefined ? p1.x : p1[0]);
                const pz1 = (p1.z !== undefined ? p1.z : p1[1]);
                tyaw = Math.atan2(px1 - tx, pz1 - tz);
              }
            }
            const gy = T.sampleHeight ? T.sampleHeight(tx, tz) : 0;
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
          T.setWeapon(T.WEAPON_ORDER.indexOf(k));
          T.setAmmoDbg(k, 999);
          for (let i = 0; i < 90; i++) {
            T.stepFrame(1 / 60);
            if (T.fpDbg().first && T.fpDbg().w >= 0.99) break;
          }
          for (let i = 0; i < 60; i++) {
            const vm = T.viewmodelDbg && T.viewmodelDbg();
            if (vm && vm.showing && vm.showing(k)) break;
            T.stepFrame(1 / 60);
          }
        },

        sampleTrace(wSpec) {
          const W = window.innerWidth, H = window.innerHeight;
          const vm = T.viewmodelDbg && T.viewmodelDbg();
          const baseW = wSpec.key;
          const vmActive = !!(vm && vm.info && vm.info.active && vm.showing(baseW));
          const toPx = (ndc) => ndc ? [
            +((ndc.x * 0.5 + 0.5) * W).toFixed(2),
            +((0.5 - ndc.y * 0.5) * H).toFixed(2),
            +((ndc.d ?? ndc.z ?? 0)).toFixed(4)
          ] : [0, 0, 0];

          let muzzlePx = [0, 0, 0], wristRPx = [0, 0, 0], wristLPx = [0, 0, 0];
          let insideBoxHullVerts = 0, insideInteriorVerts = 0, testedVerts = 0;
          let minWristDist = 999;
          let forearmBottomY = 0;

          if (vmActive) {
            const src = T.weaponMeshes[baseW];
            const mzLocal = (src && src.userData && src.userData.muzzleLocal)
              ? src.userData.muzzleLocal.clone()
              : new THREE.Vector3(0, 0.04, 0.35);
            const mzView = vm.viewPoint(mzLocal);
            muzzlePx = toPx(vm.ndc(mzView));
            wristRPx = toPx(vm.ndc(vm.wrists.r.p));
            wristLPx = toPx(vm.ndc(vm.wrists.l.p));

            if (vm.wrists.r.p && vm.wrists.l.p) {
              minWristDist = +vm.wrists.r.p.distanceTo(vm.wrists.l.p).toFixed(4);
            }

            if (vm.gun && vm.gun.root && vm.arms) {
              vm.root.updateMatrixWorld(true);
              const boxes = [];
              const solidMeshes = [];

              vm.gun.root.traverse((m) => {
                if (!m.isMesh || !m.visible || !m.geometry) return;
                if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
                const bb = m.geometry.boundingBox;
                const sz = new THREE.Vector3(); bb.getSize(sz);
                if (sz.x < 0.010 || sz.y < 0.010 || sz.z < 0.020) return;
                boxes.push({ bb, inv: new THREE.Matrix4().copy(m.matrixWorld).invert() });
                solidMeshes.push(m);
              });

              const v = new THREE.Vector3(), p = new THREE.Vector3();
              const margin = 0.006;

              for (const side of ['r', 'l']) {
                const arm = vm.arms[side]?.root;
                if (!arm || !arm.visible) continue;
                arm.traverse((hm) => {
                  if (!hm.isMesh || !hm.visible) return;
                  if (hm.name === 'vm-forearm') {
                    // Check bottom vertex in screen space
                    const pos = hm.geometry?.attributes?.position;
                    if (pos) {
                      for (let i = 0; i < pos.count; i++) {
                        v.fromBufferAttribute(pos, i).applyMatrix4(hm.matrixWorld);
                        const px = toPx(vm.ndc(v));
                        if (px[1] > forearmBottomY) forearmBottomY = px[1];
                      }
                    }
                    return;
                  }
                  const pos = hm.geometry?.attributes?.position;
                  if (!pos) return;
                  for (let i = 0; i < pos.count; i += 3) {
                    testedVerts++;
                    v.fromBufferAttribute(pos, i).applyMatrix4(hm.matrixWorld);

                    let inBox = false;
                    for (let b = 0; b < boxes.length; b++) {
                      const bx = boxes[b];
                      p.copy(v).applyMatrix4(bx.inv);
                      if (
                        p.x > bx.bb.min.x + margin && p.x < bx.bb.max.x - margin &&
                        p.y > bx.bb.min.y + margin && p.y < bx.bb.max.y - margin &&
                        p.z > bx.bb.min.z + margin && p.z < bx.bb.max.z - margin
                      ) {
                        inBox = true;
                        insideBoxHullVerts++;
                        break;
                      }
                    }

                    // Strict mesh interior test (Raycast parity inside solid meshes)
                    if (inBox && solidMeshes.length > 0) {
                      raycaster.set(v, rayDir);
                      const hits = raycaster.intersectObjects(solidMeshes, false);
                      if (hits.length % 2 === 1) {
                        insideInteriorVerts++;
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
            insideInteriorVerts,
            insideBoxHullVerts,
            testedVerts,
            wristSeparationM: minWristDist,
            forearmBottomY: +forearmBottomY.toFixed(1),
            camFov: +T.camera.fov.toFixed(2),
            camPos: [+T.camera.position.x.toFixed(4), +T.camera.position.y.toFixed(4), +T.camera.position.z.toFixed(4)],
            otsYaw: +T.otsDbg().yaw.toFixed(4),
            otsPitch: +T.otsDbg().pitch.toFixed(4),
            vmPos: vmActive && vm.frame && vm.frame.p ? [+vm.frame.p.x.toFixed(5), +vm.frame.p.y.toFixed(5), +vm.frame.p.z.toFixed(5)] : null,
            vmRot: eul ? [+eul.x.toFixed(5), +eul.y.toFixed(5), +eul.z.toFixed(5)] : null
          };
        },

        poseStill(wSpec, stillName, seat) {
          this.placePlayer(seat, stillName === 'sprint');
          this.equipWeapon(wSpec);
          const k = wSpec.key;

          if (stillName === 'hip') {
            for (let i = 0; i < 15; i++) T.stepFrame(1 / 60);
          } else if (stillName === 'ads') {
            T.setZoomHeldDbg(true);
            for (let i = 0; i < 35; i++) T.stepFrame(1 / 60);
          } else if (stillName === 'sprint') {
            T.flightInput({ keys: ['KeyW', 'ShiftLeft'], zoom: false, fire: false });
            for (let i = 0; i < 36; i++) T.stepFrame(1 / 60);
          } else if (stillName === 'fire-peak') {
            T.flightInput({ keys: [], zoom: false, fire: true });
            T.setMouseFireDbg(true);
            T.stepFrame(1 / 60);
            T.stepFrame(1 / 60);
            T.flightInput({ keys: [], zoom: false, fire: false });
            T.setMouseFireDbg(false);
          } else if (stillName.startsWith('reload-')) {
            const sub = stillName.slice(7);
            const uMap = {
              revolver: { out: 0.20, in: 0.58, home: 0.86 },
              default:  { out: 0.22, in: 0.58, home: 0.84 }
            };
            const u = (uMap[k] || uMap.default)[sub];
            T.setAmmoDbg(k, 1);
            T.startReload();
            T.reloadClipDbg.hold(u);
            for (let i = 0; i < 8; i++) T.stepFrame(1 / 60);
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
              const firing = t < 1.0;
              const isSemi = ['pistol', 'revolver'].includes(wSpec.key);
              const fireOn = isSemi ? (firing && (f % 6 === 0)) : firing;
              T.flightInput({ keys: [], zoom: false, fire: fireOn });
              T.setMouseFireDbg(fireOn);
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
        console.log(`[AG-202-R1] Capturing stills seat=${seat} res=${resKey}...`);

        for (const wSpec of WEAPONS) {
          for (const stName of STILL_NAMES) {
            const trace = await page.evaluate(
              `window.__ag202r1.poseStill(${JSON.stringify(wSpec)}, ${JSON.stringify(stName)}, ${JSON.stringify(seat)})`
            );
            const id = `${seat}-${resKey}-${wSpec.key}-${stName}`;
            allTraces.stills[id] = trace;

            const shot = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 86, captureBeyondViewport: false });
            fs.writeFileSync(path.join(seatDir, `${wSpec.key}-${stName}.jpg`), Buffer.from(shot.data, 'base64'));
          }
        }
      }

      console.log(`[AG-202-R1] Running strips at ${resKey}...`);
      for (const wSpec of WEAPONS) {
        const wFrameDir = path.join(FRAMES_DIR, `${wSpec.key}-${resKey}`);
        if (resKey === '1080p') fs.mkdirSync(wFrameDir, { recursive: true });

        for (const stripName of STRIP_NAMES) {
          const stripResult = await page.evaluate(
            `window.__ag202r1.runStrip(${JSON.stringify(wSpec)}, ${JSON.stringify(stripName)}, ${resKey === '1080p'})`
          );

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
              // Fallback capture 15 keyframes across strip
              await page.evaluate(`(() => {
                const T = window.TT, H = window.__ag202r1;
                const wSpec = ${JSON.stringify(wSpec)}, stripName = ${JSON.stringify(stripName)};
                H.placePlayer('tg', true);
                H.equipWeapon(wSpec);
                return 1;
              })()`);

              for (let f = 0; f < 90; f++) {
                await page.evaluate(`(() => {
                  const T = window.TT, f = ${f};
                  const stripName = ${JSON.stringify(stripName)};
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
                    const isSemi = ['pistol', 'revolver'].includes(${JSON.stringify(wSpec.key)});
                    const fireOn = isSemi ? (f < 30 && (f % 6 === 0)) : (f < 30);
                    T.flightInput({ keys: [], zoom: false, fire: fireOn });
                    T.setMouseFireDbg(fireOn);
                  } else if (stripName === 'jump') {
                    if (f === 5) { T.flightInput({ keys: ['Space'], zoom: false, fire: false }); T.airDbg.jumpNow(); }
                    else T.flightInput({ keys: [], zoom: false, fire: false });
                  }
                  T.stepFrame(1 / 60);
                  T.stepFrame(1 / 60);
                  return 1;
                })()`);

                if (f % 6 === 0 || f === 89) {
                  const shot = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 75, captureBeyondViewport: false });
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
        console.log(`[AG-202-R1] Finished ${wSpec.key} ${resKey}`);
      }
    }

    fs.writeFileSync(path.join(OUT_DIR, 'traces.json'), JSON.stringify(allTraces, null, 2));
    console.log('[AG-202-R1] Saved traces.json');
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((err) => {
  console.error('[AG-202-R1] Fatal error:', err);
  process.exit(1);
});
