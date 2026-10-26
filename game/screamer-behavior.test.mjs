import test from 'node:test';import assert from 'node:assert/strict';
import * as T from '../vendor/three/three.core.js';
import {SCREAMER,screamerProtected,tickScreamerShield,steerScreamer,screamerScreamPose,resetScreamer,applyScreamerPose,restoreScreamerPose,screamerState} from './screamer-behavior.js';
const actor=()=>({typeKey:'screamer',alive:true,partsLost:{},mesh:{rotation:{y:0},userData:{}}});
test('D-86 protected shield passes one quarter of a hit',()=>{assert.equal(SCREAMER.damageShare,.25);assert.equal(100*SCREAMER.damageShare,25);});
test('shield follows actual scream completion; opening lasts 2.4 seconds',()=>{const z=actor();assert(screamerProtected(z));z.screamT=1.2;tickScreamerShield(z,1/60);assert(screamerProtected(z));for(let i=0;i<30;i++){z.screamT=.7;tickScreamerShield(z,1/60);}z.screamT=0;tickScreamerShield(z,1/60);assert.equal(z.sonicOpenT,2.4);for(let i=0;i<143;i++)tickScreamerShield(z,1/60);assert(!screamerProtected(z));tickScreamerShield(z,1/60);tickScreamerShield(z,1/60);assert(screamerProtected(z));});
test('each completed scream creates a fresh opening',()=>{const z=actor();for(let i=0;i<3;i++){z.screamT=1.2;tickScreamerShield(z,.1);z.screamT=0;tickScreamerShield(z,.1);assert.equal(z.sonicOpenT,2.4);for(let j=0;j<25;j++)tickScreamerShield(z,.1);assert(screamerProtected(z));}});
test('head loss and death remove shield and cancel scream',()=>{for(const key of ['head','dead']){const z=actor();z.screamT=.5;tickScreamerShield(z,.1);if(key==='head')z.partsLost.head=true;else z.alive=false;tickScreamerShield(z,.1);assert(!screamerProtected(z));assert.equal(z.screamT,0);}});
test('shield never affects another species',()=>{const z=actor();z.typeKey='shambler';assert(!screamerProtected(z));tickScreamerShield(z,.1);assert.equal(z.sonicOpenT,undefined);});
test('half turn is accelerated and bounded at multiple frame rates',()=>{for(const fps of [30,60,120]){const z=actor();let prev=0;for(let i=0;i<fps;i++){const r=steerScreamer(z,0,-1,1/fps);assert(Math.abs(r.rate)<=SCREAMER.turnRate+1e-9);assert(Math.abs(r.rate-prev)<=SCREAMER.turnAccel/fps+1e-8);assert(r.pace>=.32*SCREAMER.protectedPace&&r.pace<=SCREAMER.protectedPace);z.mesh.rotation.y=r.yaw;prev=r.rate;}assert(z.mesh.rotation.y<2.3&&z.mesh.rotation.y>1.5);}});
test('scream commits facing, then exhausted pose relaxes',()=>{const z=actor();z.screamT=.5;const r=steerScreamer(z,1,0,1/60);assert.equal(r.yaw,0);assert.equal(r.rate,undefined);const peak=screamerScreamPose(.5),spent=screamerScreamPose(0,2.4),rest=screamerScreamPose(0,0);assert(peak.arch<0&&peak.jaw>0&&peak.arms>0);assert(spent.arch>0&&spent.head>0);assert.equal(rest.arch,0);});
test('room clear removes private state and hides effects',()=>{const z=actor();let hidden=false;z.mesh.userData.screamerFx={hide:()=>hidden=true};z.sonicOpenT=1;z.sonicHitT=.18;z._sonicScreaming=true;resetScreamer(z);assert(hidden);assert.equal(z.sonicOpenT,undefined);assert.equal(z.sonicHitT,undefined);assert.equal(z._sonicScreaming,undefined);});

