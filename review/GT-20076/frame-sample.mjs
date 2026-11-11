import assert from 'node:assert/strict';
import {setTimeout as wait} from 'node:timers/promises';
import {createHash} from 'node:crypto';

export async function compiledBuild(page,origin,artPath){
  const modules=new Map();
  page.conn.onEvent(message=>{
    if(message.sessionId!==page.sessionId || message.method!=='Debugger.scriptParsed')return;
    const script=message.params;
    if(!script.url.startsWith(origin+'/'))return;
    const path=new URL(script.url).pathname;
    if(path.startsWith('/review/') || path.startsWith('/tools/') || (!path.endsWith('.js') && !path.endsWith('.mjs') && path!=='/index.html'))return;
    modules.set(path+'@'+script.startLine+','+script.startColumn,script.hash);
  });
  // Ask for compiled hashes only after collecting the frame samples.
  await page.send('Debugger.enable');await page.send('Debugger.disable');
  const rows=[...modules].sort(([a],[b])=>a.localeCompare(b));
  const art=rows.filter(([name])=>name.startsWith(artPath+'@'));
  assert(art.length && rows.length>20,'Missing loaded game scripts');
  const common=rows.filter(([name])=>!name.startsWith(artPath+'@'));
  return {common:createHash('sha256').update(JSON.stringify(common)).digest('hex'),art:Object.fromEntries(art),modules:Object.fromEntries(common)};
}

export async function sampleHigh(page,origin,id){
  const start=Date.now();
  await page.goto(origin+'/index.html?debug=1',{waitUntil:'none'});
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
  return result;
}
