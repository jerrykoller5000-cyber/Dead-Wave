import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT_DIR = path.resolve(fileURLToPath(new URL('.', import.meta.url)));
const SHOTS_DIR = path.join(OUT_DIR, 'shots');
fs.mkdirSync(SHOTS_DIR, { recursive: true });

function saveDataUrl(filePath, dataUrl) {
  const m = /^data:[^;]+;base64,(.+)$/.exec(dataUrl || '');
  if (!m) throw new Error('Invalid data URL for ' + filePath);
  fs.writeFileSync(filePath, Buffer.from(m[1], 'base64'));
}

const server = await serve(ROOT, 0);
const browser = await launch({ headless: false });
const url = `${server.origin}/index.html?inspect`;

try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(url, { waitUntil: 'none' });
  const ready = await page.waitFor('!!(window.DWInspect && window.DWInspect.ready)', { timeout: 120000 });
  if (!ready) throw new Error('DWInspect never became ready');

  const ids = ['zombie.screamer', 'zombie.spitter'];
  const results = {};

  for (const id of ids) {
    const res = await page.evaluate(`(async () => {
      const D = window.DWInspect;
      await D.show(${JSON.stringify(id)}, { mode: 'live', view: 'front', instant: true });
      const ix = D._ix;
      D.play();
      await ix.waitGame(0.25);
      D.pause();
      D.view({ yaw: 0, pitch: 5, margin: 1.12 }, { instant: true, follow: true });
      await ix.nextFrame();
      const frontPng = await D.shot({ type: 'image/png' });
      D.view({ yaw: 36, pitch: 12, margin: 1.12 }, { instant: true, follow: true });
      await ix.nextFrame();
      const threePng = await D.shot({ type: 'image/png' });
      const cur = D.current();
      return {
        id: ${JSON.stringify(id)},
        info: cur?.info,
        size: cur?.size,
        errors: D.errors(),
        frontPng,
        threePng
      };
    })()`, 60000);

    const shortName = id.replace('zombie.', '');
    const frontPath = path.join(SHOTS_DIR, `gp19932-${shortName}-live-front.png`);
    const threePath = path.join(SHOTS_DIR, `gp19932-${shortName}-live-three.png`);
    saveDataUrl(frontPath, res.frontPng);
    saveDataUrl(threePath, res.threePng);
    results[id] = {
      info: res.info,
      size: res.size,
      errors: res.errors,
      frontShot: `qa/2026-10-19-AG-87/shots/gp19932-${shortName}-live-front.png`,
      threeShot: `qa/2026-10-19-AG-87/shots/gp19932-${shortName}-live-three.png`
    };
    console.log(`AG-87: captured ${id} live (tris=${res.info?.tris}, meshes=${res.info?.meshes}, mats=${res.info?.mats})`);
  }

  const tiles = [
    { label: 'Screamer Live BEFORE (GP-19930)', rel: 'qa/2026-10-19-AG-86/shots/gp19930-screamer-front.png' },
    { label: 'Screamer Statue (GP-19932 ChatGPT)', rel: 'review/zombie-look-GP19932/after/screamer-statue-front.png' },
    { label: 'Screamer Live AFTER Front (GP-19932)', rel: 'qa/2026-10-19-AG-87/shots/gp19932-screamer-live-front.png' },
    { label: 'Screamer Live AFTER 3/4 (GP-19932)', rel: 'qa/2026-10-19-AG-87/shots/gp19932-screamer-live-three.png' },
    { label: 'Spitter Live BEFORE (GP-19930)', rel: 'qa/2026-10-19-AG-86/shots/gp19930-spitter-front.png' },
    { label: 'Spitter Statue (GP-19932 ChatGPT)', rel: 'review/zombie-look-GP19932/after/spitter-statue-front.png' },
    { label: 'Spitter Live AFTER Front (GP-19932)', rel: 'qa/2026-10-19-AG-87/shots/gp19932-spitter-live-front.png' },
    { label: 'Spitter Live AFTER 3/4 (GP-19932)', rel: 'qa/2026-10-19-AG-87/shots/gp19932-spitter-live-three.png' }
  ].map((t) => ({
    label: t.label,
    b64: fs.readFileSync(path.join(ROOT, t.rel)).toString('base64')
  }));

  const sheetDataUrl = await page.evaluate(`(async () => {
    const tiles = ${JSON.stringify(tiles)};
    const W = 400, H = 260, COLS = 4, ROWS = 2;
    const c = document.createElement('canvas');
    c.width = W * COLS;
    c.height = H * ROWS;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#111418';
    ctx.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < tiles.length; i++) {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = col * W, y = row * H;
      const img = new Image();
      img.src = 'data:image/png;base64,' + tiles[i].b64;
      await new Promise((res) => { img.onload = res; img.onerror = res; });
      if (img.naturalWidth > 0) {
        ctx.drawImage(img, x, y, W, H);
      }
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(x, y + H - 28, W, 28);
      ctx.fillStyle = '#e8f0f8';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(tiles[i].label, x + 8, y + H - 10);
      ctx.strokeStyle = '#2c3540';
      ctx.strokeRect(x + 0.5, y + 0.5, W - 1, H - 1);
    }
    return c.toDataURL('image/jpeg', 0.92);
  })()`, 60000);

  const sheetPath = path.join(SHOTS_DIR, 'gp19932-sheet.jpg');
  saveDataUrl(sheetPath, sheetDataUrl);
  fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify(results, null, 2));
  console.log('AG-87: saved contact sheet', sheetPath);
} finally {
  await browser.close();
  await server.close();
}
