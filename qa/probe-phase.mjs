import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from '../tools/cdp.mjs';
import { serve } from '../tools/serve.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const server = await serve(ROOT, 0);
const browser = await launch({ headless: true });
const url = `${server.origin}/index.html?debug=1&raf=timer`;

try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(url, { waitUntil: 'none' });
  await page.waitFor('!!window.DWOpening', { timeout: 60000 });
  await page.evaluate(`window.DWOpening && window.DWOpening.dismissForTesting && window.DWOpening.dismissForTesting()`);
  await page.waitFor('!!window.TT', { timeout: 180000 });
  await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });

  console.log('Title ready.');
  console.log('Initial phase:', await page.evaluate('window.TT.getPhase ? window.TT.getPhase() : "no getPhase"'));
  console.log('playerName:', await page.evaluate('document.getElementById("playerName")?.value'));

  const clickRes = await page.evaluate(`(() => {
    const n = document.getElementById('playerName');
    n.value = 'JerryQA';
    n.dispatchEvent(new Event('input', { bubbles: true }));
    const btn = document.getElementById('modeHunt');
    btn.click();
    return { name: n.value, error: document.getElementById('nameError')?.textContent };
  })()`);
  console.log('Click res:', clickRes);

  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const info = await page.evaluate(`(() => {
      return {
        phase: window.TT.getPhase ? window.TT.getPhase() : null,
        deploying: document.body.classList.contains('deploying'),
        bodyClass: document.body.className,
        wave: window.TT.getDay ? window.TT.getDay() : null
      };
    })()`);
    console.log(`t+${i+1}s:`, JSON.stringify(info));
    if (page.errors.length) console.log('Page errors:', page.errors);
  }
} finally {
  await browser.close();
  await server.close();
}
