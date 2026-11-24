import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceClaw, CLAW_SWING, CLAW_WIND, poseClaw } from './zombie-melee.js';

function attacker() {
  const bone = () => ({rotation: {x:0, y:0, z:0}, userData:{}});
  const arm = () => Object.assign(bone(), {userData:{elbowG:bone()}});
  return {attackWindup:CLAW_WIND, swingT:0, swingSide:1, partsLost:{},
    mesh:{userData:{armLG:arm(), armRG:arm(), torso:bone(), head:bone(), hips:{position:{z:0}}}},
    _pendingAttack:{type:'player',victimId:7}};
}

test('one contact at the forward reach across different simulation steps', () => {
  for (const dt of [1/30, 1/60, 1/144, .37, .6]) {
    const z = attacker(), hits = [];
    for (let t=0; t<.75; t+=dt) {
      const event=advanceClaw(z, dt);
      poseClaw(z);
      if (event) hits.push({t:t+dt, event});
    }
    assert.equal(hits.length,1);
    assert.equal(hits[0].event.victimId,7);
    const due = CLAW_WIND + CLAW_SWING * .30;
    assert(hits[0].t >= due - 1e-9 && hits[0].t < due + dt + 1e-9);
  }
});

test('the lead shoulder opens in the tell, extends on contact and settles', () => {
  for (const side of [-1,1]) {
    const z=attacker();
    z.swingSide=side;
    const u=z.mesh.userData, lead=side<0?u.armLG:u.armRG, support=side<0?u.armRG:u.armLG;
    advanceClaw(z,CLAW_WIND); poseClaw(z);
    assert(Math.abs(lead.rotation.z) > Math.abs(support.rotation.z) + .30);
    assert(lead.userData.elbowG.rotation.x < -.9 && u.hips.position.z < 0);
    assert(advanceClaw(z,.085)); poseClaw(z);
    assert(lead.userData.elbowG.rotation.x > -.2 && u.hips.position.z > .08);
    advanceClaw(z,.3); poseClaw(z);
    assert.equal(u.hips.position.z,0);
  }
});

test('with one arm the surviving shoulder leads and the missing arm stays still', () => {
  const z=attacker(), u=z.mesh.userData;
  z.partsLost.armR=true;
  advanceClaw(z,CLAW_WIND); poseClaw(z);
  assert(u.armLG.rotation.z < -.6);
  assert.equal(u.armRG.rotation.z,0);
});

test('a two-legged Shambler leads with the opposite foot and keeps a support foot through contact', () => {
  for (const side of [-1, 1]) {
    const z=attacker(), rig=z.mesh.userData;
    z.typeKey='shambler'; z.swingSide=side;
    Object.assign(z.mesh,{position:{x:0,z:0},rotation:{y:0},scale:{z:1}});
    rig.baseHipsY=.82;
    Object.assign(rig.hips,{position:{y:.82,z:0},rotation:{x:0}});
    const leg=()=>({position:{y:0,z:0},rotation:{x:0},userData:{
      shinG:{position:{y:-.38},rotation:{x:0}},
      shamblerAnkle:{position:{y:-.36,z:.04},rotation:{x:0}},shamblerFootY:.08
    }});
    const legs=[rig.legLG=leg(),rig.legRG=leg()];
    const lead=side>0?0:1;
    for(let frame=0;frame<25;frame++){
      advanceClaw(z,1/60);
      rig.hips.position.y=rig.baseHipsY;
      for(const l of legs) {l.rotation.x=0;l.userData.shinG.rotation.x=0;}
      poseClaw(z);
      if(frame!==18)continue;
      const ankles=legs.map(l=>{
        const a=l.rotation.x, k=a+l.userData.shinG.rotation.x;
        return {y:rig.hips.position.y-.38*Math.cos(a)-.36*Math.cos(k)-.04*Math.sin(k),
          z:rig.hips.position.z-.38*Math.sin(a)-.36*Math.sin(k)+.04*Math.cos(k)};
      });
      assert(ankles[lead].z-ankles[1-lead].z>.18);
      assert(Math.abs(ankles[1-lead].z-.04)<.015);
      assert(Math.abs(ankles[1-lead].y-.08)<.025);
    }
  }
});
