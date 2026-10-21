// GP-19924: paired joins validation under the automatic single-instance queue. One browser/page throughout;
// before modules are served by CDP interception, never copied over live source.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Engine} from '../../tools/camera.mjs';
import {captureDemonFire} from '../demon-fire-GP19923/capture.mjs';
const root='review/zombie-joins-GP19924/guardian-final',baselineRoot='review/zombie-joins-GP19924',manifest=JSON.parse(fs.readFileSync(baselineRoot+'/baseline/manifest.json','utf8'));
const baselines=new Map(Object.entries(manifest).map(([file,entry])=>[file,fs.readFileSync(baselineRoot+'/baseline/'+entry.file)]));

const types=['guardian','caveguard'];
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const sources=['studio/zombie-concepts.js','studio/zombie-guardian-detail.js','combat/zombie-fidelity.js','combat/demon-visual.js','game/screamer-appearance.js','game/zombie-ability-visuals.js','combat/zombie-joins.js'];
const hashes=Object.fromEntries(sources.map(p=>[p,hash(p)]));
class AuditEngine extends Engine {
 async loadInspector(t,renderer){
   if(!this.interceptInstalled){
     this.interceptInstalled=true;this.interceptErrors=[];
     this.page.conn.onEvent(msg=>{
       if(msg.sessionId!==this.page.sessionId||msg.method!=='Fetch.requestPaused')return;
       const {requestId,request}=msg.params,file=new URL(request.url).pathname.slice(1),body=baselines.get(file);
       const reply=body&&this.before
         ?this.page.send('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:file==='index.html'?'text/html; charset=utf-8':'text/javascript; charset=utf-8'}],body:body.toString('base64')})
         :this.page.send('Fetch.continueRequest',{requestId});
       reply.catch(e=>this.interceptErrors.push(String(e)));
     });
   }
   if(this.before)await this.page.send('Fetch.enable',{patterns:[...baselines.keys()].map(file=>({urlPattern:'*/'+file+'*',requestStage:'Request'}))});
   else await this.page.send('Fetch.disable');
   return super.loadInspector(t,renderer);
 }
}
const E=new AuditEngine({inspect:true,warm:'none',size:'1440x1000'}),report={at:new Date().toISOString(),sources:hashes,passes:{}};
async function image(name){const d=await E.ev('return DWInspect.shot();');fs.writeFileSync(name,Buffer.from(d.split(',')[1],'base64'));}
try{
 for(const pass of ['before','after']){
   E.before=pass==='before';if(pass==='before')await E.open();else await E.load();
   const dir=path.resolve(root,pass);fs.mkdirSync(dir,{recursive:true});const rows=[];
   for(const [index,k]of types.entries()){
     const entry=await E.ev(`
       DWInspect.pause();const random=Math.random;let seed=${12000+index};Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
       try{return await DWInspect.show('zombie.${k}',{mode:'statue'});}finally{Math.random=random;DWInspect.pause();}
     `);
     const row={type:k,entry,cameras:{}};
     for(const view of ['front','left','back']){
       if(pass==='before')await E.run({cmd:'shot',target:'zombie.'+k+':statue',view,out:path.join(dir,k+'-'+view+'.png')});
       else await E.ev(`DWInspect.camera(${JSON.stringify(report.passes.before.models[index].cameras[view])});`);
       row.cameras[view]=await E.ev('return DWInspect.session().camera;');await image(path.join(dir,k+'-'+view+'.png'));
     }
     row.walk=await E.ev(`
       await DWInspect.show('zombie.${k}',{mode:'walk'});DWInspect.pause();
       const z=DWInspect.zombie.get(),g=z.mesh,u=g.userData;
       const definition=T.ZOMBIE_TYPES['${k}'];
       const stats=Object.fromEntries(['hp','speed','damage','armor','reward','radius','scale','tactics'].map(k=>[k,definition[k]??null]));
       let bad=0;for(let i=0;i<4;i++){await DWInspect.stepAsync(20);g.updateMatrixWorld(true);g.traverse(o=>{if(!o.matrixWorld.elements.every(Number.isFinite))bad++;});}
       const head=u.bossRig?.userData.rig.head||u.head,TH=T.THREE,b=new TH.Box3().setFromObject(head),p=b.getCenter(new TH.Vector3()),sz=b.getSize(new TH.Vector3()),d=Math.max(sz.x,sz.y,sz.z)*2.8;
       DWInspect.camera({x:p.x+d*.25,y:p.y+d*.08,z:p.z+d,tx:p.x,ty:p.y,tz:p.z,fov:35});
       return {stats,bad,info:DWInspect.current(),errors:DWInspect.errors()};
     `);assert.equal(row.walk.bad,0,k+' finite walk rig');assert.equal(row.walk.errors.length,0,k+' inspector errors');
     await image(path.join(dir,k+'-face.png'));

     if(pass==='after')assert.deepEqual(row.walk.stats,report.passes.before.models[index].walk.stats,k+' canonical gameplay stats');
     row.joins=await joinChecks(E,k,dir,pass);
     rows.push(row);console.log(pass+' '+k+': PASS, '+entry.info.tris+' triangles / '+entry.info.drawables+' draws');
     report.passes[pass]={loadSeconds:E.loadSec,models:rows};fs.writeFileSync(root+'/inspector-report.json',JSON.stringify(report,null,2));
   }

   report.passes[pass].catalog=await E.run({cmd:'check',only:'person.cave-guardian',outDir:path.join(dir,'catalog'),cols:4,tile:320});assert(report.passes[pass].catalog.ok);
 }
 assert.equal(E.interceptErrors.length,0,'baseline interception');
 for(const[p,h]of Object.entries(hashes))assert.equal(hash(p),h,p+' unchanged throughout capture');
 report.complete=true;console.log('PASS final Guardian/Caveguard socket poses and actual cave-guardian catalog');
}finally{fs.writeFileSync(root+'/inspector-report.json',JSON.stringify(report,null,2));await E.close();}

async function joinChecks(E,k,dir,pass){
 const data=await E.ev(`
   const z=DWInspect.zombie.get(),g=z.mesh,u=g.userData,r=u.bossRig?.userData.rig;
   const root=r?u.bossRig:g;
   const sk=[];root.traverse(o=>{if(o.isSkinnedMesh)sk.push(o);});
   let bad=0,maxWeightError=0,vertices=0;
   for(let j=0;j<12;j++){
     await DWInspect.stepAsync(6);root.updateMatrixWorld(true);
     for(const mesh of sk){mesh.skeleton.update();const geo=mesh.geometry,I=geo.attributes.skinIndex,W=geo.attributes.skinWeight,v=new T.THREE.Vector3();
       for(let i=0;i<W.count;i+=11){mesh.getVertexPosition(i,v);vertices++;if(![v.x,v.y,v.z].every(Number.isFinite))bad++;maxWeightError=Math.max(maxWeightError,Math.abs(W.getX(i)+W.getY(i)+W.getZ(i)+W.getW(i)-1));}
     }
   }
   const refs=r?[r.shoulderL,r.elbowL,r.wristL,r.kneeL,r.head]:[u.torso,u.armLG.userData.elbowG,u.legLG.userData.shinG,u.head];
   window.__joinAudit={z,g,root,sk,refs};
   return {bad,maxWeightError,vertices,skins:sk.length,blended:sk.reduce((a,m)=>a+(m.userData.joinBlend?.changed||0),0)};
 `);
 assert.equal(data.bad,0,k+' finite deformed vertices');assert(data.maxWeightError<1e-6,k+' normalized skin weights');
 if(pass==='after'&&k!=='spider')assert(data.blended>0,k+' blended joins installed');
 for(const [index,label]of ['shoulder','elbow','wrist','knee','neck'].entries()){
   await E.ev(`
     const a=window.__joinAudit,p=a.refs[Math.min(${index},a.refs.length-1)].getWorldPosition(new T.THREE.Vector3());
     const d=${k==='guardian'||k==='caveguard'?3.0:1.75};
     DWInspect.camera({x:p.x+d*.8,y:p.y+d*.2,z:p.z+d,tx:p.x,ty:p.y,tz:p.z,fov:18});await wait(180);
   `);
   await image(path.join(dir,k+'-join-'+label+'.png'));
 }
 if(pass==='after'&&['shambler','demon','spitter','screamer','brute'].includes(k)){
   data.loss=await E.ev(`
     const {g,sk}=window.__joinAudit;
     DWInspect.zombie.lose('armL');await DWInspect.stepAsync(2);
     let bad=0;for(const mesh of sk){const I=mesh.geometry.attributes.skinIndex,W=mesh.geometry.attributes.skinWeight,d=mesh.userData.joinBlend;if(!d)continue;
       const lost=mesh.skeleton.bones.map(b=>{for(let p=b;p&&p!==g;p=p.parent)if(p.userData._skinCollapsed)return true;return false;});
       for(let i=0;i<W.count;i++)if((lost[I.getX(i)]||lost[I.getY(i)])&&W.getY(i)>0)bad++;
     }
     const lost=!!g.userData.armLG.userData._skinCollapsed;
     DWInspect.zombie.kill();await DWInspect.stepAsync(2);DWInspect.zombie.respawn();await DWInspect.stepAsync(2);
     const next=DWInspect.zombie.get().mesh;let remaining=0;next.traverse(o=>{if(o.userData._skinCollapsed)remaining++;});
     return {bad,lost,remaining,errors:DWInspect.errors()};
   `);
   assert(data.loss.lost,k+' lost arm collapsed');assert.equal(data.loss.bad,0,k+' no stretched sever seam');assert.equal(data.loss.remaining,0,k+' pool reset');
 }
 return data;
}
async function crowdCheck(E,dir){
 const result=await E.ev(`
   await DWInspect.show('zombie.shambler',{mode:'walk'});DWInspect.pause();const first=DWInspect.zombie.get(),p=first.mesh.position.clone(),crowd=[first];
   const kinds=['shambler','feral','brute','military','spitter','bomber','screamer','drowned','leaper','spider','colossus','demon'];
   for(let i=1;i<48;i++){const z=T.spawnZombie(p.x-4+(i%8)*1.2,p.z+2+Math.floor(i/8)*1.2,kinds[i%kinds.length],true,true);if(z){z.trainingZ=true;z.hp=z.maxHp=100000;crowd.push(z);}}
   T.player.position.set(p.x+40,p.y,p.z+30);DWInspect.camera({x:p.x+20,y:p.y+16,z:p.z+28,tx:p.x+1,ty:p.y+1.5,tz:p.z+3,fov:48});DWInspect.play();await wait(1800);
   const ms=await new Promise(resolve=>{const a=[];let start,last;function tick(t){if(start===undefined)start=t;if(last!==undefined)a.push(t-last);last=t;if(t-start>=6000)resolve(a);else requestAnimationFrame(tick);}requestAnimationFrame(tick);});
   DWInspect.pause();const slow=[...ms].sort((a,b)=>b-a),n=Math.max(1,Math.ceil(ms.length*.01));
   return {spawned:crowd.length,alive:crowd.filter(z=>z.alive).length,frames:ms.length,fps:1000/(ms.reduce((a,b)=>a+b,0)/ms.length),low:1000/(slow.slice(0,n).reduce((a,b)=>a+b,0)/n),worst:slow[0],over50:ms.filter(v=>v>50).length,errors:DWInspect.errors()};
 `,30000);
 assert.equal(result.spawned,48);assert.equal(result.alive,48);assert.equal(result.errors.length,0);await image(path.join(dir,'crowd48.png'));return result;
}
