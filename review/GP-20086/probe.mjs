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
  proof.layout=await page.evaluate(`(()=>{const T=TT,tg=T.trainingDbg.tg(),r=tg.zombieRoom;const solids=tg.solids.filter(s=>s.maxY>tg.floorY+.35&&s.minY<tg.floorY+2.5&&s.maxX>r.minX&&s.minX<r.maxX&&s.maxZ>r.minZ&&s.minZ<r.maxZ);return {room:r,rect:tg.zombieRect,floor:tg.floorY,origin:tg.origin,types:Object.keys(T.ZOMBIE_TYPES).filter(k=>k!=='caveguard'),solids:solids.map((s,i)=>({i,minX:s.minX,maxX:s.maxX,minY:s.minY,maxY:s.maxY,minZ:s.minZ,maxZ:s.maxZ,flags:Object.keys(s).filter(k=>s[k]===true)}))}})()`);
  proof.corners=[];
  for(const kind of proof.layout.types){
    const row=await page.evaluate(`(()=>{const T=TT,tg=T.trainingDbg.tg(),r=tg.zombieRoom;T.clearZombies();const z=T.spawnZombie(r.minX+.12,r.minZ+.12,'${kind}',true,true);z.trainingZ=true;z.riseT=0;z.speed=z.baseSpeed=0;z.mesh.position.set(r.minX+.12,tg.floorY,r.minZ+.12);T.stepFrame(.016);const b=new T.THREE.Box3().setFromObject(z.mesh);return {kind:'${kind}',radius:z.radius,pos:{x:z.mesh.position.x,y:z.mesh.position.y,z:z.mesh.position.z},box:{minX:b.min.x,maxX:b.max.x,minY:b.min.y,maxY:b.max.y,minZ:b.min.z,maxZ:b.max.z}}})()`);
    proof.corners.push(row);
  }
  proof.station=[];
  for(const kind of proof.layout.types){
    const row=await page.evaluate(`(()=>{const T=TT,tg=T.trainingDbg.tg(),s=T.trainingDbg.state().stationCollision.boxes.find(b=>b.name==='hqPanel');T.clearZombies();const x=(s.minX+s.maxX)/2,zz=(s.minZ+s.maxZ)/2,z=T.spawnZombie(x,zz,'${kind}',true,true);z.trainingZ=true;z.riseT=0;z.speed=z.baseSpeed=0;z.mesh.position.set(x,tg.floorY,zz);T.stepFrame(.016);const b=new T.THREE.Box3().setFromObject(z.mesh);return {kind:'${kind}',station:s,pos:{x:z.mesh.position.x,z:z.mesh.position.z},box:{minX:b.min.x,maxX:b.max.x,minY:b.min.y,maxY:b.max.y,minZ:b.min.z,maxZ:b.max.z},overlap:b.max.x>s.minX+.02&&b.min.x<s.maxX-.02&&b.max.z>s.minZ+.02&&b.min.z<s.maxZ-.02&&b.max.y>s.minY+.02&&b.min.y<s.maxY-.02}})()`);
    proof.station.push(row);
  }
  proof.motion=[];
  for(const kind of proof.layout.types){
    const row=await page.evaluate(`(()=>{const T=TT,tg=T.trainingDbg.tg(),r=tg.zombieRoom;T.clearZombies();const z=T.spawnZombie(r.minX+2,-630,'${kind}',true,true);z.trainingZ=true;z.riseT=0;z.speed=z.baseSpeed=0;z.mesh.position.set(r.minX+2,tg.floorY,-630);let minX=Infinity,minY=Infinity;for(let i=0;i<35;i++){z.mesh.position.x-=.14;T.stepFrame(.016);const b=new T.THREE.Box3().setFromObject(z.mesh);minX=Math.min(minX,b.min.x);minY=Math.min(minY,b.min.y)}return {kind:'${kind}',minX,minY,finalX:z.mesh.position.x}})()`);
    proof.motion.push(row);
  }
  proof.corpses=[];
  for(const kind of proof.layout.types){
    const row=await page.evaluate(`(()=>{const T=TT,tg=T.trainingDbg.tg(),r=tg.zombieRoom;T.clearZombies();const z=T.spawnZombie(r.minX+3,-630,'${kind}',true,true);z.trainingZ=true;z.riseT=0;z.speed=z.baseSpeed=0;z.mesh.position.set(r.minX+3,tg.floorY,-630);T.stepFrame(.016);T.killZombie(z,false,{kind:'bullet',dir:{x:-1,z:0},raw:120});let c=T.getCorpses().at(-1),minX=Infinity,minY=Infinity,maxY=-Infinity;if(!c)return {kind:'${kind}',corpse:false};for(let i=0;i<75;i++){T.stepFrame(.016);const b=new T.THREE.Box3().setFromObject(c.mesh);minX=Math.min(minX,b.min.x);minY=Math.min(minY,b.min.y);maxY=Math.max(maxY,b.max.y)}return {kind:'${kind}',corpse:!!c,minX,minY,maxY,floor:tg.floorY,pos:{x:c.mesh.position.x,y:c.mesh.position.y,z:c.mesh.position.z}}})()`);
    proof.corpses.push(row);
  }
  if(stage==='after') for(const row of proof.corners){
    assert(row.box.minX>=proof.layout.room.minX-.03,`${row.kind} body through west wall`);
    assert(row.box.minZ>=proof.layout.room.minZ-.03,`${row.kind} body through south wall`);
  }
  if(stage==='after') for(const row of proof.station) assert(!row.overlap,`${row.kind} through HQ station`);
  if(stage==='after') for(const row of proof.motion) assert(row.minX>=proof.layout.room.minX-.03,`${row.kind} walking through west wall`);
  console.log(`GP-20086 baseline ${proof.layout.types.length} kinds, ${proof.layout.solids.length} room solids; corners captured`);
  assert.deepEqual(page.errors,[]);
}finally{fs.writeFileSync(path.join(out,`probe-${stage}.json`),JSON.stringify(proof,null,2));await browser.close();await server.close();}
