// desktop/make-icon.mjs — CU-57: the game's icon, from the PGB patch (assets/insignia/pgb-patch.png), set on a dark
// rounded square and written to desktop/src-tauri/icons/source.png (1024 px) for `tauri icon`. A stand-in until
// Jerry has art for it: swap the PNG and run `npm run icon` again.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';
import { launch } from '../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT = path.join(ROOT, 'desktop', 'src-tauri', 'icons');
fs.mkdirSync(OUT, { recursive: true });
const server = await serve(ROOT, 0);
const browser = await launch({ headless: true });
const page = await browser.newPage({ width: 400, height: 400 });
try {
  await page.goto(`${server.origin}/tools/blank.html`);
  const url = await page.evaluate(`(async () => {
    const img = new Image(); img.src = '/assets/insignia/pgb-patch.png'; await img.decode();
    const S = 1024, c = document.createElement('canvas'); c.width = c.height = S;
    const x = c.getContext('2d');
    const r = 190; x.beginPath(); x.moveTo(r, 0); x.arcTo(S, 0, S, S, r); x.arcTo(S, S, 0, S, r); x.arcTo(0, S, 0, 0, r); x.arcTo(0, 0, S, 0, r); x.closePath();
    const g = x.createLinearGradient(0, 0, 0, S); g.addColorStop(0, '#20261c'); g.addColorStop(1, '#10130e'); x.fillStyle = g; x.fill();
    x.imageSmoothingQuality = 'high';
    const h = S * 0.78, w = h * img.width / img.height;
    x.drawImage(img, (S - w) / 2, (S - h) / 2, w, h);
    return c.toDataURL('image/png');
  })()`);
  fs.writeFileSync(path.join(OUT, 'source.png'), Buffer.from(url.split(',')[1], 'base64'));
  console.log('icon: wrote ' + path.relative(ROOT, path.join(OUT, 'source.png')));
} finally { await browser.close(); await server.close(); }
