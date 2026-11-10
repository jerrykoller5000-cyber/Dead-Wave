// tools/ag290-capture.mjs
// AG-290 (Jerry, 10 Nov; J131, J132): barrel heat, smoke wisp & barrel/suppressor red glow.
// Captures matched high-fidelity RTX 5080 WebGPU renders for:
// 1. First-person M4: Cold vs Sustained Fire (Glowing Barrel + Muzzle Smoke Wisp) across 4 lights (Noon, Overcast, Dusk, Night)
// 2. First-person M4 Suppressed: Cold vs Hot Suppressor (Glowing Suppressor + Smoke off Suppressor Tip) at Night
// 3. First-person Minigun: Cold vs Hot (Glowing 6-barrel cluster) at Noon & Night
// 4. Third-person Marine: Cold vs Hot M4 and Suppressed M4

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Must run inside game-test slot: node crew/crew.mjs slot run antigravity AG-290 ...');
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT_QA = path.join(ROOT, 'qa/2026-11-10-AG-290');
const OUT_REV = path.join(ROOT, 'review/AG-290');
fs.mkdirSync(OUT_QA, { recursive: true });
fs.mkdirSync(OUT_REV, { recursive: true });

function writeRetry(filePath, data, retries = 20, delay = 150) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  for (let i = 0; i < retries; i++) {
    try {
      fs.writeFileSync(filePath, data);
      return;
    } catch (e) {
      if (i === retries - 1) throw e;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delay);
    }
  }
}

const SHOTS = [
  // --- 1. First-person M4 (Unsuppressed) Across 4 Lights (Cold vs Hot) ---
  {
    name: 'before-fp-m4-cold-noon.png',
    title: 'FP M4 Cold (Heat 0.0) · Noon',
    weapon: 'm4', suppressed: false, heat: 0.0, light: 'noon', firstPerson: true
  },
  {
    name: 'after-fp-m4-hot-noon.png',
    title: 'FP M4 Hot (Heat 0.88, Glowing Barrel + Smoke Wisp) · Noon',
    weapon: 'm4', suppressed: false, heat: 0.88, light: 'noon', firstPerson: true
  },
  {
    name: 'before-fp-m4-cold-overcast.png',
    title: 'FP M4 Cold (Heat 0.0) · Overcast',
    weapon: 'm4', suppressed: false, heat: 0.0, light: 'overcast', firstPerson: true
  },
  {
    name: 'after-fp-m4-hot-overcast.png',
    title: 'FP M4 Hot (Heat 0.88, Glowing Barrel + Smoke Wisp) · Overcast',
    weapon: 'm4', suppressed: false, heat: 0.88, light: 'overcast', firstPerson: true
  },
  {
    name: 'before-fp-m4-cold-dusk.png',
    title: 'FP M4 Cold (Heat 0.0) · Dusk',
    weapon: 'm4', suppressed: false, heat: 0.0, light: 'dusk', firstPerson: true
  },
  {
    name: 'after-fp-m4-hot-dusk.png',
    title: 'FP M4 Hot (Heat 0.88, Glowing Barrel + Smoke Wisp) · Dusk',
    weapon: 'm4', suppressed: false, heat: 0.88, light: 'dusk', firstPerson: true
  },
  {
    name: 'before-fp-m4-cold-night.png',
    title: 'FP M4 Cold (Heat 0.0) · Night',
    weapon: 'm4', suppressed: false, heat: 0.0, light: 'night', firstPerson: true
  },
  {
    name: 'after-fp-m4-hot-night.png',
    title: 'FP M4 Hot (Heat 0.88, Glowing Red-Orange Barrel + Smoke Wisp) · Night',
    weapon: 'm4', suppressed: false, heat: 0.88, light: 'night', firstPerson: true
  },

  // --- 2. First-person Suppressor Fitted (Cold vs Hot Suppressor) ---
  {
    name: 'before-fp-m4-suppressed-cold-night.png',
    title: 'FP M4 Suppressed Cold (Heat 0.0) · Night',
    weapon: 'm4', suppressed: true, heat: 0.0, light: 'night', firstPerson: true
  },
  {
    name: 'after-fp-m4-suppressed-hot-night.png',
    title: 'FP M4 Suppressed Hot (Heat 0.88, Suppressor Glows & Smokes, Barrel Cool) · Night',
    weapon: 'm4', suppressed: true, heat: 0.88, light: 'night', firstPerson: true
  },

  // --- 3. First-person Minigun (Cold vs Hot) ---
  {
    name: 'before-fp-minigun-cold-noon.png',
    title: 'FP Minigun Cold (Heat 0.0) · Noon',
    weapon: 'minigun', suppressed: false, heat: 0.0, light: 'noon', firstPerson: true
  },
  {
    name: 'after-fp-minigun-hot-noon.png',
    title: 'FP Minigun Hot (Heat 0.92, 6-Barrel Cluster Glow + Smoke) · Noon',
    weapon: 'minigun', suppressed: false, heat: 0.92, light: 'noon', firstPerson: true
  },

  // --- 4. Third-person Marine Holding Gun (Cold vs Hot) ---
  {
    name: 'before-tp-marine-m4-cold-noon.png',
    title: 'TP Marine M4 Cold (Heat 0.0) · Noon',
    weapon: 'm4', suppressed: false, heat: 0.0, light: 'noon', firstPerson: false
  },
  {
    name: 'after-tp-marine-m4-hot-noon.png',
    title: 'TP Marine M4 Hot (Heat 0.88, Barrel Glow + Smoke) · Noon',
    weapon: 'm4', suppressed: false, heat: 0.88, light: 'noon', firstPerson: false
  },
  {
    name: 'after-tp-marine-m4-suppressed-hot-night.png',
    title: 'TP Marine M4 Suppressed Hot (Heat 0.88, Suppressor Glow + Smoke) · Night',
    weapon: 'm4', suppressed: true, heat: 0.88, light: 'night', firstPerson: false
  }
];

