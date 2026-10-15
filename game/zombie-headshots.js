// GP-19885: a headshot needs a posed head surface, not an upper-body height.
const cache=new WeakMap(),meshes=new WeakMap();
export function headCore(z){
 const s=z.mesh?.userData?.headScale||Math.abs(z.mesh?.userData?.legLG?.userData?.shinG?.position.y||.38)/.38;
 if(z.mesh?.userData?.bossRig)return {x:.32,y:.26,z:.48,cy:.015,cz:.38,scale:1};
 if(z.typeKey==='spider')return {x:.15*s,y:.125*s,z:.20*s,cy:0,cz:.015*s,scale:s};
 const heavy=['brute','colossus','demon','guardian','caveguard'].includes(z.typeKey),fat=z.typeKey==='bomber';
 return {x:(heavy?.185:fat?.174:.155)*s,y:.195*s,z:(fat?.225:.215)*s,cy:.015*s,cz:.005*s,scale:s};
}
export function inHeadCore(p,c){return Math.abs(p.x)<=c.x&&Math.abs(p.y-c.cy)<=c.y&&Math.abs(p.z-c.cz)<=c.z;}
export function confirmedHead(z,info){return !!info?.headHit&&!z.partsLost?.head&&(z.typeKey!=='military'||info.militaryZone==='face')&&(z.typeKey!=='brute'||info.brutePart==='head');}
export function canSeverHead(z,confirmed){return !!confirmed&&z.hp<=(z.maxHp||24)*.3;}
export function headRoot(z){return z.mesh?.userData?.bossRig?.userData?.rig?.head||z.mesh?.userData?.head;}
function scratch(T){let r=cache.get(T);if(!r){r={ray:new T.Raycaster(),dir:new T.Vector3(),inv:new T.Matrix4(),local:new T.Vector3(),hits:[],active:[],center:new T.Vector3()};cache.set(T,r);}return r;}
export function headSurface(T,z,a,b){
 const root=headRoot(z);if(!root||z.partsLost?.head||root.visible===false||root.userData._skinCollapsed)return null;
 const r=scratch(T);r.dir.subVectors(b,a);const len=r.dir.length();if(!(len>0))return null;r.dir.divideScalar(len);r.ray.set(a,r.dir);r.ray.near=0;r.ray.far=len;
 root.updateWorldMatrix(true,true);let list=meshes.get(root);if(!list){list=[];root.traverse(m=>{if(m.isMesh&&!m.isSkinnedMesh&&!m.isInstancedMesh&&!m.userData.stump&&(m.userData.skinSrc||m.visible))list.push(m);});meshes.set(root,list);}
 r.active.length=0;for(const m of list){let hidden=false;for(let n=m.parent;n&&n!==root;n=n.parent)if(n.visible===false||n.userData._skinCollapsed){hidden=true;break;}if(!hidden)r.active.push(m);}
 r.hits.length=0;r.ray.intersectObjects(r.active,false,r.hits);const hit=r.hits[0];if(!hit)return null;
 r.inv.copy(root.matrixWorld).invert();r.local.copy(hit.point).applyMatrix4(r.inv);
 return {t:hit.distance/len,headHit:inHeadCore(r.local,headCore(z)),point:{x:hit.point.x,y:hit.point.y,z:hit.point.z}};
}
export function zombieSurface(T,z,a,b){
 if(!z.mesh)return null;const r=scratch(T);r.dir.subVectors(b,a);const len=r.dir.length();if(!(len>0))return null;r.dir.divideScalar(len);r.ray.set(a,r.dir);r.ray.near=0;r.ray.far=len;
 const u=z.mesh.userData,root=u.bossRig||z.mesh,head=headRoot(z),bones=new Set([u.hips,u.torso,u.head,u.armLG,u.armRG,u.legLG,u.legRG]);root.updateWorldMatrix(true,true);
 let list=meshes.get(root);if(!list){list=[];root.traverse(m=>{if(!m.isMesh||m.isSkinnedMesh||m.isInstancedMesh||m.userData.stump||m.material?.transparent||!(m.userData.skinSrc||m.visible))return;let body=!!u.bossRig;for(let n=m.parent;n&&n!==z.mesh;n=n.parent)if(bones.has(n))body=true;if(body)list.push(m);});meshes.set(root,list);}
 r.active.length=0;for(const m of list){let hidden=false;for(let n=m.parent;n&&n!==root;n=n.parent)if(n.visible===false||n.userData._skinCollapsed){hidden=true;break;}if(!hidden)r.active.push(m);}
 r.hits.length=0;r.ray.intersectObjects(r.active,false,r.hits);const hit=r.hits[0];if(!hit)return null;
 let onHead=false;for(let n=hit.object.parent;n&&n!==z.mesh;n=n.parent)if(n===head)onHead=true;
 let precise=false;if(onHead&&!z.partsLost?.head){r.inv.copy(head.matrixWorld).invert();r.local.copy(hit.point).applyMatrix4(r.inv);precise=inHeadCore(r.local,headCore(z));}
 return {t:hit.distance/len,headHit:precise,point:{x:hit.point.x,y:hit.point.y,z:hit.point.z}};
}
