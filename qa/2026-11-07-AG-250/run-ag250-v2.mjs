// qa/2026-11-07-AG-250/run-ag250-v2.mjs
// Task AG-250: Find J6: the arms' texture popping in and out in the Training Ground (D-118)
// Full audit with real player motion, frame sequence captures, and telemetry

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Use the shared game-test slot (crew.mjs slot run)');
}

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa/2026-11-07-AG-250');
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
  console.log(`[AG-250] Saved screenshot: ${filename} (${shot.data.length} bytes base64)`);
  return outPath;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('\n========================================================================');
  console.log('=== [AG-250] Find J6: Arms Texture Pop in Training Ground (v2)       ===');
  console.log('=== Real WebGPU Hardware (RTX 5080)                                  ===');
  console.log('========================================================================\n');

  const server = await serve(ROOT, 0);
  const url = `${server.origin}/index.html?solid=1&debug=1`;
  console.log('[AG-250] Serving game from:', url);

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

    console.log('[AG-250] Navigating to game...');
    await page.goto(url, { timeout: 180000 });
    if (!(await page.waitFor('!!window.TT', { timeout: 180000 }))) {
      throw new Error('window.TT never appeared: ' + (page.errors[0] || ''));
    }

    // Dismiss intro / opening
    await page.evaluate(`(() => {
      if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting();
      else if (window.DWOpening && typeof DWOpening.skip === 'function') DWOpening.skip();
    })()`);
    await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });

    // Enter Training Ground as JERRY
    console.log('[AG-250] Entering Training Ground as JERRY...');
    await page.evaluate(`(() => {
      const nameEl = document.getElementById('playerName');
      if (nameEl) nameEl.value = 'JERRY';
      const btn = document.getElementById('modeTraining');
      if (btn) btn.click();
      else if (window.TT && window.TT.enterTraining) window.TT.enterTraining();
    })()`);

    if (!(await page.waitFor('window.TT && window.TT.trainingDbg && window.TT.trainingDbg.state().active', { timeout: 30000 }))) {
      throw new Error('Training Ground failed to become active');
    }
    await wait(2000);
    console.log('[AG-250] Training Ground active.');

    // Setup helper in page
    await page.evaluate(`(() => {
      const T = window.TT;
      T.setHp(100000);
      T.grantAllWeapons();
      if (T.isUnarmed()) T.toggleHolster();
      T.setViewFirstDbg(true);
      if (document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
      }

      window.__ag250 = {
        history: [],
        auditFrame(tag = '') {
          const vm = T.viewmodelDbg();
          const arms = vm && vm.arms;
          const rFore = arms?.r?.meshes?.fore;
          const rCuff = arms?.r?.meshes?.cuff;
          const rUpper = arms?.r?.meshes?.upper;
          const rGlove = arms?.r?.meshes?.glove;
          const lFore = arms?.l?.meshes?.fore;

          // 3P body arm meshes check
          const bodyParts = [];
          T.player.traverse(o => {
            if (o.isMesh && (o.name.includes('sleeve') || o.name.includes('arm') || o.name.includes('glove'))) {
              bodyParts.push({
                name: o.name,
                visible: o.visible,
                vmEyeHide: !!o.userData?.vmEyeHide,
                matUuid: o.material?.uuid,
                matName: o.material?.name
              });
            }
          });

          const snap = {
            tag,
            time: performance.now(),
            weapon: vm ? vm.info.key : null,
            active: vm ? vm.info.active : false,
            raise: vm ? vm.info.raise : 0,
            ads: T.fpDbg().ads,
            playerPos: { x: T.player.position.x, y: T.player.position.y, z: T.player.position.z },
            yaw: T.player.rotation.y,
            rFore: rFore ? {
              vis: rFore.visible,
              pVis: rFore.parent?.visible,
              matUuid: rFore.material?.uuid,
              matVersion: rFore.material?.version,
              mapUuid: rFore.material?.map?.uuid,
              matName: rFore.material?.name,
              color: rFore.material?.color ? rFore.material.color.getHexString() : null,
              recSh: rFore.receiveShadow,
              castSh: rFore.castShadow,
            } : null,
            rCuff: rCuff ? {
              vis: rCuff.visible,
              matUuid: rCuff.material?.uuid,
              mapUuid: rCuff.material?.map?.uuid
            } : null,
            rUpper: rUpper ? {
              vis: rUpper.visible,
              matUuid: rUpper.material?.uuid,
              mapUuid: rUpper.material?.map?.uuid
            } : null,
            rGlove: rGlove ? {
              vis: rGlove.visible,
              matUuid: rGlove.material?.uuid,
              mapUuid: rGlove.material?.map?.uuid
            } : null,
            parts: arms ? {
              rSleeve: arms.r.parts.sleeve.visible,
              rRolled: arms.r.parts.rolled.visible,
              rGlove: arms.r.parts.glove.visible,
              rBare: arms.r.parts.bare.visible,
              lSleeve: arms.l.parts.sleeve.visible,
              lRolled: arms.l.parts.rolled.visible,
              lGlove: arms.l.parts.glove.visible,
              lBare: arms.l.parts.bare.visible,
            } : null,
            bodyParts
          };
          this.history.push(snap);
          return snap;
        },
        async moveAlong(pStart, pEnd, speed, onStep) {
          const dist = Math.hypot(pEnd.x - pStart.x, pEnd.z - pStart.z);
          const dur = dist / speed;
          const steps = Math.ceil(dur * 30); // 30 steps/sec
          const dt = dur / steps;
          const yaw = Math.atan2(pEnd.x - pStart.x, pEnd.z - pStart.z);
          T.player.rotation.y = yaw;
          T.setAimYawDbg(yaw);

          for (let i = 0; i <= steps; i++) {
            const frac = i / steps;
            const x = pStart.x + (pEnd.x - pStart.x) * frac;
            const z = pStart.z + (pEnd.z - pStart.z) * frac;
            T.player.position.set(x, pStart.y, z);
            if (onStep) await onStep(frac, i, steps);
            await new Promise(r => setTimeout(r, Math.max(10, dt * 1000)));
          }
        }
      };
    })()`);

    console.log('[AG-250] Setup complete. Starting weapon test matrix...');

    const weapons = ['launcher', 'm4', 'pistol'];
    const telemetry = {
      runs: {},
      frameSequences: []
    };

    // Firing line / range corridor positions in TG
    // TG origin is O; spawn is roughly (0, 0, -0.61) facing +z
    const pSpawn = await page.evaluate(`(() => {
      const g = window.TT.trainingDbg.tg();
      return { x: 0, y: g.floorY, z: -0.61 };
    })()`);

    // In build room: clear floor from x = -26, z = -6 to z = 18
    const pBuildStart = { x: -26, y: pSpawn.y, z: -6 };
    const pBuildEnd = { x: -26, y: pSpawn.y, z: 18 };

    for (const w of weapons) {
      console.log(`\n========================================================================`);
      console.log(`=== Testing weapon: ${w} ===`);
      console.log(`========================================================================`);

      // Equip weapon
      await page.evaluate(`((w) => {
        const T = window.TT;
        if (T.isUnarmed()) T.toggleHolster();
        const idx = T.WEAPON_ORDER.indexOf(w);
        T.setWeapon(idx);
        T.setViewFirstDbg(true);
      })('${w}')`);
      await wait(600); // let weapon raise finish

      const runData = { weapon: w, sequences: {} };

      // ----------------------------------------------------------------------
      // TEST 1: WALK in Training Ground (Build Room corridor: z -6 to +18)
      // ----------------------------------------------------------------------
      console.log(`[${w}] 1. Walk test (moving from z=-6 to z=18 at walk speed 3.2 m/s)...`);
      const walkFrames = [];
      let walkStepCount = 0;
      await page.evaluate(`(async () => {
        const h = window.__ag250;
        await h.moveAlong(${JSON.stringify(pBuildStart)}, ${JSON.stringify(pBuildEnd)}, 3.2, async (frac, step, total) => {
          h.auditFrame('${w}-walk-' + step);
        });
      })()`);

      // Capture shot at mid-walk
      await captureShot(page, `${w}-01-walk.jpg`);

      // ----------------------------------------------------------------------
      // TEST 2: RUN in Training Ground (sprint speed 6.4 m/s)
      // ----------------------------------------------------------------------
      console.log(`[${w}] 2. Run test (sprinting from z=18 back to z=-6 at run speed 6.4 m/s)...`);
      await page.evaluate(`(async () => {
        const h = window.__ag250;
        await h.moveAlong(${JSON.stringify(pBuildEnd)}, ${JSON.stringify(pBuildStart)}, 6.4, async (frac, step, total) => {
          h.auditFrame('${w}-run-' + step);
        });
      })()`);

      // Capture shot at mid-run
      await captureShot(page, `${w}-02-run.jpg`);

      // ----------------------------------------------------------------------
      // TEST 3: TURN in Training Ground (360 degrees full rotation)
      // ----------------------------------------------------------------------
      console.log(`[${w}] 3. Turn test (rotating 360 degrees at z=6 in build room)...`);
      const turnSnaps = [];
      for (let s = 0; s < 12; s++) {
        const yaw = (s / 12) * Math.PI * 2;
        await page.evaluate(`((y) => {
          const T = window.TT;
          T.player.rotation.y = y;
          T.setAimYawDbg(y);
          window.__ag250.auditFrame('${w}-turn-' + y.toFixed(2));
        })(${yaw})`);
        await wait(100);
        if (s === 0 || s === 3 || s === 6 || s === 9) {
          await captureShot(page, `${w}-03-turn-${s * 30}deg.jpg`);
        }
      }

      // ----------------------------------------------------------------------
      // TEST 4: AIM in Training Ground (ADS transition, still, and moving)
      // ----------------------------------------------------------------------
      console.log(`[${w}] 4. Aim test (ADS still and moving)...`);
      // Start ADS
      await page.evaluate(`(() => {
        window.TT.setZoomHeldDbg(true);
        window.__ag250.auditFrame('${w}-aim-start');
      })()`);
      await wait(450); // ADS transition
      await page.evaluate(`window.__ag250.auditFrame('${w}-aim-held')`);
      await captureShot(page, `${w}-04-aim-still.jpg`);

      // Aim moving
      await page.evaluate(`(async () => {
        const h = window.__ag250;
        const pMid = { x: -26, y: ${pSpawn.y}, z: 0 };
        const pMidEnd = { x: -26, y: ${pSpawn.y}, z: 6 };
        await h.moveAlong(pMid, pMidEnd, 2.0, async (frac, step, total) => {
          h.auditFrame('${w}-aim-moving-' + step);
        });
      })()`);
      await captureShot(page, `${w}-05-aim-moving.jpg`);

      // Release ADS
      await page.evaluate(`(() => {
        window.TT.setZoomHeldDbg(false);
        window.__ag250.auditFrame('${w}-aim-release');
      })()`);
      await wait(400);

      // ----------------------------------------------------------------------
      // TEST 5: CAPTURE SHORT FRAME SEQUENCE DURING WALK (Frame-by-frame seq)
      // ----------------------------------------------------------------------
      console.log(`[${w}] 5. Capturing consecutive frame sequence (6 frames) during motion...`);
      for (let f = 0; f < 6; f++) {
        await page.evaluate(`((f) => {
          const T = window.TT;
          T.player.position.z += 0.2;
          T.stepFrame(1 / 60);
          window.__ag250.auditFrame('${w}-seq-frame-' + f);
        })(${f})`);
        await captureShot(page, `${w}-seq-frame-${f}.jpg`);
      }

      runData.history = await page.evaluate(`window.__ag250.history.filter(h => h.weapon === '${w}')`);
      telemetry.runs[w] = runData;
    }

    // ----------------------------------------------------------------------
    // TEST 6: SPECIFIC J6 HYPOTHESIS TESTING
    // ----------------------------------------------------------------------
    console.log('\n========================================================================');
    console.log('=== Testing J6 Specific Hypotheses: Arm Material, Camo, Shadows, LOD ===');
    console.log('========================================================================\n');

    const hypothesisResults = await page.evaluate(`(() => {
      const T = window.TT;
      const vm = T.viewmodelDbg();
      const tg = T.trainingDbg.tg();
      const results = {};

      // Hypothesis 1: Weapon Switch Arm Texture Swap
      // Does switching from launcher to m4 to pistol change the uniform material or map?
      const matKeys = {};
      for (const w of ['launcher', 'm4', 'pistol', 'aa12', 'shotgun']) {
        const idx = T.WEAPON_ORDER.indexOf(w);
        T.setWeapon(idx);
        for (let i = 0; i < 30; i++) T.stepFrame(1 / 60);
        const fore = vm.arms?.r?.meshes?.fore;
        matKeys[w] = {
          matUuid: fore?.material?.uuid,
          matVersion: fore?.material?.version,
          mapUuid: fore?.material?.map?.uuid,
          matName: fore?.material?.name
        };
      }
      results.weaponSwitchMats = matKeys;

      // Hypothesis 2: Training Ground Light Switch (Lights On vs Off)
      // Does turning off the room lights pop the arm texture?
      T.setWeapon(T.WEAPON_ORDER.indexOf('launcher'));
      for (let i = 0; i < 15; i++) T.stepFrame(1 / 60);
      const fore = vm.arms?.r?.meshes?.fore;
      const matLightsOn = { uuid: fore?.material?.uuid, recSh: fore?.receiveShadow };
      T.trainingDbg.toggleLights(); // toggle lights off
      for (let i = 0; i < 15; i++) T.stepFrame(1 / 60);
      const matLightsOff = { uuid: fore?.material?.uuid, recSh: fore?.receiveShadow, night: T.nightWarningsDbg?.state()?.night };
      T.trainingDbg.toggleLights(); // toggle back on
      for (let i = 0; i < 15; i++) T.stepFrame(1 / 60);
      results.lightToggle = { lightsOn: matLightsOn, lightsOff: matLightsOff };

      // Hypothesis 3: Camo UV Density / Mipmap pop
      // Check UV coordinates on vm-forearm, vm-cuff, vm-upper-sleeve
      const uvAudit = {};
      if (vm.arms?.r?.meshes) {
        for (const [k, m] of Object.entries(vm.arms.r.meshes)) {
          if (!m.geometry?.attributes?.uv) continue;
          const uvs = m.geometry.attributes.uv.array;
          let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
          for (let i = 0; i < uvs.length; i += 2) {
            minU = Math.min(minU, uvs[i]); maxU = Math.max(maxU, uvs[i]);
            minV = Math.min(minV, uvs[i + 1]); maxV = Math.max(maxV, uvs[i + 1]);
          }
          uvAudit[k] = { minU, maxU, minV, maxV, uSpan: maxU - minU, vSpan: maxV - minV };
        }
      }
      results.uvAudit = uvAudit;

      // Hypothesis 4: Shadow Receiving on Arms
      // Check if sun shadow cascade or light pool shadows hit the arms
      const shadowAudit = {
        rForeRecShadow: vm.arms?.r?.meshes?.fore?.receiveShadow,
        rForeCastShadow: vm.arms?.r?.meshes?.fore?.castShadow,
        rUpperRecShadow: vm.arms?.r?.meshes?.upper?.receiveShadow,
        rGloveRecShadow: vm.arms?.r?.meshes?.glove?.receiveShadow,
        directionalLightShadow: T.scene.children.find(c => c.isDirectionalLight)?.castShadow,
        shadowPruneStats: T.shadowPruneDbg ? T.shadowPruneDbg() : null
      };
      results.shadowAudit = shadowAudit;

      // Hypothesis 5: 3P Body Clipping
      // When walking/running, check distance between camera and 3P marine head/shoulders
      const pCam = T.camera.position;
      const pMarine = T.player.position;
      results.cameraMarineRel = {
        camY: pCam.y,
        marineY: pMarine.y,
        diffY: pCam.y - pMarine.y,
        diffZ: pCam.z - pMarine.z
      };

      return results;
    })()`);

    telemetry.hypotheses = hypothesisResults;
    fs.writeFileSync(path.join(OUT_DIR, 'telemetry.json'), JSON.stringify(telemetry, null, 2));
    console.log('[AG-250] Comprehensive telemetry saved to qa/2026-11-07-AG-250/telemetry.json');

  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch(err => {
  console.error('[AG-250] Error:', err);
  process.exit(1);
});
