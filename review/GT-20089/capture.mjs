import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {originalHeat} from './original.mjs';
import {fileURLToPath} from 'node:url';
import {launch} from '../../tools/cdp.mjs';
import {serve} from '../../tools/serve.mjs';
const phase=process.argv[2],only=process.argv[3];assert(process.env.DW_GAME_TEST_TOKEN&&['before','after'].includes(phase));
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{
  const page=await browser.newPage({width:960,height:540});
  const verifyOriginal=phase==='before'?await originalHeat(page,server.origin):null;
  await page.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await page.waitFor('window.TT&&DWLoad.snapshot().state==="ready"'));await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='Paired effects';document.getElementById('modeTraining').click()");
  assert(await page.waitFor("TT.trainingDbg.state().active&&!TT.trainingDbg.state().warming&&!document.getElementById('trainingBlackout')?.classList.contains('on')"));
  await page.evaluate("import('/review/GT-20089/paired-scene.mjs').then(m=>{window.fx=m.pairedScene(TT);return true})");
  const failures=[];
  const ids=only?only.split(','):['pistol','uzi','revolver'];
  assert(ids.every(id=>['pistol','uzi','revolver'].includes(id)));
  for(const id of ids)for(const can of (id==='revolver'?[false]:[false,true])){
    const dir=new URL('./'+phase+'/'+id+(can?'-suppressed':'')+'/',import.meta.url);await mkdir(dir,{recursive:true});
    await page.evaluate('fx.equip('+JSON.stringify(id)+','+can+')');
    if(process.argv.includes('--stress')){
      const data=await page.evaluate('fx.saturation()',120000);
      await writeFile(new URL('saturation.json',dir),JSON.stringify(data,null,2)+'\n');
      console.log(id,can,'pool',data.peak,'full frames',data.fullFrames,'emissions',data.counts,'max gap',data.gaps);
      if(!can&&id!=='revolver'){
        const uneven=await page.evaluate('fx.unequalMagazines()');
        await writeFile(new URL('unequal-magazines.json',dir),JSON.stringify(uneven,null,2)+'\n');
      }
      continue;
    }
    for(const view of ['eye','held']){
      await page.evaluate('fx.camera('+JSON.stringify(view)+')');
      const run=await page.evaluate('fx.burst()',180000);
      if(view==='eye')await writeFile(new URL('nodes.json',dir),JSON.stringify(await page.evaluate('fx.graph()'),null,2)+'\n');
      await writeFile(new URL(view+'.json',dir),JSON.stringify(run,null,2)+'\n');console.log(id,can,view,run.shots,run.seen,run.temperatures);
      const lights={};
      for(const light of ['noon','overcast','dusk','night']){
        lights[light]=await page.evaluate('fx.picture('+JSON.stringify(light)+');fx.observe()');
        const frame=await page.send('Page.captureScreenshot',{format:'png'});
        await writeFile(new URL(view+'-'+light+'.png',dir),Buffer.from(frame.data,'base64'));
      }
      await writeFile(new URL(view+'-lighting.json',dir),JSON.stringify(lights,null,2)+'\n');
      if(phase==='after')try{
        assert(run.seen.every(n=>n>4),'Both muzzles must emit smoke');
        assert(run.maxGap.every(n=>n<=15)&&run.last.every(f=>run.frames-f<=15),'Long paired burst must keep emitting from both muzzles');
        assert(run.temperatures.every(h=>h>.25),'Both hands must be warm');
        assert(run.parts.every(p=>p[can?'suppressor':'barrel'].hot>0),'Both drawn guns must glow');
        assert(run.history.every(p=>p.after[p.hand]>p.old[p.hand]&&p.after[1-p.hand]===p.old[1-p.hand]),'Only the firing hand may heat');
        assert(new Set(run.history.map(p=>p.hand)).size===2,'Both hands fired');
      }catch(error){
        if(!process.argv.includes('--diagnose'))throw error;
        failures.push(id+' '+can+' '+view+': '+error.message);
      }
    }
  }
  verifyOriginal?.();assert.deepEqual(page.errors,[]);assert.deepEqual(failures,[]);
}finally{await browser.close();await server.close();}
