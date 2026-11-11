import assert from 'node:assert/strict';
import {save} from '../../GT-20076/save.mjs';

export async function captureScope(page,folder) {
  const gaps = await page.evaluate(`(async()=>{
    const T=TT.THREE, gun=TT.weaponMeshes.sniper, source=gun.getObjectByName('optic.nx8');
    if(!source?.visible)throw Error('Issued optic is missing');
    const {makeOptic}=await import('/studio/weapon-optics.js');
    const {visibleSurfaceGap}=await import('/tools/tests/weapon-seating.js');
    const raw=makeOptic('nx8');
    const shell=raw.getObjectByName('NX8 tapered optical housing');
    const saddle=raw.getObjectByName('machined turret saddle');
    const collars=raw.children.filter(part=>part.name==='30 mm scope ring');
    const supports=raw.children.filter(part=>part.name==='scope ring saddle');
    if(collars.length!==2 || supports.length!==2)throw Error('Missing optic art');
    const gaps={};
    const scale=gun.scale.x/TT.getWeaponSizeDbg().upm;
    function measure(label,left,right){gaps[label]=visibleSurfaceGap(left,right,scale)}
    for(let i=0;i<collars.length;i++){
      measure('collar-to-body-'+i,collars[i],shell);
      measure('support-to-collar-'+i,supports[i],collars[i]);
    }
    for(const name of ['exposed ZeroStop elevation turret','right capped windage turret','left parallax and illumination dial']){
      measure(name,raw.getObjectByName(name),saddle);
    }
    const stage=new T.Group();
    stage.position.set(20,80,-60);stage.scale.setScalar(6);TT.scene.add(stage);
    TT.reloadClipDbg.hold(null);TT.setZoomHeldDbg(false);TT.setViewFirstDbg(false);
    for(let i=0;i<90;i++)TT.stepFrame(1/30);
    const copy=TT.cloneLean(gun);copy.visible=true;copy.scale.setScalar(1);
    copy.position.set(0,0,0);copy.rotation.set(0,0,0);stage.add(copy);
    if(!copy.getObjectByName('optic.nx8')?.visible)throw Error('Missing scope on display copy');
    const focus=stage.localToWorld(new T.Vector3(0,.14,-.12));
    const key=new T.DirectionalLight(0xffeedb,2),fill=new T.HemisphereLight(0xddeaff,0x9d9386,1);
    key.position.copy(focus).add(new T.Vector3(4,5,-3));key.target.position.copy(focus);
    TT.scene.add(key,key.target,fill);
    window.closeScope=async view=>{
      const v=({side:[1,.08,.05],front:[.47,.31,1],rear:[.48,.30,-1]})[view];
      const eye=focus.clone().addScaledVector(new T.Vector3(...v).normalize(),3.65);
      TT.setShotView({x:eye.x,y:eye.y,z:eye.z,tx:focus.x,ty:focus.y,tz:focus.z,fov:29});
      for(let i=0;i<4;i++){TT.stepFrame(1/30);await new Promise(r=>setTimeout(r,75))}
    };
    return gaps;
  })()`);
  await save(new URL('scope-joins.json',folder),JSON.stringify(gaps,null,2));
  for(const view of ['side','front','rear']){
    await page.evaluate('closeScope('+JSON.stringify(view)+')');
    const data=await page.send('Page.captureScreenshot',{format:'jpeg',quality:95});
    await save(new URL('scope-'+view+'.jpg',folder),Buffer.from(data.data,'base64'));
  }
  for(const [name,gap] of Object.entries(gaps))assert(gap.upperMm<=.5,name+' is detached');
}
