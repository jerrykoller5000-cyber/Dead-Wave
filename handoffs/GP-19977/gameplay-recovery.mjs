// GP-19977: capture an actual missed melee and its recovery from the live play camera.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Engine} from '../../tools/camera.mjs';

const close=process.argv.includes('--close');
const out=`handoffs/GP-19977/${close?'close':'gameplay'}`;
fs.mkdirSync(out,{recursive:true});
const engine=new Engine({training:true,warm:'none',size:'1280x720'});
const proof={};
try{
  await engine.open();
  proof.renderer=await engine.ev('return T.renderer.info.render;');
  proof.capture=await engine.ev(`
    R.release();
    const D=T.trainingDbg;D.panel().close();D.clear();
    T.AudioSys.setMuted(true);T.setHp(10000);T.skipGrace();T.setShotView(null);
    T.player.position.set(-26,D.tg().floorY,-632);
    await wait(250);
    // Keep the dodge geometry fixed across camera presets; the live attack and
    // recovery still run through the ordinary game update loop.
    const forward=T.camera.position.clone().set(0,0,1);
    const p=T.player.position;
    const F=T.spawnZombie(p.x+forward.x*3.5,p.z+forward.z*3.5,'shambler',true,true);
    F.trainingZ=true;F.mesh.position.y=D.tg().floorY;F.hp=10000;F.riseT=0;F.attackCd=0;
    const M=await import('/game/shambler-recovery.js');
    const cuts=[.12,.38,.58,.86,1.16,1.22],frames=[],samples=[];
    let dodged=false,done=false,placed=false;
    const tick=()=>{
      if(done)return;
      if(!dodged&&F.attackWindup>0){
        dodged=true;
        T.player.position.x-=forward.z*3.2;T.player.position.z+=forward.x*3.2;
      }
      const state=M.shamblerRecoveryState(F);
      if(${close}&&state?.active&&!placed){
        // Keep both the pivot and the contact ring in one close filmstrip.
        // The missed attack has already resolved; this sets the player's
        // follow-up sidestep before the first sampled recovery pose.
        const q=F.mesh.position,a=F.mesh.rotation.y+1.7;
        T.player.position.set(q.x+Math.sin(a)*2,D.tg().floorY,q.z+Math.cos(a)*2);
        placed=true;
      }
      if(${close}){
        const q=F.mesh.position;
        T.setShotView({x:q.x+3.3,y:q.y+2.5,z:q.z+4.3,tx:q.x,ty:q.y+.95,tz:q.z,fov:39});
      }
      if(state?.active){
        const q=F.mesh.position,t=T.player.position;
        samples.push({t:state.t,x:q.x,z:q.z,yaw:F.mesh.rotation.y,gap:Math.hypot(q.x-t.x,q.z-t.z),attackCd:F.attackCd,hzLungeCd:F.hzLungeCd});
        if(cuts.length&&state.t>=cuts[0]){
          frames.push({at:cuts.shift(),png:T.renderer.domElement.toDataURL('image/png')});
        }
      }
      requestAnimationFrame(tick);
    };tick();await wait(11000);done=true;
    return {dodged,placed,frames,samples,remainingCuts:cuts,errors:[]};
  `,15000);
  for(const frame of proof.capture.frames){
    const name=`recovery-${Math.round(frame.at*100).toString().padStart(3,'0')}.png`;
    fs.writeFileSync(`${out}/${name}`,Buffer.from(frame.png.split(',')[1],'base64'));
    frame.file=`${out}/${name}`;delete frame.png;
  }
  proof.errors=engine.page.errors;
  assert.ok(proof.capture.dodged,'actual melee windup was dodged');
  assert.equal(proof.capture.frames.length,6,'six live-camera recovery frames');
  assert.ok(proof.capture.samples.length>20,'recovery sampled in the game');
  const first=proof.capture.samples.find(s=>s.t>=.42);
  const last=proof.capture.samples.findLast(s=>s.t<=1.18);
  assert.ok(first&&last&&last.gap<first.gap-.2,'shambler closes during the recovery walk');
  if(close)assert.ok(last.gap<1.1,'close fixture reaches the contact ring');
  assert.ok(proof.capture.samples.every(s=>s.attackCd>0&&s.hzLungeCd>0),'next swing and burst remain gated');
  assert.equal(proof.errors.length,0,'no page errors');
  console.log(JSON.stringify({dodged:true,frames:proof.capture.frames.length,activeSamples:proof.capture.samples.length,gapFirst:first.gap,gapLast:last.gap,errors:proof.errors.length}));
}finally{
  fs.writeFileSync(`${out}/proof.json`,JSON.stringify(proof,null,2));
  await engine.close();
}
