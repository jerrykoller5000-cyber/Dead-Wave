import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {launch} from '../../tools/cdp.mjs';
import {serve} from '../../tools/serve.mjs';

const phase=process.argv[2];
assert(process.env.DW_GAME_TEST_TOKEN && ['before','after'].includes(phase));
const root=fileURLToPath(new URL('../../',import.meta.url));
const folder=path.join(root,'review/GT-20076',phase,'armory');
await fs.mkdir(folder,{recursive:true});
const server=await serve(root,0);
const browser=await launch({headless:false});
try {
  const page=await browser.newPage({width:960,height:540});
  await page.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  await page.evaluate('DWOpening.dismissForTesting()');
  await page.evaluate(await fs.readFile(path.join(root,'tools/tests/lib.js'),'utf8'));
  await page.evaluate("startMatch(TT,'Assembly review')");
  await page.evaluate(`TT.clearZombies(); TT.setHp(100000); TT.grantAllWeapons(); TT.modsOwnAllDbg();
    const css=document.createElement('style');css.textContent='body > :not(canvas):not(script):not(style):not(#view){visibility:hidden!important}';document.head.append(css);`);
  for (const [id,kind] of [['m4','acog'],['revolver','prism'],['pistol','rmr'],['pistol','light'],['aa12','light']]) {
    const anchor=await page.evaluate(`(()=>{
      const id='${id}',kind='${kind}',gun=TT.weaponMeshes[id];
      if(kind!=='light') TT.opticDbg.fit(id,kind); else gun.userData.laserLightUnit.visible=true;
      const target=kind==='light'?gun.userData.laserLightUnit:gun.userData.fittedOptic;
      const local=gun.worldToLocal(target.getWorldPosition(gun.position.clone())).multiply(gun.scale);
      const copy=TT.cloneLean(gun);copy.position.set(30,80,-60);copy.rotation.set(0,0,0);copy.visible=true;
      TT.scene.add(copy);window.reviewCopy=copy;return local.toArray();
    })()`);
    for(const [side,dx,dy,dz] of [['front',-.32,.065,.19],['side',-.38,.018,-.012]]) {
      const [tx,ty,tz]=[30+anchor[0],80+anchor[1]+.012,-60+anchor[2]];
      await page.evaluate('TT.setWorldTime(.4);TT.setShotView('+JSON.stringify({x:tx+dx,y:ty+dy,z:tz+dz,tx,ty,tz,fov:27})+');new Promise(r=>setTimeout(r,260))');
      const shot=await page.send('Page.captureScreenshot',{format:'jpeg',quality:90});
      await fs.writeFile(path.join(folder,id+'-'+kind+'-'+side+'.jpg'),Buffer.from(shot.data,'base64'));
    }
    await page.evaluate('TT.scene.remove(reviewCopy);true');
  }
  assert.deepEqual(page.errors,[]);
  console.log('PASS 10 fitted Armory close-ups');
} finally {await browser.close();await server.close();}
