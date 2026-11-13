import fs from 'node:fs';import path from 'node:path';import{fileURLToPath}from'node:url';import assert from'node:assert/strict';
import{serve}from'../../tools/serve.mjs';import{launch}from'../../tools/cdp.mjs';
if(!process.env.DW_GAME_TEST_TOKEN)throw Error('Use crew slot');
const phase=process.argv[2]||'before',root=fileURLToPath(new URL('../..',import.meta.url)),out=path.join(root,'review/GP-20129'),report={phase,scope:'UI fixture, not model/persistence proof'},server=await serve(root,0),browser=await launch({headless:false});
try{
const p=await browser.newPage({width:1280,height:720});await p.goto(server.origin+'/review/GP-20129/furniture.html');await p.waitFor('window.fixtureReady');
await p.screenshot(path.join(out,'furniture-'+phase+'-desktop.png'));
report.before=await p.evaluate('({buttons:document.querySelectorAll("[data-furniture]").length,current:fixture.current})');
if(phase==='before')assert.equal(report.before.buttons,0);
else{
 assert.equal(report.before.buttons,2);assert.equal(report.before.current,'wood');
 for(const key of['synthetic','wood']){
 const r=await p.evaluate(`new Promise(resolve=>{document.querySelector('[data-furniture="${key}"]').click();requestAnimationFrame(()=>requestAnimationFrame(()=>resolve({current:fixture.current,pressed:document.querySelector('[data-furniture="${key}"]').getAttribute('aria-pressed')})));})`);
 assert.deepEqual(r,{current:key,pressed:'true'});
 }
 const rejected=await p.evaluate(`(()=>{fixture.reject(true);document.querySelector('[data-furniture="synthetic"]').click();return{current:fixture.current,wood:document.querySelector('[data-furniture="wood"]').getAttribute('aria-pressed')};})()`);
 assert.deepEqual(rejected,{current:'wood',wood:'true'});
 await p.evaluate('armoryFixture.bench("m4")');assert.equal(await p.evaluate('document.querySelectorAll("[data-furniture]").length'),0);
 await p.evaluate('armoryFixture.bench("ak");armoryFixture.render();armoryFixture.render()');assert.equal(await p.evaluate('document.querySelectorAll("[data-furniture]").length'),2);
 report.changes=await p.evaluate('fixture.changes');assert.equal(report.changes.length,3);
}
await p.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
await p.evaluate('document.querySelector(".armory-furniture")?.scrollIntoView({block:"center"})');await p.screenshot(path.join(out,'furniture-'+phase+'-narrow.png'));
report.errors=p.errors.slice();assert.equal(report.errors.length,0);console.log(JSON.stringify(report));
}catch(e){report.failure=String(e.stack||e);console.error(report.failure);process.exitCode=1;}
finally{fs.writeFileSync(path.join(out,'furniture-'+phase+'.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await server.close();}
