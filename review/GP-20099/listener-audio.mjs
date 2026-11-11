import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';

if(!process.env.DW_GAME_TEST_TOKEN)throw Error('Use the crew game-test slot');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const out=path.join(root,'review/GP-20099');
const server=await serve(root,0),browser=await launch({headless:false,args:['--window-size=1280,720']});
let page;
try{
  page=await browser.newPage({width:1280,height:720});
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`);
  assert(await page.waitFor('!!window.TT && DWLoad?.snapshot().state==="ready"',{timeout:90000}),'boot');
  await page.evaluate(`(()=>{DWOpening.dismissForTesting();document.getElementById('playerName').value='Action listener';document.getElementById('modeTraining').click()})()`);
  assert(await page.waitFor('TT.trainingDbg.state().active && document.getElementById("opening").hidden && !document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:60000}),'Training');
  const result=await page.evaluate(`(async()=>{
    const {AudioSys:A}=await import('/core/audio.js');
    A.unlock();A.setMuted(false);
    // AudioSys wraps its context's create* methods at construction, so intercept
    // the scheduled source prototype reached by each newly made node instead.
    const protos=[AudioBufferSourceNode.prototype,OscillatorNode.prototype,ConstantSourceNode.prototype];
    const oldStarts=protos.map(p=>p.start);
    const events=[];let tag='',started=0;
    protos.forEach((p,i)=>{p.start=function(...a){started++;events.push({tag,kind:this.constructor.name,at:performance.now()});return oldStarts[i].apply(this,a)}});
    const wait=ms=>new Promise(r=>setTimeout(r,ms));
    const checks=[];
    async function check(name,fn,delay=140){tag=name;const a=started;fn();await wait(delay);checks.push({name,started:started-a,sources:events.filter(e=>e.tag===name).map(e=>e.kind)});}
    const guns=['pistol','uzi','m4','ak','shotgun','aa12','revolver','sniper','minigun','flamer','launcher'];
    for(const gun of guns)await check('shot:'+gun,()=>A.fireWeapon(gun),220);
    for(const cue of ['magRelease','magOut','magIn','magSlap','slideBack','slideFwd','akRockOut','akRockIn','drumOut','drumIn','boltUp','boltBack','boltFwd','boltDown','boxLatch','belt','boxSeat','shell','bigBrass','grab','valveShut','valveOpen','tankOff','tankOn','igniter','motorBlip','charge','brass'])await check('reload:'+cue,()=>A.reloadCue(cue),120);
    await check('dryfire',()=>A.emptyClick());
    await check('ammo-switch',()=>A.reloadCue('shell'));
    await check('fire-selector',()=>A.selectorClick('auto'));
    for(const cue of ['open','target','impact','spawn','clear','reset','wake','door:0.8:0.5','blackout'])await check('training:'+cue,()=>A.trainingCue(cue));
    await check('keypad',()=>A.clip('keypadPress'));
    await check('flamer-burn',()=>A.flameBurst());
    await check('launcher-pop',()=>A.trainingCue('target'));
    await check('chainsaw-dry-pull',()=>A.chainsawDryPull());
    await check('chainsaw-start',()=>A.chainsawStart());
    await check('chainsaw-grit',()=>A.chainsawGrit());A.chainsawStop();
    // The recorded bolt and belt are one 1.15/1.3 s take for several
    // mechanical substeps. Confirm the skipped substeps sound when isolated.
    for(const cue of ['boltFwd','boltDown','boxSeat']){await wait(1400);await check('isolated:'+cue,()=>A.reloadCue(cue));}
    protos.forEach((p,i)=>{p.start=oldStarts[i]});
    return {training:A.trainingState(),mix:A.mixState(),checks,events:events.length};
  })()`);
  fs.writeFileSync(path.join(out,'listener-audio.json'),JSON.stringify({result,pageErrors:page.errors},null,2));
  const silent=result.checks.filter(c=>!c.started);
  const grouped=['reload:boltFwd','reload:boltDown','reload:boxSeat'];
  console.log(`Listener ${result.checks.length} cues, ${result.events} started sources, grouped take suppression: ${silent.map(c=>c.name).join(', ')||'none'}, page errors ${page.errors.length}`);
  assert.equal(result.training.enabled,true);
  assert.deepEqual(page.errors,[]);
  assert.deepEqual(silent.map(c=>c.name),grouped,'only the overlapping mechanical take substeps are suppressed');
}finally{if(page)await page.close();await browser.close();await server.close();}
