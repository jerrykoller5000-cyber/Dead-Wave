import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {launch} from '../../tools/cdp.mjs';
import {serve} from '../../tools/serve.mjs';
import {save} from './save.mjs';

assert(process.env.DW_GAME_TEST_TOKEN);
const flamer=['flamer',[.235,-.071,-.246],[0,-.075,-.145],36];
const series={
  '--frame':['catalog-fix-revolver-guard-front','frame-detail','rotating-frame-proof','checkRotatingFrame',[
    ['revolver',[.26,.101,-.126],[0,.056,-.006],34],['shotgun',[.175,-.052,-.396],[0,-.085,-.365],31]]],
  '--stock-mount':['catalog-fix-rotating-frame-swept','stock-mount-detail','stock-mount-proof','stockMountProof',[
    ['launcher',[.25,.115,-.415],[0,.041,-.265],30],flamer]],
  '--stock-tail':['catalog-fix-rotating-frame-swept','stock-mount-tail-detail','stock-mount-proof','stockMountProof',[flamer]],
  '--port-sight':['catalog-fix-stock-mount-tail','port-sight-detail','port-sight-proof','portSightProof',[
    ['uzi',[.226,.043,.151],[.05,.029,.083],32],['m4',[.211,.139,-.213],[0,.094,-.14],29]]],
  '--pump-port':['catalog-fix-revolver-joint-final','pump-port-detail','pump-port-proof','checkPumpPort',[
    ['shotgun',[.34,.095,.21],[.020,.016,.102],24]]],
  '--pump-grip-web':['catalog-fix-breacher-side-vents','pump-grip-web-detail','pump-grip-web-proof','checkPumpGripWeb',[
    ['shotgun',[-.20,-.092,-.192],[0,-.037,-.067],28]]],
  '--breacher-vents':['catalog-fix-minigun-side-final','breacher-vents-detail','breacher-vents-proof','checkBreacherVents',[
    ['aa12',[-.31,.12,.46],[-.045,.06,.37],27]]],
  '--minigun-panel':['catalog-fix-kr-front-band','minigun-panel-detail','minigun-side-panel-proof','checkMinigunPanel',[
    ['minigun',[.251,.028,.185],[.104,-.052,.059],28]]],
  '--kr-band':['catalog-fix-wasp-catch','kr-band-detail','kr-handguard-band-proof','checkKrBand',[
    ['ak',[.22,.09,.63],[0,-.004,.512],25]]],
  '--wasp-catch':['catalog-fix-pump-stock','wasp-catch-detail','wasp-catch-proof','checkWaspCatch',[
    ['uzi',[.12,.28,-.30],[0,.099,-.118],19]]],
  '--pump-stock':['catalog-fix-gw-grip','pump-stock-detail','pump-stock-proof','checkPumpStock',[
    ['shotgun',[-.24,.125,-.13],[0,.012,-.034],25]]],
  '--gw-grip':['catalog-fix-ak-index','gw-grip-detail','gw-grip-proof','checkGwGrip',[
    ['m4',[-.23,-.125,-.225],[0,-.055,-.112],29]]],
  '--wasp-base':['catalog-fix-saw-boot-edge','wasp-base-detail','wasp-base-proof','checkWaspBase',[
    ['uzi',[.24,-.25,-.19],[0,-.177,-.055],28]]],
  '--saw-boot':['catalog-fix-breacher-rim','saw-boot-detail','saw-boot-proof','checkSawBoot',[
    ['chainsaw',[.22,.39,-.46],[.045,.17,-.229],20]]],
  '--drum-ribs':['catalog-fix-pistol-hood','drum-rib-detail','drum-rib-proof','checkDrumRibs',[
    ['aa12',[-.31,-.13,.38],[0,-.26,.095],37]]],
  '--pistol-hood':['catalog-fix-launcher-nose','pistol-hood-detail','pistol-hood-proof','checkPistolHood',[
    ['pistol',[.17,.40,-.025],[0,.073,.075],23]]],
  '--launcher-nose':['catalog-fix-gw-mag-bands','launcher-nose-detail','launcher-nose-proof','checkLauncherNose',[
    ['launcher',[.32,.16,.88],[0,.04,.64],25]]],
  '--gw-mag-bands':['catalog-fix-wasp-collar-final','gw-mag-bands-detail','gw-mag-band-proof','checkMagBands',[
    ['m4',[.32,-.15,.21],[0,-.21,.075],26]]],
  '--wasp-collar':['catalog-fix-wasp-pad','wasp-collar-detail','wasp-collar-proof','checkWaspCollar',[
    ['uzi',[-.23,.14,.53],[0,.03,.34],24]]],
  '--wasp-pad':['catalog-fix-rear-shield','wasp-pad-detail','wasp-pad-proof','checkWaspPad',[
    ['uzi',[.28,.113,-.31],[.05,.032,-.135],25]]],
  '--rear-shield':['catalog-fix-pump-port-final','rear-shield-detail','rear-shield-proof','checkRearShield',[
    ['revolver',[.265,.122,-.134],[0,.057,-.024],27]]],
  '--rv-bridge':['catalog-fix-kr-port-flat','rv-bridge-detail','revolver-bridge-proof','checkRevolverBridge',[
    ['revolver',[.32,.195,-.223],[0,.103,-.025],23]]],
  '--kr-port':['catalog-fix-pistol-grip-local','kr-port-detail','kr-port-proof','checkKrPort',[
    ['ak',[.36,.11,.24],[.021,.017,.184],26]]],
  '--grip-seam':['catalog-fix-gw-collar-indicators','grip-seam-detail','grip-seam-proof','checkGripSeam',[
    ['pistol',[.32,.075,-.172],[0,-.015,-.012],27]]],
  '--gw-collar':['catalog-fix-nose-arch','gw-collar-detail','gw-collar-proof','checkGwCollar',[
    ['m4',[.39,.19,-.42],[0,.036,-.18],24]]],
  '--gw-indicators':['catalog-fix-nose-arch','gw-indicator-detail','gw-collar-proof','checkGwCollar',[
    ['m4',[-.25,.055,-.12],[-.02,.001,-.11],24]]],
  '--nose-arch':['catalog-fix-tang-cheek-final-caps','nose-arch-detail','nose-arch-proof','checkNoseArch',[
    ['chainsaw',[.40,.109,.80],[0,.04,.655],23],['minigun',[.46,.26,-.36],[0,.172,-.105],27]]],
  '--tang-cheek':['catalog-fix-plate-ribs','tang-cheek-detail','tang-cheek-proof','checkTangCheek',[
    ['pistol',[.30,.077,-.268],[0,-.006,-.076],28],['sniper',[.49,.18,-.64],[0,.074,-.45],27]]],
  '--plate-ribs':['catalog-fix-breacher-front-guard-blend','plate-rib-detail','plate-rib-proof','checkPlateRibs',[
    ['shotgun',[.38,-.17,-.06],[0,-.035,.026],25],['sniper',[.40,-.14,.18],[0,-.123,.020],23]]],
  '--lug-vents':['catalog-fix-revolver-dot-seated','lug-vent-detail','lug-vent-proof','checkLugVents',[
    ['revolver',[.28,-.04,.43],[0,.074,.268],25],['chainsaw',[.49,.126,-.35],[.14,.012,-.19],25]]],
  '--handle-optic':['catalog-fix-drum-optic-final','handle-optic-detail','handle-optic-proof','checkHandleOptic',[
    ['chainsaw',[.395,.219,-.58],[0,.055,-.306],33],['sniper',[.43,.22,-.31],[0,.10,-.12],23]]],
  '--drum-optic':['catalog-fix-gw4-trigger-fit','drum-optic-detail','drum-optic-proof','checkDrumOptic',[
    ['aa12',[.28,-.16,.46],[0,-.26,.105],42],['m4',[.15,.173,-.173],[0,.118,-.018],32]]]
};
const run=process.argv[2]||'--frame';
assert(Object.hasOwn(series,run));
const [phase,folder,moduleName,proofName,shots]=series[run];
const baseline=JSON.parse(await readFile(new URL('./'+phase+'/audit.json',import.meta.url),'utf8'));
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try {
  const page=await browser.newPage({width:960,height:540});
  await page.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='Model review';document.getElementById('modeTraining').click()");
  assert(await page.waitFor("TT.trainingDbg.state().active && !TT.trainingDbg.state().warming && !document.getElementById('trainingBlackout')?.classList.contains('on')"));
  await page.evaluate("import('/review/GT-20076/visibility-camera.mjs').then(m=>{window.views=m.makeViews(TT);return true})");
  const only=process.argv[3];
  if(only)assert(shots.some(([id])=>id===only));
  for(const [id,eye,target,fov] of shots){
    if(only&&id!==only)continue;
    const dir=new URL('./visible-repairs/'+id+'/'+folder+'/',import.meta.url);
    await mkdir(dir,{recursive:true});
    const pose=id==='chainsaw'?'held-right-open':'rack';
    await page.evaluate('views.equip('+JSON.stringify(id)+').then(()=>views.pose('+JSON.stringify(pose)+'))');
    const config={id,eye,target,fov,moduleName,proofName,hash:baseline[id].artworkFingerprint};
    const setup=await page.evaluate('('+install.toString()+')('+JSON.stringify(config)+')');
    assert.equal(setup.hash,config.hash);
    if(['--wasp-collar','--pistol-hood','--drum-ribs','--saw-boot','--wasp-base','--gw-grip','--pump-stock','--wasp-catch','--kr-band','--minigun-panel','--breacher-vents','--pump-grip-web'].includes(run)){
      await fixedLightingCaptures(page,dir,'');
      if(run==='--minigun-panel'){
        const path='./visible-repairs/minigun/clear-minigun-panel-after/reload.json';
        const sweep=JSON.parse(await readFile(new URL(path,import.meta.url),'utf8'));
        const drumOff=sweep.find(frame=>frame.phase===.5).eye;
        assert(drumOff.travel>.1);
        await page.evaluate('('+function(pose){
          const drum=reviewArt.model.userData.ammoBox;
          window.restoreDrum=[drum.position.clone(),drum.quaternion.clone(),drum.scale.clone()];
          drum.position.fromArray(pose.position);drum.quaternion.fromArray(pose.quaternion);drum.scale.fromArray(pose.scale);
        }.toString()+')('+JSON.stringify(drumOff)+')');
        await fixedLightingCaptures(page,dir,'exposed-');
        await page.evaluate('(()=>{const drum=reviewArt.model.userData.ammoBox;drum.position.copy(restoreDrum[0]);drum.quaternion.copy(restoreDrum[1]);drum.scale.copy(restoreDrum[2]);})()');
      }
      await page.evaluate("views.pose('held-left-open')");
      await page.evaluate(`(()=>{
        const gun=TT.weaponMeshes[${JSON.stringify(id)}],g=reviewArt.model;
        gun.updateWorldMatrix(true,false);gun.matrixWorld.decompose(g.position,g.quaternion,g.scale);
        g.updateMatrixWorld(true);return true;
      })()`);
      await fixedLightingCaptures(page,dir,'held-',id);
      if(run==='--wasp-collar'){
      await page.evaluate("TT.scene.remove(reviewArt.model);views.equip('uzi')");
      const heat=await page.evaluate("import('/review/GT-20076/wasp-collar-proof.mjs').then(m=>m.checkCollarHeat(TT,"+JSON.stringify(config.hash)+"))");
      await save(new URL('live-heat.json',dir),JSON.stringify(heat,null,2)+'\n');
      console.log('PASS original heat mapping on world and eye',heat);
      }
    }else for(const light of ['noon','overcast','dusk','night'])for(const phase of ['before','after']){
      await page.evaluate('reviewArt.show('+JSON.stringify(phase)+');views.light('+JSON.stringify(light)+')');
      const frame=await page.send('Page.captureScreenshot',{format:'png'});
      await save(new URL(phase+'-'+light+'.png',dir),Buffer.from(frame.data,'base64'));
    }
    if(run==='--pump-grip-web'){
      await page.evaluate("TT.scene.remove(reviewArt.model);views.equip('shotgun')");
      const r=await page.evaluate("import('/review/GT-20076/pump-grip-web-proof.mjs').then(m=>m.checkPumpGripWeb(TT,'shotgun','9e19842b',false,false,true))",180000);
      const before=JSON.parse(await readFile(new URL('../clear-pump-grip-web-before/grip.json',dir),'utf8'));
      for(const key of ['stock','grip','trigger','pump','stockSeat','finish','stockFinish'])assert.deepEqual(r[key],before[key]);
      assert.equal(r.exterior.visible,r.exterior.retained);assert(r.exterior.visible>1000&&r.exterior.maxHeight<1e-6&&r.exterior.maxNormal<.0001&&r.exterior.maxUV<.0001);
      await save(new URL('outer-grip.json',dir),JSON.stringify(r,null,2)+'\n');
      console.log('PASS original exposed grip on both sides at the hand',r.exterior);
    }
    if(run==='--breacher-vents'){
      await page.evaluate("TT.scene.remove(reviewArt.model);views.equip('aa12')");
      const finish=await page.evaluate("import('/review/GT-20076/gw-mag-band-proof.mjs').then(m=>m.checkMagazineFinish(TT,'aa12'))");
      const r=await page.evaluate("import('/review/GT-20076/breacher-vents-proof.mjs').then(m=>m.checkBreacherVents(TT,'aa12','f62123e5'))");
      const before=JSON.parse(await readFile(new URL('../clear-breacher-vents-before/vents.json',dir),'utf8'));
      for(const key of ['trigger','drum','casing','muzzle'])assert.deepEqual(r[key],before[key]);
      assert.equal(r.skins,2);assert.equal(r.casingPaint,'receiver');
      assert(r.seats.every((s,i)=>s.exterior===before.seats[i].exterior&&!s.gap.penetrating&&s.closed[0]));
      assert(r.profiles.every(p=>p.occupied===8601&&p.lost+p.added===0&&p.maxDepth<.000001));
      await save(new URL('finish.json',dir),JSON.stringify({finish,r},null,2)+'\n');
      console.log('PASS six original exterior tuples sets, shared surfaces, M81 and factory drum appearance',finish);
    }
    if(run==='--minigun-panel'){
      await page.evaluate("TT.scene.remove(reviewArt.model);views.equip('minigun')");
      const finish=await page.evaluate("import('/review/GT-20076/minigun-side-panel-proof.mjs').then(m=>m.checkMinigunFinish(TT))");
      await save(new URL('finish.json',dir),JSON.stringify(finish,null,2)+'\n');
      const ext=await page.evaluate("import('/review/GT-20076/minigun-side-panel-proof.mjs').then(m=>m.extensionReference(TT))");
      await save(new URL('extension-reference.json',dir),JSON.stringify(ext)+'\n');
      console.log('PASS minigun M81 receiver and factory rotating and drum artwork',finish);
    }
    if(run==='--kr-band'){
      await page.evaluate("TT.scene.remove(reviewArt.model);views.equip('ak')");
      const finish=await page.evaluate("import('/review/GT-20076/kr-port-proof.mjs').then(m=>m.checkPortFinish(TT))");
      await save(new URL('finish.json',dir),JSON.stringify(finish,null,2)+'\n');
      console.log('PASS KR-7 M81 registry and factory wood',finish);
    }
    if(run==='--wasp-catch'){
      await page.evaluate("TT.scene.remove(reviewArt.model);views.equip('uzi')");
      const r=await page.evaluate("import('/review/GT-20076/wasp-catch-proof.mjs').then(m=>m.checkWaspCatch(TT,'uzi','ac9903bf'))",150000);
      const original=JSON.parse(await readFile(new URL('./visible-repairs/uzi/clear-wasp-catch-before/catch.json',import.meta.url),'utf8'));
      assert(r.closed.length===1&&r.closed[0]&&!r.gap.penetrating&&r.gap.upperMm<.02);
      assert.deepEqual(r.ribGaps,original.ribGaps);assert(r.finish.visible===r.finish.retained&&r.finish.maxHeight<1e-6);
      const paint=await page.evaluate("import('/review/GT-20076/gw-mag-band-proof.mjs').then(m=>m.checkMagazineFinish(TT,'uzi'))");
      await save(new URL('catch-and-finish.json',dir),JSON.stringify({r,paint},null,2)+'\n');
      console.log('PASS fixed upper catch, three external ridges and factory finish',r.finish,paint);
    }
    if(run==='--pump-stock'){
      await page.evaluate("TT.scene.remove(reviewArt.model);views.equip('shotgun')");
      const r=await page.evaluate("import('/review/GT-20076/pump-stock-proof.mjs').then(m=>m.checkPumpStock(TT,'shotgun','c5a6ac82'))",150000);
      assert(r.closed.length===1&&r.closed[0]&&[r.gap,r.plateGap].every(g=>!g.penetrating&&g.upperMm<.02));
      assert(Object.values(r.surfaces).every(s=>!s.lost&&!s.added&&s.maxIn<1e-6&&s.maxOut<1e-6));
      assert(r.finish.visible===r.finish.retained&&r.finish.maxHeight<1e-6);
      await save(new URL('stock-and-finish.json',dir),JSON.stringify(r,null,2)+'\n');
      console.log('PASS stock to receiver and plate, original exposed surface',r.finish);
    }
    if(run==='--gw-grip'){
      await page.evaluate("TT.scene.remove(reviewArt.model);views.equip('m4')");
      const r=await page.evaluate("import('/review/GT-20076/gw-grip-proof.mjs').then(m=>m.checkGwGrip(TT,'m4','65bd2ab7'))",150000);
      const paint=await page.evaluate("import('/review/GT-20076/gw-mag-band-proof.mjs').then(m=>m.checkMagazineFinish(TT))");
      assert(r.closed.length===1&&r.closed[0]&&!r.gap.penetrating&&r.gap.upperMm<.02);
      assert(Object.values(r.surfaces).every(s=>s.lost===0&&s.added===0&&s.maxIn<1e-6&&s.maxOut<1e-6));
      assert(r.finish.exposed===r.finish.retained&&r.finish.maxHeight<1e-6);
      await save(new URL('grip-and-finish.json',dir),JSON.stringify({r,paint},null,2)+'\n');
      console.log('PASS GW-4 grip join and original exterior',r.finish,paint);
    }
    if(run==='--wasp-base'){
      await page.evaluate("views.pose('rack')");
      const underside={...config,target:[0,-.174,-.047],eye:[.120,-.44,-.120],fov:25};
      await page.evaluate('('+install.toString()+')('+JSON.stringify(underside)+')');
      await page.evaluate('reviewArt.model.userData.mag.visible=false;true');
      await fixedLightingCaptures(page,dir,'mag-out-');
      await page.evaluate("TT.scene.remove(reviewArt.model);views.equip('uzi')");
      const r=await page.evaluate("import('/review/GT-20076/wasp-base-proof.mjs').then(m=>m.checkWaspBase(TT,'uzi','36405d44'))",120000);
      const finish=await page.evaluate("import('/review/GT-20076/gw-mag-band-proof.mjs').then(m=>m.checkMagazineFinish(TT,'uzi'))");
      assert(r.gripUnchanged&&r.sectionGaps.length===1&&!r.sectionGaps[0].penetrating&&r.sectionGaps[0].upperMm<.02);
      await save(new URL('base-and-finish.json',dir),JSON.stringify({r,finish},null,2)+'\n');
      console.log('PASS complete original fixed grip and closed factory trim',r.sectionGaps,finish);
    }
    if(run==='--drum-ribs'){
      for(const side of [-1,1]){
        await page.evaluate("views.pose('rack')");
        const latchConfig={...config,target:[side*.149,-.26,.025],eye:[side*.34,-.20,-.063],fov:25};
        await page.evaluate('('+install.toString()+')('+JSON.stringify(latchConfig)+')');
        await fixedLightingCaptures(page,dir,side<0?'left-latch-':'right-latch-');
      }
      await page.evaluate("TT.scene.remove(reviewArt.model);views.equip('aa12')");
      const proof=await page.evaluate("import('/review/GT-20076/drum-rib-proof.mjs').then(m=>m.checkDrumRibs(TT,'aa12','33424312'))",150000);
      const finish=await page.evaluate("import('/review/GT-20076/gw-mag-band-proof.mjs').then(m=>m.checkMagazineFinish(TT,'aa12'))");
      const {host,source,...rim}=proof;
      await save(new URL('rim-and-finish.json',dir),JSON.stringify({rim,finish},null,2)+'\n');
      assert(rim.ribs.every(p=>p.closed&&!p.gap.penetrating&&p.gap.upperMm<.02&&p.latchGaps.every(g=>!g.penetrating)));
      console.log('PASS all rim contacts, exterior color coordinates and drum finish',rim.exterior,finish);
    }
    if(run==='--pistol-hood'){
      await page.evaluate("TT.scene.remove(reviewArt.model);views.equip('pistol')");
      const reload=await page.evaluate("import('/review/GT-20076/pistol-hood-proof.mjs').then(m=>m.checkHoodReload(TT,"+JSON.stringify(config.hash)+"))",180000);
      await save(new URL('live-reload.json',dir),JSON.stringify(reload,null,2)+'\n');
      await page.evaluate("views.pose('rack')");
      await page.evaluate('('+install.toString()+')('+JSON.stringify(config)+')');
      const travel=Math.max(...reload.maxBack);
      await page.evaluate("(()=>{const u=reviewArt.model.userData;u.slide.position.z=u.baseSlidePos.z-"+travel+";return true})()");
      await fixedLightingCaptures(page,dir,'racked-');
      console.log('PASS live world/eye pistol slide contacts',reload.maxBack,reload.distinctPoses);
    }
    if(run==='--launcher-nose'){
      await page.evaluate("TT.scene.remove(reviewArt.model);views.equip('launcher')");
      const heat=await page.evaluate("import('/review/GT-20076/launcher-nose-proof.mjs').then(m=>m.checkLauncherHeat(TT,"+JSON.stringify(config.hash)+"))");
      const oldWasp=JSON.parse(await readFile(new URL('./catalog-fix-wasp-pad/audit.json',import.meta.url),'utf8')).uzi.artworkFingerprint;
      await page.evaluate("views.equip('uzi')");
      const wasp=await page.evaluate("import('/review/GT-20076/wasp-collar-proof.mjs').then(m=>m.checkCollarHeat(TT,"+JSON.stringify(oldWasp)+"))");
      await save(new URL('live-heat.json',dir),JSON.stringify({launcher:heat,wasp},null,2)+'\n');
      console.log('PASS original launcher and Wasp heat patterns on world and eye');
    }
    if(run==='--gw-mag-bands'){
      const proof=await page.evaluate("import('/review/GT-20076/gw-mag-band-proof.mjs').then(m=>m.checkMagBands(TT,'m4',"+JSON.stringify(config.hash)+"))",180000);
      const contacts=proof.islandGaps.flat();
      assert(contacts.length===24&&contacts.every(g=>!g.penetrating&&g.upperMm<.01));
      const earlier=await page.evaluate("import('/review/GT-20076/mag-trim-proof.mjs').then(m=>m.checkMagTrim(TT,'m4'))");
      assert(earlier.ribs.length===6&&earlier.marks.length===6);
      await page.evaluate("views.equip('m4')");
      const finish=await page.evaluate("import('/review/GT-20076/gw-mag-band-proof.mjs').then(m=>m.checkMagazineFinish(TT))");
      await save(new URL('individual-supports.json',dir),JSON.stringify({contacts,earlier,finish},null,2)+'\n');
      console.log('PASS all 24 band patches seated on the body, existing six ribs and six witness marks seated');
    }
    if(run==='--rear-shield'){
      await page.evaluate("views.equip('revolver')");
      const sweep=await page.evaluate("import('/review/GT-20076/rotating-frame-proof.mjs').then(m=>m.checkReloadSweep(TT,true))",150000);
      assert(sweep.rotations===24&&sweep.records.length===72&&sweep.records.every(f=>f.crossed.length===3&&!f.crossed.some(Boolean)));
      await save(new URL('shield-reload.json',dir),JSON.stringify(sweep,null,2)+'\n');
      console.log('PASS 24 drum orientations and 72 reload phases against frame and rear shield');
    }
    if(run==='--pump-port'){
      const cycle=JSON.parse(await readFile(new URL('./visible-repairs/shotgun/clear-pump-port-after/eye-cycle.json',import.meta.url),'utf8'));
      const closing=cycle.frames.toReversed();
      const middle=closing.reduce((best,f)=>Math.abs(f.back-.035)<Math.abs(best.back-.035)?f:best);
      const open=cycle.frames.reduce((best,f)=>f.back>best.back?f:best);
      assert(open.back>.11&&!open.visible&&middle.visible&&middle.scaleZ<cycle.rest.scaleZ*.7);
      for(const [name,pose] of [['closed',cycle.rest],['returning',middle],['open',open]]){
        await page.evaluate('(()=>{reviewArt.show("after");const u=reviewArt.model.userData;u.pump.position.z=u.basePumpPos.z-'+pose.back+';u.pumpPoseHook();return true})()');
        for(const light of ['noon','overcast','dusk','night']){
          await page.evaluate('views.light('+JSON.stringify(light)+')');
          const shot=await page.send('Page.captureScreenshot',{format:'png'});
          await save(new URL(name+'-'+light+'.png',dir),Buffer.from(shot.data,'base64'));
        }
      }
    }
    await save(new URL('setup.json',dir),JSON.stringify({...config,...setup},null,2)+'\n');
    console.log('PASS native before/after side detail in all four lights',id,setup.hash);
  }
  assert.deepEqual(page.errors,[]);
} finally {await browser.close();await server.close();}

