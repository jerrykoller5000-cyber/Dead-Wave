import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';
import { launch } from '../tools/cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'handoffs', 'chatgpt-GP19926-shots');
fs.mkdirSync(out, { recursive: true });
const server = await serve(root, 0);
let browser;
try {
  browser = await launch({ headless: false });
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1`);
  await page.waitFor(`!!window.TT && !!window.DWLoad && DWLoad.snapshot().state === 'ready'`, { timeout: 180000 });
  await page.evaluate(`(() => { if (window.DWOpening?.dismissForTesting) DWOpening.dismissForTesting(); })()`);
  await page.waitFor(`window.DWOpening.active === false`, { timeout: 30000 });
  await page.evaluate(`(() => { document.getElementById('playerName').value = 'Night Tester'; document.getElementById('modeHunt').click(); })()`);
  await page.waitFor(`TT.getPhase() === 'prep' && !document.body.classList.contains('deploying')`, { timeout: 90000 });
  const report = await page.evaluate(`(() => {
    TT.clearZombies(); TT.setDay(16); TT.startPrep();
    TT.player.position.set(3.2, TT.sampleHeight(3.2, -5.9), -5.9);
    TT.openHQBriefingDbg();
    document.querySelector('#hqBriefing .briefing-nav button:nth-child(1)')?.click();
    const text = document.querySelector('#hqBriefing .briefing-content')?.innerText || '';
    return { day: TT.getDay(), text };
  })()`);
  await page.screenshot(path.join(out, 'night-17-scouting-after-1280.png'));
  await page.setViewport(390, 844, 1);
  await page.screenshot(path.join(out, 'night-17-scouting-after-390.png'));
  report.overflowX = await page.evaluate(`document.documentElement.scrollWidth > innerWidth`);
  report.errors = page.errors;
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2), 'utf8');
  console.log(JSON.stringify(report));
  if (report.day !== 17 || !report.text.includes('NIGHT 17 · SWARM') || report.text.includes('Rest night · lighter mix') || !report.text.includes('Fast attackers from every cave') || report.overflowX || report.errors.length) process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  await server.close();
}
