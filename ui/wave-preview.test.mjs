import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBriefing, bearingLabel, intelOffer, FIELD_INTEL_PRICE } from './wave-preview.js';
const make = () => ({day:4,total:10,caveIndices:[0,1],bearings:[Math.PI/2,Math.PI],byTypeAndCave:[
  {typeKey:'shambler',count:4,caveIndex:0,caveName:'North Cave'},
  {typeKey:'brute',count:2,caveIndex:0,caveName:'North Cave'},
  {typeKey:'feral',count:4,caveIndex:1,caveName:'East Cave'}]});
test('basic preview discloses largest approach and dominant type, no exact counts',()=>{
  const view=buildBriefing({preview:make(),day:4});assert(view.available);assert.equal(view.sources.length,1);
  assert.equal(view.sources[0].heading,'Largest approach: North Cave · N');assert.deepEqual(view.sources[0].lines,['Main threat: Shambler']);
  assert.equal(view.total,null);assert.equal(view.sources[0].total,null);assert(!JSON.stringify(view).includes('Brute'));
});
test('Field Intel lists every group/count; reading never mutates frozen plan',()=>{
  const p=make(),before=JSON.stringify(p);Object.freeze(p);p.byTypeAndCave.forEach(Object.freeze);Object.freeze(p.byTypeAndCave);
  const view=buildBriefing({preview:p,day:4,intelOwned:true});assert.equal(view.total,'Total: 10');
  assert.deepEqual(view.sources[0].lines,['Shambler: 4','Brute: 2']);assert.equal(JSON.stringify(p),before);
});
test('ties show at most two largest approaches; warnings never need the upgrade',()=>{
  const p=make();p.byTypeAndCave[0].count=2;p.total=8;p.bloodMoon=true;p.surround=true;p.hasColossus=true;
  const view=buildBriefing({preview:p,day:4});assert.equal(view.sources.length,2);assert.equal(view.warnings.length,3);
});
test('lake sources stay separate from caves, and bearings match game handedness',()=>{
  const p={day:3,total:2,caveIndices:[],bearings:[],byTypeAndCave:[{typeKey:'drowned',count:2,caveIndex:-1}]};
  assert.equal(buildBriefing({preview:p,day:3,intelOwned:true}).sources[0].heading,'Lake');
  assert.equal(bearingLabel(0),'W');assert.equal(bearingLabel(Math.PI/2),'N');assert.equal(bearingLabel(Math.PI),'E');assert.equal(bearingLabel(-Math.PI/2),'S');
});
test('missing/stale/mismatched/guardian/invalid data is unavailable, valid empty is distinct',()=>{
  for(const p of [null,{...make(),day:3},{...make(),total:9},{...make(),byTypeAndCave:[{typeKey:'caveguard',count:10,caveIndex:0}]},{...make(),total:-1}])
    assert.equal(buildBriefing({preview:p,day:4}).available,false);
  assert.equal(buildBriefing({preview:{day:4,total:0,byTypeAndCave:[]},day:4}).note,'No attack scheduled');
});
test('untrusted cave names cannot become HTML or player copy',()=>{
  const p=make();p.byTypeAndCave[0].caveName='<img src=x onerror=bad()>';
  assert(buildBriefing({preview:p,day:4}).sources[0].heading.includes('Unconfirmed approach'));
});
test('Field Intel offer has honest cost, shortfall and ownership',()=>{
  assert.equal(FIELD_INTEL_PRICE,120);assert.equal(intelOffer(119,false).label,'Need 1 more Cash');assert(!intelOffer(119,false).enabled);
  assert.equal(intelOffer(120,false).label,'Buy — 120 Cash');assert(intelOffer(120,false).enabled);
  assert.equal(intelOffer(1000,true).label,'Owned');assert(!intelOffer(1000,true).enabled);
});

test('ground risers keep their own source label and count without becoming a cave',()=>{const preview={day:1,total:15,byTypeAndCave:[{typeKey:'shambler',count:8,caveIndex:-1,ground:true},{typeKey:'shambler',count:7,caveIndex:0,caveName:'North Cave'}]};const v=buildBriefing({preview,day:1,intelOwned:true});assert.equal(v.sources[0].id,'ground');assert.equal(v.sources[0].heading,'Treeline · ground rise');assert.equal(v.sources[0].total,'Treeline · ground rise: 8');assert.equal(v.total,'Total: 15');});
