import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three/three.core.js';
import {applyZombieConcept,CONCEPT_TYPES} from './zombie-concepts.js';
import {resetZombieAbilityVisuals} from '../game/zombie-ability-visuals.js';
import {detailUV,detailMaterial,generateDetailPixels,DETAIL_SURFACES} from './zombie-detail.js';
const rbox=(w,h,d)=>new T.BoxGeometry(w,h,d);
function rig(){
 const g=new T.Group(),u=g.userData;
 const joint=(p,name,x=0,y=0,z=0)=>{const o=new T.Group();o.name=name;o.position.set(x,y,z);p.add(o);return o;};
 u.hips=joint(g,'hips',0,.55);u.torso=joint(u.hips,'torso',0,.28);u.head=joint(u.torso,'head',0,.58);
 for(const side of ['L','R']){const x=side==='L'?-1:1;
  const arm=u['arm'+side+'G']=joint(u.torso,'arm'+side,x*.32,.42);arm.userData.elbowG=joint(arm,'elbow'+side,0,-.34);
  const leg=u['leg'+side+'G']=joint(u.hips,'leg'+side,x*.13,-.02);leg.userData.shinG=joint(leg,'shin'+side,0,-.38);
 }
 u.eyes=[-1,1].map(x=>{const e=new T.Mesh(new T.SphereGeometry(.045,8,6),new T.MeshStandardMaterial({emissive:0xaabb22}));e.position.set(x*.09,.04,.18);u.head.add(e);return e;});
 u.crawlLimbs=[];for(let i=0;i<6;i++){
  const root=joint(u.torso,'crawl'+i),knee=joint(root,'knee'+i,0,.4),baseQ=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),1.3),kneeQ=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),1.3);
  root.quaternion.copy(baseQ);knee.quaternion.copy(kneeQ);u.crawlLimbs.push({root,knee,baseQ,kneeQ});
 }
 return g;
}
for(const k of CONCEPT_TYPES)test(k+': cosmetic rebuild preserves every animated joint and finite geometry',()=>{
 const g=rig(),bones=[];g.traverse(o=>{if(o.isGroup)bones.push({o,parent:o.parent,pos:o.position.toArray(),q:o.quaternion.toArray(),scale:o.scale.toArray()});});
 const old=new T.Mesh(rbox(.4,.5,.3),new T.MeshStandardMaterial());g.userData.torso.add(old);
 const eyes=[...g.userData.eyes];assert(applyZombieConcept({THREE:T,g,typeKey:k,scale:1,rbox}));
 for(const b of bones){assert.equal(b.o.parent,b.parent);assert.deepEqual(b.o.position.toArray(),b.pos);assert.deepEqual(b.o.quaternion.toArray(),b.q);assert.deepEqual(b.o.scale.toArray(),b.scale);}
 assert.equal(old.parent,null);assert(eyes.every(e=>e.parent===g.userData.head));
 let vertices=0;g.traverse(o=>{if(o.isMesh){const a=o.geometry.getAttribute('position');vertices+=a.count;assert([...a.array].every(Number.isFinite),k+' finite vertices');assert(Number.isFinite(o.material.color.r));}});
 assert(vertices>500&&vertices<65000,k+' bounded model complexity: '+vertices);
 assert.equal(g.userData.concept.type,k);
});
test('unreferenced zombie types remain untouched',()=>{const g=rig(),n=g.children.length;assert.equal(applyZombieConcept({THREE:T,g,typeKey:'construction',scale:1,rbox}),false);assert.equal(g.children.length,n);assert.equal(g.userData.concept,undefined);});
test('cached bodies share immutable geometry but isolate hit, burn and fuse materials',()=>{
 const a=rig(),b=rig();for(const g of [a,b])applyZombieConcept({THREE:T,g,typeKey:'bomber',scale:1,rbox});
 const am=a.userData.torso.children.find(m=>m.userData.compacted),bm=b.userData.torso.children.find(m=>m.userData.compacted);
 assert.equal(am.geometry,bm.geometry);assert.notEqual(am.material,bm.material);am.material.color.setHex(0xff0000);assert.notEqual(am.material.color.getHex(),bm.material.color.getHex());
 assert.equal(a.userData.pulseMats.length,2);assert(a.userData.pulseMats.every((m,i)=>m!==b.userData.pulseMats[i]));
 a.userData.pulseMats[1].emissiveIntensity=0;assert(b.userData.pulseMats[1].emissiveIntensity>0);
});
test('paired eyes render in one batch while their existing glow material and references remain live',()=>{
 for(const kind of ['shambler','spitter','screamer','bomber','demon'])for(let copy=0;copy<2;copy++){
  const g=rig();applyZombieConcept({THREE:T,g,typeKey:kind,scale:1,rbox});
  const u=g.userData,eyes=u.eyes,batch=u.eyeBatch;
  assert(batch?.isMesh&&batch.parent===u.head,kind+' eye batch');
  assert(eyes.every(e=>e.parent===u.head&&!e.visible),kind+' source eye references');
  assert.equal(batch.material,eyes[0].material,kind+' shared fade material');
  assert.equal(g.children.filter(o=>o===batch).length,0,'batch stays on the animated head');
  eyes[0].material.emissiveIntensity=.25;
  assert.equal(batch.material.emissiveIntensity,.25,kind+' death fade reaches the visible eyes');
  g.traverse(node=>{node.visible=true;});
  resetZombieAbilityVisuals(g);
  assert(eyes.every(e=>!e.visible),kind+' pooled source eyes remain hidden');
 }
});
test('Demon charge flare still targets a visible material after template reuse',()=>{
 for(let i=0;i<2;i++){const g=rig();applyZombieConcept({THREE:T,g,typeKey:'demon',scale:1,rbox});const em=g.userData.emberMat;assert(em);let found=false;g.traverse(o=>{if(o.isMesh&&o.material===em)found=true;});assert(found);}
});
test('Bomber fuse retains textured wet skin after glow batching and template reuse',()=>{
 for(let i=0;i<2;i++){
  const g=rig();applyZombieConcept({THREE:T,g,typeKey:'bomber',scale:1,rbox});const belly=g.userData.pulseMats[0];
  assert(belly.map?.isDataTexture);assert(belly.emissive.getHex()!==0);let found=0;
  g.traverse(o=>{if(o.isMesh&&o.material===belly){found++;const uv=o.geometry.getAttribute('uv');assert.equal(uv.count,o.geometry.getAttribute('position').count);assert([...uv.array].every(v=>v>0&&v<1));}});
  assert(found>0,'textured fuse material is attached to a live surface');
 }
});
test('surface shapes are deterministic regardless of Three UUID randomness',()=>{
 const random=Math.random,shapes=[];
 try{for(const value of [.1,.9]){Math.random=()=>value;const g=rig();applyZombieConcept({THREE:T,g,typeKey:'bomber',scale:1,rbox});const data=[];g.traverse(o=>{if(o.isMesh)data.push([...o.geometry.getAttribute('position').array,...o.position.toArray(),...o.scale.toArray()]);});shapes.push(data);}}
 finally{Math.random=random;}assert.deepEqual(shapes[0],shapes[1]);
});

