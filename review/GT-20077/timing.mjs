import assert from 'node:assert/strict';
import {setTimeout as wait} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
import {save} from '../GT-20076/save.mjs';

const [id,phase='baseline']=process.argv.slice(2);
assert(['baseline','revised','rework','action'].includes(phase));
assert(process.env.DW_GAME_TEST_TOKEN && /^[a-z0-9-]+$/.test(id));
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0);
const browser=await launch({headless:false});
try {
  const page=await browser.newPage({width:1280,height:720});
  const start=Date.now();
  await page.goto(server.origin+'/index.html?debug=1',{waitUntil:'none'});
  assert(await page.waitFor('window.DWOpening'));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  const readyMs=Date.now()-start;
  assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("TT.applyGraphicsPreset('high');document.getElementById('playerName').value='Art';document.getElementById('modeTraining').click()");
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:45000}));
  await page.evaluate('window.sampleGun='+JSON.stringify(id));
  await page.evaluate(`(async()=>{
    TT.grantAllWeapons();TT.setViewFirstDbg(true);
    if(TT.isUnarmed())TT.toggleHolster();
    const slot=TT.WEAPON_ORDER.indexOf(sampleGun);
    if(slot<0)throw Error('Unknown sample model');
    for(let i=0;i<30 && TT.getCurrentWeapon()!==sampleGun;i++){
      TT.setWeapon(slot);await new Promise(r=>setTimeout(r,120));
    }
  })()`);
  assert(await page.waitFor('TT.viewmodelDbg().info.key===sampleGun && TT.viewmodelDbg().info.raise>.98 && TT.fpDbg().w>.98'));
  const samples=[];
  for(let second=0;second<12;second++){
    await wait(1000);
    const snap=await page.evaluate('({weapon:TT.getCurrentWeapon(),eye:TT.viewmodelDbg().info.key,high:TT.getGfx(),...TT.perfSnapshot()})');
    assert.equal(snap.weapon,id);assert.equal(snap.eye,id);assert.equal(snap.high,'high');
    samples.push(snap);
  }
  const last=samples.slice(-10);
  const mean=key=>Math.round(last.reduce((a,v)=>a+v[key],0)*10/last.length)/10;
  const result={weapon:id,readyMs,fps:mean('fps'),low:mean('low'),samples};
  assert(result.fps>0 && result.low>0);
  await save(new URL('./'+id+'/'+(phase==='baseline'?'timing.json':'timing-'+phase+'.json'),import.meta.url),JSON.stringify(result,null,2));
  assert.deepEqual(page.errors,[]);
  console.log('PASS '+id+' held and at eye for all 12 samples: ready '+readyMs+' ms; '+result.fps+' fps, '+result.low+' fps low');
} finally {await browser.close();await server.close()}
