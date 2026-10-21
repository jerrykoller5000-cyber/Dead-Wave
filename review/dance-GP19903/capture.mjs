// GP-19903: native render harness. Only reads the game; the dance gets its own rig/scene/renderer.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {Engine} from '../../tools/camera.mjs';

const ROOT=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const args=process.argv.slice(2);
const has=key=>args.includes('--'+key);
const option=(key,otherwise)=>{const i=args.indexOf('--'+key);return i<0?otherwise:args[i+1];};
const mode=has('launch-probe')?'launch-probe':has('head-probe')?'head-probe':has('plant-probe')?'plant-probe':has('audit')?'audit':has('render')?'render':has('sheet')?'sheet':'probe';
const alpha=has('alpha'),motionBlur=has('motionblur'),fps=Number(option('fps',30));
const deliveryDuration=976/30;
const diagnosticLight=has('diagnostic-light'),auditRate=Number(option('audit-rate',6));
const stagePath=diagnosticLight?'/review/dance-GP19902/stage.js':'/review/dance-GP19903/stage.js';
const size=String(option('size','1280x720')).split('x').map(Number);
const start=Number(option('start',0));
const frames=Number(option('frames',976));
const out=path.resolve(ROOT,option('out',`review/dance-GP19903/${mode==='render'?'frames':mode}${alpha?'-alpha':''}`));
const vector=(key,defaultValue)=>String(option(key,defaultValue)).split(',').map(Number);
const cam=vector('camera','1.9,1.65,4.1'),look=vector('look','0,.78,0');
const fov=Number(option('fov',34));
const outfitPath=option('outfit','review/dance-GP19903/outfit.json');
const outfit=outfitPath?JSON.parse(fs.readFileSync(path.resolve(ROOT,outfitPath),'utf8')):null;
if(outfit&&!outfit.wardrobe?.items)throw new Error('--outfit JSON must provide {wardrobe:{items,...},gearOwned?:{helmet,vest,pads,nvg}}');
if(size.length!==2||size.some(x=>!Number.isFinite(x)||x<=0)||!(fps>0)||!Number.isInteger(frames)||frames<1)throw new Error('Invalid size, fps or frames');
fs.mkdirSync(out,{recursive:true});
const proof={mode,alpha,diagnosticLight,motionBlur,motionBlurSamples:motionBlur?3:1,motionBlurShutterFrames:motionBlur?.4:0,deliveryDuration,size,fps,start,frames:mode==='render'?frames:undefined,out,outfitPath,started:new Date().toISOString(),motionSourceHash:createHash('sha256').update(fs.readFileSync(path.join(ROOT,'ui/disclaimer-dance.js'))).digest('hex'),camera:{position:cam,look,fov},samples:[]};
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
    const response=await fetch('/ui/disclaimer-dance.js',{method:'HEAD'});
    let dance,motionMissing=false,danceMeta=null;
    if(response.ok){const motion=await import('/ui/disclaimer-dance.js');danceMeta=motion.DISCLAIMER_DANCE;dance=motion.createDisclaimerDance(marine);}
    else if(${JSON.stringify(mode)}==='probe'){
      motionMissing=true;u.armLG.rotation.set(.03,0,-.1);u.armRG.rotation.set(.03,0,.1);u.elbowLG.rotation.set(-.25,0,0);u.elbowRG.rotation.set(-.25,0,0);
      dance={root:marine,duration:32.5196016,sample(){}};
    }else throw new Error('ui/disclaimer-dance.js is not ready; use --probe to inspect the actual current model.');
    const scene=new THREE.Scene();scene.background=${alpha?'null':'new THREE.Color(0x080d10)'};
    const camera=new THREE.PerspectiveCamera(${fov},${size[0]/size[1]},.025,60);
    camera.position.set(...${JSON.stringify(cam)});camera.lookAt(...${JSON.stringify(look)});
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
    const blurCanvas=document.createElement('canvas');blurCanvas.width=${size[0]};blurCanvas.height=${size[1]};
    const blurContext=${motionBlur}?blurCanvas.getContext('2d',{alpha:${alpha}}):null;
    for(const el of document.body.children)el.style.setProperty('display','none','important');
    renderer.domElement.id='danceCapture';renderer.domElement.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;display:block;z-index:2147483647';
    document.body.appendChild(renderer.domElement);
    window.__danceCapture={scene,camera,renderer,stage,dance,marine,blurCanvas};
    const auditJoints={root:dance.root,marine,lowerBody:u.lowerBody,hip:u.hip,torso:u.torsoG,head:u.headG,nvg:u.nvgPivot,
      armL:u.armLG,armR:u.armRG,elbowL:u.elbowLG,elbowR:u.elbowRG,wristL:u.elbowLG.userData.wrist,wristR:u.elbowRG.userData.wrist,
      legL:u.legLG,legR:u.legRG,kneeL:u.kneeLG,kneeR:u.kneeRG,ankleL:u.ankleLG,ankleR:u.ankleRG};
    const jointName=new Map(Object.entries(auditJoints).map(([k,o])=>[o,k]));
    const auditPrepare=seconds=>{
      const state=dance.sample(seconds);dance.root.updateMatrixWorld(true);
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
      const state=auditPrepare(seconds),v=new THREE.Vector3(),mins=[];let vertices=0;
      marine.traverseVisible(o=>{
        if(!o.isMesh||!o.geometry?.attributes.position)return;
        const P=o.geometry.attributes.position;let y=Infinity,point=null;
        for(let i=0;i<P.count;i++){v.fromBufferAttribute(P,i).applyMatrix4(o.matrixWorld);if(v.y<y){y=v.y;point=v.toArray();}}
        vertices+=P.count;let part=o;while(part&&!jointName.has(part))part=part.parent;
        mins.push({y,point,mesh:o.name||'(unnamed)',part:jointName.get(part)||'(other)',parent:o.parent?.name||o.parent?.type||'',material:Array.isArray(o.material)?o.material.map(m=>m.name):o.material?.name||'',vertices:P.count});
      });
      mins.sort((a,b)=>a.y-b.y);
      const supports=mins.filter(m=>!['armL','armR','elbowL','elbowR','wristL','wristR','legL','legR','kneeL','kneeR','ankleL','ankleR'].includes(m.part)&&m.parent!=='shoulder-live');
      return {seconds,phrase:state?.phrase,beat:state?.beat,root:dance.root.position.toArray(),shoulderCenter:u.armLG.getWorldPosition(new THREE.Vector3()).add(u.armRG.getWorldPosition(new THREE.Vector3())).multiplyScalar(.5).toArray(),anatomy:anatomyAt(state),vertices,lowest:mins.slice(0,5),supportLowest:supports.slice(0,5),penetration:Math.max(0,-.025-(mins[0]?.y??0)),
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
      const duration=Math.min(dance.duration,${deliveryDuration}),times=[0,2.3,4.6,7,9.3,12,14,18.5,20,23.2,27.9,30,31.7,32.4,duration],seeks=[];
      for(const t of times){const a=auditSnapshot(t);auditSnapshot((t+17.315)%duration);const b=auditSnapshot(t);let max=0,where='';
        for(const [name,j] of Object.entries(a.joints))for(const key of ['p','q','localP','localQ'])for(let i=0;i<j[key].length;i++){const d=Math.abs(j[key][i]-b.joints[name][key][i]);if(d>max){max=d;where=name+'.'+key+'['+i+']';}}
        for(let i=0;i<a.geometry.length;i++){const d=Math.abs(a.geometry[i]-b.geometry[i]);if(d>max){max=d;where='geometry['+i+']';}}
        seeks.push({seconds:t,max,where});
      }
      const boundaries=[];
      const beats=danceMeta?.boundaries?.slice(1,-1)||[8,16,20,22,24,28,30,38,40,48,52];
      for(const n of beats){const t=n*(60/103.322299),eps=.00001,a=auditSnapshot(t-eps),b=auditSnapshot(t+eps);let position=0,angle=0,joint='';
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
        stage.update(time,time/.580707169,dance.root.position);
        dance.root.updateMatrixWorld(true);
        for(const arm of [u.armLG,u.armRG])arm.userData.liveShoulder?.bend();
        for(const leg of [u.legLG,u.legRG])leg.userData.bootShaft?.userData.bend();
        await renderer.renderAsync(scene,camera);
      };
      if(blurContext){
        // Premultiplied additive averaging preserves alpha and avoids a heavy ghost trail.
        blurContext.clearRect(0,0,blurCanvas.width,blurCanvas.height);
        blurContext.globalCompositeOperation='lighter';blurContext.globalAlpha=1/3;
        for(const offset of [-1,0,1]){
          await renderAt(Math.max(0,Math.min(dance.duration,seconds+offset*.2/${fps})));
          blurContext.drawImage(renderer.domElement,0,0);
        }
        blurContext.globalAlpha=1;blurContext.globalCompositeOperation='source-over';
        state=auditPrepare(seconds);stage.update(seconds,seconds/.580707169,dance.root.position);
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
  if(mode==='render'&&proof.setup.duration>deliveryDuration+.05)throw new Error('Motion module still has the previous longer duration; render was not started.');
  const capture=async(seconds,name)=>{
    const frame=await E.page.evaluate(`window.__danceFrame(${seconds})`,120000);
    fs.writeFileSync(path.join(out,name),Buffer.from(frame.png,'base64'));
    return {...frame.meta,file:name};
  };
  if(mode==='launch-probe'){
    proof.launchProbe=await E.page.evaluate(`(()=>{
      const C=window.__danceCapture,T=window.TT.THREE,u=C.marine.userData,p=new T.Vector3(),rows=[],BEAT=60/103.322299;
      const q=(x=0,y=0,z=0)=>new T.Quaternion().setFromEuler(new T.Euler(x,y,z,'YXZ'));
      const smooth=x=>x*x*x*(x*(x*6-15)+10),legs=[u.legLG,u.legRG],knees=[u.kneeLG,u.kneeRG],ankles=[u.ankleLG,u.ankleRG];
      function meshMin(root){let minY=Infinity;root.traverseVisible(o=>{const a=o.geometry?.attributes.position;if(!o.isMesh||!a)return;for(let j=0;j<a.count;j++){p.fromBufferAttribute(a,j).applyMatrix4(o.matrixWorld);minY=Math.min(minY,p.y);}});return minY;}
      for(const pitch of [1.1,1.25,1.4,1.45])for(const thigh of [-2.1,-2.4,-2.6,-2.8])for(const knee of [2.4,2.6])for(const ankle of [-.5,-.8]){
        const samples=[];
        for(const b of [22,22.25,22.5,23,23.5]){
          const state=C.dance.sample(b*BEAT),k=smooth((b-22)/2),a=2*Math.PI*b;
          C.dance.root.position.copy(state.pose.hip);C.dance.root.quaternion.copy(q(pitch,.12).slerp(q(Math.PI,.12,.010*Math.sin(Math.PI*b)),k));
          C.dance.root.updateMatrixWorld(true);
          const center=u.armLG.getWorldPosition(new T.Vector3()).add(u.armRG.getWorldPosition(new T.Vector3())).multiplyScalar(.5),goal=state.targets.hands[0].clone().add(state.targets.hands[1]).multiplyScalar(.5);goal.y=.495;goal.z+=.005;C.dance.root.position.add(goal.sub(center));
          for(let i=0;i<2;i++){const s=i?1:-1;legs[i].quaternion.copy(q(thigh,0,s*.18).slerp(q(-.12+.20*Math.sin(a+i*Math.PI),0,s*(.27+.06*Math.cos(a))),k));knees[i].quaternion.copy(q(knee).slerp(q(.40+.18*Math.sin(a+i*Math.PI-.4)),k));ankles[i].quaternion.copy(q(ankle).slerp(q(-.12),k));}
          C.dance.root.updateMatrixWorld(true);for(const l of legs)l.userData.bootShaft?.userData.bend();
          samples.push({beat:b,legMin:Math.min(...legs.map(meshMin)),headMin:meshMin(u.headG),rootY:C.dance.root.position.y});
        }
        rows.push({pitch,thigh,knee,ankle,minLeg:Math.min(...samples.map(s=>s.legMin)),minHead:Math.min(...samples.map(s=>s.headMin)),samples});
      }
      return rows;
    })()`,120000);
    console.log('LAUNCH_PROBE',JSON.stringify(proof.launchProbe.filter(x=>x.minLeg>-.019&&x.minHead>-.019).slice(0,12)));
  }else if(mode==='head-probe'){
    proof.headProbe=await E.page.evaluate(`(()=>{
      const C=window.__danceCapture,T=window.TT.THREE,u=C.marine.userData,p=new T.Vector3(),rows=[];
      for(const seconds of [13.10,13.166667,13.233333,13.30,13.366667,13.466667,13.6]){
        const state=C.dance.sample(seconds),originalHead=new T.Euler().setFromQuaternion(u.headG.quaternion,'YXZ');
        const center=u.armLG.getWorldPosition(new T.Vector3()).add(u.armRG.getWorldPosition(new T.Vector3())).multiplyScalar(.5);C.dance.root.position.y-=center.y-.495;
        for(const yaw of [0,.4,.7,1.0,1.2,-.7,-1.0])for(const pitch of [-.3,0,.3,.6,.9,1.2]){
          u.headG.quaternion.setFromEuler(new T.Euler(pitch,yaw,0,'YXZ'));C.dance.root.updateMatrixWorld(true);let minY=Infinity,part='';
          u.headG.traverseVisible(o=>{const a=o.geometry?.attributes.position;if(!o.isMesh||!a)return;for(let j=0;j<a.count;j++){p.fromBufferAttribute(a,j).applyMatrix4(o.matrixWorld);if(p.y<minY){minY=p.y;let n=o,isNVG=false;while(n&&n!==u.headG){if(n===u.nvgPivot)isNVG=true;n=n.parent;}part=isNVG?'nvg':'head';}}});
          rows.push({seconds,originalHead:[originalHead.x,originalHead.y,originalHead.z],pitch,yaw,minY,part});
        }
      }
      return rows;
    })()`,120000);
    console.log('HEAD_PROBE',JSON.stringify(proof.headProbe.filter(x=>x.minY>-.019&&Math.abs(x.yaw)<=1).slice(0,12)));
  }else if(mode==='plant-probe'){
    const result=await E.page.evaluate(`(async()=>{
      const C=window.__danceCapture,T=window.TT.THREE,u=C.marine.userData,{ikLimb}=await import('/studio/ik.js');
      const arms=[u.armLG,u.armRG],elbows=[u.elbowLG,u.elbowRG],wrists=elbows.map(e=>e.userData.wrist);
      const X=new T.Vector3(1,0,0),flip=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.PI),palm=new T.Vector3(0,-.048,.016);
      const target=new T.Vector3(),offset=new T.Vector3(),parent=new T.Quaternion(),v=new T.Vector3(),rows=[];
      function solve(i,point,pole){const wr=wrists[i],psi=Math.atan2(-wr.position.z,-wr.position.y),bend=ikLimb(arms[i],elbows[i],.28,.222,point,pole,1,wr.position);arms[i].quaternion.multiply(flip);elbows[i].quaternion.setFromAxisAngle(X,-bend-psi);}
      function sample(hip,width,z,yaw,poleZ){
        C.dance.sample(14.5);C.dance.root.position.set(0,hip,0);C.dance.root.quaternion.setFromEuler(new T.Euler(Math.PI,.12,0,'YXZ'));u.torsoG.quaternion.identity();u.headG.quaternion.identity();
        for(const a of arms)a.position.y=.51;C.dance.root.updateMatrixWorld(true);const hands=[];
        for(let i=0;i<2;i++){
          const s=i?1:-1,goal=new T.Vector3(s*width,.012,z),palmQ=new T.Quaternion().setFromEuler(new T.Euler(Math.PI/2,.12+s*yaw,0,'YXZ')),pole=new T.Vector3(s,.12,poleZ);
          target.copy(palm).applyQuaternion(palmQ).negate().add(goal);solve(i,target,pole);
          elbows[i].getWorldQuaternion(parent);offset.set(wrists[i].position.x,0,0).applyQuaternion(parent);target.sub(offset);solve(i,target,pole);
          elbows[i].getWorldQuaternion(parent).invert();wrists[i].quaternion.copy(parent).multiply(palmQ);C.dance.root.updateMatrixWorld(true);
          const tw=new T.Quaternion(0,wrists[i].quaternion.y,0,wrists[i].quaternion.w).normalize(),sw=wrists[i].quaternion.clone().multiply(tw.invert());
          hands.push({side:i?'R':'L',elbow:2*Math.atan2(elbows[i].quaternion.x,elbows[i].quaternion.w),swing:2*Math.acos(Math.min(1,Math.abs(sw.w))),error:wrists[i].localToWorld(palm.clone()).distanceTo(goal)});
        }
        C.dance.root.updateMatrixWorld(true);for(const a of arms)a.userData.liveShoulder?.bend();let minY=Infinity;
        C.marine.traverseVisible(o=>{const p=o.geometry?.attributes.position;if(!o.isMesh||!p)return;for(let j=0;j<p.count;j++){v.fromBufferAttribute(p,j).applyMatrix4(o.matrixWorld);minY=Math.min(minY,v.y);}});
        return {hip,width,z,yaw,poleZ,hands,minY,score:Math.max(...hands.map(h=>h.swing))+Math.max(...hands.map(h=>h.error))*20+hands.reduce((s,h)=>s+Math.max(0,h.elbow+.20)*10+Math.max(0,-.50-h.elbow)*3,0)};
      }
      for(const hip of [1.04,1.055,1.07,1.085,1.10,1.115])for(const width of [.28,.30,.32])for(const z of [-.025,.025,.075])for(const yaw of [-.5,0,.5])for(const poleZ of [-.15,.6,1.2])rows.push(sample(hip,width,z,yaw,poleZ));
      rows.sort((a,b)=>a.score-b.score);const best=rows[0];sample(best.hip,best.width,best.z,best.yaw,best.poleZ);C.stage.update(14.5,14.5/.580707169,C.dance.root.position);await C.renderer.renderAsync(C.scene,C.camera);
      return {rows,best,png:C.renderer.domElement.toDataURL('image/png').split(',')[1]};
    })()`,120000);
    fs.writeFileSync(path.join(out,'best.png'),Buffer.from(result.png,'base64'));delete result.png;proof.plantProbe=result;console.log('PLANT_PROBE',JSON.stringify(result.rows.slice(0,8)));
  }else if(mode==='audit'){
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
    const anatomy=proof.audit.frames.flatMap(s=>s.anatomy.map(a=>({seconds:s.seconds,phrase:s.phrase,...a})));
    proof.audit.anatomy={note:'Torso proxy uses source shirt cross-sections; any penetration is a candidate for visual review, not an exact mesh collision.',
      positiveElbows:anatomy.filter(a=>a.elbow[0]>.02),
      handBodyOutliers:anatomy.filter(a=>a.minHandTorso!==null).sort((a,b)=>a.minHandTorso-b.minHandTorso).slice(0,8),
      forearmBodyOutliers:anatomy.filter(a=>a.minForearmTorso!==null).sort((a,b)=>a.minForearmTorso-b.minForearmTorso).slice(0,8),
      freeWristOutliers:anatomy.filter(a=>a.planted<.001).sort((a,b)=>b.wristSwing-a.wristSwing).slice(0,8),
      plantWristOutliers:anatomy.filter(a=>a.planted>.999).sort((a,b)=>b.wristSwing-a.wristSwing).slice(0,8)};
    proof.audit.quality={
      noFloorPenetration:proof.audit.frames.every(s=>s.penetration<.002),
      noElbowHyperextension:proof.audit.anatomy.positiveElbows.length===0,
      handsOutsideTorsoProxy:anatomy.every(a=>a.insideHandVertices===0),
      plantedHandsWithin25mm:proof.audit.handOutliers.every(h=>h.error<.025),
      freeWristsWithin30Degrees:proof.audit.anatomy.freeWristOutliers.every(a=>a.wristSwing<Math.PI/6),
      plantedWristsWithin92Degrees:proof.audit.anatomy.plantWristOutliers.every(a=>a.wristSwing<92*Math.PI/180),
      deterministicSeek:proof.audit.seek.seeks.every(s=>s.max<1e-8),
      note:'Numerical diagnostics are necessary checks, not a substitute for viewing the animation.'};
    if(has('snapshot'))proof.samples.push(await capture(Number(option('snapshot',30)),'audit-snapshot.png'));
    console.log('AUDIT_SUMMARY',JSON.stringify({lowest:proof.audit.worstVertices[0],hand:proof.audit.handOutliers[0],groundFoot:proof.audit.groundFootOutliers[0],seekMax:Math.max(...proof.audit.seek.seeks.map(s=>s.max)),boundary:proof.audit.boundaryOutliers[0]}));
    console.log('AUDIT_QUALITY',JSON.stringify(proof.audit.quality));
  }else if(mode==='render'){
    for(let i=0;i<frames;i++){
      const shot=await capture(start+i/fps,`${String(i).padStart(5,'0')}.png`);
      if(i%30===0||i===frames-1)proof.samples.push(shot);
      if(i%60===0||i===frames-1)console.log(`FRAME ${i+1}/${frames} t=${shot.seconds.toFixed(3)}`);
    }
  }else if(mode==='sheet'){
    const times=String(option('times',[0,8,16,20,22,24,28,30,38,40,48,52,56].map(beat=>beat*60/103.322299).join(','))).split(',').map(Number);
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
