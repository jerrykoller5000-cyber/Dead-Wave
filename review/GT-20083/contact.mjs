import {makeChainsawModel} from '../../studio/weapon-heavy.js';
import {visiblePieces} from '../../tools/tests/weapon-seating.js';

export function contactAtEye(TT) {
  const T=TT.THREE, vm=TT.viewmodelDbg(), ctx=TT.inspectHost().builders.weaponContext();
  const raw=makeChainsawModel({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{}});
  const group=new T.Group();
  for(const name of ['chainsaw front rail metal','chainsaw front rail rubber','chainsaw front rail caps']){
    const mesh=raw.getObjectByName(name);if(!mesh)throw Error(name);group.add(mesh);
  }
  const legacy=new T.Group(),kit=ctx.gunKit(legacy),points=[[-.15,.018,-.14],[-.15,.115,-.13],[-.14,.218,-.085],[-.08,.246,-.035],[.06,.246,-.035],[.13,.216,.018],[.13,.027,.055]];
  for(let i=1;i<points.length;i++){
    const a=new T.Vector3(...points[i-1]),b=new T.Vector3(...points[i]),d=b.clone().sub(a),c=a.clone().lerp(b,.5);
    const m=kit.cyl(.014,.014,d.length(),ctx.gunDark,c.x,c.y,c.z,null,8,'y');
    m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());
  }
  kit.cyl(.018,.018,.132,ctx.gunRubber,-.01,.246,-.035,null,14,'x');
  for(let i=-2;i<=2;i++)kit.cyl(.02,.02,.008,ctx.gunPoly,-.01+i*.025,.246,-.035,null,14,'x');
  for(const [x,y,z] of [points[0],points[6]])kit.box(.032,.035,.04,ctx.gunPoly,x,y,z,0,0,0,null,.006);
  vm.gun.root.updateWorldMatrix(true,true);
  const inverse=vm.gun.root.matrixWorld.clone().invert(), hand=[];
  for(const skin of vm.arms.l.rig.skins){
    const m=skin.mesh;
    let on=true;for(let n=m;n;n=n.parent)if(!n.visible)on=false;
    if(!on)continue;
    m.updateWorldMatrix(true,false);
    const mat=inverse.clone().multiply(m.matrixWorld), pos=m.geometry.attributes.position;
    for(let i=0;i<pos.count;i++)hand.push(new T.Vector3().fromBufferAttribute(pos,i).applyMatrix4(mat));
  }
  const point=new T.Vector3(),ray=new T.Ray(),dir=new T.Vector3(.81,.37,.45).normalize();
  function nearest(node,p,best){
    if(node.box.distanceToPoint(p)>best)return best;
    if(!node.faces)return nearest(node.right,p,nearest(node.left,p,best));
    for(const f of node.faces){f.tri.closestPointToPoint(p,point);best=Math.min(best,p.distanceTo(point));}
    return best;
  }
  function intersections(node,hits){
    if(!ray.intersectsBox(node.box))return;
    if(!node.faces){intersections(node.left,hits);intersections(node.right,hits);return;}
    for(const {p} of node.faces)if(ray.intersectTriangle(p[0],p[1],p[2],false,point))hits.add(Math.round(point.distanceTo(ray.origin)*1e7));
  }
  function measure(root){
    const pieces=visiblePieces(root), depths=[], near=[];
    for(const p of hand){
      let gap=.012,inside=false;
      for(const part of pieces){
        if(part.box.distanceToPoint(p)>gap)continue;
        gap=nearest(part.tree,p,gap);
        if(part.closed && part.box.containsPoint(p)){
          ray.set(p,dir);const hits=new Set();intersections(part.tree,hits);if(hits.size%2)inside=true;
        }
      }
      if(gap<=.002)near.push(gap);
      if(inside&&gap>1e-7)depths.push(gap);
    }
    return {near:near.length,inside:depths.length,deep:depths.filter(d=>d>.0005).length,maxDepth:Math.max(0,...depths),
      closest:Math.min(.012,...near),pieces:pieces.length,closed:pieces.every(s=>s.closed)};
  }
  return {fov:vm.proj.fov,handVertices:hand.length,legacy:measure(legacy),current:measure(group)};
}
