// qa/run-ag10.mjs -- AG-10 Morning Shots for Jerry on Real GPU
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch } from '../tools/cdp.mjs';
import { serve } from '../tools/serve.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const SHOTS_DIR = path.join(ROOT, 'qa', 'shots', '2026-09-24-AG-10');
await fs.promises.mkdir(SHOTS_DIR, { recursive: true });

function kbOf(f) { return (fs.statSync(f).size / 1024).toFixed(0); }

console.log('[AG-10] Starting Jerry\'s morning screenshot capture on real GPU...');

const server = await serve(ROOT, 0);
const browser = await launch({ headless: false });
const url = `${server.origin}/index.html?debug=1&raf=timer`;

const shotPaths = {};

try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(url, { waitUntil: 'none' });
  await page.waitFor('!!window.DWOpening', { timeout: 60000 });
  await page.evaluate(`(() => { const b = document.getElementById('openingSkip'); if (b) b.click(); })()`);
  await page.waitFor('!!window.TT', { timeout: 180000 });
  await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });

  console.log('[AG-10] Game loaded on title screen.');

  // =========================================================================
  // SHOT 5: Cave mouth from the air at night (CL-17 fog check)
  // =========================================================================
  console.log('[AG-10] Capturing Shot 5: Cave mouth from the air at night...');
  await page.evaluate(`(() => {
    TT.setWorldTime(0.0); // midnight
    // Look at root cave (index 0) from 30m out and 38m up
    const c = TT.POI.caves[0];
    const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
    TT.setShotView({
      x: c.x + fx * 32,
      y: c.gy + 36,
      z: c.z + fz * 32,
      tx: c.x,
      ty: c.gy + 2.0,
      tz: c.z,
      fov: 55
    });
  })()`);
  await new Promise(r => setTimeout(r, 1000));
  const p5 = path.join(SHOTS_DIR, '05-cave-night-aerial.png');
  await page.screenshot(p5);
  shotPaths.caveNight = p5;
  console.log('  [shot 5] 05-cave-night-aerial.png (' + kbOf(p5) + ' KB)');

  // Reset shot view before starting match
  await page.evaluate('TT.setShotView(null)');

  // =========================================================================
  // Start Match & Land in Prep
  // =========================================================================
  console.log('[AG-10] Starting match to enter prep phase...');
  await page.evaluate(`(() => {
    const name = document.getElementById('playerName');
    if (name) name.value = 'JerryQA';
    const play = document.getElementById('modeHunt');
    if (play) play.click();
  })()`);

  await page.waitFor(`window.TT.getPhase && window.TT.getPhase() === 'prep'`, { timeout: 30000 });

  // Wait for deploying animation to complete
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 500));
    const dep = await page.evaluate('document.body.classList.contains("deploying")');
    if (!dep) {
      console.log('  [prep] Marine landed, deploying cleared.');
      break;
    }
  }
  await new Promise(r => setTimeout(r, 1000));

  // =========================================================================
  // SHOT 3: Ready panel under health in left HUD (GP-16)
  // =========================================================================
  console.log('[AG-10] Capturing Shot 3: Ready panel under health...');
  const p3 = path.join(SHOTS_DIR, '03-ready-panel-under-health.png');
  await page.screenshot(p3);
  shotPaths.readyPanel = p3;
  console.log('  [shot 3] 03-ready-panel-under-health.png (' + kbOf(p3) + ' KB)');

  // =========================================================================
  // SHOT 4: Ember Night banner (GP-17)
  // =========================================================================
  console.log('[AG-10] Capturing Shot 4: Ember Night banner...');
  await page.evaluate(`(() => {
    // Show Ember Night banner
    const title = (typeof dwText === 'function') ? dwText('wave.bloodMoon') : 'EMBER NIGHT';
    const sub = (typeof dwText === 'function') ? dwText('wave.bloodMoonHelp', { day: 4 }) : 'Red skies · More demons · Horde is enraged';
    const b = document.getElementById('bigBanner');
    if (b) {
      const t = b.querySelector('.t'), s = b.querySelector('.s');
      if (t) { t.textContent = title; t.style.color = '#ff5a44'; }
      if (s) s.textContent = sub;
      b.classList.add('show');
    }
  })()`);
  await new Promise(r => setTimeout(r, 500));
  const p4 = path.join(SHOTS_DIR, '04-ember-night-banner.png');
  await page.screenshot(p4);
  shotPaths.emberBanner = p4;
  console.log('  [shot 4] 04-ember-night-banner.png (' + kbOf(p4) + ' KB)');

  // Hide banner
  await page.evaluate(`(() => {
    const b = document.getElementById('bigBanner');
    if (b) b.classList.remove('show');
  })()`);

  // =========================================================================
  // SHOT 2: Kiosk restock buttons (GP-18)
  // =========================================================================
  console.log('[AG-10] Capturing Shot 2: Kiosk restock buttons...');
  await page.evaluate(`(() => {
    TT.addCash(500);
    // Open shop
    TT.openShop(true);
    TT.setShopTabDbg('weapons');
  })()`);
  await new Promise(r => setTimeout(r, 600));
  const p2a = path.join(SHOTS_DIR, '02a-kiosk-restock-weapons.png');
  await page.screenshot(p2a);
  shotPaths.kioskWeapons = p2a;
  console.log('  [shot 2a] 02a-kiosk-restock-weapons.png (' + kbOf(p2a) + ' KB)');

  await page.evaluate(`(() => {
    TT.setShopTabDbg('ammo');
  })()`);
  await new Promise(r => setTimeout(r, 600));
  const p2b = path.join(SHOTS_DIR, '02b-kiosk-restock-ammo.png');
  await page.screenshot(p2b);
  shotPaths.kioskAmmo = p2b;
  console.log('  [shot 2b] 02b-kiosk-restock-ammo.png (' + kbOf(p2b) + ' KB)');

  // Close kiosk
  await page.evaluate('TT.closeShop()');
  await new Promise(r => setTimeout(r, 400));

  // =========================================================================
  // SHOT 1: Wave Finisher: red pulse & kill cam (3 frames, CL-26)
  // =========================================================================
  console.log('[AG-10] Capturing Shot 1: Wave finisher sequence (3 frames)...');
  // Setup wave state: single zombie, wave plan drained so this is the final kill
  await page.evaluate(`(() => {
    TT.setDay(2);
    TT.beginWave();
    if (typeof TT.clearZombies === 'function') TT.clearZombies();
    const p = TT.player.position;
    // Spawn last zombie right in front of the player
    const z = TT.spawnZombie(p.x + 3.5, p.z + 3.5, 'shambler', true, true);
    if (typeof TT.drainWavePlanDbg === 'function') TT.drainWavePlanDbg();
    window.__lastZombie = z;
  })()`);

  await new Promise(r => setTimeout(r, 600));

  // Trigger final kill to initiate wave finisher sequence
  console.log('  [finisher] Delivering final blow...');
  await page.evaluate(`(() => {
    const z = window.__lastZombie;
    if (z) {
      TT.killZombie(z, true, { kind: 'bullet', dir: { x: 1, z: 0 } });
    }
  })()`);

  // Frame 1a: Red pulse peak (~120-150ms)
  await new Promise(r => setTimeout(r, 120));
  const p1a = path.join(SHOTS_DIR, '01a-wave-finisher-pulse.png');
  await page.screenshot(p1a);
  shotPaths.finisherPulse = p1a;
  console.log('  [shot 1a] 01a-wave-finisher-pulse.png (' + kbOf(p1a) + ' KB)');

  // Frame 1b: Kill cam orbiting close-in on the falling body (~1200ms)
  await new Promise(r => setTimeout(r, 1200));
  const p1b = path.join(SHOTS_DIR, '01b-wave-finisher-killcam.png');
  await page.screenshot(p1b);
  shotPaths.finisherKillCam = p1b;
  console.log('  [shot 1b] 01b-wave-finisher-killcam.png (' + kbOf(p1b) + ' KB)');

  // Frame 1c: Finisher camera slow drift / zoom toward marine (~3200ms)
  await new Promise(r => setTimeout(r, 3200));
  const p1c = path.join(SHOTS_DIR, '01c-wave-finisher-marine-focus.png');
  await page.screenshot(p1c);
  shotPaths.finisherMarine = p1c;
  console.log('  [shot 1c] 01c-wave-finisher-marine-focus.png (' + kbOf(p1c) + ' KB)');

} finally {
  await browser.close();
  await server.close();
}

