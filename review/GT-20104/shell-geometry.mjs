import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import * as T from '../../vendor/three/three.core.js';
const original=await readFile(new URL('../../studio/weapon-pistol-action.js',import.meta.url),'utf8');
const core=await readFile(new URL('../../core/geometry.js',import.meta.url),'utf8');
const uv=core.match(/export function boxProjectUV[\s\S]*?\n}/)[0].replace('export ','');
const source=original.replace("import {boxProjectUV} from '../core/geometry.js';",core.match(/const CAMO_TILE = [^;]+;/)[0]+'\n'+uv);
const {pistolSlideShellGeometry}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const g=pistolSlideShellGeometry(T);assert.equal(g,pistolSlideShellGeometry(T));
const p=g.attributes.position,n=g.attributes.normal,edges=new Map();
const key=v=>v.map(x=>Math.round(x*1e7)).join(',');
let volume=0;
for(let i=0;i<p.count;i+=3){
 const v=[0,1,2].map(k=>[p.getX(i+k),p.getY(i+k),p.getZ(i+k)]),ids=v.map(key);
 assert.equal(new Set(ids).size,3,'degenerate face');
 const a=new T.Vector3(...v[0]),b=new T.Vector3(...v[1]),c=new T.Vector3(...v[2]);
 assert(new T.Vector3().subVectors(b,a).cross(new T.Vector3().subVectors(c,a)).length()>1e-13);
 volume+=a.dot(new T.Vector3().crossVectors(b,c))/6;
 for(let j=0;j<3;j++){
  const a=ids[j],b=ids[(j+1)%3],id=a<b?a+'|'+b:b+'|'+a,row=edges.get(id)||{count:0,balance:0};
  row.count++;row.balance+=a<b?1:-1;edges.set(id,row);
 }
}
const bad=[...edges].filter(([,v])=>v.count!==2||v.balance!==0);
const rays={};
for(const [name,origin,direction]of [['portTop',[0,.06,.022],[0,-1,0]],['roofTop',[0,.06,.12],[0,-1,0]],['portRight',[.06,.010,.022],[-1,0,0]]]){
 const ray=new T.Ray(new T.Vector3(...origin),new T.Vector3(...direction)),hits=[];
 for(let i=0;i<p.count;i+=3){const v=[0,1,2].map(k=>new T.Vector3(p.getX(i+k),p.getY(i+k),p.getZ(i+k))),hit=ray.intersectTriangle(...v,false,new T.Vector3());if(hit)hits.push(hit.toArray());}
 rays[name]=hits;
}
g.computeBoundingBox();
const result={triangles:p.count/3,edges:edges.size,badEdges:bad,volume,bounds:{min:g.boundingBox.min.toArray(),max:g.boundingBox.max.toArray()},rays,allNormalsFinite:[...n.array].every(Number.isFinite)};
await writeFile(new URL('shell-geometry.json',import.meta.url),JSON.stringify(result,null,2));
console.log(JSON.stringify({...result,badEdges:bad.slice(0,12)}));
assert.equal(bad.length,0,'shell must be closed with consistently wound shared edges');
assert(volume>0&&result.allNormalsFinite);
assert.equal(rays.portTop.length,0,'actual open ejection port');
assert(rays.roofTop.length>=2);
assert(rays.portRight.length&&rays.portRight.every(p=>p[0]<0),'right port open, far left wall remains');
console.log('PASS native-three closed hollow shell, positive volume, open top/right port, intact roof, cached geometry');
