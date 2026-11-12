import assert from 'node:assert/strict';
import {mkdir,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
import {save} from './save.mjs';
import {originalSawCovers,originalSawFrontPlates,originalWasp,originalWaspFurniture} from './replay-artwork.mjs';

const [id,phase]=process.argv.slice(2);
const wallFolder=process.argv.find(arg=>arg.startsWith('--wall-source='))?.slice('--wall-source='.length);
if(wallFolder)assert(/^visibility-fix-[a-z0-9-]+$/.test(wallFolder));
const recordPose=process.argv.includes('--record-pose');
const poseFrom=process.argv.find(arg=>arg.startsWith('--pose-from='))?.slice(12);
if(poseFrom)assert(/^clear-[a-z0-9-]+-before$/.test(poseFrom));
assert(process.env.DW_GAME_TEST_TOKEN && /^[a-z0-9]+$/.test(id) && (((wallFolder || recordPose || poseFrom) && /^clear-[a-z0-9-]+-(before|after)$/.test(phase)) || ['before','after','trim','final-trim','joins','rear-join','side-inset','crown','contact-trim','relief','closed-relief','floor-before','floor-after','clear-before','clear-after','clear-seated','clear-lift-before','clear-lift-after','clear-emboss-before','clear-emboss-after'].includes(phase)));
const dir=new URL('./visible-repairs/'+id+'/'+phase+'/',import.meta.url);
await mkdir(dir,{recursive:true});
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try {
  const page=await browser.newPage({width:960,height:540});
  const replay=process.argv.includes('--original-saw-covers');
  if(replay) assert(id==='chainsaw' && ['floor-before','clear-before'].includes(phase));
  const matchKr=phase.startsWith('clear-emboss-');
  const matched=phase.startsWith('clear-lift-') || matchKr || !!wallFolder;
  if(matched && !wallFolder)assert.equal(id,matchKr?'ak':'uzi');
  const sawFront=process.argv.includes('--original-saw-front-plates');
  if(sawFront)assert(id==='chainsaw'&&phase==='clear-front-plate-eye-before');
  const verify=sawFront?await originalSawFrontPlates(page,server.origin):process.argv.includes('--original-wasp-furniture')?await originalWaspFurniture(page,server.origin):
    replay?await originalSawCovers(page,server.origin):phase==='clear-lift-before'?await originalWasp(page,server.origin):null;
  await page.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='Panel proof';document.getElementById('modeTraining').click()");
  assert(await page.waitFor("TT.trainingDbg.state().active && !TT.trainingDbg.state().warming && !document.getElementById('trainingBlackout')?.classList.contains('on')"));
  const mode=recordPose?'record':(poseFrom || matched)?'replay':false;
  const reference=wallFolder?wallFolder+'/'+id:matchKr?'visibility-fix-kr-rib-before/ak':'visibility-fix-wasp-lift-before/uzi';
  await page.evaluate(`(async()=>{
      const {makeViews}=await import('/review/GT-20076/visibility-camera.mjs');
      const mode=${JSON.stringify(mode)};
      if(mode==='replay'){
        const reference=${JSON.stringify(poseFrom?'visible-repairs/'+id+'/'+poseFrom:reference)};
        const response=await fetch('/review/GT-20076/'+reference+'/cameras.json');
        if(!response.ok)throw Error('Missing original game pose');window.recordedArtViews=await response.json();
      }
      window.vis=makeViews(TT,mode,${!!(recordPose || poseFrom)});return true;
    })()`);
  await page.evaluate('vis.equip('+JSON.stringify(id)+')');
  if(process.argv.includes('--check-wasp-furniture')){
    const proof=await page.evaluate("import('/review/GT-20076/wasp-furniture-proof.mjs').then(m=>m.sampleWaspFurniture(TT))",120000);
    await save(new URL('furniture-surfaces.json',dir),JSON.stringify(proof,null,2)+'\n');
    console.log('PASS',proof.stripes.length,'two-sided seated stripes, three original concealed; rendered side displacement',proof.maxIn,proof.maxOut);
  }
  const cameras={};
  const views=['hip','aimed','held-left','held-right',...(id==='chainsaw'?[]:['rack'])];
  if(id==='sniper')views.splice(2,0,'aim-entry');
  if(phase.startsWith('floor-') || phase.startsWith('clear-')) views.push('held-left-open','held-right-open');
  const selection=process.argv.find(arg=>arg.startsWith('--views='))?.slice(8).split(',') ||
    (process.argv.includes('--check-sniper-strips')?['hip','held-left-open','held-right-open']:views);
  assert(selection.length && selection.every(view=>views.includes(view)));
  for(const view of selection){
    cameras[view]=await page.evaluate('vis.pose('+JSON.stringify(view)+')');
    for(const light of ['noon','overcast','dusk','night']){
      const receipt=new URL(view+'-'+light+'.png',dir);
      if(process.argv.includes('--resume') && await stat(receipt).then(f=>f.size>1000,()=>false))continue;
      await page.evaluate('vis.light('+JSON.stringify(light)+')');
      const shot=await page.send('Page.captureScreenshot',{format:'png'});
      await save(new URL(view+'-'+light+'.png',dir),Buffer.from(shot.data,'base64'));
    }
  }
  if(verify)await verify();
  if(process.argv.includes('--check-collars')){
    const result=await page.evaluate("import('/review/GT-20076/collar-proof.mjs').then(m=>m.checkCollars(TT.inspectHost().builders.weaponContext(),"+JSON.stringify(id)+"))");
    await save(new URL('exterior-samples.json',dir),JSON.stringify(result,null,2)+'\n');
    console.log('PASS retained exterior surface tuples',id,result);
  }
  if(process.argv.includes('--check-longarm-seam')){
    const receipt=await page.evaluate("import('/review/GT-20076/longarm-seam-proof.mjs').then(m=>m.checkLongarmSeam(TT,"+JSON.stringify(id)+"))");
    await save(new URL('seam-clearance.json',dir),JSON.stringify(receipt,null,2)+'\n');
    console.log('PASS longarm trim clearance',id,JSON.stringify(receipt));
  }
  if(process.argv.includes('--check-pistol-shell')){
    await page.evaluate("vis.equip('pistol')");
    const receipt=await page.evaluate("import('/review/GT-20076/pistol-shell-continuity.mjs').then(m=>m.checkShellDuringAnimation(TT))");
    await save(new URL('shell-continuity.json',dir),JSON.stringify(receipt,null,2)+'\n');
    assert(receipt.rows.every(r=>r.tested>1000 && r.uncovered===0));assert(receipt.returned<.001);
    console.log('PASS continuous retained polymer beneath formerly duplicated artwork in rest, half and full animation',receipt.rows);
  }
  if(process.argv.includes('--check-saw-covers')){
    assert.equal(id,'chainsaw');
    const proof=await page.evaluate("import('/review/GT-20076/chainsaw-cover-proof.mjs').then(m=>m.compareSideCovers(TT.inspectHost().builders.weaponContext()))");
    await save(new URL('cover-proof.json',dir),JSON.stringify(proof,null,2)+'\n');
    assert.equal(proof.panels.length,2); assert.equal(proof.instances,42); assert.equal(proof.moved,42);
    for(const p of proof.panels){assert(p.closed && p.before>10);assert.equal(p.missing+p.added,0);assert.equal(p.outerMotion,0);assert(Math.abs(p.inner-.136)<1e-7);}
    console.log('PASS both exterior covers retain all exposed tuples, both are closed, and all 42 chain graphics move');
  }
  if(process.argv.includes('--check-wasp-strips')){
    const receipt=await page.evaluate("import('/review/GT-20076/wasp-strip-proof.mjs').then(m=>m.checkWaspStrips(TT.inspectHost().builders.weaponContext()))");
    await save(new URL('strip-surfaces.json',dir),JSON.stringify(receipt,null,2)+'\n');
    console.log('PASS Wasp exterior samples and closed fitted backs',JSON.stringify(receipt));
  }
  if(process.argv.includes('--check-wasp-covers')){
    assert.equal(id,'uzi');
    const result=await page.evaluate("import('/review/GT-20076/wasp-cover-proof.mjs').then(m=>m.compareWaspCovers(TT.inspectHost().builders.weaponContext()))");
    await save(new URL('cover-surfaces.json',dir),JSON.stringify(result,null,2)+'\n');
    assert.equal(result.filter(p=>p.part==='side strip').length,8);assert.equal(result.length,9);
    for(const p of result){
      assert(p.closed && p.before>8);assert.equal(p.missing+p.added,0);assert.equal(p.outerMotion,0);
      assert(Math.abs(p.inner-(p.part==='top cover' ? .078 : .049))<1e-7);
    }
    console.log('PASS eight pressed strips and one top cover retain the original exposed surface samples');
  }
  if(process.argv.includes('--check-sniper-strips')){
    assert.equal(id,'sniper');
    const rows=await page.evaluate("import('/review/GT-20076/sniper-strip-proof.mjs').then(m=>m.checkStrips(TT))");
    await save(new URL('strips.json',dir),JSON.stringify(rows,null,2)+'\n');
    assert.equal(rows.length,6);
    for(const row of rows){assert(row.closed && row.changed && row.exposed);assert(row.outwardMotion<1e-8);assert(!row.gap.penetrating && row.gap.upperMm<=.5);}
    console.log('PASS six closed stripe graphics, unchanged outer bevels/UVs and seated surfaces');
  }
  if(process.argv.includes('--check-launcher-plates')){
    assert.equal(id,'launcher');
    const result=await page.evaluate("import('/review/GT-20076/launcher-rear-proof.mjs').then(m=>m.checkRearGraphics(TT))");
    await save(new URL('rear-graphics.json',dir),JSON.stringify(result,null,2)+'\n');
    for(const p of result.graphics){assert(p.closed && p.islands===1 && p.privateGeometry);assert(p.before>4);assert.equal(p.lost+p.added,0);assert(!p.roundGap.penetrating && p.roundGap.upperMm<=.5);}
    for(const s of result.studs)assert(!s.support.penetrating && s.support.upperMm<=.5 && !s.round.penetrating);
    assert(!result.coverSupport.penetrating && result.coverSupport.upperMm<=.5);
    console.log('PASS rear graphic rims retain their visible samples; both studs touch their own plate');
  }
  if(process.argv.includes('--check-kr-bands')){
    assert.equal(id,'ak');
    const result=await page.evaluate("import('/review/GT-20076/kr-band-proof.mjs').then(m=>m.verifyRaisedGraphics(TT.inspectHost().builders.weaponContext()))");
    await save(new URL('raised-graphics.json',dir),JSON.stringify(result,null,2)+'\n');
    assert.equal(result.length,3);
    for(const rib of result){
      assert.equal(rib.islands,2);assert(rib.closed);
      for(const side of rib.sides){
        assert(side.before>10);assert.equal(side.lost+side.added,0);
        assert(Math.abs(side.back-.017)<1e-7 && Math.abs(side.outer-.0185)<1e-7);
      }
    }
    console.log('PASS three raised graphics, six closed faces, original visible geometry, normals and UVs');
  }
  if(process.argv.includes('--check-walnut-panels')){
    assert.equal(id,'revolver');
    const result=await page.evaluate("import('/review/GT-20076/walnut-panel-proof.mjs').then(m=>m.checkWalnutPanels(TT.inspectHost().builders.weaponContext()))");
    await save(new URL('walnut-surfaces.json',dir),JSON.stringify(result,null,2)+'\n');
    assert.equal(result.length,2);
    for(const panel of result){
      assert(panel.closed && panel.before>10 && panel.woodTexture && !panel.paintRole);
      assert.equal(panel.missing+panel.added,0);assert.equal(panel.outerMotion,0);assert(Math.abs(panel.inner-(panel.side>0?.029:.033))<1e-7);
    }
    console.log('PASS both walnut panels retain their complete exposed artwork, wood maps and contact planes');
  }
  await save(new URL('cameras.json',dir),JSON.stringify(cameras,null,2)+'\n');
  await save(new URL('renderer-log.json',dir),JSON.stringify({errors:page.errors,warnings:page.console.filter(v=>['error','warning'].includes(v.type)).slice(0,30)},null,2)+'\n');
  assert.deepEqual(page.errors,[]);console.log('PASS',id,phase,Object.keys(cameras).length,'gameplay views in all four lights');
}finally{await browser.close();await server.close();}
