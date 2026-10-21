import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';
import { launch } from '../tools/cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'handoffs', 'chatgpt-GP19928-shots');
fs.mkdirSync(out, { recursive: true });
const server = await serve(root, 0);
let browser;
const report = {};
try {
  browser = await launch({ headless: false });
  const page = await browser.newPage({ width: 1280, height: 720 });
  async function menu() {
    await page.goto(`${server.origin}/index.html`);
    await page.waitFor(`!!window.DWLoad && DWLoad.snapshot().state === 'ready'`, { timeout: 180000 });
    await page.evaluate(`(() => { if (window.DWOpening?.dismissForTesting) DWOpening.dismissForTesting(); })()`);
    await page.waitFor(`!!window.DWOpening && DWOpening.active === false`, { timeout: 30000 });
    await page.evaluate(`document.getElementById('playerName').value = 'First Run Tester'`);
  }
  async function inspect() {
    return page.evaluate(`(() => {
      const c = document.getElementById('firstRunCard'), r = c.getBoundingClientRect();
      return { hidden: c.hidden, title: document.getElementById('firstRunTitle').textContent,
        choices: [...c.querySelectorAll('button')].map(b => b.textContent),
        box: [r.x, r.y, r.width, r.height].map(Math.round),
        overflowX: document.documentElement.scrollWidth > innerWidth,
        saved: localStorage.getItem('tt_first_training_offer_v1') };
    })()`);
  }
  await menu();
  await page.screenshot(path.join(out, 'menu-before-1280.png'));
  await page.evaluate(`document.getElementById('modeHunt').click()`);
  report.first = await inspect();
  await page.screenshot(path.join(out, 'first-run-card-1280.png'));
  await page.setViewport(390, 844, 1);
  report.narrow = await inspect();
  await page.screenshot(path.join(out, 'first-run-card-390.png'));
  await page.setViewport(1280, 720, 1);
  await page.evaluate(`document.getElementById('firstRunTraining').click()`);
  report.training = await page.evaluate(`({playing: document.body.classList.contains('playing'), cardHidden: document.getElementById('firstRunCard').hidden, saved: localStorage.getItem('tt_first_training_offer_v1')})`);
  await menu();
  await page.evaluate(`document.getElementById('modeHunt').click()`);
  report.afterTraining = await inspect();
  await page.evaluate(`localStorage.removeItem('tt_first_training_offer_v1')`);
  await menu();
  await page.evaluate(`document.getElementById('modeHunt').click()`);
  report.secondFresh = await inspect();
  await page.evaluate(`document.getElementById('firstRunPlay').click()`);
  report.playAnyway = await page.evaluate(`({cardHidden: document.getElementById('firstRunCard').hidden, saved: localStorage.getItem('tt_first_training_offer_v1')})`);
  await menu();
  await page.evaluate(`document.getElementById('modeHunt').click()`);
  report.afterPlayAnyway = await inspect();
  report.errors = page.errors;
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2), 'utf8');
  console.log(JSON.stringify(report));
  if (report.first.hidden || report.narrow.hidden || report.narrow.overflowX || !report.training.playing || !report.afterTraining.hidden || report.secondFresh.hidden || !report.playAnyway.cardHidden || !report.afterPlayAnyway.hidden || report.errors.length) process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  await server.close();
}
