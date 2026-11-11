import {makeSniperModel} from '../../studio/weapon-longarms.js';
import {visiblePieces,visibleSurfaceGap} from '../../tools/tests/weapon-seating.js';

export function checkStrips(T){
  const G=T.THREE,ctx=T.inspectHost().builders.weaponContext(),strips=[];
  const g=makeSniperModel({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{},gunKit:root=>{
    const k=ctx.gunKit(root);return {...k,box(...args){
      const mesh=k.box(...args);
      if(args[0]===.005 && args[1]===.005 && args[2]===.46)strips.push({mesh,original:mesh.geometry});
      return mesh;
    }};
  }});
  if(strips.length!==6)throw Error('Missing line graphics');
  g.visible=true;g.scale.copy(T.weaponMeshes.sniper.scale);g.updateWorldMatrix(true,true);
  const host=g.getObjectByName(g.userData.heatParts.barrel).children.find(c=>c.isMesh);
  return strips.map(({mesh,original})=>{
    const a=original.attributes,b=mesh.geometry.attributes;
    const dir=new G.Vector3(-1,0,0).applyQuaternion(mesh.getWorldQuaternion(new G.Quaternion()));
    const ray=new G.Raycaster(),point=new G.Vector3(),outer=new Set();
    let changed=0,surfaceMotion=0,outwardMotion=0,changedExterior=0,greatestChange=0;
    if(a.position.count!==b.position.count)throw Error('Changed tessellation');
    for(let i=0;i<a.position.count;i++){
      const x=a.position.getX(i),y=a.position.getY(i),z=a.position.getZ(i),dx=b.position.getX(i)-x;
      if(y!==b.position.getY(i) || z!==b.position.getZ(i))throw Error('Moved a graphic along or across the silhouette');
      for(const name of ['normal','uv'])for(let c=0;c<a[name].itemSize;c++)
        if(a[name].array[i*a[name].itemSize+c]!==b[name].array[i*b[name].itemSize+c])throw Error('Changed shading or UV');
      ray.set(mesh.localToWorld(point.set(.1,y,z)),dir);
      const hit=ray.intersectObject(host,false)[0];if(!hit)throw Error('Missing host surface in actual graphic section');
      const hostX=mesh.worldToLocal(hit.point).x;
      if(Math.abs(dx)>1e-8){changed++;greatestChange=Math.max(greatestChange,Math.abs(dx));}
      if(x>hostX+1e-7){outer.add([x,y,z,a.normal.getX(i),a.normal.getY(i),a.normal.getZ(i),a.uv.getX(i),a.uv.getY(i)].join(','));
        if(Math.abs(dx)>1e-8)changedExterior++;surfaceMotion=Math.max(surfaceMotion,Math.abs(dx));}
      if(x>.0020)outwardMotion=Math.max(outwardMotion,Math.abs(dx));
    }
    const pieces=visiblePieces(mesh),gap=visibleSurfaceGap(mesh,host,1.8/1.655);
    return {angle:mesh.rotation.z,closed:pieces.length===1&&pieces[0].closed,changed,greatestChange,exposed:outer.size,changedExterior,surfaceMotion,outwardMotion,gap};
  });
}
