import fs from 'node:fs';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {serve} from '../tools/serve.mjs';
const{chromium}=createRequire(import.meta.url)('playwright'),phase=process.argv.includes('--before')?'before':'after',out='review/sling-gameplay';
fs.mkdirSync(out+'/'+phase,{recursive:true});const server=await serve(process.cwd(),0);let browser;
const timer=setTimeout(()=>{console.error('Live sling check timeout');process.exit(2);},120000);
try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const p=await browser.newPage({viewport:{width:1100,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(server.origin+'/index.html?debug=1&raf=timer',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:60000});
 await p.evaluate(()=>{DWOpening.dismissForTesting();document.getElementById('playerName').value='Live slings';document.getElementById('modeTraining').click();});
 await p.waitForFunction(()=>TT.trainingDbg.state().active&&!document.getElementById('trainingBlackout')?.classList.contains('on'));
 const setup=await p.evaluate(async()=>{
  window.TH=await import('./vendor/three/three.webgpu.js');
  TT.buyWeapon('shotgun');TT.buyWeapon('m4');TT.takeOutGun('shotgun');TT.takeOutGun('m4');
  for(const key of ['vest','helmet'])TT.buyGear(TT.GEAR.find(g=>g.key===key));
  const tg=TT.trainingDbg.tg();TT.player.position.set(tg.origin.x,tg.floorY,tg.origin.z-2);
  const cv=[...document.querySelectorAll('canvas')].sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight)[0],keep=new Set();
  for(let e=cv;e&&e!==document.body;e=e.parentElement)keep.add(e);for(const e of document.body.children)if(!keep.has(e))e.style.setProperty('display','none','important');
  return TT.carryDbg().slung;
 });assert.deepEqual(setup,['shotgun','m4']);
 // These views use the actual animated player and actual purchased loadout.
 const shots=[['front',0,3.7,2.9],['quarter',.55,3.7,2.9],['side',1.57,1.9,3.1],['rear',2.8,2.1,3.1],['game-size',.3,5.3,5.9]];
 const states={};
 for(const[id,angle,height,distance]of shots){
  await p.evaluate(({id,angle,height,distance})=>{
   TT.setAimYawDbg(0);const m=TT.getMarine(),origin=m.getWorldPosition(new TH.Vector3());
   TT.setShotView({x:origin.x+Math.sin(angle)*distance,y:origin.y+height,z:origin.z+Math.cos(angle)*distance,tx:origin.x,ty:origin.y+1,tz:origin.z,fov:id==='game-size'?45:30});
  },{id,angle,height,distance});
  await p.waitForTimeout(500);
  states[id]=await p.evaluate(()=>{
   const m=TT.getMarine();m.updateMatrixWorld(true);
   return m.userData.carry.slings.map(s=>{
    const vertices=s.sling.geometry.attributes.position,data=s.sling.userData.fit;
    const errors=data.anchors.map((a,i)=>{
     const actual=new TH.Vector3();for(let j=0;j<4;j++)actual.add(new TH.Vector3().fromBufferAttribute(vertices,(i?vertices.count-4:0)+j));
     s.sling.localToWorld(actual.multiplyScalar(.25));return actual.distanceTo(s.gun.children[0].localToWorld(new TH.Vector3(...a)));
    });return {kind:s.kind,visible:s.sling.visible,errors,gun:s.gun.position.toArray(),side:s.g.position.x};
   });
  });await p.screenshot({path:out+'/'+phase+'/'+id+'.png'});
  if(id==='quarter'&&phase==='after')await p.screenshot({path:out+'/connection-detail.png',clip:{x:320,y:130,width:520,height:660}});
 }
 assert(Object.values(states).flat().every(s=>s.visible&&s.errors.every(e=>e<1e-5)),'live strap endpoints');
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/'+phase+'.json',JSON.stringify({states,errors},null,2));
 console.log('PASS '+phase+' actual Training player, purchased shotgun/M4, five gameplay views, attached vertex endpoints, zero page errors');
}finally{clearTimeout(timer);await browser?.close();server.close();}
