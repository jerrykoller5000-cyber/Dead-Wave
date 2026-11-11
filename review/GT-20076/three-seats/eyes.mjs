import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {setTimeout as wait} from 'node:timers/promises';
import {launch} from '../../../tools/cdp.mjs';
import {serve} from '../../../tools/serve.mjs';
import {save} from '../save.mjs';

assert(process.env.DW_GAME_TEST_TOKEN);
const dir=new URL('./after/',import.meta.url);
await mkdir(dir,{recursive:true});
const server=await serve(fileURLToPath(new URL('../../../',import.meta.url)),0);
const browser=await launch({headless:false});
try{
  const page=await browser.newPage({width:1000,height:600});
  if(process.argv.includes('--timing')){
    const start=Date.now();await page.goto(server.origin+'/index.html?debug=1');
    assert(await page.waitFor('TT && DWLoad.snapshot().state==="ready"'));
    const readyMs=Date.now()-start;
    await page.evaluate('DWOpening.dismissForTesting()');
    assert(await page.waitFor('!DWOpening.active'));
    await page.evaluate("TT.applyGraphicsPreset('high');document.getElementById('playerName').value='Hardware';document.getElementById('modeTraining').click()");
    assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")'));
    await page.evaluate("TT.grantAllWeapons();TT.setViewFirstDbg(true);if(TT.isUnarmed())TT.toggleHolster()");
    const result={readyMs};
    for(const id of ['m4','revolver']){
      await page.evaluate(`(async()=>{for(let i=0;i<30&&TT.getCurrentWeapon()!==${JSON.stringify(id)};i++){TT.setWeapon(TT.WEAPON_ORDER.indexOf(${JSON.stringify(id)}));await new Promise(r=>setTimeout(r,120))}})()`);
      assert(await page.waitFor('TT.viewmodelDbg()?.info.key==='+JSON.stringify(id)+' && TT.viewmodelDbg().info.raise>.98'));
      const samples=[];
      for(let i=0;i<10;i++){
        await wait(1000);
        const s=await page.evaluate('({high:TT.getGfx(),gun:TT.viewmodelDbg().info.key,...TT.perfSnapshot()})');
        assert.equal(s.gun,id);assert.equal(s.high,'high');
        samples.push({fps:s.fps,low:s.low});
      }
      const mean=k=>samples.reduce((sum,s)=>sum+s[k],0)/samples.length;
      result[id]={fps:mean('fps'),low:mean('low'),samples};
    }
    await save(new URL('timing.json',dir),JSON.stringify(result,null,2));
    console.log('PASS High, 10 samples each; ready',readyMs,'ms;',result.m4.fps.toFixed(1),'GW-4 fps,',result.revolver.fps.toFixed(1),'revolver fps');
  }else{
  await page.goto(server.origin+'/index.html?inspect');
  assert(await page.waitFor('window.DWInspect?.contactSheet'));
  for(const id of ['m4','revolver']){
    const checked=await page.evaluate('DWInspect.contactSheet({only:"weapon.'+id+'",cols:2,tile:300})',120000);
    assert(checked.results.length && checked.results.every(r=>r.ok));
    await save(new URL(id+'-inspector.json',dir),JSON.stringify(checked.results,null,2));
    await save(new URL(id+'-inspector.jpg',dir),Buffer.from(checked.data.split(',')[1],'base64'));
  }
  await page.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await page.waitFor('TT && DWLoad.snapshot().state==="ready"'));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='Hardware';document.getElementById('modeTraining').click()");
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")'));
  const audits=await page.evaluate(`(async()=>{
    const H=TT.inspectHost(),T=TT.THREE,{LIGHTS}=await import('/studio/inspector/stage.js');
    const {auditWeapon}=await import('/tools/tests/weapon-seating.js');
    const {makeM4Model}=await import('/studio/weapon-longarms.js'),{makeRevolverModel}=await import('/studio/weapon-sidearms.js');
    const out={};
    for(const [id,build] of [['m4',makeM4Model],['revolver',makeRevolverModel]]){
      const raw=build({...H.builders.weaponContext(),finishGun:g=>g}),u=raw.userData;
      raw.scale.copy(TT.weaponMeshes[id].scale);
      const a=auditWeapon(raw,{metresPerUnit:1/TT.getWeaponSizeDbg().upm,ignore:[u.flash,u.flashLight,u.flare,u.laser].filter(Boolean)});
      out[id]={loose:a.loose,breaches:a.detailBreaches,seats:a.detailSeats.length};
    }
    const style=document.createElement('style');style.textContent='body > :not(canvas):not(script):not(style):not(#view){visibility:hidden!important}';document.head.append(style);
    TT.grantAllWeapons();TT.setViewFirstDbg(true);if(TT.isUnarmed())TT.toggleHolster();
    let preset='noon';
    H.attach({held:()=>false,scale:dt=>dt,frame:()=>{
      const L=LIGHTS[preset],p=TT.player.position;H.sun.position.copy(p).addScaledVector(new T.Vector3(...L.dir).normalize(),75);H.sun.target.position.copy(p);H.sun.target.updateMatrixWorld();
      H.sun.color.setHex(L.sunColor);H.sun.intensity=L.sun;H.hemi.color.setHex(L.skyColor);H.hemi.groundColor.setHex(L.ground);H.hemi.intensity=L.sky;H.ambientFill.intensity=L.fill;H.moon.intensity=0;
    }});
    window.hardwareEye=async(id,light)=>{
      preset=light;TT.flightHold(false);
      for(let i=0;i<30 && TT.getCurrentWeapon()!==id;i++){TT.setWeapon(TT.WEAPON_ORDER.indexOf(id));await new Promise(r=>setTimeout(r,100))}
      TT.setOtsAimDbg(0,-.08);TT.flightHold(true);
      for(let i=0;i<140;i++)TT.stepFrame(1/30);
      for(let i=0;i<4;i++){await new Promise(r=>setTimeout(r,80));TT.stepFrame(1/30)}
      if(TT.viewmodelDbg().info.key!==id || !TT.viewmodelDbg().info.active)throw Error('Missing '+id+' at eye');
    };
    return out;
  })()`,120000);
  await save(new URL('raw-seats.json',dir),JSON.stringify(audits,null,2));
  for(const id of ['m4','revolver'])for(const light of ['noon','overcast','dusk','night']){
    await page.evaluate('hardwareEye('+JSON.stringify(id)+','+JSON.stringify(light)+')');
    const shot=await page.send('Page.captureScreenshot',{format:'jpeg',quality:92});
    await save(new URL(id+'-eye-'+light+'.jpg',dir),Buffer.from(shot.data,'base64'));
  }
  assert.deepEqual(page.errors,[]);
  console.log('PASS both inspector subjects and eight eye frames',JSON.stringify(audits));
  }
}finally{await browser.close();await server.close();}
