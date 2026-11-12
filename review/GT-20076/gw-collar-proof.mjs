import {makeM4Model} from '../../studio/weapon-longarms.js';
import {lathe} from '../../core/geometry.js';
import {artworkFingerprint,visiblePieces,visibleSurfaceGap} from '../../tools/tests/weapon-seating.js';
import {exteriorSamples} from './stock-mount-proof.mjs';

const oldTube=[[0,-.505],[.019,-.505],[.022,-.5],[.022,-.19],[.026,-.188],[.026,-.168],[0,-.168]];
const originalX=-.0475/2+.0012;
export function checkGwCollar(T,id,baseline,pictures=false){
  if(id!=='m4')throw Error('Unexpected model');
  const G=T.THREE,ctx=T.inspectHost().builders.weaponContext();
  const model=makeM4Model({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{}});
  model.visible=true;model.scale.copy(T.weaponMeshes.m4.scale);model.updateMatrixWorld(true);
  const tube=model.getObjectByName('GW-4 tube'),collar=model.getObjectByName('GW-4 rear collar');
  const marks=[-.126,-.094].map(z=>model.children.find(o=>o.isGroup&&Math.abs(o.position.z-z)<1e-8&&Math.abs(o.position.y-.002)<1e-8));
  if(marks.some(g=>!g||g.children.length!==2))throw Error('Missing indicator artwork');
  const current=tube.geometry,original=lathe(oldTube,12),finalPositions=marks.map(g=>g.position.clone());
  function show(phase){
    tube.geometry=phase==='before'?original:current;
    marks.forEach((g,i)=>{g.position.copy(finalPositions[i]);if(phase==='before')g.position.x=originalX;});
    model.updateMatrixWorld(true);
  }
  show('before');const u=model.userData,ignore=[u.flash,u.flashLight,u.laser,u.flare].filter(Boolean);
  const hash=artworkFingerprint(visiblePieces(model,1.8/1.655,ignore));
  if(hash!==baseline)throw Error('Original GW-4 differs '+hash+' vs '+baseline);
  show('after');if(pictures)return {model,show,hash};
  const cellCount=visiblePieces(tube).length,gap=visibleSurfaceGap(tube,collar,1.8/1.655);
  const exterior=[exteriorSamples(tube,original,2,-1,.19),exteriorSamples(tube,original,2,1,-.178)];
  model.scale.setScalar(1);model.updateMatrixWorld(true);
  const rows=marks.map(g=>{
    const meshes=model.children.filter(o=>o.isMesh&&o!==tube&&o!==collar);
    const points=[[0,0],[.001,0],[-.001,0],[0,.001],[0,-.001]].map(([dy,dz])=>{
      const y=g.position.y+dy,z=g.position.z+dz,ray=new G.Raycaster(new G.Vector3(-.3,y,z),new G.Vector3(1,0,0));
      const hits=ray.intersectObjects(meshes,false).filter(h=>h.point.x<0).slice(0,3);
      return {y,z,hits:hits.map(h=>[model.children.indexOf(h.object),h.object.name,h.point.x])};
    });
    const backing=model.children[points[0].hits[0][0]];
    return {position:g.position.toArray(),points,backing:backing.name||model.children.indexOf(backing),
      seat:visibleSurfaceGap(g.children[0],backing),crown:visibleSurfaceGap(g.children[1],g.children[0])};
  });
  return {hash,cellCount,closed:visiblePieces(tube).every(p=>p.closed),gap,exterior,rows};
}
