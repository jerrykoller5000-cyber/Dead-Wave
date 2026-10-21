import test from 'node:test';
import assert from 'node:assert/strict';
import {createEnemyMapIntel, enemyMapPoint, drawEnemyBearings} from './map-enemies.js';
const enemy=(x,z)=>({alive:true,mesh:{position:{x,z}}});
test('bearings follow camera and player, including every quadrant and wrap',()=>{
  for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2,Math.PI*2+.4]) {
    const p={x:70,z:-50,yaw,center:164,scale:3,rim:155};
    const ahead=enemyMapPoint({x:p.x+20*Math.sin(yaw),z:p.z+20*Math.cos(yaw)},p);
    assert(Math.abs(ahead.x-164)<1e-8);assert(Math.abs(ahead.y-104)<1e-8);
    const right=enemyMapPoint({x:p.x-20*Math.cos(yaw),z:p.z+20*Math.sin(yaw)},p);
    assert(Math.abs(right.x-224)<1e-8);assert(Math.abs(right.y-164)<1e-8);
  }
});
test('day knows only near/seen living enemies; night is exactly 50m, not remembered as seen',()=>{
  const m=createEnemyMapIntel(),p={x:0,z:0},near=enemy(10,0),seen=enemy(0,30),hidden=enemy(25,0),edge=enemy(0,50),far=enemy(0,50.01),dead=enemy(0,1);dead.alive=false;
  const all=[near,seen,hidden,edge,far,dead],before=JSON.stringify(all);
  m.observe(all,p,e=>e===seen);
  assert.deepEqual(m.markers(all,p,false),[near,seen]);
  assert.deepEqual(m.markers(all,p,true),[near,seen,hidden,edge]);
  assert.deepEqual(m.markers(all,p,false),[near,seen]);
  m.observe(all,p,()=>false);assert(m.markers(all,p,false).includes(seen));
  assert.equal(JSON.stringify(all),before);m.reset();assert.deepEqual(m.markers(all,p,false),[]);
});
test('visibility checks are bounded and cycle through unseen enemies; recycled mesh is not discovery',()=>{
  const m=createEnemyMapIntel(),p={x:0,z:0},all=Array.from({length:9},(_,i)=>enemy(20+i,0)),visited=new Set();
  for(let i=0;i<5;i++){let calls=0;m.observe(all,p,e=>{calls++;visited.add(e);return false;});assert(calls<=2);}
  assert.equal(visited.size,9);m.observe(all,p,()=>true);
  const replacement={...all[0]};assert(!m.markers([replacement],p,false).length);
});
test('several small rim marks use live positions rather than spawn headings',()=>{
  const arcs=[],ctx={save(){},restore(){},beginPath(){},stroke(){},arc(...a){arcs.push(a);}};
  const a=enemy(0,20),b=enemy(-20,0),p={x:0,z:0,yaw:0,center:164,rim:155};
  drawEnemyBearings(ctx,[a,b],p);assert.equal(arcs.length,2);assert(Math.abs(arcs[0][3]+Math.PI/2+.025)<1e-9);
  assert.equal(arcs[1][3],-.025);assert.equal(ctx.lineWidth,2.5);
  a.mesh.position.x=20;a.mesh.position.z=0;arcs.length=0;drawEnemyBearings(ctx,[a],p);assert(Math.abs(Math.abs(arcs[0][3]+.025)-Math.PI)<1e-9);
});
