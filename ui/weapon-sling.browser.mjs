import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {serve} from '../tools/serve.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const before=process.argv.includes('--before'), phase=before?'before':'after', out=process.env.SLING_SHOT_OUT||'review/weapon-slings';
fs.mkdirSync(out+'/'+phase,{recursive:true});
const server=await serve(process.cwd(),0);let browser;
const timer=setTimeout(()=>{console.error('Sling check timed out');process.exit(2);},150000);
try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const p=await browser.newPage({viewport:{width:1200,height:1000}}), errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 await p.goto(server.origin+'/index.html?debug=1&raf=timer',{waitUntil:'domcontentloaded'});
 await p.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:60000});
 await p.evaluate(()=>{DWOpening.dismissForTesting();document.getElementById('playerName').value='Sling fitting';document.getElementById('modeTraining').click();});
 await p.waitForFunction(()=>TT.trainingDbg.state().active&&!document.getElementById('trainingBlackout')?.classList.contains('on'));
 await p.evaluate(async()=>{
  window.TH=await import('./vendor/three/three.webgpu.js');
  TT.getMarine().visible=false;const m=TT.makeMarine();m.position.set(0,-200,-647);TT.scene.add(m);window.G=m;
  const {rigs}=await import('./studio/rigs.js'),{loadClip,sampleClip,applyPose}=await import('./studio/clip.js');
  window.GV={inst:rigs.get('marine').create({group:m}),sampleClip,applyPose,clips:{}};
  for(const key of ['stand','walk','run'])GV.clips[key]=loadClip(await(await fetch('./studio/clips/marine/'+key+'.json')).json());
  const cv=[...document.querySelectorAll('canvas')].sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight)[0],keep=new Set();
  for(let e=cv;e&&e!==document.body;e=e.parentElement)keep.add(e);
  for(const e of document.body.children)if(!keep.has(e))e.style.setProperty('display','none','important');
 });
 const kinds=['m4','ak','aa12','shotgun','sniper','launcher','minigun','flamer','chainsaw'];
 const shots=kinds.map(kind=>[kind,2.7,'stand',true,[kind,kind]]);
 shots.push(['mixed-side',1.55,'stand',true,['shotgun','launcher']],['mixed-front',.3,'stand',true,['m4','sniper']],['shirt',2.7,'stand',false,['m4','ak']],['walk',2.7,'walk',true,['aa12','sniper']],['run',2.7,'run',true,['flamer','chainsaw']]);
 const states={};
 for(const[id,angle,pose,vest,primary]of shots){
  states[id]=await p.evaluate(({angle,pose,vest,primary,before})=>{
   G.rotation.y=angle;GV.applyPose(GV.inst,GV.sampleClip(GV.clips[pose],pose==='stand'?0:.25));
   for(const[k,list]of Object.entries(G.userData.gearParts))for(const part of list)part.visible=(vest?['helmet','vest','pads']:['bareHead','bareTorso']).includes(k);
   const plan={loadout:{primary,secondary:[]},inHand:null,akimbo:false,dualOwned:{},vest,grenades:0};
   const rig=TT.carryPreview(G,plan);G.updateMatrixWorld(true);
   TT.setShotView({x:0,y:-198.93,z:-643.7,tx:0,ty:-198.98,tz:-647,fov:30});
   const result=rig.slings.map(s=>{
    const model=s.gun.children[0];
    const r={kind:s.kind,mount:s.g.matrix.toArray(),gun:s.gun.matrix.toArray(),model:model.matrix.toArray()};
    if(!before){
     const data=s.sling.userData.fit;
     if(!data)throw Error('missing sling fit '+s.kind);
     r.endpointErrors=data.anchors.map((a,i)=>{
      const expected=model.localToWorld(new TH.Vector3(...a));
      const vertices=s.sling.geometry.attributes.position,actual=new TH.Vector3();
      const offset=i?vertices.count-4:0;
      for(let j=0;j<4;j++)actual.add(new TH.Vector3().fromBufferAttribute(vertices,offset+j));
      actual.multiplyScalar(.25);s.sling.localToWorld(actual);
      return expected.distanceTo(actual);
     });
     // Independent closest-triangle check: each selected mount sits on actual gun geometry.
     const inv=model.matrixWorld.clone().invert(),tri=new TH.Triangle(),q=new TH.Vector3(),m=new TH.Matrix4();
     r.surfaceGaps=data.anchors.map(a=>{
      const anchor=new TH.Vector3(...a);let best=Infinity;
      model.traverseVisible(o=>{
       if(!o.isMesh||!o.geometry?.attributes.position)return;
       const pos=o.geometry.attributes.position,ix=o.geometry.index,n=ix?ix.count:pos.count;
       m.multiplyMatrices(inv,o.matrixWorld);
       for(let j=0;j<n;j+=3){
        [tri.a,tri.b,tri.c].forEach((v,k)=>v.fromBufferAttribute(pos,ix?ix.getX(j+k):j+k).applyMatrix4(m));
        tri.closestPointToPoint(anchor,q);best=Math.min(best,q.distanceTo(anchor));
       }
      });return best;
     });
     r.finite=Array.from(s.sling.geometry.attributes.position.array).every(Number.isFinite);
     const geoCheck=s.sling.geometry,positions=geoCheck.attributes.position,indices=geoCheck.index;
     const triangle=new TH.Triangle(),face=new TH.Vector3(),axis=new TH.Vector3();let inward=0;
     for(let t=0;t<indices.count;t+=3){
      axis.set(0,0,0);
      [triangle.a,triangle.b,triangle.c].forEach((v,k)=>{
       const index=indices.getX(t+k);v.fromBufferAttribute(positions,index);
       const row=Math.floor(index/4)*4;
       for(let q=0;q<4;q++)axis.addScaledVector(new TH.Vector3().fromBufferAttribute(positions,row+q),1/12);
      });
      const center=triangle.getMidpoint(new TH.Vector3()).sub(axis);
      if(triangle.getNormal(face).dot(center)<-1e-8)inward++;
     }
     r.inwardFaces=inward;
     const geo=s.sling.geometry;TT.carryPreview(G,plan);r.reused=s.sling.geometry===geo;
    }
    return r;
   });return result;
  },{angle,pose,vest,primary,before});
  await p.waitForTimeout(120);await p.screenshot({path:out+'/'+phase+'/'+id+'.png'});
 }
 if(!before){
  const old=JSON.parse(fs.readFileSync(out+'/before-checks.json','utf8'));
  for(const[id,spots]of Object.entries(states))for(const[s,i]of spots.map((s,i)=>[s,i])){
   for(const key of ['mount','gun','model'])assert(s[key].every((v,j)=>Math.abs(v-old.states[id][i][key][j])<1e-10),id+' unchanged '+key);
   assert(s.endpointErrors.every(e=>e<1e-5),id+' endpoints '+s.endpointErrors);
   assert(s.surfaceGaps.every(e=>e<.018),id+' mounts must touch solid geometry '+s.surfaceGaps);
   assert(s.finite&&s.reused,id+' finite and cached');assert.equal(s.inwardFaces,0,id+' outward webbing faces');
  }
  const hidden=await p.evaluate(()=>{const r=TT.carryPreview(G,{loadout:{primary:['m4','sniper'],secondary:[]},inHand:'m4',vest:true});return !r.slings[0].sling.visible&&r.slings[1].sling.visible;});assert(hidden,'drawn weapon hides its sling');
  const suppressors=await p.evaluate(()=>{
   const checks=[];
   for(const kind of ['m4','ak','shotgun','sniper']){
    const src=TT.weaponMeshes[kind],was=src.userData.suppressed;TT.setGunSuppressor(src,true);
    const m=TT.makeMarine(),rig=TT.carryPreview(m,{loadout:{primary:[kind,kind],secondary:[]},inHand:null,vest:true});m.updateMatrixWorld(true);
    for(const s of rig.slings){
     const model=s.gun.children[0],data=s.sling.userData.fit,pos=s.sling.geometry.attributes.position;
     checks.push({kind,errors:data.anchors.map((a,i)=>{
      const actual=new TH.Vector3();for(let j=0;j<4;j++)actual.add(new TH.Vector3().fromBufferAttribute(pos,(i?pos.count-4:0)+j));
      s.sling.localToWorld(actual.multiplyScalar(.25));return actual.distanceTo(model.localToWorld(new TH.Vector3(...a)));
     })});
    }
    TT.setGunSuppressor(src,was);
   }return checks;
  });
  assert(suppressors.every(s=>s.errors.every(e=>e<1e-5)),'suppressors cannot move straps off the mounts');
  fs.writeFileSync(out+'/suppressor-checks.json',JSON.stringify(suppressors,null,2));
  const carry=await p.evaluate(fs.readFileSync('tools/tests/t140.js','utf8'));fs.writeFileSync(out+'/t140.txt',carry);assert(!carry.includes('FAIL'),carry);
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/'+phase+'-checks.json',JSON.stringify({states,errors},null,2));
 console.log('PASS '+phase+': '+shots.length+' paired carry views, '+(before?'baseline recorded':'28 fitted slings: exact endpoints, solid mounts, unchanged weapon transforms, geometry reuse, draw visibility and t140')+'; zero page errors');
}finally{clearTimeout(timer);await browser?.close();server.close();}
