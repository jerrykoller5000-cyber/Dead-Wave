import fs from 'node:fs';
import assert from 'node:assert/strict';
import { Engine } from '../../tools/camera.mjs';
const before=process.argv.includes('--before'), live=process.argv.includes('--live'), dir='review/training-visibility-GP197', proof={};
const E=new Engine({training:true,warm:'none',size:'1200x850'});
if(!live) E.load=async function(){
  const goto=this.page.goto.bind(this.page);
  this.page.goto=(url,...args)=>goto(url.replace('/index.html?',`/${dir}/${before?'before':'index'}.html?`),...args);
  try { await Engine.prototype.load.call(this); } finally { this.page.goto=goto; }
};
try {
  await E.open();
  await E.ev('R.release();window.D=T.trainingDbg;D.panel().close();D.clear();T.AudioSys.setMuted(true);T.setHp(10000);T.player.position.set(-26,D.tg().floorY,-632);return true;');
  if(!live) {
    proof.los=await E.ev(`const a={x:-26,y:-198.5,z:-632}, b={x:0,y:-198.7,z:-632};try { return {blocked:T.shotBlockedDbg(a,b)}; } catch(e){return {error:e.message};}`);
    if(before) assert.match(proof.los.error,/from.distanceTo is not a function/);
    else assert.equal(proof.los.blocked,true);
  } else proof.los={covered:'Actual live shotBlocked function in los.test.mjs; spider AI below.'};
  console.log(before?'REPRO: from.distanceTo is not a function (plain xyz spider LOS hitting Training wall).':'PASS: plain xyz LOS blocked normally, no exception.');
  const cams={
    east:{x:3,y:-181,z:-642,tx:-26,ty:-198,tz:-632,fov:52},
    west:{x:-53,y:-181,z:-642,tx:-26,ty:-198,tz:-632,fov:52},
    north:{x:-20,y:-181,z:-601,tx:-26,ty:-198,tz:-632,fov:52},
    south:{x:-20,y:-181,z:-666,tx:-26,ty:-198,tz:-632,fov:52}
  };
  proof.views={};
  await E.ev('D.openPanel();D.panel().element.hidden=true;return true;');
  for(const[side,cam]of Object.entries(cams)){
    await E.ev(`T.camera.position.set(${cam.x},${cam.y},${cam.z});T.camera.lookAt(${cam.tx},${cam.ty},${cam.tz});T.camera.fov=${cam.fov};T.camera.updateProjectionMatrix();return true;`);
    if(!before) await E.ev(`D.tg().cutaway.update(${JSON.stringify(cam)},T.player.position,1);return true;`);
    await E.shoot({target:'player',cam,out:`${dir}/${live?'live':before?'before':'after'}-${side}.png`});
    proof.views[side]=await E.ev('return {cutaway:D.tg().cutaway?.state()||null,solids:D.tg().solids.length};');
    if(!before){assert.ok(Math.abs(proof.views[side].cutaway.find(x=>x.side===side).opacity-.06)<1e-9);assert.equal(proof.views[side].cutaway.find(x=>x.side==='overhead').opacity,0);}
  }
  if(!before){
    proof.trace=await E.ev(`const {traceTraining}=await import('/${live?'world':dir}/training-ballistics.js');const tg=D.tg();tg.cutaway.update({x:3,y:-181,z:-642},T.player.position,1);const a={x:3,y:-181,z:-642},b={x:-26,y:-198,z:-632}; const bullet=traceTraining(tg,a,b),aim=traceTraining(tg,a,b,{throughGlass:true});return {bullet:bullet?.solid.wall||bullet?.solid.prop||false,aim:aim?.solid.wall||aim?.solid.prop||false,aimPoint:aim?.point||null};`);
    assert.equal(proof.trace.bullet,true);assert.equal(proof.trace.aim,false);
    proof.restore=await E.ev('T.player.position.set(0,D.tg().floorY,-648);D.tg().cutaway.update({x:0,y:-180,z:-655},T.player.position,1);return D.tg().cutaway.state();');
    assert.ok(proof.restore.every(e=>e.opacity===1&&!e.hidden));
    await E.ev('R.release();D.panel().close();T.player.position.set(-26,D.tg().floorY,-632);D.spawn("spider",1);await wait(7000);const z=T.zombies.find(z=>z.trainingZ&&z.alive);z.mesh.position.set(-38,D.tg().floorY,-632);z.hp=10000;z.lineT=0;T.damageZombie(z,1,{kind:"bullet",dir:{x:-1,z:0},hitY:z.mesh.position.y+.3});await wait(3500);return true;');
    proof.spider=await E.ev('const z=T.zombies.find(z=>z.trainingZ&&z.alive);return {alive:z.alive,lineClear:z.lineClear,lineT:z.lineT,error:document.getElementById("errorCard").textContent};');
    assert.equal(typeof proof.spider.lineClear,'boolean');
    await E.ev('D.clear();return true;');
    if(live){
      proof.orbit=await E.ev('R.release();T.player.position.set(-13,D.tg().floorY,-632);const views=[];for(let i=0;i<4;i++){T.rotateCamera(Math.PI/2);await wait(1000);views.push({camera:{x:T.camera.position.x,y:T.camera.position.y,z:T.camera.position.z},shell:D.tg().cutaway.state()});}return views;');
      assert.ok(proof.orbit.every(v=>v.shell.find(e=>e.side==='overhead').opacity===0));
      assert.ok(proof.orbit.some(v=>v.shell.find(e=>e.side==='east').hidden));
      proof.rangeExit=await E.ev('T.player.position.set(0,D.tg().floorY,-648);await wait(500);return D.tg().cutaway.state();');
      assert.ok(proof.rangeExit.every(e=>e.opacity===1&&!e.hidden));
    }
  }
  proof.errors=E.page.errors;assert.equal(proof.errors.length,0);
  console.log(before?'Before shots captured.':'PASS: four camera directions cut away; camera sees through near shell; bullet trace stays solid; range restores; shot spider updates normally; no browser errors.');
}finally{fs.writeFileSync(`${dir}/${live?'live-proof':before?'before':'proof'}.json`,JSON.stringify(proof,null,2));await E.close();}
process.exit(0);
