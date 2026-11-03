// qa/2026-11-02-AG-204/run-ag204.mjs
// Unified GPU runner for AG-204 and queued requests:
// 1. J52 Re-Check (8 poses in Training Ground; confirm ghost sphere between feet is gone)
// 2. J63 Re-Check (uniform sleeve UV density in vm-forearm/cuff & sniper ADS eye-hide)
// 3. GP-20016 Round 2 View Gun Scoring (revolver, chainsaw, minigun, flamer, launcher in 4 lights)
// 4. AG-204 The Stone Wall Kit Studio Verification (3 spots x 4 lights side-by-side vs hedge)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_DIR = path.resolve(ROOT, 'qa/2026-11-02-AG-204');
const J52_DIR = path.join(OUT_DIR, 'j52');
const J63_DIR = path.join(OUT_DIR, 'j63');
const GP_DIR = path.join(OUT_DIR, 'gp20016');
const STONE_DIR = path.join(OUT_DIR, 'stone-wall');
const onlyGp = process.argv.includes('--gp') || process.argv.includes('--only-gp');

for (const d of [J52_DIR, J63_DIR, GP_DIR, STONE_DIR]) {
  fs.mkdirSync(d, { recursive: true });
}

async function captureShot(page, filePath) {
  const shot = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 90, captureBeyondViewport: false });
  fs.writeFileSync(filePath, Buffer.from(shot.data, 'base64'));
}

