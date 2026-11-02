// Quick real-renderer hip/ADS contact sheet source; run only through the shared game-test slot.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('use the shared game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20012');
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--window-size=1280,720'] });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 300000 });
  if (!await page.waitFor('!!window.TT', { timeout: 600000 })) throw new Error('TT did not boot');
  await page.evaluate('DWOpening?.dismissForTesting?.()');
  await page.waitFor('!window.DWOpening||DWOpening.active===false', { timeout: 60000 });
  await page.evaluate(fs.readFileSync(path.join(root, 'tools/tests/lib.js'), 'utf8'));
  await page.evaluate(`(async()=>{
    await startMatch(TT,'VM-3'); TT.clearZombies(); TT.setHp(1e5); TT.grantAllWeapons();
    TT.setWorldTime(.42); TT.setViewFirstDbg(true);
  })()`);
  for (const key of ['m4', 'ak', 'uzi']) {
    await page.evaluate(`(async()=>{
      for(let i=0;i<16&&TT.getCurrentWeapon()!=='${key}';i++){
        TT.setWeapon(TT.WEAPON_ORDER.indexOf('${key}'));
        await new Promise(r=>setTimeout(r,150));
      }
      if(TT.getCurrentWeapon()!=='${key}')throw new Error('weapon selection failed');
      TT.setZoomHeldDbg(false);
    })()`);
    await new Promise(r=>setTimeout(r,1600));
    await page.screenshot(path.join(out, `${key}-hip.png`));
    await page.evaluate('TT.setZoomHeldDbg(true)');
    await new Promise(r=>setTimeout(r,1600));
    await page.screenshot(path.join(out, `${key}-ads.png`));
    const facts = await page.evaluate(`(()=>{
      const v=TT.viewmodelDbg();
      return {backend:TT.getRendererBackend(),key:v.info.key,active:v.info.active,
        trim:v.gun?.trimmed,ads:v.info.ads,wrist:v.info.wrist,
        mag:!!v.gun?.mag,work:!!v.gun?.work};
    })()`);
    console.log(JSON.stringify(facts));
    if (facts.backend !== 'WebGPU' || !facts.active || facts.key !== key || facts.ads < .99) throw new Error('viewmodel state invalid');
    if (page.errors.length) throw new Error('page errors: ' + page.errors.slice(0, 3).join(' | '));
  }
} finally {
  await browser.close();
  await server.close();
}
