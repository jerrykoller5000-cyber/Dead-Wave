import fs from 'node:fs';
let p='review/headshots-GP19885/performance.mjs',s=fs.readFileSync(p,'utf8');
s=s.replace('T.fireRoundDbg(p.x,p.y,p.z+2,0,0,-1,3,100,0);nextShot','const rnd=Math.random;Math.random=()=>.99;try{T.fireRoundDbg(p.x,p.y,p.z+2,0,0,-1,3,100,0);for(let j=0;j<7;j++)T.stepProjectilesDbg(.012);}finally{Math.random=rnd;}nextShot');fs.writeFileSync(p,s,'utf8');
p='review/headshots-GP19885/check.mjs';s=fs.readFileSync(p,'utf8').replace('assert.equal(proof.pierce.head,1);','assert.equal(proof.pierce.head,1);assert.equal(proof.exposed.head,1);assert.equal(proof.helmet.head,0);for(const p of proof.poses)assert.equal(p.head,1,p.k+"posed");').replace("!['military','screamer'].includes(p.k)","p.k!=='screamer'");fs.writeFileSync(p,s,'utf8');
