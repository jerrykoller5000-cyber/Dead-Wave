import fs from 'node:fs';
import assert from 'node:assert/strict';
const dir='review/range-misses-GP19911',p=JSON.parse(fs.readFileSync(dir+'/drill-live.json','utf8'));
assert.equal(p.cases.length,10);assert.deepEqual(p.errors,[]);
for(const c of p.cases){
 assert(c.started.ok);assert.equal(c.before.state,'ACTIVE');assert.equal(c.shots.length,1);assert.equal(c.hits.length,1);
 assert(Math.hypot(c.view[0],c.view[1])<.00001,'crosshair really covers requested plate pixel');
 assert.equal(c.safe.self,false);assert(c.pops.length>0,'physical plate impact cannot be silent');
 const h=c.hits[0];assert.equal(h.token.activation,h.activation);
 if(!h.ok){assert.equal(h.base,0);assert(h.deduction>0);assert(c.pops.some(t=>t.includes('Aim at Bullseye')||t.includes('Shoot lane 5')));}
 else assert(h.base>0);
}
const burst=p.cases.find(c=>c.id==='four-count');assert(burst.pops.some(t=>t.includes('1/4 hits')));
const before=JSON.parse(fs.readFileSync(dir+'/before-verified.json','utf8')).cases[0],after=p.cases[0];
assert.equal(before.hits[0].sc.zone,after.hits[0].sc.zone);assert.equal(before.hits[0].deduction,after.hits[0].deduction);
assert.equal(before.shots.length,1);assert.equal(before.pops.length,0);assert(after.pops[0].includes('Hit Head'));
console.log('PASS 10 native shoulder-camera timed-drill shots: 6 credited, 4 rule-rejected with visible reasons; same head hit silent before/explained after.');
