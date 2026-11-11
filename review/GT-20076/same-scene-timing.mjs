import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
import {save} from './save.mjs';

const id=process.argv[2],run=process.argv[3]||'first';
assert(process.env.DW_GAME_TEST_TOKEN && ['pistol','ak'].includes(id) && /^[a-z0-9-]+$/.test(run));
const cfg=id==='ak'
  ? {file:'weapon-longarms',fn:'makeAkModel',current:'    separateBandFaces(THREE, relief.geometry, outline, 0.034 / 2);',old:'',keys:['6c5a4c64','606cbcca']}
  : {file:'weapon-sidearms',fn:'makePistolModel',current:'K.slab([[-0.0875, 0.006], [0.294, 0.006]',old:'K.slab([[-0.0875, 0.012], [0.294, 0.012]',keys:['98c22316','de60ca31']};
const root=new URL('../../',import.meta.url),mod='/studio/'+cfg.file+'.js';
const source=await readFile(new URL('.'+mod,root),'utf8');
assert.equal(source.split(cfg.current).length,2);
const historical=source.replace(cfg.current,cfg.old);
const order=process.argv.includes('--reverse')?['after','before','before','after','after','before']:['before','after','after','before','before','after'];
const browser=await launch({headless:false});
let previous;
const loads=[],loadOrder=process.argv.includes('--load-reverse')?['after','before']:['before','after'];
try{
 for(const phase of loadOrder){
   const server=await serve(fileURLToPath(root),0);
   let page;
   try{
     page=await browser.newPage({width:1280,height:720});let verify;
     if(phase==='before'){
       const {replayArtwork}=await import('./replay-artwork.mjs');
       verify=await replayArtwork(page,server.origin,mod,historical);
     }
     const start=Date.now();await page.goto(server.origin+'/index.html?debug=1',{waitUntil:'none'});
     assert(await page.waitFor('window.DWOpening'));await page.evaluate('DWOpening.dismissForTesting()');
     assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));loads.push(Date.now()-start);
     assert(await page.waitFor('!DWOpening.active'));
     await page.evaluate("TT.applyGraphicsPreset('high');document.getElementById('playerName').value='Matched eye';document.getElementById('modeTraining').click()");
     assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:45000}));
     await page.evaluate('window.eyeReviewId='+JSON.stringify(id));
     await page.evaluate(`(async()=>{
       const T=TT,id=eyeReviewId;T.grantAllWeapons();T.setViewFirstDbg(true);
       if(T.isUnarmed())T.toggleHolster();
       for(let n=0;n<30 && T.getCurrentWeapon()!==id;n++){T.setWeapon(T.WEAPON_ORDER.indexOf(id));await new Promise(r=>setTimeout(r,120));}
     })()`);
     assert(await page.waitFor('TT.viewmodelDbg().info.key===eyeReviewId && TT.viewmodelDbg().info.raise>.98 && TT.fpDbg().w>.98'));
     const isBefore=phase==='before';
     const current=await page.evaluate("import('/review/GT-20076/eye-batch-review.mjs').then(m=>m.snapshot(TT,eyeReviewId,"+(!previous)+"))",90000);
     assert.equal(current.fingerprint,cfg.keys[isBefore?0:1],phase+' raw artwork');
     if(verify)verify();
     if(!previous){previous=current;continue;}
     assert.deepEqual(Object.keys(current.nodes),Object.keys(previous.nodes),'Native eye hierarchy changed');
     const changed={};
     for(const [path,value] of Object.entries(current.nodes)){
       const prior=previous.nodes[path];
       assert.equal(value.name,prior.name,path+' geometry node');
       assert.deepEqual(value.appearance,prior.appearance,path+' material');
       if(JSON.stringify(value.channels)!==JSON.stringify(prior.channels))changed[path]=prior;
     }
     assert(Object.keys(changed).length,'No changed native GPU batch');
     await page.evaluate('window.eyeBatchBaseline='+JSON.stringify(changed));
     const result=await page.evaluate("import('/review/GT-20076/eye-batch-review.mjs').then(m=>m.timeBatches(TT,eyeReviewId,eyeBatchBaseline,"+JSON.stringify(order)+","+JSON.stringify(phase)+"))",150000);
     assert.equal(result.high,'high');assert.deepEqual(page.errors,[]);
     await save(new URL('./visible-repairs/'+id+'/same-scene-'+run+'.json',import.meta.url),JSON.stringify({loadOrder,loadMs:loads,rawFingerprints:cfg.keys,...result},null,2)+'\n');
     console.log('PASS',id,'actual eye batches',result.geometry,'raw',cfg.keys,'load ms',loads,'fps/p95/p99',result.rows.map(r=>[r.version,r.fps.toFixed(1),r.p95Ms.toFixed(1),r.p99Ms.toFixed(1)]));
   }finally{if(page)await page.send('Page.close',{}).catch(()=>{});await server.close();}
 }
}finally{await browser.close();}
