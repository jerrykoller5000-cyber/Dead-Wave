// GP-19902: native render harness. Only reads the game; the dance gets its own rig/scene/renderer.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Engine} from '../../tools/camera.mjs';

const ROOT=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const args=process.argv.slice(2);
const has=key=>args.includes('--'+key);
const option=(key,otherwise)=>{const i=args.indexOf('--'+key);return i<0?otherwise:args[i+1];};
const mode=has('audit')?'audit':has('render')?'render':has('sheet')?'sheet':'probe';
const alpha=has('alpha'),fps=Number(option('fps',30));
const size=String(option('size','1280x720')).split('x').map(Number);
const start=Number(option('start',0));
const frames=Number(option('frames',1800));
const out=path.resolve(ROOT,option('out',`review/dance-GP19902/${mode}${alpha?'-alpha':''}`));
const vector=(key,defaultValue)=>String(option(key,defaultValue)).split(',').map(Number);
const cam=vector('camera','2.6,2,5.5'),look=vector('look','0,.75,0');
const fov=Number(option('fov',43));
const outfitPath=option('outfit',null);
const outfit=outfitPath?JSON.parse(fs.readFileSync(path.resolve(ROOT,outfitPath),'utf8')):null;
if(outfit&&!outfit.wardrobe?.items)throw new Error('--outfit JSON must provide {wardrobe:{items,...},gearOwned?:{helmet,vest,pads,nvg}}');
if(size.length!==2||size.some(x=>!Number.isFinite(x)||x<=0)||!(fps>0)||!Number.isInteger(frames)||frames<1)throw new Error('Invalid size, fps or frames');
fs.mkdirSync(out,{recursive:true});
const proof={mode,alpha,size,fps,start,frames:mode==='render'?frames:undefined,out,outfitPath,started:new Date().toISOString(),camera:{position:cam,look,fov},samples:[]};
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
    let dance,motionMissing=false;
    if(response.ok){const {createDisclaimerDance}=await import('/ui/disclaimer-dance.js');dance=createDisclaimerDance(marine);}
    else if(${JSON.stringify(mode)}==='probe'){
      motionMissing=true;u.armLG.rotation.set(.03,0,-.1);u.armRG.rotation.set(.03,0,.1);u.elbowLG.rotation.set(-.25,0,0);u.elbowRG.rotation.set(-.25,0,0);
      dance={root:marine,duration:60,sample(){}};
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
    const {createDanceStage}=await import('/review/dance-GP19902/stage.js');
    const stage=createDanceStage(THREE,scene);
    if(${alpha})stage.root.visible=false; // lights remain in scene for the transparent actor pass.
    scene.add(dance.root);
    for(const el of document.body.children)el.style.setProperty('display','none','important');
    renderer.domElement.id='danceCapture';renderer.domElement.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;display:block;z-index:2147483647';
    document.body.appendChild(renderer.domElement);
    window.__danceCapture={scene,camera,renderer,stage,dance,marine};
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
      return {seconds,phrase:state?.phrase,vertices,lowest:mins.slice(0,5),penetration:Math.max(0,-.025-(mins[0]?.y??0)),
        hands:[u.elbowLG,u.elbowRG].map((e,i)=>({...auditContact(e.userData.wrist,[0,-.048,.016],state?.targets?.hands?.[i]),planted:state?.targets?.handPlant?.[i]||0,side:i?'R':'L'})),
        feet:[u.ankleLG,u.ankleRG].map((e,i)=>({...auditContact(e,[0,-.103,.03],state?.targets?.feet?.[i]),ground:(state?.targets?.feet?.[i]?.y??1)<=.005,side:i?'R':'L'}))};
    };
    const auditSnapshot=seconds=>{
      auditPrepare(seconds);const result={};
      for(const [name,o] of Object.entries(auditJoints))if(o){const p=o.getWorldPosition(new THREE.Vector3()),q=o.getWorldQuaternion(new THREE.Quaternion());result[name]={p:p.toArray(),q:q.toArray(),localP:o.position.toArray(),localQ:o.quaternion.toArray()};}
      // Include deformed hands/shoulders/boots, so a seek cannot leave a stale mesh.
      const geometry=[];marine.traverseVisible(o=>{const a=o.geometry?.attributes.position?.array;if(o.isMesh&&a){let sum=0;for(let i=0;i<a.length;i++)sum+=a[i]*(1+(i%19));geometry.push(sum);}});
      return {joints:result,geometry};
    };
    window.__danceSeekAudit=()=>{
      const times=[0,4,9,15,20,25,30,35,40,41,42.5,45,50,55,59.9,60],seeks=[];
      for(const t of times){const a=auditSnapshot(t);auditSnapshot((t+27.315)%60);const b=auditSnapshot(t);let max=0,where='';
        for(const [name,j] of Object.entries(a.joints))for(const key of ['p','q','localP','localQ'])for(let i=0;i<j[key].length;i++){const d=Math.abs(j[key][i]-b.joints[name][key][i]);if(d>max){max=d;where=name+'.'+key+'['+i+']';}}
        for(let i=0;i<a.geometry.length;i++){const d=Math.abs(a.geometry[i]-b.geometry[i]);if(d>max){max=d;where='geometry['+i+']';}}
        seeks.push({seconds:t,max,where});
      }
      const boundaries=[];
      for(let n=1;n<=12;n++){const t=n*8*(60/103.322299),eps=.00001,a=auditSnapshot(t-eps),b=auditSnapshot(t+eps);let position=0,angle=0,joint='';
        for(const [name,j] of Object.entries(a.joints)){const k=b.joints[name],distance=Math.hypot(...j.p.map((v,i)=>v-k.p[i]));if(distance>position){position=distance;joint=name;}
          const dot=Math.min(1,Math.abs(j.q.reduce((s,v,i)=>s+v*k.q[i],0)));angle=Math.max(angle,2*Math.acos(dot));}
        boundaries.push({seconds:t,section:n,maxPosition:position,positionJoint:joint,maxAngle:angle,interval:eps*2});
      }
      return {seeks,boundaries};
    };
    window.__danceFrame=async(seconds)=>{
      const state=dance.sample(seconds);
      stage.update(seconds,seconds/.580707169,dance.root.position);
      dance.root.updateMatrixWorld(true);
      for(const arm of [u.armLG,u.armRG])arm.userData.liveShoulder?.bend();
      for(const leg of [u.legLG,u.legRG])leg.userData.bootShaft?.userData.bend();
      await renderer.renderAsync(scene,camera);
      const box=new THREE.Box3();
      marine.traverseVisible(o=>{if(o.isMesh&&o.geometry){if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();const b=o.geometry.boundingBox?.clone();if(b)box.union(b.applyMatrix4(o.matrixWorld));}});
      const contact=(object,offset,expected)=>{const point=object.localToWorld(new THREE.Vector3(...offset));return {point:point.toArray(),target:expected?.toArray?.()||null,error:expected?point.distanceTo(expected):null};};
      const contacts={hands:[u.elbowLG,u.elbowRG].map((elbow,i)=>({...contact(elbow.userData.wrist,[0,-.048,.016],state?.targets?.hands?.[i]),planted:state?.targets?.handPlant?.[i]||0})),feet:[u.ankleLG,u.ankleRG].map((ankle,i)=>contact(ankle,[0,-.103,.03],state?.targets?.feet?.[i]))};
      const png=renderer.domElement.toDataURL('image/png').split(',')[1];
      return {png,meta:{seconds,state:typeof state==='string'?state:state?{phrase:state.phrase,beat:state.beat}:null,contacts,bounds:{min:box.min.toArray(),max:box.max.toArray()},root:dance.root.position.toArray(),drawCalls:renderer.info.render.calls}};
    };
    let storedWardrobe=null;try{storedWardrobe=JSON.parse(localStorage.getItem('tt_wardrobe')||'null');}catch{}
    const wardrobe=outfit?.wardrobe||T.getWardrobe?.()||storedWardrobe;
    return {backend:renderer.backend?.isWebGPUBackend?'webgpu':backend,picked,wardrobe,storedWardrobe,gear,gearOwned:outfitGear||T.getGearOwned?.()||null,motionMissing,duration:dance.duration,
      source:'Fresh TT.makeMarine in camera browser with TT.dressMarine current page profile and matching live gear visibility',
      note:outfit?outfit.source||'Explicit wardrobe supplied with --outfit.':'Camera uses an isolated browser profile; null storedWardrobe means factory/default profile, not a snapshot of the user game save.'};
  })()`,180000);
  console.log('SETUP',JSON.stringify(proof.setup));
  const capture=async(seconds,name)=>{
    const frame=await E.page.evaluate(`window.__danceFrame(${seconds})`,120000);
    fs.writeFileSync(path.join(out,name),Buffer.from(frame.png,'base64'));
    return {...frame.meta,file:name};
  };
  if(mode==='audit'){
    proof.audit={floorY:-.025,rate:2,frames:[]};
    for(let k=0;k<=120;k++){
      const frame=await E.page.evaluate(`window.__danceAuditAt(${k/2})`,120000);
      proof.audit.frames.push(frame);
      if(k%30===0)console.log('AUDIT',k/2,'seconds minY',frame.lowest[0]?.y);
    }
    proof.audit.seek=await E.page.evaluate('window.__danceSeekAudit()',120000);
    proof.audit.worstVertices=proof.audit.frames.flatMap(s=>s.lowest.map(m=>({seconds:s.seconds,phrase:s.phrase,...m}))).sort((a,b)=>a.y-b.y).slice(0,12);
    proof.audit.handOutliers=proof.audit.frames.flatMap(s=>s.hands.filter(h=>h.planted>.99).map(h=>({seconds:s.seconds,phrase:s.phrase,...h}))).sort((a,b)=>b.error-a.error).slice(0,8);
    proof.audit.groundFootOutliers=proof.audit.frames.flatMap(s=>s.feet.filter(f=>f.ground).map(f=>({seconds:s.seconds,phrase:s.phrase,...f}))).sort((a,b)=>b.error-a.error).slice(0,8);
    proof.audit.boundaryOutliers=[...proof.audit.seek.boundaries].sort((a,b)=>b.maxPosition-a.maxPosition).slice(0,5);
    if(has('snapshot'))proof.samples.push(await capture(Number(option('snapshot',30)),'audit-snapshot.png'));
    console.log('AUDIT_SUMMARY',JSON.stringify({lowest:proof.audit.worstVertices[0],hand:proof.audit.handOutliers[0],groundFoot:proof.audit.groundFootOutliers[0],seekMax:Math.max(...proof.audit.seek.seeks.map(s=>s.max)),boundary:proof.audit.boundaryOutliers[0]}));
  }else if(mode==='render'){
    for(let i=0;i<frames;i++){
      const shot=await capture(start+i/fps,`${String(i).padStart(5,'0')}.png`);
      if(i%30===0||i===frames-1)proof.samples.push(shot);
      if(i%60===0||i===frames-1)console.log(`FRAME ${i+1}/${frames} t=${shot.seconds.toFixed(3)}`);
    }
  }else if(mode==='sheet'){
    const times=String(option('times','0,4,8,13,18,23,28,33,38,43,50,59.5')).split(',').map(Number);
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
