// GP-107: bounded real-renderer check; --before records the unchanged scene.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {serve} from '../tools/serve.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const version=process.argv.includes('--v2')?'v2':'v1';
const root=fileURLToPath(new URL('..',import.meta.url)),out=path.join(root,'review/ranger-camp',version);
fs.mkdirSync(out,{recursive:true});
const before=process.argv.includes('--before'),prefix=before?'before':'after';
// Keep exact baseline sources for deterministic geometry/collider comparisons.
if(before)fs.copyFileSync(path.join(root,'assets/world/campsites.js'),path.join(out,'camp-before.js'));
const server=await serve(root,0);let browser;
const hard=setTimeout(()=>{console.error('GP-107 bounded check timed out');process.exit(2);},120000);
try{
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(server.origin+'/index.html?debug=1&raf=timer',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:45000});
 await page.evaluate(()=>DWOpening.dismissForTesting());await page.waitForFunction(()=>document.getElementById('opening').hidden);
 const info=await page.evaluate(async()=>{
  window.campReview={T:await import('three')};
  const canvas=[...document.querySelectorAll('canvas')].sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight)[0],keep=new Set();
  for(let el=canvas;el&&el!==document.body;el=el.parentElement)keep.add(el);
  for(const child of document.body.children)if(!keep.has(child))child.style.setProperty('display','none','important');
  TT.setWorldTime(.4);
  const truck=TT.historyProps.parts['ranger-truck'],camp=TT.landmarks.find(l=>l.kind==='campsite'&&l.campStyle==='ranger');
  campReview.truck=truck;campReview.camp=camp;
  let meshes=0,vertices=0;truck.traverse(o=>{if(o.isMesh){meshes++;vertices+=o.geometry.attributes.position.count;}});
  const bounds=new campReview.T.Box3().setFromObject(truck),body=truck.getObjectByName('ranger-truck-body')||truck;
  const contacts=[];for(const x of [-.94,.94])for(const z of [-1.4,1.45]){
   const p=body.localToWorld(new campReview.T.Vector3(x,.44,z));contacts.push(p.y-.44-TT.sampleHeight(p.x,p.z));
  }
  return {truck:{position:truck.position.toArray(),yaw:truck.rotation.y,meshes,vertices,radio:!!truck.getObjectByName('ranger-radio'),wheelGroundError:contacts,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()}},camp:{x:camp.x,z:camp.z,yaw:camp.campYaw,vertices:camp.mesh.geometry.attributes.position.count,colliders:camp.colliders.map(c=>({x:c.x,z:c.z,r:c.radius,y0:c.y0,y1:c.y1}))}};
 });
 assert(info.truck.radio,'story radio retained');
 if(!before){const old=JSON.parse(fs.readFileSync(path.join(out,'before-checks.json')));assert.deepEqual(info.truck.position,old.truck.position);assert.equal(info.truck.yaw,old.truck.yaw);assert.deepEqual(info.camp.colliders,old.camp.colliders);assert.equal(info.camp.yaw,old.camp.yaw);}
 if(!before)assert(info.truck.wheelGroundError.every(e=>Math.abs(e)<.075),'truck support plane meets hillside within 7.5 cm (v2 front wheel intentionally missing): '+info.truck.wheelGroundError);
 for(const view of ['camp','truck-front','truck-rear','workspace']){
  await page.evaluate(view=>{
   const {T,truck,camp}=campReview;
   let p,target;
   if(view==='camp'){
    target=new T.Vector3((truck.position.x+camp.x)/2,camp.gy+.7,(truck.position.z+camp.z)/2);
    const a=camp.campYaw;p=target.clone().add(new T.Vector3(Math.cos(a)*12+Math.sin(a)*17,17,-Math.sin(a)*12+Math.cos(a)*17));
   }else if(view==='workspace'){
    target=new T.Vector3(camp.x,camp.gy+.8,camp.z);const a=camp.campYaw;p=target.clone().add(new T.Vector3(Math.cos(a)*8+Math.sin(a)*10,8,-Math.sin(a)*8+Math.cos(a)*10));
   }else{
    target=truck.localToWorld(new T.Vector3(0,1,0));p=truck.localToWorld(new T.Vector3(view==='truck-front'?6:-6,4.5,view==='truck-front'?7:-7));
   }
   TT.setShotView({x:p.x,y:p.y,z:p.z,tx:target.x,ty:target.y,tz:target.z,fov:42});
  },view);
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await page.screenshot({path:path.join(out,prefix+'-'+view+'.png')});
 }
 assert.deepEqual(errors,[],'no renderer/page errors');
 fs.writeFileSync(path.join(out,prefix+'-checks.json'),JSON.stringify({...info,pageErrors:errors},null,2));
 console.log('PASS GP-107 '+prefix+': real renderer, radio, camp collider and world placement checks; '+JSON.stringify(info));
}finally{clearTimeout(hard);if(browser)await browser.close();server.close();}
