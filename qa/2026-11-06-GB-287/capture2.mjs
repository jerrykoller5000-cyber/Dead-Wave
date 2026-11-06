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
// Confirm served CSS contains our patch
const html = await fetch(server.origin + '/index.html').then((r) => r.text());
const hit = [...html.matchAll(/#bigBanner[^{.]*\{[^}]+\}/g)].map((m) => m[0]);
console.log('SERVED RULES:\n' + hit.join('\n---\n'));
const browser = await launch({ headless: false, args: ['--disable-features=CalculateNativeWinOcclusion'] });
let fails = 0;
for (const w of widths) {
  const h = w === 390 ? 844 : 1080;
  const page = await browser.newPage({ width: w, height: h });
  try {
    const { windowId } = await page.send('Browser.getWindowForTarget', {});
    await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: -4000, top: -4000, width: w, height: h } });
    await page.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w <= 500 });
  } catch (e) { console.log('emulation', e.message); }
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer&gates=1`, { timeout: 240000 });
  if (!(await page.waitFor('!!window.TT', { timeout: 400000 }))) throw new Error('no TT');
  await page.evaluate(`(() => { if (window.DWOpening?.dismissForTesting) DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 30000 });
  const metrics = await page.evaluate(`(() => {
    const title = ${JSON.stringify(TITLE)};
    const el = document.getElementById('bigBanner');
    const t = el.querySelector('.t');
    const s = el.querySelector('.s');
    t.textContent = title.toUpperCase();
    t.style.color = '#d7c6a4';
    s.textContent = '';
    el.classList.add('center', 'show');
    el.classList.remove('show'); el.classList.add('show'); // reflow
    void t.offsetWidth;
    const cs = getComputedStyle(t);
    const es = getComputedStyle(el);
    const range = document.createRange();
    range.selectNodeContents(t);
    const rr = range.getBoundingClientRect();
    const margin = Math.min(16, innerWidth * 0.04);
    const overflow = rr.left < margin - 1 || rr.right > innerWidth - margin + 1;
    return {
      vw: innerWidth, vh: innerHeight, classes: el.className,
      fontSize: cs.fontSize, whiteSpace: cs.whiteSpace, letterSpacing: cs.letterSpacing,
      elWidth: es.width, elMax: es.maxWidth, elPad: es.paddingLeft + '/' + es.paddingRight,
      text: { left: rr.left, right: rr.right, width: rr.width, height: rr.height },
      margin, overflow, fits: !overflow
    };
  })()`);
  const shot = path.join(OUT, 'banner-' + w + '.png');
  const png = await page.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(shot, Buffer.from(png.data, 'base64'));
  if (!metrics.fits) fails++;
  console.log((metrics.fits ? 'PASS' : 'FAIL') + ' ' + w + ' font=' + metrics.fontSize + ' ws=' + metrics.whiteSpace
    + ' textW=' + Math.round(metrics.text.width) + ' textH=' + Math.round(metrics.text.height)
    + ' L/R=' + Math.round(metrics.text.left) + '/' + Math.round(metrics.text.right) + ' vw=' + metrics.vw);
  console.log('   ' + JSON.stringify(metrics));
  try { await page.send('Page.close', {}); } catch {}
}
console.log(widths.length + ' widths: ' + (widths.length - fails) + ' pass, ' + fails + ' fail');
await browser.close?.(); server.close?.();
process.exit(fails ? 1 : 0);
