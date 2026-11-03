// Diagnose CU-227's real-renderer radio eye-hide failure through the shared game slot.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('use the shared game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1280,720'] });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 240000 });
  if (!await page.waitFor('!!window.TT', { timeout: 400000 })) throw new Error('TT did not boot');
  await page.evaluate(`(() => { if (window.DWOpening?.dismissForTesting) DWOpening.dismissForTesting(); })()`);
  await page.evaluate(fs.readFileSync(path.join(root, 'tools/tests/lib.js'), 'utf8'));
  const result = await page.evaluate(`(async()=>{
    const T=window.TT, wait=(ms)=>new Promise(r=>setTimeout(r,ms));
    await startMatch(T,'GP20016');
    T.clearZombies?.(); T.setHp(100000); T.grantAllWeapons();
    for(let i=0;i<16 && T.getCurrentWeapon()!=='pistol';i++){T.setWeapon(T.WEAPON_ORDER.indexOf('pistol'));await wait(150)}
    T.setViewFirstDbg(true);
    for(let i=0;i<150 && !(T.viewmodelDbg()?.info?.raise>0.99);i++)await wait(100);
    await wait(600);
    const vm=T.viewmodelDbg(),ud=T.marine.userData,vest=ud.gearParts.vest;
    const radio=vest.filter(o=>o.userData.vmEyeRadio),carrier=vest.filter(o=>!o.userData.vmEyeRadio);
    const skins=ud.rigSkin?.skins||[], sources=ud.rigSkin?.sources||[];
    return {backend:T.getRendererBackend(),active:vm.info.active,filtering:vm.filtering,
      radio:radio.map(o=>({name:o.name,type:o.type,visible:o.visible,castShadow:o.castShadow,hidden:vm.isEyeHidden(o),parent:o.parent?.name||o.parent?.type})),
      carrier:{n:carrier.length,visible:carrier.filter(o=>o.visible).length,eyeVisible:carrier.filter(o=>o.visible&&!vm.isEyeHidden(o)).length},
      radioSkins:skins.filter(o=>o.userData.rigSplit===2).map(o=>({hidden:vm.isEyeHidden(o),castShadow:o.castShadow})),
      bakedRadio:sources.filter(s=>s.o?.userData?.vmEyeRadio&&s.baked).length};
  })()`);
  fs.writeFileSync(path.join(root, 'review/GP-20016/radio-probe.json'), JSON.stringify(result, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify(result, null, 2));
  if (page.errors.length) throw new Error('page errors: ' + page.errors.slice(0, 3).join(' | '));
} finally { await browser.close(); await server.close(); }
