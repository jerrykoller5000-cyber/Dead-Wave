// GP-19905: native render harness. Only reads the game; the dance gets its own rig/scene/renderer.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {Engine} from '../../tools/camera.mjs';

const ROOT=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const args=process.argv.slice(2);
const has=key=>args.includes('--'+key);
const option=(key,otherwise)=>{const i=args.indexOf('--'+key);return i<0?otherwise:args[i+1];};
const mode='freeze-search';
const alpha=has('alpha'),motionBlur=has('motionblur')&&!has('diagnostic-light'),fps=Number(option('fps',30));
const blurSamples=motionBlur?9:1;
const deliveryDuration=20;
const diagnosticLight=has('diagnostic-light'),auditRate=Number(option('audit-rate',30));
const stagePath='/review/dance-GP19905/stage.js';
const size=String(option('size','1280x720')).split('x').map(Number);
const start=Number(option('start',0));
const frames=Number(option('frames',600));
const out=path.resolve(ROOT,option('out',`review/dance-GP19905/${mode==='render'?'frames':mode}${alpha?'-alpha':''}`));
const vector=(key,defaultValue)=>String(option(key,defaultValue)).split(',').map(Number);
const cam=vector('camera','1.9,1.65,4.1'),look=vector('look','0,.78,0');
const fov=Number(option('fov',34));
const outfitPath=option('outfit','review/dance-GP19905/outfit.json');
const outfit=outfitPath?JSON.parse(fs.readFileSync(path.resolve(ROOT,outfitPath),'utf8')):null;
if(outfit&&!outfit.wardrobe?.items)throw new Error('--outfit JSON must provide {wardrobe:{items,...},gearOwned?:{helmet,vest,pads,nvg}}');
if(size.length!==2||size.some(x=>!Number.isFinite(x)||x<=0)||!(fps>0)||!Number.isInteger(frames)||frames<1)throw new Error('Invalid size, fps or frames');
fs.mkdirSync(out,{recursive:true});
const proof={mode,alpha,diagnosticLight,motionBlur,motionBlurSamples:blurSamples,motionBlurAccumulation:motionBlur?'uint32-premultiplied':null,captureSourceHash:createHash('sha256').update(fs.readFileSync(fileURLToPath(import.meta.url))).digest('hex'),motionBlurShutterFrames:motionBlur?.4:0,deliveryDuration,size,fps,start,frames:mode==='render'?frames:undefined,out,outfitPath,started:new Date().toISOString(),motionSourceHash:createHash('sha256').update(fs.readFileSync(path.join(ROOT,'review/dance-GP19905/pose-probe.js'))).digest('hex'),camera:{position:cam,look,fov},samples:[]};
const E=new Engine({warm:'none',size:size.join('x'),show:has('show'),soft:has('soft')});

