// CU-161: one page. Noon and night of the HQ must not be the same picture.
// Then a short match clip, saved the way F9 would, for tools/replay.mjs.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.dirname(fileURLToPath(import.meta.url));

const server = await serve(ROOT, 0);
const browser = await launch({ headless: false });
const page = await browser.newPage({ width: 1280, height: 720 });
await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 180000 });
if (!(await page.waitFor('!!window.TT', { timeout: 180000 }))) throw new Error('no TT');
await page.evaluate(`(() => { if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting(); })()`);
await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });

async function shot(time, file) {
  const world = await page.evaluate(`(() => { TT.setWorldTime(${time}); return TT.getWorldTime(); })()`);
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot(file);
  const buf = fs.readFileSync(file);
  return { world, bytes: buf.length, hash: crypto.createHash('sha256').update(buf).digest('hex').slice(0, 12) };
}
const noon = await shot(0.5, path.join(OUT, 'hq-noon.png'));
const night = await shot(0.02, path.join(OUT, 'hq-night.png'));
console.log('noon', JSON.stringify(noon));
console.log('night', JSON.stringify(night));
console.log(noon.hash === night.hash ? 'LIGHT_SAME' : 'LIGHT_DIFFERENT');

await page.evaluate(`(() => {
  const name = document.getElementById('playerName');
  if (name) name.value = 'Clip';
  const play = document.getElementById('modeHunt');
  if (play) play.click();
  const anyway = document.getElementById('firstRunPlay');
  const card = document.getElementById('firstRunCard');
  if (card && !card.hidden && anyway) anyway.click();
})()`);
if (!(await page.waitFor(`window.TT.getPhase && window.TT.getPhase() === 'prep'`, { timeout: 60000 }))) throw new Error('no prep');
if (!(await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 180000 }))) throw new Error('no land');
const clip = await page.evaluate(`(async () => {
  TT.setViewFirstDbg(true);
  TT.flightHold(true);
  for (let i = 0; i < 20; i++) TT.stepFrame(1/30);
  TT.flightReset();
  for (let i = 0; i < 60; i++) { TT.flightInput({ keys: ['KeyW'], dx: i > 30 ? 1 : 0 }); TT.stepFrame(1/30); }
  return TT.flightClip('CU-161 a short walk');
})()`);
const name = '2026-10-26-001700.json';
const file = path.join(ROOT, 'qa', 'clips', name);
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify(clip));
console.log('clip', file, 'frames', clip.frames.length);
try { await page.send('Page.close', {}); } catch (_) {}
await browser.close();
await server.close();
console.log('SAVED');
