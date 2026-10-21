import fs from 'node:fs';import{Engine}from'../../tools/camera.mjs';
const E=new Engine({inspect:true,warm:'none',size:'1440x1000'}),out='review/marine-fit-GP19920';
try{await E.open();const proof=await E.ev(`await DWInspect.show('marine');await DWInspect.marine.preset('hot');await DWInspect.marine.play('stand');await wait(350);DWInspect.pause();
const m=T.getMarine(),TH=T.THREE,checks=[];
for(const side of ['L','R']){
 const elbow=m.userData['elbow'+side+'G'],wr=elbow.userData.wrist,mesh=elbow.getObjectByName('wrist-continuous-skin');
 for(const angle of [0,.5,1,-.7]){
  wr.quaternion.setFromAxisAngle(new TH.Vector3(1,0,0),angle);m.updateWorldMatrix(true,true);mesh.userData.bend();let gap=0;
  for(let k=0;k<10;k++){
   const a=(k+.5)/10*Math.PI*2,ss=Math.sin(a),cc=Math.cos(a);
   const expected=wr.localToWorld(new TH.Vector3(.029*Math.sign(ss)*Math.abs(ss)**.7,0,wr.userData.grip.z-.030-wr.position.z+.016*Math.sign(cc)*Math.abs(cc)**.7));
   const actual=mesh.localToWorld(new TH.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,4*121+6+k*12));gap=Math.max(gap,actual.distanceTo(expected));
  }checks.push({side,angle,gap});
 }
}
const mixed=[];
for(const secondary of [['pistol','revolver'],['revolver','pistol'],['uzi','revolver'],['revolver','uzi'],['pistol','uzi'],['uzi','pistol']]){
 const rig=T.carryPreview(m,{loadout:{primary:['m4','ak'],secondary},dualOwned:{pistol:true,revolver:true,uzi:true},inHand:null,vest:true});
 mixed.push({secondary,slots:rig.holsters.concat(rig.pairs).filter(h=>h.g.visible).map(h=>({kind:h.kind,position:h.g.position.toArray(),shellVisible:h.shell?.visible}))});
}
await DWInspect.marine.play('stand');await DWInspect.marine.preset('full');DWInspect.play();const t=performance.now(),f=DWInspect.time().frames;await wait(3000);const fps=(DWInspect.time().frames-f)*1000/(performance.now()-t);DWInspect.pause();
return {checks,mixed,fps,errors:DWInspect.errors()};`);
fs.writeFileSync(out+'/seams-and-mixed.json',JSON.stringify({loadSec:E.loadSec,...proof},null,2));console.log(JSON.stringify({loadSec:E.loadSec,maxSeamGap:Math.max(...proof.checks.map(c=>c.gap)),mixed:proof.mixed.length,fps:proof.fps,errors:proof.errors}));
}finally{await E.close();}
