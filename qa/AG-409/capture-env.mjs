import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { Engine } from '../../tools/camera.mjs';

assert(process.env.DW_GAME_TEST_TOKEN, 'Use the official crew game-test slot (node crew/crew.mjs slot run ...)');

const TAG = process.argv[2] || 'before';
const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'qa', 'AG-409', TAG);
fs.mkdirSync(OUT_DIR, { recursive: true });

class EnvCapture extends Engine {
  async load() {
    const t0 = Date.now();
    const page = this.page;
    await page.goto(this.server.origin + '/index.html?debug=1', { waitUntil: 'none' });
    if (!await page.waitFor('!!window.DWOpening || !!window.TT', { timeout: 60000 })) {
      throw new Error('Opening unavailable: ' + JSON.stringify(page.errors));
    }
    await page.evaluate('window.DWOpening?.dismissForTesting?.()');
    if (!await page.waitFor('!!window.TT && !window.DWOpening?.active', { timeout: 100000 })) {
      throw new Error('Game ready timeout: ' + JSON.stringify(page.errors));
    }
    // Start a live match using the exact same flow as tools/tests/lib.js startMatch()
    await page.evaluate(`(async () => {
      const T = window.TT;
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const nameEl = document.getElementById('playerName');
      if (nameEl) nameEl.value = 'EnvQA';
      const play = document.getElementById('modeHunt');
      if (play) play.click();
      const firstRun = document.getElementById('firstRunCard');
      const playAnyway = document.getElementById('firstRunPlay');
      if (firstRun && !firstRun.hidden && playAnyway) playAnyway.click();
      for (let i = 0; i < 80; i++) {
        await wait(150);
        if (T.getPhase && T.getPhase() === 'prep') break;
      }
      for (let i = 0; i < 400; i++) {
        if (!document.body.classList.contains('deploying')) break;
        await wait(100);
      }
      await wait(250);
      T.runDevCommand('godmode');
      T.runDevCommand('nodead');
      T.clearZombies();
      const style = document.createElement('style');
      style.textContent = '#banner,#waveBanner,.banner,#hud,#hudTop,#hudBot,#minimapWrap,#timeLine,#placeHint,#interactHint{display:none!important;opacity:0!important;}';
      document.head.appendChild(style);
    })()`, 90000);
    this.backend = await page.evaluate('TT.getRendererBackend()');
    await page.evaluate("import('/tools/camera-rig.js').then(m => { window.CamRig = m.install(); return true; })");
    this.renderer = await page.evaluate('CamRig.renderer()');
    this.loadSec = (Date.now() - t0) / 1000;
  }
}

async function runShot(page, id, cap, setupJs) {
  const outPath = path.join(OUT_DIR, `${id}.png`);
  const info = await page.evaluate(`(async () => {
    const T = window.TT;
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    const stepSim = async (frames = 12, dt = 1/30) => {
      for (let i = 0; i < frames; i++) {
        if (T.stepFrame) T.stepFrame(dt);
        await wait(24);
      }
    };
    // Reset transient weather/fog/wind states cleanly before each shot
    T.weather.raining = false;
    T.weather.rainTimeLeft = 0;
    T.weather.intensity = 0;
    if (T.fogNightDbg) { T.fogNightDbg.force(false); for (let i = 0; i < 6; i++) T.fogNightDbg.apply(1); }
    if (T.windDbg && T.windDbg.spell) { T.windDbg.spell.on = false; T.windDbg.spell.w = 0; T.windDbg.spell.left = 0; T.windDbg.spell.timer = 9999; }
    if (T.clearGroundFires) T.clearGroundFires();
    if (T.clearScorch) T.clearScorch();
    if (T.clearSmoke) T.clearSmoke();
    ${setupJs}
  })()`, 45000);
  await page.screenshot(outPath);
  const bytes = fs.statSync(outPath).size;
  console.log(`  shot ${id} (${(bytes / 1024).toFixed(0)} KB)${info ? ' · ' + JSON.stringify(info) : ''}`);
  return { id, cap, file: `qa/AG-409/${TAG}/${id}.png`, bytes, info: info || null };
}

