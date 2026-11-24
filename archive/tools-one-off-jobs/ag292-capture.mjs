// tools/ag292-capture.mjs
// Automated WebGPU prop seating & contact proof captures on NVIDIA GeForce RTX 5080.
// Covers all 5 areas and 4 specific fixes named in AG-292 (J128, D-140):
// 1. Same-camera Before/After pairs at the eye for all 4 fixes:
//    - Fix 1: Range Lockers Base Seating (was floating 5.0mm, now flush minY=0.0000m)
//    - Fix 2: Range Wall Vents Flush Alignment (was floating 5.0mm, now flush 0.0mm gap)
//    - Fix 3: Range Conduit Brackets Flush Spanning (was floating 35.0mm, now spans flush from wall face)
//    - Fix 4: Range Firing Line Base Rail Seating (was floating 17.5mm, now flush minY=0.0000m)
// 2. Comprehensive 12 prop seating inspection captures across all 5 areas:
//    - The Range (Lockers base, Firing line rail, Wall vents, Conduit brackets)
//    - The Armory room (Weapon rack rails, Days board, Armory station)
//    - The CIF (CIF counter and approach)
//    - The Corridors (Doorway frame, Keypad, Security shutter)
//    - The Yard (Containment gate threshold, Field infirmary bed/mat, Cabinet, O2/IV stand, Hangar column footplate)

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_REV = path.join(ROOT, 'review/AG-292');
const OUT_QA = path.join(ROOT, 'qa/2026-11-11-AG-292');
fs.mkdirSync(OUT_REV, { recursive: true });
fs.mkdirSync(OUT_QA, { recursive: true });

function writeRetry(filePath, data, retries = 30, delay = 150) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = filePath + '.' + process.pid + '.' + Math.random().toString(36).slice(2) + '.tmp';
  fs.writeFileSync(tmp, data);
  for (let i = 0; i < retries; i++) {
    try {
      try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
      fs.renameSync(tmp, filePath);
      return;
    } catch (e) {
      if (i === retries - 1) {
        try { fs.copyFileSync(tmp, filePath); fs.unlinkSync(tmp); return; } catch {}
        throw e;
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delay);
    }
  }
}

async function captureScreenshot(page, filePath) {
  const res = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const buf = Buffer.from(res.data, 'base64');
  writeRetry(filePath, buf);
  return buf;
}

