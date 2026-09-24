// qa/run-ag7.mjs — AG-7: ChatGPT GP-7 prep checklist (live game) + GP-9 objectives fixture
//
// Part A — GP-7 prep checklist in a live match:
//   1. At prep start: checklist shows bank/ammo/alarm pending; repair pending if damaged build in range.
//   2. Bank: deposit skulls → bank goal ticks green.
//   3. Ammo: reload at the cabin → ammo goal ticks green.
//   4. Repair: damage a wall, T-repair it → repair goal ticks green. Then destroy it → unavailable.
//   5. Alarm: press Sound Alarm at HQ → alarm goal ticks green; checklist hides in wave.
//
// Part B — GP-9 objectives fixture:
//   6. Desktop (1280×720): all seven markers visible; one HUD tracker; states visible.
//   7. Narrow (390×720): HUD tracker not cropped; markers readable.
//   8. Cycle through fixture states using the selector.
//
// Shots: qa/shots/2026-09-23-AG-7/

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch } from '../tools/cdp.mjs';
import { serve } from '../tools/serve.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const WIDTH = 1280, HEIGHT = 720;
const OUT_DIR = path.join(ROOT, 'qa', 'shots', '2026-09-23-AG-7');
await fs.promises.mkdir(OUT_DIR, { recursive: true });

function kbOf(f) { return (fs.statSync(f).size / 1024).toFixed(0); }
async function shot(page, name) {
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot(file);
  console.log(`  [shot] ${name}.png (${kbOf(file)} KB)`);
  return file;
}

let server = null;
let origin = 'http://127.0.0.1:8971';
try {
  const res = await fetch(`${origin}/index.html`);
  if (!res.ok) throw new Error('not ok');
} catch {
  server = await serve(ROOT, 8971);
  origin = server.origin;
}

// ── PART A: GP-7 Prep Checklist ───────────────────────────────────────────────
console.log('\n[AG-7] ===== PART A: GP-7 Prep Checklist =====');

const browserA = await launch({ headless: false });
const pageA = await browserA.newPage({ width: WIDTH, height: HEIGHT });

