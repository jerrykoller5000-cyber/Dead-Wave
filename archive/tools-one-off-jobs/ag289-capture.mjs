// tools/ag289-capture.mjs
// AG-289: Captures matched high-fidelity RTX 5080 WebGPU renders for:
// 1. Zombie gate header in corrugated siding (Find 2)
// 2. Infirmary O2 bottle, IV stand & mat flush on floor (Find 4)
// 3. Stretcher casters & medical cabinet 4 legs seated on mat (Find 5)
// 4. Containment gate threshold plate flush on floor (Find 6)
// 5. Cot scissor legs offset with pivot pin & caps (Find 7)
// 6. Build Room wall wear smudge decals at 64 px/m (Find 8)
// 7. Tactical flashlight hotspot at 3m at night (capped irradiance)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Must run inside game-test slot: node crew/crew.mjs slot run antigravity AG-289 ...');
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT_QA = path.join(ROOT, 'qa/2026-11-10-AG-289');
const OUT_REV = path.join(ROOT, 'review/AG-289');
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
  {
    name: 'after-find-02-gate-header-siding.png',
    title: 'Find 2: Zombie Gate Header in Corrugated Siding (y = 6.3..24.0 m)',
    lx: -26.0, lz: 11.5, tx: -26.0, ty: 10.0, tz: 28.0,
    doorOpen: true, light: 'noon', armed: false, lightsOff: false
  },
  {
    name: 'after-find-03-infirmary-o2-iv-seated.png',
    title: 'Find 4: Infirmary O2 Bottle & IV Stand Seated Flush on Mat at y = 0.020 m',
    lx: -40.5, lz: -7.5, tx: -42.3, ty: 0.15, tz: -7.8,
    doorOpen: true, light: 'noon', armed: false, lightsOff: false
  },
  {
    name: 'after-find-04-infirmary-casters-cabinet.png',
    title: 'Find 5: Stretcher Casters on Mat & Cabinet 4 Legs (2 Front + 2 Rear) at y = 0.020 m',
    lx: -39.2, lz: -7.0, tx: -40.85, ty: 0.18, tz: -8.5,
    doorOpen: true, light: 'noon', armed: false, lightsOff: false
  },
  {
    name: 'after-find-05-gate-threshold-seated.png',
    title: 'Find 6: Containment Gate Threshold Plate & Hazard Nosing Flush on Floor at y = 0.000 m',
    lx: -26.0, lz: 25.5, tx: -26.0, ty: 0.08, tz: 27.6,
    doorOpen: true, light: 'noon', armed: false, lightsOff: false
  },
  {
    name: 'after-find-06-cot-scissor-legs-offset.png',
    title: 'Find 7: Cot Scissor Legs Offset along X (±16 mm) with Pivot Pin & Caps',
    lx: -37.6, lz: -5.7, tx: -37.6, ty: 0.22, tz: -6.75,
    doorOpen: true, light: 'noon', armed: false, lightsOff: false
  },
  {
    name: 'after-find-07-build-wall-crisp-smudge.png',
    title: 'Find 8: Build Room Wall Smudge Decals at Texel Density WALL_PX: 64',
    lx: -42.2, lz: 4.0, tx: -44.0, ty: 1.45, tz: 4.0,
    doorOpen: true, light: 'noon', armed: false, lightsOff: false
  },
  {
    name: 'after-flashlight-3m-night-capped.png',
    title: 'Flashlight: Close-Range Hotspot at 3m at Night (Capped Irradiance, Visible Tiles/Grout)',
    lx: -0.4, lz: -12.0, tx: -0.4, ty: 1.45, tz: -15.0,
    doorOpen: false, light: 'night', armed: true, lightsOff: true, flOn: true
  }
];

