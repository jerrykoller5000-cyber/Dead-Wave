import fs from 'node:fs';import crypto from 'node:crypto';const hash=s=>crypto.createHash('sha256').update(s).digest('hex'),changes=[];
for(const p of ['game/training-containment.js','game/training-containment.test.mjs']){
 const before=fs.readFileSync(p,'utf8');let after=before;
 if(p.endsWith('.test.mjs'))after=after.replace('assert.equal(t.y,floorY+5.6);',"assert.equal(t.y,floorY+(t.wall==='north'?CONTAINMENT.gateHeight:CONTAINMENT.height));");
 else after=after.replace('perWall:1,height:5.6,scale:', 'perWall:1,height:5.6,gateHeight:8.6,scale:').replace('y:floorY+CONTAINMENT.height,home:',"y:floorY+(wall==='north'?CONTAINMENT.gateHeight:CONTAINMENT.height),home:");
 if(after===before)throw Error('anchors missing '+p);if(hash(fs.readFileSync(p,'utf8'))!==hash(before))throw Error('source changed '+p);
 fs.writeFileSync('review/training-gate-turret-GP19888/'+p.split('/').at(-1)+'.before.txt',before,'utf8');fs.writeFileSync(p,after,'utf8');changes.push({file:p,before:hash(before),after:hash(after)});
}fs.writeFileSync('review/training-gate-turret-GP19888/source-proof.json',JSON.stringify(changes,null,2));console.log('Raised only north/gate mount by3m; other three unchanged.');
