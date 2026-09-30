// GP-80: exercise the mounted card with either a fixture or GB-111's live
// first-encounter publisher. Only the renderer is substituted without --gpu.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';
import { text } from './strings.js';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = fileURLToPath(new URL('..', import.meta.url));
const gpu = process.argv.includes('--gpu');
const live = process.argv.includes('--live');
const shots = path.join(root, 'Claude outputs/shots/gp80');
fs.mkdirSync(shots, { recursive: true });
let src = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (!gpu) src = src.replace(
  /<script type="importmap">[\s\S]*?<\/script>/,
  '<script type="importmap">{"imports":{"three":"/tools/tests/fakethree.mjs","three/webgpu":"/tools/tests/fakethree.mjs","three/tsl":"/tools/tests/faketsl.mjs","three/addons/":"/tools/tests/addons/"}}</script>'
);
const server = await serve(root, 0);
let browser;
try {
  browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/index.html?*', route => route.fulfill({ body: src, contentType: 'text/html' }));
  await page.addInitScript(() => {
    window.gp80Seen = [];
    window.addEventListener('dw-game', ({ detail }) => {
      if (detail?.type === 'run-reset') window.gp80RunId = detail.runId;
      if (detail?.type === 'enemy-first-seen') gp80Seen.push(detail);
    });
  });
  await page.goto(server.origin + '/index.html?debug=1&raf=timer', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.TT && DWLoad.snapshot().state === 'ready', null, { timeout: 120000 });
  await page.evaluate(() => DWOpening.dismissForTesting());
  await page.waitForFunction(() => document.getElementById('opening').hidden);
  await page.fill('#playerName', 'Counter Tester');
  await page.click('#modeHunt');
  await page.waitForFunction(() => TT.getPhase() === 'prep' && !document.body.classList.contains('deploying'), null, { timeout: 45000 });
  let kind = 'brute';
  if (live) {
    kind = await page.evaluate(async () => {
      TT.clearZombies(); TT.skipGrace(); TT.runDevCommand('godmode');
      const had = TT.getFirstSeenDbg().kinds;
      const chosen = ['demon','screamer','leaper','military','spider','brute','feral','drowned'].find(key => !had.includes(key));
      if (!chosen) throw Error('no new kind for the live encounter');
      const p = TT.player.position;
      const z = TT.spawnZombie(p.x + 75, p.z, chosen, true, true);
      z.riseT = 0; z.speed = z.baseSpeed = 0; z.hp = z.maxHp = 1e6;
      window.gp80Target = z;
      return chosen;
    });
    await page.waitForTimeout(500);
    assert.equal(await page.evaluate(kind => gp80Seen.some(e => e.kind === kind), kind), false, '75 m is outside the first-seen range');
    await page.waitForFunction(() => document.getElementById('enemyCounterCard')?.hidden, null, { timeout: 15000 });
    await page.screenshot({ path: path.join(shots, `before-first-${kind}-${gpu ? 'gpu' : 'logic'}.png`) });
    await page.evaluate(() => { gp80Target.mesh.position.x = TT.player.position.x + 50; });
    await page.waitForFunction(kind => gp80Seen.some(e => e.kind === kind), kind, { timeout: 3000 });
    await page.waitForFunction(kind => document.getElementById('enemyCounterCard')?.dataset.kind === kind,
      kind, { timeout: 15000 });
  }
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 720 });
    if (!live) await page.evaluate(() => window.dispatchEvent(new CustomEvent('dw-game', {
      detail: { type: 'enemy-first-seen', runId: gp80RunId, kind: 'brute' }
    })));
    const card = page.locator('#enemyCounterCard');
    assert(await card.isVisible());
    const body = await card.innerText();
    assert(body.includes(text('counter.firstSeen', { enemy: text(`enemy.${kind}.name`) })),
      `expected ${kind} card; saw ${JSON.stringify(body)} and events ${JSON.stringify(await page.evaluate(() => gp80Seen.map(e => e.kind)))}`);
    assert(body.includes(text(`counter.${kind}`)));
    await page.screenshot({ path: path.join(shots, `${live ? 'after' : 'fixture'}-first-${kind}-${width}${gpu ? '-gpu' : ''}.png`) });
  }
  if (live) {
    await page.waitForTimeout(250);
    assert.equal(await page.evaluate(kind => gp80Seen.filter(e => e.kind === kind).length, kind), 1);
  }
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('dw-game', {
    detail: { type: 'run-reset', runId: gp80RunId + 1 }
  })));
  assert.equal(await page.locator('#enemyCounterCard').isVisible(), false);
  assert.deepEqual(errors, []);
  console.log(`PASS GP-80 mounted first-use card (${live ? 'live GB-111 event' : 'event fixture'}, ${gpu ? 'WebGPU' : 'stand-in renderer'}): 1280/390 visible, exact ${kind} counter, reset hides, no page errors.`);
} finally {
  if (browser) await browser.close();
  server.close();
}
