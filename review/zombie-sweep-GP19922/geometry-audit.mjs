import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import * as T from '../../vendor/three/three.core.js';
import {applyZombieConcept,CONCEPT_TYPES} from '../../studio/zombie-concepts.js';
import {makeBruteArmor} from '../../game/brute-armor.js';
import {prepareSpitterJaw} from '../../game/spitter-motion.js';
import {prepareScreamerAppearance} from '../../game/screamer-appearance.js';
const base='review/zombie-sweep-GP19922',manifest=JSON.parse(fs.readFileSync(base+'/baseline/manifest.json','utf8'));
function baselineUrl(file){
 const source=fs.readFileSync(base+'/baseline/'+manifest.files[file].file,'utf8');
 const code=source.replace(/from\s+(['"])([^'"]+)\1/g,(all,q,spec)=>{
   if(!spec.startsWith('.'))return all;
   const dep=path.posix.normalize(path.posix.join(path.posix.dirname(file),spec));
   return 'from '+q+(manifest.files[dep]?baselineUrl(dep):pathToFileURL(path.resolve(dep)).href)+q;
 });
 return 'data:text/javascript;base64,'+Buffer.from(code).toString('base64');
}
const before=await import(baselineUrl('studio/zombie-concepts.js'));
function rig(s=1){
 const g=new T.Group(),u=g.userData,joint=(p,name,x=0,y=0,z=0)=>{const o=new T.Group();o.name=name;o.position.set(x*s,y*s,z*s);p.add(o);return o;};
 u.hips=joint(g,'hips',0,.55);u.torso=joint(u.hips,'torso',0,.28);u.head=joint(u.torso,'head',0,.58);
 for(const side of ['L','R']){const sign=side==='L'?-1:1,arm=u['arm'+side+'G']=joint(u.torso,'arm'+side,sign*.32,.42);arm.userData.elbowG=joint(arm,'elbow'+side,0,-.34);const leg=u['leg'+side+'G']=joint(u.hips,'leg'+side,sign*.13,-.02);leg.userData.shinG=joint(leg,'shin'+side,0,-.38);}
 u.eyes=[-1,1].map(sign=>{const e=new T.Mesh(new T.SphereGeometry(.045*s,8,6),new T.MeshStandardMaterial({emissive:0xaabb22}));e.position.set(sign*.09*s,.04*s,.18*s);u.head.add(e);return e;});
 u.crawlLimbs=Array.from({length:6},(_,i)=>{const root=joint(u.torso,'crawl'+i),knee=joint(root,'knee'+i,0,.4),baseQ=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),1.3),kneeQ=baseQ.clone();root.quaternion.copy(baseQ);knee.quaternion.copy(kneeQ);return{root,knee,baseQ,kneeQ};});return g;
}
function metrics(g){let tris=0,draws=0;g.traverse(o=>{if(!o.isMesh)return;draws++;const P=o.geometry.attributes.position,N=o.geometry.attributes.normal;assert([...P.array].every(Number.isFinite));assert([...N.array].every(Number.isFinite));for(let i=0;i<N.count;i++)assert(Math.hypot(N.getX(i),N.getY(i),N.getZ(i))>.9,'nonzero smooth normals');tris+=(o.geometry.index?.count||P.count)/3;});return{tris,draws};}
const report={at:new Date().toISOString(),models:[]};
for(const k of CONCEPT_TYPES){
 const model={type:k};
 for(const [label,build]of [['before',before.applyZombieConcept],['after',applyZombieConcept]]){
   const g=rig();g.userData.typeKey=k;build({THREE:T,g,typeKey:k,scale:1,rbox:(w,h,d)=>new T.BoxGeometry(w,h,d)});model[label]=metrics(g);
   if(label==='after'){
     if(k==='brute'){makeBruteArmor(T,g,1);assert.deepEqual(Object.keys(g.userData.brutePlates).sort(),['back','front','left','right']);model.breakableArmor=Object.keys(g.userData.brutePlates);}
     if(k==='spitter'){prepareSpitterJaw(T,g,1);assert(g.userData.spitterJaw.children.some(o=>o.geometry?.attributes.position.count>0));model.articulatedJaw=true;}
     if(k==='screamer'){prepareScreamerAppearance(T,g,1);assert(g.userData.screamerJaw.children.length);assert(g.userData.screamerTongue.children.length);model.articulatedTongue=true;}
   }
 }
 assert(model.after.draws<=model.before.draws,k+' draw budget');report.models.push(model);
 console.log(k+': '+model.before.tris+' -> '+model.after.tris+' triangles; draws '+model.after.draws);
}
report.beforeTriangles=report.models.reduce((a,m)=>a+m.before.tris,0);report.afterTriangles=report.models.reduce((a,m)=>a+m.after.tris,0);
assert(report.afterTriangles<=report.beforeTriangles*1.15,'overall geometry budget');
fs.writeFileSync(base+'/geometry-report.json',JSON.stringify(report,null,2));console.log('PASS 14 models: finite normals, bounded draws, armor partitions, articulated spit/scream and total triangle budget');
