import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
const dir='review/range-polish-GP19913',hash=s=>crypto.createHash('sha256').update(s).digest('hex'),p='index.html',fresh=fs.readFileSync(p,'utf8'),patches=JSON.parse(fs.readFileSync(dir+'/patches.json','utf8'));
let result=fresh;for(const patch of patches){assert.equal(result.split(patch.a).length,2,patch.a);result=result.replace(patch.a,patch.b);}
const helper='combat/training-grenades.js';assert(!fs.existsSync(helper),'never overwrite an existing owner file');
fs.writeFileSync(dir+'/index.fresh-before-apply',fresh);assert.equal(hash(fs.readFileSync(p,'utf8')),hash(fresh));
fs.mkdirSync('combat',{recursive:true});fs.writeFileSync(helper,fs.readFileSync(dir+'/training-grenades.js','utf8'));assert.equal(hash(fs.readFileSync(p,'utf8')),hash(fresh));fs.writeFileSync(p,result);
fs.writeFileSync(dir+'/applied.json',JSON.stringify({approved:'Jerry: Apply the tested grenade fence fix',hooks:4,before:hash(fresh),after:hash(result),helper:hash(fs.readFileSync(helper))},null,2));
console.log('Applied four fresh-source grenade hooks and the byte-identical tested helper.');
