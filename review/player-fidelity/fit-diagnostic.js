// Read-only fit diagnosis using t189's point sampling and inward ray directions.
(() => {
 const T=TT.THREE,V=()=>new T.Vector3(),m=TT.makeMarine(),ud=m.userData;
 for(const[k,arr]of Object.entries(ud.gearParts))for(const o of arr)o.visible=['helmet','vest','pads','nvg'].includes(k);
 TT.carryPreview(m,{loadout:{primary:['sniper','launcher'],secondary:['pistol','uzi']},inHand:null,akimbo:false,dualOwned:{},vest:true,grenades:3});m.updateMatrixWorld(true);
 const rig=ud.carry,spots=[...rig.slings,...rig.holsters,...rig.pairs,rig.hip,rig.hipPair],sp=rig.slings[1],skip=new Set([ud.weaponMount,ud.armLG,ud.armRG,ud.headG,...spots.map(s=>s.g)]),body=[];
 m.traverse(o=>{if(!o.isMesh||!o.visible||o.isInstancedMesh)return;for(let q=o;q;q=q.parent)if(!q.visible||skip.has(q))return;body.push(o);});
 const triangles=meshes=>{const out=[];for(const o of meshes){const P=o.geometry.attributes.position,ix=o.geometry.index,n=ix?ix.count:P.count;for(let i=0;i<n;i+=3)out.push({o,index:i/3,v:[0,1,2].map(j=>V().fromBufferAttribute(P,ix?ix.array[i+j]:i+j).applyMatrix4(o.matrixWorld))});}return out;};
 const bodyT=triangles(body),other=[];for(const s of spots)if(s!==sp&&s!==rig.hip&&s!==rig.hipPair&&s.gun&&s.g.visible&&s.gun.visible)s.gun.traverse(o=>{if(o.isMesh&&o.visible)other.push(o);});const otherT=triangles(other);
 const pts=[];sp.gun.children[0].traverse(o=>{if(!o.isMesh||!o.geometry?.attributes.position)return;for(let q=o;q&&q!==sp.gun;q=q.parent)if(!q.visible)return;const P=o.geometry.attributes.position,step=Math.max(1,Math.floor(P.count/60));for(let i=0;i<P.count;i+=step)pts.push(V().fromBufferAttribute(P,i).applyMatrix4(o.matrixWorld));});
 const cen=V();for(const p of pts)cen.add(p);cen.multiplyScalar(1/pts.length);const par=sp.g.parent,cl=par.worldToLocal(cen.clone()),dp=new T.Vector3(0,cl.y,par===ud.torsoG?-.05:.03).sub(cl);dp.y=0;dp.normalize();const dir=dp.clone().transformDirection(par.matrixWorld),ray=new T.Ray(),hit=V();
 const cast=(tris,origin,far)=>{ray.set(origin,dir);let best=null;for(const tri of tris){const p=ray.intersectTriangle(...tri.v,false,hit);if(!p)continue;const d=p.distanceTo(origin);if(d>0&&d<far&&(!best||d<best.d))best={d,tri,point:p.clone()};}return best;};
 const local=p=>m.worldToLocal(p.clone()).toArray().map(n=>+n.toFixed(6));
 const info=(r,point,gap,source)=>({gap:+gap.toFixed(6),source,gunPoint:local(point),bodyPoint:local(r.point),meshName:r.tri.o.name,materialColor:r.tri.o.material.color?.getHexString(),wardrobe:Object.entries(ud.wardrobe).filter(([,w])=>w.mats.includes(r.tri.o.material)).map(([k])=>k),triangleIndex:r.tri.index,triangle:r.tri.v.map(local)});
 const close=[];for(const point of pts){const a=cast(bodyT,point.clone().addScaledVector(dir,-.25),.5),b=cast(otherT,point.clone().addScaledVector(dir,.002),.4);if(a)close.push(info(a,point,a.d-.25,'body'));if(b)close.push(info(b,point,b.d,'other-weapon'));}
 close.sort((a,b)=>a.gap-b.gap);
 return JSON.stringify({loadout:['sniper','launcher','pistol','uzi'],kind:sp.kind,spot:sp.g.position.toArray(),direction:dp.toArray(),points:pts.length,bodyMeshes:body.length,nearest:close.slice(0,12)},null,2);
})()
