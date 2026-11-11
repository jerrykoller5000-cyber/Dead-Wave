import {displayDepth,packDepth} from './display-depth.mjs';

export function makeViews(T) {
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
  async function pose(view, testSpot=null) {
    const openFloor=view.endsWith('-open');
    if(openFloor)view=view.slice(0,-5);
    const eye=['hip','aimed','aim-entry'].includes(view), rackView=view==='rack';
    frozen=false; T.setShotView(null); T.setViewFirstDbg(eye); T.setZoomHeldDbg(view==='aimed');
    const range=T.trainingDbg.tg();
    let spot=[range.origin.x,range.origin.z-.55];
    if(openFloor){
      const obstacles=range.solids.filter(b=>b.maxY>range.floorY+.45 && b.minY<range.floorY+2.2);
      spot=[[0,4],[3,4],[-3,4],[0,8]].map(([x,z])=>[range.origin.x+x,range.origin.z+z])
        .find(([x,z])=>obstacles.every(b=>x<b.minX-1.8 || x>b.maxX+1.8 || z<b.minZ-1.8 || z>b.maxZ+1.8));
      if(!spot)throw Error('No clear floor for the held artwork');
    }
    if(testSpot) spot=[range.origin.x+testSpot[0],range.origin.z+testSpot[1]];
    T.player.position.set(spot[0],range.floorY,spot[1]); T.setOtsAimDbg(testSpot?.[2]||0,-.08); step(75);
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
      } else {
        if(!gun.visible) throw Error('Missing held model '+id);
        const centre=inner.position.clone().negate().divide(inner.scale);
        const pivot=gun.localToWorld(centre.clone());
        const side=view==='held-right'?1:-1;
        const offset=new G.Vector3(2.1*side,.43,.42).normalize().applyQuaternion(gun.getWorldQuaternion(new G.Quaternion()));
        aim(pivot.clone().addScaledVector(offset,Math.max(.8,carry.userData.length*2.1)),pivot,34);
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
    return {points,eye,glassHidden,fov:eye?null:camera.fov,target:rackView?'whole displayed rack':'isolated held artwork',
      spot,actualSpot:T.player.position.toArray(),heldElevation:eye||rackView?null:Math.asin(Math.max(-1,Math.min(1,forward.y)))*180/Math.PI};
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
