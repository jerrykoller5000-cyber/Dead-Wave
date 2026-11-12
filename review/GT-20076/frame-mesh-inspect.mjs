// Diagnose a seam against the unmodified geometry queries using the mesh arrays captured in Training.
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as G from '../../vendor/three/three.core.js';
const dir=new URL('./visible-repairs/pistol/clear-tang-cheek-after/',import.meta.url);
const root=new URL('../../',import.meta.url),auditURL=new URL('tools/tests/weapon-seating.js',root);
const auditSource=(await readFile(auditURL,'utf8')).replace(/from '([^']+)'/g,(_,spec)=>"from '"+new URL(spec,auditURL).href+"'");
const library=await import('data:text/javascript;base64,'+Buffer.from(auditSource+'\nexport {penetration,depthToSurface};').toString('base64'));
const {visiblePieces,visibleSurfaceGap,penetration,depthToSurface}=library;
const raw=JSON.parse(await readFile(new URL('frame-partition.json',dir),'utf8'));
const captured=JSON.parse(await readFile(new URL('frame-curve.json',dir),'utf8'));
function mesh(data){
  const geo=new G.BufferGeometry();for(const key of ['position','normal','uv'])geo.setAttribute(key,new G.Float32BufferAttribute(data[key],key==='uv'?2:3));
  return new G.Mesh(geo);
}
const group=new G.Group(),cover=mesh(captured.cover),tang=mesh(captured.tang);group.add(cover,tang);group.scale.setScalar(.6888341067285383/(1.8/1.655));
const read=async p=>readFile(new URL(p,root),'utf8');
function take(code,from,to){
  const start=code.indexOf(from),end=code.indexOf(to,start+from.length);assert(start>=0&&end>start);return code.slice(start,end);
}
if(process.argv.includes('--source')){
  cover.geometry=mesh(raw.cover).geometry;tang.geometry=mesh(raw.tang).geometry;
  const side=await read('studio/weapon-sidearms.js'),long=await read('studio/weapon-longarms.js');
  // Use the outer function terminator; nested blocks are indented.
  const fn=(src,key)=>{const start=src.indexOf(key),end=src.indexOf('\n}',start);assert(start>=0&&end>start);return src.slice(start,end+2).replace(/^export /,'');};
  const cut=fn(long,'export function trimPanelBack'),split=fn(side,'function splitArtworkRows');
  const fit=take(side,'const pistolFrameSkins','const pistolFinishes');
  const build=new Function(cut+'\n'+split+'\n'+fit+'\nreturn fitPistolFrameSeam;')();
  build(G,cover,tang);
}
const scale=1.8/1.655,absolute=.6888341067285383;
const [a]=visiblePieces(tang,scale),[b]=visiblePieces(cover,scale);
const summary={closed:[a.closed,b.closed],gap:visibleSurfaceGap(tang,cover,scale),faces:[a.faces.length,b.faces.length]};
for(const [part,host,name] of [[a,b,'tang-in-cover'],[b,a,'cover-in-tang']]){
  const hit=penetration(part,host,1e-7);if(!hit)continue;
  const crossing={};for(const dir of [[1,0,0],[0,1,0],[0,0,1],[.81731,.36179,.44717]]){
    const ray=new G.Ray(hit.clone(),new G.Vector3(...dir).normalize()),out=[];
    for(const {tri} of host.faces){const v=ray.intersectTriangle(tri.a,tri.b,tri.c,false,new G.Vector3());if(v)out.push(v.distanceTo(hit));}
    crossing[dir.join(',')]=out.sort((a,b)=>a-b);
  }
  summary[name]={point:hit.toArray().map(v=>v/absolute),depthMm:1000*depthToSurface(hit,host.tree),crossing};
}
if(process.argv.includes('--save-source')){
  const pack=m=>Object.fromEntries(['position','normal','uv'].map(k=>[k,Array.from(m.geometry.attributes[k].array)]));
  await writeFile(new URL('frame-authoring.json',dir),JSON.stringify({cover:pack(cover),tang:pack(tang)})+'\n');
}
console.log(JSON.stringify(summary));
