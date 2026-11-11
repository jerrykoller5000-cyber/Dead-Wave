import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
import {save} from '../GT-20076/save.mjs';

assert(process.env.DW_GAME_TEST_TOKEN);
const dir=new URL('./after/inspector/',import.meta.url);await mkdir(dir,{recursive:true});
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{
 const page=await browser.newPage({width:960,height:540});await page.goto(server.origin+'/index.html?inspect&debug=1&raf=timer');
 assert(await page.waitFor('window.DWInspect?.ready && !TT.trainingDbg.state().warming'));
 const info=await page.evaluate("DWInspect.show('weapon.ak',{instant:true})");assert.equal(info.id,'weapon.ak');
 await page.evaluate('window.reviewCentre='+JSON.stringify(info.center));
 const artwork=await page.evaluate(`(()=>{
   const G=TT.THREE,subjects=[],stageCentre=new G.Vector3(reviewCentre.x,reviewCentre.y,reviewCentre.z);
   TT.scene.traverseVisible(o=>{
     if(o.userData?.controls?.lightSwitch==='controls-lightSwitch-ak' && o.getWorldPosition(new G.Vector3()).distanceTo(stageCentre)<2)subjects.push(o);
   });
   if(subjects.length!==1)throw Error('Expected one KR-7 on the Inspector stage, found '+subjects.length);
   const g=subjects[0],u=g.userData.laserLightUnit;u.visible=true;
   const mark=g.getObjectByName(g.userData.controls.lightSwitch);
   return {lightVisible:u.visible,contact:mark.position.toArray(),axis:g.userData.lightSwitch.axis};
 })()`);
 assert(artwork.lightVisible && Math.abs(artwork.contact[1]+.002)<1e-7);
 for(const [view,light] of [['side','noon'],['three','overcast'],['rear3','dusk'],['three','night']]){
   await page.evaluate('DWInspect.light('+JSON.stringify(light)+');DWInspect.view('+JSON.stringify(view)+',{instant:true})');
   const shot=await page.evaluate("(async()=>{await DWInspect.stepAsync(5);return DWInspect.shot({type:'image/jpeg',quality:.92})})()");
   const bytes=Buffer.from(shot.split(',')[1],'base64');assert(bytes.length>4000);await save(new URL(light+'.jpg',dir),bytes);
 }
 await save(new URL('selection.json',dir),JSON.stringify({info,artwork},null,2)+'\n');assert.deepEqual(page.errors,[]);
 console.log('PASS Inspector fitted lamp visible in four lights',artwork);
}finally{await browser.close();await server.close();}
