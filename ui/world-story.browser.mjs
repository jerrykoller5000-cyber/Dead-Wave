// GP-109: read-only photographic world inventory. No gameplay source edits.
import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
import {serve} from '../tools/serve.mjs';
const {chromium}=createRequire(import.meta.url)('playwright'),root=fileURLToPath(new URL('..',import.meta.url)),out=path.join(root,'review/world-story');
fs.mkdirSync(path.join(out,'photos'),{recursive:true});const server=await serve(root,0);let browser;
const timer=setTimeout(()=>{console.error('Photo batch timeout');process.exit(2);},180000);
try{
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1200,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const source=fs.readFileSync(path.join(root,'index.html'),'utf8').replace('window.TT = stampDebugHooks({','window.WSWorld={WALL_GATE,WALL_INNER_R,PATHS}; window.TT = stampDebugHooks({');
 await page.route('**/index.html?*',r=>r.fulfill({body:source,contentType:'text/html'}));
 await page.goto(server.origin+'/index.html?debug=1&raf=timer',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:45000});
 await page.evaluate(()=>DWOpening.dismissForTesting());await page.waitForFunction(()=>document.getElementById('opening').hidden);
 const inventory=await page.evaluate(async()=>{
  window.WS={T:await import('three')};
  WS.frame=(obj,{yaw=null,d=null,up=null,target=null}={})=>{
   obj.updateWorldMatrix(true,true);
   const b=new WS.T.Box3().setFromObject(obj),p=b.getCenter(new WS.T.Vector3()),s=b.getSize(new WS.T.Vector3());
   const q=obj.getWorldQuaternion(new WS.T.Quaternion()),f=new WS.T.Vector3(0,0,1).applyQuaternion(q);
   const a=yaw??Math.atan2(f.x,f.z)+.42,dist=d??Math.max(2.2,Math.max(s.x,s.y,s.z)*1.7);
   const x=p.x+Math.sin(a)*dist,z=p.z+Math.cos(a)*dist;
   return {x,y:Math.max(p.y+(up??dist*.48),TT.sampleHeight(x,z)+.7),z,tx:p.x,ty:p.y+(target??0),tz:p.z,fov:48};
  };
  WS.isolate=(obj,opts={})=>{
   obj.updateWorldMatrix(true,true);const clone=obj.clone(true);clone.applyMatrix4(obj.parent.matrixWorld);
   WS.isolatedState=TT.scene.children.map(c=>[c,c.visible]);for(const [c]of WS.isolatedState)if(!c.isLight)c.visible=false;
   TT.scene.add(clone);WS.isolated=clone;WS.oldBackground=TT.scene.background;TT.scene.background=new WS.T.Color(0x303235);
   const p=new WS.T.Box3().setFromObject(clone).getCenter(new WS.T.Vector3());
   WS.extraLight=new WS.T.PointLight(0xffe4c4,16,30,1);WS.extraLight.position.copy(p).add(new WS.T.Vector3(1,3,3));TT.scene.add(WS.extraLight);
   return WS.frame(clone,opts);
  };
  WS.restoreIsolate=()=>{if(!WS.isolated)return;TT.scene.remove(WS.isolated,WS.extraLight);for(const [c,visible]of WS.isolatedState)c.visible=visible;TT.scene.background=WS.oldBackground;WS.isolated=null;};
  const canvas=[...document.querySelectorAll('canvas')].sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight)[0],keep=new Set();
  for(let el=canvas;el&&el!==document.body;el=el.parentElement)keep.add(el);
  for(const child of document.body.children)if(!keep.has(child))child.style.setProperty('display','none','important');
  TT.setWorldTime(.4);
  const bounds=o=>{if(!o)return null;const b=new WS.T.Box3().setFromObject(o);return {min:b.min.toArray(),max:b.max.toArray()};};
  const plain=p=>Object.fromEntries(Object.entries(p).filter(([k,v])=>v===null||['string','number','boolean'].includes(typeof v)));
  const obj=o=>({name:o.name,type:o.type,position:o.position.toArray(),yaw:o.rotation.y,bounds:bounds(o)});
  return {poi:Object.fromEntries(Object.entries(TT.POI).map(([k,v])=>[k,Array.isArray(v)?v.map(plain):v?plain(v):null])),
   landmarks:TT.landmarks.map((l,i)=>({i,...plain(l),mesh:obj(l.mesh)})),
   history:TT.historyProps.group.children.map((o,i)=>({i,...obj(o)})),
   firstPeople:Object.keys(TT.firstPeople),rabbit:Object.keys(TT.rabbitDbg.state()),
   named:TT.scene.children.filter(o=>o.name).map(obj),debugKeys:Object.keys(TT).filter(k=>/wall|grate|water|tree|plant|rock|lake|heart|boat|hollow|barrel|below/i.test(k))};
 });
 fs.writeFileSync(path.join(out,'inventory.json'),JSON.stringify(inventory,null,2));
 if(process.argv.includes('--inventory')){console.log(JSON.stringify(inventory));}
 else{
  const views=JSON.parse(fs.readFileSync(path.join(out,'views.json'),'utf8'));
  const filter=process.argv.find(a=>a.startsWith('--only='))?.slice(7).split(',');
  for(const v of views.filter(v=>!filter||filter.some(f=>v.id.startsWith(f)))){
   if(v.setup)await page.evaluate(v.setup);
   const spec=await page.evaluate(v.camera);
   if(!spec)throw Error('No camera: '+v.id);
   await page.evaluate(({spec,time})=>{TT.setWorldTime(time);TT.setShotView(spec);},{spec,time:v.worldTime??.4});
   await page.waitForTimeout(180);
   await page.screenshot({path:path.join(out,'photos',v.id+'.jpg'),type:'jpeg',quality:88});
   await page.evaluate(()=>WS.restoreIsolate());
   if(v.teardown)await page.evaluate(v.teardown);
   console.log('PHOTO '+v.id);
  }
  const selected=views.filter(v=>fs.existsSync(path.join(out,'photos',v.id+'.jpg')));
  for(let i=0;i<selected.length;i+=12){
   await page.setViewportSize({width:1500,height:1400});
   await page.setContent('<html><body style="margin:0;background:#fff;font:15px sans-serif;display:grid;grid-template-columns:repeat(3,1fr)">'+selected.slice(i,i+12).map(v=>'<figure style="margin:5px"><img style="width:100%;display:block" src="'+server.origin+'/review/world-story/photos/'+v.id+'.jpg"><figcaption>'+v.id+'</figcaption></figure>').join('')+'</body></html>');
   await page.evaluate(()=>Promise.all([...document.images].map(i=>i.complete?Promise.resolve():new Promise(r=>i.onload=r))));
   await page.screenshot({path:path.join(out,'sheet-'+(1+i/12)+'.jpg'),type:'jpeg',quality:88});
  }
 }
 fs.writeFileSync(path.join(out,'capture-errors.json'),JSON.stringify(errors,null,2));if(errors.length)throw Error(errors.join('\n'));
 console.log('PASS photographic capture; no page errors.');
}finally{clearTimeout(timer);if(browser)await browser.close();server.close();}
