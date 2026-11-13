import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import * as T from '../../vendor/three/three.core.js';
const original=await readFile(new URL('../../studio/weapon-pistol-action.js',import.meta.url),'utf8'),core=await readFile(new URL('../../core/geometry.js',import.meta.url),'utf8');
const source=original.replace("import {boxProjectUV} from '../core/geometry.js';",core.match(/const CAMO_TILE = [^;]+;/)[0]+'\n'+core.match(/export function boxProjectUV[\s\S]*?\n}/)[0].replace('export ',''));
const {pistolChamberGeometry}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const g=pistolChamberGeometry(T),p=g.attributes.position,edges=new Map();let volume=0;
for(let i=0;i<p.count;i+=3){
 const v=[0,1,2].map(k=>new T.Vector3(p.getX(i+k),p.getY(i+k),p.getZ(i+k))),ids=v.map(v=>v.toArray().map(n=>Math.round(n*1e7)).join(','));
 assert.equal(new Set(ids).size,3);volume+=v[0].dot(new T.Vector3().crossVectors(v[1],v[2]))/6;
 for(let j=0;j<3;j++){const a=ids[j],b=ids[(j+1)%3],k=a<b?a+'|'+b:b+'|'+a,r=edges.get(k)||[0,0];r[0]++;r[1]+=a<b?1:-1;edges.set(k,r);}
}
const bad=[...edges].filter(([,v])=>v[0]!==2||v[1]!==0);
const ray=new T.Ray(new T.Vector3(0,.05,.13),new T.Vector3(0,0,-1)),hits=[];
for(let i=0;i<p.count;i+=3){const v=[0,1,2].map(k=>new T.Vector3(p.getX(i+k),p.getY(i+k),p.getZ(i+k)));const hit=ray.intersectTriangle(...v,false,new T.Vector3());if(hit)hits.push(hit.toArray());}
const result={triangles:p.count/3,edges:edges.size,badEdges:bad,volume,boreHits:hits};
await writeFile(new URL('chamber-geometry.json',import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
assert.equal(bad.length,0);assert(volume>0);assert.equal(hits.length,0);assert.equal(g,pistolChamberGeometry(T));
console.log('PASS native-three closed chamber/hood, through bore and cached geometry');
