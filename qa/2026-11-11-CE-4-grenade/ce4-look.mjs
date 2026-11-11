// qa/2026-11-11-CE-4-grenade/ce4-look.mjs
// RTX 5080 WebGPU 4-light 1P verification for Claude 5 (CE-4 parts 1 & 2):
//   - Part 1 (Grenade throw): 1P with pistol, noon / overcast / dusk / night:
//       TT.setGrenadesDbg(3); TT.startGrenadeCharge(); hold ~0.4 s (cocked fist + grenade right of #hudTopLeft panel);
//       TT.releaseGrenadeCharge(); frames through grab, raise, cocked, whip, release (loose open hand),
//       follow, and back onto pistol (no snap).
//   - Part 2 (Knife slash): 1P with pistol, NO machete/katana (fresh match before grantAll):
//       TT.setKnifeCd(0); TT.knifeAttack(); every 2 frames at 60/s through the 0.22 s slash
//       (f00..f14 + f20 pistol return: wind-up at right, cut across middle edge-first, follow-through at left).
//   - Uses same-task H.render() -> canvas.drawImage(H.renderer.domElement) + live #hudTopLeft / #minimap overlay
//     so offscreen (-3800,-3800) Windows DWM occlusion never freezes WebGPU captures while Jerry sleeps.

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Must run inside game-test slot');
}

const ROOT = 'C:/Users/Zero/Desktop/Tiny Trek';
const { serve } = await import(pathToFileURL(path.join(ROOT, 'tools/serve.mjs')).href);
const { launch } = await import(pathToFileURL(path.join(ROOT, 'tools/cdp.mjs')).href);

const OUT_QA = path.join(ROOT, 'qa/2026-11-11-CE-4-grenade/shots');
const OUT_REV = path.join(ROOT, 'review/CE-4/gpu/shots');
fs.mkdirSync(OUT_QA, { recursive: true });
fs.mkdirSync(OUT_REV, { recursive: true });

const LIGHTS = [
  { key: 'noon', worldTime: 0.42 },
  { key: 'overcast', worldTime: 0.48 },
  { key: 'dusk', worldTime: 0.745 },
  { key: 'night', worldTime: 0.02 }
];

function saveShot(name, b64) {
  const buf = Buffer.from(b64, 'base64');
  fs.writeFileSync(path.join(OUT_QA, name), buf);
  fs.writeFileSync(path.join(OUT_REV, name), buf);
  const sha = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 12);
  return { bytes: buf.length, sha };
}

async function moveOffscreen(page) {
  try {
    const win = await page.send('Browser.getWindowForTarget', {});
    if (win && win.windowId != null) {
      await page.send('Browser.setWindowBounds', {
        windowId: win.windowId,
        bounds: { left: -3800, top: -3800, width: 1280, height: 720, windowState: 'normal' }
      });
    }
  } catch (_) {}
}

