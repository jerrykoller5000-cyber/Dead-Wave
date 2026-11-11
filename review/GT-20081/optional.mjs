import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {mkdir,readFile} from 'node:fs/promises';
import {launch} from '../../tools/cdp.mjs';
import {serve} from '../../tools/serve.mjs';
import {save} from '../GT-20076/save.mjs';

assert(process.env.DW_GAME_TEST_TOKEN);
const folder=new URL('./optional/',import.meta.url);await mkdir(folder,{recursive:true});
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{
  const page=await browser.newPage({width:960,height:540});
  if(process.argv.includes('--trace')){
    const code=await readFile(new URL('../../studio/weapon-model-hooks.js',import.meta.url),'utf8');
    const lineNumber=code.split('\n').findIndex(l=>l.includes('const stage = new T.Group();'));
    await page.send('Debugger.enable');
    await page.send('Debugger.setBreakpointByUrl',{urlRegex:'weapon-model-hooks\\.js',lineNumber,
      condition:'(globalThis.optionalBuildTrace ||= []).push({name:this.name,stack:new Error().stack}),false'});
  }
  await page.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  if(process.argv.includes('--trace')){
    const trace=await page.evaluate('({traces:globalThis.optionalBuildTrace||[],primary:[\'m4\',\'ak\',\'uzi\',\'revolver\',\'minigun\',\'launcher\'].map(id=>{const u=TT.weaponMeshes[id].userData,p=u.opticPlate||u.opticRail;return [id,p?.visible,p?.children.length,p?.name]})})');
    await save(new URL('cold-trace.json',folder),JSON.stringify(trace,null,2).replace(/__gameTestToken=[a-zA-Z0-9-]+/g,'__gameTestToken=[redacted]'));
  }
  const cold=await page.evaluate(`(()=>{
    const out={};for(const id of ['m4','ak','uzi','revolver','minigun','launcher']){
      const u=TT.weaponMeshes[id].userData,p=u.opticPlate||u.opticRail;
      if(!p||p.children.length)throw Error('Unfitted artwork allocated at startup '+id);
      const c=TT.cloneLean(p);c.visible=true;
      if(!c.children.length||p.children.length)throw Error('Independent cold clone did not create its own artwork '+id);
      out[id]={cold:p.children.length,separateClone:c.children.length};
    }return out;
  })()`);
  await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='Optional art';document.getElementById('modeTraining').click()");
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")'));
  await page.evaluate(`(async()=>{
    TT.grantAllWeapons();TT.modsOwnAllDbg();TT.addCash(100000);TT.setViewFirstDbg(true);if(TT.isUnarmed())TT.toggleHolster();
    TT.flightHold(true);TT.setOtsAimDbg(0,-.08);
    const css=document.createElement('style');css.textContent='body > :not(canvas):not(script):not(style):not(#view){visibility:hidden!important}';document.head.append(css);
    const H=TT.inspectHost(),{LIGHTS}=await import('/studio/inspector/stage.js');
    let light='noon';const step=n=>{for(let i=0;i<n;i++)TT.stepFrame(1/30)};
    H.attach({held:()=>false,scale:dt=>dt,frame:()=>{
      const L=LIGHTS[light];H.sun.position.copy(TT.player.position).addScaledVector(new H.THREE.Vector3(...L.dir).normalize(),80);
      H.sun.target.position.copy(TT.player.position);H.sun.target.updateMatrixWorld();H.sun.color.setHex(L.sunColor);H.sun.intensity=L.sun;
      H.hemi.color.setHex(L.skyColor);H.hemi.groundColor.setHex(L.ground);H.hemi.intensity=L.sky;H.ambientFill.intensity=L.fill;H.moon.intensity=0;
    }});
    window.fitOptional=id=>{
      for(let i=0;i<20&&TT.getCurrentWeapon()!==id;i++){TT.setWeapon(TT.WEAPON_ORDER.indexOf(id));step(20)}step(85);
      const arm=TT.armoryDbg,options=TT.opticDbg.options[id],kind=options.includes('rmr')?'rmr':options[0];
      if(!arm.fit(id,'optic:'+kind,true))throw Error('Cannot fit '+id+' '+kind);step(85);
      const gun=TT.weaponMeshes[id],plate=gun.userData.opticPlate||gun.userData.opticRail;
      const first=plate.children.slice();
      if(!plate.visible||!first.length)throw Error('Fitted model missing '+id);
      if(!TT.armoryFinishDbg.paint(id,'m81'))throw Error('Actual Armory paint failed '+id);step(6);
      const roles=first.filter(o=>o.material?.userData.weaponFinishRole);
      if(!roles.length||roles.some(o=>!o.material.map || !TT.getGunFurniture()[id].includes(o.material)))throw Error('Fresh fit missed paint '+id);
      const eye=new Map(TT.viewmodelDbg().gun.pairs).get(plate);
      if(!eye?.visible || eye.children.length!==first.length)throw Error('Fresh fit missed eye copy '+id);
      if(!arm.fit(id,'optic:'+kind,false))throw Error('Cannot remove optic '+id);step(3);
      if(plate.visible)throw Error('Removal left optional art shown');
      if(!arm.fit(id,'optic:'+kind,true))throw Error('Cannot refit optic');step(45);
      if(TT.armoryFinishDbg.list(id).current!=='m81'||roles.some(o=>!o.material.map))throw Error('Refit lost M81 '+id);
      if(plate.children.length!==first.length||plate.children.some((o,i)=>o!==first[i]))throw Error('Refit duplicated optional geometry '+id);
      return {kind,meshes:first.length,coated:roles.length,eye:eye.children.length};
    };
    window.fitFrame=async lighting=>{light=lighting;for(let i=0;i<4;i++){step(2);await new Promise(r=>setTimeout(r,65))}};
  })()`);
  const fitted={};
  for(const id of Object.keys(cold)){
    fitted[id]=await page.evaluate('fitOptional('+JSON.stringify(id)+')');
    for(const light of ['noon','overcast','dusk','night']){
      await page.evaluate('fitFrame('+JSON.stringify(light)+')');
      const shot=await page.send('Page.captureScreenshot',{format:'jpeg',quality:94});
      await save(new URL(id+'-'+light+'.jpg',folder),Buffer.from(shot.data,'base64'));
    }
  }
  await save(new URL('proof.json',folder),JSON.stringify({cold,fitted},null,2));
  assert.deepEqual(page.errors,[]);console.log('PASS six cold markers, independently materialized clones, actual M81 optic fit/unfit/refit and 24 eye frames',JSON.stringify(fitted));
}finally{await browser.close();await server.close()}
