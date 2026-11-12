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
const out = path.join(root, 'review/GP-20114');
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const needle = 'window.TT.fuelDbg = { run: () => fuelRun.read(),';
assert(source.includes(needle), 'fuel debug hook present');
const instrumented = source.replace(needle,
  'window.TT.fuelDbg = { forceFillForGp20114: () => fuelRun.holdFill(FUEL.fillS, true, true), run: () => fuelRun.read(),');
const base = await serve(root, 0);
const proxy = http.createServer(async (req, res) => {
  try {
    if (new URL(req.url, base.origin).pathname === '/index.html') {
      const body = Buffer.from(instrumented);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8',
        'Content-Length': body.length, 'Cache-Control': 'no-store' }).end(body);
      return;
    }
    const upstream = await fetch(base.origin + req.url, { method: req.method });
    res.writeHead(upstream.status, Object.fromEntries(upstream.headers));
    if (upstream.body) Readable.fromWeb(upstream.body).pipe(res);
    else res.end();
  } catch (error) { res.writeHead(502).end(String(error)); }
});
await new Promise(resolve => proxy.listen(0, '127.0.0.1', resolve));
const browser = await launch({ headless: false, args: ['--window-position=40,40', '--window-size=1280,720'] });
const result = {};
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`http://127.0.0.1:${proxy.address().port}/index.html?debug=1&gp20114=fuel`, { timeout: 120000 });
  assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"', { timeout: 120000 }), 'game ready');
  await page.evaluate(`(() => {
    DWOpening.dismissForTesting();
    document.getElementById('playerName').value = 'GP20114';
    document.getElementById('modeTraining').click();
  })()`);
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 90000 }), 'Training active');
  await page.evaluate('TT.fuelDbg.forceFillForGp20114()');
  result.before = await page.evaluate('({ fuel: TT.fuelDbg.run(), slow: TT.fuelDbg.slow() })');
  assert.equal(result.before.fuel.phase, 'carried', 'fuel can carried before death');
  assert(result.before.slow < 1, 'carried fuel slows movement');
  await page.evaluate(`TT.runDevCommand('rip')`);
  assert(await page.waitFor('!!TT.trainingDbg.state().wake', { timeout: 20000 }), 'death wake started');
  assert(await page.waitFor('!TT.trainingDbg.state().wake', { timeout: 90000 }), 'recovery ended');
  result.after = await page.evaluate('({ fuel: TT.fuelDbg.run(), slow: TT.fuelDbg.slow(), fence: TT.trainingDbg.state().infirmaryFence.state() })');
  assert.equal(result.after.fuel.phase, 'at-pump', 'fuel can returned to pump on Training death');
  assert.equal(result.after.slow, 1, 'no fuel slowdown after recovery');
  assert.equal(result.after.fence.raised, false, 'infirmary exit still open');
  assert.equal(page.errors.length, 0, 'page errors');
  fs.writeFileSync(path.join(out, 'fuel-repro.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
  await new Promise(resolve => proxy.close(resolve));
  await base.close();
}
