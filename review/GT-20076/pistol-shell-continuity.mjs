import {makePistolModel} from '../../studio/weapon-sidearms.js';

export function checkShellDuringAnimation(T){
  const G=T.THREE,ctx=T.inspectHost().builders.weaponContext(),raw=makePistolModel({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{}});
  const cover=raw.getObjectByName('pistol dust cover');raw.updateWorldMatrix(true,true);
  const ref=new G.Group(),kit=ctx.gunKit(ref),old=kit.box(.040,.016,.24,ctx.gunPoly,0,.006,.14,0,0,0,ref,.006);
  ref.updateWorldMatrix(true,true);
  const slide=T.viewmodelDbg().gun.slide;
  if(!slide)throw Error('Missing game animation part');
  const atRest=slide.position.z, size=T.magazinesDbg('pistol').size;
  T.setMagazinesDbg('pistol',0,[size]);T.startReload();
  let open=0,frames=0;
  while(T.isReloading() && frames<360){
    T.stepFrame(1/60);frames++;open=Math.max(open,Math.abs(slide.position.z-atRest));
  }
  if(T.isReloading() || frames<3 || open<.01)throw Error('No complete animated opening');
  const upper=raw.userData.slide;
  const shape=upper.children.find(o=>o.isMesh);if(!shape)throw Error('Missing drawn upper shell');
  const initial=upper.position.clone(),ray=new G.Raycaster(),up=new G.Vector3(0,-1,0);
  const rows=[];
  for(const shift of [0,open/2,open]){
    upper.position.copy(initial);upper.position.z-=shift;raw.updateWorldMatrix(true,true);
    let tested=0,uncovered=0,visibleTopDifference=0,changedSamples=0;
    for(let x=-.019;x<=.01901;x+=.0038)for(let z=.021;z<.26;z+=.002){
      ray.set(new G.Vector3(x,.2,z),up);
      const former=ray.intersectObject(old,false)[0];if(!former)continue;
      const base=ray.intersectObject(cover,false)[0],upperHit=ray.intersectObject(shape,false)[0];
      tested++;if(!base){uncovered++;continue;}
      const visible=Math.max(base.point.y,upperHit?.point.y??-Infinity);
      const difference=Math.max(0,former.point.y-visible);
      if(difference>1e-6)changedSamples++;
      visibleTopDifference=Math.max(visibleTopDifference,difference);
    }
    rows.push({shift,tested,uncovered,changedSamples,visibleTopDifference});
  }
  upper.position.copy(initial);return {frames,open,returned:Math.abs(slide.position.z-atRest),rows};
}