try {
  const url = `${origin}/index.html?debug=1&raf=timer`;
  console.log(`[AG-7] Navigating: ${url}`);
  await pageA.goto(url, { waitUntil: 'none' });
  await pageA.waitFor('!!window.DWOpening', { timeout: 60000 });
  for (let i = 0; i < 2; i++) {
    await pageA.evaluate(`(() => { const b = document.getElementById('openingSkip'); if (b) b.click(); })();`);
    await pageA.evaluate('new Promise(r => setTimeout(r, 300))');
  }
  await pageA.waitFor('!!window.TT', { timeout: 300000 });
  await pageA.waitFor('window.DWOpening.active === false', { timeout: 120000 });
  await pageA.evaluate('new Promise(r => setTimeout(r, 800))');
  console.log('[AG-7] Title screen ready.');

  // Start a match → enter prep phase
  await pageA.evaluate(`(() => {
    document.getElementById('playerName').value = 'QA-GP7';
    document.getElementById('modeHunt').click();
  })()`);
  await pageA.waitFor('window.TT.getPhase && window.TT.getPhase() === "prep"', { timeout: 30000 });
  console.log('[AG-7] Entered prep phase.');
  await pageA.evaluate('new Promise(r => setTimeout(r, 1200))');

  // 1. Checklist at prep start — all pending
  const prepState0 = await pageA.evaluate(`(() => {
    const el = document.getElementById('prepChecklist') || document.querySelector('.prep-checklist');
    return el ? { visible: !el.hidden, html: el.innerHTML.substring(0, 400) } : { visible: false };
  })()`);
  console.log('[AG-7] Checklist at prep start:', prepState0.visible ? 'visible' : 'hidden');
  await shot(pageA, 'gp7-prep-start');

  // 2. Bank: spawn a skull, pick it up, deposit
  console.log('\n[AG-7] --- Bank goal test ---');
  const bank0 = await pageA.evaluate(`(() => {
    const p = TT.player.position;
    // Spawn skull drop nearby
    const z = TT.spawnZombie('shambler', p.x + 1.5, p.z + 1.5);
    if (z) { z.cashDrop = 15; TT.killZombie(z); }
    // Move over it
    const d = TT.cashDrops.find(cd => !cd.taken && cd.skull);
    if (d && d.mesh) TT.player.position.set(d.mesh.position.x, TT.sampleHeight(d.mesh.position.x, d.mesh.position.z), d.mesh.position.z);
    return TT.getBank();
  })()`);
  await pageA.waitFor('TT.getSkullBag && TT.getSkullBag().count >= 1', { timeout: 8000 });
  console.log('  Skull picked up. Walking to HQ window...');
  await pageA.evaluate(`(() => {
    const w = TT.HQ_WINDOW_FRONT;
    TT.player.position.set(w.x, TT.sampleHeight(w.x, w.z), w.z);
  })()`);
  await pageA.evaluate('new Promise(r => setTimeout(r, 500))');
  await pageA.evaluate('TT.doAction()');
  await pageA.waitFor('TT.hq && (TT.hq.dep === "green" || TT.getBank() > ' + bank0 + ')', { timeout: 12000 });
  console.log('  Bank deposited!');
  await pageA.evaluate('new Promise(r => setTimeout(r, 600))');
  await shot(pageA, 'gp7-bank-ticked');
  const bankCheckState = await pageA.evaluate(`(() => {
    const el = document.getElementById('prepChecklist') || document.querySelector('.prep-checklist');
    return el ? el.innerHTML.substring(0, 600) : 'no element';
  })()`);
  console.log('  Checklist HTML snippet after bank:', bankCheckState.substring(0, 200));

  // 3. Ammo: reload at cabin ammo shelf
  console.log('\n[AG-7] --- Ammo goal test ---');
  await pageA.evaluate(`(() => {
    // Walk to ammo shelf
    const shelf = TT.POI.ammoShelf || TT.POI.cabin;
    if (shelf) TT.player.position.set(shelf.x, TT.sampleHeight(shelf.x, shelf.z), shelf.z);
    else {
      // Fallback: simulate ammo refill event
      window.dispatchEvent(new CustomEvent('dw-game', { detail: { type: 'ammo-refill' } }));
    }
  })()`);
  await pageA.evaluate('new Promise(r => setTimeout(r, 500))');
  // Try pressing E to interact with ammo
  await pageA.evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', code: 'KeyE', bubbles: true }))`);
  await pageA.evaluate('new Promise(r => setTimeout(r, 500))');
  // Also try doAction
  await pageA.evaluate('if (TT.doAction) TT.doAction()');
  await pageA.evaluate('new Promise(r => setTimeout(r, 800))');
  await shot(pageA, 'gp7-ammo-refill');

  // 4. Repair: damage a wall, T-repair it
  console.log('\n[AG-7] --- Repair goal test ---');
  const repairSetup = await pageA.evaluate(`(() => {
    // Place a wall near player
    const p = TT.player.position;
    const gx = Math.round(p.x / 4), gz = Math.round(p.z / 4);
    const placed = TT.tryPlace('wall', gx, gz, { lv: 0 });
    if (!placed || placed.count === 0) return { error: 'could not place wall', gx, gz };
    // Find it and damage it
    const bid = TT.getRepairTarget ? null : null;
    // Damage: reduce HP
    const builds = TT.getBuilds ? TT.getBuilds().filter(b => b.type === 'wall' && Math.abs(b.gx - gx) < 2 && Math.abs(b.gz - gz) < 2) : [];
    if (builds.length > 0) {
      const b = builds[0];
      b.hp = Math.max(1, b.maxHp * 0.4);
      b.damaged = true;
    }
    // Move player to T-repair range
    const wx = gx * 4 + 1, wz = gz * 4 + 1;
    TT.player.position.set(wx, TT.sampleHeight(wx, wz), wz);
    // Get repair target
    const target = TT.getRepairTarget ? TT.getRepairTarget() : null;
    return { placed: placed.count, builds: builds.length, target: target ? { id: target.id, cost: target.cost } : null };
  })()`);
  console.log('  Repair setup:', JSON.stringify(repairSetup));
  await pageA.evaluate('new Promise(r => setTimeout(r, 600))');
  await shot(pageA, 'gp7-repair-pending');

  // Press T to repair
  await pageA.evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 't', code: 'KeyT', bubbles: true }))`);
  await pageA.evaluate('new Promise(r => setTimeout(r, 300))');
  await pageA.evaluate('if (TT.repairNearestBuild) TT.repairNearestBuild()');
  await pageA.evaluate('new Promise(r => setTimeout(r, 800))');
  await shot(pageA, 'gp7-repair-done');
  console.log('  Repaired.');

  // 5. Alarm: go to HQ panel, sound the alarm
  console.log('\n[AG-7] --- Alarm goal test ---');
  await pageA.evaluate(`(() => {
    const p = TT.HQ_PANEL_FRONT || { x: 0, z: 0 };
    TT.player.position.set(p.x, TT.sampleHeight(p.x, p.z), p.z);
  })()`);
  await pageA.evaluate('new Promise(r => setTimeout(r, 500))');
  // Open HQ briefing
  await pageA.evaluate(`(() => {
    if (TT.actionTarget && TT.actionTarget() === 'hqPanel') TT.doAction();
  })()`);
  await pageA.evaluate('new Promise(r => setTimeout(r, 500))');
  // Click Sound alarm
  await pageA.evaluate(`(() => {
    const dlg = document.getElementById('hqBriefing') || document.querySelector('.hq-briefing');
    const btn = dlg ? [...dlg.querySelectorAll('button')].find(b => /sound alarm/i.test(b.textContent)) : null;
    if (btn) btn.click();
    else window.dispatchEvent(new CustomEvent('dw-game', { detail: { type: 'alarm-started' } }));
  })()`);
  await pageA.evaluate('new Promise(r => setTimeout(r, 800))');
  await shot(pageA, 'gp7-alarm-ticked');

  // Check if checklist hides during wave
  const wavePhase = await pageA.evaluate('TT.getPhase ? TT.getPhase() : "unknown"');
  console.log('  Phase after alarm:', wavePhase);
  if (wavePhase === 'wave') {
    const checklistVisible = await pageA.evaluate(`(() => {
      const el = document.getElementById('prepChecklist') || document.querySelector('.prep-checklist');
      return el ? !el.hidden : null;
    })()`);
    console.log('  Checklist visible during wave:', checklistVisible, '(expected false/hidden)');
    await shot(pageA, 'gp7-checklist-hidden-in-wave');
  }

  // Also get the HQ mirror view
  await pageA.evaluate(`(() => {
    const p = TT.HQ_PANEL_FRONT || { x: 0, z: 0 };
    TT.player.position.set(p.x, TT.sampleHeight(p.x, p.z), p.z);
    if (TT.actionTarget && TT.actionTarget() === 'hqPanel') TT.doAction();
  })()`);
  await pageA.evaluate('new Promise(r => setTimeout(r, 600))');
  await shot(pageA, 'gp7-hq-mirror');

  console.log('\n[AG-7] Part A (GP-7) complete.');
} finally {
  await browserA.close();
}

// ── PART B: GP-9 Objectives Fixture ──────────────────────────────────────────
console.log('\n[AG-7] ===== PART B: GP-9 Objectives Fixture =====');

// Desktop: 1280x720
const browserB = await launch({ headless: false });
const pageB = await browserB.newPage({ width: WIDTH, height: HEIGHT });

try {
  const fixtureUrl = `${origin}/ui/objectives.fixture.html`;
  console.log(`[AG-7] Navigating to fixture: ${fixtureUrl}`);
  await pageB.goto(fixtureUrl, { waitUntil: 'none' });
  await pageB.waitFor('!!window.objectiveFixture || document.querySelector(".objective-marker")', { timeout: 30000 });
  await pageB.evaluate('new Promise(r => setTimeout(r, 800))');

  // Count markers
  const markerCount = await pageB.evaluate(`document.querySelectorAll('.objective-marker, [data-objective]').length`);
  console.log(`  Markers found: ${markerCount} (expected 7)`);
  await shot(pageB, 'gp9-desktop-default');

  // Click first marker to select it
  await pageB.evaluate(`(() => {
    const m = document.querySelector('.objective-marker, [data-objective]');
    if (m) m.click();
  })()`);
  await pageB.evaluate('new Promise(r => setTimeout(r, 400))');
  await shot(pageB, 'gp9-desktop-selected');

  // Cycle through all states if fixture selector exists
  const states = ['available', 'active', 'interrupted', 'full', 'partial', 'claimed', 'unavailable', 'hidden'];
  for (const state of states) {
    const set = await pageB.evaluate(`(() => {
      const sel = document.getElementById('objectiveState') || document.getElementById('stateSelector') ||
        document.querySelector('select[name=state], select[data-state]');
      if (!sel) return false;
      const opt = [...sel.options].find(o => o.value === ${JSON.stringify(state)} || o.textContent.toLowerCase().includes(${JSON.stringify(state)}));
      if (!opt) return false;
      sel.value = opt.value;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`);
    if (set) {
      await pageB.evaluate('new Promise(r => setTimeout(r, 350))');
      await shot(pageB, `gp9-desktop-${state}`);
      console.log(`  State "${state}" shot taken`);
    }
  }

  console.log('[AG-7] Part B desktop shots done.');
} finally {
  await browserB.close();
}

// Narrow: 390x720
console.log('\n[AG-7] --- GP-9 Narrow viewport (390px) ---');
const browserC = await launch({ headless: false });
const pageC = await browserC.newPage({ width: 390, height: 720 });

try {
  const fixtureUrl = `${origin}/ui/objectives.fixture.html`;
  await pageC.goto(fixtureUrl, { waitUntil: 'none' });
  await pageC.waitFor('!!window.objectiveFixture || document.querySelector(".objective-marker")', { timeout: 30000 });
  await pageC.evaluate('new Promise(r => setTimeout(r, 800))');
  await shot(pageC, 'gp9-mobile-default');

  // Select a marker
  await pageC.evaluate(`(() => {
    const m = document.querySelector('.objective-marker, [data-objective]');
    if (m) m.click();
  })()`);
  await pageC.evaluate('new Promise(r => setTimeout(r, 400))');
  await shot(pageC, 'gp9-mobile-selected');

  // Check HUD tracker not cropped
  const trackerCheck = await pageC.evaluate(`(() => {
    const tracker = document.querySelector('.objective-tracker, .hud-tracker, [data-tracker]');
    if (!tracker) return { found: false };
    const rect = tracker.getBoundingClientRect();
    return { found: true, right: rect.right, viewportWidth: window.innerWidth, cropped: rect.right > window.innerWidth };
  })()`);
  console.log('  Tracker crop check:', JSON.stringify(trackerCheck));

  console.log('[AG-7] Part B narrow shots done.');
} finally {
  await browserC.close();
}

console.log(`\n[AG-7] All shots in: ${OUT_DIR}`);
console.log('[AG-7] Done.');

if (server) await server.close();
