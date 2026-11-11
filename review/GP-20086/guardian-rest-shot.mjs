import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Engine} from '../../tools/camera.mjs';
if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Use crew game-test slot');
const E=new Engine({training:true,warm:'none',size:'1280x720'});
try {
  await E.open();
  const proof=await E.ev(`R.release();const D=T.trainingDbg;D.panel().close();D.clear();T.AudioSys.setMuted(true);const f=D.tg().floorY;T.player.position.set(-10,f,-614);T.setVelDbg(0,0);T.setShotView({x:-25,y:f+6,z:-623,tx:-30,ty:f+2,tz:-630,fov:44});const z=T.spawnZombie(-30,-630,'guardian',true,true);z.trainingZ=true;z.riseT=0;z.speed=z.baseSpeed=0;z.mesh.position.set(-30,f,-630);T.stepFrame(.016);T.killZombie(z,false,{kind:'bullet',dir:{x:-1,z:0},raw:120});for(let i=0;i<95;i++)T.stepFrame(.016);const c=T.getCorpses().at(-1),rig=c.mesh.userData.bossRig.userData.rig;const v=new T.THREE.Vector3(),out={floor:f,frozen:c.frozen,settled:c.trainingSettled,lift:c.trainingLift,bodyMin:T.trainingDbg.state().zombieCollision.bounds(c.mesh).min.y,limbs:{}};for(const side of ['L','R'])for(const part of ['hand','foot']){const j=rig[part+side];if(j){j.getWorldPosition(v);out.limbs[part+side]=[v.x,v.y,v.z]}}return out;`);
  proof.joints=await E.ev(`const c=T.getCorpses().at(-1),rig=c.mesh.userData.bossRig.userData.rig,v=new T.THREE.Vector3(),out={};for(const k of ['chest','pelvis','shoulderL','shoulderR','elbowL','elbowR','wristL','wristR','hipL','hipR','kneeL','kneeR','ankleL','ankleR']){rig[k].getWorldPosition(v);out[k]=[v.x,v.y,v.z]}return out;`);
  proof.exactMin=await E.ev(`const c=T.getCorpses().at(-1),mesh=c.mesh,v=new T.THREE.Vector3();mesh.updateMatrixWorld(true);let min=Infinity;mesh.traverse(o=>{if(!o.isMesh||!o.visible)return;for(let p=o.parent;p&&p!==mesh;p=p.parent)if(!p.visible)return;const pos=o.geometry?.getAttribute('position');if(!pos)return;if(o.isSkinnedMesh)o.skeleton.update();for(let i=0;i<pos.count;i++){if(o.isSkinnedMesh)o.getVertexPosition(i,v);else v.fromBufferAttribute(pos,i);min=Math.min(min,v.applyMatrix4(o.matrixWorld).y)}});return min;`);
  await E.page.screenshot('review/GP-20086/after-guardian-rest-final.png');
  fs.writeFileSync('review/GP-20086/guardian-rest-final.json',JSON.stringify(proof,null,2));
  assert(Math.abs(proof.exactMin-(proof.floor+.015))<.06,'guardian visible geometry must rest on tile');
  for(const side of ['L','R']){
    assert(proof.limbs['hand'+side][1]<proof.floor+.55,'guardian hand still raised');
    assert(proof.joints['ankle'+side][1]<proof.floor+.55,'guardian foot still raised');
  }
  assert.deepEqual(E.page.errors,[]);
  console.log('PASS guardian hand/foot contact and visible floor clearance; 0 page errors');
  console.log(JSON.stringify(proof));
} finally {await E.close();}
