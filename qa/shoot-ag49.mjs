import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';
import { launch } from '../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa', 'shots', '2026-10-01-AG-49');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function run() {
  const server = await serve(ROOT, 0);

  const testSequence = async (width, height, prefix) => {
    const browser = await launch({ headless: true });
    const page = await browser.newPage({ width, height });
    try {
      const url = `${server.origin}/index.html?debug=1&raf=timer&renderer=webgl`;
      console.log(`Navigating to ${url} at ${width}x${height}`);
      await page.goto(url, { waitUntil: 'domcontentloaded' });

      await page.waitFor('!!window.TT', { timeout: 60000 });
      
      await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') { DWOpening.dismissForTesting(); return true; } const b = document.getElementById('openingSkip'); if (b) b.click(); return true; })()`);
      await page.evaluate('new Promise(r => setTimeout(r, 300))');
      await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') { DWOpening.dismissForTesting(); return true; } const b = document.getElementById('openingSkip'); if (b) b.click(); return true; })()`);
      
      await page.evaluate(`(() => {
        const nameEl = document.getElementById('playerName');
        if (nameEl) nameEl.value = 'Carry';
        const play = document.getElementById('modeHunt');
        if (play) play.click();
      })()`);
      await page.waitFor(`(() => {
        const p = window.TT ? window.TT.getPhase() : 'no TT';
        return p === 'prep';
      })()`, { timeout: 60000 });
      await page.evaluate(`window.TT.skipPrep()`);
      await page.waitFor(`(() => window.TT.getPhase() === 'match')()`, { timeout: 60000 });
      
      await page.waitFor(`(() => !document.body.classList.contains('deploying'))()`, { timeout: 60000 });
      await page.evaluate('new Promise(r => setTimeout(r, 1000))');

      const takeShot = async (name) => {
        await page.screenshot(path.join(OUT_DIR, prefix + '-' + name));
        console.log('Shot taken:', prefix + '-' + name);
      };

      // Helper to dispatch events
      await page.evaluate(`
        window.sendEvent = (type, who, style) => {
          // Send hud-state to ensure the state matches
          window.dispatchEvent(new CustomEvent('dw-game', {detail: {
            type: 'hud-state', active: true, runId: 1, day: 1
          }}));
          window.dispatchEvent(new CustomEvent('dw-game', {detail: {
            type, who, style, runId: 1, day: 1
          }}));
        };
      `);

      // 1. Rescue each survivor shows found line
      await page.evaluate(`window.sendEvent('survivor-rescued', 'okafor', 'trapper')`);
      await page.evaluate('new Promise(r => setTimeout(r, 500))');
      await takeShot('01-rescue-okafor.png');

      await page.evaluate(`window.sendEvent('survivor-rescued', 'brandt', 'ranger')`);
      await page.evaluate('new Promise(r => setTimeout(r, 500))');
      await takeShot('02-rescue-brandt.png');

      await page.evaluate(`window.sendEvent('survivor-rescued', 'pike', 'hikers')`);
      await page.evaluate('new Promise(r => setTimeout(r, 500))');
      await takeShot('03-rescue-pike.png');

      // 2. E beside Brandt/Pike on roof shows named card (talk)
      await page.evaluate(`window.sendEvent('survivor-talk', 'brandt', 'ranger')`);
      await page.evaluate('new Promise(r => setTimeout(r, 500))');
      await takeShot('04-talk-brandt.png');

      await page.evaluate(`window.sendEvent('survivor-talk', 'pike', 'hikers')`);
      await page.evaluate('new Promise(r => setTimeout(r, 500))');
      await takeShot('05-talk-pike.png');

      // 3. Okafor heals then talks
      await page.evaluate(`window.sendEvent('survivor-talk', 'okafor', 'trapper')`);
      await page.evaluate('new Promise(r => setTimeout(r, 500))');
      await takeShot('06-talk-okafor.png');

      // 4. Card clears on close
      await page.evaluate(`
        const c = document.getElementById('survivorTalkCard');
        if (c) {
          const btn = c.querySelector('button');
          if (btn) btn.click();
        }
      `);
      await page.evaluate('new Promise(r => setTimeout(r, 500))');
      await takeShot('07-talk-closed.png');

      // Card clears on damage
      await page.evaluate(`window.sendEvent('survivor-talk', 'brandt', 'ranger')`);
      await page.evaluate('new Promise(r => setTimeout(r, 500))');
      await page.evaluate(`window.dispatchEvent(new CustomEvent('dw-game', {detail: {type: 'player-damaged', runId: 1}}))`);
      await page.evaluate('new Promise(r => setTimeout(r, 500))');
      await takeShot('08-talk-damage-clears.png');

      // 5. Evacuation with 3 getSurvivors who values
      // We can fake TT.getSurvivors
      await page.evaluate(`
        if (window.TT.survivorHelpDbg) {
          window.TT.survivorHelpDbg.grant('okafor');
          window.TT.survivorHelpDbg.grant('brandt');
          window.TT.survivorHelpDbg.grant('pike');
        }
        window.TT.endGame(true); // true = evacuated
      `);
      await page.evaluate('new Promise(r => setTimeout(r, 4000))');
      await takeShot('09-evac-3-survivors.png');

      // Make sure the Nobody Left Behind badge doesn't show because of debug hooks (but if it does, it's captured in ending screen)
      
    } finally {
      await browser.close();
    }
  };

  try {
    await testSequence(1280, 720, 'desk');
    await testSequence(390, 844, 'narr');
  } finally {
    await server.close();
  }
}
run().catch(console.error);
