import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if(!process.env.DW_GAME_TEST_TOKEN)throw Error('Use crew game-test slot');
const batch=Number(process.argv[2]||0),groups=[
  ['pistol','m4','ak','uzi'],['shotgun','aa12','revolver','sniper'],['launcher','flamer','chainsaw','minigun']
];const weapons=batch===3?groups.flat():groups[batch];assert(weapons);
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const out=path.join(root,'review/GP-20105');fs.mkdirSync(out,{recursive:true});
const server=await serve(root,0),browser=await launch({headless:false,args:['--window-size=1280,720']});
const report={at:new Date().toISOString(),batch,guns:[],errors:[]};
try{
  const page=await browser.newPage({width:1280,height:720});
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`);
  assert(await page.waitFor('!!window.TT&&window.DWLoad?.snapshot().state==="ready"',{timeout:90000}));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('document.getElementById("opening").hidden',{timeout:15000}));
  await page.evaluate(`(()=>{document.getElementById('playerName').value='GP-20105 near wall';document.getElementById('modeTraining').click()})()`);
  assert(await page.waitFor('TT.trainingDbg.state().active',{timeout:90000}));
  assert(await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:20000}));
  await page.evaluate(`(()=>{const T=TT;T.grantAllWeapons();T.setUnarmedDbg(false);T.setViewFirstDbg(true);for(let i=0;i<90;i++)T.stepFrame(.016)})()`);
  for(const w of weapons){
    const x=await page.evaluate(`(()=>{const T=TT,w=${JSON.stringify(w)},tg=T.trainingDbg.tg(),f=tg.stations.armory.front;
      T.setMouseFireDbg(false);T.takeOutGun(w);T.setWeapon(T.WEAPON_ORDER.indexOf(w));
      T.player.position.set(f.x,tg.floorY,f.z);T.setVelDbg(0,0);T.setOtsAimDbg(Math.PI/2,0);T.setAimYawDbg(Math.PI/2);
      for(let i=0;i<110;i++)T.stepFrame(.016);
      return {weapon:T.getCurrentWeapon(),player:T.player.position.toArray(),eye:T.camera.position.toArray(),aim:T.getAimDirDbg().toArray(),
        cameraDir:T.camera.getWorldDirection(new T.THREE.Vector3()).toArray(),yaw:T.otsDbg().yaw,
        armory:tg.stations.armory.x,fp:TT.fpDbg().first,vmKey:T.viewmodelDbg()?.gun?.key};})()`);
    report.guns.push({w,...x});
    await page.screenshot(path.join(out,`weapon-${w}-true-wall.png`));
  }
  report.errors=page.errors.slice();assert.deepEqual(report.errors,[]);
  assert(report.guns.every(g=>g.fp&&g.weapon===g.w&&g.cameraDir[0]>.8));
  console.log(`GP-20105 true wall batch ${batch}: ${report.guns.map(g=>g.w+' viewX='+g.cameraDir[0].toFixed(2)).join(' ')}; 0 errors`);
}catch(e){report.failure=String(e?.stack||e);console.error(report.failure);process.exitCode=1;}
finally{fs.writeFileSync(path.join(out,`weapons-wall-${batch}.json`),JSON.stringify(report,null,2)+'\n');await browser.close();await server.close();}