const threat=(extra={})=>({dx:0,dz:4,allow:true,safe:()=>true,...extra});
test('protected pursuit closes; exposed retreat increases separation and still faces the player',()=>{const z=actor();let r=steerScreamer(z,0,1,1/60,threat());assert(r.z>0);z.sonicOpenT=2.4;for(let i=0;i<120;i++){r=steerScreamer(z,0,1,1/60,threat());assert(r.z<0);assert(r.pace>=.78&&r.pace<=1);assert(Math.abs(r.yaw)<1e-9);assert(r.evading);}assert.equal(screamerState(z).mode,'retreat');z.sonicOpenT=0;r=steerScreamer(z,0,1,1/60,threat());assert(r.z>0&&!r.evading);});
test('exposed movement tries another safe route, and holds when boxed in',()=>{const z=actor();z.sonicOpenT=2;let calls=0;let r=steerScreamer(z,0,1,1/60,threat({safe:x=>{calls++;return x>0;}}));assert(r.x>0&&r.z<0);assert(calls>=1);r=steerScreamer(z,0,1,1/60,threat({safe:()=>false}));assert.equal(r.pace,0);assert.equal(r.x,0);assert.equal(r.z,0);});
test('exposed side changes are held, not random frame to frame; retreat never accelerates past original pace',()=>{const z=actor();z.sonicOpenT=2.4;const sides=[];for(let i=0;i<120;i++){const r=steerScreamer(z,0,1,1/60,threat());assert(r.pace<=1);sides.push(screamerState(z).evadeSide);}const changes=sides.slice(1).filter((v,i)=>v!==sides[i]).length;assert(changes>=3&&changes<=5);});
test('retreat holds a gap rather than running forever; invalid/alternate targets and injuries keep normal movement',()=>{const z=actor();z.sonicOpenT=2;let r=steerScreamer(z,0,1,.02,threat({dz:11}));assert.equal(r.pace,0);for(const change of [z=>z.partsLost.head=true,z=>z.partsLost.legL=true,z=>z.inWater=true]){const a=actor();a.sonicOpenT=2;change(a);r=steerScreamer(a,0,1,.02,threat());assert(!r.evading);}r=steerScreamer(z,0,1,.02,threat({allow:false}));assert(!r.evading);});
test('committed scream/attack and downed bodies are not redirected',()=>{for(const key of ['screamT','attackWindup','swingT']){const z=actor();z.sonicOpenT=2;z[key]=.5;const r=steerScreamer(z,0,1,.02,threat());assert(!r.evading&&r.pace===1);}for(const key of ['knockT','getUpT','riseT']){const z=actor();z[key]=1;z.sonicOpenT=2;assert.equal(steerScreamer(z,0,1,.02,threat()),null);}});
const rig=()=>{const obj=()=>({position:{x:0,y:0,z:0},rotation:{x:0,y:0,z:0},userData:{}});const z=actor(),u=z.mesh.userData;z.mesh.position={x:0,y:0,z:0};u.rest={};u.baseHipsY=.9;u.hips=obj();u.hips.position.y=.9;u.torso=obj();u.head=obj();u.screamerJaw=obj();u.screamerTongue=obj();for(const S of ['L','R']){const leg=obj();leg.position.x=S==='L'?-.13:.13;leg.position.y=-.18;leg.userData.shamblerFootY=-.02;leg.userData.shinG=obj();leg.userData.shamblerAnkle={rotation:{x:0,y:0,z:0,set(x,y,zz){Object.assign(this,{x,y,z:zz});}}};u['leg'+S+'G']=leg;const arm=obj();arm.userData.elbowG=obj();u['arm'+S+'G']=arm;}return z;};
test('protected hover blends to exposed footwork and back, with no accumulating pose offsets',()=>{const z=rig(),base=z.mesh.userData.hips.position.y;for(let i=0;i<60;i++){restoreScreamerPose(z);z.mesh.position.z+=.04;applyScreamerPose(z,1/60);}assert(screamerState(z).hover>.09);assert.equal(z.mesh.position.y,0);z.sonicOpenT=2.4;for(let i=0;i<30;i++){restoreScreamerPose(z);z.mesh.position.z-=.04;applyScreamerPose(z,1/60);}assert(screamerState(z).exposure>.99);assert(screamerState(z).hover<.001);z.sonicOpenT=0;for(let i=0;i<45;i++){restoreScreamerPose(z);z.mesh.position.z+=.04;applyScreamerPose(z,1/60);}assert(screamerState(z).hover>.09);restoreScreamerPose(z);assert.equal(z.mesh.userData.hips.position.y,base);assert.equal(z.mesh.userData.armLG.userData.elbowG.rotation.z,0);resetScreamer(z);assert.equal(screamerState(z).phase,undefined);});

