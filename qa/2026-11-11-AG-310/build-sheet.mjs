// qa/2026-11-11-AG-310/build-sheet.mjs
// Builds review/AG-310/sheet-ag310-before-after.jpg comparing BEFORE vs AFTER:
//   Row 1: Armory Workbench, Real Gun Shelf/Slot Pictures, & 34 Camo Swatches (1280x720)
//   Row 2: Armory Interactive Rotated Gun Preview (1280x720)
//   Row 3: CIF Card & Marine Turntable + Dress Swatches (1280x720)
// Runs strictly offscreen (-3800,-3800) inside game-test slot.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Must run inside game-test slot');
}

const ROOT = 'C:/Users/Zero/Desktop/Tiny Trek';
const { serve } = await import(pathToFileURL(path.join(ROOT, 'tools/serve.mjs')).href);
const { launch } = await import(pathToFileURL(path.join(ROOT, 'tools/cdp.mjs')).href);

const QA_DIR = path.join(ROOT, 'qa/2026-11-11-AG-310');
const REV_DIR = path.join(ROOT, 'review/AG-310');
fs.mkdirSync(REV_DIR, { recursive: true });

function writeSafe(p, buf) {
  const tmp = `${p}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, buf);
  fs.renameSync(tmp, p);
}

const PAIRS = [
  {
    title: '1. Armory Panel: Shelf/Slot Real Pictures + M4 Workbench Preview',
    before: '/qa/2026-11-11-AG-310/before-armory-bench.png',
    after: '/qa/2026-11-11-AG-310/after-armory-bench.png'
  },
  {
    title: '2. Armory Workbench: Rotated 3D Gun Preview (toBlob async readback)',
    before: '/qa/2026-11-11-AG-310/before-armory-preview-turned.png',
    after: '/qa/2026-11-11-AG-310/after-armory-preview-turned.png'
  },
  {
    title: '3. Armory Workbench: All 34 Camo Finish Swatches (<canvas> vs sync toDataURL <img>)',
    before: '/qa/2026-11-11-AG-310/before-armory-swatches.png',
    after: '/qa/2026-11-11-AG-310/after-armory-swatches.png'
  },
  {
    title: '4. Real CIF Station Card: cifMarine Turntable + Dress Pattern Swatches',
    before: '/qa/2026-11-11-AG-310/before-cif-card.png',
    after: '/qa/2026-11-11-AG-310/after-cif-card.png'
  }
];

async function main() {
  const srv = await serve(ROOT, 0);
  const browser = await launch({
    headless: false,
    args: [
      '--window-position=-3800,-3800',
      '--window-size=1280,720',
      '--disable-features=CalculateNativeWinOcclusion'
    ]
  });
  try {
    const page = await browser.newPage({ width: 1280, height: 720 });
    try {
      const win = await page.send('Browser.getWindowForTarget', {});
      if (win && win.windowId != null) {
        await page.send('Browser.setWindowBounds', {
          windowId: win.windowId,
          bounds: { left: -3800, top: -3800, width: 1280, height: 720, windowState: 'normal' }
        });
      }
    } catch (_) {}

    await page.goto(`${srv.origin}/crew/panel.html`, { timeout: 30000 });
    const pairsJson = JSON.stringify(PAIRS);
    const res = await page.evaluate(`(async () => {
      const pairs = ${pairsJson};
      const loadImg = (src) => new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load ' + src));
        img.src = src + '?t=' + Date.now();
      });

      const W = 1280, H = 720, PAD = 24, HEAD = 68, ROW_HEAD = 42;
      const totalW = PAD * 3 + W * 2;
      const totalH = HEAD + pairs.length * (ROW_HEAD + H + PAD) + PAD;
      const cv = document.createElement('canvas');
      cv.width = totalW;
      cv.height = totalH;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#111510';
      ctx.fillRect(0, 0, totalW, totalH);

      ctx.fillStyle = '#e8e2c8';
      ctx.font = 'bold 28px monospace';
      ctx.fillText('AG-310 · Armory Freezes Fix · Same-Camera Visual Parity (BEFORE vs AFTER · RTX 5080 WebGPU)', PAD, 44);

      const diffs = [];
      let y = HEAD;
      for (const p of pairs) {
        const [imgB, imgA] = await Promise.all([loadImg(p.before), loadImg(p.after)]);
        // Compute mean absolute pixel diff across UI card area
        const c1 = document.createElement('canvas'); c1.width = W; c1.height = H;
        const c2 = document.createElement('canvas'); c2.width = W; c2.height = H;
        const x1 = c1.getContext('2d'); x1.drawImage(imgB, 0, 0, W, H);
        const x2 = c2.getContext('2d'); x2.drawImage(imgA, 0, 0, W, H);
        const d1 = x1.getImageData(0, 0, W, H).data;
        const d2 = x2.getImageData(0, 0, W, H).data;
        let absSum = 0;
        for (let i = 0; i < d1.length; i += 4) {
          absSum += Math.abs(d1[i] - d2[i]) + Math.abs(d1[i + 1] - d2[i + 1]) + Math.abs(d1[i + 2] - d2[i + 2]);
        }
        const meanAbsRgb = +(absSum / ((W * H) * 3)).toFixed(3);
        diffs.push({ title: p.title, meanAbsRgbDiffOutOf255: meanAbsRgb });

        ctx.fillStyle = '#9fd36a';
        ctx.font = 'bold 20px monospace';
        ctx.fillText(p.title + '  (mean RGB diff: ' + meanAbsRgb + '/255)', PAD, y + 28);

        ctx.fillStyle = '#cfd8c0';
        ctx.font = 'bold 18px monospace';
        ctx.fillText('BEFORE', PAD + W - 90, y + 28);
        ctx.fillText('AFTER', PAD * 2 + W * 2 - 80, y + 28);

        y += ROW_HEAD;
        ctx.drawImage(imgB, PAD, y, W, H);
        ctx.drawImage(imgA, PAD * 2 + W, y, W, H);
        ctx.strokeStyle = '#3a4230';
        ctx.lineWidth = 2;
        ctx.strokeRect(PAD, y, W, H);
        ctx.strokeRect(PAD * 2 + W, y, W, H);
        y += H + PAD;
      }

      const jpgDataUrl = cv.toDataURL('image/jpeg', 0.92);
      return { base64: jpgDataUrl.split(',')[1], diffs, width: totalW, height: totalH };
    })()`, 60000);

    const buf = Buffer.from(res.base64, 'base64');
    const revSheet = path.join(REV_DIR, 'sheet-ag310-before-after.jpg');
    const qaSheet = path.join(QA_DIR, 'sheet-ag310-before-after.jpg');
    writeSafe(revSheet, buf);
    writeSafe(qaSheet, buf);
    writeSafe(path.join(REV_DIR, 'visual-parity.json'), Buffer.from(JSON.stringify(res.diffs, null, 2) + '\n', 'utf8'));
    console.log(JSON.stringify({ ok: true, sheet: revSheet, width: res.width, height: res.height, diffs: res.diffs }, null, 2));
    await page.close();
  } finally {
    await browser.close().catch(() => {});
    await srv.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
