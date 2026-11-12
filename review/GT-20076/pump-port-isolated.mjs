// Diagnose the two native display meshes without booting the match or a renderer.
import fs from 'node:fs';
import * as G from '../../vendor/three/three.core.js';
import {visiblePieces,visibleSurfaceGap} from '../../tools/tests/weapon-seating.js';

import assert from 'node:assert/strict';
assert(process.env.DW_GAME_TEST_TOKEN,'Use the crew slot');
const source=fs.readFileSync(new URL('../../studio/weapon-longarms.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../../index.html',import.meta.url),'utf8');
const proof=fs.readFileSync(new URL('pump-port-proof.mjs',import.meta.url),'utf8');
function section(text,start,end){
  const a=text.indexOf(start),b=text.indexOf(end,a+start.length);
  assert(a>=0&&b>a,start);
  return text.slice(a,b);
}
const trimPanelBack=new Function(section(source,'function trimPanelBack(','// Split the artwork at each change')+';return trimPanelBack')();
const stockProof=fs.readFileSync(new URL('stock-mount-proof.mjs',import.meta.url),'utf8');
const exteriorSamples=new Function(section(stockProof,'function exteriorSamples(','export function stockMountProof')+';return exteriorSamples')();
const gun=new G.Group(),material=new G.MeshStandardMaterial();
const kit=new Function('THREE',section(html,'function gunKit(gun)','// CU-81: outlines')+';return gunKit;')(G)(gun);
const rbox=(w,h,d)=>new G.BoxGeometry(w,h,d);
kit.box=(w,h,d,m,x,y,z,rx,ry,rz,parent)=>{
  const obj=new G.Mesh(rbox(w,h,d),m);obj.position.set(x,y,z);parent.add(obj);return obj;
};
const parts=section(source,'  const PORT_R = 0.0625','  poseBolt(0);');
const make=new Function('THREE','K','trimPanelBack','finish','HW','gunDark',parts+';return {boltSide,poseBolt};');
const {boltSide,poseBolt}=make(G,kit,trimPanelBack,{bolt:material,edge:material},.0255,material);
const receiver=new Function(section(source,'function shotgunReceiver(','function pumpSlingRim(')+';return shotgunReceiver')()(G,.0255,material);
gun.add(receiver);
const original=new G.CylinderGeometry(.012,.012,.1,16).rotateX(Math.PI/2).scale(.67,1,1);
const verify=new Function('exteriorSamples',section(proof,'function checkPortSurface','export function checkPumpPort')+';return checkPortSurface;')(exteriorSamples);
const stats=verify(G,boltSide,original);
console.log(stats);assert(stats.capVertices>0&&stats.exposed===28);
gun.scale.setScalar(.8630087209302326);
let visible=0,hidden=0,maxGap=0;
const phases=Array.from({length:257},(_,i)=>.12*i/256).concat(.06649,.0664999,0);
for(const back of phases){
  poseBolt(back);gun.updateMatrixWorld(true);
  if(!boltSide.visible){hidden++;continue;}
  const cells=visiblePieces(boltSide),gap=visibleSurfaceGap(boltSide,receiver,1.8/1.655);
  assert(cells.length===1&&cells[0].closed&&!gap.penetrating&&gap.upperMm<.01,JSON.stringify({back,gap}));
  visible++;maxGap=Math.max(maxGap,gap.upperMm);
}
console.log('PASS complete graphic sweep',{visible,hidden,maxGap});
