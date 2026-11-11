import assert from 'node:assert/strict';
import {setTimeout as wait} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
import {save} from '../GT-20076/save.mjs';
import {sampleHigh} from '../GT-20076/frame-sample.mjs';

const id=process.argv[2];assert(process.env.DW_GAME_TEST_TOKEN && ['shotgun','pistol'].includes(id));
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{
  const page=await browser.newPage({width:1280,height:720});
  const first=await sampleHigh(page,server.origin,id);
  await page.evaluate(`(async()=>{
    const {updateArtworkInstances}=await import('/studio/weapon-model-hooks.js');
    TT.modsOwnAllDbg();TT.addCash(100000);if(!TT.armoryDbg.fit(sampleGun,'laserLight',true))throw Error('Light fitting failed');
    await new Promise(resolve=>setTimeout(resolve,600));
    window.lightTrial={phase:'idle',start:performance.now(),peak:0,releases:0,last:0};
    TT.inspectHost().attach({held:()=>false,scale:dt=>dt,frame:()=>{
      const state=window.lightTrial,gun=TT.viewmodelDbg().gun,control=gun?.ctrls.lightSwitch;
      if(!control)return;
      const spec=TT.weaponMeshes[sampleGun].userData.lightSwitch;
      const t=((performance.now()-state.start)%1200)/1000;
      const weight=state.phase==='press'?Math.max(0,Math.min(1,t/.14,(.6-t)/.14)):0;
      if(!weight && state.last>0)state.releases++;
      state.last=weight;state.peak=Math.max(state.peak,weight);
      control.position.fromArray(control.userData.restPosition);
      control.position.x+=spec.axis[0]*spec.travel*weight;
      control.position.y+=spec.axis[1]*spec.travel*weight;
      control.position.z+=spec.axis[2]*spec.travel*weight;
      updateArtworkInstances(TT.THREE,gun.root);
    }});
  })()`);
  const trials=[];
  for(const phase of ['idle','press','idle']){
    await page.evaluate('Object.assign(lightTrial,{phase:'+JSON.stringify(phase)+',start:performance.now(),peak:0,releases:0,last:0});true');
    const samples=[];
    for(let i=0;i<12;i++){
      await wait(1000);
      const snap=await page.evaluate('({weapon:TT.getCurrentWeapon(),high:TT.getGfx(),eye:TT.viewmodelDbg().gun.key,...TT.perfSnapshot()})');
      assert.equal(snap.weapon,id);assert.equal(snap.eye,id);assert.equal(snap.high,'high');samples.push(snap);
    }
    const mean=key=>Math.round(samples.slice(-10).reduce((sum,v)=>sum+v[key],0))/10;
    const state=await page.evaluate('({peak:lightTrial.peak,releases:lightTrial.releases})');
    if(phase==='press')assert(state.peak===1 && state.releases>=6);
    else assert.equal(state.peak,0);
    trials.push({phase,...state,fps:mean('fps'),low:mean('low'),samples});
    console.log('PASS',id,phase,trials.at(-1).fps,'fps',trials.at(-1).low,'low',state.releases,'releases');
  }
  await save(new URL('./timing-'+id+'.json',import.meta.url),JSON.stringify({id,readyMs:first.readyMs,trials},null,2)+'\n');
  assert.deepEqual(page.errors,[]);
}finally{await browser.close();await server.close();}
