import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../../vendor/three/three.core.js';
import {applyZombieConcept,CONCEPT_TYPES} from '../../studio/zombie-concepts.js';
import {resetZombieAbilityVisuals} from '../../game/zombie-ability-visuals.js';
import {prepareScreamerAppearance} from '../../game/screamer-appearance.js';
import {applyScreamerPose,restoreScreamerPose} from '../../game/screamer-behavior.js';
import {prepareSpitterJaw} from '../../game/spitter-motion.js';
import {detailUV,detailMaterial,generateDetailPixels,DETAIL_SURFACES} from '../../studio/zombie-detail.js';
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

test('Screamer fingers stay outside the skull while covering her ears',()=>{
 const g=rig(),u=g.userData;u.typeKey='screamer';applyZombieConcept({THREE:T,g,typeKey:'screamer',scale:1,rbox});prepareScreamerAppearance(T,g,1);u.baseHipsY=.55;u.rest={};
 const z={typeKey:'screamer',alive:true,partsLost:{},mesh:g,scale:1,bob:0},p=new T.Vector3();
 for(let f=0;f<420;f++){
  restoreScreamerPose(z);const t=f/60;z.screamT=t>=1&&t<2.2?2.2-t:0;z.sonicOpenT=t>=2.2&&t<4.6?4.6-t:0;applyScreamerPose(z,1/60);g.updateMatrixWorld(true);const inv=u.head.matrixWorld.clone().invert();
  for(const arm of [u.armLG,u.armRG])arm.traverse(o=>{const pos=o.geometry?.attributes.position;if(!pos)return;const m=inv.clone().multiply(o.matrixWorld);for(let i=0;i<pos.count;i++){
   p.fromBufferAttribute(pos,i).applyMatrix4(m);const inside=(p.x/.13)**2+((p.y-.055)/.14)**2+((p.z+.02)/.10)**2;
   assert(inside>=1,'hand penetrates skull at '+t+': '+p.toArray());
  }});
 }
});
