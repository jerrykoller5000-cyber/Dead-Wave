import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
import {save} from './save.mjs';
import {originalHandleWrist} from './replay-artwork.mjs';
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
  '--case-stamp':['clear-case-stamp-',true,[['ak',['hip','held-left-open']],['flamer',['hip','rack','pack-off']]]]
};
assert(Object.hasOwn(batches,batch));
const [label,tracked,selections]=batches[batch];
const only=process.argv[4];
assert(!only||selections.some(([id])=>id===only),'Unknown model in this photo batch');
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{
  const page=await browser.newPage({width:960,height:540});
  const verifyOriginal=batch==='--neutral-wrist'&&phase==='before'?await originalHandleWrist(page,server.origin):null;
  await page.goto(server.origin+'/index.html?debug=1&raf=timer');assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='Trim comparison';document.getElementById('modeTraining').click()");
  assert(await page.waitFor("TT.trainingDbg.state().active && !TT.trainingDbg.state().warming && !document.getElementById('trainingBlackout')?.classList.contains('on')"));
  const poseMode=tracked?(phase==='before'?'record':'replay'):false;
  await page.evaluate("import('/review/GT-20076/visibility-camera.mjs').then(m=>{window.views=m.makeViews(TT,"+JSON.stringify(poseMode)+","+tracked+");return true})");
  for(const [id,angles] of selections){
    if(only&&only!==id)continue;
    const dir=new URL('./visible-repairs/'+id+'/'+label+phase+'/',import.meta.url);await mkdir(dir,{recursive:true});
    if(tracked && phase==='after'){
      const source='/review/GT-20076/visible-repairs/'+id+'/'+label+'before/cameras.json';
      await page.evaluate('fetch('+JSON.stringify(source)+').then(r=>r.json()).then(c=>{window.recordedArtViews=c;return true})');
    }
    await page.evaluate('views.equip('+JSON.stringify(id)+')');
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
  if(verifyOriginal)await verifyOriginal();
  assert.deepEqual(page.errors,[]);
}finally{await browser.close();await server.close();}
