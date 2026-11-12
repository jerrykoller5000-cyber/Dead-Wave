import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
assert(process.env.DW_GAME_TEST_TOKEN);
const folder=new URL('verification/',import.meta.url);await mkdir(folder,{recursive:true});
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{
 const page=await browser.newPage({width:960,height:540});
 await page.goto(server.origin+'/index.html?debug=1&raf=timer');
 assert(await page.waitFor('window.TT&&DWLoad.snapshot().state==="ready"',{timeout:180000}));
 await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
 await page.evaluate("document.getElementById('playerName').value='Round fit';document.getElementById('modeTraining').click()");
 assert(await page.waitFor("TT.trainingDbg.state().active&&!TT.trainingDbg.state().warming&&!document.getElementById('trainingBlackout')?.classList.contains('on')",{timeout:180000}));
 const fit=await page.evaluate(`(async()=>{
  const T=TT,{makePistolModel}=await import('/studio/weapon-sidearms.js'),{visibleSurfaceGap,visiblePieces}=await import('/tools/tests/weapon-seating.js');
  const ctx=T.inspectHost().builders.weaponContext();let body;
  const gun=makePistolModel({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{},gunKit:root=>{
   const k=ctx.gunKit(root);return {...k,slab(...a){const m=k.slab(...a);if(a[1]===.040&&a[3]?.rx===.3&&a[0][0][1]===.081)body=m;return m;}};
  }});
  if(!body)throw Error('No mag body');
  const round=gun.userData.magazineTopRound,states=[];
  for(const count of [0,1,5,0,NaN]){
   gun.userData.setMagazineRounds(count);states.push(round.visible);
   if(round.visible!==(Number.isFinite(count)&&count>0))throw Error('Wrong count visibility');
  }
  gun.userData.setMagazineRounds(1);gun.scale.copy(T.weaponMeshes.pistol.scale);gun.visible=true;gun.updateMatrixWorld(true);
  const initialGap=visibleSurfaceGap(round,body,1),start=round.position.clone();
  let lift=0,gap=initialGap;
  if(gap.penetrating){
    let low=0,high=.0005;
    const place=h=>{round.position.copy(start).add(new T.THREE.Vector3(0,Math.cos(.3)*h,Math.sin(.3)*h));gun.updateMatrixWorld(true);return visibleSurfaceGap(round,body,1);};
    while(high<.02&&place(high).penetrating)high+=.0005;
    for(let n=0;n<16;n++){const mid=(low+high)/2;if(place(mid).penetrating)low=mid;else high=mid;}
    lift=high;gap=place(lift);
  }
  return {states,initialGap,lift,gap,closed:visiblePieces(round).map(p=>p.closed),scale:round.scale.toArray(),position:round.position.toArray(),trigger:gun.userData.triggerPin};
 })()`,180000);
 await writeFile(new URL('fit.json',folder),JSON.stringify(fit,null,2));console.log('FIT',fit);
 assert(!fit.gap.penetrating&&fit.gap.upperMm<.5);
 if(process.argv.includes('--fit-only')){console.log('PROTOTYPE lift',fit.lift);process.exitCode=0;}else{
 assert.equal(fit.lift,0,'Apply the measured fit before rendering');
 await page.evaluate("import('/review/GT-20076/visibility-camera.mjs').then(m=>{window.views=m.makeViews(TT);return views.equip('pistol')})");
 await page.evaluate("views.pose('hip')");
 await page.evaluate("import('/review/GT-20101/round-contact.js').then(m=>{window.roundContact=m.makeRoundContact(TT);return true})");
 await page.evaluate(`(async()=>{const T=TT,G=T.THREE,H=T.inspectHost();window.liveLights=(await import('/studio/inspector/stage.js')).LIGHTS;window.liveLighting=liveLights.noon;H.attach({held:()=>false,scale:dt=>dt,frame:()=>{const L=liveLighting;H.sun.position.copy(T.player.position).addScaledVector(new G.Vector3(...L.dir).normalize(),85);H.sun.target.position.copy(T.player.position);H.sun.target.updateMatrixWorld();H.sun.color.setHex(L.sunColor);H.sun.intensity=L.sun;H.hemi.color.setHex(L.skyColor);H.hemi.groundColor.setHex(L.ground);H.hemi.intensity=L.sky;H.ambientFill.intensity=L.fill;H.moon.intensity=0;}});return true})()`);
 await page.evaluate("TT.setAmmoDbg('pistol',5);TT.startReload()");
 const poses=[];
 for(const phase of (process.argv.includes('--hands')?[]:[.15,.35,.55,.75]))for(const light of ['noon','overcast','dusk','night']){
  await page.evaluate('window.liveLighting=liveLights['+JSON.stringify(light)+'];true');
  const record=await page.evaluate('(()=>{TT.reloadClipDbg.hold('+phase+');for(let i=0;i<3;i++)TT.stepFrame(1/60);TT.inspectHost().render();const s=TT.getReloadDbg();const V=TT.viewmodelDbg(),source=TT.weaponMeshes.pistol.userData.magazineTopRound,eye=V.gun.pairs.find(([p])=>p===source)?.[1];if(!eye)throw Error("No eye round");const contact=roundContact(V,eye);if(contact.r.worst>.0005||contact.l.worst>.0005)throw Error("Round in reload glove "+JSON.stringify(contact));return {state:s,position:V.gun.mag.position.toArray(),contact}})()');
  assert.equal(record.state.weapon,'pistol');poses.push({phase,light,...record});
  const shot=await page.send('Page.captureScreenshot',{format:'png'});
  await writeFile(new URL('reload-'+phase+'-'+light+'.png',folder),Buffer.from(shot.data,'base64'));
 }
 if(poses.length)await writeFile(new URL('poses.json',folder),JSON.stringify(poses,null,2));
 if(!process.argv.includes('--hands'))assert(new Set(poses.map(p=>p.position.join(','))).size>1,'Magazine must move across reload phases');
 await page.evaluate('TT.reloadClipDbg.hold(null)');
 if(process.argv.includes('--hands')){
  await page.evaluate(await readFile(new URL('../../tools/tests/lib.js',import.meta.url),'utf8'));
  const hands=await page.evaluate(`(async()=>{const {clipCheck}=await import('/tools/tests/clip-check.js'),u=TT.weaponMeshes.pistol.userData,saved=u.setMagazineRounds,results={};try{for(const version of ['before','after']){u.setMagazineRounds=version==='before'?function(){saved.call(this,0)}:saved;const lines=[];await clipCheck(TT,['pistol'],(ok,s)=>lines.push((ok?'PASS ':'FAIL ')+s),lines);results[version]=lines;}}finally{u.setMagazineRounds=saved;}return results;})()`,180000);
  await writeFile(new URL('hands.json',folder),JSON.stringify(hands,null,2));
  console.log('HANDS',hands);assert.deepEqual(hands.after,hands.before,'Round altered a hand contact');
 }
 assert.deepEqual(page.errors,[]);
 console.log('PASS pistol top-round count hook and reload four-light captures');
 }
}finally{await browser.close();await server.close();}
