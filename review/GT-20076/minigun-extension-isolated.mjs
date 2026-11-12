import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as G from '../../vendor/three/three.core.js';
import {visiblePieces,visibleSurfaceGap} from '../../tools/tests/weapon-seating.js';
import {minigunSidePanelGeometry} from '../../studio/weapon-minigun-panel.js';
import {sideSkin} from './side-skin.mjs';

assert(process.env.DW_GAME_TEST_TOKEN);
const read=file=>JSON.parse(fs.readFileSync(new URL('visible-repairs/minigun/'+file,import.meta.url),'utf8'));
const base=read('clear-minigun-panel-before/reference.json');
const extension=read('minigun-panel-detail/extension-reference.json');
const extra=read('clear-minigun-panel-after/trim5-drum-extended-neck.json');
const loader=new G.BufferGeometryLoader();
const root=new G.Group(),parts=new Map();
for(const {name,p,q,scale,g} of [...base.parts,...extension]){
  const mesh=new G.Mesh(loader.parse(g));
  mesh.position.fromArray(p);mesh.quaternion.fromArray(q);mesh.scale.fromArray(scale);
  parts.set(name,mesh);root.add(mesh);
}
const upper=parts.get('trim5'),plate=parts.get('plate'),lower=parts.get('trim6');
function skin({vertices,indices}){
  const rows=indices.map(i=>vertices[i]),geometry=new G.BufferGeometry();
  for(const [name,start,n] of [['position',0,3],['normal',3,3],['uv',6,2]]){
    geometry.setAttribute(name,new G.Float32BufferAttribute(rows.flatMap(row=>row.slice(start,start+n)),n));
  }
  return geometry;
}
const trial=skin(extra);
function surfaces(){
  root.updateMatrixWorld(true);
  return base.parts.map(({name})=>{
    const m=parts.get(name);return {position:new G.Vector3(),geometry:m.geometry.clone().applyMatrix4(m.matrixWorld)};
  });
}
const original=surfaces();
plate.geometry=minigunSidePanelGeometry(G);lower.geometry=minigunSidePanelGeometry(G,'lowerStrip');
upper.geometry=trial;
const updated=surfaces();
const profiles={};
for(const axis of ['x','y','z'])for(const sign of [-1,1]){
  const a=sideSkin(G,original,axis,sign),b=sideSkin(G,updated,axis,sign);
  const range=axis==='x'?[-.185,.12,-.183,.081]:axis==='y'?[-.185,.12,.080,.222]:[.080,.222,-.183,.081];
  let lost=0,added=0,maxDepth=0,over=0;
  for(let i=0;i<95;i++)for(let j=0;j<89;j++){
    const v=range[0]+(range[1]-range[0])*(i+.31)/95,w=range[2]+(range[3]-range[2])*(j+.27)/89;
    const prev=a(v,w),cur=b(v,w);
    if(Number.isFinite(prev)&&Number.isFinite(cur)){
      maxDepth=Math.max(maxDepth,Math.abs(prev-cur));if(Math.abs(prev-cur)>.00001)over++;
    }else if(Number.isFinite(prev))lost++;
    else if(Number.isFinite(cur))added++;
  }
  profiles[axis+sign]={lost,added,maxDepth,over};
}
root.scale.fromArray(base.scale);root.updateMatrixWorld(true);
const shell=visiblePieces(upper),neck=parts.get('extended-neck');
console.log('upper strip',shell.map(p=>({closed:p.closed,faces:p.faces.length})),
 'contact with extended neck',visibleSurfaceGap(upper,neck,1.8/1.655),'profiles',profiles);
assert(shell.length&&shell.every(p=>p.closed));
assert(!visibleSurfaceGap(upper,neck,1.8/1.655).penetrating);
assert(Object.values(profiles).every(p=>p.lost+p.added+p.over===0));
