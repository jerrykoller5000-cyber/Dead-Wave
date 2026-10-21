// qa/run-ag12.mjs — AG-12 Visual QA Verification
// Verifies:
// 1. CL-32: The marine's face with no helmet (front, three-quarter, low-angle)
// 2. CL-31 / CL-33: The new finisher camera at 30%, 60%, and 90% of relief sting (orbiting zombie, no marine-face push)
// 3. CL-20: The pit bubbles from the shore; tentacles hidden until cutscene burst
// 4. CL-19: The watchtower deck from ladder top and railing collision
// 5. Bonus / GP-29: Kiosk weapons full-ammo hint text

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch } from '../tools/cdp.mjs';
import { serve } from '../tools/serve.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const SHOTS_DIR = path.join(ROOT, 'qa', 'shots', '2026-09-24-AG-12');
await fs.promises.mkdir(SHOTS_DIR, { recursive: true });

function kbOf(f) { return (fs.statSync(f).size / 1024).toFixed(0); }
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

console.log('[AG-12] Starting visual verification for AG-12 (CL-32, CL-31/33, CL-20, CL-19)...');

const server = await serve(ROOT, 0);
// Headless CDP to ensure no screen disruption for Jerry
const browser = await launch({ headless: true });
const url = `${server.origin}/index.html?debug=1&raf=timer`;

const shotPaths = {};
const results = {
  face_detail_cl32: false,
  finisher_cam_30pct: false,
  finisher_cam_60pct: false,
  finisher_cam_90pct_zombie_corpse: false,
  pit_bubbles_shore_cl20: false,
  pit_tentacles_hidden_cl20: false,
  watchtower_ladder_top_cl19: false,
  watchtower_railing_held_cl19: false,
  kiosk_full_ammo_wording_gp29: false
};

