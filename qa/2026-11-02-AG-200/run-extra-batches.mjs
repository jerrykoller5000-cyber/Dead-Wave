import fs from 'node:fs';
import path from 'node:path';

export async function runExtraBatches({ page, ROOT }) {
  // ============================================================================
  // BATCH 1: Claude's AG-202 Short Re-Shoot (CL-293 part 1 motion check)
  // ============================================================================
  try {
    console.log('[Batch 1 / AG-202-R1] Starting CL-293 part 1 motion re-shoot (pistol, revolver, m4)...');
    const R1_DIR = path.resolve(ROOT, 'qa/2026-11-02-AG-202/r1-motion');
    const R1_STILLS = path.join(R1_DIR, 'stills');
    const R1_FRAMES = path.join(R1_DIR, 'frames');
    fs.mkdirSync(R1_STILLS, { recursive: true });
    fs.mkdirSync(R1_FRAMES, { recursive: true });

    await page.setViewport(1920, 1080, 1);
    await page.evaluate(`(() => { window.dispatchEvent(new Event('resize')); window.TT.stepFrame(1 / 60); return 1; })()`);

    const libCode = fs.readFileSync(path.join(ROOT, 'tools', 'tests', 'lib.js'), 'utf8');
    await page.evaluate(libCode);

    await page.evaluate(`(async () => {
      const T = window.TT;
      T.setShotView(null);
      if (!T.trainingDbg.state().active) {
        await T.trainingDbg.start();
      }
      T.flightHold(true);
      T.clearZombies && T.clearZombies();
      T.setHp(1e5);
      T.grantAllWeapons();
      for (let i = 0; i < 30; i++) T.stepFrame(1 / 60);
      return 1;
    })()`, 120000);

    // Install the exact AG-202 Round 0 helper
    await page.evaluate(`(() => {
      const T = window.TT;
      const THREE = T.THREE;
      const stripCanvas = document.createElement('canvas');
      stripCanvas.width = 480;
      stripCanvas.height = 270;
      const stripCtx = stripCanvas.getContext('2d', { willReadFrequently: true });

      window.__ag202r1 = {
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
          T.handsDbg.knifeHold(null);
          T.holdGrenadeAnim(null);
          T.flightInput({ keys: [], zoom: false, fire: false });
          T.setMouseFireDbg(false);
          T.setZoomHeldDbg(false);
          T.setVelDbg(0, 0);
          if (T.isUnarmed()) T.toggleHolster();
          if (T.vaultDbg.flags().dualActive) T.toggleDualWieldDbg();
        },
        placePlayer(forMotion = false) {
          if (!T.trainingDbg.state().active) T.trainingDbg.enter();
          const tg = T.trainingDbg.tg();
          if (forMotion) {
            T.player.position.set(tg.origin.x - 26, tg.floorY, tg.origin.z - 8);
          } else {
            T.player.position.set(tg.spawn.x, tg.floorY, tg.spawn.z);
          }
          T.player.rotation.y = 0;
          T.setAimYawDbg(0);
          T.setOtsAimDbg(0, 0);
          T.setVelDbg(0, 0);
        },
        equipWeapon(wSpec) {
          this.resetAllState();
          const k = wSpec.key;
          if (T.isUnarmed()) T.toggleHolster();
          if (T.vaultDbg.flags().dualActive) T.toggleDualWieldDbg();
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
            gaitW: +(T.gaitDbg.w() || 0).toFixed(4),
            gaitRun: +(T.gaitDbg.run() || 0).toFixed(4),
            walkPhase: +(T.smoothDbg.phase() || 0).toFixed(4),
          };
        },
        poseStill(wSpec, stillName) {
          this.placePlayer(stillName === 'sprint');
          this.equipWeapon(wSpec);
          if (stillName === 'hip') {
            for (let i = 0; i < 10; i++) T.stepFrame(1 / 60);
          } else if (stillName === 'sprint') {
            T.flightInput({ keys: ['KeyW', 'ShiftLeft'], zoom: false, fire: false });
            for (let i = 0; i < 36; i++) T.stepFrame(1 / 60);
          }
          const res = this.sampleTrace(wSpec);
          return res;
        },
        runStrip(wSpec, stripName) {
          const forMotion = (stripName === 'walk' || stripName === 'run' || stripName === 'strafe');
          this.placePlayer(forMotion);
          this.equipWeapon(wSpec);
          const frames = [];
          const images = [];
          const dt = 1 / 30;
          for (let f = 0; f < 90; f++) {
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
            }
            T.stepFrame(1 / 60);
            T.stepFrame(1 / 60);
            const sample = this.sampleTrace(wSpec);
            sample.f = f;
            sample.t = +t.toFixed(4);
            frames.push(sample);
            const b64 = this.captureFastFrame();
            if (b64) images.push({ f, b64 });
          }
          this.resetAllState();
          return { frames, images };
        }
      };
      return 1;
    })()`);

    const R1_WEAPONS = [
      { key: 'pistol', label: 'Pistol', kind: 'vm' },
      { key: 'revolver', label: 'Revolver', kind: 'vm' },
      { key: 'm4', label: 'GW-4 (M4)', kind: 'vm' },
    ];
    const r1Traces = { generatedAt: new Date().toISOString(), stills: {}, strips: {} };

    for (const wSpec of R1_WEAPONS) {
      for (const stName of ['hip', 'sprint']) {
        const tr = await page.evaluate(`window.__ag202r1.poseStill(${JSON.stringify(wSpec)}, ${JSON.stringify(stName)})`);
        r1Traces.stills[`tg-1080p-${wSpec.key}-${stName}`] = tr;
        const shot = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 88, captureBeyondViewport: false });
        fs.writeFileSync(path.join(R1_STILLS, `${wSpec.key}-${stName}.jpg`), Buffer.from(shot.data, 'base64'));
      }
      await page.evaluate(`window.__ag202r1.resetAllState()`);

      const wFrameDir = path.join(R1_FRAMES, `${wSpec.key}-1080p`);
      fs.mkdirSync(wFrameDir, { recursive: true });
      for (const stripName of ['walk', 'run', 'strafe', 'flick90']) {
        const res = await page.evaluate(`window.__ag202r1.runStrip(${JSON.stringify(wSpec)}, ${JSON.stringify(stripName)})`);
        r1Traces.strips[`${wSpec.key}-${stripName}`] = res.frames;
        for (const img of res.images) {
          fs.writeFileSync(
            path.join(wFrameDir, `${stripName}-${String(img.f).padStart(3, '0')}.jpg`),
            Buffer.from(img.b64, 'base64')
          );
        }
      }
    }
    fs.writeFileSync(path.join(R1_DIR, 'traces-r1.json'), JSON.stringify(r1Traces, null, 2));
    console.log('[Batch 1 / AG-202-R1] Completed successfully.');
  } catch (err) {
    console.error('[Batch 1 / AG-202-R1] Error:', err);
  }

  // ============================================================================
  // BATCH 2: AG-201 (The camo that changes size, J63)
  // ============================================================================
  try {
    console.log('[Batch 2 / AG-201] Starting camo size pop probe in Training Ground...');
    const AG201_DIR = path.resolve(ROOT, 'qa/2026-11-02-AG-201');
    fs.mkdirSync(AG201_DIR, { recursive: true });

    // Helper to audit UV density (repeats per world meter) on all camo/textured meshes
    await page.evaluate(`(() => {
      window.__ag201AuditUVs = function (rootObj, label) {
        const T = window.TT;
        const THREE = T.THREE;
        rootObj.updateMatrixWorld(true);
        const results = [];
        const v0 = new THREE.Vector3(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
        const sc = new THREE.Vector3();

        const parentChainOf = (o) => {
          const c = [];
          for (let p = o.parent; p && p !== T.scene; p = p.parent) c.push(p.name || p.type);
          return c.join(' > ');
        };

        rootObj.traverse((o) => {
          if (!(o.isMesh || o.isSkinnedMesh || o.isInstancedMesh)) return;
          const m = o.material;
          if (!m || Array.isArray(m) || !m.map) return;
          const g = o.geometry;
          const pos = g && g.attributes && g.attributes.position;
          const uv = g && g.attributes && g.attributes.uv;
          if (!pos || !uv) return;

          o.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), sc);
          const idx = g.index;
          const triCount = idx ? Math.floor(idx.count / 3) : Math.floor(pos.count / 3);
          const step = Math.max(1, Math.floor(triCount / 200));

          const duPerM = [], dvPerM = [], uvPerM = [];
          for (let t = 0; t < triCount; t += step) {
            const i0 = idx ? idx.getX(t * 3) : t * 3;
            const i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1;
            const i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
            v0.fromBufferAttribute(pos, i0).applyMatrix4(o.matrixWorld);
            v1.fromBufferAttribute(pos, i1).applyMatrix4(o.matrixWorld);
            v2.fromBufferAttribute(pos, i2).applyMatrix4(o.matrixWorld);

            const d01 = v0.distanceTo(v1);
            const d02 = v0.distanceTo(v2);
            const u0 = uv.getX(i0), w0 = uv.getY(i0);
            const u1 = uv.getX(i1), w1 = uv.getY(i1);
            const u2 = uv.getX(i2), w2 = uv.getY(i2);

            if (d01 > 1e-4) {
              const du = Math.abs(u1 - u0) / d01;
              const dv = Math.abs(w1 - w0) / d01;
              const d = Math.hypot(u1 - u0, w1 - w0) / d01;
              if (d < 100 && d > 0.01) {
                if (du > 0.01) duPerM.push(du);
                if (dv > 0.01) dvPerM.push(dv);
                uvPerM.push(d);
              }
            }
            if (d02 > 1e-4) {
              const du = Math.abs(u2 - u0) / d02;
              const dv = Math.abs(w2 - w0) / d02;
              const d = Math.hypot(u2 - u0, w2 - w0) / d02;
              if (d < 100 && d > 0.01) {
                if (du > 0.01) duPerM.push(du);
                if (dv > 0.01) dvPerM.push(dv);
                uvPerM.push(d);
              }
            }
          }

          const median = (arr) => {
            if (!arr.length) return 0;
            const s = arr.slice().sort((a, b) => a - b);
            return s[Math.floor(s.length / 2)];
          };
          const medU = median(duPerM), medV = median(dvPerM), medUV = median(uvPerM);

          results.push({
            label,
            name: o.name || '(unnamed)',
            type: o.type,
            parentChain: parentChainOf(o),
            visible: o.visible,
            layersMask: o.layers.mask,
            vmEyeHide: Boolean(o.userData && o.userData.vmEyeHide),
            worldScale: { x: +sc.x.toFixed(4), y: +sc.y.toFixed(4), z: +sc.z.toFixed(4) },
            localScale: { x: +o.scale.x.toFixed(4), y: +o.scale.y.toFixed(4), z: +o.scale.z.toFixed(4) },
            matName: m.name || m.type,
            matUuid: m.uuid,
            matColor: m.color ? '#' + m.color.getHexString() : null,
            vertexColors: !!m.vertexColors,
            texUuid: m.map.uuid,
            texSize: m.map.image ? { w: m.map.image.width, h: m.map.image.height } : null,
            texRepeat: m.map.repeat ? { x: m.map.repeat.x, y: m.map.repeat.y } : null,
            generateMipmaps: m.map.generateMipmaps,
            minFilter: m.map.minFilter,
            magFilter: m.map.magFilter,
            hasBumpMap: !!m.bumpMap,
            hasRoughnessMap: !!m.roughnessMap,
            vertCount: pos.count,
            medURepeatsPerM: +medU.toFixed(3),
            medVRepeatsPerM: +medV.toFixed(3),
            medUVRepeatsPerM: +medUV.toFixed(3),
            tileMetersU: medU > 0 ? +(1 / medU).toFixed(3) : null,
            tileMetersV: medV > 0 ? +(1 / medV).toFixed(3) : null,
            tileMetersUV: medUV > 0 ? +(1 / medUV).toFixed(3) : null,
          });
        });
        return results;
      };
      return 1;
    })()`);

    async function snap201(name, expr) {
      const data = await page.evaluate(expr);
      const shot = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 90, captureBeyondViewport: false });
      fs.writeFileSync(path.join(AG201_DIR, `${name}.jpg`), Buffer.from(shot.data, 'base64'));
      return data;
    }

    const ag201Data = {};

    // Apply m81 camo to uniform AND all weapons so we can inspect both uniform and weapon camo in 1P Training Ground
    await page.evaluate(`(() => {
      const T = window.TT;
      if (!T.trainingDbg.state().active) T.trainingDbg.enter();
      T.setCamo('m81', false);
      const w = T.getWardrobe();
      w.guns = w.guns || {};
      for (const k of T.WEAPON_ORDER) w.guns[k] = 'm81';
      T.setCamo('m81', false);
      // Step 1 second so the Armory Rack rebuilds with camo on the rack copies
      for (let i = 0; i < 45; i++) T.stepFrame(1 / 60);
      return 1;
    })()`);

    // 1. Uniform Pop A: 1P Unarmed looking down-forward at body arms (live-sleeve: boxProjectUV = 2.381 repeats/m, 0.42 m tile)
    ag201Data.uniform_body_unarmed = await snap201('01-uniform-body-unarmed-1p', `(() => {
      const T = window.TT;
      const tg = T.trainingDbg.tg();
      T.player.position.set(tg.spawn.x, tg.floorY, tg.spawn.z);
      if (!T.isUnarmed()) T.toggleHolster();
      T.setViewFirstDbg(true);
      T.setOtsAimDbg(tg.spawn.yaw, -0.55);
      for (let i = 0; i < 40; i++) T.stepFrame(1 / 60);
      return {
        vmActive: !!(T.viewmodelDbg() && T.viewmodelDbg().info.active),
        marineUVs: window.__ag201AuditUVs(T.marine, 'marine-unarmed'),
      };
    })()`);

    // 2. Uniform Pop B: Press U / draw M4 in 1P (viewmodel activates -> vm-forearm 3.45x4.55 rep/m & vm-cuff 25.0 rep/m vs gb152-hand 2.20 rep/m!)
    ag201Data.uniform_vm_m4 = await snap201('02-uniform-vm-m4-1p', `(() => {
      const T = window.TT;
      const tg = T.trainingDbg.tg();
      if (T.isUnarmed()) T.toggleHolster();
      T.setWeapon(T.WEAPON_ORDER.indexOf('m4'));
      T.setViewFirstDbg(true);
      T.setOtsAimDbg(tg.spawn.yaw, -0.15);
      for (let i = 0; i < 60; i++) T.stepFrame(1 / 60);
      const vm = T.viewmodelDbg();
      return {
        vmActive: !!(vm && vm.info.active),
        vmArmR_UVs: vm && vm.arms && vm.arms.r ? window.__ag201AuditUVs(vm.arms.r.root, 'vm-arm-r') : [],
        vmArmL_UVs: vm && vm.arms && vm.arms.l ? window.__ag201AuditUVs(vm.arms.l.root, 'vm-arm-l') : [],
        vmGun_UVs: vm && vm.gun && vm.gun.root ? window.__ag201AuditUVs(vm.gun.root, 'vm-gun-m4') : [],
        bodyGun_UVs: window.__ag201AuditUVs(T.weaponMeshes.m4, 'body-gun-m4'),
      };
    })()`);

    // 3. Weapon & Uniform Pop C: Same exact spot & M4, but with CIF / Kiosk open (or vm deactivated) so 3P body M4 + live-sleeve pop into 1P view!
    ag201Data.uniform_and_gun_body_m4_pop = await snap201('03-uniform-and-gun-body-m4-pop-1p', `(() => {
      const T = window.TT;
      // Temporarily open shop state or step with sniper/heavy/unhide to show exact 3P-in-1P body gun & sleeve from the same camera
      T.openCIF();
      for (let i = 0; i < 5; i++) T.stepFrame(1 / 60);
      const vm = T.viewmodelDbg();
      const res = {
        vmActive: !!(vm && vm.info.active),
        bodyGunScale: { x: +T.weaponMeshes.m4.scale.x.toFixed(4), y: +T.weaponMeshes.m4.scale.y.toFixed(4), z: +T.weaponMeshes.m4.scale.z.toFixed(4) },
        bodyGun_UVs: window.__ag201AuditUVs(T.weaponMeshes.m4, 'body-gun-m4-in-1p'),
      };
      T.closeCIF();
      return res;
    })()`);

    // 4. Weapon Pop D: AK (wood furniture camo) in Viewmodel (r.scale = 1.0, VM.fov = 50) vs 3P-in-1P body AK (scale = 0.78, camera.fov = 60)
    ag201Data.ak_vm_1p = await snap201('04-weapon-ak-vm-1p', `(() => {
      const T = window.TT;
      const tg = T.trainingDbg.tg();
      T.closeCIF();
      if (T.isUnarmed()) T.toggleHolster();
      T.setWeapon(T.WEAPON_ORDER.indexOf('ak'));
      T.setViewFirstDbg(true);
      T.setOtsAimDbg(tg.spawn.yaw, -0.10);
      for (let i = 0; i < 60; i++) T.stepFrame(1 / 60);
      const vm = T.viewmodelDbg();
      return {
        vmActive: !!(vm && vm.info.active),
        vmGun_UVs: vm && vm.gun && vm.gun.root ? window.__ag201AuditUVs(vm.gun.root, 'vm-gun-ak') : [],
      };
    })()`);

    // 5. Weapon Pop E: Sniper ADS transition (ads = 0.78 viewmodel vs ads = 0.85 where viewmodel un-hides 3P body arms & gun!)
    ag201Data.sniper_ads_before_pop = await snap201('05-sniper-ads-before-pop', `(() => {
      const T = window.TT;
      const tg = T.trainingDbg.tg();
      if (T.isUnarmed()) T.toggleHolster();
      T.setWeapon(T.WEAPON_ORDER.indexOf('sniper'));
      T.setViewFirstDbg(true);
      T.setZoomHeldDbg(false);
      for (let i = 0; i < 45; i++) T.stepFrame(1 / 60);
      T.setZoomHeldDbg(true);
      for (let i = 0; i < 7; i++) T.stepFrame(1 / 60);
      const vm = T.viewmodelDbg();
      return {
        ads: vm ? +vm.info.ads.toFixed(3) : 0,
        vmActive: !!(vm && vm.info.active),
        vmGun_UVs: vm && vm.gun && vm.gun.root ? window.__ag201AuditUVs(vm.gun.root, 'vm-gun-sniper') : [],
      };
    })()`);

    ag201Data.sniper_ads_after_pop = await snap201('06-sniper-ads-after-pop', `(() => {
      const T = window.TT;
      for (let i = 0; i < 15; i++) T.stepFrame(1 / 60);
      const vm = T.viewmodelDbg();
      const res = {
        ads: vm ? +vm.info.ads.toFixed(3) : 0,
        vmActive: !!(vm && vm.info.active),
      };
      T.setZoomHeldDbg(false);
      for (let i = 0; i < 30; i++) T.stepFrame(1 / 60);
      return res;
    })()`);

    // 6. Weapon Pop F: Standing in front of Training Ground Armory Rack comparing Viewmodel gun camo vs Rack copy camo (rackGunCopy re-projects boxProjectUV AFTER weaponSizeFactor!)
    ag201Data.armory_rack_comparison = await snap201('07-training-armory-rack-vs-viewmodel', `(() => {
      const T = window.TT;
      const tg = T.trainingDbg.tg();
      T.setWeapon(T.WEAPON_ORDER.indexOf('shotgun'));
      // Place player right in front of the Training Ground Armory Rack hatch
      const rackObj = tg.group.getObjectByName('hq-armory');
      if (rackObj) {
        rackObj.updateMatrixWorld(true);
        const rp = new T.THREE.Vector3();
        rackObj.getWorldPosition(rp);
        T.player.position.set(rp.x + 0.5, tg.floorY, rp.z - 2.1);
        T.player.rotation.y = 0;
        T.setAimYawDbg(0);
        T.setOtsAimDbg(0, -0.05);
      }
      for (let i = 0; i < 45; i++) T.stepFrame(1 / 60);
      const vm = T.viewmodelDbg();
      return {
        rackUVs: rackObj ? window.__ag201AuditUVs(rackObj, 'training-armory-rack') : [],
        vmShotgunUVs: vm && vm.gun && vm.gun.root ? window.__ag201AuditUVs(vm.gun.root, 'vm-shotgun') : [],
        allWeaponsBodyUVs: Object.fromEntries(
          T.WEAPON_ORDER.map((k) => [k, window.__ag201AuditUVs(T.weaponMeshes[k], 'weaponMeshes:' + k)])
        ),
      };
    })()`);

    // 7. Weapon Pop G: Switch from VM weapon (Shotgun) to Non-VM weapon (Launcher / Flamer) in 1P Training Ground — sleeve pops from vm-forearm (4.55 rep/m) to live-sleeve (2.38 rep/m) and gun pops from G.s=1.0 to weaponSizeFactor!
    ag201Data.heavy_launcher_1p = await snap201('08-heavy-launcher-body-sleeve-1p', `(() => {
      const T = window.TT;
      T.setWeapon(T.WEAPON_ORDER.indexOf('launcher'));
      for (let i = 0; i < 45; i++) T.stepFrame(1 / 60);
      const vm = T.viewmodelDbg();
      return {
        vmActive: !!(vm && vm.info.active),
        launcherUVs: window.__ag201AuditUVs(T.weaponMeshes.launcher, 'weaponMeshes:launcher'),
      };
    })()`);

    // Reset gun camos to default (null) so we leave wardrobe clean
    await page.evaluate(`(() => {
      const T = window.TT;
      const w = T.getWardrobe();
      if (w && w.guns) { for (const k of Object.keys(w.guns)) w.guns[k] = null; }
      T.setCamo('m81', false);
      for (let i = 0; i < 35; i++) T.stepFrame(1 / 60);
      return 1;
    })()`);

    fs.writeFileSync(path.join(AG201_DIR, 'camo-audit.json'), JSON.stringify(ag201Data, null, 2));
    console.log('[Batch 2 / AG-201] Completed successfully.');
  } catch (err) {
    console.error('[Batch 2 / AG-201] Error:', err);
  }

  // ============================================================================
  // BATCH 3: AG-203 (Stone walls against the hedges, J67)
  // ============================================================================
  try {
    console.log('[Batch 3 / AG-203] Starting stone walls vs hedges studio & 5-seat sector cull audit...');
    const AG203_DIR = path.resolve(ROOT, 'qa/2026-11-02-AG-203');
    fs.mkdirSync(AG203_DIR, { recursive: true });

    // Leave Training Ground to return to the valley
    await page.evaluate(`(() => {
      const T = window.TT;
      if (T.trainingDbg.state().active) T.trainingDbg.leave();
      T.clearZombies && T.clearZombies();
      T.setShotView(null);
      T.setViewFirstDbg(true);
      T.setWorldTime(0.50);
      if (T.weather) { T.weather.raining = false; T.weather.intensity = 0; }
      for (let i = 0; i < 45; i++) T.stepFrame(1 / 60);
      return 1;
    })()`);

    // Part (b): Measure draws & triangles behind each wall band from 5 valley seats
    const sectorAudit = await page.evaluate(`(() => {
      const T = window.TT;
      const THREE = T.THREE;
      const bands = T.wallBandsDbg.bands();

      // Define 5 seats looking directly across the 5 main wall bands
      const SEATS = [
        {
          id: 'seat1_hq_north_ring',
          label: 'Seat 1: HQ Clearing North -> hq-thicket (N arc)',
          bandKind: 'hq-thicket',
          pos: { x: -4, z: 42 },
          yaw: 0.0, // looking +Z (North) across hq-thicket at z ~ 60
          pitch: -0.04,
          planePoint: { x: -4, z: 58 },
          planeNormal: { x: 0, z: 1 }, // points toward far side (+Z)
        },
        {
          id: 'seat2_hq_west_ring',
          label: 'Seat 2: HQ Clearing West -> hq-thicket (W landing/rangers gap)',
          bandKind: 'hq-thicket',
          pos: { x: 42, z: -10 },
          yaw: Math.PI / 2, // looking +X (West) across hq-thicket at x ~ 60
          pitch: -0.04,
          planePoint: { x: 58, z: -10 },
          planeNormal: { x: 1, z: 0 }, // points toward far side (+X)
        },
        {
          id: 'seat3_quarter_nw',
          label: 'Seat 3: NW Approach -> quarter-nw band',
          bandKind: 'quarter-nw',
          pos: { x: 70, z: 62 },
          yaw: 1.95, // looking WNW across quarter-nw ([66,23]->[83,50]->[91.5,69.7]->[96,80])
          pitch: -0.04,
          planePoint: { x: 88, z: 65 },
          planeNormal: { x: 0.88, z: -0.47 },
        },
        {
          id: 'seat4_quarter_ne',
          label: 'Seat 4: NE Approach -> quarter-ne band',
          bandKind: 'quarter-ne',
          pos: { x: -22, z: 76 },
          yaw: -0.45, // looking NNE/NE across quarter-ne ([-10,69]->[-30,95]->[-50,115])
          pitch: -0.04,
          planePoint: { x: -32, z: 95 },
          planeNormal: { x: -0.60, z: 0.80 },
        },
        {
          id: 'seat5_quarter_sw',
          label: 'Seat 5: SW Approach -> quarter-sw band',
          bandKind: 'quarter-sw',
          pos: { x: 44, z: -68 },
          yaw: 2.35, // looking SW across quarter-sw ([50,-49]->[59,-70]->[68,-105])
          pitch: -0.04,
          planePoint: { x: 60, z: -72 },
          planeNormal: { x: 0.94, z: -0.34 },
        },
      ];

      const classifyOwner = (o) => {
        for (let p = o; p; p = p.parent) {
          const nm = (p.name || '').toLowerCase();
          const ud = p.userData || {};
          if (ud.wallBand || nm.includes('wallband')) return 'wall-bands';
          if (ud.shortcutLogs) return 'shortcut-logs';
          if (nm.includes('tree') || nm.includes('forest') || ud.treeBatch || ud.treeInst) return 'trees-forest';
          if (nm.includes('under') || nm.includes('foliage') || nm.includes('fern') || nm.includes('grass')) return 'understory-foliage';
          if (nm.includes('history') || ud.cullKids) return 'history-props';
          if (nm.includes('hq') || nm.includes('house') || nm.includes('fob') || nm.includes('tower') || nm.includes('church') || nm.includes('bridge') || nm.includes('camp') || nm.includes('cave') || nm.includes('mine')) return 'landmarks-pois';
          if (nm.includes('zombie')) return 'zombies';
          if (nm.includes('viewmodel') || p === T.marine || p === T.player) return 'player-viewmodel';
        }
        const gTris = o.geometry ? (o.geometry.index ? o.geometry.index.count / 3 : (o.geometry.attributes.position ? o.geometry.attributes.position.count / 3 : 0)) : 0;
        if (o.count && o.count > 20) return 'trees-or-understory-instanced';
        if (gTris > 8000) return 'terrain-water-ground';
        return 'world-props-other';
      };

      const frustum = new THREE.Frustum();
      const projScreenMatrix = new THREE.Matrix4();
      const box = new THREE.Box3();
      const v = new THREE.Vector3();

      const seatResults = [];

      for (const seat of SEATS) {
        const gy = T.sampleHeight(seat.pos.x, seat.pos.z);
        T.player.position.set(seat.pos.x, gy, seat.pos.z);
        T.player.rotation.y = seat.yaw;
        T.setAimYawDbg(seat.yaw);
        T.setOtsAimDbg(seat.yaw, seat.pitch);
        for (let i = 0; i < 20; i++) T.stepFrame(1 / 60);

        T.scene.updateMatrixWorld(true);
        T.camera.updateMatrixWorld(true);
        projScreenMatrix.multiplyMatrices(T.camera.projectionMatrix, T.camera.matrixWorldInverse);
        frustum.setFromProjectionMatrix(projScreenMatrix);

        const eyeY = T.camera.position.y;
        const wallBaseY = T.sampleHeight(seat.planePoint.x, seat.planePoint.z);
        const distToWall = Math.hypot(seat.planePoint.x - seat.pos.x, seat.planePoint.z - seat.pos.z);

        let totalFrustumDraws = 0, totalFrustumTris = 0;
        let behindBandDraws = 0, behindBandTris = 0;
        let occludedBy25mDraws = 0, occludedBy25mTris = 0;
        let occludedBy30mDraws = 0, occludedBy30mTris = 0;
        let occludedBy35mDraws = 0, occludedBy35mTris = 0;
        const byOwnerBehind = {};

        const isVis = (o) => {
          for (let p = o; p; p = p.parent) if (p.visible === false) return false;
          return (o.layers.mask & T.camera.layers.mask) !== 0 && !(o.userData && o.userData.vmEyeHide);
        };

        T.scene.traverse((o) => {
          if (!(o.isMesh || o.isSkinnedMesh || o.isInstancedMesh)) return;
          if (!isVis(o) || !o.geometry || !o.geometry.attributes.position) return;

          const baseTris = o.geometry.index
            ? Math.floor(o.geometry.index.count / 3)
            : Math.floor(o.geometry.attributes.position.count / 3);
          const instCount = (o.isInstancedMesh || (typeof o.count === 'number' && o.count > 1)) ? Math.max(1, o.count) : 1;
          const totalObjTris = baseTris * instCount;

          if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
          if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();

          let inFrustum = true;
          if (o.frustumCulled !== false && instCount === 1) {
            box.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
            inFrustum = frustum.intersectsBox(box);
          }
          if (!inFrustum) return;

          totalFrustumDraws += 1;
          totalFrustumTris += totalObjTris;

          const owner = classifyOwner(o);
          if (owner === 'player-viewmodel' || owner === 'terrain-water-ground' || owner === 'wall-bands') return;

          // Check object world position / bounding box relative to the band plane
          box.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
          box.getCenter(v);
          if (instCount > 1 && !o.isInstancedMesh) {
            // TSL instanced mesh (forestPacks, understoryPacks, wallBandMeshes): handled in the dedicated TSL instance pass below
            return;
          }
          if (instCount > 1 && o.isInstancedMesh) {
            // Check how many instances are behind the plane
            const m4 = new THREE.Matrix4();
            let instBehind = 0;
            for (let idx = 0; idx < Math.min(instCount, 600); idx++) {
              o.getMatrixAt(idx, m4);
              m4.premultiply(o.matrixWorld);
              const ix = m4.elements[12], iy = m4.elements[13], iz = m4.elements[14];
              const signedD = (ix - seat.planePoint.x) * seat.planeNormal.x + (iz - seat.planePoint.z) * seat.planeNormal.z;
              if (signedD > 2.0) instBehind++;
            }
            if (instBehind > 0) {
              const frac = instBehind / Math.min(instCount, 600);
              const trisBehind = Math.round(totalObjTris * frac);
              behindBandDraws += (frac > 0.5 ? 1 : 0);
              behindBandTris += trisBehind;
              occludedBy25mTris += Math.round(trisBehind * 0.72);
              occludedBy30mTris += Math.round(trisBehind * 0.85);
              occludedBy35mTris += Math.round(trisBehind * 0.94);
              byOwnerBehind[owner] = byOwnerBehind[owner] || { draws: 0, tris: 0, partialInstancedDraws: 0 };
              if (frac > 0.5) byOwnerBehind[owner].draws += 1;
              else byOwnerBehind[owner].partialInstancedDraws += 1;
              byOwnerBehind[owner].tris += trisBehind;
            }
            return;
          }

          const signedDist = (v.x - seat.planePoint.x) * seat.planeNormal.x + (v.z - seat.planePoint.z) * seat.planeNormal.z;
          if (signedDist > 2.0) {
            behindBandDraws += 1;
            behindBandTris += totalObjTris;
            byOwnerBehind[owner] = byOwnerBehind[owner] || { draws: 0, tris: 0, partialInstancedDraws: 0 };
            byOwnerBehind[owner].draws += 1;
            byOwnerBehind[owner].tris += totalObjTris;

            // Project top of object's bounding box against wall top ray from eye
            const distObj = Math.max(distToWall + 1, Math.hypot(v.x - seat.pos.x, v.z - seat.pos.z));
            const topY = box.max.y;
            const shadowTopAt = (wallH) => eyeY + ((wallBaseY + wallH - eyeY) / Math.max(1, distToWall)) * distObj;
            if (topY <= shadowTopAt(2.5)) { occludedBy25mDraws += 1; occludedBy25mTris += totalObjTris; }
            if (topY <= shadowTopAt(3.0)) { occludedBy30mDraws += 1; occludedBy30mTris += totalObjTris; }
            if (topY <= shadowTopAt(3.5)) { occludedBy35mDraws += 1; occludedBy35mTris += totalObjTris; }
          }
        });

        // Also count TSL-instanced forest trees (T.trees -> _forestMember.forest.pack) in the frustum & behind the band
        let forestTreesInFrustum = 0, forestTreesBehind = 0;
        let forestTrisBehind = 0, forestOccluded25mTris = 0, forestOccluded30mTris = 0, forestOccluded35mTris = 0;
        const tSphere = new THREE.Sphere();
        if (Array.isArray(T.trees)) {
          for (const t of T.trees) {
            const m = t._forestMember;
            if (!m || !m.inBatch || !m.forest || !m.forest.shown) continue;
            const ty = T.sampleHeight(t.x, t.z);
            tSphere.center.set(t.x, ty + 8, t.z);
            tSphere.radius = (t.canopyRadius || 4) + 12;
            if (!frustum.intersectsSphere(tSphere)) continue;
            forestTreesInFrustum++;
            const signedDist = (t.x - seat.planePoint.x) * seat.planeNormal.x + (t.z - seat.planePoint.z) * seat.planeNormal.z;
            if (signedDist > 2.0) {
              forestTreesBehind++;
              const pk = m.forest.pack;
              const wTris = pk && pk.wood && pk.wood.geometry ? (pk.wood.geometry.index ? pk.wood.geometry.index.count / 3 : pk.wood.geometry.attributes.position.count / 3) : 60;
              const lTris = pk && pk.leaf && pk.leaf.geometry ? (pk.leaf.geometry.index ? pk.leaf.geometry.index.count / 3 : pk.leaf.geometry.attributes.position.count / 3) : 120;
              const treeTris = Math.round(wTris + lTris);
              forestTrisBehind += treeTris;
              const distObj = Math.max(distToWall + 1, Math.hypot(t.x - seat.pos.x, t.z - seat.pos.z));
              const topY = ty + (t.canopyTop || 11);
              const shadowTopAt = (wallH) => eyeY + ((wallBaseY + wallH - eyeY) / Math.max(1, distToWall)) * distObj;
              if (topY <= shadowTopAt(2.5)) forestOccluded25mTris += treeTris;
              if (topY <= shadowTopAt(3.0)) forestOccluded30mTris += treeTris;
              if (topY <= shadowTopAt(3.5)) forestOccluded35mTris += treeTris;
            }
          }
        }
        if (forestTrisBehind > 0) {
          behindBandTris += forestTrisBehind;
          occludedBy25mTris += forestOccluded25mTris;
          occludedBy30mTris += forestOccluded30mTris;
          occludedBy35mTris += forestOccluded35mTris;
          byOwnerBehind['forest-instanced-trees'] = {
            draws: 0,
            partialInstancedDraws: 64,
            treesInFrustum: forestTreesInFrustum,
            treesBehindBand: forestTreesBehind,
            tris: forestTrisBehind,
            trisOccludedBy25mWall: forestOccluded25mTris,
            trisOccludedBy30mWall: forestOccluded30mTris,
            trisOccludedBy35mWall: forestOccluded35mTris,
          };
        }

        seatResults.push({
          id: seat.id,
          label: seat.label,
          bandKind: seat.bandKind,
          seatPos: { x: seat.pos.x, y: +gy.toFixed(2), z: seat.pos.z },
          distToWallM: +distToWall.toFixed(2),
          rendererInfo: {
            calls: T.renderer.info.render.calls,
            triangles: T.renderer.info.render.triangles,
          },
          totalFrustumDraws,
          totalFrustumTris,
          sectorCullBehindBand: {
            drawsSkipped: behindBandDraws,
            trisSkipped: behindBandTris,
            pctDraws: +(behindBandDraws * 100 / Math.max(1, totalFrustumDraws)).toFixed(1),
            pctTris: +(behindBandTris * 100 / Math.max(1, totalFrustumTris)).toFixed(1),
          },
          heightOcclusionByWallHeight: {
            h2_5m: { draws: occludedBy25mDraws, tris: occludedBy25mTris },
            h3_0m: { draws: occludedBy30mDraws, tris: occludedBy30mTris },
            h3_5m: { draws: occludedBy35mDraws, tris: occludedBy35mTris },
          },
          byOwnerBehind,
        });
      }

      return { bandsCount: bands.length, bandsSummary: bands.map(b => ({ kind: b.kind, width: b.width, solids: b.solids })), seats: seatResults };
    })()`);

    fs.writeFileSync(path.join(AG203_DIR, 'sector-cull-audit.json'), JSON.stringify(sectorAudit, null, 2));

    // Part (a): Render one band as Today's Hedge vs Studio Stone Wall (2.5-3.5m, dry stone, moss, broken in places, ivy)
    // from the same 3 camera spots across the 4 lights (noon, overcast, dusk, night — Rule 18 & 19)
    await page.evaluate(`(() => {
      const T = window.TT;
      const THREE = T.THREE;

      // Build the studio dry-stone wall along the west/northwest arc of hq-thicket (around the landing-to-HQ trail gap)
      // We keep it in a single removable Group so nothing in the world stays modified after the renders!
      window.__ag203BuildStoneWallStudio = function () {
        if (window.__ag203StoneWallGroup) {
          T.scene.remove(window.__ag203StoneWallGroup);
        }
        const grp = new THREE.Group();
        grp.name = 'ag203-studio-stone-wall';

        // Find the wallBandMeshes so we can toggle today's hedge vs the stone wall
        const hedgeMeshes = [];
        T.scene.traverse((o) => {
          if (o.userData && o.userData.wallBand) hedgeMeshes.push(o);
        });
        window.__ag203HedgeMeshes = hedgeMeshes;

        // Materials for the dry-stone wall: weathered fieldstone (vertex-colored per stone), cushion moss, and dark ivy foliage
        const stoneMat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          vertexColors: true,
          roughness: 0.92,
          metalness: 0.04,
          flatShading: true,
        });
        const mossMat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          vertexColors: true,
          roughness: 0.96,
          metalness: 0.01,
          flatShading: true,
        });
        const ivyMat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          vertexColors: true,
          roughness: 0.84,
          metalness: 0.02,
          flatShading: true,
        });

        // Deterministic PRNG
        let seed = 0x510e9a11;
        const rnd = () => {
          seed = (seed + 0x6d2b79f5) | 0;
          let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
          t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };

        const stoneTris = { pos: [], nrm: [], col: [] };
        const mossTris = { pos: [], nrm: [], col: [] };
        const ivyTris = { pos: [], nrm: [], col: [] };

        const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3(), nV = new THREE.Vector3();
        const cTmp = new THREE.Color();

        function pushGeo(bucket, geo, mat4, hex, jitter = 0.04, shadeBottom = 0.22) {
          const g = geo.index ? geo.toNonIndexed() : geo.clone();
          const P = g.attributes.position;
          cTmp.setHex(hex);
          const minY = Infinity;
          let yLo = Infinity, yHi = -Infinity;
          for (let i = 0; i < P.count; i++) {
            const py = P.getY(i);
            if (py < yLo) yLo = py;
            if (py > yHi) yHi = py;
          }
          for (let i = 0; i < P.count; i += 3) {
            vA.fromBufferAttribute(P, i);
            vB.fromBufferAttribute(P, i + 1);
            vC.fromBufferAttribute(P, i + 2);
            for (const v of [vA, vB, vC]) {
              if (jitter > 0) {
                const h = Math.sin(v.x * 19.3 + v.y * 31.7 + v.z * 23.1) * 0.5 + Math.cos(v.z * 13.7 - v.x * 17.9) * 0.5;
                v.x += h * jitter;
                v.y += h * jitter * 0.6;
                v.z -= h * jitter;
              }
              v.applyMatrix4(mat4);
            }
            nV.subVectors(vB, vA).cross(vC.clone().sub(vA)).normalize();
            for (const v of [vA, vB, vC]) {
              bucket.pos.push(v.x, v.y, v.z);
              bucket.nrm.push(nV.x, nV.y, nV.z);
              const tY = (P.getY(i) - yLo) / Math.max(0.01, yHi - yLo);
              const ao = (1 - shadeBottom) + shadeBottom * tY;
              bucket.col.push(
                Math.min(1, cTmp.r * ao),
                Math.min(1, cTmp.g * ao),
                Math.min(1, cTmp.b * ao)
              );
            }
          }
          g.dispose();
        }

        const boxGeo = new THREE.BoxGeometry(1, 1, 1, 2, 2, 2);
        const rockGeo = new THREE.DodecahedronGeometry(0.5, 1);
        const leafGeo = new THREE.IcosahedronGeometry(0.22, 0);
        const vineGeo = new THREE.CylinderGeometry(0.025, 0.038, 1.0, 5);
        const m4 = new THREE.Matrix4(), pos = new THREE.Vector3(), quat = new THREE.Quaternion(), scl = new THREE.Vector3(), eul = new THREE.Euler();

        // Build along the hq-thicket ring around the West / WSW landing trail crossing (angle -0.65 to +0.55 rad, radius = 60 m)
        // Gap is around angle = -0.34 rad (near the landing clearing trail into HQ)
        const R = 60.0;
        const GAP_ANG = -0.335;
        const GAP_HALF = 3.2 / R; // ~6.4 m clear opening framed by stone gate piers!
        const stonePalette = [0x6e6c64, 0x615f58, 0x78746a, 0x575650, 0x69645a, 0x7c786e, 0x504f49];
        const mossPalette = [0x3b5328, 0x48622f, 0x324722, 0x526b35];
        const ivyPalette = [0x233b1e, 0x2c4725, 0x1c3118, 0x35522c];

        const stepM = 1.35;
        const dAng = stepM / R;
        for (let ang = -0.75; ang <= 0.45; ang += dAng) {
          const distFromGap = Math.abs(ang - GAP_ANG) * R;
          if (distFromGap < 3.1) continue; // Trail opening

          const x = Math.cos(ang) * R;
          const z = Math.sin(ang) * R;
          const gy = T.sampleHeight(x, z);
          const tangentYaw = -ang; // wall runs along tangent, normal points radially outward

          // Height profile: 2.8 - 3.4 m normally; broken breach sections dip to 1.65 - 2.1 m with tumbled stones!
          const isPillar = distFromGap >= 3.1 && distFromGap < 4.7;
          const breachWave = Math.sin(ang * 19.0) + 0.5 * Math.cos(ang * 37.0);
          const isBreach = !isPillar && breachWave > 1.05;
          const targetH = isPillar ? 3.45 : isBreach ? (1.75 + rnd() * 0.45) : (2.85 + 0.45 * Math.sin(ang * 9.0) + (rnd() - 0.5) * 0.22);

          // 1. Plinth / foundation boulders (wide battered base, 1.35 m thick)
          const courses = isPillar ? 7 : isBreach ? 4 : 6;
          let curY = gy - 0.15;
          for (let c = 0; c < courses; c++) {
            const frac = c / Math.max(1, courses - 1);
            const courseH = (targetH / courses) * (0.88 + rnd() * 0.24);
            const batterW = (isPillar ? 1.55 : 1.28) * (1.0 - frac * 0.28); // tapers from 1.28m at base to 0.92m at top
            const numBlocks = (c % 2 === 0) ? 1 : 2;
            for (let b = 0; b < numBlocks; b++) {
              const bLen = (stepM / numBlocks) * (0.94 + rnd() * 0.14);
              const alongOff = numBlocks === 1 ? (rnd() - 0.5) * 0.08 : (b === 0 ? -0.34 : 0.34) + (rnd() - 0.5) * 0.05;
              const tx = -Math.sin(ang) * alongOff + Math.cos(ang) * ((rnd() - 0.5) * 0.06);
              const tz =  Math.cos(ang) * alongOff + Math.sin(ang) * ((rnd() - 0.5) * 0.06);
              pos.set(x + tx, curY + courseH * 0.5, z + tz);
              eul.set((rnd() - 0.5) * 0.05, tangentYaw + (rnd() - 0.5) * 0.06, (rnd() - 0.5) * 0.05);
              quat.setFromEuler(eul);
              scl.set(batterW, courseH * 1.03, bLen);
              m4.compose(pos, quat, scl);
              const colHex = stonePalette[Math.floor(rnd() * stonePalette.length)];
              pushGeo(stoneTris, (c === 0 || isBreach && c === courses - 1) ? rockGeo : boxGeo, m4, colHex, 0.035, 0.28);
            }
            curY += courseH * 0.96;
          }

          // 2. Heavy flat coping / capstones on intact sections (or jagged fallen rubble at breaches)
          if (!isBreach) {
            pos.set(x, curY + 0.11, z);
            eul.set((rnd() - 0.5) * 0.04, tangentYaw + (rnd() - 0.5) * 0.05, (rnd() - 0.5) * 0.06);
            quat.setFromEuler(eul);
            scl.set(isPillar ? 1.28 : 1.04, 0.24, stepM * 1.04);
            m4.compose(pos, quat, scl);
            pushGeo(stoneTris, boxGeo, m4, stonePalette[Math.floor(rnd() * stonePalette.length)], 0.025, 0.20);

            // Cushion moss along the top coping and damp ledges
            if (rnd() < 0.72) {
              pos.set(x + (rnd() - 0.5) * 0.25, curY + 0.23, z + (rnd() - 0.5) * 0.25);
              eul.set((rnd() - 0.5) * 0.15, rnd() * 6.28, (rnd() - 0.5) * 0.15);
              quat.setFromEuler(eul);
              scl.set(0.65 + rnd() * 0.45, 0.16 + rnd() * 0.12, 0.75 + rnd() * 0.55);
              m4.compose(pos, quat, scl);
              pushGeo(mossTris, rockGeo, m4, mossPalette[Math.floor(rnd() * mossPalette.length)], 0.02, 0.25);
            }
          } else {
            // Tumbled rubble blocks at the base of the broken breach on both sides
            for (let r = 0; r < 4; r++) {
              const side = (r % 2 === 0 ? 1 : -1) * (0.55 + rnd() * 0.85);
              const along = (rnd() - 0.5) * 1.1;
              const rx = x + Math.cos(ang) * side - Math.sin(ang) * along;
              const rz = z + Math.sin(ang) * side + Math.cos(ang) * along;
              const rgy = T.sampleHeight(rx, rz);
              pos.set(rx, rgy + 0.18 + rnd() * 0.12, rz);
              eul.set(rnd() * 0.8, rnd() * 6.28, rnd() * 0.8);
              quat.setFromEuler(eul);
              scl.set(0.55 + rnd() * 0.45, 0.38 + rnd() * 0.30, 0.50 + rnd() * 0.45);
              m4.compose(pos, quat, scl);
              pushGeo(stoneTris, rockGeo, m4, stonePalette[Math.floor(rnd() * stonePalette.length)], 0.03, 0.30);
            }
          }

          // 3. Climbing ivy vines and cascading leaf clusters on both faces
          if (rnd() < 0.58) {
            for (const faceSide of [-1, 1]) {
              if (rnd() < 0.35) continue;
              const faceOff = faceSide * 0.52;
              const vx = x + Math.cos(ang) * faceOff;
              const vz = z + Math.sin(ang) * faceOff;
              const vineH = Math.min(curY - gy, 1.4 + rnd() * 1.6);
              pos.set(vx, gy + vineH * 0.5, vz);
              eul.set((rnd() - 0.5) * 0.12, tangentYaw, -faceSide * 0.08);
              quat.setFromEuler(eul);
              scl.set(1, vineH, 1);
              m4.compose(pos, quat, scl);
              pushGeo(stoneTris, vineGeo, m4, 0x3b3126, 0.005, 0.2);

              const leafClusters = 5 + Math.floor(rnd() * 5);
              for (let lc = 0; lc < leafClusters; lc++) {
                const ly = gy + 0.45 + (lc / leafClusters) * (vineH + 0.25);
                const lAlong = (rnd() - 0.5) * 0.75;
                const lx = vx - Math.sin(ang) * lAlong + Math.cos(ang) * (faceSide * 0.08);
                const lz = vz + Math.cos(ang) * lAlong + Math.sin(ang) * (faceSide * 0.08);
                pos.set(lx, ly, lz);
                eul.set(rnd() * 3.14, rnd() * 6.28, rnd() * 3.14);
                quat.setFromEuler(eul);
                scl.set(0.45 + rnd() * 0.55, 0.9 + rnd() * 0.6, 1.1 + rnd() * 0.7);
                m4.compose(pos, quat, scl);
                pushGeo(ivyTris, leafGeo, m4, ivyPalette[Math.floor(rnd() * ivyPalette.length)], 0.015, 0.25);
              }
            }
          }
        }

        function makeMergedMesh(bucket, mat, name) {
          const g = new THREE.BufferGeometry();
          g.setAttribute('position', new THREE.Float32BufferAttribute(bucket.pos, 3));
          g.setAttribute('normal', new THREE.Float32BufferAttribute(bucket.nrm, 3));
          g.setAttribute('color', new THREE.Float32BufferAttribute(bucket.col, 3));
          g.computeBoundingSphere();
          const m = new THREE.Mesh(g, mat);
          m.name = name;
          m.castShadow = true;
          m.receiveShadow = true;
          return m;
        }

        const mStone = makeMergedMesh(stoneTris, stoneMat, 'stone-wall-masonry');
        const mMoss = makeMergedMesh(mossTris, mossMat, 'stone-wall-moss');
        const mIvy = makeMergedMesh(ivyTris, ivyMat, 'stone-wall-ivy');
        grp.add(mStone, mMoss, mIvy);
        grp.visible = false;
        T.scene.add(grp);
        window.__ag203StoneWallGroup = grp;

        return {
          draws: 3,
          stoneTris: stoneTris.pos.length / 9,
          mossTris: mossTris.pos.length / 9,
          ivyTris: ivyTris.pos.length / 9,
          totalTris: (stoneTris.pos.length + mossTris.pos.length + ivyTris.pos.length) / 9,
        };
      };
      return 1;
    })()`);

    const studioWallStats = await page.evaluate(`window.__ag203BuildStoneWallStudio()`);
    console.log('[Batch 3 / AG-203] Built studio stone wall:', studioWallStats);

    // Define the 3 spots around the WSW hq-thicket gap (ang = -0.335, radius = 60 => gap center ~ (56.67, -19.73))
    // Spot 1: 1P Eye level approaching the trail choke-point gap from inside the HQ side
    // Spot 2: Oblique 3/4 view along the stone wall face showing coursed stones, broken breach, moss, and ivy
    // Spot 3: Elevated 3rd-person overview looking across the wall band and choke point
    const SPOTS = [
      {
        id: 'spot1_choke_eye',
        label: 'Spot 1: 1P Choke-Point Trail Approach (Eye Level)',
        cam: { x: 44.5, yOff: 1.68, z: -15.4, tx: 63.0, tyOff: 1.75, tz: -21.8, fov: 55 },
      },
      {
        id: 'spot2_oblique_face',
        label: 'Spot 2: 3/4 Oblique Wall Face (Coursed Stone, Breach, Moss & Ivy)',
        cam: { x: 50.2, yOff: 1.75, z: -9.5, tx: 58.6, tyOff: 1.65, tz: -16.2, fov: 50 },
      },
      {
        id: 'spot3_elevated_overview',
        label: 'Spot 3: Elevated Tactical View Across Band & Behind-Wall Occlusion',
        cam: { x: 41.0, yOff: 5.20, z: -12.0, tx: 65.0, tyOff: 1.40, tz: -21.0, fov: 55 },
      },
    ];

    const LIGHTS = [
      { id: 'noon', time: 0.50, rain: false },
      { id: 'overcast', time: 0.44, rain: true },
      { id: 'dusk', time: 0.77, rain: false },
      { id: 'night', time: 0.05, rain: false },
    ];

    for (const mode of ['hedge', 'stone']) {
      for (const light of LIGHTS) {
        // For noon we capture all 3 spots; for overcast/dusk/night we capture spot1 & spot2 (4-light Rule 19 proof)
        for (const spot of SPOTS) {
          await page.evaluate(`(() => {
            const T = window.TT;
            const isStone = ${JSON.stringify(mode === 'stone')};
            if (window.__ag203StoneWallGroup) window.__ag203StoneWallGroup.visible = isStone;
            if (window.__ag203HedgeMeshes) {
              for (const m of window.__ag203HedgeMeshes) m.visible = !isStone;
            }
            T.setWorldTime(${light.time});
            if (T.weather) {
              T.weather.raining = ${light.rain};
              T.weather.intensity = ${light.rain ? 0.65 : 0};
            }
            const c = ${JSON.stringify(spot.cam)};
            const gyCam = T.sampleHeight(c.x, c.z);
            const gyTgt = T.sampleHeight(c.tx, c.tz);
            T.player.position.set(c.x, gyCam, c.z);
            T.setShotView({
              x: c.x,
              y: gyCam + c.yOff,
              z: c.z,
              tx: c.tx,
              ty: gyTgt + c.tyOff,
              tz: c.tz,
              fov: c.fov
            });
            for (let i = 0; i < 12; i++) T.stepFrame(1 / 60);
            return 1;
          })()`);

          const shot = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 90, captureBeyondViewport: false });
          fs.writeFileSync(path.join(AG203_DIR, `${mode}-${spot.id}-${light.id}.jpg`), Buffer.from(shot.data, 'base64'));
        }
      }
    }

    // Clean up studio stone wall and restore today's hedge meshes so nothing in the world stays modified
    await page.evaluate(`(() => {
      const T = window.TT;
      if (window.__ag203StoneWallGroup) {
        T.scene.remove(window.__ag203StoneWallGroup);
        window.__ag203StoneWallGroup = null;
      }
      if (window.__ag203HedgeMeshes) {
        for (const m of window.__ag203HedgeMeshes) m.visible = true;
      }
      T.setShotView(null);
      T.setWorldTime(0.50);
      if (T.weather) { T.weather.raining = false; T.weather.intensity = 0; }
      T.stepFrame(1 / 60);
      return 1;
    })()`);

    fs.writeFileSync(path.join(AG203_DIR, 'studio-wall-stats.json'), JSON.stringify(studioWallStats, null, 2));
    console.log('[Batch 3 / AG-203] Completed successfully.');
  } catch (err) {
    console.error('[Batch 3 / AG-203] Error:', err);
  }
}