// Freeze the Training beacon and environment state across each pair of draws.
async function fixedLightingCaptures(page,dir,prefix,hideKey=null){
  for(const light of ['noon','overcast','dusk','night']){
    await page.evaluate('views.light('+JSON.stringify(light)+')');
    await page.evaluate('TT.inspectHost().loop(false)');
    if(hideKey)await page.evaluate('TT.weaponMeshes['+JSON.stringify(hideKey)+'].visible=false');
    try{
      for(const phase of ['before','after']){
        await page.evaluate('reviewArt.show('+JSON.stringify(phase)+');TT.inspectHost().render();true');
        const image=await page.send('Page.captureScreenshot',{format:'png'});
        await save(new URL(prefix+phase+'-'+light+'.png',dir),Buffer.from(image.data,'base64'));
      }
    }finally{
      if(hideKey)await page.evaluate('TT.weaponMeshes['+JSON.stringify(hideKey)+'].visible=true');
      await page.evaluate('TT.inspectHost().loop(true)');
    }
  }
}

// Both revisions occupy the same world transform, under the same camera and light.
async function install({id,eye,target,fov,moduleName,proofName,hash}){
  if(window.reviewArt)TT.scene.remove(reviewArt.model);
  const proofs=await import('/review/GT-20076/'+moduleName+'.mjs');
  window.reviewArt=proofs[proofName](TT,id,hash,true);
  const model=reviewArt.model,G=TT.THREE;
  model.position.copy(TT.player.position).add(new G.Vector3(0,2,2));
  TT.scene.add(model);model.updateWorldMatrix(true,true);
  const p=model.localToWorld(new G.Vector3(...eye)),t=model.localToWorld(new G.Vector3(...target));
  TT.setShotView({x:p.x,y:p.y,z:p.z,tx:t.x,ty:t.y,tz:t.z,fov});
  return {hash:reviewArt.hash,eyeWorld:p.toArray(),targetWorld:t.toArray()};
}
