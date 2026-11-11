import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../../vendor/three/three.core.js';
import {buildTrainingGround} from '../../world/training.js';
import {createTrainingPerimeter} from '../../game/training-perimeter.js';
import {createTrainingInfirmaryFence} from '../../game/training-infirmary-fence.js';
import {createRangeMonitor} from '../../ui/range-monitor.js';
import {dressCifExterior} from '../../ui/cif-exterior.js';

const canvas=()=>({width:0,height:0,getContext:()=>({fillRect(){},strokeRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},fill(){},measureText:()=>({width:10})})});
const vertices=(root,fn)=>{root.updateWorldMatrix(true,true);root.traverse(m=>{if(!m.isMesh)return;const a=m.geometry.attributes.position;for(let i=0;i<a.count;i++)fn(new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(m.matrixWorld),m);});};
const inside=(v,b,eps=.0005)=>v.x>b.minX+eps&&v.x<b.maxX-eps&&v.y>b.minY+eps&&v.y<b.maxY-eps&&v.z>b.minZ+eps&&v.z<b.maxZ-eps;

test('perimeter render stays outside wall, column and keypad envelopes even at returns',()=>{
  const tg=buildTrainingGround(T),p=createTrainingPerimeter(T,tg);
  const walls=tg.solids.filter(s=>s.wall||s.column);
  let cuts=0;vertices(p.group,v=>{if(walls.some(s=>inside(v,s)))cuts++;});
  assert.equal(cuts,0,'perimeter geometry crosses a structural solid');
  p.dispose();tg.dispose();

  // Original AG-292 room grid: returns touch a west wall and east keypad.
  const old={group:new T.Group(),origin:{x:0,y:-200,z:-640},floorY:-200,solids:[{minX:-44,maxX:-43.7,minY:-201,maxY:-176,minZ:-652,maxZ:-612,wall:true}],build:{grid:2,offset:1,minGX:-22,maxGX:-5,minGZ:-326,maxGZ:-307},bed:{centre:{x:-40.85,z:-650}},stations:{hqPanel:{z:-637.65},skullWindow:{z:-643}},securityDoor:{minZ:-649.5,maxZ:-646.5,keypads:[{x:-8.27,z:-650}]}};
  const q=createTrainingPerimeter(T,old);
  assert(q.renderSpans.filter(s=>s.side==='west').every(s=>Math.min(s.x0,s.x1)>=-43.36-.0005),'west return meets wall clearance');
  assert(q.renderSpans.filter(s=>s.side==='east'&&Math.abs(s.z0+650)<.001).every(s=>Math.max(s.x0,s.x1)<=-8.68+.0005),'east return meets keypad clearance');
  q.dispose();
});

test('infirmary plates sit on floor, use one corner post and clear existing south post',()=>{
  const tg=buildTrainingGround(T),f=createTrainingInfirmaryFence(T,tg);
  const plates=[];for(const m of f.group.children)if(m.isMesh)plates.push(m);
  assert.equal(plates.length,1,'static plates remain one bake');
  const b=new T.Box3().setFromObject(plates[0]);
  assert(Math.abs(b.min.y-tg.floorY)<.0005,`plate gap ${b.min.y-tg.floorY}`);
  const post={minX:-36.33,maxX:-36.25,minY:tg.floorY,maxY:tg.floorY+2.76,minZ:-651.8625,maxZ:-651.7825};
  let cuts=0;vertices(f.group,v=>{if(inside(v,post))cuts++;});
  assert.equal(cuts,0,'fence intersects pre-existing medical post');
  const platePositions=plates[0].geometry.attributes.position;
  assert.equal(platePositions.count,72,'one corner plate and one return plate, without duplicate anchors');
  f.dispose();tg.dispose();
});

test('drill monitor meets, and does not cross, the front of both firing-line posts',()=>{
  globalThis.document={createElement:canvas};
  const tg={group:new T.Group()},m=createRangeMonitor(T,tg);
  const front=.745-.075/2,centerY=m.debug().height;
  let maxZ=-Infinity,cuts=0;vertices(m.group,v=>{maxZ=Math.max(maxZ,v.z);if(Math.abs(v.x-1.5)<.037&&v.z>front+.0005&&v.y>2.15)cuts++;if(Math.abs(v.x+1.5)<.037&&v.z>front+.0005&&v.y>2.15)cuts++;});
  assert(Math.abs(maxZ-front)<.0005,`mounting contact gap ${front-maxZ}`);
  assert.equal(cuts,0,'monitor crosses firing-line posts');
  assert(centerY>3.3);m.dispose();delete globalThis.document;
});

test('CIF hood and warm strip end within the Range wall plane',()=>{
  globalThis.document={createElement:canvas};
  const root=new T.Group(),lamp=new T.MeshStandardMaterial(),text=()=>'';
  dressCifExterior(T,root,text,lamp);
  const pieces=root.children.filter(m=>m.isMesh&&m.geometry.type==='BoxGeometry'&&Math.abs(m.geometry.parameters.width-2.02)<1e-6&&m.position.y>3);
  assert.equal(pieces.length,2,'hood and strip identified');
  for(const p of pieces){const face=p.position.z+p.geometry.parameters.depth/2;assert(face<=.6995+.0005,`CIF eave exceeds wall plane: ${face}`);}
  delete globalThis.document;
});
