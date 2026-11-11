import {makeLauncherModel} from '../../studio/weapon-heavy.js';
import {visiblePieces,visibleSurfaceGap} from '../../tools/tests/weapon-seating.js';

export function checkRearGraphics(T){
  const ctx=T.inspectHost().builders.weaponContext(),panels=[],studs=[];
  let round;
  const g=makeLauncherModel({...ctx,finishGun:o=>o,mergeRigidMeshes:()=>{},gunKit:root=>{
    const k=ctx.gunKit(root);return {...k,box(...args){
      const mesh=k.box(...args);
      if((args[0]===.104 || args[0]===.084) && args[5]===.057)panels.push({mesh,original:mesh.geometry});
      return mesh;
    },cyl(...args){
      const mesh=k.cyl(...args);
      if(args[0]===.029 && args[2]===.11 && args[9]==='x')round=mesh;
      if(args[0]===.0025 && args[2]===.002 && Math.abs(args[4])===.047)studs.push(mesh);
      return mesh;
    }};
  }});
  if(panels.length!==2 || studs.length!==2 || !round)throw Error('Missing original rear graphic');
  g.scale.copy(T.weaponMeshes.launcher.scale);g.visible=true;g.updateWorldMatrix(true,true);
  const factor=1.8/1.655;
  function exterior(geometry,mesh){
    const {position,normal,uv}=geometry.attributes,tuples=new Set();
    for(let i=0;i<position.count;i++){
      const x=position.getX(i),y=position.getY(i),z=position.getZ(i);
      const depth=mesh.position.z+z-round.position.z;
      const boundary=round.position.y+.029-Math.abs(depth)*Math.tan(Math.PI/16);
      if(mesh.position.y+y<=boundary+1e-7)continue;
      tuples.add([x,y,z,normal.getX(i),normal.getY(i),normal.getZ(i),uv.getX(i),uv.getY(i)].join(','));
    }
    return tuples;
  }
  const graphics=panels.map(({mesh,original})=>{
    const a=exterior(original,mesh),b=exterior(mesh.geometry,mesh),pieces=visiblePieces(mesh);
    return {before:a.size,after:b.size,lost:[...a].filter(v=>!b.has(v)).length,added:[...b].filter(v=>!a.has(v)).length,
      originalsWereShared:original.userData.shared===true,privateGeometry:mesh.geometry!==original,
      islands:pieces.length,closed:pieces.every(p=>p.closed),roundGap:visibleSurfaceGap(mesh,round,factor)};
  });
  return {graphics,studs:studs.map(s=>({at:s.position.toArray(),support:visibleSurfaceGap(s,panels[0].mesh,factor),round:visibleSurfaceGap(s,round,factor)})),
    coverSupport:visibleSurfaceGap(panels[1].mesh,panels[0].mesh,factor)};
}
