import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
import {save} from './save.mjs';
import {originalSawCovers,originalSniperCover,originalWasp} from './replay-artwork.mjs';

const rankOnly=process.argv.includes('--rank-only');
const candidate=process.argv.find(arg=>arg.startsWith('--audit='));
const audit=candidate?candidate.slice('--audit='.length):'catalog-chain-skin';
assert(/^catalog-[a-z0-9-]+$/.test(audit));
const precise=process.argv.includes('--precise') || !!candidate;
const replay=process.argv.includes('--original-saw-covers');
const replayWasp=process.argv.includes('--original-wasp');
const matched=process.argv.includes('--match-wasp-wall');
const replaySniper=process.argv.includes('--original-sniper-cover');
const requestedFolder=process.argv.find(arg=>arg.startsWith('--output='))?.slice(9);
if(requestedFolder)assert(candidate && /^visibility-fix-[a-z0-9-]+$/.test(requestedFolder));
const folder=requestedFolder || (candidate?'visibility-'+audit.slice('catalog-'.length):precise?'visibility-final':'visibility')+(replay?'-control':'');
const ids=process.argv.slice(2).filter(arg=>!arg.startsWith('--'));
// An urgent art card can supersede the remaining queued fleet batches.
if(requestedFolder){
  const card=await readFile(new URL('../../crew/status/chatgpt2.md',import.meta.url),'utf8');
  if(!/^task: GT-20076\b/m.test(card)){console.log('Fleet capture deferred until GT-20076 is active again');process.exit(2);}
}
assert(process.env.DW_GAME_TEST_TOKEN && ids.length && ids.every(id=>/^[a-z0-9]+$/.test(id)));
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0);
const browser=await launch({headless:false});
try {
  const page=await browser.newPage({width:960,height:540});
  if(replay) assert(audit==='catalog-fix-revolver-strip' && ids.length===1 && ids[0]==='chainsaw');
  if(replaySniper)assert(!replay && requestedFolder && audit==='catalog-fix-front-rail-boss' && ids.length===1 && ids[0]==='sniper');
  if(matched)assert(ids.length===1 && ids[0]==='uzi');
  if(replayWasp)assert(matched && !replay && !replaySniper && requestedFolder && audit==='catalog-fix-revolver-walnut');
  const verify=replay?await originalSawCovers(page,server.origin):replaySniper?await originalSniperCover(page,server.origin):replayWasp?await originalWasp(page,server.origin):null;
  await page.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('!DWOpening.active'));
  if(!rankOnly){
    await page.evaluate("document.getElementById('playerName').value='Visibility';document.getElementById('modeTraining').click()");
    assert(await page.waitFor("TT.trainingDbg.state().active && !TT.trainingDbg.state().warming && !document.getElementById('trainingBlackout')?.classList.contains('on')"));
    const mode=matched?(replayWasp?'record':'replay'):false;
    await page.evaluate(`(async()=>{
      const {makeViews}=await import('/review/GT-20076/visibility-camera.mjs');
      const mode=${JSON.stringify(mode)};
      if(mode==='replay'){
        const response=await fetch('/review/GT-20076/visibility-fix-wasp-lift-before/uzi/cameras.json');
        if(!response.ok)throw Error('Missing original game pose');window.recordedWaspViews=await response.json();
      }
      window.vis=makeViews(TT,mode);return true;
    })()`);
  }
  for (const id of ids) {
    const dir=new URL('./'+folder+'/'+id+'/',import.meta.url);
    await mkdir(dir,{recursive:true});
    if(!rankOnly)await page.evaluate('vis.equip('+JSON.stringify(id)+')');
    const results={};
    const views=['hip','aimed','held-left','held-right'];
    if(id==='sniper') views.splice(2,0,'aim-entry');
    if(id!=='chainsaw') views.push('rack');
    if(process.argv.includes('--open-floor')) views.push('held-left-open','held-right-open');
    for (const view of rankOnly?[]:views) {
      const camera=await page.evaluate('vis.pose('+JSON.stringify(view)+')');
      const shot=async()=> (await page.send('Page.captureScreenshot',{format:'png'})).data;
      const normal=await shot();
      await page.evaluate('vis.draw(true)');
      const repeat=await shot();
      await page.evaluate('vis.draw(false)');
      const hidden=await shot();
      await page.evaluate('vis.draw(true)');
      const mask=await page.evaluate('vis.mask('+[normal,repeat,hidden].map(s=>JSON.stringify(s)).join(',')+')');
      if(camera.glassHidden) assert.equal(mask.pixels,0,'Fully scoped artwork should be hidden');
      else assert(mask.pixels>=100,id+' '+view+' difference mask covers only '+mask.pixels+' pixels');
      await save(new URL(view+'.png',dir),Buffer.from(normal,'base64'));
      await save(new URL(view+'-mask.bin',dir),Buffer.from(mask.bytes,'base64'));
      if(precise && !camera.glassHidden) {
        const depth=await page.evaluate('vis.depth('+mask.width+','+mask.height+')',120000);
        await save(new URL(view+'-depth.gz',dir),Buffer.from(depth,'base64'));
      }
      results[view]={...camera,actualDepth:precise&&!camera.glassHidden,width:mask.width,height:mask.height,pixels:mask.pixels};
      await save(new URL('cameras.json',dir),JSON.stringify(results,null,2)+'\n');
      console.log('PASS',id,view,mask.pixels,'changed pixels');
    }
    const rank=await page.evaluate('import("/review/GT-20076/rank-visibility.mjs").then(m=>m.rankViews(TT,'+[id,folder,audit].map(x=>JSON.stringify(x)).join(',')+'))',120000);
    await save(new URL('rank.json',dir),JSON.stringify(rank,null,2)+'\n');
    console.log('RANK',id,rank.rawPairs,'raw pairs,',rank.crossingPairs,'with triangle crossings,',rank.screenCandidates,'screen candidates');
    console.log(JSON.stringify(rank.coverage));
  }
  if(verify)await verify();
  assert.deepEqual(page.errors,[]);
} finally {await browser.close(); await server.close();}