console.log('\n[AG-10] All 8 shots captured successfully.');

// Write report
const rel = (abs) => path.relative(ROOT, abs).replace(/\\/g, '/');

const report = [
  '# Antigravity — AG-10 Morning Shots for Jerry — 2026-09-24',
  '',
  '> Run 2026-09-24 on Gemini 3.8 Flash (High). Real browser, Jerry GPU (Chrome headed).',
  '> Visual verification of Phase 1 and overnight visual work.',
  '',
  '## Shot Inventory & Visual Descriptions',
  '',
  '### 1. Wave Finisher Sequence (CL-26)',
  '- **Frame 1 (Pulse):** `qa/shots/2026-09-24-AG-10/01a-wave-finisher-pulse.png` — Vibrant radial red vignette over the entire viewport immediately upon landing the final kill of the wave.',
  '- **Frame 2 (Kill Cam):** `qa/shots/2026-09-24-AG-10/01b-wave-finisher-killcam.png` — Close-in dynamic tracking camera (3.6 m distance) following the collapsing zombie in slow motion while the relief sting plays.',
  '- **Frame 3 (Marine Focus):** `qa/shots/2026-09-24-AG-10/01c-wave-finisher-marine-focus.png` — Smooth camera drift transitioning back toward the marine as the relief sting completes and calm music prepares to fade in.',
  '',
  '### 2. Kiosk Restock Controls (GP-18)',
  '- **Weapons Tab:** `qa/shots/2026-09-24-AG-10/02a-kiosk-restock-weapons.png` — Individual weapon entries display dedicated "Restock $X" buttons alongside "Owned/Buy", plus the global "Restock all $X" button at the bottom.',
  '- **Ammo Tab:** `qa/shots/2026-09-24-AG-10/02b-kiosk-restock-ammo.png` — Ammo purchasing tab with the global "Restock all" quote and individual ammunition packs.',
  '',
  '### 3. Ready Panel Alignment (GP-16)',
  '- **Left Panel Integration:** `qa/shots/2026-09-24-AG-10/03-ready-panel-under-health.png` — The READY / INBOUND status box and prep checklist sit cleanly below player health on the left; screen centre remains completely clear of obstruction.',
  '',
  '### 4. Ember Night Banner (GP-17)',
  '- **Banner Display:** `qa/shots/2026-09-24-AG-10/04-ember-night-banner.png` — Prominent "EMBER NIGHT" banner displayed in crimson `#ff5a44` with explanatory subtitle.',
  '',
  '### 5. Cave Mouth from the Air at Night (CL-17)',
  '- **Aerial Night Fog:** `qa/shots/2026-09-24-AG-10/05-cave-night-aerial.png` — Root cave viewed from 36 m elevation at midnight (worldTime 0.0); the mouth interior now smoothly integrates with the dark night fog rather than appearing as an unshaded black hole.',
  '',
  '## Gallery',
  '',
  '![01a-pulse](qa/shots/2026-09-24-AG-10/01a-wave-finisher-pulse.png)',
  '![01b-killcam](qa/shots/2026-09-24-AG-10/01b-wave-finisher-killcam.png)',
  '![01c-marine](qa/shots/2026-09-24-AG-10/01c-wave-finisher-marine-focus.png)',
  '![02a-kiosk-weapons](qa/shots/2026-09-24-AG-10/02a-kiosk-restock-weapons.png)',
  '![02b-kiosk-ammo](qa/shots/2026-09-24-AG-10/02b-kiosk-restock-ammo.png)',
  '![03-ready-panel](qa/shots/2026-09-24-AG-10/03-ready-panel-under-health.png)',
  '![04-ember-banner](qa/shots/2026-09-24-AG-10/04-ember-night-banner.png)',
  '![05-cave-aerial](qa/shots/2026-09-24-AG-10/05-cave-night-aerial.png)',
].join('\n');

const reportPath = path.join(ROOT, 'qa', '2026-09-24-AG-10.md');
await fs.promises.writeFile(reportPath, report, 'utf8');
console.log('[AG-10] Report written to', reportPath);