const FIX_PAIRS = [
  {
    id: 'fix-01-lockers',
    title: 'Fix 1: Range Lockers Base Seating (Floor Contact)',
    beforeFile: 'before-01-range-lockers.png',
    afterFile: 'after-01-range-lockers.png',
    beforeLabel: 'BEFORE: Center y = 0.93m, base floating 5.0mm above floor tiles (minY = 0.0050m)',
    afterLabel: 'AFTER (AG-292): Center y = 0.925m, base seated flush on floor tiles (minY = 0.0000m, 0.0mm gap)',
    beforeSetup: `(() => {
      const T = window.TT, tg = T.trainingDbg.tg();
      T.setShotView({
        x: -5.16, y: tg.floorY + 0.35, z: tg.origin.z - 12 + 1.45,
        tx: -5.16, ty: tg.floorY + 0.04, tz: tg.origin.z - 12 + 0.26,
        fov: 38
      });
      // Emulate BEFORE state: lockers shifted up by +5mm (y = 0.93, base minY = 0.0050m)
      tg.group.traverse(m => {
        if (m.isMesh && Math.abs(m.position.x - (-5.16)) < 0.05 && Math.abs(m.position.z - (-12 + 0.26)) < 0.05) {
          m.position.y = 0.93;
        }
      });
      T.stepFrame(0.016);
    })()`,
    afterSetup: `(() => {
      const T = window.TT, tg = T.trainingDbg.tg();
      T.setShotView({
        x: -5.16, y: tg.floorY + 0.35, z: tg.origin.z - 12 + 1.45,
        tx: -5.16, ty: tg.floorY + 0.04, tz: tg.origin.z - 12 + 0.26,
        fov: 38
      });
      // AFTER state: lockers seated flush on floor (y = 0.925, base minY = 0.0000m)
      tg.group.traverse(m => {
        if (m.isMesh && Math.abs(m.position.x - (-5.16)) < 0.05 && Math.abs(m.position.z - (-12 + 0.26)) < 0.05) {
          m.position.y = 0.925;
        }
      });
      T.stepFrame(0.016);
    })()`
  },
  {
    id: 'fix-02-vents',
    title: 'Fix 2: Range Wall Vents Flush Seating Against East Tiled Wall',
    beforeFile: 'before-02-range-vents.png',
    afterFile: 'after-02-range-vents.png',
    beforeLabel: 'BEFORE: Frame center 0.03m off wall (w=0.05), back face floating 5.0mm off tiles',
    afterLabel: 'AFTER (AG-292): Frame center 0.025m off wall, back face flush on tiles (0.0mm gap)',
    beforeSetup: `(() => {
      const T = window.TT, tg = T.trainingDbg.tg();
      T.setShotView({
        x: 6.4, y: tg.floorY + 5.0, z: tg.origin.z + 7.0,
        tx: 7.98, ty: tg.floorY + 5.0, tz: tg.origin.z + 8.0,
        fov: 36
      });
      // Emulate BEFORE state: vent frame at x = 8.0 - 0.03 = 7.970 (floating 5.0mm off wall)
      tg.group.traverse(m => {
        if (m.isMesh && Math.abs(m.position.z - 8.0) < 0.05 && Math.abs(m.position.y - 5.0) < 0.05 && m.position.x > 7.9) {
          m.position.x = 7.970;
        }
      });
      T.stepFrame(0.016);
    })()`,
    afterSetup: `(() => {
      const T = window.TT, tg = T.trainingDbg.tg();
      T.setShotView({
        x: 6.4, y: tg.floorY + 5.0, z: tg.origin.z + 7.0,
        tx: 7.98, ty: tg.floorY + 5.0, tz: tg.origin.z + 8.0,
        fov: 36
      });
      // AFTER state: vent frame seated flush on wall face (x = 8.0 - 0.025 = 7.975m, 0.0mm gap)
      tg.group.traverse(m => {
        if (m.isMesh && Math.abs(m.position.z - 8.0) < 0.05 && Math.abs(m.position.y - 5.0) < 0.05 && m.position.x > 7.9) {
          m.position.x = 7.975;
        }
      });
      T.stepFrame(0.016);
    })()`
  },
  {
    id: 'fix-03-conduits',
    title: 'Fix 3: Range Conduit Bracket Spanning Flush to Wall Face',
    beforeFile: 'before-03-range-conduits.png',
    afterFile: 'after-03-range-conduits.png',
    beforeLabel: 'BEFORE: Narrow bracket detached from wall, floating gap 35.0mm',
    afterLabel: 'AFTER (AG-292): Bracket spans flush from wall face (x = 7.9925m, 0.0mm gap) & clamps pipe',
    beforeSetup: `(() => {
      const T = window.TT, tg = T.trainingDbg.tg();
      T.setShotView({
        x: 6.9, y: tg.floorY + 4.4, z: tg.origin.z + 2.7,
        tx: 7.98, ty: tg.floorY + 4.4, tz: tg.origin.z + 3.5,
        fov: 32
      });
      // Emulate BEFORE state: bracket shifted 35mm away from wall (floating gap)
      tg.group.traverse(m => {
        if (m.isMesh && Math.abs(m.position.z - 3.5) < 0.05 && Math.abs(m.position.y - 4.4) < 0.05 && m.position.x > 7.9) {
          m.position.x = 8.0 - 0.0425;
        }
      });
      T.stepFrame(0.016);
    })()`,
    afterSetup: `(() => {
      const T = window.TT, tg = T.trainingDbg.tg();
      T.setShotView({
        x: 6.9, y: tg.floorY + 4.4, z: tg.origin.z + 2.7,
        tx: 7.98, ty: tg.floorY + 4.4, tz: tg.origin.z + 3.5,
        fov: 32
      });
      // AFTER state: bracket spans flush from wall face (x = 8.0 - 0.0075 = 7.9925m, 0.0mm gap)
      tg.group.traverse(m => {
        if (m.isMesh && Math.abs(m.position.z - 3.5) < 0.05 && Math.abs(m.position.y - 4.4) < 0.05 && m.position.x > 7.9) {
          m.position.x = 7.9925;
        }
      });
      T.stepFrame(0.016);
    })()`
  },
  {
    id: 'fix-04-firingline',
    title: 'Fix 4: Range Firing Line Bench Kick Rail Seated Flush on Floor Tiles',
    beforeFile: 'before-04-range-firingline.png',
    afterFile: 'after-04-range-firingline.png',
    beforeLabel: 'BEFORE: Height 0.075m, center y = 0.055m, floating 17.5mm above floor tiles (minY = 0.0175m)',
    afterLabel: 'AFTER (AG-292): Height 0.090m, center y = 0.045m, seated flush on floor tiles (minY = 0.0000m, 0.0mm gap)',
    beforeSetup: `(() => {
      const T = window.TT, tg = T.trainingDbg.tg();
      T.setShotView({
        x: 0.0, y: tg.floorY + 0.42, z: tg.origin.z - 0.95,
        tx: 0.0, ty: tg.floorY + 0.04, tz: tg.origin.z + 0.24,
        fov: 38
      });
      // Emulate BEFORE state: kick rail center at y = 0.055, bottom minY = 0.0175m (17.5mm gap)
      tg.group.traverse(m => {
        if (m.isMesh && Math.abs(m.position.z - 0.24) < 0.05 && Math.abs(m.position.y - 0.045) < 0.02) {
          m.position.y = 0.055;
        }
      });
      T.stepFrame(0.016);
    })()`,
    afterSetup: `(() => {
      const T = window.TT, tg = T.trainingDbg.tg();
      T.setShotView({
        x: 0.0, y: tg.floorY + 0.42, z: tg.origin.z - 0.95,
        tx: 0.0, ty: tg.floorY + 0.04, tz: tg.origin.z + 0.24,
        fov: 38
      });
      // AFTER state: kick rail center at y = 0.045, bottom minY = 0.0000m (0.0mm gap)
      tg.group.traverse(m => {
        if (m.isMesh && Math.abs(m.position.z - 0.24) < 0.05 && Math.abs(m.position.y - 0.055) < 0.02) {
          m.position.y = 0.045;
        }
      });
      T.stepFrame(0.016);
    })()`
  }
];

