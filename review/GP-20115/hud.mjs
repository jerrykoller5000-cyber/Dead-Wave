import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Run through the crew game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20115');
const label = process.argv.includes('--after') ? 'after' : 'before';
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const nl = source.includes('\r\n') ? '\r\n' : '\n';
const refresh = [
  '      const sawWasRunning = AudioSys.isChainsawRunning();',
  '      AudioSys.chainsawEngine(sawWant && !hold, hold || !live);',
  '      if (sawWasRunning !== AudioSys.isChainsawRunning()) updateAmmoHud();'
].join(nl);
assert(source.includes(refresh), 'HUD refresh in source');
const pageSource = label === 'after' ? source : source.replace(refresh,
  '      AudioSys.chainsawEngine(sawWant && !hold, hold || !live);');
const server = await serve(root, 0);
const proxy = http.createServer(async (req, res) => {
  try {
    if (new URL(req.url, server.origin).pathname === '/index.html') {
      const body = Buffer.from(pageSource);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8',
        'Content-Length': body.length, 'Cache-Control': 'no-store' }).end(body);
      return;
    }
    const upstream = await fetch(server.origin + req.url, { method: req.method });
    res.writeHead(upstream.status, Object.fromEntries(upstream.headers));
    if (upstream.body) Readable.fromWeb(upstream.body).pipe(res);
    else res.end();
  } catch (error) { res.writeHead(502).end(String(error)); }
});
await new Promise(resolve => proxy.listen(0, '127.0.0.1', resolve));
const browser = await launch({ headless: false, args: [
  '--window-position=40,40', '--window-size=1280,720',
  '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling'
] });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`http://127.0.0.1:${proxy.address().port}/index.html?debug=1&gp20115=hud`, { timeout: 120000 });
  assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"', { timeout: 120000 }), 'game ready');
  await page.evaluate(`(() => {
    DWOpening.dismissForTesting();
    document.getElementById('playerName').value = 'GP20115';
    document.getElementById('modeTraining').click();
  })()`);
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 90000 }), 'Training visible');
  await page.evaluate(`(() => {
    TT.AudioSys.setMuted(false);
    TT.AudioSys.unlock();
    if (TT.isUnarmed()) TT.toggleHolster();
    TT.grantWeaponDbg('chainsaw');
    TT.setWeapon(TT.WEAPON_ORDER.indexOf('chainsaw'));
  })()`);
  assert(await page.waitFor(`TT.sawStartDbg().phase === 'ready' && TT.AudioSys.isChainsawRunning()`, { timeout: 25000 }), 'idle engine audio started');
  await new Promise(resolve => setTimeout(resolve, 6000));
  const state = () => page.evaluate(`({ phase: TT.sawStartDbg().phase, audio: TT.AudioSys.isChainsawRunning(),
    hud: document.getElementById('ammoDetail').textContent, weapon: TT.getCurrentWeapon(), unarmed: TT.isUnarmed() })`);
  const drawn = await state();
  await page.screenshot(path.join(out, `${label}-draw.png`));
  if (label === 'after') assert(drawn.hud.includes('Running'), 'Running appears on first draw, without cutting');
  await page.evaluate('TT.toggleHolster()');
  assert(await page.waitFor('!TT.AudioSys.isChainsawRunning()', { timeout: 10000 }), 'engine audio stopped on holster');
  const stopped = await state();
  if (label === 'after') assert(!stopped.hud.includes('Running'), 'Running clears when engine stops');
  assert.equal(page.errors.length, 0, 'page errors');
  const result = { drawn, stopped, pageErrors: page.errors };
  fs.writeFileSync(path.join(out, `${label}.json`), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
  await new Promise(resolve => proxy.close(resolve));
  await server.close();
}
