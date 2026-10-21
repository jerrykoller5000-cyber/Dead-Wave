// qa/run-ag3.mjs — AG-3: Grokbot's build fixes in real play
// Tests:
//   (a) Put a turret on a low pillar by aiming at it from the side (GB-7)
//   (b) Standing on the ground inside four walls, aim a floor at the wall tops: do you get a roof or a walkway at your feet? (GB-8)

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch } from '../tools/cdp.mjs';
import { serve } from '../tools/serve.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const WIDTH = 1280, HEIGHT = 720;
const OUT_DIR = path.join(ROOT, 'qa', 'shots', '2026-09-23-AG-3');
await fs.promises.mkdir(OUT_DIR, { recursive: true });

let server = null;
let origin = 'http://127.0.0.1:8971';
try {
  const res = await fetch(`${origin}/index.html`);
  if (!res.ok) throw new Error('not ok');
} catch {
  server = await serve(ROOT, 8971);
  origin = server.origin;
}

const browser = await launch({ headless: false }); // Headed on Jerry's real GPU
const page = await browser.newPage({ width: WIDTH, height: HEIGHT });

try {
  const url = `${origin}/index.html?debug=1&raf=timer`;
  console.log(`[AG-3] Loading ${url} on real GPU...`);
  await page.goto(url);

  // Skip opening to enter game
  await page.waitFor('!!window.DWOpening', { timeout: 60000 });
  for (let i = 0; i < 2; i++) {
    await page.evaluate(`(() => { const b = document.getElementById('openingSkip'); if (b) b.click(); return true; })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 250))');
  }
  await page.waitFor('!!window.TT', { timeout: 300000 });
  await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });
  console.log('[AG-3] Title screen reached. Starting match...');

  // Start match into prep
  await page.evaluate(`(() => {
    document.getElementById('playerName').value = 'QA-Builds';
    document.getElementById('modeHunt').click();
  })()`);

  await page.waitFor('window.TT.getPhase && window.TT.getPhase() === "prep"', { timeout: 30000 });
  console.log('[AG-3] Entered prep mode. Waiting out insertion...');

  // Wait 10s for insertion cine to finish and control to unlock
  await page.evaluate('new Promise(r => setTimeout(r, 10000))');
  console.log('[AG-3] Controls ready.');

  // Setup funds and unlocked builds on an open, leveled piece of land
  await page.evaluate(`(() => {
    TT.unlockAllBuilds();
    TT.addCash(100000);
    // Move to open test area
    const tx = 20, tz = -25;
    TT.player.position.set(tx, TT.sampleHeight(tx, tz), tz);
    const pgx = TT.gridIndex(tx), pgz = TT.gridIndex(tz);
    TT.levelGroundRect(TT.gridCentre(pgx - 6), TT.gridCentre(pgz - 6), TT.gridCentre(pgx + 6), TT.gridCentre(pgz + 6), TT.sampleHeight(tx, tz), 8);
  })()`);

  // Helper for taking screenshots
  async function shoot(filename, spec, worldTime = 0.4) {
    if (spec) {
      await page.evaluate(`TT.setShotView(${JSON.stringify(spec)})`);
    } else {
      await page.evaluate('TT.setShotView(null)');
    }
    await page.evaluate(`TT.setWorldTime(${worldTime})`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');
    const f = path.join(OUT_DIR, filename);
    await page.screenshot(f);
    console.log(`  Saved shot ${filename} (${(fs.statSync(f).size / 1024).toFixed(0)} KB)`);
  }

  // ==========================================
  // PART A: TURRET ON LOW PILLAR FROM SIDE AIM (GB-7)
  // ==========================================
  console.log('\n[AG-3] === Testing Part A: Turret on Low Pillar from Side Aim ===');

  const pillarSetup = await page.evaluate(`(() => {
    const p = TT.player.position;
    const pgx = TT.gridIndex(p.x), pgz = TT.gridIndex(p.z);
    const X = pgx + 2, Z = pgz - 2;
    // Place low pillar at corner
    const pil = TT.placeBuildAt('pillar', X, Z);
    return {
      pillarPlaced: !!pil,
      x: pil.x,
      z: pil.z,
      meshY: pil.mesh.position.y
    };
  })()`);
  console.log('  Placed pillar:', pillarSetup);

  // Position player to the side of the pillar
  await page.evaluate(`(() => {
    const pil = TT.builds.find(b => b.type === 'pillar');
    const px = pil.x - 3.5, pz = pil.z;
    const py = TT.sampleHeight(px, pz);
    TT.player.position.set(px, py, pz);
  })()`);

  // Camera looking at the pillar from the side
  const pillarCam = await page.evaluate(`(() => {
    const pil = TT.builds.find(b => b.type === 'pillar');
    return {
      x: pil.x - 5,
      y: pil.mesh.position.y + 2.5,
      z: pil.z - 4,
      tx: pil.x,
      ty: pil.mesh.position.y + 1.2,
      tz: pil.z,
      fov: 50
    };
  })()`);

  await shoot('pillar-alone.png', pillarCam);

  // Aim at the pillar from the side (shallow eye-to-cap aim)
  const aimTest = await page.evaluate(`(() => {
    const pil = TT.builds.find(b => b.type === 'pillar');
    TT.setPlaceMode('heavy');
    const px = pil.x - 3.5, pz = pil.z;
    const py = TT.player.position.y;
    // Aim ray from side toward pillar cap/shaft
    TT.setAimRay(px, py + 0.3, pz, 3.5, (pil.mesh.position.y + 1.6) - (py + 0.3), 0);
    TT.updateGhostPreview();
    const ppt = TT.getPlacePoint();
    return {
      hitType: ppt.hit ? ppt.hit.type : 'none',
      valid: TT.getGhostValid ? TT.getGhostValid() : null
    };
  })()`);
  console.log('  Side-aim preview result:', aimTest);

  // Capture ghost preview on pillar
  await shoot('pillar-turret-aim-preview.png', pillarCam);

  // Commit placement
  const placeResult = await page.evaluate(`(() => {
    const n0 = TT.builds.length;
    TT.tryPlace();
    const newBuild = TT.builds[TT.builds.length - 1];
    const pil = TT.builds.find(b => b.type === 'pillar');
    return {
      placed: TT.builds.length === n0 + 1,
      type: newBuild ? newBuild.type : null,
      slot: newBuild ? newBuild.slot : null,
      isOnPillar: newBuild && Math.abs(newBuild.x - pil.x) < 0.1 && Math.abs(newBuild.z - pil.z) < 0.1
    };
  })()`);
  console.log('  Turret placement on pillar:', placeResult);

  // Screenshot turret mounted on pillar
  await shoot('pillar-turret-mounted.png', pillarCam);

  // ==========================================
  // PART B: ROOF FROM GROUND AIM INSIDE 4 WALLS (GB-8)
  // ==========================================
  console.log('\n[AG-3] === Testing Part B: Roof from Ground Aim Inside 4 Walls ===');

  // Clear existing test builds
  await page.evaluate(`(() => {
    for (const b of TT.builds.slice()) {
      if (b.type === 'pillar' || b.type === 'heavy' || b.type === 'wall' || b.type === 'floor') {
        TT.removeBuild(b);
      }
    }
  })()`);

  // Build a 1-cell walled enclosure (4 walls around grid cell [gx, gz])
  const wallRoom = await page.evaluate(`(() => {
    const p = TT.player.position;
    const gx = TT.gridIndex(p.x), gz = TT.gridIndex(p.z);
    
    // Build 4 perimeter walls enclosing cell (gx, gz)
    // Edge walls around cell (gx, gz):
    const wN = TT.placeBuildAt('wall', gx, gz - 1);
    const wS = TT.placeBuildAt('wall', gx, gz + 1);
    const wW = TT.placeBuildAt('wall', gx - 1, gz);
    const wE = TT.placeBuildAt('wall', gx + 1, gz);

    // Stand player inside the 4 walls at ground level
    const cx = TT.gridCentre(gx), cz = TT.gridCentre(gz);
    const cy = TT.sampleHeight(cx, cz);
    TT.player.position.set(cx, cy, cz);

    return {
      gx, gz, cx, cy,
      walls: [wN, wS, wW, wE].map(w => w ? { id: w.id, type: w.type, y: w.mesh.position.y } : null)
    };
  })()`);
  console.log('  Walled room built around grounded player:', wallRoom);

  // Camera inside the walled room looking up toward wall tops
  const insideCam = {
    x: wallRoom.cx - 0.5,
    y: wallRoom.cy + 1.2,
    z: wallRoom.cz - 0.5,
    tx: wallRoom.cx + 0.5,
    ty: wallRoom.cy + 2.4,
    tz: wallRoom.cz + 0.5,
    fov: 65
  };
  await shoot('four-walls-inside-ground.png', insideCam);

  // Camera outside looking down into the room
  const outsideCam = {
    x: wallRoom.cx + 4,
    y: wallRoom.cy + 5,
    z: wallRoom.cz + 4,
    tx: wallRoom.cx,
    ty: wallRoom.cy + 1.5,
    tz: wallRoom.cz,
    fov: 50
  };
  await shoot('four-walls-outside.png', outsideCam);

  // Aim a floor at the wall tops from the ground inside the room
  const floorAimTest = await page.evaluate(`(() => {
    const gx = TT.gridIndex(TT.player.position.x), gz = TT.gridIndex(TT.player.position.z);
    const cx = TT.gridCentre(gx), cz = TT.gridCentre(gz);
    const py = TT.player.position.y;
    
    // Find wall height
    const w = TT.builds.find(b => b.type === 'wall');
    const wallTopY = w.mesh.position.y + 2.0;

    TT.setPlaceMode('floor');
    // Aim ray from player eye height up toward the top of the wall
    TT.setAimRay(cx, py + 1.6, cz, 0.8, wallTopY - (py + 1.6), 0.8);
    TT.updateGhostPreview();
    const ppt = TT.getPlacePoint();
    return {
      pptLv: ppt ? ppt.lv : null,
      valid: TT.getGhostValid ? TT.getGhostValid() : null,
      targetCell: ppt ? { gx: ppt.gx, gz: ppt.gz } : null
    };
  })()`);
  console.log('  Floor aim preview from ground inside room:', floorAimTest);

  await shoot('four-walls-floor-aim-preview.png', insideCam);

  // Commit floor placement
  const floorPlaceResult = await page.evaluate(`(() => {
    const n0 = TT.builds.length;
    TT.tryPlace();
    const placed = TT.builds.slice(n0).filter(b => b.type === 'floor');
    const fl = placed[0];
    return {
      count: placed.length,
      level: fl ? fl.level : null,
      posY: fl ? fl.mesh.position.y : null,
      isRoof: fl && fl.level === 1,
      isBoardwalk: fl && fl.level === 0
    };
  })()`);
  console.log('  Floor placement result:', floorPlaceResult);

  // Screenshot from inside showing roof overhead
  await shoot('four-walls-roof-from-inside.png', insideCam);

  // Screenshot from outside showing complete roof on top of the walls
  await shoot('four-walls-roof-from-outside.png', outsideCam);

  // Reset shot view
  await page.evaluate('TT.setShotView(null)');
  console.log('\n[AG-3] All checks and screenshots finished successfully!');

} finally {
  await browser.close();
  if (server) await server.close();
}
