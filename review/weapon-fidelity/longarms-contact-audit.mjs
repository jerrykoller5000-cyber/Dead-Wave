import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as THREE from '../../vendor/three/three.core.js';
import * as models from '../../studio/weapon-longarms.js';
const source=fs.readFileSync('review/weapon-fidelity/baseline-index.html','utf8');
const extract=n=>{const m=source.match(new RegExp('    function '+n+'\\([^]*?\\n    }'));assert(m,n);return m[0];};
const materials=['gunMetal','gunBody','gunDark','gunMid','gunAccent','woodMat','woodDark','gunPoly','gunRubber','steelMat','brassMat','gunTan','magPoly','glassMat','sightDotMat','gaugeFace','shellRedMat'];
const declarations=materials.map(n=>source.match(new RegExp('    const '+n+' = new THREE.MeshStandardMaterial\\([^\\n]+'))[0]).join('\n');
const helpers=['gunKit','gunBand','gripOutline','gunArc','gunEffects','gunSuppressor','finishGun','mergeRigidMeshes'];
const suppressor=source.match(/    const SUPPRESSOR = \{[\s\S]*?\n    \};/)[0];
async function context(T,uri){
 const code=fs.readFileSync('core/geometry.js','utf8').replace("from 'three'",'from '+JSON.stringify(uri));
 const geom=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
 return new Function('THREE','geom',`const {rbox,slab:profileSlab,lathe:profileLathe,curve:profileCurve,boxProjectUV}=geom;
 const _mgV=new THREE.Vector3(),_mgN=new THREE.Vector3(),_mgNM=new THREE.Matrix3(); const glowMat=m=>m;
 ${declarations}\n${suppressor}\n${helpers.map(extract).join('\n')}
 return {THREE,profileCurve,${materials.join(',')},${helpers.join(',')}};`)(T,geom);
}
const ctx=await context(THREE,new URL('../../vendor/three/three.core.js',import.meta.url).href);
const oldSource=fs.readFileSync('review/weapon-fidelity/longarms-baseline-constructors.js','utf8');
const old=new Function(...Object.keys(ctx),oldSource+'\nreturn {makeM4,makeAk,makeAa12,makeShotgun,makeSniper};')(...Object.values(ctx));
const state=g=>Object.fromEntries(Object.entries(g.userData).map(([k,v])=>[k,v?.isObject3D?{type:v.type,p:v.position.toArray(),r:v.rotation.toArray(),s:v.scale.toArray(),visible:v.visible,name:v.name,userData:v.userData}:v?.toArray?v.toArray():v]));
function stats(g){g.updateMatrixWorld(true);const box=new THREE.Box3();let meshes=0,vertices=0,triangles=0;g.traverse(m=>{if(!m.isMesh)return;for(let o=m;o!==g;o=o.parent)if(!o.visible||o===g.userData.flash||o===g.userData.laser)return;const geom=m.geometry;assert(materials.some(n=>ctx[n]===m.material),'unowned material');for(const a of Object.values(geom.attributes))for(const v of a.array)assert(Number.isFinite(v),'nonfinite attribute');const p=geom.attributes.position;for(let i=0;i<p.count;i++)box.expandByPoint(new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld));meshes++;vertices+=p.count;triangles+=(geom.index?.count||p.count)/3;});return {meshes,vertices,triangles,min:box.min.toArray(),max:box.max.toArray(),length:box.max.z-box.min.z};}

const now=fs.readFileSync('index.html','utf8');
const getObject=n=>new Function('return ('+now.match(new RegExp('    const '+n+' = (\\{[^]*?\\n    \\});'))[1]+');')();
const holds=getObject('WEAPON_HOLD'),sizes=getObject('WEAPON_SIZE');
function points(root){root.updateMatrixWorld(true);let out=[];const inv=root.matrixWorld.clone().invert();root.traverse(o=>{if(!o.isMesh)return;for(let p=o;p!==root;p=p.parent)if(!p.visible||p===root.userData.flash||p===root.userData.laser)return;const a=o.geometry.attributes.position,m=new THREE.Matrix4().multiplyMatrices(inv,o.matrixWorld);for(let i=0;i<a.count;i++)out.push(new THREE.Vector3().fromBufferAttribute(a,i).applyMatrix4(m));});return out;}
function magInfo(g){const mag=g.userData.mag;if(!mag)return null;const p=points(mag),b=new THREE.Box3().setFromPoints(p),foot=new THREE.Vector3((b.min.x+b.max.x)/2,b.min.y,(b.min.z+b.max.z)/2);return {min:b.min.toArray(),max:b.max.toArray(),foot:foot.toArray()};}
const bases={m4:.92,ak:.92,aa12:.9,shotgun:.95,sniper:.88},report={};
for(const kind of ['M4','Ak','Aa12','Shotgun','Sniper']){const key=kind.toLowerCase(),a=old['make'+kind](),b=models['make'+kind+'Model'](ctx),H=holds[key],s=sizes[key],ws=bases[key]*s.m*s.look*(1.655/1.8)/s.len;
const nearest=(g,anchor)=>Math.min(...points(g).map(v=>v.distanceTo(new THREE.Vector3(...anchor))))*ws;
const anchor=H.fore==='pump'?a.userData.pump.position.clone().add(new THREE.Vector3(0,H.pumpDy,0)).toArray():H.fore;
report[key]={gripVertexDistanceBefore:nearest(a,H.grip),gripVertexDistanceAfter:nearest(b,H.grip),foreVertexDistanceBefore:nearest(a,anchor),foreVertexDistanceAfter:nearest(b,anchor),supportLimit:H.fore==='pump'?.03:.035,magBefore:magInfo(a),magAfter:magInfo(b)};
assert(report[key].foreVertexDistanceAfter<report[key].supportLimit,key+' support contact');
if(key==='aa12'){
 const origin=new THREE.Vector3(0,-.2,.36),direction=new THREE.Vector3(0,1,0);
 const hit=new THREE.Raycaster(origin,direction).intersectObject(b,true).find(h=>{
  for(let p=h.object;p!==b;p=p.parent)if(!p.visible||p===b.userData.flash||p===b.userData.laser)return false;
  return true;
 });
 assert(hit,'AA12 exposed grip underside');
 const exposedDistance=hit.point.distanceTo(new THREE.Vector3(...anchor))*ws;
 assert(exposedDistance<report[key].supportLimit,'AA12 exposed surface contact');
 report[key].exposedUnderside={point:hit.point.toArray(),normal:hit.face.normal.toArray(),distanceToAnchor:exposedDistance};
}}
const hash=s=>createHash('sha256').update(s).digest('hex');
report.sourceHash=hash(fs.readFileSync('studio/weapon-longarms.js'));
report.holdTablesUnchanged=['WEAPON_HOLD','WEAPON_SIZE'].every(n=>{
 const pattern=new RegExp('    const '+n+' = (\\{[^]*?\\n    \\});');
 return hash(now.match(pattern)[1])===hash(source.match(pattern)[1]);
});
assert(report.holdTablesUnchanged,'hold/size tables unchanged');
console.log(JSON.stringify(report,null,2));fs.writeFileSync('review/weapon-fidelity/longarms-contact-audit.json',JSON.stringify(report,null,2)+'\n','utf8');
