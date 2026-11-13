import assert from 'node:assert/strict';import {readFile,writeFile} from 'node:fs/promises';import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';import {launch} from '../../tools/cdp.mjs';
assert(process.env.DW_GAME_TEST_TOKEN);
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{
 const page=await browser.newPage({width:1280,height:720});await page.goto(server.origin+'/index.html?debug=1&raf=timer');
 assert(await page.waitFor('window.TT&&DWLoad.snapshot().state==="ready"',{timeout:180000}));
 const data=await page.evaluate(`(async()=>{
  const T=TT,G=T.THREE,ctx=T.inspectHost().builders.weaponContext(),{visiblePieces}=await import('/tools/tests/weapon-seating.js');
  let original=await(await fetch('/review/GT-20104/weapon-sidearms.before.js')).text();
  original=original.replace(/from '\\.\\//g,"from '"+location.origin+"/studio/").replace(/from '\\.\\.\\//g,"from '"+location.origin+"/");
  const oldModule=await import(URL.createObjectURL(new Blob([original],{type:'text/javascript'}))),newModule=await import('/studio/weapon-sidearms.js');
  const plain={...ctx,finishGun:g=>g},before=oldModule.makeRevolverModel(plain),after=newModule.makeRevolverModel(plain);
  function stock(g){let result,volume=-1;g.traverse(o=>{if(!o.isMesh||o.material.name!=='Revolver walnut')return;o.geometry.computeBoundingBox();const s=o.geometry.boundingBox.getSize(new G.Vector3()),v=s.x*s.y*s.z;if(v>volume){volume=v;result=o;}});return result;}
  const bp=stock(before).geometry.attributes.position,ap=stock(after).geometry.attributes.position;
  if(bp.count!==ap.count)throw Error('Grip topology changed');
  let dx=0,dy=0,dz=0,upper=0;
  for(let i=0;i<bp.count;i++){const x=Math.abs(bp.getX(i)-ap.getX(i));dx=Math.max(dx,x);dy=Math.max(dy,Math.abs(bp.getY(i)-ap.getY(i)));dz=Math.max(dz,Math.abs(bp.getZ(i)-ap.getZ(i)));if(bp.getY(i)>=.006&&x>1e-8)upper++;}
  function hammer(g){
   const h=g.userData.hammer,supports=h.children.filter(o=>o.isMesh).slice(0,2),patch=h.children.find(o=>o.userData.weaponDetail?.kind==='serrations'),triangles=[];
   for(const m of supports){m.updateMatrix();const p=m.geometry.attributes.position,ix=m.geometry.index,N=ix?ix.count:p.count;for(let i=0;i<N;i+=3){const tri=[0,1,2].map(k=>new G.Vector3().fromBufferAttribute(p,ix?ix.getX(i+k):i+k).applyMatrix4(m.matrix).toArray());const[a,b,c]=tri,det=(b[0]-a[0])*(c[2]-a[2])-(b[2]-a[2])*(c[0]-a[0]);if(Math.abs(det)>1e-14)triangles.push({tri,det});}}
   const roof=(x,z)=>{let y=-Infinity;for(const{tri:[a,b,c],det}of triangles){const u=((x-a[0])*(c[2]-a[2])-(z-a[2])*(c[0]-a[0]))/det,v=((b[0]-a[0])*(z-a[2])-(b[2]-a[2])*(x-a[0]))/det;if(u>=-1e-7&&v>=-1e-7&&u+v<=1+1e-7)y=Math.max(y,a[1]+u*(b[1]-a[1])+v*(c[1]-a[1]));}return y;};
   patch.updateMatrix();const p=patch.geometry.attributes.position,n=patch.geometry.attributes.normal,offsets=[];let unsupported=0,visibleMax=-Infinity;
   for(let i=0;i<p.count;i++){const q=new G.Vector3().fromBufferAttribute(p,i).applyMatrix4(patch.matrix),y=roof(q.x,q.z);if(!Number.isFinite(y)){unsupported++;continue;}const gap=q.y-y;visibleMax=Math.max(visibleMax,gap);if(n.getY(i)<-.1)offsets.push(gap);}
   return {vertices:p.count,unsupported,bedMin:Math.min(...offsets),bedMax:Math.max(...offsets),visibleMax,allNormalsFinite:[...n.array].every(Number.isFinite),pieces:visiblePieces(patch).map(p=>({closed:p.closed,faces:p.faces.length}))};
  }
  const cylinder=after.userData.cylinder.children.find(o=>o.name==='revolver cylinder'),p=cylinder.geometry.attributes.position,ix=cylinder.geometry.index,rays=[];
  for(let i=0;i<8;i++){
   const a=Math.PI/6+i*Math.PI/3,x=i<6?Math.cos(a)*.026:i===6?0:.012,y=i<6?Math.sin(a)*.026:0,ray=new G.Ray(new G.Vector3(x,y,-.10),new G.Vector3(0,0,1));let hits=0;
   for(let j=0;j<ix.count;j+=3){const v=[0,1,2].map(k=>new G.Vector3().fromBufferAttribute(p,ix.getX(j+k)));if(ray.intersectTriangle(...v,false,new G.Vector3()))hits++;}
   rays.push({index:i,hits});
  }
  const pieces=visiblePieces(cylinder).map(p=>({closed:p.closed,faces:p.faces.length}));
  return {grip:{vertices:bp.count,maxAbsDx:dx,maxAbsDy:dy,maxAbsDz:dz,upperMoved:upper},hammerBefore:hammer(before),hammerAfter:hammer(after),cylinder:{triangles:ix.count/3,pieces,rays},triggerBefore:before.userData.triggerPin,triggerAfter:after.userData.triggerPin};
 })()`,180000);
 await writeFile(new URL('revolver-check.json',import.meta.url),JSON.stringify(data,null,2));console.log(JSON.stringify(data));
 assert(data.grip.maxAbsDx>.0039&&data.grip.maxAbsDx<.0041);assert.equal(data.grip.maxAbsDy,0);assert.equal(data.grip.maxAbsDz,0);assert.equal(data.grip.upperMoved,0);
 assert.equal(data.hammerAfter.unsupported,0);assert(data.hammerAfter.bedMax<0);assert(data.hammerAfter.allNormalsFinite);assert(data.hammerAfter.pieces.every(p=>p.closed));
 assert.equal(data.cylinder.pieces.length,1);assert(data.cylinder.pieces[0].closed);assert(data.cylinder.rays.slice(0,7).every(r=>r.hits===0));assert(data.cylinder.rays[7].hits>=2);
 assert.deepEqual(data.triggerAfter,data.triggerBefore);
 const out=String(await page.evaluate(await readFile(new URL('../../tools/tests/t333.js',import.meta.url),'utf8'),180000));await writeFile(new URL('revolver-t333.txt',import.meta.url),out);console.log(out);assert(!out.split('\n').some(l=>l.startsWith('FAIL')));
 assert.deepEqual(page.errors,[]);console.log('PASS native revolver grip deltas, hammer seated,7real bores, unchanged trigger, original t333');
}finally{await browser.close();await server.close();}
