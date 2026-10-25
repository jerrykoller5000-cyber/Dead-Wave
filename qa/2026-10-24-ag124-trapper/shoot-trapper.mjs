import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT_DIR = path.resolve(fileURLToPath(new URL('.', import.meta.url)));
const prefix = process.argv.includes('--before') ? 'before' : 'after';

const server = await serve(ROOT, 0);
const browser = await launch({ headless: true });
const page = await browser.newPage({ width: 1280, height: 720 });

try {
  const url = `${server.origin}/index.html?debug=1&raf=timer&renderer=webgl`;
  await page.goto(url);
  await page.waitFor('!!window.DWOpening', { timeout: 60000 });
  for (let i = 0; i < 2; i++) {
    await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') { DWOpening.dismissForTesting(); return true; } const b = document.getElementById('openingSkip'); if (b) b.click(); return true; })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 300))');
  }
  await page.waitFor('!!window.TT', { timeout: 180000 });
  await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });
  await page.evaluate('new Promise(r => setTimeout(r, 600))');

  // Build trapper mission so the path, stones, posts, horseshoes, leaves, and cellar hatch are visible
  await page.evaluate(`(() => {
    TT.runDevCommand('site trapper');
    TT.setWorldTime(0.38);
    const c = [...document.querySelectorAll('canvas')].sort((a, b) => (b.clientWidth * b.clientHeight) - (a.clientWidth * a.clientHeight))[0];
    if (c) {
      const keep = new Set();
      for (let el = c; el && el !== document.body; el = el.parentElement) keep.add(el);
      for (const child of document.body.children) {
        if (!keep.has(child)) child.style.setProperty('display', 'none', 'important');
      }
    }
    if (TT.marine) TT.marine.visible = false;
  })()`);

  const shots = [
    ['entry', `(() => {
      const R = TT.trapperDbg.trapper, T = TT.trapperDbg.TRAPPER;
      const e = R.toWorld(0, T.ENTRY_Z + 2.4), t = R.toWorld(0, T.ROW_Z0 * 0.45);
      const gy = TT.sampleHeight(e.x, e.z), ty = TT.sampleHeight(t.x, t.z);
      return { x: e.x, y: gy + 2.2, z: e.z, tx: t.x, ty: ty + 0.35, tz: t.z, fov: 50 };
    })()`],
    ['overhead', `(() => {
      const R = TT.trapperDbg.trapper, T = TT.trapperDbg.TRAPPER;
      const midZ = T.ROW_Z0 * 0.5;
      const e = R.toWorld(3.8, midZ + 4.8), t = R.toWorld(0, midZ - 0.3);
      const ty = TT.sampleHeight(t.x, t.z);
      return { x: e.x, y: ty + 6.8, z: e.z, tx: t.x, ty: ty + 0.2, tz: t.z, fov: 50 };
    })()`],
    ['hatch', `(() => {
      const R = TT.trapperDbg.trapper;
      const e = R.toWorld(1.5, 3.2), t = R.toWorld(0, 0.0);
      const ty = TT.sampleHeight(t.x, t.z);
      return { x: e.x, y: ty + 2.0, z: e.z, tx: t.x, ty: ty + 0.25, tz: t.z, fov: 46 };
    })()`],
    ['homestead-wide', `(() => {
      const R = TT.trapperDbg.trapper, T = TT.trapperDbg.TRAPPER;
      const camp = TT.POI.campsites.find(c => c.style === 'trapper') || TT.POI.campsites[2];
      const mid = R.toWorld(0, T.ROW_Z0 * 0.5);
      const tx = (camp.x + mid.x) * 0.5, tz = (camp.z + mid.z) * 0.5, ty = TT.sampleHeight(tx, tz);
      const e = R.toWorld(-8.5, T.ENTRY_Z + 7.5);
      return { x: e.x, y: ty + 9.5, z: e.z, tx, ty: ty + 0.5, tz, fov: 54 };
    })()`],
  ];

  for (const [name, expr] of shots) {
    const spec = await page.evaluate(expr);
    await page.evaluate(`TT.setShotView(${JSON.stringify(spec)})`);
    await page.evaluate('new Promise(r => setTimeout(r, 450))');
    const outPath = path.join(OUT_DIR, `${prefix}-${name}.png`);
    await page.screenshot(outPath);
    console.log(`saved ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(0)} KB)`);
  }
} finally {
  await browser.close();
  await server.close();
}
