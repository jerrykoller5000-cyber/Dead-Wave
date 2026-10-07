// Presentation fixture, not a live-game or GPU-performance test.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { serve } from '../tools/serve.mjs';
const { chromium } = createRequire(import.meta.url)('C:/Users/Zero/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const server = await serve(process.cwd(), 0);
let browser;
try {
  browser = await chromium.launch({ executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe', headless:true });
  const page = await browser.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const source = fs.readFileSync('index.html', 'utf8');
  let html = source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, m => m.includes('type="importmap"') ? m : '');
  html = html.replace('</head>', '<style>body{background:#12201b}body>*:not(#hud){display:none!important}#hud>*:not(#hudTopLeft):not(#ammo):not(#minimapFrame):not(#bigBanner):not(#stockNotice):not(#noticeRail):not(#combo){display:none!important}</style></head>');
  let after = false;
  const css = fs.readFileSync('ui/hud-layout.css','utf8');
  const start = source.indexOf("st.textContent = '#stockNotice");
  const stock = source.slice(start + 'st.textContent = '.length, source.indexOf('document.head.append(st)', start)).trim().replace(/;$/, '');
  await page.route('**/gp139-fixture', r => r.fulfill({contentType:'text/html', body:html}));
  await page.route('**/ui/hud-layout.css', r => r.fulfill({contentType:'text/css', body:after ? css : css.split('/* GP-139:')[0]}));
  const dir = 'handoffs/2026-10-06-chatgpt-GP-139-shots'; fs.mkdirSync(dir, {recursive:true});
  for (const width of [1280,390]) for (const mode of ['before','after']) {
    after = mode === 'after';
    await page.setViewportSize({width,height:720}); await page.goto(server.origin + '/gp139-fixture');
    await page.evaluate(stock => {
      document.body.className = 'playing';
      const style = document.createElement('style'); style.textContent = Function('return ' + stock)(); document.head.append(style);
      const node = document.createElement('div'); node.id = 'stockNotice'; node.className = 'show';
      node.innerHTML = '<b>New at the supply terminal</b><ul><li>GW-4 Carbine</li><li>Breacher-12</li></ul><small>Unlocked tonight · buy it at the HQ supply terminal</small>';
      document.querySelector('#hud').append(node);
      const banner = document.querySelector('#bigBanner'); banner.className = 'show';
      banner.querySelector('.t').textContent = 'Skulls processed';
      banner.querySelector('.s').textContent = '12 skulls processed — spend the Cash at the supply terminal';
      document.querySelector('#combo').classList.add('show');
    }, stock);
    if (after) await page.evaluate(async () => { const {mountNoticeRail} = await import('/ui/notice-rail.js'); mountNoticeRail(document); });
    await page.waitForTimeout(250); await page.screenshot({path:dir + '/' + mode + '-' + width + '.png'});
    const layout = await page.evaluate(() => Object.fromEntries(['hudTopLeft','bigBanner','stockNotice','combo'].map(id => {
      const e=document.getElementById(id), r=e.getBoundingClientRect();
      return [id,{x:r.x,y:r.y,w:r.width,h:r.height,parent:e.parentElement.id,overflow:e.scrollWidth>e.clientWidth}];
    })));
    console.log(mode, width, JSON.stringify(layout));
    if (after) {
      assert.equal(layout.bigBanner.parent,'noticeRail'); assert.equal(layout.stockNotice.parent,'noticeRail'); assert.equal(layout.combo.parent,'hud');
      assert(layout.bigBanner.y >= layout.hudTopLeft.y + layout.hudTopLeft.h);
      assert(layout.stockNotice.y >= layout.bigBanner.y + layout.bigBanner.h);
      assert(!layout.bigBanner.overflow && !layout.stockNotice.overflow);
      await page.evaluate(() => document.querySelector('#hudTopLeft').style.paddingBottom='55px'); await page.waitForTimeout(50);
      assert(await page.evaluate(() => document.querySelector('#bigBanner').getBoundingClientRect().top >= document.querySelector('#hudTopLeft').getBoundingClientRect().bottom));
      await page.evaluate(() => { const n=document.getElementById('stockNotice'); n.remove(); document.getElementById('hud').append(n); });
      await page.waitForTimeout(50); assert.equal(await page.locator('#stockNotice').evaluate(e=>e.parentElement.id),'noticeRail');
    }
  }
  assert.equal(errors.length,0);
  console.log('PASS 1280/390 position, wrapping, stacking, resized panel, late stock node, streak unchanged; page errors 0');
} finally { await browser?.close(); await server.close(); }
