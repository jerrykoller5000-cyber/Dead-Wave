import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch } from '../tools/cdp.mjs';
import { serve } from '../tools/serve.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const SHOTS_DIR = path.join(ROOT, 'qa', 'shots', '2026-09-29-GP-73');
await fs.promises.mkdir(SHOTS_DIR, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

console.log('[GP-73] Starting UI script...');
const server = await serve(ROOT, 0);
const browser = await launch({ headless: true });
const url = `${server.origin}/index.html?debug=1`;

try {
  const testCredits = async (width, height, tag) => {
    console.log(`[GP-73] Testing ${width}x${height}...`);
    const page = await browser.newPage({ width, height });
    await page.goto(url, { waitUntil: 'none' });
    await page.waitFor('!!window.DWOpening', { timeout: 60000 });
    // Don't dismiss DWOpening because it IS the title screen!
    await wait(2000);

    // Open credits
    await page.evaluate(`(() => {
      const btn = document.getElementById('menuCreditsBtn');
      if (btn) btn.click();
    })()`);
    await wait(1000);
    
    // Check if visible
    const creditsVisible = await page.evaluate(`(() => {
      const c = document.getElementById('menuCredits');
      return c && c.classList.contains('show');
    })()`);
    console.log(`[GP-73] ${tag} Credits open: ${creditsVisible}`);
    await page.screenshot(path.join(SHOTS_DIR, `gp73-credits-${tag}.png`));

    // Verify text content mentions Jerry, Quaternius, CC0, music
    const textFound = await page.evaluate(`(() => {
      const c = document.getElementById('menuCredits');
      if (!c) return false;
      const text = c.innerText.toLowerCase();
      return text.includes('jerry') && text.includes('quaternius') && text.includes('cc0');
    })()`);
    console.log(`[GP-73] ${tag} Text found: ${textFound}`);

    // Back button
    await page.evaluate(`(() => {
      const btn = document.getElementById('menuCreditsBack');
      if (btn) btn.click();
    })()`);
    await wait(1000);
    const closed = await page.evaluate(`(() => {
      const c = document.getElementById('menuCredits');
      return c && !c.classList.contains('show');
    })()`);
    console.log(`[GP-73] ${tag} Credits closed via Back: ${closed}`);

    // Reopen and test Escape
    await page.evaluate(`(() => {
      const btn = document.getElementById('menuCreditsBtn');
      if (btn) btn.click();
    })()`);
    await wait(1000);
    await page.evaluate(`(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' }));
    })()`);
    await wait(1000);
    const escaped = await page.evaluate(`(() => {
      const c = document.getElementById('menuCredits');
      return c && !c.classList.contains('show');
    })()`);
    console.log(`[GP-73] ${tag} Credits closed via Escape: ${escaped}`);
  };

  await testCredits(1280, 720, '1280');
  await testCredits(390, 844, '390');

  console.log('[GP-73] Done.');
} catch (e) {
  console.error('[GP-73] Error:', e);
} finally {
  await browser.close();
  server.close();
}
