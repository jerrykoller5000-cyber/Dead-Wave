// CL-191: draws scene.html frame by frame (headless Chrome, through the repo's own tools/cdp.mjs: no dependencies)
// into PNGs for build.sh to encode.
//   node tools/disclaimer/render.mjs URL OUT_DIR [--from F] [--to F] [--at t1,t2,...]
// URL serves the repo root (the scene uses vendor/fonts) with tools/disclaimer/frames/ holding the dancer's frames.
// CHROME picks the browser (tools/cdp.mjs); a fresh one every 150 frames keeps a long render from wearing it down.
import fs from 'node:fs';
import { launch } from '../cdp.mjs';
const [url, out] = process.argv.slice(2);
if (!url || !out) { console.error('usage: node render.mjs URL OUT_DIR [--from F] [--to F] [--at t1,t2]'); process.exit(2); }
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
fs.mkdirSync(out, { recursive: true });
const flags = ['--force-color-profile=srgb', '--disable-lcd-text', '--font-render-hinting=none', '--hide-scrollbars'];

async function open() {
  const browser = await launch({ headless: true, args: flags });
  const page = await browser.newPage({ width: 1920, height: 1080 });
  await page.goto(url);
  const info = await page.evaluate('window.sceneReady');
  return { browser, page, info };
}
let { browser, page, info } = await open();
console.log(JSON.stringify(info));
const at = arg('--at', null);
const list = at ? at.split(',').map(Number).map((t) => Math.round(t * info.fps)) : [];
if (!at) { const a = +arg('--from', 0), b = +arg('--to', info.frames - 1); for (let f = a; f <= b; f++) list.push(f); }
let n = 0; const t0 = Date.now();
for (const f of list) {
  if (n && n % 150 === 0) { await browser.close(); ({ browser, page } = await open()); }
  await page.evaluate(`window.renderAt(${f / info.fps})`);
  await page.screenshot(`${out}/f${String(f).padStart(5, '0')}.png`);
  if (++n % 60 === 0) console.log(`frame ${f} (${n}/${list.length}) ${((Date.now() - t0) / n).toFixed(0)} ms/frame`);
}
console.log(`done ${n} frames in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
await browser.close();
