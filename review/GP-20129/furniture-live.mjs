import fs from 'node:fs';import path from 'node:path';import{fileURLToPath}from'node:url';import assert from'node:assert/strict';
import{serve}from'../../tools/serve.mjs';import{launch}from'../../tools/cdp.mjs';
if(!process.env.DW_GAME_TEST_TOKEN)throw Error('Use crew slot');
const phase=process.argv[2]||'before',root=fileURLToPath(new URL('../..',import.meta.url)),out=path.join(root,'review/GP-20129'),report={phase,scope:'Native game UI and KR-7 copies'},pause=ms=>new Promise(r=>setTimeout(r,ms)),server=await serve(root,0),browser=await launch({headless:false});
try{
let p=await browser.newPage({width:1280,height:720});const load=async()=>{await p.goto(server.origin+'/index.html?debug=1',{timeout:300000});assert(await p.waitFor('!!window.TT && DWLoad.snapshot().state==="ready"',{timeout:300000}));await p.evaluate('DWOpening.dismissForTesting()');await p.waitFor('!DWOpening.active');};
await load();await p.evaluate('document.getElementById("playerName").value="KR7 furniture QA";document.getElementById("modeTraining").click()');assert(await p.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:150000}));
await p.evaluate('(()=>{const T=TT,t=T.trainingDbg.tg(),f=t.stations.armory.front;T.grantAllWeapons();T.player.position.set(f.x,t.floorY,f.z);T.doAction();T.armoryDbg.ui().bench("ak");})()');await pause(700);await p.screenshot(path.join(out,'furniture-native-'+phase+'-wood.png'));
report.initial=await p.evaluate('({buttons:document.querySelectorAll("[data-furniture]").length,state:TT.getWardrobe().furniture,copy:[TT.carryGunCopyDbg("ak").getObjectByName("KR-7 furniture wood").visible,TT.carryGunCopyDbg("ak").getObjectByName("KR-7 furniture synthetic").visible],stored:localStorage.getItem("tt_wardrobe")})');
if(phase==='before')assert.equal(report.initial.buttons,0);
else{
 assert.equal(report.initial.buttons,2);assert.deepEqual(report.initial.copy,[true,false]);
 await p.evaluate('document.querySelector("[data-furniture=synthetic]").click()');await pause(700);await p.screenshot(path.join(out,'furniture-native-after-synthetic.png'));
 report.synthetic=await p.evaluate('({state:TT.getWardrobe().furniture,copy:[TT.carryGunCopyDbg("ak").getObjectByName("KR-7 furniture wood").visible,TT.carryGunCopyDbg("ak").getObjectByName("KR-7 furniture synthetic").visible],stored:localStorage.getItem("tt_wardrobe"),pressed:document.querySelector("[data-furniture=synthetic]").getAttribute("aria-pressed")})');
 assert.equal(report.synthetic.state.ak,'synthetic');assert.deepEqual(report.synthetic.copy,[false,true]);assert.equal(report.synthetic.stored,report.initial.stored,'Training never saves appearance');assert.equal(report.synthetic.pressed,'true');
 const woodSignature='(()=>{const a=[];TT.carryGunCopyDbg("ak").getObjectByName("KR-7 furniture wood").traverse(o=>{if(o.isMesh)a.push([o.material.color.getHex(),o.material.map?.uuid||null]);});return a;})()';
 const woodBefore=await p.evaluate(woodSignature);
 await p.evaluate('document.querySelector("[data-finish=m81]").click()');await pause(500);
 report.paint=await p.evaluate('(()=>{const g=TT.carryGunCopyDbg("ak"),a=[];g.getObjectByName("KR-7 furniture synthetic").traverse(o=>{if(o.isMesh)a.push(!!o.material.map);});return{finish:TT.getWardrobe().guns.ak,syntheticPaint:a};})()');assert.equal(report.paint.finish,'m81');assert(report.paint.syntheticPaint.length&&report.paint.syntheticPaint.every(Boolean));assert.deepEqual(await p.evaluate(woodSignature),woodBefore,'painting synthetic must not paint wood');
 await p.evaluate('document.querySelector(".armory-furniture").scrollIntoView({block:"center"})');await p.screenshot(path.join(out,'furniture-native-after-controls.png'));
 await p.evaluate('TT.armoryDbg.ui().close();TT.takeOutGun("ak");TT.setWeapon(TT.WEAPON_ORDER.indexOf("ak"));TT.setViewFirstDbg(true);TT.setUnarmedDbg(false)');assert(await p.waitFor('TT.viewmodelDbg()?.gun?.key==="ak"',{timeout:10000}));await pause(600);
 report.eye=await p.evaluate('(()=>{const g=TT.viewmodelDbg().gun.root;return{uuid:g.uuid,wood:g.getObjectByName("KR-7 furniture wood").visible,synthetic:g.getObjectByName("KR-7 furniture synthetic").visible};})()');assert.equal(report.eye.wood,false);assert.equal(report.eye.synthetic,true);await p.screenshot(path.join(out,'furniture-native-after-eye.png'));
 await p.evaluate('TT.openCIF();TT.armoryDbg.ui().open();TT.armoryDbg.ui().bench("ak")');
 await p.evaluate('document.querySelector("[data-furniture=wood]").click()');await pause(100);await p.evaluate('TT.armoryDbg.ui().close();TT.closeCIF()');assert.equal(await p.evaluate('TT.isCIFOpen()'),false);await pause(300);
 report.eyeWood=await p.evaluate('(()=>{const g=TT.viewmodelDbg().gun.root;return{uuid:g.uuid,wood:g.getObjectByName("KR-7 furniture wood").visible,synthetic:g.getObjectByName("KR-7 furniture synthetic").visible,finish:TT.getWardrobe().guns.ak,state:TT.getWardrobe().furniture,source:TT.carryGunCopyDbg("ak").getObjectByName("KR-7 furniture wood").visible};})()');assert.equal(report.eyeWood.uuid,report.eye.uuid);assert.equal(report.eyeWood.wood,true);assert.equal(report.eyeWood.synthetic,false);assert.equal(report.eyeWood.finish,'m81');
 await p.evaluate('TT.openCIF();TT.armoryDbg.ui().open();TT.armoryDbg.ui().bench("ak");document.querySelector("[data-furniture=synthetic]").click()');await pause(150);
 await p.evaluate('TT.setWardrobeItem("shirt",{sleeves:"rolled"});TT.armoryDbg.ui().render()');assert.equal(await p.evaluate('TT.getWardrobe().furniture.ak'),'synthetic');
 await p.evaluate('TT.trainingDbg.leave();TT.armoryDbg.ui().render()');await pause(100);
 report.leave=await p.evaluate('({state:TT.getWardrobe().furniture,copy:[TT.carryGunCopyDbg("ak").getObjectByName("KR-7 furniture wood").visible,TT.carryGunCopyDbg("ak").getObjectByName("KR-7 furniture synthetic").visible]})');assert.equal(report.leave.state.ak,'wood');assert.deepEqual(report.leave.copy,[true,false]);
 await p.evaluate('document.querySelector("[data-furniture=synthetic]").click()');await pause(150);report.persist=await p.evaluate('({training:TT.trainingDbg.state().active,phase:TT.getPhase(),state:TT.getWardrobe().furniture,stored:JSON.parse(localStorage.getItem("tt_wardrobe"))?.furniture})');assert.equal(report.persist.training,false);assert.equal(report.persist.stored.ak,'synthetic');
 // Destroy the old game target before loading a fresh one. Re-navigating a live GPU game timed out in CDP.
 report.firstPageErrors=p.errors.slice();assert.equal(report.firstPageErrors.length,0);await p.close();p=await browser.newPage({width:1280,height:720});
 await load();report.reload=await p.evaluate('({state:TT.getWardrobe().furniture,copy:[TT.carryGunCopyDbg("ak").getObjectByName("KR-7 furniture wood").visible,TT.carryGunCopyDbg("ak").getObjectByName("KR-7 furniture synthetic").visible]})');assert.equal(report.reload.state.ak,'synthetic');assert.deepEqual(report.reload.copy,[false,true]);
}
report.errors=p.errors.slice();assert.equal(report.errors.length,0);console.log(JSON.stringify(report));
}catch(e){report.failure=String(e.stack||e);console.error(report.failure);process.exitCode=1;}
finally{fs.writeFileSync(path.join(out,'furniture-native-'+phase+'.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await server.close();}
