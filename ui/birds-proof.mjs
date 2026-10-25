// GP-19966: real-renderer flock shots and motion probe. Run through crew slot.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';
import { launch } from '../tools/cdp.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const shots = path.join(root, 'handoffs', 'GP-19966-shots');
const after = process.argv.includes('--after');
const server = await serve(root, 0);
let browser, page;
try {
  browser = await launch({ headless: true });
  page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 120000 });
  if (!await page.waitFor('!!window.TT && DWLoad.snapshot().state === "ready"', { timeout: 120000 })) throw new Error('game never became ready');
  await page.evaluate('DWOpening.dismissForTesting()');
  await page.waitFor('!DWOpening.active', { timeout: 30000 });
  const found = await page.evaluate(`(() => {
    const flock = TT.scene.getObjectByName('bird-flock');
    if (!flock) return false;
    const p = flock.position;
    TT.setShotView({ x: p.x + 7, y: p.y - 4, z: p.z + 11, tx: p.x, ty: p.y, tz: p.z, fov: 34 });
    return true;
  })()`);
  if (!found) throw new Error('flock not found');
  const sample = async () => page.evaluate(`(() => {
    const flock = TT.scene.getObjectByName('bird-flock');
    const birds = flock.children.filter(child => child.name === 'flock-bird');
    return birds.map(bird => ({
      phase: bird.userData.phase,
      rate: bird.userData.flapRate,
      glide: bird.userData.glide,
      x: bird.position.x, z: bird.position.z,
      wings: bird.userData.wings.map(wing => ({ angle: wing.pivot.rotation.z, pieces: wing.pivot.children.length }))
    }));
  })()`);
  const frames = after ? 3 : 1;
  const readings = [];
  for (let i = 0; i < frames; i++) {
    await page.evaluate('new Promise(resolve => setTimeout(resolve, 320))');
    readings.push(await sample());
    const file = path.join(shots, `${after ? 'after-' + (i + 1) : 'before'}.png`);
    await page.screenshot(file);
    console.log(`${file} (${(fs.statSync(file).size / 1024).toFixed(0)} KB)`);
  }
  if (after) {
    const birds = readings[0];
    if (birds.length < 5 || !birds.every(b => b.wings.length === 2 && b.wings.every(w => w.pieces === 1))) throw new Error('birds do not have one continuous mesh per wing');
    if (new Set(birds.map(b => b.rate.toFixed(2))).size < 4) throw new Error('flap rates are not staggered');
    if (new Set(birds.map(b => b.x.toFixed(2) + ':' + b.z.toFixed(2))).size !== birds.length) throw new Error('flock positions overlap');
    const moved = birds.filter((b, i) => Math.abs(b.wings[0].angle - readings[2][i].wings[0].angle) > 0.02).length;
    if (moved < 3) throw new Error('wings did not change across sampled frames');
    console.log(`PASS GP-19966: ${birds.length} birds, one mesh per wing, independent rates and positions, ${moved} wing poses changed`);
  } else console.log(`BEFORE GP-19966: ${readings[0].length} birds, ${readings[0][0]?.wings[0]?.pieces} pieces per wing pivot`);
  if (page.errors.length) throw new Error(page.errors.join('\n'));
} finally {
  if (page) try { await page.send('Page.close', {}); } catch { /* browser may have closed */ }
  if (browser) await browser.close();
  server.close();
}
