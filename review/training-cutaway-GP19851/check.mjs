import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Engine} from '../../tools/camera.mjs';
const before=process.argv.includes('--before'),dir='review/training-cutaway-GP19851',proof={};
const E=new Engine({training:true,warm:'none',size:'1200x850'});
if(before)E.load=async function(){const goto=this.page.goto.bind(this.page);this.page.goto=(url,...args)=>goto(url.replace('/index.html?',`/${dir}/before.html?`),...args);try{await Engine.prototype.load.call(this);}finally{this.page.goto=goto;}};
const views={
  reverse:{player:[0,-632],cam:{x:-30,y:-184,z:-642,tx:0,ty:-198.5,tz:-632,fov:52}},
  original:{player:[-15,-632],cam:{x:10,y:-184,z:-642,tx:-15,ty:-198.5,tz:-632,fov:52}},
  rangeClear:{player:[0,-648],cam:{x:0,y:-184,z:-665,tx:0,ty:-198.5,tz:-648,fov:52}},
  buildClear:{player:[-26,-632],cam:{x:-26,y:-184,z:-650,tx:-26,ty:-198.5,tz:-632,fov:52}},
};
try{
  await E.open();proof.loadSec=E.loadSec;
  await E.ev('R.release();window.D=T.trainingDbg;D.panel().close();D.clear();T.AudioSys.setMuted(true);T.setHp(10000);D.openPanel();D.panel().element.hidden=true;return true;');
  proof.views={};
  for(const [name,{player,cam}]of Object.entries(views)){
    proof.views[name]=await E.ev(`T.player.position.set(${player[0]},D.tg().floorY,${player[1]});T.camera.position.set(${cam.x},${cam.y},${cam.z});T.camera.lookAt(${cam.tx},${cam.ty},${cam.tz});T.camera.fov=${cam.fov};T.camera.updateProjectionMatrix();D.tg().cutaway.update(T.camera.position,T.player.position,1);return {cutaway:D.tg().cutaway.state(),solids:D.tg().solids.length,draws:T.renderer.info.render.calls};`);
    await E.shoot({target:'player',cam,out:`${dir}/${before?'before':'after'}-${name}.png`});
    const east=proof.views[name].cutaway.find(e=>e.side==='east');
    if(name==='reverse'){if(before)assert.equal(east.hidden,false);else assert.equal(east.hidden,true);}
    if(name==='original')assert.equal(east.hidden,true);
    if(name.endsWith('Clear'))assert.equal(east.hidden,false);
  }
  if(!before){
    proof.trace=await E.ev(`const {traceTraining}=await import('/world/training-ballistics.js');const tg=D.tg(),out=[];for(const [ax,bx]of [[-30,0],[10,-15]]){const a={x:ax,y:-184,z:-642},p={x:bx,y:-200,z:-632},b={x:bx,y:-198.5,z:-632};tg.cutaway.update(a,p,1);out.push({bullet:!!traceTraining(tg,a,b)?.solid.wall,aim:!!traceTraining(tg,a,b,{throughGlass:true})?.solid.wall});}return out;`);
    assert.ok(proof.trace.every(x=>x.bullet&&!x.aim));
    proof.orbits=await E.ev(`R.release();D.panel().close();const result=[];for(const x of [-11,-5]){T.player.position.set(x,D.tg().floorY,-632);const views=[];for(let i=0;i<8;i++){T.rotateCamera(Math.PI/4);await wait(350);views.push({camera:T.camera.position.toArray(),shell:D.tg().cutaway.state()});}result.push({x,views});}return result;`,15000);
    assert.ok(proof.orbits.every(o=>o.views.some(v=>v.shell.find(e=>e.side==='east').hidden)));
    proof.restore=await E.ev('T.player.position.set(0,D.tg().floorY,-648);T.setShotView({x:0,y:-184,z:-665,tx:0,ty:-198.5,tz:-648,fov:52});await wait(500);return D.tg().cutaway.state();');
    assert.ok(proof.restore.every(e=>!e.hidden&&e.opacity===1));
    proof.lights=await E.ev('D.tg().setLights(false);D.tg().setLights(true);return D.tg().lightsOn();');assert.equal(proof.lights,true);
  }
  proof.errors=E.page.errors;assert.equal(proof.errors.length,0);
  console.log(before?'REPRO: reverse divider stays opaque; original direction cuts away. Before shots saved.':'PASS: divider fades from both sides; clear views restore; real orbits work from both rooms; bullets still hit walls, camera aim sees through; zero browser errors.');
}finally{fs.writeFileSync(`${dir}/${before?'before':'live'}-proof.json`,JSON.stringify(proof,null,2));await E.close();}
process.exit(0);
