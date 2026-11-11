import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
import {save} from '../GT-20076/save.mjs';
assert(process.env.DW_GAME_TEST_TOKEN);
const root=new URL('../../',import.meta.url), file='/studio/weapon-heavy.js';
const live=await readFile(new URL('.'+file,root),'utf8');
const begin=live.indexOf('    // Pose the bound artwork as a single piece'),end=live.indexOf('\n    }',begin);
assert(begin>0 && end>begin);
const original=live.slice(0,begin)+live.slice(end+'\n    }'.length);
const server=await serve(fileURLToPath(root),0),browser=await launch({headless:false});
try{
 const page=await browser.newPage({width:1280,height:720});
 const url=server.origin+file+'?watchman-review-original',body=Buffer.from(original).toString('base64');
 let restored=0;
 page.conn.onEvent(event=>{
  if(event.sessionId!==page.sessionId || event.method!=='Fetch.requestPaused')return;
  assert.equal(event.params.request.url,url);restored++;
  page.send('Fetch.fulfillRequest',{requestId:event.params.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'text/javascript'}],body}).catch(e=>page.errors.push(e.message));
 });
 await page.send('Fetch.enable',{patterns:[{urlPattern:url.replace('?','\\?')}]});
 const start=Date.now();await page.goto(server.origin+'/index.html?debug=1',{waitUntil:'none'});
 assert(await page.waitFor('window.DWOpening'));await page.evaluate('DWOpening.dismissForTesting()');
 assert(await page.waitFor('TT?.trainingDbg && DWLoad.snapshot().state==="ready"'));const loadMs=Date.now()-start;
 assert(await page.waitFor('!DWOpening.active'));
 await page.evaluate(await readFile(new URL('tools/tests/lib.js',root),'utf8'));
 await page.evaluate("TT.applyGraphicsPreset('high');startMatch(TT,'Carry timing')",90000);
 const result=await page.evaluate(`(async()=>{
  const T=TT,H=T.inspectHost(),G=T.THREE;
  T.clearZombies();T.setHp(100000);T.unlockAllBuilds();T.setViewFirstDbg(false);T.flightHold(true);
  const p=T.player.position,h=T.house.group.position,dir=new G.Vector3(p.x-h.x,0,p.z-h.z);
  if(dir.lengthSq()<.01)dir.set(1,0,0);dir.normalize();const offset=(T.house.half||6)+12;
  p.set(h.x+dir.x*offset,0,h.z+dir.z*offset);p.y=T.sampleHeight(p.x,p.z);
  function step(n){for(let i=0;i<n;i++)T.stepFrame(1/30);}
  step(10);const built=T.spawnBuild('m240',p.x+dir.x*1.2,p.z+dir.z*1.2);
  if(!built || !T.mountMortar(built))throw Error('Failed to mount native model');
  step(20);T.shoulderMortar();step(90);
  const held=T.m240VisDbg().carriedGun,now=held.userData.gun;
  const {makeM240Model}=await import('/studio/weapon-heavy.js?watchman-review-original');
  const old=makeM240Model({...H.builders.weaponContext(),M240_PIVOT:now.userData.elev.position.clone()},true);
  const optic=now.userData.feedCover.children.at(-1);
  if(!optic.isObject3D)throw Error('Missing issued sight');
  old.userData.feedCover.add(optic.clone(true));
  const prior=T.m240VisDbg().carried;
  for(const key of ['position','quaternion','scale'])old[key].copy(now[key]);
  now.parent.add(old);old.visible=false;
  function describe(model){
   let meshes=0,triangles=0;model.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}});
   const box=new G.Box3(),point=new G.Vector3();model.updateWorldMatrix(true,true);const inverse=model.matrixWorld.clone().invert();
   model.traverse(o=>{if(!o.isMesh)return;const m=inverse.clone().multiply(o.matrixWorld),v=o.geometry.attributes.position;
      for(let i=0;i<v.count;i++)box.expandByPoint(point.fromBufferAttribute(v,i).applyMatrix4(m));});
   return {meshes,triangles,height:box.max.y-box.min.y};
  }
  const meshes={before:describe(old),after:describe(now)};
  const centre=held.getWorldPosition(new G.Vector3()),eye=centre.clone().add(new G.Vector3(1.8,.03,.06).applyQuaternion(T.player.getWorldQuaternion(new G.Quaternion())));
  T.setShotView({x:eye.x,y:eye.y,z:eye.z,tx:centre.x,ty:centre.y,tz:centre.z,fov:40});
  function frames(count){return new Promise(done=>{const times=[];function tick(now){times.push(now);if(times.length>count)done(times.slice(1).map((t,i)=>t-times[i]));else requestAnimationFrame(tick);}requestAnimationFrame(tick);});}
  const rows=[];
  for(const phase of ['before','after','after','before','before','after']){
    old.visible=phase==='before';now.visible=!old.visible;
    await frames(35);const ms=await frames(180),sorted=[...ms].sort((a,b)=>a-b);
    rows.push({phase,fps:1000*ms.length/ms.reduce((a,b)=>a+b,0),p95Ms:sorted[Math.floor(sorted.length*.95)],ms});
    if(!T.m240VisDbg().carried || now.visible===old.visible)throw Error('Lost carry model');
  }
  return {high:T.getGfx(),carried:prior,meshes,rows};
 })()`,120000);
 assert.equal(restored,1);assert.equal(result.high,'high');assert(result.carried);assert(result.meshes.before.height>.45 && result.meshes.after.height<.45);
 for(const key of ['meshes','triangles'])assert.equal(result.meshes.before[key],result.meshes.after[key]);
 assert.deepEqual(page.errors,[]);await save(new URL('./timing.json',import.meta.url),JSON.stringify({loadMs,...result},null,2)+'\n');
 console.log('High, single scene',result.meshes,'ready',loadMs,'ms',result.rows.map(r=>[r.phase,r.fps.toFixed(1),r.p95Ms.toFixed(1)]));
}finally{await browser.close();await server.close();}
