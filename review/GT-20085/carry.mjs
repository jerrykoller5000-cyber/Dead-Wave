import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
import {save} from '../GT-20076/save.mjs';
const phase=process.argv[2];assert(process.env.DW_GAME_TEST_TOKEN && ['before','after'].includes(phase));
const out=new URL('./'+phase+'/',import.meta.url);await mkdir(out,{recursive:true});
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try {
 const page=await browser.newPage({width:960,height:540});
 await page.goto(server.origin+'/index.html?debug=1&raf=timer');
 assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
 await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
 await page.evaluate(await readFile(new URL('../../tools/tests/lib.js',import.meta.url),'utf8'));
 await page.evaluate("startMatch(TT,'Carry art')");
 const receipt=await page.evaluate(String.raw`(async()=>{
  const T=TT,G=T.THREE,H=T.inspectHost(),{makeM240Model}=await import('/studio/weapon-heavy.js');
  T.clearZombies();T.setHp(100000);T.unlockAllBuilds();T.setViewFirstDbg(false);T.flightHold(true);
  const p=T.player.position,h=T.house.group.position,half=T.house.half||6;
  const dir=new G.Vector3(p.x-h.x,0,p.z-h.z);
  if(dir.lengthSq()<.01)dir.set(1,0,0);dir.normalize();
  const x=h.x+dir.x*(half+12),z=h.z+dir.z*(half+12);p.set(x,T.sampleHeight(x,z),z);
  const step=n=>{for(let i=0;i<n;i++)T.stepFrame(1/30);};step(10);
  const built=T.spawnBuild('m240',x+dir.x*1.2,z+dir.z*1.2);
  if(!built || !T.mountMortar(built))throw Error('Could not equip the ordinary Watchman prop');
  step(20);T.shoulderMortar();step(90);
  const state=T.m240VisDbg(),cg=state.carriedGun;
  if(!state.carried || !cg?.userData.gun)throw Error('The carried model did not appear');
  const inner=cg.userData.gun;cg.updateWorldMatrix(true,true);
  function bounds(root){
   root.updateWorldMatrix(true,true);
   const inv=root.matrixWorld.clone().invert(),box=new G.Box3(),point=new G.Vector3(),rows=[];
   root.traverse(o=>{
    if(!o.isMesh || !o.geometry?.attributes?.position)return;
    const b=new G.Box3(),m=inv.clone().multiply(o.matrixWorld),v=o.geometry.attributes.position;
    for(let i=0;i<v.count;i++)b.expandByPoint(point.fromBufferAttribute(v,i).applyMatrix4(m));
    box.union(b);rows.push({part:o.name||o.geometry.type,source:o.userData.carryArtSource||null,min:b.min.toArray(),max:b.max.toArray()});
   });
   return {min:box.min.toArray(),max:box.max.toArray(),size:box.getSize(new G.Vector3()).toArray(),rows};
  }
  const ctx=H.builders.weaponContext(),pivot=inner.userData.elev?.position||H.builders.m240(false).userData.elev.position;
  const rawCtx={...ctx,M240_PIVOT:pivot.clone(),finishGun:g=>g,gunKit:g=>{
   const k=ctx.gunKit(g);
   return new Proxy(k,{get(target,prop){const fn=target[prop];if(typeof fn!=='function')return fn;
    return (...args)=>{const mesh=fn(...args);if(mesh?.isObject3D){const stack=String(new Error().stack).split('\n').find(s=>s.includes('weapon-heavy.js:') && !s.includes('at rod '));
     mesh.userData.carryArtSource=stack?.match(/weapon-heavy\.js:(\d+):\d+/)?.[1]||null;}return mesh;};
   }});
  }};
  const rawFolded=makeM240Model(rawCtx,true),rawPlaced=makeM240Model(rawCtx,false);
  const held=bounds(inner),folded=bounds(rawFolded),placed=bounds(rawPlaced);
  const at=cg.getWorldPosition(new G.Vector3()),shoulder=(T.marine||window.worldMarine).userData.armRG.getWorldPosition(new G.Vector3());
  const css=document.createElement('style');css.textContent='body > :not(canvas):not(script):not(style):not(#view){visibility:hidden!important}';document.head.append(css);
  const {LIGHTS}=await import('/studio/inspector/stage.js');let light=LIGHTS.noon;
  H.attach({held:()=>true,scale:dt=>dt,frame:()=>{
   H.sun.position.copy(p).addScaledVector(new G.Vector3(...light.dir).normalize(),85);H.sun.target.position.copy(p);H.sun.target.updateMatrixWorld();
   H.sun.intensity=light.sun;H.sun.color.setHex(light.sunColor);H.hemi.intensity=light.sky;H.hemi.color.setHex(light.skyColor);H.hemi.groundColor.setHex(light.ground);
   H.ambientFill.intensity=light.fill;H.moon.intensity=0;
  }});
  window.carryShot=async(view,key)=>{
   light=LIGHTS[key];const q=T.player.getWorldQuaternion(new G.Quaternion());
   const offset={player:[2.35,.45,1.2],side:[1.8,.03,.06],rear:[-1.7,.47,-1.1]}[view];
   const centre=view==='player'?new G.Vector3(p.x,p.y+1.05,p.z):at.clone();
   const eye=centre.clone().add(new G.Vector3(...offset).applyQuaternion(q));
   T.setShotView({x:eye.x,y:eye.y,z:eye.z,tx:centre.x,ty:centre.y,tz:centre.z,fov:view==='player'?43:40});
   for(let i=0;i<4;i++){T.stepFrame(1/30);await new Promise(r=>setTimeout(r,35));}
   return {eye:eye.toArray(),target:centre.toArray(),gunWorld:inner.matrixWorld.toArray(),player:p.toArray()};
  };
  return {held,folded,placed,seatDistance:at.distanceTo(shoulder),actor:p.toArray()};
 })()`,90000);
 await save(new URL('bounds.json',out),JSON.stringify(receipt,null,2)+'\n');
 const cameras={};
 for(const view of ['player','side','rear'])for(const light of ['noon','overcast','dusk','night']){
   const camera=await page.evaluate('carryShot('+JSON.stringify(view)+','+JSON.stringify(light)+')');cameras[view]=camera;
   const shot=await page.send('Page.captureScreenshot',{format:'jpeg',quality:94});
   await save(new URL(view+'-'+light+'.jpg',out),Buffer.from(shot.data,'base64'));
 }
 await save(new URL('cameras.json',out),JSON.stringify(cameras,null,2)+'\n');assert.deepEqual(page.errors,[]);
 console.log('PASS live shouldered artwork, local box',receipt.held.size,'seat',receipt.seatDistance,'three cameras in four lights');
}finally{await browser.close();await server.close();}
