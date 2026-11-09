import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('use the shared game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const server = await serve(root, 0), browser = await launch({headless:false,args:['--disable-features=CalculateNativeWinOcclusion','--window-size=1280,720']});
try {
  const page = await browser.newPage({width:1280,height:720});
  for (const kind of ['rmr','prism','acog','nx8']) {
    await page.goto(`${server.origin}/review/GP-20065/viewer.html?kind=${kind}`);
    if (!await page.waitFor('!!window.VIEW', {timeout:30000})) throw new Error(`${kind} did not boot`);
    const info = await page.evaluate('window.VIEW.info');
    for (const light of ['noon','overcast','dusk','night']) for (const view of ['side','quarter','rear','sideR']) {
      await page.evaluate(`window.VIEW.shoot(${JSON.stringify(view)},${JSON.stringify(light)})`);
      const file = path.join(root,'review/GP-20065/captures',kind,light,`${view}.png`);
      await page.screenshot(file);
    }
    const errors = page.errors.splice(0);
    fs.mkdirSync(path.join(root,'review/GP-20065/captures',kind),{recursive:true});
    fs.writeFileSync(path.join(root,'review/GP-20065/captures',kind,'info.json'),JSON.stringify({info,errors},null,2)+'\n');
    console.log(JSON.stringify({kind,tris:info.tris,size:info.size,errors:errors.length}));
    if(errors.length) throw Error(errors[0]);
  }
} finally { await browser.close(); await server.close(); }
