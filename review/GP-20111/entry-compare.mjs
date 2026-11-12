import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Use the game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const withoutWarm = source
  .replace(/^      armoryUI\.warm\(\);\r?\n/m, '')
  .replace(/^      await armoryUI\.warmPictures\(\(wk\) => armoryPicture\(wk, true\)\);\r?\n/m, '')
  .replace(/^      await armoryUI\.warmLayout\(\);\r?\n/m, '')
  .replace(/^      warmArmoryMods\(\);\r?\n/m, '');
if (withoutWarm === source || /await armoryUI\.warmPictures\(/.test(withoutWarm)) throw Error('Expected warm-up calls missing');
const server = await serve(root, 0);
const rows = [];
try {
  for (const phase of ['before', 'after']) for (let run = 1; run <= 2; run++) {
    const browser = await launch({ headless: false, args: ['--window-position=-3800,-3800', '--window-size=1280,720', '--disable-features=CalculateNativeWinOcclusion', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
    try {
      const page = await browser.newPage({ width: 1280, height: 720 });
      if (phase === 'before') {
        page.conn.onEvent(msg => {
          if (msg.sessionId !== page.sessionId || msg.method !== 'Fetch.requestPaused') return;
          page.send('Fetch.fulfillRequest', { requestId: msg.params.requestId, responseCode: 200,
            responseHeaders: [{ name: 'Content-Type', value: 'text/html; charset=utf-8' }],
            body: Buffer.from(withoutWarm).toString('base64') }).catch(e => { throw e; });
        });
        await page.send('Fetch.enable', { patterns: [{ urlPattern: '*index.html*', requestStage: 'Request' }] });
      }
      await page.goto(`${server.origin}/index.html?debug=1&entry=${phase}${run}`, { timeout: 120000 });
      if (!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"', { timeout: 120000 })) throw Error('load not ready');
      await page.evaluate('DWOpening.dismissForTesting()');
      if (!await page.waitFor('!window.DWOpening?.active', { timeout: 30000 })) throw Error('opening active');
      const t0 = Date.now();
      await page.evaluate(`(() => { document.getElementById('playerName').value = 'GP20111'; document.getElementById('modeTraining').click(); })()`);
      if (!await page.waitFor('TT.trainingDbg.state().active', { timeout: 90000 })) throw Error('training not active');
      if (!await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 30000 })) throw Error('blackout not lifted');
      const ms = Date.now() - t0;
      rows.push({ phase, run, ms, errors: page.errors.slice(), panelSlots: await page.evaluate(`document.getElementById('armoryPanel')?.querySelectorAll('.armory-slots button').length || 0`) });
      console.log(`${phase} run ${run}: ${ms}ms, slots ${rows.at(-1).panelSlots}, errors ${rows.at(-1).errors.length}`);
    } finally { await browser.close(); }
  }
} finally {
  fs.writeFileSync(path.join(root, 'review/GP-20111/entry-compare.json'), JSON.stringify(rows, null, 2) + '\n');
  await server.close();
}
