import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {launch} from '../../tools/cdp.mjs';
import {serve} from '../../tools/serve.mjs';
import {replayArtwork} from '../GT-20076/replay-artwork.mjs';
import {save} from '../GT-20076/save.mjs';
assert(process.env.DW_GAME_TEST_TOKEN);
const root=new URL('../../',import.meta.url),path='/studio/weapon-longarms.js';
const hands=process.argv.includes('--hands');
const source=await readFile(new URL('studio/weapon-longarms.js',root),'utf8');
const delta='  triggerGroup.position.z -= .010;';assert.equal(source.split(delta).length,2);
const server=await serve(fileURLToPath(root),0),browser=await launch({headless:false}),results={};
try{
 for(const phase of ['before','after']){
  const page=await browser.newPage({width:1280,height:720});
  const verify=await replayArtwork(page,server.origin,path,phase==='before'?source.replace(delta,''):source);
  await page.goto(server.origin+'/index.html?debug=1');
  assert(await page.waitFor('window.TT&&DWLoad.snapshot().state==="ready"',{timeout:150000}));
  await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
  if(hands){
    await page.evaluate(await readFile(new URL('tools/tests/lib.js',root),'utf8'));
    const lines=await page.evaluate(`(async()=>{
      const {clipCheck}=await import('/tools/tests/clip-check.js'),out=[];
      await clipCheck(TT,['ak'],(pass,s)=>out.push((pass?'PASS ':'FAIL ')+s),out);
      return out;
    })()`,150000);
    assert(lines.some(s=>s.includes('1 of 1'))&&lines.some(s=>s.includes('deepest per gun')));
    assert.deepEqual(page.errors,[]);verify();results[phase]=lines;console.log(phase,lines);
    await page.send('Page.close',{});continue;
  }
  await page.evaluate("document.getElementById('playerName').value='Index fit';document.getElementById('modeTraining').click()");
  assert(await page.waitFor("TT.trainingDbg.state().active&&!TT.trainingDbg.state().warming&&!document.getElementById('trainingBlackout')?.classList.contains('on')",{timeout:150000}));
  const r=await page.evaluate('('+measure.toString()+')()',120000);
  const state=JSON.parse(await readFile(new URL('./'+phase+'/guard.json',import.meta.url),'utf8'));
  assert.equal(r.hash,state.hash);assert.deepEqual(r.pin,state.pin);assert.deepEqual(page.errors,[]);
  verify();results[phase]=r;console.log(phase,r);await page.send('Page.close',{});
 }
 await save(new URL(hands?'./hand-comparison.json':'./timing.json',import.meta.url),JSON.stringify(results,null,2)+'\n');
}finally{await browser.close();await server.close();}

async function measure(){
 const T=TT;T.flightHold(true);T.grantAllWeapons();T.setViewFirstDbg(true);if(T.isUnarmed())T.toggleHolster();
 for(let i=0;i<18&&T.getCurrentWeapon()!=='ak';i++){T.setWeapon(T.WEAPON_ORDER.indexOf('ak'));for(let j=0;j<15;j++)T.stepFrame(1/30);}
 if(T.getCurrentWeapon()!=='ak')throw Error('KR-7 failed to equip');
 const range=T.trainingDbg.tg();T.player.position.set(range.origin.x,range.floorY,range.origin.z-5);
 T.setZoomHeldDbg(false);T.setOtsAimDbg(0,-.08);for(let j=0;j<75;j++)T.stepFrame(1/30);
 const {currentModel}=await import('/review/GT-20076/rank-visibility.mjs');
 const {artworkFingerprint}=await import('/tools/tests/weapon-seating.js');
 const hash=artworkFingerprint(currentModel(T,'ak')),pin=T.weaponMeshes.ak.userData.triggerPin;
 const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
 for(let i=0;i<20;i++)await frame();
 const intervals=[];let previous=await frame();
 for(let i=0;i<150;i++){const t=await frame();intervals.push(t-previous);previous=t;}
 intervals.sort((a,b)=>a-b);
 return {hash,pin,count:intervals.length,median:intervals[75],p95:intervals[142],eye:T.viewmodelDbg().info.active};
}
