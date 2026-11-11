import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Use crew game-test slot');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url))),out=path.join(root,'review/GP-20086');
const server=await serve(root,0),browser=await launch({headless:false,args:['--window-size=1280,720']});
const stage=process.argv[2]||'after';
const proof={};
try {
  const page=await browser.newPage({width:1280,height:720});
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`);
  const ready=await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"',{timeout:90000});
  if(!ready) console.log('BOOT DIAG',JSON.stringify({errors:page.errors,state:await page.evaluate('({load:window.DWLoad?.snapshot(),tt:!!window.TT,body:document.body?.textContent?.slice(0,200)})')}));
  assert(ready);
  await page.evaluate('document.getElementById("perf").style.display="none"; DWOpening.dismissForTesting()');
  assert(await page.waitFor('document.getElementById("opening").hidden',{timeout:15000}));
  await page.evaluate(`(()=>{document.getElementById('playerName').value='GP-20086 Probe';document.getElementById('modeTraining').click()})()`);
  assert(await page.waitFor('TT.trainingDbg.state().active && TT.getPhase()==="prep"',{timeout:90000}));
  assert(await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:30000}));
  await page.evaluate("window.__gp86Box=mesh=>TT.trainingDbg.state().zombieCollision.bounds(mesh)");
  proof.layout=await page.evaluate(`(()=>{const T=TT,tg=T.trainingDbg.tg(),r=tg.zombieRoom;const solids=tg.solids.filter(s=>s.maxY>tg.floorY+.35&&s.minY<tg.floorY+2.5&&s.maxX>r.minX&&s.minX<r.maxX&&s.maxZ>r.minZ&&s.minZ<r.maxZ);return {room:r,rect:tg.zombieRect,floor:tg.floorY,origin:tg.origin,types:Object.keys(T.ZOMBIE_TYPES).filter(k=>k!=='caveguard'),solids:solids.map((s,i)=>({i,minX:s.minX,maxX:s.maxX,minY:s.minY,maxY:s.maxY,minZ:s.minZ,maxZ:s.maxZ,flags:Object.keys(s).filter(k=>s[k]===true)}))}})()`);
  proof.corners=[];
  for(const kind of proof.layout.types){
    const row=await page.evaluate(`(()=>{const T=TT,tg=T.trainingDbg.tg(),r=tg.zombieRoom;T.clearZombies();const z=T.spawnZombie(r.minX+.12,r.minZ+.12,'${kind}',true,true);z.trainingZ=true;z.riseT=0;z.speed=z.baseSpeed=0;z.mesh.position.set(r.minX+.12,tg.floorY,r.minZ+.12);T.stepFrame(.016);const b=__gp86Box(z.mesh);return {kind:'${kind}',radius:z.radius,pos:{x:z.mesh.position.x,y:z.mesh.position.y,z:z.mesh.position.z},box:{minX:b.min.x,maxX:b.max.x,minY:b.min.y,maxY:b.max.y,minZ:b.min.z,maxZ:b.max.z}}})()`);
    proof.corners.push(row);
  }
  proof.station=[];
  for(const kind of proof.layout.types){
    const row=await page.evaluate(`(()=>{const T=TT,tg=T.trainingDbg.tg(),s=T.trainingDbg.state().stationCollision.boxes.find(b=>b.name==='hqPanel');T.clearZombies();const x=(s.minX+s.maxX)/2,zz=(s.minZ+s.maxZ)/2,z=T.spawnZombie(x,zz,'${kind}',true,true);z.trainingZ=true;z.riseT=0;z.speed=z.baseSpeed=0;z.mesh.position.set(x,tg.floorY,zz);T.stepFrame(.016);const b=__gp86Box(z.mesh);return {kind:'${kind}',station:s,pos:{x:z.mesh.position.x,z:z.mesh.position.z},box:{minX:b.min.x,maxX:b.max.x,minY:b.min.y,maxY:b.max.y,minZ:b.min.z,maxZ:b.max.z},overlap:b.max.x>s.minX+.02&&b.min.x<s.maxX-.02&&b.max.z>s.minZ+.02&&b.min.z<s.maxZ-.02&&b.max.y>s.minY+.02&&b.min.y<s.maxY-.02}})()`);
    proof.station.push(row);
  }
  proof.motion=[];
  for(const kind of proof.layout.types){
    const row=await page.evaluate(`(()=>{const T=TT,tg=T.trainingDbg.tg(),r=tg.zombieRoom;T.clearZombies();const z=T.spawnZombie(r.minX+2,-630,'${kind}',true,true);z.trainingZ=true;z.riseT=0;z.speed=z.baseSpeed=0;z.mesh.position.set(r.minX+2,tg.floorY,-630);let minX=Infinity,minY=Infinity;for(let i=0;i<35;i++){z.mesh.position.x-=.14;T.stepFrame(.016);const b=__gp86Box(z.mesh);minX=Math.min(minX,b.min.x);minY=Math.min(minY,b.min.y)}return {kind:'${kind}',minX,minY,finalX:z.mesh.position.x}})()`);
    proof.motion.push(row);
  }
  proof.fence=[];
  for(const kind of proof.layout.types){
    const row=await page.evaluate(`(()=>{const T=TT,tg=T.trainingDbg.tg(),s=tg.solids.find(s=>s.perimeterFence&&s.minZ< -630&&s.maxZ> -630&&s.minX< -42&&s.maxX> -42);T.clearZombies();const z=T.spawnZombie(s.maxX+2,-630,'${kind}',true,true);z.trainingZ=true;z.riseT=0;z.speed=z.baseSpeed=0;z.mesh.position.set(s.maxX+2,tg.floorY,-630);let minX=Infinity;for(let i=0;i<30;i++){z.mesh.position.x-=.12;T.stepFrame(.016);const b=__gp86Box(z.mesh);minX=Math.min(minX,b.min.x)}return {kind:'${kind}',fence:s,maxX:s.maxX,minX}})()`);
    proof.fence.push(row);
  }
  proof.hitAttack=[];
  for(const kind of proof.layout.types){
    const row=await page.evaluate(`(()=>{const T=TT,tg=T.trainingDbg.tg(),s=tg.solids.find(s=>s.perimeterFence&&s.minZ< -630&&s.maxZ> -630&&s.minX< -42&&s.maxX> -42),f=tg.floorY;T.clearZombies();T.player.position.set(-10,f,-614);T.setHp(1e6);const z=T.spawnZombie(s.maxX+2,-630,'${kind}',true,true);z.trainingZ=true;z.riseT=0;z.speed=z.baseSpeed=0;z.hp=z.maxHp=10000;z.mesh.position.set(s.maxX+2,f,-630);for(let i=0;i<25;i++){z.mesh.position.x-=.12;T.stepFrame(.016)}T.damageZombie(z,1,{kind:'bullet',dir:{x:-1,z:0},hitY:f+1});if(!z.mesh)return {kind:'${kind}',fenceX:s.maxX,minX:Infinity,attacks:0,frames:0,alive:z.alive};T.player.position.set(z.mesh.position.x+.8,f,-630);z.attackCd=0;z.attackWindup=.45;z.swingT=.28;let minX=Infinity,attacks=0,frames=0;for(let i=0;i<80;i++){T.stepFrame(.016);if(!z.alive||!z.mesh)break;const b=__gp86Box(z.mesh);minX=Math.min(minX,b.min.x);attacks+=(z.attackWindup>0||z.swingT>0)?1:0;frames++}return {kind:'${kind}',fenceX:s.maxX,minX,attacks,frames,alive:z.alive}})()`);
    proof.hitAttack.push(row);
  }
  proof.corpses=[];
  for(const kind of proof.layout.types){
    const row=await page.evaluate(`(()=>{const T=TT,tg=T.trainingDbg.tg(),r=tg.zombieRoom;T.clearZombies();const z=T.spawnZombie(r.minX+3,-630,'${kind}',true,true);z.trainingZ=true;z.riseT=0;z.speed=z.baseSpeed=0;z.mesh.position.set(r.minX+3,tg.floorY,-630);T.stepFrame(.016);T.killZombie(z,false,{kind:'bullet',dir:{x:-1,z:0},raw:120});let c=T.getCorpses().at(-1),minX=Infinity,minY=Infinity,maxY=-Infinity;if(!c)return {kind:'${kind}',corpse:false};for(let i=0;i<75;i++){T.stepFrame(.016);const b=__gp86Box(c.mesh);minX=Math.min(minX,b.min.x);minY=Math.min(minY,b.min.y);maxY=Math.max(maxY,b.max.y)}return {kind:'${kind}',corpse:!!c,minX,minY,maxY,floor:tg.floorY,pos:{x:c.mesh.position.x,y:c.mesh.position.y,z:c.mesh.position.z}}})()`);
    proof.corpses.push(row);
  }
  if(stage!=='before') for(const row of proof.corners){
    assert(row.box.minX>=proof.layout.room.minX-.03,`${row.kind} body through west wall`);
    assert(row.box.minZ>=proof.layout.room.minZ-.03,`${row.kind} body through south wall`);
  }
  if(stage!=='before') for(const row of proof.station) assert(!row.overlap,`${row.kind} through HQ station`);
  if(stage!=='before') for(const row of proof.motion) assert(row.minX>=proof.layout.room.minX-.03,`${row.kind} walking through west wall`);
  if(stage!=='before') for(const row of proof.fence) assert(row.minX>=row.maxX-.03,`${row.kind} walking through perimeter fence`);
  if(stage!=='before') for(const row of proof.hitAttack) assert(row.minX>=row.fenceX-.03,`${row.kind} hit/attack through perimeter fence`);
  if(stage!=='before') for(const row of proof.corpses) if(row.corpse){
    assert(row.minX>=proof.layout.room.minX-.03,`${row.kind} corpse through west wall`);
    assert(row.minY>=row.floor-.03,`${row.kind} corpse through floor`);
  }
  if(stage==='shots'){
    await page.evaluate(`(()=>{const T=TT,tg=T.trainingDbg.tg(),s=tg.solids.find(s=>s.perimeterFence&&s.minZ< -630&&s.maxZ> -630&&s.minX< -42&&s.maxX> -42),f=tg.floorY;T.clearZombies();T.setShotView({x:-35,y:f+4,z:-624,tx:-41,ty:f+1.2,tz:-630,fov:38});const C=tg=>{const z=T.spawnZombie(s.maxX+2,-630,'colossus',true,true);z.trainingZ=true;z.riseT=0;z.speed=z.baseSpeed=0;z.mesh.position.set(s.maxX+2,f,-630);for(let i=0;i<30;i++){z.mesh.position.x-=.12;T.stepFrame(.016)}return z};window.__gp86={collision:T.trainingDbg.state().zombieCollision,spawn:C};__gp86.saved=__gp86.collision.keep;__gp86.collision.keep=()=>{};__gp86.z=C()})()`);
    await page.screenshot(path.join(out,'before-fence-colossus.png'));
    await page.evaluate(`(()=>{const T=TT;__gp86.collision.keep=__gp86.saved;T.clearZombies();__gp86.z=__gp86.spawn()})()`);
    await page.screenshot(path.join(out,'after-fence-colossus.png'));
    await page.evaluate(`(()=>{const T=TT,tg=T.trainingDbg.tg(),f=tg.floorY;T.clearZombies();T.setShotView({x:-27,y:f+2.2,z:-625,tx:-31,ty:f+.45,tz:-630,fov:36});const c=__gp86.collision;c.savedCorpse=c.keepCorpse;c.keepCorpse=()=>{};const z=T.spawnZombie(-31,-630,'shambler',true,true);z.trainingZ=true;z.riseT=0;z.speed=z.baseSpeed=0;z.mesh.position.set(-31,f,-630);T.stepFrame(.016);T.killZombie(z,false,{kind:'bullet',dir:{x:-1,z:0},raw:120});for(let i=0;i<75;i++)T.stepFrame(.016);__gp86.corpse=T.getCorpses().at(-1)})()`);
    await page.screenshot(path.join(out,'before-corpse-floor.png'));
    await page.evaluate(`(()=>{const T=TT,c=__gp86.collision;c.keepCorpse=c.savedCorpse;__gp86.corpse.trainingFitted=false;T.stepFrame(.016)})()`);
    await page.screenshot(path.join(out,'after-corpse-floor.png'));
  }
  console.log(`GP-20086 baseline ${proof.layout.types.length} kinds, ${proof.layout.solids.length} room solids; corners captured`);
  assert.deepEqual(page.errors,[]);
}finally{fs.writeFileSync(path.join(out,`probe-${stage}.json`),JSON.stringify(proof,null,2));await browser.close();await server.close();}