try {
  await E.open();
  proof.gameRenderer=E.renderer;
  proof.loadSeconds=E.loadSec;
  proof.setup=await E.page.evaluate(`(async()=>{
    const T=window.TT,THREE=T.THREE;
    T.AudioSys?.setMuted?.(true);
    // Nothing in this throw-away browser must animate or overwrite the independent character.
    T.renderer.setAnimationLoop(null);
    const live=T.getMarine(),marine=T.makeMarine(),outfit=${JSON.stringify(outfit)};
    const picked=T.dressMarine(marine,outfit?.wardrobe);
    const liveU=live.userData,u=marine.userData;
    const gear={};
    for(const [key,parts] of Object.entries(u.gearParts||{})){
      const source=liveU.gearParts?.[key]||[];
      for(let i=0;i<parts.length;i++)if(source[i])parts[i].visible=source[i].visible;
      gear[key]={count:parts.length,visible:parts.filter(o=>o.visible).length,sourceCount:source.length};
    }
    if(u.nvgPivot&&liveU.nvgPivot)u.nvgPivot.quaternion.copy(liveU.nvgPivot.quaternion);
    if(!outfit)for(const key of ['eyewearG','bareFaceDetails'])if(u[key]&&liveU[key])u[key].visible=liveU[key].visible;
    const outfitGear=outfit?.gearOwned||outfit?.gear;
    if(outfitGear){
      const own=outfitGear,show=(key,on)=>{for(const part of u.gearParts?.[key]||[])part.visible=!!on;};
      show('helmet',own.helmet);show('bareHead',!own.helmet);show('vest',own.vest);show('bareTorso',!own.vest);show('pads',own.pads);show('nvg',own.helmet&&own.nvg);
      for(const [key,parts] of Object.entries(u.gearParts||{}))gear[key].visible=parts.filter(o=>o.visible).length;
    }
    if(u.weaponMount)u.weaponMount.visible=false;
    if(u.hipGrip)u.hipGrip.visible=false;
    const {HAND_POSES}=await import('/studio/marine-hand.js');
    for(const elbow of [u.elbowLG,u.elbowRG])elbow.userData.wrist?.userData.hand?.set(HAND_POSES.relaxed).update();
    const response=await fetch('/review/dance-GP19905/pose-probe.js',{method:'HEAD'});
    let dance,motionMissing=false,danceMeta=null;
    if(response.ok){const motion=await import('/review/dance-GP19905/pose-probe.js');danceMeta=motion.DISCLAIMER_DANCE;dance=motion.createDisclaimerDance(marine);}
    else if(${JSON.stringify(mode)}==='probe'){
      motionMissing=true;u.armLG.rotation.set(.03,0,-.1);u.armRG.rotation.set(.03,0,.1);u.elbowLG.rotation.set(-.25,0,0);u.elbowRG.rotation.set(-.25,0,0);
      dance={root:marine,duration:20,sample(){}};
    }else throw new Error('ui/disclaimer-dance.js is not ready; use --probe to inspect the actual current model.');
    const scene=new THREE.Scene();scene.background=${alpha?'null':'new THREE.Color(0x080d10)'};
    const camera=new THREE.PerspectiveCamera(${fov},${size[0]/size[1]},.025,60);
    camera.position.set(...${JSON.stringify(cam)});camera.lookAt(...${JSON.stringify(look)});camera.updateMatrixWorld(true);
    let renderer,backend='webgpu';
    try {renderer=new THREE.WebGPURenderer({antialias:true,alpha:${alpha},powerPreference:'high-performance'});await renderer.init();}
    catch(error){renderer?.dispose();backend='webgl';renderer=new THREE.WebGPURenderer({antialias:true,alpha:${alpha},forceWebGL:true});await renderer.init();}
    renderer.setSize(${size[0]},${size[1]});renderer.setPixelRatio(1);
    renderer.setClearColor(0x080d10,${alpha?0:1});
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    const {createDanceStage}=await import(${JSON.stringify(stagePath)});
    const stage=createDanceStage(THREE,scene);
    if(${alpha})stage.root.visible=false; // lights remain in scene for the transparent actor pass.
    scene.add(dance.root);
    if(!${diagnosticLight})stage.configureActor?.(marine);
    if(${diagnosticLight}){scene.add(new THREE.AmbientLight(0xffffff,1.25));const fill=new THREE.DirectionalLight(0xe8f0ff,2);fill.position.set(1,4,5);scene.add(fill);if(!${alpha})scene.background=new THREE.Color(0x151b20);}
    const blurCanvas=document.createElement('canvas');blurCanvas.width=${size[0]};blurCanvas.height=${size[1]};
    const blurContext=${motionBlur}?blurCanvas.getContext('2d',{alpha:${alpha}}):null;
    const blurScratchCanvas=${motionBlur}?document.createElement('canvas'):null;
    if(blurScratchCanvas){blurScratchCanvas.width=blurCanvas.width;blurScratchCanvas.height=blurCanvas.height;}
    const blurScratch=blurScratchCanvas?.getContext('2d',{alpha:true,willReadFrequently:true});
    const blurSums=${motionBlur}?new Uint32Array(blurCanvas.width*blurCanvas.height*4):null;
    const blurOutput=blurContext?.createImageData(blurCanvas.width,blurCanvas.height);

    for(const el of document.body.children)el.style.setProperty('display','none','important');
    renderer.domElement.id='danceCapture';renderer.domElement.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;display:block;z-index:2147483647';
    document.body.appendChild(renderer.domElement);
    window.__danceCapture={scene,camera,renderer,stage,dance,marine,blurCanvas};
    const auditJoints={root:dance.root,bodyRoot:dance.bodyRoot,marine,lowerBody:u.lowerBody,hip:u.hip,torso:u.torsoG,head:u.headG,nvg:u.nvgPivot,
      armL:u.armLG,armR:u.armRG,elbowL:u.elbowLG,elbowR:u.elbowRG,wristL:u.elbowLG.userData.wrist,wristR:u.elbowRG.userData.wrist,
      legL:u.legLG,legR:u.legRG,kneeL:u.kneeLG,kneeR:u.kneeRG,ankleL:u.ankleLG,ankleR:u.ankleRG};
    const jointName=new Map(Object.entries(auditJoints).filter(([,o])=>o).map(([k,o])=>[o,k]));
    const auditPrepare=seconds=>{
      const state=dance.sample(seconds);dance.root.updateWorldMatrix(true,true);
      for(const arm of [u.armLG,u.armRG])arm.userData.liveShoulder?.bend();
      for(const leg of [u.legLG,u.legRG])leg.userData.bootShaft?.userData.bend();
      return state;
    };
    const auditContact=(object,offset,expected)=>{const p=object.localToWorld(new THREE.Vector3(...offset));return {point:p.toArray(),target:expected?.toArray?.()||null,error:expected?p.distanceTo(expected):null};};
    // A deliberately conservative body proxy, using the actual fitted-shirt
    // cross-section from marine-body.js. This flags candidates for visual review,
    // not a triangle/triangle collision proof (carrier pouches lie outside it).
    const torsoSections=[[.015,.168,.109],[.12,.178,.115],[.24,.207,.128],[.345,.246,.135],[.405,.257,.124],[.46,.198,.098],[.51,.092,.079]];
    const torsoMetric=point=>{
      const y=point.y;if(y<torsoSections[0][0]||y>torsoSections.at(-1)[0])return null;
      let a=torsoSections[0],b=a;for(let i=1;i<torsoSections.length;i++)if(y<=torsoSections[i][0]){a=torsoSections[i-1];b=torsoSections[i];break;}
      const k=(y-a[0])/(b[0]-a[0]||1),rx=a[1]+(b[1]-a[1])*k,rz=a[2]+(b[2]-a[2])*k;
      return Math.hypot(point.x/rx,point.z/rz);
    };
    const anatomyAt=state=>{
      const inv=u.torsoG.matrixWorld.clone().invert(),point=new THREE.Vector3(),arms=[];
      for(let i=0;i<2;i++){
        const shoulder=i?u.armRG:u.armLG,elbow=i?u.elbowRG:u.elbowLG,wrist=elbow.userData.wrist;
        const localEuler=o=>new THREE.Euler().setFromQuaternion(o.quaternion,'YXZ').toArray().slice(0,3);
        let minHandTorso=Infinity,minHandPoint=null,insideHandVertices=0,handVertices=0;
        wrist.traverseVisible(o=>{const p=o.geometry?.attributes.position;if(!o.isMesh||!p)return;
          for(let j=0;j<p.count;j++){handVertices++;point.fromBufferAttribute(p,j).applyMatrix4(o.matrixWorld).applyMatrix4(inv);const d=torsoMetric(point);if(d!==null&&d<minHandTorso){minHandTorso=d;minHandPoint=point.toArray();}if(d!==null&&d<1)insideHandVertices++;}
        });
        const elbowWorld=elbow.getWorldPosition(new THREE.Vector3()),wristWorld=wrist.getWorldPosition(new THREE.Vector3());
        let minForearmTorso=Infinity;
        for(let j=0;j<=10;j++){point.copy(elbowWorld).lerp(wristWorld,j/10).applyMatrix4(inv);const d=torsoMetric(point);if(d!==null)minForearmTorso=Math.min(minForearmTorso,d);}
        const palmNormal=new THREE.Vector3(0,0,1).applyQuaternion(wrist.getWorldQuaternion(new THREE.Quaternion()));
        // Swing is wrist bend away from local forearm axis, separate from the
        // useful pronation/twist around local Y. Planting can legitimately bend it.
        const tw=new THREE.Quaternion(0,wrist.quaternion.y,0,wrist.quaternion.w).normalize();
        const sw=wrist.quaternion.clone().multiply(tw.clone().invert());
        arms.push({side:i?'R':'L',shoulder:localEuler(shoulder),elbow:localEuler(elbow),wrist:localEuler(wrist),
          wristSwing:2*Math.acos(Math.min(1,Math.abs(sw.w))),wristTwist:2*Math.atan2(tw.y,tw.w),palmNormal:palmNormal.toArray(),
          planted:state?.targets?.handPlant?.[i]||0,handVertices,insideHandVertices,
          minHandTorso:Number.isFinite(minHandTorso)?minHandTorso:null,minHandPoint,minForearmTorso:Number.isFinite(minForearmTorso)?minForearmTorso:null});
      }
      return arms;
    };
    window.__danceAuditAt=seconds=>{
      const state=auditPrepare(seconds),v=new THREE.Vector3(),projected=new THREE.Vector3(),mins=[];let vertices=0;
      camera.updateMatrixWorld(true);
      const viewProjection=new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse),view=camera.matrixWorldInverse.elements;
      let minX=Infinity,minScreenY=Infinity,maxX=-Infinity,maxScreenY=-Infinity,minDepth=Infinity,maxDepth=-Infinity,outsideVertices=0;
      marine.traverseVisible(o=>{
        if(!o.isMesh||!o.geometry?.attributes.position)return;
        const materials=Array.isArray(o.material)?o.material:[o.material];if(materials.every(m=>m?.visible===false||m?.transparent&&m.opacity<=0))return;
        const P=o.geometry.attributes.position;let y=Infinity,point=null;
        for(let i=0;i<P.count;i++){
          v.fromBufferAttribute(P,i).applyMatrix4(o.matrixWorld);if(v.y<y){y=v.y;point=v.toArray();}
          projected.copy(v).applyMatrix4(viewProjection);
          const depth=-(view[2]*v.x+view[6]*v.y+view[10]*v.z+view[14]);
          minX=Math.min(minX,projected.x);maxX=Math.max(maxX,projected.x);minScreenY=Math.min(minScreenY,projected.y);maxScreenY=Math.max(maxScreenY,projected.y);
          minDepth=Math.min(minDepth,depth);maxDepth=Math.max(maxDepth,depth);
          if(Math.abs(projected.x)>1||Math.abs(projected.y)>1||depth<camera.near||depth>camera.far)outsideVertices++;
        }
        vertices+=P.count;let part=o;while(part&&!jointName.has(part))part=part.parent;
        mins.push({y,point,mesh:o.name||'(unnamed)',part:jointName.get(part)||'(other)',parent:o.parent?.name||o.parent?.type||'',material:Array.isArray(o.material)?o.material.map(m=>m.name):o.material?.name||'',vertices:P.count});
      });
      mins.sort((a,b)=>a.y-b.y);
      const pixels={left:(minX+1)*${size[0]}/2,right:(maxX+1)*${size[0]}/2,top:(1-maxScreenY)*${size[1]}/2,bottom:(1-minScreenY)*${size[1]}/2};
      const framing={ndc:{min:[minX,minScreenY],max:[maxX,maxScreenY]},pixels,minDepth,maxDepth,outsideVertices,
        minMarginPixels:Math.min(pixels.left,${size[0]}-pixels.right,pixels.top,${size[1]}-pixels.bottom)};
      const hip=state?.hip?.clone?.()||(dance.bodyRoot||dance.root).getWorldPosition(new THREE.Vector3()),hipNdc=hip.clone().applyMatrix4(viewProjection);
      const hipProjection={world:hip.toArray(),pixels:[(hipNdc.x+1)*${size[0]}/2,(1-hipNdc.y)*${size[1]}/2],
        depth:-(view[2]*hip.x+view[6]*hip.y+view[10]*hip.z+view[14])};
      let hopBootGap=null;
      if(/hop|jump/i.test(state?.phrase||'')){
        // Project the real boot vertices onto the actor's transverse axis. A
        // positive interval gap proves that the feet cannot intersect or cross.
        const inv=dance.root.matrixWorld.clone().invert(),ranges=[u.ankleLG,u.ankleRG].map(ankle=>{
          let min=Infinity,max=-Infinity;ankle.traverseVisible(o=>{const p=o.geometry?.attributes.position;if(!o.isMesh||!p)return;
            for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld).applyMatrix4(inv);min=Math.min(min,v.x);max=Math.max(max,v.x);}
          });return [min,max];
        });hopBootGap={ranges,gap:ranges[1][0]-ranges[0][1]};
      }
      const euler=o=>new THREE.Euler().setFromQuaternion(o.quaternion,'YXZ').toArray().slice(0,3);
      const posture={torso:euler(u.torsoG),head:euler(u.headG),legs:[u.legLG,u.legRG].map((leg,i)=>({side:i?'R':'L',
        thigh:euler(leg),knee:euler(i?u.kneeRG:u.kneeLG),ankle:euler(i?u.ankleRG:u.ankleLG)}))};
      const supports=mins.filter(m=>!['armL','armR','elbowL','elbowR','wristL','wristR','legL','legR','kneeL','kneeR','ankleL','ankleR'].includes(m.part)&&m.parent!=='shoulder-live');
      return {seconds,phrase:state?.phrase,beat:state?.beat,root:dance.root.getWorldPosition(new THREE.Vector3()).toArray(),framing,hipProjection,hopBootGap,posture,shoulderCenter:u.armLG.getWorldPosition(new THREE.Vector3()).add(u.armRG.getWorldPosition(new THREE.Vector3())).multiplyScalar(.5).toArray(),anatomy:anatomyAt(state),vertices,lowest:mins.slice(0,5),supportLowest:supports.slice(0,5),penetration:Math.max(0,-.025-(mins[0]?.y??0)),
        hands:[u.elbowLG,u.elbowRG].map((e,i)=>({...auditContact(e.userData.wrist,[0,-.048,.016],state?.targets?.hands?.[i]),planted:state?.targets?.handPlant?.[i]||0,side:i?'R':'L'})),
        feet:[u.ankleLG,u.ankleRG].map((e,i)=>({...auditContact(e,[0,-.103,.03],state?.targets?.feet?.[i]),
          // Airborne FK blending has a nominal IK target but is not a foot plant.
          ground:(state?.targets?.feet?.[i]?.y??1)<=.005&&(state?.targets?.legFK??0)<.001,legFK:state?.targets?.legFK??0,side:i?'R':'L'}))};
    };
    const auditSnapshot=seconds=>{
      auditPrepare(seconds);const result={};
      for(const [name,o] of Object.entries(auditJoints))if(o){const p=o.getWorldPosition(new THREE.Vector3()),q=o.getWorldQuaternion(new THREE.Quaternion());result[name]={p:p.toArray(),q:q.toArray(),localP:o.position.toArray(),localQ:o.quaternion.toArray()};}
      // Include deformed hands/shoulders/boots, so a seek cannot leave a stale mesh.
      const geometry=[];marine.traverseVisible(o=>{const a=o.geometry?.attributes.position?.array;if(o.isMesh&&a){let sum=0;for(let i=0;i<a.length;i++)sum+=a[i]*(1+(i%19));geometry.push(sum);}});
      return {joints:result,geometry};
    };
    window.__danceSeekAudit=()=>{
      const duration=Math.min(dance.duration,${deliveryDuration}),times=[0,.133,1.5,3,5,7,9.2,11,13,15,17,19.4,duration],seeks=[];
      for(const t of times){const a=auditSnapshot(t);auditSnapshot((t+17.315)%duration);const b=auditSnapshot(t);let max=0,where='';
        for(const [name,j] of Object.entries(a.joints))for(const key of ['p','q','localP','localQ'])for(let i=0;i<j[key].length;i++){const d=Math.abs(j[key][i]-b.joints[name][key][i]);if(d>max){max=d;where=name+'.'+key+'['+i+']';}}
        for(let i=0;i<a.geometry.length;i++){const d=Math.abs(a.geometry[i]-b.geometry[i]);if(d>max){max=d;where='geometry['+i+']';}}
        seeks.push({seconds:t,max,where});
      }
      const boundaries=[];
      const beats=danceMeta?.boundaries?.slice(1,-1)||[8,16,20,22,24,28,30,38,40,48,52];
      for(const n of beats){const t=n*(danceMeta?.beatSeconds||60/103.322299);if(t<=0||t>=duration)continue;const eps=.00001,a=auditSnapshot(t-eps),b=auditSnapshot(t+eps);let position=0,angle=0,joint='';
        for(const [name,j] of Object.entries(a.joints)){const k=b.joints[name],distance=Math.hypot(...j.p.map((v,i)=>v-k.p[i]));if(distance>position){position=distance;joint=name;}
          const length=Math.hypot(...j.q)*Math.hypot(...k.q);
          const dot=Math.min(1,Math.abs(j.q.reduce((s,v,i)=>s+v*k.q[i],0))/length);angle=Math.max(angle,2*Math.acos(dot));}
        boundaries.push({seconds:t,section:n,maxPosition:position,positionJoint:joint,maxAngle:angle,interval:eps*2});
      }
      return {seeks,boundaries};
    };
    window.__danceFrame=async(seconds)=>{
      let state;
      const renderAt=async time=>{
        state=dance.sample(time);
        stage.update(time,time/.580707169,state?.hip||dance.root.position);
        dance.root.updateMatrixWorld(true);
        for(const arm of [u.armLG,u.armRG])arm.userData.liveShoulder?.bend();
        for(const leg of [u.legLG,u.legRG])leg.userData.bootShaft?.userData.bend();
        await renderer.renderAsync(scene,camera);
      };
      if(blurContext){
        // Accumulate premultiplied RGBA in integer sums, with one final rounding.
        // Canvas lighter blends round each low-opacity addition and band the floor.
        blurSums.fill(0);
        blurScratch.globalAlpha=1;blurScratch.globalCompositeOperation='copy';
        for(let sample=0;sample<${blurSamples};sample++){
          const offset=(sample/(${blurSamples}-1))*2-1;
          await renderAt(Math.max(0,Math.min(dance.duration,seconds+offset*.2/${fps})));
          blurScratch.drawImage(renderer.domElement,0,0);
          const rgba=blurScratch.getImageData(0,0,blurScratchCanvas.width,blurScratchCanvas.height).data;
          for(let i=0;i<rgba.length;i+=4){
            const a=rgba[i+3];
            blurSums[i]+=rgba[i]*a;blurSums[i+1]+=rgba[i+1]*a;blurSums[i+2]+=rgba[i+2]*a;blurSums[i+3]+=a;
          }
        }
        const output=blurOutput.data;
        for(let i=0;i<output.length;i+=4){
          const a=blurSums[i+3];
          output[i]=a?blurSums[i]/a:0;output[i+1]=a?blurSums[i+1]/a:0;output[i+2]=a?blurSums[i+2]/a:0;
          output[i+3]=a/${blurSamples};
        }
        blurContext.putImageData(blurOutput,0,0);
        state=auditPrepare(seconds);stage.update(seconds,seconds/.580707169,state?.hip||dance.root.position);
      }else await renderAt(seconds);
      const box=new THREE.Box3();
      marine.traverseVisible(o=>{if(o.isMesh&&o.geometry){if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();const b=o.geometry.boundingBox?.clone();if(b)box.union(b.applyMatrix4(o.matrixWorld));}});
      const contact=(object,offset,expected)=>{const point=object.localToWorld(new THREE.Vector3(...offset));return {point:point.toArray(),target:expected?.toArray?.()||null,error:expected?point.distanceTo(expected):null};};
      const contacts={hands:[u.elbowLG,u.elbowRG].map((elbow,i)=>({...contact(elbow.userData.wrist,[0,-.048,.016],state?.targets?.hands?.[i]),planted:state?.targets?.handPlant?.[i]||0})),feet:[u.ankleLG,u.ankleRG].map((ankle,i)=>contact(ankle,[0,-.103,.03],state?.targets?.feet?.[i]))};
      const png=(blurContext?blurCanvas:renderer.domElement).toDataURL('image/png').split(',')[1];
      return {png,meta:{seconds,state:typeof state==='string'?state:state?{phrase:state.phrase,beat:state.beat}:null,contacts,bounds:{min:box.min.toArray(),max:box.max.toArray()},root:dance.root.position.toArray(),drawCalls:renderer.info.render.calls}};
    };
    let storedWardrobe=null;try{storedWardrobe=JSON.parse(localStorage.getItem('tt_wardrobe')||'null');}catch{}
    const wardrobe=outfit?.wardrobe||T.getWardrobe?.()||storedWardrobe;
    return {backend:renderer.backend?.isWebGPUBackend?'webgpu':backend,picked,wardrobe,storedWardrobe,gear,gearOwned:outfitGear||T.getGearOwned?.()||null,motionMissing,duration:dance.duration,
      source:'Fresh TT.makeMarine in camera browser with TT.dressMarine current page profile and matching live gear visibility',
      note:outfit?outfit.source||'Explicit wardrobe supplied with --outfit.':'Camera uses an isolated browser profile; null storedWardrobe means factory/default profile, not a snapshot of the user game save.'};
  })()`,180000);
  console.log('SETUP',JSON.stringify(proof.setup));
  if(Math.abs(proof.setup.duration-deliveryDuration)>.000001)throw new Error('Motion module duration must be exactly20 seconds; capture/audit was not started.');
  const capture=async(seconds,name)=>{
    const frame=await E.page.evaluate(`window.__danceFrame(${seconds})`,120000);
    fs.writeFileSync(path.join(out,name),Buffer.from(frame.png,'base64'));
    return {...frame.meta,file:name};
  };
  if(mode==='audit'){
    proof.audit={floorY:-.025,rate:auditRate,frames:[]};
    const auditTimes=has('audit-times')?option('audit-times','0').split(',').map(Number):Array.from({length:Math.ceil(deliveryDuration*auditRate)+1},(_,k)=>Math.min(k/auditRate,deliveryDuration));
    for(let k=0;k<auditTimes.length;k++){
      const frame=await E.page.evaluate(`window.__danceAuditAt(${auditTimes[k]})`,120000);
      proof.audit.frames.push(frame);
      if(k%(15*auditRate)===0)console.log('AUDIT',auditTimes[k],'seconds minY',frame.lowest[0]?.y);
    }
    proof.audit.seek=await E.page.evaluate('window.__danceSeekAudit()',120000);
    proof.audit.worstVertices=proof.audit.frames.flatMap(s=>s.lowest.map(m=>({seconds:s.seconds,phrase:s.phrase,...m}))).sort((a,b)=>a.y-b.y).slice(0,12);
    proof.audit.handOutliers=proof.audit.frames.flatMap(s=>s.hands.filter(h=>h.planted>.99).map(h=>({seconds:s.seconds,phrase:s.phrase,...h}))).sort((a,b)=>b.error-a.error).slice(0,8);
    proof.audit.groundFootOutliers=proof.audit.frames.flatMap(s=>s.feet.filter(f=>f.ground).map(f=>({seconds:s.seconds,phrase:s.phrase,...f}))).sort((a,b)=>b.error-a.error).slice(0,8);
    proof.audit.boundaryOutliers=[...proof.audit.seek.boundaries].sort((a,b)=>b.maxPosition-a.maxPosition).slice(0,5);
    proof.audit.framingOutliers=proof.audit.frames.map(s=>({seconds:s.seconds,phrase:s.phrase,...s.framing})).sort((a,b)=>a.minMarginPixels-b.minMarginPixels).slice(0,12);
    const extent=Math.max(...proof.audit.frames.map(s=>Math.max(...s.framing.ndc.min.map(Math.abs),...s.framing.ndc.max.map(Math.abs))));
    proof.audit.framing={camera:proof.camera,size,framesWithClippedVertices:proof.audit.frames.filter(s=>s.framing.outsideVertices>0).length,
      minMarginPixels:proof.audit.framingOutliers[0]?.minMarginPixels,maximumNdcExtent:extent,
      suggestedFovFor24pxMargin:Math.ceil(2*Math.atan(Math.tan(fov*Math.PI/360)*extent/(1-48/Math.min(...size)))*180/Math.PI)};
    const anatomy=proof.audit.frames.flatMap(s=>s.anatomy.map(a=>({seconds:s.seconds,phrase:s.phrase,...a})));
    proof.audit.anatomy={note:'Torso proxy uses source shirt cross-sections; any penetration is a candidate for visual review, not an exact mesh collision.',
      positiveElbows:anatomy.filter(a=>a.elbow[0]>.02),
      handBodyOutliers:anatomy.filter(a=>a.minHandTorso!==null).sort((a,b)=>a.minHandTorso-b.minHandTorso).slice(0,8),
      forearmBodyOutliers:anatomy.filter(a=>a.minForearmTorso!==null).sort((a,b)=>a.minForearmTorso-b.minForearmTorso).slice(0,8),
      freeWristOutliers:anatomy.filter(a=>a.planted<.001).sort((a,b)=>b.wristSwing-a.wristSwing).slice(0,8),
      plantWristOutliers:anatomy.filter(a=>a.planted>.999).sort((a,b)=>b.wristSwing-a.wristSwing).slice(0,8)};
    const interval=values=>({min:Math.min(...values),max:Math.max(...values),span:Math.max(...values)-Math.min(...values)});
    const hopFrames=proof.audit.frames.filter(s=>/hop|jump/i.test(s.phrase));
    proof.audit.hops=[...new Set(hopFrames.map(s=>Math.floor(s.beat)))].map(beat=>{
      const samples=hopFrames.filter(s=>Math.floor(s.beat)===beat);
      return {beat,samples:samples.length,seconds:[samples[0].seconds,samples.at(-1).seconds],
        travelY:interval(samples.map(s=>s.root[1])),hipY:interval(samples.map(s=>s.hipProjection.world[1])),
        bootGap:interval(samples.filter(s=>s.hopBootGap).map(s=>s.hopBootGap.gap)),
        legs:[0,1].map(i=>({side:i?'R':'L',kneeDegrees:interval(samples.map(s=>s.posture.legs[i].knee[0]*180/Math.PI)),
          ankleDegrees:interval(samples.map(s=>s.posture.legs[i].ankle[0]*180/Math.PI)),soleY:interval(samples.map(s=>s.feet[i].point[1])),
          shoulderXDegrees:interval(samples.map(s=>s.anatomy[i].shoulder[0]*180/Math.PI)),elbowDegrees:interval(samples.map(s=>s.anatomy[i].elbow[0]*180/Math.PI))}))};
    });
    proof.audit.finale=proof.audit.frames.filter(s=>s.seconds>=deliveryDuration-2).map(s=>({seconds:s.seconds,phrase:s.phrase,
      hip:s.hipProjection.world,support:s.supportLowest[0],floorClearance:s.lowest[0].y-proof.audit.floorY,
      palms:s.hands,soleHeights:s.feet.map(f=>f.point[1])}));
    proof.audit.quality={
      noFloorPenetration:proof.audit.frames.every(s=>s.penetration<.002),
      noElbowHyperextension:proof.audit.anatomy.positiveElbows.length===0,
      handsOutsideTorsoProxy:anatomy.every(a=>a.insideHandVertices===0),
      plantedHandsWithin25mm:proof.audit.handOutliers.every(h=>h.error<.025),
      freeWristsWithin30Degrees:proof.audit.anatomy.freeWristOutliers.every(a=>a.wristSwing<Math.PI/6),
      plantedWristsWithin92Degrees:proof.audit.anatomy.plantWristOutliers.every(a=>a.wristSwing<92*Math.PI/180),
      fullyInsideFrame:proof.audit.frames.every(s=>s.framing.outsideVertices===0),
      framingMarginAtLeast24px:proof.audit.frames.every(s=>s.framing.minMarginPixels>=24),
      deterministicSeek:proof.audit.seek.seeks.every(s=>s.max<1e-8),
      note:'Numerical diagnostics are necessary checks, not a substitute for viewing the animation.'};
    if(has('snapshot'))proof.samples.push(await capture(Number(option('snapshot',10)),'audit-snapshot.png'));
    console.log('AUDIT_SUMMARY',JSON.stringify({lowest:proof.audit.worstVertices[0],hand:proof.audit.handOutliers[0],groundFoot:proof.audit.groundFootOutliers[0],seekMax:Math.max(...proof.audit.seek.seeks.map(s=>s.max)),boundary:proof.audit.boundaryOutliers[0]}));
    console.log('AUDIT_QUALITY',JSON.stringify(proof.audit.quality));
    console.log('FRAMING',JSON.stringify(proof.audit.framing));
  }else if(mode==='render'){
    for(let i=0;i<frames;i++){
      const shot=await capture(start+i/fps,`${String(i).padStart(5,'0')}.png`);
      if(i%30===0||i===frames-1)proof.samples.push(shot);
      if(i%60===0||i===frames-1)console.log(`FRAME ${i+1}/${frames} t=${shot.seconds.toFixed(3)}`);
    }
  }else if(mode==='sheet'){
    const times=String(option('times',[0,1.5,3,4.5,6,7.5,9,10.5,12,13.5,15,16.5,18,19.5,20].join(','))).split(',').map(Number);
    for(let i=0;i<times.length;i++){
      const shot=await capture(times[i],`${String(i).padStart(2,'0')}-${times[i].toFixed(2)}s.png`);
      proof.samples.push(shot);console.log('POSE',shot.seconds,shot.file);
    }
    const rows=proof.samples.map(shot=>({seconds:shot.seconds,png:fs.readFileSync(path.join(out,shot.file)).toString('base64')}));
    const sheet=await E.page.evaluate(`(async(rows)=>{
      const width=480,height=270,cols=3,count=Math.ceil(rows.length/cols),c=document.createElement('canvas');c.width=cols*width;c.height=count*(height+28);const g=c.getContext('2d');g.fillStyle='#0b1011';g.fillRect(0,0,c.width,c.height);
      for(let i=0;i<rows.length;i++){const image=new Image();image.src='data:image/png;base64,'+rows[i].png;await image.decode();const x=i%cols*width,y=Math.floor(i/cols)*(height+28);g.drawImage(image,x,y,width,height);g.fillStyle='#d5d5c9';g.font='16px Arial';g.fillText(rows[i].seconds.toFixed(2)+'s',x+12,y+height+19);}
      return c.toDataURL('image/png').split(',')[1];
    })(${JSON.stringify(rows)})`,120000);
    fs.writeFileSync(path.join(out,'contact-sheet.png'),Buffer.from(sheet,'base64'));
  }else if(mode==='freeze-search'){
    const search=fs.readFileSync(path.join(ROOT,'review/dance-GP19905/search-body.js'),'utf8');
    proof.search=await E.page.evaluate(search,180000);
    console.log('SEARCH',JSON.stringify(proof.search));
    proof.samples.push(await capture(20,'best.png'));
  }else proof.samples.push(await capture(start,'probe.png'));
  proof.ok=true;
  console.log('PASS',mode,'->',out);
} catch(error) {
  proof.ok=false;proof.error=String(error.stack||error);console.error(proof.error);process.exitCode=1;
} finally {
  proof.errors=E.page?.errors||[];proof.finished=new Date().toISOString();
  fs.writeFileSync(path.join(out,'proof.json'),JSON.stringify(proof,null,2));
  await E.close();
}
process.exit(process.exitCode||0);
