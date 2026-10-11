import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Engine} from '../../tools/camera.mjs';
const before=process.argv.includes('--before'),dir='review/training-cutaway-GP19851',E=new Engine({training:true,warm:'none',size:'1200x850'}),proof={};
if(before)E.load=async function(){const goto=this.page.goto.bind(this.page);this.page.goto=(url,...args)=>goto(url.replace('/index.html?',`/${dir}/before.html?`),...args);try{await Engine.prototype.load.call(this);}finally{this.page.goto=goto;}};
try{
  await E.open();proof.loadSec=E.loadSec;
  await E.ev('R.release();window.D=T.trainingDbg;D.panel().close();D.clear();T.AudioSys.setMuted(true);T.setHp(10000);T.player.position.set(0,D.tg().floorY,-632);for(let i=0;i<48;i++){const a=i*2.399,r=4+Math.floor(i/12)*2,z=T.spawnZombie(-26+Math.sin(a)*r,-632+Math.cos(a)*r,"feral",true,true);z.trainingZ=true;z.mesh.position.y=D.tg().floorY;z.hp=100000;}return true;');
  proof.samples=await E.ev(`const out=[];for(const [name,cam]of [['reverse',{x:-30,y:-184,z:-642,tx:0,ty:-198.5,tz:-632,fov:52}],['build',{x:3,y:-184,z:-642,tx:-26,ty:-198.5,tz:-632,fov:52}]]){T.player.position.x=name==='reverse'?0:-26;T.setShotView(cam);await wait(4000);const ts=[];await new Promise(done=>{const frame=t=>{ts.push(t);if(ts.length===241)done();else requestAnimationFrame(frame);};requestAnimationFrame(frame);});const spans=ts.slice(1).map((t,i)=>t-ts[i]).sort((a,b)=>a-b);out.push({name,fps:240000/(ts.at(-1)-ts[0]),p95Ms:spans[Math.floor(spans.length*.95)],alive:T.zombies.filter(z=>z.alive).length,shell:D.tg().cutaway.state()});}return out;`,30000);
  assert.ok(proof.samples.every(s=>s.alive===48));proof.errors=E.page.errors;assert.equal(proof.errors.length,0);
  console.log(JSON.stringify({before,loadSec:proof.loadSec,samples:proof.samples.map(({name,fps,p95Ms,alive})=>({name,fps,p95Ms,alive})),errors:proof.errors}));
}finally{fs.writeFileSync(`${dir}/${before?'before':'after'}-performance.json`,JSON.stringify(proof,null,2));await E.close();}
process.exit(0);
