import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
import {save} from './save.mjs';
import {originalFlamerMount,originalHandleWrist,originalScopePlates} from './replay-artwork.mjs';
const phase=process.argv[2];assert(process.env.DW_GAME_TEST_TOKEN && ['before','after'].includes(phase));
const batch=process.argv[3]||'--trim';
const batches={
  '--trim':['clear-trim-',false,[['launcher',['hip','rack']],['chainsaw',['hip']],['minigun',['hip','rack']]]],
  '--surface-seams':['clear-surface-seam-',false,[['shotgun',['rack']],['sniper',['rack']],['flamer',['aimed']]]],
  '--rear-collars':['clear-collar-',true,[['m4',['held-right-open','hip']],['chainsaw',['aimed']]]],
  '--longarm-joins':['clear-join-edges-',true,[['ak',['hip']],['sniper',['hip','rack','held-right']]]],
  '--side-covers':['clear-side-covers-',true,[['chainsaw',['hip','held-right']],['launcher',['hip','rack']]]],
  '--wood-boundary':['clear-wood-boundary-',false,[['revolver',['hip','walnut']],['m4',['hip','rack']]]],
  '--gauge-covers':['clear-gauge-covers-',false,[['minigun',['hip','aimed']],['flamer',['hip']]]],
  '--outline-joins':['clear-outline-joins-',true,[['minigun',['hip','aimed','held-left-open']],['chainsaw',['hip','held-right']]]],
  '--front-art':['clear-front-art-',true,[['launcher',['hip','held-right']],['chainsaw',['hip','held-right','held-left']]]],
  '--handle-wrist':['clear-handle-wrist-',true,[['aa12',['hip','held-left-open']],['sniper',['hip','rack']]]],
  '--neutral-wrist':['clear-wrist-match-',false,[['aa12',['rack']],['sniper',['hip']]]],
  '--side-discs':['clear-side-disc-',true,[['minigun',['hip','held-right-open']],['revolver',['hip','held-left']]]],
  '--mag-trim':['clear-mag-trim-',true,[['m4',['hip','held-right-open','held-right']],['sniper',['hip','aim-entry','rack']]]],
  '--rings-grip':['clear-rings-grip-',true,[['launcher',['hip','held-left']],['flamer',['hip','held-left-open','rack']]]],
  '--case-stamp':['clear-case-stamp-',true,[['ak',['hip','held-left-open']],['flamer',['hip','rack','pack-off']]]],
  '--rotating-frame':['clear-rotating-frame-refit-',true,[['revolver',['hip','held-right']],['shotgun',['hip','held-right-open']]]],
  '--stock-mount':['clear-stock-mount-',true,[['launcher',['hip','held-left']],['flamer',['hip','rack']]]],
  '--stock-tail':['clear-stock-mount-tail-',true,[['flamer',['hip','rack']]]],
  '--tail-views':['clear-tail-views-',true,[['flamer',['hip','aimed','held-right-open']]]],
  '--port-sight':['clear-port-sight-',true,[['uzi',['hip','held-right-open']],['m4',['hip','aimed','held-right-open']]]],
  '--scope-eye':['clear-scope-eye-',true,[['sniper',['hip','aim-entry']]]],
  '--pump-port':['clear-pump-port-',true,[['shotgun',['hip','aimed','held-right-open']]]],
  '--sniper-rail-seat':['clear-sniper-rail-seat-',true,[['sniper',['hip','aim-entry','held-right-open','rack']]]],
  '--pump-grip-web':['clear-pump-grip-web-',true,[['shotgun',['hip','aimed','held-left-open','rack']]]],
  '--breacher-vents':['clear-breacher-vents-',true,[['aa12',['hip','aimed','held-right-open','rack']]]],
  '--minigun-panel':['clear-minigun-panel-',true,[['minigun',['hip','aimed','held-right-open','rack']]]],
  '--kr-band':['clear-kr-band-',true,[['ak',['hip','aimed','held-right-open','rack']]]],
  '--wasp-catch':['clear-wasp-catch-',true,[['uzi',['hip','aimed','held-right-open','rack']]]],
  '--pump-stock':['clear-pump-stock-',true,[['shotgun',['hip','aimed','held-left-open','rack']]]],
  '--gw-grip':['clear-gw-grip-',true,[['m4',['hip','aimed','held-left-open','rack']]]],
  '--wasp-base':['clear-wasp-base-',true,[['uzi',['held-right','hip','aimed','rack']]]],
  '--saw-boot':['clear-saw-boot-',true,[['chainsaw',['aimed','hip','held-right-open','held-left-open']]]],
  '--drum-ribs':['clear-drum-ribs-',true,[['aa12',['hip','aimed','held-right-open','rack']]]],
  '--pistol-hood':['clear-pistol-hood-',true,[['pistol',['hip','aimed','held-left-open','held-right-open']]]],
  '--launcher-nose':['clear-launcher-nose-',true,[['launcher',['hip','aimed','held-right-open','rack']]]],
  '--gw-mag-bands':['clear-gw-mag-bands-',true,[['m4',['hip','aimed','held-right','rack']]]],
  '--wasp-collar':['clear-wasp-collar-',true,[['uzi',['hip','aimed','held-left-open','rack']]]],
  '--wasp-pad':['clear-wasp-pad-',true,[['uzi',['hip','aimed','held-right-open','rack']]]],
  '--rear-shield':['clear-rear-shield-',true,[['revolver',['hip','aimed','held-left-open','held-right-open']]]],
  '--rv-bridge':['clear-rv-bridge-',true,[['revolver',['aimed','hip','held-left-open']]]],
  '--kr-port':['clear-kr-port-',true,[['ak',['hip','aimed','held-right-open']]]],
  '--grip-seam':['clear-grip-seam-',true,[['pistol',['hip','aimed','held-left-open','held-right-open']]]],
  '--gw-collar':['clear-gw-collar-',true,[['m4',['aimed','hip','held-left-open']]]],
  '--nose-arch':['clear-nose-arch-',true,[['chainsaw',['hip','held-right-open','held-left-open']],['minigun',['aimed','hip','held-left-open']]]],
  '--tang-cheek':['clear-tang-cheek-',true,[['pistol',['hip','aimed','held-right-open']],['sniper',['hip','rack','held-left-open']]]],
  '--plate-ribs':['clear-plate-ribs-',true,[['shotgun',['hip','held-right-open']],['sniper',['hip','held-left-open','rack']]]],
  '--lug-vents':['clear-lug-vents-',true,[['revolver',['hip','held-right-open']],['chainsaw',['hip','held-right-open','held-left-open']]]],
  '--handle-optic':['clear-handle-optic-',true,[['chainsaw',['aimed','hip','held-right-open']],['sniper',['rack','aimed','held-right-open']]]],
  '--drum-optic':['clear-drum-optic-',true,[['aa12',['hip','held-right']],['m4',['hip','aimed','held-right-open']]]]
};
assert(Object.hasOwn(batches,batch));
const [label,tracked,selections]=batches[batch];
const only=process.argv[4];
assert(!only||selections.some(([id])=>id===only),'Unknown model in this photo batch');
const sweepOnly=process.argv.includes('--sweep-only');
if(sweepOnly)assert(['--rotating-frame','--rear-shield'].includes(batch)&&phase==='after'&&only==='revolver');
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{
  const page=await browser.newPage({width:960,height:540});
  const originals={'--scope-eye':originalScopePlates,'--neutral-wrist':originalHandleWrist,'--tail-views':originalFlamerMount};
  const verifyOriginal=phase==='before'&&originals[batch]?await originals[batch](page,server.origin):null;
  await page.goto(server.origin+'/index.html?debug=1&raf=timer');
  let ready=false;
  for(let i=0;i<24&&!ready&&!page.errors.length;i++){
    ready=await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"',{timeout:10000});
  }
  if(!ready)assert.fail('Game load failed '+JSON.stringify({errors:page.errors,state:await page.evaluate('window.DWLoad?.snapshot()')}));
  await page.evaluate('DWOpening.dismissForTesting()');
  const menu=await page.waitFor('!DWOpening.active || DWLoad.snapshot().state==="failed"',{timeout:30000});
  if(!menu||page.errors.length||await page.evaluate('DWOpening.active')){
    assert.fail('Opening did not reach the menu '+JSON.stringify({errors:page.errors,state:await page.evaluate('DWLoad.snapshot().state')}));
  }
  await page.evaluate("document.getElementById('playerName').value='Trim comparison';document.getElementById('modeTraining').click()");
  let entered=false;
  for(let i=0;i<24&&!entered&&!page.errors.length;i++){
    entered=await page.waitFor("TT.trainingDbg.state().active && !TT.trainingDbg.state().warming && !document.getElementById('trainingBlackout')?.classList.contains('on')",{timeout:10000});
  }
  if(!entered)assert.fail('Training entry failed '+JSON.stringify({errors:page.errors,state:await page.evaluate('({active:TT.trainingDbg.state().active,warming:TT.trainingDbg.state().warming})')}));
  const poseMode=tracked?(phase==='before'?'record':'replay'):false;
  await page.evaluate("import('/review/GT-20076/visibility-camera.mjs').then(m=>{window.views=m.makeViews(TT,"+JSON.stringify(poseMode)+","+tracked+");return true})");
  for(const [id,angles] of selections){
    if(sweepOnly||(only&&only!==id))continue;
    const dir=new URL('./visible-repairs/'+id+'/'+label+phase+'/',import.meta.url);await mkdir(dir,{recursive:true});
    if(tracked && phase==='after'){
      const original=batch==='--rotating-frame'?'clear-rotating-frame-before':
        batch==='--stock-tail'?'clear-case-stamp-before':
        batch==='--stock-mount'?(id==='launcher'?'clear-rings-grip-before':'clear-case-stamp-before'):label+'before';
      const source='/review/GT-20076/visible-repairs/'+id+'/'+original+'/cameras.json';
      await page.evaluate('fetch('+JSON.stringify(source)+').then(r=>r.json()).then(c=>{window.recordedArtViews=c;return true})');
    }
    await page.evaluate('views.equip('+JSON.stringify(id)+')');
    if(batch==='--pump-port'){
      const prior=JSON.parse(await readFile(new URL('./catalog-fix-revolver-joint-final/audit.json',import.meta.url),'utf8'));
      const result=await page.evaluate("import('/review/GT-20076/pump-port-proof.mjs').then(m=>m.checkPumpPort(TT,'shotgun',"+JSON.stringify(prior.shotgun.artworkFingerprint)+"))");
      await save(new URL('pump-port.json',dir),JSON.stringify(result,null,2)+'\n');
      if(phase==='after'){
        assert(result.closed.length===1&&result.closed[0]);
        assert(result.capVertices>0&&result.exposed===28);
        assert(result.sweep.every(p=>!p.visible||(!p.gap.penetrating&&p.gap.upperMm<.01)));
      }
      console.log('Pump port',phase,result.hash,result.closed,result.exposed,result.sweep.map(p=>[p.back,p.gap]));
    }
    if(batch==='--pump-grip-web'){
      const r=await page.evaluate("import('/review/GT-20076/pump-grip-web-proof.mjs').then(m=>m.checkPumpGripWeb(TT,'shotgun','9e19842b',false,"+(phase==='before')+"))",180000);
      if(r.reference){await save(new URL('reference.json',dir),JSON.stringify(r.reference)+'\n');delete r.reference;}
      await save(new URL('grip.json',dir),JSON.stringify(r,null,2)+'\n');
      if(phase==='after'){
        assert.deepEqual(r.closed,[true]);assert(!r.gaps[0].penetrating&&r.gaps[0].upperMm<.02);
        assert(Object.values(r.profiles).every(p=>p.occupied>0&&!p.lost&&!p.added&&p.maxDepth<.00001));
      }
      console.log(phase,r);
    }
    if(batch==='--breacher-vents'){
      const r=await page.evaluate("import('/review/GT-20076/breacher-vents-proof.mjs').then(m=>m.checkBreacherVents(TT,'aa12','f62123e5'))",180000);
      await save(new URL('vents.json',dir),JSON.stringify(r,null,2)+'\n');
      if(phase==='after'){
        assert(r.seats.every(v=>v.closed.length===1&&v.closed[0]&&!v.gap.penetrating&&v.gap.upperMm<.02));
        assert(r.profiles.every(p=>p.occupied>8000&&!p.lost&&!p.added&&p.maxDepth<.000001));
      }
      console.log(phase,r);
    }
    if(batch==='--minigun-panel'){
      const r=await page.evaluate("import('/review/GT-20076/minigun-side-panel-proof.mjs').then(m=>m.checkMinigunPanel(TT,'minigun','e70f29b6',false,"+(phase==='before')+"))",180000);
      if(r.reference){await save(new URL('reference.json',dir),JSON.stringify(r.reference)+'\n');delete r.reference;}
      await save(new URL('panel.json',dir),JSON.stringify(r,null,2)+'\n');
      if(phase==='after'){
        assert.deepEqual(r.closed,[true]);
        assert(!r.gap.penetrating&&r.gap.upperMm<.5);
        for(const p of Object.values(r.profiles))assert(!p.added&&!p.lost&&p.maxDepth<.00001);
      }
      console.log(phase,r);
    }
    if(batch==='--kr-band'){
      const r=await page.evaluate("import('/review/GT-20076/kr-handguard-band-proof.mjs').then(m=>m.checkKrBand(TT,'ak','9edebc68',false,"+(phase==='before')+"))",200000);
      if(r.reference){await save(new URL('reference.json',dir),JSON.stringify(r.reference)+'\n');delete r.reference;}
      await save(new URL('band.json',dir),JSON.stringify(r,null,2)+'\n');
      if(phase==='after'){
        const before=JSON.parse(await readFile(new URL('../clear-kr-band-before/band.json',dir),'utf8'));
        assert.deepEqual(r.closed,[true]);assert(before.gaps[0].penetrating&&before.gaps[4].penetrating);
        assert(!r.gaps[0].penetrating&&r.gaps[0].upperMm<.02&&!r.gaps[4].penetrating);
        assert.deepEqual(r.wood,before.wood);assert.deepEqual(r.muzzle,before.muzzle);
        for(const [axis,profile] of Object.entries(r.profiles)){
          assert.equal(profile.occupied,before.profiles[axis].occupied,axis);
          assert.equal(profile.lost+profile.added,0,axis);
          assert(Math.max(profile.maxIn,profile.maxOut)<.000005,axis);
        }
      }
      console.log(phase,r);
    }
    if(batch==='--wasp-catch'){
      const r=await page.evaluate("import('/review/GT-20076/wasp-catch-proof.mjs').then(m=>m.checkWaspCatch(TT,'uzi','ac9903bf',false,"+(phase==='before')+"))",150000);
      if(r.reference){await save(new URL('reference.json',dir),JSON.stringify(r.reference)+'\n');delete r.reference;}
      await save(new URL('catch.json',dir),JSON.stringify(r,null,2)+'\n');
      if(phase==='after')assert(r.closed.length===1&&r.closed[0]&&!r.gap.penetrating&&r.gap.upperMm<.5);
      console.log(phase,r);
    }
    if(batch==='--pump-stock'){
      const r=await page.evaluate("import('/review/GT-20076/pump-stock-proof.mjs').then(m=>m.checkPumpStock(TT,'shotgun','c5a6ac82',false,"+(phase==='before')+"))",150000);
      if(r.reference){await save(new URL('reference.json',dir),JSON.stringify(r.reference)+'\n');delete r.reference;}
      await save(new URL('stock.json',dir),JSON.stringify(r,null,2)+'\n');
      if(phase==='after')assert(r.closed.length===1&&r.closed[0]&&!r.gap.penetrating&&r.gap.upperMm<.5);
      console.log(phase,r);
    }
    if(batch==='--gw-grip'){
      const r=await page.evaluate("import('/review/GT-20076/gw-grip-proof.mjs').then(m=>m.checkGwGrip(TT,'m4','65bd2ab7',false,"+(phase==='before')+"))",150000);
      if(r.reference){await save(new URL('reference.json',dir),JSON.stringify(r.reference)+'\n');delete r.reference;}
      await save(new URL('grip.json',dir),JSON.stringify(r,null,2)+'\n');
      if(phase==='after')assert(r.closed.length===1&&r.closed[0]&&!r.gap.penetrating&&r.gap.upperMm<.5);
      console.log(phase,r);
    }
    if(batch==='--wasp-base'){
      const r=await page.evaluate("import('/review/GT-20076/wasp-base-proof.mjs').then(m=>m.checkWaspBase(TT,'uzi','36405d44',false,"+(phase==='before')+"))",150000);
      if(r.reference){await save(new URL('reference.json',dir),JSON.stringify(r.reference)+'\n');delete r.reference;}
      await save(new URL('base.json',dir),JSON.stringify(r,null,2)+'\n');
      if(phase==='after'){
        assert(r.gripUnchanged&&r.closed.length===1&&r.closed[0]&&r.bandClosed.length===1&&r.bandClosed[0]);
        assert(!r.gap.penetrating&&r.gap.upperMm<.02);
        assert(Object.values(r.surfaces).every(s=>!s.lost&&!s.added&&s.maxIn<1e-6&&s.maxOut<1e-6));
      }
      console.log(phase,r);
    }
    if(batch==='--saw-boot'){
      const r=await page.evaluate("import('/review/GT-20076/saw-boot-proof.mjs').then(m=>m.checkSawBoot(TT,'chainsaw','c8a2abc2',false,"+(phase==='before')+"))",120000);
      if(r.reference){await save(new URL('reference.json',dir),JSON.stringify(r.reference)+'\n');delete r.reference;}
      await save(new URL('boot.json',dir),JSON.stringify(r,null,2)+'\n');
      if(phase==='after')assert(r.closed.length===1&&r.closed[0]&&r.contacts.every(g=>!g.penetrating)&&r.contacts[0].upperMm<.02);
      console.log(phase,r);
    }
    if(batch==='--drum-ribs'){
      const r=await page.evaluate("import('/review/GT-20076/drum-rib-proof.mjs').then(m=>m.checkDrumRibs(TT,'aa12','33424312'))",150000);
      await save(new URL('ribs.json',dir),JSON.stringify(r,null,2)+'\n');
      if(phase==='after')assert(r.ribs.every(p=>p.closed&&!p.gap.penetrating&&p.gap.upperMm<.02));
      console.log(phase,r.ribs.length,'drum decorations;',r.ribs.filter(p=>p.gap.penetrating).length,'crossings');
    }
    if(batch==='--pistol-hood'){
      const prior=JSON.parse(await readFile(new URL('./catalog-fix-launcher-nose/audit.json',import.meta.url),'utf8'));
      const result=await page.evaluate("import('/review/GT-20076/pistol-hood-proof.mjs').then(m=>m.checkPistolHood(TT,'pistol',"+JSON.stringify(prior.pistol.artworkFingerprint)+",false,"+(phase==='before')+"))",200000);
      if(result.reference){
        await save(new URL('reference-surfaces.json',dir),JSON.stringify(result.reference)+'\n');delete result.reference;
      }
      await save(new URL('hood.json',dir),JSON.stringify(result,null,2)+'\n');
      if(phase==='after'){
        assert(result.cells.length===1&&result.cells[0]);
        assert(result.sweep.every(s=>!s.roof.penetrating&&s.roof.upperMm<.01&&!s.barrel.penetrating&&s.grooves.every(g=>!g.penetrating)));
        assert(!result.profile.lost&&!result.profile.added&&result.profile.maxOut<1e-7);
      }
      console.log('Pistol top panel',phase,result.hash,result.cells,result.exposed,result.profile);
    }
    if(batch==='--launcher-nose'){
      const prior=JSON.parse(await readFile(new URL('./catalog-fix-gw-mag-bands/audit.json',import.meta.url),'utf8'));
      const result=await page.evaluate("import('/review/GT-20076/launcher-nose-proof.mjs').then(m=>m.checkLauncherNose(TT,'launcher',"+JSON.stringify(prior.launcher.artworkFingerprint)+"))");
      await save(new URL('nose.json',dir),JSON.stringify(result,null,2)+'\n');
      if(phase==='after'){
        assert(result.closed[0].length===2&&result.closed[1].length===1&&result.closed.flat().every(Boolean));
        assert(!result.gap.penetrating&&result.gap.upperMm<.01);
        assert(!result.profile.lost&&!result.profile.added&&Math.max(result.profile.maxIn,result.profile.maxOut)<1e-7);
      }
      console.log('Launcher nose',phase,result.hash,result.closed,result.gap,result.profile);
    }
    if(batch==='--gw-mag-bands'){
      const prior=JSON.parse(await readFile(new URL('./catalog-fix-wasp-collar-final/audit.json',import.meta.url),'utf8'));
      const result=await page.evaluate("import('/review/GT-20076/gw-mag-band-proof.mjs').then(m=>m.checkMagBands(TT,'m4',"+JSON.stringify(prior.m4.artworkFingerprint)+",false,"+(phase==='before')+"))",180000);
      if(result.reference){
        await save(new URL('reference-surfaces.json',dir),JSON.stringify(result.reference)+'\n');
        delete result.reference;
      }
      await save(new URL('bands.json',dir),JSON.stringify(result,null,2)+'\n');
      if(phase==='after'){
        assert(result.closed.every(p=>p.length===8&&p.every(Boolean)));
        assert(result.islandGaps.flat().every(g=>!g.penetrating&&g.upperMm<.01));
        assert(result.gaps.flat().every(g=>!g.penetrating&&g.upperMm<.01)&&result.marks.flat().every(g=>!g.penetrating&&g.upperMm<.01));
        assert(Object.values(result.profile).every(p=>p.lost===0&&p.added===0&&p.maxOut<1e-7&&p.maxIn<.0002));
      }
      console.log('GW-4 bands',phase,result.hash,result.closed,result.profile);
    }
    if(batch==='--wasp-collar'){
      const prior=JSON.parse(await readFile(new URL('./catalog-fix-wasp-pad/audit.json',import.meta.url),'utf8'));
      const result=await page.evaluate("import('/review/GT-20076/wasp-collar-proof.mjs').then(m=>m.checkWaspCollar(TT,'uzi',"+JSON.stringify(prior.uzi.artworkFingerprint)+",false,"+(phase==='before')+"))");
      if(result.reference){
        await save(new URL('reference-surfaces.json',dir),JSON.stringify(result.reference)+'\n');
        delete result.reference;
      }
      await save(new URL('collar.json',dir),JSON.stringify(result,null,2)+'\n');
      if(phase==='after'){
        assert(result.closed.every(c=>c.length===1&&c[0])&&result.gaps.every(g=>!g.penetrating&&g.upperMm<.01));
        assert(result.profile.lost===0&&result.profile.added===0&&Math.max(result.profile.maxIn,result.profile.maxOut)<1e-7);
      }
      console.log('Wasp collar',phase,result.hash,result.closed,result.gaps,result.profile);
    }
    if(batch==='--wasp-pad'){
      const prior=JSON.parse(await readFile(new URL('./catalog-fix-rear-shield/audit.json',import.meta.url),'utf8'));
      const result=await page.evaluate("import('/review/GT-20076/wasp-pad-proof.mjs').then(m=>m.checkWaspPad(TT,'uzi',"+JSON.stringify(prior.uzi.artworkFingerprint)+"))");
      await save(new URL('pad.json',dir),JSON.stringify(result,null,2)+'\n');
      if(phase==='after'){
        assert(result.closed.length===1&&result.closed[0]&&!result.gap.penetrating&&result.gap.upperMm<.01);
        assert(result.profile.lost===0&&result.profile.added===0&&result.profile.recession<1e-7&&result.profile.expansion<1e-7);
      }
      console.log('Wasp pad',phase,result.hash,result.gap,result.exposed,result.profile);
    }
    if(batch==='--rear-shield'){
      const prior=JSON.parse(await readFile(new URL('./catalog-fix-pump-port-final/audit.json',import.meta.url),'utf8'));
      const result=await page.evaluate("import('/review/GT-20076/rear-shield-proof.mjs').then(m=>m.checkRearShield(TT,'revolver',"+JSON.stringify(prior.revolver.artworkFingerprint)+",false,"+(phase==='before')+"))",200000);
      if(result.reference){
        await save(new URL('reference-surfaces.json',dir),JSON.stringify(result.reference)+'\n');
        delete result.reference;
      }
      await save(new URL('shield.json',dir),JSON.stringify(result,null,2)+'\n');
      if(phase==='after'){
        assert(result.cells.length===1&&result.cells[0]&&result.gaps.every(g=>!g.penetrating&&g.upperMm<.01));
        assert(result.profile.lost===0&&result.profile.added===0&&result.profile.expansion<1e-7);
      }
      console.log('Rear shield',phase,result.hash,result.cells,result.gaps,result.profile);
    }
    if(batch==='--rv-bridge'){
      const prior=JSON.parse(await readFile(new URL('./catalog-fix-kr-port-flat/audit.json',import.meta.url),'utf8'));
      const result=await page.evaluate("import('/review/GT-20076/revolver-bridge-proof.mjs').then(m=>m.checkRevolverBridge(TT,'revolver',"+JSON.stringify(prior.revolver.artworkFingerprint)+"))");
      await save(new URL('bridge.json',dir),JSON.stringify(result,null,2)+'\n');
      if(phase==='after'){
        assert(result.closed.length===1&&result.closed[0]&&result.shieldClosed.length===1&&result.shieldClosed[0]);
        for(const seat of [result.gap,result.shieldGap])assert(!seat.penetrating&&seat.upperMm<.01);
        assert(result.profile.lost===0&&result.profile.added===0&&result.profile.maxOut<1e-7);
      }
      console.log('Revolver bridge',phase,result.hash,result.gap,result.exposed);
    }
    if(batch==='--kr-port'){
      const before=JSON.parse(await readFile(new URL('./catalog-fix-pistol-grip-local/audit.json',import.meta.url),'utf8'));
      const result=await page.evaluate("import('/review/GT-20076/kr-port-proof.mjs').then(m=>m.checkKrPort(TT,'ak',"+JSON.stringify(before.ak.artworkFingerprint)+"))");
      await save(new URL('port.json',dir),JSON.stringify(result,null,2)+'\n');
      if(phase==='after'){
        assert(result.closed.every(parts=>parts.length===1&&parts[0]));
        assert(!result.gap.penetrating&&result.gap.upperMm<.01);
        assert(result.sweep.every(frame=>frame.parts.every(g=>!g.penetrating&&g.upperMm<.01)));
        assert(result.retainedPanelEdges>0);
      }
      console.log('KR-7 port',phase,result.hash,result.gap,result.exposed,result.retainedPanelEdges);
    }
    if(batch==='--grip-seam'){
      const before=JSON.parse(await readFile(new URL('./catalog-fix-gw-collar-indicators/audit.json',import.meta.url),'utf8'));
      const result=await page.evaluate("import('/review/GT-20076/grip-seam-proof.mjs').then(m=>m.checkGripSeam(TT,'pistol',"+JSON.stringify(before.pistol.artworkFingerprint)+"))");
      await save(new URL('seam.json',dir),JSON.stringify(result)+'\n');
      assert(result.cells.every(parts=>parts.every(p=>p.closed)));
      if(phase==='after')assert(!result.gap.penetrating&&result.gap.upperMm<.01);
      console.log('Pistol seam',phase,result.hash,result.gap,result.cells);
    }
    if(batch==='--gw-collar'){
      const before=JSON.parse(await readFile(new URL('./catalog-fix-nose-arch/audit.json',import.meta.url),'utf8'));
      const result=await page.evaluate("import('/review/GT-20076/gw-collar-proof.mjs').then(m=>m.checkGwCollar(TT,'m4',"+JSON.stringify(before.m4.artworkFingerprint)+"))");
      await save(new URL('contacts.json',dir),JSON.stringify(result,null,2)+'\n');
      assert(result.closed);
      assert.equal(result.cellCount,phase==='before'?1:2);
      if(phase==='after'){
        assert(!result.gap.penetrating&&result.gap.upperMm<.01);
        assert(result.rows.every(r=>r.points.every(p=>Math.abs(p.hits[0][2]-r.position[0])<1e-7)));
      }
      console.log('GW-4 '+phase+' artwork',result.hash,result.cellCount,result.gap,result.rows);
    }
    if(batch==='--nose-arch' && phase==='after'){
      const previous=JSON.parse(await readFile(new URL('./catalog-fix-tang-cheek-final-caps/audit.json',import.meta.url),'utf8'));
      const result=await page.evaluate("import('/review/GT-20076/nose-arch-proof.mjs').then(m=>m.checkNoseArch(TT,"+JSON.stringify(id)+","+JSON.stringify(previous[id].artworkFingerprint)+"))",120000);
      await save(new URL('nose-arch-proof.json',dir),JSON.stringify(result,null,2)+'\n');
      console.log('PASS complete prior artwork, exposed circular surfaces and supports',id,result);
    }
    if(batch==='--tang-cheek' && id==='pistol' && process.argv.includes('--inspect-curve')){
      const meshes=await page.evaluate("import('/review/GT-20076/tang-cheek-proof.mjs').then(m=>m.inspectFrameMeshes(TT))");
      await save(new URL('frame-curve.json',dir),JSON.stringify(meshes)+'\n');
    }
    if(batch==='--tang-cheek' && id==='pistol' && process.argv.includes('--inspect-partition')){
      const report=await page.evaluate("import('/review/GT-20076/tang-cheek-proof.mjs').then(m=>m.inspectFramePartition(TT))");
      await save(new URL('frame-partition.json',dir),JSON.stringify(report)+'\n');
      console.log('Native frame samples and candidate join planes',report.count,report.shortlist.map(rows=>rows[0]));continue;
    }
    if(batch==='--tang-cheek' && phase==='after'){
      const previous=JSON.parse(await readFile(new URL('./catalog-fix-plate-ribs/audit.json',import.meta.url),'utf8'));
      const result=await page.evaluate("import('/review/GT-20076/tang-cheek-proof.mjs').then(m=>m.checkTangCheek(TT,"+JSON.stringify(id)+","+JSON.stringify(previous[id].artworkFingerprint)+"))",120000);
      await save(new URL('tang-cheek-proof.json',dir),JSON.stringify(result,null,2)+'\n');
      console.log('PASS restored baseline and fitted join',id,result);
    }
    if(batch==='--plate-ribs' && phase==='after'){
      const previous=JSON.parse(await readFile(new URL('./catalog-fix-breacher-front-guard-blend/audit.json',import.meta.url),'utf8'));
      const result=await page.evaluate("import('/review/GT-20076/plate-rib-proof.mjs').then(m=>m.checkPlateRibs(TT,"+JSON.stringify(id)+","+JSON.stringify(previous[id].artworkFingerprint)+"))",120000);
      await save(new URL('plate-rib-proof.json',dir),JSON.stringify(result,null,2)+'\n');
      console.log('PASS restored complete prior artwork and native joins',id,result);
    }
    if(batch==='--lug-vents' && phase==='after'){
      const previous=JSON.parse(await readFile(new URL('./catalog-fix-revolver-dot-seated/audit.json',import.meta.url),'utf8'));
      const result=await page.evaluate("import('/review/GT-20076/lug-vent-proof.mjs').then(m=>m.checkLugVents(TT,"+JSON.stringify(id)+","+JSON.stringify(previous[id].artworkFingerprint)+"))",120000);
      await save(new URL('lug-vent-proof.json',dir),JSON.stringify(result,null,2)+'\n');
      console.log('PASS complete baseline, visible skins and closed seats',id,result);
    }
    if(batch==='--handle-optic' && phase==='after'){
      const previous=JSON.parse(await readFile(new URL('./catalog-fix-drum-optic-final/audit.json',import.meta.url),'utf8'));
      const result=await page.evaluate("import('/review/GT-20076/handle-optic-proof.mjs').then(m=>m.checkHandleOptic(TT,"+JSON.stringify(id)+","+JSON.stringify(previous[id].artworkFingerprint)+"))",120000);
      await save(new URL('handle-optic-proof.json',dir),JSON.stringify(result,null,2)+'\n');
      console.log('PASS original model, exterior samples and joins',id,result);
    }
    if(batch==='--drum-optic' && phase==='after'){
      const previous=JSON.parse(await readFile(new URL('./catalog-fix-gw4-trigger-fit/audit.json',import.meta.url),'utf8'));
      const result=await page.evaluate("import('/review/GT-20076/drum-optic-proof.mjs').then(m=>m.checkDrumOptic(TT,"+JSON.stringify(id)+","+JSON.stringify(previous[id].artworkFingerprint)+"))",120000);
      await save(new URL('drum-optic-proof.json',dir),JSON.stringify(result,null,2)+'\n');
      console.log('PASS complete prior artwork, exposed faces and support',id,result);
    }
    if(batch==='--port-sight' && phase==='after'){
      const previous=JSON.parse(await readFile(new URL('./catalog-fix-stock-mount-tail/audit.json',import.meta.url),'utf8'));
      const result=await page.evaluate("import('/review/GT-20076/port-sight-proof.mjs').then(m=>m.portSightProof(TT,"+JSON.stringify(id)+","+JSON.stringify(previous[id].artworkFingerprint)+"))",120000);
      await save(new URL('port-sight-proof.json',dir),JSON.stringify(result,null,2)+'\n');
      console.log('PASS complete prior model, exposed sides and seated artwork',id,result.hash);
    }
    if(batch==='--tail-views' && phase==='after'){
      const final=JSON.parse(await readFile(new URL('./catalog-fix-stock-mount-tail/audit.json',import.meta.url),'utf8'));
      const hash=await page.evaluate("Promise.all([import('/review/GT-20076/rank-visibility.mjs'),import('/tools/tests/weapon-seating.js')]).then(([m,s])=>s.artworkFingerprint(m.currentModel(TT,'flamer')))");
      assert.equal(hash,final.flamer.artworkFingerprint);
    }
    if(['--stock-mount','--stock-tail','--tail-views'].includes(batch) && phase==='after'){
      const previous=JSON.parse(await readFile(new URL('./catalog-fix-rotating-frame-swept/audit.json',import.meta.url),'utf8'));
      const result=await page.evaluate("import('/review/GT-20076/stock-mount-proof.mjs').then(m=>m.stockMountProof(TT,"+JSON.stringify(id)+","+JSON.stringify(previous[id].artworkFingerprint)+"))",120000);
      await save(new URL('stock-mount-proof.json',dir),JSON.stringify(result,null,2)+'\n');
      console.log('PASS original artwork, visible outlines and seated surfaces',id,result.hash);
    }
    if(batch==='--rotating-frame' && phase==='after'){
      const previous=JSON.parse(await readFile(new URL('./catalog-fix-revolver-guard-front/audit.json',import.meta.url),'utf8'));
      const result=await page.evaluate("import('/review/GT-20076/rotating-frame-proof.mjs').then(m=>m.checkRotatingFrame(TT,"+JSON.stringify(id)+","+JSON.stringify(previous[id].artworkFingerprint)+"))",120000);
      await save(new URL('frame-proof.json',dir),JSON.stringify(result,null,2)+'\n');
      console.log('PASS native surfaces and baseline model',id,result);
    }
    if(batch==='--case-stamp' && phase==='after'){
      const previous=JSON.parse(await readFile(new URL('./catalog-fix-rings-grip/audit.json',import.meta.url),'utf8'));
      const result=await page.evaluate("import('/review/GT-20076/case-stamp-proof.mjs').then(m=>m.checkCaseStamp(TT,"+JSON.stringify(id)+","+JSON.stringify(previous[id].artworkFingerprint)+"))",120000);
      await save(new URL('case-stamp-proof.json',dir),JSON.stringify(result,null,2)+'\n');
      console.log('PASS case or stamp geometry',id,result);
    }
    if(batch==='--rings-grip' && phase==='after'){
      const result=await page.evaluate("import('/review/GT-20076/rings-grip-proof.mjs').then(m=>m.checkRingsGrip(TT,"+JSON.stringify(id)+"))",120000);
      if(id==='launcher'){
        const rear=await page.evaluate("import('/review/GT-20076/launcher-rear-proof.mjs').then(m=>m.checkRearGraphics(TT))");
        assert(!rear.coverSupport.penetrating&&rear.coverSupport.upperMm<=.5);
        for(const stud of rear.studs)assert(!stud.support.penetrating&&stud.support.upperMm<=.5&&!stud.round.penetrating);
        result.coverSupport=rear.coverSupport;
      }
      await save(new URL('rings-grip-proof.json',dir),JSON.stringify(result,null,2)+'\n');
      console.log('PASS outer samples and native seats',id,result);
    }
    if(batch==='--mag-trim' && phase==='after'){
      const result=await page.evaluate("import('/review/GT-20076/mag-trim-proof.mjs').then(m=>m.checkMagTrim(TT,"+JSON.stringify(id)+"))",120000);
      await save(new URL('mag-trim-proof.json',dir),JSON.stringify(result,null,2)+'\n');
      console.log('PASS surface seats and original outer samples',id,result);
    }
    if(batch==='--side-discs' && phase==='after'){
      const result=await page.evaluate("import('/review/GT-20076/side-disc-proof.mjs').then(m=>m.checkSideDiscs(TT,"+JSON.stringify(id)+"))",120000);
      await save(new URL('side-disc-proof.json',dir),JSON.stringify(result,null,2)+'\n');
      console.log('PASS seated side artwork and original outer samples',id,result);
    }
    if(batch==='--handle-wrist' && phase==='after'){
      const result=await page.evaluate("import('/review/GT-20076/handle-wrist-proof.mjs').then(m=>m.checkHandleWrist(TT,"+JSON.stringify(id)+"))",120000);
      await save(new URL('handle-wrist-proof.json',dir),JSON.stringify(result,null,2)+'\n');
      console.log('PASS exterior samples and contact surfaces',id,result);
    }
    if(batch==='--front-art' && phase==='after'){
      const result=await page.evaluate("import('/review/GT-20076/front-art-proof.mjs').then(m=>m.checkFrontArt(TT,"+JSON.stringify(id)+"))",120000);
      await save(new URL('front-art-proof.json',dir),JSON.stringify(result,null,2)+'\n');
      console.log('PASS front graphic original faces and closed seats',id,result);
    }
    if(batch==='--outline-joins' && phase==='after'){
      const result=await page.evaluate("import('/review/GT-20076/outline-joins-proof.mjs').then(m=>m.checkOutlineJoins(TT,"+JSON.stringify(id)+"))",120000);
      await save(new URL('outline-proof.json',dir),JSON.stringify(result,null,2)+'\n');
      console.log('PASS handle/guard artwork',id,result);
    }
    if(batch==='--gauge-covers' && phase==='after'){
      const result=await page.evaluate("import('/review/GT-20076/gauge-cover-proof.mjs').then(m=>m.checkGaugeCovers(TT,"+JSON.stringify(id)+"))",120000);
      await save(new URL('gauge-cover-proof.json',dir),JSON.stringify(result,null,2)+'\n');
      console.log('PASS retained top covers or gauge face',id,result);
    }
    if(batch==='--wood-boundary' && phase==='after'){
      const result=await page.evaluate("import('/review/GT-20076/wood-boundary-proof.mjs').then(m=>m.checkWoodBoundary(TT,"+JSON.stringify(id)+"))",120000);
      if(id==='revolver'){
        const now=await page.evaluate("import('/review/GT-20088/wood.mjs').then(m=>m.readWood(TT))",120000);
        const approved=JSON.parse(await readFile(new URL('../GT-20088/after/art.json',import.meta.url),'utf8'));
        assert.deepEqual(now.meshes.slice(1),approved.meshes.slice(1));
        for(const key of ['woodTexture','repeat','anchor','stockFit'])assert.deepEqual(now[key],approved[key]);
        result.identicalOtherMeshes=now.meshes.length-1;
      }
      await save(new URL('boundary-proof.json',dir),JSON.stringify(result,null,2)+'\n');
      console.log('PASS wood boundary artwork',id,result);
    }
    if(batch==='--side-covers' && phase==='after'){
      const result=await page.evaluate("import('/review/GT-20076/heavy-side-proof.mjs').then(m=>m.checkHeavySides(TT,"+JSON.stringify(id)+"))",120000);
      await save(new URL('side-proof.json',dir),JSON.stringify(result,null,2)+'\n');
      console.log('PASS retained side graphics and seats',id,result);
    }
    if(batch==='--longarm-joins' && phase==='after'){
      const result=await page.evaluate("import('/review/GT-20076/longarm-joins-proof.mjs').then(m=>m.checkLongarmJoins(TT,"+JSON.stringify(id)+"))",120000);
      await save(new URL('join-proof.json',dir),JSON.stringify(result,null,2)+'\n');
      console.log('PASS painted joins',id,result);
    }
    const cameras={};
    for(const view of angles){
      cameras[view]=await page.evaluate('views.pose('+JSON.stringify(view==='walnut'?'rack':view)+')');
      if(view==='walnut')cameras[view].localArtCamera=await page.evaluate(`(()=>{
        const t=TT,G=t.THREE,copy=t.carryGunCopyDbg('revolver');window.woodCopy=copy;t.scene.add(copy);
        copy.position.copy(t.player.position).add(new G.Vector3(0,2.5,1.2));copy.updateMatrixWorld(true);
        const model=copy.children[0],c=new G.Vector3(.006,.006,-.061),e=c.clone().add(new G.Vector3(.36,.10,-.23));
        const target=model.localToWorld(c.clone()),eye=model.localToWorld(e.clone());
        t.setShotView({x:eye.x,y:eye.y,z:eye.z,tx:target.x,ty:target.y,tz:target.z,fov:24});
        return {target:c.toArray(),eye:e.toArray(),fov:24};
      })()`);
      for(const light of ['noon','overcast','dusk','night']){
        await page.evaluate('views.light('+JSON.stringify(light)+')');
        const shot=await page.send('Page.captureScreenshot',{format:'png'});await save(new URL(view+'-'+light+'.png',dir),Buffer.from(shot.data,'base64'));
      }
      if(view==='walnut')await page.evaluate('TT.scene.remove(window.woodCopy);delete window.woodCopy;true');
    }
    if(batch==='--rear-collars' && phase==='after'){
      const result=await page.evaluate("import('/review/GT-20076/collar-proof.mjs').then(m=>m.checkCollars(TT.inspectHost().builders.weaponContext(),"+JSON.stringify(id)+"))");
      await save(new URL('exterior-samples.json',dir),JSON.stringify(result,null,2)+'\n');
      console.log('PASS retained exterior surface tuples',id,result);
    }
    if(batch==='--surface-seams' && phase==='after' && id==='shotgun'){
      const result=await page.evaluate("import('/review/GT-20076/pump-crown-proof.mjs').then(m=>m.inspectPumpCrown(TT.inspectHost().builders.weaponContext()))");
      await save(new URL('pump-surface.json',dir),JSON.stringify(result,null,2)+'\n');
      console.log('PASS revised upper artwork and fixed lower contact',result);
    }
    await save(new URL('cameras.json',dir),JSON.stringify(cameras,null,2)+'\n');
    console.log('PASS',phase,id,angles.join(', '),'in four lights');
  }
  if(batch==='--port-sight' && phase==='after' && (!only||only==='uzi')){
    await page.evaluate("views.equip('uzi')");
    const action=await page.evaluate("import('/review/GT-20076/port-sight-proof.mjs').then(m=>m.firstPersonPortCycle(TT))");
    await save(new URL('./visible-repairs/uzi/clear-port-sight-after/eye-cycle.json',import.meta.url),JSON.stringify(action,null,2)+'\n');
    console.log('PASS real Wasp eye cycle, one shot and return to rest',action.frames.length,'frames');
  }
  if(batch==='--minigun-panel'){
    await page.evaluate("views.equip('minigun')");
    const sweep=await page.evaluate("import('/review/GT-20076/minigun-side-panel-proof.mjs').then(m=>m.minigunPanelSweep(TT,'e70f29b6'))",180000);
    await save(new URL('./visible-repairs/minigun/clear-minigun-panel-'+phase+'/reload.json',import.meta.url),JSON.stringify(sweep,null,2)+'\n');
    for(const who of ['world','eye'])console.log(who,'crossed before/after',...['before','after'].map(version=>sweep.filter(r=>r[who].visible&&r[who][version].crossed).map(r=>r.phase)));
  }
  if(batch==='--pump-port' && phase==='after'){
    await page.evaluate("views.equip('shotgun')");
    const result=await page.evaluate("import('/review/GT-20076/pump-port-proof.mjs').then(m=>m.pumpCycle(TT))");
    await save(new URL('./visible-repairs/shotgun/clear-pump-port-after/eye-cycle.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
    console.log('PASS live pump and eye-copy display',result.travel,result.frames.length);
  }
  if(batch==='--kr-port' && phase==='after'){
    await page.evaluate("views.equip('ak')");
    const action=await page.evaluate("import('/review/GT-20076/port-sight-proof.mjs').then(m=>m.firstPersonPortCycle(TT,'ak',.02435))");
    await save(new URL('./visible-repairs/ak/clear-kr-port-after/eye-cycle.json',import.meta.url),JSON.stringify(action,null,2)+'\n');
    const finish=await page.evaluate("import('/review/GT-20076/kr-port-proof.mjs').then(m=>m.checkPortFinish(TT))");
    await save(new URL('./visible-repairs/ak/clear-kr-port-after/finish.json',import.meta.url),JSON.stringify(finish,null,2)+'\n');
    console.log('PASS real KR-7 display cycle and factory finish',action.frames.length,'frames',finish.coatedMaterials,'coated materials');
  }
  if(['--rotating-frame','--rv-bridge','--rear-shield'].includes(batch) && phase==='after' && (!only||only==='revolver')){
    await page.evaluate("views.equip('revolver')");
    const r=await page.evaluate("import('/review/GT-20076/rotating-frame-proof.mjs').then(m=>m.checkReloadSweep(TT,"+(batch==='--rear-shield')+"))",150000);
    await save(new URL('./visible-repairs/revolver/'+label+phase+'/reload-sweep.json',import.meta.url),JSON.stringify(r,null,2)+'\n');
    assert(r.travel>.05,'The native cylinder did not traverse its opening path: '+r.travel);
    const crossed=r.records.filter(s=>s.crossed.some(Boolean));
    console.log('Measured native reload phases',r.records.length,'crossings',crossed);
    assert.equal(crossed.length,0);
  }
  if(verifyOriginal)await verifyOriginal();
  assert.deepEqual(page.errors,[]);
}finally{await browser.close();await server.close();}
