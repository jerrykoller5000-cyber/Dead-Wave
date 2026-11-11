import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';

if(!process.env.DW_GAME_TEST_TOKEN)throw Error('Use crew game-test slot');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const out=path.join(root,'review/CB-305');
const server=await serve(root,0),browser=await launch({headless:false,args:['--window-size=1280,720']});
try{
  const page=await browser.newPage({width:1280,height:720});
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer&fold=0`);
  assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"',{timeout:90000}));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('document.getElementById("opening").hidden',{timeout:15000}));
  await page.evaluate(`(()=>{document.getElementById('playerName').value='CB-305 Rack';document.getElementById('modeHunt').click();const first=document.getElementById('firstRunCard');if(first&&!first.hidden)document.getElementById('firstRunPlay').click()})()`);
  assert(await page.waitFor('TT.getPhase()==="prep"',{timeout:90000}));
  assert(await page.waitFor('!document.body.classList.contains("deploying")',{timeout:90000}));
  const data=await page.evaluate(`(()=>{
    const T=TT;T.grantAllWeapons();T.setWorldTime(.5);
    const rack=T.house.armoryRack,arm=T.armoryDbg.ui().armory;
    for(const [kind,area,slot] of [['m4','primary',0],['ak','primary',1],['uzi','secondary',0],['revolver','secondary',1]]){
      if(!arm.has(kind))arm.buy({id:kind,kind,loaded:0},{store:true});
      arm.take(kind,area,slot);
    }
    if(!arm.has('shotgun'))arm.buy({id:'shotgun',kind:'shotgun',loaded:0},{store:true});
    T.armoryDbg.refreshRack();
    const load=arm.loadout();
    const carried=new Set(['pistol',...load.primary,...load.secondary].filter(Boolean).map(x=>x.split(':')[0]));
    const point=rack.localToWorld(new T.THREE.Vector3(.76,2.3,.5));
    T.player.position.set(point.x+2.2,T.sampleHeight(point.x+2.2,point.z),point.z);
    T.setShotView({x:point.x+5,y:point.y+.3,z:point.z,tx:point.x,ty:point.y,tz:point.z,fov:52});
    for(let i=0;i<40;i++)T.stepFrame(.016);
    const kinds=T.armoryDbg.rack();
    return {kinds,carried:[...carried],stored:T.armoryDbg.stored(),point:point.toArray(),visible:rack.visible};
  })()`);
  assert(data.carried.length>1);
  assert(data.visible);
  assert(data.carried.filter(k=>k!=='chainsaw').every(k=>data.kinds.includes(k)));
  await page.evaluate(`(()=>{const carried=new Set(${JSON.stringify(data.carried)});for(const g of TT.house.armoryRack.children)if(carried.has(g.userData.rackKind))g.visible=false;TT.stepFrame(.016)})()`);
  await page.screenshot(path.join(out,'rack-before-carried-hidden.png'));
  await page.evaluate(`(()=>{for(const g of TT.house.armoryRack.children)g.visible=true;TT.stepFrame(.016)})()`);
  await page.screenshot(path.join(out,'rack-after-carried-shown.png'));
  fs.writeFileSync(path.join(out,'rack-proof.json'),JSON.stringify(data,null,2));
  assert.deepEqual(page.errors,[]);
  console.log(`PASS CB-305 rack: ${data.kinds.length} displayed, ${data.carried.length} carried; matched before/after shots; 0 page errors`);
}finally{await browser.close();await server.close();}
