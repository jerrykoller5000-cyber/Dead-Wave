import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';
import { launch } from '../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa', 'shots', '2026-10-01-AG-48');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function run() {
  const server = await serve(ROOT, 0);
  
  const takeShot = async (width, height, name) => {
    const browser = await launch({ headless: true });
    const page = await browser.newPage({ width, height });
    try {
      const url = `${server.origin}/index.html?debug=1&renderer=webgl`;
      console.log(`Navigating to ${url} at ${width}x${height}`);
      await page.goto(url);
      
      // Wait for the title screen to appear.
      await page.waitFor('!!window.DWOpening', { timeout: 60000 });
      await page.evaluate('new Promise(r => setTimeout(r, 2000))'); // give it time to render the title
      
      await page.screenshot(path.join(OUT_DIR, name));
      console.log('Shot taken:', name);
    } finally {
      await browser.close();
    }
  };

  try {
    await takeShot(1280, 720, '01-title-desktop.png');
    await takeShot(390, 844, '02-title-narrow.png');
  } finally {
    await server.close();
  }
}
run().catch(console.error);
