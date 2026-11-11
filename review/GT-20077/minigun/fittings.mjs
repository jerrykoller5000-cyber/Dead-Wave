import assert from 'node:assert/strict';
import {save} from '../../GT-20076/save.mjs';

export async function heavyFittings(page, folder, id) {
  await page.evaluate(`(async()=>{
    const T=TT.THREE,id=${JSON.stringify(id)},g=TT.weaponMeshes[id],u=g.userData;
    const {visibleSurfaceGap}=await import('/tools/tests/weapon-seating.js');
    TT.reloadClipDbg.hold(null); TT.setZoomHeldDbg(false);TT.setViewFirstDbg(false);
    for(let i=0;i<150;i++)TT.stepFrame(1/30);
    TT.modsOwnAllDbg();
    const stage=new T.Group();stage.position.set(20,80,-60);stage.scale.setScalar(5);TT.scene.add(stage);
    const key=new T.DirectionalLight(0xffeedb,2.1),fill=new T.HemisphereLight(0xe0ebff,0xa29a89,1.25);
    key.position.copy(stage.position).add(new T.Vector3(4,5,-3));key.target.position.copy(stage.position);TT.scene.add(key,key.target,fill);
    window.heavyLook=async view=>{
      const fitted=view!=='default';
      if(!!u.fittedOptic?.visible!==fitted && !TT.armoryDbg.fit(id,'optic:rmr',fitted))throw Error('Armory optic toggle failed');
      for(let i=0;i<15;i++)TT.stepFrame(1/30);
      stage.clear();const copy=TT.cloneLean(g);
      copy.visible=true;copy.scale.setScalar(1);copy.rotation.set(0,0,0);copy.position.set(0,0,0);stage.add(copy);
      copy.updateWorldMatrix(true,true);
      const plate=u.opticPlate?.name;
      const path=[];for(let p=u.mag;p!==g;p=p.parent)path.unshift(p.parent.children.indexOf(p));
      const node=view==='drum'?path.reduce((parent,i)=>parent.children[i],copy):
        fitted?copy.getObjectByName('fitted-optic-rmr'):copy.getObjectByName(u.defaultSight.name);
      if(!node?.visible)throw Error('Displayed component missing: '+view);
      const pivot=new T.Box3().setFromObject(node).getCenter(new T.Vector3());
      const dir=view==='drum'?new T.Vector3(1,.28,-.34):new T.Vector3(.94,.14,-.28);
      const eye=pivot.clone().addScaledVector(dir.normalize(),view==='drum'?4.2:2);
      TT.setShotView({x:eye.x,y:eye.y,z:eye.z,tx:pivot.x,ty:pivot.y,tz:pivot.z,fov:34});
      for(let i=0;i<4;i++){TT.stepFrame(1/30);await new Promise(r=>setTimeout(r,80))}
      const result={view,defaultVisible:u.defaultSight.visible,fitted:!!u.fittedOptic?.visible,plateVisible:u.opticPlate?.visible};
      if(fitted && plate){
        const pad=copy.getObjectByName(plate),optic=copy.getObjectByName('fitted-optic-rmr');
        copy.updateWorldMatrix(true,true);
        const scale=g.scale.x/TT.getWeaponSizeDbg().upm/5, head=optic.getObjectByName('optic.rmr');
        result.gap=visibleSurfaceGap(pad,optic,scale);
        let nearest=visibleSurfaceGap(pad,head,scale);
        for(const piece of optic.children){
          if(piece===head || (!piece.isMesh && !piece.children.length))continue;
          const gap=visibleSurfaceGap(piece,head,scale);
          if(gap.upperMm<nearest.upperMm)nearest=gap;
        }
        result.sightToSupport=nearest;
      }
      return result;
    };
  })()`);
  const rows={};
  for(const view of ['default','rmr','drum']){
    rows[view]=await page.evaluate('heavyLook('+JSON.stringify(view)+')');
    const pic=await page.send('Page.captureScreenshot',{format:'jpeg',quality:95});
    await save(new URL('fitted-'+view+'.jpg',folder),Buffer.from(pic.data,'base64'));
  }
  assert.equal(rows.default.defaultVisible,true);
  assert.equal(rows.rmr.defaultVisible,false);
  await save(new URL('fittings.json',folder),JSON.stringify(rows,null,2));
  if(id==='minigun' || id==='launcher'){
    assert(rows.rmr.gap.upperMm<=.5,'Detached fitted plate');
    assert(rows.rmr.sightToSupport.upperMm<=.5,'Detached fitted sight');
  }
}
