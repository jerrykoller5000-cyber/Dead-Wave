import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { RANGE_DRILLS } from '../../ui/range-drills.js';
const dir=path.dirname(fileURLToPath(import.meta.url));
const sources=[0,5,10,15,20,25,30,35,40].map(start=>`drills-${start}-5.json`).concat('drills-41-2.json');
const rows=[];
for(const source of sources){
  const data=JSON.parse(fs.readFileSync(path.join(dir,source),'utf8'));
  assert.deepEqual(data.at(-1).pageErrors,[],`${source} page errors`);
  for(const r of data.slice(0,-1)){
    const i=rows.findIndex(v=>v.weapon===r.weapon&&v.id===r.id);
    if(i>=0)rows.splice(i,1);
    rows.push({...r,source});
  }
}
assert.equal(rows.length,45);
rows.sort((a,b)=>RANGE_DRILLS.findIndex(d=>d.weapon===a.weapon&&d.id===a.id)-RANGE_DRILLS.findIndex(d=>d.weapon===b.weapon&&d.id===b.id));
const all=rows.map(r=>({weapon:r.weapon,id:r.id,mode:r.mode,status:r.result?.state||r.reason||'NO RESULT',
  waves:r.raised,cleared:r.result?.cleared??0,goal:r.expected,shots:r.result?.shots??0,score:r.result?.score??0,
  record:r.recordCount,accepted:r.hitAccepted,rejected:r.hitRejected,
  action:r.result?.reloads?'reload completed':r.result?.draws?'drew after beep':'',source:r.source}));
for(const r of all){
  assert.equal(r.status,'COMPLETED',`${r.weapon}/${r.id} did not complete`);
  assert.equal(r.cleared,r.goal,`${r.weapon}/${r.id} did not clear full goal`);
  assert(r.record>=1,`${r.weapon}/${r.id} did not save a record`);
  assert.equal(r.rejected,0,`${r.weapon}/${r.id} rejected a scored hit`);
  assert.equal(r.waves,RANGE_DRILLS.find(d=>d.weapon===r.weapon&&d.id===r.id).waves,`${r.weapon}/${r.id} missed a wave`);
}
fs.writeFileSync(path.join(dir,'drill-matrix.json'),JSON.stringify(all,null,2));
const lines=['GP-20081 · Training Ground real-renderer drill results','Each line: weapon / drill · cleared/goal · score · shots · record · source'];
for(const [i,r] of all.entries())lines.push(`${String(i+1).padStart(2,'0')}. ${r.weapon}/${r.id} · ${r.cleared}/${r.goal} · score ${r.score} · ${r.shots} shots · record ${r.record}${r.action?' · '+r.action:''} · ${r.source}`);
lines.push(`TOTAL ${all.length}/45 complete, ${all.reduce((n,r)=>n+r.cleared,0)} targets cleared, ${all.reduce((n,r)=>n+r.rejected,0)} rejected scored hits, 45 saved records, zero page errors.`);
fs.writeFileSync(path.join(dir,'drill-matrix.txt'),lines.join('\n')+'\n');
console.log(lines.at(-1));
