import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three/three.core.js';
import {isTrainingBorderCell,trainingPerimeterLayout,createTrainingPerimeter,trainingBorderPaintRect,trainingFenceSpans,trainingRazorSpans} from './training-perimeter.js';
import {traceTraining} from '../world/training-ballistics.js';
function setup(){const group=new T.Group();group.position.set(0,-200,-640);return {group,origin:{x:0,y:-200,z:-640},floorY:-200,solids:[],build:{grid:2,offset:1,minGX:-22,maxGX:-5,minGZ:-326,maxGZ:-307},bed:{centre:{x:-40.85,z:-650}},stations:{hqPanel:{x:-43.98,z:-637.65},skullWindow:{x:-43.98,z:-643}},securityDoor:{minZ:-649.5,maxZ:-646.5}};}
test('one cell around all four walls is reserved, interior and range are not border cells',()=>{
 const b=setup().build;let n=0;
 for(let x=b.minGX;x<=b.maxGX;x++)for(let z=b.minGZ;z<=b.maxGZ;z++)if(isTrainingBorderCell(b,x,z))n++;
 assert.equal(n,72);assert.equal(isTrainingBorderCell(b,-21,-320),false);assert.equal(isTrainingBorderCell(b,0,-320),false);
});
test('layout joins medical enclosure, recesses both stations and preserves the gate approach',()=>{
 const tg=setup(),l=trainingPerimeterLayout(tg);
 assert.deepEqual(l.room,{minX:-44,maxX:-8,minZ:-652,maxZ:-612});
 assert(l.segments.every(s=>Math.max(s.z0,s.z1)<=-622));
 for(const st of Object.values(tg.stations))assert(!l.segments.some(s=>s.x0===s.x1&&Math.abs(s.z0-st.z)<1.5&&Math.abs(s.z1-st.z)<1.5));
 assert(l.segments.some(s=>s.side==='west'&&s.z0===l.medical.maxZ+tg.build.grid/4));
 assert(l.segments.filter(s=>s.side==='south').every(s=>Math.min(s.x0,s.x1)>l.medical.maxX));
});
test('medical corners have matching returns and paint reaches both edges without entering the enclosure',()=>{
 const tg=setup(),l=trainingPerimeterLayout(tg),m=l.medical,b=tg.build;
 assert(l.segments.some(s=>s.side==='west'&&s.x0===l.room.minX&&s.x1===l.room.minX+b.grid&&s.z0===m.maxZ+b.grid/4&&s.z1===s.z0));
 assert(l.segments.some(s=>s.side==='south'&&s.z0===l.room.minZ&&s.z1===l.room.minZ+b.grid&&s.x0===m.maxX+b.grid/4&&s.x1===s.x0));
 const left=trainingBorderPaintRect(b,b.minGX,-324,m),right=trainingBorderPaintRect(b,-19,b.minGZ,m);
 assert(left&&left.z0>m.maxZ);assert(right&&right.x0>m.maxX);
 assert.equal(trainingBorderPaintRect(b,b.minGX,b.minGZ,m),null);
 for(let x=b.minGX;x<=b.maxGX;x++)for(let z=b.minGZ;z<=b.maxGZ;z++)if(isTrainingBorderCell(b,x,z)){const r=trainingBorderPaintRect(b,x,z,m);if(r)assert(!(r.x0<m.maxX&&r.x1>m.minX&&r.z0<m.maxZ&&r.z1>m.minZ));}
});
test('coil clearance trims crossing and terminal pillar joints in either direction',()=>{
 const c={minX:-44,maxX:-43.43,minZ:-640.35,maxZ:-639.65};
 for(const s of [{side:'west',x0:-42,z0:-640,x1:-44,z1:-640},{side:'west',x0:-44,z0:-640,x1:-42,z1:-640}]){
  const spans=trainingFenceSpans(s,[c]);assert.equal(spans.length,1);assert(Math.min(spans[0].x0,spans[0].x1)>=c.maxX+.34-1e-8);
 }
 const spans=trainingFenceSpans({side:'west',x0:-43.7,z0:-643,x1:-43.7,z1:-637},[c]);assert.equal(spans.length,2);
});
test('razor ribbon also breaks in front of each wall pillar, retaining the physical fence seal',()=>{
 const tg=setup(),c={minX:-43.97,maxX:-43.43,minZ:-640.35,maxZ:-639.65,minY:-200,maxY:-176,column:true};tg.solids.push(c);
 const s={side:'west',x0:-42,z0:-643,x1:-42,z1:-637};assert.equal(trainingFenceSpans(s,[c]).length,1);
 assert.equal(trainingRazorSpans(s,[c]).length,2);const p=createTrainingPerimeter(T,tg);
 assert(p.constrain({x:-44,y:-200,z:-640},{x:-39,y:-200,z:-640}).moved);
 p.group.updateWorldMatrix(true,true);let conflicts=0;
 p.group.getObjectByName('training-perimeter-west').traverse(o=>{if(!o.isMesh||o.material.color.getHex()!==0x7c8980)return;const g=o.geometry.attributes.position;for(let i=0;i<g.count;i++){const v=new T.Vector3().fromBufferAttribute(g,i).applyMatrix4(o.matrixWorld);if(v.y>-197.8&&v.x>-42.4&&v.z>c.minZ&&v.z<c.maxZ)conflicts++;}});
 assert.equal(conflicts,0);p.dispose();
});
test('fences stop swept movement but door and station openings remain usable',()=>{
 const tg=setup(),p=createTrainingPerimeter(T,tg),at=(x,z)=>({x,y:-200,z});
 const hit=p.constrain(at(-44,-630),at(-39,-630),.42);assert.equal(hit.moved,true);assert(hit.x>-42);
 for(const z of [-648,-637.65,-643]){
   const left=z===-648?-12:-40,right=z===-648?-7:-43.2;
   assert.equal(p.constrain(at(right,z),at(left,z),.42).moved,false,'opening '+z);
 }
 assert.equal(p.constrain(at(-26,-614),at(-26,-626),.42).moved,false,'gate release');
 p.dispose();assert.equal(tg.solids.length,0);
});
test('six batched meshes, stable geometry, and camera cutaway keep collision intact',()=>{
 const tg=setup(),p=createTrainingPerimeter(T,tg);let meshes=0,vertices=0;p.group.traverse(m=>{if(m.isMesh){meshes++;vertices+=m.geometry.attributes.position.count;}});
 assert.equal(meshes,6);assert(vertices<100000);assert.equal(p.solids.length,p.layout.segments.length);
 p.update({x:-49,y:-198,z:-630},{x:-26,y:-199,z:-630},1);assert(Math.abs(p.state()[0].opacity-.08)<1e-8);
 assert.equal(p.constrain({x:-44,y:-200,z:-630},{x:-39,y:-200,z:-630}).moved,true);
 p.update({x:-26,y:-180,z:-635},{x:-26,y:-200,z:-635},1);assert(p.state().every(s=>s.opacity===1));p.dispose();
});
test('faded foreground fence does not trap camera aim, but rounds still hit it; old shell rule survives',()=>{
 const tg=setup(),old=s=>!!s.oldShell;tg.cutaway={ignoreSolid:old};const p=createTrainingPerimeter(T,tg);
 const a={x:-49,y:-198,z:-630},b={x:-26,y:-199,z:-630};
 assert(traceTraining(tg,a,b,{throughGlass:true}));
 p.update(a,b,1);assert.equal(traceTraining(tg,a,b,{throughGlass:true}),null);
 assert(traceTraining(tg,a,b).solid.perimeterFence);assert(tg.cutaway.ignoreSolid({oldShell:true}));
 p.dispose();assert.equal(tg.cutaway.ignoreSolid,old);
});