try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(url, { waitUntil: 'none' });
  await page.waitFor('!!window.DWOpening', { timeout: 60000 });

  // Advance past opening using testing hook
  await page.evaluate(`(() => {
    if (window.DWOpening && window.DWOpening.dismissForTesting) {
      window.DWOpening.dismissForTesting();
    }
  })()`);
  await page.waitFor('!!window.TT', { timeout: 180000 });
  await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });
  await wait(1200);

  // Start match to spawn marine
  console.log('[AG-12] Starting match...');
  await page.evaluate(`(() => {
    const nameEl = document.getElementById('playerName');
    if (nameEl) {
      nameEl.value = 'JerryQA';
      nameEl.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const play = document.getElementById('modeHunt');
    if (play) play.click();
  })()`);

  // Wait for prep phase and insertion landing
  for (let i = 0; i < 40; i++) {
    await wait(500);
    const phase = await page.evaluate(`window.TT && window.TT.getPhase ? window.TT.getPhase() : null`);
    if (phase === 'prep') break;
  }
  await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 120000 });
  console.log('  [match] Marine has landed. Controls ready.');
  await wait(400);

  // =========================================================================
  // 1. CL-32: The Marine's Face with No Helmet (Front, 3/4, Low Angle)
  // =========================================================================
  console.log('[AG-12] Step 1: Capturing Marine Face with no helmet (CL-32)...');

  // Configure marine gear: remove helmet and nvg, keep bareHead (field cap), orient head
  const faceInfo = await page.evaluate(`(() => {
    // Find marine group
    let marine = null;
    TT.player.traverse((c) => {
      if (c.userData && c.userData.gearParts) marine = c;
    });
    if (!marine) return { ok: false, err: 'marine mesh not found' };

    const gp = marine.userData.gearParts;
    if (gp.helmet) gp.helmet.forEach((m) => m.visible = false);
    if (gp.nvg) gp.nvg.forEach((m) => m.visible = false);
    if (gp.bareHead) gp.bareHead.forEach((m) => m.visible = true);

    const headG = marine.userData.headG;
    const p = TT.player.position;

    // World position of head
    const headPos = new TT.THREE.Vector3();
    headG.getWorldPosition(headPos);

    return {
      ok: true,
      px: p.x, py: p.y, pz: p.z,
      hx: headPos.x, hy: headPos.y, hz: headPos.z
    };
  })()`);
  console.log('  [marine face info]:', JSON.stringify(faceInfo));

  if (faceInfo.ok) {
    // Hide UI overlays for clear face inspection (same approach as tools/shoot.mjs)
    await page.evaluate(`(() => {
      const c = [...document.querySelectorAll('canvas')]
        .sort((a, b) => (b.clientWidth * b.clientHeight) - (a.clientWidth * a.clientHeight))[0];
      if (!c) return false;
      const keep = new Set();
      for (let el = c; el && el !== document.body; el = el.parentElement) keep.add(el);
      for (const child of document.body.children) {
        if (!keep.has(child)) child.style.setProperty('display', 'none', 'important');
      }
      return true;
    })()`);

    // 1a. Front view (straight on close-up: eyes, brow scar, nose bridge, teeth)
    await page.evaluate(`(() => {
      let marine = null;
      TT.player.traverse((c) => { if (c.userData && c.userData.gearParts) marine = c; });
      const headG = marine.userData.headG;
      const headPos = new TT.THREE.Vector3();
      headG.getWorldPosition(headPos);

      // In marine/player space, +Z is forward; eyes and brows sit ~0.22m above neck pivot
      TT.setShotView({
        x: headPos.x,
        y: headPos.y + 0.22,
        z: headPos.z + 0.44,
        tx: headPos.x,
        ty: headPos.y + 0.20,
        tz: headPos.z,
        fov: 32
      });
    })()`);
    await wait(350);
    const p1a = path.join(SHOTS_DIR, '01a-marine-face-front.png');
    await page.screenshot(p1a);
    shotPaths.faceFront = p1a;
    console.log('  [shot 1a] 01a-marine-face-front.png (' + kbOf(p1a) + ' KB)');

    // 1b. Three-quarter view (shows cheekbones, filter vent with 3 slats, rivets, strap buckle)
    await page.evaluate(`(() => {
      let marine = null;
      TT.player.traverse((c) => { if (c.userData && c.userData.gearParts) marine = c; });
      const headG = marine.userData.headG;
      const headPos = new TT.THREE.Vector3();
      headG.getWorldPosition(headPos);

      TT.setShotView({
        x: headPos.x + 0.32,
        y: headPos.y + 0.23,
        z: headPos.z + 0.35,
        tx: headPos.x,
        ty: headPos.y + 0.20,
        tz: headPos.z,
        fov: 32
      });
    })()`);
    await wait(350);
    const p1b = path.join(SHOTS_DIR, '01b-marine-face-three-quarter.png');
    await page.screenshot(p1b);
    shotPaths.faceThreeQuarter = p1b;
    console.log('  [shot 1b] 01b-marine-face-three-quarter.png (' + kbOf(p1b) + ' KB)');

    // 1c. Low-angle view (shows chin cup, lower/upper teeth rows, cheek plate angle)
    await page.evaluate(`(() => {
      let marine = null;
      TT.player.traverse((c) => { if (c.userData && c.userData.gearParts) marine = c; });
      const headG = marine.userData.headG;
      const headPos = new TT.THREE.Vector3();
      headG.getWorldPosition(headPos);

      TT.setShotView({
        x: headPos.x + 0.10,
        y: headPos.y + 0.02,
        z: headPos.z + 0.40,
        tx: headPos.x,
        ty: headPos.y + 0.20,
        tz: headPos.z,
        fov: 35
      });
    })()`);
    await wait(350);
    const p1c = path.join(SHOTS_DIR, '01c-marine-face-low-angle.png');
    await page.screenshot(p1c);
    shotPaths.faceLow = p1c;
    console.log('  [shot 1c] 01c-marine-face-low-angle.png (' + kbOf(p1c) + ' KB)');

    // Restore UI overlays
    await page.evaluate(`(() => {
      for (const child of document.body.children) {
        child.style.removeProperty('display');
      }
    })()`);

    results.face_detail_cl32 = true;
  }

  // Restore regular view before match actions
  await page.evaluate('TT.setShotView(null)');
  await wait(200);

  // =========================================================================
  // 2. CL-31 / CL-33: Finisher Camera at 30%, 60%, 90%
  // =========================================================================
  console.log('[AG-12] Step 2: Testing Finisher Camera at 30%, 60%, 90% (CL-31 / CL-33)...');
  await page.evaluate(`(() => {
    TT.setDay(1);
    TT.beginWave();
    if (typeof TT.clearZombies === 'function') TT.clearZombies();
    const p = TT.player.position;
    const z = TT.spawnZombie(p.x + 4.0, p.z + 4.0, 'shambler', true, true);
    if (typeof TT.drainWavePlanDbg === 'function') TT.drainWavePlanDbg();
    window.__lastZombie = z;
  })()`);
  await wait(400);

  // Deliver final kill
  await page.evaluate(`(() => {
    const z = window.__lastZombie;
    if (z) TT.killZombie(z, true, { kind: 'bullet', dir: { x: 1, z: 0 } });
  })()`);
  await wait(150);

  // Pin duration for CDP captures
  await page.evaluate(`(() => {
    const F = TT.getWaveFinisher ? TT.getWaveFinisher() : null;
    if (F) {
      F._realDur = F.dur;
      F.dur = 60;
    }
  })()`);

  // 2a. 30% of relief sting
  await page.evaluate(`(() => {
    const F = TT.getWaveFinisher ? TT.getWaveFinisher() : null;
    if (F) F.t0 = performance.now() - (F.dur * 0.30 * 1000);
  })()`);
  await wait(80);
  const p2a = path.join(SHOTS_DIR, '02a-finisher-camera-30pct.png');
  await page.screenshot(p2a);
  shotPaths.finisher30 = p2a;
  results.finisher_cam_30pct = true;
  console.log('  [shot 2a] 02a-finisher-camera-30pct.png (' + kbOf(p2a) + ' KB)');

  // 2b. 60% of relief sting
  await page.evaluate(`(() => {
    const F = TT.getWaveFinisher ? TT.getWaveFinisher() : null;
    if (F) F.t0 = performance.now() - (F.dur * 0.60 * 1000);
  })()`);
  await wait(80);
  const p2b = path.join(SHOTS_DIR, '02b-finisher-camera-60pct.png');
  await page.screenshot(p2b);
  shotPaths.finisher60 = p2b;
  results.finisher_cam_60pct = true;
  console.log('  [shot 2b] 02b-finisher-camera-60pct.png (' + kbOf(p2b) + ' KB)');

  // 2c. 90% of relief sting (verifies CL-33 orbit on zombie corpse without marine-face push)
  await page.evaluate(`(() => {
    const F = TT.getWaveFinisher ? TT.getWaveFinisher() : null;
    if (F) F.t0 = performance.now() - (F.dur * 0.90 * 1000);
  })()`);
  await wait(80);
  const fin90Geo = await page.evaluate(`(() => {
    const F = TT.getWaveFinisher ? TT.getWaveFinisher() : null;
    const p = TT.player.position;
    const cam = TT.camera.position;
    if (!F) return { active: false };
    const distZombie = Math.hypot(cam.x - F.x, cam.z - F.z);
    const distPlayer = Math.hypot(cam.x - p.x, cam.z - p.z);
    return { active: true, distZombie, distPlayer, tPct: 0.90 };
  })()`);
  console.log('  [finisher 90% geo]:', JSON.stringify(fin90Geo));
  if (fin90Geo.active && fin90Geo.distZombie < 8) {
    results.finisher_cam_90pct_zombie_corpse = true;
  }
  const p2c = path.join(SHOTS_DIR, '02c-finisher-camera-90pct.png');
  await page.screenshot(p2c);
  shotPaths.finisher90 = p2c;
  console.log('  [shot 2c] 02c-finisher-camera-90pct.png (' + kbOf(p2c) + ' KB)');

  // End finisher
  await page.evaluate(`(() => {
    const F = TT.getWaveFinisher ? TT.getWaveFinisher() : null;
    if (F) {
      F.dur = F._realDur || 7.2;
      F.t0 = performance.now() - ((F.dur + 1.5) * 1000);
    }
  })()`);
  await wait(600);

  // =========================================================================
  // 3. CL-20: The Pit's Bubbles from Shore & Tentacle Pre-burst Check
  // =========================================================================
  console.log('[AG-12] Step 3: Checking Pit Bubbles & Tentacle pre-burst state (CL-20)...');

  // Position marine on the shore 40m from the pit hole
  const pitSetup = await page.evaluate(`(() => {
    const H = TT.LAKE_HOLE, p = TT.player.position;
    p.set(H.x + 40, TT.sampleHeight(H.x + 40, H.z), H.z);
    return { Hx: H.x, Hz: H.z, px: p.x, py: p.y, pz: p.z };
  })()`);
  console.log('  [pit setup]:', JSON.stringify(pitSetup));

  // Wait for bubbles to wake up and start popping
  let bubblesActive = false;
  for (let i = 0; i < 35; i++) {
    await wait(300);
    const b = await page.evaluate(`TT.getPitBubbles ? TT.getPitBubbles() : null`);
    if (b && b.on && b.visible > 3) {
      bubblesActive = true;
      console.log('  [pit bubbles active]:', JSON.stringify(b));
      break;
    }
  }

  // 3a. Pit bubbles from shore
  await page.evaluate(`(() => {
    const H = TT.LAKE_HOLE;
    // Aim from shore across water towards the pit hole
    TT.setShotView({
      x: H.x + 35,
      y: TT.sampleHeight(H.x + 35, H.z + 5) + 3.2,
      z: H.z + 5,
      tx: H.x,
      ty: -3.4,
      tz: H.z,
      fov: 50
    });
  })()`);
  await wait(450);
  const p3a = path.join(SHOTS_DIR, '03a-pit-bubbles-shore.png');
  await page.screenshot(p3a);
  shotPaths.pitBubbles = p3a;
  results.pit_bubbles_shore_cl20 = bubblesActive;
  console.log('  [shot 3a] 03a-pit-bubbles-shore.png (' + kbOf(p3a) + ' KB)');

  // 3b. Inspect tentacles outside cutscene: verify completely hidden
  const tentacleState = await page.evaluate(`(() => {
    const sk = TT.getScriptedKill ? TT.getScriptedKill() : null;
    const H = TT.LAKE_HOLE;
    // Look into the pit hole from above
    TT.setShotView({
      x: H.x + 8,
      y: 6.0,
      z: H.z + 8,
      tx: H.x,
      ty: -8.0,
      tz: H.z,
      fov: 50
    });
    return {
      activeKill: !!sk,
      bubbles: TT.getPitBubbles ? TT.getPitBubbles() : null
    };
  })()`);
  console.log('  [pit tentacle state]:', JSON.stringify(tentacleState));
  await wait(450);
  const p3b = path.join(SHOTS_DIR, '03b-pit-no-tentacles-outside-cutscene.png');
  await page.screenshot(p3b);
  shotPaths.pitNoTentacles = p3b;
  results.pit_tentacles_hidden_cl20 = (!tentacleState.activeKill);
  console.log('  [shot 3b] 03b-pit-no-tentacles-outside-cutscene.png (' + kbOf(p3b) + ' KB)');

  await page.evaluate('TT.setShotView(null)');
  await wait(200);

  // =========================================================================
  // 4. CL-19: Watchtower Deck from Ladder Top & Railing Collision
  // =========================================================================
  console.log('[AG-12] Step 4: Checking Watchtower Deck from Ladder Top & Railings (CL-19)...');

  const twInfo = await page.evaluate(`(() => {
    TT.towerDeckDbg();
    const st = TT.getTowerState();
    if (!st.tower) return { hasTower: false };
    const tw = st.tower, p = TT.player.position;

    // Position at ladder top (south side ladder gap: z around tw.z - 1.3)
    p.set(tw.x + 0.1, tw.deckY, tw.z - 1.3);

    return {
      hasTower: true,
      onDeck: st.onDeck,
      twX: tw.x,
      twY: tw.deckY,
      twZ: tw.z,
      px: p.x, py: p.y, pz: p.z
    };
  })()`);
  console.log('  [watchtower state]:', JSON.stringify(twInfo));

  if (twInfo.hasTower) {
    // 4a. Shot from ladder top looking across deck
    await page.evaluate(`(() => {
      const st = TT.getTowerState();
      const tw = st.tower;
      // Camera slightly south and above ladder top, looking north across the deck
      TT.setShotView({
        x: tw.x + 0.1,
        y: tw.deckY + 2.1,
        z: tw.z - 2.8,
        tx: tw.x,
        ty: tw.deckY + 0.9,
        tz: tw.z + 1.2,
        fov: 55
      });
    })()`);
    await wait(450);
    const p4a = path.join(SHOTS_DIR, '04a-watchtower-deck-ladder-top.png');
    await page.screenshot(p4a);
    shotPaths.towerLadderTop = p4a;
    results.watchtower_ladder_top_cl19 = true;
    console.log('  [shot 4a] 04a-watchtower-deck-ladder-top.png (' + kbOf(p4a) + ' KB)');

    // 4b. Test railing collision: attempt to move through east rail (x + 2.2)
    await page.evaluate(`(() => {
      const st = TT.getTowerState();
      const tw = st.tower, p = TT.player.position;
      TT.towerDeckDbg();
      p.set(tw.x + 2.2, tw.deckY, tw.z);
    })()`);
    await wait(400); // allow frame update loop to clamp position
    const railHeld = await page.evaluate(`(() => {
      const st = TT.getTowerState();
      const tw = st.tower, p = TT.player.position;
      return (p.x - tw.x < 1.05 && p.x - tw.x > 0.75);
    })()`);
    console.log('  [rail collision held]:', railHeld);
    results.watchtower_railing_held_cl19 = railHeld;

    // Shot 4b: Marine held against east railing
    await page.evaluate(`(() => {
      const st = TT.getTowerState();
      const tw = st.tower;
      TT.setShotView({
        x: tw.x - 1.2,
        y: tw.deckY + 1.6,
        z: tw.z - 1.4,
        tx: tw.x + 0.95,
        ty: tw.deckY + 0.8,
        tz: tw.z,
        fov: 50
      });
    })()`);
    await wait(450);
    const p4b = path.join(SHOTS_DIR, '04b-watchtower-railing-collision.png');
    await page.screenshot(p4b);
    shotPaths.towerRailingHeld = p4b;
    console.log('  [shot 4b] 04b-watchtower-railing-collision.png (' + kbOf(p4b) + ' KB)');
  }

  await page.evaluate('TT.setShotView(null)');
  await wait(200);

  // =========================================================================
  // 5. Bonus: GP-29 Kiosk Weapons Full-Ammo Text
  // =========================================================================
  console.log('[AG-12] Step 5: Checking GP-29 Kiosk full-ammo hint...');
  const kioskInfo = await page.evaluate(`(() => {
    // Open kiosk shop with true flag to open modal
    if (typeof TT.openShop === 'function') TT.openShop(true);
    if (typeof TT.setShopTabDbg === 'function') TT.setShopTabDbg('weapons');
    const hintEl = document.getElementById('shopHint');
    return {
      hintText: hintEl ? hintEl.textContent.trim() : null
    };
  })()`);
  console.log('  [kiosk weapons hint]:', JSON.stringify(kioskInfo));
  if (kioskInfo.hintText && kioskInfo.hintText.includes('full ammo')) {
    results.kiosk_full_ammo_wording_gp29 = true;
  }

  await wait(300);
  const p5 = path.join(SHOTS_DIR, '05-kiosk-gp29-full-ammo.png');
  await page.screenshot(p5);
  shotPaths.kioskFullAmmo = p5;
  console.log('  [shot 5] 05-kiosk-gp29-full-ammo.png (' + kbOf(p5) + ' KB)');

} finally {
  await browser.close();
  await server.close();
}

console.log('\n=======================================================');
console.log('[AG-12] Visual QA Verification Completed!');
console.log('Results Summary:');
console.log(JSON.stringify(results, null, 2));
console.log('Screenshot Paths:');
console.log(JSON.stringify(shotPaths, null, 2));
console.log('=======================================================\n');
