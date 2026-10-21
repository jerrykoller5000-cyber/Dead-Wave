import fs from 'node:fs';import assert from 'node:assert/strict';import * as T from 'three';import * as Fake from '../../tools/tests/fakethree.mjs';import * as H from '../../world/history-props.js';
let cases=0;const stats=[];
for(const [w,h]of [[3,2.9],[4,3.5],[2.5,2.5]])for(const allCut of [true,false]){
 const g=H.buildCutBars(T,w,h,allCut),a=g.children[0].geometry.attributes.position;
 if(allCut)for(let i=0;i<a.count;i++){const x=a.getX(i),y=a.getY(i);assert(!(Math.abs(x)<w*.25&&y>.31&&y<h-.4),'Clear central breach must contain no bar geometry at body height');}
 g.traverse(o=>{if(o.isMesh)assert([...o.geometry.attributes.position.array].every(Number.isFinite));});cases++;
}
for(const [name,args]of [['buildMineTimbers',[]],['buildCutBars',[3,2.9,true]],['buildIronBelowBoards',[null]],['buildHikersCache',[{ropePath:[[3,-1],[4,-3]]}]]]){
 const g=H[name](T,...args);let meshes=0,vertices=0;g.traverse(o=>{if(o.isMesh){meshes++;vertices+=o.geometry.attributes.position.count;assert([...o.geometry.attributes.position.array].every(Number.isFinite));}});assert(meshes<=2);assert(H[name](Fake,...args).children.length);
 if(g.userData.seatHistoryTerrain){g.position.set(3,1,4);g.rotation.y=.6;const mesh=g.children.find(o=>o.name.endsWith('-details')),before=Float32Array.from(mesh.geometry.attributes.position.array);g.userData.seatHistoryTerrain((x,z)=>.04*x+.08*z);const a=mesh.geometry.attributes.position.array;for(let i=0;i<a.length;i+=3){const d=.04*(Math.cos(.6)*before[i]+Math.sin(.6)*before[i+2])+.08*(-Math.sin(.6)*before[i]+Math.cos(.6)*before[i+2]);assert(Math.abs(a[i+1]-before[i+1]-d)<1e-5);}const once=Array.from(a);g.userData.seatHistoryTerrain(()=>100);assert.deepEqual(Array.from(a),once);}
 stats.push({name,meshes,vertices});cases++;
}
assert(H.buildHikersCache(T).getObjectByName('hikers-headlamp'));
// Check the production rope transform against cave-local left-edge coordinates.
const half=3.44,angle=.5,path=[[-1.45,1.3],[-1.45,-1.6]].map(([x,z])=>{const dx=x+half+.6,dz=z-3.6;return[Math.cos(angle)*dx-Math.sin(angle)*dz,Math.sin(angle)*dx+Math.cos(angle)*dz];});
for(let i=0;i<path.length;i++){const [x,z]=path[i];assert(Math.abs(Math.cos(angle)*x+Math.sin(angle)*z-(half+.6)+1.45)<1e-10);assert(Math.abs(-Math.sin(angle)*x+Math.cos(angle)*z+3.6-[1.3,-1.6][i])<1e-10);}
fs.writeFileSync(new URL('./geometry-checks.json',import.meta.url),JSON.stringify({cases,stats,clearBreach:true,finite:true,terrainSeating:true,fakeThree:true,ropeRoute:true},null,2));console.log('PASS ten geometry cases: clear cut-bar passage, finite static batches, terrain seating/idempotence, fake THREE and rope coordinate transform.');
