import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.dirname(fileURLToPath(import.meta.url));
const TITLE = "Sato's key frees the mast yard gate. The relay is within reach.";
const COLOR = '#d7c6a4';
const widths = [1920, 1280, 390];

const startMatchSrc = fs.readFileSync(path.join(ROOT, 'tools/tests/lib.js'), 'utf8');

const server = await serve(ROOT, 0);
const browser = await launch({ headless: false, args: ['--disable-features=CalculateNativeWinOcclusion'] });
let fails = 0;

for (const w of widths) {
  const h = w === 390 ? 844 : 1080;
  const page = await browser.newPage({ width: w, height: h });
  try {
    const { windowId } = await page.send('Browser.getWindowForTarget', {});
    await page.conn.send('Browser.setWindowBounds', {
      windowId,
      bounds: { left: -4000, top: -4000, width: w, height: h },
    });
    await page.send('Emulation.setDeviceMetricsOverride', {
      width: w,
      height: h,
      deviceScaleFactor: 1,
      mobile: w <= 500,
    });
  } catch (e) {
    console.log('emulation', e.message);
  }

  await page.goto(`${server.origin}/index.html?debug=1&raf=timer&gates=1`, { timeout: 240000 });
  if (!(await page.waitFor('!!window.TT', { timeout: 400000 }))) throw new Error('no TT');
  await page.evaluate(`(() => { if (window.DWOpening?.dismissForTesting) DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 30000 });

  await page.evaluate(startMatchSrc);
  await page.evaluate(`(async () => {
    await startMatch(window.TT, 'GateCap');
  })()`, 180000);

  const phase = await page.evaluate(`(() => (window.TT && TT.getPhase ? TT.getPhase() : null))()`);
  const menuShow = await page.evaluate(`(() => {
    const m = document.getElementById('modeSelect');
    return !!(m && m.classList.contains('show'));
  })()`);
  const deploying = await page.evaluate(`document.body.classList.contains('deploying')`);
  if (phase !== 'prep' || menuShow || deploying) {
    fails++;
    console.log('FAIL ' + w + ' not in-match: phase=' + phase + ' menuShow=' + menuShow + ' deploying=' + deploying);
    try { await page.close(); } catch {}
    continue;
  }

  const metrics = await page.evaluate(`(() => {
    const title = ${JSON.stringify(TITLE)};
    const color = ${JSON.stringify(COLOR)};
    const el = document.getElementById('bigBanner');
    const t = el.querySelector('.t');
    const s = el.querySelector('.s');
    if (typeof showBanner === 'function') {
      showBanner(title, '', 30, color);
    } else {
      t.textContent = title;
      t.style.color = color;
      s.textContent = '';
      el.classList.add('center', 'show');
      el.classList.remove('show'); el.classList.add('show');
    }
    void t.offsetWidth;
    const cs = getComputedStyle(t);
    const es = getComputedStyle(el);
    const range = document.createRange();
    range.selectNodeContents(t);
    const rr = range.getBoundingClientRect();
    const margin = Math.min(16, innerWidth * 0.04);
    const overflow = rr.left < margin - 1 || rr.right > innerWidth - margin + 1;
    const menu = document.getElementById('modeSelect');
    return {
      vw: innerWidth, vh: innerHeight, classes: el.className,
      fontSize: cs.fontSize, whiteSpace: cs.whiteSpace, letterSpacing: cs.letterSpacing,
      textTransform: cs.textTransform,
      elWidth: es.width, elMax: es.maxWidth,
      text: { left: rr.left, right: rr.right, width: rr.width, height: rr.height, content: t.textContent },
      margin, overflow, fits: !overflow,
      phase: (window.TT && TT.getPhase) ? TT.getPhase() : null,
      menuShow: !!(menu && menu.classList.contains('show')),
      bannerShow: el.classList.contains('show'),
      bannerCenter: el.classList.contains('center'),
      usedShowBanner: typeof showBanner === 'function',
    };
  })()`);

  if (metrics.menuShow || metrics.phase !== 'prep' || !metrics.bannerShow || !metrics.bannerCenter) {
    fails++;
    console.log('FAIL ' + w + ' banner/state bad: ' + JSON.stringify({
      phase: metrics.phase, menuShow: metrics.menuShow,
      bannerShow: metrics.bannerShow, bannerCenter: metrics.bannerCenter,
    }));
  } else if (!metrics.fits) {
    fails++;
    console.log('FAIL ' + w + ' overflow font=' + metrics.fontSize + ' ws=' + metrics.whiteSpace
      + ' textW=' + Math.round(metrics.text.width) + ' textH=' + Math.round(metrics.text.height)
      + ' L/R=' + Math.round(metrics.text.left) + '/' + Math.round(metrics.text.right) + ' vw=' + metrics.vw);
  } else {
    console.log('PASS ' + w + ' font=' + metrics.fontSize + ' ws=' + metrics.whiteSpace
      + ' textW=' + Math.round(metrics.text.width) + ' textH=' + Math.round(metrics.text.height)
      + ' L/R=' + Math.round(metrics.text.left) + '/' + Math.round(metrics.text.right) + ' vw=' + metrics.vw
      + ' phase=' + metrics.phase + ' menuShow=' + metrics.menuShow
      + ' usedShowBanner=' + metrics.usedShowBanner);
  }
  console.log('   ' + JSON.stringify(metrics));

  const shot = path.join(OUT, 'banner-' + w + '.png');
  const png = await page.send('Page.captureScreenshot', { format: 'png' });
  const buf = Buffer.from(png.data, 'base64');
  fs.writeFileSync(shot, buf);
  console.log('wrote ' + shot + ' (' + buf.length + ' bytes)');

  try { await page.close(); } catch {}
}

console.log(widths.length + ' widths: ' + (widths.length - fails) + ' pass, ' + fails + ' fail');
await browser.close?.();
server.close?.();
process.exit(fails ? 1 : 0);
