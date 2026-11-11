import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';

if(!process.env.DW_GAME_TEST_TOKEN)throw Error('Use crew game-test slot');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const out=path.join(root,'review/GP-20094');
fs.mkdirSync(out,{recursive:true});
const server=await serve(root,0),browser=await launch({headless:false,args:['--window-size=1280,720']});
const rows=[];
try{
  const page=await browser.newPage({width:1280,height:720});
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`);
  assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"',{timeout:90000}));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('document.getElementById("opening").hidden',{timeout:15000}));
  await page.evaluate(`(()=>{document.getElementById('playerName').value='GP-20094 Rack';document.getElementById('modeHunt').click();const first=document.getElementById('firstRunCard');if(first&&!first.hidden)document.getElementById('firstRunPlay').click()})()`);
  assert(await page.waitFor('TT.getPhase()==="prep"',{timeout:90000}));
  assert(await page.waitFor('!document.body.classList.contains("deploying")',{timeout:90000}));
  for(const state of ['stored','carried']){
    const row=await page.evaluate(`((state)=>{
      const T=TT,arm=T.armoryDbg.ui().armory,rack=T.house.armoryRack;
      T.grantAllWeapons();T.setWorldTime(.5);
      if(!arm.has('shotgun'))arm.buy({id:'shotgun',kind:'shotgun',loaded:0},{store:true});
      if(state==='carried')for(const [kind,area,slot] of [['m4','primary',0],['ak','primary',1],['uzi','secondary',0],['revolver','secondary',1]]){
        if(!arm.has(kind))arm.buy({id:kind,kind,loaded:0},{store:true});
        arm.take(kind,area,slot);
      }
      T.armoryDbg.refreshRack();
      const point=rack.localToWorld(new T.THREE.Vector3(.76,2.3,.5));
      T.player.position.set(point.x+2.2,T.sampleHeight(point.x+2.2,point.z),point.z);
      T.setShotView({x:point.x+5,y:point.y+.3,z:point.z,tx:point.x,ty:point.y,tz:point.z,fov:52});
      for(let i=0;i<90;i++)T.stepFrame(.016);
      const sample=(visible)=>{
        rack.visible=visible;
        const calls=[],ms=[];
        for(let i=0;i<24;i++){
          const before=T.renderer.info.render;
          const start=before.drawCalls ?? before.calls ?? 0;
          const t0=performance.now();T.renderer.render(T.scene,T.camera);
          const info=T.renderer.info.render;
          if(i>=8){calls.push((info.drawCalls ?? info.calls ?? 0)-start);ms.push(performance.now()-t0);}
        }
        const median=a=>a.slice().sort((x,y)=>x-y)[Math.floor(a.length/2)];
        return {calls:median(calls),ms:median(ms),range:[Math.min(...calls),Math.max(...calls)]};
      };
      const off=sample(false),on=sample(true);
      return {state,kinds:T.armoryDbg.rack(),carried:arm.loadout(),stored:T.armoryDbg.stored(),off,on,rackCalls:on.calls-off.calls,camera:T.camera.position.toArray()};
    })(${JSON.stringify(state)})`);
    rows.push(row);
    await page.screenshot(path.join(out,`${state}-folded-rack.png`));
  }
  assert(rows[0].kinds.length>=2&&rows[1].kinds.length>=6);
  assert.deepEqual(page.errors,[]);
  fs.writeFileSync(path.join(out,'folded-rack-cost.json'),JSON.stringify(rows,null,2));
  console.log(`PASS GP-20094 folded rack: ${rows[0].kinds.length} stored-view copies cost ${rows[0].rackCalls} draws; ${rows[1].kinds.length} carried-view copies cost ${rows[1].rackCalls} draws; added ${rows[1].rackCalls-rows[0].rackCalls} draws; 0 page errors`);
}finally{await browser.close();await server.close();}
