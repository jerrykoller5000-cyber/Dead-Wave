// Freeze the drawn glove and gun together, keeping the current pose for a closer view.
export function snapshotContact(T,key) {
  const V=T.viewmodelDbg(), G=T.THREE, group=new G.Group();
  const inv=V.gun.root.matrixWorld.clone().invert();
  function add(m) {
    if(!m.isMesh) return;
    const copy=new G.Mesh(m.geometry.clone(),m.material);
    copy.matrix.multiplyMatrices(inv,m.matrixWorld); copy.matrixAutoUpdate=false;
    group.add(copy);
  }
  V.gun.root.traverseVisible(add);
  const side=key==='uzi'?'l':'r';
  for(const m of Object.values(V.arms[side].meshes)) {
    if(!m?.isMesh) continue;
    let visible=true;
    for(let o=m;o;o=o.parent)visible=visible && o.visible;
    if(visible)add(m);
  }
  group.position.set(30,80,-60);
  return group;
}

// Evaluate in the settled Training Ground viewmodel. Use its built transforms and world scale.
export async function contactClearance(T,key) {
  const V=T.viewmodelDbg(), THREE=T.THREE, scale=Math.abs(V.gun.root.getWorldScale(new THREE.Vector3()).x);
  if(key==='uzi'){
    const module=V.gun.root.getObjectByName('laserLightUnit');
    if(!module) throw Error('Missing Uzi light in the actual viewmodel');
    const inv=V.gun.root.matrixWorld.clone().invert(), box=new THREE.Box3(), p=new THREE.Vector3();
    module.traverseVisible(m=>{
      if(!m.isMesh) return;
      const attr=m.geometry.attributes.position, xf=inv.clone().multiply(m.matrixWorld);
      for(let i=0;i<attr.count;i++)box.expandByPoint(p.fromBufferAttribute(attr,i).applyMatrix4(xf));
    });
    if(box.isEmpty()) throw Error('The Uzi light is not fitted and visible');
    // Clip every hand triangle to the module's XY footprint plus the requested clearance.
    // If its forwardmost surviving point is behind the rear of the module, the Z gap
    // is a conservative lower bound, including triangle edges between hand vertices.
    const margin=.002/scale;
    const clip=(poly,k,value,sign)=>{
      const out=[];
      for(let i=0;i<poly.length;i++){
        const a=poly[i],b=poly[(i+1)%poly.length], da=sign*(a[k]-value),db=sign*(b[k]-value);
        if(da>=0)out.push(a);
        if((da<0)!==(db<0))out.push(a.clone().lerp(b,da/(da-db)));
      }
      return out;
    };
    let forward=-Infinity;
    const gloveSnapshot=new THREE.Group();
    const left=V.arms.l;
    for(const kind of ['glove','glovePads','bare','bareNails']){
      const m=left.meshes[kind];
      if(!m)continue;
      let visible=true;
      for(let o=m;o;o=o.parent)visible=visible && o.visible;
      if(!visible)continue;
      const attr=m.geometry.attributes.position,ix=m.geometry.index,xf=inv.clone().multiply(m.matrixWorld);
      const copy=new THREE.Mesh(m.geometry,m.material);copy.matrix.copy(xf);copy.matrixAutoUpdate=false;gloveSnapshot.add(copy);
      for(let i=0;i<(ix?ix.count:attr.count);i+=3){
        let tri=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(attr,ix?ix.getX(i+j):i+j).applyMatrix4(xf));
        for(const k of ['x','y']) {
          tri=clip(tri,k,box.min[k]-margin,1);
          tri=clip(tri,k,box.max[k]+margin,-1);
        }
        for(const v of tri) forward=Math.max(forward,v.z);
      }
    }
    const light=T.cloneLean(module);
    light.matrix.multiplyMatrices(inv,module.matrixWorld);light.matrixAutoUpdate=false;
    const {visibleSurfaceGap}=await import('/tools/tests/weapon-seating.js');
    const candidates=[];
    for(const dz of [0,.01,.02,.03,.04,.05,.06,.08,.10,.12,.15]) {
      light.matrix.multiplyMatrices(inv,module.matrixWorld);light.matrix.elements[14]+=dz;
      const gap=visibleSurfaceGap(light,gloveSnapshot,scale);
      candidates.push({dz,...gap});
      if(gap.lowerMm>=2)break;
    }
    const compact=[];
    for(const [sx,dy,dx] of [[.72,.031,0],[.72,.031,.020],[.72,.031,-.020]]) {
      for(const dz of [.06,.075,.09,.105,.12]){
        light.matrix.multiplyMatrices(inv,module.matrixWorld);
        light.matrix.scale(new THREE.Vector3(sx,sx,sx));
        light.matrix.elements[12]+=dx; light.matrix.elements[13]+=dy; light.matrix.elements[14]+=dz;
        const gap=visibleSurfaceGap(light,gloveSnapshot,scale);
        compact.push({size:sx,dx,dy,dz,...gap});
        if(gap.lowerMm>=2)break;
      }
    }
    return {scale,candidates,compact,moduleRear:box.min.z,handFront:Number.isFinite(forward)?forward:null,
      clearanceMm:Number.isFinite(forward)?1000*scale*(box.min.z-forward):null,clearAcrossXY:!Number.isFinite(forward)};
  }
  const B=T.inspectHost().builders, ctx={...B.weaponContext(),finishGun:g=>g,mergeRigidMeshes:()=>{}};
  const H=await import('/studio/weapon-heavy.js'), mini=key==='minigun';
  const g=(mini?H.makeMinigunModel:H.makeLauncherModel)(ctx);
  g.updateMatrixWorld(true);
  const shell=g.children[0], grips=[];
  const probe=new THREE.Vector3(...(mini?[.0081,.00924,-.36433]:[.00059,-.09154,-.05233]));
  const both=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
  const insideRay=new THREE.Raycaster(probe,new THREE.Vector3(.81731,.36179,.44717).normalize());
  g.traverseVisible(m=>{
    if(!m.isMesh || !new THREE.Box3().setFromObject(m).containsPoint(probe))return;
    const copy=new THREE.Mesh(m.geometry,both); copy.matrixWorld.copy(m.matrixWorld);
    const hits=insideRay.intersectObject(copy,false).map(hit=>hit.distance);
    if(hits.filter((v,i)=>!i || v-hits[i-1]>1e-7).length%2) grips.push(m);
  });
  both.dispose();
  if(grips.length!==1)throw Error('Ambiguous firing grip '+key+': '+grips.length);
  const obstacles=[shell];
  if(!mini && g.userData.fpStock)obstacles.push(g.userData.fpStock);
  const ray=new THREE.Raycaster(), slices=[];
  for(const x of [-.008,0,.008]) for(const y of (mini?[-.025,-.016,0,.012]:[-.115,-.102,-.092,-.083])){
    const sign=mini?1:-1;
    ray.set(new THREE.Vector3(x,y,2*sign),new THREE.Vector3(0,0,-sign));
    const face=ray.intersectObject(grips[0],false)[0];
    if(!face)throw Error('Missing grip sample '+key);
    ray.set(face.point.clone().add(new THREE.Vector3(0,0,.000001*sign)),new THREE.Vector3(0,0,sign));
    const hit=ray.intersectObjects(obstacles,true)[0];
    slices.push({x,y,faceZ:face.point.z,housingZ:hit?.point.z??null,gapMm:hit?hit.point.distanceTo(face.point)*scale*1000:null});
  }
  return {scale,slices};
}
