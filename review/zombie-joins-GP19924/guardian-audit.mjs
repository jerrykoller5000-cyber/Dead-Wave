import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import assert from 'node:assert/strict';import * as T from '../../vendor/three/three.core.js';
import {makeCaveGuardianRig,guardianGallop,guardianStand,guardianGrip} from '../../world/cave-guardian.js';
const dir='review/zombie-joins-GP19924',manifest=JSON.parse(fs.readFileSync(dir+'/baseline/manifest.json','utf8'));
function url(p){const raw=manifest[p]?fs.readFileSync(dir+'/baseline/'+manifest[p].file,'utf8'):fs.readFileSync(p,'utf8');return 'data:text/javascript;base64,'+Buffer.from(raw.replace(/from\s+(['"])([^'"]+)\1/g,(a,q,s)=>{if(!s.startsWith('.'))return a;const dep=path.posix.normalize(path.posix.join(path.posix.dirname(p),s));return 'from '+q+(manifest[dep]?url(dep):pathToFileURL(path.resolve(dep)).href)+q;})).toString('base64');}
const original=await import(url('world/cave-guardian.js'));
function metrics(g){let tris=0,draws=0;g.traverseVisible(o=>{if(o.isMesh){draws++;tris+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}});return {tris,draws};}
const report=[];
for(const kind of ['guardian','caveguard']){
 const before=original.makeCaveGuardianRig({conceptKind:kind}),after=makeCaveGuardianRig({conceptKind:kind}),r=after.userData.rig,row={kind,before:metrics(before),after:metrics(after),poses:120};
 assert(row.after.draws<row.before.draws);assert(row.after.tris<=row.before.tris*1.02,'socket geometry stays within 2% of the existing Guardian body');assert(r.eyes.every(e=>e.visible));assert(after.userData.zombieJoinSkins.length);
 for(let i=0;i<120;i++){
  for(const [g,f] of [[before,original],[after,{guardianGallop,guardianGrip}]]){f.guardianGallop(g,g.userData.rig,i/120*Math.PI*2,1,i/60,null);f.guardianGrip(g.userData.rig,'L',(i%30)/30);f.guardianGrip(g.userData.rig,'R',1-(i%30)/30);g.updateMatrixWorld(true);}
  const a=before.userData.rig.joints,b=r.joints;assert.equal(a.length,b.length);for(let j=0;j<a.length;j++)assert(a[j].matrixWorld.elements.every((v,k)=>Math.abs(v-b[j].matrixWorld.elements[k])<1e-9),'pose contract unchanged');
  for(const mesh of after.userData.zombieJoinSkins){mesh.skeleton.update();const P=mesh.geometry.attributes.position,W=mesh.geometry.attributes.skinWeight,v=new T.Vector3();for(let j=0;j<P.count;j+=29){mesh.getVertexPosition(j,v);assert([v.x,v.y,v.z].every(Number.isFinite));assert(v.length()<8);assert(Math.abs(W.getX(j)+W.getY(j)-1)<1e-6);}}
 }
 guardianStand(after,r,0,null,{open:.7});report.push(row);console.log('PASS '+JSON.stringify(row));
}
fs.writeFileSync(dir+'/guardian-report.json',JSON.stringify(report,null,2));