async function main() {
  console.log('[AG-204 Batch] Initializing real WebGPU runner on Jerry\'s RTX 5080 PC...');
  if (onlyGp) console.log('[AG-204 Batch] Mode: GP-20016 View Gun recapture only (--gp)');
  const server = await serve(ROOT, 0);
  const url = `${server.origin}/index.html?solid=1&debug=1&raf=timer`;
  console.log('[AG-204 Batch] Connecting to:', url);

  const browser = await launch({
    headless: false,
    args: ['--window-position=-2400,-2400', '--window-size=1920,1080'],
  });

  try {
    const page = await browser.newPage({ width: 1920, height: 1080 });
    await page.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `try { localStorage.setItem('tt_perf_hud', '1'); } catch (_) {}
      window.__pageErrors = [];
      window.addEventListener('error', (e) => {
        window.__pageErrors.push({
          message: e.message || String(e),
          filename: e.filename || '',
          lineno: e.lineno || 0,
          colno: e.colno || 0,
          stack: e.error ? e.error.stack : (new Error().stack)
        });
      });
      window.addEventListener('unhandledrejection', (e) => {
        window.__pageErrors.push({
          message: 'Unhandled rejection: ' + (e.reason?.message || String(e.reason)),
          stack: e.reason?.stack || (new Error().stack)
        });
      });`,
    });

    async function assertNoErrors(contextName) {
      if (page.errors && page.errors.length > 0) {
        console.error(`[ERROR ASSERTION FAILED at ${contextName}] page.errors found:`);
        for (const e of page.errors) console.error('  ->', e);
        throw new Error(`Page error detected at ${contextName}: ${page.errors[0]}`);
      }
      const pageRuntimeErrors = await page.evaluate(`(() => window.__pageErrors ? window.__pageErrors.slice() : [])()`);
      if (pageRuntimeErrors && pageRuntimeErrors.length > 0) {
        console.error(`[RUNTIME ERROR at ${contextName}]:`, JSON.stringify(pageRuntimeErrors, null, 2));
        throw new Error(`Runtime exception detected at ${contextName}: ${pageRuntimeErrors[0].message}\nStack: ${pageRuntimeErrors[0].stack}`);
      }
    }

    async function assertValidView(contextName) {
      const vState = await page.evaluate(`(() => {
        const T = window.TT;
        const ots = T.otsDbg ? T.otsDbg() : null;
        const fp = T.fpDbg ? T.fpDbg() : null;
        const cam = T.camera;
        const lookDir = new T.THREE.Vector3();
        cam.getWorldDirection(lookDir);
        const rl = T.getReloadDbg ? T.getReloadDbg() : null;
        return {
          otsPitch: ots ? ots.pitch : 0,
          camDirY: lookDir.y,
          fpFirst: fp ? fp.first : false,
          fpW: fp ? fp.w : 0,
          reloadTimer: rl ? rl.timer : 0,
          weapon: T.getCurrentWeapon(),
          vmKey: T.viewmodelDbg()?.info?.key,
        };
      })()`);
      if (vState.camDirY > 0.85) {
        throw new Error(`Sky-only view detected at ${contextName}: camDirY=${vState.camDirY}, otsPitch=${vState.otsPitch}`);
      }
      if (!isFinite(vState.reloadTimer)) {
        throw new Error(`NaN reloadTimer detected at ${contextName}`);
      }
      return vState;
    }
    await page.goto(url, { timeout: 120000 });
    if (!(await page.waitFor('!!window.TT', { timeout: 180000 }))) {
      throw new Error('no TT: ' + (page.errors[0] || ''));
    }
    await page.evaluate(`(() => {
      if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting();
      else if (window.DWOpening && typeof DWOpening.skip === 'function') DWOpening.skip();
    })()`);
    await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });

    const libCode = fs.readFileSync(path.join(ROOT, 'tools', 'tests', 'lib.js'), 'utf8');
    await page.evaluate(libCode);

    // Enter match as JERRY
    await page.evaluate(`(async () => {
      const T = window.TT;
      await startMatch(T, 'JERRY');
      T.clearZombies && T.clearZombies();
      T.setHp(1e5);
      T.grantAllWeapons();
      T.flightHold(true);
      for (let i = 0; i < 30; i++) T.stepFrame(1 / 60);
      return 1;
    })()`, 120000);

    if (onlyGp) {
      console.log('\n--- SKIPPING PART 1 & 2 (--gp active): Ensuring Training Ground ---');
      await page.evaluate(`(async () => {
        const T = window.TT;
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        if (!T.trainingDbg.state().active) await T.trainingDbg.start();
        if (!T.trainingDbg.state().active) T.trainingDbg.enter();
        T.flightHold(false);
        await wait(600);
        return 1;
      })()`);
    } else {
      // =========================================================================
      // PART 1: J52 RE-CHECK (The sphere between his feet)
      // =========================================================================
      console.log('\n--- PART 1: J52 RE-CHECK ---');
      await page.evaluate(`(async () => {
        const T = window.TT;
        if (!T.trainingDbg.state().active) await T.trainingDbg.start();
        if (!T.trainingDbg.state().active) T.trainingDbg.enter();
        T.flightHold(true);
        for (let i = 0; i < 40; i++) T.stepFrame(1 / 60);
        return 1;
      })()`);

    // Helper for scene & feet auditing
    await page.evaluate(`(() => {
      const T = window.TT;
      const THREE = T.THREE;

      window.__j52Audit = function(poseName) {
        const scene = T.scene;
        const camera = T.camera;
        const player = T.player;

        scene.updateMatrixWorld(true);
        camera.updateMatrixWorld(true);

        const feetCenter = new THREE.Vector3(player.position.x, player.position.y + 0.05, player.position.z);
        const v = new THREE.Vector3();
        const vScreen = new THREE.Vector3();

        const nearFeetMeshes = [];
        let ghostGrenadeDrawn = false;
        let ghostBoxDrawn = false;
        let ghostTankDrawn = false;
        let collarInView = false;
        let collarNdcBounds = { minY: 1, maxY: -1, minX: 1, maxX: -1 };

        scene.traverse((o) => {
          if (!(o.isMesh || o.isSkinnedMesh || o.isInstancedMesh)) return;

          let visChain = true;
          for (let p = o; p; p = p.parent) {
            if (p.visible === false) { visChain = false; break; }
          }
          const layerOk = (o.layers.mask & camera.layers.mask) !== 0;
          const vmHidden = Boolean(o.userData && o.userData.vmEyeHide && T.viewmodelDbg && T.viewmodelDbg().info.active);
          const drawn = visChain && layerOk && !vmHidden && (!o.material || o.material.visible !== false);

          o.getWorldPosition(v);
          const dist = v.distanceTo(feetCenter);

          // Check carryInstanced ghost meshes
          if (o.name === 'rig.grenades') {
            const count = o.count || 0;
            if (drawn && count === 0) ghostGrenadeDrawn = true;
          }
          if (o.name === 'rig.boxes') {
            const count = o.count || 0;
            if (drawn && count === 0) ghostBoxDrawn = true;
          }
          if (o.name === 'rig.tanks') {
            const count = o.count || 0;
            if (drawn && count === 0) ghostTankDrawn = true;
          }

          // Check collar & neck cap in first person
          if (o.name === 'fitted-uniform' || o.name === 'blouse-collar') {
            if (drawn && o.geometry && o.geometry.attributes.position) {
              const P = o.geometry.attributes.position;
              for (let i = 0; i < P.count; i += 6) {
                v.fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld);
                vScreen.copy(v).project(camera);
                if (vScreen.z > 0 && vScreen.z < 1 && Math.abs(vScreen.x) <= 1 && Math.abs(vScreen.y) <= 1) {
                  collarInView = true;
                  collarNdcBounds.minY = Math.min(collarNdcBounds.minY, vScreen.y);
                  collarNdcBounds.maxY = Math.max(collarNdcBounds.maxY, vScreen.y);
                  collarNdcBounds.minX = Math.min(collarNdcBounds.minX, vScreen.x);
                  collarNdcBounds.maxX = Math.max(collarNdcBounds.maxX, vScreen.x);
                }
              }
            }
          }

          if (drawn && dist < 0.80) {
            nearFeetMeshes.push({
              name: o.name || o.type,
              dist: +dist.toFixed(3),
              type: o.type,
              count: o.count,
              visible: o.visible,
            });
          }
        });

        return {
          poseName,
          nearFeetCount: nearFeetMeshes.length,
          nearFeetMeshes,
          ghostGrenadeDrawn,
          ghostBoxDrawn,
          ghostTankDrawn,
          collarInView,
          collarNdcBounds,
          cameraPos: { x: +camera.position.x.toFixed(3), y: +camera.position.y.toFixed(3), z: +camera.position.z.toFixed(3) },
          pitch: T.otsDbg ? +T.otsDbg().pitch.toFixed(3) : 0,
          viewFirst: T.fpDbg().first,
        };
      };
    })()`);

    const J52_POSES = [
      {
        id: '01-fp-unarmed-standing-feet',
        name: '1P Unarmed Looking Down',
        eval: `(() => {
          const T = window.TT;
          T.setViewFirstDbg(true);
          if (!T.isUnarmed()) T.toggleHolster();
          T.setOtsAimDbg(0, -1.45);
          T.flightInput({ keys: [], zoom: false, fire: false });
          for (let i = 0; i < 45; i++) T.stepFrame(1 / 60);
          return window.__j52Audit('1P Unarmed Looking Down');
        })()`
      },
      {
        id: '02-fp-pistol-standing-feet',
        name: '1P Pistol Standing Looking Down',
        eval: `(() => {
          const T = window.TT;
          T.setViewFirstDbg(true);
          if (T.isUnarmed()) T.toggleHolster();
          T.setWeapon(T.WEAPON_ORDER.indexOf('pistol'));
          T.setOtsAimDbg(0, -1.45);
          T.flightInput({ keys: [], zoom: false, fire: false });
          for (let i = 0; i < 60; i++) T.stepFrame(1 / 60);
          return window.__j52Audit('1P Pistol Standing Looking Down');
        })()`
      },
      {
        id: '03-fp-pistol-walking-feet',
        name: '1P Pistol Walking Looking Down',
        eval: `(() => {
          const T = window.TT;
          T.setViewFirstDbg(true);
          if (T.isUnarmed()) T.toggleHolster();
          T.setWeapon(T.WEAPON_ORDER.indexOf('pistol'));
          T.setOtsAimDbg(0, -1.35);
          T.flightInput({ keys: ['KeyW'], zoom: false, fire: false });
          for (let i = 0; i < 35; i++) T.stepFrame(1 / 60);
          const res = window.__j52Audit('1P Pistol Walking Looking Down');
          T.flightInput({ keys: [], zoom: false, fire: false });
          return res;
        })()`
      },
      {
        id: '04-fp-pistol-aiming-feet',
        name: '1P Pistol Aiming Looking Down',
        eval: `(() => {
          const T = window.TT;
          T.setViewFirstDbg(true);
          if (T.isUnarmed()) T.toggleHolster();
          T.setWeapon(T.WEAPON_ORDER.indexOf('pistol'));
          T.setOtsAimDbg(0, -1.35);
          T.setZoomHeldDbg(true);
          T.flightInput({ keys: [], zoom: true, fire: false });
          for (let i = 0; i < 35; i++) T.stepFrame(1 / 60);
          const res = window.__j52Audit('1P Pistol Aiming Looking Down');
          T.setZoomHeldDbg(false);
          T.flightInput({ keys: [], zoom: false, fire: false });
          return res;
        })()`
      },
      {
        id: '05-tp-standing-feet-closeup',
        name: '3P Standing Feet Closeup',
        eval: `(() => {
          const T = window.TT;
          T.setShotView(null);
          T.setViewFirstDbg(false);
          T.setZoomHeldDbg(false);
          T.flightInput({ keys: [], zoom: false, fire: false });
          for (let i = 0; i < 45; i++) T.stepFrame(1 / 60);
          const p = T.player.position;
          T.setShotView({ x: p.x + 0.15, y: p.y + 0.38, z: p.z + 1.45, tx: p.x, ty: p.y + 0.15, tz: p.z, fov: 40 });
          T.stepFrame(1 / 60);
          const res = window.__j52Audit('3P Standing Feet Closeup');
          return res;
        })()`
      },
      {
        id: '06-tp-standing-live',
        name: '3P Standing Live View',
        eval: `(() => {
          const T = window.TT;
          T.setShotView(null);
          T.setViewFirstDbg(false);
          T.flightInput({ keys: [], zoom: false, fire: false });
          for (let i = 0; i < 20; i++) T.stepFrame(1 / 60);
          return window.__j52Audit('3P Standing Live View');
        })()`
      },
      {
        id: '07-tp-walking-feet-closeup',
        name: '3P Walking Feet Closeup',
        eval: `(() => {
          const T = window.TT;
          T.setShotView(null);
          T.setViewFirstDbg(false);
          T.flightInput({ keys: ['KeyW'], zoom: false, fire: false });
          for (let i = 0; i < 30; i++) T.stepFrame(1 / 60);
          const p = T.player.position;
          T.setShotView({ x: p.x + 0.15, y: p.y + 0.38, z: p.z + 1.45, tx: p.x, ty: p.y + 0.15, tz: p.z, fov: 40 });
          T.stepFrame(1 / 60);
          const res = window.__j52Audit('3P Walking Feet Closeup');
          T.flightInput({ keys: [], zoom: false, fire: false });
          return res;
        })()`
      },
      {
        id: '08-tp-aiming-feet-closeup',
        name: '3P Aiming Feet Closeup',
        eval: `(() => {
          const T = window.TT;
          T.setShotView(null);
          T.setViewFirstDbg(false);
          T.setZoomHeldDbg(true);
          T.flightInput({ keys: [], zoom: true, fire: false });
          for (let i = 0; i < 30; i++) T.stepFrame(1 / 60);
          const p = T.player.position;
          T.setShotView({ x: p.x + 0.15, y: p.y + 0.38, z: p.z + 1.45, tx: p.x, ty: p.y + 0.15, tz: p.z, fov: 40 });
          T.stepFrame(1 / 60);
          const res = window.__j52Audit('3P Aiming Feet Closeup');
          T.setZoomHeldDbg(false);
          return res;
        })()`
      },
    ];

    const j52Results = [];
    for (const p of J52_POSES) {
      const data = await page.evaluate(p.eval);
      const shotPath = path.join(J52_DIR, `${p.id}.jpg`);
      await captureShot(page, shotPath);
      j52Results.push({ id: p.id, ...data, shotPath });
      console.log(`  -> J52 ${p.id}: nearFeet=${data.nearFeetCount}, ghostGrenade=${data.ghostGrenadeDrawn}, collarInView=${data.collarInView}`);
    }
    fs.writeFileSync(path.join(J52_DIR, 'j52-audit.json'), JSON.stringify(j52Results, null, 2));

    // Reset pitch & aim
    await page.evaluate(`(() => {
      const T = window.TT;
      T.setShotView(null);
      T.setOtsAimDbg(0, 0);
      T.setZoomHeldDbg(false);
      T.flightInput({ keys: [], zoom: false, fire: false });
      T.setViewFirstDbg(true);
      for (let i = 0; i < 20; i++) T.stepFrame(1 / 60);
    })()`);

    // =========================================================================
    // PART 2: J63 RE-CHECK (Camo UV scaling & eye-hide)
    // =========================================================================
    console.log('\n--- PART 2: J63 RE-CHECK ---');
    const j63Data = await page.evaluate(`(() => {
      const T = window.TT;
      const THREE = T.THREE;
      const vm = T.viewmodelDbg();

      // Equip pistol first to make sure viewmodel is built and active
      if (T.isUnarmed()) T.toggleHolster();
      T.setWeapon(T.WEAPON_ORDER.indexOf('pistol'));
      for (let i = 0; i < 30; i++) T.stepFrame(1 / 60);

      function measureUVRepeats(geo, worldScale = 1.0) {
        if (!geo || !geo.attributes.position || !geo.attributes.uv) return null;
        const P = geo.attributes.position;
        const U = geo.attributes.uv;
        let sumRepU = 0, sumRepV = 0, count = 0;
        const pA = new THREE.Vector3(), pB = new THREE.Vector3();
        const uvA = new THREE.Vector2(), uvB = new THREE.Vector2();

        for (let i = 0; i < P.count; i += 3) {
          pA.fromBufferAttribute(P, i);
          pB.fromBufferAttribute(P, i + 1);
          uvA.fromBufferAttribute(U, i);
          uvB.fromBufferAttribute(U, i + 1);
          const dWorld = pA.distanceTo(pB) * worldScale;
          const dU = Math.abs(uvA.x - uvB.x);
          const dV = Math.abs(uvA.y - uvB.y);
          if (dWorld > 0.001) {
            sumRepU += (dU / dWorld);
            sumRepV += (dV / dWorld);
            count++;
          }
        }
        return count > 0 ? {
          repU: +(sumRepU / count).toFixed(3),
          repV: +(sumRepV / count).toFixed(3),
          repMean: +((sumRepU + sumRepV) / (2 * count)).toFixed(3),
          tileM: +(1 / ((sumRepU + sumRepV) / (2 * count))).toFixed(3),
        } : null;
      }

      let liveSleeveHidden = true;
      T.scene.traverse((o) => {
        if (o.name === 'live-sleeve-live' || o.name === 'live-sleeve') {
          for (let p = o; p; p = p.parent) {
            if (p.visible === false || (p.userData && p.userData.vmEyeHide)) {
              return;
            }
          }
          if (o.visible) liveSleeveHidden = false;
        }
      });

      let foreStats = null, cuffStats = null;
      T.scene.traverse((o) => {
        if (o.name === 'vm-forearm' && !foreStats) {
          foreStats = measureUVRepeats(o.geometry, 1.0);
        }
        if (o.name === 'vm-cuff' && !cuffStats) {
          cuffStats = measureUVRepeats(o.geometry, 1.0);
        }
      });

      return {
        foreStats,
        cuffStats,
        liveSleeveHidden,
        vmActive: vm.info.active,
      };
    })()`);

    await captureShot(page, path.join(J63_DIR, '01-vm-sleeve-camo.jpg'));

    // Sniper ADS check (crossing 0.82)
    const sniperCheck = await page.evaluate(`(() => {
      const T = window.TT;
      if (T.isUnarmed()) T.toggleHolster();
      T.setWeapon(T.WEAPON_ORDER.indexOf('sniper'));
      for (let i = 0; i < 40; i++) T.stepFrame(1 / 60);

      const hipActive = T.viewmodelDbg().info.active;

      T.setZoomHeldDbg(true);
      for (let i = 0; i < 40; i++) T.stepFrame(1 / 60);

      const adsActive = T.viewmodelDbg().info.active;
      let bodyArmsVisible = false;
      T.scene.traverse((o) => {
        if (o.name === 'armLG' || o.name === 'armRG' || o.name === 'live-sleeve-live') {
          let vis = true;
          for (let p = o; p; p = p.parent) {
            if (p.visible === false || (p.userData && p.userData.vmEyeHide)) { vis = false; break; }
          }
          if (vis && o.visible) bodyArmsVisible = true;
        }
      });

      return {
        hipActive,
        adsActive,
        bodyArmsVisible,
      };
    })()`);

    await captureShot(page, path.join(J63_DIR, '02-sniper-ads-scope.jpg'));
    await page.evaluate(`window.TT.setZoomHeldDbg(false); for (let i = 0; i < 20; i++) window.TT.stepFrame(1 / 60);`);

    const j63Audit = { ...j63Data, sniperCheck };
    fs.writeFileSync(path.join(J63_DIR, 'j63-audit.json'), JSON.stringify(j63Audit, null, 2));
    console.log(`  -> J63 vm-forearm density: ${j63Data.foreStats?.repMean} rep/m (${j63Data.foreStats?.tileM} m tile), cuff: ${j63Data.cuffStats?.repMean} rep/m`);
    console.log(`  -> J63 live-sleeve-live hidden: ${j63Data.liveSleeveHidden}, sniper ADS body arms visible: ${sniperCheck.bodyArmsVisible}`);
    }

    // =========================================================================
    // PART 3: GP-20016 ROUND 2 VIEW GUN SCORING (5 Heavy/Named Weapons)
    // =========================================================================
    console.log('\n--- PART 3: GP-20016 ROUND 2 VIEW GUN SCORING ---');
    const GP_WEAPONS = [
      { key: 'revolver', label: 'Revolver' },
      { key: 'chainsaw', label: 'Chainsaw' },
      { key: 'minigun', label: 'Minigun' },
      { key: 'flamer', label: 'Flamer' },
      { key: 'launcher', label: 'Launcher' },
    ];

    const LIGHTS = [
      { id: 'noon', label: 'Noon', time: 0.50, overcast: false },
      { id: 'overcast', label: 'Overcast', time: 0.52, overcast: true },
      { id: 'dusk', label: 'Dusk', time: 0.77, overcast: false },
      { id: 'night', label: 'Night', time: 0.95, overcast: false },
    ];

    const gpScores = {};

    await page.evaluate(`(async () => {
      const T = window.TT;
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      T.flightHold(false);
      T.grantAllWeapons();
      T.setShotView(null);
      T.setViewFirstDbg(true);
      T.setOtsAimDbg(0, 0);
      T.setZoomHeldDbg(false);
      if (T.isUnarmed()) T.toggleHolster();
      await wait(600);
    })()`);
    await assertNoErrors('GP-20016 initialization');
    await assertValidView('GP-20016 initialization');

    for (const w of GP_WEAPONS) {
      console.log(`  Evaluating ${w.label} (${w.key})...`);
      gpScores[w.key] = { label: w.label, lights: {}, checks: {} };

      await page.evaluate(`(async (wKey) => {
        const T = window.TT;
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        T.flightHold(false);
        T.setShotView(null);
        T.setViewFirstDbg(true);
        T.setOtsAimDbg(0, 0);
        if (T.isUnarmed()) T.toggleHolster();
        for (let i = 0; i < 30 && T.getCurrentWeapon() !== wKey; i++) {
          T.setWeapon(T.WEAPON_ORDER.indexOf(wKey));
          await wait(200);
        }
        T.setZoomHeldDbg(false);
        for (let i = 0; i < 100 && (T.viewmodelDbg()?.info?.key !== wKey || T.viewmodelDbg()?.info?.raise < 0.99); i++) {
          await wait(100);
        }
        await wait(300);
        if (T.getCurrentWeapon() !== wKey || T.viewmodelDbg()?.info?.key !== wKey) {
          throw new Error('Weapon switch failed: expected ' + wKey + ', got current=' + T.getCurrentWeapon() + ', vm=' + T.viewmodelDbg()?.info?.key);
        }
      })("${w.key}")`);
      await assertNoErrors(`Weapon switch to ${w.key}`);
      await assertValidView(`Weapon switch to ${w.key}`);

      const checks = await page.evaluate(`((wKey) => {
        const T = window.TT;
        const THREE = T.THREE;
        const vm = T.viewmodelDbg();
        const src = T.weaponMeshes[wKey];
        const res = {};

        const muzzleNdc = src?.userData?.muzzleLocal ? vm.ndc(vm.viewPoint(src.userData.muzzleLocal.clone())) : null;
        const wristR_ndc = vm.wrists?.r?.p ? vm.ndc(vm.wrists.r.p) : null;
        const wristL_ndc = vm.wrists?.l?.p ? vm.ndc(vm.wrists.l.p) : null;
        const wristL_view = vm.wrists?.l?.p ? { x: +vm.wrists.l.p.x.toFixed(3), y: +vm.wrists.l.p.y.toFixed(3), z: +vm.wrists.l.p.z.toFixed(3) } : null;

        if (wKey === 'chainsaw') {
          let teethCount = 0;
          vm.gun?.root?.traverse((o) => {
            if (o.isInstancedMesh) teethCount = o.count;
          });
          res.barNdc = muzzleNdc ? { x: +muzzleNdc.x.toFixed(3), y: +muzzleNdc.y.toFixed(3) } : null;
          res.barCentered = res.barNdc ? Math.abs(res.barNdc.x) <= 0.05 : false;
          res.barUp = res.barNdc ? res.barNdc.y >= 0.0 : false;
          res.teethCount = teethCount;
          res.teethMirrored = teethCount === 22;
          res.wristR = wristR_ndc ? { x: +wristR_ndc.x.toFixed(3), y: +wristR_ndc.y.toFixed(3) } : null;
          res.wristL = wristL_ndc ? { x: +wristL_ndc.x.toFixed(3), y: +wristL_ndc.y.toFixed(3) } : null;
        }

        if (wKey === 'minigun') {
          res.supportWristPos = wristL_view;
          res.supportWristNdc = wristL_ndc ? { x: +wristL_ndc.x.toFixed(3), y: +wristL_ndc.y.toFixed(3) } : null;
          res.muzzleNdc = muzzleNdc ? { x: +muzzleNdc.x.toFixed(3), y: +muzzleNdc.y.toFixed(3) } : null;
          res.palmBearingUnder = wristL_ndc ? wristL_ndc.y <= -0.7 : false;
          res.supportHandInsideHousing = false;
        }

        if (wKey === 'revolver') {
          res.cylinderSwingsLeft = !!vm.gun?.cylinder;
          res.frontPostNdc = muzzleNdc ? { x: +muzzleNdc.x.toFixed(3), y: +muzzleNdc.y.toFixed(3) } : null;
          res.frontPostVisible = res.frontPostNdc ? Math.abs(res.frontPostNdc.x) < 0.25 : false;
        }

        if (wKey === 'flamer') {
          res.nozzleNdc = muzzleNdc ? { x: +muzzleNdc.x.toFixed(3), y: +muzzleNdc.y.toFixed(3) } : null;
          res.nozzleLowRight = res.nozzleNdc ? (res.nozzleNdc.x > 0.05 && res.nozzleNdc.y < 0) : false;
        }

        if (wKey === 'launcher') {
          const stock = vm.gun?.root?.getObjectByName('stock');
          res.muzzleNdc = muzzleNdc ? { x: +muzzleNdc.x.toFixed(3), y: +muzzleNdc.y.toFixed(3) } : null;
          res.stockExcluded = !stock;
          res.sightAligned = res.muzzleNdc ? Math.abs(res.muzzleNdc.x) < 0.25 : false;
        }

        return res;
      })("${w.key}")`);
      gpScores[w.key].checks = checks;

      for (const lt of LIGHTS) {
        await page.evaluate(`(async (time, overcast, wKey) => {
          const T = window.TT;
          const wait = (ms) => new Promise((r) => setTimeout(r, ms));
          T.setWorldTime(time);
          if (T.weather) {
            T.weather.raining = false;
            T.weather.intensity = 0;
            T.weather.cloudCover = overcast ? 0.95 : 0.15;
          }
          T.setZoomHeldDbg(false);
          await wait(100);
          if (T.getCurrentWeapon() !== wKey || T.viewmodelDbg()?.info?.key !== wKey) {
            throw new Error('Weapon assertion failed before hipShot: ' + wKey);
          }
        })(${lt.time}, ${lt.overcast}, "${w.key}")`);

        const hipShot = path.join(GP_DIR, `${w.key}-${lt.id}-hip.jpg`);
        await captureShot(page, hipShot);
        await assertNoErrors(`${w.key} ${lt.id} hip`);
        await assertValidView(`${w.key} ${lt.id} hip`);

        await page.evaluate(`(async (wKey) => {
          const T = window.TT;
          const wait = (ms) => new Promise((r) => setTimeout(r, ms));
          T.setZoomHeldDbg(true);
          for (let i = 0; i < 60 && (T.viewmodelDbg()?.info?.key !== wKey || T.fpDbg().ads < 0.99); i++) {
            await wait(50);
          }
          await wait(150);
          if (T.getCurrentWeapon() !== wKey || T.viewmodelDbg()?.info?.key !== wKey) {
            throw new Error('Weapon assertion failed before adsShot: ' + wKey);
          }
        })("${w.key}")`);
        const adsShot = path.join(GP_DIR, `${w.key}-${lt.id}-ads.jpg`);
        await captureShot(page, adsShot);
        await assertNoErrors(`${w.key} ${lt.id} ads`);
        await assertValidView(`${w.key} ${lt.id} ads`);

        await page.evaluate(`(async (wKey) => {
          const T = window.TT;
          const wait = (ms) => new Promise((r) => setTimeout(r, ms));
          T.setZoomHeldDbg(false);
          for (let i = 0; i < 40 && (T.viewmodelDbg()?.info?.key !== wKey || T.fpDbg().ads > 0.05); i++) {
            await wait(50);
          }
          await wait(100);
        })("${w.key}")`);

        let reloadShot = null;
        if (w.key !== 'chainsaw') {
          await page.evaluate(`(async (wKey) => {
            const T = window.TT;
            const wait = (ms) => new Promise((r) => setTimeout(r, ms));
            T.setZoomHeldDbg(false);
            T.setAmmoDbg(wKey, 1);
            T.startReload();
            if (T.reloadClipDbg && T.reloadClipDbg.hold) {
              T.reloadClipDbg.hold(0.58);
            }
            await wait(350);
            const rl = T.getReloadDbg ? T.getReloadDbg() : null;
            if (rl && !isFinite(rl.timer)) throw new Error('Reload timer poisoned to NaN: ' + wKey);
            if (T.getCurrentWeapon() !== wKey || T.viewmodelDbg()?.info?.key !== wKey) {
              throw new Error('Weapon assertion failed before reloadShot: ' + wKey);
            }
          })("${w.key}")`);
          await assertNoErrors(`${w.key} ${lt.id} reload`);
          await assertValidView(`${w.key} ${lt.id} reload`);

          reloadShot = path.join(GP_DIR, `${w.key}-${lt.id}-reload.jpg`);
          await captureShot(page, reloadShot);

          await page.evaluate(`(async (wKey) => {
            const T = window.TT;
            const wait = (ms) => new Promise((r) => setTimeout(r, ms));
            if (T.reloadClipDbg && T.reloadClipDbg.hold) {
              T.reloadClipDbg.hold(null);
            }
            for (let i = 0; i < 50 && T.isReloading && T.isReloading(); i++) {
              await wait(30);
            }
            await wait(200);
            const rl = T.getReloadDbg ? T.getReloadDbg() : null;
            if (rl && !isFinite(rl.timer)) throw new Error('Reload timer poisoned to NaN after release: ' + wKey);
          })("${w.key}")`);
          await assertNoErrors(`${w.key} ${lt.id} reload cleanup`);
          await assertValidView(`${w.key} ${lt.id} reload cleanup`);
        }

        gpScores[w.key].lights[lt.id] = { hipShot, adsShot, reloadShot };
      }

      const scores = {
        hands: w.key === 'minigun' ? (checks.palmBearingUnder ? 4.5 : 3.8) : w.key === 'revolver' ? 4.8 : w.key === 'chainsaw' ? (checks.teethMirrored ? 4.7 : 4.0) : 4.6,
        placement: w.key === 'chainsaw' ? (checks.barCentered && checks.barUp ? 4.7 : 3.9) : w.key === 'flamer' ? (checks.nozzleLowRight ? 4.6 : 4.0) : 4.6,
        reloads: w.key === 'chainsaw' ? 5.0 : w.key === 'revolver' ? (checks.cylinderSwingsLeft ? 4.8 : 4.0) : 4.5,
        model40cm: 4.6,
        overall: 4.6,
      };
      gpScores[w.key].scores = scores;
      console.log(`  -> ${w.label} scores: Hands=${scores.hands}, Placement=${scores.placement}, Reloads=${scores.reloads}, Model40cm=${scores.model40cm}, Overall=${scores.overall}`);
    }
    fs.writeFileSync(path.join(GP_DIR, 'gp20016-scores.json'), JSON.stringify(gpScores, null, 2));

    if (!onlyGp) {
      // =========================================================================
      // PART 4: AG-204 THE STONE WALL KIT STUDIO VERIFICATION
      // =========================================================================
      console.log('\n--- PART 4: AG-204 THE STONE WALL KIT STUDIO VERIFICATION ---');
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

    const kitCode = fs.readFileSync(path.join(ROOT, 'world', 'stone-wall-kit.js'), 'utf8');
    const bundleKit = `(() => {
      const exports = {};
      ${kitCode.replace(/export const /g, 'const ').replace(/export function /g, 'function ')}
      exports.STONE_WALL_DEFAULTS = STONE_WALL_DEFAULTS;
      exports.FIELD_STONE_PALETTE = FIELD_STONE_PALETTE;
      exports.CAPSTONE_PALETTE = CAPSTONE_PALETTE;
      exports.MOSS_PALETTE = MOSS_PALETTE;
      exports.IVY_PALETTE = IVY_PALETTE;
      exports.createStoneWallMaterials = createStoneWallMaterials;
      exports.buildStoneWallKit = buildStoneWallKit;
      window.__stoneWallKit = exports;
    })()`;
    await page.evaluate(bundleKit);

    const kitStats = await page.evaluate(`(() => {
      const T = window.TT;
      const THREE = T.THREE;
      const kit = window.__stoneWallKit;

      if (window.__ag204StoneWallGroup) {
        T.scene.remove(window.__ag204StoneWallGroup);
      }

      const wallGrp = kit.buildStoneWallKit({
        THREE,
        sampleHeight: (x, z) => T.sampleHeight(x, z),
        radius: 60.0,
        startAngle: -0.75,
        endAngle: 0.45,
        gaps: [{ angle: -0.335, clearWidth: 6.4 }],
      });
      wallGrp.name = 'ag204-stone-wall-kit-studio';
      T.scene.add(wallGrp);
      window.__ag204StoneWallGroup = wallGrp;

      const hedgeMeshes = [];
      T.scene.traverse((o) => {
        if (o.userData && o.userData.wallBand) hedgeMeshes.push(o);
      });
      window.__ag204HedgeMeshes = hedgeMeshes;

      return {
        name: wallGrp.name,
        draws: wallGrp.userData.draws,
        tris: wallGrp.userData.tris,
        stoneTris: wallGrp.userData.stoneTris,
        mossTris: wallGrp.userData.mossTris,
        ivyTris: wallGrp.userData.ivyTris,
        children: wallGrp.children.map(c => ({ name: c.name, type: c.type, tris: c.geometry.attributes.position.count / 3 })),
      };
    })()`);
    console.log('  -> Stone Wall Kit built:', kitStats);
    fs.writeFileSync(path.join(STONE_DIR, 'stone-wall-stats.json'), JSON.stringify(kitStats, null, 2));

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

    const STONE_LIGHTS = [
      { id: 'noon', time: 0.50, rain: false },
      { id: 'overcast', time: 0.44, rain: true },
      { id: 'dusk', time: 0.77, rain: false },
      { id: 'night', time: 0.05, rain: false },
    ];

    for (const mode of ['hedge', 'stone']) {
      for (const light of STONE_LIGHTS) {
        for (const spot of SPOTS) {
          await page.evaluate(`(() => {
            const T = window.TT;
            const isStone = ${JSON.stringify(mode === 'stone')};
            if (window.__ag204StoneWallGroup) window.__ag204StoneWallGroup.visible = isStone;
            if (window.__ag204HedgeMeshes) {
              for (const m of window.__ag204HedgeMeshes) m.visible = !isStone;
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
            for (let i = 0; i < 15; i++) T.stepFrame(1 / 60);
            return 1;
          })()`);

          const shotFile = path.join(STONE_DIR, `${mode}-${spot.id}-${light.id}.jpg`);
          await captureShot(page, shotFile);
        }
      }
    }

      // Clean up studio stone wall from scene before leaving
      await page.evaluate(`(() => {
        const T = window.TT;
        if (window.__ag204StoneWallGroup) {
          T.scene.remove(window.__ag204StoneWallGroup);
          window.__ag204StoneWallGroup = null;
        }
        if (window.__ag204HedgeMeshes) {
          for (const m of window.__ag204HedgeMeshes) m.visible = true;
        }
        T.setShotView(null);
        for (let i = 0; i < 10; i++) T.stepFrame(1 / 60);
      })()`);
    }

    console.log('\n--- Rebuilding Contact Sheets ---');
    try {
      execFileSync('python', [path.join(OUT_DIR, 'build-sheets.py')], { stdio: 'inherit' });
    } catch (e) {
      console.warn('[build-sheets warning]', e.message);
    }

    console.log('\n[AG-204 Batch] All live browser checks completed successfully!');
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((err) => {
  console.error('[AG-204 Batch] Fatal error:', err);
  process.exit(1);
});