async function main() {
  console.log('[AG-289] Starting HTTP server and launching RTX 5080 Chrome...');
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
    } catch { /* ignore */ }

    console.log('[AG-289] Navigating to game...');
    await page.goto(`${server.origin}/index.html?debug=1`, { timeout: 180000 });
    const booted = await page.waitFor('!!(window.TT && window.TT.trainingDbg && window.TT.inspectHost)', { timeout: 180000 });
    if (!booted) throw new Error('Game failed to expose window.TT: ' + (page.errors[0] || 'timeout'));

    console.log('[AG-289] Booting Training Ground and switching to First Person...');
    const initInfo = await page.evaluate(`(async () => {
      const T = window.TT;
      const D = T.trainingDbg;
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const until = async (f, ms = 25000) => {
        const t0 = performance.now();
        while (performance.now() - t0 < ms) { if (f()) return true; await wait(40); }
        return !!f();
      };
      if (window.DWOpening && window.DWOpening.dismissForTesting) window.DWOpening.dismissForTesting();
      const nameEl = document.getElementById('playerName');
      if (nameEl) nameEl.value = 'Jerry';
      document.getElementById('modeTraining').click();
      const okActive = await until(() => D.state().active && D.tg(), 25000);
      const okBlackout = await until(() => !document.getElementById('trainingBlackout')?.classList.contains('on'), 20000);
      T.setViewFirstDbg(true);
      const okFp = await until(() => T.fpDbg().first && T.fpDbg().w > 0.99, 15000);

      // Grant all weapons so flashlight and sidearms are available
      if (T.grantAllWeapons) T.grantAllWeapons();

      const H = T.inspectHost();
      window.__ag289Light = 'noon';
      window.__ag289ApplyLight = () => {
        const lk = window.__ag289Light;
        const tg = D.tg();
        if (!tg) return;
        const O = tg.origin;
        const { sun, hemi, ambientFill, moon, scene } = H;
        if (lk === 'noon') {
          sun.position.set(O.x + 28, O.y + 82, O.z + 36);
          sun.target.position.set(O.x - 14, O.y, O.z + 6);
          sun.target.updateMatrixWorld();
          sun.intensity = 1.73; // True Dead-Wave noon
          sun.color.setHex(0xfff4dc);
          if (hemi) { hemi.intensity = 0.68; hemi.color.setHex(0xd8e8ff); hemi.groundColor.setHex(0x8e806a); }
          if (ambientFill) ambientFill.intensity = 0.04;
          if (moon) moon.intensity = 0;
          if (scene.fog && scene.fog.isFog) { scene.fog.color.setHex(0xc8daec); scene.fog.near = 90; scene.fog.far = 360; }
        } else if (lk === 'night') {
          sun.position.set(O.x - 36, O.y + 68, O.z - 28);
          sun.target.position.set(O.x - 14, O.y, O.z + 6);
          sun.target.updateMatrixWorld();
          sun.intensity = 0.05;
          sun.color.setHex(0x6e92dc);
          if (hemi) { hemi.intensity = 0.08; hemi.color.setHex(0x3a4f86); hemi.groundColor.setHex(0x10141d); }
          if (ambientFill) ambientFill.intensity = 0.01;
          if (moon) moon.intensity = 0;
          if (scene.fog && scene.fog.isFog) { scene.fog.color.setHex(0x090d16); scene.fog.near = 10; scene.fog.far = 88; }
        }
      };
      H.attach({
        held: () => false,
        scale: (dt) => dt,
        frame: () => window.__ag289ApplyLight()
      });

      // Warm up pipelines
      for (let k = 0; k < 60; k++) T.stepFrame(1 / 60);

      return {
        okActive, okBlackout, okFp,
        renderer: H.renderer?.constructor?.name || 'unknown',
        backend: T.getRendererBackend ? T.getRendererBackend() : 'unknown'
      };
    })()`);
    console.log('[AG-289] Initialized:', JSON.stringify(initInfo));
    await new Promise((r) => setTimeout(r, 1000));

    const manifest = [];

    for (let i = 0; i < SHOTS.length; i++) {
      const s = SHOTS[i];
      console.log(`[AG-289] [${i + 1}/${SHOTS.length}] Setting up: ${s.name} (${s.title})...`);

      await page.evaluate(`(async () => {
        const s = ${JSON.stringify(s)};
        const T = window.TT;
        const D = T.trainingDbg;
        const H = T.inspectHost();
        const tg = D.tg();
        const O = tg.origin;
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));

        // 1. Security door state
        const st = D.state();
        const isDoorOpen = !!(st.security && st.security.read && st.security.read().open);
        if (!!s.doorOpen !== isDoorOpen) {
          D.act('trainingDoor');
          for (let k = 0; k < 45; k++) T.stepFrame(1 / 60);
        }

        // 2. Armed / Holstered
        const wantUnarmed = !s.armed;
        if (T.isUnarmed() !== wantUnarmed) {
          T.toggleHolster();
          for (let k = 0; k < 25; k++) T.stepFrame(1 / 60);
        }

        // 3. Room lighting & tactical flashlight
        const wantLightsOff = !!s.lightsOff;
        if (!!st.lightsOff !== wantLightsOff) {
          D.toggleLights();
        }
        if (s.light !== 'night') {
          tg.setLights(true);
        }

        const flOn = !!(T.nightWarningsDbg && T.nightWarningsDbg.state().flashlight);
        if (!!s.flOn !== flOn) {
          T.toggleFlashlightDbg();
        }

        window.__ag289Light = s.light;

        // 4. Player position and aim
        const px = O.x + s.lx, pz = O.z + s.lz;
        const tx = O.x + s.tx, ty = s.ty, tz = O.z + s.tz;
        T.setViewFirstDbg(true);
        H.player.position.set(px, O.y, pz);
        T.setVelDbg(0, 0);

        const eyeY = O.y + 1.62;
        const dx = tx - px, dy = (O.y + ty) - eyeY, dz = tz - pz;
        const yaw = Math.atan2(dx, dz);
        const pitch = Math.atan2(dy, Math.hypot(dx, dz));
        T.setOtsAimDbg(yaw, pitch);

        // Step 30 frames for physics, lamps, and flashlight to settle
        for (let k = 0; k < 30; k++) {
          H.player.position.set(px, O.y, pz);
          T.setOtsAimDbg(yaw, pitch);
          T.stepFrame(1 / 60);
        }
        window.__ag289ApplyLight();
      })()`);

      await new Promise((r) => setTimeout(r, 400));

      const qaPath = path.join(OUT_QA, s.name);
      const revPath = path.join(OUT_REV, s.name);

      await page.screenshot(qaPath);
      const buf = fs.readFileSync(qaPath);
      writeRetry(revPath, buf);

      console.log(`  -> Saved ${s.name}: ${buf.length} bytes`);
      manifest.push({ name: s.name, bytes: buf.length, title: s.title });
    }

    fs.writeFileSync(path.join(OUT_REV, 'capture-manifest.json'), JSON.stringify(manifest, null, 2));
    console.log('[AG-289] All 7 renders captured successfully!');

  } finally {
    try { await browser.close(); } catch { /* ignore */ }
    try { await server.close(); } catch { /* ignore */ }
  }
}

main().catch((err) => {
  console.error('[AG-289] Capture error:', err);
  process.exit(1);
});
