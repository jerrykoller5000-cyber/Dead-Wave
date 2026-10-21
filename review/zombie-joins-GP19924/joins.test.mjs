import fs from 'node:fs';import assert from 'node:assert/strict';import test from 'node:test';
import * as T from '../../vendor/three/three.core.js';
import {applyZombieConcept,CONCEPT_TYPES} from '../../studio/zombie-concepts.js';
import {prepareSpitterJaw} from '../../game/spitter-motion.js';
import {prepareScreamerAppearance} from '../../game/screamer-appearance.js';
import {blendZombieJoins,refreshZombieJoinLoss} from '../../combat/zombie-joins.js';
const source=fs.readFileSync('index.html','utf8');
const body=source.slice(source.indexOf('    function skinZombieMesh(g, s = 1)'),source.indexOf('    // A severed part\'s bone goes to nothing'));
const bind=new Function('THREE','SKIN_ZOMBIES','pgbPatchMat','blendZombieJoins','g','s',body+';skinZombieMesh(g,s);');
function build(k,s=1){
 const g=new T.Group(),u=g.userData,j=(p,name,x=0,y=0,z=0)=>{const o=new T.Group();o.name=name;o.position.set(x*s,y*s,z*s);p.add(o);return o;};u.typeKey=k;
 u.hips=j(g,'hips',0,.55);u.torso=j(u.hips,'torso',0,.28);u.head=j(u.torso,'head',0,k==='demon'?.69:.58,k==='demon'?.1:0);
 for(const S of ['L','R']){const side=S==='L'?-1:1,a=u['arm'+S+'G']=j(u.torso,'arm'+S,side*(k==='demon'?.42:.32),.42);a.userData.elbowG=j(a,'elbow'+S,0,-.34);const l=u['leg'+S+'G']=j(u.hips,'leg'+S,side*.13,-.02);l.userData.shinG=j(l,'shin'+S,0,-.38);}
 u.eyes=[-1,1].map(side=>{const e=new T.Mesh(new T.SphereGeometry(.045*s,8,6),new T.MeshStandardMaterial({emissive:0xaabb22}));e.position.set(side*.09*s,.04*s,.18*s);u.head.add(e);return e;});
 u.crawlLimbs=Array.from({length:6},(_,i)=>{const root=j(u.torso,'crawl'+i),knee=j(root,'knee'+i,0,.4),baseQ=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),1.3),kneeQ=baseQ.clone();root.quaternion.copy(baseQ);knee.quaternion.copy(kneeQ);return {root,knee,baseQ,kneeQ};});
 applyZombieConcept({THREE:T,g,typeKey:k,scale:s,rbox:(w,h,d)=>new T.BoxGeometry(w,h,d)});
 if(k==='spitter')prepareSpitterJaw(T,g,s);if(k==='screamer')prepareScreamerAppearance(T,g,s);
 bind(T,true,null,blendZombieJoins,g,s);return g;
}
for(const k of CONCEPT_TYPES)test(k+': normalized blended weights and finite posed skin without adding vertices',()=>{
 const g=build(k),u=g.userData;assert(u.skinMesh);
 if(k!=='spider')assert(u.zombieJoinSkins.some(m=>m.userData.joinBlend.changed>0));
 const v=new T.Vector3();let n=0;
 for(let pose=0;pose<15;pose++){
  u.armLG.rotation.set(-pose*.14,.16*Math.sin(pose),pose*.03);u.armLG.userData.elbowG.rotation.x=pose*.17;u.legRG.rotation.x=pose*.06;u.legRG.userData.shinG.rotation.x=pose*.10;u.head.rotation.set(pose*.025,pose*.04,0);
  g.updateMatrixWorld(true);
  for(const m of u.skinMeshes){m.skeleton.update();const P=m.geometry.attributes.position,W=m.geometry.attributes.skinWeight,I=m.geometry.attributes.skinIndex;
   for(let i=0;i<P.count;i+=13){assert(Math.abs(W.getX(i)+W.getY(i)+W.getZ(i)+W.getW(i)-1)<1e-6);for(let j=0;j<4;j++)assert(I.array[i*4+j]<m.skeleton.bones.length);m.getVertexPosition(i,v);assert([v.x,v.y,v.z].every(Number.isFinite));assert(v.length()<6);n++;}
  }
 }
 assert(n>100);
});
test('coincident parent/child seam vertices remain coincident through bending and twist',()=>{
 const g=new T.Group(),u=g.userData;u.typeKey='shambler';u.armLG=new T.Group();g.add(u.armLG);const el=u.armLG.userData.elbowG=new T.Group();u.armLG.add(el);
 const p=[],I=[],W=[];for(const owner of [0,1])for(let i=0;i<12;i++){const a=i/12*Math.PI*2;p.push(.06*Math.sin(a),-.01,.06*Math.cos(a));I.push(owner,0,0,0);W.push(1,0,0,0);}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setAttribute('skinIndex',new T.Uint16BufferAttribute(I,4));geo.setAttribute('skinWeight',new T.Float32BufferAttribute(W,4));
 const m=new T.SkinnedMesh(geo,new T.MeshBasicMaterial());g.add(m);g.updateMatrixWorld(true);m.bind(new T.Skeleton([u.armLG,el]));blendZombieJoins(T,g,m);
 const a=new T.Vector3(),b=new T.Vector3();for(let i=0;i<60;i++){el.rotation.set(i*.04,i*.01,Math.sin(i)*.3);g.updateMatrixWorld(true);m.skeleton.update();for(let v=0;v<12;v++){m.getVertexPosition(v,a);m.getVertexPosition(v+12,b);assert(a.distanceTo(b)<1e-7);}}
});
test('loss removes every mixed weight across collapsed bones; reset restores exact bind weights',()=>{
 const g=build('demon'),u=g.userData,skins=u.zombieJoinSkins;
 const snapshots=skins.map(m=>({i:m.geometry.attributes.skinIndex.array.slice(),w:m.geometry.attributes.skinWeight.array.slice()}));
 for(const group of [u.armLG,u.legRG,u.head]){group.userData._skinCollapsed=true;refreshZombieJoinLoss(g);
  for(const m of skins){const I=m.geometry.attributes.skinIndex,W=m.geometry.attributes.skinWeight,b=m.skeleton.bones;for(let i=0;i<W.count;i++){let lost=false;for(const ix of [I.getX(i),I.getY(i)])for(let p=b[ix];p&&p!==g;p=p.parent)if(p.userData._skinCollapsed)lost=true;if(lost)assert.equal(W.getY(i),0);}}
 }
 for(const group of [u.armLG,u.legRG,u.head])group.userData._skinCollapsed=false;refreshZombieJoinLoss(g);
 skins.forEach((m,i)=>{assert.deepEqual(m.geometry.attributes.skinIndex.array,snapshots[i].i);assert.deepEqual(m.geometry.attributes.skinWeight.array,snapshots[i].w);});
});
test('bind deformation is invariant under body scale and world transform',()=>{
 for(const s of [.65,1,1.8]){const g=build('feral',s);g.position.set(12,4,-7);g.rotation.y=.8;g.updateMatrixWorld(true);for(const m of g.userData.skinMeshes){m.skeleton.update();const p=m.geometry.attributes.position,a=new T.Vector3(),b=new T.Vector3();for(let i=0;i<p.count;i+=17){m.getVertexPosition(i,a);b.fromBufferAttribute(p,i);assert(a.distanceTo(b)<1e-5);}}}
});
