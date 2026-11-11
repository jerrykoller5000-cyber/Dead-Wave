import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=async phase=>(JSON.parse(await readFile(new URL('./'+phase+'/audit.json',import.meta.url),'utf8'))).aa12;
const before=await read('catalog-visibility'), after=await read('catalog-panels');
const key=(a,b)=>[a,b].sort().join(' | ');
const raw=r=>new Map((r.rawOverlaps||r.overlaps).map(p=>[key(p.a,p.b),p]));
const old=raw(before),current=raw(after);
const base='root/BufferGeometry[0]', panels=['root/BufferGeometry[2]','root/BufferGeometry[9]'];
for(const p of panels){assert(old.has(key(base,p)),'Missing original panel intersection');assert(!current.has(key(base,p)),'Panel still crosses the side');}
assert.equal(after.parts,before.parts);
for(const name of ['loose','unseated','detailBreaches'])assert.equal(after[name].length,0,name);
const added=[...current.keys()].filter(k=>!old.has(k));
assert.deepEqual(added,[],'Unexpected new overlap');
console.log('PASS both decorative panel-to-side crossings removed; no new pairs, detached parts, missing contacts or detail breaches.');
console.log('Strict raw pairs',old.size,'to',current.size,'remaining unresolved',after.overlaps.length,'named enclosures',after.excusedSeats.length);