async function benchStormDusk(page) {
  await page.evaluate(`(async () => {
    const T = window.TT;
    const lx = T.LAKE.x + 56, lz = T.LAKE.z + 24;
    const gy = T.sampleHeight(lx, lz);
    T.player.position.set(lx, gy, lz);
    T.setWorldTime(0.73);
    T.weather.raining = true; T.weather.rainTimeLeft = 120; T.weather.intensity = 0.9;
    if (T.windDbg?.spell) { T.windDbg.spell.on = true; T.windDbg.spell.w = 0.85; T.windDbg.spell.left = 120; }
    if (T.spawnGroundFire) T.spawnGroundFire(lx - 5, lz - 3);
    await CamRig.aim({
      cam: { x: lx + 8, y: gy + 5.0, z: lz + 8, tx: T.LAKE.x + 6, ty: T.LAKE.level + 1.5, tz: T.LAKE.z, fov: 56 },
      ui: false,
      settle: 250,
    });
    window.__ag409Late = [];
    const b = TT.renderer && TT.renderer.backend;
    if (b && typeof b.createRenderPipeline === 'function' && !b.__ag409Hooked) {
      b.__ag409Hooked = true;
      const cp = b.createRenderPipeline.bind(b);
      b.createRenderPipeline = (ro, ...a) => {
        window.__ag409Late.push({ mat: ro?.material?.name || ro?.material?.type || '' });
        return cp(ro, ...a);
      };
    }
  })()`, 30000);
  return await page.evaluate(`(async () => {
    const T = window.TT;
    const frames = [];
    const N = 150;
    const callsStart = T.renderer.info.render.calls;
    await new Promise((resolve) => {
      let prev = performance.now(), n = 0;
      function step(now) {
        if (n > 0) frames.push(now - prev);
        prev = now; n++;
        if (n <= N) requestAnimationFrame(step);
        else resolve();
      }
      requestAnimationFrame(step);
    });
    const sorted = frames.slice().sort((a, b) => a - b);
    const mean = frames.reduce((a, b) => a + b, 0) / frames.length;
    const median = sorted[sorted.length >> 1];
    const p99 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99))];
    const worst = sorted[sorted.length - 1];
    const hitches = frames.filter(dt => dt > 50).length;
    const info = T.renderer.info;
    return {
      frames: frames.length,
      meanMs: +mean.toFixed(2),
      meanFps: +(1000 / mean).toFixed(1),
      medianMs: +median.toFixed(2),
      p99Ms: +p99.toFixed(2),
      worstMs: +worst.toFixed(2),
      hitches,
      callsPerFrame: +((info.render.calls - callsStart) / frames.length).toFixed(1),
      tris: info.render.triangles,
      lateCompiles: (window.__ag409Late || []).length,
    };
  })()`, 60000);
}

