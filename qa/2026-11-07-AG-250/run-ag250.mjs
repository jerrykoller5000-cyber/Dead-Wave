// qa/2026-11-07-AG-250/run-ag250.mjs
// Task AG-250: Find J6: the arms' texture popping in and out in the Training Ground (D-118)
// Real WebGPU hardware evaluation on RTX 5080 in Training Ground
// Tests three guns: launcher, m4, pistol
// Actions: walk, run, turn, aim
// Audits: materials, camo map, LOD/cull switches, shadows, 3P body sleeve vs 1P viewmodel arms

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
  console.log('=== [AG-250] Find J6: Arms Texture Pop in Training Ground            ===');
  console.log('=== Real WebGPU Hardware (RTX 5080)                                  ===');
  console.log('========================================================================\n');

  const server = await serve(ROOT, 0);
  const url = `${server.origin}/index.html?solid=1&debug=1&raf=timer`;
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

    const libCode = fs.readFileSync(path.join(ROOT, 'tools/tests/lib.js'), 'utf8');
    await page.evaluate(libCode);

    // Enter Training Ground as JERRY
    console.log('[AG-250] Entering Training Ground as JERRY...');
    await page.evaluate(`(() => {
      const nameEl = document.getElementById('playerName');
      if (nameEl) nameEl.value = 'JERRY';
      const btn = document.getElementById('modeTraining');
      if (btn) btn.click();
    })()`);

    if (!(await page.waitFor('window.TT && window.TT.trainingDbg && window.TT.trainingDbg.state().active', { timeout: 30000 }))) {
      throw new Error('Training Ground failed to become active');
    }
    await wait(2000);
    console.log('[AG-250] Training Ground active.');

    // Setup probes inside page
    await page.evaluate(`(() => {
      const T = window.TT;
      T.setHp(100000);
      T.grantAllWeapons();
      if (T.isUnarmed()) T.toggleHolster();
      T.setViewFirstDbg(true);

      window.__ag250 = {
        logs: [],
        key(type, code) {
          document.dispatchEvent(new KeyboardEvent(type, { code, key: code, bubbles: true }));
        },
        sampleState(tag = '') {
          const vm = T.viewmodelDbg();
          const arms = vm && vm.arms;
          const rFore = arms && arms.r && arms.r.meshes && arms.r.meshes.fore;
          const rMat = rFore && rFore.material;
          const rMap = rMat && rMat.map;

          const lFore = arms && arms.l && arms.l.meshes && arms.l.meshes.fore;
          const lMat = lFore && lFore.material;

          const bodyArms = [];
          T.player.traverse(o => {
            if (o.isMesh && (o.name === 'live-sleeve' || o.name === 'live-bare-arm' || o.name.includes('sleeve') || o.name.includes('arm'))) {
              bodyArms.push({
                name: o.name,
                visible: o.visible,
                vmEyeHide: !!o.userData?.vmEyeHide,
                receiveShadow: o.receiveShadow,
                castShadow: o.castShadow,
                matUuid: o.material?.uuid,
                matVersion: o.material?.version,
                mapUuid: o.material?.map?.uuid,
                matName: o.material?.name
              });
            }
          });

          const snap = {
            tag,
            time: performance.now(),
            weapon: T.vmStateDbg().weapon || (vm ? vm.info.key : null),
            unarmed: T.isUnarmed(),
            firstPerson: T.fpDbg().first,
            ads: T.fpDbg().ads,
            pos: { x: T.player.position.x, y: T.player.position.y, z: T.player.position.z },
            yaw: T.player.rotation.y,
            vmActive: vm ? vm.info.active : false,
            vmKey: vm ? vm.info.key : null,
            vmRaise: vm ? vm.info.raise : 0,
            rFore: rFore ? {
              visible: rFore.visible,
              parentVisible: rFore.parent?.visible,
              receiveShadow: rFore.receiveShadow,
              castShadow: rFore.castShadow,
              matUuid: rMat?.uuid,
              matVersion: rMat?.version,
              mapUuid: rMap?.uuid,
              matName: rMat?.name,
              color: rMat?.color ? rMat.color.getHexString() : null,
              roughness: rMat?.roughness,
              metalness: rMat?.metalness,
            } : null,
            lFore: lFore ? {
              visible: lFore.visible,
              parentVisible: lFore.parent?.visible,
              receiveShadow: lFore.receiveShadow,
              castShadow: lFore.castShadow,
              matUuid: lMat?.uuid,
              matVersion: lMat?.version,
            } : null,
            partsVisible: arms ? {
              rSleeve: arms.r.parts.sleeve.visible,
              rRolled: arms.r.parts.rolled.visible,
              rGlove: arms.r.parts.glove.visible,
              rBare: arms.r.parts.bare.visible,
              lSleeve: arms.l.parts.sleeve.visible,
              lRolled: arms.l.parts.rolled.visible,
              lGlove: arms.l.parts.glove.visible,
              lBare: arms.l.parts.bare.visible,
            } : null,
            bodyArms
          };
          this.logs.push(snap);
          return snap;
        }
      };
    })()`);

    console.log('[AG-250] Helper initialized.');

    // We will test 3 guns: 'launcher', 'm4', 'pistol'
    const weapons = ['launcher', 'm4', 'pistol'];
    const telemetry = {
      runs: {},
      popsDetected: []
    };

    for (const w of weapons) {
      console.log(`\n------------------------------------------------------------------------`);
      console.log(`--- Testing weapon: ${w} ---`);
      console.log(`------------------------------------------------------------------------`);

      // Switch to weapon
      await page.evaluate(`((w) => {
        const T = window.TT;
        if (T.isUnarmed()) T.toggleHolster();
        const idx = T.WEAPON_ORDER.indexOf(w);
        T.setWeapon(idx);
      })('${w}')`);
      await wait(500);

      const runData = {
        weapon: w,
        initialState: await page.evaluate(`window.__ag250.sampleState('${w}-init')`),
        actions: {}
      };

      // 1. Walk action (Walk forward for 2.5s, sampling every 200ms)
      console.log(`[${w}] 1. Walk test (W key held)...`);
      await page.evaluate(`window.__ag250.key('keydown', 'KeyW')`);
      const walkSnaps = [];
      for (let i = 0; i < 10; i++) {
        await wait(200);
        const s = await page.evaluate(`window.__ag250.sampleState('${w}-walk-${i}')`);
        walkSnaps.push(s);
      }
      await captureShot(page, `${w}-01-walk.jpg`);
      await page.evaluate(`window.__ag250.key('keyup', 'KeyW')`);
      await wait(300);
      runData.actions.walk = walkSnaps;

      // 2. Run action (W + Shift held for 2.5s, sampling every 200ms)
      console.log(`[${w}] 2. Run test (W + Shift held)...`);
      await page.evaluate(`(() => {
        window.__ag250.key('keydown', 'KeyW');
        window.__ag250.key('keydown', 'ShiftLeft');
      })()`);
      const runSnaps = [];
      for (let i = 0; i < 10; i++) {
        await wait(200);
        const s = await page.evaluate(`window.__ag250.sampleState('${w}-run-${i}')`);
        runSnaps.push(s);
      }
      await captureShot(page, `${w}-02-run.jpg`);
      await page.evaluate(`(() => {
        window.__ag250.key('keyup', 'ShiftLeft');
        window.__ag250.key('keyup', 'KeyW');
      })()`);
      await wait(300);
      runData.actions.run = runSnaps;

      // 3. Turn action (Turning yaw across 360 degrees)
      console.log(`[${w}] 3. Turn test (rotating 360 deg)...`);
      const turnSnaps = [];
      for (let step = 0; step < 8; step++) {
        const yaw = (step / 8) * Math.PI * 2;
        await page.evaluate(`((y) => {
          const T = window.TT;
          T.player.rotation.y = y;
          T.setAimYawDbg(y);
        })(${yaw})`);
        await wait(150);
        const s = await page.evaluate(`window.__ag250.sampleState('${w}-turn-${step}')`);
        turnSnaps.push(s);
        if (step === 2 || step === 4 || step === 6) {
          await captureShot(page, `${w}-03-turn-step${step}.jpg`);
        }
      }
      runData.actions.turn = turnSnaps;

      // 4. Aim action (ADS transition, hold ADS, moving ADS)
      console.log(`[${w}] 4. Aim test (ADS still and moving)...`);
      // Hold ADS
      await page.evaluate(`(() => {
        const T = window.TT;
        T.setZoomHeldDbg(true);
      })()`);
      await wait(400); // transition
      const sAimStill = await page.evaluate(`window.__ag250.sampleState('${w}-aim-still')`);
      await captureShot(page, `${w}-04-aim-still.jpg`);

      // Aim moving
      await page.evaluate(`window.__ag250.key('keydown', 'KeyW')`);
      await wait(600);
      const sAimMoving = await page.evaluate(`window.__ag250.sampleState('${w}-aim-moving')`);
      await captureShot(page, `${w}-05-aim-moving.jpg`);
      await page.evaluate(`(() => {
        window.__ag250.key('keyup', 'KeyW');
        window.TT.setZoomHeldDbg(false);
      })()`);
      await wait(300);
      runData.actions.aim = { still: sAimStill, moving: sAimMoving };

      telemetry.runs[w] = runData;
    }

    // Now let's do a specialized deep probe on arm textures & shadows in TG
    console.log('\n[AG-250] Conducting deep audit of arm textures, lights, shadows, and body meshes in Training Ground...');
    const deepAudit = await page.evaluate(`(() => {
      const T = window.TT;
      const tg = T.trainingDbg.tg();
      const vm = T.viewmodelDbg();
      const arms = vm && vm.arms;

      // Check lights in Training Ground
      const lights = [];
      T.scene.traverse(o => {
        if (o.isLight) {
          lights.push({
            type: o.type,
            name: o.name,
            color: o.color ? o.color.getHexString() : null,
            intensity: o.intensity,
            castShadow: o.castShadow,
            pos: { x: o.position.x, y: o.position.y, z: o.position.z },
            parentName: o.parent?.name
          });
        }
      });

      // Check all meshes related to arms
      const armMeshes = [];
      if (arms) {
        for (const side of ['r', 'l']) {
          const a = arms[side];
          for (const k in a.meshes) {
            const m = a.meshes[k];
            armMeshes.push({
              side,
              part: k,
              name: m.name,
              visible: m.visible,
              parentName: m.parent?.name,
              parentVisible: m.parent?.visible,
              receiveShadow: m.receiveShadow,
              castShadow: m.castShadow,
              frustumCulled: m.frustumCulled,
              matName: m.material?.name,
              matUuid: m.material?.uuid,
              matType: m.material?.type,
              map: m.material?.map ? {
                uuid: m.material.map.uuid,
                name: m.material.map.name,
                image: m.material.map.image ? {
                  width: m.material.map.image.width,
                  height: m.material.map.image.height
                } : null,
                repeat: [m.material.map.repeat.x, m.material.map.repeat.y]
              } : null
            });
          }
        }
      }

      // Check 3P player body meshes and visibility in 1P
      const bodyArmMeshes = [];
      T.player.traverse(o => {
        if (o.isMesh && (o.name.includes('sleeve') || o.name.includes('arm') || o.name.includes('hand') || o.name.includes('glove'))) {
          bodyArmMeshes.push({
            name: o.name,
            visible: o.visible,
            parentName: o.parent?.name,
            vmEyeHide: o.userData?.vmEyeHide,
            receiveShadow: o.receiveShadow,
            castShadow: o.castShadow,
            matName: o.material?.name,
            matUuid: o.material?.uuid,
            map: o.material?.map ? o.material.map.uuid : null
          });
        }
      });

      return {
        lights,
        armMeshes,
        bodyArmMeshes,
        wallCull: !!window.wallCull,
        sceneCullStats: T.cullStats || null
      };
    })()`);

    telemetry.deepAudit = deepAudit;

    fs.writeFileSync(path.join(OUT_DIR, 'telemetry.json'), JSON.stringify(telemetry, null, 2));
    console.log('[AG-250] Saved telemetry to qa/2026-11-07-AG-250/telemetry.json');

  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch(err => {
  console.error('[AG-250] Error:', err);
  process.exit(1);
});