test('shielded travel is two fifths pace, while exposed and headless travel keep their existing speed',()=>{for(const fps of [30,60,120]){const z=actor();assert.equal(steerScreamer(z,0,1,1/fps,threat()).pace,.4);z.screamT=.5;assert.equal(steerScreamer(z,0,1,1/fps,threat()).pace,.4);z.screamT=0;z.sonicOpenT=2;const retreat=steerScreamer(z,0,1,1/fps,threat());assert(retreat.pace>=.78&&retreat.pace<=1);z.partsLost.head=true;assert.equal(steerScreamer(z,0,1,1/fps,threat()).pace,1);}});
test('protected bob lifts the body in a smooth sustained cycle without moving its collision root',()=>{const z=rig(),ys=[];for(let i=0;i<300;i++){restoreScreamerPose(z);z.mesh.position.z+=.7/60;applyScreamerPose(z,1/60);ys.push(screamerState(z).hover);assert.equal(z.mesh.position.y,0);}assert(Math.max(...ys)-Math.min(...ys)>.12);assert(Math.min(...ys)>.09&&Math.max(...ys)<.23);assert(ys.slice(1).every((y,i)=>Math.abs(y-ys[i])<.002));restoreScreamerPose(z);assert.equal(z.mesh.userData.hips.position.y,.9);});

test('arms pose even when a concept foot has no ankle helper',()=>{
 const z=rig(),u=z.mesh.userData;
 for(const side of ['L','R']){delete u['leg'+side+'G'].userData.shamblerAnkle;u['arm'+side+'G'].rotation.z=side==='L'?.9:-.9;}
 for(let i=0;i<60;i++){restoreScreamerPose(z);applyScreamerPose(z,1/60);}
 assert(u.armLG.rotation.z<0&&u.armRG.rotation.z>0,'both arms open outward from the crossed bind pose');
 restoreScreamerPose(z);assert.equal(u.armLG.rotation.z,.9);assert.equal(u.armRG.rotation.z,-.9);
});

function spatialRig(){
 const z=rig(),u=z.mesh.userData;z.mesh=new T.Group();z.mesh.userData=u;
 u.hips=new T.Group();u.hips.position.y=u.baseHipsY;z.mesh.add(u.hips);
 u.torso=new T.Group();u.torso.position.y=.28;u.hips.add(u.torso);
 u.head=new T.Group();u.head.position.y=.58;u.torso.add(u.head);
 for(const side of ['L','R']){const arm=new T.Group(),elbow=new T.Group();arm.position.set(side==='L'?-.32:.32,.42,0);elbow.position.y=-.34;arm.add(elbow);u.torso.add(arm);arm.userData.elbowG=elbow;u['arm'+side+'G']=arm;}
 return z;
}
test('full drift, scream and retreat transitions keep each arm on its own side and outside the torso',()=>{
 for(const fps of [30,60,120]){
  const z=spatialRig(),u=z.mesh.userData,previous={};
  for(let f=0;f<fps*12;f++){
   const t=f/fps;restoreScreamerPose(z);z.screamT=t>=3&&t<4.2?4.2-t:0;z.sonicOpenT=t>=4.2&&t<6.6?6.6-t:0;
   z.mesh.position.z+=(z.sonicOpenT?-.8:.4)/fps;applyScreamerPose(z,1/fps);z.mesh.updateMatrixWorld(true);
   for(const side of ['L','R']){
    const arm=u['arm'+side+'G'],elbow=arm.userData.elbowG,sign=side==='L'?-1:1;
    for(const [bone,length] of [[arm,.34],[elbow,.46]])for(const fraction of [.25,.5,.75,1]){
     const p=u.torso.worldToLocal(bone.localToWorld(new T.Vector3(0,-length*fraction,0)));
     assert(p.x*sign>.16,`${fps}fps ${t.toFixed(3)} ${side}: arm crosses head/body center (${p.toArray()})`);
     assert(p.y>.44||Math.abs(p.x)>.24||Math.abs(p.z)>.23,'limb centerline clears the torso plus flesh radius');
    }
    const palm=elbow.localToWorld(new T.Vector3(0,-.36,0));
    if(previous[side])assert(palm.distanceTo(previous[side])<3.8/fps,'hand transition is continuous in world space');previous[side]=palm;
   }
  }
 }
});
