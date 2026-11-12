import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
if(!process.env.DW_GAME_TEST_TOKEN)throw Error('Use exclusive crew slot');
const root=fileURLToPath(new URL('../..',import.meta.url)),out=path.join(root,'review/GP-20127'),pause=ms=>new Promise(r=>setTimeout(r,ms));
const server=await serve(root,0),runs=[];
const probeArg=process.argv.find(a=>a==='--probe'||a.startsWith('--probe=')),probe=!!probeArg,probeGun=probeArg?.split('=')[1]||'pistol';
try{for(const [i,gun] of (probe?[probeGun]:['pistol','pistol','pistol','uzi','revolver']).entries()){
 const browser=await launch({headless:false,args:['--disable-background-timer-throttling','--window-size=1280,720']});
 const run={i:i+1,gun,at:new Date().toISOString()};
 try{
  const page=await browser.newPage({width:1280,height:720});
  await page.goto(server.origin+'/index.html?debug=1',{timeout:240000});await page.waitFor('!!window.TT && DWLoad.snapshot().state==="ready"',{timeout:120000});
  await page.evaluate('DWOpening.dismissForTesting()');await page.waitFor('!DWOpening.active');
  await page.evaluate('document.getElementById("playerName").value="GP-20127";document.getElementById("modeTraining").click()');
  if(!await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:120000}))throw Error('Training entry');
  await page.evaluate('TT.setViewFirstDbg(true);const t=TT.trainingDbg.tg();TT.player.position.set(t.origin.x,t.floorY,t.origin.z-10)');
  if(gun!=='pistol'){
   run.purchase=await page.evaluate(`(()=>{const T=TT,t=T.trainingDbg.tg(),f=t.stations.armory.front;T.player.position.set(f.x,t.floorY,f.z);T.doAction();const b=document.querySelector('#armoryPanel [data-buy-gun=${gun}]');const disabled=b?.disabled;b?.click();const A=T.armoryDbg.ui().armory,take=A.take('${gun}','secondary',0);A.close?.();T.armoryDbg.ui().close();T.player.position.set(t.origin.x,t.floorY,t.origin.z-10);return {button:!!b,disabled,take,owned:T.getWeaponOwned()['${gun}']};})()`);
  }
  await pause(1500);
  run.instrument=await page.evaluate(`(()=>{window.S={stage:'setup',last:0,gaps:[],pipelines:[],buffers:[],errors:[]};
    const d=TT.renderer.backend?.device;
    for(const name of ['createRenderPipeline','createRenderPipelineAsync','createComputePipeline','createComputePipelineAsync','createBuffer']){
     if(!d||typeof d[name]!=='function')continue;
     try{const original=d[name].bind(d);d[name]=desc=>{const e={name,stage:S.stage,t:performance.now(),label:desc?.label||'',size:desc?.size||0,usage:desc?.usage||0};if(name!=='createBuffer')e.activeCases=TT.casings.map(c=>({caseOf:c.mesh.userData.caseOf,geometry:c.mesh.geometry.id,material:c.mesh.material.id,vertices:c.mesh.geometry.attributes.position.count}));(name==='createBuffer'?S.buffers:S.pipelines).push(e);return original(desc);};}catch(e){S.errors.push(name+':'+e.message);}
    }
    window.stage=n=>{S.stage=n;return performance.now();};
    const tick=t=>{if(S.last&&t-S.last>50)S.gaps.push({stage:S.stage,ms:+(t-S.last).toFixed(2),at:t});S.last=t;requestAnimationFrame(tick);};requestAnimationFrame(tick);
    window.shotSnapshot=()=>{const T=TT,v=T.viewmodelDbg(),gun=T.weaponMeshes[T.getCurrentWeapon()],parts=[];
     for(const [space,root] of [['world',gun],['eye',v?.gun?.root]])root?.traverse(o=>{if(o.isMesh&&(/round|case|flash|muzzle/i.test(o.name)||o===gun?.userData?.flash||o===v?.gun?.flash))parts.push({space,name:o.name,visible:o.visible,geometry:o.geometry.id,material:o.material.id});});
     const cases=T.casings.map(c=>({name:c.mesh.name,geometry:c.mesh.geometry.id,count:c.mesh.geometry.attributes.position.count,caseOf:c.mesh.userData.caseOf}));
     return {t:performance.now(),gun:T.getCurrentWeapon(),flags:T.vaultDbg.flags(),ammo:T.getAmmo()[T.getCurrentWeapon()],pipelines:T.renderer._pipelines?.caches?.size??-1,geometries:T.renderer.info.memory.geometries,textures:T.renderer.info.memory.textures,heap:performance.memory?.usedJSHeapSize||0,cases,parts,devicePipelines:S.pipelines.length,deviceBuffers:S.buffers.length};};
    return {device:!!d,hooks:S.errors};})()`);
  await page.evaluate('stage("draw");TT.takeOutGun('+JSON.stringify(gun)+');TT.setWeapon(TT.WEAPON_ORDER.indexOf('+JSON.stringify(gun)+'));TT.setUnarmedDbg(false)');
  await pause(1200);await page.evaluate('stage("before-shot")');run.before=await page.evaluate('shotSnapshot()');await pause(300);
  run.shotAt=await page.evaluate('stage("first-shot")');
  await page.send('Input.dispatchMouseEvent',{type:'mousePressed',x:640,y:360,button:'left',clickCount:1});await pause(gun==='revolver'?350:50);
  await page.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:640,y:360,button:'left',clickCount:1});await pause(2200);
  run.shotEnd=await page.evaluate('stage("after-shot")');run.after=await page.evaluate('shotSnapshot()');run.data=await page.evaluate('S');run.errors=page.errors.slice();
  run.firstShotGaps=run.data.gaps.filter(g=>g.stage==='first-shot');run.newPipelines=run.data.pipelines.filter(e=>e.stage==='first-shot');run.newBuffers=run.data.buffers.filter(e=>e.stage==='first-shot');
  console.log(JSON.stringify({i:run.i,gun,before:run.before.ammo,after:run.after.ammo,gaps:run.firstShotGaps,pipelines:run.newPipelines,buffers:run.newBuffers,errors:run.errors}));
  if(run.before.gun!==gun||run.before.ammo-run.after.ammo!==1)run.invalid='Expected exactly one shot from selected gun';
 }catch(e){run.failure=String(e.stack||e);console.error(run.failure);}
 finally{runs.push(run);fs.writeFileSync(path.join(out,probe?'probe-'+probeGun+'.json':'runs.json'),JSON.stringify(runs,null,2));await browser.close();}
}}finally{await server.close();}
console.log('COMPLETE',runs.length,'fresh browsers; failures',runs.filter(r=>r.failure||r.invalid).length);
