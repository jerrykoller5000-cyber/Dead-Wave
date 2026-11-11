import assert from 'node:assert/strict';
import {sampleHigh,compiledBuild} from '../GT-20076/frame-sample.mjs';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
import {save} from '../GT-20076/save.mjs';

const [id,phase='baseline']=process.argv.slice(2);
const repairTiming=/^j128(?:-([a-z][a-z0-9-]*))?$/.exec(phase);
const compareSaw=id==='chainsaw' && ['compare-before','compare-after'].includes(phase);
const handleVersion=id==='chainsaw' && /^saw-(legacy|panels|fitted)-[1-9]$/.exec(phase)?.[1];
const sniperVersion=id==='sniper' && /^sniper-cover-(original|current)-[12]$/.exec(phase)?.[1];
const compareKr=id==='ak' && /^(original|current)-kr-[12]$/.test(phase);
assert(repairTiming || sniperVersion || handleVersion || compareKr || compareSaw || ['baseline','revised','rework','action','ag294'].includes(phase));
assert(process.env.DW_GAME_TEST_TOKEN && /^[a-z0-9-]+$/.test(id));
async function runtimeSignature(){
  const files=['index.html','game/viewmodel.js','game/viewmodel-poses.js','game/training-camera-collision.js','studio/weapon-heavy.js','studio/weapon-longarms.js'];
  const hash=createHash('sha256');
  for(const file of files)hash.update(await readFile(new URL('../../'+file,import.meta.url)));
  return hash.digest('hex');
}
const runSignature=handleVersion || sniperVersion?await runtimeSignature():null;
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0);
const browser=await launch({headless:false});
try {
  const page=await browser.newPage({width:1280,height:720});
  let verifyBaseline;
  if(phase==='compare-before'){
    const {originalSawForPage}=await import('./chainsaw/baseline-look.mjs');
    verifyBaseline=await originalSawForPage(page,server.origin);
  }
  let verifyKr;
  if(compareKr){
    const {prepareKrComparison}=await import('../GT-20076/kr-timing-control.mjs');
    verifyKr=await prepareKrComparison(page,server.origin,phase.startsWith('original'));
  }
  let verifyHandle;
  if(handleVersion){
    const {prepareHandleTiming}=await import('../GT-20083/original-handle.mjs');
    verifyHandle=await prepareHandleTiming(page,server.origin,handleVersion);
  }
  let verifySniper;
  if(sniperVersion==='original'){
    const {originalSniperCover}=await import('../GT-20076/replay-artwork.mjs');
    verifySniper=await originalSniperCover(page,server.origin);
  }
  const result=await sampleHigh(page,server.origin,id);
  const {readyMs}=result;
  if(verifyKr) result.artworkFingerprint=await verifyKr();
  if(verifyHandle) result.artworkFingerprint=await verifyHandle();
  if(sniperVersion){
    if(verifySniper)verifySniper();
    const observed=await page.evaluate("Promise.all([import('/review/GT-20076/rank-visibility.mjs'),import('/tools/tests/weapon-seating.js')]).then(([r,s])=>s.artworkFingerprint(r.currentModel(TT,'sniper')))");
    const audit=sniperVersion==='current'?'catalog-fix-sniper-seated':'catalog-fix-front-rail-boss';
    const source=JSON.parse(await readFile(new URL('../GT-20076/'+audit+'/audit.json',import.meta.url),'utf8'));
    assert.equal(observed,source.sniper.artworkFingerprint);result.artworkFingerprint=observed;
  }
  if(handleVersion || sniperVersion){
    result.runtimeBefore=runSignature;result.runtimeAfter=await runtimeSignature();
    result.compiled=await compiledBuild(page,server.origin,handleVersion?'/studio/weapon-heavy.js':'/studio/weapon-longarms.js');
  }
  let path='./'+id+'/'+(phase==='baseline'?'timing.json':'timing-'+phase+'.json');
  if (phase==='ag294') path='./ag294-retakes/timing-'+id+'.json';
  if (handleVersion) path='../GT-20083/timing-'+phase+'.json';
  if (sniperVersion) path='../GT-20076/visible-repairs/sniper/timing-'+phase+'.json';
  if (repairTiming) path='../GT-20076/visible-repairs/'+id+'/timing'+(repairTiming[1]?'-'+repairTiming[1]:'')+'.json';
  await save(new URL(path,import.meta.url),JSON.stringify(result,null,2));
  if(verifyBaseline)verifyBaseline();
  assert.deepEqual(page.errors,[]);
  console.log('PASS '+id+' held and at eye for all 12 samples: ready '+readyMs+' ms; '+result.fps+' fps, '+result.low+' fps low');
} finally {await browser.close();await server.close()}
