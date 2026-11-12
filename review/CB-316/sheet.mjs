// CB-316: the example sheet. node tools/game-test-slot.mjs run claude2 CB-316 --checks "detail sheet" -- node review/CB-316/sheet.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/CB-316');
const server = await serve(root, 0);
const browser = await launch({ headless: process.env.HEADLESS !== '0', args: ['--window-size=800,560'] });
try {
  const page = await browser.newPage({ width: 800, height: 560 });
  await page.goto(server.origin + '/review/CB-316/sheet.html', { timeout: 120000 });
  if (!await page.waitFor('!!window.ready', { timeout: 120000 })) throw Error('sheet page never ready: ' + page.errors.join(' | '));
  console.log('ready', JSON.stringify(await page.evaluate('window.ready')), page.errors.slice(0, 3));
  for (const light of ['noon', 'overcast', 'dusk', 'night']) for (const view of ['side', 'quarter']) {
    await page.evaluate(`shoot('${light}','${view}')`); await new Promise((r) => setTimeout(r, 300));
    await page.evaluate(`shoot('${light}','${view}')`);
    await page.screenshot(path.join(out, `detail-${view}-${light}.png`));
  }
  if (page.errors.length) console.log('errors', page.errors);
} finally { await browser.close(); await server.close(); }
