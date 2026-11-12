import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
assert(process.env.DW_GAME_TEST_TOKEN);
const [phase,...ids]=process.argv.slice(2);assert(['before','after'].includes(phase)&&ids.length&&ids.every(id=>['pistol','revolver','uzi','aa12'].includes(id)));
const folder=new URL('final-visible-2026-11-12/',import.meta.url),server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{
 const page=await browser.newPage({width:1280,height:720});
 await page.goto(server.origin+'/index.html?debug=1&raf=timer');
 assert(await page.waitFor('window.TT&&DWLoad.snapshot().state==="ready"',{timeout:180000}));
 await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
 await page.evaluate("document.getElementById('playerName').value='Visible reload';document.getElementById('modeTraining').click()");
 assert(await page.waitFor("TT.trainingDbg.state().active&&!TT.trainingDbg.state().warming&&!document.getElementById('trainingBlackout')?.classList.contains('on')",{timeout:180000}));
 await page.evaluate("import('/review/GT-20076/final-visible-camera.mjs').then(m=>{window.finalViews=m.makeViews(TT,false,true);return true})");
 for(const id of ids){
  const dir=new URL(id+'/'+phase+'/',folder);await mkdir(dir,{recursive:true});
  await page.evaluate('finalViews.equip('+JSON.stringify(id)+')');
  await page.evaluate('TT.setAmmoDbg('+JSON.stringify(id)+',0);TT.startReload();true');
  const records=[];
  for(const fraction of [.25,.55]){
   await page.evaluate('TT.reloadClipDbg.hold('+fraction+');true');
   const camera=await page.evaluate("finalViews.pose('hip')");
   const state=await page.evaluate('TT.getReloadDbg()');
   assert.equal(state.weapon,id);assert(Math.abs(1-state.timer/state.anim-fraction)<.003);
   for(const light of ['noon','overcast','dusk','night']){
    await page.evaluate('finalViews.light('+JSON.stringify(light)+')');
    const round=await page.evaluate('(()=>{const s=TT.weaponMeshes['+JSON.stringify(id)+'].userData.magazineTopRound;if(!s)return null;const pair=TT.viewmodelDbg().gun.pairs.find(([p])=>p===s);return {world:s.visible,eye:pair?.[1].visible}})()');
    const shot=await page.send('Page.captureScreenshot',{format:'png'});
    await writeFile(new URL('reload-'+fraction+'-'+light+'.png',dir),Buffer.from(shot.data,'base64'));
    records.push({fraction,light,state,camera,round});
   }
  }
  await page.evaluate('TT.reloadClipDbg.hold(null);true');
  await writeFile(new URL('reloads.json',dir),JSON.stringify(records,null,2));console.log('PASS',id,phase,'native reload25/55%, four lights');
 }
 assert.deepEqual(page.errors,[]);
}finally{await browser.close();await server.close();}