test('surface atlas pixels are reproducible without consuming gameplay randomness',()=>{
 const random=Math.random;let a,b;
 try{Math.random=()=>{throw new Error('surface generation consumed gameplay random state');};a=generateDetailPixels();b=generateDetailPixels();}
 finally{Math.random=random;}
 assert(a.width>0&&a.height>0);const bytes=a.width*a.height*4;
 for(const key of ['color','heightMap','response']){
  assert.equal(a[key].length,bytes);assert.deepEqual(a[key],b[key]);
  for(let i=3;i<bytes;i+=4)assert.equal(a[key][i],255,'opaque atlas texels');
 }
});

test('surface UVs stay in separate atlas regions and never mutate shared geometry',()=>{
 const g=new T.BoxGeometry(1,2,.1),source=g.getAttribute('uv').array.slice(),centers=[];
 for(const surface of DETAIL_SURFACES){
  const uv=detailUV(T,g,surface),xs=[],ys=[];
  assert.equal(uv.length,g.getAttribute('position').count*2);
  for(let i=0;i<uv.length;i+=2){assert(uv[i]>0&&uv[i]<1);assert(uv[i+1]>0&&uv[i+1]<1);xs.push(uv[i]);ys.push(uv[i+1]);}
  const b=[Math.min(...xs),Math.max(...xs),Math.min(...ys),Math.max(...ys)];
  assert(b[1]>b[0]&&b[3]>b[2],'surface spans a useful UV area');centers.push(b);
 }
 assert.deepEqual(g.getAttribute('uv').array,source);
 for(let i=0;i<centers.length;i++)for(let j=i+1;j<centers.length;j++){
  const a=centers[i],b=centers[j];assert(a[1]<b[0]||b[1]<a[0]||a[3]<b[2]||b[3]<a[2],'surface tiles do not overlap');
 }
});

