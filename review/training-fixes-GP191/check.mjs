import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Engine} from '../../tools/camera.mjs';
const dir='review/training-fixes-GP191';
const live=process.argv.includes('--live');
const clock=fs.readFileSync('tools/posesheet.mjs','utf8').match(/const PAGE = String\.raw`([\s\S]*?)`;/)[1].replace('pin(); if (!window.__idleOk)', 'if (!window.__idleOk)');
const proof={at:new Date().toISOString(),cases:{}};
const tags=live||process.argv.includes('--after')?['after']:['before','after'];
let E;
try {
 for(const tag of tags){
  E=new Engine({training:true,warm:'none',size:'1200x850'});
  const load=E.load.bind(E);
  E.load=async()=>{const go=E.page.goto.bind(E.page);E.page.goto=(url,o)=>go(live?url:url.replace('/index.html?',`/${dir}/${tag}.html?`),o);try{return await load();}finally{E.page.goto=go;}};
  await E.open();
  const capture=E.page.screenshot.bind(E.page);
  E.page.screenshot=async file=>{await E.ev('__step(1);return true;');return capture(file);};
  await E.ev('R.release();T.AudioSys.setMuted(true);T.trainingDbg.panel().close();T.trainingDbg.clear();T.setHp(10000);return true;');
  await E.page.evaluate(clock);
  await E.ev('window.D=T.trainingDbg;window.tg=D.tg();window.O=tg.origin;T.player.position.set(-27,tg.floorY,-640);__step(15);return true;');
  const entry=proof.cases[tag]={renderer:E.renderer,loadSeconds:E.loadSec};
  const shot=async(name,cam)=>E.shoot({target:'player',cam,size:'1200x850',out:`${dir}/${live?'live':tag}-${name}.png`});
  entry.stations=await E.ev(`
    const b=new T.THREE.Box3().setFromObject(D.state().copies.skullWindow.copy);
    const columns=tg.solids.filter(s=>s.column&&s.minX<O.x-40);
    const overlap=columns.filter(c=>b.min.x<c.maxX&&b.max.x>c.minX&&b.min.z<c.maxZ&&b.max.z>c.minZ);
    const f=tg.stations.skullWindow.front;T.player.position.set(f.x,tg.floorY,f.z);__step(2);
    return {bounds:{min:b.min.toArray(),max:b.max.toArray()},columnOverlaps:overlap.length,action:D.action(),front:f};`);
  await shot('skull',{x:-35,y:-191,z:-644,tx:-44,ty:-198.6,tz:-640.7,fov:38});
  entry.build=await E.ev(`
    T.player.position.set(-22,tg.floorY,-644);
    const area=tg.build,gx=area.maxGX,gz=T.gridIndex(O.z+3),x=T.gridCentre(gx),z=T.gridCentre(gz);
    const reason=T.trainingBuildDbg.refusal(x,z,gx,gz,'sandbag');
    const built=T.placeBuildAt('sandbag',gx,gz,0);
    const b=built?new T.THREE.Box3().setFromObject(built.mesh):null;
    window.wallBuild=built;
    return {x,z,gx,gz,reason,built:!!built,wallGap:b?O.x+D.TRAINING.BUILD.maxX-b.max.x:null,
      inverse:T.gridIndex(T.gridCentre(gx))===gx};`);
  await shot('wall',{x:-15,y:-190,z:-646,tx:-8,ty:-199.1,tz:-637,fov:40});
  await E.ev('if(wallBuild)T.removeBuild(wallBuild,true);T.player.position.set(-26,tg.floorY,-643);__step(2);return true;');
  await shot('gate-closed',{x:-26,y:-188,z:-630,tx:-26,ty:-196.2,tz:-612,fov:43});
  entry.release=await E.ev(`
    D.spawn('shambler',2);
    const samples=[];
    for(let i=0;i<60;i++){__step(6);const st=D.state();samples.push({time:(i+1)/10,pending:st.deployment.read(),gate:st.release?.read()||null,
      lamp:tg.releaseGate?.lamp.emissiveIntensity,beacon:st.copies.alarmBeacon?.emissiveIntensity,
      alive:D.alive(),entries:T.zombies.filter(z=>z.alive&&z.trainingZ).map(z=>({z:z.mesh.position.z,entry:!!z.trainingEntry}))});}
    return samples;`);
  await shot('gate-release',{x:-26,y:-188,z:-630,tx:-26,ty:-196.2,tz:-612,fov:43});
  if(tag==='after'){
    entry.finish=await E.ev(`__step(300);return {gate:D.state().release.read(),entries:T.zombies.filter(z=>z.alive&&z.trainingEntry).length,alive:D.alive()};`);
    entry.cancel=await E.ev(`D.clear();D.spawn('feral',3);__step(260);D.clear();__step(360);return {alive:D.alive(),gate:D.state().release.read()};`);
    entry.light=await E.ev(`D.spawn('shambler',1);__step(1);return {gate:tg.releaseGate.lamp.emissiveIntensity,panel:D.state().copies.alarmBeacon.emissiveIntensity,original:T.house.panelBeacon.emissiveIntensity};`);
    await shot('alarm-on',{x:-35,y:-191,z:-639,tx:-44,ty:-198.1,tz:-637,fov:35});
    await E.ev('D.clear();return true;');
    entry.edgeCases=await E.ev(`
      const area=tg.build,col=area.refusal(area.maxGX,T.gridIndex(O.z+1));
      const gateZone=area.refusal(T.gridIndex(tg.gate.x),T.gridIndex(O.z+20));
      const laid=D.layout();for(const b of [...D.layoutPieces()])T.removeBuild(b,true);
      D.spawn('shambler',1);D.openPanel();const paused=D.state().deployment.read().remaining;D.update(2);
      const held=D.state().deployment.read().remaining===paused;D.panel().close();D.clear();
      D.spawn('shambler',1);__step(270);D.blackout();__step(420);
      const blackout={alive:D.alive(),amount:D.state().release.read().amount};
      D.clear();T.player.position.set(tg.stations.skullWindow.front.x,tg.floorY,tg.stations.skullWindow.front.z);
      __step(2);const action=T.actionTarget();const bank=T.getBank();T.getSkullBag().count=1;T.getSkullBag().value=5;T.doAction();__step(420);
      const deposit={bag:T.getSkullBag().count,paid:T.getBank()-bank};
      D.spawn('colossus',1);__step(301);const big=T.zombies.find(z=>z.alive&&z.trainingZ);
      const bounds=big?new T.THREE.Box3().setFromObject(big.mesh):null;
      const bigHeight=bounds?bounds.max.y-tg.floorY:null;__step(420);
      const bigEntered=!!big&&!big.trainingEntry&&big.mesh.position.z<tg.releaseGate.passage.wallZ;
      D.clear();D.spawn('shambler',1);__step(265);D.leave();D.update(10);
      const left={pending:D.state().deployment.read(),amount:D.state().release.read().amount,grid:T.gridCentre(3)};
      return {col,gateZone,laid,held,blackout,action,deposit,bigHeight,bigEntered,left};`);
  }
  entry.errors=E.page.errors;
  fs.writeFileSync(`${dir}/${live?'live-proof':tags.length===1?'proof-after':'proof'}.json`,JSON.stringify(proof,null,2)+'\n');
  await E.close(); E=null;
  console.log(tag+': '+JSON.stringify({stations:entry.stations,build:entry.build,finish:entry.finish,cancel:entry.cancel,errors:entry.errors}));
 }
 const a=proof.cases.after;
 assert.equal(a.stations.columnOverlaps,0,'skull window clear of columns');
 assert.equal(a.stations.action,'hqWindow');assert(a.build.built);assert.equal(a.build.reason,null);
 assert(a.build.wallGap>=-.03&&a.build.wallGap<.12,'wall gap under 12cm');
 assert(a.release.some(s=>s.lamp>3)&&a.release.some(s=>s.lamp<.1),'gate flashes');
 assert(a.release.some(s=>s.beacon>3)&&a.release.some(s=>s.beacon<.1),'cabinet flashes');
 const first=a.release.find(s=>s.alive);assert(first.gate.amount>.99,'door open before spawning');
 assert(first.entries.every(z=>z.z>-612&&z.entry),'spawn behind gate');
 assert.equal(a.finish.entries,0);assert.equal(a.finish.gate.amount,0);
 assert.equal(a.cancel.alive,0);assert.equal(a.cancel.gate.amount,0);
 if(a.edgeCases){const e=a.edgeCases;assert.equal(e.col,'column');assert.equal(e.gateZone,'gate');assert.equal(e.laid,10);assert(e.held);
  assert.equal(e.blackout.alive,0);assert.equal(e.blackout.amount,0);assert.equal(e.action,'hqWindow');assert.equal(e.deposit.bag,0);assert.equal(e.deposit.paid,5);
  assert(e.bigEntered);assert(e.bigHeight<6.3);assert.equal(e.left.pending,null);assert.equal(e.left.amount,0);assert.equal(e.left.grid,6);}
 assert.equal(a.errors.length,0);
 console.log('PASS all staged Training integration checks');
} finally {if(E)await E.close();}
