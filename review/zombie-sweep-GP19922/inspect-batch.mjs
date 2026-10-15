// Prepared for a NEW explicit game-test slot grant. One browser/page throughout;
// before modules are served by CDP interception, never copied over live source.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Engine} from '../../tools/camera.mjs';
import {captureDemonFire} from '../demon-fire-GP19923/capture.mjs';
const root='review/zombie-sweep-GP19922',manifest=JSON.parse(fs.readFileSync(root+'/baseline/manifest.json','utf8'));
const baselines=new Map(Object.entries(manifest.files).map(([file,entry])=>[file,fs.readFileSync(root+'/baseline/'+entry.file)]));
baselines.set('game/zombie-ability-visuals.js',fs.readFileSync('review/demon-fire-GP19923/before.js'));
const types=['shambler','feral','brute','military','spitter','bomber','screamer','drowned','leaper','spider','colossus','demon','guardian','caveguard'];
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const sources=['studio/zombie-concepts.js','studio/zombie-guardian-detail.js','combat/zombie-fidelity.js','combat/demon-visual.js','game/screamer-appearance.js','game/zombie-ability-visuals.js'];
const hashes=Object.fromEntries(sources.map(p=>[p,hash(p)]));
class AuditEngine extends Engine {
 async loadInspector(t,renderer){
   if(!this.interceptInstalled){
     this.interceptInstalled=true;this.interceptErrors=[];
     this.page.conn.onEvent(msg=>{
       if(msg.sessionId!==this.page.sessionId||msg.method!=='Fetch.requestPaused')return;
       const {requestId,request}=msg.params,file=new URL(request.url).pathname.slice(1),body=baselines.get(file);
       const reply=body&&this.before
         ?this.page.send('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'text/javascript; charset=utf-8'}],body:body.toString('base64')})
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
     if(k==='demon')row.flameMotion=await captureDemonFire(E,pass);
     if(pass==='after')assert.deepEqual(row.walk.stats,report.passes.before.models[index].walk.stats,k+' canonical gameplay stats');
     rows.push(row);console.log(pass+' '+k+': PASS, '+entry.info.tris+' triangles / '+entry.info.drawables+' draws');
     report.passes[pass]={loadSeconds:E.loadSec,models:rows};fs.writeFileSync(root+'/inspector-report.json',JSON.stringify(report,null,2));
   }
   report.passes[pass].catalog=await E.run({cmd:'check',only:'zombie.',outDir:path.join(dir,'catalog'),cols:4,tile:320});assert(report.passes[pass].catalog.ok);
 }
 assert.equal(E.interceptErrors.length,0,'baseline interception');
 for(const[p,h]of Object.entries(hashes))assert.equal(hash(p),h,p+' unchanged throughout capture');
 report.complete=true;console.log('PASS before/after all 14 zombie types, walking rigs, stats and catalog');
}finally{fs.writeFileSync(root+'/inspector-report.json',JSON.stringify(report,null,2));await E.close();}
