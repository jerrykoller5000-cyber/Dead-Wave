// qa/2026-11-10-AG-287/walkthrough.mjs
// AG-287: Complete eye-level walkthrough of the Training Ground on RTX 5080 WebGPU
// across all 4 distinct lights (noon, overcast, dusk, night + lights-off + flashlight),
// plus automated 3D seating/scale audit & J124 first-person near-eye fade probes.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Must run inside shared game-test slot: node crew/crew.mjs slot run antigravity AG-287 ...');
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const OUT_QA = HERE;
const OUT_REV = path.join(ROOT, 'review/AG-287');
fs.mkdirSync(OUT_QA, { recursive: true });
fs.mkdirSync(OUT_REV, { recursive: true });

function writeRetry(filePath, data, retries = 30, delay = 200) {
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

async function takeCdpShot(page, name) {
  const qaPath = path.join(OUT_QA, name);
  const revPath = path.join(OUT_REV, name);
  await page.screenshot(qaPath);
  const buf = fs.readFileSync(qaPath);
  writeRetry(revPath, buf);
  return buf.length;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// 10 comprehensive eye-level walkthrough viewpoints covering every area of the Training Ground
// Coordinates (lx, lz) are local to TRAINING.ORIGIN (0, -200, -640); look target (tx, ty, tz) is also local (ty above floorY).
const AREAS = [
  {
    slug: '01-range-spawn-downrange',
    title: 'Firing Range: Spawn & Held Pistol Downrange',
    lx: 0.0, lz: -0.95, tx: 0.0, ty: 1.52, tz: 14.0,
    armed: true, doorOpen: false, withLayout: false
  },
  {
    slug: '02-range-lanes-targets',
    title: 'Firing Range: 5 Silhouette Lanes (8m-25m) & Bench Mesh',
    lx: 1.65, lz: -0.52, tx: -0.6, ty: 1.48, tz: 16.0,
    armed: false, doorOpen: false, withLayout: false
  },
  {
    slug: '03-range-backwall-lockers',
    title: 'Firing Range: Back Wall, Incident Board, Rifle Rack & Lockers',
    lx: -0.4, lz: -3.8, tx: -0.8, ty: 1.45, tz: -12.0,
    armed: false, doorOpen: false, withLayout: false
  },
  {
    slug: '04-range-east-stations',
    title: 'Firing Range: East Wall Stations (CIF, Supply Kiosk, Armory)',
    lx: 2.2, lz: -6.6, tx: 8.0, ty: 1.38, tz: -6.6,
    armed: false, doorOpen: false, withLayout: false
  },
  {
    slug: '05-range-console-switch-door',
    title: 'Firing Range: Range Console, Lights Switch & Security Door',
    lx: -3.2, lz: -5.8, tx: -8.0, ty: 1.42, tz: -7.6,
    armed: false, doorOpen: false, withLayout: false
  },
  {
    slug: '06-build-hangar-overview',
    title: 'Build Room: 24m Hangar Trusses, Columns, Lamps & Fence',
    lx: -12.2, lz: -7.5, tx: -30.0, ty: 4.8, tz: 12.0,
    armed: false, doorOpen: true, withLayout: false
  },
  {
    slug: '07-build-west-stations',
    title: 'Build Room: West Recesses (Skull Window & HQ Wave Panel)',
    lx: -35.5, lz: 0.0, tx: -44.0, ty: 1.45, tz: 0.2,
    armed: false, doorOpen: true, withLayout: false
  },
  {
    slug: '08-build-containment-gate',
    title: 'Build Room: Containment Gate, Hazard Paint & Wall Miniguns',
    lx: -26.0, lz: 11.5, tx: -26.0, ty: 1.85, tz: 28.0,
    armed: false, doorOpen: true, withLayout: false
  },
  {
    slug: '09-build-placed-layout',
    title: 'Build Room: Placed Defense Layout (Walls, Sandbags, Wire, Turret)',
    lx: -21.5, lz: -2.2, tx: -26.5, ty: 1.35, tz: 10.5,
    armed: false, doorOpen: true, withLayout: true
  },
  {
    slug: '10-build-infirmary-bay',
    title: 'Build Room: Field Infirmary (Stretcher, Cot, ECG, IV, Cabinet)',
    lx: -34.2, lz: -5.2, tx: -40.8, ty: 1.05, tz: -9.8,
    armed: false, doorOpen: true, withLayout: false
  }
];

// Targeted close-up inspections at eye/crouch height for every station, prop, keypad, fence & seam
const CLOSEUPS = [
  {
    slug: 'close-01-cif-station',
    title: 'Close-Up: CIF Station Copy (East Wall)',
    lx: 5.5, lz: -10.2, tx: 7.98, ty: 1.20, tz: -10.2,
    doorOpen: false, withLayout: false
  },
  {
    slug: 'close-02-kiosk-station',
    title: 'Close-Up: Supply Kiosk Terminal Copy (East Wall)',
    lx: 5.6, lz: -6.6, tx: 7.98, ty: 1.15, tz: -6.6,
    doorOpen: false, withLayout: false
  },
  {
    slug: 'close-03-armory-station',
    title: 'Close-Up: Armory Workbench & Weapon Rack Copy (East Wall)',
    lx: 5.2, lz: -3.0, tx: 7.98, ty: 1.22, tz: -3.0,
    doorOpen: false, withLayout: false
  },
  {
    slug: 'close-04-range-console-near',
    title: 'Close-Up (J124): Range Console at 0.40m in First Person',
    useRangeConsoleOffset: 0.40,
    doorOpen: false, withLayout: false
  },
  {
    slug: 'close-05-door-keypad-range',
    title: 'Close-Up (J104): Security Door Keypad & Lights Switch (Range Side)',
    lx: -6.7, lz: -8.9, tx: -7.95, ty: 1.35, tz: -9.5,
    doorOpen: false, withLayout: false
  },
  {
    slug: 'close-06-door-keypad-build',
    title: 'Close-Up (J104): Security Door Keypad (Build Room Side)',
    lx: -9.3, lz: -8.9, tx: -8.05, ty: 1.35, tz: -9.5,
    doorOpen: true, withLayout: false
  },
  {
    slug: 'close-07-east-fence-recess-1p',
    title: 'Close-Up (J124): Standing in Doorway Recess (x = -10.0) Looking at East Fence',
    lx: -10.0, lz: -8.0, tx: -10.0, ty: 1.45, tz: 2.0,
    doorOpen: true, withLayout: false
  },
  {
    slug: 'close-08-skull-window-recess-1p',
    title: 'Close-Up (J124/Scale): Standing at x = -42.0 Recess Looking at Skull Window & West Fence',
    lx: -42.0, lz: -3.0, tx: -43.98, ty: 1.32, tz: -2.0,
    doorOpen: true, withLayout: false
  },
  {
    slug: 'close-09-hq-panel-recess',
    title: 'Close-Up: HQ Wave Panel Copy Inside West Recess',
    lx: -41.4, lz: 3.0, tx: -43.98, ty: 1.35, tz: 3.0,
    doorOpen: true, withLayout: false
  },
  {
    slug: 'close-10-fence-post-baseplate',
    title: 'Close-Up (J128): Razor Perimeter Fence Post Baseplate & Floor Contact',
    lx: -11.4, lz: -4.2, tx: -10.0, ty: 0.18, tz: -4.2,
    doorOpen: true, withLayout: false
  },
  {
    slug: 'close-11-infirmary-bed-props',
    title: 'Close-Up (J128): Infirmary Stretcher Casters, Cot, IV Stand, O2 & ECG',
    lx: -37.2, lz: -7.8, tx: -41.2, ty: 0.72, tz: -10.0,
    doorOpen: true, withLayout: false
  },
  {
    slug: 'close-12-target-lane1-base',
    title: 'Close-Up (J128): Lane 1 Target Stand Base, Pivot Knuckle & Backing Frame',
    lx: 4.4, lz: -0.45, tx: 6.0, ty: 0.95, tz: 8.0,
    doorOpen: false, withLayout: false
  }
];

const LIGHTS = ['noon', 'overcast', 'dusk', 'night'];

async function main() {
  console.log('[AG-287] Starting HTTP server & launching RTX 5080 Chrome (1280x720)...');
  const server = await serve(ROOT, 0);
  const browser = await launch({
    headless: false,
    args: [
      '--window-position=-2400,-2400',
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

    await page.goto(`${server.origin}/index.html?debug=1`, { timeout: 180000 });
    const booted = await page.waitFor('!!(window.TT && window.TT.trainingDbg && window.TT.inspectHost)', { timeout: 180000 });
    if (!booted) throw new Error('Game failed to expose window.TT: ' + (page.errors[0] || 'timeout'));

    // Enter Training Ground cleanly & switch to First Person
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

      // Install light-preset hook on inspectHost so every tick & explicit render applies our exact 4-light preset
      const H = T.inspectHost();
      const THREE = H.THREE;
      window.__ag287Light = 'noon';
      window.__ag287ApplyLight = () => {
        const lk = window.__ag287Light;
        const tg = D.tg();
        if (!tg) return;
        const O = tg.origin;
        const { sun, hemi, ambientFill, moon, scene } = H;
        if (lk === 'noon') {
          sun.position.set(O.x + 28, O.y + 82, O.z + 36);
          sun.target.position.set(O.x - 14, O.y, O.z + 6);
          sun.target.updateMatrixWorld();
          sun.intensity = 3.25;
          sun.color.setHex(0xfff4dc);
          if (hemi) { hemi.intensity = 1.45; hemi.color.setHex(0xd8e8ff); hemi.groundColor.setHex(0x8e806a); }
          if (ambientFill) ambientFill.intensity = 0.28;
          if (moon) moon.intensity = 0;
          if (scene.fog && scene.fog.isFog) { scene.fog.color.setHex(0xc8daec); scene.fog.near = 90; scene.fog.far = 360; }
        } else if (lk === 'overcast') {
          sun.position.set(O.x - 18, O.y + 88, O.z - 12);
          sun.target.position.set(O.x - 14, O.y, O.z + 6);
          sun.target.updateMatrixWorld();
          sun.intensity = 0.55;
          sun.color.setHex(0xd8e2f0);
          if (hemi) { hemi.intensity = 2.15; hemi.color.setHex(0xc6d4e6); hemi.groundColor.setHex(0x707882); }
          if (ambientFill) ambientFill.intensity = 0.50;
          if (moon) moon.intensity = 0;
          if (scene.fog && scene.fog.isFog) { scene.fog.color.setHex(0x8d99a8); scene.fog.near = 14; scene.fog.far = 105; }
        } else if (lk === 'dusk') {
          sun.position.set(O.x - 78, O.y + 24, O.z + 42);
          sun.target.position.set(O.x - 14, O.y, O.z + 6);
          sun.target.updateMatrixWorld();
          sun.intensity = 2.65;
          sun.color.setHex(0xff8436);
          if (hemi) { hemi.intensity = 0.88; hemi.color.setHex(0xd89078); hemi.groundColor.setHex(0x463024); }
          if (ambientFill) ambientFill.intensity = 0.18;
          if (moon) moon.intensity = 0;
          if (tg.buildLamp) { tg.buildLamp.color.setHex(0xffbe86); tg.buildLamp.emissiveIntensity = 0.35; }
          if (scene.fog && scene.fog.isFog) { scene.fog.color.setHex(0x6e4538); scene.fog.near = 16; scene.fog.far = 115; }
        } else if (lk === 'night') {
          sun.position.set(O.x - 36, O.y + 68, O.z - 28);
          sun.target.position.set(O.x - 14, O.y, O.z + 6);
          sun.target.updateMatrixWorld();
          sun.intensity = 0.26;
          sun.color.setHex(0x6e92dc);
          if (hemi) { hemi.intensity = 0.24; hemi.color.setHex(0x3a4f86); hemi.groundColor.setHex(0x10141d); }
          if (ambientFill) ambientFill.intensity = 0.06;
          if (moon) moon.intensity = 0;
          if (scene.fog && scene.fog.isFog) { scene.fog.color.setHex(0x090d16); scene.fog.near = 10; scene.fog.far = 88; }
        }
      };
      H.attach({
        held: () => false,
        scale: (dt) => dt,
        frame: () => window.__ag287ApplyLight()
      });

      const gl = document.createElement('canvas').getContext('webgl2');
      const dbg = gl && gl.getExtension('WEBGL_debug_renderer_info');
      return {
        okActive, okBlackout, okFp,
        renderer: H.renderer?.constructor?.name || 'unknown',
        backend: T.getRendererBackend ? T.getRendererBackend() : 'unknown',
        gpu: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'unknown',
        canvasW: H.renderer?.domElement?.width,
        canvasH: H.renderer?.domElement?.height
      };
    })()`);
    console.log('[AG-287] Booted Training Ground:', JSON.stringify(initInfo));

    // Setup viewpoint, door, layout & lighting before taking CDP screenshot
    async function prepareView(spec, lightKey) {
      return page.evaluate(`(async () => {
        const spec = ${JSON.stringify(spec)};
        const lightKey = ${JSON.stringify(lightKey)};
        const T = window.TT;
        const D = T.trainingDbg;
        const H = T.inspectHost();
        const tg = D.tg();
        const O = tg.origin;
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));

        // 1. Security door state
        const st = D.state();
        const isDoorOpen = !!(st.security && st.security.read && st.security.read().open);
        if (!!spec.doorOpen !== isDoorOpen) {
          D.act('trainingDoor');
          for (let i = 0; i < 45; i++) T.stepFrame(1 / 60);
        }

        // 2. Placed layout state
        const hasLayout = (D.layoutPieces() || []).length > 0;
        if (!!spec.withLayout && !hasLayout) {
          D.layout();
          for (let i = 0; i < 10; i++) T.stepFrame(1 / 60);
        } else if (!spec.withLayout && hasLayout) {
          D.clearLayout();
          for (let i = 0; i < 5; i++) T.stepFrame(1 / 60);
        }

        // 3. Armed vs holstered
        const wantUnarmed = !spec.armed;
        if (T.isUnarmed() !== wantUnarmed) {
          T.toggleHolster();
          for (let i = 0; i < 25; i++) T.stepFrame(1 / 60);
        }

        // 4. Room light switch & flashlight for night vs day presets
        const wantLightsOff = lightKey === 'night';
        if (!!st.lightsOff !== wantLightsOff) {
          D.toggleLights();
        }
        if (lightKey === 'dusk' || lightKey === 'noon' || lightKey === 'overcast') {
          tg.setLights(true);
        }
        const flOn = !!(T.nightWarningsDbg && T.nightWarningsDbg.state().flashlight);
        if (wantLightsOff && !flOn) T.toggleFlashlightDbg();
        else if (!wantLightsOff && flOn) T.toggleFlashlightDbg();

        window.__ag287Light = lightKey;

        // 5. Position & first-person eye aim
        let px, pz, tx, ty, tz;
        if (spec.useRangeConsoleOffset != null) {
          const rc = tg.stations.rangeConsole;
          const nx = Math.sin(rc.yaw), nz = Math.cos(rc.yaw);
          px = rc.x + nx * spec.useRangeConsoleOffset;
          pz = rc.z + nz * spec.useRangeConsoleOffset;
          tx = rc.x; ty = 1.32; tz = rc.z;
        } else {
          px = O.x + spec.lx;
          pz = O.z + spec.lz;
          tx = O.x + spec.tx;
          ty = spec.ty;
          tz = O.z + spec.tz;
        }
        T.setViewFirstDbg(true);
        H.player.position.set(px, O.y, pz);
        T.setVelDbg(0, 0);
        const eyeY = O.y + 1.62;
        const dx = tx - px, dy = (O.y + ty) - eyeY, dz = tz - pz;
        const yaw = Math.atan2(dx, dz);
        const pitch = Math.atan2(dy, Math.hypot(dx, dz));
        T.setOtsAimDbg(yaw, pitch);

        // Step 24 frames so cutaway/perimeter opacity, flashlight aim & viewmodel settle completely
        for (let i = 0; i < 24; i++) {
          H.player.position.set(px, O.y, pz);
          T.setOtsAimDbg(yaw, pitch);
          T.stepFrame(1 / 60);
        }
        await wait(30);
        window.__ag287ApplyLight();
        await H.render();

        return {
          playerPos: [+(H.player.position.x - O.x).toFixed(3), +(H.player.position.y - O.y).toFixed(3), +(H.player.position.z - O.z).toFixed(3)],
          perimeterState: st.perimeter ? st.perimeter.state() : null
        };
      })()`);
    }

    // Step 1: Run comprehensive 3D Scene, Seating, Scale & J124 First-Person Opacity Audit!
    console.log('[AG-287] Running 3D Scene Seating, Scale & J124 First-Person Fade Audit...');
    const audit = await page.evaluate(`(async () => {
      const T = window.TT;
      const D = T.trainingDbg;
      const H = T.inspectHost();
      const THREE = H.THREE;
      const tg = D.tg();
      const O = tg.origin;
      const floorY = tg.floorY;

      function exactBounds(obj) {
        obj.updateWorldMatrix(true, true);
        const box = new THREE.Box3();
        const v = new THREE.Vector3();
        let meshes = 0;
        obj.traverse((m) => {
          if (!m.visible) return;
          if (m.isMesh && m.geometry?.attributes?.position) {
            meshes++;
            const pos = m.geometry.attributes.position;
            for (let i = 0; i < pos.count; i++) {
              v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
              box.expandByPoint(v);
            }
          }
        });
        if (box.isEmpty()) return null;
        return {
          meshes,
          minYRel: +(box.min.y - floorY).toFixed(4),
          maxYRel: +(box.max.y - floorY).toFixed(4),
          minXRel: +(box.min.x - O.x).toFixed(4),
          maxXRel: +(box.max.x - O.x).toFixed(4),
          minZRel: +(box.min.z - O.z).toFixed(4),
          maxZRel: +(box.max.z - O.z).toFixed(4),
          size: [
            +(box.max.x - box.min.x).toFixed(4),
            +(box.max.y - box.min.y).toFixed(4),
            +(box.max.z - box.min.z).toFixed(4)
          ]
        };
      }

      // Measure named groups in tg.group
      const namedBounds = {};
      const checkNames = [
        'training-cif', 'training-kiosk', 'training-armory',
        'training-hqPanel', 'training-skullWindow', 'training-range-console',
        'training-razor-perimeter', 'training-perimeter-west', 'training-perimeter-south', 'training-perimeter-east',
        'training-no-build-paint'
      ];
      for (const nm of checkNames) {
        const o = tg.group.getObjectByName(nm);
        if (o) namedBounds[nm] = exactBounds(o);
      }
      // Also measure all direct named children of tg.group
      const childSummary = [];
      for (const ch of tg.group.children) {
        const b = exactBounds(ch);
        if (b) childSummary.push({ name: ch.name || ch.type, ...b });
      }

      // Measure targets 0..4
      const targetBounds = tg.targets.map((t, idx) => ({
        lane: idx + 1,
        range: t.range,
        pivotBounds: exactBounds(t.pivot)
      }));

      // Measure placed layout pieces
      D.layout();
      for (let i = 0; i < 6; i++) T.stepFrame(1 / 60);
      const layoutBounds = (D.layoutPieces() || []).map((b) => ({
        kind: b.type || b.kind,
        tier: b.tier || 0,
        gx: b.gx, gz: b.gz,
        bounds: b.mesh ? exactBounds(b.mesh) : null
      }));
      D.clearLayout();
      for (let i = 0; i < 4; i++) T.stepFrame(1 / 60);

      // J124 First-Person Near-Eye Fade Sweep
      T.setViewFirstDbg(true);
      const st = D.state();
      if (!(st.security && st.security.read && st.security.read().open)) {
        D.act('trainingDoor');
        for (let i = 0; i < 40; i++) T.stepFrame(1 / 60);
      }

      const fadeProbes = [];
      const testFadeAt = (label, lx, lz, yaw = 0) => {
        for (let i = 0; i < 30; i++) {
          H.player.position.set(O.x + lx, floorY, O.z + lz);
          T.setOtsAimDbg(yaw, 0);
          T.stepFrame(1 / 60);
        }
        const perim = st.perimeter ? st.perimeter.state() : [];
        // Check rangeConsole opacity
        const rcGrp = tg.group.getObjectByName('training-range-console');
        let rcMinOp = 1;
        rcGrp && rcGrp.traverse((o) => {
          if (o.isMesh && o.material) {
            for (const m of (Array.isArray(o.material) ? o.material : [o.material])) {
              if (typeof m.opacity === 'number') rcMinOp = Math.min(rcMinOp, m.opacity);
            }
          }
        });
        // Check cutaway wall opacity
        let wallMinOp = 1;
        tg.group.traverse((o) => {
          if (o.isMesh && o.material && !o.name?.includes('perimeter') && o !== rcGrp) {
            for (const m of (Array.isArray(o.material) ? o.material : [o.material])) {
              if (m.transparent && typeof m.opacity === 'number' && m.opacity < 0.5 && m.opacity > 0.01) {
                wallMinOp = Math.min(wallMinOp, m.opacity);
              }
            }
          }
        });
        fadeProbes.push({
          label,
          localPos: [lx, lz],
          actualLocalPos: [+(H.player.position.x - O.x).toFixed(3), +(H.player.position.z - O.z).toFixed(3)],
          perimeter: perim,
          rangeConsoleMinOpacity: +rcMinOp.toFixed(3),
          otherLowOpacity: +wallMinOp.toFixed(3)
        });
      };

      testFadeAt('Range spawn', 0, -0.8, 0);
      const rc = tg.stations.rangeConsole;
      if (rc) {
        testFadeAt('Range Console 0.35m', (rc.x - O.x) + Math.sin(rc.yaw) * 0.35, (rc.z - O.z) + Math.cos(rc.yaw) * 0.35, rc.yaw + Math.PI);
      }
      testFadeAt('Build Room Doorway Recess (x=-10.0, z=-8.0)', -10.0, -8.0, 0);
      testFadeAt('Build Room Doorway Recess +0.08m (x=-9.92, z=-8.0)', -9.92, -8.0, 0);
      testFadeAt('Skull Window Recess (x=-42.0, z=-3.0)', -42.0, -3.0, 0);
      testFadeAt('HQ Panel Recess (x=-42.0, z=+3.0)', -42.0, 3.0, Math.PI);
      testFadeAt('Infirmary Corner Entrance (x=-34.5, z=-10.0)', -34.5, -10.0, Math.PI / 2);

      // Measure perimeter fence post vs baseplate bottom inside training-perimeter-east before bake (from geometry vertices)
      const perimEast = tg.group.getObjectByName('training-perimeter-east');
      let perimLowestYAboveZero = null;
      if (perimEast) {
        let minY = Infinity;
        const v = new THREE.Vector3();
        perimEast.traverse((m) => {
          if (m.isMesh && m.geometry?.attributes?.position) {
            const p = m.geometry.attributes.position;
            for (let i = 0; i < p.count; i++) {
              v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld);
              const ry = v.y - floorY;
              if (ry < minY) minY = ry;
            }
          }
        });
        perimLowestYAboveZero = +minY.toFixed(5);
      }

      return {
        namedBounds,
        childSummary,
        targetBounds,
        layoutBounds,
        fadeProbes,
        perimLowestYAboveZero
      };
    })()`);

    writeRetry(path.join(OUT_QA, 'audit.json'), Buffer.from(JSON.stringify(audit, null, 2), 'utf8'));
    writeRetry(path.join(OUT_REV, 'audit.json'), Buffer.from(JSON.stringify(audit, null, 2), 'utf8'));
    console.log('[AG-287] Saved 3D & J124 audit to qa/2026-11-10-AG-287/audit.json');

    // Step 2: Capture all 10 Areas x 4 Distinct Lights = 40 PNGs via CDP native screenshot
    const lightStats = {};
    for (const area of AREAS) {
      lightStats[area.slug] = {};
      for (const lk of LIGHTS) {
        const prep = await prepareView(area, lk);
        const fn = `area-${area.slug}-${lk}.png`;
        const bytes = await takeCdpShot(page, fn);
        lightStats[area.slug][lk] = { bytes, playerPos: prep.playerPos };
        console.log(`[AG-287] Shot ${fn} (${bytes} B)`);
      }
    }

    // Step 3: Capture 12 Targeted Close-Ups (in Noon + relevant comparison states)
    const closeupMeta = {};
    for (const cu of CLOSEUPS) {
      const prep = await prepareView(cu, 'noon');
      const fn = `${cu.slug}.png`;
      const bytes = await takeCdpShot(page, fn);
      closeupMeta[cu.slug] = { title: cu.title, playerPos: prep.playerPos, perimeterState: prep.perimeterState, bytes };
      console.log(`[AG-287] Close-up ${fn} (${bytes} B)`);
    }

    // Also capture a control shot right beside close-07 (at x = -10.35, 35 cm inside the room)
    const prepCtrl = await prepareView({
      slug: 'close-07b-east-fence-solid-1p',
      title: 'Control (x = -10.35): 35 cm West of Recess Plane — East Fence Solid (opacity 1.00)',
      lx: -10.35, lz: -8.0, tx: -10.0, ty: 1.45, tz: 2.0,
      doorOpen: true, withLayout: false
    }, 'noon');
    const ctrlBytes = await takeCdpShot(page, 'close-07b-east-fence-solid-1p.png');
    closeupMeta['close-07b-east-fence-solid-1p'] = {
      title: 'Control (x = -10.35): East Fence Solid',
      playerPos: prepCtrl.playerPos,
      perimeterState: prepCtrl.perimeterState,
      bytes: ctrlBytes
    };

    const meta = {
      capturedAt: new Date().toISOString(),
      initInfo,
      pageErrors: page.errors,
      lightStats,
      closeupMeta
    };
    writeRetry(path.join(OUT_QA, 'walkthrough-meta.json'), Buffer.from(JSON.stringify(meta, null, 2), 'utf8'));
    writeRetry(path.join(OUT_REV, 'walkthrough-meta.json'), Buffer.from(JSON.stringify(meta, null, 2), 'utf8'));
    console.log(`[AG-287] Complete! Page errors: ${page.errors.length}`);
    if (page.errors.length > 0) console.error('[AG-287] Page errors:', page.errors);
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
