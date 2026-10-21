// Run only after Claude approves the world edit or Jerry explicitly overrides ownership.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
assert(process.argv.includes('--approved'),'explicit owner/Jerry approval required');
const dir='review/range-accuracy-GP19910',plan=JSON.parse(fs.readFileSync(dir+'/patch.json','utf8'));
const fresh=fs.readFileSync(plan.file,'utf8');let result=fresh;
for(const p of plan.patches){assert.equal(result.split(p.oldText).length,2,'unique fresh anchor');result=result.replace(p.oldText,p.newText);}
const tested=fs.readFileSync(dir+'/ballistics.js','utf8').replace("from '../../world/training.js'","from './training.js'");
assert.equal(result,tested,'fresh merge must equal the tested candidate; if not, restage and verify');
assert.equal(fs.readFileSync(plan.file,'utf8'),fresh,'source changed while merging');
fs.writeFileSync(dir+'/live-before.txt',fresh);
fs.writeFileSync(plan.file,result);
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
fs.writeFileSync(dir+'/applied-manifest.json',JSON.stringify({file:plan.file,before:sha(fresh),after:sha(result),edits:plan.patches.length,at:new Date().toISOString()},null,2));
console.log('APPLIED two target-surface edits; byte-identical to verified candidate.');
