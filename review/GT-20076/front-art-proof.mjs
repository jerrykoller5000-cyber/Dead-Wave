import {makeChainsawModel,makeLauncherModel} from '../../studio/weapon-heavy.js';
import {visiblePieces,visibleSurfaceGap} from '../../tools/tests/weapon-seating.js';

function samples(geometry,include) {
  const {position:p,normal:n,uv}=geometry.attributes,out=new Set();
  for(let i=0;i<p.count;i++)if(include(p.getZ(i))){
    out.add([p.getX(i),p.getY(i),p.getZ(i),n.getX(i),n.getY(i),n.getZ(i),uv.getX(i),uv.getY(i)].join(','));
  }
  return out;
}
function compareExterior(original,current,include) {
  const a=samples(original,include),b=samples(current,include);
  if(a.size<10||a.size!==b.size||[...a].some(key=>!b.has(key)))throw Error('Exposed geometry changed '+a.size+'/'+b.size);
  return a.size;
}
function checkSeat(mesh,host) {
  const pieces=visiblePieces(mesh);
  const gap=visibleSurfaceGap(mesh,host,1.8/1.655);
  if(pieces.length!==1||!pieces[0].closed||gap.penetrating||gap.upperMm>.5)throw Error('Loose or open front graphic '+JSON.stringify(gap));
  return gap;
}
export function checkFrontArt(T,id) {
  const G=T.THREE,ctx=T.inspectHost().builders.weaponContext(),plates=[];
  const model=({launcher:makeLauncherModel,chainsaw:makeChainsawModel}[id])({...ctx,finishGun:x=>x,mergeRigidMeshes:()=>{},gunKit:root=>{
    const kit=ctx.gunKit(root);
    return {...kit,slab(points,width,mat,opts){
      const mesh=kit.slab(points,width,mat,opts);
      if(id==='chainsaw'&&width===.01&&points.length===9&&Math.abs(opts?.x)===.1)plates.push({mesh,original:mesh.geometry.clone()});
      return mesh;
    }};
  }});
  model.visible=true;model.scale.copy(T.weaponMeshes[id].scale);model.updateMatrixWorld(true);
  if(id==='chainsaw'){
    if(plates.length!==2)throw Error('Expected both front plates');
    return plates.map(({mesh,original})=>{
      const {position:p,normal:n,uv}=mesh.geometry.attributes;
      let capTriangles=0;
      for(let i=0;i<p.count;i+=3){
        if(Math.abs(p.getZ(i)-.11)>1e-7||Math.abs(n.getZ(i)+1)>1e-7)continue;
        const twiceArea=(p.getX(i+1)-p.getX(i))*(p.getY(i+2)-p.getY(i))-(p.getY(i+1)-p.getY(i))*(p.getX(i+2)-p.getX(i));
        if(twiceArea>=0)throw Error('Reversed cut face');
        for(let j=i;j<i+3;j++)if(Math.abs(uv.getX(j)-p.getX(j)*4)>1e-7||Math.abs(uv.getY(j)-p.getY(j)*4)>1e-7)throw Error('Cut face UV collapsed');
        capTriangles++;
      }
      if(capTriangles<4)throw Error('Missing plate cap');
      return {outerSamples:compareExterior(original,mesh.geometry,z=>z>.113),capTriangles,gap:checkSeat(mesh,model.children[0])};
    });
  }
  const graphic=model.getObjectByName('heatParts-barrel').children[0],kit=ctx.gunKit(new G.Group());
  const old=kit.lathe([[0,.2],[.052,.2],[.052,.66],[0,.66]],ctx.gunAccent,{y:.04,seg:16});
  const outerSamples=compareExterior(old.geometry,graphic.geometry,z=>z<.21||z>.65);
  const islands=visiblePieces(graphic);
  if(islands.length!==2||islands.some(p=>!p.closed))throw Error('Expected two closed exterior sections');
  // The contact helper measures one pair at a time. These triangles come from the
  // native mesh's connected pieces and are already transformed into its scene frame.
  const gaps=islands.map(island=>{
    const geometry=new G.BufferGeometry(),xyz=island.faces.flatMap(face=>face.p.flatMap(v=>v.toArray()));
    geometry.setAttribute('position',new G.Float32BufferAttribute(xyz,3));
    return checkSeat(new G.Mesh(geometry,graphic.material),model.children[33]);
  });
  return {outerSamples,gaps};
}
