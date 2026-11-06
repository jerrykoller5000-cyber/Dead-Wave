import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const probe = `
(() => {
  const rules = [];
  for (const sheet of document.styleSheets) {
    let text = '';
    try { for (const rule of sheet.cssRules) text += rule.cssText + '\\n'; } catch (e) { text = 'ERR ' + e.message; }
    if (text.indexOf('bigBanner') >= 0) {
      text.split('\\n').forEach((line) => { if (line.indexOf('bigBanner') >= 0) rules.push(line); });
    }
  }
  const style = document.querySelector('style');
  const raw = style ? style.textContent : '';
  const idx = raw.indexOf('#bigBanner');
  return {
    rules: rules,
    rawSlice: idx >= 0 ? raw.slice(idx, idx + 700) : ('NO bigBanner IN FIRST STYLE len=' + raw.length)
  };
})()
`;

const server = await serve(ROOT, 0);
const browser = await launch({ headless: false, args: ['--disable-features=CalculateNativeWinOcclusion'] });
const page = await browser.newPage({ width: 1920, height: 1080 });
try {
  const { windowId } = await page.send('Browser.getWindowForTarget', {});
  await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: -4000, top: -4000, width: 1920, height: 1080 } });
  await page.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
} catch {}
await page.goto(server.origin + '/index.html?debug=1&raf=timer&gates=1', { timeout: 240000 });
if (!(await page.waitFor('!!window.TT', { timeout: 400000 }))) throw new Error('no TT');
await page.evaluate("(() => { if (window.DWOpening && window.DWOpening.dismissForTesting) DWOpening.dismissForTesting(); })()");
await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 30000 });
const info = await page.evaluate(probe);
fs.writeFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'dump-rules.json'), JSON.stringify(info, null, 2));
console.log(JSON.stringify(info, null, 2));
await browser.close?.();
server.close?.();
