import fs from 'node:fs';
import assert from 'node:assert/strict';
import {makeCaveGuardianRig,guardianGallop,guardianStand,guardianGrip} from '../../world/cave-guardian.js';
const rows=[];
for(const kind of ['guardian','caveguard']){
 const g=makeCaveGuardianRig({conceptKind:kind}),R=g.userData.rig;assert.equal(R.eyes.length,kind==='guardian'?4:2);
 let tris=0,draws=0;g.traverse(o=>{if(o.isMesh){draws++;tris+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;assert([...o.geometry.attributes.position.array].every(Number.isFinite));}});
 for(let i=0;i<120;i++){
   guardianGallop(g,R,i/120*Math.PI*2,1,i/60,null);guardianGrip(R,'L',(i%30)/30);guardianGrip(R,'R',1-(i%30)/30);g.updateMatrixWorld(true);
   g.traverse(o=>assert(o.matrixWorld.elements.every(Number.isFinite),kind+' finite animated joint'));
 }
 guardianStand(g,R,0,null,{open:.7});rows.push({kind,tris,draws,eyeCount:R.eyes.length,poses:120});
 console.log('PASS '+kind+': 120 gallop/hand poses, '+tris+' triangles / '+draws+' draws');
}
fs.writeFileSync('review/zombie-sweep-GP19922/guardian-report.json',JSON.stringify(rows,null,2));
