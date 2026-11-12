import {makeUziModel} from '../../studio/weapon-sidearms.js';
import {visiblePieces,visibleSurfaceGap,enclosedArtwork} from '../../tools/tests/weapon-seating.js';

export function sampleWaspFurniture(T){
  const G=T.THREE,ctx=T.inspectHost().builders.weaponContext(),g=makeUziModel({...ctx,finishGun:x=>x,mergeRigidMeshes:()=>{}});
  g.visible=true;g.position.set(0,0,0);g.rotation.set(0,0,0);g.scale.set(1,1,1);g.updateMatrixWorld(true);
  const kit=ctx.gunKit(new G.Group()),main=visiblePieces(g.children[0])[0],shell=g.children[55],stripes=[],enclosed=[];
  const oldShell=kit.slab([[.18,-.002],[.187,-.013],[.319,-.016],[.334,-.009],[.34,.001],[.34,.058],[.331,.067],[.185,.07],[.18,.061]],.08,ctx.gunPoly,{bevel:.016,segs:4});
  oldShell.updateMatrixWorld(true);
  const ray=new G.Raycaster(),dir=new G.Vector3(),origin=new G.Vector3();
  let maxIn=0,maxOut=0,casingIn=0,casingOut=0,extreme,flat=0,samples=0;
  for(let j=0;j<12;j++){
    const z=.19+j*.012;
    const old=kit.slab([[z,-.007],[z+.003,-.007],[z+.003,.061],[z,.061]],.0808,ctx.gunDark,{bevel:.0015,segs:2});
    old.updateMatrixWorld(true);
    if(j<3){
      const proof=enclosedArtwork(visiblePieces(old)[0],main);if(!proof)throw Error('Original stripe was visible '+j);
      enclosed.push(j);continue;
    }
    const stripe=g.children[56+j-3],parts=visiblePieces(stripe),gap=visibleSurfaceGap(stripe,shell,1);
    if(parts.length!==2 || parts.some(p=>!p.closed) || gap.penetrating || gap.upperMm>.01)
      throw Error('Bad stripe contact '+JSON.stringify({j,parts:parts.length,closed:parts.map(p=>p.closed),gap}));
    if(stripe.material.userData.weaponFinishRole!=='furniture')throw Error('Paint role changed');
    stripes.push({interval:j,closed:parts.length,gap});
    for(const side of [-1,1])for(const dz of [.0005,.0015,.0025])for(let iy=0;iy<=66;iy++){
      const y=-.006+iy*.001;
      ray.set(origin.set(side*.10,y,z+dz),dir.set(-side,0,0));
      const x=mesh=>{const hit=ray.intersectObject(mesh,false)[0];return hit?side*hit.point.x:null;};
      const original=x(old),priorShell=x(oldShell),back=x(shell),current=x(stripe);
      if(priorShell!==null && back!==null){casingIn=Math.max(casingIn,priorShell-back);casingOut=Math.max(casingOut,back-priorShell);}
      if(original===null||priorShell===null||back===null||current===null)continue;
      const d=Math.max(current,back)-Math.max(original,priorShell);
      if(-d>maxIn){maxIn=-d;extreme={side,y,z:z+dz,oldAbsX:original,newAbsX:current};}
      maxOut=Math.max(maxOut,d);if(Math.abs(d)<1e-7)flat++;samples++;
    }
  }
  if(stripes.length!==9||!flat||!samples)throw Error('Missing supported side samples');
  return {stripes,enclosed,flat,samples,maxIn,maxOut,casingIn,casingOut,extreme};
}
