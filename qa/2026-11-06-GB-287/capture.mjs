// GB-287: capture centered bigBanner at 1920 / 1280 / 390 and assert it fits the viewport.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.dirname(fileURLToPath(import.meta.url));
const TITLE = "Sato's key frees the mast yard gate. The relay is within reach.";
const widths = [1920, 1280, 390];

const server = await serve(ROOT, 0);
const browser = await launch({ headless: false, args: ['--disable-features=CalculateNativeWinOcclusion'] });
let fails = 0;
for (const w of widths) {
  const h = w === 390 ? 844 : 1080;
  const page = await browser.newPage({ width: w, height: h });
  try {
    const { windowId } = await page.send('Browser.getWindowForTarget', {});
    await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: -4000, top: -4000, width: w, height: h } });
  } catch {}
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer&gates=1`, { timeout: 240000 });
  if (!(await page.waitFor('!!window.TT', { timeout: 400000 }))) throw new Error('no TT at ' + w);
  await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 30000 });
  const metrics = await page.evaluate(`(() => {
    const title = ${JSON.stringify(TITLE)};
    if (typeof showBanner !== 'function') {
      // fall back through TT if showBanner is closed over
      const el = document.getElementById('bigBanner');
      const t = el && el.querySelector('.t');
      const s = el && el.querySelector('.s');
      if (!el || !t) return { err: 'no bigBanner' };
      t.textContent = title.toUpperCase();
      t.style.color = '#d7c6a4';
      if (s) s.textContent = '';
      el.classList.add('center', 'show');
    } else {
      showBanner(title, '', 30, '#d7c6a4');
    }
    const el = document.getElementById('bigBanner');
    const t = el.querySelector('.t');
    const br = el.getBoundingClientRect();
    const tr = t.getBoundingClientRect();
    const cs = getComputedStyle(t);
    return {
      vw: innerWidth, vh: innerHeight,
      el: { left: br.left, right: br.right, width: br.width, top: br.top },
      t: { left: tr.left, right: tr.right, width: tr.width, height: tr.height, top: tr.top },
      whiteSpace: cs.whiteSpace, fontSize: cs.fontSize, letterSpacing: cs.letterSpacing,
      text: t.textContent,
      overflowLeft: tr.left < 4,
      overflowRight: tr.right > innerWidth - 4,
      fits: tr.left >= 4 && tr.right <= innerWidth - 4
    };
  })()`);
  const shot = path.join(OUT, `banner-${w}.png`);
  const png = await page.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(shot, Buffer.from(png.data, 'base64'));
  const ok = metrics && metrics.fits && !metrics.overflowLeft && !metrics.overflowRight;
  if (!ok) fails++;
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + w + 'px  fits=' + !!metrics.fits
    + '  t=[' + Math.round(metrics.t.left) + '..' + Math.round(metrics.t.right) + '] vw=' + metrics.vw
    + '  font=' + metrics.fontSize + ' ws=' + metrics.whiteSpace);
  console.log('    ' + JSON.stringify(metrics));
  try { await page.send('Page.close', {}); } catch {}
}
console.log(widths.length + ' widths: ' + (widths.length - fails) + ' pass, ' + fails + ' fail');
await browser.close?.(); server.close?.();
process.exit(fails ? 1 : 0);
