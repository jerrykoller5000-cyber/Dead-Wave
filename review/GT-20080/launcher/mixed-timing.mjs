import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {serve} from '../../../tools/serve.mjs';
import {launch} from '../../../tools/cdp.mjs';
import {save} from '../../GT-20076/save.mjs';
assert(process.env.DW_GAME_TEST_TOKEN);
const server=await serve(fileURLToPath(new URL('../../../',import.meta.url)),0),browser=await launch({headless:false});
try{
  const page=await browser.newPage({width:1280,height:720});
  await page.goto(server.origin+'/index.html?debug=1');
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("TT.applyGraphicsPreset('high');document.getElementById('playerName').value='Mixed display';document.getElementById('modeTraining').click()");
  assert(await page.waitFor("TT.trainingDbg.state().active && !document.getElementById('trainingBlackout')?.classList.contains('on')"));
  await page.evaluate(`(async()=>{
    TT.grantAllWeapons(); TT.setViewFirstDbg(true); if(TT.isUnarmed())TT.toggleHolster();
    const slot=TT.WEAPON_ORDER.indexOf('launcher');
    for(let i=0;i<30 && TT.getCurrentWeapon()!=='launcher';i++){TT.setWeapon(slot);await new Promise(r=>setTimeout(r,130));}
  })()`);
  assert(await page.waitFor('TT.viewmodelDbg().info.key==="launcher" && TT.viewmodelDbg().info.raise>.98'));
  const runs=await page.evaluate(`(async()=>{
    const {updateArtworkInstances}=await import('/studio/weapon-model-hooks.js'),g=TT.weaponMeshes.launcher;
    const runs=[];
    for(const live of [6,3,6,3]){
      TT.setAmmoDbg('launcher',live);
      const apply=()=>{const eye=TT.viewmodelDbg().gun.root;
        g.userData.drumNoses.forEach((n,i)=>{n.visible=i<live;eye.getObjectByName(n.name).visible=n.visible;});
        updateArtworkInstances(TT.THREE,g);updateArtworkInstances(TT.THREE,eye);
      };
      apply();await new Promise(r=>setTimeout(r,1800));apply();
      const frames=[];let last=await new Promise(requestAnimationFrame),start=last;
      while(last-start<6000){
        const now=await new Promise(requestAnimationFrame);frames.push(now-last);last=now;
        const eye=TT.viewmodelDbg().gun.root;
        if(eye.getObjectByName('launcher-loaded-inserts').count!==live ||
          eye.getObjectByName('launcher-spent-inserts').visible!==(live<6) || TT.getGfx()!=='high')throw Error('Wrong timed appearance');
      }
      const sorted=frames.slice().sort((a,b)=>a-b);
      runs.push({live,mean:frames.reduce((a,b)=>a+b,0)/frames.length,p99:sorted[Math.ceil(.99*sorted.length)-1],frames});
    }return runs;
  })()`,90000);
  await save(new URL('./ce6-mixed-timing.json',import.meta.url),JSON.stringify(runs,null,2));
  console.log(runs.map(r=>r.live+' live, '+r.mean.toFixed(2)+' ms mean, '+r.p99.toFixed(2)+' ms p99').join(' | '));
  assert.deepEqual(page.errors,[]);
}finally{await browser.close();await server.close();}
