const fs=require('fs'),crypto=require('crypto'),assert=require('assert/strict');
const file='index.html',bytes=fs.readFileSync(file),source=bytes.toString('utf8'),hash=b=>crypto.createHash('md5').update(b).digest('hex'),before=hash(bytes),eol=source.includes('\r\n')?'\r\n':'\n';
const edits=[
 ["const tHit = traceTraining(training.tg, rangePrev, p);","const tHit = trainingTraceExact(training.tg, rangePrev, p);   // GT-20105: the dummy's moving surface, as rounds and lasers"],
 ["                  training.char?.add({ ...tHit, size: cSize }, tHit.solid.target != null ? 0.84 : 0.94);","                  if (tHit.solid.dummy) training.dummy?.model?.addMark({ kind: 'scorch', point: tHit.point, normal: tHit.normal });\n                  else training.char?.add({ ...tHit, size: cSize }, tHit.solid.target != null ? 0.84 : 0.94);"],
 ["                  training.char?.add({ ...tHit, size: 0.50 + Math.random() * 0.34 }, 0.74);","                  if (tHit.solid.dummy) training.dummy?.model?.addMark({ kind: 'scorch', point: tHit.point, normal: tHit.normal });\n                  else training.char?.add({ ...tHit, size: 0.50 + Math.random() * 0.34 }, 0.74);"]
];
let out=source;for(let [a,b]of edits){assert.equal(out.split(a).length,2,'unique anchor '+a);out=out.replace(a,()=>b.replace(/\r?\n/g,eol));}
assert.equal(hash(fs.readFileSync(file)),before,'concurrent source write');
const after=hash(Buffer.from(out,'utf8'));assert.equal((out.match(/\r\n/g)||[]).length-(source.match(/\r\n/g)||[]).length,2);
const tmp=file+'.gt20105-'+crypto.randomUUID()+'.tmp';fs.writeFileSync(tmp,out,{flag:'wx'});assert.equal(hash(fs.readFileSync(file)),before);fs.renameSync(tmp,file);
fs.writeFileSync('review/GT-20105/scorch-contact-change.json',JSON.stringify({at:new Date().toISOString(),before,after,edits:edits.length,scope:'only updateFlameStream query and two mark routes; no draw/damage/timing changes',lineEndings:'CRLF'},null,2),{flag:'wx'});
console.log('PASS contact/scorch three guarded replacements '+before+' -> '+after);
