import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Run through crew.mjs slot run');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20079/preview'); fs.mkdirSync(out, { recursive: true });
const server = await serve(root, 0), browser = await launch({ headless: false, args: ['--window-size=1000,1000'] });
try {
  const page = await browser.newPage({ width: 1000, height: 1000 });
  await page.goto(`${server.origin}/index.html?inspect&raf=timer`);
  if (!await page.waitFor('(window.DWInspect && window.DWInspect.ready) || !!window.DWInspectError', { timeout: 180000 })) throw Error('inspector not ready');
  for (const kind of ['demon', 'colossus']) {
    for (const side of ['front', 'profile']) {
      await page.evaluate(`(async()=>{await DWInspect.show('zombie.${kind}',{mode:'walk'});await DWInspect.stepAsync(6);const z=DWInspect.zombie.get(),T=TT,b=new T.THREE.Box3().setFromObject(z.mesh),c=b.getCenter(new T.THREE.Vector3()),s=b.getSize(new T.THREE.Vector3()),d=Math.max(4,s.y*2.8,s.z*2.5);if(T.getMarine)T.getMarine().visible=false;T.setShotView({x:c.x+(${side==='profile'?'d':'0'}),y:c.y+s.y*.1,z:c.z+(${side==='front'?'d':'0'}),tx:c.x,ty:c.y,tz:c.z,fov:40});})()`);
      await new Promise(r=>setTimeout(r,300));
      await page.screenshot(path.join(out,`${kind}-${side}-before.png`));
      await page.evaluate(`(()=>{const u=DWInspect.zombie.get().mesh.userData;if('${kind}'==='demon'){u.legLG.position.x-=.08;u.legRG.position.x+=.08;}else{u.armLG.position.x-=.6;u.armRG.position.x+=.6;}DWInspect.zombie.get().mesh.updateMatrixWorld(true);})()`);
      await new Promise(r=>setTimeout(r,300));
      await page.screenshot(path.join(out,`${kind}-${side}-after.png`));
    }
  }
  console.log('POSE PREVIEW', out, 'page errors', page.errors.length);
} finally { await browser.close(); await server.close(); }
