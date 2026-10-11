import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import * as Real from '../../vendor/three/three.core.js';
import * as Fake from '../../tools/tests/fakethree.mjs';
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const current=fs.readFileSync('index.html','utf8'), baseline=fs.readFileSync('review/weapon-fidelity/baseline-index.html','utf8');
const fn=(s,n)=>s.match(new RegExp('    function '+n+'\\([^\\n]*\\) \\{[\\s\\S]*?\\n    \\}'))?.[0];
const cloneLean=new Function('const _cloneLeanEmpty=Object.freeze({});'+fn(current,'cloneLean')+';return cloneLean;')();
const result={at:new Date().toISOString(),scope:'Read-only CPU diagnosis; no browser or production/test edits.',hashes:Object.fromEntries(['index.html','studio/weapon-sidearms.js','tools/tests/fakethree.mjs','tools/tests/t146.js','tools/tests/t196.js','tools/tests/t218.js'].map(p=>[p,sha(p)])),fakeThreeMtime:fs.statSync('tools/tests/fakethree.mjs').mtime.toISOString(),probes:{}};
for(const [name,T] of [['actualThree',Real],['fakeThree',Fake]]) {
 const geometry=new T.BoxGeometry(.05,.12,.06),material=new T.MeshStandardMaterial({color:0x333333}),mesh=new T.Mesh(geometry,material);
 material.name='furniture:uzi';material.map={image:{width:1,height:1}};
 const old=mesh.clone(true),lean=cloneLean(mesh);
 const info=o=>({sameGeometry:o.geometry===geometry,sameMaterial:o.material===material,positionVertices:o.geometry.attributes.position?.count||0,camoIdentity:o.material===material&&!!o.material.map});
 let limbBox;try{new T.Box3().copy(new T.Box3(new T.Vector3(-1,-1,-1),new T.Vector3(1,1,1))).applyMatrix4(new T.Matrix4());limbBox='PASS';}catch(e){limbBox=e.name+': '+e.message;}
 const emptySeat=(o)=>{const p=o.geometry.attributes.position;const lo=[1e9,1e9,1e9],hi=[-1e9,-1e9,-1e9];if(p)for(let i=0;i<p.count;i++){const v=[p.getX(i),p.getY(i),p.getZ(i)];for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],v[k]);hi[k]=Math.max(hi[k],v[k]);}}return [(lo[0]+hi[0])/2,lo[1],(lo[2]+hi[2])/2];};
 result.probes[name]={oldClone:info(old),currentCloneLean:info(lean),limbBox,cloneSeatSample:emptySeat(lean)};
}
assert.equal(result.probes.actualThree.currentCloneLean.sameMaterial,true);
assert.equal(result.probes.actualThree.currentCloneLean.sameGeometry,true);
assert.equal(result.probes.fakeThree.oldClone.sameMaterial,true);
assert.equal(result.probes.fakeThree.oldClone.sameGeometry,true);
assert.equal(result.probes.fakeThree.currentCloneLean.sameMaterial,false);
assert.equal(result.probes.fakeThree.currentCloneLean.positionVertices,0);
assert.equal(result.probes.fakeThree.cloneSeatSample[1],1e9);
assert.match(result.probes.fakeThree.limbBox,/applyMatrix4 is not a function/);
result.baselineComparison=Object.fromEntries(['spawnLimbPiece','cloneLean','reloadLocalBox','reloadMagFoot','reloadWellWorld','reloadPouchWorld','akimboReloadAnchor','akimboReloadDip','syncDualWeaponParts','registerGunFurniture','dressGuns'].map(n=>[n,{baselinePresent:!!fn(baseline,n),currentPresent:!!fn(current,n),unchanged:fn(baseline,n)===fn(current,n)}]));
result.diagnosis={t196:'All nine blade assertions precede t196.js:55 killZombie. Current CL-136 spawnLimbPiece index.html:13420/13433 uses Box3.applyMatrix4; FakeThree Box3 at lines 534-552 lacks this method. Baseline uses Box3.setFromObject, supported by FakeThree. Sidearm code is not in this exception path.',t146:'t146.js:75 requires the offhand Uzi mesh to share a registered furniture material. CL-136 cloneLean index.html:13409 uses new obj.constructor().copy(obj,false); FakeThree Mesh (line 348) inherits transform-only Object3D.copy (line 342), dropping geometry/material. Baseline index.html:19017 uses clone(true), whose FakeThree method preserves both (lines 335-340). The standalone reproduction fails with an ordinary BoxGeometry, independent of weapon constructors.',t218:'The same empty offhand mesh makes seatOf t218.js:49 retain lo.y=1e9. Its nearest pouch result is capped by the [9,9] sentinel at line 130, explaining the reported 9.000 m. Reload bounds/foot/pouch/akimbo helper functions are identical to baseline, and existing sidearms-audit.json establishes bit-identical Pistol/Uzi magazines. Exact second npm failure line was not retained by summary-only runner; not invented here.',realRenderer:'Existing before-t218.txt and after-t218.txt each contain 66 PASS and no FAIL; after pistol akimbo pouch line reports 0.000 / 0.000 m. Actual Three reproduction preserves geometry/material and supports Box3.applyMatrix4.',action:'No cosmetic or test expectation change warranted. Harness owner needs equivalent Mesh.copy and Box3.applyMatrix4 support for the current CL-136 source. Sidearm materials remain original context identities; no shared material/prototype mutation found.'};
result.realReload=Object.fromEntries(['before','after'].map(x=>{const text=fs.readFileSync('review/weapon-fidelity/'+x+'-t218.txt','utf8');return[x,{pass:(text.match(/^PASS /gm)||[]).length,fail:(text.match(/^FAIL /gm)||[]).length,pistolPouch:text.split(/\r?\n/).find(l=>l.includes('pistol akimbo: each gun\'s well'))}];}));
result.result='DIAGNOSIS REPRODUCED';
fs.writeFileSync('review/weapon-fidelity/sidearms-harness-diagnosis.json',JSON.stringify(result,null,2)+'\n','utf8');
console.log(JSON.stringify({result:result.result,probes:result.probes,realReload:result.realReload},null,2));