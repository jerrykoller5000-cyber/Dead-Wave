import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';import {launch} from '../../tools/cdp.mjs';
assert(process.env.DW_GAME_TEST_TOKEN);const phase=process.argv[2];assert(['before','after'].includes(phase));
const root=new URL('./',import.meta.url),dir=new URL(phase+'/',root);await mkdir(dir,{recursive:true});
const server=await serve(fileURLToPath(new URL('../../',root)),0),browser=await launch({headless:false});
try{
 const page=await browser.newPage({width:1280,height:720});await page.goto(server.origin+'/index.html?debug=1&raf=timer');
 assert(await page.waitFor('window.TT&&DWLoad.snapshot().state==="ready"',{timeout:180000}));await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
 await page.evaluate("document.getElementById('playerName').value='ACP fit';document.getElementById('modeTraining').click()");
 assert(await page.waitFor("TT.trainingDbg.state().active&&!TT.trainingDbg.state().warming&&!document.getElementById('trainingBlackout')?.classList.contains('on')",{timeout:180000}));
 const setup=async function(phase,saved){
  const T=TT,G=T.THREE,H=T.inspectHost(),B=H.builders,ctx=B.weaponContext(),{makePistolModel}=await import('/studio/weapon-sidearms.js');
  const C=await import('/studio/weapon-casings.js'),{visibleSurfaceGap,visiblePieces}=await import('/tools/tests/weapon-seating.js'),{LIGHTS}=await import('/studio/inspector/stage.js');
  let body;const gun=makePistolModel({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{},gunKit:root=>{const k=ctx.gunKit(root);return {...k,slab(...a){const m=k.slab(...a);if(a[1]===.040&&a[3]?.rx===.3&&a[0][0][1]===.081)body=m;return m;}};}});
  if(!body)throw Error('Magazine body missing');gun.scale.copy(T.weaponMeshes.pistol.scale);gun.visible=true;
  const round=gun.userData.magazineTopRound;gun.userData.setMagazineRounds(5);
  function dimensions(geo){geo.computeBoundingBox();return geo.boundingBox.getSize(new G.Vector3()).toArray();}
  function fit(geometry,place){
   const old=round.geometry,oldPos=round.position.clone();round.geometry=geometry;
   if(place){geometry.computeBoundingBox();const h=.0818+geometry.boundingBox.max.x/1.05+.002743;round.position.set(0,h*Math.cos(.3),h*Math.sin(.3));}
   gun.updateMatrixWorld(true);const initial=visibleSurfaceGap(round,body,1),start=round.position.clone();let lift=0,gap=initial;
   if(gap.penetrating){let low=0,high=.0005;const put=h=>{round.position.copy(start).add(new G.Vector3(0,Math.cos(.3)*h,Math.sin(.3)*h));gun.updateMatrixWorld(true);return visibleSurfaceGap(round,body,1);};while(high<.02&&put(high).penetrating)high+=.0005;for(let i=0;i<17;i++){const m=(low+high)/2;if(put(m).penetrating)low=m;else high=m;}lift=high;gap=put(lift);}
   const result={initial,gap,lift,position:round.position.toArray(),closed:visiblePieces(round).map(p=>p.closed),size:dimensions(geometry),scale:round.scale.toArray()};
   round.geometry=old;round.position.copy(oldPos);gun.updateMatrixWorld(true);return result;
  }
  const result={current:fit(round.geometry,false),caseSize:dimensions(C.spentCaseGeometry(G,'pistol')),liveSize:dimensions(C.roundGeometry(G,'pistol'))};
  if(phase==='before'){
   let source=await(await fetch('/studio/weapon-casings.js')).text();
   const a="pistol:   [19.15, 5.0, 4.95, 4.75]",b="if (kind === 'pistol') tip = 29.69 - length;";
   if(source.split(a).length!==2||source.split(b).length!==2)throw Error('Prototype source seams changed');
   source=source.replace(a,'pistol:   [22.8, 6.1, 6.05, 6.0]').replace(b,"if (kind === 'pistol') tip = 32.4 - length;");
   const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));try{const P=await import(url);result.prototype=fit(P.roundGeometry(G,'pistol'),true);result.prototype.caseSize=dimensions(P.spentCaseGeometry(G,'pistol'));}finally{URL.revokeObjectURL(url);}
  }
  const states=[];for(const n of [0,1,5,0,NaN]){gun.userData.setMagazineRounds(n);states.push(round.visible);}result.states=states;gun.userData.setMagazineRounds(5);
  const roundMatrix=()=>{gun.updateMatrixWorld(true);return gun.userData.mag.matrixWorld.clone().invert().multiply(round.matrixWorld).toArray();};
  result.extensionBefore=roundMatrix();B.gunExtLook(gun,'pistol',true);result.extensionAfter=roundMatrix();B.gunExtLook(gun,'pistol',false);
  T.grantAllWeapons();if(T.isUnarmed())T.toggleHolster();T.flightHold(true);T.setViewFirstDbg(true);T.setZoomHeldDbg(false);T.setOtsAimDbg(0,-.08);
  for(let i=0;i<30&&T.getCurrentWeapon()!=='pistol';i++){T.setWeapon(T.WEAPON_ORDER.indexOf('pistol'));for(let j=0;j<12;j++)T.stepFrame(1/30);}
  for(let i=0;i<100;i++)T.stepFrame(1/30);T.setAmmoDbg('pistol',10);
  const original=T.casings.at(-1);T.setMouseFireDbg(true);for(let i=0;i<90&&T.casings.at(-1)===original;i++)T.stepFrame(1/120);T.setMouseFireDbg(false);
  const c=T.casings.at(-1);if(c===original||c.mesh.userData.caseOf!=='pistol'||c.mesh.geometry!==C.spentCaseGeometry(G,'pistol'))throw Error('No actual pistol case');
  for(let i=0;i<7;i++)T.stepFrame(1/120);
  const nativeEye={eye:H.camera.position.toArray(),target:H.camera.position.clone().add(H.camera.getWorldDirection(new G.Vector3())).toArray(),fov:H.camera.fov};
  const shell=c.mesh;result.ejected={eyeCamera:nativeEye,size:dimensions(shell.geometry),scale:shell.scale.toArray(),position:shell.position.toArray(),quaternion:shell.quaternion.toArray(),caseOf:shell.userData.caseOf};
  if(saved){shell.position.fromArray(saved.position);shell.quaternion.fromArray(saved.quaternion);shell.updateMatrixWorld(true);}
  const mag=gun.userData.mag;T.scene.add(mag);mag.position.copy(T.player.position).add(new G.Vector3(0,4,1));mag.scale.copy(T.weaponMeshes.pistol.scale);mag.updateMatrixWorld(true);mag.visible=false;
  const css=document.createElement('style');css.textContent='body > :not(canvas):not(script):not(style):not(#scopeOverlay):not(#view){visibility:hidden!important}';document.head.append(css);
  let lighting=LIGHTS.noon,focus=T.player.position.clone();H.attach({held:()=>true,scale:dt=>dt,frame:()=>{const L=lighting;H.sun.position.copy(focus).addScaledVector(new G.Vector3(...L.dir).normalize(),85);H.sun.target.position.copy(focus);H.sun.target.updateMatrixWorld();H.sun.color.setHex(L.sunColor);H.sun.intensity=L.sun;H.hemi.color.setHex(L.skyColor);H.hemi.groundColor.setHex(L.ground);H.hemi.intensity=L.sky;H.ambientFill.intensity=L.fill;H.moon.intensity=0;}});
  window.acpPose=(view,light)=>{
   lighting=LIGHTS[light];mag.visible=view==='lips';T.setShotView(null);T.viewmodelDbg().root.visible=view==='eye-flight';
   if(view==='lips'){focus=mag.position.clone();const eye=mag.localToWorld(new G.Vector3(.085,.145,.16)),target=mag.localToWorld(new G.Vector3(0,.083,.025));T.setShotView({x:eye.x,y:eye.y,z:eye.z,tx:target.x,ty:target.y,tz:target.z,fov:38});}
   else if(view==='case-flight'){focus=shell.position.clone();const eye=focus.clone().add(new G.Vector3(.10,.07,.10));T.setShotView({x:eye.x,y:eye.y,z:eye.z,tx:focus.x,ty:focus.y,tz:focus.z,fov:25});}
   else if(view==='eye-flight'){focus=T.player.position.clone();const cam=saved?.eyeCamera||nativeEye;T.setShotView({x:cam.eye[0],y:cam.eye[1],z:cam.eye[2],tx:cam.target[0],ty:cam.target[1],tz:cam.target[2],fov:cam.fov});}
   else throw Error(view);
   T.stepFrame(0);H.render();return {view,light,eye:H.camera.position.toArray(),fov:H.camera.fov};
  };
  return result;
 };
 const saved=phase==='after'?JSON.parse(await readFile(new URL('before/fit.json',root),'utf8')).ejected:null;
 const result=await page.evaluate('('+setup.toString()+')('+JSON.stringify(phase)+','+JSON.stringify(saved)+')',180000);
 await writeFile(new URL('fit.json',dir),JSON.stringify(result,null,2));console.log('FIT',JSON.stringify(result));
 assert.deepEqual(result.states,[false,true,true,false,false]);assert(result.current.closed.every(Boolean));assert(!result.current.gap.penetrating&&result.current.gap.upperMm<.5);
 assert(Math.max(...result.extensionBefore.map((v,i)=>Math.abs(v-result.extensionAfter[i])))<1e-10);
 if(phase==='after'){assert.equal(result.current.lift,0,'Apply fit before final pictures');assert(Math.abs(result.caseSize[1]*1000-22.8)<.002);assert(Math.abs(result.liveSize[1]*1000-32.4)<.002);}
 const cameras=[];
 for(const view of ['lips','case-flight','eye-flight'])for(const light of ['noon','overcast','dusk','night']){
  cameras.push(await page.evaluate('acpPose('+JSON.stringify(view)+','+JSON.stringify(light)+')'));
  const shot=await page.send('Page.captureScreenshot',{format:'png'});await writeFile(new URL(view+'-'+light+'.png',dir),Buffer.from(shot.data,'base64'));
 }
 await writeFile(new URL('cameras.json',dir),JSON.stringify(cameras,null,2));assert.deepEqual(page.errors,[]);console.log('PASS',phase,'native lip fit/count/extension and actual ejected case; four lights');
}finally{await browser.close();await server.close();}
