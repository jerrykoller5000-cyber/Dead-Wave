import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
import {save} from '../GT-20076/save.mjs';
const phase=process.argv[2];assert(process.env.DW_GAME_TEST_TOKEN&&['before','after'].includes(phase));
const root=new URL('../../',import.meta.url),out=new URL('./registry-'+phase+'/',import.meta.url);await mkdir(out,{recursive:true});
const server=await serve(fileURLToPath(root),0),browser=await launch({headless:false});
try{
  const page=await browser.newPage({width:960,height:540});await page.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await page.waitFor('window.TT&&DWLoad.snapshot().state==="ready"'));await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='Guard review';document.getElementById('modeTraining').click()");
  assert(await page.waitFor("TT.trainingDbg.state().active&&!TT.trainingDbg.state().warming&&!document.getElementById('trainingBlackout')?.classList.contains('on')"));
  await page.evaluate("import('/review/GT-20076/visibility-camera.mjs').then(m=>{window.views=m.makeViews(TT); TT.modsOwnAllDbg();return true})");
  const only=process.argv[3];assert(!only||['ak','shotgun'].includes(only));
  const states=only?JSON.parse(await readFile(new URL('coverage.json',out),'utf8')):{};
  for(const id of ['ak','shotgun']){
    if(only&&id!==only)continue;
    await page.evaluate('views.equip('+JSON.stringify(id)+')');
    for(const fitted of [false,true]){
      await page.evaluate(`(()=>{const id=${JSON.stringify(id)},fitted=${fitted};
        if(id==='ak') {
          if(!TT.armoryDbg.fit(id,'optic:acog',fitted)&&fitted)throw Error('Missing optic fit');
          TT.setGunSuppressor(TT.weaponMeshes.ak,true);
        }else {
          if(fitted){TT.addCash(10000);TT.buyExtMag(id);}
          if(!TT.fitWeaponMod(id,fitted?'ext':null))throw Error('Missing tube fit');
        }
        const swatch=TT.armoryFinishDbg.list(id).list.find(o=>o.key&&!o.locked)?.key;
        if(!swatch||!TT.armoryFinishDbg.paint(id,swatch))throw Error('No usable Training paint');
        TT.armoryDbg.refreshRack(true);for(let i=0;i<45;i++)TT.stepFrame(1/30);
        return true;})()`);
      await page.evaluate("views.pose('hip')");
      const key=id+(fitted?'-fitted':'-issue');
      if(id==='ak')states[key]=await page.evaluate("import('/review/GT-20079/registry-coverage.mjs').then(m=>m.coverage(TT))");
      else states[key]=await page.evaluate("import('/review/GT-20079/registry-coverage.mjs').then(m=>m.tubeCoverage(TT))");
      await save(new URL('coverage.json',out),JSON.stringify(states,null,2)+'\n');
      console.log(key,JSON.stringify(states[key].rawCoverage||states[key]));
      for(const view of ['hip','held-right-open','rack']){
        await page.evaluate('views.pose('+JSON.stringify(view)+')');
        for(const light of ['noon','overcast','dusk','night']){
          await page.evaluate('views.light('+JSON.stringify(light)+')');const png=await page.send('Page.captureScreenshot',{format:'png'});
          await save(new URL(key+'-'+view+'-'+light+'.png',out),Buffer.from(png.data,'base64'));
        }
      }
    }
  }
  for(const variant of ['ak-issue','ak-fitted']){
    for(const [role,coverage] of Object.entries(states[variant].rawCoverage)){
      assert(coverage.faces>0,variant+' '+role);
      for(const copy of ['world','eye','rack'])assert.equal(coverage[copy],coverage.faces,variant+' '+role+' '+copy);
    }
  }
  const tube=states['shotgun-fitted'];
  assert(tube.visible&&tube.faces>0);assert.equal(tube.rackPresent,tube.faces);
  for(const copy of ['world','eye','rack'])assert.equal(tube[copy],phase==='after'?tube.faces:0,'tube '+copy);
  assert.deepEqual(page.errors,[]);
}finally{await browser.close();await server.close();}
