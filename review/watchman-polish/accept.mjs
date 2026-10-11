import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Engine} from '../../tools/camera.mjs';
const E=new Engine({match:true,warm:'none',size:'1440x900'}), proof={};
try {
  await E.open();
  proof.setup=await E.ev(`
    R.release(); T.runDevCommand('bigtex shooter'); T.setPlaceMode(null);
    window.v=T.player.position.constructor;
    const px=T.player.position.x,pz=T.player.position.z;
    let spot=null;
    for(let dx=-25;dx<=25&&!spot;dx++)for(let dz=-25;dz<=25&&!spot;dz++){
      const gx=T.gridIndex(px)+dx,gz=T.gridIndex(pz)+dz;
      if(!T.placeRefusalFor('m240',gx,gz)){
        const x=T.gridCentre(gx),z=T.gridCentre(gz);
        const gun=T.spawnBuild('m240',x,z);
        const crew=T.mortarCrewSpot(gun,0);
        if(crew.ok)spot={x,z,gun};else T.builds.splice(T.builds.indexOf(gun),1);
      }
    }
    if(!spot)throw Error('no valid crew spot');
    const {x,z}=spot; T.player.position.set(x,T.sampleHeight(x,z-1.2),z-1.2);
    window.mg=spot.gun; mg.mesh.rotation.y=0;
    T.setAimTargetDbg(x,z+20); T.setPlaceMode('m240'); await wait(200);
    window.snap=()=>{
      const u=T.getMarine().userData, e=mg.mesh.userData.elev; T.player.updateMatrixWorld(true); e.updateMatrixWorld(true);
      const fist=side=>{const w=u['elbow'+side+'G'].userData.wrist;return w.localToWorld(w.userData.grip.clone().sub(w.position));};
      const err=(side,xyz)=>fist(side).distanceTo(e.localToWorld(new v(...xyz)));
      return {state:{...T.watchmanDbg().state},right:err('R',[.025,-.105,-.15]),left:err('L',[-.095,.005,-.02]),player:T.player.position.toArray(),camera:T.camera.position.toArray(),tripod:mg.mesh.rotation.y};
    };
    const ghost=T.watchmanDbg().ghost, found=[]; ghost.traverse(o=>{if(o.name==='watchman-build-ghost')found.push(o)});
    return {ghost:found.length,elevation:!!found[0]?.userData.elev};
  `);
  assert.equal(proof.setup.ghost,1); assert(proof.setup.elevation);
  await E.run({cmd:'shot',target:'player',yaw:145,pitch:25,dist:5,ui:true,out:'review/watchman-polish/final-ghost.png'});
  proof.mount=await E.ev(`R.release();T.setPlaceMode(null); const ok=T.mountMortar(mg);await wait(1400);return {ok,...snap()};`);
  assert(proof.mount.ok);
  proof.aim=[];
  for(const a of [0,1.2,-1.2,2,-2,0]){
    const result=await E.ev(`T.aimPointDbg(mg.x+Math.sin(${a})*20,mg.mesh.position.y+.84,mg.z+Math.cos(${a})*20);await wait(800);return snap();`);
    proof.aim.push(result);assert(Math.abs(result.state.yaw)<=Math.PI*.48+.001);assert.equal(result.tripod,0);
    assert(result.right<.035,`right hand gap ${result.right} at ${a}`);assert(result.left<.035,`left hand gap ${result.left} at ${a}`);
  }
  proof.close=await E.ev(`const old=T.watchmanDbg().state.yaw;T.aimPointDbg(mg.x-.1,mg.mesh.position.y,mg.z-.1);await wait(400);return {old,now:T.watchmanDbg().state.yaw};`);
  assert.equal(proof.close.old,proof.close.now);
  await E.run({cmd:'shot',target:'player',yaw:100,pitch:15,dist:3.6,ui:true,out:'review/watchman-polish/final-mounted.png'});
  proof.fire=await E.ev(`const c=T.renderer.domElement,start=mg.belt;c.dispatchEvent(new MouseEvent('mousedown',{button:0,bubbles:true}));await wait(1100);document.body.dispatchEvent(new MouseEvent('mouseup',{button:0,bubbles:true}));const end=mg.belt;await wait(300);return {start,end,afterRelease:mg.belt,hud:T.m240Dbg()};`);
  assert(proof.fire.start-proof.fire.end>=10);assert.equal(proof.fire.end,proof.fire.afterRelease);assert(/AUTO/.test(proof.fire.hud.hud));
  proof.reload=await E.ev(`T.getReserve()['7.62 belt']=300;const start=mg.belt;T.feedM240(mg);await wait(1400);const during={feed:mg.feedT,hud:T.m240Dbg(),pose:snap()};T.fireMortar();const blocked=mg.belt===start;await wait(2200);return {during,blocked,end:mg.belt,reserve:T.getReserve()['7.62 belt']};`);
  assert(proof.reload.blocked);assert(/Reloading/.test(proof.reload.during.hud.hud));assert.equal(proof.reload.end,proof.fire.end+300);assert.equal(proof.reload.reserve,0);
  proof.carry=await E.ev(`T.shoulderMortar();await wait(900);const g=T.m240VisDbg().carriedGun,u=T.getMarine().userData,w=u.elbowRG.userData.wrist;T.player.updateMatrixWorld(true);const fist=w.localToWorld(w.userData.grip.clone().sub(w.position)),target=g.userData.gun.localToWorld(new v(0,.96,.075));return {state:T.getMortarCarried(),gap:fist.distanceTo(target),visible:g.visible,hud:document.getElementById('ammoDetail').textContent};`);
  assert(proof.carry.visible);assert(proof.carry.gap<.035);assert(!/SEMI/.test(proof.carry.hud));
  await E.run({cmd:'shot',target:'player',yaw:115,pitch:10,dist:3.4,ui:true,out:'review/watchman-polish/final-carry.png'});
  proof.drop=await E.ev(`
    const b0=T.builds.filter(b=>b.type==='m240').length,cash=T.getBank(),c=T.getMortarCarried();
    let x,z;
    for(let dx=-8;dx<=8&&x==null;dx++)for(let dz=-8;dz<=8&&x==null;dz++){
      const gx=T.gridIndex(T.player.position.x)+dx,gz=T.gridIndex(T.player.position.z)+dz;
      if(!T.placeRefusalFor('m240',gx,gz)){x=T.gridCentre(gx);z=T.gridCentre(gz);}
    }
    T.m240VisDbg().setDown(x,z);await wait(100);const early=!!T.getMortarCarried();await wait(600);
    const b=T.builds.find(b=>b.type==='m240');return {early,finished:!T.getMortarCarried(),belt:b?.belt,hp:b?.hp,cashBefore:cash,cashAfter:T.getBank(),b0,n:T.builds.filter(b=>b.type==='m240').length,wanted:c.belt};
  `);
  assert(proof.drop.early&&proof.drop.finished);assert.equal(proof.drop.belt,proof.drop.wanted);assert.equal(proof.drop.cashBefore,proof.drop.cashAfter);
  proof.errors=E.page.errors;assert.equal(proof.errors.length,0);
  proof.renderer=E.renderer;
} finally { fs.writeFileSync('review/watchman-polish/accept-proof.json',JSON.stringify(proof,null,2)+'\n');await E.close(); }
console.log(JSON.stringify(proof,null,2));process.exit(0);
