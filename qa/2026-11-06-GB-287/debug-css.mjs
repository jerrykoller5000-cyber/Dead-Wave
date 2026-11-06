import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const server = await serve(ROOT, 0);
const browser = await launch({ headless: false, args: ['--disable-features=CalculateNativeWinOcclusion'] });
const page = await browser.newPage({ width: 390, height: 844 });
try {
  const { windowId } = await page.send('Browser.getWindowForTarget', {});
  await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: -4000, top: -4000, width: 390, height: 844 } });
} catch {}
await page.goto(`${server.origin}/index.html?debug=1&raf=timer&gates=1`, { timeout: 240000 });
await page.waitFor('!!window.TT', { timeout: 400000 });
await page.evaluate(`(() => { if (window.DWOpening?.dismissForTesting) DWOpening.dismissForTesting(); })()`);
await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 30000 });
const info = await page.evaluate(`(() => {
  const title = "Sato's key frees the mast yard gate. The relay is within reach.";
  showBanner(title, '', 30, '#d7c6a4');
  const el = document.getElementById('bigBanner');
  const t = el.querySelector('.t');
  // force layout
  void t.offsetWidth;
  const cs = getComputedStyle(t);
  const range = document.createRange();
  range.selectNodeContents(t);
  const rr = range.getBoundingClientRect();
  const sheets = [];
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        const txt = rule.cssText || '';
        if (txt.includes('bigBanner')) sheets.push(txt.slice(0, 220));
      }
    } catch (e) { sheets.push('ERR ' + e.message); }
  }
  return {
    classes: el.className,
    vw: innerWidth,
    computed: { fontSize: cs.fontSize, whiteSpace: cs.whiteSpace, letterSpacing: cs.letterSpacing, maxWidth: getComputedStyle(el).maxWidth, width: getComputedStyle(el).width },
    box: t.getBoundingClientRect(),
    textRange: { left: rr.left, right: rr.right, width: rr.width, height: rr.height },
    scroll: { scrollWidth: t.scrollWidth, clientWidth: t.clientWidth },
    overflow: rr.left < 4 || rr.right > innerWidth - 4,
    rules: sheets
  };
})()`);
console.log(JSON.stringify(info, null, 2));
await browser.close?.(); server.close?.();
