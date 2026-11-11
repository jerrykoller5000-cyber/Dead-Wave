import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
import {save} from './save.mjs';

assert(process.env.DW_GAME_TEST_TOKEN);
const root=new URL('../../',import.meta.url),asset='/studio/weapon-longarms.js';
const dir=new URL('./visible-repairs/aa12/carry/',import.meta.url);await mkdir(dir,{recursive:true});
const landed=await readFile(new URL('studio/weapon-longarms.js',root),'utf8');
const start=landed.indexOf('    // The decorative face, bead and concentric badges');
const landedEnd=landed.indexOf('    for (let i = 0; i < 8; i++)',start);
assert(start>0 && landedEnd>start);
const trial=landed.slice(start,landedEnd)
  .replace('    K.cyl(0.137, 0.137, 0.005, gunBody, 0, 0, sz * 0.065, drumBody, 32);','    faceLayer(0.135, 0.135, 0.065, 0.0675, gunBody, 24);')
  .replace('K.tor(0.139, 0.002, gunDark, 0, 0, sz * 0.068, 0, 0, 0, drumBody, Math.PI * 2, 32)','K.tor(0.138, 0.003, gunDark, 0, 0, sz * 0.068, 0, 0, 0, drumBody, Math.PI * 2, 24)');
const source=landed.slice(0,start)+trial+landed.slice(landedEnd),end=start+trial.length;
const prior=source.slice(0,start)+
  '    K.cyl(0.137, 0.137, 0.005, gunBody, 0, 0, sz * 0.065, drumBody, 32);\n'+
  '    K.tor(0.138, 0.003, gunDark, 0, 0, sz * 0.068, 0, 0, 0, drumBody, Math.PI * 2, 24);\n'+
  '    K.cyl(0.059, 0.062, 0.009, gunDark, 0, 0, sz * 0.071, drumBody, 24);\n'+
  '    K.cyl(0.05, 0.052, 0.004, gunBody, 0, 0, sz * 0.077, drumBody, 24);\n'+
  '    K.cyl(0.017, 0.019, 0.009, gunDark, 0, 0, sz * 0.082, drumBody, 12);\n'+source.slice(end);
const oldFace='    K.cyl(0.137, 0.137, 0.005, gunBody, 0, 0, sz * 0.065, drumBody, 32);';
const newFace='    faceLayer(0.135, 0.135, 0.065, 0.0675, gunBody, 24);';
const oldMarks=prior.slice(prior.indexOf('    K.cyl(0.059, 0.062, 0.009',start),prior.indexOf('    for (let i = 0; i < 8; i++)',start));
const newMarks=source.slice(source.indexOf('    faceLayer(0.059',start),end);
assert(source.includes(newFace) && oldMarks.length>100 && newMarks.length>100);
const variants={original:prior,current:source,finalArt:landed,discOnly:source.replace(newMarks,oldMarks),badgesOnly:source.replace(newFace,oldFace),
  rimOnly:prior.replace('K.tor(0.138, 0.003, gunDark, 0, 0, sz * 0.068, 0, 0, 0, drumBody, Math.PI * 2, 24)',
    'K.tor(0.139, 0.002, gunDark, 0, 0, sz * 0.068, 0, 0, 0, drumBody, Math.PI * 2, 32)')};
const currentRing='K.tor(0.138, 0.003, gunDark, 0, 0, sz * 0.068, 0, 0, 0, drumBody, Math.PI * 2, 24)';
const rimAtEdge='K.tor(0.139, 0.002, gunDark, 0, 0, sz * 0.068, 0, 0, 0, drumBody, Math.PI * 2, 32)';
variants.preserveOutline=source.replace(newFace,'    faceLayer(0.137, 0.137, 0.065, 0.0675, gunBody, 32);').replace(currentRing,rimAtEdge);
variants.keepDisc=variants.badgesOnly.replace(currentRing,rimAtEdge);
const modes=process.argv.includes('--landed')?['original','finalArt']:process.argv.includes('--finalists')?['preserveOutline','keepDisc']:
  process.argv.includes('--isolate')?['discOnly','badgesOnly','rimOnly']:['original','current'];
const server=await serve(fileURLToPath(root),0),browser=await launch({headless:false});
try{
  const page=await browser.newPage({width:960,height:540});
  let selected='original',served=0;
  page.conn.onEvent(msg=>{
    if(msg.sessionId!==page.sessionId || msg.method!=='Fetch.requestPaused')return;
    const {request,requestId}=msg.params;
    if(new URL(request.url).pathname!==asset)throw Error('Unexpected comparison path');
    served++;
    const text=variants[selected];
    page.send('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'text/javascript; charset=utf-8'},{name:'Cache-Control',value:'no-store'}],body:Buffer.from(text).toString('base64')}).catch(e=>page.errors.push(e.message));
  });
  await page.send('Network.setCacheDisabled',{cacheDisabled:true});
  await page.send('Fetch.enable',{patterns:[{urlPattern:server.origin+asset+'*'}]});
  const results={};
  for(const mode of modes){
    selected=mode;
    await page.goto(server.origin+'/index.html?debug=1&raf=timer');
    assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
    await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
    await page.evaluate("document.getElementById('playerName').value='Carry comparison';document.getElementById('modeTraining').click()");
    assert(await page.waitFor("TT.trainingDbg.state().active && !TT.trainingDbg.state().warming && !document.getElementById('trainingBlackout')?.classList.contains('on')"));
    results[mode]=await page.evaluate(`(async()=>{
      const {auditSling}=await import('/tools/tests/weapon-seating.js'),T=TT.THREE;
      TT.flightHold(true);TT.grantAllWeapons();TT.setViewFirstDbg(false);
      if(TT.isUnarmed())TT.toggleHolster();
      const step=n=>{for(let i=0;i<n;i++)TT.stepFrame(1/30)};
      const root=TT.weaponMeshes.aa12;
      for(let i=0;i<12 && TT.getCurrentWeapon()!=='aa12';i++){TT.setWeapon(TT.WEAPON_ORDER.indexOf('aa12'));step(15);}
      step(100);
      if(TT.getCurrentWeapon()!=='aa12')throw Error('Failed to equip');
      // Independent preview copies, built by the game at settled idle and draw times.
      const samples=[];
      for(let i=0;i<4;i++){
        step(30);const marine=TT.makeMarine();
        for(const vest of [false,true]){
          const rig=TT.carryPreview(marine,{loadout:{primary:['aa12','aa12'],secondary:[null,null]},inHand:null,akimbo:false,vest,grenades:0});
          for(const [slot,s] of rig.slings.entries()){
            const r=auditSling(s,1.8/1.655);s.gun.updateWorldMatrix(true,true);
            samples.push({i,slot,vest,visible:s.gun.visible,source:root.visible,scale:s.gun.scale.toArray(),
              transform:s.gun.matrixWorld.toArray(),ends:r.ends,overlaps:r.overlaps});
          }
        }
      }
      return samples;
    })()`,120000);
    await save(new URL(mode+'.json',dir),JSON.stringify(results[mode],null,2)+'\n');
    console.log(mode,results[mode].length,'states,',results[mode].filter(s=>s.overlaps.length).length,'with web intersections,',
      results[mode].filter(s=>s.ends.some(e=>!e.webContact||!e.gunContact)).length,'with unsupported ends');
  }
  assert.equal(served,modes.length);assert.deepEqual(page.errors,[]);
}finally{await browser.close();await server.close();}
