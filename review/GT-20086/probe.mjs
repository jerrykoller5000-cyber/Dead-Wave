import {makeAkModel} from '../../studio/weapon-longarms.js';
import {updateLightSwitch} from '../../studio/weapon-light-switch.js';
import {visibleSurfaceGap,visiblePieces} from '../../tools/tests/weapon-seating.js';

export function probePad(T,search){
  const ctx={...T.inspectHost().builders.weaponContext(),finishGun:g=>g,mergeRigidMeshes:()=>{}};
  const g=makeAkModel(ctx),unit=g.userData.laserLightUnit,pad=unit.getObjectByName('lightSwitchPad');
  const marker=g.getObjectByName(g.userData.controls.lightSwitch),shell=unit.getObjectByName('moduleShell');
  const candidates=g.children.filter(o=>o.isMesh && o.material?.userData?.preserveArtworkUV);
  // This authored lower wood face is the host named by the actual equipped audit.
  const wood=g.children[53];
  if(!wood?.isMesh || !wood.material.map || !candidates.includes(wood))throw Error('Could not identify the audited wood face');
  g.scale.copy(T.weaponMeshes.ak.scale);g.visible=unit.visible=true;
  const rest=pad.position.clone(),contact=marker.position.toArray(),rows=[];
  const scale=1.8/1.655;
  for(const offset of (search?Array.from({length:22},(_,i)=>-i*.0005):[0])){
    pad.position.y=rest.y+offset;g.updateWorldMatrix(true,true);
    const woodGap=visibleSurfaceGap(pad,wood,scale),shellGap=visibleSurfaceGap(pad,shell,scale);
    rows.push({offset,woodGap,shellGap});
  }
  pad.position.copy(rest);g.updateWorldMatrix(true,true);
  const stroke=[];
  const restGeometry=pad.geometry;
  for(const amount of [0,.25,.5,.75,1,0]){
    marker.position.fromArray(contact).addScaledVector(new T.THREE.Vector3(...g.userData.lightSwitch.axis),amount*g.userData.lightSwitch.travel);
    updateLightSwitch(T.THREE,g);
    const base=restGeometry.attributes.position,pos=pad.geometry.attributes.position;
    let visibleTravel=0;
    for(let i=0;i<pos.count;i++)visibleTravel=Math.max(visibleTravel,Math.abs(pos.getZ(i)-base.getZ(i)));
    stroke.push({amount,visibleTravel,woodGap:visibleSurfaceGap(pad,wood,scale),shellGap:visibleSurfaceGap(pad,shell,scale)});
  }
  return {rows,stroke,contact,face:rest.toArray(),originalForeEnd:wood.material.name,closed:visiblePieces(pad).every(p=>p.closed)};
}
