// GP-85: end-of-night recall through the real game and its dw-game events.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = fileURLToPath(new URL('..', import.meta.url));
const before = process.argv.includes('--before');
const preview = process.argv.includes('--preview');
const gpu = process.argv.includes('--gpu');
const shots = path.join(root, 'Claude outputs/shots/gp85');
fs.mkdirSync(shots, { recursive: true });
let src = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (!gpu) src = src.replace(
  /<script type="importmap">[\s\S]*?<\/script>/,
  '<script type="importmap">{"imports":{"three":"/tools/tests/fakethree.mjs","three/webgpu":"/tools/tests/fakethree.mjs","three/tsl":"/tools/tests/faketsl.mjs","three/addons/":"/tools/tests/addons/"}}</script>'
);
if (before) src = src.replace('mountSkullRecallFeedback({ audio: AudioSys });', '/* Before GP-85 UI */');
if (preview) {
  // Exercise the UI before the shared index and combat sections are released.
  src = src.replace('<link rel="stylesheet" href="ui/hud-layout.css">',
    '<link rel="stylesheet" href="ui/hud-layout.css"><link rel="stylesheet" href="ui/skull-recall.css">');
  src = src.replace("import { createNightRecord, mountDawn } from './ui/dawn.js';",
    "import { createNightRecord, mountDawn } from './ui/dawn.js'; import { mountSkullRecallFeedback } from './ui/skull-recall.js';");
  src = src.replace('const dawnScreen = mountDawn(', 'mountSkullRecallFeedback({ audio: AudioSys }); const dawnScreen = mountDawn(');
  src = src.replace('            AudioSys.skullPickup();', '            if (c.zip) AudioSys.skullPickup();');
}
const server = await serve(root, 0);
let browser;
try {
  browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/index.html?*', route => route.fulfill({ body: src, contentType: 'text/html' }));
  await page.goto(server.origin + '/index.html?debug=1&raf=timer', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.TT && DWLoad.snapshot().state === 'ready', null, { timeout: 120000 });
  await page.evaluate(() => DWOpening.dismissForTesting());
  await page.waitForFunction(() => document.getElementById('opening').hidden);
  await page.fill('#playerName', 'Recall Tester');
  await page.click('#modeHunt');
  await page.waitForFunction(() => TT.getPhase() === 'prep' && !document.body.classList.contains('deploying'), null, { timeout: 45000 });
  await page.evaluate(() => {
    window.recallEvents = [];
    window.chimes = 0;
    window.atFinale = null;
    const original = TT.AudioSys.skullPickup;
    TT.AudioSys.skullPickup = (...args) => { chimes++; return original(...args); };
    addEventListener('dw-game', event => {
      if (event.detail?.type === 'wave-last-kill') atFinale = { bag: TT.getSkullBag().count, chimes };
      if (['wave-last-kill', 'skull-pickup'].includes(event.detail?.type)) recallEvents.push(event.detail);
    });
    TT.runDevCommand('godmode');
    TT.clearZombies();
    TT.hqStartWave();
    TT.player.position.set(25, TT.sampleHeight(25, 25), 25);
  });
  await page.waitForFunction(() => TT.getPhase() === 'wave', null, { timeout: 15000 });
  await page.evaluate(async () => {
    const end = Date.now() + 60000;
    while (Date.now() < end) {
      for (const z of TT.zombies.slice()) if (z.alive && !z.dying) TT.damageZombie(z, 9999, { kind: 'bullet' });
      if (TT.getWaveFinisher()) return;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    throw Error('Finisher did not start');
  });
  await page.waitForFunction(() => recallEvents.some(e => e.type === 'skull-pickup' && e.recalled), null, { timeout: 15000 });
  if (!before) assert(await page.locator('#skullRecallNotice').isVisible(), 'count must stay visible during the finisher');
  for (const [width, height] of [[1280, 720], [390, 844]]) {
    await page.setViewportSize({ width, height });
    await page.screenshot({ path: path.join(shots, `${before ? 'before' : 'after'}-${width}${gpu ? '-gpu' : ''}.png`) });
  }
  await page.waitForFunction(() => TT.getPhase() === 'prep' && !TT.getWaveFinisher(), null, { timeout: 45000 });
  if (!before) {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.screenshot({ path: path.join(shots, `after-final-1280${gpu ? '-gpu' : ''}.png`) });
  }
  const result = await page.evaluate(() => ({
    events: recallEvents.filter(e => e.type === 'skull-pickup' && e.recalled).length,
    bag: TT.getSkullBag().count,
    chimes: chimes - atFinale.chimes,
    bagAtFinale: atFinale.bag,
    notice: document.getElementById('skullRecallNotice')?.textContent,
    feedback: document.getElementById('skullRecallNotice')?.hidden
  }));
  assert(result.events > 1, 'need several recalled skulls to test one chime');
  assert.equal(result.bag - result.bagAtFinale, result.events);
  if (!before) {
    assert.equal(result.chimes, 1);
    assert.equal(result.notice, `+${result.events} skulls`);
  }
  assert.deepEqual(errors, []);
  console.log(`${before ? 'Before' : 'PASS'} GP-85 recall: ${JSON.stringify(result)}`);
} finally {
  if (browser) await browser.close();
  server.close();
}
