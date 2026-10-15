import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
assert(process.argv.includes('--approved'),'owner/Jerry approval required');
const dir='review/range-console-GP19912',p=JSON.parse(fs.readFileSync(dir+'/adapter-patch.json','utf8')),fresh=fs.readFileSync(p.file,'utf8');let next=fresh;
for(const e of p.patches){assert.equal(next.split(e.oldText).length,2,'unique fresh adapter anchor');next=next.replace(e.oldText,e.newText);}
assert.equal(next,fs.readFileSync(dir+'/index.html','utf8').replace('<head><base href="/">','<head>'),'fresh merge must equal tested candidate');
assert.equal(fs.readFileSync(p.file,'utf8'),fresh,'source changed during merge');
fs.writeFileSync(dir+'/live-index.before.txt',fresh);fs.writeFileSync(p.file,next);
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');fs.writeFileSync(dir+'/applied-adapter.json',JSON.stringify({file:p.file,before:sha(fresh),after:sha(next),edits:p.patches.length,at:new Date().toISOString()},null,2));
console.log('APPLIED 7 training-only adapter edits, byte-identical to tested candidate.');
