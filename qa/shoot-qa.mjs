// qa/shoot-qa.mjs — Antigravity QA shot rig
// Drives Jerry's Chrome via tools/cdp.mjs on http://127.0.0.1:8971
// Captures both UI screens (e.g. title) and clean world shots.

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch } from '../tools/cdp.mjs';
import { serve } from '../tools/serve.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const WIDTH = 1280, HEIGHT = 720;

const argv = process.argv.slice(2);
const taskName = argv[0] || '2026-09-23-AG-1';
const outDir = path.join(ROOT, 'qa', 'shots', taskName);
await fs.promises.mkdir(outDir, { recursive: true });

// Check if port 8971 is already up, else spin up local server
let server = null;
let origin = 'http://127.0.0.1:8971';
try {
  const res = await fetch(`${origin}/index.html`);
  if (!res.ok) throw new Error('not ok');
} catch {
  server = await serve(ROOT, 8971);
  origin = server.origin;
}

const show = !argv.includes('--headless');
const browser = await launch({ headless: !show });
const page = await browser.newPage({ width: WIDTH, height: HEIGHT });

try {
  const url = `${origin}/index.html?debug=1&raf=timer`;
  console.log(`[QA] Navigating to ${url}`);
  const t0 = performance.now();
  await page.goto(url);

  // Skip intro video/sting to progress to the loading / title menu
  await page.waitFor('!!window.DWOpening', { timeout: 60000 });
  for (let i = 0; i < 2; i++) {
    await page.evaluate(`(() => { const b = document.getElementById('openingSkip'); if (b) b.click(); return true; })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 300))');
  }

  // Wait for world & TT
  await page.waitFor('!!window.TT', { timeout: 300000 });
  const ttTime = ((performance.now() - t0) / 1000).toFixed(2);
  console.log(`[QA] window.TT published at ${ttTime}s`);

  // Wait for opening overlay to finish handoff to title menu
  await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });
  const titleTime = ((performance.now() - t0) / 1000).toFixed(2);
  console.log(`[QA] Title screen active at ${titleTime}s`);

  // Give menu and scene 1s to settle
  await page.evaluate('new Promise(r => setTimeout(r, 1000))');

  // 1. Capture title screen (with UI)
  const titleFile = path.join(outDir, 'title.png');
  await page.screenshot(titleFile);
  console.log(`[QA] Saved title screen: ${titleFile} (${(fs.statSync(titleFile).size / 1024).toFixed(0)} KB)`);

  // Hide UI overlay for clean world views
  await page.evaluate(`(() => {
    const c = [...document.querySelectorAll('canvas')]
      .sort((a, b) => (b.clientWidth * b.clientHeight) - (a.clientWidth * a.clientHeight))[0];
    if (!c) return false;
    const keep = new Set();
    for (let el = c; el && el !== document.body; el = el.parentElement) keep.add(el);
    for (const child of document.body.children) {
      if (!keep.has(child)) child.style.setProperty('display', 'none', 'important');
    }
    return true;
  })()`);

  // Helper for world shots
  async function shootView(name, expr, worldTime = 0.4) {
    const spec = await page.evaluate(expr);
    if (!spec) {
      console.error(`[QA] View expression for ${name} returned null`);
      return;
    }
    await page.evaluate(`TT.setWorldTime(${worldTime})`);
    await page.evaluate(`TT.setShotView(${JSON.stringify(spec)})`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');
    const f = path.join(outDir, `${name}.png`);
    await page.screenshot(f);
    console.log(`[QA] Saved ${name}: ${f} (${(fs.statSync(f).size / 1024).toFixed(0)} KB)`);
  }

  // 2. HQ
  await shootView('hq', 'TT.shotHQ()');

  // 3. Pit - from bank (looking across east shallows to lake hole)
  await shootView('pit-bank', `(() => {
    const L = TT.LAKE_HOLE;
    return { x: L.x + 46, y: -1.6, z: L.z + 6, tx: L.x + 12, ty: -3.2, tz: L.z + 2, fov: 55 };
  })()`);

  // 4. Pit - Claude's closer camera (decision D-5 / CL-1)
  await shootView('pit', `(() => {
    const L = TT.LAKE_HOLE;
    return { x: L.x + 12, y: -3.4 + 16, z: L.z + 12, tx: L.x, ty: -3.4 - 5, tz: L.z, fov: 50 };
  })()`);

  // 5. Cave shale front
  await shootView('cave-shale-front', `(() => {
    const c = (TT.POI.caves || []).find(c => c.theme === 'shale');
    if (!c) return null;
    const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
    const rx = Math.cos(c.yaw), rz = -Math.sin(c.yaw);
    return {
      x: c.x + fx * 24,
      y: c.gy + 17,
      z: c.z + fz * 24,
      tx: c.x, ty: c.gy + 2.2, tz: c.z, fov: 50
    };
  })()`);

  await page.evaluate('TT.setShotView(null)');
  console.log(`[QA] All baseline shots captured successfully in ${outDir}`);
} finally {
  await browser.close();
  if (server) await server.close();
}
