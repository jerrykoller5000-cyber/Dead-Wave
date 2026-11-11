import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=async phase=>(JSON.parse(await readFile(new URL('./'+phase+'/audit.json',import.meta.url),'utf8'))).aa12;
const phase=process.argv[2]||'catalog-panels';
assert(/^catalog-[a-z0-9-]+$/.test(phase));
const before=await read('catalog-visibility'), after=await read(phase);
const key=(a,b)=>[a,b].sort().join(' | ');
const raw=r=>new Map((r.rawOverlaps||r.overlaps).map(p=>[key(p.a,p.b),p]));
const old=raw(before),current=raw(after);
const base='root/BufferGeometry[0]', panels=['root/BufferGeometry[2]','root/BufferGeometry[9]'];
for(const p of panels){assert(old.has(key(base,p)),'Missing original panel intersection');assert(!current.has(key(base,p)),'Panel still crosses the side');}
if(phase.startsWith('catalog-fix-trim')){
  const stripe='root/BufferGeometry[26]';
  const drum='root/group[46]/magazineBody[0]/';
  const removed=[[stripe,panels[0]],[drum+'TorusGeometry[15]',drum+'CylinderGeometry[14]'],[drum+'TorusGeometry[2]',drum+'CylinderGeometry[1]']];
  for(const [a,b] of removed){
    assert(old.has(key(a,b)),'Expected original cosmetic crossing '+key(a,b));
    assert(!current.has(key(a,b)),'Remaining cosmetic crossing '+key(a,b));
  }
}
if(phase.includes('joins')){
  const s=i=>'root/fp-stock[40]/BufferGeometry['+i+']';
  for(const [a,b] of [[s(0),s(1)],[s(0),base],[s(0),'root/BufferGeometry[1]'],[s(1),s(2)]]){
    assert(old.has(key(a,b)),'Missing original polymer crossing '+key(a,b));
    assert(!current.has(key(a,b)),'Polymer still crosses its neighbor '+key(a,b));
  }
}
assert.equal(after.parts,before.parts);
for(const name of ['loose','unseated','detailBreaches'])assert.equal(after[name].length,0,name);
const added=[...current.keys()].filter(k=>!old.has(k));
assert.deepEqual(added,[],'Unexpected new overlap');
console.log('PASS both decorative panel-to-side crossings removed; no new pairs, detached parts, missing contacts or detail breaches.');
console.log('Strict raw pairs',old.size,'to',current.size,'remaining unresolved',after.overlaps.length,'named enclosures',after.excusedSeats.length);
