import {makeRevolverModel} from '../../studio/weapon-sidearms.js';

async function hash(data){
  if(!data)return null;
  const bytes=new Uint8Array(data.buffer,data.byteOffset,data.byteLength);
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
}
export async function readWood(T){
  const G=T.THREE, ctx=T.inspectHost().builders.weaponContext();let stock,source;
  const g=makeRevolverModel({...ctx,finishGun:x=>x,mergeRigidMeshes:()=>{},gunKit:root=>{
    const kit=ctx.gunKit(root);return {...kit,slab(points,width,material,opts){
      const m=kit.slab(points,width,material,opts);
      if(material.name==='Revolver walnut' && points.length>20){stock=m;source=m.geometry.clone();}
      return m;
    }};
  }});
  g.updateMatrixWorld(true);const meshes=[],tasks=[],v=new G.Vector3();let grain;
  g.traverse(o=>{
    if(!o.isMesh||!o.geometry.attributes.position)return;
    const geo=o.geometry,p=geo.attributes.position,mat=o.material;
    const row={name:o.name,mat:mat.name,count:p.count,groups:{}};meshes.push(row);
    const groups={left:[],middle:[],right:[]};
    for(let i=0;i<p.count;i++){
      v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);
      groups[v.x<-.018?'left':v.x>.018?'right':'middle'].push(v.toArray());
    }
    for(const [side,points] of Object.entries(groups)){
      if(!points.length)continue;
      const x=points.map(p=>p[0]),min=Math.min(...x),max=Math.max(...x);
      const item={count:x.length,min,max};row.groups[side]=item;
      tasks.push(Promise.all([
        hash(Int32Array.from(x,n=>Math.round((n-min)*1e6))),
        hash(Int32Array.from(points.flatMap(p=>p.slice(1)),n=>Math.round(n*1e6)))
      ]).then(([shape,yz])=>Object.assign(item,{shape,yz})));
    }
    tasks.push(Promise.all([hash(geo.attributes.uv?.array),hash(geo.attributes.normal?.array),hash(geo.index?.array)]).then(([uv,normals,indices])=>Object.assign(row,{uv,normals,indices})));
    if(!grain && mat.name==='Revolver walnut')grain=mat.map;
  });
  await Promise.all(tasks);
  let fixed=0,lower=0,blend=0,dxMin=0,dxMax=0,missing=0;
  const pos=stock.geometry.attributes.position,old=source.attributes.position;
  const uv=stock.geometry.attributes.uv,oldUV=source.attributes.uv,norm=stock.geometry.attributes.normal,n0=source.attributes.normal;
  const key=(x,y,z,u,v)=>[x,y,z,u,v].map(q=>Math.round(Math.fround(q)*1e6+.173)).join(',');
  const final=new Map();
  for(let i=0;i<pos.count;i++){
    const k=key(pos.getX(i),pos.getY(i),pos.getZ(i),uv.getX(i),uv.getY(i));
    if(!final.has(k))final.set(k,[]);
    final.get(k).push(new G.Vector3().fromBufferAttribute(norm,i));
  }
  let normalError=0;
  for(let i=0;i<old.count;i++){
    const x=old.getX(i),y=old.getY(i),z=old.getZ(i),side=Math.min(1,Math.max(0,x/.020));
    const t=Math.max(0,Math.min(1,(y+.022)/.028)),weight=1-t*t*(3-2*t),dx=-.004*side*weight;
    dxMin=Math.min(dxMin,dx);dxMax=Math.max(dxMax,dx);
    const n=new G.Vector3().fromBufferAttribute(n0,i);
    if(side>0 && weight>0 && (t>0||side<1)){
      if(side<1)n.x/=1-.004*weight/.020;
      n.y-=n.x*side*.004*6*t*(1-t)/.028;n.normalize();
    }
    const candidates=final.get(key(x+dx,y,z,oldUV.getX(i),oldUV.getY(i)));
    if(!candidates)missing++;else normalError=Math.max(normalError,Math.min(...candidates.map(a=>a.distanceTo(n))));
    if(dx===0)fixed++;else if(side*weight===1)lower++;else blend++;
  }
  const levels=[-.022,.006],extraOffRow=[...final.keys()].filter(k=>{
    const y=Number(k.split(',')[1]);return !levels.some(h=>Math.abs(y-h*1e6)<2);
  }).length;
  return {meshes,woodTexture:await hash(grain.image.data),repeat:grain.repeat.toArray(),anchor:g.userData.triggerPin,
    stockFit:{fixed,lower,blend,missing,normalError,dxMin,dxMax,sourceCount:old.count,finalCount:pos.count,sourceUV:await hash(oldUV.array),
      sourceNormals:await hash(n0.array),originalSurfaceKeysOffRows:extraOffRow}};
}
