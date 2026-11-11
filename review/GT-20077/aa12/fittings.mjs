import assert from 'node:assert/strict';
import {save} from '../../GT-20076/save.mjs';

export async function captureFittings(page,folder){
  await page.evaluate(`(async()=>{
    const T=TT.THREE,g=TT.weaponMeshes.aa12,u=g.userData;
    TT.reloadClipDbg.hold(null);TT.setZoomHeldDbg(false);
    for(let i=0;i<150;i++)TT.stepFrame(1/30);
    TT.modsOwnAllDbg();TT.addCash(100000);TT.buyExtMag('aa12');
    if(!TT.armoryDbg.fit('aa12','laserLight',true) || !u.laserLightUnit.visible)throw Error('Light not fitted');
    const stage=new T.Group();stage.position.set(20,80,-60);stage.scale.setScalar(5);TT.scene.add(stage);
    const key=new T.DirectionalLight(0xffeedb,2.5),fill=new T.HemisphereLight(0xecf3ff,0xb2a99e,1.3);
    key.position.copy(stage.position).add(new T.Vector3(4,5,-3));key.target.position.copy(stage.position);TT.scene.add(key,key.target,fill);
    TT.setViewFirstDbg(false);
    function bounds(node){
      const box=new T.Box3(),p=new T.Vector3();
      g.updateWorldMatrix(true,true);
      const inv=g.matrixWorld.clone().invert();
      node.traverse(o=>{if(!o.isMesh)return;
        const mat=inv.clone().multiply(o.matrixWorld),v=o.geometry.attributes.position;
        for(let i=0;i<v.count;i++)box.expandByPoint(p.fromBufferAttribute(v,i).applyMatrix4(mat));
      });
      return {lo:box.min.toArray(),hi:box.max.toArray()};
    }
    window.fitBreacher=async(ext,view)=>{
      TT.armoryDbg.fit('aa12','ext',ext);
      if((TT.weaponMods('aa12').fitted==='ext')!==ext)throw Error('Wrong displayed drum');
      for(let i=0;i<80;i++)TT.stepFrame(1/30);
      stage.clear();const copy=TT.cloneLean(g);
      copy.visible=true;copy.position.set(0,0,0);copy.quaternion.identity();copy.scale.setScalar(1);stage.add(copy);
      const focus=view==='light'?new T.Vector3(.07,.035,.748):new T.Vector3(0,-.22,.05);
      const direction=view==='light'?new T.Vector3(1,.22,.58):new T.Vector3(1,.12,-.22);
      const center=stage.localToWorld(focus),eye=center.clone().addScaledVector(direction.normalize(),view==='light'?2.0:4.8);
      TT.setShotView({x:eye.x,y:eye.y,z:eye.z,tx:center.x,ty:center.y,tz:center.z,fov:33});
      for(let i=0;i<5;i++){TT.stepFrame(1/30);await new Promise(r=>setTimeout(r,80))}
      return {ext,body:bounds(u.magStretch),pivot:u.mag.position.toArray(),lamp:u.laserLightUnit.position.toArray()};
    };
  })()`);
  const states={};
  for(const [part,ext,view] of [['standard',false,'mag'],['extended',true,'mag'],['light',true,'light']]){
    states[part]=await page.evaluate('fitBreacher('+ext+','+JSON.stringify(view)+')');
    const data=await page.send('Page.captureScreenshot',{format:'jpeg',quality:95});
    await save(new URL('fitted-'+part+'.jpg',folder),Buffer.from(data.data,'base64'));
  }
  assert.deepEqual(states.standard.pivot,states.extended.pivot);
  assert.deepEqual(states.standard.lamp,states.extended.lamp);
  assert(Math.abs(states.standard.body.hi[1]-states.extended.body.hi[1])<.0005,'Drum top moved into the well');
  assert(states.extended.body.lo[1]<states.standard.body.lo[1]-.025,'Drum did not grow below the well');
  await save(new URL('fittings.json',folder),JSON.stringify(states,null,2));
  console.log('PASS Breacher standard and extended drum share the upper seat; fitted light and pivot fixed');
}
