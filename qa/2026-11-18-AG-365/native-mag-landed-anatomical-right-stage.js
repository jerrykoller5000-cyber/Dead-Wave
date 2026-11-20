(async()=>{
 const T=TT,H=T.inspectHost(),G=T.THREE,I=DWInspect;await I.show('marine');await I.still(false);I.backdrop('studio');I.light('noon');for(const k of['grid','bounds','axes','stick','joints','wire','labels'])I.overlay(k,false);T.resetEconomyDbg();const gear=T.getGearOwned();for(const k of Object.keys(gear))gear[k]=false;I.marine.gear('flashlight',false);H.loop(true);I.play();await I.stepAsync(20);I.pause();H.loop(false);
 const canvas=H.renderer.domElement;canvas.setAttribute('data-gt24','true');const style=document.createElement('style');style.textContent='body *{visibility:hidden!important}canvas[data-gt24],canvas[data-dwi-held-frame]{visibility:visible!important;position:fixed!important;left:0!important;top:0!important;width:100vw!important;height:100vh!important}canvas[data-gt24]{z-index:2147483646!important}canvas[data-dwi-held-frame]{z-index:2147483647!important}';document.head.append(style);
 const marine=T.getMarine(),{beltPouchComponents}=await import('/review/GT-20124/pouch-components-v1.js'),pouches=beltPouchComponents(G,marine);
 const inside=(host,v)=>{const P=host.geometry.attributes.position,J=host.geometry.index,directions=[[1,.231,.417],[.319,1,.271],[.279,.173,1]],votes=[];for(const a of directions){const ray=new G.Ray(v,new G.Vector3(...a).normalize()),hit=new G.Vector3(),dist=[];for(let j=0;j<(J?.count??P.count);j+=3){const tri=[0,1,2].map(k=>new G.Vector3().fromBufferAttribute(P,J?J.getX(j+k):j+k));if(ray.intersectTriangle(...tri,false,hit))dist.push(hit.distanceTo(v));}dist.sort((a,b)=>a-b);const unique=dist.filter((d,i)=>!i||Math.abs(d-dist[i-1])>1e-8);votes.push(unique.length%2===1);}return{inside:votes.every(Boolean),votes};};
 const visible=m=>{if(!m.visible||!m.layers.mask)return false;for(let p=m.parent;p;p=p.parent)if(!p.visible)return false;return true;};
 const bounds=()=>{T.player.updateMatrixWorld(true);const b=new G.Box3(),v=new G.Vector3(),M=new G.Matrix4(),W=new G.Matrix4();T.player.traverse(m=>{if(!m.isMesh||!visible(m)||!m.geometry?.attributes.position)return;if(m.isSkinnedMesh)m.skeleton.update();const P=m.geometry.attributes.position;for(let n=0;n<(m.isInstancedMesh?m.count:1);n++){if(m.isInstancedMesh){m.getMatrixAt(n,M);W.multiplyMatrices(m.matrixWorld,M);}else W.copy(m.matrixWorld);for(let j=0;j<P.count;j++){if(m.isSkinnedMesh)m.getVertexPosition(j,v);else v.fromBufferAttribute(P,j);b.expandByPoint(v.applyMatrix4(W));}}});return b;};
 const savedVest=[],initialMags=T.updateCarriedGear(0,true).mags,vestScratch=new G.Matrix4();for(let i=2;i<5;i++){initialMags.getMatrixAt(i,vestScratch);savedVest.push(vestScratch.toArray());}
 window.GT24={T,H,G,I,marine,pouches,inside,bounds,camera:null,savedVest};
 window.GT24Draw=async()=>{await I.still(false);I.pause();H.loop(true);await I.still(true);const held=document.querySelector('canvas[data-dwi-held-frame]');if(!held||held.width<1||held.height<1||getComputedStyle(held).visibility!=='visible')throw Error('Public Inspector heldcopy must be present and visible for external capture');return{heldCopy:true,width:held.width,height:held.height};};
 window.GT24Pose=async(spec)=>{await I.still(false);H.loop(true);await I.marine.play(spec.move);I.marine.weapon(spec.weapon);for(const k of Object.keys(gear))gear[k]=false;I.marine.gear('flashlight',false);const idle=T.marineIdleDbg?.();if(idle?.state)Object.assign(idle.state,{quiet:0,phase:'idle',time:0,lit:false});I.play();await I.stepAsync(45);I.pause();H.loop(false);if(!T.setMagazinesDbg('pistol',12,Array(256).fill(12)))throw Error('Supported full-reserve pistol fixture failed');T.updateCarriedGear(0,true);T.player.updateMatrixWorld(true);const rig=T.updateCarriedGear(0,false),mm=rig.mags;if(!mm?.isInstancedMesh||mm.count<2||!mm.visible)throw Error('Both actual carried belt magazine instances must be active');if(!GT24.camera){const b=bounds(),size=b.getSize(new G.Vector3()),c=b.getCenter(new G.Vector3()),distance=size.y/.85/(2*Math.tan(34*Math.PI/360));GT24.camera={cx:c.x,cz:c.z,baseY:b.min.y,distance,fov:34,targetY:c.y};}return{pose:spec.id,unarmed:T.inspectHost().state().unarmed,magsCount:mm.count,pouches:pouches.map(m=>({position:m.position.toArray(),matrixWorld:m.matrixWorld.toArray()}))};};
 window.GT24Frame=async(view,common)=>{
  if(view!=='anatomical-right-thigh')throw Error('Only supplementary anatomical-right-thigh view authorized here: '+view);
  await I.still(false);
  if(common)GT24.camera=common;
  const C=GT24.camera;
  const cam={x:C.cx-.88,y:C.baseY+1.6,z:C.cz+1.0,tx:C.cx-.112,ty:C.baseY+.70,tz:C.cz+.10,fov:34};
  I.camera(cam);H.loop(true);I.pause();for(let n=0;n<4;n++){await new Promise(requestAnimationFrame);if(typeof H.renderer.waitForGPU==='function')await H.renderer.waitForGPU();}H.loop(false);
  for(const k of['x','y','z'])if(Math.abs(T.camera.position[k]-cam[k])>1e-6)throw Error('Native shot camera must actually be applied before photography '+k);
  if(Math.abs(T.camera.fov-cam.fov)>1e-9)throw Error('Native shot FOV must actually be applied');
  await GT24Draw();
  T.player.updateMatrixWorld(true);
  const rig=T.updateCarriedGear(0,false),mm=rig.mags,M=new G.Matrix4(),W=new G.Matrix4(),corners=[];
  for(let i=0;i<2;i++){mm.getMatrixAt(i,M);W.multiplyMatrices(mm.matrixWorld,M);const host=pouches[i];host.refresh();const inv=host.matrixWorld.clone().invert(),rows=[];for(const x of[-.0225,.0225])for(const y of[-.025,.025])for(const z of[-.012,.012]){const world=new G.Vector3(x,y,z).applyMatrix4(W),local=world.clone().applyMatrix4(inv);rows.push({world:world.toArray(),pouchLocal:local.toArray(),...inside(host,local)});}corners.push({instance:i,magMatrixWorld:W.toArray(),pouchMatrixWorld:host.matrixWorld.toArray(),all8Inside:rows.every(r=>r.inside),actualHostMapping:host.mapping,corners:rows});}
  for(let i=2;i<5;i++){mm.getMatrixAt(i,M);if(M.elements.some((v,j)=>v!==GT24.savedVest[i-2][j]))throw Error('All three reserved vest magazine matrices must stay EXACT');}
  if(mm.instanceMatrix.count!==5)throw Error('Exactly five original instance-capacity slots retained');
  const ud=marine.userData||{};
  const wp=o=>o&&o.getWorldPosition?o.getWorldPosition(new G.Vector3()).toArray():null;
  const pOrigin=T.player.getWorldPosition(new G.Vector3());
  const fwd=new G.Vector3(0,0,1).applyQuaternion(T.player.getWorldQuaternion(new G.Quaternion())).normalize();
  const anatRight=new G.Vector3(-1,0,0).applyQuaternion(T.player.getWorldQuaternion(new G.Quaternion())).normalize();
  const camVec=new G.Vector3(cam.x-C.cx,0,cam.z-C.cz).normalize();
  const anatomicalRightDot=camVec.dot(anatRight);
  const orientationTelemetry={
    playerOriginWorld:pOrigin.toArray(),
    marineForwardWorld:fwd.toArray(),
    marineAnatomicalRightWorld:anatRight.toArray(),
    cameraRelativeToCommon:[cam.x-C.cx,cam.y-C.baseY,cam.z-C.cz],
    cameraTarget:[cam.tx,cam.ty,cam.tz],
    cameraTargetRelativeToCommon:[cam.tx-C.cx,cam.ty-C.baseY,cam.tz-C.cz],
    anatomicalRightDot,
    anatomicalSideVerified:anatomicalRightDot>0.5&&fwd.z>0.99,
    worldPositions:{
      legLG_minusX:wp(ud.legLG),
      legRG_plusX:wp(ud.legRG),
      wristLG_minusX:wp(ud.wristLG),
      wristRG_plusX:wp(ud.wristRG),
      hipHolsterGroup:wp(rig.hip?.g),
      hipPairHolsterGroup:wp(rig.hipPair?.g),
      hipGrip:wp(ud.hipGrip)
    }
  };
  return{vestSlotsExact:true,instanceCapacity:mm.instanceMatrix.count,view,matchedHistoricalPrelandCameras:false,camera:T.camera.matrixWorld.toArray(),projection:T.camera.projectionMatrix.toArray(),commonCamera:C,orientationTelemetry,anatomicalSideVerified:orientationTelemetry.anatomicalSideVerified,containment:corners,all16Inside:corners.every(r=>r.all8Inside),renderer:T.getRendererBackend(),scope:'Supplementary unmatched -X anatomical RIGHT thigh view ONLY; actual native live renderFrame via supported DWInspect.still(true); same 8-corner closed pouch containment <=2um and vest/capacity invariants.'};
 };
 return{fixture:'Both poses use supported setMagazinesDbg full spare pistol reserve, clipped by actual magazine capacity, to exercise BOTH actual belt slots; no forced count/visibility.',backend:T.getRendererBackend(),pouches:pouches.map(m=>({position:m.position.toArray(),geometrySize:m.geometry.boundingBox.getSize(new G.Vector3()).toArray(),parent:m.parent.name,sourceHidden:!m.visible}))};
})()
