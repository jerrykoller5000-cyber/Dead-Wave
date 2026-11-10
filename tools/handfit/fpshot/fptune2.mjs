// fptune2 (rebuilt 8 Nov after the container reset): the real game page in the cloud's Chromium, a match started,
// then steps [{ name, js, wait }] each followed by a screenshot <outDir>/<name>.png; the js runs as an async function body
// with T = window.TT and helpers __w(ms), __take(key), vm() (the view model). Then it keeps the page and runs more steps
// from <outDir>/../queue/*.json (each batch into <outDir>/../<batch>/) until queue/stop appears (or 90 min idle).
// node fptune2.mjs <outDir> <steps.json>   (cwd: the game tree)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
import { serve } from '/home/claude/gs306/tools/serve.mjs';
const outDir = process.argv[2];
const steps = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
fs.mkdirSync(outDir, { recursive: true });
const ROOT = '/home/claude/gs306';
const server = await serve(ROOT, 0);
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: (process.env.CHROME_ARGS || '').split(' ').filter(Boolean).concat(['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required']) });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.errors = [];
page.on('pageerror', (e) => page.errors.push(String(e)));
page.on('requestfailed', (r) => page.errors.push('REQFAIL ' + r.url()));
page.on('response', (r) => { if (r.status() >= 400) page.errors.push('HTTP ' + r.status() + ' ' + r.url()); });
try {
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer` + (process.env.DW_GAME_TEST_TOKEN ? '&__gameTestToken=' + encodeURIComponent(process.env.DW_GAME_TEST_TOKEN) : ''), { timeout: 180000 });
  await page.waitForFunction(() => !!window.TT, null, { timeout: 240000, polling: 500 });
  console.log('LOADED', Date.now());
  await page.evaluate(fs.readFileSync(path.join(ROOT, 'tools/tests/lib.js'), 'utf8'));
  await page.evaluate(async () => {
    const T = window.TT;
    window.__w = (ms) => new Promise((r) => setTimeout(r, ms));
    window.__take = async (w) => { if (T.isUnarmed && T.isUnarmed()) T.toggleHolster(); for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf(w)); await window.__w(150); } return T.getCurrentWeapon() === w; };
    window.vm = () => (T.viewmodelDbg ? T.viewmodelDbg() : null);
    await startMatch(T, 'FpTune');
    T.setHp && T.setHp(100000); T.grantAllWeapons && T.grantAllWeapons(); T.clearZombies && T.clearZombies();
  });
  console.log('MATCH', Date.now());
  const runSteps = async (list, dir) => {
    fs.mkdirSync(dir, { recursive: true });
    for (const s of list) {
      let res;
      try { res = await page.evaluate(async (js) => { const T = window.TT; const __w = window.__w, __take = window.__take, vm = window.vm; return await (new Function('T', '__w', '__take', 'vm', 'return (async () => {' + js + '})()'))(T, __w, __take, vm); }, s.js); if (res && res.__file) { for (const [fn, data] of Object.entries(res.__file)) fs.writeFileSync(path.join(dir, fn), typeof data === 'string' ? data : JSON.stringify(data)); delete res.__file; } console.log('STEP', s.name, JSON.stringify(res)); }
      catch (e) { console.log('STEP', s.name, 'ERR', String(e).slice(0, 300)); }
      // the canvas can show an older draw (the renderer submits late): two tiny steps, each after two real frames, present the step's own
      if (!s.noPresent) for (let k = 0; k < 2; k++) { try { await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await page.evaluate(() => { const T = window.TT; if (T && T.stepFrame) T.stepFrame(0.0001); }); } catch (_) {} }
      await page.waitForTimeout(s.wait || 300);
      await page.screenshot({ path: path.join(dir, s.name + '.png') });
    }
  };
  console.log('READY', Date.now());
  await runSteps(steps, outDir);
  const Q = path.join(path.dirname(outDir), 'queue'); fs.mkdirSync(Q, { recursive: true });
  let idle = Date.now();
  while (Date.now() - idle < 90 * 60000 && !fs.existsSync(path.join(Q, 'stop'))) {
    const next = fs.readdirSync(Q).filter((f) => f.endsWith('.json')).sort()[0];
    if (!next) { await new Promise((r) => setTimeout(r, 1000)); continue; }
    const file = path.join(Q, next), steps2 = JSON.parse(fs.readFileSync(file, 'utf8'));
    fs.renameSync(file, file + '.done');
    const dir = path.join(path.dirname(outDir), next.replace(/\.json$/, ''));
    console.log('BATCH', next);
    await runSteps(steps2, dir);
    console.log('BATCHDONE', next);
    idle = Date.now();
  }
  const errs = page.errors.slice(0, 5); if (errs.length) console.log('errors', errs);
} catch (e) { console.log('FATAL', String(e).slice(0, 500)); console.log('page errors', JSON.stringify(page.errors.slice(0, 6))); }
finally { await browser.close(); await server.close?.(); }
