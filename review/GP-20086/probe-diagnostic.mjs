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
  proof.fence=[];
  for(const kind of proof.layout.types){
    const row=await page.evaluate(`(()=>{const T=TT,tg=T.trainingDbg.tg(),s=tg.solids.find(s=>s.perimeterFence&&s.minZ< -630&&s.maxZ> -630&&s.minX< -42&&s.maxX> -42);T.clearZombies();const z=T.spawnZombie(s.maxX+2,-630,'${kind}',true,true);z.trainingZ=true;z.riseT=0;z.speed=z.baseSpeed=0;z.mesh.position.set(s.maxX+2,tg.floorY,-630);let minX=Infinity;for(let i=0;i<30;i++){z.mesh.position.x-=.12;T.stepFrame(.016);const b=new T.THREE.Box3().setFromObject(z.mesh);minX=Math.min(minX,b.min.x)}return {kind:'${kind}',fence:s,maxX:s.maxX,minX}})()`);
    proof.fence.push(row);
  }
  proof.corpses=[];
  for(const kind of proof.layout.types){
    const row=await page.evaluate(`(()=>{const T=TT,tg=T.trainingDbg.tg(),r=tg.zombieRoom;T.clearZombies();const z=T.spawnZombie(r.minX+3,-630,'${kind}',true,true);z.trainingZ=true;z.riseT=0;z.speed=z.baseSpeed=0;z.mesh.position.set(r.minX+3,tg.floorY,-630);T.stepFrame(.016);T.killZombie(z,false,{kind:'bullet',dir:{x:-1,z:0},raw:120});let c=T.getCorpses().at(-1),minX=Infinity,minY=Infinity,maxY=-Infinity;if(!c)return {kind:'${kind}',corpse:false};for(let i=0;i<75;i++){T.stepFrame(.016);const b=new T.THREE.Box3().setFromObject(c.mesh);minX=Math.min(minX,b.min.x);minY=Math.min(minY,b.min.y);maxY=Math.max(maxY,b.max.y)}return {kind:'${kind}',corpse:!!c,minX,minY,maxY,floor:tg.floorY,pos:{x:c.mesh.position.x,y:c.mesh.position.y,z:c.mesh.position.z}}})()`);
    proof.corpses.push(row);
  }
  proof.stationCorpses=[];
  for(const kind of proof.layout.types){
    const row=await page.evaluate(`(()=>{const T=TT,tg=T.trainingDbg.tg(),s=T.trainingDbg.state().stationCollision.boxes.find(b=>b.name==='hqPanel');T.clearZombies();const x=s.maxX+3,zz=(s.minZ+s.maxZ)/2,z=T.spawnZombie(x,zz,'${kind}',true,true);z.trainingZ=true;z.riseT=0;z.speed=z.baseSpeed=0;z.mesh.position.set(x,tg.floorY,zz);T.stepFrame(.016);T.killZombie(z,false,{kind:'bullet',dir:{x:-1,z:0},raw:120});const c=T.getCorpses().at(-1);if(!c)return {kind:'${kind}',corpse:false};let overlap=false,minFloor=Infinity;for(let i=0;i<75;i++){T.stepFrame(.016);const b=new T.THREE.Box3().setFromObject(c.mesh);minFloor=Math.min(minFloor,b.min.y-tg.floorY);overlap ||=b.max.x>s.minX+.02&&b.min.x<s.maxX-.02&&b.max.z>s.minZ+.02&&b.min.z<s.maxZ-.02&&b.max.y>s.minY+.02&&b.min.y<s.maxY-.02}return {kind:'${kind}',corpse:true,overlap,minFloor,pos:{x:c.mesh.position.x,z:c.mesh.position.z}}})()`);
    proof.stationCorpses.push(row);
  }
  if(stage.startsWith('after')) for(const row of proof.corners){
    assert(row.box.minX>=proof.layout.room.minX-.03,`${row.kind} body through west wall`);
    assert(row.box.minZ>=proof.layout.room.minZ-.03,`${row.kind} body through south wall`);
  }
  if(stage.startsWith('after')) for(const row of proof.station) assert(!row.overlap,`${row.kind} through HQ station`);
  if(stage.startsWith('after')) for(const row of proof.motion) assert(row.minX>=proof.layout.room.minX-.03,`${row.kind} walking through west wall`);
  if(stage.startsWith('after')) for(const row of proof.fence) assert(row.minX>=row.maxX-.03,`${row.kind} walking through perimeter fence`);
  if(stage.startsWith('after')) for(const row of proof.corpses) if(row.corpse){
    assert(row.minX>=proof.layout.room.minX-.03,`${row.kind} corpse through west wall`);
    assert(row.minY>=row.floor-.03,`${row.kind} corpse through floor`);
  }
  if(stage.startsWith('shots')){
    await page.evaluate(`(()=>{const T=TT,tg=T.trainingDbg.tg(),s=tg.solids.find(s=>s.perimeterFence&&s.minZ< -630&&s.maxZ> -630&&s.minX< -42&&s.maxX> -42),f=tg.floorY;T.clearZombies();T.setShotView({x:-35,y:f+4,z:-624,tx:-41,ty:f+1.2,tz:-630,fov:38});const C=tg=>{const z=T.spawnZombie(s.maxX+2,-630,'colossus',true,true);z.trainingZ=true;z.riseT=0;z.speed=z.baseSpeed=0;z.mesh.position.set(s.maxX+2,f,-630);for(let i=0;i<30;i++){z.mesh.position.x-=.12;T.stepFrame(.016)}return z};window.__gp86={collision:T.trainingDbg.state().zombieCollision,spawn:C};__gp86.saved=__gp86.collision.keep;__gp86.collision.keep=()=>{};__gp86.z=C()})()`);
    await page.screenshot(path.join(out,`${stage}-before-fence-colossus.png`));
    await page.evaluate(`(()=>{const T=TT;__gp86.collision.keep=__gp86.saved;T.clearZombies();__gp86.z=__gp86.spawn()})()`);
    await page.screenshot(path.join(out,`${stage}-after-fence-colossus.png`));
    await page.evaluate(`(()=>{const T=TT,tg=T.trainingDbg.tg(),f=tg.floorY;T.clearZombies();T.setShotView({x:-27,y:f+2.2,z:-625,tx:-31,ty:f+.45,tz:-630,fov:36});const c=__gp86.collision;c.savedCorpse=c.keepCorpse;c.keepCorpse=()=>{};const z=T.spawnZombie(-31,-630,'shambler',true,true);z.trainingZ=true;z.riseT=0;z.speed=z.baseSpeed=0;z.mesh.position.set(-31,f,-630);T.stepFrame(.016);T.killZombie(z,false,{kind:'bullet',dir:{x:-1,z:0},raw:120,fire:${stage.includes('fetal')}});for(let i=0;i<75;i++)T.stepFrame(.016);__gp86.corpse=T.getCorpses().at(-1)})()`);
    await page.screenshot(path.join(out,`${stage}-before-corpse-floor.png`));
    proof.skinBounds=await page.evaluate(`(()=>{const T=TT,c=__gp86.corpse,skin=c.mesh.getObjectByName('zombie-skin'),old=skin.boundingBox?.clone();c.mesh.updateMatrixWorld(true);skin.computeBoundingBox();const b=new T.THREE.Box3().setFromObject(c.mesh);return {old:old?.min.y,new:skin.boundingBox.min.y,root:c.mesh.position.y,worldMin:b.min.y}})()`);
    proof.beforePieces=await page.evaluate(`(()=>{const T=TT,c=__gp86.corpse,b=new T.THREE.Box3(),v=[],ud=c.mesh.userData;const part=o=>{let q=o;while(q){for(const k of ['armLG','armRG','legLG','legRG','torso','hips','head'])if(q===ud[k])return k;q=q.parent}return 'root'};c.mesh.updateMatrixWorld(true);c.mesh.traverse(o=>{if(!o.isMesh||!o.geometry)return;let q=o,shown=true;while(q){if(!q.visible)shown=false;q=q.parent}if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();b.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);v.push({name:o.name||o.parent?.name||'',part:part(o),minY:b.min.y,shown})});return v.sort((a,b)=>a.minY-b.minY).slice(0,16)})()`);
    await page.evaluate(`(()=>{const T=TT,c=__gp86.collision;c.keepCorpse=c.savedCorpse;__gp86.corpse.trainingFitted=false;T.stepFrame(.016)})()`);
    await page.screenshot(path.join(out,`${stage}-after-corpse-floor.png`));
    proof.afterPieces=await page.evaluate(`(()=>{const T=TT,c=__gp86.corpse,b=new T.THREE.Box3(),v=[];c.mesh.updateMatrixWorld(true);c.mesh.traverse(o=>{if(!o.isMesh||!o.geometry)return;let q=o,shown=true;while(q){if(!q.visible)shown=false;q=q.parent}if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();b.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);v.push({name:o.name||o.parent?.name||'',minY:b.min.y,shown})});return v.sort((a,b)=>a.minY-b.minY).slice(0,16)})()`);
  }
  if(stage.startsWith('natural')){
    proof.natural=await page.evaluate(`(()=>{const T=TT,tg=T.trainingDbg.tg(),f=tg.floorY;T.clearZombies();T.setShotView({x:-27,y:f+2.2,z:-625,tx:-31,ty:f+.45,tz:-630,fov:36});const z=T.spawnZombie(-31,-630,'shambler',true,true);z.trainingZ=true;z.riseT=0;z.speed=z.baseSpeed=0;z.mesh.position.set(-31,f,-630);T.stepFrame(.016);T.killZombie(z,false,{kind:'bullet',dir:{x:-1,z:0},raw:120});for(let i=0;i<75;i++)T.stepFrame(.016);const c=T.getCorpses().at(-1),b=new T.THREE.Box3().setFromObject(c.mesh),parts=[];c.mesh.updateMatrixWorld(true);c.mesh.traverse(o=>{if(!o.isMesh||!o.visible)return;let q=o.parent;while(q&&q!==c.mesh){if(!q.visible)return;q=q.parent}if(o.isSkinnedMesh)o.computeBoundingBox();else if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();const bb=o.boundingBox||o.geometry.boundingBox;parts.push({name:o.name,min:new T.THREE.Box3().copy(bb).applyMatrix4(o.matrixWorld).min.y,local:bb.min.y})});const skin=c.mesh.getObjectByName('zombie-skin'),sw=skin.geometry.getAttribute('skinWeight');let minSum=Infinity,maxSum=-Infinity;for(let i=0;i<sw.count;i++){const s=sw.getX(i)+sw.getY(i)+sw.getZ(i)+sw.getW(i);minSum=Math.min(minSum,s);maxSum=Math.max(maxSum,s)}const proxy=T.trainingDbg.state().zombieCollision.bounds(c.mesh);return {lift:c.trainingLift,frozen:c.frozen,minY:b.min.y,rootY:c.mesh.position.y,parts,proxyMin:proxy.min.y,weightSum:[minSum,maxSum]}})()`);
    proof.vertex=await page.evaluate(`(()=>{const T=TT,skin=T.getCorpses().at(-1).mesh.getObjectByName('zombie-skin'),g=skin.geometry,p=g.getAttribute('position'),si=g.getAttribute('skinIndex'),sw=g.getAttribute('skinWeight'),v=new T.THREE.Vector3(),m=new T.THREE.Matrix4();skin.updateMatrixWorld(true);let idx=-1,min=Infinity;for(let i=0;i<p.count;i++){skin.getVertexPosition(i,v).applyMatrix4(skin.matrixWorld);if(v.y<min){min=v.y;idx=i}}const raw=v.fromBufferAttribute(p,idx).clone(),calc=new T.THREE.Vector3(),parts=[];for(let k=0;k<4;k++){const w=k===0?sw.getX(idx):k===1?sw.getY(idx):k===2?sw.getZ(idx):sw.getW(idx),b=k===0?si.getX(idx):k===1?si.getY(idx):k===2?si.getZ(idx):si.getW(idx);if(!w)continue;m.copy(skin.matrixWorld).multiply(skin.bindMatrixInverse).multiply(skin.skeleton.bones[b].matrixWorld).multiply(skin.skeleton.boneInverses[b]).multiply(skin.bindMatrix);const pt=raw.clone().applyMatrix4(m);calc.addScaledVector(pt,w);parts.push({b,w,y:pt.y})}return {idx,min,raw:raw.toArray(),calc:calc.y,parts,morph:Object.keys(g.morphAttributes),bindMode:skin.bindMode}})()`);
    proof.consistency=await page.evaluate(`(()=>{const T=TT,c=T.getCorpses().at(-1),skin=c.mesh.getObjectByName('zombie-skin'),proxy=T.trainingDbg.state().zombieCollision.bounds(c.mesh);skin.computeBoundingBox();const exact=new T.THREE.Box3().copy(skin.boundingBox).applyMatrix4(skin.matrixWorld);return {root:c.mesh.position.y,proxyMin:proxy.min.y,exactMin:exact.min.y,lift:c.trainingLift}})()`);
    proof.compare=await page.evaluate(`(()=>{const T=TT,c=T.getCorpses().at(-1),skin=c.mesh.getObjectByName('zombie-skin'),g=skin.geometry,p=g.getAttribute('position'),si=g.getAttribute('skinIndex'),sw=g.getAttribute('skinWeight'),proxy=T.trainingDbg.state().zombieCollision.bounds(c.mesh),v=new T.THREE.Vector3();let idx=-1,min=Infinity;for(let i=0;i<p.count;i++){skin.getVertexPosition(i,v).applyMatrix4(skin.matrixWorld);if(v.y<min){idx=i;min=v.y}}const b=si.getX(idx),box=new T.THREE.Box3().makeEmpty(),m=new T.THREE.Matrix4().copy(skin.matrixWorld).multiply(skin.bindMatrixInverse).multiply(skin.skeleton.bones[b].matrixWorld).multiply(skin.skeleton.boneInverses[b]).multiply(skin.bindMatrix);for(let i=0;i<p.count;i++)if(si.getX(i)===b)box.expandByPoint(v.fromBufferAttribute(p,i));const transformed=box.clone().applyMatrix4(m),manual=v.fromBufferAttribute(p,idx).applyMatrix4(m);return {proxyMin:proxy.min.y,exactMin:min,idx,b,weight:sw.getX(idx),manual:manual.y,boxMin:transformed.min.y,boxMax:transformed.max.y,rawBoxMin:box.min.y,rawBoxMax:box.max.y}})()`);
    await page.screenshot(path.join(out,`${stage}-after-corpse-floor.png`));
  }
  console.log(`GP-20086 baseline ${proof.layout.types.length} kinds, ${proof.layout.solids.length} room solids; corners captured`);
  assert.deepEqual(page.errors,[]);
}finally{fs.writeFileSync(path.join(out,`probe-${stage}.json`),JSON.stringify(proof,null,2));await browser.close();await server.close();}
