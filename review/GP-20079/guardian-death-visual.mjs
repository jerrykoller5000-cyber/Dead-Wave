import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Run through crew.mjs slot run');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20079/guardian-death-final');
fs.mkdirSync(out, { recursive: true });
const kinds = ['guardian','caveguard'];
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--window-size=960,960'] });
const summary = [];
try {
  const page = await browser.newPage({ width: 960, height: 960 });
  await page.goto(`${server.origin}/index.html?inspect&raf=timer`);
  if (!await page.waitFor('(window.DWInspect && DWInspect.ready) || !!window.DWInspectError', { timeout: 180000 })) throw Error('inspector not ready');
  if (await page.evaluate('!!window.DWInspectError')) throw Error(await page.evaluate('String(window.DWInspectError)'));
  await page.evaluate("document.querySelector('#dwi')?.classList.add('bare')");
  for (const kind of kinds) {
    await page.evaluate(`(async () => {
      await DWInspect.show('zombie.${kind}', {mode:'live'});
      TT.killZombie(DWInspect.zombie.get(), false, {kind:'melee',dir:{x:0,z:0}}); await DWInspect.stepAsync(36);
      DWInspect.light('noon');
      const T=TT.THREE, o=TT.getCorpses().at(-1).mesh;
      const b=new T.Box3().setFromObject(o), c=b.getCenter(new T.Vector3()), s=b.getSize(new T.Vector3());
      const d=Math.max(4,s.y*3.2,s.z*3.0);
      TT.getMarine().visible=false;
      TT.setShotView({x:c.x+d,y:c.y+s.y*.1,z:c.z,tx:c.x,ty:c.y,tz:c.z,fov:40});
    })()`);
    const file=path.join(out, `${kind}-death-profile.png`);
    let bytes=0, attempts=0;
    while (attempts < 8) {
      attempts++;
      await new Promise(resolve=>setTimeout(resolve,350));
      await page.screenshot(file);
      bytes=fs.statSync(file).size;
      if (bytes > 50000) break;
      await page.evaluate('DWInspect.stepAsync(1)');
    }
    summary.push({kind,view:'profile',attempts,bytes,valid:bytes>50000});
    console.log(`${kind} profile: ${bytes} bytes in ${attempts} capture(s)`);
    await page.evaluate(`(() => {
      const T=TT.THREE, o=TT.getCorpses().at(-1).mesh;
      const b=new T.Box3().setFromObject(o), c=b.getCenter(new T.Vector3()), s=b.getSize(new T.Vector3());
      const d=Math.max(6,s.y*3.5);
      TT.setShotView({x:c.x+d*.68,y:c.y+s.y*1.1,z:c.z+d*.68,
        tx:c.x,ty:c.y,tz:c.z,fov:50});
    })()`);
    const gameplay=path.join(out, `${kind}-death-gameplay.png`);
    bytes=0;attempts=0;
    while (attempts < 8) {
      attempts++;
      await new Promise(resolve=>setTimeout(resolve,350));
      await page.screenshot(gameplay);
      bytes=fs.statSync(gameplay).size;
      if (bytes > 50000) break;
      await page.evaluate('DWInspect.stepAsync(1)');
    }
    summary.push({kind,view:'gameplay',attempts,bytes,valid:bytes>50000});
    console.log(`${kind} gameplay: ${bytes} bytes in ${attempts} capture(s)`);
    for (const light of ['overcast','dusk','night']) {
      await page.evaluate(`DWInspect.light('${light}')`);
      const lit=path.join(out, `${kind}-death-gameplay-${light}.png`);
      bytes=0;attempts=0;
      while (attempts < 8) {
        attempts++;
        await new Promise(resolve=>setTimeout(resolve,350));
        await page.screenshot(lit);
        bytes=fs.statSync(lit).size;
        if (bytes > 50000) break;
        await page.evaluate('DWInspect.stepAsync(1)');
      }
      summary.push({kind,view:`gameplay-${light}`,attempts,bytes,valid:bytes>50000});
      console.log(`${kind} ${light}: ${bytes} bytes in ${attempts} capture(s)`);
    }
  }
  fs.writeFileSync(path.join(out,'captures.json'), JSON.stringify(summary,null,2));
  if(summary.some(s=>!s.valid)) process.exitCode=1;
} finally { await browser.close(); await server.close(); }
