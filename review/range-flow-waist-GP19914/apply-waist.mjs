import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
const dir='review/range-flow-waist-GP19914',hash=x=>crypto.createHash('sha256').update(x).digest('hex'),p='index.html',fresh=fs.readFileSync(p,'utf8');let next=fresh;
for(const patch of JSON.parse(fs.readFileSync(dir+'/waist-patches.json','utf8'))){assert.equal(next.split(patch.a).length,2,patch.a);next=next.replace(patch.a,patch.b);}
assert(!fs.existsSync('studio/marine-waist.js'),'do not overwrite another owner file');fs.writeFileSync(dir+'/index.fresh-before-apply',fresh);assert.equal(fs.readFileSync(p,'utf8'),fresh);
fs.writeFileSync('studio/marine-waist.js',fs.readFileSync(dir+'/marine-waist.js','utf8'));assert.equal(fs.readFileSync(p,'utf8'),fresh);fs.writeFileSync(p,next);
fs.writeFileSync(dir+'/waist-applied.json',JSON.stringify({approval:'Jerry: Apply the tested waist fix',before:hash(fresh),after:hash(next),helper:hash(fs.readFileSync('studio/marine-waist.js'))},null,2));console.log('Applied three fresh-source waist hooks and tested helper; body/hand/cuff sources untouched.');
