// qa/2026-11-11-CE-4-grenade/ce4-grenade-look.mjs
// RTX 5080 WebGPU 4-light 1P verification for Claude 5 (CE-4 parts 1 & 2):
//   - Part 1 (Grenade throw): 1P with pistol, noon / overcast / dusk / night:
//       TT.setGrenadesDbg(3); TT.startGrenadeCharge(); hold ~0.4 s (cocked fist + grenade right of HUD panel);
//       TT.releaseGrenadeCharge(); frames through grab, raise, cocked, whip, release (loose open hand),
//       follow, and back onto pistol (no snap).
//   - Part 2 (Knife slash): 1P with pistol, NO machete/katana (fresh match before grantAll):
//       cooldown cleared, TT.knifeAttack(), every 2 frames at 60/s through the 0.22 s slash
//       (f00..f14 + f20 pistol return: wind-up at right, cut across middle edge-first, follow-through at left).
//   - Saves individual frames + metadata into review/CE-4/gpu/

import assert from 'node:assert/strict';
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
  { key: 'noon', worldTime: 0.46 },
  { key: 'overcast', worldTime: 0.50 },
  { key: 'dusk', worldTime: 0.745 },
  { key: 'night', worldTime: 0.02 }
];

function saveShot(name, b64) {
  const buf = Buffer.from(b64, 'base64');
  fs.writeFileSync(path.join(OUT_QA, name), buf);
  fs.writeFileSync(path.join(OUT_REV, name), buf);
  return buf.length;
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

      // Start fresh Survival match outdoors (NEVER calling grantAllWeapons so machete/katana stay false!)
      await page.evaluate(`(() => {
        document.getElementById('playerName').value = 'CE4-GPU';
        document.getElementById('modeSolo').click();
      })()`);
      assert(await page.waitFor('TT.inspectHost().gameStarted === true', { timeout: 30000 }));

      summary.backend = await page.evaluate('TT.renderer?.backend?.constructor?.name || "unknown"');

      // Stage marine in clear valley view, 1P with pistol, godmode on, render loop controlled cleanly via inspectHost
      summary.bladeState = await page.evaluate(`(async () => {
        const T = window.TT, H = T.inspectHost();
        T.setDevGodModeDbg?.(true);
        T.clearZombies?.();
        T.flightHold(true);
        T.setMacheteOwned?.(false);
        T.setKatanaOwned?.(false);
        if (T.isUnarmed()) T.toggleHolster();
        const pIdx = T.WEAPON_ORDER.indexOf('pistol');
        T.setWeapon(pIdx);
        T.setViewFirstDbg(true);
        T.setZoomHeldDbg(false);
        // Place on open road facing valley/mountains (matches Claude 5's cloud camera framing with HUD visible!)
        H.placePlayer(0, -18, 0);
        T.setOtsAimDbg(0, 0.02);
        for (let i = 0; i < 60; i++) T.stepFrame(1 / 60);
        H.loop(false);
        return {
          macheteOwned: !!T.isMacheteOwned?.(),
          katanaOwned: !!T.isKatanaOwned?.(),
          currentWeapon: T.getCurrentWeapon?.()
        };
      })()`);
      assert.equal(summary.bladeState.macheteOwned, false, 'macheteOwned must be false for combat knife slash');
      assert.equal(summary.bladeState.katanaOwned, false, 'katanaOwned must be false for combat knife slash');

      for (const L of LIGHTS) {
        await page.evaluate(`(async () => {
          const T = window.TT, H = T.inspectHost();
          T.clearZombies?.();
          T.setMacheteOwned?.(false);
          T.setKatanaOwned?.(false);
          T.setWorldTime(${L.worldTime});
          if (${JSON.stringify(L.key)} === 'overcast') {
            T.setWeatherDbg?.('overcast');
          } else {
            T.setWeatherDbg?.('clear');
          }
          for (let i = 0; i < 20; i++) T.stepFrame(1 / 60);
          if (${JSON.stringify(L.key)} === 'night') {
            H.moon.intensity = Math.max(H.moon.intensity, 0.55);
            H.hemi.intensity = Math.max(H.hemi.intensity, 0.42);
            H.ambientFill.intensity = Math.max(H.ambientFill.intensity, 0.28);
          }
          H.render();
        })()`);

        // ── PART 1: 1P Grenade Throw ──
        const framesMeta = [];
        const captureStep = async (stepSlug, label) => {
          const st = await page.evaluate(`(() => {
            const T = window.TT, H = T.inspectHost();
            if (${JSON.stringify(L.key)} === 'night') {
              H.moon.intensity = Math.max(H.moon.intensity, 0.55);
              H.hemi.intensity = Math.max(H.hemi.intensity, 0.42);
              H.ambientFill.intensity = Math.max(H.ambientFill.intensity, 0.28);
            }
            H.render();
            const g = T.grenadeAnimDbg ? T.grenadeAnimDbg() : null;
            const vm = T.viewmodelDbg ? T.viewmodelDbg().info : null;
            return { grenade: g ? { phase: g.phase, t: +(g.t || 0).toFixed(3) } : null, handPlace: vm?.handPlace || null };
          })()`);
          const shot = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 92 });
          const fname = `grenade-${L.key}-${stepSlug}.jpg`;
          const bytes = saveShot(fname, shot.data);
          framesMeta.push({ slug: stepSlug, label, file: fname, bytes, ...st });
        };

        await page.evaluate(`(() => {
          const T = window.TT;
          T.setGrenadesDbg(3);
          T.startGrenadeCharge();
        })()`);

        // 1. grab ~0.12 s (hand easing open on reach before closing on grenade)
        await page.evaluate(`(() => { for (let i = 0; i < 6; i++) TT.stepFrame(0.02); })()`);
        await captureStep('01-grab', 'grab .12');

        // 2. raise ~0.06 s (lifting grenade into view)
        await page.evaluate(`(() => {
          for (let i = 0; i < 20; i++) {
            const g = TT.grenadeAnimDbg();
            if (g && g.phase === 'raise' && g.t >= 0.055) break;
            TT.stepFrame(1 / 60);
          }
        })()`);
        await captureStep('02-raise', 'raise .06');

        // 3. cocked (held ~0.4 s: cocked fist + grenade clearly right of upper-left HUD panel!)
        await page.evaluate(`(() => {
          for (let i = 0; i < 35; i++) TT.stepFrame(1 / 60);
        })()`);
        await captureStep('03-cocked', 'cocked (.40s hold)');

        // Release grenade charge!
        await page.evaluate(`TT.releaseGrenadeCharge()`);

        // 4. whip ~0.03 s (throw phase early, before 0.08s release)
        await page.evaluate(`(() => { TT.stepFrame(0.03); })()`);
        await captureStep('04-whip', 'whip .03');

        // 5. release ~0.10 s (grenade just left hand, fingers spreading loose open)
        await page.evaluate(`(() => { TT.stepFrame(0.035); TT.stepFrame(0.035); })()`);
        await captureStep('05-release', 'release .10');

        // 6. follow ~0.17 s (follow-through with loose open hand, NOT pointing finger/thumb up)
        await page.evaluate(`(() => { TT.stepFrame(0.035); TT.stepFrame(0.035); })()`);
        await captureStep('06-follow', 'follow .17');

        // 7. back ~0.02 s (transitioning smoothly back toward support grip)
        await page.evaluate(`(() => {
          for (let i = 0; i < 15; i++) {
            const g = TT.grenadeAnimDbg();
            if (!g || g.phase === 'back') break;
            TT.stepFrame(0.015);
          }
        })()`);
        await captureStep('07-back-start', 'back .02');

        // 8. back ~0.14 s & settled onto pistol support grip (no snap)
        await page.evaluate(`(() => { for (let i = 0; i < 8; i++) TT.stepFrame(0.015); })()`);
        await captureStep('08-back-grip', 'back .14');

        // Settle completely before Part 2 knife slash
        await page.evaluate(`(() => {
          for (let i = 0; i < 50; i++) TT.stepFrame(1 / 60);
          TT.clearZombies?.();
          if (typeof TT.setKnifeCd === 'function') TT.setKnifeCd(0);
          while (TT.getKnifeCd && TT.getKnifeCd() > 0) TT.stepFrame(1 / 60);
        })()`);
        summary.lights[L.key] = framesMeta;

        // ── PART 2: 1P Knife Slash (every 2 frames at 60/s through 0.22 s slash: f00..f14 + f20 pistol back) ──
        const knifeMeta = [];
        const captureKnife = async (fNum, label) => {
          const st = await page.evaluate(`(() => {
            const T = window.TT, H = T.inspectHost();
            if (${JSON.stringify(L.key)} === 'night') {
              H.moon.intensity = Math.max(H.moon.intensity, 0.55);
              H.hemi.intensity = Math.max(H.hemi.intensity, 0.42);
              H.ambientFill.intensity = Math.max(H.ambientFill.intensity, 0.28);
            }
            H.render();
            return {
              knifeAnimT: +(T.getKnifeAnimT?.() || 0).toFixed(3),
              knifeCd: +(T.getKnifeCd?.() || 0).toFixed(3)
            };
          })()`);
          const slug = `f${String(fNum).padStart(2, '0')}`;
          const shot = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 92 });
          const fname = `knife-${L.key}-${slug}.jpg`;
          const bytes = saveShot(fname, shot.data);
          knifeMeta.push({ slug, frame: fNum, label, file: fname, bytes, ...st });
        };

        await page.evaluate(`(() => {
          const T = window.TT;
          if (typeof T.setKnifeCd === 'function') T.setKnifeCd(0);
          T.knifeAttack();
          T.stepFrame(1 / 60); // f00: initial pose update right after knifeAttack()
        })()`);
        await captureKnife(0, 'f00 start');

        for (const fNum of [2, 4, 6, 8, 10, 12, 14]) {
          await page.evaluate(`(() => { TT.stepFrame(1 / 60); TT.stepFrame(1 / 60); })()`);
          const tag =
            fNum === 2 ? 'f02 wind-up R' :
            fNum === 4 ? 'f04 early cut' :
            fNum === 6 ? 'f06 mid cut' :
            fNum === 8 ? 'f08 follow L' :
            fNum === 10 ? 'f10 drop L' :
            fNum === 12 ? 'f12 clear' : 'f14 pistol rise';
          await captureKnife(fNum, tag);
        }

        // Settle 6 more ticks (f20) to verify pistol cleanly back at rest
        await page.evaluate(`(() => { for (let i = 0; i < 6; i++) TT.stepFrame(1 / 60); })()`);
        await captureKnife(20, 'f20 pistol rest');

        await page.evaluate(`(() => { for (let i = 0; i < 30; i++) TT.stepFrame(1 / 60); TT.clearZombies?.(); })()`);
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
