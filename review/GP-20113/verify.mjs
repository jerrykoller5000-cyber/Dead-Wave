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
const out = path.join(root, 'review/GP-20113');
const source = fs.readFileSync(path.join(root, 'game/chainsaw-animation.js'), 'utf8');
const current = `  if (interrupted) {
    if (s.phase === 'starting') { s.phase = 'off'; s.t = 0; }
    return s;
  }`;
const previous = `  if (interrupted) { s.phase = 'off'; s.t = 0; return s; }`;
assert(source.includes(current), 'Expected current chainsaw phase source');
const beforeSource = source.replace(current, previous);
const visible = process.env.GP20113_VISIBLE === '1';
const afterOnly = process.env.GP20113_AFTER_ONLY === '1';
fs.mkdirSync(out, { recursive: true });
const server = await serve(root, 0);
const baseline = http.createServer(async (req, res) => {
  try {
    if (new URL(req.url, server.origin).pathname === '/game/chainsaw-animation.js') {
      const body = Buffer.from(beforeSource);
      res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8',
        'Content-Length': body.length, 'Cache-Control': 'no-store' }).end(body);
      return;
    }
    const upstream = await fetch(server.origin + req.url, { method: req.method });
    res.writeHead(upstream.status, Object.fromEntries(upstream.headers));
    if (upstream.body) Readable.fromWeb(upstream.body).pipe(res);
    else res.end();
  } catch (error) { res.writeHead(502).end(String(error)); }
});
await new Promise(resolve => baseline.listen(0, '127.0.0.1', resolve));
const baselineOrigin = `http://127.0.0.1:${baseline.address().port}`;
const rows = [];

try {
  for (const phase of (afterOnly ? ['after'] : ['before', 'after'])) for (const view of (process.env.GP20113_3P_ONLY === '1' ? ['3P'] : ['1P', '3P'])) {
    const browser = await launch({ headless: false, args: [
      visible ? '--window-position=40,40' : '--window-position=-3800,-3800', '--window-size=1280,720',
      '--disable-features=CalculateNativeWinOcclusion',
      '--disable-background-timer-throttling', '--disable-renderer-backgrounding'
    ] });
    try {
      const page = await browser.newPage({ width: 1280, height: 720 });
      const origin = phase === 'before' ? baselineOrigin : server.origin;
      await page.goto(`${origin}/index.html?debug=1&gp20113=${phase}${view}`, { timeout: 120000 });
      assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"', { timeout: 120000 }), 'game ready');
      await page.evaluate(`(() => {
        DWOpening.dismissForTesting();
        document.getElementById('playerName').value = 'GP20113';
        document.getElementById('modeTraining').click();
      })()`);
      assert(await page.waitFor('TT.trainingDbg.state().active', { timeout: 90000 }), 'Training active');
      assert(await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 30000 }), 'blackout lifted');
      await page.evaluate(`(() => {
        TT.setTimeDbg?.(12);
        TT.setViewFirstDbg(${view === '1P'});
        if (${view === '3P'}) {
          const p = TT.getPlayers()[0].position, d = TT.getAimDirDbg();
          p.x += d.x * 6; p.z += d.z * 6;
        }
        if (TT.isUnarmed()) TT.toggleHolster();
        TT.grantWeaponDbg('chainsaw');
        TT.setWeapon(TT.WEAPON_ORDER.indexOf('chainsaw'));
        TT.setVelDbg(0, 0);
      })()`);
      const sawReady = await page.waitFor('TT.getCurrentWeapon() === "chainsaw" && TT.sawStartDbg().phase === "ready"', { timeout: 90000 });
      if (!sawReady) console.log(`${phase} ${view} saw setup: ` + JSON.stringify(await page.evaluate(`({ weapon: TT.getCurrentWeapon(), unarmed: TT.isUnarmed(), phase: TT.getPhase(), simTime: TT.getSimTime(), saw: TT.sawStartDbg(), fuel: TT.getSawFuel(), swap: TT.getSwapDbg() })`)));
      assert(sawReady, 'saw ready after first pull');
      if (view === '3P') await page.evaluate(`(() => {
        const p = TT.getPlayers()[0].position;
        TT.setShotView({ x: p.x + 1.3, y: p.y + 2.2, z: p.z - 3.5,
          tx: p.x, ty: p.y + 1.2, tz: p.z + 1.5, fov: 60 });
      })()`);
      const initial = await page.evaluate('TT.sawStartDbg()');
      if (view === '3P') console.log('3P camera ' + JSON.stringify(await page.evaluate(`({
        camera: TT.camera.position.toArray(), player: TT.player.position.toArray(),
        first: TT.fpDbg().first, shot: TT.getShotView(),
        direction: TT.camera.getWorldDirection(new TT.THREE.Vector3()).toArray()
      })`)));
      if (phase === 'after') {
        await new Promise(resolve => setTimeout(resolve, 2000));
        await page.screenshot(path.join(out, `${phase}-${view}-before-stab.png`));
      }
      await page.evaluate(`document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF', key: 'f', bubbles: true }))`);
      assert(await page.waitFor('TT.getKnifeAnimT() > 0', { timeout: 2000 }), 'knife stab started');
      const during = await page.evaluate('TT.sawStartDbg()');
      assert(await page.waitFor('TT.getKnifeAnimT() <= 0', { timeout: 45000 }), 'knife stab ended');
      const after = await page.evaluate('TT.sawStartDbg()');
      assert(await page.waitFor('TT.sawStartDbg().phase === "ready"', { timeout: 90000 }), 'saw settled after stab');
      const settled = await page.evaluate('TT.sawStartDbg()');
      await new Promise(resolve => setTimeout(resolve, 1000));
      const shot = path.join(out, `${phase}-${view}-after-stab.png`);
      await page.screenshot(shot);
      assert.equal(page.errors.length, 0, `${phase} ${view} page errors`);
      if (phase === 'after') {
        assert.equal(during.phase, 'ready', `${view} saw idles during stab`);
        assert.equal(after.phase, 'ready', `${view} saw needs no new pull`);
        assert.equal(settled.starts, initial.starts, `${view} pull count unchanged`);
      } else {
        assert.equal(during.phase, 'off', `${view} old behavior stops during stab`);
        assert(settled.starts > initial.starts, `${view} old behavior pulls again`);
      }
      rows.push({ phase, view, initial, during, after, settled, shot, pageErrors: page.errors });
      console.log(`${phase} ${view}: ${initial.phase}/${initial.starts} -> ${during.phase}/${during.starts} -> ${after.phase}/${after.starts} -> ${settled.phase}/${settled.starts}; errors=${page.errors.length}`);
    } finally { await browser.close(); }
  }
} finally {
  fs.writeFileSync(path.join(out, afterOnly ? 'verify-after.json' : 'verify.json'), JSON.stringify(rows, null, 2) + '\n');
  await new Promise(resolve => baseline.close(resolve));
  await server.close();
}
