import fs from 'node:fs';import assert from 'node:assert/strict';import{createRequire}from'node:module';import{serve}from'../tools/serve.mjs';
const{chromium}=createRequire(import.meta.url)('playwright'),out='review/training-start',before=process.argv.includes('--before'),phase=before?'before':'after',srv=await serve(process.cwd(),0);let browser;
fs.mkdirSync(out,{recursive:true});const timer=setTimeout(()=>process.exit(2),115000);
try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
 const p=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(srv.origin+'/index.html?debug=1&raf=timer',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:60000});
 await p.evaluate(()=>{DWOpening.dismissForTesting();document.getElementById('playerName').value='Training check';document.getElementById('modeTraining').click();});
 await p.waitForFunction(()=>TT.trainingDbg.state().active&&!document.getElementById('trainingBlackout')?.classList.contains('on'));
 const initial=await p.evaluate(()=>({owned:TT.getWeaponOwned(),gear:TT.getGearOwned(),armor:TT.getArmor(),current:TT.getCurrentWeapon(),cash:TT.getBank(),machete:TT.isMacheteOwned(),grenades:TT.grenadeArcDbg().n}));
 await p.screenshot({path:`${out}/${phase}-entry.png`});
 await p.evaluate(()=>{const tg=TT.trainingDbg.tg(),f=tg.stations.kiosk.front;TT.player.position.set(f.x,tg.floorY,f.z);TT.doAction();});
 await p.locator('#shop.show').waitFor();await p.locator('[data-shop-page="weapons"]').click();
 await p.screenshot({path:`${out}/${phase}-kiosk.png`});
 if(!before){
  assert.deepEqual(Object.keys(initial.owned).filter(k=>initial.owned[k]),['pistol']);assert.equal(initial.current,'pistol');assert(Object.values(initial.gear).every(v=>!v));assert.equal(initial.armor,0);assert.equal(initial.machete,false);assert.equal(initial.grenades,0);
  assert(await p.locator('[data-weapon="minigun"]').count(),'late-stock gun offered in Training');
  await p.locator('[data-weapon="m4"] .weapon-actions > button').first().click();
  assert(await p.evaluate(()=>TT.getWeaponOwned().m4));assert.equal(await p.evaluate(()=>TT.getBank()),initial.cash);
  await p.evaluate(()=>TT.buyGear(TT.GEAR.find(g=>g.key==='helmet')));assert(await p.evaluate(()=>TT.getGearOwned().helmet));assert.equal(await p.evaluate(()=>TT.getBank()),initial.cash);
  await p.evaluate(()=>{TT.closeShop();TT.trainingDbg.start();});
  await p.waitForFunction(()=>!document.getElementById('trainingBlackout')?.classList.contains('on'));
  assert.deepEqual(await p.evaluate(()=>Object.keys(TT.getWeaponOwned()).filter(k=>TT.getWeaponOwned()[k])),['pistol']);assert(await p.evaluate(()=>Object.values(TT.getGearOwned()).every(v=>!v)));
  await p.evaluate(()=>TT.resetGame());await p.evaluate(fs.readFileSync('tools/tests/lib.js','utf8'));const encoding=await p.evaluate(fs.readFileSync('tools/tests/t215.js','utf8'));fs.writeFileSync(out+'/t215.txt',encoding);assert(!encoding.includes('FAIL'),encoding);
  assert.equal(await p.evaluate(()=>TT.getBank()),40);await p.evaluate(()=>TT.buyWeapon('minigun'));assert(!(await p.evaluate(()=>TT.getWeaponOwned().minigun)),'normal game retains night stock gate');assert(await p.evaluate(()=>TT.getGearOwned().flashlight),'normal game retains issued flashlight');
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/${phase}-checks.json`,JSON.stringify({initial,errors},null,2));console.log('PASS '+phase+': '+JSON.stringify(initial)+(before?'':' — kiosk purchase, unlimited funds, fresh reentry and t215 pass')+'; zero page errors.');
}finally{clearTimeout(timer);await browser?.close();srv.close();}
