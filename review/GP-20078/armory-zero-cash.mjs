import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('Run through crew.mjs slot run');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20078');
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1280,720'] });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1`);
  if (!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state === "ready"', { timeout: 90000 })) throw new Error('game did not load');
  await page.evaluate('DWOpening.dismissForTesting()');
  await page.waitFor('document.getElementById("opening").hidden', { timeout: 30000 });
  await page.evaluate(`(() => { document.getElementById('playerName').value='GP-20078 No Cash';document.getElementById('modeTraining').click(); })()`);
  if (!await page.waitFor('TT.trainingDbg.state().active && TT.getPhase() === "prep"', { timeout: 90000 })) throw new Error('Training did not start');
  await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 30000 });
  await new Promise(r => setTimeout(r, 1800));
  const result = await page.evaluate(`(() => { const T=TT,tg=T.trainingDbg.tg(),f=tg.stations.armory.front;T.player.position.set(f.x,tg.floorY,f.z);T.doAction();T.addCash(-T.getBank());T.armoryDbg.ui().bench('pistol');const p=document.getElementById('armoryPanel'),row=p.querySelector('[data-mod="suppressor"]'),b=row?.querySelector('button');return {bank:T.getBank(),open:!p.hidden,row:row?.textContent,disabled:b?.disabled}; })()`);
  await page.screenshot(path.join(out, '15-armory-zero-cash.png'));
  fs.writeFileSync(path.join(out, 'armory-zero-cash.json'), JSON.stringify({result,errors:page.errors},null,2));
  console.log('ZERO CASH', JSON.stringify({result,errors:page.errors.length}));
} finally { await browser.close(); await server.close(); }
