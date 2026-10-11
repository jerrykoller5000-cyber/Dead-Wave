import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import * as THREE from '../../vendor/three/three.core.js';
import * as before from './sidearms-baseline.mjs';
import * as after from '../../studio/weapon-sidearms.js';

const source = fs.readFileSync('index.html', 'utf8');
const sha = data => createHash('sha256').update(data).digest('hex');
const extract = name => {
  const m = source.match(new RegExp('    function ' + name + '\\([^\\n]*\\) \\{[\\s\\S]*?\\n    \\}'));
  assert(m, 'Missing helper ' + name); return m[0];
};
const coreSource = fs.readFileSync('core/geometry.js', 'utf8').replace("from 'three'", 'from ' + JSON.stringify(pathToFileURL(path.resolve('vendor/three/three.core.js')).href));
const geom = await import('data:text/javascript;base64,' + Buffer.from(coreSource).toString('base64'));
const materials = ['gunMetal', 'gunBody', 'gunDark', 'gunMid', 'gunAccent', 'woodMat', 'woodDark', 'bladeMat', 'gunPoly', 'gunRubber', 'steelMat', 'brassMat', 'magPoly', 'glassMat', 'sightDotMat', 'gaugeFace', 'edgeMat', 'gloveMat'];
const declarations = materials.map(n => {
  const m = source.match(new RegExp('    const ' + n + ' = new THREE.MeshStandardMaterial\\([^\\n]+'));
  assert(m, 'Material declaration missing ' + n); return m[0];
}).join('\n');
const helpers = ['gunKit', 'gunBand', 'gripOutline', 'gunArc', 'gunEffects', 'gunSuppressor', 'finishGun', 'mergeRigidMeshes'];
const suppressor = source.match(/    const SUPPRESSOR = \{[\s\S]*?\n    \};/)[0];
const makeContext = new Function('THREE', 'geom', `
  const {rbox, slab:profileSlab, lathe:profileLathe, boxProjectUV}=geom;
  const _mgV=new THREE.Vector3(),_mgN=new THREE.Vector3(),_mgNM=new THREE.Matrix3();
  const glowMat=m=>m;
  ${declarations}\n${suppressor}\n${helpers.map(extract).join('\n')}
  return {THREE,${materials.join(',')},${helpers.join(',')}};
`);
const ctx = makeContext(THREE, geom);
for (const m of materials) ctx[m].name = m;
const privateSource = fs.readFileSync('studio/weapon-sidearms.js', 'utf8') + '\nexport {checkeredPanel,groundBlade,flutedCylinder};';
const privateHelpers = await import('data:text/javascript;base64,'+Buffer.from(privateSource).toString('base64'));
const winding = (root, rule) => {
  let count=0;
  root.traverse(mesh=>{
    if(!mesh.isMesh)return;
    const g=mesh.geometry,p=g.attributes.position,ix=g.index?.array,n=g.attributes.normal;
    const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),normal=new THREE.Vector3(),centroid=new THREE.Vector3();
    for(let i=0;i<(ix?.length||p.count);i+=3){
      const ids=[ix?ix[i]:i,ix?ix[i+1]:i+1,ix?ix[i+2]:i+2];
      a.fromBufferAttribute(p,ids[0]);b.fromBufferAttribute(p,ids[1]);c.fromBufferAttribute(p,ids[2]);
      normal.copy(b).sub(a).cross(c.clone().sub(a));if(normal.lengthSq()<1e-20)continue;
      centroid.copy(a).add(b).add(c).multiplyScalar(1/3);
      const avg=new THREE.Vector3();for(const id of ids)avg.add(new THREE.Vector3().fromBufferAttribute(n,id));
      assert(normal.dot(avg)>0,'normal contradicts triangle winding');
      assert(rule(normal,centroid),'custom surface faces inward');count++;
    }
  });return count;
};
const customWinding={};
for(const side of[-1,1]){const g=new THREE.Group();privateHelpers.checkeredPanel(THREE,g,ctx.gunPoly,[[0,0],[.05,0],[.05,.05],[0,.05]],side*.03);customWinding['checkered'+side]=winding(g,n=>n.x*side>0);}
{
  const g=new THREE.Group();privateHelpers.flutedCylinder(THREE,g,ctx.steelMat);
  customWinding.flutedCylinder=winding(g,(n,p)=>Math.abs(n.z)>Math.hypot(n.x,n.y)*100 ? n.z*p.z>0 : n.x*p.x+n.y*p.y>0);
}
{
  const g=new THREE.Group();privateHelpers.groundBlade(THREE,g,ctx.bladeMat,ctx.edgeMat,[[.04,.016,-.018,0],[.08,.016,-.018,1],[.24,.016,-.018,1],[.26,.016,-.018,0],[.31,.011,-.016,0],[.382,-.002,-.002,0]]);
  customWinding.groundBlade=winding(g,(n,p)=>Math.abs(n.z)>Math.hypot(n.x,n.y)*100 ? (p.z<.05?n.z<0:true) : Math.abs(n.x)>1e-12 ? n.x*p.x>=0 : true);
}
const visibleMeshes = root => {
  const result = [], skip = new Set([root.userData.flash, root.userData.laser, root.userData.suppressor].filter(Boolean));
  root.updateMatrixWorld(true);
  root.traverse(o => {
    if (!o.isMesh) return;
    for (let q = o; q && q !== root; q = q.parent) if (!q.visible || skip.has(q)) return;
    if (skip.has(o)) return; result.push(o);
  }); return result;
};
const geometryInfo = root => {
  const box = new THREE.Box3(), tmp = new THREE.Vector3(), inv = root.matrixWorld.clone().invert();
  let vertices = 0, triangles = 0;
  const meshes = visibleMeshes(root);
  for (const mesh of meshes) {
    const g = mesh.geometry, m = new THREE.Matrix4().multiplyMatrices(inv, mesh.matrixWorld);
    for (const a of Object.values(g.attributes)) for (const x of a.array) assert(Number.isFinite(x), 'nonfinite geometry');
    for (let i = 0; i < g.attributes.position.count; i++) box.expandByPoint(tmp.fromBufferAttribute(g.attributes.position, i).applyMatrix4(m));
    vertices += g.attributes.position.count; triangles += (g.index?.count || g.attributes.position.count) / 3;
    assert(materials.some(k => ctx[k] === mesh.material), 'material escaped existing customization palette');
  }
  return {bounds:{min:box.min.toArray(),max:box.max.toArray()},length:box.max.z-box.min.z,meshes:meshes.length,vertices,triangles};
};
const state = gun => Object.fromEntries(Object.entries(gun.userData).map(([k,v]) => [k, v?.isObject3D ? {type:v.type,position:v.position.toArray(),rotation:v.rotation.toArray(),scale:v.scale.toArray(),visible:v.visible,name:v.name} : v?.toArray ? v.toArray() : v]));
const geometryHash = root => {const parts=[];root.traverse(o=>{if(o.isMesh)parts.push(o.geometry.attributes.position.array);});return sha(Buffer.concat(parts.map(p=>Buffer.from(p.buffer,p.byteOffset,p.byteLength))));};
const proof = {scope:'Actual Three CPU construction and original core geometry/merge helpers; no browser or image claim.',moduleHash:sha(fs.readFileSync('studio/weapon-sidearms.js')),customWinding,results:[]};
for (const kind of ['Pistol','Revolver','Uzi','Knife']) {
  const old = before['make'+kind+'Model'](ctx), current = after['make'+kind+'Model'](ctx);
  assert.deepEqual(state(current),state(old),kind+' animation/userData contract changed');
  const variants = kind === 'Knife' ? ['knifeModel','macheteModel'] : [null];
  for (const variant of variants) {
    const a=variant?old.userData[variant]:old,b=variant?current.userData[variant]:current;
    const base=geometryInfo(a),next=geometryInfo(b),lengthChange=(next.length/base.length-1);
    assert(Math.abs(lengthChange)<.005,kind+' authored overall length changed');
    proof.results.push({kind:variant||kind,before:base,after:next,lengthChange,animationContractIdentical:true});
  }
  if(kind==='Pistol'||kind==='Uzi')assert.equal(geometryHash(old.userData.mag),geometryHash(current.userData.mag),kind+' magazine fit changed');
}
proof.result='PASS';fs.writeFileSync('review/weapon-fidelity/sidearms-audit.json',JSON.stringify(proof,null,2)+'\n','utf8');
console.log(JSON.stringify(proof,null,2));
