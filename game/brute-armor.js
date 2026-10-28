// GP-19867: Four independently breakable scrap plates, kept in the body's skin draw.
export const BRUTE_ARMOR=Object.freeze({front:45,back:40,left:30,right:30,protected:.45,exposed:.9});
const partitions=new WeakMap(); // concept templates share their source geometry
export function makeBruteArmor(T,g,s){
  const u=g.userData,plates={};
  // Match both the original plates and the GP-19970 material pass. Color changes
  // must not silently remove breakable geometry from the combat partition.
  const colors=[[0x494a43,'steel'],[0x7d817d,'steel'],[0x996a43,'rust'],[0x8e3027,'sign'],[0x424746,'sign'],[0xc3a253,'stripe']].map(([hex,name])=>{const c=new T.Color(hex);return [name,[c.r,c.g,c.b]];});
  const matches=(a,c)=>Math.abs(a[0]-c[0])+Math.abs(a[1]-c[1])+Math.abs(a[2]-c[2])<.0001;
  for(const [bone,shoulder]of[[u.torso,null],[u.armLG,'left'],[u.armRG,'right']]){
    for(const src of [...bone.children]){
      if(!src.isMesh||!src.userData.compacted)continue;
      const geo=src.geometry,attrs=geo.attributes,P=attrs.position,C=attrs.color;if(!C||geo.index)continue;
      let pieces=partitions.get(geo);
      if(!pieces){pieces=[];
      const buckets=new Map(),put=(key,i,tint)=>{let data=buckets.get(key);if(!data){data={};for(const name of Object.keys(attrs))data[name]=[];buckets.set(key,data);}for(const[name,a]of Object.entries(attrs))for(let j=0;j<3;j++)for(let k=0;k<a.itemSize;k++)data[name].push(name==='color'&&tint?tint[k]:a.array[(i+j)*a.itemSize+k]);};
      for(let i=0;i<P.count;i+=3){
        const col=[C.getX(i),C.getY(i),C.getZ(i)];let metal=null;for(const[name,c]of colors)if(matches(col,c)){metal=name;break;}
        const y=(P.getY(i)+P.getY(i+1)+P.getY(i+2))/3/s,z=(P.getZ(i)+P.getZ(i+1)+P.getZ(i+2))/3/s;
        const zone=metal&&(shoulder?y>-.045:y>.105&&y<.49&&Math.abs(z)>.17)?shoulder||(z>0?'front':'back'):'body';
        const tint=(metal==='sign'||metal==='stripe')?new T.Color(metal==='sign'?0x0d0e10:0x131517):null;put(zone,i,tint?[tint.r,tint.g,tint.b]:null);
      }
      for(const[key,data]of buckets){const out=new T.BufferGeometry();for(const[name,a]of Object.entries(attrs))out.setAttribute(name,new T.BufferAttribute(new a.array.constructor(data[name]),a.itemSize,a.normalized));out.computeBoundingSphere();pieces.push({key,geometry:out});}
        partitions.set(geo,pieces);
      }
      for(const piece of pieces){const mesh=new T.Mesh(piece.geometry,src.material);mesh.castShadow=src.castShadow;mesh.userData.compacted=true;
        if(piece.key==='body'){bone.add(mesh);if(bone.userData.upper===src)bone.userData.upper=mesh;if(bone.userData.bodyMat===src.material)bone.userData.bodyMat=mesh.material;}
        else {let root=plates[piece.key];if(!root){root=new T.Group();root.name='brute-plate-'+piece.key;root.userData.brutePlate=piece.key;bone.add(root);plates[piece.key]=root;}root.add(mesh);}
      }
      // Concept templates share this source geometry: never mutate or dispose it.
      src.removeFromParent();
    }
  }
  u.brutePlates=plates;resetBruteArmor(g);
}
export function resetBruteArmor(mesh){
  const u=mesh.userData;if(!u.brutePlates)return;
  // A recipe can omit a plate. It then has no durability or protection.
  u.bruteArmor={front:u.brutePlates.front?BRUTE_ARMOR.front:0,back:u.brutePlates.back?BRUTE_ARMOR.back:0,left:u.brutePlates.left?BRUTE_ARMOR.left:0,right:u.brutePlates.right?BRUTE_ARMOR.right:0};
  for(const group of Object.values(u.brutePlates)){group.scale.set(1,1,1);group.rotation.set(0,0,0);group.visible=true;group.userData._skinCollapsed=false;}
}
export function bruteArmorZone(z,info={}){
  if(info.bruteZone)return info.bruteZone;
  if(info.brutePart&&info.brutePart!=='torso')return 'exposed';
  if(info.hitY!=null){const frac=(info.hitY-z.mesh.position.y)/(z.hitH||1.4);if(frac<.43||frac>.74)return 'exposed';}
  const dir=info.dir||{},yaw=z.mesh.rotation.y,forward=-(dir.x||0)*Math.sin(yaw)-(dir.z||0)*Math.cos(yaw),side=-(dir.x||0)*Math.cos(yaw)+(dir.z||0)*Math.sin(yaw);
  if(Math.abs(side)>Math.abs(forward)*1.2)return side<0?'left':'right';
  return forward>=0?'front':'back';
}
export function hitBruteArmor(z,amount,kind,info){
  if(z.typeKey!=='brute'||!z.mesh.userData.bruteArmor)return {factor:1,broken:[]};
  const u=z.mesh.userData,zone=bruteArmorZone(z,info),a=u.bruteArmor,plated=a[zone]>0;
  const blade=kind==='melee'||kind==='chainsaw',ballistic=kind==='bullet'||kind==='pellet';
  const located=info?.bruteZone!=null||info?.hitY!=null;
  const factor=located&&(blade||ballistic)&&!plated?BRUTE_ARMOR.exposed/BRUTE_ARMOR.protected:1;
  const wear=ballistic?1:blade?.7:kind==='explosive'?.6:kind==='crush'?1:0,broken=[];
  if(!(amount>0)||!wear)return {factor,broken};
  for(const key of kind==='explosive'||kind==='crush'?Object.keys(a):[zone]){
    if(!(a[key]>0))continue;const group=u.brutePlates[key];if(!group){a[key]=0;continue;}
    a[key]=Math.max(0,a[key]-amount*wear);
    if(!a[key]){z.mesh.updateMatrixWorld(true);broken.push({group,matrix:group.matrixWorld.clone()});group.scale.setScalar(1e-4);group.userData._skinCollapsed=true;group.updateMatrix?.();group.updateMatrixWorld?.(true);}
    else {const wearK=1-a[key]/BRUTE_ARMOR[key];group.rotation.x=wearK*.055;group.rotation.z=(key==='left'?-1:1)*wearK*.035;group.updateMatrix?.();group.updateMatrixWorld?.(true);}
  }
  return {factor,broken}; // threshold hit stays protected; subsequent hits reach exposed flesh
}
const rays=new WeakMap();
export function bruteProjectileHit(T,z,a,b){
  if(z.typeKey!=='brute')return null;let r=rays.get(T);
  if(!r){r={ray:new T.Raycaster(),dir:new T.Vector3(),hits:[],active:[],center:new T.Vector3()};rays.set(T,r);}
  r.dir.subVectors(b,a);const length=r.dir.length();if(!length)return null;r.dir.divideScalar(length);r.ray.set(a,r.dir);r.ray.near=0;r.ray.far=length;z.mesh.updateMatrixWorld(true);
  const u=z.mesh.userData;if(!u.bruteHitMeshes){u.bruteHitMeshes=[];z.mesh.traverse(o=>{if(o.isMesh&&!o.isSkinnedMesh&&!o.userData.stump&&(o.userData.skinSrc||(!u.skinMeshes?.length&&o.visible)||u.eyes?.includes(o)))u.bruteHitMeshes.push(o);});}
  r.active.length=0;
  for(const m of u.bruteHitMeshes){let hidden=false;for(let n=m.parent;n&&n!==z.mesh;n=n.parent)if(n.visible===false||n.userData._skinCollapsed){hidden=true;break;}if(!hidden)r.active.push(m);}
  r.hits.length=0;r.ray.intersectObjects(r.active,false,r.hits);const h=r.hits[0];if(!h)return null;
  let zone='exposed',part='torso';for(let n=h.object.parent;n&&n!==z.mesh;n=n.parent){if(n.userData.brutePlate)zone=n.userData.brutePlate;for(const[key,root]of[['head',u.head],['armL',u.armLG],['armR',u.armRG],['legL',u.legLG],['legR',u.legRG]])if(n===root)part=key;}
  if(part==='head')r.center.set(0,.035*(z.scale||1),0).applyMatrix4(u.head.matrixWorld);
  else {if(!h.object.geometry.boundingBox)h.object.geometry.computeBoundingBox();h.object.geometry.boundingBox.getCenter(r.center).applyMatrix4(h.object.matrixWorld);}
  return {t:h.distance/length,zone,part,aim:{x:r.center.x,y:r.center.y,z:r.center.z}};
}