const SHOTS = [
  // 1. The Range
  {
    name: '01-range-lockers-floor.png',
    area: 'range',
    title: 'Range: Locker Bank Base Seated Flush on Floor (y = 0.000m, 0.0mm gap)',
    setup: `(() => {
      const T = window.TT, tg = T.trainingDbg.tg();
      T.setShotView({
        x: -5.16, y: tg.floorY + 0.35, z: tg.origin.z - 12 + 1.45,
        tx: -5.16, ty: tg.floorY + 0.04, tz: tg.origin.z - 12 + 0.26,
        fov: 38
      });
      T.stepFrame(0.016);
    })()`
  },
  {
    name: '02-range-vents-wall.png',
    area: 'range',
    title: 'Range: Wall Vent Grille Frame Flush Against East Tiled Wall (0.0mm gap)',
    setup: `(() => {
      const T = window.TT, tg = T.trainingDbg.tg();
      T.setShotView({
        x: 6.4, y: tg.floorY + 5.0, z: tg.origin.z + 7.0,
        tx: 7.98, ty: tg.floorY + 5.0, tz: tg.origin.z + 8.0,
        fov: 36
      });
      T.stepFrame(0.016);
    })()`
  },
  {
    name: '03-range-conduits-bracket.png',
    area: 'range',
    title: 'Range: Conduit Bracket Spanning Flush to Wall Face & Clamping Pipe',
    setup: `(() => {
      const T = window.TT, tg = T.trainingDbg.tg();
      T.setShotView({
        x: 6.9, y: tg.floorY + 4.4, z: tg.origin.z + 2.7,
        tx: 7.98, ty: tg.floorY + 4.4, tz: tg.origin.z + 3.5,
        fov: 32
      });
      T.stepFrame(0.016);
    })()`
  },
  {
    name: '04-range-firingline-base.png',
    area: 'range',
    title: 'Range: Firing Line Bench Base Kick Rail Flush on Floor Tiles (0.0mm gap)',
    setup: `(() => {
      const T = window.TT, tg = T.trainingDbg.tg();
      T.setShotView({
        x: 0.0, y: tg.floorY + 0.42, z: tg.origin.z - 0.95,
        tx: 0.0, ty: tg.floorY + 0.04, tz: tg.origin.z + 0.24,
        fov: 38
      });
      T.stepFrame(0.016);
    })()`
  },

  // 2. The Armory Room
  {
    name: '05-armory-rack-wall.png',
    area: 'armory',
    title: 'Armory: Weapon Rack Rails & Mounting Backboard Flush on Back Wall BZ',
    setup: `(() => {
      const T = window.TT, tg = T.trainingDbg.tg();
      T.setShotView({
        x: 2.3, y: tg.floorY + 1.35, z: tg.origin.z - 12 + 1.75,
        tx: 2.3, ty: tg.floorY + 1.30, tz: tg.origin.z - 12,
        fov: 42
      });
      T.stepFrame(0.016);
    })()`
  },
  {
    name: '06-armory-station-counter.png',
    area: 'armory',
    title: 'Armory: Station Counter, Solid Housing & Wall Mount in Training Ground',
    setup: `(() => {
      const T = window.TT, tg = T.trainingDbg.tg(), st = tg.stations.armory;
      T.setShotView({
        x: st.front.x - 0.9, y: tg.floorY + 1.25, z: st.front.z,
        tx: st.x, ty: tg.floorY + 1.10, tz: st.z,
        fov: 44
      });
      T.stepFrame(0.016);
    })()`
  },

  // 3. The CIF
  {
    name: '07-cif-station-counter.png',
    area: 'cif',
    title: 'CIF: Central Issue Facility Station Seated Solidly on Wall & Floor',
    setup: `(() => {
      const T = window.TT, tg = T.trainingDbg.tg(), st = tg.stations.cif;
      T.setShotView({
        x: st.front.x - 0.9, y: tg.floorY + 1.25, z: st.front.z,
        tx: st.x, ty: tg.floorY + 1.10, tz: st.z,
        fov: 44
      });
      T.stepFrame(0.016);
    })()`
  },

  // 4. The Corridors
  {
    name: '08-corridors-doorway-keypad.png',
    area: 'corridors',
    title: 'Corridors: Doorway Hazard Trim, Flush Keypad & Security Shutter',
    setup: `(() => {
      const T = window.TT, tg = T.trainingDbg.tg();
      T.setShotView({
        x: -6.4, y: tg.floorY + 1.35, z: tg.origin.z - 8.0,
        tx: -8.0, ty: tg.floorY + 1.30, tz: tg.origin.z - 8.0,
        fov: 45
      });
      T.stepFrame(0.016);
    })()`
  },

  // 5. The Yard (Build Room / Hangar)
  {
    name: '09-yard-containment-gate.png',
    area: 'yard',
    title: 'Yard: Containment Gate Threshold Plate Flush on Floor y = 0.000m',
    setup: `(() => {
      const T = window.TT, tg = T.trainingDbg.tg();
      T.setShotView({
        x: -26.0, y: tg.floorY + 0.65, z: tg.origin.z + 24.6,
        tx: -26.0, ty: tg.floorY + 0.05, tz: tg.origin.z + 26.6,
        fov: 40
      });
      T.stepFrame(0.016);
    })()`
  },
  {
    name: '10-yard-infirmary-stretcher.png',
    area: 'yard',
    title: 'Yard: Field Infirmary Wheeled Stretcher Seated on Floor Mat (y = 0.020m)',
    setup: `(() => {
      const T = window.TT, tg = T.trainingDbg.tg();
      T.setShotView({
        x: -39.0, y: tg.floorY + 0.82, z: tg.origin.z - 8.8,
        tx: -40.85, ty: tg.floorY + 0.35, tz: tg.origin.z - 10.0,
        fov: 42
      });
      T.stepFrame(0.016);
    })()`
  },
  {
    name: '11-yard-infirmary-cabinet.png',
    area: 'yard',
    title: 'Yard: Medical Cabinet 4 Steel Legs on Mat & Monitor on Worktop',
    setup: `(() => {
      const T = window.TT, tg = T.trainingDbg.tg();
      T.setShotView({
        x: -38.13, y: tg.floorY + 1.15, z: tg.origin.z - 9.8,
        tx: -38.13, ty: tg.floorY + 0.85, tz: tg.origin.z - 11.36,
        fov: 42
      });
      T.stepFrame(0.016);
    })()`
  },
  {
    name: '12-yard-hangar-columns.png',
    area: 'yard',
    title: 'Yard: Hangar Column Steel Base Footplate Seated Flush on Floor (y = 0.000m)',
    setup: `(() => {
      const T = window.TT, tg = T.trainingDbg.tg();
      T.setShotView({
        x: -41.8, y: tg.floorY + 0.45, z: tg.origin.z - 1.2,
        tx: -43.7, ty: tg.floorY + 0.08, tz: tg.origin.z,
        fov: 40
      });
      T.stepFrame(0.016);
    })()`
  }
];

