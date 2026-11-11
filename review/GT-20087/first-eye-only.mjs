// Presentation correction for the oversized first-person glove. The shared prop,
// its animation anchors and other camera views keep the original geometry.
const templates = new Map();
const eyeCopies = new WeakMap();

function vertexKey(p) {
  return [p.x,p.y,p.z].map(v=>Math.round(v*1e5+.173)).join(',');
}

function smooth(a,b,t) {
  const u=Math.max(0,Math.min(1,(t-a)/(b-a)));
  return u*u*(3-2*u);
}

export function rememberGloveOutline(T,id,mesh) {
  if(templates.has(id))return;
  mesh.updateMatrix();
  const geo=mesh.geometry, positions=geo.attributes.position;
  const box=new T.Box3(),p=new T.Vector3(),points=[];
  for(let i=0;i<positions.count;i++){
    const v=p.fromBufferAttribute(positions,i).applyMatrix4(mesh.matrix).clone();
    points.push(v);box.expandByPoint(v);
  }
  const size=box.getSize(new T.Vector3()),offsets=new Map(),triangles=new Set();
  const keys=points.map(v=>{
    const x=(box.max.z-v.z)/size.z, y=(box.max.y-v.y)/size.y;
    const lower=id==='aa12'?0:-size.y*.12*smooth(.34,.80,y);
    const rear=id==='aa12'?-size.z*.068*smooth(.59,.90,x)*smooth(.13,.53,y):0;
    const key=vertexKey(v);offsets.set(key,[0,lower,rear]);return key;
  });
  const ix=geo.index, count=ix?ix.count:keys.length;
  for(let i=0;i<count;i+=3)triangles.add([0,1,2].map(j=>keys[ix?ix.getX(i+j):i+j]).sort().join('|'));
  templates.set(id,{box,offsets,triangles});
}

function fitDraw(T,mesh,transform,spec) {
  const source=mesh.geometry, pos=source.attributes.position;
  if(!source.boundingBox)source.computeBoundingBox();
  if(!source.boundingBox.clone().applyMatrix4(transform).intersectsBox(spec.box))return;
  const p=new T.Vector3(), keys=[];
  for(let i=0;i<pos.count;i++){
    p.fromBufferAttribute(pos,i).applyMatrix4(transform);
    keys.push(spec.box.distanceToPoint(p)<1e-5 ? vertexKey(p) : null);
  }
  const ix=source.index,count=ix?ix.count:pos.count, changes=new Set();
  for(let i=0;i<count;i+=3){
    const a=ix?ix.getX(i):i,b=ix?ix.getX(i+1):i+1,c=ix?ix.getX(i+2):i+2;
    if(!spec.offsets.has(keys[a]) || !spec.offsets.has(keys[b]) || !spec.offsets.has(keys[c]))continue;
    if(!spec.triangles.has([keys[a],keys[b],keys[c]].sort().join('|')))continue;
    changes.add(a);changes.add(b);changes.add(c);
  }
  if(!changes.size)return;
  const copy=source.clone(), moved=copy.attributes.position, inverse=transform.clone().invert();
  const origin=new T.Vector3().applyMatrix4(inverse);
  for(const i of changes){
    p.fromArray(spec.offsets.get(keys[i])).applyMatrix4(inverse).sub(origin);
    moved.setXYZ(i,pos.getX(i)+p.x,pos.getY(i)+p.y,pos.getZ(i)+p.z);
  }
  copy.userData={...source.userData,viewGloveOutline:true};
  copy.computeBoundingBox();copy.computeBoundingSphere();
  return {mesh,source,copy};
}

// Also used by the hand-fit export on its private renderer copy.
export function applyViewGloveOutline(T,root,id) {
  let draws=eyeCopies.get(root);
  if(!draws){
    draws=[];
    const spec=templates.get(id);
    if(spec)root.traverse(mesh=>{
      if(!mesh.isMesh || !mesh.geometry?.attributes?.position)return;
      const transform=new T.Matrix4();
      for(let n=mesh;n!==root && n;n=n.parent){n.updateMatrix();transform.premultiply(n.matrix);}
      const draw=fitDraw(T,mesh,transform,spec);
      if(draw)draws.push(draw);
    });
    eyeCopies.set(root,draws);
  }
  for(const {mesh,source,copy} of draws)if(mesh.geometry===source)mesh.geometry=copy;
  return draws.length;
}

const eyeKinds=new WeakMap();
export function updateEyeGloveOutline(T,root) {
  if(root.parent?.name!=='vm-gun' && root.parent?.name!=='vm-gun-2')return;
  let id=eyeKinds.get(root);
  if(id===undefined){
    id=['m4','uzi','aa12'].find(key=>root.getObjectByName('controls-lightSwitch-'+key))||null;
    eyeKinds.set(root,id);
  }
  if(id)applyViewGloveOutline(T,root,id);
}