async function main() {
  const server = await serve(ROOT, 0);
  const browser = await launch({
    headless: false,
    args: [
      '--window-position=-3800,-3800',
      '--window-size=1280,720',
      '--disable-features=CalculateNativeWinOcclusion',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding'
    ]
  });

  const summary = {
    card: 'CE-4',
    capturedAt: new Date().toISOString(),
    backend: null,
    bladeState: null,
    hudTopLeftRect: null,
    lights: {},
    knifeLights: {},
    pageErrors: []
  };

  try {
    const page = await browser.newPage({ width: 1280, height: 720 });
    try {
      await moveOffscreen(page);
      await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 180000 });
      await moveOffscreen(page);
      assert(await page.waitFor('window.TT && window.DWLoad && DWLoad.snapshot().state === "ready"', { timeout: 120000 }));
      await page.evaluate('DWOpening.dismissForTesting()');
      assert(await page.waitFor('!DWOpening.active', { timeout: 30000 }));

      // Start fresh Survival match instantly via runDevCommand('reset') (NEVER calling grantAllWeapons so machete/katana stay false!)
      await page.evaluate(`(() => {
        document.getElementById('playerName').value = 'CE4-GPU';
        TT.runDevCommand('reset');
        TT.runDevCommand('god');
      })()`);
      assert(await page.waitFor('TT.inspectHost().gameStarted === true', { timeout: 30000 }));

      summary.backend = await page.evaluate('TT.renderer?.backend?.constructor?.name || "unknown"');

      // Stage marine at spawn (__home) matching Claude 5's CE-4 setup (steps-gren.json: OTS 0, -0.1, 1P pistol, no machete)
      const initInfo = await page.evaluate(`(async () => {
        const T = window.TT, H = T.inspectHost(), G = T.THREE;
        const { LIGHTS } = await import('/studio/inspector/stage.js');
        window.__studioLights = LIGHTS;
        const perfEl = document.getElementById('perf');
        if (perfEl) perfEl.style.display = 'none';
        const bannerEl = document.getElementById('bigBanner');
        if (bannerEl) bannerEl.style.display = 'none';

        T.clearZombies?.();
        T.setMacheteOwned(false);
        T.setKatanaOwned(false);
        T.setLasersDbg?.(false);
        T.setUnarmedDbg(false);
        T.setZoomHeldDbg(false);
        const pIdx = T.WEAPON_ORDER.indexOf('pistol');
        T.setWeapon(pIdx);

        window.__home = T.player.position.clone();
        T.flightHold(false);
        T.setViewFirstDbg(true);
        T.player.position.copy(window.__home);
        T.flightHold(true);
        T.setOtsAimDbg(0, -0.1);

        window.__ce4Frozen = false;
        window.__ce4LightKey = 'noon';
        H.attach({
          held: () => window.__ce4Frozen,
          scale: (dt) => dt,
          frame: () => {
            const L = window.__studioLights?.[window.__ce4LightKey];
            if (!L) return;
            const p = T.player.position;
            H.sun.position.copy(p).addScaledVector(new G.Vector3(...L.dir).normalize(), 85);
            H.sun.target.position.copy(p);
            H.sun.target.updateMatrixWorld();
            H.sun.color.setHex(L.sunColor);
            H.sun.intensity = L.sun;
            H.hemi.color.setHex(L.skyColor);
            H.hemi.groundColor.setHex(L.ground);
            H.hemi.intensity = L.sky;
            H.ambientFill.intensity = L.fill;
            H.moon.intensity = 0;
          }
        });

        window.__ce4Step = (dt, n = 1) => {
          window.__ce4Frozen = false;
          for (let i = 0; i < n; i++) T.stepFrame(dt);
          window.__ce4Frozen = true;
        };

        for (let i = 0; i < 200; i++) {
          const v = T.viewmodelDbg();
          if (v && v.info.active && v.info.raise > 0.999) break;
          T.stepFrame(1 / 30);
        }
        window.__ce4Frozen = true;

        const cap = document.createElement('canvas');
        window.__captureCe4 = async (quality = 0.92) => {
          await new Promise((r) => setTimeout(r, 0));
          H.render();
          const src = H.renderer.domElement;
          cap.width = src.width;
          cap.height = src.height;
          const sx = src.width / Math.max(1, window.innerWidth);
          const sy = src.height / Math.max(1, window.innerHeight);
          const g = cap.getContext('2d');
          g.fillStyle = '#000';
          g.fillRect(0, 0, cap.width, cap.height);
          g.drawImage(src, 0, 0);

          // Draw live #hudTopLeft panel footprint so cocked grenade clearance right of the HUD panel is directly visible
          const hudPanel = document.getElementById('hudTopLeft');
          let hudRightNdc = null;
          if (hudPanel) {
            const r = hudPanel.getBoundingClientRect();
            if (r.width > 10 && r.height > 10) {
              hudRightNdc = +((r.right / window.innerWidth) * 2 - 1).toFixed(3);
              const x = r.left * sx, y = r.top * sy, w = r.width * sx, h = r.height * sy;
              g.save();
              g.fillStyle = 'rgba(20, 28, 16, 0.78)';
              g.strokeStyle = 'rgba(138, 168, 96, 0.55)';
              g.lineWidth = Math.max(1, 1.2 * sx);
              g.beginPath();
              g.roundRect(x, y, w, h, 6 * sx);
              g.fill();
              g.stroke();
              g.fillStyle = '#d9e6b8';
              g.font = '700 ' + Math.round(13 * sy) + 'px sans-serif';
              g.fillText('GRAVE SHIFT', x + 12 * sx, y + 22 * sy);
              g.fillStyle = '#9bb07a';
              g.font = '600 ' + Math.round(10 * sy) + 'px monospace';
              g.fillText('HUD PANEL', x + 12 * sx, y + 40 * sy);
              g.fillStyle = '#7cd87c';
              g.font = '700 ' + Math.round(12 * sy) + 'px sans-serif';
              g.fillText('READY', x + 12 * sx, y + Math.min(h - 14 * sy, 128 * sy));
              g.restore();
            }
          }

          // Also composite live #minimap canvas if visible
          const mm = document.getElementById('minimap');
          if (mm && mm.width > 0) {
            const mr = mm.getBoundingClientRect();
            if (mr.width > 10) {
              g.save();
              g.beginPath();
              g.arc((mr.left + mr.width / 2) * sx, (mr.top + mr.height / 2) * sy, (mr.width / 2) * sx, 0, Math.PI * 2);
              g.clip();
              g.drawImage(mm, mr.left * sx, mr.top * sy, mr.width * sx, mr.height * sy);
              g.restore();
            }
          }

          // Measure 1P left glove NDC (same probe as Claude 5's steps-gren.json)
          let gloveNdc = null;
          const V = T.viewmodelDbg();
          const glove = V?.arms?.l?.meshes?.glove;
          if (glove && glove.geometry) {
            if (!glove.geometry.boundingBox) glove.geometry.computeBoundingBox();
            const c = glove.geometry.boundingBox.getCenter(new G.Vector3()).applyMatrix4(glove.matrixWorld);
            T.camera.updateMatrixWorld();
            const n = c.clone().project(T.camera);
            gloveNdc = [+n.x.toFixed(3), +n.y.toFixed(3)];
          }
          const ga = T.grenadeAnimDbg ? T.grenadeAnimDbg() : null;
          return {
            b64: cap.toDataURL('image/jpeg', quality).split(',')[1],
            hudRightNdc,
            gloveNdc,
            grenade: ga ? { phase: ga.phase, t: +(ga.t || 0).toFixed(3), inHand: !!ga.inHand } : null,
            knifeAnimT: +(T.getKnifeAnimT?.() || 0).toFixed(3),
            knifeCd: +(T.getKnifeCd?.() || 0).toFixed(3),
            handPlace: V?.info?.handPlace || null
          };
        };

        const r = document.getElementById('hudTopLeft')?.getBoundingClientRect();
        return {
          bladeState: {
            macheteOwned: !!T.isMacheteOwned(),
            katanaOwned: !!T.isKatanaOwned(),
            currentWeapon: T.getCurrentWeapon()
          },
          hudRect: r ? { left: +r.left.toFixed(1), top: +r.top.toFixed(1), right: +r.right.toFixed(1), bottom: +r.bottom.toFixed(1), rightNdc: +((r.right / window.innerWidth) * 2 - 1).toFixed(3) } : null
        };
      })()`);

      summary.bladeState = initInfo.bladeState;
      summary.hudTopLeftRect = initInfo.hudRect;
      assert.equal(summary.bladeState.macheteOwned, false, 'macheteOwned must be false for combat knife slash');
      assert.equal(summary.bladeState.katanaOwned, false, 'katanaOwned must be false for combat knife slash');
      assert.equal(summary.bladeState.currentWeapon, 'pistol', 'currentWeapon must be pistol');

      for (const L of LIGHTS) {
        await page.evaluate(`(() => {
          const T = window.TT;
          T.clearZombies?.();
          T.setMacheteOwned(false);
          T.setKatanaOwned(false);
          T.player.position.copy(window.__home);
          T.setOtsAimDbg(0, -0.1);
          window.__ce4LightKey = ${JSON.stringify(L.key)};
          T.setWorldTime(${L.worldTime});
          if (T.weather) {
            T.weather.overcast = ${L.key === 'overcast' ? 1 : 0};
          }
          window.__ce4Step(1 / 60, 20);
        })()`);

        // ── PART 1: 1P Grenade Throw ──
        const framesMeta = [];
        const captureStep = async (stepSlug, label) => {
          const res = await page.evaluate(`window.__captureCe4(0.92)`);
          const fname = `grenade-${L.key}-${stepSlug}.jpg`;
          const meta = saveShot(fname, res.b64);
          framesMeta.push({
            slug: stepSlug,
            label,
            file: fname,
            ...meta,
            hudRightNdc: res.hudRightNdc,
            gloveNdc: res.gloveNdc,
            grenade: res.grenade,
            handPlace: res.handPlace
          });
        };

        await page.evaluate(`(() => {
          const T = window.TT;
          T.setGrenadesDbg(3);
          T.startGrenadeCharge();
        })()`);

        // 1. grab ~0.12 s
        await page.evaluate(`window.__ce4Step(1 / 60, 7)`);
        await captureStep('01-grab', 'grab .12');

        // 2. raise ~0.06 s
        await page.evaluate(`(() => {
          window.__ce4Frozen = false;
          for (let i = 0; i < 24; i++) {
            const g = TT.grenadeAnimDbg();
            if (g && g.phase === 'raise' && g.t >= 0.055) break;
            TT.stepFrame(1 / 60);
          }
          window.__ce4Frozen = true;
        })()`);
        await captureStep('02-raise', 'raise .06');

        // 3. cocked (held ~0.4 s: cocked fist + grenade right of upper-left HUD panel)
        await page.evaluate(`window.__ce4Step(1 / 60, 26)`);
        await captureStep('03-cocked', 'cocked (.40s hold)');
        const cockedEntry = framesMeta[framesMeta.length - 1];
        assert.equal(cockedEntry.grenade?.phase, 'cocked', `Expected cocked phase at 03-cocked in ${L.key}`);
        if (cockedEntry.gloveNdc && cockedEntry.hudRightNdc != null) {
          assert(
            cockedEntry.gloveNdc[0] > cockedEntry.hudRightNdc - 0.06,
            `Expected cocked glove NDC x (${cockedEntry.gloveNdc[0]}) right of HUD panel (${cockedEntry.hudRightNdc})`
          );
        }

        // Release grenade charge!
        await page.evaluate(`TT.releaseGrenadeCharge()`);

        // 4. whip ~0.03 s
        await page.evaluate(`window.__ce4Step(1 / 60, 2)`);
        await captureStep('04-whip', 'whip .03');

        // 5. release ~0.10 s
        await page.evaluate(`window.__ce4Step(1 / 60, 4)`);
        await captureStep('05-release', 'release .10');

        // 6. follow ~0.17 s
        await page.evaluate(`window.__ce4Step(1 / 60, 4)`);
        await captureStep('06-follow', 'follow .17');

        // 7. back ~0.02 s
        await page.evaluate(`(() => {
          window.__ce4Frozen = false;
          for (let i = 0; i < 20; i++) {
            const g = TT.grenadeAnimDbg();
            if (!g || g.phase === 'back') break;
            TT.stepFrame(1 / 60);
          }
          window.__ce4Frozen = true;
        })()`);
        await captureStep('07-back-start', 'back .02');

        // 8. back ~0.14 s & settled onto pistol support grip (no snap)
        await page.evaluate(`window.__ce4Step(1 / 60, 8)`);
        await captureStep('08-back-grip', 'back .14');

        const grenHashes = new Set(framesMeta.map((f) => f.sha));
        assert(grenHashes.size >= 6, `Expected distinct frames across grenade throw in ${L.key}, got ${grenHashes.size}`);

        // Settle completely before Part 2 knife slash
        await page.evaluate(`(() => {
          window.__ce4Frozen = false;
          for (let i = 0; i < 60; i++) TT.stepFrame(1 / 60);
          TT.clearZombies?.();
          TT.player.position.copy(window.__home);
          TT.setOtsAimDbg(0, -0.1);
          TT.setKnifeCd(0);
          window.__ce4Frozen = true;
        })()`);
        summary.lights[L.key] = framesMeta;

        // ── PART 2: 1P Knife Slash (every 2 frames at 60/s through 0.22 s slash: f00..f14 + f20 pistol back) ──
        const knifeMeta = [];
        const captureKnife = async (fNum, label) => {
          const res = await page.evaluate(`window.__captureCe4(0.92)`);
          const slug = `f${String(fNum).padStart(2, '0')}`;
          const fname = `knife-${L.key}-${slug}.jpg`;
          const meta = saveShot(fname, res.b64);
          knifeMeta.push({
            slug,
            frame: fNum,
            label,
            file: fname,
            ...meta,
            gloveNdc: res.gloveNdc,
            knifeAnimT: res.knifeAnimT,
            knifeCd: res.knifeCd
          });
        };

        await page.evaluate(`(() => {
          const T = window.TT;
          T.setKnifeCd(0);
          T.knifeAttack();
          window.__ce4Step(1 / 60, 1);
        })()`);
        await captureKnife(0, 'f00 start');

        for (const fNum of [2, 4, 6, 8, 10, 12, 14]) {
          await page.evaluate(`window.__ce4Step(1 / 60, 2)`);
          const tag =
            fNum === 2 ? 'f02 wind-up R' :
            fNum === 4 ? 'f04 early cut' :
            fNum === 6 ? 'f06 mid cut' :
            fNum === 8 ? 'f08 follow L' :
            fNum === 10 ? 'f10 drop L' :
            fNum === 12 ? 'f12 clear' : 'f14 pistol rise';
          await captureKnife(fNum, tag);
        }

        await page.evaluate(`window.__ce4Step(1 / 60, 6)`);
        await captureKnife(20, 'f20 pistol rest');

        const knifeHashes = new Set(knifeMeta.map((f) => f.sha));
        assert(knifeHashes.size >= 6, `Expected distinct frames across knife slash in ${L.key}, got ${knifeHashes.size}`);

        await page.evaluate(`(() => { window.__ce4Step(1 / 60, 30); TT.clearZombies?.(); })()`);
        summary.knifeLights[L.key] = knifeMeta;
      }

      summary.pageErrors.push(...(page.errors || []));
    } finally {
      await page.close().catch(() => {});
    }

    const jsonStr = JSON.stringify(summary, null, 2);
    fs.writeFileSync(path.join(ROOT, 'qa/2026-11-11-CE-4-grenade/ce4-summary.json'), jsonStr);
    fs.writeFileSync(path.join(ROOT, 'review/CE-4/gpu/ce4-summary.json'), jsonStr);
    assert.deepEqual(summary.pageErrors, [], 'Expected 0 pageErrors during CE-4 grenade & knife look');
    console.log('[CE-4 GPU] Captured all 4 lights for Part 1 (grenade throw) and Part 2 (knife slash), 0 errors.');
  } finally {
    await browser.close().catch(() => {});
    await server.close().catch(() => {});
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
