import test from 'node:test';import assert from 'node:assert/strict';
import {mapLandmarks,createMapLandmarkIntel,drawMapCamera} from './map-landmarks.js';
test('every place starts as a question mark except FOB Threshold; discovery persists until reset',()=>{
  const poi={tower:{x:40,z:20},campsites:[{x:80,z:0,style:'ranger'}],caves:[{x:120,z:0,theme:'root',name:'East Cave'}],wrecks:[{x:150,z:0}]};
  const before=JSON.stringify(poi),rows=mapLandmarks(poi,{x:0,z:0},{x:-50,z:10}),m=createMapLandmarkIntel();
  assert.equal(m.labels(rows)[0].label,'FOB Threshold');assert(m.labels(rows).slice(1).every(r=>r.label==='?'));
  m.observe(rows,{x:102,z:0});assert.equal(m.labels(rows).find(r=>r.id==='cave:0').label,'Root warren');
  m.observe(rows,{x:0,z:0});assert.equal(m.labels(rows).find(r=>r.id==='cave:0').label,'Root warren');
  assert.equal(m.labels(rows).find(r=>r.id==='camp:0').label,'?');m.reset();assert.equal(m.labels(rows).find(r=>r.id==='cave:0').label,'?');
  assert.equal(JSON.stringify(poi),before);
});
test('all six cave themes use real names, never their compass name; all landmark types included',()=>{
  const poi={};for(const key of ['cabins','bridges','sheds','wrecks','campsites'])poi[key]=[{x:0,z:0}];
  for(const key of ['tower','graveyard','mast','dock'])poi[key]={x:0,z:0};
  poi.caves=['root','shale','iron','wet','hill','chalk'].map(theme=>({x:0,z:0,theme,name:'North Cave'}));
  const rows=mapLandmarks(poi,{x:0,z:0},{x:0,z:0}),m=createMapLandmarkIntel();m.observe(rows,{x:0,z:0});
  assert.equal(rows.length,17);const caves=m.labels(rows).filter(r=>r.id.startsWith('cave:')).map(r=>r.label);
  assert.deepEqual(caves,['Root warren','Shale warren','Iron warren','Wet warren','Hill warren','Marrow cave']);
});
test('north-up camera cone turns independently of the player heading',()=>{
  const lines=[],arcs=[],ctx={save(){},restore(){},createRadialGradient(){return{addColorStop(){}};},beginPath(){},moveTo(){},arc(...a){arcs.push(a);},closePath(){},fill(){},stroke(){},lineTo(...p){lines.push(p);}};
  drawMapCamera(ctx,{x:100,y:100},{yaw:Math.PI/2,halfFov:.5,reach:40});
  assert(Math.abs(lines[0][0]-60)<1e-8);assert(Math.abs(lines[0][1]-100)<1e-8);
  assert.equal(arcs[0][3],-Math.PI-.5);
});