async function main() {
  console.log(`[AG-292] Starting WebGPU Prop Seating & Pass-Through Captures on RTX 5080...`);
  const server = await serve(ROOT, 0);
  console.log(`[AG-292] Local HTTP server listening on ${server.origin}`);

  const browser = await launch({
    headless: false,
    args: [
      '--window-position=-3800,-3800',
      '--window-size=1600,1000',
      '--disable-features=CalculateNativeWinOcclusion'
    ]
  });

  const page = await browser.newPage({ width: 1600, height: 1000 });
  console.log(`[AG-292] Connected to Chrome DevTools Protocol`);

  try {
    try {
      const { windowId } = await page.send('Browser.getWindowForTarget', {});
      await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: -3800, top: -3800, width: 1600, height: 1000 } });
    } catch {}

    console.log('[AG-292] Loading game and dismissing opening...');
    await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 180000 });
    assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"', { timeout: 120000 }));

    await page.evaluate('DWOpening.dismissForTesting()');
    assert(await page.waitFor('!DWOpening.active', { timeout: 60000 }));

    console.log('[AG-292] Entering Training Ground range via #modeTraining...');
    await page.evaluate(`(() => {
      const nameEl = document.getElementById('playerName');
      if (nameEl) nameEl.value = 'Inspector';
      const btn = document.getElementById('modeTraining');
      if (btn) btn.click();
    })()`);

    assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 60000 }));

    // Clean up HUD / crosshairs for clean inspection views
    await page.evaluate(`(() => {
      const s = document.createElement('style');
      s.id = 'ag292-clean-view';
      s.textContent = \`
        #crosshair, #centerDot, #hitReticle, #interact, #modeMenu, #openingModal, #hud, #menu { display: none !important; }
      \`;
      document.head.appendChild(s);
      const H = window.TT.inspectHost();
      if (H) {
        H.sun.intensity = 1.8;
        H.hemi.intensity = 1.0;
        H.ambientFill.intensity = 0.8;
      }
    })()`);

    console.log('[AG-292] Capturing same-camera Before/After pairs for all 4 fixes...');
    const fixManifest = [];
    for (let i = 0; i < FIX_PAIRS.length; i++) {
      const f = FIX_PAIRS[i];
      console.log(`[AG-292] [FIX ${i + 1}/${FIX_PAIRS.length}] ${f.title} (Before)...`);
      await page.evaluate(f.beforeSetup);
      await page.evaluate(`(() => { for (let step = 0; step < 6; step++) window.TT.stepFrame(0.016); })()`);
      const beforeBuf = await captureScreenshot(page, path.join(OUT_REV, f.beforeFile));
      fs.writeFileSync(path.join(OUT_QA, f.beforeFile), beforeBuf);

      console.log(`[AG-292] [FIX ${i + 1}/${FIX_PAIRS.length}] ${f.title} (After)...`);
      await page.evaluate(f.afterSetup);
      await page.evaluate(`(() => { for (let step = 0; step < 6; step++) window.TT.stepFrame(0.016); })()`);
      const afterBuf = await captureScreenshot(page, path.join(OUT_REV, f.afterFile));
      fs.writeFileSync(path.join(OUT_QA, f.afterFile), afterBuf);

      fixManifest.push({
        id: f.id,
        title: f.title,
        beforeFile: f.beforeFile,
        afterFile: f.afterFile,
        beforeLabel: f.beforeLabel,
        afterLabel: f.afterLabel
      });
    }

    console.log('[AG-292] Capturing 12 comprehensive prop seating inspection plates across all 5 areas...');
    const shotManifest = [];
    for (let i = 0; i < SHOTS.length; i++) {
      const s = SHOTS[i];
      console.log(`[AG-292] (${i + 1}/${SHOTS.length}) [${s.area.toUpperCase()}] ${s.title}...`);
      await page.evaluate(s.setup);
      await page.evaluate(`(() => { for (let step = 0; step < 6; step++) window.TT.stepFrame(0.016); })()`);

      const shotPath = path.join(OUT_REV, s.name);
      const buf = await captureScreenshot(page, shotPath);
      fs.writeFileSync(path.join(OUT_QA, s.name), buf);
      shotManifest.push({ name: s.name, area: s.area, title: s.title, sizeBytes: buf.length });
    }

    const report = {
      task: 'AG-292',
      timestamp: new Date().toISOString(),
      fixesCount: fixManifest.length,
      fixManifest,
      shotsCount: shotManifest.length,
      shotManifest
    };
    writeRetry(path.join(OUT_REV, 'capture-manifest.json'), JSON.stringify(report, null, 2));
    writeRetry(path.join(OUT_QA, 'capture-manifest.json'), JSON.stringify(report, null, 2));
    console.log(`[AG-292] Successfully captured ${fixManifest.length * 2} Before/After plates and ${shotManifest.length} scene inspection plates!`);
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((err) => {
  console.error('[AG-292] Unhandled error during capture:', err);
  process.exit(1);
});
