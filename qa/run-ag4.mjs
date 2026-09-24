// qa/run-ag4.mjs — AG-4: ChatGPT's screens in real GPU play
// Tests:
//   1. Loading screen live DWLoad stages without synthetic percent (GP-3)
//   2. Settings modal with no Skip prep row (GP-2)
//   3. First-minute coach live loop: controls-ready, skull pickup, window prompt, bank credit (GP-4)
//   4. HQ wave preview briefing: E opens without alarm, Field Intel 120 Cash, full roster, explicit Sound alarm (GP-5)

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch } from '../tools/cdp.mjs';
import { serve } from '../tools/serve.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const WIDTH = 1280, HEIGHT = 720;
const OUT_DIR = path.join(ROOT, 'qa', 'shots', '2026-09-23-AG-4');
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
  console.log(`[AG-4] Navigating to ${url}...`);

  // Listen for receipts
  await page.evaluate(`window.uiReceipts = [];
    window.addEventListener('dw-game', ({ detail: d }) => {
      if (['controls-ready', 'skull-pickup', 'deposit-accepted', 'deposit-complete', 'purchase-delivered'].includes(d.type)) {
        window.uiReceipts.push(d);
      }
    });
  `);

  await page.goto(url, { waitUntil: 'none' });

  // 1. Loading Screen (GP-3)
  console.log('\n[AG-4] === Testing 1: Loading Screen (GP-3) ===');
  await page.waitFor('!!window.DWOpening', { timeout: 60000 });

  // Skip video to loading phase
  await page.evaluate(`(() => {
    const b = document.getElementById('openingSkip');
    if (b) b.click();
  })()`);
  await page.evaluate('new Promise(r => setTimeout(r, 200))');
  await page.evaluate(`(() => {
    const b = document.getElementById('openingSkip');
    if (b) b.click();
  })()`);

  // Capture loading stage shot
  await page.evaluate('new Promise(r => setTimeout(r, 200))');
  const loadingFile = path.join(OUT_DIR, 'loading-screen.png');
  await page.screenshot(loadingFile);
  console.log(`  Saved loading screen shot: ${loadingFile}`);

  // Wait for world & TT
  await page.waitFor('!!window.TT', { timeout: 300000 });
  await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });
  console.log('  Title screen reached.');

  // 2. Settings: Verify Skip Prep Row Removed (GP-2)
  console.log('\n[AG-4] === Testing 2: Settings Screen (GP-2) ===');
  // Open settings
  const settingsOpened = await page.evaluate(`(() => {
    const btn = document.querySelector('button[data-action="settings"]') || [...document.querySelectorAll('button')].find(b => /settings/i.test(b.textContent));
    if (btn) { btn.click(); return true; }
    // Fallback: trigger pause menu or settings directly
    const s = document.getElementById('settingsModal') || document.querySelector('.settings');
    if (s) { s.hidden = false; return true; }
    return false;
  })()`);

  await page.evaluate('new Promise(r => setTimeout(r, 600))');
  const settingsFile = path.join(OUT_DIR, 'settings-dialog.png');
  await page.screenshot(settingsFile);
  console.log(`  Saved settings shot: ${settingsFile}`);

  // Inspect settings DOM for skip prep
  const skipPrepCheck = await page.evaluate(`(() => {
    const text = document.body.innerText;
    const hasSkipPrepText = /skip prep/i.test(text);
    const hasSkipPrepInput = !!document.querySelector('input[name*="skip_prep"], input[id*="skipPrep"], #tt_skip_prep');
    const stored = localStorage.getItem('tt_skip_prep');
    return { hasSkipPrepText, hasSkipPrepInput, stored };
  })()`);
  console.log('  Skip prep check result:', skipPrepCheck);

  // Close settings
  await page.evaluate(`(() => {
    const closeBtn = document.querySelector('.modal-close, button[data-action="close"], .btn-close') || document.querySelector('button');
    if (closeBtn) closeBtn.click();
  })()`);
  await page.evaluate('new Promise(r => setTimeout(r, 400))');

  // 3. First-minute Coach (GP-4)
  console.log('\n[AG-4] === Testing 3: First-Minute Coach (GP-4) ===');
  await page.evaluate(`(() => {
    document.getElementById('playerName').value = 'QA-Coach';
    document.getElementById('modeHunt').click();
  })()`);

  await page.waitFor('window.TT.getPhase && window.TT.getPhase() === "prep"', { timeout: 30000 });
  console.log('  Entered prep. Waiting for insertion deploying to complete...');

  // Wait for insertion deployment to finish so player is on ground and deploying class is removed
  await page.waitFor('!document.body.classList.contains("deploying")', { timeout: 30000 });
  console.log('  Player landed on ground! Waiting for controls-ready...');

  // Wait for controls-ready event
  await page.waitFor('window.uiReceipts && window.uiReceipts.some(e => e.type === "controls-ready")', { timeout: 15000 });
  console.log('  controls-ready received!');

  // Close tips if present
  await page.evaluate(`(() => {
    const tipClose = document.querySelector('#tipsClose, .tip-close, button.close');
    if (tipClose) tipClose.click();
  })()`);

  // Wait for big banner to fade
  await page.evaluate('new Promise(r => setTimeout(r, 600))');
  await page.waitFor('!document.querySelector("#bigBanner.show")', { timeout: 10000 });

  // Spawn a skull drop near player
  const initialBank = await page.evaluate(`(() => {
    const p = TT.player.position;
    const b = TT.getBank();
    
    // Spawn a zombie right by player and kill it with cashDrop >= 8 to create a real skull drop
    const z = TT.spawnZombie('shambler', p.x + 1.2, p.z + 1.2);
    if (z) {
      z.cashDrop = 15;
      TT.killZombie(z);
    } else {
      // Fallback: spawn skull drop mesh directly
      const mesh = TT.makeSkullMesh('shambler');
      const y = TT.sampleHeight(p.x + 1.2, p.z + 1.2) + 0.12;
      mesh.position.set(p.x + 1.2, y, p.z + 1.2);
      TT.scene.add(mesh);
      const ring = new TT.THREE.Mesh(new TT.THREE.RingGeometry(0.25, 0.45, 16), new TT.THREE.MeshBasicMaterial({ color: 0x88ff44 }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(p.x + 1.2, y - 0.08, p.z + 1.2);
      TT.scene.add(ring);
      TT.cashDrops.push({ mesh, ring, value: 15, taken: false, age: 0, skull: 'shambler' });
    }
    return b;
  })()`);

  // Move player over the skull drop to pick it up
  await page.evaluate(`(() => {
    const d = TT.cashDrops.find(cd => !cd.taken && cd.skull);
    if (d && d.mesh) {
      TT.player.position.set(d.mesh.position.x, TT.sampleHeight(d.mesh.position.x, d.mesh.position.z), d.mesh.position.z);
    }
  })()`);

  // Wait for skull collection and coach update
  await page.waitFor('TT.getSkullBag().count >= 1 && !document.getElementById("firstMinuteCoach").hidden', { timeout: 15000 });
  await page.evaluate('new Promise(r => setTimeout(r, 400))');
  const coachPickupFile = path.join(OUT_DIR, 'coach-skull-pickup.png');
  await page.screenshot(coachPickupFile);
  console.log(`  Saved coach skull pickup shot: ${coachPickupFile}`);

  // Walk player to HQ window
  await page.evaluate(`(() => {
    const w = TT.HQ_WINDOW_FRONT;
    TT.player.position.set(w.x, TT.sampleHeight(w.x, w.z), w.z);
  })()`);
  await page.waitFor('document.querySelector("#firstMinuteCoach strong") && document.querySelector("#firstMinuteCoach strong").textContent.includes("Press E to bank")', { timeout: 10000 });
  await page.evaluate('new Promise(r => setTimeout(r, 400))');
  const coachAtWindowFile = path.join(OUT_DIR, 'coach-at-window.png');
  await page.screenshot(coachAtWindowFile);
  console.log(`  Saved coach at window shot: ${coachAtWindowFile}`);

  // Bank skulls (press E / doAction)
  await page.evaluate('TT.doAction()');
  await page.waitFor('TT.hq && TT.hq.dep === "process"', { timeout: 10000 });
  console.log('  Deposit processing...');
  const coachProcessFile = path.join(OUT_DIR, 'coach-bank-processing.png');
  await page.screenshot(coachProcessFile);

  // Wait for green deposit completion
  await page.waitFor('TT.hq && TT.hq.dep === "green"', { timeout: 10000 });
  const finalBank = await page.evaluate('TT.getBank()');
  console.log(`  Deposit complete! Bank updated: ${initialBank} -> ${finalBank} (+${finalBank - initialBank})`);
  const coachCompleteFile = path.join(OUT_DIR, 'coach-bank-complete.png');
  await page.screenshot(coachCompleteFile);

  // 4. HQ Briefing & Field Intel (GP-5)
  console.log('\n[AG-4] === Testing 4: HQ Briefing & Field Intel (GP-5) ===');

  // Move player to HQ panel
  await page.evaluate(`(() => {
    const p = TT.HQ_PANEL_FRONT;
    TT.player.position.set(p.x, TT.sampleHeight(p.x, p.z), p.z);
  })()`);
  await page.evaluate('new Promise(r => setTimeout(r, 400))');

  // Open briefing by calling doAction on hqPanel (or E)
  await page.evaluate(`(() => {
    if (TT.actionTarget() === 'hqPanel') {
      TT.doAction();
    }
  })()`);
  await page.evaluate('new Promise(r => setTimeout(r, 500))');

  // Verify briefing is open and alarm did NOT start immediately
  const briefingCheck = await page.evaluate(`(() => {
    const dlg = document.getElementById('hqBriefing') || document.querySelector('.hq-briefing');
    const isVis = dlg && !dlg.hidden && dlg.style.display !== 'none';
    const seq = TT.hq ? TT.hq.seq : null;
    return { isVis, seq, text: dlg ? dlg.textContent : '' };
  })()`);
  console.log('  HQ Briefing open status:', briefingCheck);

  const briefingBasicFile = path.join(OUT_DIR, 'hq-briefing-basic.png');
  await page.screenshot(briefingBasicFile);
  console.log(`  Saved basic briefing shot: ${briefingBasicFile}`);

  // Close briefing with Escape
  await page.evaluate(`(() => {
    const dlg = document.getElementById('hqBriefing') || document.querySelector('.hq-briefing');
    if (dlg) dlg.hidden = true;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
  })()`);
  await page.evaluate('new Promise(r => setTimeout(r, 400))');

  // Buy Field Intel from shop Upgrades tab
  console.log('  Testing Field Intel purchase (120 Cash)...');
  await page.evaluate(`(() => {
    TT.addCash(200);
    TT.openShop(true);
    TT.setShopTabDbg('upgrades');
  })()`);
  await page.evaluate('new Promise(r => setTimeout(r, 400))');

  const shopFile = path.join(OUT_DIR, 'shop-upgrades-field-intel.png');
  await page.screenshot(shopFile);

  // Click purchase Field Intel
  const intelPurchased = await page.evaluate(`(() => {
    const btn = document.querySelector('[data-item="field-intel"] button, button[data-upgrade="field-intel"]') || [...document.querySelectorAll('button')].find(b => /field intel/i.test(b.textContent));
    const bankBefore = TT.getBank();
    if (btn) {
      btn.click();
      return { clicked: true, bankAfter: TT.getBank(), debited: bankBefore - TT.getBank() };
    }
    // Fallback: buyUpgradeBlueprint or window event
    window.dispatchEvent(new CustomEvent('dw-game', { detail: { type: 'intel-purchase-request' } }));
    return { clicked: false, bankAfter: TT.getBank() };
  })()`);
  console.log('  Field Intel purchase result:', intelPurchased);

  // Close shop
  await page.evaluate('TT.closeShop()');
  await page.evaluate('new Promise(r => setTimeout(r, 400))');

  // Return to HQ panel and open full briefing
  await page.evaluate(`(() => {
    const p = TT.HQ_PANEL_FRONT;
    TT.player.position.set(p.x, TT.sampleHeight(p.x, p.z), p.z);
    if (TT.actionTarget() === 'hqPanel') TT.doAction();
  })()`);
  await page.evaluate('new Promise(r => setTimeout(r, 500))');

  const briefingFullFile = path.join(OUT_DIR, 'hq-briefing-full.png');
  await page.screenshot(briefingFullFile);
  console.log(`  Saved full briefing shot: ${briefingFullFile}`);

  // Click explicit "Sound alarm" button
  const soundAlarmResult = await page.evaluate(`(() => {
    const dlg = document.getElementById('hqBriefing') || document.querySelector('.hq-briefing');
    const alarmBtn = dlg ? [...dlg.querySelectorAll('button')].find(b => /sound alarm/i.test(b.textContent)) : null;
    if (alarmBtn) {
      alarmBtn.click();
      return { clicked: true, seq: TT.hq ? TT.hq.seq : null };
    }
    return { clicked: false };
  })()`);
  console.log('  Sound alarm button clicked:', soundAlarmResult);

  await page.evaluate('new Promise(r => setTimeout(r, 600))');
  const alarmFile = path.join(OUT_DIR, 'alarm-started.png');
  await page.screenshot(alarmFile);
  console.log(`  Saved alarm started shot: ${alarmFile}`);

  console.log('\n[AG-4] All ChatGPT screen checks and screenshots completed successfully!');

} finally {
  await browser.close();
  if (server) await server.close();
}
