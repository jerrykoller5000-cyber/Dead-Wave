// The thumb drives an ordinary named control. Its pad shares the lamp's existing
// material draw, so the control translates only that pad's vertices in the batch.
const templates = new Map();
const roots = new WeakMap();
const pressedGeometry = new WeakMap();
const namePrefix = 'controls-lightSwitch-';

function coordinate(point) {
  return [point.x,point.y,point.z].map(n=>Math.round(n*100000+.173)).join(',');
}

function triangles(geometry, matrix, T, visit) {
  const position=geometry.attributes.position, index=geometry.index;
  const point=new T.Vector3(), keys=[];
  for(let i=0;i<position.count;i++){
    keys.push(coordinate(point.fromBufferAttribute(position,i).applyMatrix4(matrix)));
  }
  const count=index?index.count:position.count;
  for(let i=0;i+2<count;i+=3){
    const a=index?index.getX(i):i, b=index?index.getX(i+1):i+1, c=index?index.getX(i+2):i+2;
    visit([keys[a],keys[b],keys[c]].sort().join('|'),a,b,c);
  }
}

export function createLightSwitch(T,gun,unit,kind,pad,axis,travel,surfaceOffset) {
  const marker=new T.Group();
  marker.name=namePrefix+kind;
  marker.position.copy(pad.position).addScaledVector(axis,-surfaceOffset);
  unit.add(marker);
  pad.updateMatrix();
  const faces=new Set();
  triangles(pad.geometry,pad.matrix,T,key=>faces.add(key));
  const position=pad.geometry.attributes.position,point=new T.Vector3();
  let front=Infinity,back=-Infinity;
  for(let i=0;i<position.count;i++){
    const depth=point.fromBufferAttribute(position,i).applyMatrix4(pad.matrix).dot(axis);
    front=Math.min(front,depth);back=Math.max(back,depth);
  }
  templates.set(marker.name,{rest:marker.position.toArray(),axis:axis.toArray(),travel,faces,front,back});
  gun.userData.lightSwitch={axis:axis.toArray(),travel};
  // World copies enter the same per-frame artwork update as the first-person copy.
  gun.userData.artworkInstanceMeshes ||= [];
  roots.delete(gun);
  return marker;
}

function restoredGeometry(geometry) {
  const rest=pressedGeometry.get(geometry);
  if(rest)return rest;
  // A first-person twin keeps its own winding and borrows the source positions.
  const fromWorld=pressedGeometry.get(geometry.userData?.vmFlipOf);
  if(!fromWorld)return geometry;
  const twin=geometry.clone();
  twin.setAttribute('position',fromWorld.attributes.position.clone());
  twin.userData={...geometry.userData};
  delete twin.userData.lightSwitchPress;
  pressedGeometry.set(geometry,twin);
  return twin;
}

function prepareDraws(T,unit,spec) {
  const found=new Set(),matches=[];
  unit.traverse(mesh=>{
    if(!mesh.isMesh || !mesh.geometry?.attributes?.position)return;
    const geometry=restoredGeometry(mesh.geometry);
    const matrix=new T.Matrix4();
    for(let node=mesh;node!==unit;node=node.parent){
      node.updateMatrix();matrix.premultiply(node.matrix);
    }
    const indices=new Set();
    triangles(geometry,matrix,T,(key,a,b,c)=>{
      if(!spec.faces.has(key))return;
      found.add(key);indices.add(a);indices.add(b);indices.add(c);
    });
    if(!indices.size)return;
    const weights=new Map(),point=new T.Vector3(),axis=new T.Vector3().fromArray(spec.axis);
    for(const index of indices){
      const depth=point.fromBufferAttribute(geometry.attributes.position,index).applyMatrix4(matrix).dot(axis);
      // Hold the backing fixed and compress the material between it and the thumb.
      weights.set(index,Math.min(1,Math.max(0,(spec.back-depth)/(spec.back-spec.front))));
    }
    const inverse=matrix.clone().invert();
    const delta=axis.multiplyScalar(spec.travel).applyMatrix4(inverse).sub(new T.Vector3().applyMatrix4(inverse));
    matches.push({mesh,rest:geometry,working:null,weights,delta});
  });
  return found.size===spec.faces.size?matches:[];
}

function pressDraws(T,entry,weight) {
  for(const part of entry.draws){
    const {mesh,rest,weights,delta}=part;
    if(!weight){
      if(part.working){
        mesh.geometry=rest;part.working.dispose();part.working=null;
      }
      continue;
    }
    if(!part.working){
      // The held gun, carried copy and eye copy can share a rest geometry. Only
      // the active copy owns the temporary buffer, which is released on reset.
      part.working=rest.clone();
      part.working.userData={...rest.userData,lightSwitchPress:entry.marker.name};
      pressedGeometry.set(part.working,rest);
      mesh.geometry=part.working;
      mesh.geometry.attributes.position.setUsage?.(T.DynamicDrawUsage);
    }
    const base=rest.attributes.position,position=part.working.attributes.position;
    for(const [index,depth] of weights){
      const amount=weight*depth;
      position.setXYZ(index,base.getX(index)+delta.x*amount,base.getY(index)+delta.y*amount,base.getZ(index)+delta.z*amount);
    }
    position.needsUpdate=true;
  }
}

export function updateLightSwitch(T,root) {
  if(!root)return;
  let entry=roots.get(root);
  if(entry===undefined){
    const unit=root.getObjectByName('laserLightUnit');
    const marker=unit?.children.find(node=>node.name.startsWith(namePrefix));
    const spec=marker && templates.get(marker.name);
    entry=spec?{unit,marker,spec,draws:null,weight:0}:null;
    roots.set(root,entry);
    // The lean eye clone preserves names, but omits arbitrary node metadata.
    if(entry){
      if(!marker.userData.restPosition)marker.userData.restPosition=spec.rest.slice();
      unit.traverse(mesh=>{if(mesh.isMesh)mesh.geometry=restoredGeometry(mesh.geometry);});
    }
  }
  if(!entry)return;
  const {unit,marker,spec}=entry, p=marker.position, a=spec.axis, r=spec.rest;
  const travel=(p.x-r[0])*a[0]+(p.y-r[1])*a[1]+(p.z-r[2])*a[2];
  const weight=unit.visible?Math.max(0,Math.min(1,travel/spec.travel)):0;
  if(Math.abs(weight-entry.weight)<1e-7)return;
  if(!weight && entry.draws?.length===0)entry.draws=null;
  if(weight && !entry.draws)entry.draws=prepareDraws(T,unit,spec);
  if(entry.draws)pressDraws(T,entry,weight);
  entry.weight=weight;
}
