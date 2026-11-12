import fs from 'node:fs';import assert from 'node:assert/strict';
const names=['batch1','batch2','batch3'],rows=[];
for(const batch of names){
 const s=fs.readFileSync(new URL(batch+'.txt',import.meta.url),'utf8');
 let cur;
 for(const line of s.split(/\r?\n/)){
  const m=line.match(/^(ok\s+|FAIL\s+)(t\w+)\s+(\d+) pass\s+(\d+) fail\s+([\d.]+)s/);
  if(m){cur={test:m[2],pass:+m[3],fail:+m[4],seconds:+m[5],batch,firstFail:null};rows.push(cur);}
  else if(cur&&!cur.firstFail&&line.trim().startsWith('FAIL '))cur.firstFail=line.trim();
 }
}
assert.equal(rows.length,13);const totals=rows.reduce((a,r)=>({pass:a.pass+r.pass,fail:a.fail+r.fail}),{pass:0,fail:0});
const a=JSON.parse(fs.readFileSync(new URL('batch1-early.json',import.meta.url))),b=JSON.parse(fs.readFileSync(new URL('batch3-end.json',import.meta.url)));
const changed=Object.keys(a.hashes).filter(p=>a.hashes[p]!==b.hashes[p]);assert.equal(changed.length,0);
const data={totals,testFiles:rows.length,greenFiles:rows.filter(r=>r.fail===0).length,redFiles:rows.filter(r=>r.fail>0).length,recordedStartUtc:a.utc,endUtc:b.utc,sourceAndTestFilesUnchanged:changed.length===0,rows};
fs.writeFileSync(new URL('summary.json',import.meta.url),JSON.stringify(data,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(data,null,2));
