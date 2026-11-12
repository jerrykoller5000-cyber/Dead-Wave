import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as G from '../../vendor/three/three.core.js';
import {visiblePieces,visibleSurfaceGap} from '../../tools/tests/weapon-seating.js';
assert(process.env.DW_GAME_TEST_TOKEN);
const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8'));
const cut=(process.argv[2]||'lower');assert(/^[a-z-]+$/.test(cut));
const path=process.argv.includes('--pump-grip-web')?'visible-repairs/shotgun/clear-pump-grip-web':process.argv.includes('--minigun-panel')?'visible-repairs/minigun/clear-minigun-panel':'visible-repairs/ak/clear-kr-band';
const ref=read(path+'-before/reference.json'),baked=read(path+'-after/trim-'+cut+'.json');
const root=new G.Group(),loader=new G.BufferGeometryLoader();
const parts=ref.parts.map(({g,p,q,scale})=>{const geo=g.type==='BoxGeometry'?G.BoxGeometry.fromJSON(g):loader.parse(g);const m=new G.Mesh(geo);m.position.fromArray(p);m.quaternion.fromArray(q);m.scale.fromArray(scale);root.add(m);return m;});
root.scale.fromArray(ref.scale);root.updateMatrixWorld(true);
const [band,...rest]=parts,old=band.geometry,values=baked.indices.map(i=>baked.vertices[i]);
const skin=new G.BufferGeometry();for(const [name,start,size] of [['position',0,3],['normal',3,3],['uv',6,2]]){
 const attr=values.flatMap(v=>v.slice(start,start+size));assert(attr.every(Number.isFinite));skin.setAttribute(name,new G.Float32BufferAttribute(attr,size));
}
band.geometry=skin;
const cells=visiblePieces(band,1.8/1.655),gaps=rest.map(m=>visibleSurfaceGap(band,m,1.8/1.655));
console.log(cut,'triangles',values.length/3,'closed',cells.map(c=>c.closed),'contacts',gaps);
for(const cell of cells.filter(c=>!c.closed)){
 const edges=new Map();for(const face of cell.faces)for(let i=0;i<3;i++){
  const j=(i+1)%3,k=[face.ids[i],face.ids[j]].sort((a,b)=>a-b).join(',');
  const e=edges.get(k)||{n:0,p:[face.p[i],face.p[j]].map(v=>band.worldToLocal(v.clone().multiplyScalar(1.655/1.8)).toArray().map(x=>+x.toFixed(8)))};
  e.n++;edges.set(k,e);
 }
 const bad=[...edges.values()].filter(e=>e.n!==2);console.log('bad edges',bad.length,JSON.stringify(bad.slice(0,7)));
}
assert(cells.length===1&&cells[0].closed&&!gaps[0].penetrating&&gaps[0].upperMm<.02);
for(const name of cut.split('-'))assert(!gaps[ref.parts.findIndex(p=>p.name===name)-1].penetrating,name);
if(process.argv.includes('--minigun-panel')&&process.argv.includes('--strips')){
  const {minigunSidePanelGeometry}=await import('../../studio/weapon-minigun-panel.js');
  for(const [name,id] of [['upperStrip','trim5'],['lowerStrip','trim6']]){
    const strip=parts[ref.parts.findIndex(p=>p.name===id)];
    strip.geometry=minigunSidePanelGeometry(G,name);
    const islands=visiblePieces(strip);
    for(const cell of islands){
      const geo=new G.BufferGeometry();
      geo.setAttribute('position',new G.Float32BufferAttribute(cell.faces.flatMap(face=>face.p.flatMap(v=>v.toArray())),3));
      const mesh=new G.Mesh(geo),seat=visibleSurfaceGap(mesh,band,1.8/1.655),drum=visibleSurfaceGap(mesh,rest[0],1.8/1.655);
      console.log(name,cell.faces.length,'faces','closed',cell.closed,'seat',seat,'drum',drum);
      assert(cell.closed&&!seat.penetrating&&seat.upperMm<.02&&!drum.penetrating);
      geo.dispose();
    }
  }
}
