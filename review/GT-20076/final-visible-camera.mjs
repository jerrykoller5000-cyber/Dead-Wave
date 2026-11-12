import {displayDepth,packDepth} from './display-depth.mjs';

export function makeViews(T,wallPoseMode=false,includeOpenFloor=false) {
  const G=T.THREE, H=T.inspectHost();
  const step=n=>{for(let i=0;i<n;i++) T.stepFrame(1/30);};
  const css=document.createElement('style');
  css.textContent='body > :not(canvas):not(script):not(style):not(#scopeOverlay):not(#view){visibility:hidden!important}';
  document.head.append(css);
  T.grantAllWeapons(); T.flightHold(true);
  if(T.isUnarmed()) T.toggleHolster();
  let frozen=false, id, gun, inner, carry, shown, worldProject;
  let lighting;
  H.attach({held:()=>frozen,scale:dt=>dt,frame:()=>{
    if(!lighting)return;
    const p=T.player.position;
    H.sun.position.copy(p).addScaledVector(new G.Vector3(...lighting.dir).normalize(),85);
    H.sun.target.position.copy(p); H.sun.target.updateMatrixWorld();
    H.sun.color.setHex(lighting.sunColor); H.sun.intensity=lighting.sun;
    H.hemi.color.setHex(lighting.skyColor); H.hemi.groundColor.setHex(lighting.ground);
    H.hemi.intensity=lighting.sky; H.ambientFill.intensity=lighting.fill; H.moon.intensity=0;
  }});
  async function light(key){
    const {LIGHTS}=await import('../../studio/inspector/stage.js');
    if(!LIGHTS[key])throw Error('Unknown review light '+key);
    lighting=LIGHTS[key]; await draw(true);
  }
  async function equip(key) {
    frozen=false; id=key;
    T.setShotView(null); T.setViewFirstDbg(true); T.setZoomHeldDbg(false);
    if(!T.weaponMeshes[id]) throw Error('Unknown weapon '+id);
    if(id!=='chainsaw' && !T.armoryDbg.stored().includes(id)) {
      T.armoryDbg.ui().armory.buy({id:'vis-'+id,kind:id},{store:true});
    }
    for(let i=0;i<30 && T.getCurrentWeapon()!==id;i++) {
      T.setWeapon(T.WEAPON_ORDER.indexOf(id)); step(12);
    }
    step(65); T.armoryDbg.refreshRack(true); step(4);
    gun=T.weaponMeshes[id]; carry=T.carryGunCopyDbg(id); inner=carry.children[0]; inner.updateMatrix();
    if(T.getCurrentWeapon()!==id) throw Error('Equip failed '+id);
  }
  function aim(eye,target,fov) {
    T.setShotView({x:eye.x,y:eye.y,z:eye.z,tx:target.x,ty:target.y,tz:target.z,fov});
  }
  async function draw(visible) {
    shown.visible=visible;
    for(let i=0;i<3;i++) { step(1); await new Promise(r=>setTimeout(r,35)); }
  }
  // A/B cosmetic stills reuse only the actor's recorded pose. The new weapon geometry,
  // materials and every part inside its root come from the normal model builder.
  function captureActorPose(){
    const rows=[],weapons=new Set([...Object.values(T.weaponMeshes),...Object.values(T.offhandMeshes)]);
    function walk(node,path){
      if(!node.visible || weapons.has(node))return;
      if(node.matrixAutoUpdate)node.updateMatrix();
      rows.push([path,node.type,node.name,node.matrix.toArray()]);
      node.children.forEach((child,i)=>walk(child,[...path,i]));
    }
    walk(T.player,[]);
    gun.updateWorldMatrix(true,false);
    return {rows,gunWorld:gun.matrixWorld.toArray()};
  }
  function restoreActorPose(saved){
    if(!saved?.rows?.length)throw Error('Missing recorded gameplay pose');
    const resolved=new Map(),used=new Set(),nativeAttachments=new Set();
    for(const [path,type,name,matrix] of saved.rows){
      const parentKey=path.slice(0,-1).join('.'),key=path.join('.');
      if(path.length && nativeAttachments.has(parentKey)){nativeAttachments.add(key);continue;}
      const parent=path.length?resolved.get(parentKey):null;
      // Skin batches are identity draws bound to the restored bones. Their count can
      // change with clothing. Verify both sets of draws and replay the pose on the bones.
      if(type==='SkinnedMesh' && name==='rig-skin'){
        const identity=new G.Matrix4();
        const batches=parent?.children.filter(n=>n.isSkinnedMesh && n.name===name);
        if(!identity.equals(new G.Matrix4().fromArray(matrix)) || !batches?.length ||
           batches.some(n=>!n.userData.rigSkin || n.children.length || !identity.equals(n.matrix)))
          throw Error('Unexpected transform on a skin batch');
        continue;
      }
      const matches=n=>n && n.type===type && n.name===name && !used.has(n);
      let node=path.length?parent?.children[path.at(-1)]:T.player;
      // The game batches the skin into separately named identity draws. Their sibling
      // order can differ between launches while their posed transform tree is identical.
      if(!matches(node))node=parent?.children.find(matches);
      if(!node)throw Error('Missing original actor node '+path.join('.')+' '+type+' '+name+' in '+(parent?.children.map(c=>c.type+'/'+c.name).join(',')||'no parent'));
      resolved.set(key,node);used.add(node);
      // A holstered model is rebaked with the revised artwork. Replay the holster's
      // carrier pose, then leave the native accessory's own drawing hierarchy alone.
      if(node.isGroup && parent?.children.some(child=>child.name==='open-molded-holster'))nativeAttachments.add(key);
      node.matrix.fromArray(matrix);node.matrix.decompose(node.position,node.quaternion,node.scale);
      node.matrixWorldNeedsUpdate=true;
    }
    T.player.updateWorldMatrix(true,true);
    gun.parent.updateWorldMatrix(true,false);
    const local=gun.parent.matrixWorld.clone().invert().multiply(new G.Matrix4().fromArray(saved.gunWorld));
    const reconstructedScale=new G.Vector3();
    local.decompose(gun.position,gun.quaternion,reconstructedScale);
    if(reconstructedScale.distanceTo(gun.scale)>1e-7)throw Error('Recorded pose changes the authored weapon scale');
    gun.updateMatrix();gun.updateWorldMatrix(true,true);
    if(gun.matrixWorld.elements.some((v,i)=>Math.abs(v-saved.gunWorld[i])>1e-6))throw Error('Gun pose differs from recorded gameplay');
  }
  async function pose(view, testSpot=null) {
    const openFloor=view.endsWith('-open');
    if(openFloor)view=view.slice(0,-5);
    const eye=['hip','aimed','aim-entry','pack-off'].includes(view), rackView=view==='rack';
    frozen=false; T.setShotView(null); T.setViewFirstDbg(eye); T.setZoomHeldDbg(view==='aimed');
    const range=T.trainingDbg.tg();
    // Downrange positions are clamped at the firing line. The floor five units
    // behind it is reachable and clear of both the range and station colliders.
    let spot=[range.origin.x,range.origin.z-(openFloor?5:.55)];
    if(testSpot) spot=[range.origin.x+testSpot[0],range.origin.z+testSpot[1]];
    const wall=wallPoseMode && (!openFloor || includeOpenFloor) && !testSpot && !eye && !rackView;
    T.player.position.set(spot[0],range.floorY,spot[1]); T.setOtsAimDbg(testSpot?.[2]||0,-.08); step(75);
    let saved;
    if(wall && wallPoseMode==='replay'){
      const reference=window.recordedArtViews?.[openFloor?view+'-open':view];
      if(!reference || Math.hypot(reference.spot[0]-spot[0],reference.spot[1]-spot[1])>.001)
        throw Error('Original wall pose requested another spot');
      if(Math.hypot(reference.actualSpot[0]-T.player.position.x,reference.actualSpot[1]-T.player.position.y,reference.actualSpot[2]-T.player.position.z)>.001)
        throw Error('Resolved wall pose is at another spot');
      saved=reference.nativePose;restoreActorPose(saved);
    }
    if(openFloor && !testSpot){
      const p=T.player.position;
      const boxes=[...range.solids.filter(b=>!b.floor && b.target==null),...(T.trainingDbg.state().cameraCollision?.boxes||[])];
      const near=b=>b.maxY>p.y+.4 && b.minY<p.y+2.2 && p.x>b.minX-1.8 && p.x<b.maxX+1.8 && p.z>b.minZ-1.8 && p.z<b.maxZ+1.8;
      if(Math.hypot(p.x-spot[0],p.z-spot[1])>.05 || boxes.some(near))throw Error('Clear-floor artwork position is obstructed or clamped');
    }
    let packPose;
    if(view==='pack-off'){
      if(id!=='flamer')throw Error('Fuel pack view requires the flamer');
      T.setAmmoDbg(id,0);T.startReload();T.reloadClipDbg.hold(.40);step(4);
      const state=T.getReloadDbg(),drawn=T.viewmodelDbg().gun,part=drawn.fuelCan,base=drawn.fuelCanBase?.pos;
      const elapsed=1-state.timer/state.anim;
      if(state.weapon!==id||Math.abs(elapsed-.40)>.002||!part||part.position.distanceTo(base)<.01)
        throw Error('Fuel pack did not detach '+JSON.stringify({state,elapsed,part:part?.position.toArray(),rest:base?.toArray()}));
      packPose={phase:elapsed,position:part.position.toArray(),rest:base.toArray()};
    }
    if(view==='aim-entry') {
      T.setZoomHeldDbg(true);
      for(let i=0;i<40 && T.viewmodelDbg().info.ads<.36;i++) T.stepFrame(1/60);
      if(!T.viewmodelDbg().root.visible)throw Error('Missed the glass transition');
    }
    const vm=T.viewmodelDbg(), camera=H.camera;
    let transform;
    if(eye) {
      if(!vm.info.active || vm.info.key!==id) throw Error('Wrong viewmodel');
      shown=vm.gun.root;
      const gain=vm.ndc(new G.Vector3(1,1,-1));
      transform=p=>{
        const v=vm.viewPoint(p);
        return [v.x*gain.x,v.y*gain.y,-v.z];
      };
    } else {
      let model;
      if(rackView) {
        const rack=T.scene.getObjectByName('training-armory').getObjectByName('armoryRack');
        const subject=rack.children.find(o=>o.userData.rackKind===id);
        if(!subject) throw Error('Missing rack model '+id);
        subject.updateWorldMatrix(true,false);
        model=subject.matrixWorld.clone().multiply(inner.matrix);
        const pivot=subject.getWorldPosition(new G.Vector3());
        const direction=new G.Vector3(.07,.06,1).normalize().applyQuaternion(rack.getWorldQuaternion(new G.Quaternion()));
        aim(pivot.clone().addScaledVector(direction,Math.max(.85,carry.userData.length*1.65)),pivot,40);
        shown=rack;
      } else if(view==='standard') {
        if(!gun.visible)throw Error('Missing standard held model '+id);
        if(saved)aim(new G.Vector3(...saved.eye),new G.Vector3(...saved.target),saved.fov);
        else {
          const prior=camera.position.clone(),turn=camera.quaternion.clone();
          for(let frame=0;frame<25;frame++){
            await new Promise(resolve=>setTimeout(resolve,80));
            const stable=prior.distanceTo(camera.position)<.001&&turn.angleTo(camera.quaternion)<.0005;
            prior.copy(camera.position);turn.copy(camera.quaternion);
            if(frame>=3&&stable)break;
          }
        }
        shown=gun;gun.updateWorldMatrix(true,false);model=gun.matrixWorld.clone();
      } else {
        if(!gun.visible) throw Error('Missing held model '+id);
        const centre=inner.position.clone().negate().divide(inner.scale);
        const pivot=gun.localToWorld(centre.clone());
        const side=view==='held-right'?1:-1;
        const offset=new G.Vector3(2.1*side,.43,.42).normalize().applyQuaternion(gun.getWorldQuaternion(new G.Quaternion()));
        if(saved)aim(new G.Vector3(...saved.eye),new G.Vector3(...saved.target),saved.fov);
        else aim(pivot.clone().addScaledVector(offset,Math.max(.8,carry.userData.length*2.1)),pivot,34);
        shown=gun; gun.updateWorldMatrix(true,false); model=gun.matrixWorld.clone();
      }
      transform=p=>{
        const clip=new G.Vector4(p.x,p.y,p.z,1).applyMatrix4(model)
          .applyMatrix4(camera.matrixWorldInverse).applyMatrix4(camera.projectionMatrix);
        return [clip.x,clip.y,clip.w];
      };
    }
    frozen=true; await draw(true); camera.updateMatrixWorld();
    const inverse=shown.matrixWorld.clone().invert();
    worldProject=eye ? p=>transform(p.clone().applyMatrix4(inverse)) : p=>{
      const v=new G.Vector4(p.x,p.y,p.z,1).applyMatrix4(camera.matrixWorldInverse).applyMatrix4(camera.projectionMatrix);
      return [v.x,v.y,v.w];
    };
    const points=[[0,0,0],[1,0,0],[0,1,0],[0,0,1]].map(x=>transform(new G.Vector3(...x)));
    const glassHidden=view==='aimed' && !vm.root.visible && vm.info.ads>.88 && Number(document.getElementById('scopeOverlay').style.opacity)>.95;
    const forward=new G.Vector3(0,0,1).applyQuaternion(gun.getWorldQuaternion(new G.Quaternion()));
    let nativePose;
    if(wall && wallPoseMode==='record'){
      nativePose=captureActorPose();
      const eyePoint=camera.getWorldPosition(new G.Vector3());
      nativePose.eye=eyePoint.toArray();nativePose.target=eyePoint.clone().add(camera.getWorldDirection(new G.Vector3())).toArray();nativePose.fov=camera.fov;
    }
    return {points,eye,glassHidden,fov:eye?null:camera.fov,target:rackView?'whole displayed rack':'isolated held artwork',
      nativePose,packPose,recordedWallPose:!!saved,spot,actualSpot:T.player.position.toArray(),heldElevation:eye||rackView?null:Math.asin(Math.max(-1,Math.min(1,forward.y)))*180/Math.PI};
  }
  async function mask(normal,repeat,hidden) {
    const decode=async str=>{
      const blob=await (await fetch('data:image/png;base64,'+str)).blob();
      const img=await createImageBitmap(blob);
      const can=document.createElement('canvas');can.width=img.width;can.height=img.height;
      const ctx=can.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0); img.close();
      return ctx.getImageData(0,0,can.width,can.height);
    };
    const [n,r,h]=await Promise.all([normal,repeat,hidden].map(decode));
    const bytes=new Uint8Array(n.width*n.height); let pixels=0;
    for(let i=0;i<bytes.length;i++) {
      const j=i*4;
      let noise=0,change=0;
      for(let k=0;k<3;k++) {
        noise=Math.max(noise,Math.abs(n.data[j+k]-r.data[j+k]));
        change=Math.max(change,Math.abs(n.data[j+k]-h.data[j+k]));
      }
      if(change>Math.max(4,noise*2+3)) {bytes[i]=1; pixels++;}
    }
    let binary='';
    for(let i=0;i<bytes.length;i+=16000) binary+=String.fromCharCode(...bytes.subarray(i,i+16000));
    return {width:n.width,height:n.height,pixels,bytes:btoa(binary)};
  }
  const depth=(width,height)=>packDepth(displayDepth(G,shown,width,height,worldProject));
  return {equip,pose,draw,mask,depth,light};
}
