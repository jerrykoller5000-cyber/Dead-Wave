import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import * as THREE from "file:///C:/Users/Zero/Desktop/Tiny%20Trek/vendor/three/three.core.js";
import * as before from "file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/weapon-fidelity/sidearms-baseline.mjs";
import * as after from "file:///C:/Users/Zero/Desktop/Tiny%20Trek/studio/weapon-sidearms.js";

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

const snapshot=JSON.parse(fs.readFileSync('review/weapon-fidelity/sidearms-fit-export.json','utf8'));
const V=()=>new THREE.Vector3(),ray=new THREE.Ray(),hit=V();
function triangles(rows){const out=[];for(const row of rows){const m=new THREE.Matrix4().fromArray(row.matrix),P=row.positions,ix=row.indices,n=ix?ix.length:P.length/3;for(let i=0;i<n;i+=3){const vs=[0,1,2].map(j=>{const k=3*(ix?ix[i+j]:i+j);return new THREE.Vector3(P[k],P[k+1],P[k+2]).applyMatrix4(m);});out.push({row,vertices:vs,index:i/3,minX:Math.min(...vs.map(v=>v.x)),maxX:Math.max(...vs.map(v=>v.x)),minY:Math.min(...vs.map(v=>v.y)),maxY:Math.max(...vs.map(v=>v.y))});}}return out;}
function pose(g,matrix){g.matrixAutoUpdate=false;g.matrix.fromArray(matrix);g.updateMatrixWorld(true);return g;}
function meshList(g){const meshes=[];g.traverse(o=>{if(!o.isMesh)return;for(let q=o;q;q=q.parent)if(!q.visible)return;meshes.push(o);});return meshes;}
function points(g,dense=false){const out=[],inv=g.matrixWorld.clone().invert();for(const o of meshList(g)){const P=o.geometry.attributes.position,step=dense?1:Math.max(1,Math.floor(P.count/80));for(let i=0;i<P.count;i+=step){const world=V().fromBufferAttribute(P,i).applyMatrix4(o.matrixWorld);out.push({world,local:world.clone().applyMatrix4(inv),material:o.material.name,vertex:i});}}return out;}
function cast(tris,origin,dir){ray.set(origin,dir);let result=null;for(const t of tris){if(Math.abs(dir.x)<1e-9&&Math.abs(dir.y)<1e-9&&(origin.x<t.minX-1e-8||origin.x>t.maxX+1e-8||origin.y<t.minY-1e-8||origin.y>t.maxY+1e-8))continue;const p=ray.intersectTriangle(...t.vertices,false,hit);if(!p)continue;const dist=p.distanceTo(origin);if(dist>0&&dist<.6&&(!result||dist<result.dist))result={dist,triangle:t.index,color:t.row.color,name:t.row.name,point:p.clone()};}return result;}
function measure(points,tris,dir){const contacts=[];for(const p of points){const t=cast(tris,p.world.clone().addScaledVector(dir,-.25),dir);if(t)contacts.push({gap:t.dist-.25,gunMaterial:p.material,gunVertex:p.vertex,gunWorld:p.world.toArray(),gunLocal:p.local.toArray(),support:{color:t.color,name:t.name,triangle:t.triangle,point:t.point.toArray()}});}contacts.sort((a,b)=>a.gap-b.gap);return{count:points.length,hits:contacts.length,minGap:contacts[0]?.gap,maxPen:Math.max(0,-(contacts[0]?.gap||0)),closest:contacts.slice(0,4)};}
function nearestSurface(g,target){let best=null;for(const o of meshList(g)){const P=o.geometry.attributes.position,ix=o.geometry.index,n=ix?ix.count:P.count;for(let i=0;i<n;i+=3){const vertices=[0,1,2].map(j=>V().fromBufferAttribute(P,ix?ix.array[i+j]:i+j).applyMatrix4(o.matrixWorld)),triangle=new THREE.Triangle(...vertices),world=triangle.closestPointToPoint(target,V()),distance=world.distanceTo(target);if(!best||distance<best.distance)best={distance,world,local:world.clone().applyMatrix4(g.matrixWorld.clone().invert()),material:o.material.name,triangle:vertices.map(v=>v.toArray()),barycentric:triangle.getBarycoord(world,V()).toArray()};}}return best;}
const report=[];
for(const s of snapshot.snapshots){const body=triangles(s.body),dir=new THREE.Vector3(...s.dir),old=pose(before.makeRevolverModel(ctx),s.innerMatrix),next=pose(after.makeRevolverModel(ctx),s.innerMatrix),oldPoints=points(old),newPoints=points(next),row={primary:s.primary,side:s.side,sampledBefore:measure(oldPoints,body,dir),sampledAfter:measure(newPoints,body,dir),denseBefore:measure(points(old,true),body,dir),denseAfter:measure(points(next,true),body,dir)};const near=nearestSurface(next,new THREE.Vector3(...row.denseBefore.closest[0].gunWorld));row.newSurfaceAtOldBestContact={distance:near.distance,local:near.local.toArray(),material:near.material,barycentric:near.barycentric,triangle:near.triangle,contact:measure([near],body,dir)};report.push(row);console.log(JSON.stringify({primary:s.primary,side:s.side,sampledBefore:row.sampledBefore.minGap,sampledAfter:row.sampledAfter.minGap,denseBefore:row.denseBefore.minGap,denseAfter:row.denseAfter.minGap,closestBefore:row.denseBefore.closest[0],closestAfter:row.denseAfter.closest[0],newSurfaceAtOldBestContact:row.newSurfaceAtOldBestContact},null,2));}
fs.writeFileSync('review/weapon-fidelity/sidearms-fit-comparison.json',JSON.stringify({moduleHash:sha(fs.readFileSync('studio/weapon-sidearms.js')),snapshots:report},null,2)+'\n','utf8');
