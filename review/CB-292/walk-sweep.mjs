// CB-292 exploratory J126 sweep. Run only with the crew game-test lease.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Run through the crew game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/CB-292'); fs.mkdirSync(out, {recursive:true});
const server = await serve(root, 0), browser = await launch({headless:false,args:['--window-size=1280,720']});
let report = {cases:[]};
try {
  const page = await browser.newPage({width:1280,height:720});
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`);
  assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"',{timeout:90000}));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('document.getElementById("opening").hidden',{timeout:15000}));
  await page.evaluate(`(()=>{document.getElementById('playerName').value='CB-292 sweep';document.getElementById('modeTraining').click()})()`);
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:90000}));
  report = await page.evaluate(`(()=>{
    const T=TT,tg=T.trainingDbg.tg(),tr=T.trainingDbg.state(),m=T.getMarine(),V=T.THREE.Vector3;
    T.trainingDbg.clear();T.setViewFirstDbg(false);T.setUnarmedDbg(true);T.flightHold(true);
    const y=tg.floorY, results=[],box=(name,b)=>({name,minX:b.minX,maxX:b.maxX,minY:b.minY,maxY:b.maxY,minZ:b.minZ,maxZ:b.maxZ});
    const armoryBox=tr.copies.armory?.copy?new T.THREE.Box3().setFromObject(tr.copies.armory.copy):null;
    const armory=armoryBox&&!armoryBox.isEmpty()?{minX:armoryBox.min.x,maxX:armoryBox.max.x,minY:armoryBox.min.y,maxY:armoryBox.max.y,minZ:armoryBox.min.z,maxZ:armoryBox.max.z}:null;
    const candidates=[
      ...tr.stationCollision.boxes.map(b=>box('station:'+b.name,b)),
      ...(armory?[box('station:armory',armory)]:[]),
      ...tg.solids.filter(b=>b.station==='rangeConsole').map(b=>box('station:rangeConsole',b)),
      ...tg.solids.filter(b=>b.wall&&b.minY<y+.1&&b.maxY>y+1).map((b,i)=>box('wall:'+i,b)),
      ...tg.solids.filter(b=>b.firingLine&&!b.firingFrame&&!b.firingFence).map((b,i)=>box('bench:'+i,b)),
      ...tg.solids.filter(b=>b.dummy).map((b,i)=>box('dummy:'+i,b)),
      ...tg.solids.filter(b=>b.block&&b.prop).map((b,i)=>box('block:'+i,b))
    ];
    const horiz=(b,p)=>Math.max(b.minX-p.x,0,p.x-b.maxX,b.minZ-p.z,0,p.z-b.maxZ);
    const inside=(p,b,eps=.005)=>p.x>b.minX+eps&&p.x<b.maxX-eps&&p.y>b.minY+eps&&p.y<b.maxY-eps&&p.z>b.minZ+eps&&p.z<b.maxZ-eps;
    const limbPoints=()=>{
      m.updateMatrixWorld(true);const u=m.userData,p=[];
      for(const side of ['L','R'])for(const kind of ['arm','leg']){
        const joints=kind==='arm'?[u['arm'+side+'G'],u['elbow'+side+'G'],u['elbow'+side+'G']?.getObjectByName('wrist')].filter(Boolean):['leg','knee','ankle'].map(k=>u[k+side+'G']).filter(Boolean);
        for(let j=0;j<joints.length-1;j++)for(let n=0;n<=16;n++)p.push({part:kind+side+':'+j,pos:joints[j].getWorldPosition(new V()).lerp(joints[j+1].getWorldPosition(new V()),n/16)});
      }
      return p;
    };
    const limbMeshes=()=>{
      const u=m.userData,out=[];
      for(const side of ['L','R'])for(const kind of ['arm','leg']){
        u[kind+side+'G']?.traverse(o=>{
          if(!o.isMesh||!o.geometry?.attributes?.position)return;
          for(let a=o;a&&a!==m;a=a.parent)if(!a.visible)return;
          out.push({part:kind+side,name:o.name||o.type,mesh:o});
        });
      }
      return out;
    };
    const meshHits=(b)=>{
      if(horiz(b,T.player.position)>1.2)return [];
      const found=[],v=new V();m.updateMatrixWorld(true);
      for(const {part,name,mesh} of limbMeshes()){
        const P=mesh.geometry.attributes.position;
        for(let i=0;i<P.count;i++){
          if(mesh.isSkinnedMesh)mesh.getVertexPosition(i,v);else v.fromBufferAttribute(P,i);
          v.applyMatrix4(mesh.matrixWorld);
          if(inside(v,b)) {found.push({part,name,point:v.toArray()});if(found.length>=8)return found;}
        }
      }
      return found;
    };
    // Samples walkable sides of the permanent objects. The player begins 0.8 m outside each face.
    const spots=[];
    for(const b of candidates){
      if(b.maxY<y+.65||b.minY>y+1.8)continue;
      const cx=(b.minX+b.maxX)/2,cz=(b.minZ+b.maxZ)/2;
      for(const [face,x,z,key] of [['west',b.minX-.8,cz,'KeyD'],['east',b.maxX+.8,cz,'KeyA'],['south',cx,b.minZ-.8,'KeyS'],['north',cx,b.maxZ+.8,'KeyW']]){
        if(x< -42.8||x>7.15||z< -651.4||z> -612.8)continue;
        if(spots.some(s=>Math.hypot(s.x-x,s.z-z)<.25&&s.box===b.name))continue;
        spots.push({name:b.name,face,x,z,key,box:b});
      }
    }
    // The actual walk-rect boundary is reachable by play. Probe every nearby closed wall
    // before and after the clearance change, including both south walls and the doorway sides.
    for(const b of candidates.filter(b=>b.name.startsWith('wall:'))){
      for(const [wi,w] of tg.walk.entries()){
        if(b.maxX-b.minX<.5){
          const lo=Math.max(b.minZ,w.minZ+.5),hi=Math.min(b.maxZ,w.maxZ-.5);
          const x=b.maxX<=w.minX?w.minX:b.minX>=w.maxX?w.maxX:null;
          if(x!=null&&hi>lo&&Math.min(Math.abs(x-b.minX),Math.abs(x-b.maxX))<.9)spots.push({name:b.name,face:'walkEdge'+wi,x,z:(lo+hi)/2,key:'KeyA',box:b});
        }else if(b.maxZ-b.minZ<.5){
          const lo=Math.max(b.minX,w.minX+.5),hi=Math.min(b.maxX,w.maxX-.5);
          const z=b.maxZ<=w.minZ?w.minZ:b.minZ>=w.maxZ?w.maxZ:null;
          if(z!=null&&hi>lo&&Math.min(Math.abs(z-b.minZ),Math.abs(z-b.maxZ))<.9)spots.push({name:b.name,face:'walkEdge'+wi,x:(lo+hi)/2,z,key:'KeyW',box:b});
        }
      }
    }
    for(const s of spots){
      for(const mode of ['walk','run','crouch','turn']){
        T.player.position.set(s.x,y,s.z);T.player.rotation.y=0;T.setVelDbg(0,0);T.setOtsAimDbg(0,0);T.flightInput({keys:[]});
        for(let i=0;i<3;i++)T.stepFrame(1/30);
        const start=T.player.position.clone();
        if(mode==='turn')T.setOtsAimDbg(Math.PI/2,0);
        const keys=mode==='turn'?[]:mode==='crouch'?['KeyC',s.key]:mode==='run'?[s.key,'ShiftLeft']:[s.key];
        T.flightInput({keys});for(let i=0;i<10;i++)T.stepFrame(1/30);T.flightInput({keys:[]});
        const pts=limbPoints(),hits=[];
        for(const p of pts)if(inside(p.pos,s.box))hits.push({part:p.part,point:p.pos.toArray()});
        const vertices=meshHits(s.box);
        results.push({name:s.name,face:s.face,mode,from:start.toArray(),to:T.player.position.toArray(),distance:horiz(s.box,T.player.position),hits:hits.slice(0,4),hitCount:hits.length,vertices});
      }
    }
    // World-design rule 8: the inset rooms must remain connected through the open doorway.
    T.player.position.set(-9.6,y,-648);T.setVelDbg(0,0);T.setOtsAimDbg(0,0);
    T.flightInput({keys:['KeyA']});for(let i=0;i<25;i++)T.stepFrame(1/30);
    const toRange=T.player.position.toArray();
    T.flightInput({keys:['KeyD']});for(let i=0;i<25;i++)T.stepFrame(1/30);
    const toBuild=T.player.position.toArray();
    T.flightInput({keys:[]});T.flightHold(false);
    return {candidateCount:candidates.length,spotCount:spots.length,results,doorway:{toRange,toBuild,walk:tg.walk.map(w=>({...w}))},errors:[],playerRadius:T.PLAYER_RADIUS_DBG};
  })()`);
  report.errors=page.errors.slice();
  assert.deepEqual(report.errors,[]);
  report.shots=[];
  const shots=[
    ['build-east-wall',-8.42,-629.25,-12,-629.25,[]],['build-east-wall-range-side',-8.42,-629.25,-5,-629.25,[]],
    ['build-south-wall',-20,-651.58,-18.5,-648,[]],['range-west-wall',-7.58,-644,-4,-644,[]],
    ['range-south-wall',0,-651.58,0,-648,[]],['bench-run',0,-640.24,1.2,-642.5,['KeyW','ShiftLeft']],
    ['bench-crouch',0,-640.24,1.2,-642.5,['KeyW','KeyC']],
    ['build-north-wall-run',-36,-612.75,-34.5,-615,['KeyW','ShiftLeft'],true],
    ['build-north-wall-run',-36,-612.75,-34.5,-615,['KeyW','ShiftLeft'],false]
  ];
  for (const [name,x,z,cx,cz,keys,oldNorth=false] of shots) {
    const state=await page.evaluate(`(()=>{const T=TT,tg=T.trainingDbg.tg(),y=tg.floorY,walkMax=tg.walk[2].maxZ;if(${oldNorth})tg.walk[2].maxZ=tg.origin.z+28-.75;T.player.position.set(${x},y,${z});T.setVelDbg(0,0);T.setOtsAimDbg(0,0);T.flightInput({keys:${JSON.stringify(keys)}});T.setShotView({x:${cx},y:y+2,z:${cz},tx:${x},ty:y+0.9,tz:${z},fov:48});for(let i=0;i<10;i++)T.stepFrame(1/30);T.flightInput({keys:[]});const state={first:T.fpDbg().first,marineVisible:T.getMarine().visible,marinePosition:T.getMarine().position.toArray(),camera:T.camera.position.toArray(),player:T.player.position.toArray()};tg.walk[2].maxZ=walkMax;return state})()`);
    report.shots.push({name,...state});
    await page.screenshot(path.join(out,`${oldNorth?'before':process.argv[2]||'before'}-${name}.png`));
  }
  console.log(`CB-292 walk sweep: ${report.spotCount} approaches, ${report.results.length} stance cases, ${report.results.filter(r=>r.hitCount).length} capsule and ${report.results.filter(r=>r.vertices.length).length} mesh intersections, 0 page errors`);
  assert.equal(report.results.filter(r=>r.hitCount||r.vertices.length).length,0,'J126: limb samples inside Training Ground wall or station solid');
  assert(report.doorway.toRange[0]>-7.2 && report.doorway.toBuild[0]<-8.8,'world-design rule 8: the player must cross the Training doorway in both directions');
} catch(e) {report.failure=String(e?.stack||e); console.error(report.failure); process.exitCode=1;}
finally {fs.writeFileSync(path.join(out,'walk-sweep.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await server.close();}