const cam = new EnvCapture({ onscreen: true, size: '1600x900' });
try {
  await cam.open();
  const page = cam.page;
  console.log(`[AG-409 ${TAG}] Backend=${cam.backend} loadSec=${cam.loadSec.toFixed(2)}`);

  const shots = [];
  // 1. Daytime Sky, Sun & Cloud Banks
  shots.push(await runShot(page, '01-sky-day-clouds', 'Daytime Sky, Sun Halo & Clouds', `
    const gy = T.sampleHeight(20, 20);
    T.player.position.set(20, gy, 20);
    T.setWorldTime(0.46);
    await CamRig.aim({ cam: { x: 20, y: gy + 3.2, z: 20, tx: -30, ty: gy + 26, tz: -45, fov: 62 }, ui: false, settle: 180 });
    return { fogFar: Math.round(T.getSceneFog()?.far || 0) };
  `));

  // 2. Golden Dusk Over the Lake (Sky + Clouds + Lake Reflection + Sun Path)
  shots.push(await runShot(page, '02-sky-dusk-lake', 'Golden Dusk · Lake Reflection & Sun Path', `
    const lx = T.LAKE.x + 62, lz = T.LAKE.z + 24;
    const gy = T.sampleHeight(lx, lz);
    T.player.position.set(lx, gy, lz);
    T.setWorldTime(0.735);
    await CamRig.aim({ cam: { x: lx, y: gy + 5.5, z: lz, tx: T.LAKE.x - 18, ty: T.LAKE.level + 6, tz: T.LAKE.z - 12, fov: 58 }, ui: false, settle: 180 });
    return { fogFar: Math.round(T.getSceneFog()?.far || 0) };
  `));

  // 3. Midnight Clear Sky: Stars & Moon (checks voxel star boxes & moon disc!)
  shots.push(await runShot(page, '03-sky-night-stars-moon', 'Midnight Sky · Stars & Moon Disc', `
    const gy = T.sampleHeight(10, 10);
    T.player.position.set(10, gy, 10);
    T.runDevCommand('night ops');
    await wait(120);
    const ang = (0.02 - 0.25) * Math.PI * 2;
    const mx = -Math.cos(ang), my = Math.max(0.2, -Math.sin(ang) * 0.6 + 0.45), mz = -0.3;
    const ml = Math.hypot(mx, my, mz) || 1;
    await CamRig.aim({ cam: { x: 10, y: gy + 2.4, z: 10, tx: 10 + (mx/ml)*80, ty: gy + 2.4 + (my/ml)*80, tz: 10 + (mz/ml)*80, fov: 56 }, ui: false, settle: 180 });
    return { moonDir: [+(mx/ml).toFixed(2), +(my/ml).toFixed(2), +(mz/ml).toFixed(2)] };
  `));

  // 4. Blood Moon Night over the Lake (checks blood sky + lake reflection + clouds!)
  shots.push(await runShot(page, '04-sky-blood-moon-lake', 'Blood Moon Night · Lake & Clouds', `
    T.devJumpToNight(4, false);
    T.clearZombies();
    T.runDevCommand('night ops');
    await wait(120);
    const lx = T.LAKE.x + 62, lz = T.LAKE.z + 24;
    const gy = T.sampleHeight(lx, lz);
    T.player.position.set(lx, gy, lz);
    await CamRig.aim({ cam: { x: lx, y: gy + 6.0, z: lz, tx: T.LAKE.x - 16, ty: T.LAKE.level + 8, tz: T.LAKE.z - 12, fov: 60 }, ui: false, settle: 200 });
    return { fogFar: Math.round(T.getSceneFog()?.far || 0), day: T.getDay ? T.getDay() : 4 };
  `));

  // Reset day back to normal day 3 (non-blood-moon) for remaining shots
  await page.evaluate(`(() => {
    const T = window.TT;
    T.devJumpToNight(3, false);
    T.clearZombies();
  })()`, 15000);

  // 5. Daytime Heavy Rainstorm + Overcast Sky + Wind Tilt + Puddles + Ripples
  shots.push(await runShot(page, '05-storm-day-rain', 'Daytime Rainstorm · Overcast, Streaks & Puddles', `
    const px = 14, pz = -10;
    const gy = T.sampleHeight(px, pz);
    T.player.position.set(px, gy, pz);
    T.setWorldTime(0.48);
    T.weather.raining = true; T.weather.rainTimeLeft = 120; T.weather.intensity = 1.0;
    if (T.windDbg?.spell) { T.windDbg.spell.on = true; T.windDbg.spell.w = 0.85; T.windDbg.spell.left = 90; }
    await stepSim(30, 0.08);
    await CamRig.aim({ cam: { x: px + 6, y: gy + 2.8, z: pz + 7, tx: px - 14, ty: gy + 3.2, tz: pz - 12, fov: 60 }, ui: false, settle: 220 });
    const pud = (T.getPuddles ? T.getPuddles() : []).filter(p => p.active && p.mesh.visible).length;
    return { fogFar: Math.round(T.getSceneFog()?.far || 0), puddles: pud };
  `));

  // 6. Nighttime Heavy Rainstorm (catches daytime-grey night fog bug & un-fogged blue rain!)
  shots.push(await runShot(page, '06-storm-night-rain', 'Nighttime Rainstorm · Dark Storm Fog & Streaks', `
    const px = 14, pz = -10;
    const gy = T.sampleHeight(px, pz);
    T.player.position.set(px, gy, pz);
    T.runDevCommand('night ops');
    T.weather.raining = true; T.weather.rainTimeLeft = 120; T.weather.intensity = 1.0;
    await stepSim(22, 0.06);
    await CamRig.aim({ cam: { x: px + 6, y: gy + 2.8, z: pz + 7, tx: px - 14, ty: gy + 3.0, tz: pz - 12, fov: 60 }, ui: false, settle: 200 });
    const f = T.getSceneFog();
    return { fogNear: +(f?.near || 0).toFixed(1), fogFar: +(f?.far || 0).toFixed(1) };
  `));

  // 7. Live Lightning Bolt Strike Mid-Flash
  shots.push(await runShot(page, '07-storm-lightning', 'Thunderstorm · Live Lightning Bolt & Sky Flash', `
    const px = 14, pz = -10;
    const gy = T.sampleHeight(px, pz);
    T.player.position.set(px, gy, pz);
    T.runDevCommand('night ops');
    T.weather.raining = true; T.weather.rainTimeLeft = 120; T.weather.intensity = 1.0;
    await CamRig.aim({ cam: { x: px, y: gy + 3.2, z: pz + 8, tx: px, ty: gy + 12, tz: pz - 32, fov: 62 }, ui: false, settle: 120 });
    // Strike directly in view 38m ahead of camera so the bolt fills the frame
    const L = T.lightningDbg;
    const tx = px, tz = pz - 38;
    T.clearZombies();
    const z = T.spawnZombie(tx, tz, 'shambler', true, true);
    if (z) { z.riseT = 0; z.speed = 0; }
    L.strike('dead');
    // Freeze bolt right at peak brightness (before the 0.07s flicker blink)
    L.update(0.004);
    const bolt = T.scene.getObjectByName('lightning-bolt');
    return { boltVisible: !!(bolt && bolt.visible) };
  `));

  // 8. Fog Night + Rain Interaction (verifies Fog Night stays ~30m misty & never widens!)
  shots.push(await runShot(page, '08-fog-night-lake', 'Fog Night · Creeping 30m Lake Mist', `
    const lx = T.LAKE.x + 56, lz = T.LAKE.z + 18;
    const gy = T.sampleHeight(lx, lz);
    T.player.position.set(lx, gy, lz);
    T.runDevCommand('night ops');
    T.fogNightDbg.force(true);
    for (let i = 0; i < 8; i++) T.fogNightDbg.apply(1);
    T.weather.raining = true; T.weather.rainTimeLeft = 90; T.weather.intensity = 0.85;
    await stepSim(16, 0.05);
    await CamRig.aim({ cam: { x: lx, y: gy + 3.2, z: lz, tx: T.LAKE.x + 15, ty: T.LAKE.level + 1.5, tz: T.LAKE.z, fov: 58 }, ui: false, settle: 180 });
    const f = T.getSceneFog();
    return { fogNear: +(f?.near || 0).toFixed(1), fogFar: +(f?.far || 0).toFixed(1) };
  `));

  // 9. Wind Gale Spell & Blowing Autumn Leaves along Lake Shore
  shots.push(await runShot(page, '09-wind-gale-leaves', 'Wind Gale · Tumbling Leaves & Shoreline', `
    const lx = T.LAKE.x + 52, lz = T.LAKE.z + 14;
    const gy = T.sampleHeight(lx, lz);
    T.player.position.set(lx, gy, lz);
    T.setWorldTime(0.62);
    T.windDbg.spell.on = true; T.windDbg.spell.w = 1.0; T.windDbg.spell.left = 90;
    await CamRig.aim({ cam: { x: lx + 4, y: gy + 2.4, z: lz + 4, tx: lx - 14, ty: gy + 1.4, tz: lz - 10, fov: 58 }, ui: false, settle: 120 });
    await stepSim(45, 0.05);
    await wait(120);
    const live = T.windDbg.leaves.filter(L => L.on).length;
    return { liveGaleLeaves: live };
  `));

  // 10. Running River Rapids, Foam & Wading Ripples (Daytime Close-up)
  shots.push(await runShot(page, '10-water-river-rapids', 'River Rapids · Current, Foam & Water Ripples', `
    // Find a river point near the middle of the channel
    let rx = -60, rz = -40, bestD = 999;
    for (let x = -110; x <= 20; x += 2) {
      for (let z = -90; z <= 30; z += 2) {
        const d = T.waterDepthAt(x, z);
        if (d > 0.25 && d < 0.9 && Math.hypot(x - T.LAKE.x, z - T.LAKE.z) > T.LAKE.r + 18) {
          const dist0 = Math.hypot(x + 40, z + 30);
          if (dist0 < bestD) { bestD = dist0; rx = x; rz = z; }
        }
      }
    }
    const wl = T.sampleHeight(rx, rz) + T.waterDepthAt(rx, rz);
    T.player.position.set(rx + 4, T.sampleHeight(rx + 4, rz + 3), rz + 3);
    T.setWorldTime(0.50);
    await CamRig.aim({ cam: { x: rx + 6, y: wl + 3.2, z: rz + 5, tx: rx - 2, ty: wl, tz: rz - 2, fov: 52 }, ui: false, settle: 180 });
    // Trigger rain droplets/ripples right on the river surface
    T.weather.raining = true; T.weather.rainTimeLeft = 30; T.weather.intensity = 0.25;
    await stepSim(18, 0.05);
    T.weather.raining = false; T.weather.intensity = 0;
    await wait(120);
    return { riverAt: [rx, rz] };
  `));

  // 11. The Pit (Lake Vortex) at Dusk/Night with Bubbles & Uncanny Mist
  shots.push(await runShot(page, '11-pit-vortex-night', 'Lake Pit Vortex · Rising Bubbles at Night', `
    const H = T.LAKE_HOLE;
    const sx = H.x + 28, sz = H.z + 18;
    T.player.position.set(sx, T.LAKE.level + 0.5, sz);
    T.runDevCommand('night ops');
    await CamRig.aim({ cam: { x: H.x + 19, y: T.LAKE.level + 7.5, z: H.z + 17, tx: H.x, ty: T.LAKE.level - 0.5, tz: H.z, fov: 54 }, ui: false, settle: 160 });
    await stepSim(45, 0.06);
    const pb = T.getPitBubbles ? T.getPitBubbles() : null;
    return { pitBubbles: pb };
  `));

  // 12. Campfire, Ground Fire Spread, Scorch Decals & Rising Smoke at Dusk
  shots.push(await runShot(page, '12-fire-campfire-scorch', 'Campfire, Ground Fire, Scorch Marks & Smoke', `
    const cf = (T.campfires || []).find(f => f.camp && !f.dead && !f.lantern && !f.beacon);
    const cx = cf ? cf.x : 18, cz = cf ? cf.z : -14;
    const gy = T.sampleHeight(cx, cz);
    T.player.position.set(cx + 4, T.sampleHeight(cx + 4, cz + 4), cz + 4);
    T.setWorldTime(0.76);
    if (cf) T.lightCampfire(cf);
    // Spawn adjacent ground fires and aged scorch marks in clear view
    const f1 = T.spawnGroundFire(cx + 2.4, cz - 1.2);
    const f2 = T.spawnGroundFire(cx - 2.4, cz + 0.8);
    if (f2) f2.age = 4.2; // old enough to have dropped a scorch decal!
    await CamRig.aim({ cam: { x: cx + 5.8, y: gy + 3.0, z: cz + 6.0, tx: cx + 0.3, ty: gy + 0.8, tz: cz - 0.2, fov: 54 }, ui: false, settle: 120 });
    await stepSim(28, 0.06);
    return { campfireLit: !!(cf && cf.lit) };
  `));

  // 13. Napalm Fire Pool & Ground Fire Under Pouring Rain (Flames + Oil Smoke + Rain Steam!)
  shots.push(await runShot(page, '13-fire-napalm-rain', 'Napalm Pool & Fire Hit by Rain Steam', `
    const px = 22, pz = -12;
    const gy = T.sampleHeight(px, pz);
    T.player.position.set(px + 6, T.sampleHeight(px + 6, pz + 6), pz + 6);
    T.setWorldTime(0.72);
    // Detonate a real Napalm Drum to spawn an authentic firePool + adjacent ground fire
    const bd = T.spawnBuild('barrel', px, pz);
    if (bd) {
      T.applyUpgrade(bd, 'barrel', 1);
      if (T.fireRoundDbg && T.stepProjectilesDbg) {
        T.fireRoundDbg(px - 1.5, gy + 0.5, pz, 1, 0, 0, 200, 60, 0);
        for (let k = 0; k < 4; k++) T.stepProjectilesDbg(0.03);
      }
    }
    T.spawnGroundFire(px + 2.8, pz + 0.6);
    T.weather.raining = true; T.weather.rainTimeLeft = 60; T.weather.intensity = 0.85;
    await CamRig.aim({ cam: { x: px + 6.5, y: gy + 3.4, z: pz + 7.2, tx: px + 0.6, ty: gy + 0.9, tz: pz, fov: 54 }, ui: false, settle: 120 });
    await stepSim(24, 0.06);
    return { groundFires: true };
  `));

  // 14. Sheltered Riverbank at Night — Glowing Fireflies
  shots.push(await runShot(page, '14-night-fireflies-bank', 'Night Riverbank · Bioluminescent Fireflies', `
    const lx = T.LAKE.x + T.LAKE.r + 3, lz = T.LAKE.z + 6;
    const gy = T.sampleHeight(lx, lz);
    T.player.position.set(lx, gy, lz);
    T.runDevCommand('night ops');
    await CamRig.aim({ cam: { x: lx + 5.5, y: gy + 1.9, z: lz + 5.0, tx: lx - 3.5, ty: gy + 0.9, tz: lz - 2.0, fov: 54 }, ui: false, settle: 120 });
    await stepSim(65, 0.08);
    return { motes: (T.motes || []).length };
  `));

  // 15. Dedicated Noon Heavy Rainstorm Verification (no sky tween interference)
  shots.push(await runShot(page, '15-storm-noon-verify', 'Noon Rainstorm · Overcast Sky Seam & Puddles', `
    const px = 14, pz = -10;
    const gy = T.sampleHeight(px, pz);
    T.player.position.set(px, gy, pz);
    T.setWorldTime(0.50);
    T.weather.raining = true; T.weather.rainTimeLeft = 120; T.weather.intensity = 1.0;
    if (T.windDbg?.spell) { T.windDbg.spell.on = true; T.windDbg.spell.w = 0.85; T.windDbg.spell.left = 90; }
    await stepSim(30, 0.08);
    await CamRig.aim({ cam: { x: px + 6, y: gy + 2.8, z: pz + 7, tx: px - 14, ty: gy + 3.2, tz: pz - 12, fov: 60 }, ui: false, settle: 200 });
    const f = T.getSceneFog();
    const pud = (T.getPuddles ? T.getPuddles() : []).filter(p => p.active && p.mesh.visible).length;
    return { fogNear: +(f?.near || 0).toFixed(1), fogFar: +(f?.far || 0).toFixed(1), puddles: pud };
  `));

  // 16. Dedicated True Blood Moon Night Over Lake (devJumpToNight(4) -> bloodMoon=true + crimson sky, moon, clouds & lake!)
  shots.push(await runShot(page, '16-blood-moon-verify', 'True Blood Moon · Crimson Sky, Clouds & Lake', `
    T.devJumpToNight(4, false);
    T.clearZombies();
    T.runDevCommand('night ops');
    await wait(120);
    const lx = T.LAKE.x + 62, lz = T.LAKE.z + 24;
    const gy = T.sampleHeight(lx, lz);
    T.player.position.set(lx, gy, lz);
    // Aim across the lake toward the rising blood moon & glowing crimson sky
    const ang = (0.02 - 0.25) * Math.PI * 2;
    const mx = -Math.cos(ang), my = Math.max(0.2, -Math.sin(ang) * 0.6 + 0.45), mz = -0.3;
    const ml = Math.hypot(mx, my, mz) || 1;
    await CamRig.aim({ cam: { x: lx, y: gy + 5.5, z: lz, tx: T.LAKE.x - 16, ty: T.LAKE.level + 14, tz: T.LAKE.z - 14, fov: 62 }, ui: false, settle: 200 });
    const f = T.getSceneFog();
    return { fogFar: Math.round(f?.far || 0), day: T.getDay ? T.getDay() : 4, moonDir: [+(mx/ml).toFixed(2), +(my/ml).toFixed(2)] };
  `));

  const perf = await benchStormDusk(page);
  const metrics = {
    tag: TAG,
    timestamp: new Date().toISOString(),
    backend: cam.backend,
    renderer: cam.renderer,
    loadSec: +cam.loadSec.toFixed(2),
    pageErrors: page.errors,
    perf,
    shots,
  };
  fs.writeFileSync(path.join(OUT_DIR, 'metrics.json'), JSON.stringify(metrics, null, 2));
  console.log('\n=== SUMMARY ===');
  console.log(JSON.stringify({ tag: TAG, backend: cam.backend, loadSec: metrics.loadSec, pageErrors: page.errors.length, perf }, null, 2));
  execFileSync('python', ['qa/AG-409/make-sheets.py', TAG], { cwd: ROOT, stdio: 'inherit' });
} finally {
  await cam.close();
}
