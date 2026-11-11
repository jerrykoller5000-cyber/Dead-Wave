import assert from 'node:assert/strict';
import {setTimeout as wait} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
import {launch} from '../../tools/cdp.mjs';
import {serve} from '../../tools/serve.mjs';
import {save} from '../GT-20076/save.mjs';

const [id,optic=id==='m4'?'acog':'rmr']=process.argv.slice(2);
assert(['acog','rmr','prism','nx8'].includes(optic));
assert(process.env.DW_GAME_TEST_TOKEN && /^[a-z0-9-]+$/.test(id));
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0);
const browser=await launch({headless:false});
try {
  const page=await browser.newPage({width:1280,height:720});
  const previous=process.argv.includes('--previous-aa12');
  if(previous){
    assert.equal(id,'aa12');
    const {previousMask}=await import('./aa12/previous-mask.mjs');
    await previousMask(page,server.origin);
  }
  const start=Date.now();
  await page.goto(server.origin+'/index.html?debug=1',{waitUntil:'none'});
  assert(await page.waitFor('window.DWOpening'));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  const readyMs=Date.now()-start;
  assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("TT.applyGraphicsPreset('high');document.getElementById('playerName').value='Finish';document.getElementById('modeTraining').click()");
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:45000}));
  await page.evaluate('window.testGun='+JSON.stringify(id));
  await page.evaluate(`(async()=>{
    TT.grantAllWeapons();TT.modsOwnAllDbg();TT.setViewFirstDbg(true);
    if(TT.isUnarmed())TT.toggleHolster();
    for(let i=0;i<30 && TT.getCurrentWeapon()!==testGun;i++){
      TT.setWeapon(TT.WEAPON_ORDER.indexOf(testGun));await new Promise(r=>setTimeout(r,120));
    }
    const mods=TT.armoryDbg.mods(testGun);
    for(const key of ['suppressor','laserLight','optic:'+${JSON.stringify(optic)}]){
      if(mods.some(m=>m.id===key) && !TT.armoryDbg.fit(testGun,key,true))throw Error(key+' install failed');
    }
  })()`);
  assert(await page.waitFor('TT.viewmodelDbg().info.key===testGun && TT.viewmodelDbg().info.raise>.98'));
  if(previous)assert(await page.evaluate('!TT.weaponMeshes.aa12.userData.partFinish'));
  const result={id,optic,readyMs,states:{}};
  for(const [phase,key] of [['factory',''],['m81','m81'],['restored','']]){
    assert(await page.evaluate('TT.armoryFinishDbg.paint(testGun,'+JSON.stringify(key)+')'));
    if(previous && phase==='m81'){
      const drum=await page.evaluate('(()=>{let visible=0;TT.weaponMeshes.aa12.userData.mag.traverse(o=>{if(o.isMesh&&o.material.map)visible++});return visible})()');
      assert(drum>0,'Previous M81 mask must paint the drum');
    }
    await wait(1500);
    const samples=[];
    for(let second=0;second<12;second++){
      await wait(1000);
      const sample=await page.evaluate('({eye:TT.viewmodelDbg().info.key,optic:testGun==="sniper"&&TT.weaponMeshes.sniper.getObjectByName("optic.nx8")?.visible?"nx8":TT.weaponMeshes[testGun].userData.fittedOptic?.userData.kind,finish:TT.armoryFinishDbg.list(testGun).current,gfx:TT.getGfx(),...TT.perfSnapshot()})');
      assert.equal(sample.eye,id);assert.equal(sample.optic,optic);assert.equal(sample.finish,key);assert.equal(sample.gfx,'high');
      samples.push(sample);
    }
    const mean=property=>Math.round(samples.slice(-10).reduce((sum,s)=>sum+s[property],0))/10;
    result.states[phase]={fps:mean('fps'),low:mean('low'),samples};
    console.log(phase,result.states[phase].fps,'fps;',result.states[phase].low,'low');
  }
  let file=process.argv[3]?'timing-'+optic+'.json':'timing.json';
  if(process.argv.includes('--baseline'))file='timing-baseline.json';
  if(process.argv.includes('--rack'))file='timing-rack.json';
  if(process.argv.includes('--repeat'))file='timing-repeat.json';
  if(process.argv.includes('--shared-metal'))file=process.argv.includes('--repeat')?'timing-shared-repeat.json':'timing-shared-metal.json';
  if(previous)file='timing-previous-mask.json';
  await save(new URL('./'+id+'/'+file,import.meta.url),JSON.stringify(result,null,2));
  assert.deepEqual(page.errors,[]);
} finally {await browser.close();await server.close()}