test('torn cloth UV fallback remains finite for thin and collapsed geometry',()=>{
 for(const points of [[-1,0,0,1,0,0,0,2,0],[0,0,0,0,0,0,0,0,0]]){
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points,3));
  const uv=detailUV(T,g,'cloth');assert.equal(uv.length,6);assert([...uv].every(n=>Number.isFinite(n)&&n>0&&n<1));assert.equal(g.getAttribute('uv'),undefined);
  if(points[0]!==0)assert(new Set(uv).size>2,'thin cloth has two-dimensional detail');
 }
});

test('material atlas preserves color space and physically distinct surfaces',()=>{
 const a=detailMaterial(T),b=detailMaterial(T);assert.equal(a,b);assert.equal(a.map.colorSpace,T.SRGBColorSpace);
 assert.notEqual(a.bumpMap.colorSpace,T.SRGBColorSpace);assert.notEqual(a.roughnessMap.colorSpace,T.SRGBColorSpace);
 assert.equal(a.roughnessMap,a.metalnessMap);assert.equal(a.map.isDataTexture,true);
 const g=new T.PlaneGeometry(1,1),response=a.roughnessMap.image;
 const sample=surface=>{
  const uv=detailUV(T,g,surface),xs=[],ys=[];for(let i=0;i<uv.length;i+=2){xs.push(uv[i]);ys.push(uv[i+1]);}
  const x=Math.floor((Math.min(...xs)+Math.max(...xs))*.5*response.width),y=Math.floor((Math.min(...ys)+Math.max(...ys))*.5*response.height),i=(y*response.width+x)*4;
  return {rough:response.data[i+1],metal:response.data[i+2]};
 };
 assert.equal(sample('skin').metal,0);assert.equal(sample('cloth').metal,0);assert(sample('metal').metal>0);
 assert(sample('cloth').rough>sample('wet').rough,'wet tissue and dry cloth have different response');
 assert.deepEqual(detailMaterial({}),{},'minimal test engines gracefully skip textures');
});

test('all detailed batches have usable UVs and normals without extra material groups',()=>{
 for(const k of CONCEPT_TYPES){
  const g=rig();applyZombieConcept({THREE:T,g,typeKey:k,scale:1,rbox});let batches=0;
  g.traverse(o=>{
   if(!o.isMesh||!o.userData.compacted)return;batches++;
   const p=o.geometry.getAttribute('position'),n=o.geometry.getAttribute('normal'),uv=o.geometry.getAttribute('uv');
   assert.equal(n.count,p.count,k+' normal coverage');assert.equal(uv.count,p.count,k+' UV coverage');
   assert([...uv.array].every(v=>Number.isFinite(v)&&v>0&&v<1),k+' atlas UV bounds');
   assert([...n.array].every(Number.isFinite),k+' finite normals');
   for(let i=0;i<n.count;i++){const len=Math.hypot(n.getX(i),n.getY(i),n.getZ(i));assert(len>.9&&len<1.1,k+' normalized surface normal');}
   assert.equal(o.geometry.groups.length,0,k+' no texture material splits');assert(!Array.isArray(o.material));assert(o.material.map?.isDataTexture);
  });
  assert(batches>0,k+' has textured surface batches');
 }
});

test('cached texture maps remain shared while zombie damage tint stays independent',()=>{
 const a=rig(),b=rig();for(const g of [a,b])applyZombieConcept({THREE:T,g,typeKey:'military',scale:1,rbox});
 const am=a.userData.torso.children.find(m=>m.userData.compacted),bm=b.userData.torso.children.find(m=>m.userData.compacted);
 assert.equal(am.geometry,bm.geometry);assert.notEqual(am.material,bm.material);
 for(const key of ['map','bumpMap','roughnessMap','metalnessMap'])assert.equal(am.material[key],bm.material[key]);
 const original=bm.material.color.getHex();am.material.color.setHex(0xee0000);assert.equal(bm.material.color.getHex(),original);
});
