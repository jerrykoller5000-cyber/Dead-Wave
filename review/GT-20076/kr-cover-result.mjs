import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const phase=process.argv[2];assert(/^catalog-fix-kr-[a-z0-9-]+$/.test(phase));
async function catalogue(name){return JSON.parse(await readFile(new URL('./'+name+'/audit.json',import.meta.url),'utf8')).ak;}
const before=await catalogue('catalog-fix-contact-trim'),after=await catalogue(phase);
const key=(a,b)=>[a,b].sort().join(' | ');
const hits=model=>new Set((model.rawOverlaps||model.overlaps).map(x=>key(x.a,x.b)));
const old=hits(before),now=hits(after);
const top=key('root/KR-7 receiver cover[24]','root/BufferGeometry[23]');
assert(old.has(top));assert(!now.has(top),'Original painted top-to-side intersection still present');
assert(after.parts===before.parts && after.openSurfaces<=before.openSurfaces);
for(const k of ['loose','unseated','detailBreaches'])assert.equal(after[k].length,0,k);
assert.deepEqual([...now].filter(k=>!old.has(k)),[]);
console.log('PASS KR-7 top-to-side crossing removed; no new pair, open skin, detached group, missing contact or detail breach.');
console.log('Raw KR-7 pairs',old.size,'to',now.size,'open',after.overlaps.length);
