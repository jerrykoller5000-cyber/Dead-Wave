// GP-19946: inspect the computed t37 style on the actual page under the game-test slot.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const server = await serve(root, 0);
const browser = await launch({ headless: true });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1`, { timeout: 240000 });
  await page.waitFor('!!document.getElementById("win")', { timeout: 60000 });
  const result = await page.evaluate(`(() => {
    const win = document.getElementById('win');
    win.classList.add('lake', 'show');
    document.body.classList.add('cinepanel');
    const card = win.querySelector('.card'), cs = getComputedStyle(card);
    const names = ['h2', 'p', 'button'].map(q => getComputedStyle(win.querySelector(q)).animationName);
    return { className: win.className, backgroundImage: cs.backgroundImage,
      backgroundColor: cs.backgroundColor, border: cs.border, boxShadow: cs.boxShadow,
      animationNames: names, testPass: cs.backgroundImage === 'none' && /rgba\\(0, 0, 0, 0\\)|transparent/.test(cs.backgroundColor) && names.join() === 'dwRise,dwRise,dwRiseBtn' };
  })()`);
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
  server.close();
}