async function main() {
  console.log('[AG-290] Starting WebGPU Barrel Heat & Muzzle Smoke capture on RTX 5080...');
  const server = await serve(ROOT, 0);
  const browser = await launch({
    headless: false,
    args: [
      '--window-position=-3800,-3800',
      '--window-size=1280,720',
      '--disable-features=CalculateNativeWinOcclusion'
    ]
  });

  try {
    const page = await browser.newPage({ width: 1280, height: 720 });
    try {
      const { windowId } = await page.send('Browser.getWindowForTarget', {});
      await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: -3800, top: -3800, width: 1280, height: 720 } });
    } catch {}

    await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 180000 });
    await page.waitFor('!!window.DWOpening', { timeout: 60000 });
    for (let i = 0; i < 2; i++) {
      await page.evaluate(`(() => { if (window.DWOpening?.dismissForTesting) DWOpening.dismissForTesting(); })()`);
      await new Promise((r) => setTimeout(r, 200));
    }

    await page.waitFor('!!(window.TT && window.TT.trainingDbg)', { timeout: 240000 });
    await page.waitFor('window.DWOpening && window.DWOpening.active === false', { timeout: 120000 });
    await new Promise((r) => setTimeout(r, 400));

    // Teleport to Training Ground
    await page.evaluate(`(async () => {
      const T = window.TT;
      if (T.trainingDbg && T.trainingDbg.enter) T.trainingDbg.enter();
      for (let k = 0; k < 60; k++) T.stepFrame(1 / 60);
    })()`);
    await new Promise((r) => setTimeout(r, 500));

    // Setup custom light controller
    await page.evaluate(`(() => {
      const T = window.TT, H = T.inspectHost();
      window.__ag290Light = 'noon';
      window.__ag290ApplyLight = () => {
        const lk = window.__ag290Light;
        const p = T.player.position;
        const { sun, hemi, ambientFill, moon, scene } = H;
        if (lk === 'noon') {
          if (T.setWorldTime) T.setWorldTime(0.50);
          sun.position.set(p.x + 32, p.y + 85, p.z + 38); sun.target.position.copy(p);
          sun.intensity = 2.1; sun.color.setHex(0xfff3dc);
          if (hemi) { hemi.intensity = 0.95; hemi.color.setHex(0xd8e6ff); hemi.groundColor.setHex(0x887a62); }
          if (ambientFill) { ambientFill.color.setHex(0xffffff); ambientFill.intensity = 0.10; }
          if (moon) moon.intensity = 0;
          if (scene.fog && scene.fog.isFog) { scene.fog.color.setHex(0x8cb8ff); scene.fog.near = 180; scene.fog.far = 620; }
        } else if (lk === 'overcast') {
          if (T.setWorldTime) T.setWorldTime(0.46);
          sun.position.set(p.x + 24, p.y + 88, p.z + 30); sun.target.position.copy(p);
          sun.intensity = 0.65; sun.color.setHex(0xe6e8ee);
          if (hemi) { hemi.intensity = 1.65; hemi.color.setHex(0xd4d7de); hemi.groundColor.setHex(0x7c7e82); }
          if (ambientFill) { ambientFill.color.setHex(0xe2e6ee); ambientFill.intensity = 0.30; }
          if (moon) moon.intensity = 0;
          if (scene.fog && scene.fog.isFog) { scene.fog.color.setHex(0xb8c0cc); scene.fog.near = 120; scene.fog.far = 420; }
        } else if (lk === 'dusk') {
          if (T.setWorldTime) T.setWorldTime(0.73);
          sun.position.set(p.x + 78, p.y + 24, p.z + 18); sun.target.position.copy(p);
          sun.intensity = 1.45; sun.color.setHex(0xffb07a);
          if (hemi) { hemi.intensity = 0.65; hemi.color.setHex(0xffc4a2); hemi.groundColor.setHex(0x4a3428); }
          if (ambientFill) { ambientFill.color.setHex(0x6e5044); ambientFill.intensity = 0.10; }
          if (moon) moon.intensity = 0.04;
          if (scene.fog && scene.fog.isFog) { scene.fog.color.setHex(0xc88a68); scene.fog.near = 110; scene.fog.far = 380; }
        } else if (lk === 'night') {
          if (T.setWorldTime) T.setWorldTime(0.00);
          sun.intensity = 0;
          if (hemi) { hemi.intensity = 0.16; hemi.color.setHex(0x18243b); hemi.groundColor.setHex(0x0a1018); }
          if (ambientFill) { ambientFill.color.setHex(0x0e1828); ambientFill.intensity = 0.08; }
          if (moon) { moon.position.set(p.x - 30, p.y + 70, p.z - 25); moon.target.position.copy(p); moon.intensity = 0.55; moon.color.setHex(0xb2ccf5); }
          if (scene.fog && scene.fog.isFog) { scene.fog.color.setHex(0x060b14); scene.fog.near = 35; scene.fog.far = 135; }
        }
      };
    })()`);

    const manifest = [];

    for (let i = 0; i < SHOTS.length; i++) {
      const s = SHOTS[i];
      console.log(`[AG-290] (${i + 1}/${SHOTS.length}) Capturing ${s.name}: ${s.title}...`);

      await page.evaluate(`(async () => {
        const T = window.TT, H = T.inspectHost();
        const s = ${JSON.stringify(s)};

        window.__ag290Light = s.light;

        // Equip weapon
        const WEAPON_ORDER = ['minigun', 'm4', 'ak', 'pistol', 'uzi', 'shotgun', 'aa12', 'revolver', 'sniper', 'launcher', 'flamer', 'chainsaw'];
        const wIdx = WEAPON_ORDER.indexOf(s.weapon);
        if (wIdx >= 0 && T.setWeaponDbg) {
          T.setWeaponDbg(wIdx);
        } else if (T.setWeapon) {
          T.setWeapon(wIdx);
        }

        // Suppressor fitting
        if (T.fitArmoryMod) {
          T.fitArmoryMod(s.weapon, 'suppressor', s.suppressed);
        }

        // Unarmed off
        if (T.setUnarmedDbg) T.setUnarmedDbg(false);

        // View mode
        T.setViewFirstDbg(s.firstPerson);

        // Set heat
        if (T.setBarrelHeatDbg) {
          T.setBarrelHeatDbg(s.weapon, s.heat);
        }

        // Apply light
        window.__ag290ApplyLight();

        // Step simulation for heat effects, smoke wisps, and viewmodel to update
        for (let k = 0; k < 25; k++) {
          if (T.setBarrelHeatDbg && s.heat > 0) T.setBarrelHeatDbg(s.weapon, s.heat);
          T.stepFrame(1 / 60);
        }
      })()`);

      await new Promise((r) => setTimeout(r, 250));

      const qaPath = path.join(OUT_QA, s.name);
      const revPath = path.join(OUT_REV, s.name);

      await page.screenshot(qaPath);
      const buf = fs.readFileSync(qaPath);
      writeRetry(revPath, buf);

      console.log(`  -> Saved ${s.name}: ${buf.length} bytes`);
      manifest.push({ name: s.name, bytes: buf.length, title: s.title, heat: s.heat, light: s.light });
    }

    fs.writeFileSync(path.join(OUT_REV, 'capture-manifest.json'), JSON.stringify(manifest, null, 2));
    fs.writeFileSync(path.join(OUT_QA, 'capture-manifest.json'), JSON.stringify(manifest, null, 2));
    console.log('[AG-290] Visual captures complete!');

  } finally {
    try { await browser.close(); } catch {}
    try { await server.close(); } catch {}
  }
}

main().catch((err) => {
  console.error('[AG-290] Error during capture:', err);
  process.exit(1);
});
