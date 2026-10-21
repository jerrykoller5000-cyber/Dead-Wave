import fs from 'node:fs';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {serve} from '../tools/serve.mjs';
const {chromium}=createRequire(import.meta.url)('playwright'),phase=process.argv.includes('--before')?'before':'after',out='review/shoulder-straps';
fs.mkdirSync(out+'/'+phase,{recursive:true});const server=await serve(process.cwd(),0);let browser;
const timer=setTimeout(()=>{console.error('Shoulder check timeout');process.exit(2);},120000);
try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const p=await browser.newPage({viewport:{width:1000,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(server.origin+'/index.html?debug=1&raf=timer',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:60000});
 await p.evaluate(()=>{DWOpening.dismissForTesting();document.getElementById('playerName').value='Shoulder fitting';document.getElementById('modeTraining').click();});
 await p.waitForFunction(()=>TT.trainingDbg.state().active&&!document.getElementById('trainingBlackout')?.classList.contains('on'));
 await p.evaluate(async()=>{
  TT.getMarine().visible=false;window.G=TT.makeMarine();G.position.set(0,-200,-647);TT.scene.add(G);
  const {rigs}=await import('./studio/rigs.js'),{loadClip,sampleClip,applyPose}=await import('./studio/clip.js');
  window.GV={inst:rigs.get('marine').create({group:G}),sampleClip,applyPose,clips:{}};
  for(const key of ['stand','run'])GV.clips[key]=loadClip(await(await fetch('./studio/clips/marine/'+key+'.json')).json());
  const cv=[...document.querySelectorAll('canvas')].sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight)[0],keep=new Set();
  for(let e=cv;e&&e!==document.body;e=e.parentElement)keep.add(e);for(const e of document.body.children)if(!keep.has(e))e.style.setProperty('display','none','important');
 });
 const shots=[['shirt-overhead',false,true,0,[]],['carrier-overhead',true,true,0,[]],['shirt-rifle',false,true,.25,['m4']],['carrier-rifle',true,true,.25,['m4']],['carrier-side',true,false,1.57,[]],['shirt-side',false,false,1.57,[]],['back',true,false,2.8,[]],['run',true,true,.5,['m4','sniper']]];
 const states={};
 for(const[id,vest,above,angle,primary]of shots){
  states[id]=await p.evaluate(({id,vest,above,angle,primary})=>{
   const u=G.userData;G.rotation.y=angle;GV.applyPose(GV.inst,GV.sampleClip(GV.clips[id==='run'?'run':'stand'],id==='run'?.25:0));
   if(above&&id!=='run'){u.armLG.rotation.x=-1.25;u.armRG.rotation.x=-1.25;u.elbowLG.rotation.x=-.6;u.elbowRG.rotation.x=-.6;}
   for(const[k,list]of Object.entries(u.gearParts))for(const part of list)part.visible=(vest?['helmet','vest','pads']:['helmet','bareTorso']).includes(k);
   TT.carryPreview(G,{loadout:{primary,secondary:[]},inHand:null,vest,grenades:0});
   TT.setShotView({x:0,y:above?-195.8:-198.8,z:above?-644.1:-643.9,tx:0,ty:-198.98,tz:-647,fov:above?24:30});
   return {joints:[u.armLG,u.armRG,u.elbowLG,u.elbowRG].map(o=>[...o.position.toArray(),...o.rotation.toArray()]),gear:Object.fromEntries(Object.entries(u.gearParts).map(([k,l])=>[k,l.some(o=>o.visible)]))};
  },{id,vest,above,angle,primary});
  await p.waitForTimeout(150);await p.screenshot({path:out+'/'+phase+'/'+id+'.png'});
 }
 if(phase==='after'){
  const old=JSON.parse(fs.readFileSync(out+'/before.json','utf8'));assert.deepEqual(states,old.states,'joints and visibility unchanged');
  const t=await p.evaluate(fs.readFileSync('tools/tests/t140.js','utf8'));assert(!t.includes('FAIL'),t);fs.writeFileSync(out+'/t140.txt',t);
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/'+phase+'.json',JSON.stringify({states,errors},null,2));console.log('PASS '+phase+' eight shoulder views; zero page errors'+(phase==='after'?'; unchanged joints/visibility and t140 pass':''));
}finally{clearTimeout(timer);await browser?.close();server.close();}
