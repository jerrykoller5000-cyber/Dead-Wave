import fs from 'node:fs';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as G from '../../vendor/three/three.core.js';
import {visiblePieces,visibleSurfaceGap} from '../../tools/tests/weapon-seating.js';
assert(process.env.DW_GAME_TEST_TOKEN);
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../../vendor/three/three.core.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const {trimPanelBack,clipArtworkProfile,profileEdgeSplits,clipArtworkUnderside}=await import('../../studio/weapon-longarms.js');
const read=f=>fs.readFileSync(new URL(f,import.meta.url),'utf8');
const ref=JSON.parse(read('visible-repairs/shotgun/clear-pump-stock-before/reference.json')),loader=new G.BufferGeometryLoader(),root=new G.Group();
const parts=ref.parts.map(({p,q,g})=>{const m=new G.Mesh(loader.parse(g));m.position.fromArray(p);m.quaternion.fromArray(q);root.add(m);return m;});
root.scale.fromArray(ref.scale);root.updateMatrixWorld(true);
const [stock,receiver,plate]=parts,old=stock.geometry;
trimPanelBack(G,stock,-1,.03,'z');
if(process.argv.includes('--plate')){
  const ring=stock.geometry.clone(),rotate=(geometry,back)=>{
    for(const a of [geometry.attributes.position,geometry.attributes.normal])for(let i=0;i<a.count;i++){
      const y=a.getY(i),z=a.getZ(i);a.setY(i,back?-z:z);a.setZ(i,back?y:-y);
    }
  };
  rotate(ring,false);
  const joint=-.036+(-.030+.028)/3;
  const profile=[[-.13,.028-3*(-.13+.036)],[joint,.030],[.03,.030]];
  const splitter=profileEdgeSplits;
  const shaped=clipArtworkProfile(G,ring,profile,-1,'z',process.argv.includes('--localized')?splitter:true);
  rotate(shaped,true);shaped.computeBoundingBox();shaped.computeBoundingSphere();
  if(process.argv.includes('--shared')){
    const shared=clipArtworkUnderside(G,stock.geometry.clone(),profile.map(([z,y])=>[z,-y]));
    for(const name of ['position','normal','uv'])assert.deepEqual(shared.attributes[name].array,shaped.attributes[name].array);
    console.log('PASS shared helper preserved all stock vertices, normals and UVs',shared.attributes.position.count);
    shared.dispose();
  }
  stock.geometry=shaped;
}
const now=stock.geometry,closed=visiblePieces(stock,1.8/1.655).map(p=>p.closed);
const gap=visibleSurfaceGap(stock,receiver,1.8/1.655);
console.log('closed',closed,'receiver',gap,'plate',visibleSurfaceGap(stock,plate,1.8/1.655),'triangles',old.attributes.position.count/3,now.attributes.position.count/3);
const s=read('tang-cheek-proof.mjs'),sideSkin=new Function(s.slice(s.indexOf('function sideSkin('),s.indexOf('export function checkTangCheek'))+';return sideSkin;')();
for(const [axis,sign] of [['x',1],['x',-1],['z',1],['z',-1],['y',1],['y',-1]]){
 stock.geometry=old;const a=sideSkin(G,parts,axis,sign);stock.geometry=now;const b=sideSkin(G,parts,axis,sign);
 let lost=0,added=0,maxIn=0,maxOut=0,worst;
 for(let i=0;i<127;i++)for(let j=0;j<149;j++){
  const z=axis==='z'?-.02717+i*.00043:-.03717+i*.00012;
  const h=axis==='y'?-.025113+j*.00034:-.03413+j*.00056;
  const p=a(z,h),q=b(z,h);
  if(!Number.isFinite(p)&&!Number.isFinite(q))continue;if(!Number.isFinite(p)){added++;continue;}if(!Number.isFinite(q)){lost++;continue;}
  if(p-q>maxIn){maxIn=p-q;worst=[z,h,p,q];}maxOut=Math.max(maxOut,q-p);
 }
 console.log(axis,sign,{lost,added,maxIn,maxOut,worst});
}
assert(closed.length===1&&closed[0]&&!gap.penetrating&&gap.upperMm<.02);
