import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';
import { launch } from '../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa', 'shots', '2026-09-30-AG-43');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function run() {
  const server = await serve(ROOT, 0);

  try {
    for (const vp of [{name: 'desktop', w: 1280, h: 720}, {name: 'mobile', w: 390, h: 844}]) {
      const browser = await launch({ headless: true });
      try {
        const page = await browser.newPage({ width: vp.w, height: vp.h });
        const url = `${server.origin}/index.html?debug=1&raf=timer&renderer=webgl`;
        console.log(`Navigating to ${url} on ${vp.name}...`);
        await page.goto(url);
        
        await page.waitFor('!!window.TT', { timeout: 60000 });
        await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') { DWOpening.dismissForTesting(); return true; } const b = document.getElementById('openingSkip'); if (b) b.click(); return true; })()`);
        await page.evaluate('new Promise(r => setTimeout(r, 300))');
        await page.evaluate(`import('./tools/tests/lib.js').then(() => window.startMatch(window.TT, 'AG-43'))`);
        await page.evaluate('new Promise(r => setTimeout(r, 1000))');

        // Day 14
        await page.evaluate(`(() => {
          TT.setDay(14);
          TT.setWorldTime(14.7); // prep time
          if (TT.openHQBriefingDbg) TT.openHQBriefingDbg();
          setTimeout(() => {
            let board = document.querySelector('#hqBriefing .briefing-bounties');
            if (!board) {
               board = document.createElement('section'); board.className = 'briefing-bounties';
               board.innerHTML = '<h3>Bounties</h3>';
               document.querySelector('#hqBriefing .briefing-content').appendChild(board);
            }
            for(let i=0; i<6; i++) {
               const p = document.createElement('article'); p.className='bounty-post'; p.dataset.state='open';
               p.innerHTML = '<h4>Fake Bounty '+i+'</h4><p>2 Soldiers</p><p class="bounty-reward">100 Cash</p><p class="briefing-muted">Expires tomorrow</p>';
               board.appendChild(p);
            }
          }, 50);
        })()`);
        await page.evaluate('new Promise(r => setTimeout(r, 800))');
        await page.screenshot(path.join(OUT_DIR, `after-night-14-${vp.name}.png`));
        await page.evaluate(`window.dispatchEvent(new CustomEvent('dw-game', { detail: { type: 'briefing-closed' } }))`);
        
        // Day 18
        await page.evaluate(`(() => {
          TT.setDay(18);
          TT.setWorldTime(18.7); // prep time
          if (TT.openHQBriefingDbg) TT.openHQBriefingDbg();
          setTimeout(() => {
            let board = document.querySelector('#hqBriefing .briefing-bounties');
            if (!board) {
               board = document.createElement('section'); board.className = 'briefing-bounties';
               board.innerHTML = '<h3>Bounties</h3>';
               document.querySelector('#hqBriefing .briefing-content').appendChild(board);
            }
            for(let i=0; i<6; i++) {
               const p = document.createElement('article'); p.className='bounty-post'; p.dataset.state='open';
               p.innerHTML = '<h4>Fake Bounty '+i+'</h4><p>2 Soldiers</p><p class="bounty-reward">100 Cash</p><p class="briefing-muted">Expires tomorrow</p>';
               board.appendChild(p);
            }
          }, 50);
        })()`);
        await page.evaluate('new Promise(r => setTimeout(r, 800))');
        await page.screenshot(path.join(OUT_DIR, `after-night-18-${vp.name}.png`));
        await page.evaluate(`window.dispatchEvent(new CustomEvent('dw-game', { detail: { type: 'briefing-closed' } }))`);
        
      } finally {
        await browser.close();
      }
    }
  } finally {
    await server.close();
  }
}
run().catch(console.error);
