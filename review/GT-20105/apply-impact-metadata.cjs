const fs=require('fs'),crypto=require('crypto'),assert=require('assert/strict'),file='index.html';
const buf=fs.readFileSync(file),src=buf.toString('utf8'),hash=x=>crypto.createHash('md5').update(x).digest('hex'),before=hash(buf);
const old='training.impacts?.add(hit)',next='training.impacts?.add(hit, { weapon: p.hitWeapon || currentWeapon, pellets: p.pelletOf || 1 })';
assert.equal(src.split(old).length,3,'exactly the two approved calls');
const out=src.replaceAll(old,next);assert.equal(hash(fs.readFileSync(file)),before,'concurrent index write');
const tmp=file+'.gt20105-'+crypto.randomUUID()+'.tmp';fs.writeFileSync(tmp,out,{flag:'wx'});assert.equal(hash(fs.readFileSync(file)),before);fs.renameSync(tmp,file);
const after=hash(Buffer.from(out,'utf8'));fs.writeFileSync('review/GT-20105/impact-metadata-change.json',JSON.stringify({at:new Date().toISOString(),before,after,replacements:2,scope:'trainingRound/rangeRound optional visual descriptor only',lineEndings:'unchanged CRLF'},null,2),{flag:'wx'});
console.log('PASS two optional visual descriptors '+before+' -> '+after);
