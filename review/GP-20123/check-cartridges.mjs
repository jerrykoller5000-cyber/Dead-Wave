import assert from 'node:assert/strict';
import * as THREE from '../../vendor/three/three.core.js';
import * as headless from '../../tools/tests/fakethree.mjs';
import {roundGeometry,spentCaseGeometry} from '../../studio/weapon-casings.js';

const ids=['pistol','uzi','revolver','m4','ak','minigun','m240','sniper','shotgun','aa12','launcher'];
for(const T of [THREE,headless])for(const id of ids){
  const live=roundGeometry(T,id),spent=spentCaseGeometry(T,id);
  assert(live&&spent&&live!==spent,id+' needs both props');
  assert.equal(live,roundGeometry(T,id));
  assert.equal(spent,spentCaseGeometry(T,id));
  for(const g of [live,spent]){
    const {position,color,normal}=g.attributes;
    assert.equal(position.count,color.count);
    assert.equal(position.count,normal.count);
    assert(position.array.every(Number.isFinite)&&normal.array.every(Number.isFinite),id+' finite surface');
    assert(color.array.every(n=>Number.isFinite(n)&&n>=0&&n<=1),id+' vertex colours');
    g.computeBoundingBox();
  }
  if(id==='pistol'){
    assert(Math.abs((live.boundingBox.max.y-live.boundingBox.min.y)*1000-29.69)<.02);
    assert(Math.abs((spent.boundingBox.max.y-spent.boundingBox.min.y)*1000-19.15)<.02);
  }
  if(id==='m4')assert(Math.abs((live.boundingBox.max.y-live.boundingBox.min.y)*1000-57.4)<.02);
  if(id==='sniper')assert(Math.abs((spent.boundingBox.max.y-spent.boundingBox.min.y)*1000-69.2)<.02);
  // The fired primer must be depressed and darker than the surrounding brass.
  const p=spent.attributes.position,c=spent.attributes.color,min=spent.boundingBox.min.y;
  let dark=false,base=false;
  for(let i=0;i<p.count;i++){
    const y=p.getY(i)-min,r=Math.hypot(p.getX(i),p.getZ(i));
    if(y<.001&&r<.002&&c.getX(i)<.2)dark=true;
    if(y<.001&&r>.002&&c.getX(i)>.35)base=true;
  }
  assert(dark&&base,id+' primer strike contrast');
}
console.log('PASS: 11 live/spent pairs, cache, finite surfaces, true 9mm/.223/.338 dimensions and fired-primer contrast in production and headless Three');
