import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {serve} from '../tools/serve.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const out='review/range-usability', before=process.argv.includes('--before'), prefix=before?'before':'after';
const srv=await serve(process.cwd(),0); let browser;
try {
  browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
  const p=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
  p.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});
  if(before)for(const ext of ['css','js'])await p.route('**/ui/armory.'+ext,r=>r.fulfill({contentType:ext==='css'?'text/css':'text/javascript',body:fs.readFileSync(out+'/armory-before.'+ext,'utf8')}));
  await p.goto(srv.origin+'/index.html?debug=1&raf=timer',{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:45000});
  await p.evaluate(()=>{DWOpening.dismissForTesting();document.getElementById('playerName').value='Range review';document.getElementById('modeTraining').click();});
  await p.waitForFunction(()=>TT.trainingDbg.state().active);
  if(!before){
    await p.evaluate(()=>document.activeElement?.blur());await p.waitForTimeout(500);
    if(await p.evaluate(()=>TT.isUnarmed()))await p.evaluate(()=>TT.toggleHolster());
    await p.keyboard.press('Digit2');await p.waitForTimeout(150);
    assert(await p.evaluate(()=>TT.flashlight.intensity>0),'drawn weapon flashlight on');
    await p.evaluate(()=>TT.toggleHolster());await p.waitForTimeout(150);
    assert.equal(await p.evaluate(()=>TT.flashlight.intensity),0,'holstered beam off');
    await p.keyboard.press('Digit2');await p.waitForTimeout(100);
    assert.equal(await p.evaluate(()=>TT.flashlight.intensity),0,'cannot light while unarmed');
    await p.evaluate(()=>TT.toggleHolster());await p.waitForTimeout(150);
    assert(await p.evaluate(()=>TT.flashlight.intensity>0),'drawing restores chosen flashlight setting');
    await p.keyboard.press('Digit2');
  }
  await p.evaluate(()=>{TT.grantAllWeapons();TT.openCIF();document.getElementById('cif').classList.add('armory-only');TT.armoryDbg.ui().open();TT.armoryDbg.ui().bench('m4');});
  await p.waitForTimeout(400);
  const sizes=[];
  for(const [w,h] of [[1440,900],[1280,720],[1366,768],[390,844]]){
    await p.setViewportSize({width:w,height:h});await p.waitForTimeout(100);
    const size=await p.evaluate(()=>{const e=document.getElementById('armoryPanel'),b=e.getBoundingClientRect();return{width:innerWidth,client:e.clientHeight,scroll:e.scrollHeight,x:b.x,right:b.right,shelf:document.querySelector('.armory-shelf').children.length};});sizes.push(size);
    if(!before){assert(size.x>=0&&size.right<=w+1,'panel within viewport');if(w>=1000)assert(size.scroll<=size.client+1,'no desktop scrolling: '+JSON.stringify(size));}
    await p.screenshot({path:out+'/'+prefix+'-armory-'+w+'.jpg',type:'jpeg',quality:90});
  }
  if(!before){
    await p.setViewportSize({width:1280,height:720});
    for(const kind of ['pistol','uzi','revolver','m4','ak','aa12','shotgun','sniper','launcher','flamer','minigun','chainsaw']){
      await p.evaluate(k=>TT.armoryDbg.ui().bench(k),kind);
      assert(await p.evaluate(()=>{const e=document.getElementById('armoryPanel');return e.scrollHeight<=e.clientHeight+1;}),'bench fits: '+kind);
    }
    await p.locator('[data-slot="primary:0"]').click();
    await p.locator('.armory-actions button').first().click();
    await p.locator('[data-gun="shotgun"]').click();
    assert.match(await p.locator('[data-slot="primary:0"]').innerText(),/Shotgun/i);
    for(const slot of ['primary:0','primary:1','secondary:0','secondary:1']){
      await p.locator('[data-slot="'+slot+'"]').click();await p.locator('.armory-actions button').first().click();
    }
    assert(await p.evaluate(()=>{const e=document.getElementById('armoryPanel');return e.scrollHeight<=e.clientHeight+1;}),'full stored arsenal fits');
  }
  assert.deepEqual(errors,[]);
  fs.writeFileSync(out+'/'+prefix+'-checks.json',JSON.stringify({sizes,errors},null,2));
  console.log('PASS '+prefix+' armory layouts'+(!before?', all 12 benches fit at 1280x720; slot swap and holster/flashlight checks':''));
}finally{await browser?.close();srv.close();}
