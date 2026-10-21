import fs from 'node:fs';
import assert from 'node:assert/strict';
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
const proof={scope:'Actual Three CPU geometry, original core helpers and merge. No browser or visual claim.',weapons:{}};
for(const kind of ['M4','Ak','Aa12','Shotgun','Sniper']){
 const a=old['make'+kind](),b=models['make'+kind+'Model'](ctx);
 assert.deepEqual(state(b),state(a),kind+' moving contracts');
 const before=stats(a),after=stats(b);assert(Math.abs(after.length/before.length-1)<.005,kind+' length');
 const time=fn=>{const samples=[];for(let i=0;i<3;i++){const t=performance.now();fn();samples.push(performance.now()-t);}return samples.sort((a,b)=>a-b)[1];};
 proof.weapons[kind]={before,after,contractsIdentical:true,medianBuildMs:{before:time(()=>old['make'+kind]()),after:time(()=>models['make'+kind+'Model'](ctx))}};
}
const moduleSource=fs.readFileSync('studio/weapon-longarms.js','utf8');
const sleeveSource=moduleSource.match(/function ventedSleeve\([^]*?\n}/)[0];
const sleeve=new Function('return ('+sleeveSource+');')();
const sleeveCases=[{z0:.21,z1:.582,radius:.047,wall:.005,y:.02,faces:12,slots:[[.238,.286],[.309,.357],[.38,.428],[.451,.499],[.522,.56]],ventFaces:[0,1,5,6,7,9,11]}, {z0:.448,z1:.789,radius:.045,wall:.004,y:.015,faces:12,slots:[[.467,.496],[.519,.548],[.571,.6],[.623,.652],[.675,.704],[.727,.756]],ventFaces:[0,1,2,4,5,6,7,8,10,11]}];
proof.sleeveFacesChecked=[];
for(const o of sleeveCases){
const mesh=sleeve(THREE,new THREE.Group(),ctx.gunMid,o),p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal,step=Math.PI*2/o.faces;
function inside(v){const x=v.x,y=v.y-o.y,z=v.z;if(z<=o.z0||z>=o.z1)return false;let f=Math.round(Math.atan2(y,x)/step);f=(f+o.faces)%o.faces;const a=f*step,radial=x*Math.cos(a)+y*Math.sin(a),edge=Math.cos(step/2);if(radial>=o.radius*edge||radial<=(o.radius-o.wall)*edge)return false;const tangent=-x*Math.sin(a)+y*Math.cos(a),t=(tangent/(radial*Math.tan(step/2))+1)/2;if(o.ventFaces.includes(f)&&t>.2&&t<.8&&o.slots.some(([a,b])=>z>a&&z<b))return false;return true;}
let facesChecked=0;for(let i=0;i<p.count;i+=3){const c=new THREE.Vector3();for(let j=0;j<3;j++)c.add(new THREE.Vector3().fromBufferAttribute(p,i+j));c.multiplyScalar(1/3);const normal=new THREE.Vector3().fromBufferAttribute(n,i);assert(Math.abs(normal.length()-1)<1e-5,'nonunit sleeve normal');const eps=1e-6;assert(inside(c.clone().addScaledVector(normal,-eps))&&!inside(c.clone().addScaledVector(normal,eps)),'sleeve winding face '+i/3);facesChecked++;}proof.sleeveFacesChecked.push(facesChecked);
}
const Fake=await import('../../tools/tests/fakethree.mjs');const fakeCtx=await context(Fake,new URL('../../tools/tests/fakethree.mjs',import.meta.url).href);for(const kind of ['M4','Ak','Aa12','Shotgun','Sniper'])assert(models['make'+kind+'Model'](fakeCtx).isObject3D);proof.fakeThreeBuilds=5;
proof.result='PASS';fs.writeFileSync('review/weapon-fidelity/longarms-audit.json',JSON.stringify(proof,null,2)+'\n','utf8');console.log(JSON.stringify(proof,null,2));
