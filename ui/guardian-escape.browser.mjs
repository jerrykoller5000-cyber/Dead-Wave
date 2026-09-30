// GP-53: the prompt follows the real guardian haul and its kick-free receipt.
// The renderer may be substituted for a fast logic pass; no escape event is faked.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = fileURLToPath(new URL('..', import.meta.url));
const before = process.argv.includes('--before');
const gpu = process.argv.includes('--gpu');
const shots = path.join(root, 'Claude outputs/shots/gp53');
fs.mkdirSync(shots, { recursive: true });
let src = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (!gpu) src = src.replace(
  /<script type="importmap">[\s\S]*?<\/script>/,
  '<script type="importmap">{"imports":{"three":"/tools/tests/fakethree.mjs","three/webgpu":"/tools/tests/fakethree.mjs","three/tsl":"/tools/tests/faketsl.mjs","three/addons/":"/tools/tests/addons/"}}</script>'
);
if (before) src = src.replace('mountGuardianEscapeFeedback();', '/* Before GP-53 UI */');
const server = await serve(root, 0);
let browser;
try {
  browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/index.html?*', route => route.fulfill({ body: src, contentType: 'text/html' }));
  await page.addInitScript(() => {
    window.escapeEvents = [];
    window.addEventListener('dw-game', ({ detail }) => {
      if (detail?.type === 'guardian-kick-free' ||
          (detail?.type === 'cave-guardian' && detail.phase === 'escape')) escapeEvents.push(detail);
    });
  });
  await page.goto(server.origin + '/index.html?debug=1&raf=timer', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.TT && DWLoad.snapshot().state === 'ready', null, { timeout: 120000 });
  await page.evaluate(() => DWOpening.dismissForTesting());
  await page.waitForFunction(() => document.getElementById('opening').hidden);
  await page.fill('#playerName', 'Escape Tester');
  await page.click('#modeHunt');
  await page.waitForFunction(() => TT.getPhase() === 'prep' && !document.body.classList.contains('deploying'), null, { timeout: 45000 });
  await page.evaluate(async () => {
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    const until = async (cond, ms) => { const end = Date.now() + ms; while (Date.now() < end) { if (cond()) return true; await wait(40); } return cond(); };
    TT.clearZombies();
    TT.skipGrace();
    if (!await until(() => TT.caveGrabReady(), 15000)) throw Error('guardian scene unavailable');
    TT.setHp(80);
    const bag = TT.getSkullBag(); bag.count = 7; bag.value = 42;
    const c = TT.POI.caves[0];
    const place = () => TT.player.position.set(c.x + Math.sin(c.yaw) * 12,
      TT.sampleHeight(c.x + Math.sin(c.yaw) * 12, c.z + Math.cos(c.yaw) * 12),
      c.z + Math.cos(c.yaw) * 12);
    place(); await wait(100);
    TT.noteCaveMouthHit(0);
    if (!await until(() => { const s = TT.getCavePokeState(); return !!s.warning && s.warning.age > Math.max(s.grace || 0, s.eyesFor || 0) + .1; }, 15000)) {
      throw Error('cave warning did not mature');
    }
    place(); await wait(50); TT.noteCaveMouthHit(0);
    if (!await until(() => escapeEvents.some(e => e.state === 'open'), 45000)) throw Error('guardian never opened escape phase');
  });
  const prompt = page.locator('#guardianEscapeNotice');
  if (!before) {
    assert(await prompt.isVisible(), 'prompt must be visible during the haul');
    assert.match(await prompt.innerText(), /Kick free! \(E\)/);
  }
  await page.screenshot({ path: path.join(shots, `${before ? 'before' : 'after'}-haul-${gpu ? 'gpu' : 'logic'}.png`) });
  await page.evaluate(() => {
    for (let i = 0; i < 4; i++) document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', key: 'e', bubbles: true }));
  });
  if (!before) assert.match(await prompt.innerText(), /4\/5/);
  await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', key: 'e', bubbles: true })));
  await page.waitForFunction(() => escapeEvents.some(e => e.type === 'guardian-kick-free'), null, { timeout: 3000 });
  if (!before) {
    assert(await prompt.isVisible(), 'loss notice must show after escape');
    assert.equal(await prompt.locator('strong').innerText(), 'It took your skulls.');
  }
  await page.screenshot({ path: path.join(shots, `${before ? 'before' : 'after'}-free-${gpu ? 'gpu' : 'logic'}.png`) });
  const result = await page.evaluate(() => ({
    states: escapeEvents.filter(e => e.type === 'cave-guardian').map(e => e.state),
    receipt: escapeEvents.find(e => e.type === 'guardian-kick-free'),
    bag: { ...TT.getSkullBag() },
    scriptedKill: !!TT.getScriptedKill(),
    hp: TT.getHp(),
    notice: document.getElementById('guardianEscapeNotice')?.innerText ?? null
  }));
  assert.deepEqual(result.states, ['open', 'press', 'press', 'press', 'press', 'free']);
  assert.equal(result.receipt.lostCount, 7);
  assert.equal(result.bag.count, 0);
  assert.equal(result.scriptedKill, false);
  assert(result.hp > 0);
  assert.deepEqual(errors, []);
  console.log(`${before ? 'Before' : 'PASS'} GP-53 real escape path: ${JSON.stringify(result)}`);
} finally {
  if (browser) await browser.close();
  server.close();
}
